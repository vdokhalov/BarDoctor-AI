import {GET as reviewsPage} from '../app/reviews/route';
import {GET as dataControlPage} from "../app/data-control/route";
import assert from "node:assert/strict";
import {emptyMonthFixture} from "../tests/helpers/empty-month-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const apiDelay = 20;let failImport=false,previewDelay=0,importCalls=0;
const runtime = await emptyMonthFixture({reviewPreview:"./app/api/review-layer/import/preview/route",reviewImport:"./app/api/review-layer/import/route",reviewLayer:"./app/api/review-layer/route",reviewSources:"./app/api/reviews/sources/route",activeVenue:"./app/api/access/active-venue/route",audit:"./app/api/audit/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/review-layer/import/preview":"reviewPreview","/api/review-layer/import":"reviewImport","/api/review-layer":"reviewLayer","/api/reviews/sources":"reviewSources","/api/access/active-venue":"activeVenue","/api/audit":"audit", "/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    if(url.pathname==="/api/audit"&&url.searchParams.get("q")==="slow") await new Promise(done=>setTimeout(done,700));
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if(name==="reviewPreview"&&previewDelay)await new Promise(done=>setTimeout(done,previewDelay));
    if(name==="reviewImport")importCalls++;
    if(name==="reviewImport"&&failImport)response=Response.json({ok:false,error:"Локальная ошибка сохранения"},{status:503});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/reviews")response=reviewsPage(new Request(url));
    else if(url.pathname==="/data-control")response=dataControlPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(process.env.BASELINE_JS&&url.pathname==="/reviews.js"?process.env.BASELINE_JS:file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try {
 const owner=runtime.user,venueId=runtime.venueId;
 const context=await browser.newContext({viewport:{width:390,height:844}});context.setDefaultTimeout(15000);await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));localStorage.setItem('bd_active_role','owner');},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],ai:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')&&/analyze|doctor|priority\/assess|reviews\/reply/.test(new URL(r.url()).pathname))ai.push(r.url());});
 const file=(name:string,text:string)=>({name,mimeType:'text/csv',buffer:Buffer.from(text)}),a=file('reviews.csv','external_id,text,rating\nreview-1,Тестовый отзыв,5'),b=file('second.csv','id,custom,score\nreview-2,Второй тестовый отзыв,4');
 const ui=page.frameLocator('iframe');const input=ui.locator('#review-import-form input[name=file]'),preview=ui.locator('#review-import-preview'),submit=ui.locator('#review-import-submit'),dialog=ui.locator('#review-import-dialog');
 await page.goto(base+'/reviews?venue='+venueId);await ui.locator('#import-reviews').click();await input.setInputFiles(a);await preview.click();await ui.locator('#review-import-fields select[data-target=text]').waitFor();await page.waitForTimeout(150);
 if(process.env.BASELINE_JS){assert.ok(await preview.isDisabled());assert.ok(errors.some(e=>e.includes('null')));console.log('BASELINE reproduced currentTarget null; preview stays disabled');await context.close();}
 else{
 assert.equal(await preview.isDisabled(),false);await submit.click();await ui.locator('#review-import-result').filter({hasText:'Создано: 1'}).waitFor();await dialog.waitFor({state:'hidden'});
 await ui.locator('#import-reviews').click();assert.equal(await ui.locator('#review-import-result').innerText(),'');assert.equal(await submit.isDisabled(),true);await input.setInputFiles(a);await preview.click();await submit.waitFor({state:'visible'});await page.waitForTimeout(150);await submit.click();await ui.locator('#review-import-result').filter({hasText:'Создано: 0'}).waitFor();await dialog.waitFor({state:'hidden'});
 await ui.locator('#import-reviews').click();await input.setInputFiles(b);await preview.click();await ui.locator('#review-import-fields select[data-target=text]').waitFor();assert.equal(await submit.isDisabled(),true);await ui.locator('select[data-target=text]').selectOption('custom');await preview.click();await page.waitForTimeout(250);assert.equal(await ui.locator('select[data-target=text]').inputValue(),'custom');assert.equal(await preview.isDisabled(),false);
 mkdirSync('outputs/bd11-review-import',{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:'outputs/bd11-review-import/mapping-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 failImport=true;await submit.click();await page.waitForTimeout(300);assert.equal(await submit.isDisabled(),false);assert.equal(await ui.locator('select[data-target=text]').inputValue(),'custom');assert.equal(await input.evaluate((e:HTMLInputElement)=>e.files?.length),1);failImport=false;await page.route('**/api/review-layer/import',route=>route.abort());await submit.click();await page.waitForTimeout(300);assert.equal(await submit.isDisabled(),false);assert.equal(await ui.locator('select[data-target=text]').inputValue(),'custom');await page.unroute('**/api/review-layer/import');
 const before=importCalls;await submit.evaluate((e:HTMLButtonElement)=>{e.form?.requestSubmit();e.form?.requestSubmit();});await ui.locator('#review-import-result').filter({hasText:'Создано: 1'}).waitFor();assert.equal(importCalls,before+1);await page.screenshot({path:'outputs/bd11-review-import/result-1280.png'});await dialog.waitFor({state:'hidden'});
 await page.reload();await ui.locator('#import-reviews').click();await input.setInputFiles(b);await preview.click();await ui.locator('select[data-target=text]').waitFor();await ui.locator('select[data-target=text]').selectOption('custom');await submit.click();await ui.locator('#review-import-result').filter({hasText:'Создано: 0'}).waitFor();await dialog.waitFor({state:'hidden'});
 await ui.locator('#import-reviews').click();await input.setInputFiles(file('empty.csv',''));await preview.click();await page.waitForTimeout(300);assert.equal(await preview.isDisabled(),false);assert.equal(await submit.isDisabled(),true);
 previewDelay=600;await input.setInputFiles(a);await preview.click();await input.setInputFiles(b);await page.waitForTimeout(850);assert.equal(await ui.locator('#review-import-mapping').isVisible(),false);assert.equal(await submit.isDisabled(),true);previewDelay=0;
 previewDelay=600;await preview.click();await ui.locator('body').evaluate(()=>{window.dispatchEvent(new Event('bd:venue-will-change'));localStorage.setItem('bd_active_venue_id','999999');});await page.waitForTimeout(750);assert.equal(await dialog.isVisible(),false);assert.equal(await ui.locator('#review-import-result').innerText(),'');assert.equal(await ui.locator('#review-import-mapping').isVisible(),false);
 const foreign=await runtime.register('foreign-reviews@local.test');const payload=new FormData();payload.append('file',new File([a.buffer],'reviews.csv',{type:'text/csv'}));payload.append('source','other');payload.append('fieldMapping',JSON.stringify({text:'text',externalId:'external_id',rating:'rating'}));const req=runtime.request(foreign,'/api/review-layer/import','POST');req.headers.delete('content-type');const foreignResult=await runtime.api.reviewImport.POST(new Request(req.url,{method:'POST',headers:req.headers,body:payload}));assert.equal(foreignResult.status,201);const foreignBody=await foreignResult.json() as {result:{created:number}};assert.equal(foreignBody.result.created,1);assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);console.log('PASS repeat/new file, custom mapping retained, failure/retry/double submit, reload/dedup, invalid preview, stale response/file/venue, 390/820/1280, no AI');await context.close();
 }
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

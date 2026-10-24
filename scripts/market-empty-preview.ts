import assert from "node:assert/strict";
import {filterMarketEvidence} from "../lib/bardoctor/market-source-relevance";
import {GET as marketPage} from "../app/market/route";
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
const apiDelay = 80;
const runtime = await emptyMonthFixture({equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/market")response=marketPage(new Request(url));
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/equipment/") || ["/analysis", "/tasks", "/equipment", "/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 const old={generatedAt:'2026-10-23T12:00:00Z',competitors:[{name:'Luna',key:'luna',category:'Кафе',evidenceStatus:'city_unverified'}],sources:[]};
 let analysis:any=old,mode='MODEL_EMPTY',posts=0;
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/api/market',route=>{
  if(route.request().method()==='POST') {posts++;if(mode==='error')return route.fulfill({status:503,json:{ok:false}});analysis=mode==='RESULT'?{...old,generatedAt:'2026-10-24T22:00:00Z',lastAttempt:{reason:mode}}:{...(analysis||{}),lastAttempt:{reason:mode,completedAt:'2026-10-24T22:00:00Z'}};return route.fulfill({json:{ok:true,data:analysis,stale:true}});}
  return route.fulfill({json:{ok:true,analysis,restaurant:{name:'Тестовый рынок',city:'Бендеры'},stale:true}});
 });
 await page.goto(base+'/market?embedded=1&venue='+venueId);await page.getByText('Luna',{exact:true}).waitFor();
 const out=resolve('outputs/market-empty-attempt');mkdirSync(out,{recursive:true});
 for(const [reason,label] of [['MODEL_EMPTY','Поиск не вернул результатов'],['FILTER_EMPTY','Найденные результаты не прошли проверку'],['USER_EXCLUDED','Найдены только исключённые вами заведения']]){
  mode=reason;await page.locator('#refresh-market').click();await page.waitForFunction(label=>document.querySelector('#market-status')?.textContent?.startsWith(label),label);
  assert.ok((await page.locator('#market-status').innerText()).includes('прежний анализ от'));assert.equal(analysis.generatedAt,old.generatedAt);
  await page.reload();await page.waitForFunction(label=>document.querySelector('#market-status')?.textContent?.startsWith(label),label);assert.equal(await page.locator('.competitor-item').count(),1);
  if(reason==='FILTER_EMPTY')for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:out+'/retained-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 }
 mode='error';await page.locator('#refresh-market').click();await page.waitForFunction(()=>document.querySelector('#market-status')?.textContent?.includes('временно недоступно'));assert.equal(analysis.generatedAt,old.generatedAt);
 mode='RESULT';await page.locator('#refresh-market').click();await page.waitForFunction(()=>document.querySelector('#market-status')?.textContent?.startsWith('Данные сохранены'));await page.reload();await page.getByText('Luna',{exact:true}).waitFor();
 analysis=null;await page.reload();await page.locator('#empty-state').waitFor();mode='MODEL_EMPTY';await page.locator('#start-analysis').click();await page.waitForFunction(()=>document.querySelector('#market-status')?.textContent==='Поиск не вернул результатов');await page.reload();await page.waitForFunction(()=>document.querySelector('#market-status')?.textContent==='Поиск не вернул результатов');assert.equal(await page.locator('#market-results').isVisible(),false);assert.equal(await page.locator('#empty-state').isVisible(),true);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/empty-390.png'});assert.deepEqual(errors,[]);assert.equal(posts,6);console.log(JSON.stringify({pass:true,posts,errors,checks:['model/filter/user empty','old date retained','reload','error','success after empty','no prior analysis','390/820/1280']}));await context.close();
} finally {await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.close();}

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
try{
 const owner=runtime.user,venueId=runtime.venueId;
 let analysis:any={generatedAt:'2026-10-25T08:30:00Z',competitors:[{name:'Street Food',key:'fixture',category:'Кафе',evidenceStatus:'local',confirmed:false,evidence:'Название и адрес найдены на странице источника.',sourceUrls:['https://www.tripadvisor.com/Restaurant_Review-g1-d1-Reviews-Street_Food-Bender_Transnistria.html'],pageEvidence:{status:'verified',reason:'VERIFIED',kind:'schema_org',checkedAt:'2026-10-25T08:30:00Z',address:{name:'Street Food',streetAddress:'Kalinina St., 23',city:'Bender',country:'MD'}}}],sources:[{url:'https://www.tripadvisor.com/Restaurant_Review-g1-d1-Reviews-Street_Food-Bender_Transnistria.html',title:'tripadvisor.com'}]};
 analysis.competitors[0].evidenceStatus='city_unverified';delete analysis.competitors[0].pageEvidence;
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let writes=0,patches=0,mode='ok';const original=JSON.stringify(analysis);
 await page.route('**/api/market',async route=>{if(route.request().method()==='GET')return route.fulfill({json:{ok:true,analysis,restaurant:{name:'Локальный пример',city:'Бендеры'},stale:false}});if(route.request().method()!=='PATCH'){writes++;return route.abort();}patches++;assert.deepEqual(route.request().postDataJSON(),{action:'check-source-page',competitorKey:'fixture',sourceIndex:0,generatedAt:analysis.generatedAt});await new Promise(r=>setTimeout(r,300));if(mode==='stale')return route.fulfill({status:409,json:{ok:false,code:'ANALYSIS_CHANGED'}});if(mode==='network')return route.abort();return route.fulfill({json:{ok:true,reason:mode==='blocked'?'BLOCKED':'VERIFIED',status:'verified',pagesRequested:1,durationMs:100}})});
 const open=async()=>{await page.locator('.competitor-item').click();await page.locator('[data-detail-tab="sources"]').click();await page.getByRole('button',{name:'Проверить источник',exact:true}).waitFor()};
 await page.goto(base+'/market?embedded=1&venue='+venueId);await open();assert.equal(patches,0);
 await page.getByRole('button',{name:'Проверить источник',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Проверяю…',exact:true}).isDisabled(),true);
 await page.locator('[data-check-source]').dispatchEvent('click');await page.getByText('Название и адрес подтверждены страницей.',{exact:true}).waitFor();assert.equal(patches,1);assert.equal(JSON.stringify(analysis),original);
 const out=resolve('outputs/market-source-check');mkdirSync(out,{recursive:true});
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/source-'+width+'.png'});}
 await page.reload();await open();assert.equal(patches,1);assert.equal(await page.getByText('Название и адрес подтверждены страницей.',{exact:true}).count(),0);
 for(const [next,message] of [['stale','Анализ изменился. Обновите страницу.'],['network','Проверка не удалась. Можно повторить.'],['blocked','Сайт не разрешил проверку.']]){mode=next;await page.getByRole('button',{name:'Проверить источник',exact:true}).click();await page.getByText(message,{exact:true}).waitFor();}
 const previous=patches;await page.evaluate(()=>localStorage.setItem('bd_active_venue_id','999999'));await page.getByRole('button',{name:'Проверить источник',exact:true}).click();await page.getByText('Заведение изменилось. Обновите страницу.',{exact:true}).waitFor();assert.equal(patches,previous);
 assert.equal(writes,0);assert.equal(JSON.stringify(analysis),original);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],patches,noAI:true,noMutation:true,checks:['manual only','double click','reload','stale','network','blocked','venue context'],errors}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.close();}

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
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let writes=0;
 await page.route('**/api/market',route=>{if(route.request().method()!=='GET'){writes++;return route.abort();}return route.fulfill({json:{ok:true,analysis,restaurant:{name:'Локальный пример',city:'Бендеры'},stale:false}})});
 await page.goto(base+'/market?embedded=1&venue='+venueId);await page.getByText('Адрес проверен',{exact:false}).first().waitFor();assert.equal(await page.locator('#confirmed-count').innerText(),'0');
 const out=resolve('outputs/market-page-evidence');mkdirSync(out,{recursive:true});
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:out+'/list-'+width+'.png'});await page.locator('.competitor-item').click();await page.getByText('Kalinina St., 23, Bender, MD',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/address-'+width+'.png'});await page.locator('#detail-close').click();}
 await page.reload();await page.getByText('Адрес проверен',{exact:false}).first().waitFor();analysis={...analysis,competitors:[{...analysis.competitors[0],evidenceStatus:'city_unverified',pageEvidence:{status:'unverified',reason:'BLOCKED'}}]};await page.reload();await page.getByText('Город не подтверждён',{exact:false}).first().waitFor();assert.equal(await page.getByText('Адрес проверен',{exact:false}).count(),0);assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,widths:[390,820,1280],checks:['verified address','manual confirmation remains zero','details/reload','blocked stays unverified'],writes,errors}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.close();}

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
 const good={title:'Cafe Luna — Бендеры Moldova',url:'https://luna.example/venue'},unknown={title:'Rosa restaurant official site',url:'https://rosa.example/'},foreign={title:'Drive Pub — Balti, Moldova',url:'https://drive.example/'};
 const build=(onlyUnknown=false)=>{const raw={competitors:[...(!onlyUnknown?[{name:'Luna',sourceUrls:[good.url],category:'Кафе'}]:[]),{name:'Rosa',sourceUrls:[unknown.url],category:'Ресторан',city:'Бендеры'},{name:'Drive Pub',sourceUrls:[foreign.url],category:'Бар'}],opportunities:[{title:'Rosa лидер местного рынка',sourceUrls:[unknown.url]}]};const out=filterMarketEvidence(raw,[good,unknown,foreign],{city:'Бендеры',country:'Молдова'});return {version:1,generatedAt:'2026-10-24T12:00:00Z',...out.result,sources:out.sources,competitors:(out.result.competitors as any[]).map((x,i)=>({...x,key:'fixture-'+i}))};};
 let analysis=build(),writes=0;
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage();page.setDefaultTimeout(20000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/market',route=>{if(route.request().method()!=='GET'){writes++;return route.fulfill({status:403,body:'No writes in preview'});}return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,analysis,restaurant:{name:'Тестовый рынок',city:'Бендеры',country:'Молдова'},stale:false})});});
 await page.goto(base+'/market?embedded=1&venue='+venueId);const cards=page.locator('.competitor-item');await page.getByText('Город не подтверждён',{exact:false}).first().waitFor();assert.equal(await cards.count(),2);assert.equal(await page.getByText('Drive Pub',{exact:true}).count(),0);assert.equal(await page.locator('#confirmed-count').innerText(),'0');
 const rosa=cards.filter({hasText:'Rosa'});await rosa.click();await page.locator('#detail-title').getByText('Rosa',{exact:true}).waitFor();assert.equal(await page.locator('[data-confirm]').count(),0);assert.ok((await page.locator('#detail-status').innerText()).includes('Город не подтверждён'));
 await page.locator('#detail-close').click();await page.reload();await page.getByText('Город не подтверждён',{exact:false}).first().waitFor();
 const out=resolve('outputs/market-relevance');mkdirSync(out,{recursive:true});await page.locator('#competitors-card').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mixed-390.png'});
 for(const width of [820,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out+'/mixed-'+width+'.png'});}
 analysis=build(true);await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.competitor-item').length===1);assert.equal(await page.locator('#confirmed-count').innerText(),'0');assert.ok(!(await page.locator('#opportunities-card').innerText()).includes('лидер'));
 assert.equal(writes,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,checks:['mixed local/unverified/foreign','no unverified confirm action','reload','all unknown retained','no unknown local conclusions','390/820/1280 overflow','no business writes'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.all([...pendingHandlers]);await runtime.close()}

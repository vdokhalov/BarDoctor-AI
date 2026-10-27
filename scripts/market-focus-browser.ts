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
const apiDelay = 80; let failSave=false;
const runtime = await emptyMonthFixture({market:"./app/api/market/route",equipmentWork:"./app/api/equipment/work-orders/route",storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = {"/api/market":"market","/api/equipment/work-orders":"equipmentWork", "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if(name==="market" && req.method==="POST") throw new Error("AI forbidden");
    if(name==="market" && req.method==="PATCH" && failSave) response=Response.json({ok:false,error:"Ошибка сохранения"},{status:503});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
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
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({address:'Кишинёв, Молдова',city:'Кишинёв',country:'MD'}),runtime.account);
 runtime.seed('bd_market_analysis_v1',{generatedAt:'2026-10-25T12:00:00Z',focus:'',competitors:[],sources:[]});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();const errors:string[]=[],methods:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/market'))methods.push(r.method())});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const open=async()=>{await page.locator('#edit-location').click();await page.locator('#market-focus').waitFor({state:'visible'})};
 const save=async()=>{await page.locator('#save-location').click();await page.locator('#location-sheet').waitFor({state:'hidden'})};
 await page.goto(base+'/market?embedded=1&venue='+venueId);await page.waitForResponse(r=>r.url().includes('/api/market'));
 await open();await page.locator('#market-focus').fill('Сравнить соседние кафе по напиткам и ценам');await save();await open();
 if(process.env.BASELINE){assert.equal(await page.locator('#market-focus').inputValue(),'');await Promise.all([page.waitForResponse(r=>r.url().includes("/api/market")),page.reload()]);await page.waitForTimeout(100);await open();assert.equal(await page.locator('#market-focus').inputValue(),'Сравнить соседние кафе по напиткам и ценам');console.log('BASELINE: same-address save persists, immediate reopen empty, reload restores');}
 else {
 assert.equal(await page.locator('#market-focus').inputValue(),'Сравнить соседние кафе по напиткам и ценам');await Promise.all([page.waitForResponse(r=>r.url().includes("/api/market")),page.reload()]);await page.waitForTimeout(100);await open();assert.equal(await page.locator('#market-focus').inputValue(),'Сравнить соседние кафе по напиткам и ценам');
 mkdirSync('outputs/bd13-market-focus',{recursive:true});for(const width of [390,820,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:'outputs/bd13-market-focus/focus-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 await page.locator('#market-focus').fill('');await save();await Promise.all([page.waitForResponse(r=>r.url().includes("/api/market")),page.reload()]);await page.waitForTimeout(100);await open();assert.equal(await page.locator('#market-focus').inputValue(),'');
 await page.locator('#market-address').fill('Кишинёв, новый адрес');await page.locator('#market-focus').fill('Новое уточнение');failSave=true;await page.locator('#save-location').click();await page.getByText('Ошибка сохранения',{exact:true}).waitFor();assert.equal(await page.locator('#market-focus').inputValue(),'Новое уточнение');failSave=false;await save();await Promise.all([page.waitForResponse(r=>r.url().includes("/api/market")),page.reload()]);await page.waitForTimeout(100);await open();assert.equal(await page.locator('#market-address').inputValue(),'Кишинёв, новый адрес');assert.equal(await page.locator('#market-focus').inputValue(),'Новое уточнение');
 await page.locator('#market-focus').fill('Не сохранять');await page.locator('#location-close').click();await open();assert.equal(await page.locator('#market-focus').inputValue(),'Новое уточнение');console.log('PASS: focus/address, clear, reopen/reload, cancel, error/retry, 390/820/1280');
 }
 assert.equal(methods.includes('POST'),false);assert.deepEqual(errors,[]);await context.close();
} finally {await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled([...pendingHandlers]);runtime.close();}

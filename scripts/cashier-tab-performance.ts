import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 1200);
const runtime = await lifecycleRuntime({ batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage();
    else if(url.pathname==="/cashier.js"&&process.env.BD_PERF_BASELINE==="1")response=new Response(execFileSync("git",["show","e70c7ede:public/cashier.js"]),{headers:{"Content-Type":"application/javascript"}});
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try{
 const owner=await runtime.register('perf-owner@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));put('bd_operational_reports_v1',[{venueId,date:new Date().toISOString().slice(0,10),workdayStatus:'OPEN',staffing:[{employeeId:'a'}]}]);put('bd_assortment_v1',salesEventFixture().assortment);
 const req=runtime.request(owner,'/api/sales-events','POST',{venueId,action:'open_shift',shiftId:'perf',name:'Perf'});req.headers.set('X-Venue-Id',String(venueId));assert.equal((await runtime.api.sales.POST(req)).status,201);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});const page=await context.newPage();await page.addInitScript(()=>{const w=window as Window & {bdPerfLongTasks:number[]};w.bdPerfLongTasks=[];new PerformanceObserver(list=>{w.bdPerfLongTasks.push(...list.getEntries().map(e=>e.duration))}).observe({type:'longtask',buffered:true});});const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(new URL(r.url()).pathname+new URL(r.url()).search)});await page.goto(base+'/cashier');await page.locator('#work').waitFor({state:'visible'});await page.clock.install();
 const results=[];for(const view of ['overview','cashier','report','cashier']){requests.length=0;await page.evaluate(()=>{(window as Window & {bdPerfLongTasks:number[]}).bdPerfLongTasks=[]});const start=Date.now();await page.locator('#navigation [data-view="'+view+'"]').click();await page.locator('#'+view+'-view').waitFor({state:'visible'});const visibleMs=Date.now()-start;await page.waitForFunction(()=>document.querySelector('#work')?.getAttribute('aria-busy')==='false');results.push({view,visibleMs,readyMs:Date.now()-start,requests:[...requests],mainThreadLongTasksMs:await page.evaluate(()=>(window as Window & {bdPerfLongTasks:number[]}).bdPerfLongTasks)});}
 console.log(JSON.stringify({source:process.env.BD_PERF_BASELINE==='1'?'v507 e70c7ede cashier.js':'candidate',apiDelayMs:apiDelay,results}));await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}

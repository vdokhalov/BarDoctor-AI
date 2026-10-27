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
let apiDelay = 0, failDays=false, failStore=false;
const runtime = await emptyMonthFixture({workdays:'./app/api/workdays/route',days:'./app/api/operational-days/route',storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"closing", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if((name==="days"&&failDays)||(name==="store"&&failStore)) response=new Response(null,{status:503});
    else if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (url.pathname.startsWith("/salaries") || ["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(process.env.BASELINE_JS&&/index-BQGspy0I[^/]*\.js$/.test(file)?process.env.BASELINE_JS:file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
 runtime.seed('bd_operational_reports_v1',[]);runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тест среднего чека',currency:'MDL',timezone:'UTC',trackingStartDate:'2026-10-01',openTime:'09:00',closeTime:'18:00',workingDays:{1:true,2:true,3:true,4:true,5:true,6:true,7:true}}),runtime.account);
 const row=(id:string,date:string,revenue:number,receipts:number)=>({id,date,revenue,receipts,venueId,currency:'MDL',manualTotalsVersion:2,manualCostOfGoods:0});
 runtime.seed('bd_finance_revenue',[row('one','2026-10-21',115,2),row('two','2026-10-22',30,1)]);
 const context=await browser.newContext({viewport:{width:390,height:844}});context.setDefaultTimeout(15000);await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 await page.clock.install({time:new Date('2026-10-23T12:00:00Z')});
 mkdirSync('outputs/bd10-average-receipt',{recursive:true});
 await page.goto(base+'/finance?venue='+venueId+'&month=2026-10');await page.waitForTimeout(2000);assert.match(await page.locator('.bd-finance-week-v160').innerText(),/48,33/);for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.locator('.bd-finance-week-v160').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/bd10-average-receipt/finance-'+width+'.png'});}console.log('PASS Finance weighted weekly 145/3=48.33');
 await page.goto(base+'/shifts?venue='+venueId+'&month=2026-10');await page.waitForTimeout(2000);assert.match(await page.locator('body').innerText(),/57,50/);console.log('PASS shift list 115/2=57.50');
 for(const width of [390,820,1280]){await page.setViewportSize({width,height:844});await page.screenshot({path:'outputs/bd10-average-receipt/shifts-'+width+'.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.getByRole('button',{name:/^21 октября/}).click();await page.waitForTimeout(400);assert.match(await page.locator('body').innerText(),/57,50/);await page.screenshot({path:'outputs/bd10-average-receipt/detail-1280.png'});await page.goBack();await page.goto(base+'/shifts?venue='+venueId+'&month=2026-10');await page.reload();await page.getByRole('button',{name:/^21 октября/}).waitFor();assert.match(await page.locator('body').innerText(),/57,50/);runtime.seed('bd_finance_revenue',[row('one','2026-10-21',125,2)]);await page.reload();await page.waitForTimeout(1200);assert.match(await page.locator('body').innerText(),/62,50/);await page.goto(base+'/finance?venue='+venueId+'&month=2026-10');await page.waitForTimeout(1500);assert.match(await page.locator('.bd-finance-week-v160').innerText(),/62,50/);console.log('PASS detail/reopen/reload and 125/2=62.50 list+period');assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

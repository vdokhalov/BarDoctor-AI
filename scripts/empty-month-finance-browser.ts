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
const apiDelay = 0;
const runtime = await emptyMonthFixture({storeKey:"./app/api/store/[key]/route",store:"./app/api/store/route",usersMe:"./app/api/users/me/route",restaurantMe:"./app/api/restaurants/me/route"});
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
    if (name && runtime.api[name]) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

    else if (["/reports", "/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/reports','/finance']){
 for(const month of ['2026-10','2026-09','2026-10','2026-09']){
 await page.goto(base+route+'?venue='+venueId+'&month='+month);
 if(month==='2026-09'){await page.locator('[data-bd-empty-month-closing]').waitFor();assert.equal(await page.locator('[data-bd-monthly-blockers]').count(),0);assert.equal(await page.locator('[data-bd-empty-month-closing]').getAttribute('open'),null);assert.equal(await page.getByText('Не внесены начальные и конечные остатки',{exact:true}).count(),0);}
 else {await page.locator(route==='/reports'?'[data-bd-monthly-report]':'[data-bd-finance-dashboard]').waitFor();await page.waitForTimeout(600);assert.equal(await page.locator('[data-bd-empty-month-closing]').count(),0);}
 }
 await page.reload();await page.locator('[data-bd-empty-month-closing]').waitFor();assert.equal(await page.locator('[data-bd-monthly-blockers]').count(),0);
 }
 mkdirSync('outputs/empty-month-finance',{recursive:true});await page.locator('[data-bd-empty-month-closing]').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/empty-month-finance/finance-390.png'});
 runtime.seed('bd_finance_revenue',[{id:'zero-day',venueId,date:'2026-09-02',revenue:0,currency:'MDL'}]);
 for(const route of ['/reports','/finance']){await page.goto(base+route+'?venue='+venueId+'&month=2026-09');await page.locator('[data-bd-monthly-blockers]').waitFor();assert.match(await page.locator('[data-bd-monthly-blockers]').innerText(),/начисления зарплаты/);}
 runtime.seed('bd_finance_expenses',[{id:'bad-date',venueId,date:null,description:'Аренда',category:'rent',amount:30,currency:'MDL'}]);
 for(const route of ['/reports','/finance']){await page.goto(base+route+'?venue='+venueId+'&month=2026-09');await page.getByText(/Аренда.*проверьте дату/).waitFor();assert.equal(await page.locator('[data-bd-empty-month-closing]').count(),0);}
 assert.deepEqual(errors,[]);console.log('PASS both reports/finance empty period, Oct/Sep/Oct, reload, incomplete payroll and malformed expense warnings');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

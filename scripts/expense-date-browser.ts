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
 runtime.seed('bd_finance_revenue',[{id:'sep-manual',venueId,date:'2026-09-02',revenueSource:'MANUAL_SUMMARY',manualTotalsVersion:1,revenue:100,receipts:2,currency:'MDL',closingStatus:'closed',declaredCost:20,costProvenance:{basis:'OWNER_DECLARED',currency:'MDL'}}]);
 runtime.seed('bd_operational_reports_v1',[{id:'sep-report',venueId,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:10}}]);
 runtime.seed('bd_inventory_snapshots',[{id:'open',venueId,date:'2026-09-01',currency:'MDL',total:100,sections:{bar:100}},{id:'end',venueId,date:'2026-10-01',currency:'MDL',total:80,sections:{bar:80}}]);
 runtime.seed('bd_finance_expenses',[{id:'rent-17',description:'Аренда помещения',venueId,date:null,category:'rent',amount:30,currency:'MDL'}]);
 const check=await(await runtime.get()).json() as any;assert.deepEqual(check.reasons,['EXPENSE_DATE_UNKNOWN']);
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[],writes:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&!r.url().includes('/api/auth/bootstrap'))writes.push(r.url());});
 for(const month of ['2026-09','2026-10','2026-09']){await page.goto(base+'/reports?venue='+venueId+'&month='+month);await page.getByText(/Аренда помещения.*30.*проверьте дату/).waitFor();assert.equal(await page.getByText('Месяц без финансовых данных',{exact:true}).count(),0);}
 await page.reload();await page.getByText(/Аренда помещения.*30.*проверьте дату/).waitFor();mkdirSync('outputs/expense-date',{recursive:true});await page.screenshot({path:'outputs/expense-date/report-390.png',fullPage:true});await page.getByRole('button',{name:'Открыть финансы',exact:true}).scrollIntoViewIfNeeded();const bottom=await page.getByRole('button',{name:'Открыть финансы',exact:true}).boundingBox();assert.ok(bottom&&bottom.y+bottom.height<760,'bottom action reachable above navigation');
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS malformed expense compiled UI reload/period/record identity, no writes');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

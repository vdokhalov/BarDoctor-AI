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
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
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
const results:unknown[]=[];
try{for(const dayStatus of ['MISSING','CLOSED'])for(const scenario of ['empty','outstanding','staff']){
 const owner=await runtime.register(dayStatus+scenario+'@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC'}),owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const day={venueId,date:new Date().toISOString().slice(0,10),workdayStatus:'OPEN',staffing:[{employeeId:'fixture'}]};
 put('bd_operational_reports_v1',[day]);const assortment=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId));put('bd_assortment_v1',assortment);
 const post=async(api:string,body:object)=>{const req=runtime.request(owner,'/api/'+api,'POST',{venueId,...body});req.headers.set('X-Venue-Id',String(venueId));const r=await runtime.api[api].POST(req);assert.ok(r.ok,await r.clone().text());};
 await post('sales',{action:'open_shift',shiftId:'legacy',name:'Legacy cash'});
 if(scenario==='outstanding')await post('orders',{action:'create',operationId:'create',orderId:'order',shiftId:'legacy',expectedRevision:0,tableNumber:'1',lines:[{id:'line',menuItemId:'beer',quantity:1}]});
 put('bd_operational_reports_v1',dayStatus==='CLOSED'?[{...day,workdayStatus:'CLOSED'}]:[]);
 const before=runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,'bd_operational_reports_v1')!.data_json;
 let actor=owner;if(scenario==='staff'){actor=await runtime.register(dayStatus+'staff-member@isolated.test');const workspace=runtime.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id!;runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,actor.userId);runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venueId,actor.userId);}
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({actor,venueId})=>{localStorage.setItem('bd_session',actor.email);localStorage.setItem('bd_session_token',actor.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{actor,venueId});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));if(scenario==='empty'){await page.goto(base+'/shifts?venue='+venueId+'&workday=2026-10-12&month=2026-10');await page.locator('[data-workday-opening-blocked]').waitFor();assert.match(await page.locator('[data-workday-opening-blocked]').innerText(),/Legacy cash/);assert.ok(await page.locator('[data-workday-opening-blocked] a[href^="/cashier"]').count());assert.equal(await page.getByRole('button',{name:'Открыть смену',exact:true}).isDisabled(),true);}await page.goto(base+'/cashier?venue='+venueId);await page.locator('[data-workday-required]').waitFor();assert.equal(await page.locator('[data-action="payment"],[data-action="open-shift"]').count(),0);
 if(scenario==='empty'){assert.equal(await page.locator('[data-legacy-cash-close] [data-view="orders"]').count(),1);await page.locator('[data-action="close-shift"]').click();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});const revenues=JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,'bd_finance_revenue')!.data_json));assert.equal(revenues.find((r:{id:string})=>r.id==='legacy').closingStatus,'closed');}
 else{assert.equal(await page.locator('[data-action="close-shift"]').count(),0);if(scenario==='outstanding'){assert.match(await page.locator('[data-legacy-cash-close]').innerText(),/незакрытых заказов — 1/);assert.match(await page.locator('[data-legacy-cash-close]').innerText(),/Оплата и отмена сейчас недоступны/);}else assert.equal(await page.locator('[data-legacy-cash-close]').count(),0);}
 assert.equal(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,'bd_operational_reports_v1')!.data_json,before);assert.deepEqual(errors,[]);results.push({dayStatus,scenario,status:'PASS',workdayUnchanged:true});await context.close();
}console.log(JSON.stringify(results));}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}

import { salesAccountingPage } from "../lib/bardoctor/sales-accounting-page";
import { initialSalesAccounting } from "../lib/bardoctor/sales-accounting";
import { operationalDay } from "../lib/bardoctor/operational-day";
import assert from "node:assert/strict";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = 0;
const runtime = await lifecycleRuntime({ accounting:"./app/api/sales-accounting/route", batches:"./app/api/sales-batches/route",workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-accounting":"accounting", "/api/sales-batches":"batches", "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/sales-import")response=salesPage(new Request(url));
    else if(url.pathname==="/sales-totals")response=new Response(salesAccountingPage(false),{headers:{"Content-Type":"text/html"}});
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));

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
const engine = process.env.BD_QA_ENGINE === "webkit" ? "webkit" : "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
try{
 const results=[];
 for(const variant of ["previous-shift","empty-unbound","previous-pending","populated-unbound"]){
 const owner=await runtime.register(variant+'@isolated.test'),venueId=owner.activeVenueId,date=new Date().toISOString().slice(0,10);
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 const post=async(name:string,body:object)=>{const req=runtime.request(owner,'/api/'+name,'POST',{venueId,...body});req.headers.set('X-Venue-Id',String(venueId));const res=await runtime.api[name].POST(req);const data=await res.json();assert(res.ok,JSON.stringify(data));return data as any;};
 put('bd_operational_reports_v1',[{venueId,date,workdayStatus:'OPEN',staffing:[{employeeId:'a'}]}]);
 put('bd_sales_accounting_v1',initialSalesAccounting(venueId,new Date().toISOString(),owner.userId));
 put('bd_assortment_v1',{menuItems:[{id:'service',venueId,name:'Service300',active:true,type:'service',consumptionMode:'NONE',currency:'MDL',salePrice:300}],stockBalances:[],recipes:[],nomenclature:[]});
 await post('sales',{action:'open_shift',shiftId:'old-pos',name:'Old'});await post('sales',{action:'close_shift',shiftId:'old-pos',actualCash:0});
 await post('accounting',{action:'set_mode',mode:'MANUAL',operationId:'select-manual'});
 const manual=(await post('accounting',{action:'open_manual_shift',operationId:'manual-open'})).total;
 await post('accounting',{action:'save_totals',shiftId:manual.id,date,cash:120,card:80,cogs:40,receipts:null,expectedRevision:0,operationId:'manual-save'});
 await post('accounting',{action:'set_mode',mode:'POS',operationId:'select-pos'});
 await post('sales',{action:'open_shift',shiftId:'new-pos',name:'New',openingFloat:0});
 const pending=variant==='previous-pending'?{path:'/api/sales-events',body:{action:'post',command:{id:'prior-payment',shiftId:'old-pos',source:'POS_API',lines:[],payments:[]},previewHash:'original'}}:null;
 const quick={id:'prior-draft',...(variant==='previous-shift'||pending?{shiftId:'old-pos'}:{}),lines:variant==='previous-shift'||variant==='populated-unbound'?[{id:'prior-line',menuItemId:'service',quantity:1}]:[],comment:'preserve'};
 const workspace={quick,pending,byShift:{}};
 const context=await browser.newContext({viewport:{width:390,height:915}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage();page.setDefaultTimeout(15000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));let writes=0;
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/sales-events')writes++;});
 await page.goto(base+'/cashier?venue='+venueId);await page.frameLocator('iframe[data-bd-sales-surface]').locator('#work').waitFor({state:'visible'});
 await page.goto(base+'/sales-totals');await page.locator('#totals-cash:not([disabled])').waitFor();
 await page.evaluate(({key,workspace})=>localStorage.setItem(key,JSON.stringify(workspace)),{key:`bd_pos_workspace_v2:${owner.userId}:${venueId}`,workspace});
 if(variant==='previous-shift'){
  await page.locator('#totals-cash').fill('121');await page.locator('[data-bd-back]').click();await page.locator('#accounting-date-confirm').waitFor({state:'visible'});await page.locator('#accounting-date-cancel').click();assert.equal(await page.locator('#totals-cash').inputValue(),'121');assert(page.url().endsWith('/sales-totals'));
  await page.locator('[data-bd-back]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#totals-cash').inputValue(),'121');
 }
 await page.goto(base+'/cashier?venue='+venueId);const frame=page.frameLocator('iframe[data-bd-sales-surface]');await frame.locator('#work').waitFor({state:'visible'});
 const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),`bd_pos_workspace_v2:${owner.userId}:${venueId}`);
 if(pending||variant==='populated-unbound'){
  await frame.locator('#recovery').waitFor({state:'visible'});const saved=await read();assert.deepEqual(saved.quick,quick);assert.deepEqual(saved.pending,pending);assert.equal(writes,0);await page.reload();await frame.locator('#recovery').waitFor({state:'visible'});assert.deepEqual((await read()).quick,quick);assert.equal(writes,0);
 }else{
  assert.equal((await read()).quick.shiftId,'new-pos');if(variant==='previous-shift')assert.deepEqual((await read()).byShift['old-pos'],quick);
  await frame.locator('[data-pane="menu"]').first().click();await frame.locator('[data-add="service"]').click();await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});await frame.locator('[data-pane="order"]').first().click();
  await frame.locator('[data-action="payment"]').click();await frame.locator('dialog[open]').waitFor();assert.equal(writes,0);await frame.locator('#dialog-submit').click();await frame.locator('dialog[open]').waitFor({state:'hidden'});await frame.locator('#notice').filter({hasText:'Продажа проведена'}).waitFor();assert.equal(writes,2);
  await page.reload();await frame.locator('#work').waitFor({state:'visible'});assert.equal(writes,2);
  const events=get('bd_sales_events_v1');assert.equal(events.length,1);assert.equal(events[0].revenueRowId,'new-pos');assert.equal(events[0].revenue,300);
  const day=operationalDay({venueId,businessDate:date,asOf:new Date().toISOString(),currency:'MDL',revenues:get('bd_finance_revenue'),events});assert.equal(day.revenue.amount,500);assert.equal((await read()).quick.lines.length,0);if(variant==='previous-shift')assert.deepEqual((await read()).byShift['old-pos'],quick);
 }
 assert.deepEqual(errors,[]);results.push({variant,status:'PASS',salesRequests:writes});await context.close();
 }
 console.log(JSON.stringify({engine,fixture:'isolated real APIs and actual cashier bootstrap, width390',results}));
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close()}

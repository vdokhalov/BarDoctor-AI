import {salesEventFixture} from '../tests/helpers/sales-event-fixture';
import {seedOpenWorkday} from '../tests/helpers/pos-workday-fixture';
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit, devices } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { GET as salesPage } from "../app/sales-import/route";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-22T12:00:00.000Z";
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
    else if(url.pathname==="/cashier") response=cashierPage(new Request(url));
    else if (["/more", "/shifts", "/warehouse", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve(process.env.ARTIFACT_ROOT||"public", "." + url.pathname);
      response = file.startsWith(resolve(process.env.ARTIFACT_ROOT||"public")) && existsSync(file) ? new Response(readFileSync(url.pathname==="/cashier.js"&&process.env.BASELINE_CASHIER?process.env.BASELINE_CASHIER:file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/whole-order-cancel-preview';mkdirSync(out,{recursive:true});
try{
 const owner=await runtime.register('cancel-history@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовая касса',currency:'PMR_RUB',timezone:'UTC'}),owner.userId);
 seedOpenWorkday(runtime.sqlite,owner.userId,venueId,'2026-10-22');
 const assortment=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('MDL','PMR_RUB'));
 for(const rows of Object.values(assortment) as any[][])for(const row of rows){row.venueId=venueId;if(row.id==='beer'){row.name='Вода';row.salePrice=15;row.sectionId='bar';}}
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(assortment));
 const post=async(name:string,body:any)=>{const response=await runtime.api[name].POST(new Request(base+'/api',{method:'POST',headers:runtime.request(owner,'/api').headers,body:JSON.stringify({venueId,...body})}));const value:any=await response.json();assert(response.ok,JSON.stringify(value));return value;};
 await post('sales',{action:'open_shift',shiftId:'test-shift',name:'Тестовая смена'});
 const created=await post('orders',{action:'create',orderId:'test-order-001',operationId:'create-test',expectedRevision:0,shiftId:'test-shift',tableNumber:'3',lines:[{id:'line',menuItemId:'beer',quantity:1}]});
 await post('orders',{action:'confirm',orderId:'test-order-001',operationId:'confirm-test',expectedRevision:created.order.revision});

 const nativeOrders:any=await(await runtime.api.orders.GET(runtime.request(owner,'/api/pos-orders'))).json();
 const confirmed=nativeOrders.orders[0];
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});
 const page=await context.newPage();let shown=confirmed,posts=0;
 await page.route('**/api/pos-orders',async route=>{if(route.request().method()==='GET')await route.fulfill({json:{...nativeOrders,orders:[shown]}});else{posts++;await route.continue();}});
 const open=async()=>{await page.goto(base+'/cashier?embedded=1&venue='+venueId);await page.locator('[data-order="test-order-001"]').first().click();await page.locator('.admin-actions summary').click();await page.locator('[data-action="cancel-order"]').click();};
 if(process.env.BASELINE_CASHIER){await open();await page.locator('#dialog input[name=reason]').waitFor();assert.equal(posts,0);console.log('BASELINE REPRODUCED: confirmed order asks for reason before server restriction');}else{
 await open();await page.getByText('Подтверждённые блюда отменяйте по отдельности.',{exact:true}).waitFor();assert.equal(await page.locator('#dialog input[name=reason]').count(),0);assert.equal(posts,0);await page.screenshot({path:out+'/blocked-390.png'});
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.reload();await page.locator('[data-order="test-order-001"]').first().click();await page.locator('.admin-actions summary').click();await page.locator('[data-action=cancel-order]').click();assert.equal(await page.locator('#dialog input[name=reason]').count(),0);
 // An old client revision must still be refused by the unchanged server.
 shown={...confirmed,revision:confirmed.revision-1,preparationTickets:[]};await open();await page.locator('#dialog input[name="reason"]').fill('Локальная проверка');await page.locator('#dialog-submit').click();await page.waitForTimeout(400);assert.equal(posts,1);assert.equal(await page.locator('#dialog').evaluate((d:HTMLDialogElement)=>d.open),true);
 const unchanged:any=await(await runtime.api.orders.GET(runtime.request(owner,'/api/pos-orders'))).json();assert.equal(unchanged.orders[0].status,'OPEN');assert.equal(unchanged.orders[0].revision,confirmed.revision);
 // Current revision but missing client ticket also cannot bypass the server rule.
 shown={...confirmed,preparationTickets:[]};await open();await page.locator('#dialog input[name="reason"]').fill('Локальная проверка');await page.locator('#dialog-submit').click();await page.waitForTimeout(400);assert.equal(posts,2);assert.equal(await page.locator('#dialog').evaluate((d:HTMLDialogElement)=>d.open),true);
 // Remaining confirmed quantity blocks, historical tickets without remaining lines do not.
 shown={...confirmed,lines:confirmed.lines.map((line:any)=>({...line,quantity:1}))};await open();assert.equal(await page.locator('#dialog input[name=reason]').count(),0);
 shown={...confirmed,lines:[]};await open();await page.locator('#dialog input[name="reason"]').waitFor();await page.getByRole('button',{name:'Отмена',exact:true}).click();
 shown={...confirmed,preparationTickets:[]};await open();await page.locator('#dialog input[name="reason"]').waitFor();await page.getByRole('button',{name:'Отмена',exact:true}).click();
 shown=confirmed;await page.goto(base+'/cashier?embedded=1&venue='+venueId+'&view=orders');await page.locator('[data-unpaid-order]').first().click();await page.locator('.unpaid-cancel').getByText('Подтверждённые блюда отменяйте по отдельности.',{exact:true}).waitFor();assert.equal(await page.locator('#unpaid-reason').count(),0);
 console.log(JSON.stringify({pass:true,checks:['confirmed before reason/no request','partial confirmed blocked','empty historical order allowed','unconfirmed reason allowed','stale revision rejected','server confirmed lock retained'],out}));}
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

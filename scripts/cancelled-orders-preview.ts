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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/cancelled-orders-preview';mkdirSync(out,{recursive:true});
try{
 const owner=await runtime.register('cancel-history@isolated.test'),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовая касса',currency:'PMR_RUB',timezone:'UTC'}),owner.userId);
 seedOpenWorkday(runtime.sqlite,owner.userId,venueId,'2026-10-22');
 const assortment=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('MDL','PMR_RUB'));
 for(const rows of Object.values(assortment) as any[][])for(const row of rows){row.venueId=venueId;if(row.id==='beer'){row.name='Лимонад';row.salePrice=50;}}
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(assortment));
 const post=async(name:string,body:any)=>{const response=await runtime.api[name].POST(new Request(base+'/api',{method:'POST',headers:runtime.request(owner,'/api').headers,body:JSON.stringify({venueId,...body})}));const value:any=await response.json();assert(response.ok,JSON.stringify(value));return value;};
 await post('sales',{action:'open_shift',shiftId:'test-shift',name:'Тестовая смена'});
 const created=await post('orders',{action:'create',orderId:'test-order-001',operationId:'create-test',expectedRevision:0,shiftId:'test-shift',tableNumber:'3',lines:[{id:'line',menuItemId:'beer',quantity:1}]});
 await post('orders',{action:'cancel_order',orderId:'test-order-001',operationId:'cancel-test',expectedRevision:created.order.revision,reason:'Гость передумал до приготовления'});
 const snapshot=()=>JSON.stringify({domain:runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),orders:runtime.sqlite.prepare('SELECT * FROM pos_order_records ORDER BY order_id').all(),stock:runtime.sqlite.prepare('SELECT * FROM stock_journal_movements ORDER BY position').all()});const before=snapshot();
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId));},{owner,venueId});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/cashier?embedded=1&venue='+venueId+'&view=receipts&history=cancelled');
 await page.getByRole('button',{name:/Стол 3.*50/}).waitFor({timeout:15000});
 await page.screenshot({path:out+'/list-390.png'});
 await page.getByRole('button',{name:/Стол 3.*50/}).click();
 await page.getByRole('heading',{name:'Отменённый заказ',exact:true}).waitFor();
 await page.getByText('Гость передумал до приготовления',{exact:true}).last().waitFor();
 await page.screenshot({path:out+'/detail-390.png'});
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:/Стол 3.*50/}).waitFor();
 await page.getByRole('combobox',{name:'История кассы'}).selectOption('paid');
 await page.getByText('Оплаченных чеков пока нет.',{exact:true}).waitFor();
 assert.equal(snapshot(),before);assert.deepEqual(errors,[]);
 writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',fixture:'local test account; one saved unpaid cancellation; no paid sales',errors,unchanged:true,scenarios:['saved cancellation reason, amount and lines visible','details','reload','paid receipts stay empty']},null,2));console.log('PASS cancelled orders preview');await context.close();
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

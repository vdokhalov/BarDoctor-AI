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
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),args:chromiumArgs,headless:true});
const out='outputs/cancellation-chain-preview';mkdirSync(out,{recursive:true});
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
 await post('orders',{action:'cancel_item',orderId:'test-order-001',operationId:'cancel-item-test',expectedRevision:2,lineId:'line',quantity:1,stockDecision:'NO_WRITE_OFF',reason:'Гость отказался от воды'});
 await post('orders',{action:'cancel_order',orderId:'test-order-001',operationId:'close-empty',expectedRevision:3,reason:'Пустой заказ'});
 const nativeOrders:any=await(await runtime.api.orders.GET(runtime.request(owner,'/api/pos-orders'))).json(),saved=nativeOrders.orders[0];assert.equal(saved.lines.length,0);assert.equal(saved.preparationTickets.at(-1).lines[0].name,'Вода');assert.equal(saved.operations.find((op:any)=>op.action==='cancel_item').details.cancelledLine.total,15);
 const snapshot=()=>JSON.stringify({domain:runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),orders:runtime.sqlite.prepare('SELECT * FROM pos_order_records ORDER BY order_id').all(),stock:runtime.sqlite.prepare('SELECT * FROM stock_journal_movements ORDER BY position').all()});const before=snapshot();
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({owner,venueId})=>{localStorage.setItem('bd_session',owner.email);localStorage.setItem('bd_session_token',owner.token);localStorage.setItem('bd_active_venue_id',String(venueId))},{owner,venueId});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const readWrites:string[]=[];page.on('request',r=>{if(r.method()!=='GET'&&!r.url().includes('/api/auth/bootstrap'))readWrites.push(r.url())});
 const path='/cashier?embedded=1&venue='+venueId+'&view=receipts&history=cancelled';await page.goto(base+path);await page.getByRole('button',{name:/Стол 3.*15/}).waitFor();assert.equal(await page.locator('[data-cancelled-order]').count(),2);await page.getByRole('button',{name:/Стол 3.*15/}).click();await page.getByRole('heading',{name:'Отменённое блюдо',exact:true}).waitFor();await page.locator('#dialog .cash-row span').getByText('Вода × 1',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Отмена',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Закрыть',exact:true}).count(),1);await page.getByText('Не списывать',{exact:true}).first().waitFor();await page.locator('#dialog .cancellation-chain > summary').click();await page.locator('#dialog .cancellation-chain').getByText('Пустой заказ',{exact:true}).waitFor();assert.equal(await page.locator('#dialog .cancellation-chain article').count(),3);await page.screenshot({path:out+'/detail-390.png'});const deep=page.url();await page.reload();await page.locator('#dialog .cash-row span').getByText('Вода × 1',{exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('cancelledOrder'));await page.reload();assert.equal(await page.locator('#dialog').evaluate((d:HTMLDialogElement)=>d.open),false);await page.goto(deep);await page.locator('#dialog .cash-row span').getByText('Вода × 1',{exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 const finalRow=page.locator('[data-cancelled-order="test-order-001"]');await finalRow.click();await page.getByRole('heading',{name:'Отменённый заказ',exact:true}).waitFor();await page.locator('#dialog-content > .cancel-reason').getByText('Пустой заказ',{exact:true}).waitFor();assert.equal(await page.getByText('Позиций нет.',{exact:true}).count(),1);assert.ok(!(await page.locator('#dialog-content').innerText()).includes('Сумма отмены'));
 const finalUrl=page.url();await page.reload();await page.getByRole('heading',{name:'Отменённый заказ',exact:true}).waitFor();await page.locator('#dialog .cancellation-chain > summary').click();assert.equal(await page.locator('#dialog .cancellation-chain article').count(),3);await page.screenshot({path:out+'/final-390.png'});await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.goto(finalUrl);await page.getByRole('heading',{name:'Отменённый заказ',exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть',exact:true}).click();
 const legacy=structuredClone(saved);delete legacy.operations.find((op:any)=>op.action==='cancel_item').details.cancelledLine;await page.route('**/api/pos-orders',route=>route.fulfill({json:{...nativeOrders,orders:[legacy]}}));await page.goto(deep);await page.locator('#dialog .cash-row span').getByText('Вода × 1',{exact:true}).waitFor();assert.match(await page.locator('#dialog-content').innerText(),/Сумма не сохранена/);assert.ok(!(await page.locator('#dialog-content').innerText()).includes('Состав не сохранён'));await page.screenshot({path:out+'/legacy-390.png'});await page.getByRole('button',{name:'Закрыть',exact:true}).click();await page.unroute('**/api/pos-orders');

 const zero=structuredClone(saved);zero.operations.find((op:any)=>op.action==='cancel_item').details.cancelledLine.total=0;
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:844});
  for(const [name,fixture,expected] of [['known',saved,'15'],['unknown',legacy,'Сумма не сохранена'],['zero',zero,'0']] as const){
   await page.route('**/api/pos-orders',route=>route.fulfill({json:{...nativeOrders,orders:[fixture]}}));
   await page.goto(deep);await page.getByRole('heading',{name:'Отменённое блюдо',exact:true}).waitFor();
   assert.ok((await page.locator('#dialog .total').innerText()).includes(expected));
   assert.equal(await page.locator('#dialog-content').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
   await page.screenshot({path:out+'/'+name+'-'+width+'.png'});
   await page.reload();await page.getByRole('heading',{name:'Отменённое блюдо',exact:true}).waitFor();
   assert.ok((await page.locator('#dialog .total').innerText()).includes(expected));
   await page.getByRole('button',{name:'Закрыть',exact:true}).click();
   await page.locator('[data-cancelled-order]').first().waitFor();
   assert.equal(await page.locator('#dialog').evaluate((d:HTMLDialogElement)=>d.open),false);
   await page.unroute('**/api/pos-orders');
  }
 }

 const mixed=structuredClone(saved),extra=structuredClone(mixed.preparationTickets.find((t:any)=>t.kind==='CANCELLATION'));
 extra.id='legacy-second';extra.batchId='missing-second';mixed.preparationTickets.push(extra);
 await page.route('**/api/pos-orders',route=>route.fulfill({json:{...nativeOrders,orders:[mixed]}}));
 for(const width of [390,820,1280]){
  await page.setViewportSize({width,height:844});await page.goto(base+path);
  await page.getByRole('button',{name:/Стол 3.*15/}).waitFor();
  assert.equal(await page.locator('[data-cancelled-order]').count(),3);
  await page.getByRole('button',{name:/Стол 3.*Сумма не сохранена/}).waitFor();
  assert.equal(await page.locator('#receipts-view').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  await page.screenshot({path:out+'/mixed-'+width+'.png'});
 }
 await page.unroute('**/api/pos-orders');
 assert.equal(snapshot(),before);assert.deepEqual(errors,[]);assert.deepEqual(readWrites,[]);console.log(JSON.stringify({pass:true,checks:['final order reason separate from item reason','all saved tickets with unique IDs','final closure reload/direct link','native confirmed cancellation and empty order closure','saved name quantity reason stock decision','new captured price15','legacy unknown price remains unknown','reload/deep link/close','no read-side writes'],out}));await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

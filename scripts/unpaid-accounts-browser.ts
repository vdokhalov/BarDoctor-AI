import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import assert from "node:assert/strict";
import { salesSurfacePage } from "../tests/helpers/sales-surface-page";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out='outputs/unpaid-accounts';mkdirSync(out,{recursive:true});const results:unknown[]=[];
try{for(const width of [390,1280])for(const role of ['owner','shift_manager','cashier']){
 const owner=await runtime.register(`${width}-${role}-owner@isolated.test`),venueId=owner.activeVenueId;
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Тестовое заведение',currency:'MDL',timezone:'UTC'}),owner.userId);
 const put=(key:string,value:unknown)=>runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 const today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 put('bd_operational_reports_v1',[{venueId,date:yesterday,workdayStatus:'OPEN',staffing:[{employeeId:'anna'}]}]);put('bd_assortment_v1',JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId)));
 const post=async(api:string,body:object)=>{const req=runtime.request(owner,'/api/'+api,'POST',{venueId,...body});req.headers.set('X-Venue-Id',String(venueId));const response=await runtime.api[api].POST(req);assert.ok(response.ok,await response.clone().text());return await response.json() as {order:{id:string;revision:number}};};
 await post('sales',{action:'open_shift',shiftId:'night',name:'Ночная смена'});
 await post('orders',{action:'create',operationId:'current',orderId:'218',shiftId:'night',expectedRevision:0,tableNumber:'4',lines:[{id:'beer-current',menuItemId:'beer',quantity:2}]});
 const baseOrder=get('bd_pos_orders_v1')[0],baseCash=get('bd_finance_revenue')[0];
 const oldDate=new Date(Date.now()-172800000).toISOString().slice(0,10);
 put('bd_finance_revenue',[baseCash,{...baseCash,id:'historical',shiftName:'Вечерняя смена',date:oldDate,closingStatus:'closed',closingReport:{revenue:555}}]);
 put('bd_pos_orders_v1',[baseOrder,{...baseOrder,id:'194',shiftId:'historical',tableNumber:'12',createdBy:{...baseOrder.createdBy,name:'Анна'},operations:baseOrder.operations.map((x:object)=>({...x,id:'old-create'}))},{...baseOrder,id:'193',shiftId:'missing-source',tableNumber:'3',operations:baseOrder.operations.map((x:object)=>({...x,id:'missing-create'}))}]);
 let actor=owner;if(role!=='owner'){actor=await runtime.register(`${width}-${role}-staff@isolated.test`);const workspace=runtime.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id!;runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,actor.userId);runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,?,'active')").run(venueId,actor.userId,role);}
 const context=await browser.newContext({viewport:{width,height:900}});const draftKey=`bd_pos_workspace_v2:${actor.userId}:${venueId}`,draft={quick:{id:'untouched-draft',shiftId:'night',lines:[{id:'draft-line',menuItemId:'beer',quantity:1}],comment:'Unfinished'},pending:null,byShift:{}};
 await context.addInitScript(({actor,venueId,draftKey,draft})=>{localStorage.setItem('bd_session',actor.email);localStorage.setItem('bd_session_token',actor.token);localStorage.setItem('bd_active_venue_id',String(venueId));localStorage.setItem(`bd_pos_shift_v1:${actor.userId}:${venueId}`,'night');if(!localStorage.getItem(draftKey))localStorage.setItem(draftKey,JSON.stringify(draft));},{actor,venueId,draftKey,draft});
 const rawPage=await context.newPage();const page=salesSurfacePage(rawPage),errors:string[]=[];rawPage.on('pageerror',e=>errors.push(e.message));const requests:string[]=[];rawPage.on('request',r=>{if(r.url().includes('/api/'))requests.push(new URL(r.url()).pathname);});
 try{
 await page.goto(base+'/more?venue='+venueId);await page.getByRole('button',{name:'Продажи',exact:true}).click();await page.waitForURL(url=>url.pathname===(role==='cashier'?'/cashier':'/sales-import'));
 if(role!=='cashier'){const frame=rawPage.frameLocator('iframe[data-bd-sales-surface]');await frame.locator('a[href="/cashier?view=orders"]').click();await page.waitForURL(url=>url.pathname==='/cashier');}else{await page.locator('#navigation [data-view=orders]').click();}
 await page.locator('[data-unpaid-group=CURRENT]').waitFor();await page.locator('[data-unpaid-group=PAST]').waitFor();await page.locator('[data-unpaid-group=REVIEW]').waitFor();assert.equal(await page.locator('[data-unpaid-group=CURRENT] [data-unpaid-order="218"]').count(),1);assert.ok(await rawPage.locator(role==='cashier'?'[data-bd-nav-key=sales]':'[data-bd-nav-key=more]').count());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 if(role==='owner')await rawPage.screenshot({path:`${out}/list-${width}.png`,fullPage:false});
 const beforeRequests=requests.length;await page.locator('[data-unpaid-order="194"]').click();await page.locator('[data-unpaid-detail="194"]').waitFor();assert.match(await page.locator('.unpaid-facts').innerText(),/historical/);assert.match(await page.locator('.unpaid-facts').innerText(),/Анна/);assert.equal(await page.locator('[data-work-unpaid]').count(),0);assert.equal(requests.length,beforeRequests,'opening detail must not fetch per shift');
 if(role==='cashier'){assert.equal(await page.locator('[data-action=cancel-unpaid]').count(),0);const req=runtime.request(actor,'/api/pos-orders','POST',{venueId,action:'cancel_order',orderId:'194',operationId:'forbidden',expectedRevision:1,reason:'Denied'});req.headers.set('X-Venue-Id',String(venueId));assert.equal((await runtime.api.orders.POST(req)).status,403);}else{
 assert.equal(await page.locator('[data-action=cancel-unpaid]').isDisabled(),true);await page.locator('#unpaid-reason').fill('Тестовый счёт не обслужен');assert.equal(await page.locator('[data-action=cancel-unpaid]').isDisabled(),false);
 if(role==='owner'){await rawPage.screenshot({path:`${out}/cancel-${width}.png`,fullPage:false});await page.evaluate(()=>window.scrollTo(0,0));await rawPage.screenshot({path:`${out}/detail-${width}.png`,fullPage:false});}
 await page.locator('[data-action=unpaid-back]').click();await page.locator('[data-unpaid-order="194"]').click();assert.equal(await page.locator('#unpaid-reason').inputValue(),'Тестовый счёт не обслужен');
 const accounting=['bd_finance_revenue','bd_operational_reports_v1','bd_assortment_v1','bd_stock_movements','bd_sales_events_v1'],before=accounting.map(get);
 await page.locator('[data-action=cancel-unpaid]').click();await page.locator('[data-unpaid-detail="194"]').waitFor({state:'hidden'});assert.equal(get('bd_pos_orders_v1').find((x:{id:string})=>x.id==='194').status,'CANCELLED');assert.deepEqual(accounting.map(get),before);
 }
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),`bd_pos_shift_v1:${actor.userId}:${venueId}`),'night');assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).quick,draftKey),draft.quick);
 await page.locator('[data-action=unpaid-back]').count().then(async n=>{if(n)await page.locator('[data-action=unpaid-back]').click();});
 await page.locator('[data-unpaid-order="193"]').click();assert.equal(await page.locator('[data-action=cancel-unpaid]').count(),0);await page.locator('[data-action=unpaid-back]').click();
 if(role==='cashier')await page.goto(base+'/more?venue='+venueId);else await rawPage.locator('[data-bd-nav-key=more]').click();await page.waitForURL(url=>url.pathname==='/more');await page.getByRole('button',{name:'Продажи',exact:true}).click();await page.waitForURL(url=>url.pathname===(role==='cashier'?'/cashier':'/sales-import'));assert.equal(new URL(page.url()).searchParams.get('venue'),String(venueId));
 await page.goto(base+'/cashier?venue='+venueId+'&view=orders');await page.locator('[data-unpaid-group=CURRENT]').waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),`bd_pos_shift_v1:${actor.userId}:${venueId}`),'night');assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).quick,draftKey),draft.quick);assert.deepEqual(errors,[]);
 const pending={path:'/api/pos-orders',body:{action:'set_quantity',operationId:'unconfirmed',orderId:'218',expectedRevision:1,lineId:'beer-current',quantity:3}};await page.evaluate(({key,pending})=>{const saved=JSON.parse(localStorage.getItem(key)!);saved.pending=pending;localStorage.setItem(key,JSON.stringify(saved));},{key:draftKey,pending});await page.goto(base+'/cashier?venue='+venueId+'&view=orders');await page.locator('#recovery').waitFor({state:'visible'});await page.locator('[data-unpaid-order="193"]').click();await page.locator('[data-action=unpaid-back]').click();await page.locator('#navigation [data-view=cashier]').click();await page.locator('#cashier-view').waitFor({state:'visible'});assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).pending,draftKey),pending);
 results.push({selectedCashUnchanged:true,pendingPreserved:true,role,width,today,sourceDate:yesterday,status:'PASS',nightCurrent:true,sourcePreserved:true,noDetailRequests:true,quickDraftPreserved:true});
 }catch(error){writeFileSync(`${out}/failure-${role}-${width}.json`,JSON.stringify({error:String(error),text:await rawPage.locator('body').innerText(),frames:await Promise.all(rawPage.frames().map(async f=>({url:f.url(),text:await f.locator('body').innerText()})))},null,2));await rawPage.screenshot({path:`${out}/failure-${role}-${width}.png`,fullPage:true});throw error;}finally{await context.close();}
}writeFileSync(out+'/result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

import assert from "node:assert/strict";
import { salesSurfacePage } from "../tests/helpers/sales-surface-page";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { GET as cashierPage } from "../app/cashier/route";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = process.env.BD_OPERATIONAL_TEST_INSTANT;
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ workdays: "./app/api/workdays/route", orders: "./app/api/pos-orders/route", posOverview: "./app/api/pos-overview/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/workdays": "workdays", "/api/pos-orders": "orders", "/api/pos-overview": "posOverview", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if(url.pathname==="/cashier") response=cashierPage();
    else if (["/more", "/shifts", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const out="outputs/management-workday";mkdirSync(out,{recursive:true});const results:unknown[]=[];
try {
 for(const width of [390,1280]){
  const user=await runtime.register(`workday-${width}@isolated.test`),venueId=user.activeVenueId;
  runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({name:"Workday QA",currency:"MDL",timezone:"Europe/Chisinau",workingDays:[0,1,2,3,4,5,6],openTime:"00:00",closeTime:"23:59",areas:["Бар"]}),user.userId);
  const put=(key:string,value:unknown)=>runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId,key,JSON.stringify(value),new Date().toISOString());
  const get=(key:string)=>JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId,key)?.data_json||"null"));
  put("bd_assortment_v1",JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venueId)));
  const send=(body:object)=>runtime.api.sales.POST(runtime.request(user,"/api/sales-events","POST",{venueId,...body}));
  assert.equal((await send({action:"open_shift",shiftId:"cash",name:"Cash"})).status,201);
  const command={id:"sale",source:"POS_API",shiftId:"cash",lines:[{id:"line",menuItemId:"beer",quantity:1}],payments:[{id:"cash",method:"CASH",amount:20}]};
  const preview=await (await send({action:"preview",command})).json() as {previewHash:string};
  assert.equal((await send({action:"post",command,previewHash:preview.previewHash})).status,201);
  const context=await browser.newContext({viewport:{width,height:844},timezoneId:"Europe/Chisinau"});
  await context.addInitScript(({email,token,venueId})=>{localStorage.setItem("bd_session",email);localStorage.setItem("bd_session_token",token);localStorage.setItem("bd_active_venue_id",String(venueId));},{email:user.email,token:user.token,venueId});
  const page=salesSurfacePage(await context.newPage()),errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  try {
   for(const route of ["/home","/more","/shifts"]){
    await page.goto(base+route+"?venue="+venueId);
    const entry=route==="/more"?page.getByRole("button",{name:"Касса",exact:true}):page.locator("[data-bd-cashier-entry]");
    await entry.waitFor();await page.screenshot({path:`${out}/${width}-${route.slice(1)}-entry.png`,fullPage:true});
    await entry.click();await page.locator("#work:not([hidden]) #cashier-view:not([hidden])").waitFor();
    assert.equal(new URL(page.url()).pathname,"/cashier");assert.equal(new URL(page.url()).searchParams.get("venue"),String(venueId));
   }
   await page.locator("details.admin-actions summary").click();
   const refreshed=page.waitForResponse(response=>response.url().endsWith("/api/pos-orders"));
   await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));await refreshed;
   await page.waitForFunction(()=>document.querySelector('details.admin-actions')?.hasAttribute('open'));
   await page.route("**/api/sales-events",route=>route.abort("internetdisconnected"));
   await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));
   await page.locator("#notice").filter({hasText:"Нет связи"}).waitFor();
   await page.unroute("**/api/sales-events");
   await page.evaluate(()=>document.dispatchEvent(new Event("visibilitychange")));
   await page.waitForFunction(()=>document.getElementById("connection")?.textContent==="На связи"&&!document.getElementById("notice")?.textContent?.includes("Нет связи"));
   if(width===390)await page.locator('.mobile-tabs [data-pane="menu"]').first().click();
   await page.locator('[data-add="beer"]').click();await page.locator('#dialog input[name="quantity"]').fill('3');await page.locator('#dialog-submit').click();
   if(width===390)await page.locator('.mobile-tabs [data-pane="order"]').first().click();
   await page.locator('[data-decrease="beer"]').click();assert.equal(await page.locator('.cart .line output').textContent(),'2');
   await page.locator('[data-action="save-quick"]').click();await page.locator('#dialog input[name="table"]').fill('1');await page.locator('#dialog-submit').click();
   await page.locator('[data-increase="beer"]').click();assert.equal(await page.locator('.cart .line output').textContent(),'3');
   await page.locator('[data-edit-quantity]').click();await page.locator('#dialog input[name="quantity"]').fill('4');await page.locator('#dialog-submit').click();
   assert.equal(await page.locator('.cart .line output').textContent(),'4');await page.screenshot({path:`${out}/${width}-quantity.png`,fullPage:true});
   await page.locator('[data-action="precheck"]').click();assert.equal(await page.locator('[data-decrease="beer"]').isDisabled(),true);
   await page.locator('[data-action="cancel-precheck"]').click();await page.locator('#dialog input[name="reason"]').fill('Synthetic quantity correction');await page.locator('#dialog-submit').click();
   await page.locator('[data-decrease="beer"]').click();assert.equal(await page.locator('.cart .line output').textContent(),'3');
   assert.equal(get('bd_sales_events_v1').length,1);assert.equal(get('bd_stock_movements').length,1);
   await page.locator('[data-action="cancel-order"]').click();await page.locator('#dialog input[name="reason"]').fill('Synthetic draft finished');await page.locator('#dialog-submit').click();
   await page.locator('[data-view="overview"]').click();
   await page.locator('[data-management-workday]').waitFor();assert.match(await page.locator('[data-management-workday]').innerText(),/ФОТ не сохранён/);
   await page.locator('[data-view="cashier"]').click();await page.locator('[data-action="close-shift"]').click();await page.locator('#dialog-submit').click();
   await page.locator('#report-view [data-management-workday]').waitFor();
   const day=await (await runtime.api.days.GET(runtime.request(user,"/api/operational-days"))).json() as {days:{businessDate:string}[]};const date=day.days[0].businessDate;
   await page.locator('#report-view [data-management-workday] a').click();await page.locator('[data-workday-state="NEW"]').waitFor();assert.equal(new URL(page.url()).searchParams.get('workday'),date);await page.goto(base+'/shifts?venue='+venueId+'&month='+date.slice(0,7)+'&shift='+encodeURIComponent('operational-report:'+venueId+':'+date));await page.getByRole('dialog').waitFor();
   assert.equal(new URL(page.url()).searchParams.get('month'),date.slice(0,7));assert.match(await page.getByRole('dialog').innerText(),/Рабочий день/);
   await page.getByRole('button',{name:'Заполнить операционные данные',exact:true}).click();await page.locator('[data-bd-pos-revenue="readonly"]').waitFor();
   await page.getByRole('button',{name:'Закрыть форму',exact:true}).click();await page.locator('[data-bd-shift-closing]').waitFor({state:'hidden'});
   const revenueBefore=get('bd_finance_revenue');
   put('bd_employees',[{id:'anna',name:'Anna QA',active:true,venueId}]);
   const saved=await runtime.api.close.POST(runtime.request(user,'/api/shifts/close','POST',{venueId,sectionsVersion:1,shiftCloseId:'qa-staff',revenueRecord:{date,staffing:[{employeeId:'anna',hours:7}],payrollBreakdown:{total:70,perEmployee:{anna:70}}},writeOffItems:[]}));assert.equal(saved.status,201);
   assert.deepEqual(get('bd_finance_revenue'),revenueBefore);assert.equal(revenueBefore[0].revenue,20);
   await page.goto(base+'/cashier?venue='+venueId);await page.locator('#work:not([hidden])').waitFor();await page.locator('[data-view="report"]').click();
   await page.locator('#report-view [data-management-workday]').filter({hasText:'Anna QA'}).waitFor();assert.match(await page.locator('#report-view [data-management-workday]').innerText(),/70/);
   await page.screenshot({path:`${out}/${width}-report.png`,fullPage:true});
   await page.reload();await page.locator('#work:not([hidden])').waitFor();await page.locator('[data-view="report"]').click();await page.locator('#report-view [data-management-workday]').filter({hasText:'Anna QA'}).waitFor();
   assert.deepEqual(errors,[]);results.push({width,status:'PASS',entrypoints:3,reload:true,staffingHours:7,recordedPayroll:70,revenueUnchanged:true,panelPreserved:true,connectionRecovered:true,quantityInitialAndSaved:true,precheckLocked:true});
  } catch(error){writeFileSync(`${out}/${width}-failure.json`,JSON.stringify({url:page.url(),errors,frames:page.frames().map(frame=>frame.url()),text:await page.evaluate(()=>document.body.innerText)},null,2));await page.screenshot({path:`${out}/${width}-failure.png`,fullPage:true});throw error;} finally{await context.close();}
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));await Promise.allSettled(pendingHandlers);runtime.close();}

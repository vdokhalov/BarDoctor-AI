import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync,mkdirSync,existsSync,mkdtempSync,writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname,resolve,join } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { GET as cashierPage } from "../app/cashier/route";
const require=createRequire(import.meta.url),{resolveBrowserExecutable,chromiumArgs}=require("./browser-runtime.cjs");
const output=resolve("outputs/pos-recovery");mkdirSync(output,{recursive:true});
const isolated=mkdtempSync(join(tmpdir(),"bardoctor-pos-qa-"));
const r=await lifecycleRuntime({sales:"./app/api/sales-events/route",orders:"./app/api/pos-orders/route",discounts:"./app/api/pos-discounts/route",overview:"./app/api/pos-overview/route"},{sqlitePath:join(isolated,"synthetic.sqlite")});
const owner=await r.register("pos-recovery-owner@isolated.test"),anna=await r.register("pos-recovery-anna@isolated.test"),zero=await r.register("pos-recovery-zero@isolated.test");
r.sqlite.prepare("UPDATE accounts SET first_name='Владелец QA',restaurant_json=? WHERE id=?").run(JSON.stringify({currency:"MDL",name:"BarDoctor QA",timezone:"Europe/Chisinau"}),owner.userId);
r.sqlite.prepare("UPDATE accounts SET first_name='Анна',last_name='' WHERE id=?").run(anna.userId);r.sqlite.prepare("UPDATE accounts SET first_name='Олег',last_name='' WHERE id=?").run(zero.userId);
const workspace=r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(owner.activeVenueId)!.workspace_id!;
for(const user of [anna,zero]){
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,user.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,job_title,status) VALUES (?,?,'cashier','waiter','active')").run(owner.activeVenueId,user.userId);
}
const fixture=salesEventFixture();const menu=fixture.assortment.menuItems as {id:string;name:string;venueId:number;sectionId?:string;category?:string}[];
for(const item of menu){item.venueId=owner.activeVenueId;item.category="Напитки";}
menu[0].name="Капучино";
r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(owner.userId,"bd_assortment_v1",JSON.stringify(fixture.assortment));
async function call(user:typeof owner,route:string,body:object){const headers=new Headers(r.request(user,"/api").headers);headers.set("X-Venue-Id",String(owner.activeVenueId));const response=await r.api[route].POST(new Request("https://isolated.test/api",{method:"POST",headers,body:JSON.stringify({venueId:owner.activeVenueId,...body})}));const result=await response.json() as Record<string,unknown>;assert(response.ok,JSON.stringify(result));return result;}
await call(owner,"sales",{action:"open_shift",shiftId:"night",name:"Ночная смена",openingFloat:100});
await call(owner,"discounts",{action:"save",ruleId:"qa-rule",expectedRevision:0,operationId:"qa-rule-create",rule:{name:"QA 10%",kind:"PERCENT",value:10,active:true}});
for(let n=1;n<=10;n++){
 await call(anna,"orders",{action:"create",operationId:"create-"+n,orderId:"table-"+n,expectedRevision:0,shiftId:"night",tableNumber:String(n),lines:[{id:"line-"+n,menuItemId:"beer",quantity:n%3+1}]});
 if(n%2===0)await call(anna,"orders",{action:"precheck",operationId:"precheck-"+n,orderId:"table-"+n,expectedRevision:1});
}
await call(anna,"sales",{action:"post",command:{id:"invalid-preview",source:"POS_API",shiftId:"night",lines:[{id:"line",menuItemId:"beer",quantity:1}],payments:[{id:"p",method:"CASH",amount:20}]},previewHash:""}).then(()=>{throw Error("Missing preview accepted");},()=>{});
const direct={id:"anna-paid",source:"POS_API",shiftId:"night",lines:[{id:"line",menuItemId:"beer",quantity:1}],payments:[{id:"p",method:"CASH",amount:20}]};
const preview=await call(anna,"sales",{action:"preview",command:direct});await call(anna,"sales",{action:"post",command:direct,previewHash:preview.previewHash});
let apiCalls=0;const errors:string[]=[];
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||"/","http://127.0.0.1");
  if(url.pathname==="/cashier"){const response=cashierPage();res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const route=({"/api/sales-events":"sales","/api/pos-orders":"orders","/api/pos-discounts":"discounts","/api/pos-overview":"overview"} as Record<string,string>)[url.pathname];
  if(route){apiCalls++;const chunks:Buffer[]=[];for await(const part of req)chunks.push(part);const response=await r.api[route][req.method||"GET"](new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==="GET"?{}:{body:Buffer.concat(chunks)})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const path=resolve("public","."+url.pathname);if(!path.startsWith(resolve("public")+"/")||!existsSync(path)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":({".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"} as Record<string,string>)[extname(path)]||"application/octet-stream"});res.end(readFileSync(path));
 }catch(e){errors.push(String(e));res.writeHead(500);res.end("Fixture error");}
});
await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:[...chromiumArgs,"--no-proxy-server","--disable-dev-shm-usage"]});
try{
 for(const profile of [{name:"desktop",width:1440,height:1000},{name:"tablet",width:820,height:1180},{name:"iphone",width:390,height:844}]){
  const context=await browser.newContext({viewport:profile});await context.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:owner,venue:owner.activeVenueId});
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));await page.clock.install();
  await page.goto(base+"/cashier");await page.locator("#work").waitFor({state:"visible"});await page.locator('[data-order="table-1"]').first().click();
  await page.screenshot({path:join(output,profile.name+"-cashier.png"),fullPage:true});
  await page.getByRole("button",{name:"Текущая смена",exact:true}).click();await page.locator(".staff-table").waitFor();
  assert.match(await page.locator(".staff-table").innerText(),/Олег/);assert.match(await page.locator(".staff-table").innerText(),/Нет открытых счетов и продаж/);
  await page.screenshot({path:join(output,profile.name+"-overview.png"),fullPage:true});
  await page.locator(`[data-waiter="${anna.userId}"]`).click();await page.locator(".detail-list").waitFor();assert.equal(await page.locator(".detail-list .order-card").count(),10);
  await page.locator('.detail-list [data-order="table-10"]').scrollIntoViewIfNeeded();assert(await page.locator('.detail-list [data-order="table-10"]').isVisible());
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,profile.name+"-anna.png"),fullPage:true});
  await page.locator('[data-detail="paid"]').click();assert.equal(await page.locator("#overview-view .receipt-row").count(),1);
  await page.locator("#overview-view .receipt-row").click();await page.locator("dialog").waitFor();assert.doesNotMatch(await page.locator("dialog").innerText(),/Себестоимость|recipeSnapshot/);await page.getByRole("button",{name:"Закрыть",exact:true}).click();
  await page.locator('[data-action="all-staff"]').click();await page.locator(".staff-table").waitFor();
  await page.route("**/api/pos-overview?*",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"Synthetic offline check"})}));
  await page.clock.runFor(15000);await page.getByText("Данные устарели",{exact:true}).waitFor();assert(await page.locator(".staff-table").isVisible());
  await page.unroute("**/api/pos-overview?*");await page.clock.runFor(15000);await page.getByText("На связи",{exact:true}).waitFor();
  await page.locator(`[data-waiter="${anna.userId}"]`).click();assert.equal(await page.locator(".detail-list .order-card").count(),10);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),profile.name+" overflow");
  await page.getByRole("button",{name:"Касса",exact:true}).click();await page.getByRole("button",{name:"Быстрая продажа",exact:false}).click();
  if(profile.width<600)await page.locator('.mobile-tabs [data-pane="menu"]').first().click();
  await page.locator('[data-add="beer"]').click();
  if(profile.width<600)await page.locator('.mobile-tabs [data-pane="order"]').first().click();
  if(profile.name==="desktop")await page.route("**/api/sales-events",async route=>{
    if(route.request().method()==="POST"&&route.request().postDataJSON().action==="post"){
      const response=await route.fetch();assert.equal(response.status(),201);await route.abort("failed");
    }else await route.continue();
  });
  await page.getByRole("button",{name:/К оплате/}).click();await page.getByRole("button",{name:"Подтвердить оплату",exact:true}).click();
  if(profile.name==="desktop"){
    await page.getByText("Результат операции ещё не подтверждён.",{exact:true}).waitFor();
    await page.unroute("**/api/sales-events");await page.reload();await page.locator('[data-action="retry"]').click();
    await page.getByText("Результат подтверждён. Операция учтена один раз.",{exact:true}).waitFor();
  }
  await page.locator("#receipts-view:not([hidden])").waitFor();
  assert.equal(await page.locator("#receipts-view .receipt-row").count(),2+["desktop","tablet","iphone"].indexOf(profile.name));
  // Exercise mutations through the UI, including a frozen precheck, audited discount and split.
  await page.getByRole("button",{name:"Касса",exact:true}).click();await page.locator('[data-action="create-order"]').click();
  await page.locator('dialog [name="table"]').fill("20");await page.getByRole("button",{name:"Создать заказ",exact:true}).click();await page.locator("dialog").waitFor({state:"hidden"});
  if(profile.width<600)await page.locator('.mobile-tabs [data-pane="menu"]').first().click();
  await page.locator('[data-add="beer"]').click();await page.locator('[data-add="beer"]').click();
  if(profile.width<600)await page.locator('.mobile-tabs [data-pane="order"]').first().click();
  await page.locator('[data-action="precheck"]').click();await page.locator(".admin-actions summary").click();
  await page.locator('[data-action="cancel-precheck"]').click();await page.locator('dialog [name="reason"]').fill("Synthetic correction");await page.locator("#dialog-submit").click();await page.locator("dialog").waitFor({state:"hidden"});
  await page.locator(".admin-actions summary").click();await page.locator('[data-action="discount"]').click();await page.locator('dialog [name="reason"]').fill("Synthetic discount");await page.locator("#dialog-submit").click();await page.locator("dialog").waitFor({state:"hidden"});
  assert.match(await page.locator(".cart .readonly").innerText(),/QA 10%/);
  await page.locator(".admin-actions summary").click();await page.locator('[data-action="discount"]').click();await page.locator('dialog [name="reason"]').fill("Before split");await page.locator("#dialog-submit").click();await page.locator("dialog").waitFor({state:"hidden"});
  await page.locator(".admin-actions summary").click();await page.locator('[data-action="split"]').click();await page.locator('dialog input[type="number"]').first().fill("1");await page.locator("#dialog-submit").click();await page.locator("dialog").waitFor({state:"hidden"});
  const currentOrders=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!.data_json));
  const split=currentOrders.filter((order:{status:string;tableNumber:string})=>order.status==="OPEN"&&order.tableNumber==="20");assert.equal(split.length,2);
  for(const order of split){
    await page.locator(`[data-order="${order.id}"]`).first().click();await page.locator(".admin-actions summary").click();await page.locator('[data-action="cancel-order"]').click();await page.locator('dialog [name="reason"]').fill("End synthetic flow");await page.locator("#dialog-submit").click();await page.locator("dialog").waitFor({state:"hidden"});
  }

  await page.reload();await page.locator("#work").waitFor({state:"visible"});assert.equal(await page.locator("#recovery").isVisible(),false);
  await context.close();
 }
 const staffContext=await browser.newContext({viewport:{width:390,height:844}});await staffContext.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:anna,venue:owner.activeVenueId});const page=await staffContext.newPage();page.on("pageerror",error=>errors.push(error.message));await page.goto(base+"/cashier");await page.locator("#work").waitFor({state:"visible"});
 assert.equal(await page.locator('[data-view="overview"]').count(),0);assert.equal(await page.locator('[data-action="close-shift"]').count(),0);await page.getByRole("button",{name:"Чеки",exact:true}).click();assert.equal(await page.locator("#receipts-view .receipt-row").count(),1);
 await staffContext.close();
 // Finish the synthetic shift through real order cancellation API, then verify the report in the browser.
 const stored=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!;
 for(const order of JSON.parse(String(stored.data_json)))if(order.status==="OPEN")await call(owner,"orders",{action:"cancel_order",orderId:order.id,operationId:"cancel-"+order.id,expectedRevision:order.revision,reason:"End of synthetic browser scenario"});
 await call(owner,"sales",{action:"cash",shiftId:"night",cash:{operationId:"cash-in",kind:"IN",amount:20,reason:"Synthetic float adjustment"}});
 await call(owner,"sales",{action:"close_shift",shiftId:"night",actualCash:198});
 const final=await browser.newContext({viewport:{width:1440,height:1000}});await final.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:owner,venue:owner.activeVenueId});const report=await final.newPage();report.on("pageerror",error=>errors.push(error.message));await report.goto(base+"/cashier");await report.locator("#work").waitFor({state:"visible"});await report.getByRole("button",{name:"Отчёт смены",exact:true}).click();await report.locator(".report .metrics").waitFor();await report.screenshot({path:join(output,"desktop-report.png"),fullPage:true});await report.setViewportSize({width:390,height:844});assert(await report.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await report.screenshot({path:join(output,"iphone-report.png"),fullPage:true});await final.close();
 assert.deepEqual(errors,[]);writeFileSync(join(output,"result.json"),JSON.stringify({status:"PASS",viewports:[1440,820,390],realApi:true,persistentSyntheticSqlite:true,apiCalls,consoleErrors:errors,scenarios:["Anna ten tables","paid receipts","management only","return to list","stale and refresh","lost payment response and reload replay","create and add","precheck and cancellation","apply and remove discount","split and cancel","cash reconciliation"],physicalIPhone:false,hardware:false},null,2));console.log(JSON.stringify({status:"PASS",apiCalls,viewports:[1440,820,390],consoleErrors:errors}));
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));r.close();}

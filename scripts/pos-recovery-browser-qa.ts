import { seedMemberJob } from "../tests/helpers/staff-job-fixture";
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
const r=await lifecycleRuntime({sales:"./app/api/sales-events/route",orders:"./app/api/pos-orders/route",discounts:"./app/api/pos-discounts/route",overview:"./app/api/pos-overview/route",members:"./app/api/access/members/[id]/route"},{sqlitePath:join(isolated,"synthetic.sqlite")});
const owner=await r.register("pos-recovery-owner@isolated.test"),anna=await r.register("pos-recovery-anna@isolated.test"),zero=await r.register("pos-recovery-zero@isolated.test");
r.sqlite.prepare("UPDATE accounts SET first_name='Владелец QA',restaurant_json=? WHERE id=?").run(JSON.stringify({currency:"MDL",name:"BarDoctor QA",timezone:"Europe/Chisinau"}),owner.userId);
r.sqlite.prepare("UPDATE accounts SET first_name='Анна',last_name='' WHERE id=?").run(anna.userId);r.sqlite.prepare("UPDATE accounts SET first_name='Олег',last_name='' WHERE id=?").run(zero.userId);
const workspace=r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(owner.activeVenueId)!.workspace_id!;
for(const user of [anna,zero]){
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,user.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(owner.activeVenueId,user.userId);
 seedMemberJob(r.sqlite,user.userId,owner.activeVenueId,"waiter");
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
  const route=url.pathname.startsWith("/api/access/members/")?"members":({"/api/sales-events":"sales","/api/pos-orders":"orders","/api/pos-discounts":"discounts","/api/pos-overview":"overview"} as Record<string,string>)[url.pathname];
  if(route){apiCalls++;const chunks:Buffer[]=[];for await(const part of req)chunks.push(part);const response=await r.api[route][req.method||"GET"](new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==="GET"?{}:{body:Buffer.concat(chunks)})}),{params:Promise.resolve({id:url.pathname.split("/").at(-1)})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
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
  await page.goto(base+"/cashier");await page.locator("#work").waitFor({state:"visible"});assert.equal(await page.locator("#sales-journal").isVisible(),true);assert.equal(await page.locator("#sales-journal").getAttribute("href"),"/sales-import");await page.locator('[data-order="table-1"]').first().click();
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
  await page.waitForFunction(()=>document.querySelector("#work")?.getAttribute("aria-busy")==="false"&&document.querySelectorAll(".cart .line").length===2);
  const geometry=await page.evaluate(()=>{
    const footer=document.querySelector(".cart-foot")!,last=[...document.querySelectorAll(".cart .line")].at(-1)!;
    return {position:getComputedStyle(footer).position,top:footer.getBoundingClientRect().top,lastBottom:last.getBoundingClientRect().bottom};
  });
  assert.equal(geometry.position,"static");assert(geometry.top>=geometry.lastBottom,"checkout does not overlap order lines");
  await page.locator('[data-action="payment"]').scrollIntoViewIfNeeded();assert(await page.locator('[data-action="payment"]').isVisible());
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
 assert.equal(await page.locator("#sales-journal").isVisible(),false);
 assert.equal(await page.locator("#cashier-venue-host").isVisible(),false);
 await page.locator('[data-action="quick"]').click();await page.locator('[data-pane="menu"]').first().click();await page.locator('[data-add="beer"]').click();await page.locator('[data-pane="order"]').click();
 assert.equal(await page.locator('[data-increase-line]').count(),1);assert.equal(await page.locator('[data-decrease-line],[data-cancel-line],[data-action="split"],[data-action="cancel-precheck"]').count(),0);
 await page.locator('[data-increase-line]').click();assert.equal(await page.locator('.cart .line output').innerText(),'2');
 await page.reload();await page.locator('.cart .line output').waitFor();assert.equal(await page.locator('.cart .line output').innerText(),'2');assert.equal(await page.locator('[data-decrease-line],[data-cancel-line]').count(),0);

 assert.equal(await page.locator('[data-view="overview"]').count(),0);assert.equal(await page.locator('[data-action="close-shift"]').count(),0);await page.getByRole("button",{name:"Чеки",exact:true}).click();assert.equal(await page.locator("#receipts-view .receipt-row").count(),1);
 await staffContext.close();
 // Finish the synthetic shift through real order cancellation API, then verify the report in the browser.
 const stored=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!;
 for(const order of JSON.parse(String(stored.data_json)))if(order.status==="OPEN")await call(owner,"orders",{action:"cancel_order",orderId:order.id,operationId:"cancel-"+order.id,expectedRevision:order.revision,reason:"End of synthetic browser scenario"});
 await call(owner,"sales",{action:"cash",shiftId:"night",cash:{operationId:"cash-in",kind:"IN",amount:20,reason:"Synthetic float adjustment"}});
 const final=await browser.newContext({viewport:{width:1440,height:1000}});await final.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:owner,venue:owner.activeVenueId});const report=await final.newPage();report.on("pageerror",error=>errors.push(error.message));await report.goto(base+"/cashier");await report.locator("#work").waitFor({state:"visible"});await report.locator('[data-action="close-shift"]').click();await report.locator('dialog [name="actual"]').fill("198");await report.locator("#dialog-submit").click();await report.locator("dialog").waitFor({state:"hidden"});await report.locator("#report-view:not([hidden]) .report .metrics").waitFor();await report.screenshot({path:join(output,"desktop-report.png"),fullPage:true});await report.setViewportSize({width:390,height:844});assert(await report.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await report.screenshot({path:join(output,"iphone-report.png"),fullPage:true});await final.close();
 // Independent-review regressions: two real browser sessions over one synthetic database.
 const manager=await r.register("pos-review-manager@isolated.test");
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,manager.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'manager','active')").run(owner.activeVenueId,manager.userId);
 const memberId=Number(r.sqlite.prepare("SELECT id FROM venue_memberships WHERE venue_id=? AND account_id=?").get(owner.activeVenueId,manager.userId)!.id);
 await call(owner,"sales",{action:"open_shift",shiftId:"review-live",name:"Review live",openingFloat:0});
 const reviewer=await browser.newContext({viewport:{width:1440,height:1000}}),operator=await browser.newContext({viewport:{width:820,height:1180}});
 for(const [context,user] of [[reviewer,manager],[operator,owner]] as const)await context.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user,venue:owner.activeVenueId});
 const managerPage=await reviewer.newPage(),operatorPage=await operator.newPage();
 for(const page of [managerPage,operatorPage])page.on("pageerror",error=>errors.push(error.message));
 await managerPage.clock.install();let reportRequests=0;managerPage.on("request",request=>{if(request.url().includes("reportShiftId="))reportRequests++;});
 await Promise.all([managerPage.goto(base+"/cashier"),operatorPage.goto(base+"/cashier")]);
 await managerPage.locator("#work").waitFor({state:"visible"});await operatorPage.locator("#work").waitFor({state:"visible"});
 await managerPage.locator('[data-view="report"]').click();await managerPage.locator(".report-fresh").waitFor();
 const revenue=()=>managerPage.locator(".report .metric").first().locator("strong");
 assert.match(await revenue().innerText(),/^0,00/);
 async function operatorSale(){
  await operatorPage.locator('[data-view="cashier"]').click();await operatorPage.locator('[data-action="quick"]').click();await operatorPage.locator('[data-add="beer"]').click();
  await operatorPage.locator('[data-action="payment"]').click();await operatorPage.locator("#dialog-submit").click();await operatorPage.locator("dialog").waitFor({state:"hidden"});await operatorPage.locator("#receipts-view:not([hidden])").waitFor();
 }
 await operatorSale();assert.match(await revenue().innerText(),/^0,00/);
 await managerPage.clock.runFor(15000);await managerPage.waitForFunction(()=>document.querySelector(".report .metric strong")?.textContent?.startsWith("20,00"));
 const lastSuccess=await managerPage.locator(".report-fresh").getAttribute("data-last-success");
 await operatorSale();await managerPage.route("**/api/sales-events?reportShiftId=*",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"Synthetic report unavailable"})}));
 await managerPage.clock.runFor(15000);await managerPage.getByText("Данные устарели",{exact:true}).waitFor();assert.match(await revenue().innerText(),/^20,00/);assert.equal(await managerPage.locator(".report-fresh").getAttribute("data-last-success"),lastSuccess);
 await managerPage.unroute("**/api/sales-events?reportShiftId=*");await managerPage.clock.runFor(15000);await managerPage.waitForFunction(()=>document.querySelector(".report .metric strong")?.textContent?.startsWith("40,00"));
 assert.notEqual(await managerPage.locator(".report-fresh").getAttribute("data-last-success"),lastSuccess);
 await operatorPage.locator('[data-view="cashier"]').click();await operatorPage.locator('[data-action="close-shift"]').click();await operatorPage.locator('dialog [name="actual"]').fill("40");await operatorPage.locator("#dialog-submit").click();await operatorPage.locator("dialog").waitFor({state:"hidden"});
 await managerPage.clock.runFor(15000);await managerPage.locator(".report .badge").filter({hasText:"Закрыта"}).waitFor();const closedRequests=reportRequests,closedSuccess=await managerPage.locator(".report-fresh").getAttribute("data-last-success");
 await call(owner,"sales",{action:"open_shift",shiftId:"review-next",name:"Next shift",openingFloat:0});
 const nextRefresh=managerPage.waitForResponse(response=>response.url().endsWith("/api/pos-orders"));await managerPage.clock.runFor(15000);await nextRefresh;
 assert.match(await revenue().innerText(),/^40,00/);assert.equal(reportRequests,closedRequests);assert.equal(await managerPage.locator(".report-fresh").getAttribute("data-last-success"),closedSuccess);
 // Change the manager's role through the actual owner-authorized access API in another browser session.
 const changed=await operatorPage.evaluate(async({memberId,venue})=>{
  const response=await fetch("/api/access/members/"+memberId,{method:"PATCH",headers:{"Content-Type":"application/json","X-Session-Email":localStorage.getItem("bd_session")!,"X-Session-Token":localStorage.getItem("bd_session_token")!,"X-Venue-Id":String(venue)},body:JSON.stringify({role:"cashier",jobTitle:"waiter"})});return {status:response.status,body:await response.text()};
 },{memberId,venue:owner.activeVenueId});assert.equal(changed.status,200,changed.body);
 await managerPage.route("**/api/pos-orders",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"Synthetic orders unavailable after role change"})}));
 await managerPage.clock.runFor(15000);await managerPage.locator("#cashier-view:not([hidden])").waitFor();await managerPage.getByText("Данные устарели",{exact:true}).waitFor();
 await managerPage.unroute("**/api/pos-orders");
 for(const name of ["report","overview","discounts"]){assert.equal(await managerPage.locator(`#${name}-view`).innerHTML(),"");assert.equal(await managerPage.locator(`[data-view="${name}"]`).count(),0);}
 await managerPage.emulateMedia({media:"print"});assert.equal(await managerPage.locator(".report").count(),0);await managerPage.emulateMedia({media:"screen"});
 // Restore only the synthetic membership, then exercise an actual cross-tab venue change.
 const restored=await operatorPage.evaluate(async({memberId,venue})=>{const response=await fetch("/api/access/members/"+memberId,{method:"PATCH",headers:{"Content-Type":"application/json","X-Session-Email":localStorage.getItem("bd_session")!,"X-Session-Token":localStorage.getItem("bd_session_token")!,"X-Venue-Id":String(venue)},body:JSON.stringify({role:"manager",jobTitle:null})});return response.status;},{memberId,venue:owner.activeVenueId});assert.equal(restored,200);
 await managerPage.reload();await managerPage.locator("#work").waitFor({state:"visible"});await managerPage.locator('[data-view="report"]').click();await managerPage.locator(".report").waitFor();
 const sibling=await reviewer.newPage();await sibling.goto(base+"/cashier");await sibling.evaluate(venue=>localStorage.setItem("bd_active_venue_id",String(venue)),manager.activeVenueId);
 await managerPage.locator("#work").waitFor({state:"hidden"});assert.equal(await managerPage.locator("#report-view").innerHTML(),"");assert.equal(await managerPage.locator("#dialog-content").innerHTML(),"");
 // Re-enter the original venue explicitly: the canonical switcher now also updates the URL in sibling tabs.
 await managerPage.goto(base+"/cashier?venue="+owner.activeVenueId);await managerPage.locator("#work").waitFor({state:"visible"});await managerPage.locator('[data-view="report"]').click();await managerPage.locator(".report").waitFor();
 await sibling.evaluate(()=>localStorage.removeItem("bd_session_token"));await managerPage.locator("#work").waitFor({state:"hidden"});assert.equal(await managerPage.locator("#report-view").innerHTML(),"");assert.equal(await managerPage.locator("#dialog-content").innerHTML(),"");
 await reviewer.close();await operator.close();
 // Late recovery review: quick-to-table acknowledgement must consume only its source draft.
 const stockBeforeTransfer=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(owner.userId)!.data_json;
 for(const [index,scenario] of ["lost-response","confirmed-reload-failure","changed-draft","ordinary-create"].entries()){
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:owner,venue:owner.activeVenueId});
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));await page.goto(base+"/cashier");await page.locator("#work").waitFor({state:"visible"});
  await page.locator('.mobile-tabs [data-pane="menu"]').first().click();await page.locator('[data-add="beer"]').click();await page.locator('[data-add="coffee"]').click();await page.locator('.mobile-tabs [data-pane="order"]').first().click();
  const key=`bd_pos_workspace_v2:${owner.userId}:${owner.activeVenueId}`;
  const initial=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);assert.equal(initial.quick.lines.length,2);
  let createPosts=0,failReload=false;
  await page.route("**/api/pos-orders",async route=>{
    if(route.request().method()==="POST"&&route.request().postDataJSON().action==="create"){
      createPosts++;const response=await route.fetch();
      if(createPosts===1){assert.equal(response.status(),201);if(scenario!=="confirmed-reload-failure"){await route.abort("failed");return;}failReload=true;}
      await route.fulfill({response});
    }else await route.continue();
  });
  await page.route("**/api/sales-events",route=>failReload&&route.request().method()==="GET"?route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"Synthetic read failure after confirmed create"})}):route.continue());
  if(scenario==="ordinary-create")await page.locator('[data-action="create-order"]').click();else{await page.locator(".admin-actions summary").click();await page.locator('[data-action="save-quick"]').click();}
  await page.locator('dialog [name="table"]').fill(String(800+index));await page.locator("#dialog-submit").click();
  if(scenario==="confirmed-reload-failure"){
    await page.getByText("Synthetic read failure after confirmed create",{exact:true}).first().waitFor();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);assert.equal(saved.pending,null);assert.equal(saved.quick.lines.length,0);
    failReload=false;await page.reload();await page.locator("#work").waitFor({state:"visible"});assert.equal(createPosts,1);
  }else{
    await page.getByText("Результат операции ещё не подтверждён.",{exact:true}).waitFor();
    const pending=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
    assert.equal(pending.pending.origin?.draftId,scenario==="ordinary-create"?undefined:initial.quick.id);
    if(scenario==="changed-draft"){
      await page.evaluate(key=>{const saved=JSON.parse(localStorage.getItem(key)!);saved.quick.id="unrelated-quick";saved.quick.lines[0].quantity=3;localStorage.setItem(key,JSON.stringify(saved));},key);
      await page.getByRole("button",{name:"Закрыть",exact:true}).click();
    }else{await page.reload();await page.locator("#work").waitFor({state:"visible"});}
    await page.locator('[data-action="retry"]').click();await page.getByText("Результат подтверждён. Операция учтена один раз.",{exact:true}).waitFor();assert.equal(createPosts,2);
  }
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);assert.equal(after.pending,null);
  if(scenario==="changed-draft"){assert.equal(after.quick.id,"unrelated-quick");assert.equal(after.quick.lines[0].quantity,3);}
  else if(scenario==="ordinary-create")assert.deepEqual(after.quick,initial.quick);
  else assert.equal(after.quick.lines.length,0);
  await page.reload();await page.locator("#work").waitFor({state:"visible"});await page.locator('[data-action="quick"]').click();
  assert.equal(await page.locator(".cart .line").count(),["ordinary-create","changed-draft"].includes(scenario)?2:0);
  if(!["ordinary-create","changed-draft"].includes(scenario))assert(await page.locator('[data-action="payment"]').isDisabled());
  const orders=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!.data_json));
  const created=orders.filter((order:{tableNumber:string})=>order.tableNumber===String(800+index));assert.equal(created.length,1);assert.equal(created[0].lines.length,scenario==="ordinary-create"?0:2);
  await context.close();
 }
 assert.equal(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(owner.userId)!.data_json,stockBeforeTransfer);
 assert.deepEqual(errors,[]);writeFileSync(join(output,"result.json"),JSON.stringify({status:"PASS",viewports:[1440,820,390],realApi:true,persistentSyntheticSqlite:true,apiCalls,consoleErrors:errors,scenarios:["Anna ten tables","paid receipts","management only","return to list","stale and refresh","lost payment response and reload replay","create and add","precheck and cancellation","apply and remove discount","split and cancel","cash reconciliation","close via UI opens report immediately","checkout scroll and no overlap","two-session report refresh and transient failure","closed report remains immutable across polling","role downgrade clears cached report and print","cross-tab venue switch and logout clear sensitive DOM","quick to table lost response and browser reload retry","quick to table acknowledgement before reload failure","changed quick draft race preserved","ordinary table creation preserves unrelated quick draft"],physicalIPhone:false,hardware:false},null,2));console.log(JSON.stringify({status:"PASS",apiCalls,viewports:[1440,820,390],consoleErrors:errors}));
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));r.close();}

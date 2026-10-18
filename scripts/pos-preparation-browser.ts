import { posAddItem } from "../tests/helpers/pos-browser-driver";
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
const output=resolve("outputs/pos-preparation");mkdirSync(output,{recursive:true});
const isolated=mkdtempSync(join(tmpdir(),"bardoctor-pos-qa-"));
const r=await lifecycleRuntime({sales:"./app/api/sales-events/route",orders:"./app/api/pos-orders/route",discounts:"./app/api/pos-discounts/route",prep:"./app/api/pos-preparation/route"});
const owner=await r.register("prep-browser@isolated.test");
r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({currency:"MDL",name:"QA",timezone:"Etc/UTC"}),owner.userId);
const fixture=salesEventFixture();(fixture.assortment.menuItems as any[]).forEach(m=>{m.sectionId='bar';m.venueId=owner.activeVenueId});
r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(owner.userId,"bd_assortment_v1",JSON.stringify(fixture.assortment));
r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)").run(owner.userId,"bd_operational_reports_v1",JSON.stringify([{venueId:owner.activeVenueId,date:new Date().toISOString().slice(0,10),workdayStatus:"OPEN",staffing:[{employeeId:"qa"}]}]));
async function call(route:string,body:object){const headers=new Headers(r.request(owner,"/api").headers);headers.set("X-Venue-Id",String(owner.activeVenueId));const response=await r.api[route].POST(new Request("https://isolated.test/api",{method:"POST",headers,body:JSON.stringify({venueId:owner.activeVenueId,...body})}));assert(response.ok,await response.text());}
await call('sales',{action:'open_shift',shiftId:'shift',name:'QA'});
await call('orders',{action:'create',operationId:'create',orderId:'table',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'a',menuItemId:'beer',quantity:2}]});
let apiCalls=0;const errors:string[]=[];
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||"/","http://127.0.0.1");
  if(url.pathname==="/cashier"){const response=cashierPage();res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const route=url.pathname.startsWith("/api/access/members/")?"members":({"/api/operational-days":"days","/api/sales-events":"sales","/api/pos-orders":"orders","/api/pos-preparation":"prep","/api/pos-discounts":"discounts","/api/pos-overview":"overview"} as Record<string,string>)[url.pathname];
  if(route){apiCalls++;const chunks:Buffer[]=[];for await(const part of req)chunks.push(part);const response=await r.api[route][req.method||"GET"](new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(req.method==="GET"?{}:{body:Buffer.concat(chunks)})}),{params:Promise.resolve({id:url.pathname.split("/").at(-1)})});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  const path=resolve("public","."+url.pathname);if(!path.startsWith(resolve("public")+"/")||!existsSync(path)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":({".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png"} as Record<string,string>)[extname(path)]||"application/octet-stream"});res.end(readFileSync(path));
 }catch(e){errors.push(String(e));res.writeHead(500);res.end("Fixture error");}
});
await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:[...chromiumArgs,"--no-proxy-server","--disable-dev-shm-usage"]});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(({user,venue})=>{localStorage.setItem("bd_session",user.email);localStorage.setItem("bd_session_token",user.token);localStorage.setItem("bd_active_venue_id",String(venue));},{user:owner,venue:owner.activeVenueId});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/cashier');await page.locator('[data-order="table"]').first().click();
 await page.locator('.admin-actions summary').click();await page.locator('[data-action="preparation-routes"]').click();await page.locator('dialog [name="sectionId"]').selectOption('bar');await page.locator('dialog [name="printerId"]').fill('logical-bar');await page.locator('dialog [name="printerName"]').fill('Бар');await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.route('**/api/pos-orders',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='confirm'){const response=await route.fetch();assert.equal(response.status(),201);await route.abort('failed')}else await route.continue()});
 await page.locator('[data-action="confirm-order"]').click();assert.match(await page.locator('dialog').innerText(),/Beer × 2/);await page.locator('#dialog-submit').click();await page.locator('[data-action="retry"]').waitFor();await page.unroute('**/api/pos-orders');await page.reload();await page.locator('[data-action="retry"]').click();await page.getByText('Результат подтверждён. Операция учтена один раз.',{exact:true}).waitFor();await page.locator('[data-order="table"]').first().click();
 assert(await page.locator('[data-action="confirm-order"]').isDisabled());await page.getByText('Бегунки (1)',{exact:true}).click();assert.match(await page.locator('.cart-foot').innerText(),/Не напечатано/);
 await page.locator('.mobile-tabs [data-pane="menu"]').first().click();await posAddItem(page,'[data-add="beer"]');await page.locator('.mobile-tabs [data-pane="order"]').first().click();await page.locator('[data-action="confirm-order"]').click();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 const stored=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!.data_json));assert.equal(stored[0].preparationTickets.length,2);assert.deepEqual(stored[0].preparationTickets.map((t:any)=>t.lines.length),[1,1]);assert.equal(stored[0].preparationTickets[1].lines[0].quantity,1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 await page.route('**/api/pos-orders',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='cancel_item'){const response=await route.fetch();assert.equal(response.status(),201);await route.abort('failed')}else await route.continue()});
 await page.locator('[data-cancel-line="a"]').click();await page.locator('dialog [name="quantity"]').fill('1');await page.locator('dialog [name="reason"]').fill('Guest cancellation');await page.locator('dialog [name="stockDecision"]').selectOption('NO_WRITE_OFF');assert.match(await page.locator('dialog').innerText(),/ОТМЕНА/);await page.locator('#dialog-submit').click();await page.locator('[data-action="retry"]').waitFor();await page.unroute('**/api/pos-orders');await page.reload();await page.locator('[data-action="retry"]').click();await page.getByText('Результат подтверждён. Операция учтена один раз.',{exact:true}).waitFor();await page.locator('[data-order="table"]').first().click();await page.getByText('Бегунки (3)',{exact:true}).click();assert.match(await page.locator('.cart-foot').innerText(),/ОТМЕНА.*Бар/s);assert.match(await page.locator('.cart-foot').innerText(),/Guest cancellation/);
 const corrected=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!.data_json))[0];assert.equal(corrected.preparationTickets.length,3);assert.equal(corrected.preparationTickets[2].originalTicketId,corrected.preparationTickets[0].id);assert.equal(corrected.lines.find((l:any)=>l.id==='a').quantity,1);assert.deepEqual(errors,[]);
 console.log('Cancellation UI/reload/replay PASS: one correction ticket, original reference, quantity 1');
 await page.route('**/api/pos-orders',async route=>{if(route.request().method()==='POST'&&route.request().postDataJSON().action==='cancel_item'){const response=await route.fetch();assert.equal(response.status(),201);await route.abort('failed')}else await route.continue()});
 await page.locator('[data-cancel-line="a"]').click();assert.equal(await page.locator('dialog [name="stockDecision"]').inputValue(),'');await page.locator('dialog [name="quantity"]').fill('1');await page.locator('dialog [name="reason"]').fill('Prepared waste');await page.locator('dialog [name="stockDecision"]').selectOption('WRITE_OFF');await page.locator('#dialog-submit').click();await page.locator('[data-action="retry"]').waitFor();await page.unroute('**/api/pos-orders');await page.reload();await page.locator('[data-action="retry"]').click();await page.getByText('Результат подтверждён. Операция учтена один раз.',{exact:true}).waitFor();await page.locator('[data-order="table"]').first().click();await page.getByText('Бегунки (4)',{exact:true}).click();assert.match(await page.locator('.cart-foot').innerText(),/Списано со склада/);
 const stockRead=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)!.data_json));assert.equal(stockRead('bd_inventory_writeoffs').length,1);assert.equal(stockRead('bd_assortment_v1').stockBalances[0].current,19);assert.equal(stockRead('bd_pos_orders_v1')[0].lines.length,1);assert.deepEqual(errors,[]);console.log('Explicit writeoff UI/reload/replay PASS: one document, one unit deducted');

 await page.screenshot({path:join(output,'390-confirmed.png'),fullPage:true});console.log(JSON.stringify({status:'PASS',width:390,tickets:stockRead('bd_pos_orders_v1')[0].preparationTickets.length,lostResponseReplay:'once',errors,apiCalls}));await context.close();
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));r.close();}

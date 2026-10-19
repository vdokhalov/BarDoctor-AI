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
const output=resolve("outputs/print-cloud");mkdirSync(output,{recursive:true});
const isolated=mkdtempSync(join(tmpdir(),"bardoctor-pos-qa-"));
const r=await lifecycleRuntime({sales:"./app/api/sales-events/route",orders:"./app/api/pos-orders/route",discounts:"./app/api/pos-discounts/route",prep:"./app/api/pos-preparation/route",printManagement:"./app/api/print-management/route",printNode:"./app/api/print-node/route"});
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
  const route=url.pathname.startsWith("/api/access/members/")?"members":({"/api/operational-days":"days","/api/sales-events":"sales","/api/pos-orders":"orders","/api/pos-preparation":"prep","/api/print-management":"printManagement","/api/pos-discounts":"discounts","/api/pos-overview":"overview"} as Record<string,string>)[url.pathname];
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
 await page.goto(base+'/cashier');await page.locator('[data-order="table"]').first().click();await page.locator('.admin-actions summary').click();await page.locator('[data-action="print-refresh"]').click();
 await page.locator('[data-action="print-pair"]').click();const pairing=JSON.parse(await page.locator('dialog textarea').inputValue());
 let token='a'.repeat(64);const node=async(action:string,body:object={})=>{const response=await r.api.printNode.POST(new Request('https://isolated.test/api/print-node',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,accountId:owner.userId,venueId:owner.activeVenueId,...body})}));return response};
 assert.equal((await node('pair',{code:pairing.code,token,printers:[{id:'logical-bar',name:'Бар USB'}]})).status,200);
 await page.locator('dialog [data-action="dismiss"]').first().click();await page.locator('[data-action="print-refresh"]').click();await page.getByText(/Узел подключён ·/).waitFor();
 await page.locator('[data-action="preparation-routes"]').click();await page.locator('dialog [name="sectionId"]').selectOption('bar');await page.locator('dialog [name="printerId"]').selectOption('logical-bar');await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.locator('[data-action="print-refresh"]').click();await page.locator('[data-action="print-test"]').click();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 const testJobs:any=await(await node('poll')).json();assert.equal(testJobs.jobs.length,1);assert.equal(testJobs.jobs[0].payload.kind,'TEST');const testJob=testJobs.jobs[0].payload.id;await node('start',{jobId:testJob});await node('ack',{jobId:testJob,status:'accepted_by_transport',detail:'Имитация тестового транспорта; бумага не подтверждена'});
 await page.locator('[data-action="confirm-order"]').click();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 const polled:any=await(await node('poll')).json();assert.equal(polled.jobs.length,1);const jobId=polled.jobs.find((j:any)=>j.payload.kind==='PREPARATION').payload.id;
 assert.equal((await node('start',{jobId})).status,200);assert.equal((await node('ack',{jobId,status:'outcome_unknown',detail:'Имитация потери связи после отправки'})).status,200);
 await page.locator('[data-action="print-refresh"]').click();await page.getByText(/Исход неизвестен ·/).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('[data-action="print-revoke"]').click();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});assert.equal((await node('poll')).status,401);
 await page.reload();await page.locator('[data-order="table"]').first().click();await page.locator('.admin-actions summary').click();await page.locator('[data-action="print-refresh"]').click();await page.getByText(/Узел не активен ·/).waitFor();await page.getByText(/Исход неизвестен ·/).waitFor();assert.deepEqual(errors,[]);
 await page.locator('[data-action="print-replace"]').click();await page.locator('[name="reason"]').fill('Старый компьютер утрачен');await page.locator('[name="reviewed"]').check();await page.locator('#dialog-submit').click();
 await page.locator('dialog textarea').waitFor();const replacement=JSON.parse(await page.locator('dialog textarea').inputValue());assert.equal(replacement.replacement,true);assert.equal((await node('poll')).status,401);
 token='b'.repeat(64);assert.equal((await node('pair',{code:replacement.code,token,printers:[{id:'logical-bar',name:'Бар USB'}]})).status,200);assert.equal(((await(await node('poll')).json()) as {jobs:unknown[]}).jobs.length,0);
 await page.locator('dialog [data-action="dismiss"]').first().click();await page.locator('[data-action="print-refresh"]').click();await page.locator('[data-action^="print-resolve:"]').click();await page.locator('[name="reason"]').fill('Бумага и очередь проверены, обработано вручную');await page.locator('[name="reviewed"]').check();await page.locator('#dialog-submit').click();await page.locator('dialog').waitFor({state:'hidden'});
 await page.locator('[data-action="print-refresh"]').click();await page.locator('[data-action="print-history:"]').click();await page.getByText(/Бумага и очередь проверены/).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(((await(await node('poll')).json()) as {jobs:unknown[]}).jobs.length,0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',width:390,pair:true,routeSelect:true,testPrintQueued:true,confirmQueued:true,unknownVisible:true,revoke:true,reload:true,replacement:true,manualResolution:true,archive:true,noReplay:true,errors}));await context.close();
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));r.close();}

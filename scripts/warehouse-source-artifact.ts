import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const sequential=process.env.BD_SEQUENTIAL_QA==='1';
const fixedTime = "2026-10-22T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ source:"./app/api/inventory/movements/source/route", movements:"./app/api/inventory/movements/route", procurement:"./app/api/procurement/overview/route", documents:"./app/api/finance/documents/route", counts:"./app/api/inventory/counts/route", monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
const pendingHandlers = new Set<Promise<void>>();
let simulatedClosePreparation=process.env.BD_CLOSED_HEALTH_QA==='1';const closeOperationIds:string[]=[];
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/inventory/movements/source":"source", "/api/inventory/movements":"movements", "/api/procurement/overview":"procurement", "/api/finance/documents":"documents", "/api/inventory/counts":"counts", "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(name==='workdays'&&req.method==='POST'&&body.length){const command=JSON.parse(body.toString());if(command.action==='close'){closeOperationIds.push(command.operationId);if(simulatedClosePreparation){simulatedClosePreparation=false;res.writeHead(202,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,pending:true,code:'HEALTH_CLOSE_PENDING'}));return;}}}
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/suppliers", "/warehouse", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
    else {
      const emitted=resolve("dist/client", "." + url.pathname);
      const file = existsSync(emitted)?emitted:resolve("public", "." + url.pathname);
      response = (file.startsWith(resolve("public")) || file.startsWith(resolve("dist/client"))) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    if(url.pathname==="/api/month-close"){const data=await response.clone().json();replies.push({status:response.status,url:url.href,data});}
    if(response.status>=400)failures.push({url:url.pathname,status:response.status,body:(await response.clone().text()).slice(0,500)});
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
const out='outputs/warehouse-source-artifact';mkdirSync(out,{recursive:true});
try {
 const user=await runtime.register('artifact-owner@isolated.test'),accountId=user.userId,venueId=user.activeVenueId,n=2,now=fixedTime;
 const profile={name:'Тестовое заведение',currency:'PMR_RUB',timezone:'UTC',workingDays:[1,2,3,4,5,6,7]};
 runtime.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),accountId);
 const date='2026-10-21',events:any[]=[],movements:any[]=[];
 const insertEvent=runtime.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)');
 const insertChunk=runtime.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)');
 const insertMovement=runtime.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,sales_batch_id,payload_json) VALUES(?,?,?,?,?,?,?,?)');
 runtime.sqlite.exec('BEGIN');
 for(let i=0;i<n+2;i++){
  const eventDate=i<n?date:i===n?'2026-09-30':'2026-11-01';
  const id='event-'+i,cost=10,ingredient={productKey:'product',baseQuantityTotal:1,unitCost:cost,totalCost:cost,currency:'PMR_RUB',costStatus:cost?'KNOWN_VALUE':'KNOWN_ZERO'};
  const batch={id,venueId,businessDate:eventDate,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:cost,lines:[{id:'line-'+i,salesBatchId:id,quantity:1,processingStatus:'POSTED',theoreticalCost:cost,currency:'PMR_RUB',recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[ingredient]}}]};
  const e={note:'fixture bytes '.repeat(500),id,externalId:id,fingerprint:id,venueId,businessDate:eventDate,revenueRowId:'shift',status:'POSTED',source:'POS_API',currency:'PMR_RUB',revenue:50,prices:[],originalMovements:[],batch};events.push(e);
  if(false&&i===1){(e.batch as any).costStatus='UNKNOWN';}
  if(false&&i===2){e.batch=structuredClone(events[1].batch);}
  const json=JSON.stringify(e);insertEvent.run(accountId,id,i,id,'POS_API',eventDate,'shift',id,createHash('sha256').update(json).digest('hex'));insertChunk.run(accountId,id,json);
  const m={id:'movement-'+i,venueId,productKey:'product',type:'sale_consumption',businessDate:eventDate,salesBatchId:id,amount:-1,costAmount:cost,currency:'PMR_RUB'};movements.push(m);insertMovement.run(accountId,-i-1,m.id,'product',m.type,eventDate,id,JSON.stringify(m));
 }
 runtime.sqlite.exec('COMMIT');if(n>10000)assert(Buffer.byteLength(JSON.stringify(events))>2_000_000);
 const adjustment={productName:'Молоко',amount:-1,unit:'l',date,id:'shortage',sourceDocumentId:'count-doc',venueId,productKey:'product',type:'inventory_adjustment',businessDate:date,costAmount:-10,currency:'PMR_RUB',costStatus:'KNOWN_VALUE'};insertMovement.run(accountId,-100,adjustment.id,'product',adjustment.type,date,null,JSON.stringify(adjustment));
 const receipt={id:'receipt',venueId,productKey:'product',productName:'Молоко',type:'receipt',date,businessDate:date,amount:12,unit:'l',costAmount:120,currency:'PMR_RUB',sourceDocumentId:'purchase'};insertMovement.run(accountId,-101,receipt.id,'product',receipt.type,date,null,JSON.stringify(receipt));
 const stores={bd_purchase_documents:[{id:'purchase',documentNumber:'TEST-001',supplierName:'Тестовый поставщик',items:[{id:'line',name:'Молоко',quantity:12,unit:'l',price:10,total:120}],venueId,date,status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:120},{id:'old-purchase',venueId,date:'2026-09-30',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:999},{id:'future-purchase',venueId,date:'2026-11-01',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:888}],bd_finance_revenue:[{id:'shift',venueId,date,revenueSource:'sales_events_v1',revenue:n*50,receipts:n,currency:'PMR_RUB',closingStatus:'closed'}],bd_operational_reports_v1:[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:10}}],bd_finance_expenses:[{id:'writeoff',venueId,date,category:'writeoff',amount:6,currency:'PMR_RUB',sourceDocumentId:'writeoff-doc',source:'write_off_document'},{id:'writeoff2',venueId,date,category:'writeoff',amount:4,currency:'PMR_RUB'}],bd_employees:[{id:"e",venueId,name:"Сотрудник",payrollRuleId:"rule"}],bd_payroll_rules:[{id:"rule",venueId,blocks:[{enabled:true,type:"shift_rate",amount:10}]}],bd_payroll_entries:[],bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[]};
 (stores.bd_finance_revenue as any[]).push({id:'open',venueId,date:'2026-10-22',revenueSource:'sales_events_v1',revenue:0,receipts:0,currency:'PMR_RUB',closingStatus:'open'});
 (stores.bd_operational_reports_v1 as any[]).push({id:'open-report',venueId,date:'2026-10-22',workdayStatus:'OPEN',shiftVenueSales:0,staffing:[{employeeId:'e'}],workdayPayrollDraft:{status:'COMPLETE',basis:'CURRENT_RULE_ESTIMATE',missing:[],payrollBreakdown:{total:10,perEmployee:{e:10}}}});
 for(const [key,value] of Object.entries(stores))runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,JSON.stringify(value));

 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,'bd_inventory_writeoffs',JSON.stringify([{id:'writeoff-doc',venueId,date,status:'posted',number:'17',currency:'PMR_RUB',totalCost:6,items:[{productName:'Молоко',baseQuantity:1,baseUnit:'l',totalCost:6}]}]));
 runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,'bd_inventory_snapshots',JSON.stringify([{id:'count-doc',internalId:'count-doc',venueId,date,status:'completed',number:18,scope:{type:'all',label:'Весь склад'},accountingCurrency:'PMR_RUB',items:[{productKey:'product',productName:'Молоко',unit:'l',expected:2,actual:1,averageUnitCost:10,valuationKnown:true}],createdAt:now,updatedAt:now}]));
 const business=()=>JSON.stringify({domain:runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),events:runtime.sqlite.prepare('SELECT * FROM sales_event_records ORDER BY event_id').all(),chunks:runtime.sqlite.prepare('SELECT * FROM sales_event_chunks ORDER BY event_id').all(),stock:runtime.sqlite.prepare('SELECT * FROM stock_journal_movements ORDER BY position').all()});
 const before=business(),context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'UTC'});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage();await page.clock.setFixedTime(new Date(fixedTime));const errors:string[]=[],consoleErrors:string[]=[],assets:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(/index-BQGspy0I.*\.js/.test(r.url()))assets.push(r.url());});
 try {
  const original=base+'/warehouse?venue='+venueId+'&tab=movements&q='+encodeURIComponent('Молоко');
  await page.goto(original);
  await page.getByRole('button',{name:'Закупка',exact:true}).waitFor({timeout:30000});
  for(const width of [390,820,1280]){
   await page.setViewportSize({width,height:844});
   const filters=page.locator('.bd-warehouse-movement-filters-v275');
   await filters.scrollIntoViewIfNeeded();
   const layout=await filters.evaluate(el=>({display:getComputedStyle(el).display,gap:getComputedStyle(el).gap,buttons:Array.from(el.querySelectorAll('button')).map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,text:b.textContent,whiteSpace:getComputedStyle(b).whiteSpace}}),overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.equal(layout.display,'flex');assert.equal(layout.gap,'8px');assert.equal(layout.overflow,false,JSON.stringify(layout));
   for(let i=0;i<layout.buttons.length;i++){const a=layout.buttons[i];assert(a.x>=0&&a.right<=width);for(const b of layout.buttons.slice(i+1)){if(Math.abs(a.y-b.y)<2)assert(b.x-a.right>=7);else assert(b.y-a.bottom>=7);}}
   assert.notEqual(await page.getByRole('button',{name:'Обновить движения',exact:true}).evaluate(el=>getComputedStyle(el).borderStyle),'none');
   await page.waitForTimeout(250);
   await page.screenshot({path:out+'/controls-'+width+'.png',fullPage:false});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.bd-warehouse-movement-list article').first().evaluate(el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:out+'/mobile-movements.png',fullPage:false});
  await page.getByRole('button',{name:'Закупка',exact:true}).click();
  await page.waitForURL(/documentId=purchase/);
  await page.locator('.bd-proc-sheet-v168').waitFor({timeout:15000});
  assert.match(await page.locator('.bd-proc-sheet-v168').innerText(),/TEST-001/);
  await page.reload();await page.locator('.bd-proc-sheet-v168').waitFor({timeout:15000});
  await page.screenshot({path:out+'/mobile-purchase.png',fullPage:false});
    await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();
  await page.waitForURL(original);await page.getByRole('button',{name:'Инвентаризация',exact:true}).waitFor();
  await page.getByRole('button',{name:'Инвентаризация',exact:true}).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({path:out+'/mobile-inventory-link.png',fullPage:false});
  await page.getByRole('button',{name:'Инвентаризация',exact:true}).click();
  await page.locator('.bd-inventory-sheet-v245').waitFor({timeout:15000});
  await page.reload();await page.locator('.bd-inventory-sheet-v245').waitFor({timeout:15000});
  await page.screenshot({path:out+'/mobile-inventory.png',fullPage:false});
  await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();
  await page.waitForURL(original);await page.getByRole('button',{name:'Закупка',exact:true}).waitFor();
  await page.route('**/api/inventory/movements/source?*',route=>route.fulfill({status:404,json:{ok:false}}));
  await page.getByRole('button',{name:'Закупка',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Исходный документ недоступен.'}).waitFor();assert.equal(page.url(),original);
  await page.unroute('**/api/inventory/movements/source?*');
  await page.locator('.bd-warehouse-movement-filters-v275').getByRole('button',{name:'Закупки',exact:true}).click();
  await page.waitForURL(/movementFilter=purchases/);
  const filtered=page.url();assert.equal(await page.getByRole('button',{name:'Инвентаризация',exact:true}).count(),0);
  await page.getByRole('button',{name:'Закупка',exact:true}).click();await page.locator('.bd-proc-sheet-v168').waitFor();
  await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();await page.waitForURL(filtered);
  await page.reload();await page.getByRole('button',{name:'Закупка',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Инвентаризация',exact:true}).count(),0);
  await page.goBack();await page.locator('.bd-proc-sheet-v168').waitFor();
  await page.goForward();await page.getByRole('button',{name:'Закупка',exact:true}).waitFor();
  assert.equal(page.url(),filtered);
  let releaseSource:()=>void=()=>{};
  await page.route('**/api/inventory/movements/source?*',async route=>{await new Promise<void>(resolve=>{releaseSource=resolve});await route.fulfill({status:200,json:{ok:true,venueId,movementId:'receipt',href:'/suppliers?venue='+venueId+'&documentId=purchase'}}).catch(()=>{});});
  await page.getByRole('button',{name:'Закупка',exact:true}).click();await page.getByRole('button',{name:'Открываем…'}).waitFor();
  await page.goto(base+'/warehouse?venue='+venueId+'&tab=counts');releaseSource();
  await page.waitForTimeout(150);assert.equal(new URL(page.url()).searchParams.get('tab'),'counts');

  assert.equal(business(),before);assert.deepEqual(errors,[]);
  const assetPath='dist/client'+new URL(assets[0]).pathname;
  writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',asset:assetPath,assetSHA256:createHash('sha256').update(readFileSync(assetPath)).digest('hex'),errors,failures,unchanged:true,scenarios:['receipt exact source','inventory exact source','reload each source','return preserves filters','missing source error','type filter retained','browser back/forward','late response navigation discarded','business data unchanged']},null,2));console.log('PASS warehouse source compiled UI');
 }catch(error){writeFileSync(out+'/failure.txt',await page.locator('body').innerText());writeFileSync(out+'/responses.json',JSON.stringify(replies,null,2));console.log('ERRORS',errors);throw error}finally{await context.close()}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

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
const runtime = await lifecycleRuntime({ documents:"./app/api/finance/documents/route", counts:"./app/api/inventory/counts/route", monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
const pendingHandlers = new Set<Promise<void>>();
let simulatedClosePreparation=process.env.BD_CLOSED_HEALTH_QA==='1';const closeOperationIds:string[]=[];
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/finance/documents":"documents", "/api/inventory/counts":"counts", "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(name==='workdays'&&req.method==='POST'&&body.length){const command=JSON.parse(body.toString());if(command.action==='close'){closeOperationIds.push(command.operationId);if(simulatedClosePreparation){simulatedClosePreparation=false;res.writeHead(202,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,pending:true,code:'HEALTH_CLOSE_PENDING'}));return;}}}
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/warehouse", "/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
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
const out='outputs/finance-documents-artifact';mkdirSync(out,{recursive:true});
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
 const adjustment={id:'shortage',sourceDocumentId:'count-doc',venueId,productKey:'product',type:'inventory_adjustment',businessDate:date,costAmount:-10,currency:'PMR_RUB',costStatus:'KNOWN_VALUE'};insertMovement.run(accountId,-100,adjustment.id,'product',adjustment.type,date,null,JSON.stringify(adjustment));
 const stores={bd_purchase_documents:[{id:'purchase',venueId,date,status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:120},{id:'old-purchase',venueId,date:'2026-09-30',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:999},{id:'future-purchase',venueId,date:'2026-11-01',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:888}],bd_finance_revenue:[{id:'shift',venueId,date,revenueSource:'sales_events_v1',revenue:n*50,receipts:n,currency:'PMR_RUB',closingStatus:'closed'}],bd_operational_reports_v1:[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:10}}],bd_finance_expenses:[{id:'writeoff',venueId,date,category:'writeoff',amount:6,currency:'PMR_RUB',sourceDocumentId:'writeoff-doc',source:'write_off_document'},{id:'writeoff2',venueId,date,category:'writeoff',amount:4,currency:'PMR_RUB'}],bd_employees:[{id:"e",venueId,name:"Сотрудник",payrollRuleId:"rule"}],bd_payroll_rules:[{id:"rule",venueId,blocks:[{enabled:true,type:"shift_rate",amount:10}]}],bd_payroll_entries:[],bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[]};
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
  await page.goto(base+'/finance?month=2026-10&venue='+venueId);
  const summary=page.locator('[data-bd-finance-current]');
  await page.getByRole('link',{name:'Документы списаний',exact:true}).first().waitFor({timeout:30000});
  await page.getByRole('link',{name:'Документы списаний',exact:true}).first().click();
  const list=page.locator('[data-finance-documents="writeoffs"]');
  await list.getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:8000}).catch(async e=>{console.log('LIST_DIAG',page.url(),await page.locator('[data-finance-documents]').allTextContents(),failures);throw e});
  assert.equal(await list.locator('article').count(),2);
  await page.screenshot({path:out+'/mobile-list.png',fullPage:false});
  await page.route('**/api/finance/documents?*',route=>route.fulfill({status:503,json:{ok:false}}));
  await page.reload();await list.getByRole('alert').waitFor();assert.equal(await list.locator('article').count(),0);
  await page.unroute('**/api/finance/documents?*');await list.getByRole('button',{name:'Повторить'}).click();
  await list.getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:10000});
  await list.getByRole('link',{name:'Открыть документ →'}).click();
  await page.locator('[data-bd-writeoff-detail]').waitFor({timeout:30000});
  await page.reload();await page.locator('[data-bd-writeoff-detail]').waitFor({timeout:30000});
  await page.getByRole('button',{name:'Закрыть документ списания'}).click();
  await list.getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:30000});
  assert.equal(new URL(page.url()).searchParams.get('month'),'2026-10');
  await page.reload();await list.getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:30000});
  await list.getByRole('link',{name:'← К отчёту'}).click();
  await page.getByText('Как рассчитано',{exact:true}).click();
  await page.getByRole('link',{name:'Документы складских корректировок'}).click();
  await page.locator('[data-finance-documents="stock"]').getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:30000});
  await page.locator('[data-finance-documents="stock"]').getByRole('link',{name:'Открыть документ →'}).click();
  await page.locator('.bd-inventory-sheet-v245').waitFor({timeout:10000});
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.locator('[data-finance-documents="stock"]').getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:10000});
  await page.goto(base+'/reports?month=2026-10&venue='+venueId+'&financeDocuments=writeoffs');
  await list.getByText(/^Итого: 10(?:[,.]00)? руб\. ПМР$/).waitFor({timeout:30000});
  await page.goto(base+'/reports?month=2026-09&venue='+venueId+'&financeDocuments=writeoffs');
  await list.getByText('За этот месяц записей нет.',{exact:true}).waitFor({timeout:30000});
  assert.equal(business(),before);assert.deepEqual(errors,[]);
  const assetPath='dist/client'+new URL(assets[0]).pathname;
  writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',asset:assetPath,assetSHA256:createHash('sha256').update(readFileSync(assetPath)).digest('hex'),errors,failures,unchanged:true,scenarios:['multiple','missing source','document','return','reload','stock document and return','error/retry','report deep link','empty previous month']},null,2));console.log('PASS finance document compiled UI');
 }catch(error){writeFileSync(out+'/failure.txt',await page.locator('body').innerText());writeFileSync(out+'/responses.json',JSON.stringify(replies,null,2));console.log('ERRORS',errors);throw error}finally{await context.close()}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

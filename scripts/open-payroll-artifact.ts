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
const fixedTime = "2026-10-22T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ monthClose:"./app/api/month-close/route", workdays:"./app/api/workdays/route", sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const replies:any[]=[];const failures:any[]=[];const excludedRoutes=['/api/management/cost-signals','/api/opportunities','/api/competitors/me','/api/reviews/home'];
const pendingHandlers = new Set<Promise<void>>();
let simulatedClosePreparation=process.env.BD_CLOSED_HEALTH_QA==='1';const closeOperationIds:string[]=[];
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/month-close":"monthClose", "/api/workdays":"workdays", "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if(name==='workdays'&&req.method==='POST'&&body.length){const command=JSON.parse(body.toString());if(command.action==='close'){closeOperationIds.push(command.operationId);if(simulatedClosePreparation){simulatedClosePreparation=false;res.writeHead(202,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,pending:true,code:'HEALTH_CLOSE_PENDING'}));return;}}}
    if(excludedRoutes.includes(url.pathname)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,success:false,code:'LOCAL_SCOPE_EXCLUDED'}));return;}
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = new Response(readFileSync("dist/client/app.html"),{headers:{"Content-Type":"text/html"}});
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
const out='outputs/open-payroll-artifact';mkdirSync(out,{recursive:true});
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
 const adjustment={id:'shortage',venueId,productKey:'product',type:'inventory_adjustment',businessDate:date,costAmount:-10,currency:'PMR_RUB',costStatus:'KNOWN_VALUE'};insertMovement.run(accountId,-100,adjustment.id,'product',adjustment.type,date,null,JSON.stringify(adjustment));
 const stores={bd_purchase_documents:[{id:'purchase',venueId,date,status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:120},{id:'old-purchase',venueId,date:'2026-09-30',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:999},{id:'future-purchase',venueId,date:'2026-11-01',status:'confirmed',expenseCategory:'food',documentType:'invoice',currency:'PMR_RUB',total:888}],bd_finance_revenue:[{id:'shift',venueId,date,revenueSource:'sales_events_v1',revenue:n*50,receipts:n,currency:'PMR_RUB',closingStatus:'closed'}],bd_operational_reports_v1:[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:10}}],bd_finance_expenses:[{id:'writeoff',venueId,date,category:'writeoff',amount:10,currency:'PMR_RUB'}],bd_employees:[{id:"e",venueId,name:"Сотрудник",payrollRuleId:"rule"}],bd_payroll_rules:[{id:"rule",venueId,blocks:[{enabled:true,type:"shift_rate",amount:10}]}],bd_payroll_entries:[],bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[]};
 (stores.bd_finance_revenue as any[]).push({id:'open',venueId,date:'2026-10-22',revenueSource:'sales_events_v1',revenue:0,receipts:0,currency:'PMR_RUB',closingStatus:'open'});
 (stores.bd_operational_reports_v1 as any[]).push({id:'open-report',venueId,date:'2026-10-22',workdayStatus:'OPEN',shiftVenueSales:0,staffing:[{employeeId:'e'}],workdayPayrollDraft:{status:'COMPLETE',basis:'CURRENT_RULE_ESTIMATE',missing:[],payrollBreakdown:{total:10,perEmployee:{e:10}}}});
 for(const [key,value] of Object.entries(stores))runtime.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,JSON.stringify(value));

 const business=()=>JSON.stringify({domain:runtime.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),events:runtime.sqlite.prepare('SELECT * FROM sales_event_records ORDER BY event_id').all(),chunks:runtime.sqlite.prepare('SELECT * FROM sales_event_chunks ORDER BY event_id').all(),stock:runtime.sqlite.prepare('SELECT * FROM stock_journal_movements ORDER BY position').all()});
 const before=business(),context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'UTC'});
 await context.addInitScript(({email,token,venueId})=>{localStorage.setItem('bd_session',email);localStorage.setItem('bd_session_token',token);localStorage.setItem('bd_active_venue_id',String(venueId));},{email:user.email,token:user.token,venueId});
 const page=await context.newPage();await page.clock.setFixedTime(new Date(fixedTime));const errors:string[]=[],consoleErrors:string[]=[],assets:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(/index-BQGspy0I.*\.js/.test(r.url()))assets.push(r.url());});
 try {
  await page.goto(base+'/home');const home=page.locator('[data-bd-home-money="current-v556"]');await home.waitFor({timeout:30000});
  await home.getByText('Прибыль за месяц',{exact:false}).waitFor({timeout:30000});
  const homeText=await home.innerText();assert.match(homeText,/40(?:[,.]00)?/);
  await page.screenshot({path:out+'/home.png',fullPage:true});
  await page.goto(base+'/finance');await page.waitForLoadState('networkidle');assert.equal(await page.getByText('BarDoctor не завершил загрузку',{exact:false}).count(),0);
  const finance=page.locator('[data-bd-finance-result-month="current-v573"]');await finance.waitFor({timeout:30000});const financeText=await finance.innerText();assert.match(financeText,/Прибыль за месяц/);assert.match(financeText,/40[,.]00/);assert.doesNotMatch(financeText,/Чистая прибыль|ещё не рассчитана/);assert.match(financeText,/Смена ещё открыта. Сумма может измениться/);assert.equal(await finance.locator('details').getAttribute('open'),null);assert.match(await finance.locator('[data-bd-current-purchases]').innerText(),/120,00/);assert.equal(await finance.getByText('Недостачи склада',{exact:true}).isVisible(),false);for(const label of ['Себестоимость продаж','Зарплаты','Списания'])assert.equal(await finance.locator('[data-bd-visible-expenses]').getByText(label,{exact:true}).isVisible(),true);assert.ok(await finance.getByText('Как рассчитано',{exact:true}).isVisible());await finance.locator('summary').click();assert.equal(await finance.getByText('Недостачи склада',{exact:true}).isVisible(),true);assert.match(await finance.innerText(),/Зарплата за завершённые дни/);await finance.locator('summary').click();await finance.screenshot({path:out+'/finance-card.png'});await page.screenshot({path:out+'/finance-full.png',fullPage:true});await page.setViewportSize({width:390,height:1040});await page.goto(base+'/finance');await page.waitForLoadState('networkidle');await page.locator('[data-bd-finance-result-month="current-v573"] .profit').waitFor();await page.screenshot({path:out+'/finance-screen.png'});await page.setViewportSize({width:390,height:844});assert.match(await finance.locator('.metrics').innerText(),/60[,.]00/);assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
  for(const width of [820,1280]){await page.setViewportSize({width,height:900});await finance.evaluate(el=>{for(let n=el.parentElement;n;n=n.parentElement)n.scrollTop=0;window.scrollTo(0,0)});await page.screenshot({path:out+'/finance-'+width+'.png'});assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);}await page.setViewportSize({width:390,height:844});
  await page.locator('.report-action').click();await page.waitForURL(url=>url.pathname==='/reports'&&url.searchParams.get('month')==='2026-10');const report=page.locator('[data-bd-monthly-report]');await report.waitFor({timeout:30000});
  await report.getByText('Прибыль за месяц',{exact:false}).first().waitFor({timeout:30000});
  const reportText=await report.innerText();assert.match(reportText,/40(?:[,.]00)?/);
  await page.screenshot({path:out+'/report.png',fullPage:true});
  const pending=replies.filter(x=>x.status===202);for(const x of pending)assert.equal(x.data.report,undefined);
  const complete=replies.filter(x=>x.status===200&&x.data.report);assert.ok(complete.length>0);
  for(const x of complete){assert.equal(x.data.report.revenue,100);assert.equal(x.data.report.costOfGoods,20);assert.equal(x.data.report.provisionalResultAfterCost,40);assert.equal(x.data.report.resultAfterCost,null);assert.equal(x.data.report.payroll,null);assert.equal(x.data.report.provisionalPayroll,20);assert.equal(x.data.report.isClosed,false);assert.equal(x.data.report.receipts,2);}
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failures,[]);assert.equal(business(),before,'UI preserves business records');
  // Change only the isolated fixture's wage rule after the initial read. A
  // full browser reload must use the new rule, not the saved draft total10.
  runtime.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(JSON.stringify([{id:'rule',venueId,blocks:[{enabled:true,type:'shift_rate',amount:20}]}]),accountId,'bd_payroll_rules');
  const afterRateSeed=business();await page.goto(base+'/finance');const fresh=page.locator('[data-bd-finance-result-month="current-v573"]');await fresh.locator('article').getByText('30,00',{exact:true}).waitFor({timeout:30000});
  const latest=replies.filter(x=>x.status===200&&x.data.report).at(-1);assert.equal(latest.data.report.provisionalPayroll,30);assert.equal(latest.data.report.provisionalResultAfterCost,30);assert.equal(latest.data.report.payroll,null);assert.equal(business(),afterRateSeed);assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
  for(const state of [{name:'loss',rules:[{id:'rule',venueId,blocks:[{enabled:true,type:'shift_rate',amount:100}]}],label:'Убыток за месяц',value:-50},{name:'zero',rules:[{id:'rule',venueId,blocks:[{enabled:true,type:'shift_rate',amount:50}]}],label:'Прибыль за месяц',value:0},{name:'unknown',rules:[],label:'Недостаточно данных',value:null}]){
   runtime.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(JSON.stringify(state.rules),accountId,'bd_payroll_rules');const beforeRead=business();await page.goto(base+'/finance');const card=page.locator('[data-bd-finance-result-month="current-v573"]');await card.getByText(state.label,{exact:true}).waitFor({timeout:30000});await page.screenshot({path:out+'/finance-'+state.name+'.png'});if(state.name==='zero')assert.ok(await card.getByText('0,00',{exact:true}).first().isVisible());assert.equal(replies.filter(x=>x.status===200&&x.data.report).at(-1).data.report.provisionalResultAfterCost,state.value);assert.equal(business(),beforeRead);assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
  }
  runtime.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(JSON.stringify(stores.bd_payroll_rules),accountId,'bd_payroll_rules');
  for(const purchase of [{total:null,currency:'PMR_RUB',label:'Неизвестно'},{total:120,currency:'EUR',label:'Неизвестно'},{total:0,currency:'PMR_RUB',label:'0,00'}]){
   runtime.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(JSON.stringify([{...stores.bd_purchase_documents[0],...purchase}]),accountId,'bd_purchase_documents');const beforeRead=business();await page.goto(base+'/finance');const value=page.locator('[data-bd-current-purchases]');await value.getByText(purchase.label,{exact:true}).waitFor({timeout:30000});assert.equal(replies.filter(x=>x.status===200&&x.data.report).at(-1).data.report.provisionalResultAfterCost,40);assert.equal(business(),beforeRead);
  }
  if(process.env.BD_CLOSED_HEALTH_QA==='1'){
   const cashReply=await runtime.api.sales.POST(runtime.request(user,'/api/sales-events','POST',{venueId,action:'close_shift',shiftId:'open',actualCash:0}));assert.equal(cashReply.status,201,JSON.stringify(await cashReply.clone().json()));
   const command=async(body:object)=>runtime.api.workdays.POST(runtime.request(user,'/api/workdays','POST',{venueId,date:'2026-10-22',...body}));
   assert.equal((await command({action:'team',operationId:'health-team',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
   await page.goto(base+'/shifts?venue='+venueId+'&workday=2026-10-22');const flow=page.locator('[data-workday-state="OPEN"]');await flow.waitFor({timeout:30000});await flow.getByRole('button',{name:'Перейти к закрытию',exact:true}).click();
   for(const label of ['Списания · не было','Происшествия · не было','Команда и расчёт ФОТ · проверены'])await flow.getByRole('checkbox',{name:label,exact:true}).check();
   await flow.getByRole('button',{name:'Закрыть смену',exact:true}).click();await page.locator('[data-workday-state="CLOSED"]').waitFor({timeout:30000});assert.equal(closeOperationIds.length,2);assert.equal(closeOperationIds[0],closeOperationIds[1]);
   const stored=JSON.parse(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,'__bd_closed_health_v1__:'+venueId)!.data_json));
   assert.equal(JSON.parse(stored.payload).data.businessHealth.components.find((x:any)=>x.id==='finance').score,90);
   await page.goto(base+'/home');await page.locator('.bd-home-health-zone-v332').filter({hasText:'Финансы'}).getByText('90',{exact:true}).waitFor({timeout:30000});
   assert.equal((await command({action:'open',date:'2026-10-23',operationId:'health-open-next',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
   await page.reload();await page.locator('.bd-home-health-zone-v332').filter({hasText:'Финансы'}).getByText('90',{exact:true}).waitFor({timeout:30000});
   assert.equal(String(runtime.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(accountId,'__bd_closed_health_v1__:'+venueId)!.data_json),JSON.stringify(stored));
   assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
  }
  const assetPath='dist/client'+new URL(assets[0]).pathname,sha=execFileSync('git',['rev-parse','HEAD']).toString().trim();
  const evidence={status:'PASS',sourceSHA:sha,asset:assetPath,assetSHA256:createHash('sha256').update(readFileSync(assetPath)).digest('hex'),errors,consoleErrors,failures,excludedRoutes,continuationResponses:pending.length,completeResponses:complete.length,revenue:100,receipts:2,cost:20,provisionalResult:40,rateChangeResult:30,widths:[390,820,1280],states:['profit','loss','zero','unknown'],homeText,financeText,reportText,readOnlyChecksUnchanged:true,closedHealthLifecycle:process.env.BD_CLOSED_HEALTH_QA==='1',unchanged:process.env.BD_CLOSED_HEALTH_QA!=='1'};
  writeFileSync(out+'/results.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({...evidence,homeText:undefined,financeText:undefined,reportText:undefined}));
 }catch(error){writeFileSync(out+'/failure.txt',await page.locator('body').innerText());writeFileSync(out+'/responses.json',JSON.stringify(replies,null,2));throw error}finally{await context.close()}
}finally{await browser.close();await new Promise<void>(done=>server.close(()=>done()));await Promise.allSettled(pendingHandlers);runtime.close();}

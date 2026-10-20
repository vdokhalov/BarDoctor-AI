import test from 'node:test';
import assert from 'node:assert/strict';
import * as accounting from '../lib/bardoctor/sales-accounting';
import * as sales from '../lib/bardoctor/sales-events';
import * as consumption from '../lib/bardoctor/sales-consumption';
import * as salesRevenue from '../lib/bardoctor/sales-revenue';
import {normalizeSalesDocument} from '../lib/bardoctor/sales';
import {openingRuntime} from './helpers/opening-runtime';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
import {operationalDay} from '../lib/bardoctor/operational-day';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
import {buildBusinessIntelligenceFromVenueContext} from '../lib/bardoctor/business-intelligence';
import {workdayPersonalSales} from '../lib/bardoctor/workday-personal-sales';
const date=new Date().toISOString().slice(0,10),now=new Date().toISOString();
const route=new URL('../app/api/sales-accounting/route.ts',import.meta.url);
function runtime(){
 const f=openingRuntime(route,accounting);f.put(accounting.SALES_ACCOUNTING_KEY,accounting.initialSalesAccounting(1,now,7));seedOpenWorkday(f.sqlite,7,1,date);
 f.put('bd_assortment_v1',{menuItems:[{id:'service',venueId:1,name:'Service',active:true,type:'service',consumptionMode:'NONE',currency:'MDL',salePrice:300}],stockBalances:[],recipes:[],nomenclature:[]});
 const pos=f.loadRoute(new URL('../app/api/sales-events/route.ts',import.meta.url),{...sales,...accounting});
 const confirm=f.loadRoute(new URL('../app/api/sales/confirm/route.ts',import.meta.url),{...accounting,...consumption,...salesRevenue,normalizeSalesDocument});
 const post=(body:object,api=f.api)=>api.POST(new Request('http://local/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({venueId:1,...body})}));
 return {...f,pos,confirm,post};
}
async function ok(response:Promise<Response>,status=201){const r=await response,body:any=await r.json();assert.equal(r.status,status,JSON.stringify(body));return body;}
const mode=(mode:string,id:string)=>({action:'set_mode',mode,operationId:id});
const open=(id:string)=>({action:'open_manual_shift',operationId:id});
const save=(row:any,operationId='manual-save-one')=>({action:'save_totals',date:row.date,shiftId:row.id,cash:50,card:150,cogs:40,receipts:null,expectedRevision:0,operationId});
test('POS300 then manual200 same workday is500; active POS survives setting; back to POS; Finance/Health/payroll agree',async()=>{
 const f=runtime();try{
 await ok(f.post({action:'open_shift',shiftId:'cash-a',name:'First POS'},f.pos));
 const original=(f.get('bd_finance_revenue') as any[])[0];assert.equal(original.salesModeSnapshot,'POS');
 await ok(f.post(mode('MANUAL','mode-manual-001')));assert.deepEqual((f.get('bd_finance_revenue') as any[])[0],original);
 assert.equal((await f.post(open('blocked-manual'))).status,409);
 const command={id:'sale300',source:'POS_API',shiftId:'cash-a',lines:[{id:'line',menuItemId:'service',quantity:1}],payments:[{id:'cash-pay',method:'CASH',amount:300}]};
 const preview=await ok(f.post({action:'preview',command},f.pos),200);await ok(f.post({action:'post',command,previewHash:preview.previewHash},f.pos));
 await ok(f.post({action:'close_shift',shiftId:'cash-a',actualCash:300},f.pos));
 const prior=structuredClone(f.get('bd_finance_revenue'));
 const opened=await ok(f.post(open('manual-open-one')));assert.equal(opened.total.date,date);assert.equal(opened.total.revenue,null);
 await ok(f.post(mode('POS','mode-pos-return'))); // only the NEXT session changes
 assert.equal((await f.post({action:'open_shift',shiftId:'cash-b',name:'Second POS'},f.pos)).status,409);
 const stockBefore=JSON.stringify(f.get('bd_stock_movements'));
 await ok(f.post(save(opened.total)));await ok(f.post(save(opened.total)),200);
 assert.equal(JSON.stringify(f.get('bd_stock_movements')),stockBefore);assert.deepEqual((f.get('bd_finance_revenue') as any[])[0],(prior as any[])[0]);
 let revenues=f.get('bd_finance_revenue') as any[],events=f.get('bd_sales_events_v1') as any[];
 const day=operationalDay({venueId:1,businessDate:date,asOf:now,currency:'MDL',revenues,events});
 assert.equal(day.revenue.amount,500);assert.equal(day.revenue.source,'MIXED_SHIFTS');assert.equal(day.revenue.consistency,'MATCH');assert.equal(day.revenue.status,'FINAL');assert.equal(day.revenue.receipts,null);
 const reports=[{venueId:1,date,closingStatus:'closed',payrollBreakdown:{total:50}}];
 const input={venueId:1,profile:{venueId:1,currency:'MDL',timezone:'UTC'},currency:'MDL',startDate:date.slice(0,7)+'-01',endDate:date,asOf:now,revenues,events,reports,expenses:[],payrollEntries:[],documents:[],batches:[],movements:f.get('bd_stock_movements') as any[]||[],costInputsAvailable:true};
 const finance=currentFinance(input);assert.equal(finance.revenue,500);assert.equal(finance.costOfGoods,40);assert.equal(finance.payroll,50);assert.equal(finance.resultAfterCost,410);
 const stores=new Map(Object.entries({bd_finance_revenue:revenues,bd_sales_events_v1:events,bd_operational_reports_v1:reports,bd_finance_expenses:[],bd_payroll_entries:[],bd_stock_movements:input.movements,bd_sales_batches:[],bd_sales_documents:[]}).map(([key,data])=>[key,{data,updatedAt:now}]));
 const context=buildVenueAIContextFromSources('diagnosis',{accountProfile:input.profile,stores,now:new Date(now)}),period:any=context.promptData.performanceHistory.period;
 assert.equal(period.revenue,500);assert.equal(period.inputContract.costOfGoods,40);assert.equal(period.inputContract.payroll,50);assert.equal(period.resultAfterCost,410);
 assert.equal(buildBusinessIntelligenceFromVenueContext({venueId:1,context}).businessHealth.components.find(x=>x.id==='finance')?.score,90);
 assert.equal(workdayPersonalSales({venueId:1,date,currency:'MDL',revenues,events,employees:[{id:'waiter'}],memberships:[{account_id:7,employee_id:'waiter'}]}).waiter,null);
 await ok(f.post({action:'open_shift',shiftId:'cash-b',name:'Second POS'},f.pos));
 const nextCommand={...command,id:'next-sale',shiftId:'cash-b'};assert.ok((await ok(f.post({action:'preview',command:nextCommand},f.pos),200)).previewHash);
 revenues=f.get('bd_finance_revenue') as any[];assert.equal(revenues.length,3);assert.equal(revenues[1].revenue,200);assert.equal(revenues[2].salesModeSnapshot,'POS');
 }finally{f.close();}
});
test('legacy pending requires explicit adoption; preserves date history and audit, active rows unchanged',async()=>{
 const f=runtime();try{
 const tomorrow=new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const legacy:accounting.SalesAccounting={version:1,venueId:1,changes:[{id:'initial-pos',mode:'POS',effectiveDate:'1970-01-01',createdAt:now,actorId:7},{id:'old-pending',mode:'MANUAL',effectiveDate:tomorrow,createdAt:now,actorId:7}]};
 f.put(accounting.SALES_ACCOUNTING_KEY,legacy);const command=mode('MANUAL','adopt-pending-001');
 assert.equal((await f.post(command)).status,409);assert.deepEqual(f.get(accounting.SALES_ACCOUNTING_KEY),legacy);
 const r=await ok(f.post({...command,acceptLegacySchedule:true}));assert.equal(r.change.replacesLegacySchedule,true);
 const setting=f.get(accounting.SALES_ACCOUNTING_KEY) as accounting.SalesAccounting;assert.deepEqual(setting.changes,legacy.changes);assert.equal(accounting.nextSalesMode(setting,date),'MANUAL');
 await ok(f.post({...command,acceptLegacySchedule:true}),200);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM audit_log').get()?.n,1);
 assert.equal((await ok(f.post(open('manual-immediate')))).total.date,date);
 }finally{f.close();}
});
test('manual sessions require open staffed workday, no open orders/cash, unlocked month; owner only',async()=>{
 const f=runtime();try{
 await ok(f.post(mode('MANUAL','guard-mode-manual')));
 f.put('bd_operational_reports_v1',[]);assert.equal((await f.post(open('missing-workday'))).status,409);seedOpenWorkday(f.sqlite,7,1,date);
 f.put('bd_month_closings',[{monthKey:date.slice(0,7),status:'closed'}]);assert.equal((await f.post(open('closed-month-001'))).status,423);f.put('bd_month_closings',[]);
 // CAS race: a cash session appears after preflight; retry must observe it.
 f.beforeBatch(()=>f.put('bd_finance_revenue',[{id:'raced-cash',venueId:1,date,revenueSource:'sales_events_v1',closingStatus:'open',currency:'MDL',revenue:0,receipts:0}]));
 assert.equal((await f.post(open('race-open-manual'))).status,409);assert.equal((f.get('bd_finance_revenue') as any[]).length,1);
 for(const role of ['manager','waiter']){const api=f.loadRoute(route,{authenticateRequest:async()=>({id:7,venueId:1,actorAccountId:8,role,restaurantJson:'{"currency":"MDL"}'})});assert.equal((await f.post(open('staff-open-denied'),api)).status,403);assert.equal((await f.post(mode('POS','staff-mode-denied'),api)).status,403);}
 }finally{f.close();}
});
test('manual revision, duplicate opening/save, stale correction and closed day protection',async()=>{
 const f=runtime();try{
 await ok(f.post(mode('MANUAL','revision-mode-001')));const opened=await ok(f.post(open('revision-open-001')));await ok(f.post(open('revision-open-001')),200);
 const command=save(opened.total);await ok(f.post(command));
 const update={...command,operationId:'revision-save-002',expectedRevision:1,cash:60,reason:'Correction'};await ok(f.post(update));await ok(f.post(command),200);
 const row=(f.get('bd_finance_revenue') as any[])[0];assert.equal(row.revenue,210);assert.equal(row.manualRevisions.length,2);
 assert.equal((await f.post({...update,operationId:'stale-save-003'})).status,409);
 assert.equal((await f.post({...command,cash:999})).status,409);
 f.put('bd_operational_reports_v1',[{venueId:1,date,workdayStatus:'CLOSED'}]);assert.equal((await f.post({...update,operationId:'closed-day-save',expectedRevision:2})).status,409);assert.deepEqual((f.get('bd_finance_revenue') as any[])[0],row);
 }finally{f.close();}
});
test('legacy daily totals and daily imports never silently coexist with new manual sessions',async()=>{
 const f=runtime();try{
 await ok(f.post(mode('MANUAL','overlap-mode-001')));
 const historical={id:'old-day',venueId:1,date,revenueSource:'MANUAL_SUMMARY',manualTotalsVersion:1,revenue:500,closingStatus:'closed'};
 f.put('bd_finance_revenue',[historical]);assert.equal((await f.post(open('overlap-open-001'))).status,409);assert.deepEqual(f.get('bd_finance_revenue'),[historical]);
 f.put('bd_finance_revenue',[]);const opened=await ok(f.post(open('clean-open-001')));await ok(f.post(save(opened.total)));
 const before=f.get('bd_finance_revenue'),document={id:'daily-import',date,currency:'MDL',sourceType:'file_import',totalRevenue:500,items:[{id:'line',name:'Service',menuItemId:'service',quantity:1,confidence:1}]};
 const staged=await f.post({document},f.confirm);assert.equal(staged.status,409);assert.equal((await staged.json() as any).staged,true);
 assert.equal((await f.post({document,replacement:{revenueId:opened.total.id,expectedRevision:1,reason:'Daily report'}},f.confirm)).status,409);
 assert.deepEqual(f.get('bd_finance_revenue'),before);assert.equal(f.get('bd_sales_documents'),null);
 }finally{f.close();}
});
test('open orders remain payable in their POS shift after selecting manual; prevent closing and new sessions',async()=>{
 const f=runtime();try{
 const orders=f.loadRoute(new URL('../app/api/pos-orders/route.ts',import.meta.url),{...accounting,...sales});
 await ok(f.post({action:'open_shift',shiftId:'ordered-pos',name:'Order POS'},f.pos));
 await ok(f.post({action:'create',operationId:'create-order',orderId:'order',shiftId:'ordered-pos',expectedRevision:0,tableNumber:'1',lines:[{id:'line',menuItemId:'service',quantity:1}]},orders));
 await ok(f.post(mode('MANUAL','order-mode-change')));
 assert.equal((await f.post({action:'close_shift',shiftId:'ordered-pos'},f.pos)).status,409);
 assert.equal((await f.post(open('order-manual-block'))).status,409);
 await ok(f.post({action:'precheck',operationId:'precheck-order',orderId:'order',expectedRevision:1},orders));
 const pay={action:'preview_payment',operationId:'payment-preview',orderId:'order',expectedRevision:2,payment:{id:'pay',method:'CASH',amount:300}};
 const preview=await ok(f.post(pay,orders),200);assert.ok(preview.previewHash);
 }finally{f.close();}
});
test('overnight workday owns manual date; unknown open totals block close; actual workday payroll sums mixed sessions once',async()=>{
 const {lifecycleRuntime}=await import('./helpers/lifecycle-runtime');
 const instant='2026-10-21T00:30:00Z',businessDate='2026-10-20';
 const r=await lifecycleRuntime({accounting:'./app/api/sales-accounting/route',workdays:'./app/api/workdays/route'},{now:instant});try{
 const owner=await r.register('mixed-workday@isolated.test'),venueId=owner.activeVenueId;
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const post=(api:string,body:object)=>r.api[api].POST(r.request(owner,'/api/'+api,'POST',{venueId,date:businessDate,...body}));
 put('bd_employees',[{id:'manager',venueId,payrollRuleId:'pay'}]);put('bd_payroll_rules',[{id:'pay',blocks:[{type:'shift_rate',amount:50,enabled:true},{type:'venue_sales_percent',percent:10,enabled:true}]}]);
 await ok(post('workdays',{action:'open',expectedRevision:0,operationId:'open-day',staffing:[{employeeId:'manager'}]}));
 put('bd_finance_revenue',[{id:'pos',venueId,date:businessDate,revenueSource:'sales_events_v1',currency:'MDL',revenue:300,receipts:1,closingStatus:'closed'}]);
 put('bd_sales_events_v1',[{id:'event',venueId,businessDate,revenueRowId:'pos',shiftId:'pos',status:'POSTED',source:'POS_API',currency:'MDL',revenue:300}]);
 await ok(post('accounting',mode('MANUAL','overnight-mode-001')));const manual=await ok(post('accounting',open('overnight-open-001')));assert.equal(manual.total.date,businessDate);
 const unknown=await ok(post('workdays',{action:'preview',expectedRevision:1,operationId:'preview-unknown',staffing:[{employeeId:'manager'}]}),200);assert.equal(unknown.payroll.status,'INCOMPLETE');
 assert.equal((await post('workdays',{action:'close',expectedRevision:1,operationId:'close-blocked',reviewedOperations:{writeoffs:0,incidents:0}})).status,409);
 await ok(post('accounting',save(manual.total)));
 const team=await ok(post('workdays',{action:'team',expectedRevision:1,operationId:'team-known',staffing:[{employeeId:'manager'}]}));assert.equal(team.workday.shiftVenueSales,500);assert.equal(team.payroll.payrollBreakdown.total,100);
 await ok(post('workdays',{action:'close',expectedRevision:2,operationId:'close-known',confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}}));
 const reload:any=await(await r.api.workdays.GET(r.request(owner,'/api/workdays?date='+businessDate))).json();assert.equal(reload.day.revenue.amount,500);assert.equal(reload.day.payroll.amount,100);
 assert.equal((await post('accounting',{...save(manual.total),operationId:'after-day-closed',expectedRevision:1,reason:'Correction'})).status,409);
 }finally{r.close();}
});

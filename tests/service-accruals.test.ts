import test from 'node:test';
import assert from 'node:assert/strict';
import {serviceAccruals} from '../lib/bardoctor/service-accruals';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const currency='PMR_RUB',date='2026-10-25';
const profile={venueId:1,currency,timezone:'Europe/Chisinau'};
const scope={venueId:1,workspaceId:2,dataAccountId:3,currency,startDate:'2026-10-01',endDate:date};
const doc={...scope,id:'svc',date,documentType:'receipt',status:'confirmed',expenseCategory:'repairs',total:7,currency,items:[{category:'repairs',lineTotal:7}]};
const pay={...scope,id:'pay',date,category:'repairs',amount:7,currency,source:'purchase_payment',paymentKind:'supplier_payment',purchaseId:'svc',sourceDocumentId:'svc',status:'posted'};
const revenues=[{...scope,id:'sale',date,revenue:100,currency,receipts:1,closingStatus:'closed',revenueSource:'sales_events_v1'}];
const base={...scope,profile,asOf:'2026-10-25T17:00:00Z',revenues,events:[{...scope,id:'e',businessDate:date,revenueRowId:'sale',revenue:100,currency,status:'POSTED',source:'POS_API'}],reports:[{...scope,id:'r',date,closingStatus:'closed',payrollBreakdown:{total:0}}],payrollEntries:[]};
for(const [label,paid] of [['unpaid',0],['partial',3],['paid',7]] as const)test(label+' service accrues once; cash uses only payment',()=>{
 const input={...base,purchases:[doc],expenses:paid?[{...pay,amount:paid}]:[]};const before=JSON.stringify(input);
 const report=currentFinance(input);assert.equal(report.resultBeforeCost,93);assert.equal(report.operatingExpenses,7);assert.equal(report.cashResult,100-paid);
 assert.deepEqual(currentFinance(input),report);assert.equal(JSON.stringify(input),before);
});
test('cancel and payment reversal are independent',()=>{
 for(const expenses of [[pay],[{...pay,status:'voided',reversedAt:base.asOf}]]){
 const report=currentFinance({...base,purchases:[{...doc,status:'cancelled'}],expenses});assert.equal(report.resultBeforeCost,100);assert.equal(report.cashResult,expenses[0].status==='posted'?93:100);
 }
});
test('draft, price list and equipment are not service accruals',()=>{
 for(const change of [{status:'draft'},{documentType:'price_list'},{expenseCategory:'equipment',items:[{category:'equipment'}]}])assert.equal(currentFinance({...base,purchases:[{...doc,...change}],expenses:[]}).resultBeforeCost,100);
});
test('explicit linked manual accrual dedup; independent manual stays',()=>{
 const linked={...pay,id:'legacy',source:'manual',paymentKind:undefined};
 const manual={...linked,id:'independent',sourceDocumentId:undefined,purchaseId:undefined,amount:2};
 const report=currentFinance({...base,purchases:[doc,doc],expenses:[linked,manual,pay]});assert.equal(report.resultBeforeCost,91);assert.equal(report.serviceAccruals.length,1);assert.equal(report.cashResult,84);
 assert.equal(currentFinance({...base,purchases:[{...doc,status:'cancelled'}],expenses:[linked]}).resultBeforeCost,100);
});
test('scoped identities and period boundaries; no previous/future accrual',()=>{
 for(const change of [{venueId:9},{workspaceId:9},{dataAccountId:9},{date:'2026-10-26'},{date:'2026-09-30'}])assert.equal(currentFinance({...base,purchases:[{...doc,...change}],expenses:[]}).resultBeforeCost,100);
 assert.equal(currentFinance({...base,asOf:'2026-10-24T20:59:00Z',purchases:[doc],expenses:[]}).serviceAccruals.length,0);
});
test('legacy confirmed category and saved total usable without current nomenclature',()=>{
 const p=serviceAccruals({...scope,purchases:[{...doc,items:undefined}],expenses:[]});assert.equal(p.accruals[0].amount,7);assert.deepEqual(p.issues,[]);
});
test('missing totals/currency and mixed allocations are not invented',()=>{
 for(const change of [{total:undefined},{total:0,costStatus:'UNKNOWN'},{currency:'EUR'},{items:[{category:'repairs'},{category:'equipment'}]},{date:'invalid'}]){
 const report=currentFinance({...base,purchases:[{...doc,...change}],expenses:[]});assert.equal(report.resultBeforeCost,null);assert.ok(report.serviceAccrualIssues.length);
 }
});
test('saved FX used; no current exchange rate',()=>{
 const report=currentFinance({...base,purchases:[{...doc,currency:'EUR',originalCurrency:'EUR',originalAmount:7,accountingCurrency:currency,accountingAmount:14,fxRate:2,fxRateDirection:'source_to_accounting',fxLockedAt:base.asOf}],expenses:[]});assert.equal(report.resultBeforeCost,86);
});
test('monthly report shares service recognition and cash separation',async t=>{
 const runtime=await lifecycleRuntime({calc:'./lib/bardoctor/verified-month-close'});t.after(runtime.close);
 const stores={bd_purchase_documents:[doc],bd_finance_expenses:[pay],bd_finance_revenue:revenues,bd_operational_reports_v1:base.reports,bd_sales_events_v1:base.events};
 const before=JSON.stringify(stores);const calculate=runtime.api.calc.calculateVerifiedMonth as unknown as typeof import('../lib/bardoctor/verified-month-close').calculateVerifiedMonth;const result=calculate({profile,stores,venueId:1,workspaceId:2,dataAccountId:3,monthKey:'2026-10',asOf:base.asOf});
 assert.equal(result.snapshot.otherExpenses,7);assert.equal(result.snapshot.purchasePayments,7);assert.equal(result.snapshot.resultBeforeCost,93);assert.equal(result.snapshot.cashResult,93);assert.equal(JSON.stringify(stores),before);
});

test('Health input uses the same scoped accrual; an unavailable source is not zero',()=>{
 const rows={bd_finance_revenue:revenues,bd_operational_reports_v1:base.reports,bd_sales_events_v1:base.events,bd_finance_expenses:[],bd_payroll_entries:[],bd_purchase_documents:[doc]};
 const stores=new Map(Object.entries(rows).map(([key,data])=>[key,{data,updatedAt:base.asOf}]));
 const period=buildVenueAIContextFromSources('diagnosis',{accountProfile:profile,stores,workspaceId:2,now:new Date(base.asOf)}).promptData.performanceHistory.period as Record<string,unknown>;
 assert.equal(period.result,93);
 assert.equal(currentFinance({...base,purchases:[],purchasesAvailable:false,expenses:[]}).resultBeforeCost,null);
});
test('actual current/month read endpoints, reload and isolation do not write',async t=>{
 const r=await lifecycleRuntime({month:'./app/api/month-close/route'},{now:base.asOf});t.after(r.close);
 const u=await r.register('services@isolated.test'),v=u.activeVenueId;
 r.sqlite.prepare('DELETE FROM sales_event_journals WHERE account_id=?').run(u.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({...profile,venueId:v}),u.userId);
 const rows={bd_finance_revenue:revenues,bd_operational_reports_v1:base.reports,bd_sales_events_v1:base.events,bd_finance_expenses:[pay],bd_payroll_entries:[],bd_purchase_documents:[doc,{...doc,id:'foreign',venueId:98765}]};
 for(const[k,values]of Object.entries(rows))r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(u.userId,k,JSON.stringify(values.map(x=>({...x,workspaceId:undefined,dataAccountId:undefined,venueId:x.id==='foreign'?98765:v}))));
 const snapshot=()=>r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),before=snapshot();
 for(const url of ['/api/month-close?monthKey=current&view=current','/api/month-close?monthKey=current&view=current','/api/month-close?monthKey=2026-10']){
  const response=await r.api.month.GET(r.request(u,url));assert.equal(response.status,200);const body=await response.json() as {report:Record<string,unknown>};
  assert.equal(body.report.resultBeforeCost,93);assert.equal(body.report.otherExpenses,7);assert.equal(body.report.cashResult,93);
 }
 assert.deepEqual(snapshot(),before);
});

test('zero is real, missing identity is unknown; foreign nested facts cannot contribute',()=>{
 assert.equal(currentFinance({...base,purchases:[{...doc,total:0}],expenses:[]}).resultBeforeCost,100);
 assert.equal(currentFinance({...base,purchases:[{...doc,id:undefined}],expenses:[]}).resultBeforeCost,null);
 assert.equal(currentFinance({...base,purchases:[{...doc,items:[{category:'repairs',venueId:999}]}],expenses:[]}).resultBeforeCost,null);
});

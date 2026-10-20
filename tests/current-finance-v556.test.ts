import test from 'node:test';
import assert from 'node:assert/strict';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {buildBusinessIntelligence, type BusinessIntelligenceInput} from '../lib/bardoctor/business-intelligence';
import {homeFinancialResult} from '../lib/bardoctor/client/management-actions';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
const profile={venueId:1,currency:'MDL',timezone:'Europe/Chisinau'};
function fixture(revenue=300,payroll:number|null=90){return {profile,venueId:1,currency:'MDL',asOf:'2026-10-20T05:00:00Z',startDate:'2026-10-01',endDate:'2026-10-31',
 revenues:[{id:'s',venueId:1,date:'2026-10-19',revenue,currency:'MDL',receipts:2,closingStatus:'closed',revenueSource:'sales_events_v1'}],
 events:[{id:'e',venueId:1,businessDate:'2026-10-19',revenueRowId:'s',revenue,currency:'MDL',status:'POSTED',source:'POS_API'}],
 reports:[{id:'r',venueId:1,date:'2026-10-19',closingStatus:'closed',...(payroll==null?{}:{payrollBreakdown:{total:payroll}})}],expenses:[],payrollEntries:[]};}
function health(value:ReturnType<typeof currentFinance>,closed?:object){return buildBusinessIntelligence({venueId:'1',now:new Date(value.asOf),timezone:'Europe/Chisinau',currentFinancialPeriod:{...value,monthKey:'2026-10'},latestClosedMonth:closed} as unknown as BusinessIntelligenceInput).businessHealth;}
test('open month, unknown COGS: subtotal visible but no favorable Finance score',()=>{
 const f=fixture(),result=currentFinance({...f,expenses:[{id:'purchase',venueId:1,date:'2026-10-19',category:'inventory',amount:500,currency:'MDL'}]});
 assert.equal(result.resultBeforeCost,210);assert.equal(result.operatingResult,null);assert.equal(result.cashResult,-290);assert.equal(result.financeInputsKnown,true);assert.equal(homeFinancialResult(result).value,210);assert.equal(health(result).components.find(x=>x.id==='finance')?.score,null);

});
test('unknown payroll stays unknown with known subtotal, and no Finance score',()=>{
 const f=fixture();f.revenues.push({...f.revenues[0],id:'s2',date:'2026-10-20'});f.events.push({...f.events[0],id:'e2',revenueRowId:'s2',businessDate:'2026-10-20'});const r=currentFinance(f);assert.equal(r.payroll,null);assert.equal(r.knownPayrollSubtotal,90);assert.deepEqual(r.missingPayrollDates,['2026-10-20']);assert.equal(r.resultBeforeCost,null);assert.equal(homeFinancialResult(r).value,null);assert.equal(health(r).components.find(x=>x.id==='finance')?.score,null);
});
test('real zero is known; missing expense source is not zero; no comparison invented',()=>{
 const r=currentFinance(fixture(90,90));assert.equal(r.resultBeforeCost,0);assert.deepEqual(homeFinancialResult(r),{value:0,final:false});assert.equal(currentFinance({...fixture(),expensesAvailable:false}).resultBeforeCost,null);
 const h=buildBusinessIntelligence({venueId:'1',now:new Date(r.asOf),currentFinancialPeriod:{...r,monthKey:'2026-10'}} as unknown as BusinessIntelligenceInput);assert.equal(h.livePeriod.direction,'insufficient');assert.equal(h.livePeriod.changes.revenuePercent,null);
});
test('future workdays and entries excluded; venue timezone defines cutoff',()=>{
 const f=fixture(),baseline=currentFinance(f);f.revenues.push({...f.revenues[0],id:'future',date:'2026-10-22',revenue:999});f.reports.push({...f.reports[0],id:'future',date:'2026-10-22',payrollBreakdown:{total:999}});assert.deepEqual(currentFinance({...f,expenses:[{id:'future-expense',venueId:1,date:'2026-10-22',category:'other',amount:999,currency:'MDL'}],payrollEntries:[{id:'future-payroll',venueId:1,date:'2026-10-22',type:'bonus',amount:999,currency:'MDL'}]}),baseline);
 assert.equal(currentFinance({...fixture(),asOf:'2026-10-19T22:30:00Z'}).endDate,'2026-10-20');
});
test('confirmed closed loss guard survives healthy current inputs',()=>{const h=health(currentFinance(fixture()),{monthKey:'2026-09',revenue:100,finalProfit:-30});assert.equal(h.label,'critical');assert.ok(h.score==null||h.score<=44);assert.ok(h.components.find(x=>x.id==='finance')!.score!<35);});
test('Health uses the same projection as current report including purchase exclusion',()=>{
 const f=fixture();const rows:Record<string,Record<string,unknown>[]>={bd_finance_revenue:f.revenues,bd_operational_reports_v1:f.reports,bd_sales_events_v1:f.events,bd_finance_expenses:[{id:'p',venueId:1,date:'2026-10-19',category:'inventory',amount:500,currency:'MDL'}],bd_payroll_entries:[]};const stores=new Map(Object.entries(rows).map(([key,data])=>[key,{data,updatedAt:f.asOf}]));
 const period=buildVenueAIContextFromSources('diagnosis',{accountProfile:profile,stores,now:new Date(f.asOf)}).promptData.performanceHistory.period as Record<string,unknown>;assert.equal(period.result,currentFinance({...f,expenses:rows.bd_finance_expenses}).resultBeforeCost);assert.equal(period.financeInputsKnown,true);
});
test('actual read route: current projection shared, future ignored, legacy close preview unchanged and no writes',async t=>{
 const r=await lifecycleRuntime({month:'./app/api/month-close/route'},{now:'2026-10-20T05:00:00Z'});t.after(r.close);const u=await r.register('current-finance@isolated.test'),v=u.activeVenueId,f=fixture();const p={...profile,venueId:v};r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(p),u.userId);
 const rows:Record<string,Record<string,unknown>[]>={bd_finance_revenue:[...f.revenues,{...f.revenues[0],id:'future-open',date:'2026-10-22',closingStatus:'open',revenue:0}],bd_operational_reports_v1:f.reports,bd_sales_events_v1:f.events,bd_finance_expenses:[],bd_payroll_entries:[]};for(const[k,values]of Object.entries(rows))r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(u.userId,k,JSON.stringify(values.map(x=>({...x,venueId:v}))));
 const snapshot=()=>r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all(),before=snapshot();
 const res=await r.api.month.GET(r.request(u,'/api/month-close?monthKey=current&view=current'));assert.equal(res.status,200);const body=await res.json() as {report:ReturnType<typeof currentFinance>};assert.equal(body.report.resultBeforeCost,210);assert.equal(body.report.asOfDate,'2026-10-20');assert.equal(body.report.operatingResult,null);assert.equal(body.report.financeInputsKnown,true);assert.deepEqual(snapshot(),before);
 const preview=await(await r.api.month.GET(r.request(u,'/api/month-close?monthKey=2026-10'))).json() as {reasons:string[];report:Record<string,unknown>};assert.ok(preview.reasons.includes('PERIOD_NOT_ENDED'));assert.equal(preview.report.currentFinance,undefined);assert.deepEqual(snapshot(),before);
});

test('known captured COGS reuses existing margin bands; all cost sources use the same cutoff',()=>{
 const f=fixture(300,90);f.revenues[0].receipts=1;
 const batch={id:'b',venueId:1,businessDate:'2026-10-19',status:'POSTED',costStatus:'FULL',totalTheoreticalCost:0,lines:[{id:'l',salesBatchId:'b',quantity:1,processingStatus:'POSTED',theoreticalCost:0,recipeSnapshot:{recipeId:'none',capturedAt:f.asOf,consumptionMode:'NONE',ingredients:[]}}]};
 const input={...f,events:[{...f.events[0],batch}],movements:[],documents:[],batches:[],costInputsAvailable:true};
 const known=currentFinance(input);assert.equal(known.costOfGoods,0);assert.equal(known.resultAfterCost,210);assert.equal(health(known).components.find(x=>x.id==='finance')?.score,90);
 const zero=currentFinance({...input,reports:[{...f.reports[0],payrollBreakdown:{total:300}}]});assert.equal(zero.resultAfterCost,0);assert.equal(health(zero).components.find(x=>x.id==='finance')?.score,62,'existing margin=0 band, not invented zero=50');
 const future={venueId:1,date:'2026-10-22',businessDate:'2026-10-22'};
 const later=currentFinance({...input,events:[...input.events,{...f.events[0],...future,id:'future-event'}],movements:[{...future,id:'orphan',type:'sale_consumption',salesBatchId:'future'}],batches:[{...batch,...future,id:'future'}],documents:[{...future,id:'future-doc',status:'confirmed'}]});assert.equal(later.resultAfterCost,known.resultAfterCost);assert.deepEqual(later.costReasons,[]);
 const orphan=currentFinance({...input,movements:[{...future,date:'2026-10-19',businessDate:'2026-10-19',id:'orphan',type:'sale_consumption',salesBatchId:'unknown'}]});assert.equal(orphan.resultAfterCost,null);assert.equal(health(orphan).components.find(x=>x.id==='finance')?.score,null);assert.ok(orphan.costReasons.includes('UNLINKED_SALES_CONSUMPTION'));
});

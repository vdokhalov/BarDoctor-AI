import test from 'node:test';
import assert from 'node:assert/strict';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {verifiedPeriodCost} from '../lib/bardoctor/financial-period-proof';
import {buildBusinessIntelligence,type BusinessIntelligenceInput} from '../lib/bardoctor/business-intelligence';
function fixture(){return {venueId:1,workspaceId:2,dataAccountId:3,profile:{currency:'MDL',timezone:'UTC'},currency:'MDL',asOf:'2026-10-22T12:00:00Z',startDate:'2026-10-01',endDate:'2026-10-22',
 revenues:[{id:'closed',venueId:1,date:'2026-10-21',revenue:100,receipts:2},{id:'open',venueId:1,date:'2026-10-22',revenue:0,receipts:0,revenueSource:'sales_events_v1',closingStatus:'open'}],
 reports:[{id:'r1',venueId:1,date:'2026-10-21',closingStatus:'closed',payrollBreakdown:{total:10}},{id:'r2',venueId:1,date:'2026-10-22',workdayStatus:'OPEN',shiftVenueSales:0,staffing:[{employeeId:'e'}],workdayPayrollDraft:{status:'COMPLETE',basis:'CURRENT_RULE_ESTIMATE',missing:[],payrollBreakdown:{total:10,perEmployee:{e:10}}}}] as Record<string,any>[],
 payrollEstimateSources:{employees:[{id:'e',venueId:1,payrollRuleId:'rule'}],rules:[{id:'rule',venueId:1,blocks:[{enabled:true,type:'shift_rate',amount:10}]}],gaps:[]},payrollEntries:[],expenses:[],costInputsAvailable:true,costProof:verifiedPeriodCost('2026-10',{cost:20,adjustment:-20,salesCostKnown:true,adjustmentsKnown:true,reasons:[]} as any)};}
test('open shift: recorded 10 + estimated 10 gives provisional 40, never confirmed payroll or Health score',()=>{
 const f=fixture(),before=JSON.stringify(f),r=currentFinance(f);assert.equal(r.knownPayrollSubtotal,10);assert.equal(r.estimatedPayrollSubtotal,10);assert.equal(r.provisionalPayroll,20);assert.equal(r.provisionalResultAfterCost,40);assert.equal(r.resultAfterCost,null);assert.equal(r.payroll,null);assert.deepEqual(r.missing,['PAYROLL']);assert.equal(r.financeInputsKnown,false);
 const h=buildBusinessIntelligence({venueId:'1',now:new Date(f.asOf),currentFinancialPeriod:{...r,monthKey:'2026-10'}} as unknown as BusinessIntelligenceInput).businessHealth;
 assert.equal(h.components.find(x=>x.id==='finance')?.score,null);assert.match(r.financeAssessmentInformation.join(' '),/Предварительно/);assert.deepEqual(currentFinance(f),r);assert.equal(JSON.stringify(f),before);
});
test('closed day remains recorded; zero estimate is known; bonus counted once',()=>{
 const f=fixture();f.reports[1]={...f.reports[1],workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:10}};const closed=currentFinance(f);assert.equal(closed.payroll,20);assert.equal(closed.resultAfterCost,40);assert.equal(closed.provisionalPayroll,null);
 const z=fixture();z.payrollEstimateSources.rules[0].blocks[0].amount=0;const r=currentFinance({...z,payrollEntries:[{id:'b',venueId:1,date:'2026-10-22',type:'bonus',amount:3,currency:'MDL'}]});assert.equal(r.estimatedPayrollSubtotal,0);assert.equal(r.provisionalPayroll,13);assert.equal(r.provisionalResultAfterCost,47);
});
test('incomplete, stale, duplicate or foreign estimates never certify totals',()=>{
 for(const change of [(f:any)=>{f.reports[1].workdayPayrollDraft.status='INCOMPLETE'},(f:any)=>{f.reports[1].workdayPayrollDraft.missing=['hours']},(f:any)=>{delete f.payrollEstimateSources},(f:any)=>{f.reports[1].workdayPayrollDraft.workspaceId=99},(f:any)=>{f.reports[1].venueId=99},(f:any)=>{f.reports.push({...f.reports[1],id:'duplicate'})},(f:any)=>{f.payrollEstimateSources.rules[0].workspaceId=99}]){const f=fixture();change(f);assert.equal(currentFinance(f).provisionalResultAfterCost,null);}
 assert.equal(currentFinance({...fixture(),expensesAvailable:false}).provisionalResultAfterCost,null);assert.equal(currentFinance({...fixture(),payrollEntriesAvailable:false}).provisionalResultAfterCost,null);assert.equal(currentFinance({...fixture(),costInputsAvailable:false}).provisionalResultAfterCost,null);
});
test('estimates are limited to current venue business month and cutoff',()=>{
 const f=fixture();assert.equal(currentFinance({...f,asOf:'2026-10-21T12:00:00Z'}).resultAfterCost,50);assert.equal(currentFinance({...f,asOf:'2026-11-01T12:00:00Z'}).provisionalResultAfterCost,null);
 const foreign={...f.reports[1],id:'foreign',venueId:9};assert.deepEqual(currentFinance({...f,reports:[...f.reports,foreign]}),currentFinance(f));
});

test('current rate and hours replace saved total; missing rules or hours stay unknown',()=>{
 const f=fixture();f.payrollEstimateSources.rules[0].blocks[0].amount=25;assert.equal(currentFinance(f).provisionalPayroll,35);assert.equal(currentFinance(f).provisionalResultAfterCost,25);
 f.payrollEstimateSources.rules[0].blocks[0]={enabled:true,type:'hourly_rate',amount:5};f.reports[1].staffing[0].hours=3;assert.equal(currentFinance(f).estimatedPayrollSubtotal,15);
 f.reports[1].staffing[0].hours=4;assert.equal(currentFinance(f).estimatedPayrollSubtotal,20);
 delete f.reports[1].staffing[0].hours;assert.equal(currentFinance(f).provisionalResultAfterCost,null);
 f.payrollEstimateSources.rules=[];assert.equal(currentFinance(f).provisionalResultAfterCost,null);
 const missing=fixture();delete missing.reports[1].workdayPayrollDraft;assert.equal(currentFinance(missing).provisionalResultAfterCost,null);
});
test('venue-sales percentage recomputes current base; unverified attribution stays unknown',()=>{
 const f=fixture();f.payrollEstimateSources.rules[0].blocks[0]={enabled:true,type:'venue_sales_percent',percent:10} as any;
 f.revenues[1]={id:'open',venueId:1,date:'2026-10-22',revenue:200,receipts:4} as any;
 assert.equal(currentFinance(f).estimatedPayrollSubtotal,20);
 f.revenues[1].revenue=300;assert.equal(currentFinance(f).estimatedPayrollSubtotal,30);
 f.payrollEstimateSources.rules[0].blocks[0]={enabled:true,type:'personal_sales_percent',percent:10} as any;f.reports[1].staffing[0]={employeeId:'e',personalSales:200,personalSalesSource:'AUTO'};
 assert.equal(currentFinance(f).provisionalResultAfterCost,null);
 f.payrollEstimateSources.rules[0].blocks[0]={enabled:true,type:'department_sales_percent',department:'Bar',percent:10} as any;
 f.reports[1].shiftDepartmentSales={Bar:200};assert.equal(currentFinance(f).provisionalResultAfterCost,null);
});
test('Health uses current rule snapshot too; unavailable rules cannot reuse saved total',async()=>{
 const {buildVenueAIContextFromSources}=await import('../lib/bardoctor/venue-ai-context');const f=fixture();
 const raw:Record<string,unknown[]>={bd_finance_revenue:f.revenues,bd_operational_reports_v1:f.reports,bd_payroll_entries:[],bd_finance_expenses:[],bd_stock_movements:[],bd_sales_events_v1:[],bd_sales_documents:[],bd_sales_batches:[],bd_sales_reconciliations_v1:[],bd_employees:f.payrollEstimateSources.employees,bd_payroll_rules:f.payrollEstimateSources.rules,bd_finance_gap_reasons:[]};
 const stores=new Map(Object.entries(raw).map(([key,data])=>[key,{data,updatedAt:f.asOf,sourceState:'AVAILABLE' as const}]));
 const read=()=>((buildVenueAIContextFromSources('diagnosis',{accountProfile:{...f.profile,venueId:1},stores,financeCostProof:f.costProof,now:new Date(f.asOf)}).promptData.performanceHistory.period as any).inputContract);
 assert.equal(read().provisionalResultAfterCost,40);f.payrollEstimateSources.rules[0].blocks[0].amount=20;assert.equal(read().provisionalResultAfterCost,30);stores.delete('bd_payroll_rules');assert.equal(read().provisionalResultAfterCost,null);
});
test('same-date recorded and open shifts keep current month payroll separate then aggregate once',()=>{
 const f=fixture();f.reports[0]={...f.reports[0],date:'2026-10-22',workdayStatus:'CLOSED',workdaySequence:1};f.reports[1].workdaySequence=2;
 f.revenues[0]={...f.revenues[0],date:'2026-10-22',workdayId:'r1'} as any;f.revenues[1]={...f.revenues[1],workdayId:'r2'} as any;
 const open=currentFinance(f);assert.equal(open.knownPayrollSubtotal,10);assert.equal(open.estimatedPayrollSubtotal,10);assert.equal(open.provisionalPayroll,20);assert.equal(open.provisionalResultAfterCost,40);
 f.reports[1]={...f.reports[1],workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:10}};const closed=currentFinance(f);assert.equal(closed.payroll,20);assert.equal(closed.resultAfterCost,40);
 assert.deepEqual(currentFinance(f),closed);
});

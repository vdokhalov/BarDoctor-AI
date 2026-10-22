import test from 'node:test';
import assert from 'node:assert/strict';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {verifiedPeriodCost} from '../lib/bardoctor/financial-period-proof';
import {buildBusinessIntelligence,type BusinessIntelligenceInput} from '../lib/bardoctor/business-intelligence';
function fixture(){return {venueId:1,workspaceId:2,dataAccountId:3,profile:{currency:'MDL',timezone:'UTC'},currency:'MDL',asOf:'2026-10-22T12:00:00Z',startDate:'2026-10-01',endDate:'2026-10-22',
 revenues:[{id:'closed',venueId:1,date:'2026-10-21',revenue:100,receipts:2},{id:'open',venueId:1,date:'2026-10-22',revenue:0,receipts:0,revenueSource:'sales_events_v1',closingStatus:'open'}],
 reports:[{id:'r1',venueId:1,date:'2026-10-21',closingStatus:'closed',payrollBreakdown:{total:10}},{id:'r2',venueId:1,date:'2026-10-22',workdayStatus:'OPEN',shiftVenueSales:0,staffing:[{employeeId:'e'}],workdayPayrollDraft:{status:'COMPLETE',basis:'CURRENT_RULE_ESTIMATE',missing:[],payrollBreakdown:{total:10,perEmployee:{e:10}}}}] as Record<string,any>[],
 payrollEntries:[],expenses:[],costInputsAvailable:true,costProof:verifiedPeriodCost('2026-10',{cost:20,adjustment:-20,salesCostKnown:true,adjustmentsKnown:true,reasons:[]} as any)};}
test('open shift: recorded 10 + estimated 10 gives provisional 40, never confirmed payroll or Health score',()=>{
 const f=fixture(),before=JSON.stringify(f),r=currentFinance(f);assert.equal(r.knownPayrollSubtotal,10);assert.equal(r.estimatedPayrollSubtotal,10);assert.equal(r.provisionalPayroll,20);assert.equal(r.provisionalResultAfterCost,40);assert.equal(r.resultAfterCost,null);assert.equal(r.payroll,null);assert.deepEqual(r.missing,['PAYROLL']);assert.equal(r.financeInputsKnown,false);
 const h=buildBusinessIntelligence({venueId:'1',now:new Date(f.asOf),currentFinancialPeriod:{...r,monthKey:'2026-10'}} as unknown as BusinessIntelligenceInput).businessHealth;
 assert.equal(h.components.find(x=>x.id==='finance')?.score,null);assert.match(r.financeAssessmentInformation.join(' '),/Предварительно/);assert.deepEqual(currentFinance(f),r);assert.equal(JSON.stringify(f),before);
});
test('closed day remains recorded; zero estimate is known; bonus counted once',()=>{
 const f=fixture();f.reports[1]={...f.reports[1],workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:10}};const closed=currentFinance(f);assert.equal(closed.payroll,20);assert.equal(closed.resultAfterCost,40);assert.equal(closed.provisionalPayroll,null);
 const z=fixture();z.reports[1].workdayPayrollDraft.payrollBreakdown={total:0,perEmployee:{e:0}};const r=currentFinance({...z,payrollEntries:[{id:'b',venueId:1,date:'2026-10-22',type:'bonus',amount:3,currency:'MDL'}]});assert.equal(r.estimatedPayrollSubtotal,0);assert.equal(r.provisionalPayroll,13);assert.equal(r.provisionalResultAfterCost,47);
});
test('incomplete, stale, duplicate or foreign estimates never certify totals',()=>{
 for(const change of [(f:any)=>{f.reports[1].workdayPayrollDraft.status='INCOMPLETE'},(f:any)=>{f.reports[1].workdayPayrollDraft.missing=['hours']},(f:any)=>{f.reports[1].workdayPayrollDraft.payrollBreakdown.perEmployee.e=null},(f:any)=>{f.reports[1].workdayPayrollDraft.workspaceId=99},(f:any)=>{f.reports[1].venueId=99},(f:any)=>{f.reports.push({...f.reports[1],id:'duplicate'})},(f:any)=>{f.reports[1].shiftVenueSales=100}]){const f=fixture();change(f);assert.equal(currentFinance(f).provisionalResultAfterCost,null);}
 assert.equal(currentFinance({...fixture(),expensesAvailable:false}).provisionalResultAfterCost,null);assert.equal(currentFinance({...fixture(),payrollEntriesAvailable:false}).provisionalResultAfterCost,null);assert.equal(currentFinance({...fixture(),costInputsAvailable:false}).provisionalResultAfterCost,null);
});
test('estimates are limited to current venue business month and cutoff',()=>{
 const f=fixture();assert.equal(currentFinance({...f,asOf:'2026-10-21T12:00:00Z'}).resultAfterCost,50);assert.equal(currentFinance({...f,asOf:'2026-11-01T12:00:00Z'}).provisionalResultAfterCost,null);
 const foreign={...f.reports[1],id:'foreign',venueId:9};assert.deepEqual(currentFinance({...f,reports:[...f.reports,foreign]}),currentFinance(f));
});

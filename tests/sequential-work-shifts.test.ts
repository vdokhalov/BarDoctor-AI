import test from 'node:test';import assert from 'node:assert/strict';
import {calculateWorkdayPayroll} from '../lib/bardoctor/workday-payroll';
import {aggregateShiftReports,shiftRevenues} from '../lib/bardoctor/work-shifts';
import {posWorkdayGate} from '../lib/bardoctor/pos-workday-gate';
const date='2026-10-22',venueId=12;
const first={id:'first',venueId,date,workdaySequence:1,workdayStatus:'CLOSED',staffing:[{employeeId:'e'}],payrollBreakdown:{total:10,perEmployee:{e:10},monthlySalaryByEmployee:{}}};
const second={id:'second',venueId,date,workdaySequence:2,workdayStatus:'OPEN',staffing:[{employeeId:'e',hours:3}]};
const revenues=[{id:'a',venueId,date,revenue:100},{id:'b',venueId,date,revenue:60,workdayId:'second'},{id:'foreign',venueId:13,date,revenue:999,workdayId:'second'}];
test('percentage and hours use only current shift inputs; daily sum counts each once',()=>{
 const own=shiftRevenues(revenues,[first,second],second);assert.deepEqual(own.map(x=>x.id),['b']);
 const result=calculateWorkdayPayroll({date,venueId,staffing:second.staffing,employees:[{id:'e',venueId,payrollRuleId:'r'}],rules:[{id:'r',venueId,blocks:[{enabled:true,type:'hourly_rate',amount:2},{enabled:true,type:'venue_sales_percent',percent:10}]}],profile:{},revenues,gaps:[],shiftVenueSales:60,priorReports:[first]});
 assert.equal(result.status,'COMPLETE');assert.equal((result.payrollBreakdown as any)?.total,12);
 const total=aggregateShiftReports([first,{...second,workdayStatus:'CLOSED',payrollBreakdown:result.payrollBreakdown}]);assert.equal((total?.payrollBreakdown as any).total,22);
 assert.equal(aggregateShiftReports([first,second])?.payrollBreakdown,null);
});
test('cash belongs to workshift identity, not shared date; legacy remains first-only',()=>{
 assert.equal(posWorkdayGate([first,second],venueId,date,'first').ok,false);assert.equal(posWorkdayGate([first,second],venueId,date).ok,false);assert.equal(posWorkdayGate([first,second],venueId,date,'second').ok,true);
 assert.deepEqual(shiftRevenues(revenues,[first,second],first).map(x=>x.id),['a']);assert.equal(posWorkdayGate([first,second],13,date,'second').ok,false);
});
test('monthly salary allocates daily share once; unknown legacy allocation is not guessed',()=>{
 const input={date,venueId,staffing:[{employeeId:'e'}],employees:[{id:'e',venueId,payrollRuleId:'r'}],rules:[{id:'r',venueId,blocks:[{enabled:true,type:'monthly_salary',amount:3100}]}],profile:{},revenues,gaps:[]};
 const one=calculateWorkdayPayroll(input);assert.equal(one.status,'COMPLETE');
 const two=calculateWorkdayPayroll({...input,priorReports:[{...first,payrollBreakdown:one.payrollBreakdown}]});assert.equal(two.status,'COMPLETE');assert.equal((two.payrollBreakdown as any)?.total,0);
 const unknown=calculateWorkdayPayroll({...input,priorReports:[{...first,payrollBreakdown:{total:100}}]});assert.equal(unknown.status,'INCOMPLETE');assert.equal(unknown.payrollBreakdown,null);
});
test('automatic personal percentage uses linked cash owner only for current workshift',async()=>{
 const {workdayPersonalSales}=await import('../lib/bardoctor/workday-personal-sales');
 const cash=[{id:'a',venueId,date,revenue:100,receipts:1,currency:'MDL',revenueSource:'sales_events_v1',closingStatus:'closed'}, {id:'b',venueId,date,workdayId:'second',revenue:60,receipts:1,currency:'MDL',revenueSource:'sales_events_v1',closingStatus:'closed'}];
 const events=cash.map(r=>({id:'event-'+r.id,venueId,businessDate:date,shiftId:r.id,revenueRowId:r.id,currency:'MDL',status:'POSTED',revenue:r.revenue,prices:[{total:r.revenue}],orderActor:{accountId:7,name:'Waiter',role:'cashier'}}));
 const selected=shiftRevenues(cash,[first,second],second),ids=new Set(selected.map(r=>r.id));
 const facts=workdayPersonalSales({date,venueId,currency:'MDL',employees:[{id:'e'}],memberships:[{employee_id:'e',account_id:7}],revenues:selected,events:events.filter(e=>ids.has(e.revenueRowId))});assert.equal(facts.e,60);
});

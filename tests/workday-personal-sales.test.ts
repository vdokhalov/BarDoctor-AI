import test from 'node:test';
import assert from 'node:assert/strict';
import {workdayPersonalSales,staffingWithPersonalSales} from '../lib/bardoctor/workday-personal-sales';
import {calculateWorkdayPayroll} from '../lib/bardoctor/workday-payroll';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const date='2026-10-19';
function fixture(venueId=1,accountId=7){
 const shift={id:'cash',venueId,date,currency:'MDL',revenueSource:'sales_events_v1',closingStatus:'closed',revenue:4492,receipts:1};
 const event={id:'paid',venueId,businessDate:date,shiftId:'cash',revenueRowId:'cash',currency:'MDL',status:'POSTED',revenue:4492,prices:[{total:4492}],orderActor:{accountId,name:'Waiter',role:'cashier'},actor:{accountId:99,name:'Cashier',role:'owner'}};
 return {date,venueId,currency:'MDL',employees:[{id:'waiter'}],memberships:[{account_id:accountId,employee_id:'waiter'}],revenues:[shift],events:[event]};
}
test('cash net revenue uses order owner, excludes reversed sales, scopes sessions and leaves unavailable attribution unknown',()=>{
 const f=fixture();f.events.push({...f.events[0],id:'reversed',status:'REVERSED',revenue:10,prices:[{total:10}]});
 assert.equal(workdayPersonalSales(f).waiter,4492);
 assert.equal(workdayPersonalSales({...f,revenues:[...f.revenues,{...f.revenues[0],id:'second'}],events:[...f.events,{...f.events[0],id:'paid-second',shiftId:'second',revenueRowId:'second'}]}).waiter,8984);
 assert.equal(workdayPersonalSales({...f,memberships:[]}).waiter,null);
 assert.equal(workdayPersonalSales({...f,memberships:[...f.memberships,...f.memberships]}).waiter,null);
 assert.equal(workdayPersonalSales({...f,revenues:[]}).waiter,null);
 assert.equal(workdayPersonalSales({...f,currency:'RUB'}).waiter,null);
 assert.equal(workdayPersonalSales({...f,revenues:[{...f.revenues[0],revenue:4493}]}).waiter,null);
 assert.equal(workdayPersonalSales({...f,date:'2026-10-20'}).waiter,null);
 assert.equal(workdayPersonalSales({...f,events:f.events.map(e=>({...e,orderActor:undefined,actor:undefined}))}).waiter,null);
 assert.equal(workdayPersonalSales({...f,events:[],revenues:[{...f.revenues[0],revenue:0,receipts:0}]}).waiter,0);
});
test('kopecks are preserved, explicit overrides survive and recorded historical payroll stays unchanged',()=>{
 const input={date,venueId:1,profile:{},revenues:[],gaps:[],employees:[{id:'waiter',payrollRuleId:'pay'}],rules:[{id:'pay',blocks:[{type:'shift_rate',amount:750,enabled:true},{type:'personal_sales_percent',percent:5,enabled:true}]}],staffing:staffingWithPersonalSales([{employeeId:'waiter'}],{waiter:4492})};
 assert.equal((calculateWorkdayPayroll(input).payrollBreakdown as any).total,974.6);
 assert.equal(staffingWithPersonalSales([{employeeId:'waiter',personalSales:0}],{waiter:4492})[0].personalSales,0);
 assert.equal(staffingWithPersonalSales(input.staffing,{waiter:5000})[0].personalSales,5000);
 assert.equal(calculateWorkdayPayroll({...input,staffing:staffingWithPersonalSales(input.staffing,{waiter:null})}).status,'INCOMPLETE');
 const previous={date,staffing:input.staffing,payrollBreakdown:{total:975,perEmployee:{waiter:975}}};
 assert.equal((calculateWorkdayPayroll({...input,previous}).payrollBreakdown as any).total,975);
});
test('route saves automatic basis, reloads, closes with kopecks and keeps closed report immutable',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route'});t.after(r.close);
 const owner=await r.register('payroll-cents@isolated.test'),venueId=owner.activeVenueId,f=fixture(venueId,owner.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=? WHERE venue_id=? AND account_id=?').run('waiter',venueId,owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put('bd_employees',[{id:'waiter',name:'Waiter',venueId,payrollRuleId:'pay'}]);put('bd_payroll_rules',[{id:'pay',blocks:[{type:'shift_rate',amount:750,enabled:true},{type:'personal_sales_percent',percent:5,enabled:true}]}]);
 put('bd_finance_revenue',f.revenues);put('bd_sales_events_v1',f.events);
 const post=(body:object)=>r.api.workdays.POST(r.request(owner,'/api/workdays','POST',{venueId,date,...body}));
 const opened=await post({action:'open',expectedRevision:0,operationId:'open',staffing:[{employeeId:'waiter'}]});assert.equal(opened.status,201);const o:any=await opened.json();assert.equal(o.payroll.payrollBreakdown.total,974.6);assert.equal(o.workday.staffing[0].personalSalesSource,'AUTO');
 const reload:any=await (await r.api.workdays.GET(r.request(owner,'/api/workdays?date='+date))).json();assert.equal(reload.personalSales.waiter,4492);assert.equal(reload.workday.workdayPayrollDraft.payrollBreakdown.total,974.6);
 put('bd_finance_revenue',[{...f.revenues[0],revenue:4494}]);put('bd_sales_events_v1',[{...f.events[0],revenue:4494,prices:[{total:4494}]}]);
 const changed=await post({action:'close',expectedRevision:1,operationId:'changed',confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}});assert.equal(changed.status,409);assert.equal(((await changed.json()) as any).code,'WORKDAY_PAYROLL_CHANGED');
 put('bd_finance_revenue',f.revenues);put('bd_sales_events_v1',f.events);
 const close=await post({action:'close',expectedRevision:1,operationId:'close',confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}});assert.equal(close.status,201,JSON.stringify(await close.clone().json()));assert.equal(((await close.json()) as any).workday.payrollBreakdown.total,974.6);
 put('bd_payroll_rules',[]);
 const closed:any=await (await r.api.workdays.GET(r.request(owner,'/api/workdays?date='+date))).json();assert.equal(closed.personalSales,null);assert.equal(closed.workday.payrollBreakdown.total,974.6);
 assert.equal((await post({action:'team',expectedRevision:2,operationId:'edit',staffing:[{employeeId:'waiter',personalSales:10000}]})).status,409);
});

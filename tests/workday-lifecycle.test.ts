import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { calculateWorkdayPayroll } from '../lib/bardoctor/workday-payroll';
import { readFinanceInputs } from '../lib/bardoctor/finance-inputs';
import { salesEventFixture } from './helpers/sales-event-fixture';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import vm from 'node:vm';

test('server payroll keeps Wz/Kz arithmetic for every enabled block and refuses missing inputs',()=>{
 const source=readFileSync('public/assets/index-BQGspy0I.js','utf8');const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body;
 const funcs=['Wz','Kz','Vz'].map(name=>{const node=nodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name)!;return source.slice(node.start,node.end);}).join('\n');
 const context=vm.createContext({MC:['mon','tue','wed','thu','fri','sat','sun'],Date,Math});vm.runInContext(funcs,context);
 const blocks=[{type:'monthly_salary',amount:3100},{type:'shift_rate',amount:20},{type:'hourly_rate',amount:10},{type:'personal_sales_percent',percent:3},{type:'department_sales_percent',department:'Bar',percent:2},{type:'venue_sales_percent',percent:1},{type:'per_unit',amount:4},{type:'weekday_rates',rates:{sat:15}},{type:'manual_bonus',amount:5},{type:'manual_adjustment',amount:-3}].map(b=>({...b,enabled:true}));
 const input={date:'2026-10-10',staffing:[{employeeId:'a',hours:7,personalSales:100,units:2}],employees:[{id:'a',name:'Anna',payrollRuleId:'rule',department:'Bar'}],rules:[{id:'rule',blocks}],profile:{},revenues:[],gaps:[],venueId:1,shiftVenueSales:300,shiftDepartmentSales:{Bar:200}};
 const result=calculateWorkdayPayroll(input);assert.equal(result.status,'COMPLETE');
 const expected=context.Kz(blocks,{hours:7,personalSales:100,units:2,departmentSales:200,venueSales:300,shiftDate:'2026-10-10',monthlySalaryShiftsInMonth:31});
 assert.equal((result.payrollBreakdown as {total:number}).total,expected);
 const missing=calculateWorkdayPayroll({...input,staffing:[{employeeId:'a'}]});assert.equal(missing.status,'INCOMPLETE');assert.equal(missing.payrollBreakdown,null);assert.ok(missing.missing.some(m=>m.field==='hours'));
 assert.equal(calculateWorkdayPayroll({...input,rules:[]}).status,'INCOMPLETE');
});

test('workday open/team/cash/close is scoped, audited, replayable and never accrues draft payroll',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route',sales:'./app/api/sales-events/route',close:'./app/api/shifts/close/route',days:'./app/api/operational-days/route'});t.after(r.close);
 const owner=await r.register('workday-flow@isolated.test'),staff=await r.register('workday-staff@isolated.test'),venue=owner.activeVenueId,date='2026-10-10';
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"Europe/Chisinau"}',owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 put('bd_employees',[{id:'anna',name:'Anna',payrollRuleId:'hourly',venueId:venue}]);put('bd_payroll_rules',[{id:'hourly',blocks:[{type:'hourly_rate',amount:10,enabled:true}]}]);put('bd_assortment_v1',salesEventFixture().assortment);
 const req=(body:object,user=owner)=>{const headers=new Headers(r.request(user,'/api/workdays').headers);headers.set('X-Venue-Id',String(venue));return new Request('https://isolated.test/api/workdays',{method:'POST',headers,body:JSON.stringify({venueId:venue,date,...body})});};
 const post=(body:object)=>r.api.workdays.POST(req(body));
 const open={action:'open',operationId:'open',expectedRevision:0,staffing:[{employeeId:'anna'}]};
 assert.equal((await post(open)).status,201);assert.equal((await post(open)).status,200);
 let report=get('bd_operational_reports_v1')[0];assert.equal(report.workdayStatus,'OPEN');assert.equal(report.payrollBreakdown,undefined);
 assert.equal(get('bd_finance_revenue').length,0);assert.equal(get('bd_payroll_entries').length,0);
 let finance=readFinanceInputs({venueId:venue,currency:'MDL',asOf:'2026-10-11',startDate:date,endDate:date,revenues:get('bd_finance_revenue'),reports:get('bd_operational_reports_v1')});assert.equal(finance.payroll,null);
 assert.equal((await r.api.workdays.POST(req(open,staff))).status,401);
 assert.equal((await post({...open,operationId:'other',staffing:[]})).status,409);
 const team={action:'team',operationId:'hours',expectedRevision:1,staffing:[{employeeId:'anna',hours:7}]};assert.equal((await post(team)).status,201);
 report=get('bd_operational_reports_v1')[0];assert.equal(report.workdayPayrollDraft.payrollBreakdown.total,70);assert.equal(report.payrollBreakdown,undefined);
 assert.equal((await r.api.sales.POST(req({action:'open_shift',shiftId:'night',name:'Night'}))).status,201);
 assert.equal(get('bd_finance_revenue')[0].date,date,'cash after local midnight retains the chosen workday date');
 const close={action:'close',operationId:'close',expectedRevision:2,confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}};
 assert.equal((await post(close)).status,409);
 assert.equal((await r.api.sales.POST(req({action:'close_shift',shiftId:'night',actualCash:0}))).status,201);
 assert.equal((await r.api.sales.POST(req({action:'open_shift',shiftId:'night-2',name:'Night second'}))).status,201);
 assert.equal(get('bd_finance_revenue')[1].date,date);
 assert.equal((await r.api.sales.POST(req({action:'close_shift',shiftId:'night-2',actualCash:0}))).status,201);
 // Existing operations editor may save operational sections, never close this
 // workday early or overwrite its payroll/team from client-provided amounts.
 assert.equal((await r.api.close.POST(req({sectionsVersion:1,shiftCloseId:'operations',revenueRecord:{date,staffing:[{employeeId:'anna',hours:7}],payrollBreakdown:{total:999}},writeOffItems:[]}))).status,201);
 report=get('bd_operational_reports_v1')[0];assert.equal(report.workdayStatus,'OPEN');assert.equal(report.payrollBreakdown,undefined);assert.equal(report.workdayRevision,3);
 assert.equal((await post(close)).status,409);
 assert.equal((await post({...close,expectedRevision:3,confirmations:{}})).status,422);
 assert.equal((await post({...close,expectedRevision:3,reviewedOperations:{writeoffs:1,incidents:0}})).status,409);
 assert.equal((await post({...close,expectedRevision:3})).status,201);assert.equal((await post({...close,expectedRevision:3})).status,200);
 report=get('bd_operational_reports_v1')[0];assert.equal(report.workdayStatus,'CLOSED');assert.equal(report.payrollBreakdown.total,70);
 finance=readFinanceInputs({venueId:venue,currency:'MDL',asOf:'2026-10-11',startDate:date,endDate:date,revenues:get('bd_finance_revenue'),reports:get('bd_operational_reports_v1')});assert.equal(finance.payroll,70);assert.equal(finance.payrollByDay.length,1);
 assert.equal(get('bd_payroll_entries').length,0);assert.equal(get('bd_stock_movements').length,0);
 const audits=r.sqlite.prepare("SELECT action FROM audit_log WHERE action LIKE 'workday.%'").all();assert.deepEqual(audits.map(row=>row.action),['workday.open','workday.team','workday.close']);
});

test('administrator gets only scoped requirements/results, staff is denied, incomplete payroll cannot close',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route'});t.after(r.close);
 const owner=await r.register('workday-admin-owner@isolated.test'),admin=await r.register('workday-admin@isolated.test'),venue=owner.activeVenueId;
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,admin.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'shift_manager','active')").run(venue,admin.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put('bd_employees',[{id:'a',name:'Anna',payrollRuleId:'hourly'}]);put('bd_payroll_rules',[{id:'hourly',blocks:[{type:'hourly_rate',amount:123.45,enabled:true}]}]);
 const request=(body?:object,selected=venue)=>{const headers=new Headers(r.request(admin,'/api/workdays').headers);headers.set('X-Venue-Id',String(selected));return new Request('https://isolated.test/api/workdays?date=2026-10-10',{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify({venueId:selected,date:'2026-10-10',...body})}:{})});};
 const payload=await (await r.api.workdays.GET(request())).json() as {employees:{requirements:{hours:boolean}}[]};assert.equal(payload.employees[0].requirements.hours,true);assert.ok(!JSON.stringify(payload).includes('123.45'));assert.ok(!JSON.stringify(payload).includes('"blocks"'));
 assert.equal((await r.api.workdays.POST(request({action:'open',operationId:'open',expectedRevision:0,staffing:[{employeeId:'a'}]}))).status,201);
 const close={action:'close',operationId:'close',expectedRevision:1,confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}};
 const incomplete=await r.api.workdays.POST(request(close));assert.equal(incomplete.status,422);assert.match(JSON.stringify(await incomplete.json()),/hours/);
 assert.equal((await r.api.workdays.POST(request({action:'team',operationId:'foreign',expectedRevision:1,staffing:[{employeeId:'foreign'}]}))).status,422);
 r.sqlite.prepare("UPDATE venue_memberships SET role='cashier',permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({allow:['shifts.manage','team.view','payroll.view']}),venue,admin.userId);
 assert.equal((await r.api.workdays.GET(request())).status,403);assert.equal((await r.api.workdays.POST(request(close))).status,403);
 r.sqlite.prepare("UPDATE venue_memberships SET role='shift_manager',permissions_json=NULL WHERE venue_id=? AND account_id=?").run(venue,admin.userId);
 const update={action:'team',operationId:'hours',expectedRevision:1,staffing:[{employeeId:'a',hours:8}]};assert.equal((await r.api.workdays.POST(request(update))).status,201);
 const before=r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_operational_reports_v1'").get(owner.userId)!.data_json;
 // A concurrent cash opening must win over a stale close read, not coexist
 // with a closed working day. CAS re-reads the dependency and rejects close.
 r.beforeNextDomainWrite(()=>{put('bd_finance_revenue',[{id:'late-cash',venueId:venue,date:'2026-10-10',revenue:0,revenueSource:'sales_events_v1',closingStatus:'open'}]);});
 assert.equal((await r.api.workdays.POST(request({...close,expectedRevision:2}))).status,409);
 assert.equal(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_operational_reports_v1'").get(owner.userId)!.data_json,before);
});


test('workday closes without invented sales, detects changed payroll, and defaults overnight opening to the operating date',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route',days:'./app/api/operational-days/route'},{now:'2026-10-10T22:30:00Z'});t.after(r.close);
 const owner=await r.register('workday-no-cash@isolated.test'),venue=owner.activeVenueId;
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'Europe/Chisinau',openTime:'18:00',closeTime:'02:00'}),owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 put('bd_employees',[{id:'a',name:'Anna',payrollRuleId:'h'}]);put('bd_payroll_rules',[{id:'h',blocks:[{enabled:true,type:'hourly_rate',amount:10}]}]);
 const data=await(await r.api.workdays.GET(r.request(owner,'/api/workdays'))).json() as {date:string};assert.equal(data.date,'2026-10-10');
 const post=(body:object)=>r.api.workdays.POST(r.request(owner,'/api/workdays','POST',{venueId:venue,date:data.date,...body}));
 assert.equal((await post({action:'open',operationId:'open',expectedRevision:0,staffing:[{employeeId:'a',hours:8}]})).status,201);
 put('bd_payroll_rules',[{id:'h',blocks:[{enabled:true,type:'hourly_rate',amount:20}]}]);
 const close={action:'close',operationId:'close',expectedRevision:1,confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}};
 assert.equal((await post(close)).status,409);
 assert.equal((await post({action:'team',operationId:'save',expectedRevision:1,staffing:[{employeeId:'a',hours:8}]})).status,201);
 assert.equal((await post({...close,expectedRevision:2})).status,201);
 const result=await(await r.api.workdays.GET(r.request(owner,'/api/workdays?date='+data.date))).json() as {day:{status:string,payroll:{amount:number},revenue:{amount:number}}};
 assert.equal(result.day.status,'COMPLETE');assert.equal(result.day.payroll.amount,160);assert.equal(result.day.revenue.amount,0);
 assert.equal(r.sqlite.prepare("SELECT count(*) AS n FROM domain_data WHERE account_id=? AND store_key='bd_finance_revenue'").get(owner.userId)!.n,0);
});

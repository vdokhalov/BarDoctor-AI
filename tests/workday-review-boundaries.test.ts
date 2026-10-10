import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { readFinanceInputs } from '../lib/bardoctor/finance-inputs';
const date='2026-10-10';
async function fixture(){
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route',days:'./app/api/operational-days/route',sales:'./app/api/sales-events/route',close:'./app/api/shifts/close/route',store:'./app/api/store/route',storeKey:'./app/api/store/[key]/route'},{now:'2026-10-10T12:00:00Z'});
 const owner=await r.register('review-owner@isolated.test'),member=await r.register('review-member@isolated.test'),venue=owner.activeVenueId;
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL","timezone":"UTC"}',owner.userId);
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,member.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'shift_manager','active')").run(venue,member.userId);
 const put=(key:string,value:unknown)=>{r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value))};
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json||'[]'));
 const req=(path:string,body?:object,user=member)=>{const headers=new Headers(r.request(user,path).headers);headers.set('X-Venue-Id',String(venue));return new Request('https://isolated.test'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify({venueId:venue,date,...body})}:{})})};
 put('bd_employees',[{id:'private-employee',name:'Private Name',payrollRuleId:'h',venueId:venue}]);put('bd_payroll_rules',[{id:'h',blocks:[{type:'hourly_rate',enabled:true,amount:10}]}]);
 return {r,owner,member,venue,put,get,req};
}

test('team deny protects workday, day.report, legacy revenues, raw/bulk and operations-save responses without erasing HR',async t=>{
 const {r,member,venue,put,get,req}=await fixture();t.after(r.close);
 const personnel={staffing:[{employeeId:'private-employee',hours:7}],payrollBreakdown:{total:70,perEmployee:{'private-employee':70}},workdayPayrollDraft:{status:'COMPLETE',payrollBreakdown:{total:70,perEmployee:{'private-employee':70}}}};
 put('bd_finance_revenue',[{id:'cash',venueId:venue,date,revenue:0,receipts:0,currency:'MDL',revenueSource:'sales_events_v1',closingStatus:'closed',...personnel}]);
 put('bd_operational_reports_v1',[{id:`operational-report:${venue}:${date}`,venueId:venue,date,closingStatus:'open',workdayStatus:'OPEN',workdayRevision:1,...personnel}]);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run(JSON.stringify({deny:['team.view']}),venue,member.userId);
 const safe=async(response:Response)=>{assert.equal(response.status,200);const text=JSON.stringify(await response.json());for(const secret of ['private-employee','Private Name','staffing','hours','perEmployee','payrollBreakdown','workdayPayrollDraft'])assert.ok(!text.includes(secret),secret+' leaked');return text};
 assert.equal((await r.api.workdays.GET(req('/api/workdays'))).status,403);
 assert.equal((await r.api.workdays.POST(req('/api/workdays',{action:'team',operationId:'denied',expectedRevision:1,staffing:[]}))).status,403);
 await safe(await r.api.days.GET(req('/api/operational-days')));
 await safe(await r.api.sales.GET(req('/api/sales-events')));
 await safe(await r.api.store.GET(req('/api/store')));
 await safe(await r.api.storeKey.GET(req('/api/store/bd_finance_revenue'),{params:Promise.resolve({key:'bd_finance_revenue'})} as never));
 const operation={sectionsVersion:1,shiftCloseId:'safe-operations',revenueRecord:{date},writeOffItems:[]};
 const saved=await r.api.close.POST(req('/api/shifts/close',operation));assert.equal(saved.status,201);const savedText=JSON.stringify(await saved.json());assert.ok(!savedText.includes('private-employee'));assert.ok(!savedText.includes('workdayPayrollDraft'));
 await safe(await r.api.close.POST(req('/api/shifts/close',operation)));
 assert.deepEqual(get('bd_operational_reports_v1')[0].staffing,personnel.staffing);
 put('bd_finance_revenue',get('bd_finance_revenue').map((row:Record<string,unknown>)=>({...row,revenueSource:'MANUAL_SUMMARY',closedVia:'guided-v17'})));
 const before=get('bd_finance_revenue');
 const redacted=before.map((row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).filter(([key])=>!['staffing','payrollBreakdown','workdayPayrollDraft'].includes(key))));
 const write=await r.api.storeKey.PUT(new Request(req('/api/store/bd_finance_revenue',{data:redacted}),{method:'PUT'}),{params:Promise.resolve({key:'bd_finance_revenue'})} as never);assert.equal(write.status,403);assert.deepEqual(get('bd_finance_revenue'),before);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=NULL WHERE venue_id=? AND account_id=?').run(venue,member.userId);
 const full=await r.api.days.GET(req('/api/operational-days'));assert.match(JSON.stringify(await full.json()),/private-employee/);assert.equal((await r.api.workdays.GET(req('/api/workdays'))).status,200);
});

test('legacy guided report in Finance cannot be shadowed by a new OPEN working day',async t=>{
 const {r,venue,put,get,req}=await fixture();t.after(r.close);
 const legacy={id:'legacy',venueId:venue,date,revenue:20,receipts:1,currency:'MDL',closingStatus:'closed',closedVia:'guided-v17',staffing:[{employeeId:'private-employee',hours:7}],payrollBreakdown:{total:70,perEmployee:{'private-employee':70}}};put('bd_finance_revenue',[legacy]);
 const body=await(await r.api.workdays.GET(req('/api/workdays?date='+date))).json() as {legacyReport:boolean};assert.equal(body.legacyReport,true);
 const finance=()=>readFinanceInputs({venueId:venue,currency:'MDL',asOf:date,startDate:date,endDate:date,revenues:get('bd_finance_revenue'),reports:get('bd_operational_reports_v1')});assert.equal(finance().payroll,70);
 const result=await r.api.workdays.POST(req('/api/workdays',{action:'open',operationId:'overwrite',expectedRevision:0,staffing:[{employeeId:'private-employee',hours:8}]}));assert.equal(result.status,409);assert.equal(finance().payroll,70);assert.deepEqual(get('bd_finance_revenue'),[legacy]);assert.deepEqual(get('bd_operational_reports_v1'),[]);
});

test('closed working day rejects a new cash shift on its date without changing facts or audit',async t=>{
 const {r,venue,put,get,req}=await fixture();t.after(r.close);
 put('bd_operational_reports_v1',[{id:'day',venueId:venue,date,workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:70}}]);
 const audit=r.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n;
 const result=await r.api.sales.POST(req('/api/sales-events',{action:'open_shift',shiftId:'late',name:'Late'}));assert.equal(result.status,409);assert.equal((await result.json() as {code:string}).code,'WORKDAY_CLOSED');assert.deepEqual(get('bd_finance_revenue'),[]);assert.equal(r.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n,audit);
});

test('HTTP close fails closed on FINAL/MISMATCH even with complete fixed hourly payroll',async t=>{
 const {r,venue,put,get,req}=await fixture();t.after(r.close);
 assert.equal((await r.api.workdays.POST(req('/api/workdays',{action:'open',operationId:'open',expectedRevision:0,staffing:[{employeeId:'private-employee',hours:7}]}))).status,201);
 put('bd_finance_revenue',[{id:'cash',venueId:venue,date,revenue:999,receipts:1,currency:'MDL',revenueSource:'sales_events_v1',closingStatus:'closed'}]);
 put('bd_sales_events_v1',[{id:'fact',venueId:venue,businessDate:date,revenueRowId:'cash',status:'POSTED',source:'POS_API',revenue:20,currency:'MDL'}]);
 const before=get('bd_operational_reports_v1'),audit=r.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n;
 const result=await r.api.workdays.POST(req('/api/workdays',{action:'close',operationId:'close',expectedRevision:1,confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}}));assert.equal(result.status,409);assert.equal((await result.json() as {code:string}).code,'WORKDAY_REVENUE_NEEDS_REVIEW');assert.deepEqual(get('bd_operational_reports_v1'),before);assert.equal(r.sqlite.prepare('SELECT COUNT(*) AS n FROM audit_log').get()!.n,audit);
});

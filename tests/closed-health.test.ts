import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs';
const HEALTH_INPUT_KEYS=[...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(),...HEALTH_OPERATIONS_KEYS])];
async function setup(){
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route',workdays:'./app/api/workdays/route',health:'./app/api/business-health/route'}, {now:'2026-10-22T12:00:00Z'});
 const owner=await r.register('closed-health@isolated.test'),venue=owner.activeVenueId;
 const put=(key:string,data:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(data),'2026-10-22T10:00:00Z');
 for(const key of HEALTH_INPUT_KEYS.filter(k=>!['bd_sales_events_v1','bd_stock_movements'].includes(k)))put(key,key==='bd_assortment_v1'?{stockBalances:[],nomenclature:[]}:[]);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'UTC',name:'Local test'}),owner.userId);
 put('bd_employees',[{id:'e',venueId:venue,name:'Employee',payrollRuleId:'r'}]);put('bd_payroll_rules',[{id:'r',venueId:venue,blocks:[{enabled:true,type:'shift_rate',amount:10}]}]);
 const date='2026-10-22',id=`operational-report:${venue}:${date}`;
 put('bd_operational_reports_v1',[{id,venueId:venue,date,workdayStatus:'OPEN',closingStatus:'open',workdayRevision:1,staffing:[{employeeId:'e'}],workdayPayrollDraft:{status:'COMPLETE',missing:[],payrollBreakdown:{total:10,perEmployee:{e:10}}}}]);
 put('bd_finance_revenue',[{id:'cash',venueId:venue,date,revenueSource:'sales_events_v1',closingStatus:'closed',revenue:100,receipts:1,currency:'MDL'}]);
 const ingredient={productKey:'p',baseQuantityTotal:1,unitCost:20,totalCost:20,currency:'MDL',costStatus:'KNOWN_VALUE'};
 const events=[{id:'sale',externalId:'sale',fingerprint:'sale',originalMovements:[],prices:[],venueId:venue,businessDate:date,revenueRowId:'cash',status:'POSTED',source:'POS_API',currency:'MDL',revenue:100,batch:{id:'sale',venueId:venue,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:20,lines:[{id:'line',salesBatchId:'sale',quantity:1,processingStatus:'POSTED',theoreticalCost:20,currency:'MDL',recipeSnapshot:{recipeId:'r',capturedAt:'2026-10-22T10:00:00Z',ingredients:[ingredient]}}]}}];
 for(const event of events){const payload=JSON.stringify(event);r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)').run(owner.userId,event.id,0,event.id,'POS_API',date,'cash',event.id,createHash('sha256').update(payload).digest('hex'));r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)').run(owner.userId,event.id,payload);}
 const request=(body?:object,user=owner)=>r.request(user,body?'/api/workdays':'/api/business-health',body?'POST':'GET',body);
 const post=(body:object)=>r.api.workdays.POST(request({venueId:venue,date,...body}));
 const read=async()=>await(await r.api.health.GET(request())).json() as any;
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json??'null'));
 assert.equal((await post({action:'team',operationId:'team',expectedRevision:1,staffing:[{employeeId:'e'}]})).status,201);
 const closeCommand={action:'close',operationId:'close',expectedRevision:2,confirmations:{writeoffs:'none',incidents:'none'},reviewedOperations:{writeoffs:0,incidents:0}};
 return {...r,owner,venue,put,post,read,get,closeCommand,request};
}
test('close stores stable Health, replay is exact; new open workday/reload cannot change it',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');
 const response=await r.post(r.closeCommand);assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
 const first=await r.read();assert.equal(first.success,true,JSON.stringify(first));assert.notEqual(first.data.businessHealth.components.find((x:any)=>x.id==='finance').score,null);
 assert.equal((await r.post(r.closeCommand)).status,200);assert.deepEqual(await r.read(),first);
 assert.equal((await r.post({action:'open',date:'2026-10-23',operationId:'open2',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_expenses',[{id:'new',venueId:r.venue,date:'2026-10-23',amount:999,currency:'MDL',category:'other'}]);assert.deepEqual(await r.read(),first);
 const other=await r.register('other-health@isolated.test');const result=await r.api.health.GET(r.request(undefined,other));assert.equal((await result.json() as any).code,'HEALTH_NO_SNAPSHOT');
});
test('failed atomic save rolls back close and snapshot; retry closes exactly once',async t=>{
 const r=await setup();t.after(r.close);r.failDatabase();
 await assert.rejects(()=>r.post(r.closeCommand));assert.equal(r.get('bd_operational_reports_v1')[0].workdayStatus,'OPEN');assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');
 assert.equal((await r.post(r.closeCommand)).status,201);assert.equal((await r.read()).success,true);
 assert.equal((await r.post(r.closeCommand)).status,200);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='workday.close'").get()!.n,1);
});
test('missing cost does not manufacture a snapshot; source conflict recalculates before committing',async t=>{
 const r=await setup();t.after(r.close);
 r.beforeNextBatch(()=>{r.put('bd_finance_expenses',[{id:'late',venueId:r.venue,date:'2026-10-22',category:'other',amount:20,currency:'MDL'}]);});
 assert.equal((await r.post(r.closeCommand)).status,201);const first=await r.read();assert.equal(first.success,true);
 assert.match(first.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/50/);
});
test('next closure updates server snapshot; insufficient new facts retain prior generation',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);const first=await r.read();
 r.setNow('2026-10-23T12:00:00Z');
 assert.equal((await r.post({action:'open',date:'2026-10-23',operationId:'o23',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),{id:'cash23',venueId:r.venue,date:'2026-10-23',revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-23',operationId:'c23',expectedRevision:1})).status,201);
 const second=await r.read();assert.notEqual(second.generatedAt,first.generatedAt);assert.match(second.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/60/);
 r.setNow('2026-10-24T12:00:00Z');assert.equal((await r.post({action:'open',date:'2026-10-24',operationId:'o24',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_expenses',[{id:'unknown',venueId:r.venue,date:'2026-10-24',amount:null,category:'other',currency:'MDL'}]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-24',operationId:'c24',expectedRevision:1})).status,201);assert.deepEqual(await r.read(),second);
});
test('first close with unknown expense leaves unavailable rather than inventing zero',async t=>{const r=await setup();t.after(r.close);r.put('bd_finance_expenses',[{id:'missing',venueId:r.venue,date:'2026-10-22',amount:null,category:'other',currency:'MDL'}]);assert.equal((await r.post(r.closeCommand)).status,201);assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');});
test('large month resumes bounded financial preparation without closing or accruing twice',async t=>{
 const r=await setup();t.after(r.close);
 const base=JSON.parse(String(r.sqlite.prepare('SELECT payload FROM sales_event_chunks LIMIT 1').get()!.payload));
 const insert=r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)');
 const chunk=r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)');
 r.sqlite.exec('BEGIN');for(let n=1;n<=10000;n++){const e=structuredClone(base),id='history-'+n;e.id=e.externalId=e.fingerprint=id;e.businessDate='2026-10-21';e.revenueRowId='oldcash';e.batch.id=id;e.batch.businessDate=e.businessDate;e.batch.lines[0].salesBatchId=id;const payload=JSON.stringify(e);insert.run(r.owner.userId,id,n,id,'POS_API',e.businessDate,'oldcash',id,createHash('sha256').update(payload).digest('hex'));chunk.run(r.owner.userId,id,payload);}r.sqlite.exec('COMMIT');
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),{id:'oldcash',venueId:r.venue,date:'2026-10-21',revenueSource:'sales_events_v1',closingStatus:'closed',revenue:1000000,receipts:10000,currency:'MDL'}]);
 r.put('bd_operational_reports_v1',[...r.get('bd_operational_reports_v1'),{id:'oldreport',venueId:r.venue,date:'2026-10-21',workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:10}}]);
 let pending=0,response;for(let attempt=0;attempt<400;attempt++){response=await r.post(r.closeCommand);if(response.status!==202)break;pending++;assert.equal(r.get('bd_operational_reports_v1')[0].workdayStatus,'OPEN');assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');}
 assert.ok(pending>0);assert.equal(response!.status,201,JSON.stringify(await response!.clone().json()));const health=await r.read();assert.equal(health.success,true);assert.match(health.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/800060/);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='workday.close'").get()!.n,1);
});
test('overnight capture keeps business date; old-month closure never reconstructs past stock',async t=>{
 const r=await setup();t.after(r.close);r.setNow('2026-10-23T00:30:00Z');assert.equal((await r.post(r.closeCommand)).status,201);const h=await r.read();assert.equal(h.success,true);assert.equal(h.generatedAt,'2026-10-23T00:30:00.000Z');assert.match(h.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/2026-10-22/);
});
test('backdated closure without a historical snapshot leaves Health unavailable',async t=>{const r=await setup();t.after(r.close);r.setNow('2026-11-02T12:00:00Z');assert.equal((await r.post(r.closeCommand)).status,201);assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');});
test('shift manager close maintains owner snapshot without granting analysis or returning sources',async t=>{const r=await setup();t.after(r.close);r.sqlite.prepare("UPDATE venue_memberships SET role='shift_manager' WHERE venue_id=? AND account_id=?").run(r.venue,r.owner.userId);const reply=await r.post(r.closeCommand);assert.equal(reply.status,201);const body=await reply.json() as any;assert.equal(body.intelligence,undefined);assert.equal(body.health,undefined);assert.ok(r.get('__bd_closed_health_v1__:'+r.venue));assert.equal((await r.api.health.GET(r.request())).status,403);});
test('sequential same-date shifts preserve first report, isolate revenue and update Health once',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);
 const first=r.get('bd_operational_reports_v1')[0],health=await r.read();
 const open={action:'open_next',operationId:'next-same-date',workdayId:first.id,expectedRevision:first.workdayRevision,staffing:[{employeeId:'e'}]};
 const response=await r.post(open);assert.equal(response.status,201,JSON.stringify(await response.clone().json()));const second=(await response.json() as any).workday;
 assert.notEqual(second.id,first.id);assert.equal(second.workdaySequence,2);assert.equal(second.workdayPayrollDraft.payrollBreakdown.total,10);
 assert.deepEqual(r.get('bd_operational_reports_v1')[0],first);assert.deepEqual(await r.read(),health);assert.equal((await r.post(open)).status,200);
 assert.equal((await r.post({...open,operationId:'another'})).status,409);
 const get=await r.api.workdays.GET(r.request(undefined));assert.equal((await get.json() as any).workday.id,second.id);
 const close={...r.closeCommand,operationId:'second-close',workdayId:second.id,expectedRevision:1};
 r.setNow('2026-10-22T16:00:00Z');const closed=await r.post(close);assert.equal(closed.status,201,JSON.stringify(await closed.clone().json()));
 assert.deepEqual(r.get('bd_operational_reports_v1')[0],first);assert.equal((await r.post(close)).status,200);
 const updated=await r.read();assert.equal(updated.success,true);assert.match(updated.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/60/);
 assert.notEqual(updated.generatedAt,health.generatedAt);
});
test('sequential concurrent open requests commit at most one and replay stays exact',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);const first=r.get('bd_operational_reports_v1')[0];
 const body={action:'open_next',workdayId:first.id,expectedRevision:first.workdayRevision,staffing:[{employeeId:'e'}]};
 const replies=await Promise.all([r.post({...body,operationId:'race1'}),r.post({...body,operationId:'race2'})]);
 assert.deepEqual(replies.map(x=>x.status).sort(),[201,409]);const rows=r.get('bd_operational_reports_v1');assert.equal(rows.filter((x:any)=>x.workdayStatus==='OPEN').length,1);assert.deepEqual(rows[0],first);
 assert.equal((await r.post({...r.closeCommand,operationId:'wrong-close',expectedRevision:1})).status,409);
});
test('sequential cash linkage and percentage plus hours exclude first-shift sales',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);const first=r.get('bd_operational_reports_v1')[0];
 r.put('bd_payroll_rules',[{id:'r',venueId:r.venue,blocks:[{enabled:true,type:'hourly_rate',amount:2},{enabled:true,type:'venue_sales_percent',percent:10}]}]);
 const opened=await r.post({action:'open_next',operationId:'pct-next',workdayId:first.id,expectedRevision:first.workdayRevision,staffing:[{employeeId:'e',hours:3}]});assert.equal(opened.status,201);const second=(await opened.json() as any).workday;
 const cash=await r.api.sales.POST(r.request({venueId:r.venue,action:'open_shift',shiftId:'second-cash',name:'Second cash',openingFloat:0}));assert.equal(cash.status,201,JSON.stringify(await cash.clone().json()));
 const rows=r.get('bd_finance_revenue');assert.equal(rows.find((x:any)=>x.id==='second-cash').workdayId,second.id);
 const event=JSON.parse(String(r.sqlite.prepare('SELECT payload FROM sales_event_chunks LIMIT 1').get()!.payload));event.id=event.externalId=event.fingerprint='second-sale';event.revenueRowId='second-cash';event.revenue=60;event.batch.id='second-sale';event.batch.lines[0].salesBatchId='second-sale';const payload=JSON.stringify(event);
 r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)').run(r.owner.userId,event.id,1,event.id,'POS_API','2026-10-22','second-cash',event.id,createHash('sha256').update(payload).digest('hex'));r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)').run(r.owner.userId,event.id,payload);
 r.put('bd_finance_revenue',rows.map((x:any)=>x.id==='second-cash'?{...x,revenue:60,receipts:1,closingStatus:'closed'}:x));
 const team=await r.post({action:'team',operationId:'pct-team',workdayId:second.id,expectedRevision:1,staffing:[{employeeId:'e',hours:3}]});assert.equal(team.status,201);const body=await team.json() as any;assert.equal(body.workday.workdayPayrollDraft.payrollBreakdown.total,12);assert.equal(body.workday.shiftVenueSales,60);
 const closed=await r.post({...r.closeCommand,operationId:'pct-close',workdayId:second.id,expectedRevision:2});assert.equal(closed.status,201,JSON.stringify(await closed.clone().json()));assert.deepEqual(r.get('bd_operational_reports_v1')[0],first);
});
test('sequential guards protect closed month, selected history and other tenant',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);const first=r.get('bd_operational_reports_v1')[0];
 const unknown=await r.api.workdays.GET(r.request(undefined));assert.equal((await unknown.json() as any).workday.id,first.id);
 const other=await r.register('sequential-other@test.example');const foreign=await r.api.workdays.GET(r.request(undefined,other));assert.equal((await foreign.json() as any).workday,null);
 assert.equal((await r.post({action:'open_next',date:'2026-10-21',operationId:'past',workdayId:first.id,expectedRevision:0,staffing:[{employeeId:'e'}]})).status,409);
 r.put('bd_month_closings',[{venueId:r.venue,monthKey:'2026-10',status:'closed'}]);
 assert.equal((await r.post({action:'open_next',operationId:'month-lock',workdayId:first.id,expectedRevision:first.workdayRevision,staffing:[{employeeId:'e'}]})).status,423);
 // Closed history is never reopened through team/close or new-date open.
 assert.equal((await r.post({action:'team',operationId:'mutate-closed',workdayId:first.id,expectedRevision:first.workdayRevision,staffing:[{employeeId:'e'}]})).status>=400,true);assert.deepEqual(r.get('bd_operational_reports_v1')[0],first);
});

test('future closed zero cash shifts do not block current closed Health; records stay unchanged',async t=>{
 const r=await setup();t.after(r.close);
 const future=[25,26].map(day=>({id:'future-'+day,venueId:r.venue,date:'2026-10-'+day,revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}));
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),...future]);
 const before=JSON.stringify(r.get('bd_finance_revenue'));
 assert.equal((await r.post(r.closeCommand)).status,201);
 const health=await r.read();assert.equal(health.success,true);assert.match(health.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/2026-10-22/);
 assert.equal(JSON.stringify(r.get('bd_finance_revenue')),before);assert.deepEqual(await r.read(),health);
});
for(const [name,patch] of Object.entries({nonzero:{revenue:1},unknown:{revenue:null},receipts:{receipts:1},open:{closingStatus:'open'},invalidDate:{date:'unknown'},invalidCalendarDate:{date:'2026-10-99'}}))test('future cash '+name+' does not bypass completeness safeguards',async t=>{
 const r=await setup();t.after(r.close);r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),{id:'future',venueId:r.venue,date:'2026-10-25',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL',...patch}]);
 assert.equal((await r.post(r.closeCommand)).status,201);assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');
});
test('3393 date scenario: closed 24 October ignores empty 25/26, then open next shift keeps capture',async t=>{
 const r=await setup();t.after(r.close);assert.equal((await r.post(r.closeCommand)).status,201);
 r.setNow('2026-10-24T18:00:00Z');assert.equal((await r.post({action:'open',date:'2026-10-24',operationId:'open24',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_operational_reports_v1',[...r.get('bd_operational_reports_v1'),...[25,26].map(day=>({id:'future-workday-'+day,venueId:r.venue,date:'2026-10-'+day,workdayStatus:'CLOSED',closingStatus:'closed',payrollBreakdown:{total:0}}))]);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),...[24,25,26].map(day=>({id:'cash'+day,venueId:r.venue,date:'2026-10-'+day,revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}))]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-24',operationId:'close24',expectedRevision:1})).status,201);
 const health=await r.read();assert.equal(health.generatedAt,'2026-10-24T18:00:00.000Z');assert.match(health.data.businessHealth.components.find((x:any)=>x.id==='finance').evidence.join(' '),/2026-10-24/);
 const report=r.get('bd_operational_reports_v1').find((x:any)=>x.date==='2026-10-24');
 assert.equal((await r.post({action:'open_next',date:report.date,workdayId:report.id,operationId:'next24',expectedRevision:report.workdayRevision,staffing:[{employeeId:'e'}]})).status,201);assert.deepEqual(await r.read(),health);
});
test('venue timezone: yesterday remains eligible and tomorrow cannot seed a snapshot',async t=>{
 const overnight=await setup();t.after(overnight.close);
 overnight.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'Europe/Chisinau',name:'Local test'}),overnight.owner.userId);
 overnight.setNow('2026-10-22T22:30:00Z');assert.equal((await overnight.post(overnight.closeCommand)).status,201);assert.equal((await overnight.read()).success,true);
 const future=await setup();t.after(future.close);
 future.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'America/Los_Angeles',name:'Local test'}),future.owner.userId);
 future.setNow('2026-10-22T01:00:00Z');assert.equal((await future.post(future.closeCommand)).status,201);assert.equal((await future.read()).code,'HEALTH_NO_SNAPSHOT');
});

test('future zero cash with posted sales is not proven empty',async t=>{
 const r=await setup();t.after(r.close);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),{id:'future',venueId:r.venue,date:'2026-10-25',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}]);
 const event=JSON.parse(String(r.sqlite.prepare('SELECT payload FROM sales_event_chunks LIMIT 1').get()!.payload));event.id=event.externalId=event.fingerprint='future-sale';event.businessDate='2026-10-25';event.revenueRowId='future';event.batch.id='future-sale';event.batch.businessDate=event.businessDate;event.batch.lines[0].salesBatchId='future-sale';const payload=JSON.stringify(event);
 r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)').run(r.owner.userId,event.id,1,event.id,'POS_API',event.businessDate,event.revenueRowId,event.id,createHash('sha256').update(payload).digest('hex'));r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)').run(r.owner.userId,event.id,payload);
 assert.equal((await r.post(r.closeCommand)).status,201);assert.equal((await r.read()).code,'HEALTH_NO_SNAPSHOT');
});

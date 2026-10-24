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
async function missedCapture(){
 const r=await setup();assert.equal((await r.post(r.closeCommand)).status,201);const key='__bd_closed_health_v1__:'+r.venue,previous=r.get(key);
 r.setNow('2026-10-24T17:00:00Z');assert.equal((await r.post({action:'open',date:'2026-10-24',operationId:'recovery-open24',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),...[24,25,26].map(day=>({id:'cash'+day,venueId:r.venue,date:'2026-10-'+day,revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}))]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-24',operationId:'recovery-close24',expectedRevision:1})).status,201);
 r.put(key,previous);r.setNow('2026-10-24T18:00:00Z');return {...r,key,previous};
}
test('missed capture recovers on GET with current calculation time, without business writes; reload stable',async t=>{
 const r=await missedCapture();t.after(r.close);
 const before=r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? AND store_key<>? ORDER BY store_key').all(r.owner.userId,r.key);
 const audit=r.sqlite.prepare('SELECT * FROM audit_log').all();
 const result=await r.read();assert.equal(result.generatedAt,'2026-10-24T18:00:00.000Z');
 const snapshot=result.data.businessHealthSnapshot;assert.equal(snapshot.captureMode,'RECALCULATED_CLOSED_PERIOD');assert.equal(snapshot.closedWorkdayDate,'2026-10-24');assert.equal(snapshot.closedWorkdayClosedAt,'2026-10-24T17:00:00.000Z');
 assert.deepEqual(r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? AND store_key<>? ORDER BY store_key').all(r.owner.userId,r.key),before);assert.deepEqual(r.sqlite.prepare('SELECT * FROM audit_log').all(),audit);
 const stored=r.get(r.key);r.setNow('2026-10-24T19:00:00Z');assert.deepEqual(await r.read(),result);assert.deepEqual(r.get(r.key),stored);
});
test('missed capture does not incorporate a new open shift, even on the same business date',async t=>{
 const r=await missedCapture();t.after(r.close);const report=r.get('bd_operational_reports_v1').find((x:any)=>x.date==='2026-10-24');
 assert.equal((await r.post({action:'open_next',date:report.date,workdayId:report.id,operationId:'recovery-next',expectedRevision:report.workdayRevision,staffing:[{employeeId:'e'}]})).status,201);
 assert.deepEqual(await r.read(),JSON.parse(r.previous.payload));assert.deepEqual(r.get(r.key),r.previous);
});
test('recovery preserves prior assessment when sources incomplete or the derived write fails',async t=>{
 const r=await missedCapture();t.after(r.close);r.put('bd_finance_expenses',[{id:'unknown',venueId:r.venue,date:'2026-10-24',amount:null,category:'other',currency:'MDL'}]);
 assert.deepEqual(await r.read(),JSON.parse(r.previous.payload));assert.deepEqual(r.get(r.key),r.previous);
 r.put('bd_finance_expenses',[]);r.failDatabase();assert.deepEqual(await r.read(),JSON.parse(r.previous.payload));assert.deepEqual(r.get(r.key),r.previous);
 assert.equal((await r.read()).data.businessHealthSnapshot.captureMode,'RECALCULATED_CLOSED_PERIOD');
});
test('recovery CAS rejects an intervening new open workday and retries only on later read',async t=>{
 const r=await missedCapture();t.after(r.close);
 r.beforeNextBatch(()=>{r.put('bd_operational_reports_v1',[...r.get('bd_operational_reports_v1'),{id:'new-open',venueId:r.venue,date:'2026-10-24',workdayStatus:'OPEN',workdayRevision:1}]);});
 assert.deepEqual(await r.read(),JSON.parse(r.previous.payload));assert.deepEqual(r.get(r.key),r.previous);
});
test('concurrent recovery reads converge on one persisted generation',async t=>{
 const r=await missedCapture();t.after(r.close);const results=await Promise.all([r.read(),r.read()]);assert.deepEqual(results[0],results[1]);assert.equal(results[0].generatedAt,'2026-10-24T18:00:00.000Z');assert.equal(r.get(r.key).captureMode,'RECALCULATED_CLOSED_PERIOD');
});

test('recovery of yesterday uses venue date, and future closed workdays never win selection',async t=>{
 const r=await missedCapture();t.after(r.close);
 r.put('bd_operational_reports_v1',[...r.get('bd_operational_reports_v1'),...[25,26].map(day=>({id:'future'+day,venueId:r.venue,date:'2026-10-'+day,workdayStatus:'CLOSED',workdayClosedAt:'2026-10-24T17:00:00Z',workdayRevision:2,payrollBreakdown:{total:0}}))]);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'Europe/Chisinau',name:'Local test'}),r.owner.userId);
 r.setNow('2026-10-24T22:30:00Z');const result=await r.read();assert.equal(result.data.businessHealthSnapshot.closedWorkdayDate,'2026-10-24');assert.equal(result.generatedAt,'2026-10-24T22:30:00.000Z');
});
test('recovery selects exact last sequential shift, not the first shift of that date',async t=>{
 const r=await missedCapture();t.after(r.close);const first=r.get('bd_operational_reports_v1').find((x:any)=>x.date==='2026-10-24');
 const opened=await r.post({action:'open_next',date:first.date,workdayId:first.id,operationId:'recover-seq-open',expectedRevision:first.workdayRevision,staffing:[{employeeId:'e'}]});assert.equal(opened.status,201);const second=(await opened.json() as any).workday;
 assert.equal((await r.post({...r.closeCommand,date:first.date,workdayId:second.id,operationId:'recover-seq-close',expectedRevision:1})).status,201);r.put(r.key,r.previous);r.setNow('2026-10-24T19:00:00Z');
 assert.equal((await r.read()).data.businessHealthSnapshot.closedWorkdayId,second.id);
});
test('future stock movements prevent recovery rather than silently using later balances',async t=>{
 const r=await missedCapture();t.after(r.close);r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,kind,effective_date,payload_json) VALUES(?,0,?,?,?,?)').run(r.owner.userId,'future-stock','receipt','2026-10-25',JSON.stringify({id:'future-stock',venueId:r.venue,date:'2026-10-25',businessDate:'2026-10-25',productKey:'p',quantity:1}));assert.deepEqual(await r.read(),JSON.parse(r.previous.payload));assert.deepEqual(r.get(r.key),r.previous);
});
test('recovery does not create another tenant capture',async t=>{
 const r=await missedCapture();t.after(r.close);const other=await r.register('recovery-other@isolated.test');const response=await r.api.health.GET(r.request(undefined,other));assert.equal((await response.json() as any).code,'HEALTH_NO_SNAPSHOT');assert.deepEqual(r.get(r.key),r.previous);
});
async function prematurelyClosed24(){
 const r=await setup();assert.equal((await r.post(r.closeCommand)).status,201);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'Europe/Chisinau',name:'Local test'}),r.owner.userId);
 r.setNow('2026-10-23T16:41:00Z');assert.equal((await r.post({action:'open',date:'2026-10-23',operationId:'exact-open23',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),{id:'cash23',venueId:r.venue,date:'2026-10-23',revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL'}]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-23',operationId:'exact-close23',expectedRevision:1})).status,201);const key='__bd_closed_health_v1__:'+r.venue,previous=r.get(key);
 r.setNow('2026-10-24T18:00:00Z');assert.equal((await r.post({action:'open',date:'2026-10-24',operationId:'exact-open24',expectedRevision:0,staffing:[{employeeId:'e'}]})).status,201);
 r.put('bd_finance_revenue',[...r.get('bd_finance_revenue'),...[24,25,26].map(day=>({id:'cash'+day,venueId:r.venue,date:'2026-10-'+day,revenueSource:'sales_events_v1',closingStatus:'closed',revenue:0,receipts:0,currency:'MDL',closedAt:'2026-10-23T17:40:20.150Z'}))]);
 assert.equal((await r.post({...r.closeCommand,date:'2026-10-24',operationId:'exact-close24',expectedRevision:1})).status,201);
 const timestamps={workdayOpenedAt:'2026-10-23T17:28:46.390Z',workdayClosedAt:'2026-10-23T17:40:59.781Z'};
 r.put('bd_operational_reports_v1',[...r.get('bd_operational_reports_v1').map((row:any)=>row.date==='2026-10-24'?{...row,...timestamps}:row),...[25,26].map(day=>({id:'future-'+day,venueId:r.venue,date:'2026-10-'+day,workdayStatus:'CLOSED',workdayRevision:3,workdaySequence:1,payrollBreakdown:{total:0},...timestamps}))]);r.put(key,previous);
 return {...r,key,previous};
}
async function diagnosticHealth(r:Awaited<ReturnType<typeof setup>>){const request=r.request();return await(await r.api.health.GET(new Request(request.url+'?diagnostics=1',{headers:request.headers}))).json() as any;}
test('exact early-close timestamps: arrived 24 October recovers, future 25/26 excluded, old 23 capture replaced honestly',async t=>{
 const r=await prematurelyClosed24();t.after(r.close);assert.equal(JSON.parse(r.previous.payload).generatedAt,'2026-10-23T16:41:00.000Z');
 const reports=r.get('bd_operational_reports_v1'),cash=r.get('bd_finance_revenue');
 const result=await diagnosticHealth(r);assert.equal(result.recovery.reason,'REFRESHED');assert.equal(result.generatedAt,'2026-10-24T18:00:00.000Z');assert.equal(result.data.businessHealthSnapshot.closedWorkdayDate,'2026-10-24');assert.equal(result.data.businessHealthSnapshot.closedWorkdayClosedAt,'2026-10-23T17:40:59.781Z');
 assert.deepEqual(r.get('bd_operational_reports_v1'),reports);assert.deepEqual(r.get('bd_finance_revenue'),cash);
 const repeated=await diagnosticHealth(r);assert.equal(repeated.recovery.reason,'CURRENT');assert.deepEqual(repeated.data,result.data);assert.equal(repeated.generatedAt,result.generatedAt);assert.deepEqual(Object.keys(repeated.recovery),['reason']);
});
test('early closure is not sufficient: earlier OPEN guard and incomplete finance remain distinct',async t=>{
 const r=await prematurelyClosed24();t.after(r.close);const reports=r.get('bd_operational_reports_v1');r.put('bd_operational_reports_v1',[...reports,{id:'open',venueId:r.venue,date:'2026-10-24',workdayStatus:'OPEN'}]);
 assert.equal((await diagnosticHealth(r)).recovery.reason,'OPEN_WORKDAY');assert.deepEqual(r.get(r.key),r.previous);
 r.put('bd_operational_reports_v1',reports);r.put('bd_finance_expenses',[{id:'unknown',venueId:r.venue,date:'2026-10-24',amount:null,category:'other',currency:'MDL'}]);assert.equal((await diagnosticHealth(r)).recovery.reason,'FINANCE_INCOMPLETE');assert.deepEqual(r.get(r.key),r.previous);
});
test('future business date and invalid opening/closing order cannot become recovery candidates',async t=>{
 const r=await prematurelyClosed24();t.after(r.close);r.setNow('2026-10-23T18:00:00Z');assert.equal((await diagnosticHealth(r)).recovery.reason,'CURRENT');assert.deepEqual(r.get(r.key),r.previous);
 r.setNow('2026-10-24T18:00:00Z');const reports=r.get('bd_operational_reports_v1');
 for(const opened of [undefined,'bad','2026-10-23T18:00:00Z']){r.put('bd_operational_reports_v1',reports.map((row:any)=>row.date==='2026-10-24'?{...row,workdayOpenedAt:opened}:row));assert.deepEqual((await diagnosticHealth(r)).data,JSON.parse(r.previous.payload).data);assert.deepEqual(r.get(r.key),r.previous);}
});

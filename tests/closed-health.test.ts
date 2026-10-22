import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs';
const HEALTH_INPUT_KEYS=[...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(),...HEALTH_OPERATIONS_KEYS])];
async function setup(){
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route',health:'./app/api/business-health/route'}, {now:'2026-10-22T12:00:00Z'});
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

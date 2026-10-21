import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';

test('fresh account absent optional expense and payroll-entry stores are confirmed empty, not unavailable',async t=>{
 const n=2,variant='normal' as string;const now='2026-10-21T12:00:00Z',r=await lifecycleRuntime({month:'./app/api/month-close/route',health:'./app/api/business-health/route',progress:'./lib/bardoctor/financial-read-progress',database:'./db',finance:'./lib/bardoctor/current-finance'},{now});t.after(r.close);
 const owner=await r.register('growth-month@isolated.test'),api=r.api as any,db=api.database.getD1();const accountId=owner.userId,venueId=owner.activeVenueId;
 const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id),scope={venueId,workspaceId,dataAccountId:accountId};
 const profile={name:'Local only',currency:'MDL',timezone:'UTC'},profileJson=JSON.stringify(profile);r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(profileJson,accountId);
 const date=n>40?'2026-10-01':'2026-10-20',events:any[]=[],movements:any[]=[];
 const insertEvent=r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)');
 const insertChunk=r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)');
 const insertMovement=r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,sales_batch_id,payload_json) VALUES(?,?,?,?,?,?,?,?)');
 r.sqlite.exec('BEGIN');
 for(let i=0;i<n;i++){
  const eventDate=i<n?date:i===n?'2026-09-30':'2026-11-01';
  const id='event-'+i,cost=10,ingredient={productKey:'product',baseQuantityTotal:1,unitCost:cost,totalCost:cost,currency:'MDL',costStatus:cost?'KNOWN_VALUE':'KNOWN_ZERO'};
  const batch={id,venueId,businessDate:eventDate,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:cost,lines:[{id:'line-'+i,salesBatchId:id,quantity:1,processingStatus:'POSTED',theoreticalCost:cost,currency:'MDL',recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[ingredient]}}]};
  const e={id,externalId:id,fingerprint:id,venueId,businessDate:eventDate,revenueRowId:'shift',status:'POSTED',source:'POS_API',currency:'MDL',revenue:50,prices:[],originalMovements:[],batch};events.push(e);
  if(variant==='unknown'&&i===1){(e.batch as any).costStatus='UNKNOWN';}
  if(variant==='duplicate'&&i===2){e.batch=structuredClone(events[1].batch);}
  const json=JSON.stringify(e);insertEvent.run(accountId,id,i,id,'POS_API',eventDate,'shift',id,createHash('sha256').update(json).digest('hex'));insertChunk.run(accountId,id,json);
  const m={id:'movement-'+i,venueId,productKey:'product',type:'sale_consumption',businessDate:eventDate,salesBatchId:id,amount:-1,costAmount:cost,currency:'MDL'};movements.push(m);insertMovement.run(accountId,-i-1,m.id,'product',m.type,eventDate,id,JSON.stringify(m));
 }
 r.sqlite.exec('COMMIT');if(n>10000)assert(Buffer.byteLength(JSON.stringify(events))>2_000_000);
 const stores={bd_finance_revenue:[{id:'shift',venueId,date,revenueSource:'sales_events_v1',revenue:n*50,receipts:n,currency:'MDL',closingStatus:'closed'}],bd_operational_reports_v1:[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:10}}],bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[]};
 for(const [key,value] of Object.entries(stores))r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,JSON.stringify(value));
 const sourceRows=()=>JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all());
 const before=sourceRows();
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE account_id=? AND store_key IN ('bd_finance_expenses','bd_payroll_entries')").get(accountId)!.n,0,'untouched optional stores stay absent after real registration');
 const read=async()=>{const response=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(response.status,200);return (await response.json()).report;};
 let report=await read();assert.equal(report.payrollBase,10);assert.equal(report.payroll,10);assert.equal(report.operatingExpenses,0);assert.equal(report.costOfGoods,20);assert.equal(report.resultAfterCost,70);assert.deepEqual(report.missing,[]);assert.equal(sourceRows(),before);
 const health=await api.health.GET(r.request(owner,'/api/business-health'));assert.equal(health.status,200);const value=await health.json();assert.equal(value.data.businessHealth.components.find((c:any)=>c.id==='finance').score!==null,true);
 assert.equal(sourceRows(),before,'reads never persist empty defaults');
 const put=(key:string,data:string)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,data);
 put('bd_finance_expenses',JSON.stringify([{id:'bad',venueId,date,category:'other',currency:'MDL'}]));report=await read();assert.equal(report.resultAfterCost,null);assert.ok(report.missing.includes('EXPENSES_OR_CURRENCY'));
 put('bd_finance_expenses','[]');put('bd_payroll_entries',JSON.stringify([{id:'bad',venueId,date,type:'bonus',currency:'MDL'}]));report=await read();assert.equal(report.payroll,null);assert.ok(report.missing.includes('PAYROLL'));
 put('bd_payroll_entries','[]');put('bd_operational_reports_v1',JSON.stringify([{id:'report',venueId,date,closingStatus:'closed'}]));report=await read();assert.equal(report.payroll,null);assert.ok(report.missing.includes('PAYROLL'));
 put('bd_operational_reports_v1',JSON.stringify([{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:0}}]));report=await read();assert.equal(report.payroll,0);assert.equal(report.resultAfterCost,80);
 put('bd_finance_expenses','{}');report=await read();assert.equal(report.resultAfterCost,null);assert.ok(report.missing.includes('EXPENSES_OR_CURRENCY'));
 const malformedHealth=await api.health.GET(r.request(owner,'/api/business-health'));assert.equal(malformedHealth.status,200);assert.equal((await malformedHealth.json()).data.businessHealth.components.find((c:any)=>c.id==='finance').score,null);
 put('bd_finance_expenses',JSON.stringify([{id:'foreign',venueId:venueId+1,date,category:'other',amount:1,currency:'MDL'}]));
 const foreignHealth=await api.health.GET(r.request(owner,'/api/business-health'));assert.equal(foreignHealth.status,200);assert.equal((await foreignHealth.json()).data.businessHealth.components.find((c:any)=>c.id==='finance').score,null);
 put('bd_finance_expenses','{');const invalid=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(invalid.status,422);
});

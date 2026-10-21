import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';

test('shared financial job races continue without hiding source or database failures',async t=>{
 const n=3,variant='normal' as string; const now='2026-10-21T12:00:00Z',r=await lifecycleRuntime({month:'./app/api/month-close/route',health:'./app/api/business-health/route',progress:'./lib/bardoctor/financial-read-progress',database:'./db',finance:'./lib/bardoctor/current-finance'},{now});t.after(r.close);
 const owner=await r.register('growth-month@isolated.test'),api=r.api as any,db=api.database.getD1();const accountId=owner.userId,venueId=owner.activeVenueId;
 const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id),scope={venueId,workspaceId,dataAccountId:accountId};
 const profile={name:'Local only',currency:'MDL',timezone:'UTC'},profileJson=JSON.stringify(profile);r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(profileJson,accountId);
 const date=n>40?'2026-10-01':'2026-10-20',events:any[]=[],movements:any[]=[];
 const insertEvent=r.sqlite.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,fingerprint,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?,?,?,1)');
 const insertChunk=r.sqlite.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES(?,?,0,0,?)');
 const insertMovement=r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,sales_batch_id,payload_json) VALUES(?,?,?,?,?,?,?,?)');
 r.sqlite.exec('BEGIN');
 for(let i=0;i<n+2;i++){
  const eventDate=i<n?date:i===n?'2026-09-30':'2026-11-01';
  const id='event-'+i,cost=i%3?2:0,ingredient={productKey:'product',baseQuantityTotal:1,unitCost:cost,totalCost:cost,currency:'MDL',costStatus:cost?'KNOWN_VALUE':'KNOWN_ZERO'};
  const batch={id,venueId,businessDate:eventDate,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:cost,lines:[{id:'line-'+i,salesBatchId:id,quantity:1,processingStatus:'POSTED',theoreticalCost:cost,currency:'MDL',recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[ingredient]}}]};
  const e={id,externalId:id,fingerprint:id,venueId,businessDate:eventDate,revenueRowId:'shift',status:'POSTED',source:'POS_API',currency:'MDL',revenue:10,prices:[],originalMovements:[],batch};events.push(e);
  if(variant==='unknown'&&i===1){(e.batch as any).costStatus='UNKNOWN';}
  if(variant==='duplicate'&&i===2){e.batch=structuredClone(events[1].batch);}
  const json=JSON.stringify(e);insertEvent.run(accountId,id,i,id,'POS_API',eventDate,'shift',id,createHash('sha256').update(json).digest('hex'));insertChunk.run(accountId,id,json);
  const m={id:'movement-'+i,venueId,productKey:'product',type:'sale_consumption',businessDate:eventDate,salesBatchId:id,amount:-1,costAmount:cost,currency:'MDL'};movements.push(m);insertMovement.run(accountId,-i-1,m.id,'product',m.type,eventDate,id,JSON.stringify(m));
 }
 r.sqlite.exec('COMMIT');if(n>10000)assert(Buffer.byteLength(JSON.stringify(events))>2_000_000);
 const stores={bd_finance_revenue:[{id:'shift',venueId,date,revenueSource:'sales_events_v1',revenue:n*10,receipts:n,currency:'MDL',closingStatus:'closed'}],bd_operational_reports_v1:[{id:'report',venueId,date,closingStatus:'closed',payrollBreakdown:{total:0}}],bd_finance_expenses:[],bd_payroll_entries:[],bd_sales_batches:[],bd_sales_documents:[],bd_sales_reconciliations_v1:[]};
 for(const [key,value] of Object.entries(stores))r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,JSON.stringify(value));
 const snapshots=r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=?').all(accountId).map((x:any)=>({key:x.store_key,dataJson:x.data_json,updatedAt:x.updated_at}));
 const input={scope,period:{start:'2026-10-01',endExclusive:'2026-11-01'},currency:'MDL',profileJson,snapshots,stores};
 const step=()=>api.progress.advanceFinancialRead(db,input);
 const before=JSON.stringify({domain:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),events:r.sqlite.prepare('SELECT * FROM sales_event_records').all(),stock:r.sqlite.prepare('SELECT * FROM stock_journal_movements').all()});
 const initial=await Promise.all([step(),step()]);assert(initial.every(x=>x.pending));
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM financial_read_jobs').get()!.n,1);
 let result:any,rounds=0;
 do {
  const concurrent=await Promise.all([step(),step(),step()]);
  for(const value of concurrent)if(value.pending){assert.equal(value.events,undefined);assert.equal(value.costProof,undefined);}
  result=concurrent.find(x=>!x.pending);assert(++rounds<60);
 }while(!result);
 assert.equal(result.history.cost,4);assert.equal(result.events.length,1);
 assert.equal(JSON.stringify({domain:r.sqlite.prepare('SELECT * FROM domain_data ORDER BY store_key').all(),events:r.sqlite.prepare('SELECT * FROM sales_event_records').all(),stock:r.sqlite.prepare('SELECT * FROM stock_journal_movements').all()}),before);
 // Discarded/aborted consumer cannot poison shared ready state; retry is exact.
 const request=r.request(owner,'/api/month-close?monthKey=current&view=current');const controller=new AbortController();controller.abort();
 await api.month.GET(new Request(request,{signal:controller.signal}));
 const response=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(response.status,200);const report=(await response.json()).report;
 assert.equal(report.revenue,30);assert.equal(report.receipts,3);assert.equal(report.costOfGoods,4);assert.equal(report.resultAfterCost,26);
 r.failDatabase();await assert.rejects(step(),/injected database failure/);
 r.beforeNextBatch(()=>{r.sqlite.prepare('UPDATE financial_read_jobs SET revision=revision+1').run();r.sqlite.prepare("UPDATE domain_data SET updated_at='changed' WHERE account_id=? AND store_key='bd_finance_revenue'").run(accountId);});
 await assert.rejects(step(),/changed|conflict/i);
 const source=snapshots.find((x:any)=>x.key==='bd_finance_revenue')!;
 r.sqlite.prepare("UPDATE domain_data SET updated_at=? WHERE account_id=? AND store_key='bd_finance_revenue'").run(source.updatedAt,accountId);
 assert.equal((await step()).pending,false);
 r.sqlite.prepare("UPDATE domain_data SET data_json='{' WHERE account_id=? AND store_key='bd_finance_revenue'").run(accountId);
 const invalid=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));assert.equal(invalid.status,422);assert.equal((await invalid.json()).code,'MONTH_INPUTS_NEED_REVIEW');
 console.log(JSON.stringify({concurrentStart:2,concurrentContinuations:3,rounds,revenue:30,cost:4,result:26,unchanged:true}));
});

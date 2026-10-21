import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';

for(const [n,variant] of [[3,'normal'],[10001,'normal'],[3,'unknown'],[3,'duplicate']] as const)test('bounded current-month continuation matches oracle for '+n+' receipts '+variant,async t=>{
 const now='2026-10-21T12:00:00Z',r=await lifecycleRuntime({month:'./app/api/month-close/route',health:'./app/api/business-health/route',progress:'./lib/bardoctor/financial-read-progress',database:'./db',finance:'./lib/bardoctor/current-finance'},{now});t.after(r.close);
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
 const business=()=>JSON.stringify({sources:r.sqlite.prepare('SELECT * FROM domain_data WHERE account_id=? ORDER BY store_key').all(accountId),eventCount:r.sqlite.prepare('SELECT count(*) n FROM sales_event_records').get(),movementCount:r.sqlite.prepare('SELECT count(*) n FROM stock_journal_movements').get()});const before=business();
 const first=await api.progress.advanceFinancialRead(db,input);assert.equal(first.pending,true);
 const progressBefore=JSON.stringify(r.sqlite.prepare('SELECT * FROM financial_read_jobs').all());const stagedBefore=r.sqlite.prepare('SELECT count(*) n FROM financial_read_events WHERE job_id=?').get(first.id)!.n;
 r.failDatabase();await assert.rejects(api.progress.advanceFinancialRead(db,input),/injected database failure/);assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM financial_read_jobs').all()),progressBefore);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM financial_read_events WHERE job_id=?').get(first.id)!.n,stagedBefore);
 await assert.rejects(api.progress.advanceFinancialRead(db,{...input,scope:{...scope,venueId:venueId+1000}}));assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM financial_read_jobs').all()),progressBefore);
 if(n>40){
  const part=r.sqlite.prepare('SELECT payload FROM sales_event_chunks WHERE account_id=? AND event_id=?').get(accountId,'event-40')!;
  r.sqlite.prepare('UPDATE sales_event_chunks SET payload=? WHERE account_id=? AND event_id=?').run('{}',accountId,'event-40');
  await assert.rejects(api.progress.advanceFinancialRead(db,input),/NEEDS_REVIEW/);assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM financial_read_jobs').all()),progressBefore);
  r.sqlite.prepare('UPDATE sales_event_chunks SET payload=? WHERE account_id=? AND event_id=?').run(part.payload,accountId,'event-40');
 }
 let steps=1,result:any;do{result=await api.progress.advanceFinancialRead(db,input);assert(++steps<600);if(result.pending){assert.equal(result.history,undefined);assert.equal(result.costProof,undefined);}}while(result.pending);
 const oracle=historicalPeriodCost({venueId,monthKey:'2026-10',accountingCurrency:'MDL',revenues:stores.bd_finance_revenue,events,movements});
 assert.deepEqual(result.history,oracle);assert.equal(result.events.length,1);
 const finance=api.finance.currentFinance({profile,...scope,currency:'MDL',asOf:now,startDate:'2026-10-01',endDate:date,revenues:stores.bd_finance_revenue,reports:stores.bd_operational_reports_v1,events:result.events,movements:[],expenses:[],payrollEntries:[],costInputsAvailable:true,costProof:result.costProof});
 assert.equal(finance.revenue,n*10);assert.equal(finance.days[0].revenue.receipts,n);assert.equal(finance.costOfGoods,oracle.salesCostKnown?oracle.cost:null);assert.equal(finance.resultAfterCost,oracle.known?n*10-oracle.cost:null);assert.equal(business(),before);
 // Real handlers own continuation and expose no partial result as complete.
 let response:Response,body:any,requests=0;
 do{response=await api.month.GET(r.request(owner,'/api/month-close?monthKey=current&view=current'));body=await response.json();assert([200,202].includes(response.status),JSON.stringify(body));if(response.status===202){assert.equal(body.report,undefined);assert.equal(body.pending,true);}assert(++requests<150);}while(response.status===202);
 assert.equal(body.report.costOfGoods,oracle.salesCostKnown?oracle.cost:null);assert.equal(body.report.resultAfterCost,oracle.known?n*10-oracle.cost:null);assert.equal(body.report.receipts,n);
 const healthResponse=await api.health.GET(r.request(owner,'/api/business-health'));assert.equal(healthResponse.status,200,await healthResponse.clone().text());
 const healthValue=await healthResponse.json();assert.equal(healthValue.data.businessHealth.components.find((c:any)=>c.id==='finance').score!==null,oracle.known);
 assert(Number(r.sqlite.prepare('SELECT count(*) n FROM financial_read_events WHERE job_id=?').get(result.id)!.n)<=n,'scratch cleanup never expands history');
 for(let cleanup=0;cleanup<Math.ceil(n/500)+2&&Number(r.sqlite.prepare('SELECT count(*) n FROM financial_read_events WHERE job_id=?').get(result.id)!.n)>0;cleanup++)await api.progress.advanceFinancialRead(db,input);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM financial_read_events WHERE job_id=?').get(result.id)!.n,0,'completed scratch data is removed in bounded pages');
 r.sqlite.prepare("UPDATE domain_data SET updated_at='changed' WHERE account_id=? AND store_key='bd_finance_revenue'").run(accountId);
 await assert.rejects(api.progress.advanceFinancialRead(db,input),/changed|conflict/i);
 r.sqlite.prepare("UPDATE domain_data SET updated_at=? WHERE account_id=? AND store_key='bd_finance_revenue'").run(snapshots.find((s:any)=>s.key==='bd_finance_revenue')!.updatedAt,accountId);
 const repeat=await api.progress.advanceFinancialRead(db,input);assert.equal(repeat.pending,false);assert.deepEqual(repeat.history,oracle);
 console.log(JSON.stringify({receipts:n,movements:n,eventBytes:Buffer.byteLength(JSON.stringify(events)),steps,cost:oracle.cost,result:finance.resultAfterCost}));
});

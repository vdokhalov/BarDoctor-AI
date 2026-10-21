import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';

test('resumable reader preserves explicit legacy links, unknown adjustments and indexed page selection',async t=>{
 const now='2026-10-21T12:00:00Z',r=await lifecycleRuntime({progress:'./lib/bardoctor/financial-read-progress',database:'./db'},{now});t.after(r.close);
 const owner=await r.register('linked-progress@isolated.test'),api=r.api as any,db=api.database.getD1(),accountId=owner.userId,venueId=owner.activeVenueId;
 const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venueId)!.workspace_id),profileJson=JSON.stringify({currency:'MDL',timezone:'UTC'});
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(profileJson,accountId);
 const date='2026-10-02',revenue={id:'legacy',venueId,date,revenue:100,receipts:3};
 const batch={id:'batch',venueId,businessDate:date,status:'POSTED',costStatus:'FULL',totalTheoreticalCost:30,lines:[{id:'line',salesBatchId:'batch',quantity:3,processingStatus:'POSTED',theoreticalCost:30,currency:'MDL',recipeSnapshot:{recipeId:'recipe',capturedAt:now,ingredients:[{productKey:'p',baseQuantityTotal:3,unitCost:10,totalCost:30,currency:'MDL',costStatus:'KNOWN_VALUE'}]}}]};
 const reconciliation={contractVersion:1,status:'CONFIRMED',venueId,operationId:'local-fixture',previewRevision:'local-pinned',date,currency:'MDL',revenueId:'legacy',cost:30,before:{revenue,batches:[batch]},evidence:{kind:'SYNTHETIC_FIXTURE',reference:'Local captured fixture evidence',method:'Explicit complete fixture coverage for this regression only.',completeCoverage:true,historicalPricesAvailable:false}};
 const stores:any={bd_finance_revenue:[revenue],bd_sales_batches:[batch],bd_sales_reconciliations_v1:[reconciliation]};
 const put=(key:string,value:any)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(accountId,key,JSON.stringify(value));
 for(const [key,value] of Object.entries(stores))put(key,value);
 for(const [table,index,column] of [['sales_event_records','sales_event_date','business_date'],['stock_journal_movements','stock_journal_period','effective_date']]){
  const plan=r.sqlite.prepare('EXPLAIN QUERY PLAN SELECT position FROM '+table+' INDEXED BY '+index+' WHERE account_id=? AND '+column+'=? AND position>? ORDER BY position LIMIT 51').all(accountId,date,-1);
  const details=plan.map(x=>String(x.detail)).join('\n');assert.match(details,/SEARCH/);assert(!details.includes('TEMP B-TREE'),details);
 }
 const movement={id:'unknown-adjustment',venueId,businessDate:date,type:'inventory_adjustment',costStatus:'UNKNOWN',currency:'MDL',costAmount:null};
 r.sqlite.prepare('INSERT INTO stock_journal_movements(account_id,position,movement_id,product_key,kind,effective_date,payload_json) VALUES(?,?,?,?,?,?,?)').run(accountId,-1,movement.id,'p',movement.type,date,JSON.stringify(movement));
 const run=async()=>{
  const snapshots=r.sqlite.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=?').all(accountId).map((x:any)=>({key:x.store_key,dataJson:x.data_json,updatedAt:x.updated_at}));
  const input={scope:{venueId,workspaceId,dataAccountId:accountId},period:{start:'2026-10-01',endExclusive:'2026-11-01'},currency:'MDL',profileJson,snapshots,stores};
  let result:any;for(let steps=0;steps<70;steps++){result=await api.progress.advanceFinancialRead(db,input);if(!result.pending)return result;}throw Error('not complete');
 };
 const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM stock_journal_movements').all());
 const result=await run();
 const oracle=historicalPeriodCost({venueId,monthKey:'2026-10',accountingCurrency:'MDL',revenues:[revenue],events:[],movements:[movement],batches:[batch],reconciliations:[reconciliation]});
 assert.deepEqual(result.history,oracle);assert.equal(result.history.cost,30);assert.equal(result.history.known,false);assert.deepEqual(result.history.reasons,['INVENTORY_ADJUSTMENT_COST_UNKNOWN']);
 stores.bd_sales_reconciliations_v1=[];put('bd_sales_reconciliations_v1',[]);
 const missing=await run();assert.equal(missing.history.known,false);assert(missing.history.reasons.includes('HISTORICAL_SALES_COST_MISSING'));assert(missing.history.reasons.includes('UNLINKED_SALES_CONSUMPTION'));
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM stock_journal_movements').all()),before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {createOrUpdateSalesBatch,postSalesBatch} from '../lib/bardoctor/sales-consumption';

function post(movements:any[]){
 const common={...salesEventFixture(),now:'2026-10-16T12:00:00Z',stockMovements:movements,batches:[]};
 const draft=createOrUpdateSalesBatch({...common,batchId:'backdated',draft:{source:'MANUAL_GRID',businessDate:'2026-10-02',lines:[{id:'l',menuItemId:'whisky',rawName:'Whisky',quantity:1}],warnings:[]}});
 assert.ok(draft.ok);const result=postSalesBatch({...common,batches:draft.batches,batchId:'backdated'});assert.ok(result.ok);return result;
}
async function setup(receipts:any[]){
 const r=await lifecycleRuntime({journal:'./lib/bardoctor/stock-journal',storage:'./lib/bardoctor/stock-storage',database:'./db'});
 const owner=await r.register('stock-regression@isolated.test'),scope={accountId:owner.userId,venueId:owner.activeVenueId};
 const db=(r.api.database as any).getD1(),journal=r.api.journal as any,storage=r.api.storage as any;
 r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,'bd_stock_movements',?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(scope.accountId,JSON.stringify(receipts));
 await journal.copyLegacyJournal(db,scope);await journal.activateJournal(db,scope);
 const raw=String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_stock_movements'").get(scope.accountId)!.data_json);
 return {r,scope,db,journal,storage,raw};
}
test('backdated sale preserves captured cost and current valuation with bounded dual-date receipt facts',async t=>{
 const receipts=[['old','2026-10-01',100],['new','2026-10-15',200]].map(([id,date,cost])=>({id,venueId:1,type:'receipt',productKey:'whisky-stock',businessDate:date,amount:10,unit:'l',costAmount:cost,currency:'MDL'}));
 const {r,scope,db,journal,storage,raw}=await setup(receipts);t.after(r.close);
 const reads:string[]=[];r.onRead(sql=>{reads.push(sql);});
 const selected=await storage.readSaleStock(db,scope.accountId,raw,salesEventFixture().assortment,'2026-10-02',[],'2026-10-16T12:00:00Z');r.onRead(null);
 assert.deepEqual(selected.movements,receipts);
 assert.ok(reads.filter(sql=>sql.includes('FROM stock_journal_movements')).every(sql=>sql.includes("kind='receipt'")&&sql.includes('LIMIT 501')));
 const full=post(receipts),actual=post(selected.movements);
 assert.deepEqual(actual.assortment,full.assortment);assert.equal(actual.batch.totalTheoreticalCost,0.5);
 const balance=(actual.assortment.stockBalances as any[]).find(row=>row.productKey==='whisky-stock');
 assert.equal(balance.current,1.95);assert.equal(balance.averageUnitCost,20);assert.equal(balance.inventoryValue,39);
 await db.batch(await storage.saleStockStatements(db,scope,selected.revision,selected.movements,actual.stockMovements));
 assert.deepEqual((await journal.journalPage(db,scope)).items.filter((row:any)=>row.type==='receipt'),receipts);
});
test('idless receipt positions survive overlapping dates/documents and sale persistence without evidence changes',async t=>{
 const whisky={venueId:1,type:'receipt',productKey:'whisky-stock',date:'2026-10-01',amount:10,unit:'l',costAmount:100,currency:'MDL',salesBatchId:'legacy-doc',unknown:{preserve:true}};
 const receipts=[whisky,{venueId:1,type:'receipt',productKey:'beer-stock',date:'2026-10-01',amount:10,unit:'pcs',costAmount:200,currency:'MDL'},structuredClone(whisky)];
 const {r,scope,db,journal,storage,raw}=await setup(receipts);t.after(r.close);
 const selected=await storage.readSaleStock(db,scope.accountId,raw,salesEventFixture().assortment,'2026-10-02',['legacy-doc'],'2026-10-16');
 assert.deepEqual(selected.movements,receipts,'retain distinct equal-valued rows, dedup overlapping reads by position');
 const full=post(receipts),actual=post(selected.movements);assert.deepEqual(actual.assortment,full.assortment);assert.equal(actual.batch.totalTheoreticalCost,0.5);
 const balance=(actual.assortment.stockBalances as any[]).find(row=>row.productKey==='whisky-stock');assert.equal(balance.inventoryValue,19.5);assert.equal(balance.costStatus,'KNOWN');
 const delta=storage.stockMovementResponse(selected.movements,actual.stockMovements);assert.equal(delta.stockMovementDelta.upserts.length,1);
 await db.batch(await storage.saleStockStatements(db,scope,selected.revision,selected.movements,actual.stockMovements));
 assert.deepEqual((await journal.journalPage(db,scope)).items.filter((row:any)=>row.type==='receipt'),receipts);
});

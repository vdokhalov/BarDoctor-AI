import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { historicalPeriodCost, reconcileMonthlyReport } from '../lib/bardoctor/financial-reconciliation';
import { openingRuntime } from './helpers/opening-runtime';
import * as consumption from '../lib/bardoctor/sales-consumption';
import { salesEventFixture } from './helpers/sales-event-fixture';

type Row = Record<string, unknown>;
type Input = Parameters<typeof historicalPeriodCost>[0];
const captured = JSON.parse(readFileSync(new URL('./fixtures/financial-reconciliation-phase7.json', import.meta.url), 'utf8')) as { revenues:Row[]; events:Row[]; movements:Row[] };
const input = (): Input => structuredClone({ ...captured,venueId:901,monthKey:'2026-09',accountingCurrency:'MDL',batches:[],documents:[] });
const batch = (overrides:Row={}) => ({id:'unlinked',venueId:901,businessDate:'2026-09-03',status:'POSTED',...overrides});
for(const status of ['POSTED','PARTIALLY_BLOCKED']) test('coverage rejects an unlinked '+status+' import even without retained movements',()=>{
  const data=input();data.batches=[batch({status,postedLineCount:1})];const before=JSON.stringify(data),result=historicalPeriodCost(data);
  assert.equal(result.known,false);assert.ok(result.reasons.includes('UNLINKED_SALES_CONSUMPTION'));assert.equal(JSON.stringify(data),before);
});
for(const override of [{status:'DRAFT'},{status:'READY'},{status:'PARTIALLY_BLOCKED',postedLineCount:0},{status:'CANCELLED'},{status:'REVERSED'},{venueId:902},{businessDate:'2026-08-03'}])
test('coverage ignores out-of-scope or inactive import '+JSON.stringify(override),()=>{
  const data=input();data.batches=[batch(override)];assert.equal(historicalPeriodCost(data).known,true);
});
test('orphan consumption fails closed but a reversed durable batch is excluded',()=>{
  const data=input();data.movements=[...captured.movements,{id:'orphan',venueId:901,type:'sale_consumption',businessDate:'2026-09-03',salesBatchId:'unlinked',amount:-1,costAmount:-5,status:'active'}];
  assert.ok(historicalPeriodCost(data).reasons.includes('UNLINKED_SALES_CONSUMPTION'));
  data.batches=[batch({status:'REVERSED'})];assert.equal(historicalPeriodCost(data).known,true);
});
test('foreign, outside-period and cancelled consumption do not contaminate current coverage',()=>{
  for(const override of [{venueId:902},{businessDate:'2026-08-03'},{status:'cancelled'},{reversedAt:'2026-09-05'}]){
    const data=input();data.movements=[...captured.movements,{id:'foreign',venueId:901,type:'sale_consumption',businessDate:'2026-09-03',salesBatchId:'unlinked',amount:-1,...override}];
    assert.equal(historicalPeriodCost(data).known,true,JSON.stringify(override));
  }
});
test('import-only month also exposes unknown profit instead of legacy inventory revaluation',()=>{
  const data:Input={venueId:901,monthKey:'2026-09',accountingCurrency:'MDL',revenues:[],events:[],movements:[],batches:[batch()]};
  const result=reconcileMonthlyReport({...data,snapshots:[],report:{accountingCurrency:'MDL',revenue:0,openingInventory:100,closingInventory:95,
    openingSnapshot:{phase7SnapshotKnown:true},closingSnapshot:{phase7SnapshotKnown:true},purchases:0}});
  assert.equal(result.financialReconciliationKnown,false);assert.equal(result.costOfGoods,null);assert.equal(result.grossProfit,null);assert.equal(result.inventoryRevaluation,null);
});
test('confirmed report arriving during reversal forces CAS retry then rejection without stock/audit writes',async()=>{
  const r=openingRuntime(new URL('../app/api/sales-batches/route.ts',import.meta.url),consumption);
  try{
    r.put('bd_assortment_v1',salesEventFixture().assortment);
    const send=(body:object)=>r.api.POST(new Request('https://isolated.test/api/sales-batches',{method:'POST',headers:{'Content-Type':'application/json','X-Venue-Id':'1'},body:JSON.stringify({venueId:1,...body})}));
    const saved=await send({action:'save',draft:{businessDate:'2026-09-25',lines:[{id:'l',rawName:'Beer',menuItemId:'beer',quantity:1}]}});
    assert.equal(saved.status,201);const {batch:created}=await saved.json() as {batch:{id:string}};
    assert.equal((await send({action:'post',id:created.id})).status,201);
    const before={stock:r.get('bd_assortment_v1'),movements:r.get('bd_stock_movements'),batches:r.get('bd_sales_batches'),audit:r.sqlite.prepare('SELECT * FROM audit_log').all()};
    r.beforeBatch(()=>r.put('bd_sales_documents',[{id:'concurrent-report',venueId:1,status:'confirmed',salesBatchId:created.id}]));
    const reversed=await send({action:'reverse',id:created.id});assert.equal(reversed.status,409);
    assert.equal((await reversed.json() as {code:string}).code,'SALES_BATCH_LINKED_CONFIRMED_REPORT');
    assert.deepEqual({stock:r.get('bd_assortment_v1'),movements:r.get('bd_stock_movements'),batches:r.get('bd_sales_batches'),audit:r.sqlite.prepare('SELECT * FROM audit_log').all()},before);
  }finally{r.close();}
});

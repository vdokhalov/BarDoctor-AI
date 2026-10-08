import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';
import { representativeHealthStockFixture } from './helpers/production-rca-health-fixture.ts';

const keys = ['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents','bd_cases','bd_equipment','bd_equipment_history','bd_equipment_work_orders','bd_finance_expenses','bd_assortment_v1','bd_inventory_snapshots','bd_opening_stock_v1','bd_stock_movements','bd_payroll_entries','bd_month_closings','bd_purchase_documents','bd_suppliers','bd_supplier_alternatives_v1','bd_inventory_writeoffs','bd_employees','bd_guest_reviews','bd_opportunity_calendar_v1','bd_market_analysis_v1','bd_sales_batches','bd_tasks','bd_action_tasks','bd_decisions'];
const sourceFixture = JSON.parse(readFileSync(new URL('./fixtures/financial-reconciliation-phase7.json',import.meta.url),'utf8'));
const scoped = value => Array.isArray(value) ? value.map(scoped) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item]) => [key,key==='venueId'?1:scoped(item)])) : value;

async function databaseProjection(r) {
  return Promise.all([
    r.db.prepare('SELECT account_id,store_key,data_json,updated_at FROM domain_data ORDER BY account_id,store_key').all(),
    r.db.prepare('SELECT * FROM accounts ORDER BY id').all(),
    r.db.prepare('SELECT * FROM sessions ORDER BY token_hash').all(),
    r.db.prepare('SELECT * FROM audit_log ORDER BY id').all(),
    r.db.prepare('SELECT * FROM venues ORDER BY id').all(),
    r.db.prepare('SELECT * FROM venue_memberships ORDER BY id').all(),
    r.db.prepare('SELECT * FROM workspace_memberships ORDER BY id').all(),
  ]).then(values=>values.map(value=>value.results));
}

test('v496 compiled native Worker authenticated representative Health snapshot stays under 8s and preserves isolated D1', { timeout: 120000 }, async t => {
  const r = await nativeWorkerRuntime();
  t.after(r.close);
  for (const key of keys) await r.put(key,key==='bd_assortment_v1'?{menuItems:[],recipes:[],nomenclature:[],stockBalances:[]}:[]);
  // Obtain an actual verified historical closure through the compiled route in
  // this disposable QA database. A manually invented closed-month score is not used.
  await r.db.prepare('UPDATE accounts SET restaurant_json=? WHERE id=1').bind(JSON.stringify({name:'Isolated native v496 QA',currency:'MDL',timezone:'UTC',workingDays:{1:false,2:false,3:true,4:false,5:false,6:false,7:false},trackingStartDate:'2026-09-02'})).run();
  for(const [key,value] of Object.entries({
    bd_finance_revenue:sourceFixture.revenues,
    bd_sales_events_v1:sourceFixture.events,
    bd_stock_movements:sourceFixture.movements,
    bd_operational_reports_v1:[{id:'op',venueId:1,date:'2026-09-02',closingStatus:'closed',payrollBreakdown:{total:90}}],
    bd_finance_expenses:[{id:'rent',date:'2026-09-02',category:'rent',amount:30,currency:'MDL'}],
    bd_inventory_snapshots:[{id:'open',date:'2026-09-01',total:600,sections:{bar:600},currency:'MDL'},{id:'end',date:'2026-10-01',total:324,sections:{bar:324},currency:'MDL'}],
    bd_finance_gap_reasons:['2026-09-09','2026-09-16','2026-09-23','2026-09-30'].map(date=>({id:date,date,resolved:true})),
  })) await r.put(key,scoped(value));
  const previewResponse=await r.call('/api/month-close?monthKey=2026-09');
  assert.equal(previewResponse.status,200);
  const preview=await previewResponse.json();
  assert.equal(preview.eligible,true,JSON.stringify({reasons:preview.reasons}));
  const closeResponse=await r.call('/api/month-close','POST',{monthKey:'2026-09',previewRevision:preview.previewRevision});
  assert.equal(closeResponse.status,200);
  const verifiedResponse=await r.call('/api/month-close?monthKey=2026-09');
  assert.equal(verifiedResponse.status,200);
  assert.equal((await verifiedResponse.json()).evidenceStatus,'VERIFIED');

  const fixture=representativeHealthStockFixture(1000,8000);
  assert.ok(Object.values(fixture.bytes).every(bytes=>bytes<2000000));
  for(const [key,value]of Object.entries(fixture.stores))await r.put(key,value);
  // Captured finance closure stays immutable; current operational stores are
  // intentionally empty for independently complete known-zero day counters.
  for(const key of ['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_inventory_snapshots','bd_finance_expenses'])await r.put(key,[]);

  const before=await databaseProjection(r);
  const start=performance.now();
  const response=await r.call('/api/business-health');
  assert.equal(response.status,200);
  const body=await response.json(),wallMs=performance.now()-start;
  assert.equal(body.success,true);
  assert.equal(response.headers.get('cache-control'),'private, no-store, max-age=0');
  assert.ok(response.headers.get('x-bd-request-id'));
  const snapshot=body.data?.businessHealthSnapshot;
  assert.ok(snapshot?.snapshotId);
  assert.equal(snapshot.venueId,'1');
  assert.equal(snapshot.dataAccountId,'1');
  assert.equal(snapshot.calculationVersion,'business-health-engine-v5');
  assert.ok(Number.isFinite(snapshot.score),'actual verified closed financial month + complete Operations calculate /100');
  assert.ok(snapshot.score>=0&&snapshot.score<=100);
  const operations=snapshot.operationsInputs;
  assert.equal(operations.stockFacts.length,1000);
  assert.ok(operations.stockFacts.every(fact=>fact.evidenceComplete===true&&fact.quantity===18&&fact.active===false));
  assert.deepEqual({value:operations.counters.stockAnomalies.value,availability:operations.counters.stockAnomalies.availability,zero:operations.counters.stockAnomalies.zero},{value:0,availability:'AVAILABLE',zero:'KNOWN_ZERO'});
  assert.ok(wallMs<8000,`native authenticated Health wall ${wallMs}ms exceeds 8s client budget`);
  assert.deepEqual(await databaseProjection(r),before,'read-only Health changes no domain/account/session/access/audit data');
  assert.equal(r.outbound(),0);
  console.log(JSON.stringify({environment:'compiled Worker / disposable native D1',production:false,closedMonth:'VERIFIED through actual month-close',products:1000,movements:8000,stockCounter:'KNOWN_ZERO',score:snapshot.score,wallMs,readMutation:false,outbound:0}));
});

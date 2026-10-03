import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';
test('Phase3A.9 compiled Worker/native D1 complete/missing/restricted/source revisions and Home/Doctor canonical equality', { timeout: 120000 }, async t => {
  const r = await nativeWorkerRuntime(); t.after(r.close);
  const keys = ['bd_finance_revenue','bd_operational_reports_v1','bd_sales_events_v1','bd_sales_documents','bd_cases','bd_equipment','bd_equipment_history','bd_equipment_work_orders','bd_finance_expenses','bd_assortment_v1','bd_inventory_snapshots','bd_opening_stock_v1','bd_stock_movements'];
  for (const key of keys) await r.put(key, key === 'bd_assortment_v1' ? { stockBalances: [], menuItems: [], recipes: [] } : []);
  const read = async () => { const response = await r.call('/api/business-health'); assert.equal(response.status, 200); return response.json(); };
  const a = await read(); assert.equal(a.data.businessHealth.components.find(c => c.id === 'operations').score, 90);
  await r.put('bd_cases', [{ id:'secret-critical-native-phase9', priority:'critical', status:'open' }]); const b = await read(); assert.equal(b.data.businessHealth.components.find(c => c.id === 'operations').score, 60); assert.notEqual(a.data.businessHealthSnapshot.inputRevision,b.data.businessHealthSnapshot.inputRevision);
  const doctor = await r.call('/api/ai/diagnosis', 'POST', { profile:{}, cases:[], equipment:[] }); assert.equal(doctor.status,200); const d=await doctor.json(); assert.deepEqual(d.data.businessHealth,b.data.businessHealth); assert.equal(d.data.businessHealthSnapshot.inputRevision,b.data.businessHealthSnapshot.inputRevision);
  await r.db.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=1 AND account_id=2").bind('{"deny":["incidents.view"]}').run(); const restricted=await(await r.call('/api/business-health','GET',undefined,'manager')).json(); assert.equal(restricted.data.businessHealth.components.find(c=>c.id==='operations').score,null); assert.equal(restricted.data.businessHealthSnapshot.operationsInputs.counters.criticalBlockers.availability,'RESTRICTED'); assert.equal(JSON.stringify(restricted).includes('secret-critical-native-phase9'),false);
  await r.db.prepare("DELETE FROM domain_data WHERE account_id=1 AND store_key='bd_operational_reports_v1'").run(); const missing=await read(); assert.equal(missing.data.businessHealth.components.find(c=>c.id==='operations').score,null); assert.equal(missing.data.businessHealth.components.find(c=>c.id==='operations').confidence,'low');
  await r.db.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=1 AND account_id=2").run(); assert.equal((await r.call('/api/business-health','GET',undefined,'manager')).status,401); assert.equal(r.outbound(),0);
});

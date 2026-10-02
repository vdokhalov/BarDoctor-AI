import assert from 'node:assert/strict';
import test from 'node:test';
import { register } from 'tsx/esm/api';
import { nativeWorkerRuntime } from './helpers/native-worker-runtime.mjs';
register();

test('actual compiled Worker native D1: source denial, shared store CAS rollback, review and equipment lifecycle', { timeout: 120000 }, async t => {
  const r = await nativeWorkerRuntime(); t.after(r.close);
  const { readStoreSnapshots, runStoreCasBatch, StoreWriteConflictError } = await import('../lib/bardoctor/store-cas.ts');
  await r.put('bd_finance_expenses', [{ id: 'B', amount: 99, date: '2026-10-02', currency: 'MDL' }]);
  await r.put('bd_ai_diagnosis_v9', { summary: 'PRIVATE-FINANCE' });
  assert.equal((await r.call('/api/business-health')).status, 200);
  for (const [path, method, body] of [['/api/business-health', 'GET'], ['/api/ai/diagnosis', 'POST', { profile: {} }], ['/api/recommendations/check', 'POST', { recommendations: [{}] }]]) {
    const response = await r.call(path, method, body, 'manager'); assert.equal(response.status, 403, path); assert.equal((await response.json()).availability, 'RESTRICTED');
  }
  assert.equal((await r.call('/api/store/bd_ai_diagnosis_v9', 'GET', undefined, 'manager')).status, 403);
  assert.ok(!((await (await r.call('/api/store', 'GET', undefined, 'manager')).json()).entries.bd_ai_diagnosis_v9));
  for (const key of ['bd_finance_expenses', 'bd_assortment_v1', 'bd_guest_reviews', 'bd_equipment_work_orders', 'bd_purchase_documents']) {
    await r.put(key, [{ id: 'A' }]); const snapshots = await readStoreSnapshots(r.db, 1, [key]);
    await r.put(key, [{ id: 'B', accepted: true }]);
    await assert.rejects(runStoreCasBatch(r.db, 1, snapshots, [
      r.db.prepare('UPDATE domain_data SET data_json=? WHERE account_id=1 AND store_key=?').bind('[{"id":"lost-A"}]', key),
      r.db.prepare("INSERT INTO audit_log(account_id,store_key,action,entity_id) VALUES(1,?,'update','lost-A')").bind(key),
    ], new Date().toISOString()), error => error instanceof StoreWriteConflictError);
    assert.deepEqual(await r.get(key), [{ id: 'B', accepted: true }]);
  }
  assert.equal(await r.db.prepare("SELECT count(*) n FROM audit_log WHERE entity_id='lost-A'").first('n'), 0);
  await r.put('bd_finance_expenses', []); await r.put('bd_equipment_work_orders', []);
  await r.put('bd_equipment', [{ id: 'equipment', name: 'Freezer', venueId: 1 }]);
  const workOrder = { id: 'wo', equipmentId: 'equipment', kind: 'maintenance', status: 'detected', title: 'QA', cost: 20, costDate: '2026-10-02' };
  for (let i = 0; i < 2; i++) { const response = await r.call('/api/equipment/work-orders', 'POST', { workOrder, syncExpense: true }); assert.ok(response.ok, JSON.stringify(await response.clone().json())); }
  assert.equal((await r.get('bd_finance_expenses')).length, 1); assert.equal((await r.get('bd_finance_expenses'))[0].equipmentWorkOrderId, 'wo');
  assert.equal((await r.call('/api/equipment/work-orders', 'POST', { workOrder: { ...workOrder, cost: 30 }, syncExpense: false })).status, 409);
  const records = [{ id: 'manual', venueId: 1, source: 'manual', text: 'Manual', publishedAt: '2026-10-01' }, { id: 'google', venueId: 1, source: 'google', externalId: 'ext', text: 'Google', publishedAt: '2026-10-01', sourceMetadata: { googleAccountId: 'account', googleLocationId: 'A' } }];
  await r.put('bd_guest_reviews', records);
  const response = await r.call('/api/review-layer/reviews', 'POST', { source: 'google', externalId: 'ext', text: 'Updated Google', publishedAt: '2026-10-01', sourceMetadata: { googleAccountId: 'account', googleLocationId: 'A' } });
  assert.ok(response.ok, JSON.stringify(await response.clone().json()));
  assert.equal((await r.get('bd_guest_reviews')).find(x => x.id === 'manual').text, 'Manual'); assert.equal((await r.get('bd_guest_reviews')).find(x => x.id === 'google').text, 'Updated Google');
  assert.equal(r.outbound(), 0);
});

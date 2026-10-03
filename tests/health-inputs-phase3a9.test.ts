import assert from 'node:assert/strict';
import test from 'node:test';
import { healthInputsFixture } from './helpers/health-inputs-fixture';
import { buildBusinessIntelligence } from '../lib/bardoctor/business-intelligence';
import { MAX_HEALTH_ROWS } from '../lib/bardoctor/health-operations-inputs';
type Reply = { data: { businessHealth: { components: { id: string; score: number | null; confidence: string; evidence: string[]; gaps: string[] }[] }; businessHealthSnapshot: { score: number | null; inputRevision: string; inputManifest: { sources: { key: string; state: string }[] }; operationsInputs: { counters: Record<string, { value: number | null; availability: string; zero: string | null }>; days: { businessDate: string; status: string; cashShiftStatuses: string[]; reportSaved: boolean }[] } } } };
const reply = async (promise: Promise<unknown>) => await promise as Reply;
const ops = (body: Reply) => body.data.businessHealth.components.find(item => item.id === 'operations')!;
test('G06 complete empty sources prove KNOWN ZERO; reads preserve canonical bytes', async () => {
  const r = await healthInputsFixture(); try { const before = r.before(), body = await reply(r.read()); assert.equal(ops(body).score, 90); assert.equal(ops(body).confidence, 'high');
    for (const counter of Object.values(body.data.businessHealthSnapshot.operationsInputs.counters)) { assert.equal(counter.value, 0); assert.equal(counter.zero, 'KNOWN_ZERO'); assert.equal(counter.availability, 'AVAILABLE'); } assert.deepEqual(r.before(), before);
  } finally { r.close(); }
});
for (const [name, key, mutate, state] of [
  ['missing reports', 'bd_operational_reports_v1', 'delete', 'UNAVAILABLE'],
  ['missing cases', 'bd_cases', 'delete', 'UNAVAILABLE'],
  ['corrupt equipment', 'bd_equipment', 'corrupt', 'PARTIAL'],
  ['wrong stock shape', 'bd_assortment_v1', 'shape', 'PARTIAL'],
] as const) test(`G06 ${name} never means no problems or high confidence`, async () => {
  const r = await healthInputsFixture(); try {
    if (mutate === 'delete') r.sqlite.prepare('DELETE FROM domain_data WHERE account_id=? AND store_key=?').run(r.accountId, key);
    else r.sqlite.prepare('UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key=?').run(mutate === 'corrupt' ? '{bad' : '{}', r.accountId, key);
    const body = await reply(r.read()); assert.equal(ops(body).score, null); assert.equal(ops(body).confidence, 'low'); assert.match(ops(body).gaps.join(' '), new RegExp(state));
    assert.equal(body.data.businessHealthSnapshot.inputManifest.sources.find(source => source.key === key)!.state, state);
  } finally { r.close(); }
});
for (const [status, expected] of [['open', 1], ['resolved', 0], ['closed', 0]] as const) test(`G06 critical case ${status}`, async () => {
  const r = await healthInputsFixture(); try { r.seed('bd_cases', [{ id: 'critical', venueId: r.venueId, priority: 'critical', status }]); const body = await reply(r.read()); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.criticalBlockers.value, expected); assert.equal(ops(body).score, expected ? 60 : 90); } finally { r.close(); }
});
test('G06 repeated work order stages / linked history / Finance are one repair; two repairs affect one asset', async () => {
  const r = await healthInputsFixture(); try { r.seed('bd_equipment', [{ id: 'eq', status: 'working' }]);
    r.seed('bd_equipment_work_orders', [{ id: 'w1', equipmentId: 'eq', kind: 'repair', status: 'verified' }]); r.seed('bd_equipment_history', [{ id: 'h1', equipmentId: 'eq', workOrderId: 'w1', type: 'repair' }, { id: 'h2', equipmentId: 'eq', workOrderId: 'w1', type: 'repair' }]); r.seed('bd_finance_expenses', [{ id: 'expense', category: 'repairs', equipmentId: 'eq', equipmentWorkOrderId: 'w1' }]); assert.equal(ops(await reply(r.read())).score, 90);
    r.seed('bd_equipment_work_orders', [{ id: 'w1', equipmentId: 'eq', kind: 'repair', status: 'verified' }, { id: 'w2', equipmentId: 'eq', kind: 'repair', status: 'detected' }]); assert.equal(ops(await reply(r.read())).score, 82);
  } finally { r.close(); }
});
test('G06 supported overdue maintenance counted once per asset and never from body', async () => {
  const r = await healthInputsFixture(); try { r.seed('bd_equipment', [{ id: 'eq', status: 'working', nextMaintenance: '2026-10-02' }]); assert.equal(ops(await reply(r.read())).score, 82); r.seed('bd_equipment', [{ id: 'eq', status: 'working', nextMaintenance: '2026-10-04' }]); assert.equal(ops(await reply(r.read())).score, 90); } finally { r.close(); }
});
for (const [cashStatus, report, expectedState, score] of [['open', false, 'OPERATING', 90], ['closed', false, 'AWAITING_OPERATIONAL_DATA', 85], ['closed', true, 'COMPLETE', 90], ['open', true, 'OPERATING', 90]] as const) test(`G06 cash ${cashStatus}, report ${report}: ${expectedState}`, async () => {
  const r = await healthInputsFixture(); try { r.seed('bd_finance_revenue', [{ id: 'shift', venueId: r.venueId, date: '2026-10-02', revenueSource: 'sales_events_v1', closingStatus: cashStatus, revenue: 0, receipts: 0, currency: 'MDL' }]); if (report) r.seed('bd_operational_reports_v1', [{ id: 'report', venueId: r.venueId, date: '2026-10-02', closingStatus: 'closed', payrollBreakdown: { total: 0 } }]); const body = await reply(r.read()), day = body.data.businessHealthSnapshot.operationsInputs.days[0]; assert.equal(day.status, expectedState); assert.deepEqual(day.cashShiftStatuses, [cashStatus.toUpperCase()]); assert.equal(day.reportSaved, report); assert.equal(ops(body).score, score); } finally { r.close(); }
});
test('G06 stock anomaly proven from Phase3A.7 anchor; partial evidence never zero; product counted once', async () => {
  const r = await healthInputsFixture(); try {
    r.seed('bd_assortment_v1', { stockBalances: [{ productKey: 'stock', unit: 'kg', current: -1, openingDocumentId: 'opening' }] }); r.seed('bd_opening_stock_v1', [{ id: 'opening', status: 'confirmed', createdAt: '2026-10-01T12:00:00Z', anchorBoundary: { movements: [] }, items: [{ id: 'line', productKey: 'stock', unit: 'kg', quantity: -1 }] }]);
    let body = await reply(r.read()); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.value, 1); assert.equal(ops(body).score, 83);
    r.seed('bd_opening_stock_v1', []); body = await reply(r.read()); assert.equal(ops(body).score, null); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.value, null); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.availability, 'PARTIAL');
  } finally { r.close(); }
});
test('G06 Home = Doctor canonical snapshot despite forged body; revision updates without timestamp change', async () => {
  const r = await healthInputsFixture(); try { const a = await reply(r.read());
    const response = await r.api.doctor.handleDiagnosis(r.healthRequest('/api/ai/diagnosis', r.owner, 'POST', { profile: { timezone: 'America/New_York', currency: 'USD' }, cases: [{ priority: 'critical', status: 'open' }], equipment: [{ repairCount: 100, maintenanceOverdue: true }], operatingCalendar: { unexplainedRevenueGapDates: ['2026-10-01'] }, finance: { monthToDate: { revenue: 99999999 } } })); assert.equal(response.status, 200, JSON.stringify(await response.clone().json())); const doctor = await response.json() as Reply; assert.deepEqual(doctor.data.businessHealth, a.data.businessHealth); assert.deepEqual(doctor.data.businessHealthSnapshot, a.data.businessHealthSnapshot);
    r.seed('bd_cases', [{ id: 'c', priority: 'critical', status: 'open' }]); const b = await reply(r.read()); assert.notEqual(b.data.businessHealthSnapshot.inputRevision, a.data.businessHealthSnapshot.inputRevision); assert.equal(ops(b).score, 60); assert.deepEqual((await reply(r.read())).data.businessHealthSnapshot, b.data.businessHealthSnapshot);
  } finally { r.close(); }
});
test('G06 nested/foreign scope, duplicate and guessed parent IDs cannot prove a zero', async () => {
  const r = await healthInputsFixture(); try { for (const scope of [{ venueId: 999 }, { workspaceId: 999 }, { dataAccountId: 999 }, { nested: { venueId: 999 } }]) { r.seed('bd_cases', [{ id: 'foreign', priority: 'critical', status: 'open', ...scope }]); const body = await reply(r.read()); assert.equal(ops(body).score, null); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.criticalBlockers.value, null); assert.equal(JSON.stringify(body).includes('foreign'), false); }
    r.seed('bd_cases', [{ id: 'dup', priority: 'critical', status: 'open' }, { id: 'dup', priority: 'critical', status: 'closed' }]); assert.equal(ops(await reply(r.read())).score, null); r.seed('bd_cases', []); r.seed('bd_equipment_work_orders', [{ id: 'guess', equipmentId: 'missing', kind: 'repair' }]); assert.equal(ops(await reply(r.read())).score, null);
  } finally { r.close(); }
});
test('G06 bounded source does not silently truncate then certify zero', async () => {
  const r = await healthInputsFixture(); try { r.seed('bd_cases', Array.from({ length: MAX_HEALTH_ROWS + 1 }, (_, i) => ({ id: String(i), priority: 'low', status: 'closed' }))); assert.equal(ops(await reply(r.read())).score, null); } finally { r.close(); }
});
test('G06 restricted operational source no leak/no zero; live revoked membership/foreign venue rejected', async () => {
  const r = await healthInputsFixture(); try {
    const member = await r.register('health-member@phase3a9.isolated.test'), foreign = await r.register('health-foreign@phase3a9.isolated.test');
    r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(?,?,'member')").run(r.workspaceId, member.userId); r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(?,?,'manager')").run(r.venueId, member.userId);
    r.seed('bd_cases', [{ id: 'secret-case', priority: 'critical', status: 'open' }]); r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run('{"deny":["incidents.view"]}', r.venueId, member.userId);
    const response = await r.api.health.GET(r.healthRequest('/api/business-health', member)); assert.equal(response.status, 200); const body = await response.json() as Reply; assert.equal(ops(body).score, null); assert.equal(body.data.businessHealthSnapshot.operationsInputs.counters.criticalBlockers.availability, 'RESTRICTED'); assert.equal(JSON.stringify(body).includes('secret-case'), false);
    for (const selected of [foreign.activeVenueId, 999999]) assert.equal((await r.api.health.GET(r.healthRequest('/api/business-health', member, 'GET', undefined, selected))).status, 401);
    r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, member.userId); assert.equal((await r.api.health.GET(r.healthRequest('/api/business-health', member))).status, 401);
  } finally { r.close(); }
});
test('G06 absent direct inputs remain unknown; Data Quality never subtracts business score', () => {
  const unknown = buildBusinessIntelligence({ operations: {} }); assert.equal(unknown.businessHealth.components.find(item => item.id === 'operations')!.score, null);
  const complete = { unclosedShifts: 0, criticalBlockers: 0, recurringEquipmentFailures: 0, stockAnomalies: 0 };
  assert.equal(buildBusinessIntelligence({ operations: complete, dataBlocks: [] }).businessHealth.components.find(item => item.id === 'operations')!.score, 90);
});

test('G06 saved Doctor snapshot cannot bypass newly required operational permissions', async () => {
  const r = await healthInputsFixture(); try {
    const member = await r.register('health-saved@phase3a9.isolated.test');
    r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(?,?,'member')").run(r.workspaceId,member.userId);
    r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(?,?,'manager')").run(r.venueId,member.userId);
    r.seed('bd_ai_diagnosis_v9',{data:{businessHealthSnapshot:{secret:'operational-saved-secret'}}});
    for (const permission of ['incidents.view','equipment.view']) {
      r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run(JSON.stringify({deny:[permission]}),r.venueId,member.userId);
      const raw=await r.api.store.GET(r.healthRequest('/api/store/bd_ai_diagnosis_v9',member),{params:Promise.resolve({key:'bd_ai_diagnosis_v9'})} as never);assert.equal(raw.status,403);
      const bulk=await r.api.bulkStore.GET(r.healthRequest('/api/store',member));assert.equal(bulk.status,200);assert.equal(JSON.stringify(await bulk.json()).includes('operational-saved-secret'),false);
    }
  } finally {r.close();}
});

test('G06 an empty stock projection with retained stock products/movements is partial evidence', async () => {
  const r=await healthInputsFixture();try {
    r.seed('bd_assortment_v1',{stockBalances:[],nomenclature:[{id:'stock',productKey:'stock',kind:'stock',active:true}]});
    assert.equal((await reply(r.read())).data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.availability,'PARTIAL');
    r.seed('bd_assortment_v1',{stockBalances:[],nomenclature:[]});r.seed('bd_stock_movements',[{id:'receipt',productKey:'stock',amount:1,unit:'kg',status:'active'}]);
    assert.equal((await reply(r.read())).data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.value,null);
  }finally{r.close();}
});

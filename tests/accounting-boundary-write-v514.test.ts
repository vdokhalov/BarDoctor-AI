import test from 'node:test';
import assert from 'node:assert/strict';
import { closingFixture } from './helpers/month-close-fixture';

type Row = Record<string, unknown>;
async function fixture() {
  const r = await closingFixture();
  const path = '/api/store/bd_inventory_snapshots';
  const ctx = { params: Promise.resolve({ key: 'bd_inventory_snapshots', id: undefined }) };
  const get = async () => (await r.api.store.GET(r.request(r.user, path), ctx)).json() as Promise<{ data: Row[] }>;
  const initial = (await get()).data;
  const changed = initial.map(value => value.id === 'end' ? { ...value, total: 3483, sections: { bar: 3483 }, note: 'Synthetic QA boundary, dated receipts' } : value);
  const put = (data: unknown, baseData: unknown = initial, extra: Row = {}) => r.api.store.PUT(r.request(r.user, path, 'PUT', { data, baseData, reason: 'Synthetic QA boundary from dated receipts', ...extra }), ctx);
  const stored = () => r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_inventory_snapshots'").get(r.account)!.data_json;
  const audits = () => Number(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE account_id=? AND store_key='bd_inventory_snapshots'").get(r.account)!.n);
  return { ...r, initial, changed, put, stored, audits };
}

test('boundary write atomically audits once, preserves physical/stock data, returns accepted data; identical replay is idempotent', async () => {
  const r = await fixture();
  try {
    const physical = { id: 'physical', venueId: r.venueId, date: '2026-09-15', status: 'completed', scope: { type: 'all' }, items: [{ actual: 3, valuationKnown: true }] };
    const before = [...r.initial, physical], after = [...r.changed, physical]; r.seed('bd_inventory_snapshots', before);
    const stocks = JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data WHERE store_key IN ('bd_assortment_v1','bd_stock_movements')").all());
    const first = await r.put(after, before); assert.equal(first.status, 200, await first.clone().text());
    assert.deepEqual((await first.json() as { data: Row[] }).data, after); assert.equal(r.audits(), 1);
    const replay = await r.put(after, before); assert.equal(replay.status, 200); assert.equal(r.audits(), 1);
    assert.equal((await replay.json() as { idempotent: boolean }).idempotent, true);
    assert.equal(JSON.stringify(r.sqlite.prepare("SELECT * FROM domain_data WHERE store_key IN ('bd_assortment_v1','bd_stock_movements')").all()), stocks);
    const audit = r.sqlite.prepare("SELECT reason,actor_role,before_json,after_json FROM audit_log WHERE account_id=? AND store_key='bd_inventory_snapshots'").get(r.account)!;
    assert.match(String(audit.reason), /Synthetic QA/); assert.equal(audit.actor_role, 'owner');
    assert.equal(JSON.parse(String(audit.before_json)).total, 324); assert.equal(JSON.parse(String(audit.after_json)).total, 3483);
  } finally { r.close(); }
});

test('invalid values, scope, dates, ambiguity and missing audit reason never mutate snapshots', async () => {
  const r = await fixture();
  try {
    const initial = r.stored();
    for (const replacement of [
      { date: '2026-09-30' }, { date: '2026-11-01' }, { date: '2026-13-01' }, { venueId: r.venueId + 1 },
      { currency: 'USD' }, { sections: { bar: -1 } }, { sections: { bar: '3483' } }, { sections: {} },
      { total: 1 }, { total: null }, { sections: { bar: Number.NaN } }, { note: '' }, { dataAccountId: r.account + 1 }, { items: [] }, { status: 'completed' },
    ]) {
      const response = await r.put(r.changed.map(value => value.id === 'end' ? { ...value, ...replacement } : value));
      assert.ok(response.status >= 400, JSON.stringify(replacement)); assert.equal(r.stored(), initial);
    }
    for (const data of [null, [null], [...r.changed, r.changed[1]], [...r.changed, { ...r.changed[1], id: 'duplicate-date' }], [...r.changed, { id: 'physical-end', venueId: r.venueId, date: '2026-09-30', items: [], status: 'completed' }]]) {
      assert.ok((await r.put(data)).status >= 400); assert.equal(r.stored(), initial);
    }
    assert.equal((await r.put(r.changed, r.initial, { reason: '' })).status, 422);
    assert.equal((await r.put(r.changed, null)).status, 409);
    assert.equal(r.audits(), 0);
  } finally { r.close(); }
});

test('physical edit and delete require inventory lifecycle', async () => {
  const r = await fixture();
  try {
    const physical = { id: 'physical', venueId: r.venueId, date: '2026-09-15', items: [{ valuationKnown: true }], status: 'completed' };
    const base = [...r.initial, physical]; r.seed('bd_inventory_snapshots', base);
    assert.equal((await r.put(r.initial, base)).status, 409);
    assert.equal((await r.put([...r.initial, { ...physical, total: 7 }], base)).status, 409);
    assert.equal(r.audits(), 0);
  } finally { r.close(); }
});

test('both adjacent month locks and malformed closing history fail closed', async () => {
  const r = await fixture();
  try {
    for (const monthKey of ['2026-09', '2026-10']) {
      r.seed('bd_month_closings', [{ id: monthKey, venueId: r.venueId, monthKey, status: 'closed' }]);
      const response = await r.put(r.changed); assert.equal(response.status, 423); assert.equal((await response.json() as { monthKey: string }).monthKey, monthKey);
    }
    for (const closings of [[{ status: 'closed' }], [{ monthKey: 'wrong', status: 'closed' }], [{ monthKey: '2026-09', status: 'closed' }, { monthKey: '2026-09', status: 'reopened' }]]) {
      r.seed('bd_month_closings', closings); assert.equal((await r.put(r.changed)).status, 422);
    }
    assert.equal(r.audits(), 0);
  } finally { r.close(); }
});

test('concurrent month close, profile change, membership revocation and competing snapshot cannot pass the atomic guard', async () => {
  for (const race of ['closing', 'profile', 'access', 'snapshot']) {
    const r = await fixture();
    try {
      r.beforeNextDomainWrite(() => {
        if (race === 'closing') r.seed('bd_month_closings', [{ id: 'close', monthKey: '2026-09', status: 'closed' }]);
        if (race === 'profile') r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"USD"}', r.account);
        if (race === 'access') r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, r.user.userId);
        if (race === 'snapshot') r.seed('bd_inventory_snapshots', [...r.initial, { id: 'competitor', venueId: r.venueId, date: '2026-08-01', currency: 'MDL', sections: { bar: 0 } }]);
      });
      const response = await r.put(r.changed); assert.equal(response.status, 409, race + await response.clone().text()); assert.equal(r.audits(), 0);
      assert.equal(JSON.parse(String(r.stored())).find((value: Row) => value.id === 'end').total, 324);
    } finally { r.close(); }
  }
});

test('administrator leadership retains permission; staff grant and leadership permission denial fail closed', async () => {
  const r = await fixture();
  try {
    const colleague = await r.register('boundary-colleague@isolated.test');
    const workspace = Number(r.sqlite.prepare('SELECT workspace_id n FROM venues WHERE id=?').get(r.venueId)!.n);
    r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspace, colleague.userId);
    r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'cashier')").run(r.venueId, colleague.userId);
    const request = () => {
      const req = r.request(colleague, '/api/store/bd_inventory_snapshots', 'PUT', { data: r.changed, baseData: r.initial, reason: 'QA authorized boundary' });
      req.headers.set('X-Venue-Id', String(r.venueId)); return req;
    };
    const call = () => r.api.store.PUT(request(), { params: Promise.resolve({ key: 'bd_inventory_snapshots', id: undefined }) });
    r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run('{"allow":["inventory.manage"]}', r.venueId, colleague.userId);
    assert.equal((await call()).status, 403);
    r.sqlite.prepare("UPDATE venue_memberships SET role='manager',permissions_json=? WHERE venue_id=? AND account_id=?").run('{"deny":["inventory.manage"]}', r.venueId, colleague.userId);
    assert.equal((await call()).status, 403); assert.equal(r.audits(), 0);
    r.sqlite.prepare("UPDATE venue_memberships SET role='shift_manager',permissions_json=NULL WHERE venue_id=? AND account_id=?").run(r.venueId, colleague.userId);
    const accepted = await call(); assert.equal(accepted.status, 200, await accepted.clone().text()); assert.equal(r.audits(), 1);
  } finally { r.close(); }
});

test('audit insertion failure rolls back the boundary write; explicit zero remains a valid documented value', async () => {
  const r = await fixture();
  try {
    const before = r.stored();
    r.sqlite.exec("CREATE TRIGGER boundary_audit_failure BEFORE INSERT ON audit_log WHEN NEW.store_key='bd_inventory_snapshots' BEGIN SELECT RAISE(ABORT,'injected audit failure'); END");
    await assert.rejects(r.put(r.changed), /injected audit failure/);
    assert.equal(r.stored(), before); assert.equal(r.audits(), 0);
    r.sqlite.exec('DROP TRIGGER boundary_audit_failure');
    const zero = r.initial.map(value => value.id === 'open' ? { ...value, total: 0, sections: { bar: 0 }, note: 'Explicit synthetic QA opening with zero stock' } : value);
    assert.equal((await r.put(zero)).status, 200);
    const preview = await (await r.get()).json();
    assert.equal(preview.report.openingInventory, 0);
    assert.equal(preview.report.costOfGoods, 720);
  } finally { r.close(); }
});

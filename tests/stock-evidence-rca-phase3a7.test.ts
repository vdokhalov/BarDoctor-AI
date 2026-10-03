import test from 'node:test';
import assert from 'node:assert/strict';
import { stockQuantityEvidence } from '../lib/bardoctor/stock-quantity-evidence';
import { stockRcaFixture } from './helpers/stock-rca-fixture';
import { resolvedEvidence } from './helpers/revenue-trace-runtime';
import type { StockRow } from './helpers/stock-runtime';

const scope = { venueId: 1, workspaceId: 1, dataAccountId: 1 };
const at = '2026-10-02T12:00:00.000Z';
const count = { id: 'count', ...scope, status: 'completed', completedAt: at, anchorBoundary: { movements: [{ id: 'pre' }] },
  items: [{ id: 'line', productKey: 'p', actual: 2, unit: 'pcs' }] };
const movement = (id: string, amount: number, warehouseId?: string, more: StockRow = {}) =>
  ({ id, ...scope, productKey: 'p', amount, unit: 'pcs', type: 'receipt', createdAt: at, warehouseId, ...more });
const input = { ...scope, balance: { productKey: 'p', current: 2, unit: 'pcs', lastInventoryDocumentId: 'count' },
  counts: [count], openings: [], movements: [] as StockRow[] };

for (const warehouses of [['__venue__', '__venue__'], ['qa-bar', 'qa-bar'], ['qa-bar', 'qa-kitchen']]) {
  test('global quantity retains post-anchor sales: ' + warehouses.join('/'), () => {
    const result = stockQuantityEvidence({ ...input, movements: [movement('pre', 2),
      movement('a', -1, warehouses[0], { type: 'sale_consumption' }), movement('y', 2),
      movement('b', -1, warehouses[1], { type: 'sale_consumption' })] });
    assert.equal(result.quantity, 2); assert.equal(result.explainedQuantity, 2);
    assert.equal(result.contributorCount, 3); assert.equal(result.consistency, 'MATCH'); assert.equal(result.evidenceComplete, true);
    assert.deepEqual(result.contributors.map(row => row.id), ['a', 'y', 'b']);
  });
}

test('explicit warehouses including __venue__ never borrow an aggregate anchor', () => {
  for (const warehouseId of ['qa-bar', '__venue__']) {
    const scoped = { ...input, warehouseId, movements: [movement('own', 2, warehouseId), movement('other', 999, 'qa-kitchen')] };
    const without = stockQuantityEvidence(scoped);
    assert.equal(without.anchor, null); assert.equal(without.evidenceComplete, false); assert.equal(without.contributorCount, 1);
    const own = stockQuantityEvidence({ ...scoped, balance: { ...input.balance, current: 4 }, counts: [{ ...count, warehouseId }] });
    assert.equal(own.explainedQuantity, 4); assert.equal(own.evidenceComplete, true); assert.equal(own.contributorCount, 1);
    assert.equal(stockQuantityEvidence({ ...input, counts: [{ ...count, warehouseId }] }).anchor, null, 'Warehouse count is not a global anchor');
  }
});

test('global opening/lifecycle proof retains legitimate partial, unknown, known zero and exact-once boundary', () => {
  const operations = [movement('pre', 999), ...['receipt', 'sale_consumption', 'writeoff', 'return', 'sale_reversal', 'inventory_adjustment']
    .map((type, i) => movement('m' + i, [2, -1, -2, -1, 1, 3][i], 'qa-bar', { type })),
    movement('cancelled', 999, 'qa-bar', { status: 'cancelled' }), movement('reversed', 999, 'qa-bar', { reversedAt: at }),
    movement('foreign-venue', 999, 'qa-bar', { venueId: 99 }), movement('foreign-workspace', 999, 'qa-bar', { workspaceId: 99 }),
    movement('foreign-account', 999, 'qa-bar', { dataAccountId: 99 })];
  const full = { ...input, balance: { ...input.balance, current: 4 }, movements: operations };
  assert.equal(stockQuantityEvidence(full).explainedQuantity, 4); assert.equal(stockQuantityEvidence(full).contributorCount, 6);
  assert.equal(stockQuantityEvidence(full).evidenceComplete, true);
  const opening = { ...count, id: 'open', status: 'confirmed', createdAt: at, items: [{ rowId: 'line', productKey: 'p', quantity: 2, stockUnit: 'pcs' }] };
  assert.equal(stockQuantityEvidence({ ...full, balance: { ...full.balance, lastInventoryDocumentId: undefined, openingDocumentId: 'open' }, counts: [], openings: [opening] }).evidenceComplete, true);
  assert.equal(stockQuantityEvidence({ ...full, counts: [] }).status, 'PARTIAL');
  assert.equal(stockQuantityEvidence({ ...full, balance: { ...full.balance, current: null } }).status, 'UNKNOWN');
  assert.equal(stockQuantityEvidence({ ...full, movements: [movement('bad', 1, 'qa-bar', { unit: 'kg' })] }).explainedQuantity, null);
  assert.equal(stockQuantityEvidence({ ...full, counts: [{ ...count, anchorBoundary: undefined }] }).evidenceComplete, false);
  assert.equal(stockQuantityEvidence({ ...full, movements: [...operations, operations[1]] }).evidenceComplete, false);
  const zero = stockQuantityEvidence({ ...input, movements: [movement('sale', -2, 'qa-bar', { type: 'sale_consumption' })], balance: { ...input.balance, current: 0 } });
  assert.equal(zero.status, 'KNOWN_ZERO'); assert.equal(zero.evidenceComplete, true);
});

test('real commands A+B: named warehouse, advancing clock, read-only and historical cost after Z', async t => {
  const r = await stockRcaFixture({ now: null }); t.after(r.close);
  const q = resolvedEvidence((await r.resolve(r.reference('STOCK_QUANTITY', r.key))).body);
  const projection = q.projection as StockRow;
  assert.equal(projection.quantity, 2); assert.equal(projection.contributorCount, 3); assert.equal(projection.consistency, 'MATCH'); assert.equal(projection.evidenceComplete, true);
  const firstBody = (await r.resolve(r.reference('STOCK_VALUATION', r.key))).body;
  const first = resolvedEvidence(firstBody);
  assert.equal((first.projection as StockRow).value, 80); assert.equal((first.projection as StockRow).evidenceComplete, true);
  const before = r.snapshot();
  await new Promise(done => setTimeout(done, 25));
  const secondBody = (await r.resolve(r.reference('STOCK_VALUATION', r.key))).body;
  const second = resolvedEvidence(secondBody);
  assert.equal(second.revision, first.revision);
  assert.ok(secondBody.asOf > firstBody.asOf, 'Actual clock advances between fresh reads');
  assert.equal((await r.resolve(first.reference)).body.code, 'RESOLVED');
  assert.deepEqual(r.snapshot(), before);
  assert.ok((await r.confirm('z', 'pcs', 2, 50, '2026-10-02')).response.ok);
  const after = resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION', r.key))).body).projection as StockRow;
  assert.equal(after.quantity, 4); assert.equal(after.value, 200);
  assert.equal((await r.resolve(first.reference)).body.code, 'READ_MODEL_CHANGED');
  assert.equal((resolvedEvidence((await r.resolve(r.reference('COST_BASIS', r.key))).body).projection as StockRow).sourceDocumentId, 'z');
  const recorded = (r.get('bd_sales_events_v1') as StockRow[]).find(row => row.id === r.historical.id)!;
  assert.deepEqual(recorded.batch, r.captured);
});

test('handler bindings reject relevant business changes and preserve unrelated changes', async t => {
  const r = await stockRcaFixture(); t.after(r.close);
  const keys = ['bd_assortment_v1', 'bd_stock_movements', 'bd_purchase_documents', 'bd_inventory_snapshots'];
  const baseline = Object.fromEntries(keys.map(key => [key, structuredClone(r.get(key))]));
  const initial = resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION', r.key))).body);
  const edit = (key: string, change: (value: StockRow | StockRow[]) => void) => { const value = structuredClone(r.get(key)); change(value); r.put(key, value); };
  const doc = (value: StockRow | StockRow[]) => (value as StockRow[]).find(row => row.id === 'y')!;
  const receipt = (value: StockRow | StockRow[]) => (value as StockRow[]).find(row => row.sourceDocumentId === 'y' && row.productKey === r.key)!;
  const sale = (value: StockRow | StockRow[]) => (value as StockRow[]).find(row => row.type === 'sale_consumption')!;
  const balance = (value: StockRow | StockRow[]) => ((value as StockRow).stockBalances as StockRow[]).find(row => row.productKey === r.key)!;
  const controls: [string, () => void, boolean][] = [
    ['purchase document content', () => edit('bd_purchase_documents', value => { doc(value).supplierName = 'Changed'; }), true],
    ['purchase line content', () => edit('bd_purchase_documents', value => { (doc(value).items as StockRow[])[0].name = 'Changed'; }), true],
    ['authoritative quantity', () => edit('bd_assortment_v1', value => { balance(value).current = 3; }), true],
    ['contributing named-warehouse movement amount', () => edit('bd_stock_movements', value => { sale(value).amount = -2; }), true],
    ['contributing lifecycle reversedAt', () => edit('bd_stock_movements', value => { sale(value).reversedAt = at; }), true],
    ['anchor content/actual', () => edit('bd_inventory_snapshots', value => { ((value as StockRow[])[0].items as StockRow[]).find(row => row.productKey === r.key)!.actual = 3; }), true],
    ['anchor identity', () => { edit('bd_inventory_snapshots', value => { (value as StockRow[])[0].id = 'new-anchor'; }); edit('bd_assortment_v1', value => { balance(value).lastInventoryDocumentId = 'new-anchor'; }); }, true],
    ['selected receipt captured cost', () => edit('bd_stock_movements', value => { receipt(value).costAmount = 100; }), true],
    ['selected receipt identity at equal price', () => edit('bd_stock_movements', value => { receipt(value).id = 'replacement-receipt'; }), true],
    ['selected receipt disappears, older applicable', () => edit('bd_stock_movements', value => { (value as StockRow[]).splice((value as StockRow[]).indexOf(receipt(value)), 1); }), true],
    ['canonical document updatedAt', () => edit('bd_purchase_documents', value => { doc(value).updatedAt = '2026-10-02T13:00:00.000Z'; }), true],
    ['unrelated other-product movement', () => edit('bd_stock_movements', value => { (value as StockRow[]).push(movement('unrelated', 100, 'qa-bar', { productKey: 'unrelated' })); }), false],
  ];
  for (const [name, mutate, changed] of controls) await t.test(name, async () => {
    for (const key of keys) r.put(key, structuredClone(baseline[key]));
    r.setTime('2026-10-02T12:00:05.000Z');
    assert.equal(resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION', r.key))).body).revision, initial.revision);
    mutate();
    assert.equal((await r.resolve(initial.reference)).body.code, changed ? 'READ_MODEL_CHANGED' : 'RESOLVED');
  });
  await t.test('date eligibility changes actual selected receipt', async () => {
    for (const key of keys) r.put(key, structuredClone(baseline[key]));
    assert.ok((await r.confirm('future', 'pcs', 2, 60, '2026-10-03')).response.ok);
    const before = resolvedEvidence((await r.resolve(r.reference('STOCK_VALUATION', r.key))).body);
    const frozen = r.snapshot(); r.setTime('2026-10-03T12:00:00.000Z');
    assert.equal((await r.resolve(before.reference)).body.code, 'READ_MODEL_CHANGED');
    assert.equal((resolvedEvidence((await r.resolve(r.reference('COST_BASIS', r.key))).body).projection as StockRow).sourceDocumentId, 'future');
    assert.deepEqual(r.snapshot(), frozen, 'Eligibility changes selected source without a business write');
  });
});

test('valuation acquisition dependencies preserve live nested authorization and read-only', async t => {
  const r = await stockRcaFixture(); t.after(r.close);
  const ref = r.reference('STOCK_VALUATION', r.key);
  assert.equal((await r.resolve(ref, r.owner)).body.code, 'RESOLVED');
  assert.equal((await r.resolve(ref, r.member)).body.code, 'RESOLVED');
  for (const foreign of [{ venueId: r.foreign.activeVenueId }, { workspaceId: r.workspaceId + 1 }, { id: 'guessed-product' }, { partId: 'guessed-warehouse' }])
    assert.equal((await r.resolve({ ...ref, ...foreign })).body.outcome, 'unavailable');
  for (const guessed of [r.reference('PURCHASE_DOCUMENT', 'guessed-purchase'), r.reference('PURCHASE_DOCUMENT', 'y', { partId: 'guessed-line' }),
    r.reference('WAREHOUSE_MOVEMENT', 'guessed-movement'), r.reference('PURCHASE_SOURCE_FILE', 'y', { partId: '0123456789-0123456789-guessed' })])
    assert.equal((await r.resolve(guessed)).body.outcome, 'unavailable');
  const docs = r.get('bd_purchase_documents') as StockRow[], y = docs.find(row => row.id === 'y')!;
  const original = structuredClone(docs);
  for (const field of ['venueId', 'workspaceId', 'dataAccountId']) {
    for (const child of [y, (y.items as StockRow[])[0]]) {
      const old = child[field]; child[field] = 999;
      r.put('bd_purchase_documents', docs);
      const result = (await r.resolve(ref)).body;
      assert.equal(result.outcome, 'partial'); assert.equal((resolvedEvidence(result).projection as StockRow).evidenceComplete, false);
      assert.equal((await r.resolve(r.reference('PURCHASE_DOCUMENT', 'y', { partId: 'y-line' }))).body.outcome, 'unavailable');
      child[field] = old;
    }
  }
  r.put('bd_purchase_documents', original);
  r.permissions(['inventory.view']); assert.equal((await r.resolve(ref, r.member)).body.outcome, 'restricted');
  r.permissions([]); r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, r.member.userId);
  assert.equal((await r.resolve(ref, r.member)).response.status, 401);
  r.put('bd_purchase_documents', []);
  const missing = (await r.resolve(ref)).body;
  assert.equal(missing.outcome, 'partial'); assert.equal((resolvedEvidence(missing).projection as StockRow).evidenceComplete, false);
});

/** Synthetic isolated read inputs only. No storage access, writes or production data. */
type Row = Record<string, unknown>;
export type HealthQaScope = { venueId: number; workspaceId: number; dataAccountId: number };
export type HealthQaSource = { key: string; state: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'; revision: string; updatedAt: string; data: unknown };
export const HEALTH_QA_KEYS = ['bd_finance_revenue', 'bd_operational_reports_v1', 'bd_sales_events_v1', 'bd_sales_documents', 'bd_cases', 'bd_equipment', 'bd_equipment_history', 'bd_equipment_work_orders', 'bd_finance_expenses', 'bd_assortment_v1', 'bd_inventory_snapshots', 'bd_opening_stock_v1', 'bd_stock_movements'];
export const HEALTH_QA_AS_OF = '2026-10-08T12:00:00Z';
export const HEALTH_QA_SCOPE: HealthQaScope = { venueId: 1, workspaceId: 1, dataAccountId: 1 };

function envelope(scope: HealthQaScope, sourceKeys: string[], stores: Record<string, unknown>, states?: Record<string, HealthQaSource['state']>) {
  const asOf = HEALTH_QA_AS_OF;
  const sources: HealthQaSource[] = sourceKeys.map(key => ({ key, state: states?.[key] ?? 'AVAILABLE', revision: 'synthetic-read-fixture', updatedAt: asOf, data: stores[key] ?? [] }));
  return { sources, ...scope, profile: { name: 'Isolated v495 stock QA', timezone: 'UTC', currency: 'MDL' }, asOf, currency: 'MDL', stores,
    bytes: Object.fromEntries(Object.entries(stores).map(([key, value]) => [key, new TextEncoder().encode(JSON.stringify(value)).byteLength])) };
}

/** 1000 balances/8000 movements remain below 10000 rows and 2 MB per store.
 * Every current balance has a confirmed opening and matching retained movements.
 * The large shared opening also checks that narrowing by document preserves lines. */
export function representativeHealthStockFixture(products = 1000, movementCount = 8000, scope = HEALTH_QA_SCOPE, sourceKeys = HEALTH_QA_KEYS) {
  const nomenclature = Array.from({ length: products }, (_, i) => ({ id: `n${i}`, productKey: `p${i}`, name: `Product ${i}`, kind: 'stock', unit: 'pcs', active: true, ...scope }));
  const movements = Array.from({ length: movementCount }, (_, i) => ({ id: `m${i}`, productKey: `p${i % products}`, type: 'receipt', amount: 1, unit: 'pcs', costAmount: 2, costStatus: 'KNOWN_VALUE', currency: 'MDL', date: '2026-10-02', createdAt: '2026-10-02T12:00:00Z', ...scope }));
  const openings = [{ id: 'opening', status: 'confirmed', createdAt: '2026-10-01T12:00:00Z', anchorBoundary: { movements: [] }, items: nomenclature.map((p, i) => ({ id: `line${i}`, productKey: p.productKey, quantity: 10, unit: 'pcs', ...scope })), ...scope }];
  const stockBalances = nomenclature.map((p, i) => ({ productKey: p.productKey, current: 10 + Math.floor(movementCount / products) + (i < movementCount % products ? 1 : 0), unit: 'pcs', openingDocumentId: 'opening', ...scope }));
  return envelope(scope, sourceKeys, { bd_assortment_v1: { menuItems: [], recipes: [], nomenclature, stockBalances }, bd_stock_movements: movements, bd_opening_stock_v1: openings });
}

/** Repeatable small differential datasets: duplicate/idless and strict-ID anchors,
 * foreign/nested scope, aggregate/named warehouses, cancelled/reversed/unknown,
 * partial source states. Product known-zero retains an independently complete proof. */
export function mixedHealthStockFixture(initialSeed = 13, scope = HEALTH_QA_SCOPE, sourceKeys = HEALTH_QA_KEYS) {
  let seed = initialSeed >>> 0;
  const pick = <T>(values: T[]): T => values[(seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % values.length]!;
  const foreign = Math.max(scope.venueId, scope.workspaceId, scope.dataAccountId) + 10000;
  const ownership = (): Row => pick<Row>([{}, scope, { venueId: foreign }, { workspaceId: foreign }, { dataAccountId: foreign }, { nested: { venueId: foreign } }]);
  const movements: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: pick<unknown>([`m${i}`, 'duplicate', undefined]), productKey: pick<unknown>(['p0', 'p1', 'p2', undefined]), key: pick<unknown>(['p0', 'p1', undefined]), warehouseId: pick<unknown>(['w1', 'w2', '__venue__', undefined]), amount: pick<unknown>([0, 1, -1, null]), unit: pick(['pcs', 'kg', 'unknown']), createdAt: pick<unknown>(['2026-10-01T12:00:00Z', '2026-10-02T12:00:00Z', undefined]), status: pick<unknown>(['active', 'cancelled', undefined]), reversedAt: pick<unknown>([undefined, undefined, '2026-10-03T00:00:00Z']), ...ownership() }));
  const anchors = (status: string): Row[] => Array.from({ length: 4 }, (_, i) => ({ id: pick<unknown>([`anchor${i}`, 'duplicate', undefined, 4]), warehouseId: pick<unknown>(['w1', 'w2', '__venue__', undefined]), status, createdAt: '2026-10-01T12:00:00Z', completedAt: '2026-10-01T12:00:00Z', anchorBoundary: pick<Row>([{}, { movements: [] }]), items: Array.from({ length: 5 }, (_, j) => ({ id: pick<unknown>([`line${j}`, 'duplicate', undefined]), productKey: pick<unknown>(['p0', 'p1', 'p2', undefined]), quantity: pick<unknown>([0, 1, -1, null]), actual: pick<unknown>([0, 1, -1, null]), unit: pick(['pcs', 'kg']), ...ownership() })), ...ownership() }));
  const stockBalances: Row[] = Array.from({ length: 3 }, (_, i) => ({ productKey: `p${i}`, warehouseId: pick<unknown>(['w1', 'w2', '__venue__', undefined]), current: pick<unknown>([0, 1, -1, null]), unit: pick(['pcs', 'kg']), openingDocumentId: pick<unknown>(['anchor0', 'duplicate', undefined, 4]), lastInventoryDocumentId: pick<unknown>(['anchor1', 'duplicate', undefined, 4]), ...ownership() }));
  const counts = anchors('completed'), openings = anchors('confirmed');
  stockBalances.push({ productKey: 'known-zero', current: 0, unit: 'pcs', openingDocumentId: 'known-zero-opening', ...scope });
  openings.push({ id: 'known-zero-opening', status: 'confirmed', createdAt: '2026-10-01T12:00:00Z', anchorBoundary: { movements: [] }, items: [{ id: 'known-zero-line', productKey: 'known-zero', quantity: 0, unit: 'pcs', ...scope }], ...scope });
  const states = Object.fromEntries(sourceKeys.map(key => [key, pick<HealthQaSource['state']>(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE'])]));
  if (initialSeed % 4 === 0) for (const key of ['bd_assortment_v1', 'bd_stock_movements', 'bd_inventory_snapshots', 'bd_opening_stock_v1']) states[key] = 'AVAILABLE';
  return envelope(scope, sourceKeys, { bd_assortment_v1: { menuItems: [], recipes: [], nomenclature: [], stockBalances }, bd_stock_movements: movements, bd_inventory_snapshots: counts, bd_opening_stock_v1: openings }, states);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  capturedBatchCost, salesDocumentRowCost, historicalPeriodCost, reconcileMonthlyReport,
} from '../lib/bardoctor/financial-reconciliation';

// The source fixture is verbatim captured TEST HTTP/SQLite state. This suite only
// reads plain objects; it never invokes a route, database, network, or writer.
// Expected amounts below are independent fixed scenario oracles, not another
// implementation of the reconciliation formula.
const captured = JSON.parse(readFileSync(new URL('./fixtures/financial-reconciliation-phase7.json', import.meta.url), 'utf8')) as CapturedFixture;
type ObjectRow = Record<string, unknown>;
// Mutation fixtures intentionally permit legacy omissions. Required snapshot
// fields are made Partial only at the exact negative-case deletion site.
type Ingredient = ObjectRow & {
  productKey: string; baseQuantityTotal: number; unitCost: number; totalCost: number;
  costStatus?: string; currency?: string;
};
type RecipeSnapshot = ObjectRow & {
  recipeId: string; capturedAt: string; consumptionMode: string; ingredients: Ingredient[];
};
type BatchLine = ObjectRow & {
  id: string; salesBatchId: string; quantity: number; processingStatus: string;
  theoreticalCost: number; recipeSnapshot: RecipeSnapshot; currency?: string;
};
type Batch = ObjectRow & {
  id: string; venueId: number; businessDate: string; status: string;
  costStatus: string; totalTheoreticalCost: number | null; lines: BatchLine[];
};
type Revenue = ObjectRow & {
  id: string; venueId?: number; date: string; revenue: number; receipts?: number;
  accountingMonth?: string; revenueSource?: string; currency?: string;
};
type SalesEvent = ObjectRow & {
  id: string; externalId: string; venueId: number; status: string; businessDate: string;
  revenueRowId: string; currency: string; revenue: number; batch: Batch; reversedAt?: string;
};
type Movement = ObjectRow & {
  id: string; venueId: number; type: string; date: string; businessDate?: string;
  costAmount?: number; costStatus?: string; currency?: string; status?: string; reversedAt?: string;
};
type SalesDocument = ObjectRow & {
  id: string; internalId: string; date: string; status: string; currency: string;
  totalRevenue: number; salesBatchId: string;
};
type CapturedFixture = { revenues: Revenue[]; events: SalesEvent[]; movements: Movement[] };
type HistoryInput = CapturedFixture & {
  venueId: number; monthKey: string; accountingCurrency: string;
  documents?: SalesDocument[]; batches?: Batch[];
};
type DocumentFixture = {
  venueId: number; accountingCurrency: string;
  revenue: Revenue & { salesDocumentIds: string[] };
  documents: SalesDocument[]; batches: Batch[];
};
const clone = <T>(value: T): T => structuredClone(value);
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function history(): HistoryInput {
  return clone({ venueId: 901, monthKey: '2026-09', accountingCurrency: 'MDL',
    revenues: captured.revenues, events: captured.events, movements: captured.movements });
}
function smallBatch(): Batch { return clone(captured.events.find(event => event.externalId === 'qa-sale-a')!.batch); }
function largeBatch(): Batch { return clone(captured.events.find(event => event.externalId === 'qa-sale-b')!.batch); }
function resolveBatch(batch: Batch) { return capturedBatchCost(batch, 901, '2026-09-02', 'MDL'); }
function assertUnknown(value: unknown, reason?: string) {
  const result = value as ObjectRow;
  assert.equal(result.known, false);
  if ('reason' in result) {
    assert.equal(result.cost, null);
    if (reason) assert.equal(result.reason, reason);
  } else if (reason) assert.ok((result.reasons as string[]).includes(reason), JSON.stringify(result));
}
function documentFixture(): DocumentFixture {
  const batch = smallBatch();
  // Exact identities and fields written by sales/confirm + sales-revenue.ts.
  // The finance row legitimately omits currency and venueId; the batch does not.
  return { venueId: 901, accountingCurrency: 'MDL',
    revenue: { id: 'sales-revenue:2026-09-02', date: '2026-09-02', accountingMonth: '2026-09',
      revenue: 120, receipts: 1, revenueSource: 'sales_documents', salesDocumentIds: ['qa-doc-a'] },
    documents: [{ id: 'qa-doc-a', internalId: 'qa-doc-a', date: '2026-09-02', status: 'confirmed',
      currency: 'MDL', totalRevenue: 120, salesBatchId: batch.id }],
    batches: [batch] };
}
function reportFixture() {
  const input = history();
  return { ...input, snapshots: [], report: {
    status: 'preliminary', isClosed: false, accountingCurrency: 'MDL',
    openingSnapshot: { id: 'qa-opening', phase7PhysicalSnapshot: true, phase7SnapshotKnown: true },
    closingSnapshot: { id: 'qa-closing', phase7PhysicalSnapshot: true, phase7SnapshotKnown: true },
    openingInventory: 600, closingInventory: 324, revenue: 1200, purchases: 360,
    purchasePayments: 360, otherExpenses: 90, writeoffs: 0, payroll: 0, taxes: 0, utilities: 0,
    unconvertedForeignCurrencyCount: 0, cashResult: 750,
    // Deliberately wrong old inventory-residual values must not survive as COGS.
    costOfGoods: 636, rawCostOfGoods: 636, operatingResult: 474,
    sections: [{ section: 'Бар', cost: 636 }],
    shiftEstimates: [{ date: '2026-09-02', revenue: 1200, otherExpenses: 90,
      writeoffs: 0, payroll: 0, recurringAllocation: 0, estimatedCost: 636, estimatedResult: 474 }],
  } };
}

test('captured real POSTED batches retain the two actual latest-price snapshots: 60 and 720', () => {
  const first = freeze(smallBatch()), second = freeze(largeBatch());
  const before = JSON.stringify([first, second]);
  assert.deepEqual(resolveBatch(first), { known: true, cost: 60, batchIds: [first.id] });
  assert.deepEqual(resolveBatch(second), { known: true, cost: 720, batchIds: [second.id] });
  assert.equal(JSON.stringify([first, second]), before);
});

test('actual NONE capture is explicit zero with empty ingredients and no line currency', () => {
  const batch = smallBatch(), line = batch.lines[0];
  line.recipeSnapshot = { recipeId: 'none:qa-service', capturedAt: '2026-09-02T10:00:00Z',
    consumptionMode: 'NONE', ingredients: [] };
  line.theoreticalCost = 0;
  delete line.currency;
  batch.totalTheoreticalCost = 0;
  assert.equal(resolveBatch(batch).known, true);
  assert.equal(resolveBatch(batch).cost, 0);
  line.theoreticalCost = 1;
  assertUnknown(resolveBatch(batch), 'NONE_CAPTURE_INVALID');
});

test('capture precision respects per-ingredient rounding before line aggregation', () => {
  const batch = smallBatch(), line = batch.lines[0];
  line.recipeSnapshot.ingredients = line.recipeSnapshot.ingredients.slice(0, 2);
  for (const ingredient of line.recipeSnapshot.ingredients) {
    ingredient.baseQuantityTotal = 3;
    ingredient.unitCost = 0.335;
    ingredient.totalCost = 1.01;
  }
  line.theoreticalCost = 2.02;
  batch.totalTheoreticalCost = 2.02;
  assert.equal(resolveBatch(batch).cost, 2.02);
  // Rounding the combined unrounded products instead would incorrectly be 2.01.
  batch.totalTheoreticalCost = 2.01;
  assertUnknown(resolveBatch(batch), 'BATCH_COST_MISMATCH');
});

test('capture precision matches the actual writer at half-cent 1.005 without EPSILON', () => {
  const batch = smallBatch(), line = batch.lines[0];
  line.recipeSnapshot.ingredients = [line.recipeSnapshot.ingredients[0]];
  Object.assign(line.recipeSnapshot.ingredients[0], { baseQuantityTotal: 1, unitCost: 1.005, totalCost: 1 });
  line.theoreticalCost = 1;
  batch.totalTheoreticalCost = 1;
  assert.equal(resolveBatch(batch).cost, 1);
  line.recipeSnapshot.ingredients[0].totalCost = 1.01;
  assertUnknown(resolveBatch(batch), 'INGREDIENT_COST_MISMATCH');
});

test('rounded positive cost can validly be zero while zero without provenance is unknown', () => {
  const batch = smallBatch(), line = batch.lines[0];
  line.recipeSnapshot.ingredients = [line.recipeSnapshot.ingredients[0]];
  Object.assign(line.recipeSnapshot.ingredients[0], { baseQuantityTotal: 0.1, unitCost: 0.01,
    totalCost: 0, costStatus: 'KNOWN_VALUE' });
  line.theoreticalCost = 0;
  batch.totalTheoreticalCost = 0;
  assert.equal(resolveBatch(batch).cost, 0);
  delete line.recipeSnapshot.ingredients[0].costStatus;
  assertUnknown(resolveBatch(batch), 'INGREDIENT_ZERO_UNPROVEN');
});

test('legacy captured positive ingredient costs do not require a newer costStatus field', () => {
  const batch = smallBatch();
  for (const ingredient of batch.lines[0].recipeSnapshot.ingredients) delete ingredient.costStatus;
  assert.equal(resolveBatch(batch).cost, 60);
});

const brokenBatches: [string, (batch: Batch) => void, string][] = [
  ['missing snapshot', b => { delete (b.lines[0] as Partial<BatchLine>).recipeSnapshot; }, 'LINE_CAPTURE_MISSING'],
  ['missing ingredient array', b => { delete (b.lines[0].recipeSnapshot as Partial<RecipeSnapshot>).ingredients; }, 'INGREDIENT_CAPTURE_MISSING'],
  ['duplicate line IDs', b => { b.lines.push(clone(b.lines[0])); }, 'DUPLICATE_BATCH_LINE'],
  ['wrong line-to-batch link', b => { b.lines[0].salesBatchId = 'unrelated'; }, 'LINE_CAPTURE_MISSING'],
  ['wrong batch venue', b => { b.venueId = 902; }, 'BATCH_CAPTURE_MISSING'],
  ['wrong batch date', b => { b.businessDate = '2026-09-03'; }, 'BATCH_CAPTURE_MISSING'],
  ['reversed standalone batch', b => { b.status = 'REVERSED'; }, 'BATCH_CAPTURE_MISSING'],
  ['partial batch', b => { b.costStatus = 'PARTIAL'; }, 'BATCH_CAPTURE_MISSING'],
  ['null header cost', b => { b.totalTheoreticalCost = null; }, 'BATCH_CAPTURE_MISSING'],
  ['line price mismatch', b => { b.lines[0].theoreticalCost = 61; }, 'LINE_COST_MISMATCH'],
  ['header price mismatch', b => { b.totalTheoreticalCost = 61; }, 'BATCH_COST_MISMATCH'],
  ['ingredient price mismatch', b => { b.lines[0].recipeSnapshot.ingredients[0].totalCost = 21; }, 'INGREDIENT_COST_MISMATCH'],
  ['UNKNOWN ingredient', b => { b.lines[0].recipeSnapshot.ingredients[0].costStatus = 'UNKNOWN'; }, 'INGREDIENT_COST_UNKNOWN'],
  ['missing ingredient currency', b => { delete b.lines[0].recipeSnapshot.ingredients[0].currency; }, 'INGREDIENT_COST_UNKNOWN'],
  ['foreign ingredient currency', b => { b.lines[0].recipeSnapshot.ingredients[0].currency = 'EUR'; }, 'INGREDIENT_COST_UNKNOWN'],
];
for (const [name, mutate, reason] of brokenBatches) test(`rejects ${name} despite a FULL header`, () => {
  const batch = smallBatch(); mutate(batch); assertUnknown(resolveBatch(batch), reason);
});

test('real event refund excludes immutable POSTED batch once, with original and reversal movements still present', () => {
  const input = freeze(history()), before = JSON.stringify(input);
  assert.equal(input.events[0].status, 'REVERSED');
  assert.equal(input.events[0].batch.status, 'POSTED');
  assert.ok(input.movements.some((movement: Movement) => movement.type === 'sale_reversal'));
  assert.deepEqual(historicalPeriodCost(input), { known: true, cost: 720, adjustment: -36,
    daily: { '2026-09-02': { cost: 720, adjustment: -36 } }, reasons: [], eventCount: 2 });
  assert.equal(JSON.stringify(input), before);
});

test('historical captures remain sufficient if old sale movements have left the current ledger', () => {
  const input = history();
  input.movements = input.movements.filter((movement: Movement) => movement.type === 'inventory_adjustment');
  const result = historicalPeriodCost(input);
  assert.equal(result.known, true); assert.equal(result.cost, 720); assert.equal(result.adjustment, -36);
});

test('all refunded sales produce known zero cost in the original period', () => {
  const input = history();
  input.events[1].status = 'REVERSED';
  input.events[1].reversedAt = '2026-10-02T11:00:00Z';
  input.revenues[0].revenue = 0; input.revenues[0].receipts = 0;
  const result = historicalPeriodCost(input);
  assert.equal(result.known, true); assert.equal(result.cost, 0); assert.equal(result.adjustment, -36);
});

const brokenHistory: [string, (input: HistoryInput) => void, string][] = [
  ['missing revenue row', x => { x.revenues = []; }, 'SALES_REVENUE_HISTORY_MISMATCH'],
  ['missing active event', x => { x.events = x.events.slice(0, 1); }, 'SALES_REVENUE_HISTORY_MISMATCH'],
  ['duplicate event', x => { x.events.push(clone(x.events[1])); }, 'DUPLICATE_FINANCIAL_HISTORY'],
  ['duplicate revenue', x => { x.revenues.push(clone(x.revenues[0])); }, 'DUPLICATE_FINANCIAL_HISTORY'],
  ['duplicate adjustment', x => { x.movements.push(clone(x.movements.find(m => m.type === 'inventory_adjustment')!)); }, 'DUPLICATE_FINANCIAL_HISTORY'],
  ['wrong projected revenue', x => { x.revenues[0].revenue = 1320; }, 'SALES_REVENUE_HISTORY_MISMATCH'],
  ['wrong receipt count', x => { x.revenues[0].receipts = 2; }, 'SALES_REVENUE_HISTORY_MISMATCH'],
  ['event date differs within the same month', x => { x.events[1].businessDate = '2026-09-03'; }, 'SALES_REVENUE_HISTORY_MISMATCH'],
  ['foreign event currency', x => { x.events[1].currency = 'EUR'; }, 'HISTORICAL_SALES_COST_UNKNOWN'],
  ['foreign adjustment currency', x => { x.movements.find(m => m.type === 'inventory_adjustment')!.currency = 'EUR'; }, 'INVENTORY_ADJUSTMENT_COST_UNKNOWN'],
  ['unknown adjustment cost', x => { delete x.movements.find(m => m.type === 'inventory_adjustment')!.costAmount; }, 'INVENTORY_ADJUSTMENT_COST_UNKNOWN'],
];
for (const [name, mutate, reason] of brokenHistory) test(`incomplete history: ${name}`, () => {
  const input = history(); mutate(input); assertUnknown(historicalPeriodCost(input), reason);
});

test('other venue/month rows and cancelled adjustments cannot change September captured cost', () => {
  const input = history();
  input.revenues.push({ id: 'other-month', venueId: 901, date: '2026-08-31', revenue: 99999 },
    { id: 'other-venue', venueId: 902, date: '2026-09-02', revenue: 99999 });
  const adjustment = input.movements.find(movement => movement.type === 'inventory_adjustment')!;
  input.movements.push({ ...adjustment, id: 'cancelled', status: 'cancelled', costAmount: -1000 },
    { ...adjustment, id: 'reversed', reversedAt: '2026-09-02T11:00:00Z', costAmount: -1000 },
    { ...adjustment, id: 'other-venue-adjustment', venueId: 902, costAmount: -1000 },
    { ...adjustment, id: 'other-month-adjustment', date: '2026-10-01', costAmount: -1000 });
  const result = historicalPeriodCost(input);
  assert.equal(result.known, true); assert.equal(result.cost, 720); assert.equal(result.adjustment, -36);
});

test('explicit known-zero adjustment differs from an unexplained zero', () => {
  const input = history();
  const adjustment = input.movements.find(movement => movement.type === 'inventory_adjustment')!;
  input.movements.push({ ...adjustment, id: 'known-zero', costAmount: 0, costStatus: 'KNOWN_ZERO' });
  assert.equal(historicalPeriodCost(input).known, true);
  delete input.movements.at(-1)!.costStatus;
  assertUnknown(historicalPeriodCost(input), 'INVENTORY_ADJUSTMENT_COST_UNKNOWN');
});

test('sales_documents uses explicit IDs through confirmed document to frozen batch, absent finance-row currency allowed', () => {
  const input = freeze(documentFixture()), before = JSON.stringify(input);
  assert.equal(Object.hasOwn(input.revenue, 'currency'), false);
  assert.deepEqual(salesDocumentRowCost(input), { known: true, cost: 60,
    batchIds: [input.batches[0].id], documentIds: ['qa-doc-a'] });
  const result = historicalPeriodCost({ venueId: 901, monthKey: '2026-09', accountingCurrency: 'MDL',
    revenues: [input.revenue], events: [], movements: [], documents: input.documents, batches: input.batches });
  assert.equal(result.known, true); assert.equal(result.cost, 60);
  assert.equal(JSON.stringify(input), before);
});

const brokenDocuments: [string, (input: DocumentFixture) => void, string][] = [
  ['missing document ID list', x => { delete (x.revenue as Partial<DocumentFixture['revenue']>).salesDocumentIds; }, 'SALES_DOCUMENT_IDENTITIES_MISSING'],
  ['duplicate explicit document ID', x => { x.revenue.salesDocumentIds.push('qa-doc-a'); }, 'SALES_DOCUMENT_IDENTITIES_MISSING'],
  ['missing document', x => { x.documents = []; }, 'SALES_DOCUMENT_AMBIGUOUS'],
  ['duplicate document', x => { x.documents.push(clone(x.documents[0])); }, 'SALES_DOCUMENT_AMBIGUOUS'],
  ['date-only candidate is not a join', x => { x.documents[0].id = 'same-date-unrelated'; }, 'SALES_DOCUMENT_AMBIGUOUS'],
  ['missing batch', x => { x.batches = []; }, 'SALES_BATCH_AMBIGUOUS'],
  ['duplicate batch', x => { x.batches.push(clone(x.batches[0])); }, 'SALES_BATCH_AMBIGUOUS'],
  ['unconfirmed document', x => { x.documents[0].status = 'draft'; }, 'SALES_DOCUMENT_CAPTURE_MISSING'],
  ['foreign document currency', x => { x.documents[0].currency = 'EUR'; }, 'SALES_DOCUMENT_CAPTURE_MISSING'],
  ['document revenue projection mismatch', x => { x.revenue.revenue = 121; }, 'SALES_DOCUMENT_REVENUE_MISMATCH'],
  ['confirmed document with reversed batch', x => { x.batches[0].status = 'REVERSED'; }, 'BATCH_CAPTURE_MISSING'],
];
for (const [name, mutate, reason] of brokenDocuments) test(`sales_documents rejects ${name}`, () => {
  const input = documentFixture(); mutate(input); assertUnknown(salesDocumentRowCost(input), reason);
});

test('one batch cannot be counted via two document IDs', () => {
  const input = documentFixture();
  input.documents.push({ ...input.documents[0], id: 'qa-doc-copy' });
  input.revenue.salesDocumentIds.push('qa-doc-copy'); input.revenue.revenue = 240;
  assertUnknown(salesDocumentRowCost(input), 'SALES_BATCH_REFERENCED_TWICE');
});

test('one batch cannot be counted through a live event and a sales document', () => {
  const input = history(), docs = documentFixture();
  docs.batches = [largeBatch()]; docs.documents[0].salesBatchId = docs.batches[0].id;
  input.documents = docs.documents; input.batches = docs.batches; input.revenues.push(docs.revenue);
  assertUnknown(historicalPeriodCost(input), 'SALES_BATCH_REFERENCED_TWICE');
});

test('complete report uses retained cost720, adjustment-36, expense90: profit354 and revaluation120', () => {
  const input = freeze(reportFixture()), before = JSON.stringify(input);
  const result = reconcileMonthlyReport(input);
  assert.equal(result.financialReconciliationKnown, true);
  assert.deepEqual(result.financialReconciliationReasons, []);
  assert.equal(result.costBasis, 'historical_sales_snapshots');
  assert.equal(result.openingInventory, 600); assert.equal(result.closingInventory, 324);
  assert.equal(result.costOfGoods, 720); assert.equal(result.rawCostOfGoods, 720);
  assert.equal(result.grossProfit, 480); assert.equal(result.inventoryAdjustmentNet, -36);
  assert.equal(result.inventoryLoss, 36); assert.equal(result.operatingResult, 354);
  assert.equal(result.inventoryRevaluation, 120); assert.equal(result.cashResult, 750);
  assert.equal((result.shiftEstimates as ObjectRow[])[0].estimatedCost, 720);
  assert.equal((result.shiftEstimates as ObjectRow[])[0].estimatedResult, 354);
  assert.equal((result.sections as ObjectRow[])[0].cost, null);
  assert.equal(JSON.stringify(input), before);
});

for (const [name, revenue, receipts] of [['manual positive revenue', 100, 1], ['free stock-consuming legacy sale', 0, 1]] as const) {
  test(`mixed history with ${name} is UNKNOWN; never add residual636 to captured720`, () => {
    const input = reportFixture();
    input.revenues.push({ id: 'manual-uncovered', venueId: 901, date: '2026-09-02', revenue, receipts });
    const result = reconcileMonthlyReport(input);
    assert.equal(result.financialReconciliationKnown, false);
    assert.ok((result.financialReconciliationReasons as string[]).includes('HISTORICAL_SALES_COST_MISSING'));
    assert.equal(result.costOfGoods, null); assert.equal(result.rawCostOfGoods, null);
    assert.equal(result.operatingResult, null); assert.equal(result.grossProfit, null);
  });
}

test('a proven empty manual row does not invent missing sales cost', () => {
  const input = reportFixture();
  input.revenues.push({ id: 'empty-manual', venueId: 901, date: '2026-09-02', revenue: 0, receipts: 0 });
  const result = reconcileMonthlyReport(input);
  assert.equal(result.financialReconciliationKnown, true); assert.equal(result.operatingResult, 354);
});

test('unknown opening valuation cannot produce authoritative profit even with complete sales captures', () => {
  const input = reportFixture();
  input.report.openingSnapshot.phase7SnapshotKnown = false;
  const result = reconcileMonthlyReport(input);
  assert.equal(result.openingInventory, null); assert.equal(result.closingInventory, 324);
  assert.equal(result.financialReconciliationKnown, false); assert.equal(result.costOfGoods, null);
  assert.equal(result.operatingResult, null);
});

test('unconverted foreign entries prevent an authoritative report result', () => {
  const input = reportFixture(); input.report.unconvertedForeignCurrencyCount = 1;
  const result = reconcileMonthlyReport(input);
  assert.equal(result.financialReconciliationKnown, false);
  assert.equal(result.costOfGoods, null); assert.equal(result.operatingResult, null);
});

test('the supported PMR_RUB accounting currency accepts consistently captured history', () => {
  const input = history();
  function replaceCurrency(value: unknown) {
    if (!value || typeof value !== 'object') return;
    if (Object.hasOwn(value, 'currency')) (value as ObjectRow).currency = 'PMR_RUB';
    for (const child of Object.values(value)) replaceCurrency(child);
  }
  replaceCurrency(input); input.accountingCurrency = 'PMR_RUB';
  const result = historicalPeriodCost(input);
  assert.equal(result.known, true); assert.equal(result.cost, 720); assert.equal(result.adjustment, -36);
});

test('missing accounting currency cannot establish historical cost', () => {
  const input = history(); input.accountingCurrency = '';
  assertUnknown(historicalPeriodCost(input), 'ACCOUNTING_CURRENCY_UNKNOWN');
});

test('a legacy-only period keeps its existing report; snapshots from another period do not activate this model', () => {
  const legacy = { isClosed: false, accountingCurrency: 'MDL', openingInventory: 600,
    closingInventory: 324, purchases: 360, revenue: 1200, costOfGoods: 636, operatingResult: 474 };
  const input = freeze({ report: legacy, venueId: 901, monthKey: '2026-08',
    snapshots: [{ date: '2026-09-01', status: 'completed', scope: { type: 'all' } }],
    revenues: captured.revenues, events: captured.events, movements: captured.movements });
  assert.deepEqual(reconcileMonthlyReport(input), legacy);
});

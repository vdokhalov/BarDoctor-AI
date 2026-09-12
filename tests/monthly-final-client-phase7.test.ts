import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { compileFinancialClient } from "./helpers/financial-client-phase7.mjs";

// Actual final-client execution over captured isolated TEST HTTP inputs. No API/SQLite/network writes.
type Row = Record<string, unknown>;
const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const fixturePath = new URL("./fixtures/monthly-final-client-phase7.json", import.meta.url);
const actualBundle = fs.readFileSync(bundlePath, "utf8"), recordedStateBytes = fs.readFileSync(fixturePath);
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const bundleHash = sha(actualBundle);
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const recorded = (): Map<string, unknown> => new Map(Object.entries((JSON.parse(recordedStateBytes.toString()) as { stores: Record<string, unknown> }).stores));
const storeRows = (stores: Map<string, unknown>, key: string): Row[] => stores.get(key) as Row[];
const profile = { id: 901, name: "Phase 7 TEST", currency: "MDL", accountingCurrency: "MDL", areas: ["Бар"],
  workingDays: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true } };
function localStorageFixture(activeVenueId = 901) {
  const values = new Map<string, string>([
    ["bd_session", "phase7-ci"], ["bd_active_venue_id", String(activeVenueId)],
    ["bd_venue_context__phase7-ci", JSON.stringify({ activeVenueId, venues: [{ id: 901 }, { id: 902 }] })],
  ]);
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key), clear: () => values.clear() };
}
function fixture(options: { realProfile?: boolean; conflictingProfile?: boolean } = {}) {
  const stores = recorded();
  stores.set("bd_month_closings", []);
  const localStorage = localStorageFixture();
  const actual = compileFinancialClient(actualBundle, key => stores.get(key), { localStorage });
  assert.equal(actual.extraction.reportBindings, 4, "Base + payroll + Phase 7 + closure all execute");
  assert.equal(actual.extraction.units.filter((item: { name: string }) => item.name === "bdMonthClosingSnapshot").length, 2);
  assert.equal(actual.extraction.bundleSha256, bundleHash);
  const selectedProfile: Row = structuredClone(profile);
  if (options.realProfile) { delete selectedProfile.id; delete selectedProfile.venueId; }
  if (options.conflictingProfile) selectedProfile.id = 902;
  if (options.realProfile || options.conflictingProfile) {
    const settings = storeRows(stores, "bd_finance_settings")[0];
    settings.id = "primary"; delete settings.venueId;
  }
  const rawReport = () => actual.report(structuredClone(selectedProfile), "2026-09", structuredClone(stores.get("bd_finance_revenue") || []),
    structuredClone(stores.get("bd_finance_expenses") || []), structuredClone(stores.get("bd_inventory_snapshots") || []),
    structuredClone(storeRows(stores, "bd_finance_settings")[0]), structuredClone(stores.get("bd_finance_gap_reasons") || []));
  const report = () => plain(rawReport());
  const close = (input: unknown) => {
    const snapshot = plain(actual.closeSnapshot(input));
    const closing = { id: "901:2026-09", venueId: "901", monthKey: "2026-09", status: "closed", reopenedAt: undefined as string | undefined,
      closedAt: "2026-10-02T12:00:00.000Z", updatedAt: "2026-10-02T12:00:00.000Z", snapshot };
    stores.set("bd_month_closings", [closing]);
    return closing;
  };
  return { stores, actual, report, rawReport, close, localStorage };
}
const newFields = ['costBasis', 'inventoryAdjustmentNet', 'inventoryLoss', 'grossProfit', 'inventoryRevaluation',
  'financialReconciliationKnown', 'financialReconciliationReasons', 'rawCostOfGoods', 'inventoryMismatch',
  'shiftEstimates', 'openingSnapshot', 'closingSnapshot', 'accountingCurrency', 'excludedForeignCurrencyEntries',
  'excludedForeignCurrencyTotals', 'unconvertedForeignCurrencyCount', 'currencyBoundaryStatus'];

test('actual full final wrapper reconciles saved TEST data and captures the independent 354 result', () => {
  const f = fixture(), before = JSON.stringify([...f.stores]), open = f.report();
  assert.deepEqual(Object.fromEntries(['revenue','openingInventory','closingInventory','costOfGoods','grossProfit',
    'inventoryAdjustmentNet','inventoryLoss','inventoryRevaluation','otherExpenses','operatingResult','cashResult'].map(key => [key, open[key]])),
  { revenue: 1200, openingInventory: 600, closingInventory: 324, costOfGoods: 720, grossProfit: 480,
    inventoryAdjustmentNet: -36, inventoryLoss: 36, inventoryRevaluation: 120, otherExpenses: 90, operatingResult: 354, cashResult: 750 });
  assert.equal(open.financialReconciliationKnown, true);
  assert.deepEqual(open.financialReconciliationReasons, []);
  assert.equal(open.isClosed, false);
  assert.equal(open.coveragePercent, 100);
  assert.equal(JSON.stringify([...f.stores]), before, 'Report reads must preserve every store byte');
  const closing = f.close(open), frozenBytes = JSON.stringify(closing);
  const closed = f.report();
  assert.equal(closed.isClosed, true);
  assert.equal(closed.operatingResult, 354);
  assert.equal(closing.snapshot.finalProfit, 354);
  for (const key of newFields) assert.deepEqual(closed[key], closing.snapshot[key], key + ' comes from captured close');
  assert.equal(JSON.stringify(closing), frozenBytes);
});

test('closed final wrapper is frozen after current prices, FX, expenses and payroll change; no consumer alias mutates snapshot', () => {
  const f = fixture(), closing = f.close(f.report()), frozenBytes = JSON.stringify(closing);
  const assortment = f.stores.get('bd_assortment_v1') as { stockBalances: Row[] };
  for (const balance of assortment.stockBalances) Object.assign(balance, { lastPurchasePrice: 999999, averageUnitCost: 999999, inventoryValue: 99999999 });
  storeRows(f.stores, 'bd_finance_expenses').push({ id: 'private-later-foreign', venueId: 901, date: '2026-09-03',
    category: 'other', amount: 888, currency: 'EUR' });
  storeRows(f.stores, 'bd_finance_expenses').push({ id: 'private-later-expense', venueId: 901, date: '2026-09-03',
    category: 'other', amount: 777, currency: 'MDL' });
  f.stores.set('bd_payroll_entries', [{ id: 'private-later-bonus', venueId: '901', date: '2026-09-02', type: 'bonus', amount: 500 }]);
  const beforeRead = JSON.stringify([...f.stores]);
  const closed = f.report();
  assert.equal(closed.isClosed, true, 'Live missing FX must not bypass the historical close');
  assert.equal(closed.operatingResult, 354);
  assert.equal(closed.costOfGoods, 720);
  assert.equal(closed.cashResult, 750);
  assert.equal(closed.payroll, 0);
  assert.equal(closed.otherExpenses, 90);
  assert.equal(closed.unconvertedForeignCurrencyCount, 0);
  for (const key of newFields) assert.deepEqual(closed[key], closing.snapshot[key], key + ' is frozen despite later live state');
  assert.equal(JSON.stringify([...f.stores]), beforeRead, 'Report cannot rewrite source data');
  const rawClosed = f.rawReport(), rawCapturedBytes = JSON.stringify(rawClosed.closure.snapshot);
  rawClosed.shiftEstimates.push({ date: 'bad', estimatedCost: -999 });
  rawClosed.financialReconciliationReasons.push('bad');
  rawClosed.openingSnapshot.sections['Бар'] = -999;
  assert.equal(JSON.stringify(rawClosed.closure.snapshot), rawCapturedBytes,
    'Raw returned metadata must not alias its own raw closure snapshot (no JSON-cloning the ACTUAL here)');
  assert.equal(JSON.stringify(closing), frozenBytes, 'Captured nested metadata must not alias rendered report');
});

test('reopened-state reader resumes live reconciliation, and a new close captures the corrected result', () => {
  // This is only the consumer state transition; HTTP reopen permission/audit remains the separate actual handler suite.
  const f = fixture(), closing = f.close(f.report()), originalSnapshot = JSON.stringify(closing.snapshot);
  closing.status = 'reopened'; closing.reopenedAt = '2026-10-02T13:00:00.000Z';
  storeRows(f.stores, 'bd_finance_expenses').push({ id: 'private-authorized-correction', venueId: 901, date: '2026-09-02',
    category: 'other', amount: 10, currency: 'MDL' });
  const reopened = f.report();
  assert.equal(reopened.isClosed, false);
  assert.equal(reopened.closure, null);
  assert.equal(reopened.costOfGoods, 720);
  assert.equal(reopened.operatingResult, 344);
  assert.equal(reopened.cashResult, 740);
  assert.equal(reopened.inventoryRevaluation, 120);
  assert.equal(JSON.stringify(closing.snapshot), originalSnapshot, 'Reopen reader must preserve previous signed snapshot');
  const corrected = f.close(reopened);
  assert.equal(corrected.snapshot.finalProfit, 344);
  assert.equal(f.report().operatingResult, 344);
});

test('old partial close exposes missing financial values as unknown and never fills them from current live report', () => {
  const f = fixture();
  const old = { id: '901:2026-09', venueId: '901', monthKey: '2026-09', status: 'closed',
    closedAt: '2026-10-02T12:00:00.000Z', snapshot: { revenue: 1200, finalProfit: 354 } };
  f.stores.set('bd_month_closings', [old]);
  const bytes = JSON.stringify(old), actual = f.report();
  assert.equal(actual.isClosed, true);
  assert.equal(actual.revenue, 1200);
  assert.equal(actual.operatingResult, 354);
  assert.equal(actual.costBasis, 'legacy_closed_snapshot');
  for (const key of ['inventoryAdjustmentNet','inventoryLoss','grossProfit','inventoryRevaluation',
    'financialReconciliationKnown','financialReconciliationReasons','rawCostOfGoods',
    'costOfGoods','openingInventory','closingInventory','cashResult','purchases','otherExpenses','writeoffs','payroll','taxes','utilities']) {
    assert.equal(actual[key], null, key + ' absent in old signed snapshot must stay unknown');
  }
  assert.deepEqual(actual.shiftEstimates, []);
  assert.equal(actual.openingSnapshot, null);
  assert.equal(actual.closingSnapshot, null);
  assert.deepEqual(actual.excludedForeignCurrencyTotals, []);
  assert.equal(JSON.stringify(old), bytes);
});

test("native active venue resolves a real profile without id and primary finance settings, then numeric close", () => {
  const f = fixture({ realProfile: true }), actual = f.report();
  assert.deepEqual({ opening: actual.openingInventory, closing: actual.closingInventory, cogs: actual.costOfGoods, profit: actual.operatingResult },
    { opening: 600, closing: 324, cogs: 720, profit: 354 });
  assert.equal(actual.financialReconciliationKnown, true);
  const closed = f.close(actual), bytes = JSON.stringify(closed);
  assert.equal(f.report().isClosed, true);
  assert.equal(f.report().operatingResult, 354);
  assert.equal(JSON.stringify(closed), bytes);
});

test("legacy primary close is respected inside the active venue scoped store without a numeric profile id", () => {
  const f = fixture({ realProfile: true }), closing = f.close(f.report());
  closing.id = "primary:2026-09"; closing.venueId = "primary";
  const bytes = JSON.stringify(closing), closed = f.report();
  assert.equal(closed.isClosed, true);
  assert.equal(closed.closure.venueId, "primary");
  assert.equal(closed.operatingResult, 354);
  assert.equal(closed.costOfGoods, 720);
  assert.equal(JSON.stringify(closing), bytes);
});

test("foreign venue close and conflicting profile id cannot override the actual active TEST venue", () => {
  const f = fixture({ conflictingProfile: true }), live = f.report();
  assert.equal(live.costOfGoods, 720);
  assert.equal(live.operatingResult, 354);
  const correct = f.close(live);
  const foreign = { ...structuredClone(correct), id: "902:2026-09", venueId: "902", updatedAt: "2099-12-31T23:59:59.000Z",
    snapshot: { ...structuredClone(correct.snapshot), finalProfit: 999999, costOfGoods: 999999 } };
  f.stores.set("bd_month_closings", [foreign, correct]);
  const bytes = JSON.stringify([...f.stores]), closed = f.report();
  assert.equal(closed.isClosed, true);
  assert.equal(closed.closure.venueId, "901");
  assert.equal(closed.costOfGoods, 720);
  assert.equal(closed.operatingResult, 354);
  assert.equal(JSON.stringify([...f.stores]), bytes);
  f.stores.set("bd_month_closings", [foreign]);
  assert.equal(f.report().isClosed, false, "A foreign close alone cannot close the active venue");
});

test.after(() => {
  assert.equal(sha(fs.readFileSync(bundlePath)), bundleHash, "Actual tested bundle unchanged");
  assert.deepEqual(fs.readFileSync(fixturePath), recordedStateBytes, "Captured TEST fixture bytes unchanged");
});

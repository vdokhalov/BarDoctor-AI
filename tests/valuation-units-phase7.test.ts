import assert from "node:assert/strict";
import test from "node:test";
import { summarizeInventoryValuation } from "../lib/bardoctor/valuation";

type Row = Record<string, unknown>;
const date = "2026-09-10T12:00:00.000Z";
function receipt(productKey: string, unit: string, amount: number, costAmount: number, extra: Row = {}): Row {
  return { id: `receipt-${productKey}`, type: "receipt", venueId: 901, productKey, unit, amount,
    costAmount, currency: "MDL", costStatus: costAmount === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE",
    businessDate: "2026-09-01", createdAt: "2026-09-01T09:00:00Z", sourceDocumentId: "purchase-a", ...extra };
}
function summarize(balances: Row[], stockMovements: Row[], extra: Row = {}) {
  const input = { balances, stockMovements, accountingCurrency: "MDL", venueId: 901, asOf: date, ...extra };
  const before = JSON.stringify(input);
  const result = summarizeInventoryValuation(input);
  assert.equal(JSON.stringify(input), before, "valuation must not rewrite quantities, units or historical movements");
  assert.deepEqual(summarizeInventoryValuation(input), result, "repeated valuation must be stable");
  return result;
}

test("canonical kg/l/pcs stock has a complete last-purchase valuation of 600 MDL", () => {
  const units = ["kg", "l", "pcs"];
  const summary = summarize(units.map(unit => ({ productKey: unit, current: 20, unit })),
    units.map(unit => receipt(unit, unit, 10, 100)));
  assert.equal(summary.method, "latest_confirmed_receipt");
  assert.equal(summary.complete, true);
  assert.equal(summary.total, 600);
  assert.deepEqual(summary.lines.map(line => [line.quantity, line.unit, line.value]),
    [[20, "kg", 200], [20, "l", 200], [20, "pcs", 200]]);
});

test("canonical and legacy quantities use dimensionally compatible receipt prices without rewriting stock", () => {
  const summary = summarize([
    { productKey: "kg", current: 2.5, unit: "kg" },
    { productKey: "l", current: 3, unit: "l" },
    { productKey: "g", current: 2500, unit: "g" },
    { productKey: "ml", current: 3000, unit: "ml" },
    { productKey: "pcs", current: 12, unit: "pcs", packageSize: 1000, displayUnit: "g" },
  ], [receipt("kg", "g", 2500, 125), receipt("l", "ml", 1500, 45),
    receipt("g", "kg", 2.5, 125), receipt("ml", "l", 1.5, 45), receipt("pcs", "pcs", 12, 24)]);
  assert.equal(summary.complete, true);
  assert.equal(summary.total, 454);
  assert.deepEqual(summary.lines.map(line => [line.quantity, line.unit, line.value]),
    [[2.5, "kg", 125], [3, "l", 90], [2500, "g", 125], [3000, "ml", 90], [12, "pcs", 24]]);
});

test("latest applicable canonical receipt replaces current price without averaging or rewriting history", () => {
  const balances = [{ productKey: "beans", current: 20, unit: "kg", averageUnitCost: 999, inventoryValue: 19980 }];
  const movements = [receipt("beans", "kg", 10, 100),
    receipt("beans", "g", 10000, 120, { id: "b", sourceDocumentId: "purchase-b", businessDate: "2026-09-05" }),
    receipt("beans", "kg", 10, 500, { id: "cancelled", businessDate: "2026-09-06", status: "cancelled" }),
    receipt("beans", "kg", 10, 500, { id: "reversed", businessDate: "2026-09-07", reversedAt: date }),
    receipt("beans", "kg", 10, 300, { id: "future", businessDate: "2026-10-01" })];
  assert.equal(summarize(balances, movements).total, 240);
  assert.equal(summarize(balances, movements, { asOf: "2026-09-02T00:00:00Z" }).total, 200);
  assert.equal(summarize(balances, movements.map(row => row.id === "b" ? { ...row, status: "cancelled" } : row)).total, 200);
});

test("canonical units still reject incompatible dimensions, unknown packages and missing prices", () => {
  const summary = summarize([
    { productKey: "mass", current: 2, unit: "kg" },
    { productKey: "volume", current: 2, unit: "l" },
    { productKey: "count", current: 12, unit: "pcs" },
    { productKey: "pack", current: 2, unit: "pack", packageSize: 1000 },
    { productKey: "no-price", current: 2, unit: "kg", averageUnitCost: 99, inventoryValue: 198 },
  ], [receipt("mass", "l", 2, 100), receipt("volume", "pcs", 2, 100),
    receipt("count", "g", 12, 100), receipt("pack", "pcs", 2, 100)]);
  assert.equal(summary.complete, false);
  assert.equal(summary.total, 0);
  assert.deepEqual(summary.lines.map(line => line.reason),
    ["broken_base_unit", "broken_base_unit", "broken_base_unit", "broken_base_unit", "missing_cost_basis"]);
});

test("canonical zero cost is known, while unknown cost and wrong currency remain excluded", () => {
  const summary = summarize([
    { productKey: "free", current: 2, unit: "kg" },
    { productKey: "unknown", current: 2, unit: "l" },
    { productKey: "eur", current: 2, unit: "kg" },
  ], [receipt("free", "kg", 2, 0), receipt("unknown", "l", 2, 0, { costStatus: "UNKNOWN" }),
    receipt("eur", "kg", 2, 100, { currency: "EUR" })]);
  assert.equal(summary.complete, false);
  assert.equal(summary.valuedCount, 1);
  assert.deepEqual(summary.lines.map(line => [line.status, line.value, line.reason ?? null]),
    [["valued", 0, null], ["unvalued", 0, "missing_cost_basis"], ["unvalued", 0, "currency_mismatch"]]);
});

test("canonical negative stock remains a diagnostic and zero stock stays excluded", () => {
  const summary = summarize([{ productKey: "negative", current: -2, unit: "kg" },
    { productKey: "zero", current: 0, unit: "l" }], [receipt("negative", "kg", 2, 100)]);
  assert.equal(summary.complete, false);
  assert.equal(summary.total, 0);
  assert.deepEqual(summary.breakdown, { negative_stock: 1 });
  assert.equal(summary.zeroStockExcluded, 1);
});

test("unknown latest price never silently falls back to an older known receipt", () => {
  const summary = summarize([{ productKey: "kg", current: 12, unit: "kg" }],
    [receipt("kg", "kg", 10, 100), receipt("kg", "kg", 2, 0,
      { id: "new", businessDate: "2026-09-05", costStatus: "UNKNOWN" })]);
  assert.equal(summary.complete, false);
  assert.equal(summary.total, 0);
  assert.equal(summary.lines[0].reason, "missing_cost_basis");
});

test("canonical values do not become known without an accounting or receipt currency", () => {
  const balances = [{ productKey: "kg", current: 2, unit: "kg" }];
  const noProfile = summarize(balances, [receipt("kg", "kg", 2, 100)], { accountingCurrency: null });
  assert.equal(noProfile.status, "currency_missing");
  assert.equal(noProfile.lines[0].reason, "missing_cost_currency");
  const noReceiptCurrency = summarize(balances, [receipt("kg", "kg", 2, 100, { currency: "" })]);
  assert.equal(noReceiptCurrency.complete, false);
  assert.equal(noReceiptCurrency.total, 0);
  assert.equal(noReceiptCurrency.lines[0].reason, "currency_mismatch");
});

test("supported unit aliases retain their physical quantity and unknown units remain explicit", () => {
  const summary = summarize([{ productKey: "mass", current: 2, unit: "кг" },
    { productKey: "volume", current: 3, unit: "л." },
    { productKey: "unknown", current: 2, unit: "bucket" }],
  [receipt("mass", "g", 1000, 10), receipt("volume", "ml", 1000, 10)]);
  assert.deepEqual(summary.lines.map(line => [line.quantity, line.unit, line.value]),
    [[2, "kg", 20], [3, "l", 30], [2, "bucket", 0]]);
  assert.equal(summary.lines[2].reason, "broken_base_unit");
  assert.equal(summary.complete, false);
});

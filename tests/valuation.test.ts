import assert from "node:assert/strict";
import test from "node:test";
import {
  INVENTORY_VALUATION_METHOD,
  resolvePurchaseLineAccountingCost,
  summarizeInventoryValuation,
} from "../lib/bardoctor/valuation";

test("partial valuation keeps the known sum and counts only active non-zero stock", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [
      { key: "a", name: "A", current: 10, unit: "pcs", inventoryValue: 100, currency: "RUB" },
      { key: "b", name: "B", current: 2_000, unit: "ml", averageUnitCost: 0.05, currency: "RUB", displayUnit: "l" },
      { key: "c", name: "C", current: 3, unit: "pcs", inventoryValue: 0, currency: "RUB", source: "manual" },
      { key: "zero", current: 0, unit: "pcs", inventoryValue: 0 },
      { key: "archived", current: 100, unit: "pcs", inventoryValue: 999, currency: "RUB", archived: true },
    ],
  });
  assert.equal(summary.method, INVENTORY_VALUATION_METHOD);
  assert.equal(summary.total, 200);
  assert.equal(summary.status, "partial");
  assert.equal(summary.valuedCount, 2);
  assert.equal(summary.unvaluedCount, 1);
  assert.equal(summary.denominator, 3);
  assert.equal(summary.zeroStockExcluded, 1);
  assert.deepEqual(summary.breakdown, { missing_cost_basis: 1 });
});

test("zero stock without cost never blocks a complete valuation", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "MDL",
    balances: [{ key: "zero", current: 0, unit: "pcs", averageUnitCost: 0, currency: "" }],
  });
  assert.equal(summary.total, 0);
  assert.equal(summary.complete, true);
  assert.equal(summary.unvaluedCount, 0);
  assert.equal(summary.denominator, 0);
});

test("negative stock is a separate diagnostic reason and is not hidden", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [{ key: "negative", current: -2, unit: "pcs", averageUnitCost: 10, currency: "RUB" }],
  });
  assert.equal(summary.status, "unvalued");
  assert.equal(summary.unvaluedCount, 1);
  assert.deepEqual(summary.breakdown, { negative_stock: 1 });
});

test("display units and package variants never change base-quantity valuation", () => {
  const variants = [
    { displayUnit: "ml", packageSize: "0.5 л" },
    { displayUnit: "l", packageSize: "0.7 л", multiplePackageSizes: true },
    { displayUnit: "pcs", displayPackageSize: "1 л" },
  ].map((presentation) => summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [{ current: 10_000, unit: "ml", averageUnitCost: 0.2377, currency: "RUB", ...presentation }],
  }).total);
  assert.deepEqual(variants, [2_377, 2_377, 2_377]);
});

test("stored normalized value is canonical for a cross-currency balance", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [{
      key: "eur-stock",
      current: 5,
      unit: "pcs",
      inventoryValue: 50,
      currency: "EUR",
      normalizedInventoryValue: 5_000,
      normalizedCostCurrency: "RUB",
    }],
  });
  assert.equal(summary.complete, true);
  assert.equal(summary.total, 5_000);
});

test("currencies are never summed directly when historical FX is missing", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [
      { key: "rub", current: 1, unit: "pcs", inventoryValue: 100, currency: "RUB" },
      { key: "eur", current: 1, unit: "pcs", inventoryValue: 50, currency: "EUR" },
    ],
  });
  assert.equal(summary.total, 100);
  assert.equal(summary.status, "partial");
  assert.deepEqual(summary.breakdown, { currency_mismatch: 1 });
});

test("explicit currency mismatch remains distinguishable from missing FX", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [{
      key: "mismatch",
      current: 1,
      unit: "pcs",
      inventoryValue: 50,
      currency: "EUR",
      costNeedsReview: true,
      costReviewReason: "currency_mismatch",
    }],
  });
  assert.deepEqual(summary.breakdown, { currency_mismatch: 1 });
});

test("legacy and opening quantities without prices receive precise reasons", () => {
  const summary = summarizeInventoryValuation({
    accountingCurrency: "RUB",
    balances: [
      { key: "legacy", current: 2, unit: "pcs", source: "1c-import" },
      { key: "opening", current: 3, unit: "pcs", source: "opening_balance" },
      { key: "broken", current: 4, unit: "unknown", inventoryValue: 10, currency: "RUB" },
    ],
  });
  assert.deepEqual(summary.breakdown, {
    historical_import_without_cost: 1,
    opening_balance_without_cost: 1,
    broken_base_unit: 1,
  });
});

test("purchase line preserves original currency and uses a stored normalized amount", () => {
  const result = resolvePurchaseLineAccountingCost({
    accountingCurrency: "RUB",
    document: { currency: "EUR" },
    line: { quantity: 2, unitPrice: 5, lineTotal: 10, normalizedLineTotal: 1_000, normalizedCurrency: "RUB" },
  });
  assert.equal(result.known, true);
  assert.equal(result.amount, 1_000);
  assert.equal(result.transactionAmount, 10);
  assert.equal(result.transactionCurrency, "EUR");
  assert.equal(result.source, "stored_normalized_amount");
});

test("purchase line uses only a stored historical rate and never a live rate", () => {
  const converted = resolvePurchaseLineAccountingCost({
    accountingCurrency: "RUB",
    document: { currency: "EUR", exchangeRateToAccounting: 100 },
    line: { quantity: 2, unitPrice: 5, lineTotal: 10 },
  });
  assert.equal(converted.amount, 1_000);
  assert.equal(converted.exchangeRate, 100);
  assert.equal(converted.source, "stored_historical_rate");

  const missing = resolvePurchaseLineAccountingCost({
    accountingCurrency: "RUB",
    document: { currency: "EUR" },
    line: { quantity: 2, unitPrice: 5, lineTotal: 10 },
  });
  assert.equal(missing.known, false);
  assert.equal(missing.reason, "missing_fx");
});

test("warehouse scope and venue accounting currency remain isolated inputs", () => {
  const balances = [
    { key: "a", warehouseId: "bar", current: 1, unit: "pcs", inventoryValue: 100, currency: "RUB" },
    { key: "b", warehouseId: "kitchen", current: 1, unit: "pcs", inventoryValue: 50, currency: "RUB" },
  ];
  assert.equal(summarizeInventoryValuation({ balances, accountingCurrency: "RUB", warehouseId: "bar" }).total, 100);
  assert.equal(summarizeInventoryValuation({ balances, accountingCurrency: "MDL", warehouseId: "bar" }).total, 0);
});

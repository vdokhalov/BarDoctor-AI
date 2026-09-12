import assert from "node:assert/strict";
import test from "node:test";

import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";
import { normalizeBaseUnitCost, resolveCostBasis } from "../lib/bardoctor/cost-basis";
import { applyInventoryCount, applyPurchaseToInventory, type StockMovement } from "../lib/bardoctor/inventory";
import { createOrUpdateSalesBatch, manualSalesAdapter, postSalesBatch } from "../lib/bardoctor/sales-consumption";
import { summarizeInventoryValuation } from "../lib/bardoctor/valuation";
import { postWriteOffDocument } from "../lib/bardoctor/write-offs";

const actor = { accountId: 7, name: "Phase 2 QA", role: "owner" };

function receipt(input: {
  id: string;
  productKey?: string;
  date: string;
  quantity: number;
  totalCost?: number;
  venueId?: number;
  warehouseId?: string;
  unit?: "g" | "ml" | "pcs";
  currency?: string;
}): StockMovement {
  const hasCost = input.totalCost !== undefined;
  return {
    id: input.id,
    venueId: input.venueId ?? 1,
    warehouseId: input.warehouseId,
    type: "receipt",
    date: input.date,
    productKey: input.productKey ?? "coffee",
    productName: input.productKey ?? "Coffee",
    amount: input.quantity,
    unit: input.unit ?? "g",
    costAmount: input.totalCost,
    costStatus: hasCost ? input.totalCost === 0 ? "KNOWN_ZERO" : "KNOWN" : "UNKNOWN",
    currency: hasCost ? input.currency ?? "RUB" : undefined,
    sourceDocumentId: `purchase:${input.id}`,
    sourceLineId: `line:${input.id}`,
    createdAt: `${input.date}T10:00:00.000Z`,
    status: "active",
  };
}

test("CostBasisResolver uses latest confirmed receipt with strict as-of semantics, not weighted average", () => {
  const receipts = [
    receipt({ id: "a", date: "2026-09-01", quantity: 10, totalCost: 100, unit: "pcs" }),
    receipt({ id: "b", date: "2026-09-10", quantity: 10, totalCost: 200, unit: "pcs" }),
  ];
  const before = resolveCostBasis({ venueId: 1, nomenclatureItem: "coffee", baseUnit: "pcs", asOf: "2026-09-05", receipts, accountingCurrency: "RUB" });
  const after = resolveCostBasis({ venueId: 1, nomenclatureItem: "coffee", baseUnit: "pcs", asOf: "2026-09-12", receipts, accountingCurrency: "RUB" });
  assert.deepEqual([before.status, before.value, before.sourceDocumentId], ["KNOWN_VALUE", 10, "purchase:a"]);
  assert.deepEqual([after.status, after.value, after.sourceDocumentId], ["KNOWN_VALUE", 20, "purchase:b"]);
  assert.notEqual(after.value, 15, "moving weighted average must not become the operational cost");
});

test("CostBasisResolver keeps explicit zero distinct from unknown", () => {
  const knownZero = resolveCostBasis({ venueId: 1, nomenclatureItem: "free", asOf: "2026-09-12", receipts: [receipt({ id: "zero", productKey: "free", date: "2026-09-01", quantity: 2, totalCost: 0, unit: "pcs" })] });
  const unknown = resolveCostBasis({ venueId: 1, nomenclatureItem: "missing", asOf: "2026-09-12", receipts: [receipt({ id: "unknown", productKey: "missing", date: "2026-09-01", quantity: 2, unit: "pcs" })] });
  assert.deepEqual({ known: knownZero.known, status: knownZero.status, value: knownZero.value }, { known: true, status: "KNOWN_ZERO", value: 0 });
  assert.deepEqual({ known: unknown.known, status: unknown.status, value: unknown.value }, { known: false, status: "UNKNOWN", value: null });
});

test("CostBasisResolver preserves venue and warehouse isolation", () => {
  const receipts = [
    receipt({ id: "venue-1", date: "2026-09-01", quantity: 1, totalCost: 10, unit: "pcs", venueId: 1, warehouseId: "bar" }),
    receipt({ id: "venue-2", date: "2026-09-02", quantity: 1, totalCost: 99, unit: "pcs", venueId: 2, warehouseId: "bar" }),
    receipt({ id: "kitchen", date: "2026-09-03", quantity: 1, totalCost: 30, unit: "pcs", venueId: 1, warehouseId: "kitchen" }),
  ];
  assert.equal(resolveCostBasis({ venueId: 1, warehouseId: "bar", nomenclatureItem: "coffee", baseUnit: "pcs", asOf: "2026-09-12", receipts }).value, 10);
  assert.equal(resolveCostBasis({ venueId: 1, warehouseId: "kitchen", nomenclatureItem: "coffee", baseUnit: "pcs", asOf: "2026-09-12", receipts }).value, 30);
  assert.equal(resolveCostBasis({ venueId: 2, warehouseId: "bar", nomenclatureItem: "coffee", baseUnit: "pcs", asOf: "2026-09-12", receipts }).value, 99);
  const valuation = summarizeInventoryValuation({
    balances: [{ productKey: "coffee", current: 5, unit: "pcs", currency: "RUB", warehouseBalances: { bar: { current: 2 }, kitchen: { quantity: 3 } } }],
    stockMovements: receipts,
    venueId: 1,
    accountingCurrency: "RUB",
    asOf: "2026-09-12",
  });
  assert.equal(valuation.total, 110);
  assert.equal(summarizeInventoryValuation({ balances: [{ productKey: "coffee", current: 5, unit: "pcs", currency: "RUB", warehouseBalances: { bar: { current: 2 }, kitchen: { quantity: 3 } } }], stockMovements: receipts, venueId: 1, accountingCurrency: "RUB", warehouseId: "bar", asOf: "2026-09-12" }).total, 20);
});

test("purchase packaging normalizes base quantity and cost on the same unit basis", () => {
  const pieces = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [{ id: "bottle", key: "bottle", productKey: "bottle", name: "Bottle", kind: "stock", unit: "pcs", venueId: 1, active: true, packageSize: "1 шт." }], recipes: [] },
    document: { id: "packages", venueId: 1, date: "2026-09-01", currency: "RUB", items: [{ id: "line", name: "Bottle", purchaseProductKey: "bottle", quantity: 2, unit: "шт.", packageSize: "12 x 1 шт", quantityMode: "count", lineTotal: 240, unitPrice: 120, category: "products" }] },
    accountingCurrency: "RUB",
    now: "2026-09-01T10:00:00.000Z",
  });
  const litres = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [{ id: "water", key: "water", productKey: "water", name: "Water", kind: "stock", unit: "ml", venueId: 1, active: true, packageSize: "1.25 л" }], recipes: [] },
    document: { id: "litres", venueId: 1, date: "2026-09-01", currency: "RUB", items: [{ id: "line", name: "Water", purchaseProductKey: "water", quantity: 6, unit: "шт.", packageSize: "1.25 л", quantityMode: "count", lineTotal: 150, unitPrice: 25, category: "products" }] },
    accountingCurrency: "RUB",
    now: "2026-09-01T10:00:00.000Z",
  });
  assert.deepEqual([pieces.movements[0].amount, pieces.movements[0].unit, pieces.movements[0].unitCostAmount], [24, "pcs", 10]);
  assert.deepEqual([litres.movements[0].amount, litres.movements[0].unit, litres.movements[0].unitCostAmount], [7_500, "ml", 0.02]);
  assert.equal(normalizeBaseUnitCost({ baseQuantity: 7.5, totalCost: 150 }).value, 20);
});

function recipeAssortment() {
  return {
    menuItems: [{ id: "espresso", name: "Espresso", department: "bar", active: true, venueId: 1 }],
    recipes: [{ id: "recipe-1", menuItemId: "espresso", ownerId: "espresso", version: 1, status: "confirmed", reviewStatus: "approved", current: true, ingredients: [{ id: "coffee-line", name: "Coffee beans", nomenclatureItemId: "coffee", purchaseProductKey: "coffee", quantity: 8, unit: "g", normalizedQuantity: 8, normalizedUnit: "g", unitResolutionStatus: "exact_compatible" }] }],
    stockBalances: [{ productKey: "coffee", name: "Coffee beans", venueId: 1, current: 2_000, unit: "g", averageUnitCost: 999, inventoryValue: 1_998_000, currency: "RUB" }],
  };
}

test("recipe sales persist as-of ingredient snapshots and later receipts cannot rewrite history", () => {
  const receipts = [
    receipt({ id: "a", date: "2026-09-01", quantity: 1_000, totalCost: 100 }),
    receipt({ id: "b", date: "2026-09-10", quantity: 1_000, totalCost: 200 }),
  ];
  const early = createOrUpdateSalesBatch({
    batches: [],
    draft: manualSalesAdapter.parse({ businessDate: "2026-09-05", lines: [{ id: "sale-early", rawName: "Espresso", menuItemId: "espresso", quantity: 1 }] }),
    assortment: recipeAssortment(), mappings: [], warehouseRoutes: [], stockMovements: receipts, venueId: 1, actor,
    now: "2026-09-05T12:00:00.000Z",
  });
  assert.equal(early.ok, true);
  if (!early.ok) return;
  assert.equal(early.batch.lines[0].theoreticalCost, 0.8);
  const posted = postSalesBatch({ batches: early.batches, batchId: early.batch.id, assortment: recipeAssortment(), mappings: [], warehouseRoutes: [], stockMovements: receipts, venueId: 1, actor, now: "2026-09-05T12:01:00.000Z" });
  assert.equal(posted.ok, true);
  if (!posted.ok) return;
  const historicalSnapshot = structuredClone(posted.batch.lines[0].recipeSnapshot);
  const late = createOrUpdateSalesBatch({
    batches: posted.batches,
    draft: manualSalesAdapter.parse({ businessDate: "2026-09-12", lines: [{ id: "sale-late", rawName: "Espresso", menuItemId: "espresso", quantity: 1 }] }),
    assortment: posted.assortment, mappings: [], warehouseRoutes: [], stockMovements: posted.stockMovements, venueId: 1, actor,
    now: "2026-09-12T12:00:00.000Z",
  });
  assert.equal(late.ok, true);
  if (!late.ok) return;
  assert.equal(late.batch.lines[0].theoreticalCost, 1.6);
  assert.deepEqual(posted.batch.lines[0].recipeSnapshot, historicalSnapshot);
  assert.equal(posted.stockMovements.find((movement) => movement.type === "sale_consumption")?.costAmount, -0.8);
  const currentAnalytics = buildAssortmentAnalytics({
    assortment: posted.assortment,
    purchaseDocuments: [],
    stockMovements: receipts,
    venueId: 1,
    now: new Date("2026-09-12T12:00:00.000Z"),
  });
  assert.equal(currentAnalytics.menuItems.find((item) => item.id === "espresso")?.recipeCost, 1.6);
});

test("write-off snapshot uses latest receipt as-of posting and remains immutable", () => {
  const receipts = [
    receipt({ id: "a", productKey: "bottle", date: "2026-09-01", quantity: 10, totalCost: 100, unit: "pcs" }),
    receipt({ id: "b", productKey: "bottle", date: "2026-09-10", quantity: 10, totalCost: 200, unit: "pcs" }),
  ];
  const result = postWriteOffDocument({
    documents: [], assortment: { stockBalances: [{ productKey: "bottle", venueId: 1, name: "Bottle", current: 20, unit: "pcs", averageUnitCost: 15, inventoryValue: 300, currency: "RUB" }] }, stockMovements: receipts,
    venueId: 1, draft: { id: "wo", date: "2026-09-12", reasonCode: "breakage", items: [{ productKey: "bottle", quantity: 3, unit: "pcs" }] }, actor, allowNegativeStock: false, now: "2026-09-12T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.totalCost, 60);
  const frozen = structuredClone(result.document);
  receipts.push(receipt({ id: "c", productKey: "bottle", date: "2026-09-13", quantity: 10, totalCost: 300, unit: "pcs" }));
  assert.deepEqual(result.document, frozen);
  assert.equal(result.stockMovements.find((movement) => movement.type === "writeoff")?.costAmount, -60);
});

test("inventory adjustment snapshots latest receipt cost instead of mutable average", () => {
  const receipts = [
    receipt({ id: "a", productKey: "bottle", date: "2026-09-01", quantity: 10, totalCost: 100, unit: "pcs" }),
    receipt({ id: "b", productKey: "bottle", date: "2026-09-10", quantity: 10, totalCost: 200, unit: "pcs" }),
  ];
  const result = applyInventoryCount({
    assortment: { stockBalances: [{ productKey: "bottle", venueId: 1, name: "Bottle", current: 20, unit: "pcs", averageUnitCost: 15, inventoryValue: 300, currency: "RUB" }] },
    stockMovements: receipts, venueId: 1, accountingCurrency: "RUB",
    snapshot: { id: "count", date: "2026-09-12", items: [{ id: "line", productKey: "bottle", actual: 17 }] },
    now: "2026-09-12T10:00:00.000Z",
  });
  assert.equal(result.movements[0].costAmount, -60);
  assert.equal(result.movements[0].costStatus, "KNOWN");
  assert.equal((result.assortment.stockBalances as Array<Record<string, unknown>>)[0].inventoryValue, 340);
});

test("current valuation and historical COGS use their respective canonical snapshots", () => {
  const receipts = [
    receipt({ id: "a", productKey: "bottle", date: "2026-09-01", quantity: 10, totalCost: 100, unit: "pcs" }),
    receipt({ id: "b", productKey: "bottle", date: "2026-09-10", quantity: 10, totalCost: 200, unit: "pcs" }),
  ];
  const valuation = summarizeInventoryValuation({ balances: [{ productKey: "bottle", venueId: 1, name: "Bottle", current: 15, unit: "pcs", averageUnitCost: 15, currency: "RUB" }], stockMovements: receipts, venueId: 1, accountingCurrency: "RUB", asOf: "2026-09-12" });
  assert.equal(valuation.total, 300);
  const analytics = buildAssortmentAnalytics({
    assortment: { menuItems: [{ id: "bottle-menu", name: "Bottle", active: true, type: "service", salePrice: 50, currency: "RUB" }], recipes: [], stockBalances: [] },
    purchaseDocuments: [],
    salesDocuments: [{ id: "sale-doc", venueId: 1, status: "confirmed", date: "2026-09-05", totalRevenue: 100, salesBatchId: "batch-1", items: [{ id: "sale-line", menuItemId: "bottle-menu", name: "Bottle", quantity: 2, grossSales: 100 }] }],
    salesBatches: [{ id: "batch-1", venueId: 1, status: "POSTED", totalTheoreticalCost: 20, costStatus: "FULL", lines: [{ id: "sale-line", externalLineId: "sale-line", menuItemId: "bottle-menu", processingStatus: "POSTED", theoreticalCost: 20 }] }],
    venueId: 1, period: "2026-09", now: new Date("2026-09-12T12:00:00.000Z"),
  });
  assert.equal(analytics.economics.costOfGoods, 20);
  assert.equal(analytics.economics.grossMargin, 80);
  assert.equal(analytics.menuItems[0].sales?.costOfGoods, 20);
  assert.equal(analytics.menuItems[0].sales?.grossProfit, 80);
});

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { normalizePurchaseQuantity, convertStockQuantity, validatePurchaseConversionSnapshot } from "../lib/bardoctor/stock-units";
import { normalizePurchaseDocument } from "../lib/bardoctor/purchases";
import { preparePurchaseConversions } from "../lib/bardoctor/purchase-conversion";
import { applyPurchaseToInventory, applyInventoryCount, consolidateInventoryDuplicates, purchaseLineBaseAmount, repairInventoryPurchaseAmounts } from "../lib/bardoctor/inventory";
import { createInventoryCountDocument, updateInventoryCountDocument } from "../lib/bardoctor/inventory-counts";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";
import { manualSalesAdapter, createOrUpdateSalesBatch, postSalesBatch } from "../lib/bardoctor/sales-consumption";
import { postWriteOffDocument } from "../lib/bardoctor/write-offs";
import { procurementPricePoints } from "../lib/bardoctor/procurement-analytics";
import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";

type Row = Record<string, unknown>;
const now = "2026-09-08T12:00:00.000Z";
const actor = { accountId: 7, name: "QA", role: "owner" };
function persisted<T>(value: T): T {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE state (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
    db.prepare("INSERT INTO state VALUES (?, ?)").run("state", JSON.stringify(value));
    return JSON.parse((db.prepare("SELECT data FROM state WHERE id = ?").get("state") as { data: string }).data) as T;
  } finally { db.close(); }
}

function purchase(quantity: number, unit: string, price: number, stockUnit: string,
  packageContent?: {quantity: number; unit: string}) {
  const assortment: Row = { nomenclature: [{ id: "product", key: "product", productKey: "product",
    venueId: 1, name: "Product", unit: stockUnit, unitModelVersion: 4, active: true }], stockBalances: [] };
  const raw = { id: "purchase", venueId: 1, date: "2026-09-08", documentType: "invoice",
    currency: "RUB", total: quantity * price, status: "confirmed", items: [{ id: "line", name: "Product",
      purchaseProductKey: "product", quantity, unit, unitPrice: price, lineTotal: quantity * price,
      category: "products", packageContent }] };
  const prepared = preparePurchaseConversions(normalizePurchaseDocument(raw, "purchase"), raw, assortment);
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  const document = persisted(prepared.document);
  const result = persisted(applyPurchaseToInventory({ assortment: persisted(assortment), document,
    accountingCurrency: "RUB", stockMovements: [], now }));
  assert.deepEqual(result.summary.unresolvedLines, []);
  assert.equal(result.movements.length, 1);
  return { ...result, document };
}

for (const [scenario, quantity, unit, price, stockUnit, content, expected, cost] of [
  ["A", 24, "pcs", 15, "pcs", undefined, 24, 15],
  ["B", 2, "boxes", 180, "pcs", { quantity: 12, unit: "pcs" }, 24, 15],
  ["C", 6, "bottles", 200, "l", { quantity: 0.7, unit: "l" }, 4.2, 1200 / 4.2],
  ["F", 12, "pcs", 15, "pcs", undefined, 12, 15],
] as const) {
  test(`${scenario}: input -> conversion -> SQLite reload -> receipt -> canonical cost`, () => {
    const result = purchase(quantity, unit, price, stockUnit, content);
    const balance = (result.assortment.stockBalances as Row[])[0];
    assert.equal(balance.unit, stockUnit);
    assert.equal(balance.current, expected);
    assert.equal(result.movements[0].amount, expected);
    assert.equal(result.movements[0].unit, stockUnit);
    assert.equal(result.movements[0].costAmount, quantity * price);
    const basis = resolveCostBasis({ venueId: 1, nomenclatureItem: { productKey: "product", unit: stockUnit },
      asOf: now, receipts: result.movements, accountingCurrency: "RUB" });
    assert.ok(Math.abs((basis.value ?? -1) - cost) < 0.000001);
    assert.deepEqual(result.movements[0].purchaseConversion, result.document.items[0].purchaseConversion);
    const prices = procurementPricePoints([result.document], { venueId: 1 });
    assert.equal(prices[0].baseUnit, stockUnit);
    assert.equal(prices[0].normalizedDisplayPrice, Math.round(cost * 100) / 100);
  });
}

test("physical conversions and invalid dimensions fail closed without package guesses", () => {
  assert.equal(convertStockQuantity(500, "ml", "l"), 0.5);
  assert.equal(convertStockQuantity(8, "g", "kg"), 0.008);
  assert.equal(convertStockQuantity(12, "pcs", "pcs"), 12);
  for (const [from, to] of [["kg", "l"], ["l", "pcs"], ["pcs", "kg"], ["boxes", "pcs"]]) {
    assert.equal(convertStockQuantity(2, from, to), null);
    assert.equal(normalizePurchaseQuantity({ quantity: 2, unit: from, stockUnit: to, price: 15 }).ok, false);
  }
});

test("H: incompatible purchase is rejected before posting and preserves persisted input", () => {
  const root = persisted({ nomenclature: [{ id: "weight", key: "weight", unit: "kg", unitModelVersion: 4, venueId: 1 }], stockBalances: [] });
  const raw = { id: "invalid", venueId: 1, date: "2026-09-08", currency: "RUB", total: 20,
    items: [{ id: "line", name: "Product", purchaseProductKey: "weight", quantity: 2, unit: "l", unitPrice: 10, lineTotal: 20, category: "products" }] };
  const before = structuredClone({ root, raw });
  const result = preparePurchaseConversions(normalizePurchaseDocument(raw, "invalid"), raw, root);
  assert.equal(result.ok, false);
  assert.deepEqual({ root, raw }, before);
  if (!result.ok) assert.equal(result.issues.length, 1);
});

test("canonical history survives normalize/reload and automatic legacy consolidation unchanged", () => {
  const result = purchase(2, "boxes", 180, "pcs", { quantity: 12, unit: "pcs" });
  const before = structuredClone(result);
  const reloaded = persisted(normalizePurchaseDocument(result.document, "purchase"));
  assert.deepEqual(reloaded.items[0].purchaseConversion, before.document.items[0].purchaseConversion);
  const root = structuredClone(result.assortment);
  (root.nomenclature as Row[])[0].packageSize = "24 pcs";
  const consolidated = consolidateInventoryDuplicates({ assortment: root, stockMovements: result.movements, now });
  assert.deepEqual(consolidated.stockMovements, before.movements);
  assert.deepEqual(consolidated.assortment, root);
  const repaired = repairInventoryPurchaseAmounts({ assortment: root, stockMovements: result.movements,
    purchaseDocuments: [reloaded], now });
  assert.equal(repaired.summary.changed, false);
  assert.deepEqual(repaired.stockMovements, before.movements);
  assert.deepEqual(repaired.assortment, root);
  assert.deepEqual(purchaseLineBaseAmount(reloaded.items[0]), { amount: 24, unit: "pcs" });
  const bad = normalizePurchaseDocument({ ...result.document, items: [{ ...result.document.items[0],
    purchaseConversion: { ...result.document.items[0].purchaseConversion, canonicalQuantity: 48 } }] }, "purchase");
  assert.equal(purchaseLineBaseAmount(bad.items[0]).unit, "unknown");
});

test("legacy ml receipt is read as cost per l without rewriting historical quantity", () => {
  const receipts = persisted([{ id: "legacy", type: "receipt", venueId: 1, productKey: "product",
    amount: 4200, unit: "ml", costAmount: 1200, currency: "RUB", date: "2026-09-01", status: "active" }]);
  const before = structuredClone(receipts);
  const cost = resolveCostBasis({ venueId: 1, nomenclatureItem: { productKey: "product", unit: "l" },
    asOf: now, receipts, accountingCurrency: "RUB" });
  assert.equal(cost.baseUnit, "l");
  assert.ok(Math.abs(Number(cost.value) - 1200 / 4.2) < 0.000001);
  assert.deepEqual(receipts, before);
});

test("a canonical receipt converts live warehouse quantities but preserves historical movement and money", () => {
  const next = purchase(1, "l", 200, "l");
  const legacy = persisted({ nomenclature: [{ id: "product", key: "product", unit: "ml", venueId: 1 }],
    stockBalances: [{ key: "product", productKey: "product", unit: "ml", current: 1000,
      onOrder: 2000, inventoryValue: 100, currency: "RUB", venueId: 1,
      warehouseBalances: { bar: { current: 750, quantity: 750, onHand: 750, inventoryValue: 75 },
        store: { current: 250, inventoryValue: 25 } } }] });
  const history = persisted([{ id: "old", type: "sale", productKey: "product", amount: -50, unit: "ml",
    costAmount: 5, venueId: 1, consumptionSnapshot: { amount: 50, unit: "ml", cost: 5 } }]);
  const before = structuredClone({ legacy, history });
  const result = persisted(applyPurchaseToInventory({ assortment: legacy, document: next.document,
    stockMovements: history, accountingCurrency: "RUB", now }));
  assert.deepEqual(result.summary.unresolvedLines, []);
  const balance = (result.assortment.stockBalances as Row[])[0];
  assert.equal(balance.current, 2);
  assert.equal(balance.onOrder, 1);
  assert.equal(balance.unit, "l");
  assert.deepEqual(balance.warehouseBalances, { bar: { current: 0.75, quantity: 0.75, onHand: 0.75, inventoryValue: 75 },
    store: { current: 0.25, inventoryValue: 25 } });
  assert.deepEqual({ legacy, history }, before);
});

test("G/J: templates are venue-scoped and captured content survives template edits and reload", () => {
  const templates = persisted([
    { id: "box", venueId: 1, nomenclatureId: "product", size: 12, unit: "pcs" as const },
    { id: "box", venueId: 2, nomenclatureId: "product", size: 24, unit: "pcs" as const },
  ]);
  const input = { quantity: 2, unit: "boxes", stockUnit: "pcs", price: 180, templateId: "box", nomenclatureId: "product", venueId: 1 };
  const conversion = normalizePurchaseQuantity(input, templates);
  assert.equal(conversion.ok, true);
  if (!conversion.ok) return;
  const snapshot = persisted(conversion.snapshot);
  const before = structuredClone(snapshot);
  templates[0].size = 24;
  const reloadedTemplates = persisted(templates);
  assert.deepEqual(validatePurchaseConversionSnapshot(snapshot), before);
  assert.equal(snapshot.canonicalQuantity, 24);
  const other = normalizePurchaseQuantity({ ...input, venueId: 2 }, reloadedTemplates);
  assert.equal(other.ok && other.snapshot.canonicalQuantity, 48);
  assert.equal(normalizePurchaseQuantity({ ...input, venueId: 3 }, templates).ok, false);
  assert.equal(validatePurchaseConversionSnapshot({ ...snapshot, canonicalQuantity: 48 }), null);
  const document = normalizePurchaseDocument({ id: "repost", venueId: 1, currency: "RUB", total: 360,
    items: [{ id: "line", name: "Product", category: "products", quantity: 2, unit: "boxes", unitPrice: 180,
      lineTotal: 360, packagingTemplateId: "box", purchaseProductKey: "product", purchaseConversion: snapshot }] }, "repost");
  const repost = preparePurchaseConversions(document, document, { packagingTemplates: reloadedTemplates }, true);
  assert.equal(repost.ok, true);
  if (repost.ok) assert.deepEqual(repost.document.items[0].purchaseConversion, before);
});

function sale(result: ReturnType<typeof purchase>, mode: string, quantity: number) {
  const assortment = persisted(result.assortment);
  assortment.menuItems = [{ id: "menu", name: "Sale", venueId: 1, active: true, consumptionMode: mode,
    ...(mode === "FIXED_QUANTITY" || mode === "DIRECT_ITEM" ? {
      readyProduct: { nomenclatureItemId: "product", productKey: "product", packagesPerSale: 1 },
      ...(mode === "FIXED_QUANTITY" ? { saleSize: { quantity: 50, unit: "ml" } } : {}),
    } : {}) }];
  if (mode === "RECIPE") assortment.recipes = [{ id: "recipe", menuItemId: "menu", ownerId: "menu", venueId: 1,
    current: true, status: "confirmed", reviewStatus: "approved", ingredients: [{ id: "ingredient",
      name: "Product", nomenclatureItemId: "product", purchaseProductKey: "product", quantity: 8, unit: "g" }] }];
  const draft = manualSalesAdapter.parse({ businessDate: "2026-09-08", lines: [{ id: "sale-line", menuItemId: "menu", rawName: "Sale", quantity }] });
  const saved = createOrUpdateSalesBatch({ batches: [], draft, assortment: persisted(assortment), mappings: [],
    warehouseRoutes: [], stockMovements: result.movements, venueId: 1, actor, now });
  assert.equal(saved.ok, true);
  const posted = postSalesBatch({ batches: persisted(saved.batches), batchId: saved.batch.id,
    assortment: persisted(assortment), mappings: [], warehouseRoutes: [], stockMovements: result.movements, venueId: 1, actor, now });
  assert.equal(posted.ok, true, JSON.stringify(posted));
  return persisted(posted);
}

test("D: 8 g recipe x 10 consumes 0.08 kg from a persisted 1 kg receipt", () => {
  const result = sale(purchase(1, "kg", 300, "kg"), "RECIPE", 10);
  assert.equal((result.assortment.stockBalances as Row[])[0].current, 0.92);
  const analytics = buildAssortmentAnalytics({ assortment: result.assortment,
    stockMovements: result.stockMovements, venueId: 1, now: new Date(now) });
  assert.equal(analytics.menuItems[0].recipeCost, 2.4);
  assert.equal(analytics.menuItems[0].ingredientRows[0].unit, "kg");
  assert.equal(analytics.menuItems[0].ingredientRows[0].amount, 0.008);
});
test("E: fixed 50 ml x 4 consumes 0.2 l from a persisted 1 l receipt", () => {
  const result = sale(purchase(1, "l", 400, "l"), "FIXED_QUANTITY", 4);
  assert.equal((result.assortment.stockBalances as Row[])[0].current, 0.8);
});
test("DIRECT_ITEM and NONE need no purchase package configuration", () => {
  const input = purchase(24, "pcs", 15, "pcs");
  assert.equal((sale(input, "DIRECT_ITEM", 5).assortment.stockBalances as Row[])[0].current, 19);
  assert.equal((sale(input, "NONE", 10).assortment.stockBalances as Row[])[0].current, 24);
});

test("I: canonical count 4 x 0.7 l against 3 l adjusts only -0.2 l", () => {
  const input = purchase(3, "l", 200, "l");
  const draft = persisted(createInventoryCountDocument({ assortment: input.assortment, stockMovements: input.movements,
    venueId: 1, sequenceNumber: 1, scope: { type: "all", label: "All" }, creator: actor, now }));
  const counted = persisted(updateInventoryCountDocument({ document: draft, items: [{ productKey: "product",
    quantity: 4, unit: "bottles", packageContent: { quantity: 0.7, unit: "l" } }], now }));
  assert.equal(counted.items[0].actual, 2.8);
  assert.equal(counted.items[0].unit, "l");
  assert.throws(() => updateInventoryCountDocument({ document: draft, items: [{ productKey: "product", quantity: 2, unit: "kg" }] }));
  const result = persisted(applyInventoryCount({ assortment: input.assortment, stockMovements: input.movements,
    venueId: 1, snapshot: counted, now }));
  assert.deepEqual(result.summary.unresolvedLines, []);
  assert.equal((result.assortment.stockBalances as Row[])[0].current, 2.8);
  assert.equal(result.movements[0].amount, -0.2);
  assert.equal(result.movements[0].unit, "l");
});

test("50 ml write-off persists -0.05 l and canonical cost", () => {
  const input = purchase(1, "l", 400, "l");
  const result = postWriteOffDocument({ documents: [], assortment: input.assortment, stockMovements: input.movements,
    venueId: 1, actor, now, allowNegativeStock: false, draft: { id: "wo", date: "2026-09-08", reasonCode: "spoilage",
      items: [{ productKey: "product", quantity: 50, unit: "ml" }] } });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  const saved = persisted(result);
  assert.equal(saved.stockMovements[0].amount, -0.05);
  assert.equal(saved.stockMovements[0].unit, "l");
  assert.equal(saved.document.totalCost, 20);
});

test("sub-gram write-off retains canonical precision rather than rounding a physical amount to zero", () => {
  const input = purchase(1, "kg", 300, "kg");
  const result = postWriteOffDocument({ documents: [], assortment: input.assortment, stockMovements: input.movements,
    venueId: 1, actor, now, allowNegativeStock: false, draft: { id: "fine", date: "2026-09-08", reasonCode: "spoilage",
      items: [{ productKey: "product", quantity: 0.5, unit: "g" }] } });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(persisted(result).stockMovements[0].amount, -0.0005);
  assert.equal((result.assortment.stockBalances as Row[])[0].current, 0.9995);
});

test("J: identical template IDs in persisted venue-owned states post only each venue's captured content", () => {
  const posted = [1, 2].map((venueId) => {
    const root = persisted({ nomenclature: [{ id: "same-product", key: "same-key", unit: "pcs", unitModelVersion: 4, venueId }],
      stockBalances: [], packagingTemplates: [{ id: "same-template", venueId, nomenclatureId: "same-product",
        size: venueId === 1 ? 12 : 24, unit: "pcs" }] });
    const raw = { id: "same-document", venueId, date: "2026-09-08", currency: "RUB", total: 360,
      items: [{ id: "line", name: "Product", category: "products", quantity: 2, unit: "boxes", unitPrice: 180,
        lineTotal: 360, purchaseProductKey: "same-key", packagingTemplateId: "same-template" }] };
    const prepared = preparePurchaseConversions(normalizePurchaseDocument(raw, raw.id), raw, root);
    assert.equal(prepared.ok, true);
    const result = persisted(applyPurchaseToInventory({ assortment: root, document: persisted(prepared.document),
      stockMovements: [], accountingCurrency: "RUB", now }));
    assert.deepEqual(result.summary.unresolvedLines, []);
    assert.equal(result.movements[0].venueId, venueId);
    assert.equal(result.movements[0].purchaseConversion?.provenance.venueId, venueId);
    return result;
  });
  assert.equal(posted[0].movements[0].amount, 24);
  assert.equal(posted[1].movements[0].amount, 48);
  assert.equal((posted[0].assortment.stockBalances as Row[])[0].current, 24);
  assert.equal((posted[1].assortment.stockBalances as Row[])[0].current, 48);
});

test("literal legacy package is accepted on new confirmation, unknown box remains controlled review", () => {
  const root = { nomenclature: [{ id: "product", key: "product", unit: "ml", venueId: 1 }], stockBalances: [] };
  const raw = { id: "legacy-input", venueId: 1, date: "2026-09-08", currency: "RUB", total: 1200,
    items: [{ id: "line", name: "Whisky", category: "products", quantity: 6, unit: "pcs", unitPrice: 200,
      lineTotal: 1200, purchaseProductKey: "product", packageSize: "0.7 l" }] };
  const prepared = preparePurchaseConversions(normalizePurchaseDocument(raw, raw.id), raw, persisted(root));
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  const result = persisted(applyPurchaseToInventory({ assortment: root, document: persisted(prepared.document),
    stockMovements: [], accountingCurrency: "RUB", now }));
  assert.equal(result.movements[0].amount, 4.2);
  assert.equal(result.movements[0].unit, "l");
  const unknown = { ...raw, items: [{ ...raw.items[0], packageSize: "box" }] };
  assert.equal(preparePurchaseConversions(normalizePurchaseDocument(unknown, raw.id), unknown, root).ok, false);
});

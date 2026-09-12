import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import * as purchases from "../lib/bardoctor/purchases";
import * as conversion from "../lib/bardoctor/purchase-conversion";
import * as scope from "../lib/bardoctor/purchase-venue-scope";
import * as matching from "../lib/bardoctor/invoice-recognition-v2";
import * as sales from "../lib/bardoctor/sales-events";
import { inventoryPackageAmount, applyPurchaseToInventory } from "../lib/bardoctor/inventory";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";
import { resolveCanonicalPurchaseItem } from "../lib/bardoctor/nomenclature-identity";
import { physicalUnit, canonicalStockUnit } from "../lib/bardoctor/stock-units";
import * as nomenclatureIdentity from "../lib/bardoctor/nomenclature-identity";
import { manualReferencePrice } from "../lib/bardoctor/manual-reference-price";
import { changedConsumptionModeIssues } from "../lib/bardoctor/consumption-mode";

type Row = Record<string, unknown>;
type Line = Row & { id: string; name: string; rawName: string; unit: string; quantity: number;
  packageSize: string; unitPrice: number; lineTotal: number; purchaseProductKey?: string; nomenclatureId?: string; canonicalProductKey?: string };
type Stock = Row & { productKey: string; unit: string; current: number; packageOptions: string[]; packageAmount: number };
type Result = { document: ReturnType<typeof document>; event: { id: string; originalMovements: { costAmount: number }[] }; previewHash: string; code?: string };
const products = [
  { name: "TEST PH7 Крупа кг", unit: "kg", suffix: "g" },
  { name: "TEST PH7 Сироп л", unit: "l", suffix: "ml" },
  { name: "TEST PH7 Печенье шт", unit: "pcs", suffix: "pcs" },
].map(p => ({ ...p, id: `nom-${p.suffix}`, key: `stock:${p.name.toLowerCase()}|${p.suffix}`,
  productKey: `stock:${p.name.toLowerCase()}|${p.suffix}`, kind: "stock", venueId: 1, active: true,
  unitModelVersion: 4, packageSize: `1 ${p.unit}`, packageOptions: [`1 ${p.unit}`], packageAmount: 1,
  current: 0, currency: "MDL" }));

function fixture() {
  return { nomenclature: structuredClone(products), stockBalances: structuredClone(products),
    menuItems: [{ id: "combo", name: "TEST PH7 Комплект", venueId: 1, active: true, type: "composite", consumptionMode: "RECIPE", salePrice: 60, currency: "MDL" }],
    recipes: [{ id: "combo-recipe", menuItemId: "combo", ownerId: "combo", venueId: 1, version: 1, current: true, status: "confirmed", reviewStatus: "approved",
      ingredients: products.map(p => ({ id: `ingredient-${p.suffix}`, nomenclatureItemId: p.id, purchaseProductKey: p.key,
        name: p.name, quantity: 1, unit: p.unit, normalizedQuantity: 1, normalizedUnit: p.unit, venueId: 1 })) }] };
}
function document(id: string, quantity = 20, price = 10) {
  return { id, venueId: 1, documentType: "invoice", supplierId: "test-supplier", supplierName: "TEST Supplier",
    date: "2026-09-08", currency: "MDL", paymentMethod: "unknown", source: "manual", total: quantity * price * 3,
    items: products.map(p => ({ id: `line-${p.suffix}`, name: p.name, rawName: p.name,
      purchaseProductKey: p.key, nomenclatureId: p.id, quantity, unit: p.unit, packageSize: "1 шт.",
      unitPrice: price, lineTotal: quantity * price, category: "products", mappingSource: "manual" } as Line)) };
}
function runtime() {
  const r = openingRuntime();
  const deps = { ...purchases, ...conversion, ...scope, ...matching, INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots" };
  const confirm = r.loadRoute(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), deps);
  const update = r.loadRoute(new URL("../app/api/purchases/update/route.ts", import.meta.url), deps);
  const cancel = r.loadRoute(new URL("../app/api/purchases/cancel/route.ts", import.meta.url), deps);
  const repost = r.loadRoute(new URL("../app/api/purchases/repost/route.ts", import.meta.url), deps);
  const sale = r.loadRoute(new URL("../app/api/sales-events/route.ts", import.meta.url), sales);
  r.put("bd_assortment_v1", fixture());
  r.put("bd_suppliers", [{ id: "test-supplier", name: "TEST Supplier", venueId: 1, status: "active" }]);
  const send = async (api: typeof confirm, body: Row, status?: number) => {
    const response = await api.POST(new Request("http://localhost/api/test", { method: "POST",
      headers: { "Content-Type": "application/json", "X-Venue-Id": "1" }, body: JSON.stringify({ venueId: 1, ...body }) }));
    const result = await response.json() as Result;
    if (status) assert.equal(response.status, status, JSON.stringify(result));
    else assert.ok(response.ok, JSON.stringify({ status: response.status, result }));
    return result;
  };
  const allStores = () => r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id, store_key").all();
  const audit = () => r.sqlite.prepare("SELECT * FROM audit_log ORDER BY rowid").all();
  return { ...r, confirm, update, cancel, repost, sale, send, allStores, audit };
}
test("ambiguous legacy receipt repair rejects through the real route without any domain or audit writes", async () => {
  const r = runtime();
  const productsAPI = r.loadRoute(new URL("../app/api/inventory/products/route.ts", import.meta.url), {
    ...purchases, ...nomenclatureIdentity, canonicalStockUnit, manualReferencePrice, changedConsumptionModeIssues,
  });
  try {
    const key = "stock:коньяк нистру|ml";
    r.put("bd_assortment_v1", { stockBalances: [{ key, productKey: key, venueId: 1, name: "Коньяк Нистру",
      unit: "ml", current: 100_000, inventoryValue: 2_377, lastPurchasePrice: 118.85,
      externalProductKeys: ["legacy-nistru"], currency: "MDL" }] });
    r.put(purchases.PURCHASE_STORE_KEY, ["one", "two"].map(id => ({ id, venueId: 1, status: "confirmed", currency: "MDL",
      date: "2026-08-21", items: [{ id: "line-" + id, purchaseProductKey: "legacy-nistru", name: "Коньяк Нистру",
        category: "alcohol", quantity: 20, unit: "шт.", packageSize: "0,5 л", unitPrice: 118.85, lineTotal: 2_377 }] })));
    r.put("bd_stock_movements", []);
    const before = r.allStores(), auditBefore = r.audit(), batchesBefore = r.batches();
    for (let retry = 0; retry < 2; retry++) {
      const result = await r.send(productsAPI, { action: "repair" }, 422) as Result & { reviewState: string; issues: Row[] };
      assert.equal(result.code, "LEGACY_PURCHASE_CONVERSION_UNPROVEN");
      assert.equal(result.reviewState, "NEEDS_REVIEW");
      assert.deepEqual(result.issues.map(issue => issue.code), ["AMBIGUOUS_RECEIPT_EVIDENCE"]);
      assert.deepEqual(r.allStores(), before);
      assert.deepEqual(r.audit(), auditBefore);
      assert.equal(r.batches(), batchesBefore);
    }
  } finally { r.close(); }
});

function assertStock(r: ReturnType<typeof runtime>, quantity: number, unitCost: number) {
  const root = r.get("bd_assortment_v1") as { stockBalances: Stock[]; nomenclature: Row[] };
  assert.equal(root.stockBalances.length, 3, "Receipt must not split a manually selected stock identity");
  assert.equal(root.nomenclature.length, 3);
  for (const p of products) {
    const b = root.stockBalances.find(b => b.productKey === p.key);
    assert.ok(b, p.key); assert.equal(b.current, quantity); assert.equal(b.unit, p.unit);
    for (const label of b.packageOptions) {
      const pack = inventoryPackageAmount(label, b.unit, b.unit);
      assert.equal(pack.unit, p.unit); assert.ok(pack.amount > 0);
    }
    assert.equal(b.packageAmount, 1);
    const cost = resolveCostBasis({ venueId: 1, nomenclatureItem: p.key, baseUnit: physicalUnit(p.unit)!,
      asOf: "2026-09-30", receipts: r.get("bd_stock_movements") as unknown[], accountingCurrency: "MDL" });
    assert.equal(cost.value, unitCost, p.name);
  }
}

test("Phase 7 production identity regression: native structured keys survive receipt, new price, recipe sale, update and full refund", async () => {
  const r = runtime();
  try {
    const first = await r.send(r.confirm, { document: document("first") });
    assertStock(r, 20, 10);
    const firstMovements = r.get("bd_stock_movements");
    assert.equal((firstMovements as unknown[]).length, 3);
    const beforeRetry = r.allStores(), auditBeforeRetry = r.audit();
    await r.send(r.confirm, { document: document("first") });
    assert.deepEqual(r.allStores(), beforeRetry); assert.deepEqual(r.audit(), auditBeforeRetry);
    const renamed = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    for (const list of [renamed.nomenclature, renamed.stockBalances]) for (const p of list) p.name += " renamed";
    r.put("bd_assortment_v1", renamed);
    const command = { id: "combo-sale", source: "MANUAL_GRID", lines: [{ id: "combo-line", menuItemId: "combo", quantity: 2 }] };
    const quote = await r.send(r.sale, { action: "preview", command });
    assert.equal(quote.event.originalMovements.reduce((n, m) => n + m.costAmount, 0), -60);
    const posted = await r.send(r.sale, { action: "post", command, previewHash: quote.previewHash });
    assertStock(r, 18, 10);
    const history = r.get(sales.SALES_EVENT_STORE_KEY);
    await r.send(r.confirm, { document: document("second", 10, 12) });
    assertStock(r, 28, 12);
    assert.deepEqual(r.get(sales.SALES_EVENT_STORE_KEY), history);
    const newQuote = await r.send(r.sale, { action: "preview", command: { ...command, id: "new-quote", lines: [{ ...command.lines[0], quantity: 1 }] } });
    assert.equal(newQuote.event.originalMovements.reduce((n, m) => n + m.costAmount, 0), -36);
    const beforeUpdate = r.get("bd_stock_movements");
    await r.send(r.update, { document: first.document });
    assert.deepEqual(r.get("bd_stock_movements"), beforeUpdate, "Unchanged update must retain the captured receipt key after sales");
    await r.send(r.sale, { action: "reverse", eventId: posted.event.id });
    assertStock(r, 30, 12);
    const refunded = r.get("bd_stock_movements") as Row[];
    assert.equal(refunded.filter(m => m.type === "sale_reversal").reduce((n, m) => n + Number(m.costAmount), 0), 60);
    const afterRefund = r.allStores(), refundAudit = r.audit();
    await r.send(r.sale, { action: "reverse", eventId: posted.event.id });
    assert.deepEqual(r.allStores(), afterRefund); assert.deepEqual(r.audit(), refundAudit);
  } finally { r.close(); }
});

test("Phase 7 invalid explicit stock identity never falls back to a different product or partially posts", () => {
  const root = fixture();
  const raw = document("invalid");
  raw.items[1].purchaseProductKey = "stock:missing|ml";
  const before = structuredClone(root);
  const result = applyPurchaseToInventory({ assortment: root, document: raw, stockMovements: [] });
  assert.ok(result.summary.unresolvedLines.length);
  assert.deepEqual(result.movements, []);
  assert.deepEqual(result.assortment, before);
  assert.deepEqual(root, before);
});

for (const mode of ["high_confidence", "stable_mapping"] as const) {
  test(`Phase 7 ${mode} preserves an existing liquid identity despite the receipt placeholder`, async () => {
    const r = runtime();
    try {
      const raw = document(mode);
      raw.items = [raw.items[1]];
      raw.total = 200;
      delete raw.items[0].purchaseProductKey; delete raw.items[0].nomenclatureId;
      const root = fixture();
      const resolution = resolveCanonicalPurchaseItem({ assortment: root, document: raw, item: raw.items[0], canonicalItems: products });
      if (mode === "stable_mapping") r.put("bd_assortment_v1", { ...root, supplierProductMappings: [resolution.sourceMapping] });
      const actualResolution = resolveCanonicalPurchaseItem({ assortment: r.get("bd_assortment_v1"), document: raw, item: raw.items[0], canonicalItems: products });
      assert.equal(actualResolution.status, mode);
      await r.send(r.confirm, { document: raw });
      const after = r.get("bd_assortment_v1") as { stockBalances: Stock[]; nomenclature: Row[] };
      assert.equal(after.stockBalances.length, 3); assert.equal(after.nomenclature.length, 3);
      const syrup = after.stockBalances.find(p => p.productKey === products[1].key)!;
      assert.equal(syrup.current, 20); assert.equal(syrup.unit, "l");
      assert.deepEqual((r.get("bd_stock_movements") as Row[]).map(m => m.productKey), [products[1].key]);
    } finally { r.close(); }
  });
}

for (const corruption of ["missing", "different-id", "wrong-key-unit", "archived", "duplicate-balance", "duplicate-nomenclature", "real-incompatible-package"] as const) {
  test(`Phase 7 invalid target ${corruption} rejects a mixed receipt without any store/audit mutation`, async () => {
    const r = runtime();
    try {
      const raw = document(corruption);
      const root = fixture();
      if (corruption === "missing") raw.items[1].purchaseProductKey = "stock:missing|ml";
      if (corruption === "different-id") raw.items[1].nomenclatureId = products[0].id;
      if (corruption === "wrong-key-unit") root.stockBalances[1].unit = "pcs";
      if (corruption === "archived") root.nomenclature[1].active = false;
      if (corruption === "duplicate-balance") root.stockBalances.push(structuredClone(root.stockBalances[1]));
      if (corruption === "duplicate-nomenclature") root.nomenclature.push({ ...root.nomenclature[1], id: "duplicate-id" });
      if (corruption === "real-incompatible-package") raw.items[1].packageSize = "12 шт.";
      r.put("bd_assortment_v1", root);
      const before = r.allStores(), audit = r.audit();
      await r.send(r.confirm, { document: raw }, 422);
      assert.deepEqual(r.allStores(), before); assert.deepEqual(r.audit(), audit);
    } finally { r.close(); }
  });
}

test("Phase 7 current manual selection overrides supplier mapping and stale derived key; subsequent mapping follows the correction", async () => {
  const r = runtime();
  try {
    const first = document("manual-correction"); first.items = [first.items[1]]; first.total = 200;
    const posted = await r.send(r.confirm, { document: first });
    const root = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    const alternative = { ...products[1], id: "alternative", key: "stock:test alternative syrup|ml", productKey: "stock:test alternative syrup|ml", name: "TEST Alternative Syrup" };
    root.nomenclature.push(alternative); root.stockBalances.push(alternative);
    r.put("bd_assortment_v1", root);
    const revised = structuredClone(posted.document);
    revised.items[0].purchaseProductKey = alternative.key; revised.items[0].nomenclatureId = alternative.id;
    const result = await r.send(r.update, { document: revised });
    assert.equal(result.document.items[0].purchaseProductKey, alternative.key);
    assert.equal(result.document.items[0].canonicalProductKey, alternative.key);
    const corrected = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    assert.equal(corrected.stockBalances.find(p => p.productKey === products[1].key)?.current, 0);
    assert.equal(corrected.stockBalances.find(p => p.productKey === alternative.key)?.current, 20);
    const next = document("after-correction"); next.items = [next.items[1]]; next.total = 200;
    delete next.items[0].purchaseProductKey; delete next.items[0].nomenclatureId;
    const repeated = await r.send(r.confirm, { document: next });
    assert.equal(repeated.document.items[0].purchaseProductKey, alternative.key);
    const after = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    assert.equal(after.stockBalances.length, 4);
    assert.equal(after.stockBalances.find(p => p.productKey === alternative.key)?.current, 40);
  } finally { r.close(); }
});

test("Phase 7 rename, unchanged update, cancel and repost preserve captured identities, quantities and history", async () => {
  const r = runtime();
  try {
    const posted = await r.send(r.confirm, { document: document("lifecycle") });
    const initial = r.get("bd_stock_movements") as Row[];
    const root = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    for (const list of [root.nomenclature, root.stockBalances]) for (const p of list) p.name += " renamed";
    r.put("bd_assortment_v1", root);
    await r.send(r.update, { document: posted.document });
    const renamed = r.get("bd_assortment_v1") as ReturnType<typeof fixture>;
    for (const p of renamed.stockBalances) assert.ok(p.name.endsWith(" renamed"));
    assert.deepEqual(r.get("bd_stock_movements"), initial);
    await r.send(r.cancel, { documentId: "lifecycle" });
    const cancelled = r.allStores(), cancelledAudit = r.audit();
    await r.send(r.cancel, { documentId: "lifecycle" });
    assert.deepEqual(r.allStores(), cancelled); assert.deepEqual(r.audit(), cancelledAudit);
    await r.send(r.repost, { documentId: "lifecycle" });
    assertStock(r, 20, 10);
    const movements = r.get("bd_stock_movements") as Row[];
    const active = movements.filter(m => m.type === "receipt" && m.status !== "cancelled");
    const history = movements.filter(m => m.type === "receipt" && m.status === "cancelled");
    assert.equal(active.length, 3); assert.equal(history.length, 3);
    for (const original of initial) {
      const retained = history.find(m => m.id === original.id)!;
      for (const key of ["productKey", "unit", "amount", "costAmount", "purchaseConversion"]) assert.deepEqual(retained[key], original[key]);
    }
    const after = r.allStores(), audit = r.audit();
    await r.send(r.repost, { documentId: "lifecycle" });
    assert.deepEqual(r.allStores(), after); assert.deepEqual(r.audit(), audit);
  } finally { r.close(); }
});

test("Phase 7 a new directly measured receipt cannot create a piece identity from the blank-row placeholder", async () => {
  const r = runtime();
  try {
    const raw = document("new-unlinked"); raw.items = [raw.items[1]]; raw.total = 200;
    delete raw.items[0].purchaseProductKey; delete raw.items[0].nomenclatureId;
    r.put("bd_assortment_v1", { nomenclature: [], stockBalances: [], recipes: [], menuItems: [] });
    await r.send(r.confirm, { document: raw });
    const root = r.get("bd_assortment_v1") as { stockBalances: Stock[] };
    assert.equal(root.stockBalances.length, 1);
    const stock = root.stockBalances[0];
    assert.ok(stock.productKey.endsWith("|ml")); assert.equal(stock.unit, "l"); assert.equal(stock.current, 20);
    for (const pack of stock.packageOptions) assert.equal(inventoryPackageAmount(pack, "l").unit, "ml");
  } finally { r.close(); }
});

test("Phase 7 legacy no-snapshot mixed batch is atomic when later automatic identity validation fails", () => {
  const root = fixture();
  for (const rows of [root.nomenclature, root.stockBalances]) for (const item of rows) delete (item as Row).unitModelVersion;
  root.stockBalances.push(structuredClone(root.stockBalances[1]));
  const raw = document("legacy-atomic"); raw.items = raw.items.slice(0, 2);
  for (const item of raw.items) { delete item.purchaseProductKey; delete item.nomenclatureId; }
  Object.assign(raw.items[0], { name: "Новый уникальный тестовый товар", rawName: "Новый уникальный тестовый товар", unit: "pcs" });
  const before = structuredClone(root);
  const result = applyPurchaseToInventory({ assortment: root, document: raw, stockMovements: [] });
  assert.ok(result.summary.unresolvedLines.length);
  assert.deepEqual(result.movements, []); assert.deepEqual(result.assortment, before); assert.deepEqual(root, before);
});

for (const existing of [false, true]) {
  test(`Phase 7 three invoice rows for ${existing ? "existing" : "new"} stock retain every quantity and movement`, async () => {
    const r = runtime();
    try {
      const raw = document(`multiple-${existing}`);
      raw.items = [2, 3, 4].map((quantity, index) => ({ ...raw.items[1], id: `multi-${index}`, quantity, lineTotal: quantity * 10, packageSize: index ? `${index} l` : "1 шт." }));
      raw.total = 90;
      if (!existing) {
        r.put("bd_assortment_v1", { nomenclature: [], stockBalances: [], recipes: [], menuItems: [] });
        for (const item of raw.items) { delete item.purchaseProductKey; delete item.nomenclatureId; }
      }
      await r.send(r.confirm, { document: raw });
      const root = r.get("bd_assortment_v1") as { stockBalances: Stock[] };
      const stock = root.stockBalances.filter(p => p.unit === "l");
      assert.equal(stock.length, 1); assert.equal(stock[0].current, 9);
      const movements = r.get("bd_stock_movements") as Row[];
      assert.equal(movements.length, 3); assert.equal(new Set(movements.map(m => m.productKey)).size, 1);
      assert.equal(movements.reduce((sum, m) => sum + Number(m.amount), 0), stock[0].current);
      assert.equal(movements.reduce((sum, m) => sum + Number(m.costAmount), 0), 90);
      const before = r.allStores(), audit = r.audit();
      await r.send(r.confirm, { document: raw });
      assert.deepEqual(r.allStores(), before); assert.deepEqual(r.audit(), audit);
    } finally { r.close(); }
  });
}

test("Phase 7 no-ref fallback cannot reactivate an archived stock identity", async () => {
  const r = runtime();
  try {
    const root = fixture();
    root.nomenclature[1].active = false; root.stockBalances[1].active = false;
    r.put("bd_assortment_v1", root);
    const raw = document("archived-no-ref"); raw.items = [raw.items[1]]; raw.total = 200;
    delete raw.items[0].purchaseProductKey; delete raw.items[0].nomenclatureId;
    const before = r.allStores(), audit = r.audit();
    await r.send(r.confirm, { document: raw }, 422);
    assert.deepEqual(r.allStores(), before); assert.deepEqual(r.audit(), audit);
  } finally { r.close(); }
});

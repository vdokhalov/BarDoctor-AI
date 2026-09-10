import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import { salesEventFixture, saleCommand } from "./helpers/sales-event-fixture";
import * as purchases from "../lib/bardoctor/purchases";
import * as conversion from "../lib/bardoctor/purchase-conversion";
import * as scope from "../lib/bardoctor/purchase-venue-scope";
import * as matching from "../lib/bardoctor/invoice-recognition-v2";
import * as sales from "../lib/bardoctor/sales-events";
import { resolveCostBasis } from "../lib/bardoctor/cost-basis";

test("Phase 6 actual purchase HTTP receipts update stock and last cost without rewriting captured sales", async () => {
  const r = openingRuntime();
  const dependencies = { ...purchases, ...conversion, ...scope, ...matching, INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots" };
  const confirm = r.loadRoute(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), dependencies);
  const update = r.loadRoute(new URL("../app/api/purchases/update/route.ts", import.meta.url), dependencies);
  const cancel = r.loadRoute(new URL("../app/api/purchases/cancel/route.ts", import.meta.url), dependencies);
  const sale = r.loadRoute(new URL("../app/api/sales-events/route.ts", import.meta.url), sales);
  const send = async (api: typeof confirm, body: object, expectedStatus?: number) => {
    const response = await api.POST(new Request("http://localhost/api/test", {method: "POST",
      headers: {"Content-Type": "application/json", "X-Venue-Id": "1"}, body: JSON.stringify({venueId: 1, ...body})}));
    const result = await response.json() as {code?: string; previewHash: string; event: sales.SalesEvent; document: purchases.PurchaseDocument};
    if (expectedStatus) assert.equal(response.status, expectedStatus, JSON.stringify(result));
    else assert.ok(response.ok, JSON.stringify({status: response.status, result}));
    return result;
  };
  const stock = () => (r.get("bd_assortment_v1") as {stockBalances: {productKey: string; current: number}[]}).stockBalances.find(x => x.productKey === "coffee-stock")!.current;
  const cost = () => resolveCostBasis({venueId: 1, nomenclatureItem: "coffee-stock", baseUnit: "kg",
    asOf: "2026-09-09", receipts: r.get("bd_stock_movements") as unknown[], accountingCurrency: "MDL"}).value;
  const document = (id: string, price: number) => ({ id, venueId: 1, documentType: "invoice", supplierId: "phase6-supplier", supplierName: "Phase 6 test",
    date: "2026-09-08", currency: "MDL", paymentMethod: "unknown", source: "manual", total: price,
    items: [{id: "beans-line", name: "Beans", rawName: "Coffee beans", nomenclatureId: "nom-coffee", purchaseProductKey: "coffee-stock",
      quantity: 1, unit: "kg", quantityMode: "measure", unitPrice: price, lineTotal: price, category: "products", mappingSource: "manual"}] });
  try {
    r.put("bd_assortment_v1", salesEventFixture().assortment);
    r.put("bd_suppliers", [{id: "phase6-supplier", name: "Phase 6 test", venueId: 1, status: "active"}]);
    const first = await send(confirm, {document: document("receipt-1", 100)});
    assert.equal(stock(), 2);
    assert.equal(cost(), 100);
    const movements = r.get("bd_stock_movements");
    await send(confirm, {document: document("receipt-1", 100)});
    assert.deepEqual(r.get("bd_stock_movements"), movements);
    const command = saleCommand("coffee", 10);
    const quote = await send(sale, {action: "preview", command});
    assert.equal(quote.event.originalMovements.reduce((sum, m) => sum + (m.costAmount ?? 0), 0), -8);
    const posted = await send(sale, {action: "post", command, previewHash: quote.previewHash});
    const captured = r.get(sales.SALES_EVENT_STORE_KEY);
    const capturedMovements = (r.get("bd_stock_movements") as {type: string}[]).filter(m => m.type === "sale_consumption");
    assert.equal(stock(), 1.92);
    await send(confirm, {document: document("receipt-2", 200)});
    assert.equal(stock(), 2.92);
    assert.equal(cost(), 200);
    const nextQuote = await send(sale, {action: "preview", command: {...command, id: "next-price-preview"}});
    assert.equal(nextQuote.event.originalMovements.reduce((sum, m) => sum + (m.costAmount ?? 0), 0), -16);
    assert.deepEqual(r.get(sales.SALES_EVENT_STORE_KEY), captured);
    await send(update, {document: {...first.document, items: first.document.items}});
    assert.equal(stock(), 2.92);
    assert.deepEqual((r.get("bd_stock_movements") as {type: string}[]).filter(m => m.type === "sale_consumption"), capturedMovements);
    await send(sale, {action: "reverse", eventId: posted.event.id});
    assert.equal(stock(), 3);
    const beforeBlockedCancel = r.get("bd_stock_movements");
    const blocked = await send(cancel, {documentId: "receipt-2", reason: "Unsafe after later movement"}, 409);
    assert.equal(blocked.code, "PURCHASE_HAS_LATER_MOVEMENTS");
    assert.deepEqual(r.get("bd_stock_movements"), beforeBlockedCancel);
    assert.equal(stock(), 3);
    await send(confirm, {document: document("receipt-3", 300)});
    assert.equal(stock(), 4);
    assert.equal(cost(), 300);
    await send(cancel, {documentId: "receipt-3", reason: "Unused isolated receipt"});
    assert.equal(stock(), 3);
    assert.equal(cost(), 200);
    const afterCancel = r.get("bd_stock_movements");
    await send(cancel, {documentId: "receipt-3", reason: "Retry"});
    assert.deepEqual(r.get("bd_stock_movements"), afterCancel);
  } finally {r.close();}
});

test("Phase 6 HTTP unit matrix: create, reopen, edit, retry and safe cancel preserve quantities and line IDs", async () => {
  const cases = [
    {id: "pieces", unit: "pcs", stockUnit: "pcs", quantity: 12, factor: 1},
    {id: "kilos", unit: "kg", stockUnit: "kg", quantity: 2, factor: 1},
    {id: "grams", unit: "g", stockUnit: "kg", quantity: 500, factor: 0.001},
    {id: "litres", unit: "l", stockUnit: "l", quantity: 3, factor: 1},
    {id: "millilitres", unit: "ml", stockUnit: "l", quantity: 750, factor: 0.001},
    {id: "packs", unit: "pack", stockUnit: "pcs", quantity: 2, factor: 6},
  ];
  for (const item of cases) {
    const r = openingRuntime();
    const deps = {...purchases, ...conversion, ...scope, ...matching, INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots"};
    const endpoints = Object.fromEntries(["confirm", "update", "cancel"].map(action => [action,
      r.loadRoute(new URL(`../app/api/purchases/${action}/route.ts`, import.meta.url), deps)]));
    const send = async (action: string, body: object) => {
      const response = await endpoints[action].POST(new Request("http://localhost/api/test", {method: "POST",
        headers: {"Content-Type": "application/json", "X-Venue-Id": "1"}, body: JSON.stringify(body)}));
      const result = await response.json() as {document: purchases.PurchaseDocument};
      assert.ok(response.ok, `${item.id}/${action}: ${JSON.stringify(result)}`);
      return result;
    };
    const quantity = () => (r.get("bd_assortment_v1") as {stockBalances: {current: number}[]}).stockBalances[0].current;
    try {
      const product = {id: item.id, key: item.id, productKey: item.id, name: item.id, unit: item.stockUnit,
        kind: "stock", unitModelVersion: 4, venueId: 1, currency: "MDL", current: 0};
      r.put("bd_assortment_v1", {nomenclature: [product], stockBalances: [product]});
      r.put("bd_suppliers", [{id: "supplier", name: "Test", venueId: 1}]);
      const original = {id: `receipt-${item.id}`, venueId: 1, supplierId: "supplier", supplierName: "Test",
        documentType: "invoice", date: "2026-09-08", currency: "MDL", paymentMethod: "unknown",
        total: item.quantity * 10, items: [{id: "stable-line", name: item.id, purchaseProductKey: item.id,
          quantity: item.quantity, unit: item.unit, unitPrice: 10, lineTotal: item.quantity * 10, category: "products",
          ...(item.unit === "pack" ? {packageContent: {quantity: 6, unit: "pcs"}} : {})}]};
      const confirmed = await send("confirm", {document: original});
      assert.equal(quantity(), item.quantity * item.factor);
      assert.equal(confirmed.document.items[0].id, "stable-line");
      const persisted = r.get("bd_purchase_documents");
      const beforeRetry = r.get("bd_stock_movements");
      await send("confirm", {document: original});
      assert.deepEqual(r.get("bd_purchase_documents"), persisted);
      assert.deepEqual(r.get("bd_stock_movements"), beforeRetry);
      const edited = {...original, total: (item.quantity + 1) * 10,
        items: [{...original.items[0], quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * 10}]};
      const updated = await send("update", {document: edited});
      assert.equal(quantity(), Math.round((item.quantity + 1) * item.factor * 1e6) / 1e6);
      assert.equal(updated.document.items[0].id, "stable-line");
      await send("update", {document: edited});
      assert.equal(quantity(), Math.round((item.quantity + 1) * item.factor * 1e6) / 1e6);
      await send("cancel", {documentId: original.id, reason: "Isolated unit-matrix cancellation"});
      assert.equal(quantity(), 0);
      const cancelled = r.get("bd_stock_movements");
      await send("cancel", {documentId: original.id, reason: "Retry"});
      assert.deepEqual(r.get("bd_stock_movements"), cancelled);
    } finally { r.close(); }
  }
});

test("Phase 6 a persisted receipt retry survives changed or missing current conversion targets without writes", async (t) => {
  const cases = (["unit-changed", "target-removed"] as const).flatMap(change =>
    (["document-id", "idempotency-key"] as const).flatMap(identity =>
      (["confirmed", "cancelled"] as const).map(status => ({ change, identity, status }))));
  for (const { change, identity, status } of cases) await t.test(`${change}/${identity}/${status}`, async () => {
    const r = openingRuntime();
    const dependencies = {
      ...purchases, ...conversion, ...scope, ...matching, INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots",
    };
    const confirm = r.loadRoute(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), dependencies);
    const cancel = r.loadRoute(new URL("../app/api/purchases/cancel/route.ts", import.meta.url), dependencies);
    const originalKey = `persisted-key-${change}-${identity}-${status}`;
    const original = { id: `persisted-${change}-${identity}-${status}`, venueId: 1, documentType: "invoice", supplierId: "supplier",
      supplierName: "Test", date: "2026-09-08", currency: "MDL", paymentMethod: "unknown", total: 120,
      items: [{ id: "stable-line", name: "Test bottles", purchaseProductKey: "bottles", nomenclatureId: "bottles",
        quantity: 12, unit: "pcs", unitPrice: 10, lineTotal: 120, category: "products", mappingSource: "manual" }] };
    const send = async (expectedStatus: 200 | 201, document = original, idempotencyKey = originalKey) => {
      const response = await confirm.POST(new Request("http://localhost/api/purchases/confirm", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Venue-Id": "1" },
        body: JSON.stringify({ document, idempotencyKey }),
      }));
      const result = await response.json() as { duplicate?: boolean; document: purchases.PurchaseDocument };
      assert.equal(response.status, expectedStatus, `${change}: ${JSON.stringify(result)}`);
      return result;
    };
    try {
      const product = { id: "bottles", key: "bottles", productKey: "bottles", name: "Test bottles",
        unit: "pcs", kind: "stock", unitModelVersion: 4, venueId: 1, current: 0, currency: "MDL" };
      r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product] });
      r.put("bd_suppliers", [{ id: "supplier", name: "Test", venueId: 1 }]);
      const first = await send(201);
      assert.equal(first.document.status, "confirmed");
      assert.equal(first.document.idempotencyKey, originalKey);
      assert.ok(first.document.items[0].purchaseConversion);
      let expectedDocument = first.document;
      if (status === "cancelled") {
        const response = await cancel.POST(new Request("http://localhost/api/purchases/cancel", {
          method: "POST", headers: { "Content-Type": "application/json", "X-Venue-Id": "1" },
          body: JSON.stringify({ documentId: original.id, reason: "Safe isolated receipt cancellation" }),
        }));
        const result = await response.json() as { document: purchases.PurchaseDocument };
        assert.equal(response.status, 200, JSON.stringify(result));
        expectedDocument = result.document;
      }
      assert.equal(expectedDocument.status, status);
      const persisted = r.get("bd_assortment_v1") as Record<string, unknown>;
      const changed = change === "target-removed"
        ? { ...persisted, nomenclature: [], stockBalances: [] }
        : { ...persisted,
          nomenclature: (persisted.nomenclature as Record<string, unknown>[]).map(item => ({ ...item, unit: "kg" })),
          stockBalances: (persisted.stockBalances as Record<string, unknown>[]).map(item => ({ ...item, unit: "kg" })),
        };
      r.put("bd_assortment_v1", changed);
      const attemptedConversion = conversion.preparePurchaseConversions(
        { ...purchases.normalizePurchaseDocument(original, original.id), venueId: 1 }, original, changed,
      );
      assert.equal(attemptedConversion.ok, false, `${change} must make a fresh conversion invalid`);
      const before = r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id, store_key").all();
      const auditBefore = r.sqlite.prepare("SELECT * FROM audit_log ORDER BY rowid").all();
      const batchesBefore = r.batches();
      // Make the other identifier different so neither identity branch can mask a missing one.
      const retryDocument = identity === "document-id" ? original : { ...original, id: `${original.id}-new-request-id` };
      const retryKey = identity === "document-id" ? `${originalKey}-new-request-key` : originalKey;
      assert.equal(retryDocument.id === expectedDocument.id, identity === "document-id");
      assert.equal(retryKey === expectedDocument.idempotencyKey, identity === "idempotency-key");
      const retry = await send(200, retryDocument, retryKey);
      assert.equal(retry.duplicate, true);
      assert.deepEqual(retry.document, expectedDocument);
      assert.equal(r.batches(), batchesBefore);
      // Raw data_json strings enforce byte stability, including captured conversion and movements.
      assert.deepEqual(r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id, store_key").all(), before);
      assert.deepEqual(r.sqlite.prepare("SELECT * FROM audit_log ORDER BY rowid").all(), auditBefore);
    } finally { r.close(); }
  });
});

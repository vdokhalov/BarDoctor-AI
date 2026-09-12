import assert from "node:assert/strict";
import test from "node:test";
import { openingRuntime } from "./helpers/opening-runtime";
import * as counts from "../lib/bardoctor/inventory-counts";
import * as purchases from "../lib/bardoctor/purchases";
import * as conversion from "../lib/bardoctor/purchase-conversion";
import * as scope from "../lib/bardoctor/purchase-venue-scope";
import * as matching from "../lib/bardoctor/invoice-recognition-v2";
import { financialSnapshot } from "../lib/bardoctor/financial-reconciliation";

type Row = Record<string, unknown>;

test("Phase 7 actual cost-basis guard rejects a one-micro-unit change even when net stock is unchanged", () => {
  const product = {
    productKey: "micro-stock", name: "TEST micro price", venueId: 1, kind: "stock", active: true,
    unit: "pcs", sectionId: "bar", taxonomyCategoryId: "goods", warehouseId: "qa-warehouse",
  };
  const assortment = {
    nomenclatureStructure: {
      sections: [{ id: "bar", name: "Бар", active: true }],
      categories: [{ id: "goods", parentId: "bar", name: "Товары", active: true }],
      subcategories: [], locations: [],
    },
    nomenclature: [product],
    stockBalances: [{ ...product, current: 100000, currency: "MDL", updatedAt: "2026-09-01T08:00:00.000Z" }],
  };
  const beforeReceipt = {
    id: "free-receipt", type: "receipt", venueId: 1, productKey: product.productKey,
    warehouseId: product.warehouseId, date: "2026-09-01", amount: 100000, unit: "pcs",
    costAmount: 0, costStatus: "KNOWN_ZERO", currency: "MDL", status: "active",
    sourceDocumentId: "qa-before", sourceLineId: "qa-before-line", createdAt: "2026-09-01T08:00:00.000Z",
  };
  const createInput = {
    assortment, venueId: 1, sequenceNumber: 1, accountingCurrency: "MDL",
    scope: { type: "all" as const, label: "Весь активный склад" },
    creator: { accountId: 7, name: "QA", role: "owner" }, date: "2026-09-01", now: "2026-09-01T09:00:00.000Z",
  };
  const created = counts.createInventoryCountDocument({ ...createInput, id: "count-before", stockMovements: [beforeReceipt] });
  assert.equal(created.items.length, 1);
  assert.equal(created.items[0].expected, 100000);
  assert.equal(created.items[0].averageUnitCost, 0);
  assert.equal(created.items[0].valuationKnown, true);
  assert.equal(created.items[0].costBasisStatus, "KNOWN_ZERO");
  assert.equal(created.items[0].costSourceDocumentId, "qa-before");
  const document = counts.updateInventoryCountDocument({
    document: created, items: [{ productKey: product.productKey, actual: 100000 }],
    status: "review", now: "2026-09-01T09:01:00.000Z",
  });
  assert.deepEqual(counts.inventoryCountConflicts({ document, assortment, stockMovements: [beforeReceipt] }), []);

  const afterReceipt = {
    ...beforeReceipt, id: "micro-receipt", amount: 10000, costAmount: 0.01, costStatus: "KNOWN",
    sourceDocumentId: "qa-after", sourceLineId: "qa-after-line", createdAt: "2026-09-01T10:00:00.000Z",
  };
  const equalConsumption = {
    id: "consume-later", type: "sale_consumption", venueId: 1, productKey: product.productKey,
    warehouseId: product.warehouseId, date: "2026-09-01", amount: -10000, unit: "pcs",
    costAmount: -0.01, costStatus: "KNOWN", currency: "MDL", status: "active",
    sourceDocumentId: "qa-sale", sourceLineId: "qa-sale-line", createdAt: "2026-09-01T11:00:00.000Z",
  };
  const movements = [beforeReceipt, afterReceipt, equalConsumption];
  assert.equal(movements.reduce((sum, item) => sum + item.amount, 0), 100000,
    "The trigger is a price change; physical stock legitimately returns to the captured amount");
  const current = counts.createInventoryCountDocument({
    ...createInput, id: "count-after", sequenceNumber: 2, now: "2026-09-01T12:00:00.000Z", stockMovements: movements,
  });
  assert.equal(current.items[0].expected, document.items[0].expected);
  assert.equal(current.items[0].averageUnitCost, 0.000001, "Actual receipt cost-basis function must produce one micro-unit");
  assert.equal(current.items[0].valuationKnown, true);
  assert.equal(current.items[0].costSourceDocumentId, "qa-after");
  const before = structuredClone({ document, assortment, movements });
  const conflicts = counts.inventoryCountConflicts({ document, assortment, stockMovements: movements });
  assert.equal(conflicts.length, 1, "A one-micro-unit price change must not pass the old >0.000001 tolerance");
  assert.equal(conflicts[0].productKey, product.productKey);
  assert.equal(conflicts[0].reason, "Cost basis изменился после начала подсчёта");
  assert.equal(conflicts[0].expected, 100000);
  assert.equal(conflicts[0].current, 100000);
  assert.deepEqual({ document, assortment, movements }, before, "Guard inspection is read-only");
});

function precisionRuntime() {
  const r = openingRuntime(undefined, {
    authenticateRequest: async (request: Request) => ({
      id: 7, actorAccountId: 7, venueId: Number(request.headers.get("X-Venue-Id") || 1),
      role: "owner", firstName: "QA", lastName: "", appEmail: "qa@example.invalid",
      restaurantJson: '{"currency":"MDL"}',
    }),
  });
  const countRoute = new URL("../app/api/inventory/counts/route.ts", import.meta.url);
  const purchaseRoute = new URL("../app/api/purchases/confirm/route.ts", import.meta.url);
  const count = () => r.loadRoute(countRoute, counts);
  const purchase = r.loadRoute(purchaseRoute, {
    ...purchases, ...conversion, ...scope, ...matching, INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots",
  });
  const headers = { "Content-Type": "application/json", "X-Venue-Id": "1" };
  type Body = { ok: boolean; inventory: counts.InventoryCountDocument; idempotent?: boolean; stockChanged?: boolean };
  const send = async (api: typeof purchase, body: object, status: number) => {
    const response = await api.POST(new Request("http://localhost/api/private-money-precision", {
      method: "POST", headers, body: JSON.stringify({ venueId: 1, ...body }),
    }));
    const parsed = await response.json() as Body;
    assert.equal(response.status, status, JSON.stringify(parsed));
    return parsed;
  };
  const reopen = async (id: string) => {
    const response = await count().GET(new Request(`http://localhost/api/inventory/counts?id=${encodeURIComponent(id)}`, { headers }));
    const parsed = await response.json() as Body;
    assert.equal(response.status, 200, JSON.stringify(parsed));
    return parsed.inventory;
  };
  const rawState = () => ({
    stores: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id, store_key").all(),
    audit: r.sqlite.prepare("SELECT rowid, * FROM audit_log ORDER BY rowid").all(),
    casBatches: r.batches(),
  });
  return { ...r, count, purchase, send, reopen, rawState };
}

test("Phase 7 HTTP/SQLite: receipt 2×1.005, count 1 persists exact 1.00/-1.01 through GET and retry", async () => {
  const r = precisionRuntime();
  try {
    const key = "phase7-half-cent";
    const product = { id: key, key, productKey: key, name: "TEST half-cent price", venueId: 1,
      unit: "pcs", kind: "stock", active: true, unitModelVersion: 4, current: 0, currency: "MDL" };
    r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product] });
    r.put("bd_suppliers", [{ id: "qa-precision-supplier", name: "TEST", venueId: 1, status: "active" }]);
    await r.send(r.purchase, { document: {
      id: "qa-precision-receipt", venueId: 1, supplierId: "qa-precision-supplier", supplierName: "TEST",
      documentType: "invoice", date: new Date().toISOString().slice(0, 10), currency: "MDL",
      paymentMethod: "unknown", source: "manual", total: 2.01,
      items: [{ id: "qa-precision-line", name: product.name, rawName: product.name, nomenclatureId: key,
        purchaseProductKey: key, quantity: 2, unit: "pcs", quantityMode: "measure", unitPrice: 1.005,
        lineTotal: 2.01, category: "products", mappingSource: "manual" }],
    } }, 201);
    const receipts = (r.get("bd_stock_movements") as Row[]).filter(item => item.type === "receipt");
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].amount, 2);
    assert.equal(receipts[0].costAmount, 2.01);
    const created = await r.send(r.count(), { action: "create", scope: { type: "all" } }, 201);
    assert.equal(created.inventory.items.length, 1);
    assert.equal(created.inventory.items[0].expected, 2);
    assert.equal(created.inventory.items[0].averageUnitCost, 1.005);
    assert.equal(created.inventory.items[0].valuationKnown, true);
    const id = created.inventory.id;
    await r.send(r.count(), { action: "save", id, items: [{ productKey: key, actual: 1 }] }, 200);
    await r.send(r.count(), { action: "review", id }, 200);
    const completed = (await r.send(r.count(), { action: "finalize", id }, 200)).inventory;
    assert.equal(completed.financialValuationVersion, 1);
    assert.equal(completed.items[0].actual, 1);
    assert.equal(completed.items[0].averageUnitCost, 1.005, "Captured price is not rounded/replaced to force a monetary match");
    assert.equal(completed.items[0].actualValue, 1);
    assert.equal(completed.items[0].expectedValue, 2.01);
    assert.equal(completed.items[0].differenceValue, -1.01);
    assert.equal(completed.total, 1);
    assert.equal(completed.expectedTotal, 2.01);
    assert.equal(completed.differenceTotal, -1.01);
    assert.equal(completed.summary?.calculatedDifferenceValue, -1.01);
    assert.deepEqual(completed.sections, { [completed.items[0].sectionName]: 1 });
    assert.equal(financialSnapshot(completed).total, 1);
    const adjustments = (r.get("bd_stock_movements") as Row[]).filter(item => item.type === "inventory_adjustment");
    assert.equal(adjustments.length, 1);
    assert.equal(adjustments[0].amount, -1);
    assert.equal(adjustments[0].costAmount, -1.01);
    assert.deepEqual((r.get("bd_stock_movements") as Row[]).filter(item => item.type === "receipt"), receipts);
    const beforeReload = r.rawState();
    const reloaded = await r.reopen(id);
    assert.equal(reloaded.items[0].actualValue, 1);
    assert.equal(reloaded.items[0].expectedValue, 2.01);
    assert.equal(reloaded.items[0].differenceValue, -1.01, "GET presentation must preserve exact posted value");
    assert.equal(reloaded.differenceTotal, -1.01);
    assert.deepEqual(financialSnapshot(reloaded), financialSnapshot(completed));
    assert.deepEqual(r.rawState(), beforeReload, "GET cannot mutate historical data");
    const duplicate = await r.send(r.count(), { action: "finalize", id }, 200);
    assert.equal(duplicate.idempotent, true);
    assert.equal(duplicate.stockChanged, false);
    assert.equal(duplicate.inventory.items[0].differenceValue, -1.01);
    assert.deepEqual(r.rawState(), beforeReload, "Duplicate finalize cannot round again or add another movement/audit");
  } finally { r.close(); }
});

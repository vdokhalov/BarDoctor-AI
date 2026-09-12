import assert from "node:assert/strict";
import test from "node:test";
import { openingRuntime } from "./helpers/opening-runtime";
import { saleCommand, salesEventFixture } from "./helpers/sales-event-fixture";
import * as counts from "../lib/bardoctor/inventory-counts";
import * as purchases from "../lib/bardoctor/purchases";
import * as conversion from "../lib/bardoctor/purchase-conversion";
import * as scope from "../lib/bardoctor/purchase-venue-scope";
import * as matching from "../lib/bardoctor/invoice-recognition-v2";
import * as sales from "../lib/bardoctor/sales-events";
import { financialSnapshot } from "../lib/bardoctor/financial-reconciliation";

// Business handlers and domain/CAS SQL are the actual source.
// No browser, network, production credentials, or production database is used.
type Row = Record<string, unknown>;
type ApiBody = {
  ok: boolean; code?: string; idempotent?: boolean; stockChanged?: boolean;
  inventory: counts.InventoryCountDocument;
  previewHash: string; event: sales.SalesEvent;
  conflicts?: { productKey: string; expected: number; current?: number }[];
};

const countRoute = new URL("../app/api/inventory/counts/route.ts", import.meta.url);
const purchaseRoute = new URL("../app/api/purchases/confirm/route.ts", import.meta.url);
const saleRoute = new URL("../app/api/sales-events/route.ts", import.meta.url);
const headers = { "Content-Type": "application/json", "X-Venue-Id": "1" };

function runtime() {
  // The existing opening helper omits actorAccountId and appEmail. Complete the
  // local identity fixture without replacing any inventory/sales business code.
  const r = openingRuntime(undefined, {
    authenticateRequest: async (request: Request) => ({
      id: 7, actorAccountId: 7, venueId: Number(request.headers.get("X-Venue-Id") || 1),
      role: "owner", firstName: "QA", lastName: "", appEmail: "qa@example.invalid",
      restaurantJson: '{"currency":"MDL"}',
    }),
  });
  const count = () => r.loadRoute(countRoute, counts);
  const purchase = r.loadRoute(purchaseRoute, {
    ...purchases, ...conversion, ...scope, ...matching,
    INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots",
  });
  const sale = r.loadRoute(saleRoute, sales);
  const send = async (api: typeof sale, body: object, expectedStatus: number) => {
    const response = await api.POST(new Request("http://localhost/api/isolated-phase7", {
      method: "POST", headers, body: JSON.stringify({ venueId: 1, ...body }),
    }));
    const result = await response.json() as ApiBody;
    assert.equal(response.status, expectedStatus, JSON.stringify(result));
    return result;
  };
  const reopen = async (id: string) => {
    // Fresh handler/module closure, same persisted SQLite state, no cached doc.
    const response = await count().GET(new Request(
      `http://localhost/api/inventory/counts?id=${encodeURIComponent(id)}`, { headers },
    ));
    const result = await response.json() as ApiBody;
    assert.equal(response.status, 200, JSON.stringify(result));
    return result.inventory;
  };
  const rawState = () => ({
    // Keep exact serialized data_json and updated_at, not normalized objects.
    stores: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id, store_key").all(),
    audit: r.sqlite.prepare("SELECT rowid, * FROM audit_log ORDER BY rowid").all(),
    casBatches: r.batches(),
  });
  const quantity = (key: string) => {
    const assortment = r.get("bd_assortment_v1") as { stockBalances: Row[] };
    const balance = assortment.stockBalances.find(item => item.productKey === key);
    assert.ok(balance, `Missing balance ${key}`);
    return balance.current;
  };
  const movements = () => r.get("bd_stock_movements") as Row[];
  async function receive(key: string, unit: "kg" | "pcs", quantity: number, price: number, nomenclatureId = key) {
    r.put("bd_suppliers", [{ id: "phase7-supplier", name: "Isolated Phase 7", venueId: 1, status: "active" }]);
    return send(purchase, { document: {
      id: `phase7-receipt-${key}`, venueId: 1, supplierId: "phase7-supplier", supplierName: "Isolated Phase 7",
      documentType: "invoice", date: new Date().toISOString().slice(0, 10), currency: "MDL",
      paymentMethod: "unknown", source: "manual", total: quantity * price,
      items: [{ id: `receipt-line-${key}`, name: key, rawName: key, nomenclatureId,
        purchaseProductKey: key, quantity, unit, quantityMode: "measure", unitPrice: price,
        lineTotal: quantity * price, category: "products", mappingSource: "manual" }],
    } }, 201);
  }
  async function reviewed(key: string, actual: number) {
    const created = await send(count(), { action: "create", scope: { type: "all" } }, 201);
    assert.equal(created.stockChanged, false);
    assert.equal(created.inventory.items.length, 1);
    assert.equal(created.inventory.items[0].expected, 2);
    assert.equal(created.inventory.items[0].actual, null);
    const id = created.inventory.id;
    const saved = await send(count(), { action: "save", id, items: [{ productKey: key, actual }] }, 200);
    assert.equal(saved.inventory.items[0].actual, actual);
    assert.equal(saved.stockChanged, false);
    const reviewed = await send(count(), { action: "review", id }, 200);
    assert.equal(reviewed.inventory.status, "review");
    assert.equal(reviewed.inventory.items[0].actual, actual);
    assert.deepEqual((await reopen(id)).items, reviewed.inventory.items);
    return reviewed.inventory;
  }
  return { ...r, count, sale, send, reopen, rawState, quantity, movements, receive, reviewed };
}

test("Phase 7 HTTP/SQLite: stale count cannot restore stock already consumed by a real sale", async () => {
  const r = runtime();
  try {
    const source = salesEventFixture().assortment;
    r.put("bd_assortment_v1", {
      ...source,
      menuItems: (source.menuItems as Row[]).filter(item => item.id === "coffee"),
      // Existing production catalog rows may carry an old balance mirror.
      // Receipt makes the live balance 2; the later sale updates only that live
      // balance. The stale nomenclature mirror must not mask it at finalization.
      nomenclature: (source.nomenclature as Row[]).filter(item => item.id === "nom-coffee")
        .map(item => ({ ...item, current: 2 })),
      stockBalances: (source.stockBalances as Row[]).filter(item => item.productKey === "coffee-stock")
        .map(item => ({ ...item, current: 0, unitModelVersion: 4 })),
    });
    await r.receive("coffee-stock", "kg", 2, 100, "nom-coffee");
    assert.equal(r.quantity("coffee-stock"), 2);
    const document = await r.reviewed("coffee-stock", 2);

    const command = { ...saleCommand("coffee", 10), id: "phase7-after-count-sale" };
    const quote = await r.send(r.sale, { action: "preview", command }, 200);
    const posted = await r.send(r.sale, { action: "post", command, previewHash: quote.previewHash }, 201);
    assert.equal(r.quantity("coffee-stock"), 1.92);
    assert.equal(posted.event.batch.totalTheoreticalCost, 8);
    assert.equal(posted.event.originalMovements.length, 1);
    assert.equal(posted.event.originalMovements[0].amount, -0.08);
    assert.equal(posted.event.originalMovements[0].costAmount, -8);
    const committedSale = structuredClone(r.get(sales.SALES_EVENT_STORE_KEY));
    const beforeReject = r.rawState();

    for (let retry = 0; retry < 2; retry++) {
      const persisted = await r.reopen(document.id);
      assert.equal(persisted.status, "review");
      assert.equal(persisted.items[0].expected, 2);
      assert.equal(persisted.items[0].actual, 2);
      const rejected = await r.send(r.count(), { action: "finalize", id: persisted.id }, 409);
      assert.equal(rejected.code, "INVENTORY_STOCK_CHANGED");
      assert.ok(rejected.conflicts?.some(item => item.productKey === "coffee-stock"
        && item.expected === 2 && item.current === 1.92));
      assert.equal(r.quantity("coffee-stock"), 1.92);
      assert.deepEqual(r.get(sales.SALES_EVENT_STORE_KEY), committedSale);
      assert.equal(r.movements().filter(item => item.type === "inventory_adjustment").length, 0);
      assert.equal(r.movements().filter(item => item.type === "sale_consumption").length, 1);
      assert.deepEqual(r.rawState(), beforeReject, "409/reload/retry must not write any store, audit row or CAS batch");
    }
  } finally { r.close(); }
});

test("Phase 7 HTTP/SQLite: normal counts preserve shortage, surplus, explicit zero and idempotent finalization", async t => {
  for (const example of [
    { name: "shortage", actual: 1, delta: -1 },
    { name: "surplus", actual: 3, delta: 1 },
    { name: "explicit-zero", actual: 0, delta: -2 },
    { name: "unchanged", actual: 2, delta: 0 },
  ]) await t.test(example.name, async () => {
    const r = runtime();
    try {
      const key = `phase7-${example.name}`;
      const product = { id: key, key, productKey: key, name: key, venueId: 1, unit: "pcs",
        kind: "stock", active: true, unitModelVersion: 4, current: 0, currency: "MDL" };
      r.put("bd_assortment_v1", { nomenclature: [product], stockBalances: [product] });
      await r.receive(key, "pcs", 2, 10);
      const document = await r.reviewed(key, example.actual);
      const receiptBefore = structuredClone(r.movements().filter(item => item.type === "receipt"));
      const completed = await r.send(r.count(), { action: "finalize", id: document.id }, 200);
      assert.equal(completed.inventory.status, "completed");
      assert.equal(completed.inventory.financialValuationVersion, 1);
      assert.equal(completed.inventory.total, example.actual * 10);
      assert.equal(completed.inventory.items[0].actualValue, example.actual * 10);
      assert.equal(completed.inventory.items[0].expectedValue, 20);
      assert.equal(completed.inventory.items[0].differenceValue, example.delta * 10);
      assert.equal(financialSnapshot(completed.inventory).known, true);
      assert.equal(financialSnapshot(completed.inventory).total, example.actual * 10);
      assert.equal(r.quantity(key), example.actual);
      assert.deepEqual(r.movements().filter(item => item.type === "receipt"), receiptBefore);
      const adjustments = r.movements().filter(item => item.type === "inventory_adjustment");
      assert.equal(adjustments.length, example.delta === 0 ? 0 : 1);
      if (adjustments.length) {
        assert.equal(adjustments[0].sourceDocumentId, document.id);
        assert.equal(adjustments[0].amount, example.delta);
        assert.equal(adjustments[0].unit, "pcs");
        assert.equal(adjustments[0].costAmount, example.delta * 10);
      }
      const beforeRetry = r.rawState();
      const persisted = await r.reopen(document.id);
      assert.equal(persisted.status, "completed");
      assert.equal(persisted.items[0].actual, example.actual);
      assert.deepEqual(persisted.sections, completed.inventory.sections);
      assert.deepEqual(financialSnapshot(persisted), financialSnapshot(completed.inventory));
      for (let retry = 0; retry < 2; retry++) {
        const repeated = await r.send(r.count(), { action: "finalize", id: persisted.id }, 200);
        assert.equal(repeated.idempotent, true);
        assert.equal(repeated.stockChanged, false);
        assert.equal(r.quantity(key), example.actual);
        assert.deepEqual(r.rawState(), beforeRetry, "completed count replay must preserve exact persisted bytes and audit");
      }
    } finally { r.close(); }
  });
});

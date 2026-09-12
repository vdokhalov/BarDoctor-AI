import assert from "node:assert/strict";
import test from "node:test";
import type { SQLInputValue } from "node:sqlite";
import { openingRuntime } from "./helpers/opening-runtime";
import { saleCommand, salesEventFixture } from "./helpers/sales-event-fixture";
import * as counts from "../lib/bardoctor/inventory-counts";
import * as purchases from "../lib/bardoctor/purchases";
import * as conversion from "../lib/bardoctor/purchase-conversion";
import * as scope from "../lib/bardoctor/purchase-venue-scope";
import * as matching from "../lib/bardoctor/invoice-recognition-v2";
import * as sales from "../lib/bardoctor/sales-events";
import * as auditPresentation from "../lib/bardoctor/audit-presentation";
import { permissionsFor } from "../lib/bardoctor/access-control";

// Actual handlers/domain/SQL, isolated in-memory fixture only. No network or production access.
type Row = Record<string, unknown>;
type CountResponse = { ok: boolean; code?: string; stockChanged?: boolean; idempotent?: boolean;
  deleted?: boolean; deletedInventoryId?: string; inventory: counts.InventoryCountDocument;
  previewHash: string; event: sales.SalesEvent };
const headers = { "Content-Type": "application/json", "X-Venue-Id": "1" };
const countRoute = new URL("../app/api/inventory/counts/route.ts", import.meta.url);
const purchaseRoute = new URL("../app/api/purchases/confirm/route.ts", import.meta.url);
const saleRoute = new URL("../app/api/sales-events/route.ts", import.meta.url);
const auditRoute = new URL("../app/api/audit/route.ts", import.meta.url);

async function runtime() {
  const r = openingRuntime(undefined, {
    authenticateRequest: async () => ({ id: 7, actorAccountId: 7, venueId: 1, role: "owner",
      permissions: permissionsFor("owner"), firstName: "QA", lastName: "", appEmail: "qa@example.invalid",
      restaurantJson: '{"currency":"MDL"}' }),
  });
  // Schema-only helper gaps: real GET /api/audit reads stable numeric IDs and
  // integration overview tables. No audit business function or SQL is mocked.
  r.sqlite.exec(`ALTER TABLE audit_log ADD COLUMN id INTEGER;
    CREATE TRIGGER qa_audit_identity AFTER INSERT ON audit_log BEGIN UPDATE audit_log SET id=NEW.rowid WHERE rowid=NEW.rowid; END;
    CREATE TABLE integration_connections (id TEXT, venue_id INTEGER, data_account_id INTEGER);
    CREATE TABLE integration_sync_runs (id TEXT, connection_id TEXT, source_name TEXT, data_type TEXT, status TEXT,
      received_count INTEGER, error_count INTEGER, mapping_issue_count INTEGER, errors_json TEXT,
      finished_at TEXT, created_at TEXT, venue_id INTEGER, data_account_id INTEGER);`);
  // The shared helper's run() omits D1 meta.changes. This lifecycle route checks
  // the real UPDATE row count; expose actual SQLite results rather than inventing
  // a successful count or weakening the HTTP expectation.
  let batches = 0;
  const prepare = (sql: string) => {
    let values: SQLInputValue[] = [];
    const statement = {
      bind(...args: SQLInputValue[]) { values = args; return statement; },
      async all() { return { success: true, results: r.sqlite.prepare(sql).all(...values) }; },
      async first() { return r.sqlite.prepare(sql).get(...values) ?? null; },
      async run() { const result = r.sqlite.prepare(sql).run(...values); return { success: true,
        meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
    };
    return statement;
  };
  const d1 = { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    batches++; r.sqlite.exec("BEGIN");
    try { const output = []; for (const statement of statements) output.push(await statement.run());
      r.sqlite.exec("COMMIT"); return output;
    } catch (error) { r.sqlite.exec("ROLLBACK"); throw error; }
  } };
  const driver = { getD1: () => d1 as unknown as D1Database };
  const count = () => r.loadRoute(countRoute, { ...counts, ...driver });
  // loadRoute assumes a POST binding in its return object, although audit is GET-only.
  // Providing undefined for the absent method allows the actual GET module to load unchanged.
  const audit = () => r.loadRoute(auditRoute, { ...auditPresentation, ...driver, POST: undefined });
  const purchase = r.loadRoute(purchaseRoute, { ...purchases, ...conversion, ...scope, ...matching,
    INVENTORY_SNAPSHOT_STORE_KEY: "bd_inventory_snapshots", ...driver });
  const sale = r.loadRoute(saleRoute, { ...sales, ...driver });
  const send = async (api: typeof sale, body: object, status: number) => {
    const response = await api.POST(new Request("http://localhost/api/private-inventory-cancel-delete", {
      method: "POST", headers, body: JSON.stringify({ venueId: 1, ...body }),
    }));
    const result = await response.json() as CountResponse;
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  };
  const rawState = () => ({ stores: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all(),
    audit: r.sqlite.prepare("SELECT rowid,* FROM audit_log ORDER BY rowid").all(), batches });
  const unaffected = () => r.sqlite.prepare("SELECT * FROM domain_data WHERE store_key <> 'bd_inventory_snapshots' ORDER BY account_id,store_key").all();
  const auditRows = (id: string) => r.sqlite.prepare("SELECT * FROM audit_log WHERE store_key='bd_inventory_snapshots' AND entity_id=? ORDER BY id").all(id) as Row[];
  const reopen = async (id: string, status = 200) => {
    const response = await count().GET(new Request(`http://localhost/api/inventory/counts?id=${encodeURIComponent(id)}`, { headers }));
    const result = await response.json() as CountResponse;
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  };
  const readAudit = async () => {
    const response = await audit().GET(new Request("http://localhost/api/audit?storeKey=bd_inventory_snapshots&limit=100", { headers }));
    const result = await response.json() as { ok: boolean; rows: auditPresentation.PresentedAuditEvent[]; page: { total: number }; venueId: number };
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(result.ok, true); assert.equal(result.venueId, 1);
    return result;
  };
  const assertAuditReload = async (id: string, action: string) => {
    const persisted = auditRows(id), target = persisted.filter(row => row.action === action);
    assert.equal(target.length, 1, `exactly one persisted ${action}`);
    assert.ok(Number(target[0].id) > 0);
    assert.equal(target[0].actor_name, "QA");
    assert.equal(target[0].actor_role, "owner");
    const before = rawState(), first = await readAudit(), reloaded = await readAudit();
    assert.deepEqual(reloaded.rows, first.rows, "fresh GET handler must expose the same saved audit after reload");
    assert.equal(first.page.total, (r.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE store_key='bd_inventory_snapshots'").get() as {n:number}).n);
    const presented = first.rows.filter(row => row.id === Number(target[0].id));
    assert.equal(presented.length, 1); assert.equal(presented[0].action, action);
    assert.equal(presented[0].eventId, `AUD-${target[0].id}`);
    assert.equal(presented[0].actorName, "QA");
    assert.equal(presented[0].reason, target[0].reason);
    assert.deepEqual(rawState(), before, "audit GET/reload cannot modify domain, raw audit or transaction counts");
  };
  try {
    const source = salesEventFixture().assortment;
    r.put("bd_assortment_v1", { ...source,
      menuItems: (source.menuItems as Row[]).filter(row => row.id === "coffee"),
      nomenclature: (source.nomenclature as Row[]).filter(row => row.id === "nom-coffee"),
      stockBalances: (source.stockBalances as Row[]).filter(row => row.productKey === "coffee-stock")
        .map(row => ({ ...row, current: 0, unitModelVersion: 4 })),
    });
    r.put("bd_month_closings", []);
    r.put("bd_suppliers", [{ id: "qa-cancel-supplier", name: "Isolated QA", venueId: 1, status: "active" }]);
    await send(purchase, { document: { id: "qa-cancel-receipt", venueId: 1, supplierId: "qa-cancel-supplier",
      supplierName: "Isolated QA", documentType: "invoice", date: new Date().toISOString().slice(0, 10),
      currency: "MDL", paymentMethod: "unknown", source: "manual", total: 200,
      items: [{ id: "qa-cancel-receipt-line", name: "Beans", rawName: "Beans", nomenclatureId: "nom-coffee",
        purchaseProductKey: "coffee-stock", quantity: 2, unit: "kg", quantityMode: "measure", unitPrice: 100,
        lineTotal: 200, category: "products", mappingSource: "manual" }] } }, 201);
    const command = { ...saleCommand("coffee", 10), id: "qa-cancel-historical-sale" };
    const preview = await send(sale, { action: "preview", command }, 200);
    const posted = await send(sale, { action: "post", command, previewHash: preview.previewHash }, 201);
    assert.equal(posted.event.batch.totalTheoreticalCost, 8);
    assert.equal(posted.event.originalMovements[0].amount, -0.08);
    const balance = (r.get("bd_assortment_v1") as { stockBalances: Row[] }).stockBalances[0];
    assert.equal(balance.current, 1.92);
    assert.deepEqual((r.get("bd_stock_movements") as Row[]).map(row => row.type).sort(), ["receipt", "sale_consumption"]);
  } catch (error) { r.close(); throw error; }
  const create = async () => {
    const before = unaffected();
    const result = await send(count(), { action: "create", scope: { type: "all" } }, 201);
    // Existing actual writer starts an unsaved-count UI draft in status=counting.
    assert.equal(result.inventory.status, "counting");
    assert.equal(result.inventory.items.length, 1);
    assert.equal(result.inventory.items[0].expected, 1.92);
    assert.equal(result.inventory.items[0].actual, null);
    assert.equal(result.stockChanged, false);
    assert.deepEqual(unaffected(), before);
    return result.inventory;
  };
  return { ...r, count, send, rawState, unaffected, auditRows, reopen, assertAuditReload, create };
}

test("open-month UI draft cancel preserves actual receipt/sale history and audit survives reload/replay", async () => {
  const r = await runtime();
  try {
    const document = await r.create(), before = r.unaffected();
    assert.equal(r.auditRows(document.id).length, 1);
    const cancelled = await r.send(r.count(), { action: "cancel", id: document.id }, 200);
    assert.equal(cancelled.inventory.status, "cancelled");
    assert.equal(cancelled.stockChanged, false);
    assert.deepEqual(r.unaffected(), before, "cancel preserves exact stock, purchase, sales snapshot, revenue and movement JSON");
    const row = r.auditRows(document.id).find(row => row.action === "cancel")!;
    assert.equal(JSON.parse(String(row.before_json)).status, "counting");
    assert.equal(JSON.parse(String(row.after_json)).status, "cancelled");
    await r.assertAuditReload(document.id, "cancel");
    const after = r.rawState();
    for (let retry = 0; retry < 2; retry++) {
      assert.equal((await r.reopen(document.id)).inventory.status, "cancelled");
      const replay = await r.send(r.count(), { action: "cancel", id: document.id }, 409);
      assert.equal(replay.code, "INVENTORY_READ_ONLY");
      assert.deepEqual(r.rawState(), after, "repeated cancel cannot duplicate effects or audit");
    }
    const deleted = await r.send(r.count(), { action: "delete", id: document.id }, 409);
    assert.equal(deleted.code, "INVENTORY_DELETE_PROTECTED");
    assert.deepEqual(r.rawState(), after, "cancelled document remains auditable and protected from deletion");
  } finally { r.close(); }
});

test("open-month unfinished count deletes safely once; missing-document replay preserves exact audit and history", async () => {
  const r = await runtime();
  try {
    const document = await r.create(), before = r.unaffected();
    const deleted = await r.send(r.count(), { action: "delete", id: document.id }, 200);
    assert.equal(deleted.deleted, true); assert.equal(deleted.deletedInventoryId, document.id);
    assert.equal(deleted.stockChanged, false);
    assert.deepEqual(r.unaffected(), before);
    assert.deepEqual(r.get("bd_inventory_snapshots"), []);
    const row = r.auditRows(document.id).find(row => row.action === "inventory.deleted")!;
    assert.equal(JSON.parse(String(row.before_json)).id, document.id);
    assert.equal(JSON.parse(String(row.before_json)).status, "counting");
    assert.equal(row.after_json, null);
    assert.match(String(row.reason), /склад не изменён/);
    await r.assertAuditReload(document.id, "inventory.deleted");
    const after = r.rawState();
    for (let retry = 0; retry < 2; retry++) {
      assert.equal((await r.reopen(document.id, 404)).code, "INVENTORY_NOT_FOUND");
      const replay = await r.send(r.count(), { action: "delete", id: document.id }, 200);
      assert.equal(replay.idempotent, true); assert.equal(replay.deleted, false); assert.equal(replay.stockChanged, false);
      assert.deepEqual(r.rawState(), after, "delete/reload/replay preserves all raw stores, audit and batch count");
    }
    await r.assertAuditReload(document.id, "inventory.deleted");
  } finally { r.close(); }
});

test("completed count with a real stock adjustment cannot be deleted; rejected attempts retain original sales and inventory audit", async () => {
  const r = await runtime();
  try {
    const document = await r.create();
    await r.send(r.count(), { action: "save", id: document.id, items: [{ productKey: "coffee-stock", actual: 1 }] }, 200);
    await r.send(r.count(), { action: "review", id: document.id }, 200);
    const completed = await r.send(r.count(), { action: "finalize", id: document.id }, 200);
    assert.equal(completed.inventory.status, "completed");
    const adjustments = (r.get("bd_stock_movements") as Row[]).filter(row => row.type === "inventory_adjustment");
    assert.equal(adjustments.length, 1); assert.equal(adjustments[0].amount, -0.92); assert.equal(adjustments[0].costAmount, -92);
    assert.equal((r.get("bd_assortment_v1") as {stockBalances: Row[]}).stockBalances[0].current, 1);
    const after = r.rawState();
    for (let retry = 0; retry < 2; retry++) {
      assert.equal((await r.reopen(document.id)).inventory.status, "completed");
      const deleted = await r.send(r.count(), { action: "delete", id: document.id }, 409);
      assert.equal(deleted.code, "INVENTORY_DELETE_PROTECTED");
      assert.deepEqual(r.rawState(), after);
    }
    assert.equal(r.auditRows(document.id).filter(row => row.action === "inventory.deleted").length, 0);
    await r.assertAuditReload(document.id, "complete");
  } finally { r.close(); }
});

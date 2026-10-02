import assert from "node:assert/strict";
import test from "node:test";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import { equipmentExpenseId } from "../lib/bardoctor/equipment";
import type { WriterInput } from "../lib/bardoctor/integrations/domain-writer";

async function fixture() {
  const r = await lifecycleRuntime({ expenses: "./app/api/expenses/route", equipment: "./app/api/equipment/work-orders/route", payment: "./app/api/purchases/payment/route", reverse: "./app/api/purchases/payment/reverse/route", remove: "./app/api/purchases/delete/route", products: "./app/api/inventory/products/route", taxonomy: "./app/api/nomenclature/taxonomy/route", classification: "./app/api/nomenclature/bulk-classification/route", mapping: "./app/api/purchases/mappings/route", reviews: "./app/api/review-layer/reviews/route", analysis: "./app/api/review-layer/analysis/route", layer: "./lib/bardoctor/review-layer", integration: "./lib/bardoctor/integrations/domain-writer", store: "./app/api/store/[key]/route", calendar: "./lib/bardoctor/opportunity-calendar", market: "./app/api/market/route", alternatives: "./app/api/supplier-alternatives/route", cas: "./lib/bardoctor/store-cas", database: "./db" }, { now: "2026-10-02T12:00:00.000Z" });
  const owner = await r.register("writer-owner@isolated.test"), foreign = await r.register("writer-foreign@isolated.test");
  const venueId = owner.activeVenueId;
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Writer QA", currency: "MDL", timezone: "Europe/Chisinau" }), owner.userId);
  function put(key: string, value: unknown, id = owner.userId) { r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(id, key, JSON.stringify(value), "2026-10-02T09:00:00.000Z"); }
  function get<T = Record<string, unknown>[]>(key: string, id = owner.userId): T { return JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(id, key)?.data_json ?? "null")); }
  const assortment = { nomenclatureStructure: defaultNomenclatureStructure(), nomenclature: [{ id: "item", key: "item", productKey: "item", name: "Item", kind: "stock", unit: "pcs", venueId }], stockBalances: [], menuItems: [], recipes: [] };
  put("bd_assortment_v1", assortment); put("bd_stock_movements", []); put("bd_finance_expenses", []);
  put("bd_equipment", [{ id: "equipment", name: "Freezer", status: "ok", venueId }]);
  put("bd_equipment_work_orders", []); put("bd_equipment_history", []);
  put("bd_suppliers", [{ id: "supplier", name: "Supplier", venueId }]);
  put("bd_purchase_documents", [{ id: "purchase", venueId, status: "confirmed", documentType: "invoice", supplierId: "supplier", supplierName: "Supplier", date: "2026-10-01", currency: "MDL", total: 100, items: [{ id: "line", name: "Item", quantity: 1, price: 100, total: 100 }], createdAt: "2026-10-01T12:00:00Z" }, { id: "draft", venueId, status: "draft", date: "2026-10-01", currency: "MDL", items: [] }]);
  put("bd_guest_reviews", [{ id: "review", venueId, source: "manual", text: "Existing review", rating: 5, publishedAt: "2026-10-01", createdAt: "2026-10-01T12:00:00Z" }]);
  const workOrder = { id: "work-order", equipmentId: "equipment", kind: "maintenance", title: "Maintenance", status: "detected", cost: 20, costDate: "2026-10-02" };
  async function call(route: string, body: unknown, method = "POST", user = owner) { const request = r.request(user, "/api/" + route, method, body); request.headers.set("X-Venue-Id", String(venueId)); return r.api[route][method](request); }
  async function auth() { const account = await r.api.auth.authenticateRequest(r.request(owner, "/api/auth/bootstrap")); assert.ok(account); return account; }
  return { ...r, owner, foreign, venueId, put, get, assortment, workOrder, call, auth };
}

test("standalone expense retries stale read without losing B; audit records only the accepted write", async t => {
  const r = await fixture(); t.after(r.close);
  r.beforeNextDomainWrite(() => r.put("bd_finance_expenses", [{ id: "B", amount: 99, date: "2026-10-02", category: "other" }]));
  const response = await r.call("expenses", { entry: { id: "A", amount: 20, date: "2026-10-02", category: "other" } });
  assert.equal(response.status, 201, JSON.stringify(await response.clone().json()));
  assert.deepEqual(r.get("bd_finance_expenses").map((e: Record<string, unknown>) => e.id), ["A", "B"]);
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE entity_id='A'").get()?.n, 1);
});

for (const [route, body, key, concurrent] of [
  ["products", { action: "create", name: "New service", kind: "service" }, "bd_assortment_v1", { ...{ marker: "B" } }],
  ["taxonomy", { action: "rename", level: "section", id: "bar", name: "Renamed bar" }, "bd_assortment_v1", { marker: "B" }],
  ["classification", { productKeys: ["item"], sectionId: "bar", taxonomyCategoryId: "alcohol" }, "bd_assortment_v1", { marker: "B" }],
  ["mapping", { supplierId: "supplier", rawName: "Item", purchaseProductKey: "item" }, "bd_assortment_v1", { marker: "B" }],
  ["payment", { purchaseId: "purchase", id: "pay-A", date: "2026-10-02", amount: 10, currency: "MDL" }, "bd_finance_expenses", [{ id: "B", amount: 99, date: "2026-10-02" }]],
  ["remove", { documentId: "draft" }, "bd_purchase_documents", "append"],
  ["equipment", { workOrder: { id: "work-order", equipmentId: "equipment", kind: "maintenance", title: "Maintenance", status: "detected", cost: 20, costDate: "2026-10-02" }, syncExpense: true }, "bd_finance_expenses", [{ id: "B", amount: 99, date: "2026-10-02" }]],
  ["reviews", { source: "manual", text: "New review A", rating: 4, publishedAt: "2026-10-02" }, "bd_guest_reviews", "append"],
  ["analysis", { updates: [{ id: "review", sentiment: "positive", summary: "Analysis A", topics: ["staff"] }] }, "bd_guest_reviews", "append"],
] as const) {
  test(`${route}: read A → committed B → write A returns conflict and preserves exact B bytes with no accepted A audit`, async t => {
    const r = await fixture(); t.after(r.close);
    const initial = r.get(key);
    const next = concurrent === "append" ? [...initial, { id: "B", venueId: r.venueId, source: "manual", text: "Concurrent B", rating: 2, publishedAt: "2026-10-02" }] : Array.isArray(concurrent) ? concurrent : { ...initial, ...concurrent };
    let applied = false;
    r.beforeNextDomainWrite(() => { applied = true; r.put(key, next); });
    const auditBefore = r.sqlite.prepare("SELECT * FROM audit_log").all();
    const response = await r.call(route, body, route === "remove" ? "DELETE" : "POST");
    assert.equal(response.status, 409, JSON.stringify(await response.clone().json()));
    assert.equal((await response.json() as { code: string }).code, "STORE_WRITE_CONFLICT"); assert.equal(applied, true, "Fixture must reach a real write");
    assert.deepEqual(r.get(key), next); assert.deepEqual(r.sqlite.prepare("SELECT * FROM audit_log").all(), auditBefore);
  });
}

test("purchase payment reversal preserves concurrent expense; repeated payment remains idempotent", async t => {
  const r = await fixture(); t.after(r.close);
  const response = await r.call("payment", { purchaseId: "purchase", id: "pay-A", date: "2026-10-02", amount: 10, currency: "MDL" });
  assert.ok(response.ok, JSON.stringify(await response.clone().json()));
  const data = await response.json() as { payment?: { id: string }; expense?: { id: string } }; const id = data.payment?.id ?? data.expense?.id;
  assert.ok(id, JSON.stringify(data));
  const before = r.get("bd_finance_expenses");
  r.beforeNextDomainWrite(() => r.put("bd_finance_expenses", [...before, { id: "B", amount: 99, date: "2026-10-02" }]));
  const reverse = await r.call("reverse", { paymentId: id, reason: "QA" });
  assert.equal(reverse.status, 409, JSON.stringify(await reverse.clone().json())); assert.equal((await reverse.json() as { code: string }).code, "STORE_WRITE_CONFLICT");
  assert.deepEqual(r.get("bd_finance_expenses"), [...before, { id: "B", amount: 99, date: "2026-10-02" }]);
});

for (const batch of [false, true]) test(`integration ${batch ? "batch" : "single"} writer preserves B and reports atomic conflict`, async t => {
  const r = await fixture(); t.after(r.close);
  const integration = r.api.integration as unknown as typeof import("../lib/bardoctor/integrations/domain-writer");
  const input = { account: await r.auth(), entityType: "supplier", data: { name: "Supplier A" }, internalId: "supplier-A", envelope: { venueId: r.venueId, entityType: "supplier", data: { name: "Supplier A" }, externalId: "A", externalSystem: "QA", sourceType: "api", sourcePriority: 10, importedAt: "2026-10-02T12:00:00Z", operation: "upsert", syncStatus: "pending" } } as WriterInput;
  const next = [...r.get("bd_suppliers"), { id: "B", name: "Supplier B", venueId: r.venueId }];
  r.beforeNextDomainWrite(() => r.put("bd_suppliers", next));
  const results = batch ? await integration.writeCanonicalSimpleListBatch([input]) : [await integration.writeCanonicalDomainEntity(input)];
  assert.ok(results.every(result => !result.ok && result.code === "STORE_WRITE_CONFLICT")); assert.deepEqual(r.get("bd_suppliers"), next);
});

test("Equipment linked cost: create, repeat, update; standalone/generic edit/delete and ambiguous legacy amount fail closed", async t => {
  const r = await fixture(); t.after(r.close);
  const create = await r.call("equipment", { workOrder: r.workOrder, syncExpense: true }); assert.ok(create.ok, JSON.stringify(await create.clone().json()));
  const expenseId = equipmentExpenseId(r.workOrder.id); assert.equal(r.get("bd_finance_expenses")[0].id, expenseId);
  assert.equal(r.get("bd_finance_expenses")[0].equipmentWorkOrderId, r.workOrder.id);
  assert.ok((await r.call("equipment", { workOrder: r.workOrder, syncExpense: true })).ok); assert.equal(r.get("bd_finance_expenses").length, 1);
  assert.equal((await r.call("equipment", { workOrder: { ...r.workOrder, cost: 30 }, syncExpense: false })).status, 409);
  assert.ok((await r.call("equipment", { workOrder: { ...r.workOrder, cost: 30 }, syncExpense: true })).ok); assert.equal(r.get("bd_finance_expenses")[0].amount, 30);
  const store = r.api.store as unknown as typeof import("../app/api/store/[key]/route");
  for (const key of ["bd_finance_expenses", "bd_equipment_work_orders"]) {
    const original = r.get(key);
    for (const data of [[], original.map((e: Record<string, unknown>) => ({ ...e, amount: 88, cost: 88 }))]) {
      const response = await store.PUT(r.request(r.owner, "/api/store/" + key, "PUT", { data, baseData: original }), { params: Promise.resolve({ key }) });
      assert.equal(response.status, 409, JSON.stringify(await response.clone().json())); assert.equal((await response.json() as { code: string }).code, "USE_EQUIPMENT_WORK_ORDER_API"); assert.deepEqual(r.get(key), original);
    }
  }
  assert.equal((await r.call("expenses", { entry: { id: expenseId, amount: 99, date: "2026-10-02", category: "other" } })).status, 409);
  assert.equal((await r.call("expenses", { entry: { amount: 99, date: "2026-10-02", equipmentWorkOrderId: "guessed", source: "equipment_work_order" } })).status, 409);
  r.put("bd_finance_expenses", [{ ...r.get("bd_finance_expenses")[0], amount: 40 }]);
  assert.equal((await r.call("equipment", { workOrder: { ...r.workOrder, cost: 30 }, syncExpense: true })).status, 409); assert.equal(r.get("bd_finance_expenses")[0].amount, 40);
});

test("Equipment concurrent work-order change is preserved; foreign guessed IDs cannot read or update linked records", async t => {
  const r = await fixture(); t.after(r.close);
  assert.ok((await r.call("equipment", { workOrder: r.workOrder, syncExpense: true })).ok);
  const previous = r.get("bd_equipment_work_orders"); const next = previous.map((w: Record<string, unknown>) => ({ ...w, notes: "Accepted B" }));
  r.beforeNextDomainWrite(() => r.put("bd_equipment_work_orders", next));
  const response = await r.call("equipment", { workOrder: { ...r.workOrder, notes: "A" }, syncExpense: true });
  assert.equal(response.status, 409); assert.deepEqual(r.get("bd_equipment_work_orders"), next);
  assert.equal((await r.call("equipment", { workOrder: r.workOrder, syncExpense: true }, "POST", r.foreign)).status, 401);
  const foreignRequest = r.request(r.foreign, "/api/equipment/work-orders", "POST", { workOrder: r.workOrder, syncExpense: true });
  assert.equal((await r.api.equipment.POST(foreignRequest)).status, 404);
});

for (const [entityType, data, storeKey] of [
  ["product", { name: "Imported product", unit: "pcs", active: true }, "bd_assortment_v1"],
  ["warehouse", { name: "Imported warehouse", active: true }, "bd_warehouses"],
  ["employee", { name: "Imported employee", active: true }, "bd_employees"],
  ["stock_balance", { productKey: "item", productExternalId: "item", productName: "Item", quantity: 15, unit: "pcs", measuredAt: "2026-10-02" }, "bd_assortment_v1"],
  ["write_off", { date: "2026-10-02", reasonCode: "other", items: [{ productKey: "item", productExternalId: "item", name: "Item", quantity: 1, unit: "pcs" }] }, "bd_assortment_v1"],
  ["return", { date: "2026-10-02", direction: "from_customer", items: [{ productKey: "item", productExternalId: "item", name: "Item", quantity: 1, unit: "pcs" }] }, "bd_assortment_v1"],
  ["recipe", { menuItemId: "menu", name: "Imported recipe", yield: 1, ingredients: [{ productKey: "item", productExternalId: "item", name: "Item", quantity: 1, unit: "pcs" }] }, "bd_assortment_v1"],
] as const) test(`integration ${entityType}: guarded existing canonical writer preserves concurrent B`, async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_assortment_v1", { ...r.assortment, stockBalances: [{ id: "item", key: "item", productKey: "item", venueId: r.venueId, name: "Item", current: 20, unit: "pcs", averageUnitCost: 10 }], menuItems: [{ id: "menu", venueId: r.venueId, name: "Menu", consumptionMode: "RECIPE", active: true }] });
  const integration = r.api.integration as unknown as typeof import("../lib/bardoctor/integrations/domain-writer");
  const input = { account: await r.auth(), entityType, data, internalId: "import-A", envelope: { venueId: r.venueId, entityType, data, externalId: "A", externalSystem: "QA", sourceType: "api", sourcePriority: 100, operation: "upsert", syncStatus: "pending" } } as unknown as WriterInput;
  const next = storeKey === "bd_assortment_v1" ? { ...r.get(storeKey), marker: "B" } : [{ id: "B", name: "Concurrent B", venueId: r.venueId }];
  let reached = false; r.beforeNextDomainWrite(() => { reached = true; r.put(storeKey, next); });
  const audit = r.sqlite.prepare("SELECT * FROM audit_log").all();
  const result = await integration.writeCanonicalDomainEntity(input);
  assert.equal(result.code, "STORE_WRITE_CONFLICT", JSON.stringify(result)); assert.equal(reached, true);
  assert.deepEqual(r.get(storeKey), next); assert.deepEqual(r.sqlite.prepare("SELECT * FROM audit_log").all(), audit);
});

for (const [route, storeKey, body, initial] of [
  ["market", "bd_market_analysis_v1", { action: "set-competitor-confirmed", competitorKey: "competitor", confirmed: true }, { competitors: [{ key: "competitor", name: "Competitor", confirmed: false }] }],
  ["alternatives", "bd_supplier_alternatives_v1", { action: "decision", id: "offer", decision: "confirmed" }, { alternatives: [{ id: "offer", supplierName: "Offer", product: "Item", matchedTo: "Item", decision: "new", sourceUrls: ["https://example.invalid/offer"] }] }],
] as const) test(`${route}: competing decisions preserve B with explicit conflict`, async t => {
  const r = await fixture(); t.after(r.close); r.put(storeKey, initial);
  const next = { ...initial, acceptedB: true };
  r.beforeNextDomainWrite(() => r.put(storeKey, next));
  const response = await r.call(route, body, "PATCH");
  assert.equal(response.status, 409, JSON.stringify(await response.clone().json())); assert.equal((await response.json() as { code: string }).code, "STORE_WRITE_CONFLICT"); assert.deepEqual(r.get(storeKey), next);
});

test("calendar endpoint/notification writer cannot overwrite a newer accepted canonical calendar", async t => {
  const r = await fixture(); t.after(r.close);
  const calendar = r.api.calendar as unknown as typeof import("../lib/bardoctor/opportunity-calendar");
  const cas = r.api.cas as unknown as typeof import("../lib/bardoctor/store-cas");
  const database = r.api.database as unknown as typeof import("../db");
  const initial = { version: "opportunity-calendar-v1", events: [] }; r.put("bd_opportunity_calendar_v1", initial);
  const snapshots = await cas.readStoreSnapshots(database.getD1(), r.owner.userId, ["bd_opportunity_calendar_v1"]);
  r.beforeNextDomainWrite(() => r.put("bd_opportunity_calendar_v1", { ...initial, acceptedB: true }));
  await assert.rejects(calendar.saveOpportunityCalendar(r.owner.userId, { ...initial, lostA: true } as unknown as Parameters<typeof calendar.saveOpportunityCalendar>[1], snapshots), error => error instanceof Error && error.name === "StoreWriteConflictError");
  assert.deepEqual(r.get("bd_opportunity_calendar_v1"), { ...initial, acceptedB: true });
});

test("Equipment A cannot erase expense B accepted through the actual standalone expense API", async t => {
  const r = await fixture(); t.after(r.close);
  let acceptedB = false;
  r.beforeNextDomainWrite(async () => {
    const response = await r.call("expenses", { entry: { id: "B-real-command", amount: 77, date: "2026-10-02", category: "other" } });
    assert.equal(response.status, 201); acceptedB = true;
  });
  const response = await r.call("equipment", { workOrder: r.workOrder, syncExpense: true });
  assert.equal(response.status, 409); assert.equal(acceptedB, true);
  assert.deepEqual(r.get("bd_finance_expenses").map(e => [e.id, e.amount]), [["B-real-command", 77]]);
  assert.equal(r.get("bd_equipment_work_orders").length, 0);
});

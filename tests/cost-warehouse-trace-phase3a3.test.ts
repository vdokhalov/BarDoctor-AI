import assert from "node:assert/strict";
import test from "node:test";
import { costTraceRuntime, costFact } from "./helpers/cost-trace-runtime";
import { resolvedEvidence } from "./helpers/revenue-trace-runtime";
import type { SalesEvent } from "../lib/bardoctor/sales-events";
import { cancelSalesDraft, createOrUpdateSalesBatch, manualSalesAdapter } from "../lib/bardoctor/sales-consumption";

type Row = Record<string, unknown>;

test("A/B/C: captured recipe multiple ingredients/quantities and real paginated movement valuation equal canonical captured cost", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts();
  const event = await r.post("known", { quantity: 3 }); const proof = await r.prove(event);
  assert.equal(proof.fact.value, 18.3); assert.equal(proof.fact.costStatus, "KNOWN"); assert.equal(proof.fact.costMethod, "latest_confirmed_receipt"); assert.equal(proof.ids.size, 3);
  const line = costFact((await r.cost(event.id, event.batch.lines[0].id)).body);
  assert.equal(line.quantity, 3); assert.ok(Math.abs(line.capturedUnitCost! - 6.1) < 0.000001); assert.equal(line.menuItemId, "cocktail");
  const captured = event.batch.lines[0].recipeSnapshot!;
  assert.deepEqual(captured.ingredients.map(i => [i.recipeQuantity, i.recipeUnit, i.baseQuantityTotal, i.baseUnit]), [[1, "pcs", 3, "pcs"], [50, "ml", 150, "ml"], [8, "g", 24, "g"]]);
  const sale = resolvedEvidence((await r.resolve(r.reference("SALE_EVENT", event.id))).body);
  const cost = sale.relations.find(r => r.reference.kind === "CAPTURED_COST")!;
  assert.equal(resolvedEvidence((await r.resolve(cost.reference)).body).projection.type, "CAPTURED_COST");
});

test("D/E: actual canonical purchase changes latest price; old captured cost/snapshot remains X and a new posted sale uses Y", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const old = await r.post("before-price", { quantity: 2 });
  const before = await r.prove(old), snapshot = structuredClone(old.batch.lines[0].recipeSnapshot);
  r.purchase("receipt-new-beer", "beer-stock", 10, "pcs", 50, "2026-10-01T11:00:00Z");
  const fresh = costFact((await r.cost(old.id)).body); assert.equal(fresh.value, 12.2); assert.notEqual(fresh.revision, before.fact.revision, "Canonical purchase refreshes the linked current nomenclature; captured monetary value stays unchanged");
  assert.equal((await r.resolve(before.fact.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  const events = r.get("bd_sales_events_v1") as SalesEvent[]; assert.deepEqual(events.find(e => e.id === old.id)!.batch.lines[0].recipeSnapshot, snapshot);
  const newer = await r.post("after-price", { quantity: 2 }); assert.equal((await r.prove(newer)).fact.value, 18.2);
  assert.equal(newer.batch.lines[0].recipeSnapshot!.ingredients[0].costSourceDocumentId, "receipt-new-beer");
  assert.equal((await r.prove(events.find(e => e.id === old.id)!)).fact.value, 12.2);
});

test("F/G/H: UNKNOWN stays null, partly priced ingredients and partly known sale lines stay PARTIAL; NONE legitimately zero with no warehouse movement", async t => {
  const r = await costTraceRuntime(); t.after(r.close);
  const unknown = await r.post("unknown");
  assert.deepEqual(unknown.batch.lines[0].recipeSnapshot!.ingredients.map(i => [i.baseQuantityTotal, i.baseUnit]), [[1, "pcs"], [0.05, "l"], [0.008, "kg"]]);
  const u = costFact((await r.cost(unknown.id)).body); assert.equal(u.costStatus, "UNKNOWN"); assert.equal(u.value, null); assert.equal(u.evidenceStatus, "PARTIAL");
  r.purchase("known-only-beer", "beer-stock", 10, "pcs", 20);
  const partial = await r.post("partial"); const p = costFact((await r.cost(partial.id)).body); assert.equal(p.costStatus, "PARTIAL"); assert.equal(p.value, null); assert.equal(p.canonicalBatchCostStatus, "UNVALUED");
  const mixed = await r.post("mixed", { lines: [{ id: "priced", menuItemId: "beer", quantity: 2 }, { id: "unpriced", menuItemId: "coffee", quantity: 2 }] });
  const m = costFact((await r.cost(mixed.id)).body); assert.equal(m.costStatus, "PARTIAL"); assert.equal(m.value, 4); assert.equal(m.canonicalBatchCostStatus, "PARTIAL", "Captured known-line subtotal is not full cost");
  const none = await r.post("none", { item: "ticket" }); const n = costFact((await r.cost(none.id)).body);
  assert.equal(n.costStatus, "NONE"); assert.equal(n.value, 0); assert.equal(n.costMethod, "NOT_APPLICABLE"); assert.equal(n.evidenceStatus, "COMPLETE");
  assert.deepEqual(none.batch.lines[0].movementIds, []); assert.deepEqual(none.originalMovements, []);
  const line = resolvedEvidence((await r.resolve(n.evidenceRefs[0])).body); assert.ok(line.relations.every(r => r.reference.kind !== "WAREHOUSE_MOVEMENT"));
  r.purchase("free", "whisky-stock", 2, "l", 0); const free = await r.post("known-zero", { item: "whisky" });
  assert.equal(costFact((await r.cost(free.id)).body).costStatus, "KNOWN"); assert.equal((await r.prove(free)).fact.value, 0);
});

test("I: current menu/recipe/nomenclature edits never recost posted snapshots; mutable refs and edited captured input invalidate bindings", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const e = await r.post("historical"); const old = (await r.prove(e)).fact;
  const recipeLine = resolvedEvidence((await r.resolve(old.evidenceRefs[0])).body);
  const recipeRef = recipeLine.relations.find(r => r.reference.kind === "CAPTURED_RECIPE")!.reference;
  const onlyRecipe = r.get("bd_assortment_v1") as Row;
  ((onlyRecipe.recipes as Row[]).find(i => i.id === "cocktail-recipe")!.ingredients as Row[])[0].quantity = 99;
  r.put("bd_assortment_v1", onlyRecipe);
  assert.equal(costFact((await r.cost(e.id)).body).value, 6.1);
  assert.equal(resolvedEvidence((await r.resolve(recipeRef)).body).projection.type, "CAPTURED_RECIPE", "The immutable historical snapshot, not today's recipe, remains evidence");
  const menu = resolvedEvidence((await r.resolve(r.reference("MENU_ITEM", "cocktail"))).body).reference;
  const nom = resolvedEvidence((await r.resolve(r.reference("NOMENCLATURE", "nom-beer"))).body).reference;
  const a = r.get("bd_assortment_v1") as Row;
  (a.menuItems as Row[]).find(i => i.id === "cocktail")!.name = "Changed menu";
  ((a.recipes as Row[]).find(i => i.id === "cocktail-recipe")!.ingredients as Row[])[0].quantity = 99;
  (a.nomenclature as Row[]).find(i => i.id === "nom-beer")!.name = "Changed current nomenclature"; r.put("bd_assortment_v1", a);
  assert.equal(costFact((await r.cost(e.id)).body).value, 6.1);
  for (const ref of [menu, nom, old.traceTarget!.reference]) assert.equal((await r.resolve(ref)).body.code, "READ_MODEL_CHANGED");
  const current = costFact((await r.cost(e.id)).body); const events = r.get("bd_sales_events_v1") as SalesEvent[];
  events.find(x => x.id === e.id)!.batch.lines[0].recipeSnapshot!.ingredients[0].name = "Edited captured data"; r.put("bd_sales_events_v1", events);
  assert.equal((await r.resolve(current.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  const changed = await r.cost(e.id, undefined, r.owner, "&expectedRevision=" + current.revision); assert.equal(changed.body.code, "READ_MODEL_CHANGED");
});

test("J: existing reversal restores quantities through compensating movement, preserves captured cost and retries never double count", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const e = await r.post("reverse", { quantity: 2, source: "MANUAL_GRID" }); const old = (await r.prove(e)).fact;
  await r.command("sales", { action: "reverse", eventId: e.id }); await r.command("sales", { action: "reverse", eventId: e.id });
  const fact = costFact((await r.cost(e.id)).body); assert.equal(fact.value, old.value); assert.equal(fact.lifecycle, "REVERSED");
  assert.equal((await r.resolve(old.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  const movements = (r.get("bd_stock_movements") as Row[]).filter(m => m.salesBatchId === e.id); assert.equal(movements.length, 6);
  assert.equal(Math.round(movements.reduce((n, m) => n + Number(m.costAmount) * 100, 0)), 0);
  const line = resolvedEvidence((await r.resolve(fact.evidenceRefs[0])).body); const reversals = line.relations.filter(r => r.type === "compensates"); assert.equal(reversals.length, 3);
  for (const ref of reversals) { const m = resolvedEvidence((await r.resolve(ref.reference)).body); assert.equal(m.projection.type, "WAREHOUSE_MOVEMENT"); assert.ok(m.relations.some(r => r.type === "compensates")); }
  const denied = await r.post("pos-no-refund"); const response = await r.api.sales.POST(r.request(r.owner, "/api/sales-events", "POST", { venueId: r.venueId, action: "reverse", eventId: denied.id })); assert.equal(response.status, 409); assert.equal((await response.json() as { code: string }).code, "POS_REVERSAL_NOT_AVAILABLE");
  const draft = createOrUpdateSalesBatch({ batches: [], draft: manualSalesAdapter.parse({ businessDate: e.businessDate, lines: [] }), assortment: {}, mappings: [], warehouseRoutes: [], venueId: r.venueId, actor: { accountId: r.owner.userId, name: "QA", role: "owner" } });
  assert.ok(draft.ok); if (draft.ok) assert.ok(cancelSalesDraft({ batches: draft.batches, batchId: draft.batch.id, venueId: r.venueId }).ok);
});

test("K: independent same-shift sales, multiple line quantities and concurrent posts retain unique source IDs and movement evidence", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts();
  const [a, b] = await Promise.all([r.post("parallel-a", { quantity: 1 }), r.post("parallel-b", { quantity: 4 })]);
  const c = await r.post("several-lines", { lines: [{ id: "one", menuItemId: "cocktail", quantity: 1 }, { id: "two", menuItemId: "cocktail", quantity: 2 }] });
  const pa = await r.prove(a), pb = await r.prove(b), pc = await r.prove(c);
  assert.equal(pa.fact.value, 6.1); assert.equal(pb.fact.value, 24.4); assert.equal(pc.fact.value, 18.3);
  assert.equal(new Set([...pa.ids, ...pb.ids, ...pc.ids]).size, 12);
  const duplicate = await r.post("parallel-a", { quantity: 1 }); assert.equal(duplicate.id, a.id);
  assert.equal((r.get("bd_stock_movements") as Row[]).filter(m => m.type === "sale_consumption" && [a.id, b.id, c.id].includes(String(m.salesBatchId))).length, 12);
});

test("L/M: each resolve reauthorizes scope, IDs, nested parents, data owner and permissions; reads preserve canonical content", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const e = await r.post("security"); const f = (await r.prove(e)).fact;
  const ref = f.traceTarget!.reference, movementId = e.batch.lines[0].movementIds[0], movement = r.reference("WAREHOUSE_MOVEMENT", movementId);
  for (const target of [ref, movement]) {
    assert.equal((await r.resolve({ ...target, venueId: r.foreign.activeVenueId })).body.code, "EVIDENCE_UNAVAILABLE");
    assert.equal((await r.resolve({ ...target, workspaceId: r.workspaceId + 1000 })).body.code, "EVIDENCE_UNAVAILABLE");
    assert.equal((await r.resolve({ ...target, id: "guessed" })).body.code, target.expectedRevision ? "READ_MODEL_CHANGED" : "EVIDENCE_UNAVAILABLE");
    assert.equal((await r.resolve(target, r.foreign, "", r.foreign.activeVenueId)).body.code, "EVIDENCE_UNAVAILABLE");
  }
  assert.equal((await r.cost(e.id, "another-parent-line")).body.code, "EVIDENCE_UNAVAILABLE");
  r.permissions("cashier", ["inventory.view"]); assert.equal((await r.resolve(movement, r.member)).body.code, "ACCESS_DENIED");
  const restricted = costFact((await r.cost(e.id, undefined, r.member)).body); assert.equal(restricted.evidenceStatus, "PARTIAL");
  r.permissions("cashier", ["sales.view"], ["inventory.view"]); assert.equal((await r.cost(e.id, undefined, r.member)).body.code, "ACCESS_DENIED");
  assert.equal((await r.resolve(ref, r.member)).body.code, "ACCESS_DENIED");
  r.permissions("manager"); r.sqlite.prepare("UPDATE workspace_memberships SET status='disabled' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  assert.equal((await r.cost(e.id, undefined, r.member)).response.status, 401);
  for (const query of ["&dataAccountId=1", "&workspaceId=1", "&saleId=duplicate", "&lineId=", "&expectedRevision=bad", "&limit=1"]) assert.equal((await r.cost(e.id, undefined, r.owner, query)).response.status, 400);
  const events = r.get("bd_sales_events_v1") as SalesEvent[]; events.find(x => x.id === e.id)!.batch.lines[0].salesBatchId = "foreign-parent"; r.put("bd_sales_events_v1", events);
  assert.equal((await r.cost(e.id)).body.code, "EVIDENCE_UNAVAILABLE");
});

test("missing movement, malformed scopes and captured snapshot cannot fabricate a complete proof; durable original fallback is explicit", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const e = await r.post("retained-original");
  const originalId = e.batch.lines[0].movementIds[0]; const old = costFact((await r.cost(e.id)).body);
  r.put("bd_stock_movements", (r.get("bd_stock_movements") as Row[]).filter(m => m.id !== originalId));
  const retained = resolvedEvidence((await r.resolve(r.reference("WAREHOUSE_MOVEMENT", originalId))).body);
  assert.equal(retained.projection.type === "WAREHOUSE_MOVEMENT" && retained.projection.recordBasis, "SALE_ORIGINAL_MOVEMENT");
  assert.equal(costFact((await r.cost(e.id)).body).value, old.value);
  const events = r.get("bd_sales_events_v1") as SalesEvent[]; const target = events.find(x => x.id === e.id)!; target.originalMovements = target.originalMovements.filter(m => m.id !== originalId); r.put("bd_sales_events_v1", events);
  assert.equal(costFact((await r.cost(e.id)).body).evidenceStatus, "PARTIAL");
  target.batch.lines[0].recipeSnapshot!.ingredients[0].totalCost = 999; r.put("bd_sales_events_v1", events);
  assert.ok((await r.cost(e.id)).body.diagnostics.includes("COST_READ_MODEL_MISMATCH"));
});

test("bound pages above 20 ingredients stay bounded and resolve; duplicate/foreign ingredient and movement source IDs fail closed", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts();
  const a = r.get("bd_assortment_v1") as Row, recipe = (a.recipes as Row[]).find(i => i.id === "cocktail-recipe")!;
  const first = (recipe.ingredients as Row[])[0]; recipe.ingredients = Array.from({ length: 25 }, (_, i) => ({ ...first, id: "piece:" + i })); r.put("bd_assortment_v1", a);
  const event = await r.post("many-ingredients"); const fact = costFact((await r.cost(event.id, event.batch.lines[0].id)).body);
  assert.equal(fact.evidenceStatus, "COMPLETE"); assert.equal(fact.value, 50); assert.equal(fact.evidenceRefs.length, 20);
  assert.equal(fact.diagnostics.includes("RELATIONS_PAGINATED"), true);
  const ref = fact.traceTarget!.reference; const page2 = resolvedEvidence((await r.resolve(ref, r.owner, "&offset=20")).body); assert.equal(page2.relations.length, 6); assert.equal(page2.page.nextOffset, null);
  for (const relation of page2.relations) resolvedEvidence((await r.resolve(relation.reference)).body);
  const events = r.get("bd_sales_events_v1") as SalesEvent[], target = events.find(e => e.id === event.id)!;
  (target.batch.lines[0].recipeSnapshot!.ingredients[0] as unknown as Row).venueId = r.foreign.activeVenueId;
  r.put("bd_sales_events_v1", events);
  assert.equal((await r.cost(event.id)).body.code, "EVIDENCE_UNAVAILABLE");
  const ingredient = r.reference("CAPTURED_INGREDIENT", event.id, { partId: event.batch.lines[0].id, ingredientId: "piece:0" });
  assert.equal((await r.resolve(ingredient)).body.code, "EVIDENCE_UNAVAILABLE");
  const movements = r.get("bd_stock_movements") as Row[]; movements.find(m => m.id === event.batch.lines[0].movementIds[0])!.salesBatchId = "foreign-sale"; r.put("bd_stock_movements", movements);
  assert.equal((await r.resolve(r.reference("WAREHOUSE_MOVEMENT", event.batch.lines[0].movementIds[0]))).body.code, "EVIDENCE_UNAVAILABLE");
});

test("database mutation guards cover all Cost Fact and trace read outcomes, including failure transport", async t => {
  const r = await costTraceRuntime(); t.after(r.close); r.receipts(); const event = await r.post("guarded");
  const before = r.snapshot();
  for (const table of ["domain_data", "audit_log"]) for (const action of ["INSERT", "UPDATE", "DELETE"]) r.sqlite.exec(`CREATE TRIGGER cost_guard_${table}_${action} BEFORE ${action} ON ${table} ${table === 'domain_data' && action === 'INSERT' ? 'WHEN NOT EXISTS (SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key)' : ''} BEGIN SELECT RAISE(ABORT, 'read-only canonical guard'); END`);
  await r.prove(event);
  assert.equal((await r.cost(event.id, undefined, r.owner, "&accountId=1")).response.status, 400);
  const anonymous = await r.api.cost.GET(new Request("https://isolated.test/api/evidence/facts/sale-cost?saleId=" + event.id)); assert.equal(anonymous.status, 401); assert.equal(anonymous.headers.get("Cache-Control"), "private, no-store");
  r.permissions("cashier", ["sales.view"]); assert.equal((await r.cost(event.id, undefined, r.member)).body.code, "ACCESS_DENIED");
  assert.deepEqual(r.snapshot(), before);
});

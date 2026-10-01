import assert from "node:assert/strict";
import test from "node:test";
import { revenueTraceRuntime, revenueFact, resolvedEvidence } from "./helpers/revenue-trace-runtime";
import type { SalesEvent } from "../lib/bardoctor/sales-events";

test("A/B/C: independent posted sales, open provisional -> closed final, unchanged total, direct IDs resolve and old bindings change", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  await r.post("second", "whisky"); await r.post("third", "coffee", 2);
  await r.post("second", "whisky"); // idempotent retry must not double count
  const open = await r.prove();
  assert.equal(open.fact.value, 90); assert.equal(open.ids.size, 3); assert.equal(open.cashIds.size, 1);
  assert.equal(open.fact.finality, "PROVISIONAL"); assert.equal(open.fact.currency, "MDL");
  assert.equal(open.fact.availability, "AVAILABLE"); assert.equal(open.fact.freshness.basis, "RECORD");
  assert.equal((await r.days()).days[0].status, "OPERATING");
  const shift = resolvedEvidence((await r.resolve(r.reference("CASH_SHIFT", "evidence-shift"))).body).reference;
  await r.command("sales", { action: "close_shift", shiftId: "evidence-shift" });
  const closed = await r.prove();
  assert.equal(closed.fact.value, open.fact.value); assert.equal(closed.fact.finality, "FINAL");
  assert.deepEqual(closed.ids, open.ids); assert.equal(closed.fact.factId, open.fact.factId); assert.notEqual(closed.fact.revision, open.fact.revision);
  assert.equal((await r.days()).days[0].status, "AWAITING_OPERATIONAL_DATA", "Final revenue does not complete operational data");
  for (const ref of [shift, open.fact.traceTarget!.reference, open.fact.sourceRef!]) {
    const changed = (await r.resolve(ref)).body;
    assert.equal(changed.code, "READ_MODEL_CHANGED"); assert.ok(!("evidence" in changed));
  }
  const old = (await r.daily(undefined, r.owner, "&expectedRevision=" + open.fact.revision)).body;
  assert.equal(old.code, "READ_MODEL_CHANGED"); assert.ok(!("fact" in old));
});

test("D: venue timezone boundary and overnight shift date are preserved, never replaced by UTC date", async t => {
  const r = await revenueTraceRuntime({ now: "2026-09-30T21:02:00.000Z" }); t.after(r.close);
  assert.equal(r.event.businessDate, "2026-10-01");
  assert.equal((await r.prove("2026-10-01")).fact.businessDate, "2026-10-01");
  assert.equal((await r.daily("2026-09-30")).body.outcome, "unavailable");
  // Stored open shift remains the source of the date after midnight. Canonical
  // command path, not a UTC conversion in the projection, assigns this sale.
  const revenues = r.get("bd_finance_revenue") as Record<string, unknown>[];
  revenues[0].date = "2026-09-30"; r.put("bd_finance_revenue", revenues);
  const events = r.get("bd_sales_events_v1") as SalesEvent[];
  events[0].businessDate = "2026-09-30"; events[0].batch.businessDate = "2026-09-30"; r.put("bd_sales_events_v1", events);
  await r.post("overnight", "whisky");
  const overnight = await r.prove("2026-09-30");
  assert.equal(overnight.fact.value, 60); assert.equal(overnight.ids.size, 2);
  assert.equal((r.get("bd_sales_events_v1") as SalesEvent[])[1].businessDate, "2026-09-30");
});

test("reversal removes only the reversed event from eligible posted evidence; empty shifts and multiple cash sessions retain identities", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  await r.post("kept", "whisky");
  const old = (await r.prove()).fact;
  await r.command("sales", { action: "reverse", eventId: r.event.id });
  const reversed = await r.prove(); assert.equal(reversed.fact.value, 40); assert.equal(reversed.ids.size, 1); assert.ok(!reversed.ids.has(r.event.id));
  assert.equal((await r.resolve(old.traceTarget!.reference)).body.outcome, "changed");
  await r.command("sales", { action: "close_shift", shiftId: "evidence-shift" });
  await r.command("sales", { action: "open_shift", shiftId: "cash-two", name: "Second cash" });
  await r.post("session-two", "ticket", 1, "cash-two");
  await r.command("sales", { action: "close_shift", shiftId: "cash-two" });
  const multiple = await r.prove(); assert.equal(multiple.fact.value, 40); assert.equal(multiple.cashIds.size, 2);
  await r.command("sales", { action: "open_shift", shiftId: "empty", name: "Empty cash" });
  // Closed and open cash sessions on one day retain their own finality; day is provisional.
  const fact = (await r.prove()).fact; assert.equal(fact.finality, "PROVISIONAL"); assert.equal(fact.value, 40);
  const empty = resolvedEvidence((await r.resolve(r.reference("CASH_SHIFT", "empty"))).body);
  assert.equal(empty.projection.type === "CASH_SHIFT" && empty.projection.revenue, 0); assert.deepEqual(empty.relations, []);
});

test("E: manual, import, integration and unknown sources expose real Finance rows only; no synthetic sales or times", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const date = "2026-01-01";
  for (const [row, documents, expected] of [
    [{ id: "manual", date, revenue: 123, currency: "MDL", revenueSource: "MANUAL_SUMMARY" }, [], "MANUAL_SUMMARY"],
    [{ id: "import", date, revenue: 123, currency: "MDL", revenueSource: "sales_documents", salesDocumentIds: ["document"] }, [{ id: "document", date, status: "confirmed", sourceSystem: "FILE_IMPORT", totalRevenue: 123 }], "IMPORT"],
    [{ id: "integration", date, revenue: 123, currency: "MDL", revenueSource: "sales_documents", salesDocumentIds: ["document"] }, [{ id: "document", date, status: "confirmed", sourceSystem: "ONE_C", totalRevenue: 123 }], "INTEGRATION"],
    [{ id: "legacy", date, revenue: 123, currency: "MDL" }, [], "LEGACY_UNKNOWN"],
  ] as const) {
    r.put("bd_finance_revenue", [row]); r.put("bd_sales_documents", documents);
    const fact = revenueFact((await r.daily(date)).body);
    assert.equal(fact.value, 123); assert.equal(fact.sourceType, expected); assert.equal(fact.evidenceStatus, "PARTIAL");
    assert.equal(fact.observedAt, undefined); assert.equal(fact.updatedAt, undefined); assert.equal(fact.effectiveAt, undefined);
    assert.equal(fact.freshness.basis, "STORE_FALLBACK"); assert.equal(fact.finality, expected === "LEGACY_UNKNOWN" ? "UNKNOWN" : "FINAL");
    const root = resolvedEvidence((await r.resolve(fact.traceTarget!.reference)).body);
    assert.deepEqual(root.relations.map(ref => ref.reference.kind), ["FINANCE_REVENUE"]);
    const finance = resolvedEvidence((await r.resolve(root.relations[0].reference)).body);
    assert.equal(finance.projection.type === "FINANCE_REVENUE" && finance.projection.sourceType, expected);
    assert.deepEqual(finance.relations, []);
  }
});

test("F: canonical event change, same-amount content change and deletion invalidate bound fact and parent; unrelated dates do not", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const fact = (await r.prove()).fact;
  const rows = r.get("bd_finance_revenue") as Record<string, unknown>[];
  r.put("bd_finance_revenue", [...rows, { id: "unrelated", date: "2026-01-01", revenue: 7, currency: "MDL" }]);
  assert.equal((await r.resolve(fact.traceTarget!.reference)).body.outcome, "resolved");
  const events = r.get("bd_sales_events_v1") as SalesEvent[];
  events[0].prices[0].name = "Changed captured evidence"; r.put("bd_sales_events_v1", events);
  for (const ref of [fact.traceTarget!.reference, fact.sourceRef!]) assert.equal((await r.resolve(ref)).body.code, "READ_MODEL_CHANGED");
  const fresh = revenueFact((await r.daily()).body);
  r.put("bd_finance_revenue", []); r.put("bd_sales_events_v1", []);
  assert.equal((await r.resolve(fresh.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  assert.equal((await r.daily()).body.outcome, "unavailable");
});

test("G: tenant/data-owner isolation, foreign workspace, guessed IDs, revoked permissions and denied users reauthorize at each hop", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const fact = revenueFact((await r.daily(undefined, r.member)).body);
  assert.equal(fact.venueId, r.venueId); assert.equal(fact.workspaceId, r.workspaceId);
  const root = fact.traceTarget!.reference;
  const foreignWorkspace = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(r.foreign.activeVenueId)!.id);
  r.put("bd_finance_revenue", [{ id: "evidence-shift", venueId: r.foreign.activeVenueId, workspaceId: foreignWorkspace,
    date: r.event.businessDate, revenue: 777, currency: "EUR", revenueSource: "MANUAL_SUMMARY" }], r.foreign.userId);
  const other = revenueFact((await r.daily(undefined, r.foreign, "", r.foreign.activeVenueId)).body);
  assert.equal(other.value, 777); assert.equal(other.currency, "EUR"); assert.equal(other.workspaceId, foreignWorkspace);
  assert.notEqual(other.factId, fact.factId); assert.notEqual(other.revision, fact.revision);
  assert.equal((await r.resolve(other.sourceRef!, r.member)).body.outcome, "unavailable");
  for (const change of [{ venueId: r.foreign.activeVenueId }, { workspaceId: r.workspaceId + 999 }]) {
    const foreign = (await r.resolve({ ...root, ...change }, r.member)).body;
    assert.equal(foreign.outcome, "unavailable"); assert.ok(!("evidence" in foreign));
  }
  assert.equal((await r.daily(undefined, r.member, "", r.foreign.activeVenueId)).response.status, 401);
  assert.equal((await r.resolve(r.reference("SALE_EVENT", "guessed-sale"), r.member)).body.outcome, "unavailable");
  r.permissions("manager", ["sales.view"]);
  const reduced = revenueFact((await r.daily(undefined, r.member)).body);
  assert.equal(reduced.value, fact.value); assert.equal(reduced.sourceType, "BARDOC_POS"); assert.equal(reduced.evidenceStatus, "PARTIAL");
  assert.ok(reduced.diagnostics.includes("RELATIONS_RESTRICTED"));
  const finance = resolvedEvidence((await r.resolve(reduced.sourceRef!, r.member)).body);
  assert.ok(finance.relations.every(ref => ref.reference.kind !== "SALE_EVENT"));
  assert.ok(!JSON.stringify(finance).includes(r.event.id));
  assert.equal((await r.resolve(root, r.member)).body.code, "READ_MODEL_CHANGED");
  for (const id of [r.event.id, "guessed-sale"]) assert.equal((await r.resolve(r.reference("SALE_EVENT", id), r.member)).body.outcome, "restricted");
  r.permissions("manager", ["shifts.view"]);
  assert.equal((await r.daily(undefined, r.member)).body.outcome, "restricted");
  assert.equal((await r.resolve(root, r.member)).body.outcome, "restricted");
  r.permissions("manager");
  r.sqlite.prepare("UPDATE workspace_memberships SET status='revoked' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  assert.equal((await r.daily(undefined, r.member)).response.status, 401);
  assert.equal((await r.resolve(root, r.member)).response.status, 401);
  const anonymous = await r.api.daily.GET(new Request("https://isolated.test/api/evidence/facts/daily-revenue?businessDate=" + r.event.businessDate));
  assert.equal(anonymous.status, 401); assert.equal(anonymous.headers.get("Cache-Control"), "private, no-store");
});

test("nested sale foreign parent/venue cannot be resolved from revenue trace; foreign stored records never enter proof", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const events = r.get("bd_sales_events_v1") as SalesEvent[];
  const foreign = { ...events[0], id: "foreign-secret", venueId: r.foreign.activeVenueId, revenue: 999999 };
  r.put("bd_sales_events_v1", [...events, foreign]);
  const local = await r.prove(); assert.equal(local.fact.value, 20); assert.ok(!local.ids.has(foreign.id));
  events[0].batch.lines[0].salesBatchId = "wrong-parent"; r.put("bd_sales_events_v1", [...events, foreign]);
  assert.equal((await r.resolve(r.reference("SALE_EVENT", r.event.id, { partId: "line-1" }))).body.outcome, "unavailable");
  events[0].batch.lines[0].salesBatchId = events[0].id; events[0].batch.venueId = r.foreign.activeVenueId; r.put("bd_sales_events_v1", events);
  assert.equal((await r.resolve(r.reference("SALE_EVENT", r.event.id, { partId: "line-1" }))).body.outcome, "unavailable");
});

test("contradictory explicit workspace ownership fails closed rather than filtering a different canonical daily total", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const fact = (await r.prove()).fact;
  const events = r.get("bd_sales_events_v1") as SalesEvent[];
  r.put("bd_sales_events_v1", [...events, { ...r.event, id: "foreign-workspace-secret", workspaceId: r.workspaceId + 999, revenue: 777777 }]);
  const result = (await r.daily()).body;
  assert.equal(result.outcome, "unavailable"); assert.ok(result.diagnostics.includes("RECORD_NEEDS_REVIEW"));
  assert.ok(!JSON.stringify(result).includes("777777")); assert.ok(!JSON.stringify(result).includes("foreign-workspace-secret"));
  assert.equal((await r.resolve(fact.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  assert.equal((await r.resolve(r.reference("SALE_EVENT", "foreign-workspace-secret"))).body.outcome, "unavailable");
});

test("bounded sale references paginate under bound cash parent, root references paginate over more than 20 real shifts", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  for (let i = 0; i < 24; i++) await r.post("many:" + i, "ticket");
  const many = await r.prove(); assert.equal(many.ids.size, 25); assert.equal(many.fact.value, 20);
  const cash = resolvedEvidence((await r.resolve(r.reference("CASH_SHIFT", "evidence-shift"))).body);
  assert.equal(cash.relations.length, 20); assert.equal(cash.page.nextOffset, 20);
  assert.ok(!JSON.stringify(many.fact).includes('"prices"')); assert.ok(!JSON.stringify(many.fact).includes('"batch"'));
  await r.command("sales", { action: "close_shift", shiftId: "evidence-shift" });
  for (let i = 0; i < 20; i++) {
    const shiftId = "many-shift:" + i;
    await r.command("sales", { action: "open_shift", shiftId, name: "Cash " + i });
    await r.command("sales", { action: "close_shift", shiftId });
  }
  const fact = revenueFact((await r.daily()).body); assert.equal(fact.evidenceRefs.length, 20); assert.equal(fact.sourceRef, null);
  const all = await r.prove(); assert.equal(all.cashIds.size, 21); assert.equal(all.ids.size, 25); assert.equal(all.fact.value, 20);
});

test("mismatched canonical Finance is blocked, including compensating per-shift errors; invalid data never claims complete proof", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const rows = r.get("bd_finance_revenue") as Record<string, unknown>[];
  rows[0].revenue = 999; r.put("bd_finance_revenue", rows);
  const mismatch = (await r.daily()).body;
  assert.equal(mismatch.outcome, "unavailable"); assert.ok(mismatch.diagnostics.includes("REVENUE_READ_MODEL_MISMATCH")); assert.ok(!("fact" in mismatch));
  rows[0].revenue = 10;
  r.put("bd_finance_revenue", [...rows, { ...rows[0], id: "offsetting-empty", revenue: 10 }]);
  assert.ok((await r.daily()).body.diagnostics.includes("REVENUE_READ_MODEL_MISMATCH"));
  rows[0].revenue = 20; r.put("bd_finance_revenue", rows);
  r.put("bd_sales_events_v1", [r.event, r.event]);
  assert.equal((await r.daily()).body.outcome, "unavailable");
  r.put("bd_sales_events_v1", [r.event]); rows[0].currency = "EUR"; r.put("bd_finance_revenue", rows);
  const currency = revenueFact((await r.daily()).body); assert.equal(currency.currency, null); assert.equal(currency.availability, "PARTIAL"); assert.equal(currency.evidenceStatus, "PARTIAL");
  rows[0].currency = "MDL";
  r.put("bd_finance_revenue", [...rows, { ...rows[0], date: "2026-01-01" }]);
  assert.equal((await r.daily()).body.outcome, "unavailable", "References must be unique in the canonical namespace, not just the date");
});

test("source content binding detects event source and confirmed-document provenance edits without manufacturing evidence", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  const pos = (await r.prove()).fact;
  const events = r.get("bd_sales_events_v1") as SalesEvent[];
  events[0].source = "FILE_IMPORT"; r.put("bd_sales_events_v1", events);
  assert.equal((await r.resolve(pos.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  const imported = revenueFact((await r.daily()).body); assert.equal(imported.sourceType, "IMPORT"); assert.equal(imported.value, pos.value);
  const date = "2026-01-01";
  r.put("bd_finance_revenue", [{ id: "doc-revenue", date, revenue: 12, currency: "MDL", revenueSource: "sales_documents", salesDocumentIds: ["doc"] }]);
  const documents = [{ id: "doc", date, sourceSystem: "FILE_IMPORT", status: "confirmed", totalRevenue: 12 }];
  r.put("bd_sales_documents", documents);
  const bound = revenueFact((await r.daily(date)).body);
  documents[0].sourceSystem = "ONE_C"; r.put("bd_sales_documents", documents);
  assert.equal((await r.resolve(bound.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED");
  assert.equal((await r.resolve(bound.sourceRef!)).body.code, "READ_MODEL_CHANGED");
  assert.equal(revenueFact((await r.daily(date)).body).sourceType, "INTEGRATION");
});

test("strict query, server-derived namespace and read-only domain triggers preserve every canonical store", async t => {
  const r = await revenueTraceRuntime(); t.after(r.close);
  for (const query of ["&accountId=1", "&dataAccountId=1", "&workspaceId=1", "&venueId=1", "&businessDate=2026-01-01", "&expectedRevision=fake", "&limit=20"]) {
    assert.equal((await r.daily(undefined, r.owner, query)).response.status, 400);
  }
  for (const date of ["2026-02-30", "2026-13-01", "2026-1-1", "2026-01-01T00:00:00Z"]) assert.equal((await r.daily(date)).response.status, 400);
  // Existing auth may issue INSERT OR IGNORE for already initialized stores.
  // Block new content and all updates/deletes; the no-op is outside domain reads.
  for (const action of ["INSERT", "UPDATE", "DELETE"]) r.sqlite.exec(`CREATE TRIGGER revenue_no_${action.toLowerCase()} BEFORE ${action} ON domain_data
    ${action === "INSERT" ? "WHEN NOT EXISTS (SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key)" : ""}
    BEGIN SELECT RAISE(ABORT, 'canonical writes forbidden'); END`);
  const before = r.snapshot();
  const response = await r.daily(); assert.equal(response.response.headers.get("Cache-Control"), "private, no-store");
  assert.match(response.response.headers.get("Vary")!, /X-Venue-Id/);
  await r.prove(); assert.deepEqual(r.snapshot(), before);
  assert.ok(!("confidence" in revenueFact(response.body)));
});

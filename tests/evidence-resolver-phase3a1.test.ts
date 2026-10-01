import assert from "node:assert/strict";
import test from "node:test";
import { evidenceRuntime } from "./helpers/evidence-runtime";
import { boundedEvidenceReferences, businessFactIdentity, evidenceContentRevision, parseEvidenceReference, type EvidenceReference, type EvidenceResolution } from "../lib/bardoctor/evidence-contracts";

function evidence(body: EvidenceResolution) {
  assert.ok(body.outcome === "resolved" || body.outcome === "partial", JSON.stringify(body));
  return body.evidence;
}
const withoutClock = (body: EvidenceResolution) => ({ ...body, asOf: "clock" });

test("same-venue canonical records written through actual sales/ingestion handlers; byte-identical business stores, audit and files after resolution", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const before = r.snapshot();
  for (const [kind, id] of [["SALE_EVENT", r.event.id], ["CASH_SHIFT", "evidence-shift"], ["FINANCE_REVENUE", "evidence-shift"], ["MENU_ITEM", "beer"], ["MENU_INGESTION_DRAFT", r.draft.id]] as const) {
    const { response, body } = await r.resolve(r.reference(kind, id));
    assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.match(response.headers.get("Vary")!, /X-Venue-Id/);
    const e = evidence(body); assert.equal(e.projection.type, kind); assert.equal(e.reference.venueId, r.venueId);
    assert.equal(e.binding, "CURRENT_RECORD"); assert.match(e.revision, /^sha256:[a-f0-9]{64}$/);
    assert.equal(e.traceTarget.reference.expectedRevision, e.revision);
    assert.equal(evidence((await r.resolve(e.reference)).body).binding, "EXPECTED_REVISION");
    assert.equal(e.freshness.assessment, "UNKNOWN"); assert.notEqual(e.evidenceStatus as string, "COMPLETE");
    assert.ok(e.relations.length <= 20);
  }
  assert.deepEqual(r.snapshot(), before, "All canonical data_json bytes and updated_at values remain identical");
  const sale = evidence((await r.resolve(r.reference("SALE_EVENT", r.event.id))).body);
  assert.equal(sale.projection.type === "SALE_EVENT" && sale.projection.revenue, 20);
  assert.equal(sale.projection.type === "SALE_EVENT" && sale.projection.sourceType, "BARDOC_POS");
  assert.equal(sale.relations[0].reference.id, r.event.revenueRowId);
  evidence((await r.resolve(sale.relations[0].reference)).body);
  const cash = evidence((await r.resolve(r.reference("CASH_SHIFT", "evidence-shift"))).body);
  assert.equal(cash.finality, "PROVISIONAL"); assert.equal(cash.relations[0].reference.id, r.event.id);
});

test("foreign venue/workspace and foreign owned rows are indistinguishable from missing; scope cannot switch the active venue", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const ref = r.reference("MENU_ITEM", "beer");
  const missing = withoutClock((await r.resolve({ ...ref, id: "guessed-nonexistent-id" })).body);
  for (const change of [{ venueId: r.foreign.activeVenueId }, { workspaceId: r.workspaceId + 1000 }, { venueId: r.foreign.activeVenueId, id: "nonexistent" }]) {
    assert.deepEqual(withoutClock((await r.resolve({ ...ref, ...change })).body), missing);
  }
  const assortment = r.get("bd_assortment_v1") as { menuItems: object[] };
  assortment.menuItems.push({ id: "foreign-row", venueId: r.foreign.activeVenueId, name: "FOREIGN-SECRET", salePrice: 99 });
  assortment.menuItems.push({ id: "foreign-workspace-row", venueId: r.venueId, workspaceId: r.workspaceId + 1000, name: "FOREIGN-SECRET", salePrice: 99 });
  r.put("bd_assortment_v1", assortment);
  for (const id of ["foreign-row", "foreign-workspace-row"]) assert.deepEqual(withoutClock((await r.resolve({ ...ref, id })).body), missing);
  const unauthorizedVenue = await r.resolve(ref, r.owner, "", r.foreign.activeVenueId);
  assert.equal(unauthorizedVenue.response.status, 401); assert.ok(!("evidence" in unauthorizedVenue.body));
});

test("same local ID in separate tenant namespaces, including actor != dataAccount", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const foreignScope = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(r.foreign.activeVenueId)!.id);
  r.put("bd_assortment_v1", { menuItems: [{ id: "beer", venueId: r.foreign.activeVenueId, name: "Foreign beer", salePrice: 999, currency: "EUR", active: true }] }, r.foreign.userId);
  const local = evidence((await r.resolve(r.reference("MENU_ITEM", "beer"), r.member)).body);
  const foreign = evidence((await r.resolve(r.reference("MENU_ITEM", "beer", { venueId: r.foreign.activeVenueId, workspaceId: foreignScope }), r.foreign, "", r.foreign.activeVenueId)).body);
  assert.equal(local.projection.type === "MENU_ITEM" && local.projection.salePrice, 20);
  assert.equal(foreign.projection.type === "MENU_ITEM" && foreign.projection.salePrice, 999);
  assert.notEqual(local.revision, foreign.revision);
  assert.equal((await r.resolve(foreign.reference, r.member)).body.outcome, "unavailable");
});

test("revalidate session, venue and workspace membership and permissions on EVERY request; guessed IDs do not bypass RBAC", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const ref = evidence((await r.resolve(r.reference("SALE_EVENT", r.event.id), r.member)).body).reference;
  r.permissions("cashier", ["sales.view"]);
  const denied = await r.resolve(ref, r.member), guessed = await r.resolve({ ...ref, id: "guessed-id" }, r.member);
  assert.equal(denied.body.outcome, "restricted"); assert.deepEqual(withoutClock(denied.body), withoutClock(guessed.body));
  r.permissions("manager");
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, r.member.userId);
  assert.equal((await r.resolve(ref, r.member)).response.status, 401);
  r.permissions("manager");
  r.sqlite.prepare("UPDATE workspace_memberships SET status='revoked' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  assert.equal((await r.resolve(ref, r.member)).response.status, 401);
  r.sqlite.prepare("UPDATE workspace_memberships SET status='active' WHERE workspace_id=? AND account_id=?").run(r.workspaceId, r.member.userId);
  r.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE account_id=?").run(r.member.userId);
  assert.equal((await r.resolve(ref, r.member)).response.status, 401);
  assert.equal((await r.api.evidence.GET(new Request("https://isolated.test/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref))))).status, 401);
});

test("private ingestion staging keeps inventory.manage and hides inaccessible relations/DTOs", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  r.permissions("cashier", [], ["inventory.view"]);
  const allowed = evidence((await r.resolve(r.reference("MENU_ITEM", "beer"), r.member)).body);
  assert.equal(allowed.projection.type, "MENU_ITEM");
  for (const id of [r.draft.id, "guessed-draft"]) assert.equal((await r.resolve(r.reference("MENU_INGESTION_DRAFT", id), r.member)).body.outcome, "restricted");
  r.permissions("cashier", ["shifts.view"]);
  const sale = evidence((await r.resolve(r.reference("SALE_EVENT", r.event.id), r.member)).body);
  assert.deepEqual(sale.relations, []); assert.equal(sale.page.nextOffset, null);
  assert.ok((await r.resolve(r.reference("SALE_EVENT", r.event.id), r.member)).body.diagnostics.includes("RELATIONS_RESTRICTED"));
});

test("strict parsing, unsupported registry kinds, missing/corrupt/legacy resources and pagination limits", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const ref = r.reference("MENU_ITEM", "beer");
  for (const value of [null, [], { ...ref, venueId: "1" }, { ...ref, workspaceId: 0 }, { ...ref, expectedRevision: "fake" }, { ...ref, storeKey: "bd_assortment_v1" }, { ...ref, id: "" }, { ...ref, partId: "line" }, { ...ref, contractVersion: 2 }]) assert.equal((await r.resolve(value)).response.status, 400);
  for (const kind of ["WAREHOUSE_MOVEMENT", "arbitrary_store_key", "__proto__"]) assert.equal((await r.resolve({ ...ref, kind })).body.outcome, "unsupported");
  for (const query of ["&limit=21", "&limit=0", "&offset=-1", "&offset=10001", "&limit=2&limit=3", "&storeKey=bd_assortment_v1"]) assert.equal((await r.resolve(ref, r.owner, query)).response.status, 400);
  for (const raw of ["%7Bbroken", encodeURIComponent("x".repeat(2049))]) {
    const req = r.request(r.owner, "/api/evidence/resolve?ref=" + raw); req.headers.set("X-Venue-Id", String(r.venueId));
    assert.equal((await r.api.evidence.GET(req)).status, 400);
  }
  assert.equal((await r.resolve({ ...ref, id: "not-found" })).body.outcome, "unavailable");
  r.put("bd_assortment_v1", { menuItems: [{ id: "legacy", name: "Old test record", salePrice: 3 }] });
  const legacy = await r.resolve({ ...ref, id: "legacy" }); assert.equal(legacy.body.outcome, "partial");
  assert.ok(legacy.body.diagnostics.includes("SOURCE_UNKNOWN"));
  r.put("bd_assortment_v1", { menuItems: "broken" });
  assert.equal((await r.resolve(ref)).body.outcome, "unavailable");
  r.sqlite.prepare("UPDATE domain_data SET data_json='invalid-json' WHERE account_id=? AND store_key='bd_assortment_v1'").run(r.owner.userId);
  assert.equal((await r.resolve(ref)).body.outcome, "unavailable");
  r.put("bd_finance_revenue", [{ id: "bad-date", date: "9999-99-99" }]);
  assert.equal((await r.resolve(r.reference("FINANCE_REVENUE", "bad-date"))).body.outcome, "partial");
});

test("content binding detects menu edits, draft edits and shift close; no current values are presented as old evidence", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const menu = evidence((await r.resolve(r.reference("MENU_ITEM", "beer"))).body).reference;
  const draft = evidence((await r.resolve(r.reference("MENU_INGESTION_DRAFT", r.draft.id))).body).reference;
  const shift = evidence((await r.resolve(r.reference("CASH_SHIFT", "evidence-shift"))).body).reference;
  const assortment = r.get("bd_assortment_v1") as { menuItems: { id: string; salePrice: number }[] };
  assortment.menuItems.find(i => i.id === "beer")!.salePrice = 40; r.put("bd_assortment_v1", assortment);
  await r.command("ingestion", { action: "update", draftId: r.draft.id, revision: r.draft.revision, rows: r.draft.rows.map(row => ({ ...row, item: { ...row.item, salePrice: 15 } })) });
  await r.command("sales", { action: "close_shift", shiftId: "evidence-shift" });
  for (const ref of [menu, draft, shift]) {
    const changed = await r.resolve(ref); assert.equal(changed.body.outcome, "changed"); assert.equal(changed.body.code, "READ_MODEL_CHANGED");
    assert.ok(!("evidence" in changed.body)); assert.ok(!JSON.stringify(changed.body).includes("salePrice"));
  }
  assert.equal(evidence((await r.resolve(r.reference("MENU_ITEM", "beer"))).body).projection.type, "MENU_ITEM");
  // Changes to an unrelated menu item do not invalidate this item's bound reference.
  const fresh = evidence((await r.resolve(r.reference("MENU_ITEM", "beer"))).body).reference;
  assortment.menuItems.find(i => i.id === "coffee")!.salePrice = 999; r.put("bd_assortment_v1", assortment);
  assert.equal(evidence((await r.resolve(fresh)).body).binding, "EXPECTED_REVISION");
});

test("nested sale/draft children must belong to their scoped parent, even when local IDs collide", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const saleRef = r.reference("SALE_EVENT", r.event.id, { partId: "line-1" });
  assert.equal(evidence((await r.resolve(saleRef)).body).projection.type, "SALE_LINE");
  const draftRef = r.reference("MENU_INGESTION_DRAFT", r.draft.id, { partId: r.draft.rows[0].id });
  assert.equal(evidence((await r.resolve(draftRef)).body).projection.type, "MENU_INGESTION_LINE");
  const events = r.get("bd_sales_events_v1") as typeof r.event[];
  events[0].batch.lines[0].salesBatchId = "another-parent"; r.put("bd_sales_events_v1", events);
  assert.equal((await r.resolve(saleRef)).body.outcome, "unavailable");
  events[0].batch.lines[0].salesBatchId = events[0].id; events[0].batch.venueId = r.foreign.activeVenueId; r.put("bd_sales_events_v1", events);
  assert.equal((await r.resolve(saleRef)).body.outcome, "unavailable");
  const drafts = r.get("bd_menu_ingestion_v1") as typeof r.draft[];
  drafts[0].rows[0].item.venueId = r.foreign.activeVenueId; r.put("bd_menu_ingestion_v1", drafts);
  assert.equal((await r.resolve(draftRef)).body.outcome, "unavailable");
  assert.equal((await r.resolve({ ...draftRef, partId: "child-from-another-parent" })).body.outcome, "unavailable");
});

test("binding includes canonical inputs used for a finance row source classification", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  const ref = evidence((await r.resolve(r.reference("FINANCE_REVENUE", "evidence-shift"))).body).reference;
  const revenues = r.get("bd_finance_revenue");
  const events = r.get("bd_sales_events_v1") as typeof r.event[];
  events[0].source = "FILE_IMPORT"; r.put("bd_sales_events_v1", events);
  assert.deepEqual(r.get("bd_finance_revenue"), revenues);
  assert.equal((await r.resolve(ref)).body.outcome, "changed");
  const current = evidence((await r.resolve(r.reference("FINANCE_REVENUE", "evidence-shift"))).body);
  assert.equal(current.projection.type === "FINANCE_REVENUE" && current.projection.sourceType, "IMPORT");
  events[0].status = "REVERSED"; r.put("bd_sales_events_v1", events);
  const reversed = evidence((await r.resolve(r.reference("FINANCE_REVENUE", "evidence-shift"))).body);
  assert.equal(reversed.projection.type === "FINANCE_REVENUE" && reversed.projection.sourceType, "IMPORT", "Reversal does not erase the recorded source family");
  assert.deepEqual(reversed.relations, [], "Only posted sales directly support the current revenue total");
});

test("bounded direct relations use typed targets, pagination and fresh RBAC; never copy private payload", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  // Use the actual confirmation handler to create 25 canonical results.
  const created = await r.command("ingestion", { action: "create", source: "MANUAL", draftId: "draft:many-evidence", items: Array.from({ length: 25 }, (_, i) => ({ name: `Service ${i}`, salePrice: 10, currency: "MDL", sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE", type: "service", active: true })) }) as { draft: typeof r.draft };
  const validated = await r.command("ingestion", { action: "validate", draftId: created.draft.id, revision: created.draft.revision }) as { draft: typeof r.draft };
  const confirmed = await r.command("ingestion", { action: "confirm", draftId: validated.draft.id, revision: validated.draft.revision, validationHash: validated.draft.validationHash }) as { draft: typeof r.draft };
  const drafts = r.get("bd_menu_ingestion_v1") as typeof r.draft[];
  const target = drafts.find(d => d.id === confirmed.draft.id)!;
  Object.assign(target, { provenance: { sourceFileIds: ["PRIVATE-FILE-ID"], sourceUrl: "https://private.invalid/token=PRIVATE-TOKEN" }, password: "PRIVATE-PASSWORD", validationHash: "PRIVATE-VALIDATION-HASH" });
  r.put("bd_menu_ingestion_v1", drafts);
  const ref = r.reference("MENU_INGESTION_DRAFT", target.id), before = r.snapshot();
  const first = evidence((await r.resolve(ref)).body); assert.equal(first.relations.length, 20); assert.equal(first.page.nextOffset, 20);
  const second = evidence((await r.resolve(first.reference, r.owner, "&offset=20")).body); assert.equal(second.relations.length, 5); assert.equal(second.page.nextOffset, null);
  assert.equal(new Set([...first.relations, ...second.relations].map(rel => rel.reference.id)).size, 25);
  for (const rel of [...first.relations, ...second.relations]) {
    assert.equal(rel.type, "confirmed_for"); assert.equal(rel.reference.kind, "MENU_ITEM");
    assert.ok(parseEvidenceReference(rel.reference).ok); evidence((await r.resolve(rel.reference)).body);
  }
  const serialized = JSON.stringify(first);
  for (const forbidden of ["PRIVATE-", r.owner.token, r.owner.email, "rows", "resultIds", "validationHash", "sourceUrl", "password", "recipeSnapshot", "data_json", "store_key"]) assert.ok(!serialized.includes(forbidden), forbidden);
  assert.deepEqual(r.snapshot(), before);
});

test("fact identities stay logical; scoped content binding and bounded reference producers are deterministic", async () => {
  const scope = { venueId: 1, workspaceId: 2 };
  const id = businessFactIdentity({ ...scope, factType: "DAILY_REVENUE", businessDate: "2026-10-01" });
  assert.equal(id, businessFactIdentity({ ...scope, factType: "DAILY_REVENUE", businessDate: "2026-10-01" }));
  assert.notEqual(id, businessFactIdentity({ ...scope, venueId: 3, factType: "DAILY_REVENUE", businessDate: "2026-10-01" }));
  const ref: EvidenceReference = { ...scope, contractVersion: 1, kind: "MENU_ITEM", id: "menu-1" };
  assert.equal(await evidenceContentRevision(ref, { a: 1, b: 2 }), await evidenceContentRevision(ref, { b: 2, a: 1 }));
  assert.notEqual(await evidenceContentRevision(ref, { a: 1 }), await evidenceContentRevision({ ...ref, workspaceId: 3 }, { a: 1 }));
  assert.equal(boundedEvidenceReferences(Array.from({ length: 50 }, () => ref)).evidenceRefs.length, 20);
  assert.equal(boundedEvidenceReferences(Array.from({ length: 50 }, () => ref)).truncated, true);
});

test("infrastructure failure stays private/no-store, fails closed and emits no raw error or canonical payload", async t => {
  const r = await evidenceRuntime(); t.after(r.close);
  r.failDatabase();
  const { response, body } = await r.resolve(r.reference("MENU_ITEM", "beer"));
  assert.equal(response.status, 500); assert.equal(body.code as string, "INFRASTRUCTURE_ERROR");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.ok(!("evidence" in body));
  assert.doesNotMatch(JSON.stringify(body), /injected|SQL|database|stack|cause|recipeSnapshot/);
});

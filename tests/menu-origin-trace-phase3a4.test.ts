import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import * as XLSX from "xlsx";
import { menuTraceRuntime, menuFact, menuEvidence, service } from "./helpers/menu-trace-runtime";
import type { EvidenceReference } from "../lib/bardoctor/evidence-contracts";

async function walk(r: Awaited<ReturnType<typeof menuTraceRuntime>>, start: EvidenceReference) {
  const seen = new Map<string, ReturnType<typeof menuEvidence>>(), queue = [start];
  while (queue.length) {
    const ref = queue.shift()!, key = JSON.stringify([ref.kind, ref.id, ref.partId]); if (seen.has(key)) continue;
    let offset: number | null = 0;
    do { const e = menuEvidence((await r.resolve(ref, r.owner, "&limit=2&offset=" + offset)).body); assert.equal(e.binding, "EXPECTED_REVISION"); seen.set(key, e); queue.push(...e.relations.map(x => x.reference)); offset = e.page.nextOffset; } while (offset !== null);
  }
  return [...seen.values()];
}

test("Manual correction → real confirm audit → canonical identity, recipe, bound references and lost-response/idempotent retry", async () => {
  const r = await menuTraceRuntime(); try {
    let draft = await r.create("draft:manual-origin", [service("Manual", { consumptionMode: "RECIPE", type: "composite" })]);
    draft = await r.review(draft, { salePrice: 17 }); const { draft: confirmed, input } = await r.confirm(draft), id = confirmed.resultIds![0];
    const fact = menuFact((await r.origin(id)).body); assert.equal(fact.originSourceType, "MANUAL"); assert.equal(fact.originDraftId, draft.id); assert.equal(fact.originRowId, draft.rows[0].id); assert.equal(fact.currentMenu.salePrice, 17); assert.equal(fact.currentMenu.currency, "MDL"); assert.equal(fact.currentMatchesConfirmed, true); assert.equal(fact.evidenceStatus, "PARTIAL"); assert.equal(fact.originalSourceValuesAvailable, false); assert.ok(fact.diagnostics.includes("SOURCE_VALUES_NOT_RETAINED"));
    const evidence = await walk(r, fact.traceTarget!.reference), confirmation = evidence.find(e => e.projection.type === "MENU_CONFIRMATION")!.projection;
    assert.equal(confirmation.type, "MENU_CONFIRMATION"); if (confirmation.type !== "MENU_CONFIRMATION") throw Error("wrong projection");
    assert.equal(confirmation.menuItemId, id); assert.equal(confirmation.outcome, "ADDED"); assert.equal(confirmation.reviewedValues.salePrice, 17); assert.equal(confirmation.appliedValues.salePrice, 17); assert.equal(confirmation.recordBasis, "EXISTING_CONFIRMATION_AUDIT");
    const recipes = evidence.filter(e => e.projection.type === "MENU_RECIPE"); assert.equal(recipes.length, 1); assert.equal(recipes[0].reference.partId, (r.get().recipes as { id: string }[])[0].id);
    assert.equal(evidence.some(e => e.projection.type === "MENU_SOURCE_FILE"), false, "Manual has no synthetic source document");
    const before = r.snapshot(); for (let retry = 0; retry < 2; retry++) assert.equal((await r.command(input)).idempotent, true);
    assert.deepEqual(r.snapshot(), before); assert.equal(menuFact((await r.origin(id)).body).revision, fact.revision); await walk(r, fact.traceTarget!.reference);
  } finally { r.close(); }
});

for (const [label, bytes, filename, mime] of [
  ["UTF8", readFileSync(new URL("fixtures/menu-cyrillic-utf8.csv", import.meta.url)), "меню.csv", "text/csv"],
  ["BOM", readFileSync(new URL("fixtures/menu-cyrillic-utf8-bom.csv", import.meta.url)), "меню-BOM.csv", "text/csv"],
  ["ASCII", readFileSync(new URL("fixtures/menu-ascii.csv", import.meta.url)), "ascii.csv", "text/csv"],
  ["XLSX", XLSX.write(XLSX.read(readFileSync(new URL("fixtures/menu-cyrillic-utf8.csv", import.meta.url)).toString("utf8"), { type: "string", raw: true }), { type: "buffer", bookType: "xlsx" }), "меню.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
] as const) test(`Import ${label}: production preprocessing/source upload → reviewed input → ADDED canonical item with resolvable source metadata`, async () => {
  const r = await menuTraceRuntime(); try {
    const normalized = await r.upload(new Uint8Array(bytes), filename, mime), original = normalized.menuItems[0];
    let draft = await r.create("draft:import-" + label, [service(original.name, { ...original, sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE" })], "IMPORT", { sourceFileIds: normalized.sourceFileIds, name: filename });
    draft = await r.review(draft, { salePrice: 17 }); const { draft: confirmed } = await r.confirm(draft);
    const fact = menuFact((await r.origin(confirmed.resultIds![0])).body); assert.equal(fact.originSourceType, "IMPORT"); assert.equal(fact.currentMenu.salePrice, 17); assert.equal(fact.currentMenu.name, original.name);
    const all = await walk(r, fact.traceTarget!.reference), file = all.find(e => e.projection.type === "MENU_SOURCE_FILE")!.projection;
    assert.equal(file.type, "MENU_SOURCE_FILE"); if (file.type !== "MENU_SOURCE_FILE") throw Error("wrong file");
    assert.equal(file.name, filename); assert.equal(file.mimeType, mime); assert.equal(file.sizeBytes, bytes.byteLength); assert.ok(file.uploadedAt); assert.equal(file.contentBinding?.type, "R2_ETAG"); assert.ok(file.downloadPath.startsWith("/api/catalog/files/"));
    assert.deepEqual([...r.uploads.values()][0], new Uint8Array(bytes)); assert.ok(!JSON.stringify(all).includes("Извлечённая таблица"));
  } finally { r.close(); }
});

test("Scan/OCR 15 → correction 17: actual image upload and recognition lifecycle, no invented original-value snapshot or provider payload", async () => {
  const r = await menuTraceRuntime({ recognition: () => ({ currency: "MDL", menuItems: [service("OCR origin")], recipes: [], internalSecret: "do-not-expose-provider" }) }); try {
    const bytes = readFileSync("public/icons/icon-192.png"), normalized = await r.upload(bytes, "scan.png", "image/png"); assert.equal(normalized.menuItems[0].salePrice, 15);
    let draft = await r.create("draft:scan-origin", [service(normalized.menuItems[0].name)], "SCAN", { sourceFileIds: normalized.sourceFileIds });
    draft = await r.review(draft, { salePrice: 17 }); const { draft: confirmed } = await r.confirm(draft), fact = menuFact((await r.origin(confirmed.resultIds![0])).body);
    assert.equal(fact.originSourceType, "SCAN"); const all = await walk(r, fact.traceTarget!.reference);
    const reviewed = all.find(e => e.projection.type === "MENU_REVIEWED_INPUT")!.projection; if (reviewed.type !== "MENU_REVIEWED_INPUT") throw Error("wrong reviewed");
    assert.equal(reviewed.values.salePrice, 17); assert.equal(reviewed.sourceValues, null); assert.equal(reviewed.outcomeBasis, "CONFIRMATION_AUDIT");
    assert.ok(all.some(e => e.projection.type === "MENU_SOURCE_FILE")); assert.ok(!JSON.stringify(all).includes("do-not-expose-provider"));
  } finally { r.close(); }
});

test("Import CHANGED / UNCHANGED preserve creation origin and prove only actual applied participation", async () => {
  const r = await menuTraceRuntime(); try {
    const initial = await r.confirm(await r.create("draft:original-item", [service("Same item")])), id = initial.draft.resultIds![0];
    let change = await r.create("draft:changed-item", [service("Same item", { salePrice: 23 })], "IMPORT"); change = await r.review(change); const applied = await r.confirm(change);
    let fact = menuFact((await r.origin(id)).body); assert.equal(fact.originDraftId, initial.draft.id); assert.equal(fact.latestConfirmationDraftId, applied.draft.id); assert.equal(fact.latestConfirmationResult, "CHANGED"); assert.equal(fact.currentMenu.salePrice, 23);
    const confirmation = menuEvidence((await r.resolve(r.reference("MENU_CONFIRMATION", change.id, change.rows[0].id))).body).projection; assert.equal(confirmation.type, "MENU_CONFIRMATION"); if (confirmation.type === "MENU_CONFIRMATION") assert.equal(confirmation.appliedValues.salePrice, 23);
    let same = await r.create("draft:unchanged-item", [service("Same item", { salePrice: 23 })], "IMPORT"); same = await r.review(same); const before = r.get(), unchanged = await r.confirm(same);
    assert.deepEqual(r.get().menuItems, before.menuItems); assert.deepEqual(r.get().recipes, before.recipes); assert.equal(unchanged.draft.resultIds![0], id);
    fact = menuFact((await r.origin(id)).body); assert.equal(fact.latestConfirmationResult, "UNCHANGED"); assert.equal(fact.originDraftId, initial.draft.id); await walk(r, fact.traceTarget!.reference);
  } finally { r.close(); }
});

test("INVALID/corrected, EXCLUDED, stale CONFLICT and CANCELLED retain honest decision evidence without fake successful origins", async () => {
  const r = await menuTraceRuntime(); try {
    let draft = await r.create("draft:invalid-item", [service("Invalid", { salePrice: -1 })]);
    const ref = r.reference("MENU_REVIEWED_INPUT", draft.id, draft.rows[0].id);
    let e = menuEvidence((await r.resolve(ref)).body); assert.equal(e.projection.type, "MENU_REVIEWED_INPUT"); if (e.projection.type === "MENU_REVIEWED_INPUT") assert.equal(e.projection.outcome, "INVALID");
    draft = await r.review(draft, { salePrice: 17 }); assert.equal((await r.resolve(e.reference)).body.code, "READ_MODEL_CHANGED"); await r.confirm(draft);
    let excluded = await r.create("draft:excluded-item", [service("Excluded")], "IMPORT"); excluded = (await r.command({ action: "update", draftId: excluded.id, revision: excluded.revision, rows: excluded.rows.map(l => ({ ...l, decision: "skip" })) })).draft;
    const done = await r.confirm(excluded); assert.deepEqual(done.draft.resultIds, []); assert.equal((await r.resolve(r.reference("MENU_CONFIRMATION", excluded.id, excluded.rows[0].id))).body.code, "EVIDENCE_UNAVAILABLE");
    e = menuEvidence((await r.resolve(r.reference("MENU_REVIEWED_INPUT", excluded.id, excluded.rows[0].id))).body); if (e.projection.type === "MENU_REVIEWED_INPUT") assert.equal(e.projection.outcome, "SKIPPED");
    const id = draft.rows[0].item.id as string; let stale = await r.create("draft:stale-input", [service("Invalid", { salePrice: 21 })], "IMPORT"); stale = await r.review(stale);
    await r.confirm(await r.create("draft:intervening", [service("Invalid", { id, salePrice: 22 })]));
    e = menuEvidence((await r.resolve(r.reference("MENU_REVIEWED_INPUT", stale.id, stale.rows[0].id))).body); if (e.projection.type === "MENU_REVIEWED_INPUT") assert.equal(e.projection.outcome, "CONFLICT"); assert.equal((await r.send({ action: "validate", draftId: stale.id, revision: stale.revision })).status, 422);
    let cancel = await r.create("draft:cancelled-item", [service("Cancelled")]); const before = r.get(); cancel = (await r.command({ action: "cancel", draftId: cancel.id, revision: cancel.revision })).draft;
    e = menuEvidence((await r.resolve(r.reference("MENU_REVIEWED_INPUT", cancel.id, cancel.rows[0].id))).body); if (e.projection.type === "MENU_REVIEWED_INPUT") { assert.equal(e.projection.draftLifecycle, "CANCELLED"); assert.equal(e.projection.outcome, "UNKNOWN"); }
    assert.deepEqual(r.get(), before); assert.equal((await r.origin(cancel.rows[0].item.id as string)).body.code, "EVIDENCE_UNAVAILABLE");
  } finally { r.close(); }
});

test("Canonical edited after confirm: old binding changes; existing audit proves applied value separately from current Menu", async () => {
  const r = await menuTraceRuntime(); try {
    const done = await r.confirm(await r.create("draft:binding-item", [service("Binding")])), id = done.draft.resultIds![0], fact = menuFact((await r.origin(id)).body);
    const ref = fact.evidenceRefs.find(e => e.kind === "MENU_CONFIRMATION")!, confirmation = menuEvidence((await r.resolve(ref)).body);
    const root = r.get(); (root.menuItems as { salePrice: number }[])[0].salePrice = 31; r.put("bd_assortment_v1", root);
    assert.equal((await r.resolve(fact.traceTarget!.reference)).body.code, "READ_MODEL_CHANGED"); assert.equal((await r.resolve(ref)).body.code, "READ_MODEL_CHANGED"); assert.equal((await r.origin(id, r.owner, "&expectedRevision=" + fact.revision)).body.code, "READ_MODEL_CHANGED");
    const current = menuFact((await r.origin(id)).body); assert.equal(current.currentMatchesConfirmed, false); assert.equal(current.currentMenu.salePrice, 31);
    const c = menuEvidence((await r.resolve({ ...confirmation.reference, expectedRevision: undefined })).body).projection; if (c.type !== "MENU_CONFIRMATION") throw Error("wrong confirm"); assert.equal(c.appliedValues.salePrice, 15); assert.equal(c.currentMatchesConfirmed, false);
    const drafts = r.get("bd_menu_ingestion_v1") as unknown as { rows: { item: { salePrice: number } }[] }[]; drafts[0].rows[0].item.salePrice = 40; r.put("bd_menu_ingestion_v1", drafts);
    assert.equal((await r.resolve(ref)).body.code, "READ_MODEL_CHANGED"); assert.equal(menuFact((await r.origin(id)).body).originSourceType, "LEGACY_UNKNOWN");
  } finally { r.close(); }
});

test("Legacy unknown origin, authoritative renamed/archived/empty taxonomy and default fallback; current recipe binding changes", async () => {
  const r = await menuTraceRuntime(); try {
    const root = r.get(); root.menuItems = [service("Legacy", { id: "legacy-no-draft", venueId: r.venueId })]; r.put("bd_assortment_v1", root);
    const legacy = menuFact((await r.origin("legacy-no-draft")).body); assert.equal(legacy.originSourceType, "LEGACY_UNKNOWN"); assert.equal(legacy.originDraftId, null); assert.equal(legacy.confirmationResult, null); assert.ok(!legacy.evidenceRefs.some(e => e.kind === "MENU_CONFIRMATION"));
    const draft = await r.confirm(await r.create("draft:recipe-binding", [service("Recipe", { consumptionMode: "RECIPE" })])), id = draft.draft.resultIds![0], fact = menuFact((await r.origin(id)).body), recipe = fact.evidenceRefs.find(e => e.kind === "MENU_RECIPE")!;
    const current = r.get(); (current.recipes as { ingredients: unknown[] }[])[0].ingredients = [{ name: "Changed" }]; current.nomenclatureStructure = { sections: [{ id: "bar", name: "Custom renamed", active: false }], categories: [{ id: "alcohol", parentId: "bar", name: "Archived custom", active: false }], subcategories: [] }; r.put("bd_assortment_v1", current);
    assert.equal((await r.resolve(recipe)).body.code, "READ_MODEL_CHANGED"); let t = menuEvidence((await r.resolve(r.reference("MENU_TAXONOMY", id))).body).projection;
    if (t.type !== "MENU_TAXONOMY") throw Error("wrong taxonomy"); assert.equal(t.basis, "STORED_TREE"); assert.equal(t.section?.name, "Custom renamed"); assert.equal(t.section?.active, false);
    current.nomenclatureStructure = { sections: [], categories: [], subcategories: [] }; r.put("bd_assortment_v1", current); t = menuEvidence((await r.resolve(r.reference("MENU_TAXONOMY", id))).body).projection; if (t.type === "MENU_TAXONOMY") assert.equal(t.section, null);
    delete current.nomenclatureStructure; r.put("bd_assortment_v1", current); t = menuEvidence((await r.resolve(r.reference("MENU_TAXONOMY", id))).body).projection; if (t.type === "MENU_TAXONOMY") assert.equal(t.basis, "DEFAULT_FALLBACK");
    const fallback = menuEvidence((await r.resolve(r.reference("MENU_TAXONOMY", id))).body); current.nomenclatureStructure = defaultNomenclatureStructure(); r.put("bd_assortment_v1", current); assert.equal((await r.resolve(fallback.reference)).body.code, "READ_MODEL_CHANGED", "Stored versus fallback basis is bound even when labels match");
  } finally { r.close(); }
});

test("Tenant/RBAC guessed and nested ownership; private staging never leaks, revoked permission reauthorized, strict selector and read-only failures", async () => {
  const r = await menuTraceRuntime(); try {
    const done = await r.confirm(await r.create("draft:secure-item", [service("Secure")])), id = done.draft.resultIds![0], fact = menuFact((await r.origin(id)).body);
    assert.equal((await r.resolve({ ...fact.traceTarget!.reference, venueId: r.foreign.activeVenueId })).body.code, "EVIDENCE_UNAVAILABLE"); assert.equal((await r.resolve({ ...fact.traceTarget!.reference, workspaceId: 999999 })).body.code, "EVIDENCE_UNAVAILABLE"); assert.equal((await r.origin(id, r.foreign, "", r.foreign.activeVenueId)).body.code, "EVIDENCE_UNAVAILABLE");
    for (const ref of [r.reference("MENU_SOURCE", "draft:guessed"), r.reference("MENU_ORIGIN", "menu:guessed"), r.reference("MENU_CONFIRMATION", done.draft.id, "foreign-row"), r.reference("MENU_SOURCE_FILE", done.draft.id, "00000000-0000-4000-8000-000000000099"), r.reference("MENU_RECIPE", id, "foreign-recipe")]) assert.equal((await r.resolve(ref)).body.code, "EVIDENCE_UNAVAILABLE");
    r.permissions(["inventory.manage"]); const restricted = menuFact((await r.origin(id, r.member)).body); assert.equal(restricted.originSourceType, "LEGACY_UNKNOWN"); assert.equal(restricted.originDraftId, null); assert.ok(!restricted.evidenceRefs.some(e => ["MENU_CONFIRMATION", "MENU_SOURCE", "MENU_REVIEWED_INPUT"].includes(e.kind))); assert.equal((await r.resolve(fact.evidenceRefs.find(e => e.kind === "MENU_CONFIRMATION")!, r.member)).body.code, "ACCESS_DENIED");
    r.permissions(["inventory.view", "inventory.manage"]); assert.equal((await r.origin(id, r.member)).body.code, "ACCESS_DENIED");
    assert.equal((await r.origin(id, r.owner, "&dataAccountId=999")).status, 400); assert.equal((await r.origin(id, r.owner, "&menuItemId=another")).status, 400);
    const unauthenticated = await r.api.origin.GET(new Request("https://isolated.test/api/evidence/facts/menu-origin?menuItemId=" + id)); assert.equal(unauthenticated.status, 401);
    const drafts = r.get("bd_menu_ingestion_v1") as unknown as { rows: { item: { venueId: number } }[] }[]; drafts[0].rows[0].item.venueId = r.foreign.activeVenueId; r.put("bd_menu_ingestion_v1", drafts);
    assert.equal((await r.resolve(r.reference("MENU_CONFIRMATION", done.draft.id, done.draft.rows[0].id))).body.code, "EVIDENCE_UNAVAILABLE");
  } finally { r.close(); }
});

test("Source files: multiple real uploads keep parent bindings stable; missing/foreign files never resolve; metadata changes invalidate old references", async () => {
  const r = await menuTraceRuntime(); try {
    const bytes = new TextEncoder().encode("name,salePrice,type\nFile item,15,service\n"), a = await r.upload(bytes, "one.csv", "text/csv"), b = await r.upload(bytes, "two.csv", "text/csv"), foreign = await r.upload(bytes, "foreign.csv", "text/csv", r.foreign);
    let draft = await r.create("draft:multi-files", [service("Files")], "IMPORT", { sourceFileIds: [...a.sourceFileIds, ...b.sourceFileIds, ...foreign.sourceFileIds], sourceUrl: "https://private.invalid/?token=SECRET_SOURCE_TOKEN" }); draft = await r.review(draft); const done = await r.confirm(draft), fact = menuFact((await r.origin(done.draft.resultIds![0])).body);
    const source = menuEvidence((await r.resolve(r.reference("MENU_SOURCE", draft.id))).body);
    assert.equal(source.relations.filter(x => x.reference.kind === "MENU_SOURCE_FILE").length, 2);
    const all = await walk(r, fact.traceTarget!.reference); assert.equal(all.filter(e => e.projection.type === "MENU_SOURCE_FILE").length, 2); assert.ok(!JSON.stringify(all).includes("SECRET_SOURCE_TOKEN"));
    assert.equal((await r.resolve(r.reference("MENU_SOURCE_FILE", draft.id, foreign.sourceFileIds[0]))).body.code, "EVIDENCE_UNAVAILABLE");
    const file = all.find(e => e.projection.type === "MENU_SOURCE_FILE")!, key = "catalog/" + r.owner.userId + "/" + file.reference.partId;
    (r.uploadMetadata.get(key)!.customMetadata as { originalName: string }).originalName = "renamed.csv";
    assert.equal((await r.resolve(file.reference)).body.code, "READ_MODEL_CHANGED"); assert.equal((await r.resolve(source.reference)).body.code, "READ_MODEL_CHANGED");
    r.uploads.delete(key); r.uploadMetadata.delete(key); assert.equal((await r.resolve(file.reference)).body.code, "READ_MODEL_CHANGED");
  } finally { r.close(); }
});

test("Missing confirmation audit never proves a Menu origin; SQLite guard forbids canonical mutations and evidence reads preserve R2", async () => {
  const r = await menuTraceRuntime(); try {
    const done = await r.confirm(await r.create("draft:guarded-read", [service("Guarded")])), id = done.draft.resultIds![0];
    for (const table of ["domain_data", "audit_log"]) for (const action of ["INSERT", "UPDATE", "DELETE"]) r.sqlite.exec(`CREATE TRIGGER no_${table}_${action} BEFORE ${action} ON ${table} ${table === 'domain_data' && action === 'INSERT' ? 'WHEN NOT EXISTS (SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key)' : ''} BEGIN SELECT RAISE(ABORT,'business mutation forbidden'); END`);
    const fact = menuFact((await r.origin(id)).body); await walk(r, fact.traceTarget!.reference);
    for (const action of ["INSERT", "UPDATE", "DELETE"]) r.sqlite.exec(`DROP TRIGGER no_audit_log_${action}`);
    r.sqlite.prepare("DELETE FROM audit_log WHERE account_id=? AND entity_id=?").run(r.owner.userId, done.draft.id);
    assert.equal((await r.resolve(fact.evidenceRefs.find(e => e.kind === "MENU_CONFIRMATION")!)).body.code, "READ_MODEL_CHANGED");
    const missing = menuFact((await r.origin(id)).body); assert.equal(missing.originSourceType, "LEGACY_UNKNOWN"); assert.ok(missing.diagnostics.includes("CONFIRMATION_RECORD_MISSING"));
  } finally { r.close(); }
});


test("Malformed private staging cannot regress existing current Menu evidence", async () => {
  const r = await menuTraceRuntime(); try {
    const done = await r.confirm(await r.create("draft:malformed-staging", [service("Current Menu")])), id = done.draft.resultIds![0];
    r.put("bd_menu_ingestion_v1", { malformed: true });
    const current = menuEvidence((await r.resolve(r.reference("MENU_ITEM", id))).body); assert.equal(current.projection.type, "MENU_ITEM"); assert.ok(!current.relations.some(x => x.reference.kind === "MENU_ORIGIN"));
    const origin = await r.origin(id); assert.equal(origin.status, 200); assert.equal(origin.body.code, "EVIDENCE_UNAVAILABLE");
  } finally { r.close(); }
});

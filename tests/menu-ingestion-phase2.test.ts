import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { MENU_INGESTION_STORE_KEY, menuDraft, validateMenuDraft, type MenuDraft } from "../lib/bardoctor/menu-ingestion";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import { normalizeMenuImport, mergeMenuImportParts } from "../lib/bardoctor/catalog";

type IngestionResponse = { draft: MenuDraft; preview: ReturnType<typeof validateMenuDraft>; idempotent?: boolean };
async function fixture() {
  const r = await lifecycleRuntime({ ingestion: "./app/api/menu/ingestion/route", sales: "./app/api/sales-events/route", inventory: "./app/api/inventory/valuation/route", storeKey: "./app/api/store/[key]/route" });
  const user = await r.register("menu-phase2@isolated.test"), venueId = user.activeVenueId;
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Menu Phase 2", currency: "MDL", timezone: "Europe/Chisinau" }), user.userId);
  const put = (key: string, value: unknown) => r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,'fixture') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at='fixture'").run(user.userId, key, JSON.stringify(value));
  const get = (key = "bd_assortment_v1") => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId, key)?.data_json ?? "null"));
  const canonical = JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId)); canonical.nomenclatureStructure = defaultNomenclatureStructure();
  canonical.menuItems = canonical.menuItems.map((item: object) => ({ ...item, sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "beer" }));
  put("bd_assortment_v1", canonical);
  const send = async (body: object) => { const response = await r.api.ingestion.POST(r.request(user, "/api/menu/ingestion", "POST", { venueId, ...body })); return { response, body: await response.json() as IngestionResponse }; };
  const item = (name = "New service") => ({ name, salePrice: 15, currency: "MDL", sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "beer", consumptionMode: "NONE", type: "service", active: true });
  const create = (source = "MANUAL", items: unknown[] = [item()], id = "draft:test-123") => send({ action: "create", source, draftId: id, items });
  const validate = (draft: { id: string; revision: number }) => send({ action: "validate", draftId: draft.id, revision: draft.revision });
  const confirm = (draft: { id: string; revision: number; validationHash?: string }) => send({ action: "confirm", draftId: draft.id, revision: draft.revision, validationHash: draft.validationHash });
  const review = (draft: { id: string; revision: number; rows: { id: string; item: object }[] }) => send({ action: "update", draftId: draft.id, revision: draft.revision, rows: draft.rows.map(row => ({ ...row, decision: "apply", reviewed: true })) });
  return { ...r, user, venueId, put, get, send, item, create, validate, confirm, review };
}

for (const source of ["MANUAL", "SCAN", "IMPORT"]) test(`${source}: draft → validation → confirmation; no pre-confirm writes; retry and changed retry`, async () => {
  const r = await fixture(); try {
    const before = r.get(), created = await r.create(source); assert.equal(created.response.status, 201);
    assert.equal(created.body.draft.source, source); assert.deepEqual(r.get(), before);
    assert.equal((await r.confirm(created.body.draft)).response.status, source === "MANUAL" ? 409 : 422);
    let draft = created.body.draft;
    if (source !== "MANUAL") { assert.equal((await r.validate(draft)).response.status, 422); draft = (await r.review(draft)).body.draft; }
    const checked = await r.validate(draft); assert.equal(checked.response.status, 200, JSON.stringify(checked.body));
    assert.equal(checked.body.preview.diff[0].status, "ADDED"); assert.deepEqual(r.get(), before);
    const result = await r.confirm(checked.body.draft); assert.equal(result.response.status, 201, JSON.stringify(result.body));
    const after = r.get(); assert.equal(after.menuItems.length, before.menuItems.length + 1); assert.deepEqual(after.recipes, before.recipes); assert.deepEqual(after.nomenclature, before.nomenclature); assert.deepEqual(after.stockBalances, before.stockBalances);
    assert.equal((await r.confirm(checked.body.draft)).body.idempotent, true); assert.deepEqual(r.get(), after);
    assert.equal((await r.confirm({ ...checked.body.draft, validationHash: "different" })).response.status, 422);
    assert.equal((await r.create(source)).body.idempotent, true); assert.deepEqual(r.get(), after);
    assert.equal((await r.create(source, [r.item("Other")])).response.status, 422);
  } finally { r.close(); }
});

test("import diff: additions, changes, unchanged, invalid and conflicting rows; explicit decisions; preserve missing items and recipes", async () => {
  const r = await fixture(); try {
    const before = r.get(), existing = before.menuItems[0];
    const items = [{ ...existing, salePrice: 25 }, r.item(), { ...r.item("Broken"), salePrice: -5 }, r.item("Duplicate"), r.item("Duplicate")];
    let created = await r.create("IMPORT", items), reviewed = await r.review(created.body.draft);
    assert.ok(reviewed.body.preview.diff[0].changes.some((change: { field: string }) => change.field === "salePrice"));
    assert.equal(reviewed.body.preview.diff[0].status, "CHANGED"); assert.equal(reviewed.body.preview.diff[1].status, "ADDED"); assert.equal(reviewed.body.preview.diff[2].status, "INVALID"); assert.equal(reviewed.body.preview.diff[4].status, "CONFLICT");
    assert.equal((await r.validate(reviewed.body.draft)).response.status, 422); assert.deepEqual(r.get(), before);
    const rows = reviewed.body.draft.rows.map((row: object, index: number) => ({ ...row, decision: index >= 2 ? "skip" : "apply" }));
    const fixed = await r.send({ action: "update", draftId: reviewed.body.draft.id, revision: reviewed.body.draft.revision, rows });
    const checked = await r.validate(fixed.body.draft); assert.equal(checked.response.status, 200, JSON.stringify(checked.body));
    assert.equal((await r.confirm(checked.body.draft)).response.status, 201);
    const after = r.get(); assert.equal(after.menuItems.find((row: { id: string }) => row.id === existing.id).salePrice, 25); assert.deepEqual(after.recipes, before.recipes);
    assert.ok(after.menuItems.some((row: { id: string }) => row.id === existing.id)); assert.equal(after.priceHistory.filter((row: { menuItemId: string }) => row.menuItemId === existing.id).length, 1);
    created = await r.create("IMPORT", [{ ...after.menuItems[0] }], "draft:unchanged-123"); reviewed = await r.review(created.body.draft);
    assert.equal(reviewed.body.preview.diff[0].status, "UNCHANGED", JSON.stringify(reviewed.body.preview));
    const validated = await r.validate(reviewed.body.draft); await r.confirm(validated.body.draft); assert.deepEqual(r.get(), after);
  } finally { r.close(); }
});

test("required fields, currency, taxonomy, units and links use the same validation for every source", async () => {
  const r = await fixture(); try {
    for (const source of ["MANUAL", "SCAN", "IMPORT"] as const) {
      for (const patch of [{ name: "" }, { salePrice: "" }, { salePrice: "   " }, { salePrice: false }, { salePrice: [] }, { plannedSales: false }, { currency: "RUB" }, { sectionId: "foreign" }, { taxonomyCategoryId: "food" }, { subcategoryId: "foreign" }, { consumptionMode: "" }, { consumptionMode: "FIXED_QUANTITY", readyProduct: { nomenclatureItemId: "missing", productKey: "missing" }, saleSize: { quantity: -1, unit: "unknown" } }]) {
        const draft = menuDraft({ id: "check:" + source, source, venueId: r.venueId, items: [{ ...r.item(), ...patch }], assortment: r.get(), now: "2026-09-30T12:00:00.000Z" }); draft.rows.forEach(row => { row.reviewed = true; row.decision = "apply"; });
        const result = validateMenuDraft(draft, r.get(), "MDL", "2026-09-30T12:00:00.000Z"); assert.equal(result.ok, false, JSON.stringify({ source, patch, result })); assert.ok(result.diff[0].issues.length);
      }
    }
  } finally { r.close(); }
});

test("recognition normalization and batch merging preserve invalid source values until explicit correction", async () => {
  const r = await fixture(); try {
    for (const source of ["SCAN", "IMPORT"] as const) {
      for (const bad of [{ name: "", salePrice: 5 }, { name: "Invalid " + source, salePrice: -5 }, { name: "Missing price " + source }]) {
        const raw = normalizeMenuImport({ currency: "MDL", menuItems: [bad] });
        const merged = mergeMenuImportParts([raw]);
        const created = await r.create(source, merged.menuItems.map(item => ({ ...item, sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE" })), "draft:source-" + crypto.randomUUID());
        const before = r.get(), reviewed = await r.review(created.body.draft);
        assert.equal((await r.validate(reviewed.body.draft)).response.status, 422); assert.deepEqual(r.get(), before);
        const fixed = await r.send({ action: "update", draftId: reviewed.body.draft.id, revision: reviewed.body.draft.revision, rows: reviewed.body.draft.rows.map(row => ({ ...row, item: { ...row.item, name: "Corrected " + crypto.randomUUID(), salePrice: 5 } })) });
        assert.equal((await r.validate(fixed.body.draft)).response.status, 200);
      }
    }
    const merged = mergeMenuImportParts([{ currency: "MDL", menuItems: [{ name: "Free", salePrice: 0 }, { name: "Free", salePrice: -1 }] }]);
    assert.equal(merged.menuItems.length, 2, "invalid price must not collapse into a valid free item");
  } finally { r.close(); }
});

test("existing name conflicts and ambiguous IDs cannot silently overwrite; stale target and changed dependencies block confirm", async () => {
  const r = await fixture(); try {
    const before = r.get(), existing = before.menuItems[0];
    const manual = await r.create("MANUAL", [r.item(existing.name)]); assert.equal(manual.body.preview.diff[0].status, "CONFLICT");
    const created = await r.create("IMPORT", [{ ...existing, salePrice: 30 }], "draft:stale-123"), reviewed = await r.review(created.body.draft), checked = await r.validate(reviewed.body.draft);
    assert.equal(checked.response.status, 200, JSON.stringify(checked.body));
    r.put("bd_assortment_v1", { ...before, stockBalances: before.stockBalances.map((row: object) => ({ ...row, current: 99 })) });
    assert.equal((await r.confirm(checked.body.draft)).response.status, 409);
    const revalidated = await r.validate(reviewed.body.draft); assert.equal(revalidated.response.status, 200);
    const changed = r.get(); changed.menuItems[0].salePrice = 31; r.put("bd_assortment_v1", changed);
    assert.equal((await r.confirm(revalidated.body.draft)).response.status, 422); assert.equal(r.get().menuItems[0].salePrice, 31);
    r.put("bd_assortment_v1", { ...before, menuItems: [...before.menuItems, { ...existing, id: "another" }] });
    const ambiguous = await r.create("IMPORT", [{ ...existing }], "draft:ambiguous-123"); assert.equal(ambiguous.body.preview.diff[0].status, "CONFLICT");
  } finally { r.close(); }
});

test("cancel, revision guard, denied venue, malformed stores and atomic failure preserve canonical data", async () => {
  const r = await fixture(); try {
    const before = r.get(), created = await r.create(), checked = await r.validate(created.body.draft);
    const cancelled = await r.send({ action: "cancel", draftId: checked.body.draft.id, revision: checked.body.draft.revision }); assert.equal(cancelled.body.draft.status, "CANCELLED"); assert.deepEqual(r.get(), before);
    assert.equal((await r.confirm(checked.body.draft)).response.status, 409);
    const next = await r.create("MANUAL", [r.item()], "draft:atomic-123"), validated = await r.validate(next.body.draft);
    assert.equal((await r.send({ action: "update", draftId: next.body.draft.id, revision: 999, rows: [] })).response.status, 409);
    assert.equal((await r.send({ action: "get", draftId: next.body.draft.id, venueId: 999 })).response.status, 403);
    r.failDatabase(); await assert.rejects(r.confirm(validated.body.draft), /injected database failure/); assert.deepEqual(r.get(), before); assert.equal(r.get(MENU_INGESTION_STORE_KEY).find((row: { id: string }) => row.id === next.body.draft.id).status, "VALIDATED");
    assert.equal((await r.confirm(validated.body.draft)).response.status, 201);
    r.put("bd_assortment_v1", { menuItems: "broken" }); assert.equal((await r.create("MANUAL", [r.item()], "draft:broken-123")).response.status, 409);
  } finally { r.close(); }
});

test("draft metadata is private to authorized commands and cannot be replaced through generic store APIs", async () => {
  const r = await fixture(); try {
    const created = await r.create(), before = r.get(), staging = r.get(MENU_INGESTION_STORE_KEY);
    const anonymous = await r.api.ingestion.POST(new Request("https://qa.invalid/api/menu/ingestion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get", venueId: r.venueId, draftId: created.body.draft.id }) }));
    assert.equal(anonymous.status, 401);
    for (const method of ["GET", "PUT"] as const) {
      const response = await r.api.storeKey[method](r.request(r.user, "/api/store/" + MENU_INGESTION_STORE_KEY, method, method === "PUT" ? { data: [] } : undefined), { params: Promise.resolve({ key: MENU_INGESTION_STORE_KEY }) } as never);
      assert.equal(response.status, 400); assert.equal(((await response.json()) as { error: string }).error, "Неизвестный ключ хранилища");
    }
    const other = await r.register("other-menu-phase2@isolated.test");
    r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,'bd_assortment_v1',?,'fixture') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(other.userId, JSON.stringify({ menuItems: [], recipes: [], nomenclature: [], stockBalances: [] }));
    const response = await r.api.ingestion.POST(r.request(other, "/api/menu/ingestion", "POST", { action: "get", venueId: other.activeVenueId, draftId: created.body.draft.id }));
    assert.equal(response.status, 404); assert.deepEqual(r.get(), before); assert.deepEqual(r.get(MENU_INGESTION_STORE_KEY), staging);
  } finally { r.close(); }
});

test("confirmed menu preserves existing recipe and POS consumption, stock units and warehouse read", async () => {
  const r = await fixture(); try {
    const before = r.get(), existing = before.menuItems.find((row: {id: string}) => row.id === "beer");
    const created = await r.create("IMPORT", [{ ...existing, salePrice: 25 }]), reviewed = await r.review(created.body.draft), checked = await r.validate(reviewed.body.draft);
    assert.equal((await r.confirm(checked.body.draft)).response.status, 201);
    assert.deepEqual(r.get().recipes, before.recipes); assert.deepEqual(r.get().nomenclature, before.nomenclature);
    const sendSale = (body: object) => r.api.sales.POST(r.request(r.user, "/api/sales-events", "POST", { venueId: r.venueId, ...body }));
    const opened = await sendSale({ action: "open_shift", shiftId: "cash", name: "Cash" }); assert.equal(opened.status, 201, JSON.stringify(await opened.clone().json()));
    const command = { id: "phase2-sale", source: "POS_API", shiftId: "cash", lines: [{ id: "line", menuItemId: existing.id, quantity: 1 }], payments: [{ id: "pay", method: "CASH", amount: 25 }] };
    const quote = await sendSale({ action: "preview", command }); assert.equal(quote.status, 200, JSON.stringify(await quote.clone().json()));
    const posted = await sendSale({ action: "post", command, previewHash: ((await quote.json()) as {previewHash: string}).previewHash }); assert.equal(posted.status, 201, JSON.stringify(await posted.clone().json()));
    assert.equal(r.get().stockBalances[0].current, before.stockBalances[0].current - 1);
    const warehouse = await r.api.inventory.GET(r.request(r.user, "/api/inventory/valuation")); assert.equal(warehouse.status, 200);
    const stock = r.get("bd_stock_movements"); assert.equal(stock[0].amount, -1); assert.equal(stock[0].unit, "pcs");
  } finally { r.close(); }
});

test("manual stale editor is blocked; recipe lifecycle preserves identities and restores the former version", async () => {
  const r = await fixture(); try {
    const before = r.get(), coffee = before.menuItems.find((row: { id: string }) => row.id === "coffee");
    const stale = await r.create("MANUAL", [{ ...coffee, name: "Edited", baseline: { ...coffee, salePrice: 99 } }], "draft:stale-editor-123"); assert.equal(stale.body.preview.diff[0].status, "CONFLICT"); assert.deepEqual(r.get(), before);
    const created = await r.create("MANUAL", [{ ...coffee, consumptionMode: "NONE", baseline: coffee }], "draft:switch-none-123");
    assert.ok(created.body.preview.diff[0].changes.some(change => change.field === "recipeLifecycle"));
    const checked = await r.validate(created.body.draft); assert.equal(checked.response.status, 200, JSON.stringify(checked.body)); await r.confirm(checked.body.draft);
    assert.equal(r.get().recipes.length, before.recipes.length); assert.equal(r.get().recipes[0].id, before.recipes[0].id); assert.equal(r.get().recipes[0].lifecycleStatus, "inactive"); assert.deepEqual(r.get().recipes[0].ingredients, before.recipes[0].ingredients);
    const current = r.get().menuItems.find((row: { id: string }) => row.id === coffee.id);
    const restored = await r.create("MANUAL", [{ ...current, consumptionMode: "RECIPE", baseline: current }], "draft:restore-recipe-123"); const validated = await r.validate(restored.body.draft); assert.equal(validated.response.status, 200, JSON.stringify(validated.body)); await r.confirm(validated.body.draft);
    assert.equal(r.get().recipes.length, before.recipes.length); assert.equal(r.get().recipes[0].id, before.recipes[0].id); assert.equal(r.get().recipes[0].current, true); assert.deepEqual(r.get().recipes[0].ingredients, before.recipes[0].ingredients);
    const newRecipe = await r.create("MANUAL", [{ ...r.item("Prepared dish"), consumptionMode: "RECIPE" }], "draft:new-recipe-123"); const ready = await r.validate(newRecipe.body.draft); await r.confirm(ready.body.draft); await r.confirm(ready.body.draft);
    const recipes = r.get().recipes.filter((row: { menuItemId: string }) => row.menuItemId === ready.body.draft.rows[0].item.id); assert.equal(recipes.length, 1); assert.equal(recipes[0].status, "draft"); assert.deepEqual(recipes[0].ingredients, []);
  } finally { r.close(); }
});

test("multiple draft instances and concurrent confirmation cannot duplicate the same name or restore old values", async () => {
  const r = await fixture(); try {
    const a = await r.create("MANUAL", [r.item()], "draft:parallel-a-123"), b = await r.create("MANUAL", [r.item()], "draft:parallel-b-123");
    const va = await r.validate(a.body.draft), vb = await r.validate(b.body.draft);
    const results = await Promise.all([r.confirm(va.body.draft), r.confirm(vb.body.draft)]);
    assert.deepEqual(results.map(result => result.response.status).sort(), [201, 422]); assert.equal(r.get().menuItems.filter((row: { name: string }) => row.name === "New service").length, 1);
    const winner = results.find(result => result.response.status === 201)!; const after = r.get(); after.menuItems.find((row: { name: string }) => row.name === "New service").salePrice = 19; r.put("bd_assortment_v1", after);
    assert.equal((await r.confirm(winner.body.draft)).body.idempotent, true); assert.equal(r.get().menuItems.find((row: { name: string }) => row.name === "New service").salePrice, 19);
  } finally { r.close(); }
});

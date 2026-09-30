import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { defaultNomenclatureStructure } from "../lib/bardoctor/nomenclature";
import { normalizeMenuImport } from "../lib/bardoctor/catalog";
import { menuActionReadiness, waitForMenuCloudReady } from "../tests/helpers/menu-action-readiness";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await lifecycleRuntime({ ingestion: "./app/api/menu/ingestion/route", taxonomy: "./app/api/nomenclature/taxonomy/route", sales: "./app/api/sales-events/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", valuation: "./app/api/inventory/valuation/route" });
let recognitionName = "Scan service", lostConfirm = false;
let recognitionItems: Record<string, unknown>[] | null = null;
let lastConfirm: Record<string, unknown> | null = null;
let profileHydrationRace = false;
const requests: { action: string; source?: string }[] = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/menu/ingestion": "ingestion", "/api/nomenclature/taxonomy": "taxonomy", "/api/sales-events": "sales", "/api/auth/login": "login", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/inventory/valuation": "valuation" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name) {
      const command = name === "ingestion" ? JSON.parse(body.toString()) : null;
      if (command) requests.push({ action: command.action, source: command.source });
      if (command?.action === "confirm") lastConfirm = command;
      response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
      // On reload, force fresh profile identity to arrive while the cached
      // profile's authoritative store read is in flight (the production race).
      if (profileHydrationRace && name === "store") {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      // Delay authoritative bootstrap to exercise first-click readiness during hydration.
      if (name === "bootstrap") await new Promise(resolve => setTimeout(resolve, 200));
      if (command?.action === "confirm" && lostConfirm && response.ok) { lostConfirm = false; res.destroy(); return; }
    } else if (url.pathname === "/api/catalog/files") {
      response = Response.json({ ok: true, file: { id: "00000000-0000-4000-8000-000000000001", name: "scan.jpg", type: "image/jpeg" } });
    } else if (url.pathname === "/api/catalog/import") {
      // Only external OCR extraction is fixed; its source adapters, production
      // normalization, server draft/validation/confirm and SQLite are exercised.
      const parsed = req.headers["content-type"]?.includes("application/json") ? JSON.parse(body.toString()) : {};
      const draft = normalizeMenuImport({ currency: "MDL", confidence: .65, warnings: ["Проверьте цену"], menuItems: recognitionItems || [{ name: recognitionName, salePrice: 17, currency: "MDL", type: "service", confidence: .65 }], recipes: [] }, { source: parsed.source || "upload" });
      response = Response.json(parsed.action === "recognise-batch" ? { ok: true, part: draft } : { ok: true, draft });
    } else if (["/assortment", "/catalog", "/warehouse", "/cashier", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser = await chromium.launch({ executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const out = "outputs/menu-ingestion-phase2"; mkdirSync(out, { recursive: true });
const results: unknown[] = [];
try {
  for (const profile of [{ name: "mobile", width: 390, height: 844, stockFirst: false, role: "owner" }, { name: "mobile-wide", width: 412, height: 915, stockFirst: true, role: "owner" }, { name: "desktop", width: 1280, height: 800, stockFirst: false, role: "owner" }, { name: "mobile-stock-first", width: 390, height: 844, stockFirst: true, role: "owner" }, { name: "desktop-stock-first", width: 1280, height: 800, stockFirst: true, role: "owner" }, { name: "mobile-manager", width: 390, height: 844, stockFirst: true, role: "manager" }, { name: "desktop-manager", width: 1280, height: 800, stockFirst: true, role: "manager" }, { name: "mobile-without-permission", width: 390, height: 844, stockFirst: true, role: "cashier" }, { name: "desktop-without-permission", width: 1280, height: 800, stockFirst: true, role: "cashier" }]) {
    const user = await runtime.register(profile.name + "@menu-phase2.test"), venueId = user.activeVenueId;
    runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Phase 2 " + profile.name, currency: "MDL", timezone: "Europe/Chisinau", workingDays: [0, 1, 2, 3, 4, 5, 6], openTime: "00:00", closeTime: "23:59", areas: ["Бар"] }), user.userId);
    const canonical = profile.stockFirst
      ? JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(user.userId)?.data_json))
      : JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId));
    if (!profile.stockFirst) {
      canonical.nomenclatureStructure = defaultNomenclatureStructure(); canonical.menuItems.forEach((item: Record<string, unknown>) => Object.assign(item, { sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "beer" }));
    } else {
      assert.equal("menuItems" in canonical, false);
      assert.equal("nomenclatureStructure" in canonical, false);
    }
    runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,'fixture') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId, "bd_assortment_v1", JSON.stringify(canonical));
    const get = () => JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(user.userId)?.data_json || "null"));
    let actor = user;
    if (profile.role !== "owner") {
      actor = await runtime.register(profile.name + "-staff@menu-phase2.test");
      const workspaceId = runtime.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(venueId)?.workspace_id;
      runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId as number, actor.userId);
      // Keep existing shell finance reads permitted while isolating the denied
      // inventory.manage contract; production role/permission rules are unchanged.
      runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json) VALUES (?,?,?,?)").run(venueId, actor.userId, profile.role, profile.role === "cashier" ? JSON.stringify({ allow: ["inventory.view", "finance.view"], deny: [] }) : null);
      runtime.sqlite.prepare("UPDATE sessions SET active_venue_id=? WHERE account_id=?").run(venueId, actor.userId);
    }
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.width < 600, hasTouch: profile.width < 600 });
    await context.addInitScript(({ email, token, venueId }) => { if (!localStorage.getItem("bd_session")) { localStorage.setItem("bd_session", email); localStorage.setItem("bd_session_token", token); localStorage.setItem("bd_active_venue_id", String(venueId)); } }, { email: actor.email, token: actor.token, venueId });
    const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept());
    const headers = { "X-Session-Email": actor.email, "X-Session-Token": actor.token, "X-Venue-Id": String(venueId) };
    const readinessEvidence: unknown[] = [];
    const reloadMenu = async (stage: string) => {
      profileHydrationRace = true;
      await page.reload(); await page.getByPlaceholder("Поиск по меню…").waitFor();
      try {
        await waitForMenuCloudReady(page);
        if (profile.role === "cashier") assert.equal(await page.getByRole("button", { name: "Добавить позицию", exact: true }).count(), 0);
        else await page.getByRole("button", { name: "Добавить позицию", exact: true }).waitFor();
      } finally {
        readinessEvidence.push({ stage, ...await menuActionReadiness(page) });
        writeFileSync(`${out}/${profile.name}-readiness.json`, JSON.stringify(readinessEvidence, null, 2));
        profileHydrationRace = false;
      }
    };
    const send = async (body: Record<string, unknown>) => {
      const response = await context.request.post(base + "/api/menu/ingestion", { headers, data: { venueId, ...body } });
      return { status: response.status(), body: await response.json() };
    };
    const assertMapping = async (name: string, sectionId: string, taxonomyCategoryId: string, groupName: string, category: string) => {
      const beforeRead = JSON.stringify(get());
      const canonicalRead = await context.request.get(base + "/api/store/bd_assortment_v1", { headers });
      const item = (await canonicalRead.json()).data.menuItems.find((row: { name: string }) => row.name === name);
      assert.equal(item.sectionId, sectionId); assert.equal(item.taxonomyCategoryId, taxonomyCategoryId);
      const read = await context.request.get(base + "/api/assortment/overview?period=2026-09", { headers });
      const projected = (await read.json()).analytics.menuItems.find((row: { name: string }) => row.name === name);
      assert.deepEqual({ sectionId: projected.sectionId, taxonomyCategoryId: projected.taxonomyCategoryId, groupName: projected.groupName, category: projected.category }, { sectionId, taxonomyCategoryId, groupName, category });
      await page.getByPlaceholder("Поиск по меню…").fill(name);
      const section = page.locator(`[data-assortment-section-id="${sectionId}"]`);
      await section.getByText(groupName, { exact: true }).waitFor();
      await section.getByText(category, { exact: true }).waitFor();
      await section.getByText(name, { exact: true }).waitFor();
      assert.equal(JSON.stringify(get()), beforeRead, "read-model and Menu rendering never backfill canonical data");
      await page.getByPlaceholder("Поиск по меню…").fill("");
    };
    try {
      await page.goto(base + "/catalog?venue=" + venueId + "&tab=menu");
      const identity = await context.request.get(base + "/api/users/me", { headers });
      assert.equal(identity.status(), 200);
      const activeUser = (await identity.json()).user;
      assert.equal(activeUser.role, profile.role); assert.equal(activeUser.activeVenueId, venueId);
      assert.equal(activeUser.activeWorkspaceId, runtime.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(venueId)?.workspace_id);
      assert.equal(activeUser.permissions.includes("inventory.manage"), profile.role !== "cashier");
      if (profile.role === "cashier") {
        await page.getByPlaceholder("Поиск по меню…").waitFor(); await waitForMenuCloudReady(page);
        assert.equal(await page.getByRole("button", { name: "Добавить позицию", exact: true }).count(), 0);
        const before = get();
        assert.equal((await send({ action: "create", source: "MANUAL", items: [{ name: "Forbidden", sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE", salePrice: 15, currency: "MDL" }] })).status, 403);
        await reloadMenu("denied reload"); await reloadMenu("denied repeated bootstrap");
        assert.deepEqual(get(), before); assert.deepEqual(errors, []);
        results.push({ profile: profile.name, role: profile.role, actionHidden: true, serverDenied: true, reload: true, physicalDevice: false });
        console.log("PASS " + profile.name); continue;
      }
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).waitFor();
      readinessEvidence.push({ stage: "before confirm", ...await menuActionReadiness(page) });
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
      await page.getByRole("button", { name: /Добавить вручную/ }).click();
      const editor = page.locator(".bd-menu-position-editor-v400"); await editor.waitFor();
      await editor.getByLabel("Название", { exact: true }).fill("Manual service " + profile.name);
      const selects = editor.locator(".bd-tax-selectors-v336 select"); await selects.first().selectOption("bar"); await selects.nth(1).selectOption("alcohol");
      await editor.getByRole("button", { name: /^Без списания/ }).click();
      const price = editor.locator('input[type="number"]').first(); await price.fill("15");
      const before = get();
      await editor.getByRole("button", { name: "Проверить", exact: true }).filter({ visible: true }).click();
      const review = page.locator(".bd-menu-ingestion-review"); await review.waitFor(); assert.deepEqual(get(), before);
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').waitFor(); assert.deepEqual(get(), before);
      if (profile.width < 600) { await page.setViewportSize({ width: profile.width, height: 430 }); const box = await review.locator(".bd-menu-ingestion-actions").boundingBox(); assert.ok(box && box.y >= 0 && box.y + box.height < 100); await page.setViewportSize({ width: profile.width, height: profile.height }); }
      await page.screenshot({ path: `${out}/${profile.name}-manual.png`, fullPage: true });
      lostConfirm = true; await review.locator('[data-bd-menu-ingestion-action="confirm"]').click();
      await page.waitForFunction(() => !document.querySelector(".bd-menu-ingestion-review") || !!document.querySelector(".bd-menu-ingestion-review [role=alert]"));
      assert.equal(get().menuItems.length, (before.menuItems || []).length + 1); if (await review.isVisible()) await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" }); assert.equal(get().menuItems.length, (before.menuItems || []).length + 1);
      const confirmed = JSON.stringify(get()), retryCommand: Record<string, unknown> = Object.assign({}, lastConfirm);
      assert.equal(retryCommand.action, "confirm");
      const repeat = await send(retryCommand); assert.equal(repeat.status, 200); assert.equal(repeat.body.idempotent, true); assert.equal(JSON.stringify(get()), confirmed);
      await assertMapping("Manual service " + profile.name, "bar", "alcohol", "Бар", "Алкоголь");
      readinessEvidence.push({ stage: "after confirm", ...await menuActionReadiness(page) });
      await reloadMenu("after Manual reload");
      await assertMapping("Manual service " + profile.name, "bar", "alcohol", "Бар", "Алкоголь");
      // Import uses the existing file entry, then the same server-owned review.
      recognitionName = "Import service " + profile.name;
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
      const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: /Импорт · PDF/ }).click();
      await (await chooser).setFiles({ name: "menu.csv", mimeType: "text/csv", buffer: Buffer.from("name,price\n" + recognitionName + ",17") });
      await review.waitFor(); const beforeImport = get();
      const line = review.locator("article").first(); await line.getByLabel("Раздел", { exact: true }).selectOption("bar"); await line.getByLabel("Категория", { exact: true }).selectOption("alcohol"); await line.getByLabel("Как списывать со склада?").selectOption("NONE");
      await line.getByLabel("Решение для строки").selectOption("apply"); await line.getByRole("checkbox").check();
      await line.getByLabel("Цена", { exact: true }).fill("-1"); await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.getByRole("alert").waitFor(); assert.deepEqual(get(), beforeImport);
      await line.getByLabel("Цена", { exact: true }).fill("17"); await line.getByRole("checkbox").check();
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').waitFor(); await page.screenshot({ path: `${out}/${profile.name}-import-diff.png`, fullPage: true });
      await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" }); assert.equal(get().menuItems.length, beforeImport.menuItems.length + 1);
      await reloadMenu("after Import reload");
      await assertMapping("Import service " + profile.name, "bar", "alcohol", "Бар", "Алкоголь");
      // Camera staging, batch recognition and merge adapter lead to SCAN draft.
      recognitionName = "Scan service " + profile.name;
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); const camera = page.waitForEvent("filechooser"); await page.getByRole("button", { name: /Распознать · камера/ }).click();
      await (await camera).setFiles({ name: "menu.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBqkAAAAASUVORK5CYII=", "base64") });
      await review.waitFor(); assert.match(await review.innerText(), /Распознавание/);
      const beforeScan = get(); await line.getByLabel("Раздел", { exact: true }).selectOption("bar"); await line.getByLabel("Категория", { exact: true }).selectOption("alcohol"); await line.getByLabel("Как списывать со склада?").selectOption("NONE"); await line.getByLabel("Решение для строки").selectOption("apply"); await line.getByRole("checkbox").check();
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').waitFor(); await page.screenshot({ path: `${out}/${profile.name}-scan.png`, fullPage: true }); await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" }); assert.equal(get().menuItems.length, beforeScan.menuItems.length + 1);
      await reloadMenu("after Scan reload");
      await assertMapping("Scan service " + profile.name, "bar", "alcohol", "Бар", "Алкоголь");
      // Cancel creates no canonical changes.
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await page.getByRole("button", { name: /Добавить вручную/ }).click(); await editor.waitFor(); await editor.getByLabel("Название", { exact: true }).fill("Cancelled"); await editor.locator(".bd-tax-selectors-v336 select").first().selectOption("bar"); await editor.locator(".bd-tax-selectors-v336 select").nth(1).selectOption("alcohol"); await editor.getByRole("button", { name: /^Без списания/ }).click(); await editor.getByRole("button", { name: "Проверить", exact: true }).filter({ visible: true }).click(); await review.waitFor(); const beforeCancel = get(); await review.getByRole("button", { name: "Отмена", exact: true }).click(); await review.waitFor({ state: "hidden" }); assert.deepEqual(get(), beforeCancel);
      assert.deepEqual(get().recipes, canonical.recipes); assert.deepEqual(get().stockBalances, canonical.stockBalances); assert.deepEqual(get().nomenclature, canonical.nomenclature);
      // Existing menu positions retain their exact records; other defaults share
      // the same first-entry/read/reload contract on both desktop and mobile.
      for (const existing of canonical.menuItems || []) assert.deepEqual(get().menuItems.find((row: { id: string }) => row.id === existing.id), existing);
      // The same visible Import Diff blocks duplicate/invalid rows and stale
      // existing targets on each profile before any canonical write.
      const importRows = async (items: Record<string, unknown>[]) => {
        recognitionItems = items;
        await page.getByRole("button", { name: "Добавить позицию", exact: true }).click();
        const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: /Импорт · PDF/ }).click();
        await (await chooser).setFiles({ name: "diff.csv", mimeType: "text/csv", buffer: Buffer.from("name,price\nQA,15") });
        await review.waitFor(); recognitionItems = null;
        for (const row of await review.locator("article").all()) {
          await row.getByLabel("Раздел", { exact: true }).selectOption("bar"); await row.getByLabel("Категория", { exact: true }).selectOption("alcohol"); await row.getByLabel("Как списывать со склада?").selectOption("NONE"); await row.getByLabel(/Решение для/).selectOption("apply"); await row.getByRole("checkbox").check();
        }
      };
      const item = (name: string, salePrice: number) => ({ name, salePrice, currency: "MDL", type: "service" });
      await importRows([item("Manual service " + profile.name, 20), item("Diff new " + profile.name, 18), item("Scan service " + profile.name, 17), item("Invalid " + profile.name, -1), item("Duplicate " + profile.name, 15), item("Duplicate " + profile.name, 15)]);
      const beforeDiff = get();
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.getByRole("alert").waitFor();
      assert.match(await review.innerText(), /Повторяющаяся позиция/); assert.match(await review.innerText(), /неотрицательную цену/);
      assert.match(await review.innerText(), /Будет изменено: 1/); assert.match(await review.innerText(), /Без изменений: 1/); assert.deepEqual(get(), beforeDiff);
      await page.screenshot({ path: `${out}/${profile.name}-diff-conflict.png`, fullPage: true });
      for (let index = 3; index < 6; index++) await review.locator("article").nth(index).getByLabel(/Решение для/).selectOption("skip");
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" });
      assert.equal(get().menuItems.find((row: { name: string }) => row.name === "Manual service " + profile.name).salePrice, 20);
      for (const existing of beforeDiff.menuItems.filter((row: { name: string }) => row.name !== "Manual service " + profile.name)) assert.deepEqual(get().menuItems.find((row: { id: string }) => row.id === existing.id), existing);
      await importRows([item("Manual service " + profile.name, 25)]);
      const current = get().menuItems.find((row: { name: string }) => row.name === "Manual service " + profile.name);
      const concurrent = await send({ action: "create", source: "MANUAL", draftId: "draft:concurrent-" + profile.name, items: [{ ...current, salePrice: 23 }] }); assert.equal(concurrent.status, 201);
      const valid = await send({ action: "validate", draftId: concurrent.body.draft.id, revision: concurrent.body.draft.revision }); assert.equal(valid.status, 200);
      assert.equal((await send({ action: "confirm", draftId: valid.body.draft.id, revision: valid.body.draft.revision, validationHash: valid.body.draft.validationHash })).status, 201);
      const beforeConflict = get(); await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.getByRole("alert").waitFor(); assert.match(await review.innerText(), /изменилась после получения черновика/); assert.deepEqual(get(), beforeConflict);
      await review.getByRole("button", { name: "Отмена", exact: true }).click(); await review.waitFor({ state: "hidden" }); assert.deepEqual(get(), beforeConflict);
      const otherMappings = [["kitchen", "food", "Кухня", "Продукты"], ["hookah", "hookah-tobacco", "Кальянная", "Табак и смеси"], ["household", "cleaning", "Хозчасть", "Уборка и гигиена"], ["administration", "services", "Администрация", "Услуги"]];
      for (const [sectionId, taxonomyCategoryId, groupName, category] of otherMappings) {
        const name = "Mapping " + taxonomyCategoryId + " " + profile.name;
        await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await page.getByRole("button", { name: /Добавить вручную/ }).click(); await editor.waitFor();
        await editor.getByLabel("Название", { exact: true }).fill(name); await editor.locator(".bd-tax-selectors-v336 select").first().selectOption(sectionId); await editor.locator(".bd-tax-selectors-v336 select").nth(1).selectOption(taxonomyCategoryId); await editor.getByRole("button", { name: /^Без списания/ }).click(); await editor.locator('input[type="number"]').first().fill("15");
        await editor.getByRole("button", { name: "Проверить", exact: true }).filter({ visible: true }).click(); await review.waitFor(); await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" });
        await assertMapping(name, sectionId, taxonomyCategoryId, groupName, category);
      }
      await reloadMenu("final mappings reload");
      await assertMapping("Manual service " + profile.name, "bar", "alcohol", "Бар", "Алкоголь");
      for (const [sectionId, taxonomyCategoryId, groupName, category] of otherMappings) await assertMapping("Mapping " + taxonomyCategoryId + " " + profile.name, sectionId, taxonomyCategoryId, groupName, category);
      // Repeat the real login/bootstrap lifecycle with the existing synthetic
      // account, then return directly to Menu under the same permission gate.
      await page.evaluate(() => { localStorage.removeItem("bd_session"); localStorage.removeItem("bd_session_token"); });
      const login = await context.request.post(base + "/api/auth/login", { data: { email: actor.email, password: "Isolated-Test-Password-123!" } });
      assert.equal(login.status(), 200);
      const session = await login.json();
      await page.evaluate(({ email, token, venueId }) => { localStorage.setItem("bd_session", email); localStorage.setItem("bd_session_token", token); localStorage.setItem("bd_active_venue_id", String(venueId)); }, { email: actor.email, token: session.token, venueId });
      await reloadMenu("after repeated login/bootstrap");
      await page.screenshot({ path: `${out}/${profile.name}-taxonomy-reload.png`, fullPage: true });
      if (profile.stockFirst) assert.equal("nomenclatureStructure" in get(), false);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false); assert.deepEqual(errors, []);
      results.push({ profile: profile.name, role: profile.role, stockFirst: profile.stockFirst, manual: "PASS", scan: "PASS", import: "PASS", importDiff: "PASS", invalid: "PASS", duplicate: "PASS", concurrentConflict: "PASS", cancel: "PASS", lostResponseRetry: "PASS", repeatedConfirm: "PASS", taxonomyMappingsReload: "PASS", actionAfterEveryReload: "PASS", repeatedLoginBootstrap: "PASS", existingMenuRecipesStock: "PASS", physicalDevice: false, recognitionProvider: "fixture at external OCR boundary" });
      console.log("PASS " + profile.name);
    } catch (error) { await page.screenshot({ path: `${out}/${profile.name}-failure.png`, fullPage: true }); console.error(await page.locator("body").innerText()); throw error; } finally { await context.close(); }
  }
  for (const source of ["MANUAL", "SCAN", "IMPORT"]) assert.ok(requests.some(row => row.action === "create" && row.source === source));
  writeFileSync(out + "/results.json", JSON.stringify({ results, requests }, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); server.close(); runtime.close(); }

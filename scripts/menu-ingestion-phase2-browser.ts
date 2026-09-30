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
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await lifecycleRuntime({ ingestion: "./app/api/menu/ingestion/route", taxonomy: "./app/api/nomenclature/taxonomy/route", sales: "./app/api/sales-events/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", valuation: "./app/api/inventory/valuation/route" });
let recognitionName = "Scan service", lostConfirm = false;
const requests: { action: string; source?: string }[] = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/menu/ingestion": "ingestion", "/api/nomenclature/taxonomy": "taxonomy", "/api/sales-events": "sales", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/inventory/valuation": "valuation" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name) {
      const command = name === "ingestion" ? JSON.parse(body.toString()) : null;
      if (command) requests.push({ action: command.action, source: command.source });
      response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
      // Delay authoritative bootstrap to exercise first-click readiness during hydration.
      if (name === "bootstrap") await new Promise(resolve => setTimeout(resolve, 200));
      if (command?.action === "confirm" && lostConfirm && response.ok) { lostConfirm = false; res.destroy(); return; }
    } else if (url.pathname === "/api/catalog/files") {
      response = Response.json({ ok: true, file: { id: "00000000-0000-4000-8000-000000000001", name: "scan.jpg", type: "image/jpeg" } });
    } else if (url.pathname === "/api/catalog/import") {
      // Only external OCR extraction is fixed; its source adapters, production
      // normalization, server draft/validation/confirm and SQLite are exercised.
      const parsed = req.headers["content-type"]?.includes("application/json") ? JSON.parse(body.toString()) : {};
      const draft = normalizeMenuImport({ currency: "MDL", confidence: .65, warnings: ["Проверьте цену"], menuItems: [{ name: recognitionName, salePrice: 17, currency: "MDL", type: "service", confidence: .65 }], recipes: [] }, { source: parsed.source || "upload" });
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
  for (const profile of [{ name: "mobile", width: 390, height: 844 }, { name: "mobile-wide", width: 412, height: 915 }, { name: "desktop", width: 1280, height: 800 }]) {
    const user = await runtime.register(profile.name + "@menu-phase2.test"), venueId = user.activeVenueId;
    runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Phase 2 " + profile.name, currency: "MDL", timezone: "Europe/Chisinau", workingDays: [0, 1, 2, 3, 4, 5, 6], openTime: "00:00", closeTime: "23:59", areas: ["Бар"] }), user.userId);
    const canonical = JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId));
    canonical.nomenclatureStructure = defaultNomenclatureStructure(); canonical.menuItems.forEach((item: Record<string, unknown>) => Object.assign(item, { sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "beer" }));
    // The stock-first assortment used before the first menu entry has no menuItems.
    if (profile.name === "mobile-wide") { delete canonical.menuItems; canonical.recipes = []; }
    runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,'fixture') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId, "bd_assortment_v1", JSON.stringify(canonical));
    const get = () => JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_assortment_v1'").get(user.userId)?.data_json || "null"));
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.width < 600, hasTouch: profile.width < 600 });
    await context.addInitScript(({ email, token, venueId }) => { localStorage.setItem("bd_session", email); localStorage.setItem("bd_session_token", token); localStorage.setItem("bd_active_venue_id", String(venueId)); }, { email: user.email, token: user.token, venueId });
    const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(base + "/catalog?tab=menu");
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
      // Camera staging, batch recognition and merge adapter lead to SCAN draft.
      recognitionName = "Scan service " + profile.name;
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); const camera = page.waitForEvent("filechooser"); await page.getByRole("button", { name: /Распознать · камера/ }).click();
      await (await camera).setFiles({ name: "menu.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBqkAAAAASUVORK5CYII=", "base64") });
      await review.waitFor(); assert.match(await review.innerText(), /Распознавание/);
      const beforeScan = get(); await line.getByLabel("Раздел", { exact: true }).selectOption("bar"); await line.getByLabel("Категория", { exact: true }).selectOption("alcohol"); await line.getByLabel("Как списывать со склада?").selectOption("NONE"); await line.getByLabel("Решение для строки").selectOption("apply"); await line.getByRole("checkbox").check();
      await review.locator('[data-bd-menu-ingestion-action="validate"]').click(); await review.locator('[data-bd-menu-ingestion-action="confirm"]').waitFor(); await page.screenshot({ path: `${out}/${profile.name}-scan.png`, fullPage: true }); await review.locator('[data-bd-menu-ingestion-action="confirm"]').click(); await review.waitFor({ state: "hidden" }); assert.equal(get().menuItems.length, beforeScan.menuItems.length + 1);
      // Cancel creates no canonical changes.
      await page.getByRole("button", { name: "Добавить позицию", exact: true }).click(); await page.getByRole("button", { name: /Добавить вручную/ }).click(); await editor.waitFor(); await editor.getByLabel("Название", { exact: true }).fill("Cancelled"); await editor.locator(".bd-tax-selectors-v336 select").first().selectOption("bar"); await editor.locator(".bd-tax-selectors-v336 select").nth(1).selectOption("alcohol"); await editor.getByRole("button", { name: /^Без списания/ }).click(); await editor.getByRole("button", { name: "Проверить", exact: true }).filter({ visible: true }).click(); await review.waitFor(); const beforeCancel = get(); await review.getByRole("button", { name: "Отмена", exact: true }).click(); await review.waitFor({ state: "hidden" }); assert.deepEqual(get(), beforeCancel);
      assert.deepEqual(get().recipes, canonical.recipes); assert.deepEqual(get().stockBalances, canonical.stockBalances); assert.deepEqual(get().nomenclature, canonical.nomenclature);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false); assert.deepEqual(errors, []);
      results.push({ profile: profile.name, manual: "PASS", scan: "PASS", import: "PASS", invalid: "PASS", cancel: "PASS", lostResponseRetry: "PASS", canonicalRecipesStock: "PASS", physicalDevice: false, recognitionProvider: "fixture at external OCR boundary" });
    } catch (error) { await page.screenshot({ path: `${out}/${profile.name}-failure.png`, fullPage: true }); console.error(await page.locator("body").innerText()); throw error; } finally { await context.close(); }
  }
  for (const source of ["MANUAL", "SCAN", "IMPORT"]) assert.ok(requests.some(row => row.action === "create" && row.source === source));
  writeFileSync(out + "/results.json", JSON.stringify({ results, requests }, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); server.close(); runtime.close(); }

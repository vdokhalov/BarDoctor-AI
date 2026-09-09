import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { chromium } from "playwright-core";
import { openingRuntime } from "../tests/helpers/opening-runtime";
import { canonicalUserShellAssets } from "../lib/bardoctor/app-shell";
const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const pageSource = readFileSync(new URL("../app/inventory-onboarding/route.ts", import.meta.url), "utf8");
const pageBody = stripTypeScriptTypes(pageSource.replace(/^import[^\n]+\n/gm, "")).replace("export function GET", "function GET");
// Actual feature HTML, shared shell assets and real HTTP domain writes; only authentication is a local fixture.
const render = new Function("canonicalUserShellAssets", pageBody + ";return GET;")(canonicalUserShellAssets) as () => Response;
const assets = new Set(["/inventory-onboarding.js", "/inventory-onboarding.css", "/app-shell-v185.css", "/navigation-contract-v247.js", "/app-shell-v185.js", "/navigation-transient-v247.js", "/catalog-accounting-v207.js"]);
const executablePath = await resolveBrowserExecutable(chromium.executablePath());
const browser = await chromium.launch({ executablePath, headless: true, args: process.platform === "win32" ? [] : chromiumArgs });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
    const runtime = openingRuntime();
    const serverErrors: string[] = [];
    const server = createServer(async (req, res) => {
      try {
        const path = req.url?.split("?")[0];
        let response: Response;
        if (path === "/api/inventory/opening") {
          const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const body = Buffer.concat(chunks);
          const request = new Request(`http://127.0.0.1${path}`, { method: req.method, headers: { "X-Venue-Id": String(req.headers["x-venue-id"] || 1), "Content-Type": "application/json" }, ...(body.length ? { body } : {}) });
          response = await (req.method === "POST" ? runtime.api.POST(request) : runtime.api.GET(request));
        } else if (path && assets.has(path)) {
          response = new Response(readFileSync(new URL(`../public${path}`, import.meta.url)), { headers: { "Content-Type": path.endsWith("js") ? "application/javascript" : "text/css" } });
        } else if (path === "/favicon.ico") response = new Response(null, { status: 204 });
        else response = render();
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) { serverErrors.push(String(error)); res.writeHead(500); res.end("QA server failure"); }
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("pageerror", error => consoleErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    try {
      await page.addInitScript(() => { localStorage.setItem("bd_active_venue_id", "1"); });
      await page.goto(origin + "/inventory-onboarding");
      await page.locator("#work:not([hidden])").waitFor();
      const section = await page.locator("#section option").nth(1).getAttribute("value"); assert.ok(section);
      await page.selectOption("#section", section);
      const category = await page.locator("#category option").nth(1).getAttribute("value"); assert.ok(category);
      await page.selectOption("#category", category);
      await page.fill("#name", "Phase 5 bottle"); await page.selectOption("#stockUnit", "l");
      await page.fill("#quantity", "6"); await page.check("#packaged");
      await page.fill("#packageQuantity", "0.7"); await page.selectOption("#packageUnit", "l");
      await page.getByRole("button", { name: "Проверить перед сохранением" }).click();
      await page.locator("#preview:not([hidden])").waitFor();
      assert.match(await page.locator("#rows").innerText(), /4\.2 л/);
      assert.match(await page.locator("#rows").innerText(), /Стоимость неизвестна/);
      assert.equal(runtime.batches(), 0);
      await page.click("#discard"); assert.equal(await page.locator("#preview").isVisible(), false);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden"), false);
      assert.equal(runtime.get("bd_opening_stock_v1"), null);
      await page.getByRole("button", { name: "Проверить перед сохранением" }).click();
      await page.locator("#preview:not([hidden])").waitFor(); await page.click("#confirm");
      await page.waitForFunction(() => document.getElementById("notice")?.textContent?.includes("Сохранено 1 строк"));
      await page.reload(); await page.locator("#work:not([hidden])").waitFor();
      await page.locator("#history summary").first().click();
      assert.match(await page.locator("#history").innerText(), /Phase 5 bottle/);
      const balance = (runtime.get("bd_assortment_v1") as { stockBalances: {current: number;unit: string}[] }).stockBalances[0];
      assert.equal(balance.current, 4.2); assert.equal(balance.unit, "l"); assert.equal(runtime.get("bd_purchase_documents"), null);
      const csv = `name;stockUnit;sectionId;taxonomyCategoryId;quantity;unit\nCSV valid;pcs;${section};${category};12;pcs\nCSV invalid;kg;${section};${category};2;l`;
      await page.setInputFiles("#csv", { name: "opening.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
      await page.locator("#preview-csv:not([hidden])").waitFor(); await page.click("#preview-csv");
      await page.locator("#preview:not([hidden])").waitFor();
      assert.equal(await page.locator(".preview-row .error").count(), 1);
      const before = runtime.batches(); await page.click("#confirm");
      await page.waitForFunction(() => document.getElementById("notice")?.textContent?.includes("Исправьте выбранные"));
      assert.equal(runtime.batches(), before);
      await page.uncheck('[data-row="csv-2"]'); await page.click("#confirm");
      await page.waitForFunction(() => document.getElementById("notice")?.textContent?.includes("Пропущено 1"));
      assert.equal((runtime.get("bd_opening_stock_v1") as {items: unknown[]}[]).length, 2);
      const layout = await page.evaluate(() => ({ width: innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, overflow: getComputedStyle(document.body).overflow }));
      assert.ok(layout.doc <= viewport.width && layout.body <= viewport.width, JSON.stringify(layout));
      assert.notEqual(layout.overflow, "hidden"); assert.deepEqual(consoleErrors, []); assert.deepEqual(serverErrors, []);
      console.log(`Phase 5 opening ${viewport.width}x${viewport.height}: manual/package/cancel/confirm/SQLite reload/CSV explicit skip PASS`);
    } finally { await context.close(); await new Promise<void>(resolve => server.close(() => resolve())); runtime.close(); }
  }
} finally { await browser.close(); }

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { salesAccountingPage } from "../lib/bardoctor/sales-accounting-page";
import { openingRuntime } from "../tests/helpers/opening-runtime";
import * as accounting from "../lib/bardoctor/sales-accounting";
import * as consumption from "../lib/bardoctor/sales-consumption";
import * as salesRevenue from "../lib/bardoctor/sales-revenue";
import { normalizeSalesDocument } from "../lib/bardoctor/sales";

const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixture = openingRuntime(new URL("../app/api/sales-accounting/route.ts", import.meta.url), {
  ...accounting, confirmSalesImport: async (request: Request) => importApi.POST(request),
});
const importApi = fixture.loadRoute(new URL("../app/api/sales/confirm/route.ts", import.meta.url), {
  ...accounting, ...consumption, ...salesRevenue, normalizeSalesDocument,
});
const output = resolve("outputs/sales-accounting");
mkdirSync(output, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, "http://localhost");
    if (url.pathname === "/api/sales-accounting") {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, { method: req.method, headers: { "Content-Type": "application/json" },
        ...(req.method === "POST" ? { body: Buffer.concat(chunks).toString() } : {}) });
      const response = req.method === "POST" ? await fixture.api.POST(request) : await fixture.api.GET(request);
      res.writeHead(response.status, { "Content-Type": "application/json" }); res.end(await response.text()); return;
    }
    if (url.pathname.startsWith("/api/")) { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true,"venues":[]}'); return; }
    if (["/settings/sales-accounting", "/sales-totals"].includes(url.pathname)) {
      res.writeHead(200, { "Content-Type": "text/html" }); res.end(salesAccountingPage(url.pathname.includes("settings"))); return;
    }
    const path = resolve("public", "." + url.pathname);
    if (!path.startsWith(resolve("public") + "/")) { res.writeHead(404); res.end(); return; }
    const types: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
    res.writeHead(200, { "Content-Type": types[extname(path)] || "text/plain" }); res.end(readFileSync(path));
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
async function main() {
  await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port, base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(), args: chromiumArgs, headless: true });
  const results: object[] = [];
  try {
    for (const width of [390, 1280]) {
      const context = await browser.newContext({ locale: "ru-RU", viewport: { width, height: width === 390 ? 844 : 900 } });
      await context.addInitScript(() => { localStorage.setItem("bd_active_venue_id", "1"); localStorage.setItem("bd_session", "isolated"); localStorage.setItem("bd_session_token", "isolated"); });
      const page = await context.newPage(), errors: string[] = [];
      page.setDefaultTimeout(10000);
      page.on("pageerror", e => errors.push(e.message));
      fixture.put(accounting.SALES_ACCOUNTING_KEY, accounting.initialSalesAccounting(1, new Date().toISOString(), 7));
      fixture.put("bd_finance_revenue", []); fixture.put("bd_operational_reports_v1", []);
      await page.goto(base + "/settings/sales-accounting");
      await page.locator('[data-mode="MANUAL"]').waitFor();
      await page.waitForFunction(() => !(document.querySelector('[data-mode="MANUAL"]') as HTMLButtonElement).disabled);
      assert.equal(await page.locator('[data-mode="POS"]').getAttribute("aria-pressed"), "true");
      await page.screenshot({ path: `${output}/settings-${width}.png`, fullPage: true });
      await page.locator('[data-mode="MANUAL"]').click();
      await page.getByRole("dialog").waitFor();
      assert.match(await page.locator("#accounting-confirm-copy").innerText(), /История сохраняется/);
      await page.screenshot({ path: `${output}/confirmation-${width}.png`, fullPage: true });
      await page.locator("#accounting-confirm-save").click();
      await page.waitForFunction(() => !document.querySelector("#accounting-pending")?.hasAttribute("hidden"));
      const state = fixture.get(accounting.SALES_ACCOUNTING_KEY) as accounting.SalesAccounting;
      assert.equal(state.changes.length, 2);
      fixture.put(accounting.SALES_ACCOUNTING_KEY, { version: 1, venueId: 1, changes: [{ ...state.changes[1], effectiveDate: "2020-01-01" }] });
      await page.goto(base + "/sales-totals");
      await page.waitForFunction(() => !(document.querySelector("#totals-save") as HTMLButtonElement).disabled);
      await page.locator("#totals-cash").fill("2400"); await page.locator("#totals-card").fill("6800");
      assert.match(await page.locator("[data-accounting-currency]").first().innerText(), /MDL/);
      await page.screenshot({ path: `${output}/totals-${width}.png`, fullPage: true });
      await page.locator("#totals-save").click();
      await page.waitForFunction(() => document.querySelector("#accounting-status")?.textContent?.includes("Итоги сохранены"));
      let totals = fixture.get("bd_finance_revenue") as Record<string, unknown>[];
      assert.equal(totals[0].revenue, 9200); assert.equal(totals[0].declaredCost, null); assert.equal(totals[0].receipts, null);
      await page.reload();
      await page.waitForFunction(() => (document.querySelector("#totals-cash") as HTMLInputElement).value === "2400");
      await page.locator("#totals-cogs").fill("0"); await page.locator("#totals-reason").fill("Подтверждена нулевая себестоимость");
      await page.locator("#totals-save").click();
      await page.waitForFunction(() => document.querySelector("#accounting-status")?.textContent?.includes("Итоги сохранены"));
      totals = fixture.get("bd_finance_revenue") as Record<string, unknown>[];
      assert.equal(totals.length, 1); assert.equal(totals[0].declaredCost, 0); assert.equal(totals[0].manualRevision, 2);
      fixture.put("bd_assortment_v1", { menuItems: [{ id: "service", venueId: 1, name: "Service", active: true, type: "simple", consumptionMode: "NONE", currency: "MDL", salePrice: 9500 }] });
      const importedDocument = normalizeSalesDocument({ id: "ui-import-" + width, date: totals[0].date, venueId: 1, currency: "MDL", sourceType: "file_import", totalRevenue: 9500,
        items: [{ id: "line", name: "Service", menuItemId: "service", quantity: 1, confidence: 1 }] });
      fixture.put(accounting.SALES_IMPORT_REVIEW_KEY, [{ id: importedDocument.id, venueId: 1, date: importedDocument.date, status: "AWAITING_RECONCILIATION", document: importedDocument }]);
      await page.reload();
      await page.getByRole("button", { name: "Сверить с ручными итогами" }).click();
      await page.locator("#import-reason").fill("Проверен полный дневной отчёт");
      await page.getByRole("button", { name: "Заменить ручные итоги" }).click();
      await page.waitForFunction(() => document.querySelector("#accounting-status")?.textContent?.includes("другого источника"));
      assert.equal((fixture.get("bd_finance_revenue") as Record<string, unknown>[])[0].revenue, 9500);
      assert.equal(await page.locator("#totals-save").isDisabled(), true);
      const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
        saveHeight: document.querySelector("#totals-save")!.getBoundingClientRect().height }));
      assert.equal(geometry.overflow, false); assert.ok(geometry.saveHeight >= 48); assert.deepEqual(errors, []);
      results.push({ width, ...geometry, errors, savedRevisions: 2, explicitImportReplacement: "PASS", currency: "MDL", status: "PASS" });
      fixture.put("bd_sales_documents", []); fixture.put("bd_sales_batches", []); fixture.put(accounting.SALES_IMPORT_REVIEW_KEY, []);
      await context.close();
    }
    writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
  } finally { await browser.close(); server.close(); fixture.close(); }
}
main().catch(error => { console.error(error); server.close(); fixture.close(); process.exitCode = 1; });

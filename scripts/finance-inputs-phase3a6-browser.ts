import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
import { waitForSalesHostReads } from "../tests/helpers/sales-navigation-settled";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const fixedTime = "2026-10-02T12:00:00Z";
const apiDelay = Number(process.env.BD_OPERATIONAL_API_DELAY || 0);
const runtime = await lifecycleRuntime({ sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route", health: "./app/api/business-health/route", context: "./lib/bardoctor/venue-ai-context", expenses: "./app/api/expenses/route" }, { now: fixedTime });
const pendingHandlers = new Set<Promise<void>>();
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs", "/api/business-health": "health", "/api/expenses": "expenses" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name && apiDelay) await new Promise(done => setTimeout(done, apiDelay));
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/reports", "/salaries", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
    else {
      const file = resolve("public", "." + url.pathname);
      response = file.startsWith(resolve("public")) && existsSync(file) ? new Response(readFileSync(file), { headers: { "Content-Type": ({ ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" } as Record<string, string>)[extname(file)] || "application/octet-stream" } }) : new Response(null, { status: 404 });
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end("Fixture failure"); }
}
const server = createServer((req, res) => {
  const task = handleRequest(req, res); pendingHandlers.add(task);
  void task.finally(() => pendingHandlers.delete(task));
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const engine = process.env.BD_FINANCE_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ ...(engine === chromium ? { executablePath: process.env.BD_QA_BROWSER || await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs } : {}), headless: true });
const out = "outputs/finance-inputs-phase3a6/" + (engine === webkit ? "webkit" : "chromium"); mkdirSync(out, { recursive: true });
const results: unknown[] = [];
try {
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "tablet", width: 820, height: 1000 }, { name: "desktop", width: 1280, height: 800 }]) {
    const user = await runtime.register(viewport.name + "@phase3a6.isolated.test"), venueId = user.activeVenueId;
    const profile = { name: "Phase3a6 isolated " + viewport.name, currency: "MDL", timezone: "Europe/Chisinau", workingDays: [0, 1, 2, 3, 4, 5, 6], openTime: "00:00", closeTime: "23:59", areas: ["Бар"] };
    runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify(profile), user.userId);
    const put = (key: string, value: unknown) => runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId, key, JSON.stringify(value), fixedTime);
    const get = (key: string) => JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId, key)?.data_json || "null"));
    put("bd_assortment_v1", JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId)));
    put("bd_employees", [{ id: "qa", name: "QA employee", position: "bartender", department: "Бар", status: "active", payrollRuleId: "qa-rule" }]);
    put("bd_payroll_rules", [{ id: "qa-rule", name: "Current QA rule", active: true, blocks: [{ id: "rate", type: "shift_rate", amount: 999, enabled: true }] }]);
    const send = (body: object) => runtime.api.sales.POST(runtime.request(user, "/api/sales-events", "POST", { venueId, ...body }));
    for (const [shiftId, quantity] of [["A", 5], ["B", 10]] as const) {
      assert.equal((await send({ action: "open_shift", shiftId, name: shiftId })).status, 201);
      const command = { id: "sale-" + shiftId, source: "POS_API", shiftId, lines: [{ id: "line-" + shiftId, menuItemId: "beer", quantity }], payments: [{ id: "payment-" + shiftId, method: "CASH", amount: quantity * 20 }] };
      const preview = await (await send({ action: "preview", command })).json() as { previewHash: string };
      assert.equal((await send({ action: "post", command, previewHash: preview.previewHash })).status, 201);
      assert.equal((await send({ action: "post", command, previewHash: preview.previewHash })).status, 200);
      assert.equal((await send({ action: "close_shift", shiftId })).status, 201);
    }
    assert.equal((await send({ action: "open_shift", shiftId: "C", name: "C" })).status, 201);
    const days = async () => (await (await runtime.api.days.GET(runtime.request(user, "/api/operational-days"))).json()) as { days: { businessDate: string; status: string; revenue: { amount: number; status: string }; payroll: { amount: number } }[] };
    const day = (await days()).days[0], date = day.businessDate;
    assert.equal(day.revenue.amount, 300); assert.equal(day.status, "OPERATING");
    const closeBody = { venueId, sectionsVersion: 1, shiftCloseId: "qa-report", revenueRecord: { date, staffing: [{ employeeId: "qa", hours: 8 }], payrollBreakdown: { total: 90, employees: [{ employeeId: "qa", employeeName: "QA employee", total: 90, flags: [], occurrences: [{ ruleName: "Recorded QA", formula: "Записанный ФОТ", amount: 90 }] }] }, guests: 8 }, writeOffItems: [] };
    assert.equal((await runtime.api.close.POST(runtime.request(user, "/api/shifts/close", "POST", closeBody))).status, 201);
    assert.equal((await runtime.api.close.POST(runtime.request(user, "/api/shifts/close", "POST", closeBody))).status, 200);
    const auth = await runtime.api.auth.authenticateRequest(runtime.request(user, "/api/auth/bootstrap")); assert.ok(auth);
    const contextApi = runtime.api.context as unknown as typeof import("../lib/bardoctor/venue-ai-context");
    const canonical = await contextApi.loadVenueAIContext(auth, "diagnosis");
    const period = canonical.promptData.performanceHistory.period as Record<string, unknown>;
    assert.equal(period.revenue, 300); assert.equal(period.payroll, 90); assert.equal(period.result, 210);
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, timezoneId: profile.timezone });
    const fetchTrace: unknown[] = [];
    await context.exposeBinding("__bdPerfObserve", (_source, event) => { fetchTrace.push(event); });
    await context.addInitScript({ path: resolve("scripts/qa/sales-navigation-probe.js") });
    await context.addInitScript(({ email, token, venueId }) => { localStorage.setItem("bd_session", email); localStorage.setItem("bd_session_token", token); localStorage.setItem("bd_active_venue_id", String(venueId)); }, { email: user.email, token: user.token, venueId });
    // Observe actual final module bindings in this isolated browser only.
    await context.route("**/assets/index-BQGspy0I*.js*", async route => {
      const response = await route.fetch(), original = await response.text();
      assert.ok(original.includes("bdFinanceInputsPhase3a6"));
      assert.equal(original, readFileSync("public/assets/index-BQGspy0I.js", "utf8"), "served bundle equals final canonical source");
      await route.fulfill({ response, body: original + '\nwindow.__bdFinanceAcceptance={report:async(profile,month,venueId)=>{const response=await fetch("/api/operational-days",{headers:ca(Ot())}),days=await response.json();return bdBuildMonthlyReport(profile,month,bdOperationalRows(days.revenues,days.days),bdProcArray("bd_finance_expenses"),bdProcArray("bd_inventory_snapshots"),{venueId,accountingCurrency:profile.currency,inventorySections:[]})},payrollAudits:bdPayrollMonthAudits};' });
    });
    const page = await context.newPage(), errors: string[] = [], errorEvents: unknown[] = [];
    page.on("pageerror", error => { errors.push(error.message); errorEvents.push({ message: error.message, stack: error.stack, url: page.url(), fetchTrace: fetchTrace.slice(-10) }); });
    const failedRequests: unknown[] = [];
    page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText, page: page.url() }));
    // Separate independent page acceptance from navigation-cancellation testing.
    // Drain the existing background reads before replacing the document; retain
    // the strict no-page-errors assertion for both browser engines.
    const navigate = async (path: string) => { if (await page.locator("#root").count()) await waitForSalesHostReads(page); await page.goto(base + path); await page.waitForLoadState("networkidle"); };
    await page.clock.setFixedTime(new Date(fixedTime));
    try {
      await navigate("/shifts?month=" + date.slice(0, 7)); await page.locator(".bd-shift-card.operating").first().waitFor();
      await page.screenshot({ path: out + "/" + viewport.name + "-open-day.png", fullPage: true });
      await navigate("/finance?month=" + date.slice(0, 7)); await page.locator("[data-bd-finance-dashboard]").waitFor();
      await page.waitForFunction(() => Boolean((window as unknown as { __bdFinanceAcceptance?: unknown }).__bdFinanceAcceptance));
      const report = await page.evaluate(({ profile, month, venueId }) => (window as unknown as { __bdFinanceAcceptance: { report: (profile: object, month: string, venueId: number) => Promise<Record<string, unknown>> } }).__bdFinanceAcceptance.report(profile, month, venueId), { profile, month: date.slice(0, 7), venueId });
      assert.equal(report.revenue, 300); assert.equal(report.payroll, 90); assert.equal(report.resultBeforeCost, 210); assert.equal(report.isClosed, false);
      assert.match(String(report.payrollSource), /Сохранённый ФОТ отчётов/);
      await page.screenshot({ path: out + "/" + viewport.name + "-finance.png", fullPage: true });
      await navigate("/salaries?month=" + date.slice(0, 7)); await page.locator(".bd-payroll-summary-v164").waitFor(); await page.waitForFunction(() => document.querySelector(".bd-payroll-summary-metric-v164.violet strong")?.textContent?.includes("90"));
      assert.match(await page.locator(".bd-payroll-summary-v164").innerText(), /90/);
      await page.screenshot({ path: out + "/" + viewport.name + "-payroll.png", fullPage: true });
      put("bd_payroll_rules", [{ id: "qa-rule", name: "Changed current QA rule", active: true, blocks: [{ id: "rate", type: "shift_rate", amount: 1999, enabled: true }] }]);
      await waitForSalesHostReads(page); await page.reload(); await page.waitForLoadState("networkidle"); await page.locator(".bd-payroll-summary-v164").waitFor(); await page.waitForFunction(() => document.querySelector(".bd-payroll-summary-metric-v164.violet strong")?.textContent?.includes("90")); assert.match(await page.locator(".bd-payroll-summary-v164").innerText(), /90/);
      assert.equal(get("bd_operational_reports_v1")[0].payrollBreakdown.total, 90);
      await navigate("/shifts?month=" + date.slice(0, 7));
      await page.locator(".bd-shift-card.operating").first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Заполнить операционные данные", exact: true }).click();
      await page.getByRole("button", { name: "Далее", exact: true }).click();
      await page.getByText("ФОТ смены · сохранённый", { exact: true }).waitFor();
      for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Далее", exact: true }).click();
      await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
      await page.getByRole("button", { name: "Сохранить изменения", exact: true }).waitFor({ state: "detached" });
      assert.equal(get("bd_operational_reports_v1")[0].payrollBreakdown.total, 90, "editor preserves recorded payroll after rule changes");
      assert.equal((await send({ action: "close_shift", shiftId: "C" })).status, 201);
      const completed = (await days()).days[0]; assert.equal(completed.status, "COMPLETE"); assert.equal(completed.revenue.status, "FINAL"); assert.equal(completed.payroll.amount, 90);
      await navigate("/reports?month=" + date.slice(0, 7)); await page.getByText("Начисленный ФОТ", { exact: true }).waitFor();
      await page.screenshot({ path: out + "/" + viewport.name + "-report.png", fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no horizontal viewport overflow");
      assert.deepEqual(errors, []); assert.equal(get("bd_finance_revenue").length, 3); assert.equal(get("bd_sales_events_v1").length, 2);
      results.push({ ...viewport, venueId, businessDate: date, daily: 300, recordedPayroll: 90, preliminaryResult: 210, finalRevenue: true, dayComplete: true, duplicateSale: false, isolated: true, errors });
    } catch (error) {
      console.error(JSON.stringify({ errors, errorEvents, failedRequests, fetchTrace: fetchTrace.slice(-30), url: page.url() }));
      writeFileSync(out + "/failure-network.json", JSON.stringify({ errors, errorEvents, failedRequests, fetchTrace }, null, 2));
      if (!page.isClosed()) {
        try { await page.screenshot({ path: out + "/failure.png", fullPage: true }); writeFileSync(out + "/failure.txt", await page.locator("body").innerText()); } catch { /* Preserve the original acceptance failure. */ }
      }
      throw error;
    }
    finally { await context.close(); }
  }
  writeFileSync(out + "/result.json", JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await Promise.all(pendingHandlers); runtime.close(); }

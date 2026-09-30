import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { lifecycleRuntime } from "../tests/helpers/lifecycle-runtime";
import { salesEventFixture } from "../tests/helpers/sales-event-fixture";
import { barDoctorResponse } from "../app/bar-doctor-response";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await lifecycleRuntime({ sales: "./app/api/sales-events/route", days: "./app/api/operational-days/route", close: "./app/api/shifts/close/route", usersMe: "./app/api/users/me/route", restaurantMe: "./app/api/restaurants/me/route", store: "./app/api/store/route", storeKey: "./app/api/store/[key]/route", overview: "./app/api/assortment/overview/route", writeOffs: "./app/api/write-offs/route" });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks), key = url.pathname.match(/^\/api\/store\/([^/]+)$/)?.[1];
    const routes: Record<string, string> = { "/api/sales-events": "sales", "/api/operational-days": "days", "/api/shifts/close": "close", "/api/auth/bootstrap": "bootstrap", "/api/users/me": "usersMe", "/api/restaurants/me": "restaurantMe", "/api/venues": "venues", "/api/store": "store", "/api/assortment/overview": "overview", "/api/write-offs": "writeOffs" };
    const name = key ? "storeKey" : routes[url.pathname];
    let response: Response;
    if (name) response = await runtime.api[name][req.method || "GET"](new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) }), { params: Promise.resolve({ key }) } as never);
    else if (["/shifts", "/finance", "/home", "/login"].includes(url.pathname)) response = barDoctorResponse();
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
const out = "outputs/operational-day-phase1a"; mkdirSync(out, { recursive: true });
const results: unknown[] = [];
try {
  for (const profile of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 800 }]) {
    const user = await runtime.register(profile.name + "@phase1a.test"), venueId = user.activeVenueId;
    runtime.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Phase 1A " + profile.name, currency: "MDL", timezone: "Europe/Chisinau", workingDays: [0, 1, 2, 3, 4, 5, 6], openTime: "00:00", closeTime: "23:59", areas: ["Бар"] }), user.userId);
    const put = (key: string, value: unknown) => runtime.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(user.userId, key, JSON.stringify(value), new Date().toISOString());
    const get = (key: string) => JSON.parse(String(runtime.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(user.userId, key)?.data_json || "null"));
    put("bd_assortment_v1", JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId)));
    const send = (body: object) => runtime.api.sales.POST(runtime.request(user, "/api/sales-events", "POST", { venueId, ...body }));
    assert.equal((await send({ action: "open_shift", shiftId: "cash", name: "Cash" })).status, 201);
    const command = { id: "sale", source: "POS_API", shiftId: "cash", lines: [{ id: "line", menuItemId: "beer", quantity: 1 }], payments: [{ id: "payment", method: "CASH", amount: 20 }] };
    const preview = await (await send({ action: "preview", command })).json() as { previewHash: string };
    assert.equal((await send({ action: "post", command, previewHash: preview.previewHash })).status, 201);
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height } });
    await context.addInitScript(({ email, token, venueId }) => { localStorage.setItem("bd_session", email); localStorage.setItem("bd_session_token", token); localStorage.setItem("bd_active_venue_id", String(venueId)); }, { email: user.email, token: user.token, venueId });
    const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(base + "/shifts");
      await page.locator(".bd-shift-card.operating").waitFor();
      await page.locator(".bd-shifts-context strong").filter({hasText:"Касса открыта"}).waitFor();
      await page.locator(".bd-shift-card.operating").click();
      await page.getByRole("dialog").getByRole("button", { name: "Заполнить операционные данные", exact: true }).click();
      await page.locator('[data-bd-pos-revenue="readonly"]').waitFor();
      assert.match(await page.locator('[data-bd-pos-revenue="readonly"]').innerText(), /Продажи BarDoctor · Предварительно/);
      const before = get("bd_finance_revenue");
      for (let step = 0; step < 4; step++) await page.getByRole("button", { name: "Далее", exact: true }).click();
      const saved = page.waitForResponse(response => response.url().endsWith("/api/shifts/close") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
      const response = await saved; assert.equal(response.status(), 201);
      const body = await response.json(); assert.equal(body.sections.revenue.status, "READ_ONLY");
      assert.deepEqual(get("bd_finance_revenue"), before);
      await page.getByRole("button",{name:"Сохранить изменения",exact:true}).waitFor({state:"detached"});
      await page.locator(".bd-shift-card.operating").waitFor();
      await page.screenshot({ path: out + "/" + profile.name + "-operating.png", fullPage: true });
      await send({ action: "close_shift", shiftId: "cash" }); await page.reload();
      await page.locator(".bd-shift-card.closed").waitFor();
      assert.match(await page.locator(".bd-shift-card.closed").innerText(), /Продажи BarDoctor · Итог/);
      await page.goto(base + "/finance"); await page.locator('[data-bd-finance-dashboard]').waitFor();
      await page.screenshot({ path: out + "/" + profile.name + "-finance.png", fullPage: true });
      assert.equal(get("bd_finance_revenue")[0].revenue, 20); assert.equal(get("bd_stock_movements")[0].amount, -1);
      assert.deepEqual(errors, []); results.push({ profile: profile.name, readonly: true, operationsSaved: true, finality: true, finance: 20, warehouse: -1 });
    } finally { await context.close(); }
  }
  writeFileSync(out + "/result.json", JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); runtime.close(); }

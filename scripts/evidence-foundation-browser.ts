import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { revenueTraceRuntime, revenueFact, resolvedEvidence } from "../tests/helpers/revenue-trace-runtime";
import type { DailyRevenueResolution, EvidenceResolution } from "../lib/bardoctor/evidence-contracts";

const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await revenueTraceRuntime();
await runtime.post("browser-second", "whisky"); await runtime.post("browser-third", "coffee", 2);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const response = url.pathname === "/api/evidence/resolve"
      ? await runtime.api.evidence.GET(new Request(url, { headers: req.headers as HeadersInit }))
      : url.pathname === "/api/evidence/facts/daily-revenue" ? await runtime.api.daily.GET(new Request(url, { headers: req.headers as HeadersInit }))
      : url.pathname === "/api/operational-days" ? await runtime.api.days.GET(new Request(url, { headers: req.headers as HeadersInit }))
      : new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Isolated evidence API QA</title>", { headers: { "content-type": "text/html" } });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end("Isolated test server failure"); }
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const browser = await chromium.launch({ executablePath: await resolveBrowserExecutable(chromium.executablePath()), headless: true, args: chromiumArgs });
const results = [];
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600 });
    try {
      const page = await context.newPage(), errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message)); await page.goto(base);
      const before = runtime.snapshot();
      const headers = { "X-Session-Email": runtime.owner.email, "X-Session-Token": runtime.owner.token, "X-Venue-Id": String(runtime.venueId) };
      const fetchReference = (reference: unknown, auth = headers) => page.evaluate(async ({ reference, auth }) => {
        const response = await fetch("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(reference)), { headers: auth });
        return { status: response.status, cache: response.headers.get("Cache-Control"), body: await response.json() as EvidenceResolution };
      }, { reference, auth });
      for (const ref of [runtime.reference("SALE_EVENT", runtime.event.id), runtime.reference("CASH_SHIFT", "evidence-shift"), runtime.reference("MENU_ITEM", "beer"), runtime.reference("MENU_INGESTION_DRAFT", runtime.draft.id)]) {
        const response = await fetchReference(ref); assert.equal(response.status, 200); assert.equal(response.cache, "private, no-store");
        assert.ok(response.body.outcome === "resolved" || response.body.outcome === "partial");
        const bound = await fetchReference(response.body.evidence.reference);
        assert.ok(bound.body.outcome === "resolved" || bound.body.outcome === "partial"); assert.equal(bound.body.evidence.binding, "EXPECTED_REVISION");
      }
      const daily = await page.evaluate(async auth => {
        const response = await fetch("/api/evidence/facts/daily-revenue?businessDate=" + auth.date, { headers: auth.headers });
        return { status: response.status, cache: response.headers.get("Cache-Control"), body: await response.json() as DailyRevenueResolution };
      }, { date: runtime.event.businessDate, headers });
      assert.equal(daily.status, 200); assert.equal(daily.cache, "private, no-store");
      const fact = revenueFact(daily.body); assert.equal(fact.value, 90); assert.equal(fact.evidenceStatus, "COMPLETE"); assert.equal(fact.finality, "PROVISIONAL");
      const root = resolvedEvidence((await fetchReference(fact.traceTarget!.reference)).body);
      const finance = resolvedEvidence((await fetchReference(root.relations[0].reference)).body);
      const cash = resolvedEvidence((await fetchReference(finance.relations.find(r => r.reference.kind === "CASH_SHIFT")!.reference)).body);
      let salesTotal = 0; const saleIds = new Set<string>();
      for (const relation of cash.relations) {
        const sale = resolvedEvidence((await fetchReference(relation.reference)).body);
        assert.ok(!saleIds.has(relation.reference.id)); saleIds.add(relation.reference.id);
        assert.equal(sale.projection.type, "SALE_EVENT");
        if (sale.projection.type === "SALE_EVENT") { assert.equal(sale.projection.lifecycle, "POSTED"); salesTotal += sale.projection.revenue!; }
      }
      assert.equal(saleIds.size, 3); assert.equal(salesTotal, fact.value); assert.equal(finance.projection.type === "FINANCE_REVENUE" && finance.projection.revenue, fact.value);
      const canonical = await page.evaluate(async auth => {
        const body = await (await fetch("/api/operational-days", { headers: auth })).json() as { days: { revenue: { amount: number } }[] };
        return body.days[0].revenue.amount;
      }, headers);
      assert.equal(canonical, fact.value);
      const foreign = await fetchReference(runtime.reference("MENU_ITEM", "beer", { venueId: runtime.foreign.activeVenueId }));
      assert.equal(foreign.body.outcome, "unavailable");
      const anonymous = await fetchReference(runtime.reference("MENU_ITEM", "beer"), {} as typeof headers); assert.equal(anonymous.status, 401);
      const denied = await fetchReference(runtime.reference("MENU_INGESTION_DRAFT", runtime.draft.id), { ...headers, "X-Session-Email": runtime.member.email, "X-Session-Token": runtime.member.token });
      // Manager initially has staging permission; revoke it between requests.
      assert.ok(denied.body.outcome === "resolved" || denied.body.outcome === "partial");
      runtime.permissions("cashier", [], ["inventory.view"]);
      const revoked = await fetchReference(runtime.reference("MENU_INGESTION_DRAFT", runtime.draft.id), { ...headers, "X-Session-Email": runtime.member.email, "X-Session-Token": runtime.member.token });
      assert.equal(revoked.body.outcome, "restricted"); runtime.permissions("manager");
      assert.deepEqual(runtime.snapshot(), before); assert.deepEqual(errors, []);
      results.push({ width, adapters: 4, revenueTrace: "PASS", canonicalRevenue: canonical, eligibleSalesTotal: salesTotal, sales: saleIds.size,
        authenticated: "PASS", foreign: "PASS", anonymous: "PASS", revoked: "PASS", readOnly: "PASS", pageErrors: errors.length });
    } finally { await context.close(); }
  }
  mkdirSync("outputs/evidence-phase3a1", { recursive: true });
  writeFileSync("outputs/evidence-phase3a1/browser.json", JSON.stringify(results, null, 2));
  console.info(JSON.stringify(results));
} finally {
  await browser.close(); await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())); runtime.close();
}

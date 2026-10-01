import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { evidenceRuntime } from "../tests/helpers/evidence-runtime";
import type { EvidenceResolution } from "../lib/bardoctor/evidence-contracts";

const require = createRequire(import.meta.url);
const { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await evidenceRuntime();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const response = url.pathname === "/api/evidence/resolve"
      ? await runtime.api.evidence.GET(new Request(url, { headers: req.headers as HeadersInit }))
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
      results.push({ width, adapters: 4, authenticated: "PASS", foreign: "PASS", anonymous: "PASS", revoked: "PASS", readOnly: "PASS", pageErrors: errors.length });
    } finally { await context.close(); }
  }
  mkdirSync("outputs/evidence-phase3a1", { recursive: true });
  writeFileSync("outputs/evidence-phase3a1/browser.json", JSON.stringify(results, null, 2));
  console.info(JSON.stringify(results));
} finally {
  await browser.close(); await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())); runtime.close();
}

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "playwright-core";
import { menuTraceRuntime, menuFact, menuEvidence, service } from "../tests/helpers/menu-trace-runtime";
import type { EvidenceReference, EvidenceResolution, MenuOriginResolution } from "../lib/bardoctor/evidence-contracts";
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const r = await menuTraceRuntime();
const done = await r.confirm(await r.review(await r.create("draft:browser-origin", [service("Browser origin", { consumptionMode: "RECIPE" })]), { salePrice: 17 }));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), request = new Request(url, { headers: req.headers as HeadersInit });
    const response = url.pathname === "/api/evidence/resolve" ? await r.api.evidence.GET(request) : url.pathname === "/api/evidence/facts/menu-origin" ? await r.api.origin.GET(request)
      : new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Isolated Menu Origin API QA</title>", { headers: { "Content-Type": "text/html" } });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end("Isolated QA handler failure"); }
});
await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
const engine = process.env.BD_EVIDENCE_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(engine === chromium ? { executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs } : {}) });
const results = [];
try {
  for (const width of [390, 820, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: width < 600 });
    try {
      const page = await context.newPage(), errors: string[] = []; page.on("pageerror", e => errors.push(e.message)); await page.goto(base);
      const headers = { "X-Session-Email": r.owner.email, "X-Session-Token": r.owner.token, "X-Venue-Id": String(r.venueId) }, before = r.snapshot();
      const result = await page.evaluate(async ({ headers, id }) => { const response = await fetch("/api/evidence/facts/menu-origin?menuItemId=" + encodeURIComponent(id), { headers }); return { status: response.status, cache: response.headers.get("Cache-Control"), body: await response.json() as MenuOriginResolution }; }, { headers, id: done.draft.resultIds![0] });
      assert.equal(result.status, 200); assert.equal(result.cache, "private, no-store"); const fact = menuFact(result.body); assert.equal(fact.currentMenu.salePrice, 17); assert.equal(fact.originSourceType, "MANUAL");
      const resolve = async (ref: EvidenceReference, auth = headers, offset = 0) => page.evaluate(async ({ ref, auth, offset }) => { const response = await fetch("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)) + "&limit=2&offset=" + offset, { headers: auth }); return { status: response.status, cache: response.headers.get("Cache-Control"), body: await response.json() as EvidenceResolution }; }, { ref, auth, offset });
      const seen = new Set<string>(), queue = [fact.traceTarget!.reference], types = new Set<string>();
      while (queue.length) {
        const ref = queue.shift()!, key = JSON.stringify([ref.kind, ref.id, ref.partId]); if (seen.has(key)) continue; seen.add(key); let offset: number | null = 0;
        do { const response = await resolve(ref, headers, offset); assert.equal(response.status, 200); assert.equal(response.cache, "private, no-store"); const e = menuEvidence(response.body); assert.equal(e.binding, "EXPECTED_REVISION"); types.add(e.projection.type);
          if (e.projection.type === "MENU_CONFIRMATION") { assert.equal(e.projection.menuItemId, fact.menuItemId); assert.equal(e.projection.appliedValues.salePrice, 17); assert.equal(e.projection.reviewedValues.salePrice, 17); }
          queue.push(...e.relations.map(x => x.reference)); offset = e.page.nextOffset;
        } while (offset !== null);
      }
      for (const type of ["MENU_ORIGIN", "MENU_ITEM", "MENU_CONFIRMATION", "MENU_REVIEWED_INPUT", "MENU_SOURCE", "MENU_INGESTION_DRAFT", "MENU_RECIPE", "MENU_TAXONOMY"]) assert.ok(types.has(type), type);
      assert.equal((await resolve({ ...fact.traceTarget!.reference, workspaceId: 999999 })).body.code, "EVIDENCE_UNAVAILABLE"); assert.equal((await resolve(fact.traceTarget!.reference, {} as typeof headers)).status, 401);
      r.permissions(["inventory.manage"]); const memberHeaders = { ...headers, "X-Session-Email": r.member.email, "X-Session-Token": r.member.token };
      assert.equal((await resolve(fact.evidenceRefs.find(x => x.kind === "MENU_CONFIRMATION")!, memberHeaders)).body.code, "ACCESS_DENIED"); r.permissions();
      assert.deepEqual(r.snapshot(), before); assert.deepEqual(errors, []); results.push({ width, status: "PASS", resolvedRecords: seen.size, types: [...types], readOnly: true, tenantRBAC: "PASS" });
    } finally { await context.close(); }
  }
  mkdirSync(("outputs/menu-origin-trace" + (engine === webkit ? "/webkit" : "")), { recursive: true }); writeFileSync(("outputs/menu-origin-trace" + (engine === webkit ? "/webkit" : "") + "/summary.json"), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results));
} finally { await browser.close(); await new Promise<void>(done => server.close(() => done())); r.close(); }

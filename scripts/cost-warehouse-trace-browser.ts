import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "playwright-core";
import { costTraceRuntime, costFact } from "../tests/helpers/cost-trace-runtime";
import { resolvedEvidence } from "../tests/helpers/revenue-trace-runtime";
import type { EvidenceReference, EvidenceResolution, SaleCostResolution } from "../lib/bardoctor/evidence-contracts";

const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const runtime = await costTraceRuntime(); runtime.receipts();
const event = await runtime.post("browser-cost-known", { quantity: 3 });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost"), request = new Request(url, { headers: req.headers as HeadersInit });
    const response = url.pathname === "/api/evidence/resolve" ? await runtime.api.evidence.GET(request)
      : url.pathname === "/api/evidence/facts/sale-cost" ? await runtime.api.cost.GET(request)
      : new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Isolated Cost/Warehouse API QA</title>", { headers: { "Content-Type": "text/html" } });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end("Isolated test server failure"); }
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
      const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message)); await page.goto(base);
      const headers = { "X-Session-Email": runtime.owner.email, "X-Session-Token": runtime.owner.token, "X-Venue-Id": String(runtime.venueId) };
      const before = runtime.snapshot();
      const cost = await page.evaluate(async ({ saleId, headers }) => {
        const r = await fetch("/api/evidence/facts/sale-cost?saleId=" + encodeURIComponent(saleId), { headers });
        return { status: r.status, cache: r.headers.get("Cache-Control"), body: await r.json() as SaleCostResolution };
      }, { saleId: event.id, headers });
      assert.equal(cost.status, 200); assert.equal(cost.cache, "private, no-store");
      const fact = costFact(cost.body); assert.equal(fact.value, 18.3); assert.equal(fact.costStatus, "KNOWN"); assert.equal(fact.evidenceStatus, "COMPLETE");
      const resolve = async (ref: EvidenceReference, auth = headers, offset = 0) => {
        const response = await page.evaluate(async ({ ref, auth, offset }) => {
          const r = await fetch("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)) + "&limit=2&offset=" + offset, { headers: auth });
          return { status: r.status, cache: r.headers.get("Cache-Control"), body: await r.json() as EvidenceResolution };
        }, { ref, auth, offset });
        assert.equal(response.cache, "private, no-store"); return response;
      };
      const root = resolvedEvidence((await resolve(fact.traceTarget!.reference)).body);
      const line = resolvedEvidence((await resolve(root.relations[0].reference)).body);
      const recipeRef = line.relations.find(r => r.reference.kind === "CAPTURED_RECIPE")!.reference;
      const ids = new Set<string>(); let total = 0, ingredients = 0, offset: number | null = 0;
      do {
        const recipe = resolvedEvidence((await resolve(recipeRef, headers, offset)).body);
        for (const relation of recipe.relations.filter(r => r.reference.kind === "CAPTURED_INGREDIENT")) {
          const ingredient = resolvedEvidence((await resolve(relation.reference)).body); assert.equal(ingredient.binding, "EXPECTED_REVISION");
          if (ingredient.projection.type !== "CAPTURED_INGREDIENT") throw new Error("Wrong ingredient projection"); ingredients++;
          const movementRef = ingredient.relations.find(r => r.reference.kind === "WAREHOUSE_MOVEMENT")!.reference;
          const movement = resolvedEvidence((await resolve(movementRef)).body);
          assert.equal(movement.projection.type, "WAREHOUSE_MOVEMENT"); if (movement.projection.type !== "WAREHOUSE_MOVEMENT") throw new Error("Wrong movement");
          assert.ok(!ids.has(movement.reference.id)); ids.add(movement.reference.id);
          assert.equal(movement.projection.quantity, -ingredient.projection.baseQuantityTotal!); assert.equal(movement.projection.unit, ingredient.projection.baseUnit);
          assert.equal(movement.projection.saleId, event.id); total -= movement.projection.costAmount!;
          for (const current of ingredient.relations.filter(r => r.type === "current_definition")) resolvedEvidence((await resolve(current.reference)).body);
        }
        offset = recipe.page.nextOffset;
      } while (offset !== null);
      assert.equal(ingredients, 3); assert.equal(ids.size, 3); assert.equal(Math.round(total * 100) / 100, fact.value);
      assert.equal((await resolve({ ...fact.traceTarget!.reference, venueId: runtime.foreign.activeVenueId })).body.code, "EVIDENCE_UNAVAILABLE");
      assert.equal((await resolve(fact.traceTarget!.reference, {} as typeof headers)).status, 401);
      runtime.permissions("cashier", ["sales.view"]);
      assert.equal((await resolve(fact.traceTarget!.reference, { ...headers, "X-Session-Email": runtime.member.email, "X-Session-Token": runtime.member.token })).body.code, "ACCESS_DENIED"); runtime.permissions("manager");
      assert.deepEqual(runtime.snapshot(), before); assert.deepEqual(errors, []);
      results.push({ width, capturedCost: fact.value, writeOffValuation: Math.round(total * 100) / 100, ingredients, movements: ids.size, pagination: "PASS", security: "PASS", readOnly: "PASS", errors: 0 });
    } finally { await context.close(); }
  }
  mkdirSync(("outputs/cost-warehouse-phase3a3" + (engine === webkit ? "/webkit" : "")), { recursive: true }); writeFileSync(("outputs/cost-warehouse-phase3a3" + (engine === webkit ? "/webkit" : "") + "/browser.json"), JSON.stringify(results, null, 2)); console.info(JSON.stringify(results));
} finally { await browser.close(); await new Promise<void>(done => server.close(() => done())); runtime.close(); }

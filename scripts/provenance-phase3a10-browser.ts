import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "playwright-core";
import { provenanceFixture } from "../tests/helpers/provenance-runtime";
import type { RecommendationMetricSnapshot } from "../lib/bardoctor/recommendation-outcomes";
import type { EvidenceReference } from "../lib/bardoctor/evidence-contracts";

type ProbeEnvelope = { outcome: string; data: { metricProvenance: Record<string, RecommendationMetricSnapshot>; syncItems: { resultEvidenceRef: EvidenceReference }[] }; evidence: { relations: { reference: EvidenceReference }[]; projection: { provenanceState: string } } };
const require = createRequire(import.meta.url), { resolveBrowserExecutable, chromiumArgs } = require("./browser-runtime.cjs");
const engine = process.env.BD_PROVENANCE_BROWSER === "webkit" ? webkit : chromium;
const out = `outputs/provenance-phase3a10/${engine === webkit ? "webkit" : "chromium"}`;
mkdirSync(out, { recursive: true });
const browser = await engine.launch({ headless: true, ...(engine === chromium ? { executablePath: await resolveBrowserExecutable(chromium.executablePath()), args: chromiumArgs } : {}) });
const results = [];
try { for (const width of [390, 820, 1280]) {
  const r = await provenanceFixture();
  const run = await r.sync.runIntegrationSync({ account: r.account, connectionId: "qa-connection", trigger: "file", dataType: "supplier", records: [r.envelope("supplier", "browser-supplier", { name: "Accepted isolated supplier" })], writer: r.writer.integrationBusinessWriter(r.request(r.owner, "/api/integration-hub/import"), r.account) });
  assert.equal(run.status, "success");
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, "http://127.0.0.1"); const chunks: Buffer[] = []; for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const request = new Request(url, { method: incoming.method, headers: incoming.headers as Record<string, string>, ...(["GET", "HEAD"].includes(incoming.method!) ? {} : { body: Buffer.concat(chunks) }) });
      let response: Response;
      if (url.pathname === "/api/auth/login") response = await r.api.login.POST(request);
      else if (url.pathname === "/api/ai/diagnosis") response = await r.api.doctor.handleDiagnosis(request);
      else if (url.pathname === "/api/evidence/resolve") response = await r.api.evidence.GET(request);
      else if (url.pathname === "/api/integration-hub") response = await r.api.hub.GET(request);
      else response = new Response('<!doctype html><meta name="viewport" content="width=device-width"><title>BarDoctor isolated provenance QA</title><main><h1>BarDoctor provenance</h1><p>Isolated browser API regression</p><pre id="result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></main>', { headers: { "Content-Type": "text/html" } });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`, context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(base);
    const loggedIn = await page.evaluate(async ({ email, venueId }) => {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Isolated-Test-Password-123!" }) });
      const body = await response.json() as { ok: boolean; email: string; token: string }; if (body.ok) { localStorage.setItem("bd_session", body.email); localStorage.setItem("bd_session_token", body.token); localStorage.setItem("bd_active_venue_id", String(venueId)); } return response.status;
    }, { email: r.owner.email, venueId: r.venueId }); assert.equal(loggedIn, 200);
    const call = (path: string, method = "GET", body?: object) => page.evaluate(async ({ path, method, body }) => {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json", "X-Session-Email": localStorage.getItem("bd_session")!, "X-Session-Token": localStorage.getItem("bd_session_token")!, "X-Venue-Id": localStorage.getItem("bd_active_venue_id")! }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: response.status, body: await response.json() as ProbeEnvelope };
    }, { path, method, body });
    const diagnosis = await call("/api/ai/diagnosis", "POST", { profile: { currency: "USD" }, finance: { monthToDate: { revenue: 999999 }, recentDaily: [{ date: "2026-10-03", revenue: 999999 }] } });
    assert.equal(diagnosis.status, 200); const metric = diagnosis.body.data.metricProvenance.current_period_revenue;
    assert.equal(metric.value, 150); assert.equal(metric.provenance!.authority, "CANONICAL_SERVER");
    const resolve = (ref: EvidenceReference) => call("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)));
    const evidence = await resolve(metric.provenance!.evidenceRef!); assert.equal(evidence.body.outcome, "resolved");
    const source = evidence.body.evidence.relations.find((row: { reference: EvidenceReference }) => row.reference.id === "bd_finance_revenue")!.reference;
    const sourceEvidence = await resolve(source); assert.equal(sourceEvidence.body.evidence.relations.length, 2);
    for (const relation of sourceEvidence.body.evidence.relations) assert.equal((await resolve(relation.reference)).body.outcome, "resolved");
    const hub = await call(`/api/integration-hub?runId=${run.runId}`); assert.equal(hub.status, 200); assert.equal(hub.body.data.syncItems.length, 1);
    const accepted = await resolve(hub.body.data.syncItems[0].resultEvidenceRef); assert.equal(accepted.body.evidence.projection.provenanceState, "ACCEPTED_REVISION_BOUND");
    for (const relation of accepted.body.evidence.relations) assert.equal((await resolve(relation.reference)).body.outcome, "resolved");
    await page.reload(); assert.equal((await resolve(metric.provenance!.evidenceRef!)).body.outcome, "resolved");
    r.put("bd_finance_revenue", [{ id: "shift-a", venueId: r.venueId, date: "2026-10-03", revenue: 175, receipts: 3, status: "closed" }]);
    assert.equal((await resolve(metric.provenance!.evidenceRef!)).body.outcome, "changed");
    const foreign = await page.evaluate(async ({ user, reference }) => { const response = await fetch("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(reference)), { headers: { "X-Session-Email": user.email, "X-Session-Token": user.token, "X-Venue-Id": String(user.activeVenueId) } }); return response.json() as Promise<{ outcome: string }>; }, { user: r.foreign, reference: source }); assert.equal(foreign.outcome, "unavailable");
    assert.deepEqual(errors, []);
    const row = { width, status: "PASS", canonicalRevenue: 150, forgedBodyRejected: true, metricSourceRevisionBinding: true, acceptedWriteBinding: true, changedRevisionRejected: true, reload: true, foreignScopeRejected: true, pageErrors: errors };
    await page.locator("#result").evaluate((node, value) => { node.textContent = JSON.stringify(value, null, 2); }, row);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${out}/${width}.png`, fullPage: true }); results.push(row);
  } finally { await context.close(); await new Promise<void>(done => server.close(() => done())); r.close(); }
} } finally { await browser.close(); writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2)); }
assert.equal(results.length, 3); console.log(JSON.stringify(results));

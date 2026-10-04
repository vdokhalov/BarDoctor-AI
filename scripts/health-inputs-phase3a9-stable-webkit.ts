import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { webkit } from "playwright-core";
import { healthInputsFixture } from "../tests/helpers/health-inputs-fixture";

/** Mandatory real WebKit auth/canonical API controls. No SPA cancellation replay.
 * Session is established once by actual login, never reinjected on reload. */
const browser = await webkit.launch({ headless: true }), results: unknown[] = [];
const out = "outputs/health-inputs-phase3a9/webkit-stable"; mkdirSync(out, { recursive: true });
try { for (const width of [390, 820, 1280]) {
  const r = await healthInputsFixture(), before = r.before();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`), chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks), request = new Request(url, { method: req.method, headers: req.headers as HeadersInit, ...(body.length ? { body } : {}) });
      let response: Response;
      if (url.pathname === "/api/auth/login") response = await r.api.login.POST(request);
      else if (url.pathname === "/api/business-health") response = await r.api.health.GET(request);
      else if (url.pathname === "/api/ai/diagnosis") response = await r.api.doctor.handleDiagnosis(request);
      else response = new Response("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Isolated canonical Health API QA</title>", { headers: { "Content-Type": "text/html" } });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { console.error(error); res.writeHead(500); res.end("QA fixture failure"); }
  });
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`, context = await browser.newContext({ viewport: { width, height: 900 } });
  try {
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base);
    const login = await page.evaluate(async email => {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Isolated-Test-Password-123!" }) });
      const body = await response.json() as { ok: boolean; email: string; token: string; activeVenueId: number };
      if (body.ok) { localStorage.setItem("bd_session", body.email); localStorage.setItem("bd_session_token", body.token); localStorage.setItem("bd_active_venue_id", String(body.activeVenueId)); sessionStorage.setItem("qa_session_marker", "present"); }
      return { status: response.status, ok: body.ok };
    }, r.owner.email);
    assert.equal(login.status, 200); assert.equal(login.ok, true);
    const session = async () => {
      const value = await page.evaluate(() => ({ email: Boolean(localStorage.getItem("bd_session")), token: Boolean(localStorage.getItem("bd_session_token")), marker: sessionStorage.getItem("qa_session_marker"), origin: location.origin, venue: localStorage.getItem("bd_active_venue_id") }));
      assert.equal(value.email, true); assert.equal(value.token, true); assert.equal(value.marker, "present"); assert.equal(value.origin, base); assert.equal(value.venue, String(r.venueId));
      assert.ok((await context.cookies()).some(cookie => cookie.name === "bd_server_session" && cookie.httpOnly));
    };
    type Envelope = { data: { businessHealth: { components: { id: string; score: number | null; confidence: string }[] }; businessHealthSnapshot: { inputRevision: string; operationsInputs: { counters: Record<string, { value: number | null; zero: string | null; availability: string }> } } } };
    const call = (path = "/api/business-health", method = "GET", body?: object) => page.evaluate(async ({ path, method, body }) => {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json", "X-Session-Email": localStorage.getItem("bd_session") || "", "X-Session-Token": localStorage.getItem("bd_session_token") || "", "X-Venue-Id": localStorage.getItem("bd_active_venue_id") || "" }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() as Envelope };
    }, { path, method, body });
    const ops = (value: Envelope) => value.data.businessHealth.components.find(component => component.id === "operations")!;
    await session(); const empty = await call(); assert.equal(empty.status, 200); assert.equal(ops(empty.body).score, 90);
    for (const counter of Object.values(empty.body.data.businessHealthSnapshot.operationsInputs.counters)) { assert.equal(counter.zero, "KNOWN_ZERO"); assert.equal(counter.value, 0); }
    const doctor = await call("/api/ai/diagnosis", "POST", { profile: {}, cases: [{ priority: "critical", status: "open" }] }); assert.equal(doctor.status, 200); assert.deepEqual(doctor.body.data.businessHealthSnapshot, empty.body.data.businessHealthSnapshot);
    assert.deepEqual(r.before(), before);
    for (let i = 0; i < 3; i++) { await session(); await page.reload(); await session(); assert.equal((await call()).status, 200); }
    r.seed("bd_cases", [{ id: "critical-private-marker", priority: "critical", status: "open" }]); const critical = await call(); assert.equal(ops(critical.body).score, 60); assert.notEqual(critical.body.data.businessHealthSnapshot.inputRevision, empty.body.data.businessHealthSnapshot.inputRevision);
    r.seed("bd_cases", [{ id: "critical-private-marker", priority: "critical", status: "resolved" }]); assert.equal(ops((await call()).body).score, 90);
    r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key='bd_operational_reports_v1'").run(r.accountId); const missing = await call(); assert.equal(ops(missing.body).score, null); assert.equal(ops(missing.body).confidence, "low");
    r.seed("bd_operational_reports_v1", []); r.seed("bd_assortment_v1", { stockBalances: [{ productKey: "stock", unit: "kg", current: -1 }] }); const partial = await call(); assert.equal(ops(partial.body).score, null); assert.equal(partial.body.data.businessHealthSnapshot.operationsInputs.counters.stockAnomalies.availability, "PARTIAL");
    r.seed("bd_assortment_v1", { stockBalances: [] });
    const member = await r.register(`restricted-${width}@isolated.test`);
    r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(?,?,'member')").run(r.workspaceId, member.userId);
    r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json) VALUES(?,?,'manager',?)").run(r.venueId, member.userId, '{"deny":["incidents.view"]}');
    const scoped = async (venueId = r.venueId) => page.evaluate(async ({ email, token, venueId }) => { const response = await fetch("/api/business-health", { headers: { "X-Session-Email": email, "X-Session-Token": token, "X-Venue-Id": String(venueId) } }); return { status: response.status, body: await response.json() as Envelope }; }, { ...member, venueId });
    const restricted = await scoped(); assert.equal(restricted.status, 200); assert.equal(restricted.body.data.businessHealthSnapshot.operationsInputs.counters.criticalBlockers.availability, "RESTRICTED"); assert.equal(ops(restricted.body).score, null); assert.equal(JSON.stringify(restricted.body).includes("critical-private-marker"), false);
    assert.equal((await scoped(member.activeVenueId + 10000)).status, 401);
    r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, member.userId); assert.equal((await scoped()).status, 401);
    assert.deepEqual(errors, []); results.push({ width, status: "PASS", loginStorageCookie: true, basicReloads: 3, homeDoctorEqual: true, knownZero: true, missingPartialRestricted: true, criticalResolved: true, revision: true, revokedForeign: true, pageErrors: errors });
  } finally { await context.close(); await new Promise<void>(done => server.close(() => done())); r.close(); }
} } finally { await browser.close(); writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results));

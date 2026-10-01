import test from "node:test";
import assert from "node:assert/strict";
import { observeRequest, observedAwait, observedD1, withInfrastructureErrorBoundary } from "../lib/bardoctor/request-observability";
import { StoreWriteConflictError, withStoreCasRetries } from "../lib/bardoctor/store-cas";

test("early D1 failure has correlated sanitized diagnostics, structured 500 and no ordinary retry", async () => {
  const logs: string[] = [], original = console.info;
  console.info = line => logs.push(line);
  try {
    const correlation = crypto.randomUUID();
    const request = new Request("https://local.test/api/menu/ingestion?private-query-canary", { method: "POST",
      headers: { "X-BD-Correlation-Id": correlation, "x-session-token": "session-canary", cookie: "cookie-canary", authorization: "Bearer auth-canary" },
      body: 'CSV-content-canary;Без подраздела;17' });
    const cause = new Error("UNIQUE constraint failed: secret-table.secret-bind; SQL SELECT password-canary");
    const failure = new Error("D1_ERROR: UNIQUE constraint failed: secret-table.secret-bind: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE); api-key-canary", { cause });
    let attempts = 0;
    const db = { async batch() { attempts++; throw failure; } } as unknown as D1Database;
    const response = await observeRequest(request, () => withInfrastructureErrorBoundary(request, () => withStoreCasRetries(request, () =>
      observedAwait("auth.memberships", () => observedAwait("auth.ensure_owner_venue", () => observedAwait("owner.membership_batch", async () => {
        await observedD1(db).batch([]);
        assert.fail("authorization must remain fail-closed");
      }))))));
    const body = await response.json() as { ok: boolean; code: string; requestId: string };
    assert.equal(response.status, 500); assert.equal(body.ok, false); assert.equal(body.code, "INFRASTRUCTURE_ERROR");
    assert.equal(attempts, 1); assert.equal(request.bodyUsed, false);
    assert.equal(body.requestId, response.headers.get("X-BD-Request-Id"));
    assert.equal(response.headers.get("X-BD-Correlation-Id"), correlation);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const events = logs.map(line => JSON.parse(line));
    const failures = events.filter(e => e.event === "infrastructure.failure");
    assert.equal(failures.length, 1);
    const diagnostic = failures[0];
    assert.equal(diagnostic.requestId, body.requestId); assert.equal(diagnostic.correlationId, correlation);
    assert.equal(diagnostic.route, "/api/menu/ingestion"); assert.equal(diagnostic.operation, "d1.batch");
    assert.equal(diagnostic.authenticationStage, "auth.ensure_owner_venue");
    assert.equal(diagnostic.ownerReconciliationStage, "owner.membership_batch");
    assert.equal(diagnostic.attempt, 1); assert.equal(diagnostic.casAttempt, 1); assert.equal(diagnostic.casMaxAttempts, 3);
    assert.equal(diagnostic.error.name, "Error"); assert.equal(diagnostic.error.message, "UNIQUE constraint failed");
    assert.equal(diagnostic.error.cause.message, "UNIQUE constraint failed");
    assert.deepEqual(diagnostic.error.codes, ["D1_ERROR", "SQLITE_CONSTRAINT", "SQLITE_CONSTRAINT_UNIQUE"]);
    assert.ok(events.some(e => e.event === "error.boundary" && e.requestId === body.requestId));
    assert.doesNotMatch(logs.join("") + JSON.stringify(body), /canary|secret-table|secret-bind|Без подраздела|SELECT|Bearer|cookie/i);
    assert.doesNotMatch(JSON.stringify(body), /D1|SQLITE|constraint|cause|stack/i);
  } finally { console.info = original; }
});

test("unknown/hostile/cyclic errors, invalid correlation and logger failure cannot leak or replace response", async () => {
  const logs: string[] = [], original = console.info;
  console.info = line => logs.push(line);
  try {
    const cycle = { name: "credential-canary", message: "payload-canary", code: "SQLITE_SECRET_CANARY", cause: null as unknown };
    cycle.cause = cycle;
    for (const error of [cycle, "token-canary", Object.defineProperty({}, "message", { get() { throw Error("secret-canary"); } })]) {
      const request = new Request("https://local.test/api/menu/ingestion", { headers: { "X-BD-Correlation-Id": "credential-canary" } });
      const response = await withInfrastructureErrorBoundary(request, async () => { throw error; });
      assert.equal(response.status, 500); const body = await response.json() as { requestId: string };
      assert.match(body.requestId, /^[a-f0-9-]{36}$/); assert.notEqual(response.headers.get("X-BD-Correlation-Id"), "credential-canary");
    }
    assert.doesNotMatch(logs.join(""), /canary|payload|credential|token/i);
    console.info = () => { throw Error("logger unavailable"); };
    assert.equal((await withInfrastructureErrorBoundary(new Request("https://local.test/api/menu/ingestion"), async () => { throw cycle; })).status, 500);
  } finally { console.info = original; }
});

test("CAS attempt metadata keeps the existing success/retry/exhaustion contract", async () => {
  const logs: string[] = [], original = console.info;
  console.info = line => logs.push(line);
  try {
    for (const conflicts of [1, 3]) {
      let calls = 0;
      const request = new Request("https://local.test/api/menu/ingestion", { method: "POST", body: "private-payload" });
      const response = await withInfrastructureErrorBoundary(request, () => withStoreCasRetries(request, async attemptRequest => {
        assert.equal(await attemptRequest.text(), "private-payload");
        calls++;
        const db = { async batch() { if (calls <= conflicts) throw new Error("D1_ERROR: NOT NULL constraint failed: domain_data.data_json: SQLITE_CONSTRAINT"); return []; } } as unknown as D1Database;
        try { await observedD1(db).batch([]); } catch { throw new StoreWriteConflictError(); }
        return Response.json({ ok: true });
      }));
      assert.equal(calls, conflicts === 1 ? 2 : 3); assert.equal(response.status, conflicts === 1 ? 200 : 409);
      const id = response.headers.get("X-BD-Request-Id");
      assert.deepEqual(logs.map(line => JSON.parse(line)).filter(e => e.requestId === id && e.event === "infrastructure.failure").map(e => e.casAttempt), conflicts === 1 ? [1] : [1, 2, 3]);
      assert.ok(!logs.map(line => JSON.parse(line)).some(e => e.requestId === id && e.event === "error.boundary"));
    }
    assert.doesNotMatch(logs.join(""), /private-payload|domain_data/);
  } finally { console.info = original; }
});

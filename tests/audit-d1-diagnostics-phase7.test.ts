import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { openingRuntime } from "./helpers/opening-runtime";
import * as presentation from "../lib/bardoctor/audit-presentation";
import * as diagnostics from "../lib/bardoctor/audit-d1-diagnostics";

async function capture(operation: (lines: string[]) => Promise<void>) {
  const original = console.error, lines: string[] = [];
  console.error = value => { lines.push(String(value)); };
  try { await operation(lines); } finally { console.error = original; }
}

test("parallel audit failures keep separate request IDs, tags, causes and original exceptions", async () => capture(async lines => {
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const cause = Object.assign(new Error("D1_ERROR: Query exceeded memory limit: SQLITE_NOMEM"), { code: "SQLITE_NOMEM" });
  const errors = ids.map(() => new Error("D1_ERROR: query failed", { cause }));
  await Promise.all(ids.map(async (id, index) => {
    const request = new Request("https://qa.invalid/api/audit?q=private@example.invalid", { headers: {
      "X-BD-Correlation-Id": id, authorization: "Bearer private-token", cookie: "private-cookie",
    } });
    await assert.rejects(diagnostics.withAuditD1Diagnostics(request, () => diagnostics.auditD1Statement(
      index ? "audit.filters.options" : "audit.overview.activity", async () => { await Promise.resolve(); throw errors[index]; },
    )), error => error === errors[index]);
  }));
  assert.equal(lines.length, 2);
  const events = lines.map(line => JSON.parse(line));
  assert.equal(new Set(events.map(e => e.requestId)).size, 2);
  assert.equal(new Set(events.map(e => e.errorId)).size, 2);
  for (const [index, id] of ids.entries()) {
    const event = events.find(e => e.correlationId === id);
    assert.ok(event);
    assert.equal(event.queryTag, index ? "audit.filters.options" : "audit.overview.activity");
    assert.equal(event.errors[1].code, "SQLITE_NOMEM");
    assert.equal(event.errors[1].message, cause.message, "known original D1 cause remains actionable");
  }
  assert.doesNotMatch(lines.join(""), /private|Bearer|cookie|authorization|@/);
}));

test("SQL literals, arbitrary codes, personal data and injected correlation never enter logs", async () => capture(async lines => {
  const failure = Object.assign(new Error("D1_ERROR: query failed SELECT * FROM audit_log WHERE actor_name = 'Alice Secret'; params: [private@example.invalid, sk-private-token, 987654321]; https://secret.invalid/path"), {
    code: "private-api-token", cause: new Error("private-user-name unquoted-personal-value 'hidden'"),
  });
  await assert.rejects(diagnostics.withAuditD1Diagnostics(new Request("https://qa.invalid/api/audit", {
    headers: { "x-bd-correlation-id": "injected-private-token" },
  }), () => diagnostics.auditD1Statement("audit.overview.activity", async () => { throw failure; })), error => error === failure);
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /Alice|Secret|private|987654321|https|hidden|unquoted|personal|SELECT|WHERE/);
  const event = JSON.parse(lines[0]);
  assert.equal(event.correlationId, event.requestId);
  assert.equal(event.errors[0].code, null);
  assert.equal(event.errors[0].redacted, true);
}));

test("success emits nothing; logger and hostile cause failures never replace the original failure", async () => capture(async lines => {
  const expected = { results: [{ confidential: true }] };
  assert.equal(await diagnostics.auditD1Statement("audit.overview.activity", async () => expected), expected);
  assert.equal(lines.length, 0);
  const hostile = Object.defineProperty({}, "message", { get() { throw new Error("getter"); } });
  await assert.rejects(diagnostics.auditD1Statement("audit.filters.options", async () => { throw hostile; }), e => e === hostile);
  const error = new Error("D1_ERROR: database is locked");
  console.error = () => { throw new Error("logger unavailable"); };
  await assert.rejects(diagnostics.auditD1Statement("audit.overview.activity", async () => { throw error; }), e => e === error);
}));

test("cause traversal is bounded and handles cycles", async () => capture(async lines => {
  const error = new Error("D1_ERROR: internal error");
  error.cause = error;
  await assert.rejects(diagnostics.auditD1Statement("audit.overview.activity", async () => { throw error; }), e => e === error);
  assert.equal(JSON.parse(lines[0]).errors.length, 1);
}));

for (const tag of ["audit.overview.activity", "audit.filters.options"] as const) test(`actual GET tags ${tag} without query changes, retries or diagnostic response`, async () => capture(async lines => {
  const r = openingRuntime();
  const failure = new Error("D1_ERROR: no such column: audit_log.created_at: SQLITE_ERROR");
  const calls: { sql: string; values: unknown[] }[] = [];
  const prepare = (sql: string) => {
    const call = { sql, values: [] as unknown[] }; calls.push(call);
    return { bind(...values: unknown[]) { call.values = values; return this; },
      async all() {
        if (tag === "audit.overview.activity" ? sql.endsWith("LIMIT 10000") : sql.endsWith("LIMIT 5000")) throw failure;
        return { results: [] };
      }, async first() { return null; },
    };
  };
  try {
    const api = r.loadRoute(new URL("../app/api/audit/route.ts", import.meta.url), {
      ...presentation, ...diagnostics, getD1: () => ({ prepare }), POST: undefined,
    });
    await assert.rejects(api.GET(new Request("https://qa.invalid/api/audit?limit=1", { headers: { "X-Venue-Id": "3293" } })), e => e === failure);
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).queryTag, tag);
    const targeted = calls.filter(c => c.sql.endsWith(tag === "audit.overview.activity" ? "LIMIT 10000" : "LIMIT 5000"));
    assert.equal(targeted.length, 1, "no retries");
    assert.equal(targeted[0].values[0], 7, "authenticated data-account scope is unchanged");
    assert.match(targeted[0].sql, /FROM audit_log\s+WHERE account_id = \?/);
    assert.match(targeted[0].sql, /ORDER BY created_at DESC, id DESC LIMIT/);
    assert.ok(calls.every(c => /^\s*(?:SELECT|WITH)\b/.test(c.sql)), "no writes");
    assert.equal(r.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log").get()?.n, 0);
    assert.equal(r.sqlite.prepare("SELECT COUNT(*) AS n FROM domain_data").get()?.n, 0);
  } finally { r.close(); }
}));

test("query templates and CSV route keep their existing limits, scope and public response", () => {
  const source = readFileSync(new URL("../app/api/audit/route.ts", import.meta.url), "utf8");
  assert.match(source, /WHERE account_id = \? AND created_at >= \? ORDER BY created_at DESC, id DESC LIMIT 10000/);
  assert.match(source, /WHERE account_id = \? ORDER BY created_at DESC, id DESC LIMIT 5000/);
  assert.match(source, /async function allAuditRows\(accountId: number, url: URL, maximum = 50_000\)/);
  assert.doesNotMatch(source, /errorId:|errors: errorChain|SQLITE_NOMEM/);
});

test("actual CSV export keeps its independent read-only path; denied access issues no query or log", async () => capture(async lines => {
  const r = openingRuntime();
  const calls: { sql: string; values: unknown[] }[] = [];
  const prepare = (sql: string) => {
    const call = { sql, values: [] as unknown[] }; calls.push(call);
    return { bind(...values: unknown[]) { call.values = values; return this; }, async all() { return { results: [] }; } };
  };
  try {
    const api = r.loadRoute(new URL("../app/api/audit/route.ts", import.meta.url), {
      ...presentation, ...diagnostics, getD1: () => ({ prepare }), POST: undefined,
    });
    const response = await api.GET(new Request("https://qa.invalid/api/audit?format=csv&storeKey=bd_month_closings"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.match(response.headers.get("Content-Type") ?? "", /text\/csv/);
    assert.match(await response.text(), /Event ID/);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /WHERE account_id = \? AND store_key = \? ORDER BY created_at DESC, id DESC LIMIT \?/);
    assert.deepEqual(calls[0].values, [7, "bd_month_closings", 50_000]);
    assert.equal(lines.length, 0);
    r.setAllowed(false);
    assert.equal((await api.GET(new Request("https://qa.invalid/api/audit"))).status, 403);
    assert.equal(calls.length, 1);
    assert.equal(lines.length, 0);
  } finally { r.close(); }
}));

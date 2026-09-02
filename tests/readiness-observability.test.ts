import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkDatabaseReadiness } from "../lib/bardoctor/readiness";
import { requestIdFor } from "../lib/bardoctor/observability";

test("readiness requires a successful bounded database query", async () => {
  const healthy = await checkDatabaseReadiness({
    prepare: () => ({ first: async () => ({ ok: 1 }) }),
  }, 50);
  assert.equal(healthy.ok, true);

  const failed = await checkDatabaseReadiness({
    prepare: () => ({ first: async () => { throw new Error("offline"); } }),
  }, 50);
  assert.deepEqual({ ok: failed.ok, reason: !failed.ok && failed.reason }, { ok: false, reason: "query_failed" });

  const timedOut = await checkDatabaseReadiness({
    prepare: () => ({ first: () => new Promise(() => undefined) }),
  }, 5);
  assert.deepEqual({ ok: timedOut.ok, reason: !timedOut.ok && timedOut.reason }, { ok: false, reason: "timeout" });
});

test("correlation IDs accept bounded safe values and replace unsafe input", () => {
  const accepted = requestIdFor(new Request("https://bardoctor.test", { headers: { "X-Request-Id": "qa-request-1234" } }));
  assert.equal(accepted, "qa-request-1234");
  const replaced = requestIdFor(new Request("https://bardoctor.test", { headers: { "X-Request-Id": "Bearer secret value" } }));
  assert.match(replaced, /^[0-9a-f-]{36}$/);
});

test("frontend has route and root error boundaries and backend logs structured release context", async () => {
  const [routeBoundary, globalBoundary, observability, health, worker, runtimeHook] = await Promise.all([
    readFile(new URL("../app/error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/global-error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/observability.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/healthz/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/runtime-diagnostics-v406.js", import.meta.url), "utf8"),
  ]);
  assert.match(routeBoundary, /client-runtime-diagnostic/);
  assert.match(routeBoundary, /Данные не изменены/);
  assert.match(globalBoundary, /результат неизвестен/);
  assert.match(globalBoundary, /client-runtime-diagnostic/);
  assert.match(observability, /releaseSha/);
  assert.match(observability, /durationMs/);
  assert.match(health, /status: database\.ok \? 200 : 503/);
  assert.match(worker, /recordRequest/);
  assert.match(worker, /Server-Timing/);
  assert.match(worker, /withRequestId\(response, requestId\)/);
  assert.match(runtimeHook, /unhandledrejection/);
  assert.match(runtimeHook, /bd:widget-error/);
  assert.match(runtimeHook, /MAX_REPORTS = 5/);
  assert.doesNotMatch(runtimeHook, /bd_session_token|X-Session-Token|Authorization/);
});

test("global request telemetry normalizes endpoints and never emits URL queries or credentials", async () => {
  const observability = await readFile(new URL("../lib/bardoctor/observability.ts", import.meta.url), "utf8");
  assert.match(observability, /event: "request_complete"/);
  assert.match(observability, /safeEndpoint\(input\.request\)/);
  assert.match(observability, /new URL\(request\.url\)\.pathname/);
  assert.doesNotMatch(observability, /\.searchParams|authorization|cookie/i);
});

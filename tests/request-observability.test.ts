import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { observeRequest, observedAwait, observedD1, observedScope, diagnosticRoute } from "../lib/bardoctor/request-observability";

test("parallel requests preserve result/body, isolate correlation and never log sensitive inputs", async () => {
  const lines: string[] = [];
  const original = console.info;
  console.info = (line: string) => { lines.push(line); };
  try {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    await Promise.all(ids.map(async (id) => {
      const request = new Request("https://local.invalid/api/store/secret-record?email=private@example.invalid", {
        headers: { "X-BD-Correlation-Id": id, cookie: "secret-cookie", "x-session-token": "secret-token" },
      });
      const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("private finance 12345")); c.close(); } });
      const expected = new Response(body, {status:201});
      const actual = await observeRequest(request, () => observedAwait("store.load", async () => {
        observedScope(true, true); await Promise.resolve(); return expected;
      }));
      assert.equal(actual, expected);
      assert.equal(actual.bodyUsed, false);
      assert.equal(actual.headers.get("X-BD-Correlation-Id"), id);
      assert.equal(await actual.text(), "private finance 12345");
    }));
    const events = lines.map(line => JSON.parse(line));
    for (const id of ids) {
      const rows = events.filter(e => e.correlationId === id);
      assert.equal(new Set(rows.map(e => e.requestId)).size, 1);
      assert.equal(rows[0].event, "request.start");
      assert.equal(rows.at(-1).event, "request.end");
      assert.equal(rows.at(-1).venueScope, "authorized");
    }
    assert.equal(new Set(events.map(e => e.requestId)).size,2);
    assert.doesNotMatch(lines.join(""), /private|12345|secret|cookie|token/i);
  } finally { console.info = original; }
});

test("D1 instrumentation preserves native receivers, binds, batch inputs, result and error identity", async () => {
  const lines: string[] = []; const original = console.info; console.info = s => lines.push(s);
  try {
    const result = { results: [{ secret: "private-row" }] };
    const failure = new Error("SQL with secret values");
    const raw = { bind(...values: unknown[]) { assert.deepEqual(values,["private-bind"]); return this; },
      async all() { assert.equal(this,raw); return result; },
      async run() { throw failure; } };
    const db = { prepare(sql: string) { assert.equal(this,db); assert.equal(sql,"private SQL"); return raw; },
      async batch(statements: unknown[]) { assert.equal(this,db); assert.deepEqual(statements,[raw]); return [result]; } };
    assert.equal(observedD1(db as unknown as D1Database),db,"No wrapping outside an observed request");
    await observeRequest(new Request("https://local.invalid/api/auth/bootstrap"), async () => {
      const traced = observedD1(db as unknown as D1Database);
      const statement = traced.prepare("private SQL").bind("private-bind");
      assert.equal(await statement.all(),result);
      assert.deepEqual(await traced.batch([statement]),[result]);
      assert.deepEqual(await observedD1(db as unknown as D1Database).batch([statement]),[result]);
      await assert.rejects(statement.run(), e => e === failure);
      return new Response("ok");
    });
    assert.ok(lines.some(s=>s.includes('"stage":"d1.all"')));
    assert.ok(lines.some(s=>s.includes('"stage":"d1.batch"')));
    assert.ok(lines.some(s=>s.includes('"stage":"d1.run"') && s.includes('"outcome":"error"')));
    assert.doesNotMatch(lines.join(""),/private|secret|SQL/);
  } finally { console.info = original; }
});

test("abort and boundary telemetry do not swallow errors, impose deadlines or retry", async () => {
  const original = console.info; const lines: string[] = []; console.info = s => lines.push(s);
  const controller = new AbortController(); const failure = new DOMException("private", "TimeoutError");
  let calls = 0;
  try {
    await assert.rejects(observeRequest(new Request("https://local.invalid/api/auth/bootstrap", {signal:controller.signal}), async () => {
      calls++; controller.abort(failure); throw failure;
    }), e=>e === failure);
    assert.equal(calls,1);
    assert.ok(lines.some(s=>s.includes('"event":"request.abort"') && s.includes('"timeoutSource":"request_signal"')));
    assert.doesNotMatch(lines.join(""),/private/);
    console.info = () => { throw new Error("logger unavailable"); };
    assert.equal((await observeRequest(new Request("https://local.invalid/api/store"), async()=>new Response("ok"))).status,200);
    assert.equal(diagnosticRoute("/api/store/private-key"),"/api/store/:key");
    assert.equal(diagnosticRoute("/api/unknown/private"),null);
  } finally { console.info = original; }
});

test("browser wrapper preserves Request/init, signal and body without reading secrets or extra fetches", async () => {
  const source = readFileSync("public/bd-request-observability.js","utf8");
  const logs: string[] = []; const calls: {input: unknown; init: RequestInit}[] = [];
  const response = new Response("private body");
  const window = { location: {href:"https://local.invalid/home",origin:"https://local.invalid"},
    fetch: async (input: unknown,init: RequestInit) => { calls.push({input,init}); return response; } };
  runInNewContext(source,{window,URL,Headers,Request,crypto,performance,console:{info:(s:string)=>logs.push(s)}});
  const controller = new AbortController();
  const input = new Request("https://local.invalid/api/store/private?secret=PRIVATE_QUERY_CANARY", {method:"POST",body:"private-body",headers:{cookie:"private-cookie"}});
  assert.equal(await window.fetch(input,{signal:controller.signal}),response);
  assert.equal(calls.length,1); assert.equal(calls[0].input,input); assert.equal(calls[0].init.signal,controller.signal);
  assert.equal(response.bodyUsed,false); assert.equal(input.bodyUsed,false);
  assert.equal(new Headers(calls[0].init.headers).get("cookie"),"private-cookie");
  assert.ok(new Headers(calls[0].init.headers).get("X-BD-Correlation-Id"));
  assert.doesNotMatch(logs.join(""),/private|secret/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const probe = (sql: string) => sql.includes("auth-schema-readonly-p0");
const routes = { usersMe: "./app/api/users/me/route" };
const password = "Isolated-Test-Password-123!";

test("cold/warm password login and session restoration retain auth and reject invalid/expired sessions", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("p0@isolated.test");
    let probes = 0;
    r.onRead(sql => { if (probe(sql)) probes++; });
    for (let i = 0; i < 2; i++) {
      probes = 0;
      const response = await r.api.login.POST(r.request(user, "/api/auth/login", "POST", { email: user.email, password }));
      assert.equal(response.status, 200); assert.ok(response.headers.get("set-cookie"));
      assert.equal(probes, 1, "authResult retains the original login schema scope");
    }
    probes = 0;
    assert.equal((await r.api.bootstrap.POST(r.request(user, "/api/auth/bootstrap", "POST"))).status, 200);
    assert.equal(probes, 1, "authResult retains the original bootstrap schema scope");
    const me = await r.api.usersMe.GET(r.request(user, "/api/users/me"));
    assert.equal(me.status, 200); assert.equal((await me.json() as {user:{email:string}}).user.email, user.email);
    const invalid = { ...user, token: "invalid-token" };
    assert.equal((await r.api.usersMe.GET(r.request(invalid, "/api/users/me"))).status, 401);
    r.sqlite.exec("UPDATE sessions SET expires_at='2000-01-01T00:00:00Z'");
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 401);
    assert.equal((await r.api.login.POST(r.request(user, "/api/auth/login", "POST", { email: user.email, password: "wrong" }))).status, 401);
  } finally { r.close(); }
});

test("authResult keeps original request cancellation after a completed schema check", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("result-cancel@isolated.test");
    const controller = new AbortController();
    const request = new Request(r.request(user, "/api/auth/bootstrap", "POST"), { signal: controller.signal });
    let probes = 0;
    r.onRead(sql => { if (probe(sql)) probes++; });
    const account = await r.api.auth.authenticateIdentityRequest(request);
    assert.ok(account);
    controller.abort();
    await assert.rejects(r.api.auth.authResult(account, user.token, request), { name: "AbortError", code: "AUTH_SCHEMA_UNAVAILABLE" });
    assert.equal(probes, 1, "no second detached probe after cancellation");
  } finally { r.close(); }
});

test("schema rejection fails closed without writes/session deletion and next request recovers", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("failure@isolated.test");
    const before = r.sqlite.prepare("SELECT token_hash FROM sessions ORDER BY token_hash").all();
    r.onRead(sql => { if (probe(sql)) throw Error("injected dependency failure"); });
    for (const response of await Promise.all([
      r.api.login.POST(r.request(user, "/api/auth/login", "POST", { email: user.email, password })),
      r.api.bootstrap.POST(r.request(user, "/api/auth/bootstrap", "POST")),
      r.api.usersMe.GET(r.request(user, "/api/users/me")),
    ])) {
      assert.equal(response.status, 503); assert.equal(response.headers.get("set-cookie"), null);
      const body = await response.json() as {code:string;user?:unknown}; assert.equal(body.code, "AUTH_SCHEMA_UNAVAILABLE"); assert.equal(body.user, undefined);
    }
    assert.deepEqual(r.sqlite.prepare("SELECT token_hash FROM sessions ORDER BY token_hash").all(), before);
    r.onRead(null);
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 200);
  } finally { r.close(); }
});

test("hung read returns 503 within server budget, shares only within request, and late completion cannot poison retry", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("hung@isolated.test");
    let release!: () => void, count = 0;
    const hanging = new Promise<void>(resolve => { release = resolve; });
    r.onRead(sql => { if (probe(sql)) { count++; return hanging; } });
    const before = r.sqlite.prepare("SELECT count(*) n FROM sessions").get();
    const started = Date.now();
    const responses = await Promise.all([
      r.api.usersMe.GET(r.request(user, "/api/users/me")),
      r.api.bootstrap.POST(r.request(user, "/api/auth/bootstrap", "POST")),
      r.api.login.POST(r.request(user, "/api/auth/login", "POST", { email: user.email, password })),
    ]);
    for (const response of responses) assert.equal(response.status, 503);
    assert.equal(count, 3, "one probe per request, including two users/me auth consumers");
    assert.ok(Date.now() - started >= 7900); assert.ok(Date.now() - started < 11000);
    r.onRead(null);
    assert.equal((await r.api.bootstrap.POST(r.request(user, "/api/auth/bootstrap", "POST"))).status, 200, "old read remains pending during new request");
    release(); await new Promise(resolve => setImmediate(resolve));
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 200);
    assert.deepEqual(r.sqlite.prepare("SELECT count(*) n FROM sessions").get(), before);
  } finally { r.close(); }
});

test("late rejection and repeated outages do not cache a failure or retry within a request", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("late@isolated.test");
    let reject!: (error: Error) => void, entered!: () => void, count = 0;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const hanging = new Promise<void>((_, fail) => { reject = fail; });
    r.onRead(sql => { if (probe(sql)) { count++; entered(); return hanging; } });
    const controller = new AbortController();
    const request = new Request(r.request(user, "/api/users/me"), { signal: controller.signal });
    const pending = r.api.usersMe.GET(request); await started; controller.abort();
    assert.equal((await pending).status, 503);
    r.onRead(null);
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 200);
    reject(Error("late injected error")); await new Promise(resolve => setImmediate(resolve));
    r.onRead(sql => { if (probe(sql)) { count++; throw Error("still unavailable"); } });
    for (let i = 0; i < 4; i++) assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 503);
    assert.equal(count, 5);
    r.onRead(null);
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 200);
  } finally { r.close(); }
});

test("schema events correlate start/join/outcome with terminal 503 and expose no credentials", async () => {
  const r = await lifecycleRuntime({ ...routes, telemetry: "./lib/bardoctor/request-observability" });
  const original = console.info, lines: string[] = [];
  try {
    const user = await r.register("trace@isolated.test");
    r.onRead(sql => { if (probe(sql)) throw Error("private provider detail"); });
    console.info = value => { lines.push(String(value)); };
    const observe = r.api.telemetry.observeRequest as unknown as typeof import("../lib/bardoctor/request-observability").observeRequest;
    const request = r.request(user, "/api/users/me");
    const response = await observe(request, () => r.api.usersMe.GET(request));
    assert.equal(response.status, 503);
    const events = lines.map(line => JSON.parse(line));
    const lifecycle = events.filter(event => event.event === "auth.schema.lifecycle");
    assert.deepEqual(lifecycle.map(event => event.outcome), ["start", "join", "incompatible_or_unavailable"]);
    assert.equal(new Set(lifecycle.map(event => event.attemptId)).size, 1);
    assert.equal(new Set(events.map(event => event.requestId)).size, 1);
    assert.ok(events.some(event => event.event === "request.end" && event.status === 503));
    assert.ok(lifecycle.every(event => typeof event.ageMs === "number"));
    for (const secret of [user.email, user.token, password, "private provider detail"]) assert.ok(!lines.join().includes(secret));
  } finally { console.info = original; r.close(); }
});

test("parallel requests own independent probes; canceling one cannot cancel another; no schema writes", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("parallel@isolated.test");
    const ddl = r.sqlite.prepare("SELECT name,sql FROM sqlite_master ORDER BY name").all();
    let release!: () => void, entered!: () => void, count = 0;
    const enteredRead = new Promise<void>(resolve => { entered = resolve; });
    const hanging = new Promise<void>(resolve => { release = resolve; });
    r.onRead(sql => { if (probe(sql) && ++count === 1) { entered(); return hanging; } });
    const controller = new AbortController();
    const request = new Request(r.request(user, "/api/users/me"), { signal: controller.signal });
    const first = r.api.usersMe.GET(request); await enteredRead;
    controller.abort();
    const second = r.api.usersMe.GET(r.request(user, "/api/users/me"));
    assert.equal((await first).status, 503); assert.equal((await second).status, 200); assert.equal(count, 2);
    release(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(r.sqlite.prepare("SELECT name,sql FROM sqlite_master ORDER BY name").all(), ddl);
  } finally { r.close(); }
});

test("missing deployed column is 503, never repaired by auth; manual test fixture repair permits retry", async () => {
  const r = await lifecycleRuntime(routes);
  try {
    const user = await r.register("schema@isolated.test");
    r.sqlite.exec("ALTER TABLE accounts DROP COLUMN avatar_id");
    const response = await r.api.usersMe.GET(r.request(user, "/api/users/me"));
    assert.equal(response.status, 503);
    assert.equal(r.sqlite.prepare("SELECT name FROM pragma_table_info('accounts') WHERE name='avatar_id'").get(), undefined);
    r.sqlite.exec("ALTER TABLE accounts ADD COLUMN avatar_id text");
    assert.equal((await r.api.usersMe.GET(r.request(user, "/api/users/me"))).status, 200);
  } finally { r.close(); }
});

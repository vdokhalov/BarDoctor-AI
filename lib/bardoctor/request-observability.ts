import { AsyncLocalStorage } from "node:async_hooks";

// Deliberately no payload, URL, SQL, error text, identity ID or credential fields.
type Stage = "worker.dispatch" | "auth.schema" | "auth.identity" | "auth.result" |
  "auth.memberships" | "auth.legacy_import" | "auth.issue_session" |
  "store.load" | "selector.load" | "d1.all" | "d1.first" | "d1.raw" | "d1.run" | "d1.batch" | "d1.exec";
type Context = { requestId: string; correlationId: string; route: string; started: number;
  scope: { user: "unresolved" | "authenticated" | "anonymous"; venue: "unresolved" | "authorized" };
  span?: number; nextSpan: { value: number; events: number } };
const contexts = new AsyncLocalStorage<Context>();
const originalStatements = new WeakMap<object, D1PreparedStatement>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function diagnosticRoute(path: string): string | null {
  if (path === "/api/auth/bootstrap") return "/api/auth/bootstrap";
  if (path.startsWith("/api/auth/")) return "/api/auth/:action";
  if (path === "/api/store" || path.startsWith("/api/store/")) return "/api/store/:key";
  if (path === "/api/tech-cards/nomenclature") return path;
  if (path === "/api/users/me") return path;
  return null;
}

function failureKind(error: unknown): "abort" | "timeout" | "error" {
  try {
    if (error instanceof Error && error.name === "AbortError") return "abort";
    if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  } catch { /* hostile error objects never affect the request */ }
  return "error";
}

function emit(event: string, fields: { stage?: Stage; span?: number; parentSpan?: number;
  durationMs?: number; status?: number; outcome?: string; timeoutSource?: string } = {}) {
  const c = contexts.getStore();
  if (!c) return;
  try {
    // Bound per-request log volume; retain terminal lifecycle events.
    if (++c.nextSpan.events > 256 && event !== "request.end" && event !== "request.abort") return;
    console.info(JSON.stringify({ telemetry: "bd-runtime-observability-v1", event,
      requestId: c.requestId, correlationId: c.correlationId, route: c.route,
      timestamp: new Date().toISOString(), elapsedMs: Math.round(performance.now() - c.started),
      userScope: c.scope.user, venueScope: c.scope.venue, ...fields }));
  } catch { /* logging is never an application dependency */ }
}

export function observedScope(authenticated: boolean, authorizedVenue = false): void {
  const c = contexts.getStore();
  if (c) {
    c.scope.user = authenticated ? "authenticated" : "anonymous";
    if (authorizedVenue) c.scope.venue = "authorized";
    emit("scope.resolved");
  }
}

export function observedBoundary(): void { emit("error.boundary", { outcome: "controlled_response" }); }

export async function observedAwait<T>(stage: Stage, operation: () => T | PromiseLike<T>): Promise<T> {
  const c = contexts.getStore();
  if (!c) return await operation();
  const span = ++c.nextSpan.value;
  const started = performance.now();
  emit("await.start", { stage, span, parentSpan: c.span });
  try {
    const result = await contexts.run({ ...c, span }, operation);
    emit("await.end", { stage, span, durationMs: Math.round(performance.now() - started), outcome: "ok" });
    return result;
  } catch (error) {
    const outcome = failureKind(error);
    emit("await.end", { stage, span, durationMs: Math.round(performance.now() - started), outcome,
      timeoutSource: outcome === "timeout" ? "dependency_timeout_unspecified" : "not_observed" });
    throw error;
  }
}

export async function observeRequest(request: Request, operation: () => Promise<Response>): Promise<Response> {
  const route = diagnosticRoute(new URL(request.url).pathname);
  if (!route) return operation();
  const incoming = request.headers.get("x-bd-correlation-id") ?? "";
  const c: Context = { requestId: crypto.randomUUID(), correlationId: uuid.test(incoming) ? incoming : crypto.randomUUID(),
    route, started: performance.now(), scope: { user: "unresolved", venue: "unresolved" }, nextSpan: { value: 0, events: 0 } };
  return contexts.run(c, async () => {
    emit("request.start");
    const onAbort = () => contexts.run(c, () => emit("request.abort", {
      outcome: failureKind(request.signal.reason),
      timeoutSource: failureKind(request.signal.reason) === "timeout" ? "request_signal" : "unknown_peer_or_runtime",
    }));
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) onAbort();
    try {
      const response = await observedAwait("worker.dispatch", operation);
      // Headers only; do not clone, read, tee, or buffer a response body.
      try { response.headers.set("X-BD-Request-Id", c.requestId); response.headers.set("X-BD-Correlation-Id", c.correlationId); } catch { /* immutable response */ }
      emit("request.end", { status: response.status, outcome: "headers_ready" });
      return response;
    } catch (error) {
      emit("request.end", { outcome: failureKind(error), timeoutSource: "unspecified" });
      throw error;
    } finally { request.signal.removeEventListener("abort", onAbort); }
  });
}

// Keep native D1 objects as receivers, and unwrap statements passed to batch.
// Neither SQL text/bindings nor query results enter telemetry.
export function observedD1(database: D1Database): D1Database {
  if (!contexts.getStore()) return database;
  const statement = (value: D1PreparedStatement): D1PreparedStatement => {
    const proxy = new Proxy(value, { get(target, property) {
      if (property === "bind") return (...args: unknown[]) => statement(target.bind(...args));
      const member = Reflect.get(target, property, target);
      if (["all", "first", "raw", "run"].includes(String(property)) && typeof member === "function") {
        return (...args: unknown[]) => observedAwait(`d1.${String(property)}` as Stage, () => Reflect.apply(member, target, args));
      }
      return typeof member === "function" ? member.bind(target) : member;
    } });
    originalStatements.set(proxy, value);
    return proxy;
  };
  return new Proxy(database, { get(target, property) {
    if (property === "prepare") return (sql: string) => statement(target.prepare(sql));
    if (property === "batch") return (values: D1PreparedStatement[]) => observedAwait("d1.batch", () => target.batch(values.map(v => originalStatements.get(v) ?? v)));
    if (property === "exec") return (sql: string) => observedAwait("d1.exec", () => target.exec(sql));
    const member = Reflect.get(target, property, target);
    return typeof member === "function" ? member.bind(target) : member;
  } });
}

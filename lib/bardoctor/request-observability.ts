import { AsyncLocalStorage } from "node:async_hooks";

// No payload, raw URL/SQL/error text, identity IDs or credentials. Exception
// diagnostics use a closed vocabulary: unknown text is never copied to logs.
type Stage = "worker.dispatch" | "auth.schema" | "auth.identity" | "auth.result" |
  "auth.memberships" | "auth.legacy_import" | "auth.issue_session" |
  "auth.ensure_owner_venue" | "owner.reconcile" | "owner.membership_batch" |
  "store.load" | "selector.load" | "d1.all" | "d1.first" | "d1.raw" | "d1.run" | "d1.batch" | "d1.exec";
type Context = { requestId: string; correlationId: string; route: string; started: number;
  scope: { user: "unresolved" | "authenticated" | "anonymous"; venue: "unresolved" | "authorized" };
  span?: number; nextSpan: { value: number; events: number };
  authStage?: Stage; ownerStage?: Stage; casAttempt?: number; casMaxAttempts?: number;
  failures: WeakSet<object> };
const contexts = new AsyncLocalStorage<Context>();
const originalStatements = new WeakMap<object, D1PreparedStatement>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function diagnosticRoute(path: string): string | null {
  if (path === "/api/menu/ingestion" || path === "/api/assortment/overview") return path;
  if (path === "/api/auth/bootstrap") return "/api/auth/bootstrap";
  if (path.startsWith("/api/auth/")) return "/api/auth/:action";
  if (path === "/api/store" || path.startsWith("/api/store/")) return "/api/store/:key";
  if (path === "/api/tech-cards/nomenclature") return path;
  if (path === "/api/users/me") return path;
  return null;
}

const errorNames = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "AbortError", "TimeoutError", "D1Error"]);
const databaseCodes = new Set([
  "D1_ERROR", "D1_EXEC_ERROR", "D1_TYPE_ERROR", "D1_COLUMN_NOTFOUND", "D1_SESSION_ERROR",
  ...["ERROR", "INTERNAL", "PERM", "ABORT", "BUSY", "LOCKED", "NOMEM", "READONLY", "INTERRUPT", "IOERR",
    "CORRUPT", "NOTFOUND", "FULL", "CANTOPEN", "PROTOCOL", "EMPTY", "SCHEMA", "TOOBIG", "CONSTRAINT",
    "MISMATCH", "MISUSE", "NOLFS", "AUTH", "FORMAT", "RANGE", "NOTADB", "NOTICE", "WARNING",
    "CONSTRAINT_CHECK", "CONSTRAINT_FOREIGNKEY", "CONSTRAINT_NOTNULL", "CONSTRAINT_PRIMARYKEY",
    "CONSTRAINT_TRIGGER", "CONSTRAINT_UNIQUE", "CONSTRAINT_ROWID", "BUSY_RECOVERY", "BUSY_SNAPSHOT",
    "LOCKED_SHAREDCACHE", "IOERR_READ", "IOERR_WRITE", "IOERR_FSYNC"].map(code => `SQLITE_${code}`),
]);
const diagnosticMessages = [
  "FOREIGN KEY constraint failed", "UNIQUE constraint failed", "NOT NULL constraint failed",
  "CHECK constraint failed", "database is locked", "database table is locked", "database is busy",
  "database is full", "database or disk is full", "database disk image is malformed",
  "no such table", "no such column", "syntax error", "too many SQL variables",
  "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint",
  "Network connection lost", "network connection lost", "D1 DB is overloaded", "D1 database is overloaded",
  "query timed out", "Query timed out", "execution timed out", "internal error",
];
type SafeError = { name: string; message: string; codes: string[]; cause?: SafeError };

function safeError(error: unknown, seen = new Set<unknown>(), depth = 0): SafeError {
  const fallback: SafeError = { name: "unknown", message: "[redacted]", codes: [] };
  if (!error || (typeof error !== "object" && typeof error !== "string") || seen.has(error)) return fallback;
  seen.add(error);
  // Property access can throw (including Error.cause). Never call toString or
  // enumerate an arbitrary exception, and bound both input and cause traversal.
  const field = (key: string): unknown => { try { return Reflect.get(error as object, key); } catch { return undefined; } };
  const name = field("name"), raw = typeof error === "string" ? error : field("message");
  const message = typeof raw === "string" ? raw.slice(0, 8192) : "";
  const code = field("code");
  const candidates: string[] = [...(message.match(/\b(?:D1_[A-Z_]+|SQLITE_[A-Z_]+)\b/g) ?? []),
    ...(typeof code === "string" ? [code] : [])];
  const codes = [...new Set(candidates.filter(value => databaseCodes.has(value)))];
  const labels = diagnosticMessages.filter(value => message.includes(value));
  // Constraint targets are intentionally omitted: D1 may include SQL values,
  // dynamic identifiers or trigger messages in these positions.
  const result: SafeError = { name: typeof name === "string" && errorNames.has(name) ? name : "unknown",
    message: labels.length ? labels.join("; ") : "[redacted]", codes };
  const cause = field("cause");
  if (cause && depth < 2) result.cause = safeError(cause, seen, depth + 1);
  return result;
}

function observedFailure(error: unknown, operation: Stage | "api.boundary"): void {
  const c = contexts.getStore();
  if (!c) return;
  try {
    if (typeof error === "object" && error !== null) {
      if (c.failures.has(error)) return;
      c.failures.add(error);
    }
    emit("infrastructure.failure", { operation, authenticationStage: c.authStage,
      ownerReconciliationStage: c.ownerStage, attempt: c.casAttempt ?? 1,
      casAttempt: c.casAttempt, casMaxAttempts: c.casMaxAttempts, error: safeError(error) });
  } catch { /* diagnostics must not replace the original failure */ }
}

/** Metadata only; preserves the existing CAS loop, error identity and policy. */
export function observedCasAttempt<T>(attempt: number, maxAttempts: number, operation: () => Promise<T>): Promise<T> {
  const c = contexts.getStore();
  return c ? contexts.run({ ...c, casAttempt: attempt, casMaxAttempts: maxAttempts }, operation) : operation();
}

/** Must wrap the route handler inside the framework boundary, including auth. */
export function withInfrastructureErrorBoundary(request: Request, operation: () => Promise<Response>): Promise<Response> {
  const execute = async () => {
    try { return await operation(); } catch (error) {
      observedFailure(error, "api.boundary");
      emit("error.boundary", { outcome: "infrastructure_failure", status: 500 });
      return Response.json({ ok: false, code: "INFRASTRUCTURE_ERROR",
        error: "Не удалось выполнить операцию. Изменения не подтверждены.",
        requestId: contexts.getStore()?.requestId }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
  };
  return contexts.getStore() ? execute() : observeRequest(request, execute);
}

function failureKind(error: unknown): "abort" | "timeout" | "error" {
  try {
    if (error instanceof Error && error.name === "AbortError") return "abort";
    if (error instanceof Error && error.name === "TimeoutError") return "timeout";
  } catch { /* hostile error objects never affect the request */ }
  return "error";
}

function emit(event: string, fields: { stage?: Stage; span?: number; parentSpan?: number;
  durationMs?: number; status?: number; outcome?: string; timeoutSource?: string;
  operation?: Stage | "api.boundary"; authenticationStage?: Stage; ownerReconciliationStage?: Stage;
  attempt?: number; casAttempt?: number; casMaxAttempts?: number; error?: SafeError } = {}) {
  const c = contexts.getStore();
  if (!c) return;
  try {
    // Bound per-request log volume; retain terminal lifecycle events.
    if (++c.nextSpan.events > 256 && !["request.end", "request.abort", "infrastructure.failure", "error.boundary"].includes(event)) return;
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
  const scoped = { ...c, span,
    ...(stage.startsWith("auth.") ? { authStage: stage } : {}),
    ...(stage.startsWith("owner.") ? { ownerStage: stage } : {}),
  };
  try {
    const result = await contexts.run(scoped, operation);
    emit("await.end", { stage, span, durationMs: Math.round(performance.now() - started), outcome: "ok" });
    return result;
  } catch (error) {
    if (/^(d1|auth|owner)\./.test(stage)) contexts.run(scoped, () => observedFailure(error, stage));
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
    route, started: performance.now(), scope: { user: "unresolved", venue: "unresolved" }, nextSpan: { value: 0, events: 0 }, failures: new WeakSet() };
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

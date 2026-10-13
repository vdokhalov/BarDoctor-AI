import { getD1 } from "../../db";
import { AuthSchemaUnavailable } from "./auth-schema-error";
import { observedAuthSchema, observedAwait } from "./request-observability";

// One read-only probe per Request, never a cross-invocation I/O promise.
// A failed Request cannot retry internally; a new Request owns a fresh attempt.
// Weak keys do not retain finished requests or an isolate-wide pending queue.
const requests = new WeakMap<Request, { promise: Promise<void>; id: string; started: number }>();
export const AUTH_SCHEMA_WAIT_MS = 8_000;

// WHERE 0 validates every column selected by identity/session auth without
// retrieving credentials or modifying schema. Deployment migrations own DDL.
export const AUTH_SCHEMA_PROBE_SQL = `SELECT
 a.id, a.chatgpt_email, a.app_email, a.password_hash, a.password_salt,
 a.password_iterations, a.first_name, a.last_name, a.phone, a.avatar_id,
 a.account_kind, a.role, a.owns_venue, a.restaurant_json, a.competitors_json,
 a.review_sources_json, a.migration_status, a.migration_summary_json,
 a.imported_at, a.created_at, a.updated_at,
 s.token_hash, s.account_id, s.active_venue_id, s.expires_at, s.created_at
 FROM accounts a LEFT JOIN sessions s ON 0 WHERE 0 /* auth-schema-readonly-p0 */`;

async function probe(request: Request | undefined, id: string, started: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  let abort = () => {};
  const event = (outcome: "start" | "ready" | "timeout" | "aborted" | "incompatible_or_unavailable" | "late_ready" | "late_error") =>
    observedAuthSchema({ attemptId: id, ageMs: Date.now() - started, outcome });
  event("start");
  try {
    if (request?.signal.aborted) throw new AuthSchemaUnavailable("aborted");
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AuthSchemaUnavailable("timeout")), AUTH_SCHEMA_WAIT_MS);
      abort = () => reject(new AuthSchemaUnavailable("aborted"));
      request?.signal.addEventListener("abort", abort, { once: true });
    });
    // A timeout does NOT cancel D1. The remaining operation is only this read,
    // has no continuation that writes/authenticates, and is not kept alive by
    // waitUntil. Its late completion cannot change any other request's state.
    const operation = Promise.resolve().then(() => {
      if (request?.signal.aborted) throw new AuthSchemaUnavailable("aborted");
      return getD1().prepare(AUTH_SCHEMA_PROBE_SQL).all();
    }).then(result => {
      if (!result.success) throw new Error("Schema probe unsuccessful");
      if (finished) event("late_ready");
    }, error => { if (finished) event("late_error"); throw error; });
    await Promise.race([operation, deadline]);
    event("ready");
  } catch (error) {
    const failure = error instanceof AuthSchemaUnavailable ? error : new AuthSchemaUnavailable("incompatible_or_unavailable");
    event(failure.reason);
    throw failure;
  } finally {
    finished = true;
    clearTimeout(timer);
    request?.signal.removeEventListener("abort", abort);
  }
}

export function ensureAuthSchema(request?: Request): Promise<void> {
  return observedAwait("auth.schema", () => {
    const previous = request ? requests.get(request) : undefined;
    if (previous) {
      observedAuthSchema({ attemptId: previous.id, ageMs: Date.now() - previous.started, outcome: "join" });
      return previous.promise;
    }
    const id = crypto.randomUUID(), started = Date.now();
    const promise = probe(request, id, started);
    if (request) requests.set(request, { promise, id, started });
    return promise;
  });
}

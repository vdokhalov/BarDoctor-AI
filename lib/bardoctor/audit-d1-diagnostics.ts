import { AsyncLocalStorage } from "node:async_hooks";

const requests = new AsyncLocalStorage<{ requestId: string; correlationId: string }>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const queryLocations = {
  "audit.overview.activity": "app/api/audit/route.ts:overview.activity",
  "audit.filters.options": "app/api/audit/route.ts:filterOptions",
} as const;
type QueryTag = keyof typeof queryLocations;

// D1 error messages may echo SQL, bindings or record values. Preserve diagnostic
// vocabulary and static schema identifiers only, never arbitrary error text.
const safeWords = new Set((
  "a an the is was be been are of to in on at for from by with without and or not null " +
  "d1 error sqlite errorcode code cause query sql statement database table column index " +
  "no such near syntax constraint failed failure prepare prepared execute execution " +
  "internal unknown invalid unsupported type datatype mismatch integer text blob real " +
  "memory out exhausted allocation allocate exceeded exceeds maximum max minimum min " +
  "limit limits size too large big many much rows row read write written returned " +
  "result results response request exceeded timeout timed time busy locked lock aborted " +
  "interrupted overload overloaded unavailable temporarily retry try again later " +
  "connection network reset closed disconnected io disk full overflow range bind binding " +
  "bindings parameter parameters variable variables count number bytes byte length " +
  "string number boolean object undefined buffer json parse parsing malformed corrupt " +
  "corruption cannot could unable open found supported exceeded duration milliseconds " +
  "seconds ms cpu resource resources quota allowed permitted unauthorized access denied " +
  "api requests subrequest subrequests worker invocation invocations per single total " +
  "returned returning reading writing processing readquota writequota serialization " +
  "deserialize deserialization network bytes rows count exceeded maximum redacted " +
  "unique foreign key check readonly read-only read_only misuse protocol notfound " +
  "audit_log id account_id store_key action entity_id entity_label month_key before_json " +
  "after_json changed_fields_json actor_name actor_role reason created_at"
).split(/\s+/));

function safeMessage(value: unknown) {
  if (typeof value !== "string") return { message: "[unavailable]", redacted: true };
  const bounded = value.slice(0, 2048);
  const clean = bounded
    .replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[\w-]+/gi, "[redacted]")
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*?\1/g, "[redacted]")
    .replace(/[^\s:.,;()[\]_-]+(?:[_-][^\s:.,;()[\]_-]+)*/g, word => {
      if (safeWords.has(word.toLowerCase()) || /^(?:D1|SQLITE)_[A-Z_]+$/.test(word)) return word;
      return "[redacted]";
    });
  return { message: clean, redacted: clean !== value };
}

function errorChain(error: unknown) {
  const seen = new Set<unknown>();
  const chain = [];
  for (let current = error; current != null && chain.length < 4 && !seen.has(current);) {
    seen.add(current);
    const item = typeof current === "object" ? current as { code?: unknown; message?: unknown; cause?: unknown } : null;
    const code = typeof item?.code === "string" && /^(?:D1|SQLITE)_[A-Z_]+$/.test(item.code)
      ? item.code : typeof item?.code === "number" && Number.isInteger(item.code) && item.code >= 0 && item.code <= 255 ? item.code : null;
    chain.push({ code, ...safeMessage(item ? item.message : current) });
    current = item?.cause;
  }
  return chain;
}

export function withAuditD1Diagnostics<T>(request: Request, operation: () => Promise<T>): Promise<T> {
  const requestId = crypto.randomUUID();
  const incoming = request.headers.get("x-bd-correlation-id") ?? "";
  return requests.run({ requestId, correlationId: uuid.test(incoming) ? incoming : requestId }, operation);
}

/** Observe one existing statement: no retries, timeout, SQL/binding/result change. */
export async function auditD1Statement<T>(queryTag: QueryTag, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    try {
      const context = requests.getStore();
      console.error(JSON.stringify({ telemetry: "bd-audit-d1-error-v1", endpoint: "/api/audit",
        queryTag, location: queryLocations[queryTag], errorId: crypto.randomUUID(),
        requestId: context?.requestId ?? null, correlationId: context?.correlationId ?? null,
        errors: errorChain(error),
      }));
    } catch { /* Diagnostics cannot replace the original exception, even if logging fails. */ }
    throw error;
  }
}

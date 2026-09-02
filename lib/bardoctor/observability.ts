import { BARDOCTOR_SOURCE_COMMIT } from "./source-commit";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,80}$/;

export function requestIdFor(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim() ?? "";
  return REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

export function withRequestId(response: Response, requestId: string): Response {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

function safeErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error ?? "unknown");
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240);
}

function safeEndpoint(request: Request): string {
  let pathname = "/invalid";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // Keep a fixed non-sensitive fallback.
  }
  return pathname.split("/").map((part) => (
    /^\d+$/.test(part) || /^[0-9a-f-]{20,}$/i.test(part) || /^[A-Za-z0-9_-]{32,}$/.test(part)
      ? ":id"
      : part.slice(0, 80)
  )).join("/").slice(0, 240);
}

export function recordRequest(input: {
  request: Request;
  requestId: string;
  status: number;
  startedAt: number;
  category?: string;
  venueId?: number | null;
  accountId?: number | null;
}): void {
  console.info(JSON.stringify({
    level: input.status >= 500 ? "error" : input.status >= 400 ? "warn" : "info",
    event: "request_complete",
    requestId: input.requestId,
    releaseSha: BARDOCTOR_SOURCE_COMMIT,
    method: /^[A-Z]{3,10}$/.test(input.request.method) ? input.request.method : "UNKNOWN",
    endpoint: safeEndpoint(input.request),
    category: input.category ?? "http",
    status: Math.max(100, Math.min(599, Math.trunc(input.status))),
    durationMs: Math.max(0, Math.round(performance.now() - input.startedAt)),
    venueId: input.venueId ?? null,
    accountId: input.accountId ?? null,
  }));
}

export function recordException(input: {
  requestId: string;
  endpoint: string;
  category: string;
  error: unknown;
  startedAt?: number;
  venueId?: number | null;
  accountId?: number | null;
}): void {
  console.error(JSON.stringify({
    level: "error",
    event: "request_exception",
    requestId: input.requestId,
    releaseSha: BARDOCTOR_SOURCE_COMMIT,
    endpoint: input.endpoint,
    category: input.category,
    durationMs: input.startedAt == null ? null : Math.max(0, Math.round(performance.now() - input.startedAt)),
    venueId: input.venueId ?? null,
    accountId: input.accountId ?? null,
    message: safeErrorMessage(input.error),
  }));
}

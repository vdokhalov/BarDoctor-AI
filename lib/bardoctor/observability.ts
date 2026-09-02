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


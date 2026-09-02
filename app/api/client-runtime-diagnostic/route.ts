import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { recordException, requestIdFor, withRequestId } from "../../../lib/bardoctor/observability";
import { readJsonRequest } from "../../../lib/bardoctor/http";

const MAX_TEXT_LENGTH = 180;

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s)]+/g, "[url]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, MAX_TEXT_LENGTH);
}

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1_000_000, Math.trunc(parsed))) : 0;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdFor(request);
  const startedAt = performance.now();
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();

  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 4 * 1024 });
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)
    ? parsed.data
    : {};

  const diagnostic = {
    version: safeText(payload.version),
    kind: safeText(payload.kind),
    message: safeText(payload.message),
    source: safeText(payload.source),
    line: safeNumber(payload.line),
    column: safeNumber(payload.column),
    path: payload.path === "/" || payload.path === "/home" ? payload.path : "other",
    venueId: account.venueId,
  };

  recordException({
    requestId,
    endpoint: "/api/client-runtime-diagnostic",
    category: `frontend_${diagnostic.kind || "runtime"}`,
    error: new Error(diagnostic.message || "Client runtime error"),
    startedAt,
    venueId: account.venueId,
    accountId: account.id,
  });
  return withRequestId(new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  }), requestId);
}

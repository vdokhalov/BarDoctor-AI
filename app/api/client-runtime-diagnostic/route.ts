import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";

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
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();

  let payload: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    return Response.json({ ok: false, error: "Invalid diagnostic payload" }, { status: 400 });
  }

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

  console.error(`[BarDoctor client runtime] ${JSON.stringify(diagnostic)}`);
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

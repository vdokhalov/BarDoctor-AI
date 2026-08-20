import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import { applyReviewAnalysis } from "../../../../lib/bardoctor/review-layer";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "reviews.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав для анализа отзывов" },
      { status: 403 },
    ));
  }
  const parsed = await readJsonRequest<{ updates?: unknown }>(request, { maxBytes: 256 * 1024 });
  if (!parsed.ok) return noStore(parsed.response);
  if (!Array.isArray(parsed.data.updates)) {
    return noStore(Response.json({ ok: false, error: "updates обязателен" }, { status: 400 }));
  }
  return noStore(Response.json({
    ok: true,
    ...(await applyReviewAnalysis(account, parsed.data.updates)),
  }));
}

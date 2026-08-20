import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { loadReviewLayer } from "../../../lib/bardoctor/review-layer";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "reviews.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Отзывы вам недоступны" },
      { status: 403 },
    ));
  }
  return noStore(Response.json({ ok: true, data: await loadReviewLayer(account) }));
}

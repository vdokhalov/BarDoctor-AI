import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { readJsonRequest } from "../../../../lib/bardoctor/http";
import {
  logReviewLayerEvent,
  upsertAccountReviews,
} from "../../../../lib/bardoctor/review-layer";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "reviews.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Добавлять отзывы может владелец или управляющий" },
      { status: 403 },
    ));
  }
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 64 * 1024 });
  if (!parsed.ok) return noStore(parsed.response);
  const result = await upsertAccountReviews(
    account,
    [parsed.data],
    "manual",
    "Отзыв добавлен вручную",
    typeof parsed.data.source === "string" ? parsed.data.source : "other",
  );
  if (result.invalid) {
    return noStore(Response.json({ ok: false, error: "Укажите текст отзыва" }, { status: 400 }));
  }
  await logReviewLayerEvent(
    account.id,
    typeof parsed.data.source === "string" ? parsed.data.source : "other",
    result.created ? "manual_created" : "manual_duplicate",
    result.created ? "Отзыв добавлен вручную." : "Повторный отзыв пропущен.",
  );
  return noStore(Response.json({ ok: true, result }, { status: result.created ? 201 : 200 }));
}

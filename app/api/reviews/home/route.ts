import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { loadHomeReviewSnapshot } from "../../../../lib/bardoctor/review-sources";

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "reviews.view")) {
    return Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Отзывы вам недоступны" },
      { status: 403 },
    );
  }

  try {
    const data = await loadHomeReviewSnapshot(account);
    return Response.json({
      success: true,
      data: {
        ...data,
        canManage: hasPermission(account, "reviews.manage"),
      },
    });
  } catch {
    return Response.json(
      { success: false, error: "Не удалось загрузить данные об отзывах." },
      { status: 500 },
    );
  }
}

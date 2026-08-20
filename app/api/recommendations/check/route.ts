import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  evaluateRecommendationOutcome,
} from "../../../../lib/bardoctor/recommendation-outcomes";
import { loadVenueAIContext } from "../../../../lib/bardoctor/venue-ai-context";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "tasks.view")) {
    return Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Недостаточно прав для проверки рекомендаций" },
      { status: 403 },
    );
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 120_000) {
    return Response.json({ success: false, error: "Слишком большой запрос" }, { status: 413 });
  }

  let body: JsonRecord | null = null;
  try {
    body = record(JSON.parse(raw) as unknown);
  } catch {
    body = null;
  }
  const recommendations = Array.isArray(body?.recommendations)
    ? body.recommendations.filter((item) => record(item)).slice(0, 20)
    : [];
  if (!recommendations.length) {
    return Response.json({ success: false, error: "Нет рекомендаций для проверки" }, { status: 400 });
  }

  const context = await loadVenueAIContext(account, "diagnosis");
  const now = new Date();
  const outcomes = recommendations.map((item) => evaluateRecommendationOutcome(item, context, now));

  return Response.json({
    success: true,
    checkedAt: now.toISOString(),
    contextVersion: context.version,
    outcomes,
  });
}

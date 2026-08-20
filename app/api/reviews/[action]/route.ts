import { handleReviewAI } from "../../../../lib/bardoctor/ai-handlers";

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { action } = await context.params;
  return handleReviewAI(request, action);
}

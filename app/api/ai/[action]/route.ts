import { handleDiagnosis } from "../../../../lib/bardoctor/ai-handlers";

type RouteContext = { params: Promise<{ action: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { action } = await context.params;
  if (action !== "diagnosis") {
    return Response.json({ success: false, error: "Неизвестная AI-функция" }, { status: 404 });
  }
  return handleDiagnosis(request);
}

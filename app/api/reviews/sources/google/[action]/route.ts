import {
  handleGoogleSourceGet,
  handleGoogleSourcePost,
} from "../../../../../../lib/bardoctor/review-sources";

type RouteContext = { params: Promise<{ action: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { action } = await context.params;
  return handleGoogleSourceGet(request, action);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { action } = await context.params;
  return handleGoogleSourcePost(request, action);
}

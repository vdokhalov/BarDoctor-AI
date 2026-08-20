import { reviewSourcesStatus } from "../../../../lib/bardoctor/review-sources";

export async function GET(request: Request): Promise<Response> {
  return reviewSourcesStatus(request);
}

import { resolveEvidenceRequest } from "../../../../lib/bardoctor/evidence-resolver";
import { withInfrastructureErrorBoundary } from "../../../../lib/bardoctor/request-observability";

export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const response = await withInfrastructureErrorBoundary(request, () => resolveEvidenceRequest(request));
  // Include failures from authentication/infrastructure in private/no-store semantics.
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie, X-Session-Token, X-Session-Email, X-Venue-Id");
  return response;
}

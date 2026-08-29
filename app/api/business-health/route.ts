import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { buildBusinessHealthSnapshot } from "../../../lib/bardoctor/business-health-snapshot";
import { buildBusinessIntelligenceFromVenueContext } from "../../../lib/bardoctor/business-intelligence";
import { loadVenueAIContext } from "../../../lib/bardoctor/venue-ai-context";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "analysis.run")) {
    return noStore(Response.json(
      { success: false, code: "ACCESS_DENIED", error: "Недостаточно прав для Business Health" },
      { status: 403 },
    ));
  }

  const context = await loadVenueAIContext(account, "diagnosis");
  const intelligence = buildBusinessIntelligenceFromVenueContext({
    venueId: account.venueId,
    context,
  });
  const snapshot = buildBusinessHealthSnapshot({
    venueId: account.venueId,
    dataAccountId: account.id,
    intelligence,
    context,
  });

  return noStore(Response.json({
    success: true,
    generatedAt: snapshot.generatedAt,
    context: {
      venueId: account.venueId,
      dataAccountId: account.id,
      version: context.version,
      sourceUpdatedAt: snapshot.dataFreshness.latestUpdatedAt,
    },
    data: {
      contextVersion: context.version,
      intelligence,
      businessHealth: intelligence.businessHealth,
      businessHealthSnapshot: snapshot,
    },
  }));
}

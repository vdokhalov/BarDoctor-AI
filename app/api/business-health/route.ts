import { canReadDiagnosisSources, restrictedVenueContext } from "../../../lib/bardoctor/venue-context-access";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { loadCanonicalHealthInputs } from "../../../lib/bardoctor/canonical-health-inputs";


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

  if (!canReadDiagnosisSources(account)) return restrictedVenueContext();

  const canonical = await loadCanonicalHealthInputs(account);
  if (!canonical) return noStore(unauthorized());
  if (canonical.restricted) return restrictedVenueContext();
  const { context, intelligence, snapshot } = canonical;

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

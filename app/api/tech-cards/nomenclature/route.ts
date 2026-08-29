import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { domainData } from "../../../../db/schema";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { queryCanonicalNomenclature } from "../../../../lib/bardoctor/nomenclature-selector";

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Номенклатура недоступна" }, { status: 403 });
  }
  const [row] = await getDb().select().from(domainData).where(and(
    eq(domainData.accountId, account.id),
    eq(domainData.storeKey, ASSORTMENT_STORE_KEY),
  )).limit(1);
  const url = new URL(request.url);
  const page = queryCanonicalNomenclature({
    assortment: row ? JSON.parse(row.dataJson) : {},
    venueId: account.venueId,
    query: url.searchParams.get("q"),
    cursor: url.searchParams.get("cursor"),
    limit: url.searchParams.get("limit"),
    includeArchived: url.searchParams.get("includeArchived") === "1",
  });
  return Response.json({ ok: true, venueId: account.venueId, ...page }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

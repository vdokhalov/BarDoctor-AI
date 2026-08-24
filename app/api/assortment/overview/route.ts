import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import {
  buildAssortmentAnalytics,
} from "../../../../lib/bardoctor/assortment-analytics";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { reconcileTechCards } from "../../../../lib/bardoctor/tech-card-reconciliation";

const STORE_KEYS = [
  "bd_assortment_v1",
  "bd_purchase_documents",
  "bd_sales_documents",
  "bd_finance_revenue",
] as const;

type StoreRow = { store_key: string; data_json: string };

function parsed(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function values(value: string | undefined): unknown[] {
  const result = parsed(value, []);
  return Array.isArray(result) ? result : [];
}

function noStore(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(await unauthorized().json(), 401);
  if (!hasPermission(account, "inventory.view")) {
    return noStore(
      { ok: false, code: "ACCESS_DENIED", error: "Ассортимент недоступен" },
      403,
    );
  }

  const url = new URL(request.url);
  const requestedPeriod = url.searchParams.get("period") ?? "";
  const period = /^\d{4}-\d{2}$/.test(requestedPeriod) ? requestedPeriod : undefined;
  const placeholders = STORE_KEYS.map(() => "?").join(", ");
  const result = await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(account.id, ...STORE_KEYS).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const reconciliation = reconcileTechCards({
    assortment: parsed(stores.get("bd_assortment_v1"), {}),
    purchaseDocuments: values(stores.get("bd_purchase_documents")),
    venueId: account.venueId,
  });
  const analytics = buildAssortmentAnalytics({
    assortment: reconciliation.assortment,
    purchaseDocuments: values(stores.get("bd_purchase_documents")),
    salesDocuments: values(stores.get("bd_sales_documents")),
    financeRevenue: values(stores.get("bd_finance_revenue")),
    period,
    venueId: account.venueId,
  });

  return noStore({
    ok: true,
    venueId: account.venueId,
    generatedAt: new Date().toISOString(),
    analytics,
    techCardReconciliation: reconciliation.report,
  });
}

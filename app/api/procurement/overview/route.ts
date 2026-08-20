import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { buildProcurementAnalytics } from "../../../../lib/bardoctor/procurement-analytics";
import { migratePurchaseLedger } from "../../../../lib/bardoctor/purchases";

const STORE_KEYS = [
  "bd_purchase_documents",
  "bd_suppliers",
  "bd_finance_expenses",
  "bd_stock_movements",
  "bd_supplier_alternatives_v1",
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
      { ok: false, code: "ACCESS_DENIED", error: "Раздел закупок недоступен" },
      403,
    );
  }

  const url = new URL(request.url);
  const period = /^\d{4}-\d{2}$/.test(url.searchParams.get("period") ?? "")
    ? url.searchParams.get("period") as string
    : undefined;
  const placeholders = STORE_KEYS.map(() => "?").join(", ");
  const result = await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(account.id, ...STORE_KEYS).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  const ledger = migratePurchaseLedger({
    documents: values(stores.get("bd_purchase_documents")),
    expenses: values(stores.get("bd_finance_expenses")),
    venueId: account.venueId,
  });
  const analytics = buildProcurementAnalytics({
    documents: ledger.documents,
    suppliers: values(stores.get("bd_suppliers")),
    expenses: ledger.expenses,
    stockMovements: values(stores.get("bd_stock_movements")),
    supplierAlternatives: parsed(stores.get("bd_supplier_alternatives_v1"), null),
    period,
    venueId: account.venueId,
  });

  return noStore({
    ok: true,
    venueId: account.venueId,
    generatedAt: new Date().toISOString(),
    analytics,
  });
}

import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { accountingCurrencyFromProfile } from "../../../../lib/bardoctor/currency";
import { ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { summarizeInventoryValuation } from "../../../../lib/bardoctor/valuation";

type StoreRow = { store_key: string; data_json: string };

function json(value: string | undefined): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права просматривать склад" }, { status: 403 });
  }
  const rows = (await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY).all<StoreRow>()).results;
  const stores = new Map(rows.map((row) => [row.store_key, row.data_json]));
  let profile: unknown = null;
  try {
    profile = account.restaurantJson ? JSON.parse(account.restaurantJson) : null;
  } catch {
    profile = null;
  }
  const warehouseId = new URL(request.url).searchParams.get("warehouseId");
  const movementData = json(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const summary = summarizeInventoryValuation({
    balances: json(stores.get(ASSORTMENT_STORE_KEY)),
    stockMovements: Array.isArray(movementData) ? movementData : [],
    venueId: account.venueId,
    accountingCurrency: accountingCurrencyFromProfile(profile),
    warehouseId,
  });
  return Response.json(
    { ok: true, venueId: account.venueId, warehouseId, ...summary },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { authenticatedEvidenceContext } from "../../../../lib/bardoctor/evidence-resolver";
import { businessRecord, scopedBusinessRows } from "../../../../lib/bardoctor/business-day-rows";
import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { unauthorized } from "../../../../lib/bardoctor/auth";
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
  const context = await authenticatedEvidenceContext(request);
  if (!context) return unauthorized();
  const { account } = context;
  if (!hasPermission(account, "inventory.view")) {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "Нет права просматривать склад" }, { status: 403 });
  }
  const rows = (await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?)
  `).bind(account.id, ASSORTMENT_STORE_KEY, STOCK_MOVEMENT_STORE_KEY, "bd_warehouses").all<StoreRow>()).results;
  const stores = new Map(rows.map((row) => [row.store_key, row.data_json]));
  let profile: unknown = null;
  try {
    profile = account.restaurantJson ? JSON.parse(account.restaurantJson) : null;
  } catch {
    profile = null;
  }
  const warehouseId = new URL(request.url).searchParams.get("warehouseId");
  const movementData = json(stores.get(STOCK_MOVEMENT_STORE_KEY));
  const scope = { venueId: context.venueId, workspaceId: context.workspaceId, dataAccountId: account.id };
  const assortment = businessRecord(json(stores.get(ASSORTMENT_STORE_KEY)));
  const warehouses = scopedBusinessRows(Array.isArray(json(stores.get("bd_warehouses"))) ? json(stores.get("bd_warehouses")) as unknown[] : [], scope);
  const ownedWarehouse = (id: string) => id === "__venue__" || warehouses.filter(row => row.id === id).length === 1;
  if (warehouseId && !ownedWarehouse(warehouseId)) return Response.json({ok:false,code:"EVIDENCE_UNAVAILABLE"},{status:404,headers:{"Cache-Control":"private, no-store"}});
  const balances = scopedBusinessRows(Array.isArray(assortment.stockBalances) ? assortment.stockBalances : [], scope).map(balance => {
    const nested = businessRecord(balance.warehouseBalances);
    const invalid = Object.entries(nested).some(([id,row]) => !ownedWarehouse(id) || scopedBusinessRows([row], scope).length !== 1);
    const explicit = String(balance.warehouseId ?? balance.warehouseExternalId ?? "");
    return invalid || explicit && !ownedWarehouse(explicit) ? {...balance,current:null,quantity:null,onHand:null,warehouseBalances:{}} : balance;
  });
  const summary = summarizeInventoryValuation({
    balances,
    stockMovements: scopedBusinessRows(Array.isArray(movementData) ? movementData : [], scope),
    venueId: account.venueId,
    accountingCurrency: accountingCurrencyFromProfile(profile),
    warehouseId,
  });
  return Response.json(
    { ok: true, venueId: account.venueId, warehouseId, ...summary, lines: summary.lines.map(line => ({ ...line, evidenceRefs: ["STOCK_QUANTITY", "COST_BASIS", "STOCK_VALUATION"].map(kind => ({ contractVersion: 1, kind, id: line.productKey, venueId: context.venueId, workspaceId: context.workspaceId, ...(line.warehouseId || warehouseId ? { partId: line.warehouseId || warehouseId } : {}) })) })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

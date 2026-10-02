import { authenticatedEvidenceContext } from "../../../lib/bardoctor/evidence-resolver";
import { scopedBusinessRows } from "../../../lib/bardoctor/business-day-rows";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { getD1 } from "../../../db";
import { unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { readStoreSnapshots } from "../../../lib/bardoctor/store-cas";
import { OPERATIONAL_REPORT_STORE_KEY, operationalDays } from "../../../lib/bardoctor/operational-day";

export async function GET(request: Request) {
  const context = await authenticatedEvidenceContext(request);
  if (!context) return unauthorized();
  const account = context.account;
  if (!hasPermission(account, "shifts.view")) return Response.json({ ok: false, code: "ACCESS_DENIED" }, { status: 403 });
  const keys = ["bd_finance_revenue", "bd_sales_events_v1", "bd_sales_documents", OPERATIONAL_REPORT_STORE_KEY, "bd_inventory_writeoffs", "bd_cases"];
  const snapshots = await readStoreSnapshots(getD1(), account.id, keys);
  const read = (key: string): unknown[] => { const data = JSON.parse(snapshots.find(item => item.key === key)?.dataJson ?? "[]"); if (!Array.isArray(data) || data.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("OPERATIONAL_DAY_STORE_INVALID"); return data; };
  try { keys.forEach(read); } catch { return Response.json({ ok: false, code: "OPERATIONAL_DAY_STORE_NEEDS_REVIEW", error: "Данные рабочего дня требуют проверки" }, { status: 409 }); }
  const asOf = new Date().toISOString();
  const days = operationalDays({ venueId: account.venueId, workspaceId: context.workspaceId, dataAccountId: account.id, currency: accountingCurrencyFromRestaurantJson(account.restaurantJson), asOf, revenues: read(keys[0]), events: read(keys[1]), documents: read(keys[2]), reports: read(keys[3]), writeOffs: read(keys[4]), incidents: read(keys[5]) });
  return Response.json({ ok: true, venueId: account.venueId, asOf, days, revenues: scopedBusinessRows(read(keys[0]), { venueId: account.venueId, workspaceId: context.workspaceId, dataAccountId: account.id }) }, { headers: { "Cache-Control": "private, no-store" } });
}

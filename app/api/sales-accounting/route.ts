import { POST as confirmSalesImport } from "../sales/confirm/route";
import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { venueTimeFromJson, venueDate } from "../../../lib/bardoctor/venue-time";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { readPosOrders } from "../../../lib/bardoctor/pos-order-storage";
import { POS_ORDER_STORE_KEY } from "../../../lib/bardoctor/pos-orders";
import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { SALES_ACCOUNTING_KEY, SalesAccountingError, accountingRows, parseSalesAccounting, salesModeForDate, nextSalesMode, planSalesMode, planManualShift, planManualTotals } from "../../../lib/bardoctor/sales-accounting";

const keys = [SALES_ACCOUNTING_KEY, "bd_finance_revenue", "bd_operational_reports_v1", POS_ORDER_STORE_KEY, "bd_month_closings", "bd_sales_import_review_v1"];
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof SalesAccountingError) return reply({ ok: false, code: error.code, error: error.message }, error.code === "ACCESS_DENIED" ? 403 : error.code === "MONTH_LOCKED" ? 423 : 409);
  if (error instanceof SyntaxError) return reply({ ok: false, code: "ACCOUNTING_STATE_INVALID", error: "Данные учёта требуют проверки." }, 409);
  throw error;
}
export async function GET(request: Request) {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!hasPermission(account, "sales.view")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  try {
    const snapshots = await readStoreSnapshots(getD1(), account.id, [...keys.slice(0, 3), "bd_sales_import_review_v1"]);
    const read = (key: string, fallback: unknown) => JSON.parse(snapshots.find(x => x.key === key)?.dataJson ?? JSON.stringify(fallback));
    const setting = parseSalesAccounting(read(SALES_ACCOUNTING_KEY, null), account.venueId);
    const time = venueTimeFromJson(account.restaurantJson), now = new Date().toISOString(), today = venueDate(now, time.timezone);
    return reply({ ok: true, venueId: account.venueId, currency: accountingCurrencyFromRestaurantJson(account.restaurantJson),
      ...time, today, mode: nextSalesMode(setting, today), changes: setting?.changes ?? [], shiftBased: Boolean(setting?.shiftChanges),
      legacyPending: !setting?.shiftChanges ? setting?.changes.find(x=>x.effectiveDate>today)??null : null,
      shiftChanges: setting?.shiftChanges ?? [],
      activeWorkday: accountingRows(read("bd_operational_reports_v1",[])).filter(x=>x.venueId===account.venueId&&x.workdayStatus==="OPEN").map(x=>({id:x.id,date:x.date})),
      closedDates: accountingRows(read("bd_operational_reports_v1",[])).filter(x=>x.venueId===account.venueId&&x.workdayStatus==="CLOSED"&&!accountingRows(read("bd_operational_reports_v1",[])).some(r=>r.venueId===account.venueId&&r.date===x.date&&r.workdayStatus==="OPEN")).map(x=>x.date),
      canManage: account.role === "owner",
      occupiedDates: account.role === "owner" ? accountingRows(read("bd_finance_revenue",[])).filter(x => (x.venueId == null || x.venueId === account.venueId) && x.revenueSource !== "MANUAL_SUMMARY").map(x => x.date) : [],
      pendingImports: account.role === "owner" ? accountingRows(read("bd_sales_import_review_v1",[])).filter(x=>x.venueId===account.venueId&&x.status==="AWAITING_RECONCILIATION").map(x=>({id:x.id,date:x.date,totalRevenue:(x.document as Record<string,unknown>).totalRevenue,currency:(x.document as Record<string,unknown>).currency})) : [],
      totals: account.role === "owner" ? accountingRows(read("bd_finance_revenue", [])).filter(x => x.venueId === account.venueId && [1,2].includes(Number(x.manualTotalsVersion))) : [],
    });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request): Promise<Response> { return withStoreCasRetries(request, command); }
async function command(request: Request): Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (account.role !== "owner") return reply({ ok: false, code: "ACCESS_DENIED", error: "Это действие доступно владельцу заведения." }, 403);
  const parsed = await readJsonRequest<Record<string, unknown>>(request, { maxBytes: 16_384 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.venueId !== account.venueId) return reply({ ok: false, code: "VENUE_CHANGED" }, 409);
  if (!["set_mode", "open_manual_shift", "save_totals", "resolve_import"].includes(String(body.action))) return reply({ ok: false, code: "ACTION_INVALID" }, 422);
  try {
    const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, keys);
    const read = (key: string, fallback: unknown) => JSON.parse(snapshots.find(x => x.key === key)?.dataJson ?? JSON.stringify(fallback));
    const setting = parseSalesAccounting(read(SALES_ACCOUNTING_KEY, null), account.venueId);
    const revenues = accountingRows(read("bd_finance_revenue", [])), reports = accountingRows(read("bd_operational_reports_v1", []));
    if(body.action==="resolve_import") {
      const staged=accountingRows(read("bd_sales_import_review_v1",[])).find(x=>x.venueId===account.venueId&&x.id===body.stagedId);
      if(!staged)return reply({ok:false,code:"IMPORT_NOT_FOUND",error:"Импорт для сверки не найден."},404);
      return confirmSalesImport(new Request(request.url,{method:"POST",headers:request.headers,body:JSON.stringify({document:staged.document,replacement:{revenueId:body.revenueId,expectedRevision:body.expectedRevision,reason:body.reason}})}));
    }
    const now = new Date().toISOString(), time = venueTimeFromJson(account.restaurantJson);
    const common = { setting, venueId: account.venueId, actorId: account.actorAccountId, role: account.role,
      now, timezone: time.timezone, operationId: String(body.operationId ?? ""), revenues };
    let result: unknown, after: unknown, before: unknown, storeKey: string, entity: string, month: string | null = null;
    if (body.action === "set_mode") {
      const orders = await readPosOrders(db, account.id, snapshots.find(x => x.key === POS_ORDER_STORE_KEY)?.dataJson, { open: true });
      const plan = planSalesMode({ ...common, mode: body.mode, reports, orders, acceptLegacySchedule: body.acceptLegacySchedule===true });
      if (plan.duplicate) return reply({ ok: true, duplicate: true, change: plan.change });
      after = plan.setting; before = setting; storeKey = SALES_ACCOUNTING_KEY; entity = plan.change.id; result = { change: plan.change };
    } else if(body.action==="open_manual_shift") {
      const orders=await readPosOrders(db,account.id,snapshots.find(x=>x.key===POS_ORDER_STORE_KEY)?.dataJson,{open:true});
      const plan=planManualShift({...common,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson)??"",reports,orders,closedMonths:closedMonthsFromStore(read("bd_month_closings",null))});
      if(plan.duplicate)return reply({ok:true,duplicate:true,total:plan.row});
      after=plan.revenues;before=null;storeKey="bd_finance_revenue";entity=String(plan.row.id);month=String(plan.row.accountingMonth);result={total:plan.row};
    } else {
      const orders=await readPosOrders(db,account.id,snapshots.find(x=>x.key===POS_ORDER_STORE_KEY)?.dataJson,{open:true});
      const plan = planManualTotals({ ...common, currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) ?? "",
        shiftId:typeof body.shiftId==="string"?body.shiftId:undefined,reports,orders,date: String(body.date ?? ""), expectedRevision: Number(body.expectedRevision), reason: typeof body.reason === "string" ? body.reason : undefined,
        cash: body.cash, card: body.card, receipts: body.receipts, cogs: body.cogs, closedMonths: closedMonthsFromStore(read("bd_month_closings", null)) });
      if (plan.duplicate) return reply({ ok: true, duplicate: true, total: plan.row });
      after = plan.revenues; before = plan.before; storeKey = "bd_finance_revenue"; entity = String(plan.row.id);
      month = String(plan.row.accountingMonth); result = { total: plan.row };
    }
    const statements = [posMembershipGuard(db, account, now),
      db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?)
        ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
        .bind(account.id, storeKey, JSON.stringify(after), now),
      db.prepare(`INSERT INTO audit_log(account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id, storeKey, `sales_accounting.${body.action}`, entity, "Учёт продаж", month,
        JSON.stringify(before), JSON.stringify(result), '["salesAccounting"]', [account.firstName, account.lastName].filter(Boolean).join(" "),
        account.role, typeof body.reason === "string" ? body.reason : "Подтверждённая операция владельца", now)];
    await runStoreCasBatch(db, account.id, snapshots, statements, now);
    return reply({ ok: true, ...result as Record<string, unknown> }, 201);
  } catch (error) { return failure(error); }
}

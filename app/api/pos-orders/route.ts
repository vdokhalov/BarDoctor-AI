import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission, canManagePosPrivilegedAction } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { venueTimeFromJson } from "../../../lib/bardoctor/venue-time";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { SALES_EVENT_STORE_KEY } from "../../../lib/bardoctor/sales-events";
import { POS_DISCOUNT_STORE_KEY, parsePosDiscountRules } from "../../../lib/bardoctor/pos-discounts";
import { posSalesEventView } from "../../../lib/bardoctor/pos-shift-report";
import { POS_ORDER_STORE_KEY, parsePosOrders, posOrderViews, planPosOrder, type PosOrderCommand, type PosOrderContext } from "../../../lib/bardoctor/pos-orders";

const keys = [POS_ORDER_STORE_KEY, POS_DISCOUNT_STORE_KEY, "bd_assortment_v1", "bd_stock_movements", SALES_EVENT_STORE_KEY, "bd_finance_revenue", "bd_sales_mappings", "bd_sales_warehouse_routes", "bd_warehouses", "bd_month_closings"];
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
async function load(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, keys);
  const read = (key: string, fallback: unknown): unknown => { const data = snapshots.find(snapshot => snapshot.key === key)?.dataJson; return data == null ? fallback : JSON.parse(data); };
  const rows = (key: string) => { const value = read(key, []); if (!Array.isArray(value) || value.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW"); return value; };
  const assortment = read("bd_assortment_v1", {});
  if (!assortment || typeof assortment !== "object" || Array.isArray(assortment)) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW");
  const events = rows(SALES_EVENT_STORE_KEY);
  if (events.some(event => !event.id || !event.fingerprint || !event.batch || !Array.isArray(event.originalMovements) || !Array.isArray(event.prices) || !["POSTED", "REVERSED"].includes(event.status))) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW");
  const context: PosOrderContext = { ...venueTimeFromJson(account.restaurantJson), venueId: account.venueId,
    currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) || "", now: new Date().toISOString(),
    actor: { accountId: account.actorAccountId, name: [account.firstName, account.lastName].filter(Boolean).join(" "), role: account.role, ...(account.jobTitle ? { jobTitle: account.jobTitle } : {}) },
    discountRules: parsePosDiscountRules(read(POS_DISCOUNT_STORE_KEY, null)),
    assortment: assortment as Record<string, unknown>, movements: rows("bd_stock_movements"), events, revenues: rows("bd_finance_revenue"),
    mappings: rows("bd_sales_mappings"), warehouseRoutes: rows("bd_sales_warehouse_routes"), warehouses: rows("bd_warehouses"), closedMonths: closedMonthsFromStore(read("bd_month_closings", null)),
  };
  return { db, snapshots, context, orders: parsePosOrders(rows(POS_ORDER_STORE_KEY)) };
}
function controlled(error: unknown): Response {
  if (error instanceof SyntaxError) return reply({ ok: false, code: "POS_ORDER_STORE_NEEDS_REVIEW", error: "Данные требуют проверки. Ничего не изменено." }, 409);
  if (error instanceof Error && /^(POS_ORDER_|POS_DISCOUNT_|SALES_EVENT_)/.test(error.message)) {
    const messages: Record<string, string> = {
      POS_ORDER_DISCOUNT_LOCKED: "Руководитель должен снять скидку перед изменением позиций.",
      POS_ORDER_SPLIT_DISCOUNTED: "Разделение счёта со скидкой не поддерживается. Руководитель должен сначала снять скидку, разделить счёт и применить скидку отдельно.",
      POS_ORDER_DISCOUNT_PRICE_CHANGED: "Цены изменились после применения скидки. Руководитель должен снять скидку и проверить новые цены.",
      POS_DISCOUNT_RULE_CHANGED: "Правило скидки изменилось. Обновите список скидок и выберите актуальное правило.",
      POS_DISCOUNT_INACTIVE: "Эта скидка больше не активна. Выберите другое правило.",
      POS_DISCOUNT_EXCEEDS_GROSS: "Скидка не может превышать сумму счёта.",
      POS_ORDER_REVISION_CONFLICT: "Заказ изменён на другом устройстве. Обновите его перед повторением операции.",
      POS_ORDER_PRECHECK_LOCKED: "Предчек уже выдан. Руководитель должен отменить его перед изменением заказа.",
      POS_ORDER_PRECHECK_CHANGED: "Цены после выдачи предчека изменились. Руководитель должен отменить предчек и выдать новый.",
      POS_ORDER_PREVIEW_CHANGED: "Цена или условия продажи изменились. Проверьте оплату ещё раз.",
      POS_ORDER_SHIFT_CLOSED: "Кассовая смена закрыта. Заказ не изменён.",
      POS_ORDER_TABLE_INVALID: "Укажите номер стола от 1 до 9999.",
      POS_ORDER_REASON_REQUIRED: "Укажите причину отмены.",
      POS_ORDER_PRICE_NEEDS_REVIEW: "Для кассы нужна цена с точностью до двух знаков после запятой. Исправьте цену позиции меню.",
      POS_ORDER_ACCESS_DENIED: "Это действие доступно только владельцу, управляющему или менеджеру смены.",
      POS_ORDER_SPLIT_REQUIRES_REMAINDER: "Оставьте хотя бы одну позицию в исходном счёте.",
      SALES_EVENT_MONTH_LOCKED: "Период закрыт. Ничего не изменено.",
      SALES_EVENT_POS_PAYMENT_MISMATCH: "Сумма оплаты не совпадает с текущей суммой заказа.",
    };
    return reply({ ok: false, code: error.message, error: messages[error.message] ?? "Заказ требует проверки. Проверьте позиции, оплату и состояние смены. Ничего не изменено." }, error.message === "POS_ORDER_ACCESS_DENIED" ? 403 : error.message === "SALES_EVENT_MONTH_LOCKED" ? 423 : 409);
  }
  throw error;
}
export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!hasPermission(account, "sales.view")) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  try {
    const { context, orders } = await load(account);
    return reply({ ok: true, venueId: account.venueId, serverNow: context.now, orders: posOrderViews(context, orders),
      permissions: { create: hasPermission(account, "sales.create"), pay: hasPermission(account, "sales.create") && hasPermission(account, "sales.post"), privileged: hasPermission(account, "sales.create") && canManagePosPrivilegedAction(account) } });
  } catch (error) { return controlled(error); }
}
export async function POST(request: Request): Promise<Response> { return withStoreCasRetries(request, command); }
async function command(request: Request): Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  const parsed = await readJsonRequest<PosOrderCommand & { venueId: number }>(request, { maxBytes: 100_000 });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!hasPermission(account, "sales.create") || ["pay", "preview_payment"].includes(body.action) && !hasPermission(account, "sales.post")
    || ["split", "cancel_item", "cancel_order", "cancel_precheck", "apply_discount", "remove_discount"].includes(body.action) && !canManagePosPrivilegedAction(account)) return reply({ ok: false, code: "ACCESS_DENIED" }, 403);
  if (body.venueId !== account.venueId) return reply({ ok: false, code: "VENUE_CHANGED" }, 409);
  try {
    const { db, snapshots, context, orders } = await load(account);
    const plan = await planPosOrder(context, orders, body);
    const result = { ok: true, duplicate: plan.duplicate, order: plan.order, orders: posOrderViews(context, plan.orders), ...(plan.event ? { event: posSalesEventView(plan.event) } : {}), ...(plan.previewHash ? { previewHash: plan.previewHash } : {}) };
    if (plan.duplicate || body.action === "preview_payment") return reply(result);
    const updates: [string, unknown][] = [[POS_ORDER_STORE_KEY, plan.orders]];
    if (plan.salesPlan) updates.push(["bd_assortment_v1", plan.salesPlan.assortment], ["bd_stock_movements", plan.salesPlan.movements], [SALES_EVENT_STORE_KEY, plan.salesPlan.events], ["bd_finance_revenue", plan.salesPlan.revenues]);
    const statements = updates.map(([key, value]) => db.prepare(`INSERT INTO domain_data (account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(account.id, key, JSON.stringify(value), context.now));
    const shift = context.revenues.find(row => row.id === plan.order.shiftId && row.venueId === context.venueId);
    statements.push(db.prepare(`INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id, POS_ORDER_STORE_KEY, body.action, plan.order.id, `Стол ${plan.order.tableNumber}`, String(shift?.date ?? "").slice(0, 7),
        JSON.stringify(orders.find(order => order.id === plan.order.id) ?? null), JSON.stringify({ order: plan.order, salesEventId: plan.event?.id }),
        JSON.stringify(["revision", "status", "lines", "precheck", "discount", "totals"]), context.actor.name, context.actor.role, typeof body.reason === "string" && body.reason.trim() || "Подтверждённая операция", context.now));
    statements.unshift(posMembershipGuard(db,account,context.now));
    await runStoreCasBatch(db, account.id, snapshots, statements, context.now);
    return reply(result, 201);
  } catch (error) { return controlled(error); }
}

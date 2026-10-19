import {readPosOrders,posOrderMarker,posOrderStatements} from '../../../lib/bardoctor/pos-order-storage';
import { preparationOrderView, preparationConfig, preparationKey } from '../../../lib/bardoctor/pos-preparation';
import {readSaleEvent,readOrderPaymentFacts,salesEventStatements,type EventSelector} from '../../../lib/bardoctor/sales-event-storage';
import {readSaleStock,saleStockStatements,stockStoreStatements} from "../../../lib/bardoctor/stock-storage";
import { posWorkdayGate } from "../../../lib/bardoctor/pos-workday-gate";
import { OPERATIONAL_REPORT_STORE_KEY } from "../../../lib/bardoctor/operational-day";
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
import { POS_ORDER_STORE_KEY, parsePosOrders, posOrderViews, posOrderAccountViews, posOrderCancellationDayAllowed, planPosOrder, type PosOrderCommand, type PosOrderContext } from "../../../lib/bardoctor/pos-orders";

const keys = ["bd_inventory_writeoffs","bd_finance_expenses",POS_ORDER_STORE_KEY, POS_DISCOUNT_STORE_KEY, "bd_assortment_v1", "bd_stock_movements", SALES_EVENT_STORE_KEY, "bd_finance_revenue", "bd_sales_mappings", "bd_sales_warehouse_routes", "bd_warehouses", "bd_month_closings", OPERATIONAL_REPORT_STORE_KEY];
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
async function load(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>, documentId?:string, selector?:EventSelector) {
  const db = getD1(), snapshots = await readStoreSnapshots(db, account.id, [...keys,preparationKey(account.venueId)]);
  const orderRaw=snapshots.find(s=>s.key===POS_ORDER_STORE_KEY)?.dataJson;
  const storedOrders=await readPosOrders(db,account.id,orderRaw);
  const read = (key: string, fallback: unknown): unknown => { const data = snapshots.find(snapshot => snapshot.key === key)?.dataJson; return key===POS_ORDER_STORE_KEY?storedOrders:data == null ? fallback : JSON.parse(data); };
  const rows = (key: string) => { const value = read(key, []); if (!Array.isArray(value) || value.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW"); return value; };
  const assortment = read("bd_assortment_v1", {});
  if (!assortment || typeof assortment !== "object" || Array.isArray(assortment)) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW");
  const eventRaw=snapshots.find(s=>s.key===SALES_EVENT_STORE_KEY)?.dataJson;
  const selected=selector?await readSaleEvent(db,account.id,eventRaw,selector,String(rows(POS_ORDER_STORE_KEY).find(row=>`pos-order:${row.id}`===selector.externalId)?.shiftId??'')):{events:await readOrderPaymentFacts(db,account.id,eventRaw,rows(POS_ORDER_STORE_KEY).map(row=>String(row.id))),revision:null};
  const events=selected.events;
  if (events.some(event => !event.id || !event.fingerprint || !event.batch || !Array.isArray(event.originalMovements) || !Array.isArray(event.prices) || !["POSTED", "REVERSED"].includes(event.status))) throw new Error("POS_ORDER_STORE_NEEDS_REVIEW");
  const now = new Date().toISOString();
  const stock = await readSaleStock(db,account.id,snapshots.find(s=>s.key==="bd_stock_movements")?.dataJson,assortment as Record<string,unknown>,now,documentId?[documentId]:[]);
  const context: PosOrderContext = { ...venueTimeFromJson(account.restaurantJson), venueId: account.venueId,
    currency: accountingCurrencyFromRestaurantJson(account.restaurantJson) || "", now,
    actor: { accountId: account.actorAccountId, name: [account.firstName, account.lastName].filter(Boolean).join(" "), role: account.role, ...(account.jobTitle ? { jobTitle: account.jobTitle } : {}) },
    normalizedOrders:!!posOrderMarker(orderRaw),canWriteOff:hasPermission(account,"inventory.manage"),writeOffDocuments:rows("bd_inventory_writeoffs"),writeOffExpenses:rows("bd_finance_expenses"),
    preparationConfig:preparationConfig(read(preparationKey(account.venueId),null),account.venueId),
    discountRules: parsePosDiscountRules(rows(POS_DISCOUNT_STORE_KEY)),
    assortment: assortment as Record<string, unknown>, movements: stock.movements, events, revenues: rows("bd_finance_revenue"),
    mappings: rows("bd_sales_mappings"), warehouseRoutes: rows("bd_sales_warehouse_routes"), warehouses: rows("bd_warehouses"), closedMonths: closedMonthsFromStore(read("bd_month_closings", null)),
  };
  return { db, snapshots, context, eventRevision:selected.revision, stockRevision:stock.revision, workdays:rows(OPERATIONAL_REPORT_STORE_KEY), orders: parsePosOrders(rows(POS_ORDER_STORE_KEY)) };
}
function controlled(error: unknown): Response {
  if (error instanceof SyntaxError) return reply({ ok: false, code: "POS_ORDER_STORE_NEEDS_REVIEW", error: "Данные требуют проверки. Ничего не изменено." }, 409);
  if (error instanceof Error && /^(STOCK_JOURNAL_|POS_ORDER_|POS_DISCOUNT_|SALES_EVENT_)/.test(error.message)) {
    const messages: Record<string, string> = {
      POS_ORDER_STOCK_DECISION_REQUIRED: "Выберите явно: списать со склада или не списывать.",
      POS_ORDER_STOCK_SNAPSHOT_REQUIRED: "Списание недоступно: нет сохранённого состава, единиц или складского источника. Отмена без списания требует отдельного выбора.",
      POS_ORDER_STOCK_NO_CONSUMPTION: "У позиции нет складского потребления. Выберите отмену без списания.",
      POS_ORDER_STOCK_SOURCE_REQUIRED: "Складской источник, единицы или остаток требуют проверки. Ничего не изменено.",
      POS_ORDER_STOCK_INSUFFICIENT: "Недостаточно остатка для списания. Ничего не изменено.",
      POS_ORDER_STOCK_LINK_CONFLICT: "Связанное списание требует проверки. Ничего не изменено.",
      POS_ORDER_STOCK_ACCESS_DENIED: "Нет права списывать со склада.",
      POS_ORDER_CONFIRMED_LOCKED: "Позиции уже подтверждены. Руководитель может отменить нужное количество отдельным бегунком «ОТМЕНА» с причиной; прямое изменение или разделение недоступно.",
      POS_ORDER_NOTHING_TO_CONFIRM: "Новых позиций для подтверждения нет.",
      POS_ORDER_PREPARATION_SECTION_REQUIRED: "Руководитель должен заранее указать действующий раздел в карточке позиции меню.",
      POS_ORDER_PREPARATION_INVALID: "Настройки или бегунки требуют проверки. Ничего не изменено.",
      POS_ORDER_CANCELLATION_HAS_PAYMENT: "У счёта есть признаки оплаты. Отмена неоплаченного счёта недоступна; возвраты рассматриваются отдельно.",
      POS_ORDER_SHIFT_NEEDS_REVIEW: "Исходная кассовая смена не определена однозначно. Ничего не изменено.",
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
    const { context, orders, workdays } = await load(account);
    return reply({ ok: true, venueId: account.venueId, serverNow: context.now, orders: posOrderAccountViews(context, orders, workdays, hasPermission(account,"sales.create")&&canManagePosPrivilegedAction(account)).map(preparationOrderView),
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
  if(body.action==="cancel_item"&&body.stockDecision==="WRITE_OFF"&&!hasPermission(account,"inventory.manage"))return reply({ok:false,code:"ACCESS_DENIED",error:"Нет права списывать со склада."},403);
  if (body.venueId !== account.venueId) return reply({ ok: false, code: "VENUE_CHANGED" }, 409);
  try {
    const { db, snapshots, context, orders, workdays, stockRevision, eventRevision } = await load(account,undefined,{externalId:`pos-order:${body.orderId}`,source:"POS_API"});
    const plan = await planPosOrder(context, orders, body);
    const result = { ok: true, duplicate: plan.duplicate, order: preparationOrderView(plan.order), orders: posOrderViews(context, plan.orders).map(preparationOrderView), ...(plan.event ? { event: posSalesEventView(plan.event) } : {}), ...(plan.previewHash ? { previewHash: plan.previewHash } : {}) };
    if(!plan.duplicate){const shift=context.revenues.find(row=>row.id===plan.order.shiftId&&row.venueId===context.venueId);const gate=posWorkdayGate(workdays,context.venueId,String(shift?.date));if(!gate.ok&&!(body.action==="cancel_order"&&posOrderCancellationDayAllowed(context,plan.order.shiftId,workdays)))return reply(gate,409);}
    if (plan.duplicate || body.action === "preview_payment") return reply(result);
    const updates: [string, unknown][] = [[POS_ORDER_STORE_KEY, plan.orders]];
    if (plan.salesPlan) updates.push(["bd_assortment_v1", plan.salesPlan.assortment], ["bd_stock_movements", plan.salesPlan.movements], [SALES_EVENT_STORE_KEY, plan.salesPlan.events], ["bd_finance_revenue", plan.salesPlan.revenues]);
    if(plan.cancellationStockPlan){const stock=plan.cancellationStockPlan;updates.push(["bd_assortment_v1",stock.assortment],["bd_stock_movements",stock.movements],["bd_inventory_writeoffs",stock.documents],["bd_finance_expenses",stock.expenses]);}
    const statements:D1PreparedStatement[]=[];
    for(const [key,value] of updates){
      statements.push(...(key===POS_ORDER_STORE_KEY?await posOrderStatements(db,{accountId:account.id,venueId:account.venueId},snapshots.find(s=>s.key===POS_ORDER_STORE_KEY)?.dataJson,orders,plan.orders,context.now):key===SALES_EVENT_STORE_KEY&&eventRevision!==null
        ?await salesEventStatements(db,{accountId:account.id,venueId:account.venueId},eventRevision,context.events,value as typeof context.events)
        :key==='bd_stock_movements'&&stockRevision!==null
        ?await saleStockStatements(db,{accountId:account.id,venueId:account.venueId},stockRevision,context.movements,value as typeof context.movements)
        :await stockStoreStatements(db,account.id,key,value,context.now)));
    }
    const shift = context.revenues.find(row => row.id === plan.order.shiftId && row.venueId === context.venueId);
    statements.push(db.prepare(`INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(account.id, POS_ORDER_STORE_KEY, body.action, plan.order.id, `Стол ${plan.order.tableNumber}`, String(shift?.date ?? "").slice(0, 7),
        JSON.stringify(context.normalizedOrders?{orderId:plan.order.id,revision:orders.find(o=>o.id===plan.order.id)?.revision??null}:orders.find(order => order.id === plan.order.id) ?? null), JSON.stringify(context.normalizedOrders?{orderId:plan.order.id,revision:plan.order.revision,salesEventId:plan.event?.id,operationId:body.operationId}:{ order: plan.order, salesEventId: plan.event?.id }),
        JSON.stringify(["revision", "status", "lines", "precheck", "discount", "totals", "preparationTickets"]), context.actor.name, context.actor.role, typeof body.reason === "string" && body.reason.trim() || "Подтверждённая операция", context.now));
    if(plan.cancellationStockPlan){const document=plan.cancellationStockPlan.document;statements.push(db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,after_json,actor_name,actor_role,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(account.id,'bd_inventory_writeoffs','pos_cancellation.posted',document.id,JSON.stringify(document),context.actor.name,context.actor.role,body.reason!,context.now));}
    statements.unshift(posMembershipGuard(db,account,context.now));
    await runStoreCasBatch(db, account.id, snapshots, statements, context.now);
    return reply(result, 201);
  } catch (error) { return controlled(error); }
}

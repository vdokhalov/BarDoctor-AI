import {readSaleEvent,readSalesEvents,readRecentSalesEvents,salesEventStatements,type EventSelector} from '../../../lib/bardoctor/sales-event-storage';
import {readSaleStock,saleStockStatements,stockStoreStatements} from "../../../lib/bardoctor/stock-storage";
import { posWorkdayGate } from "../../../lib/bardoctor/pos-workday-gate";
import { posMembershipGuard } from "../../../lib/bardoctor/pos-auth-guard";
import { posDiscountCents } from "../../../lib/bardoctor/pos-discounts";
import { POS_ORDER_STORE_KEY, parsePosOrders, assertPosShiftClosable, canReadPosSaleHistory } from "../../../lib/bardoctor/pos-orders";
import { posSalesEventView, posShiftView, buildPosShiftReport, readPosShiftReport } from "../../../lib/bardoctor/pos-shift-report";
import { planPosCash, type PosCashEntry } from "../../../lib/bardoctor/pos-shift-cash";
import { venueTimeFromJson, venueDate } from "../../../lib/bardoctor/venue-time";
import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission, canManagePosPrivilegedAction, type PermissionKey } from "../../../lib/bardoctor/access-control";
import { canReadManagementWorkday, workdayPersonnelView } from "../../../lib/bardoctor/management-workday";
import { OPERATIONAL_REPORT_STORE_KEY } from "../../../lib/bardoctor/operational-day";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { venueIdentityFromJson } from "../../../lib/bardoctor/venue-identity";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { SALES_EVENT_STORE_KEY, EVENT_REVENUE_SOURCE, planSalesEvent, planReverseSalesEvent, planSalesShift, type SalesEventContext, type SalesEventCommand } from "../../../lib/bardoctor/sales-events";

import { menuTaxonomyPresentation, canonicalTaxonomyForAssortment } from "../../../lib/bardoctor/nomenclature-taxonomy";

const keys = ["bd_assortment_v1","bd_stock_movements",SALES_EVENT_STORE_KEY,"bd_finance_revenue","bd_sales_mappings","bd_sales_warehouse_routes","bd_warehouses","bd_month_closings",POS_ORDER_STORE_KEY,OPERATIONAL_REPORT_STORE_KEY];
const reply = (data: unknown,status=200) => Response.json(data,{ status,headers:{ "Cache-Control":"private, no-store" } });
async function load(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>, documentId?:string, selector?:EventSelector,revenueRowId?:string,history?:{recent?:boolean;actorId?:number;externalId?:string;shiftId?:string}) {
  const db = getD1(), snapshots = await readStoreSnapshots(db,account.id,keys);
  const read = (key:string,fallback:unknown): unknown => { const raw = snapshots.find(s => s.key === key)?.dataJson; return raw == null ? fallback : JSON.parse(raw); };
  const rows = (key:string) => { const value=read(key,[]); if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object" || Array.isArray(v))) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW"); return value; };
  const assortment = read(keys[0],{});
  if (!assortment || typeof assortment !== "object" || Array.isArray(assortment)) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW");
  const now = new Date().toISOString();
  const eventRaw=snapshots.find(s=>s.key===SALES_EVENT_STORE_KEY)?.dataJson;
  const selected=selector?await readSaleEvent(db,account.id,eventRaw,selector,revenueRowId??`sales-events:${account.venueId}:${venueDate(now,venueTimeFromJson(account.restaurantJson).timezone)}`):{events:history?.recent?await readRecentSalesEvents(db,account.id,eventRaw,history):await readSalesEvents(db,account.id,eventRaw,history?.shiftId?{shiftId:history.shiftId}:undefined),revision:null};
  const events=selected.events;
  if (events.some(e => !e.id || !e.fingerprint || !e.batch || !Array.isArray(e.originalMovements) || !Array.isArray(e.prices) || !["POSTED","REVERSED"].includes(e.status))) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW");
  const stock = await readSaleStock(db,account.id,snapshots.find(s=>s.key===keys[1])?.dataJson,assortment as Record<string,unknown>,now,documentId?[documentId]:[]);
  const context: SalesEventContext = { ...venueTimeFromJson(account.restaurantJson), venueId:account.venueId,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson)||"",now,
    actor:{ accountId:account.actorAccountId,name:[account.firstName,account.lastName].filter(Boolean).join(" "),role:account.role, ...(account.jobTitle ? { jobTitle:account.jobTitle } : {}) },
    assortment:assortment as Record<string,unknown>,movements:stock.movements,events,revenues:rows(keys[3]),mappings:rows(keys[4]),warehouseRoutes:rows(keys[5]),warehouses:rows(keys[6]),closedMonths:closedMonthsFromStore(read(keys[7],null)) };
  return { db,snapshots,context,eventRevision:selected.revision, stockRevision:stock.revision, workdays:rows(OPERATIONAL_REPORT_STORE_KEY), orders:parsePosOrders(rows(POS_ORDER_STORE_KEY)) };
}
function controlled(error:unknown) {
  if (error instanceof Error && error.message === "SALES_EVENT_MONTH_LOCKED") return reply({ok:false,code:"MONTH_LOCKED",error:"Период продажи или возврата закрыт. Сначала откройте его в мастере закрытия месяца."},423);
  if (error instanceof SyntaxError) return reply({ok:false,code:"SALES_EVENT_STORE_NEEDS_REVIEW",error:"Данные требуют проверки. Ничего не изменено."},409);
  if (error instanceof Error && /^(STOCK_JOURNAL_|SALES_EVENT_|POS_ORDER_|POS_CASH_|POS_SHIFT_|POS_DISCOUNT_)/.test(error.message)) {
    const messages: Record<string,string> = {
      SALES_EVENT_SHIFT_ALREADY_OPEN: "В заведении уже есть открытая кассовая смена. Перейдите в неё или сначала закройте её.",
      SALES_EVENT_SHIFT_NOT_FOUND: "Открытая смена не найдена. Выберите другую смену.",
      SALES_EVENT_SHIFT_CLOSED_OR_DATE_MISMATCH: "Эта смена уже закрыта. Выберите открытую смену.",
      SALES_EVENT_POS_COMMAND_INVALID: "Укажите открытую смену и один способ оплаты с точной суммой.",
      SALES_EVENT_POS_PAYMENT_MISMATCH: "Сумма оплаты не совпадает с суммой заказа.",
      SALES_EVENT_CONSUMPTION_NEEDS_REVIEW: "Для одной из позиций не настроено безопасное складское списание. Проверьте режим и техкарту.",
      SALES_EVENT_PRICE_NEEDS_REVIEW: "Проверьте цену и валюту позиции меню.",
      SALES_EVENT_IDEMPOTENCY_CONFLICT: "Этот запрос уже использовался для другого заказа. Обновите кассу.",
    };
    return reply({ok:false,code:error.message,error:messages[error.message] ?? "Продажа или смена требует проверки. Проверьте позиции, цены, состояние смены и ранее внесённую выручку. Ничего не изменено."},409);
  }
  throw error;
}
export async function GET(request:Request) {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!hasPermission(account,"sales.view")) return reply({ok:false,code:"ACCESS_DENIED"},403);
  const navigation = (response: Response) => { response.headers.set("X-BD-Sales-Journal", canManagePosPrivilegedAction(account) ? "1" : "0"); return response; };
  try {
    const reportShift = new URL(request.url).searchParams.get("reportShiftId");
    if(reportShift&&!canManagePosPrivilegedAction(account))return reply({ok:false,code:'ACCESS_DENIED'},403);
    const {context:c,workdays} = await load(account,undefined,undefined,undefined,reportShift?{shiftId:reportShift}:{recent:true,actorId:canManagePosPrivilegedAction(account)?undefined:account.actorAccountId,externalId:new URL(request.url).searchParams.get('externalId')??undefined});
    if (reportShift) {
      if (!canManagePosPrivilegedAction(account)) return reply({ok:false,code:"ACCESS_DENIED"},403);
      return reply({ok:true,report:readPosShiftReport(c,reportShift)});
    }
    const menu = Array.isArray(c.assortment.menuItems) ? c.assortment.menuItems : [];
    const taxonomy = canonicalTaxonomyForAssortment(c.assortment);
    return navigation(reply({ok:true,serverNow:c.now,timezone:c.timezone,timezoneConfigured:c.timezoneConfigured,venueId:c.venueId,venueName:venueIdentityFromJson(account.restaurantJson).name,actor:c.actor,currency:c.currency,
      workday:posWorkdayGate(workdays,c.venueId),
      menu:menu.filter(m => m && typeof m === "object" && (m.venueId == null || m.venueId === c.venueId) && m.active !== false && m.archived !== true)
        .map(m => ({id:m.id,name:m.name,...menuTaxonomyPresentation(c.assortment,m,taxonomy),salePrice:m.salePrice ?? null,currency:m.currency ?? c.currency})),
      shifts:c.revenues.filter(r => r.venueId === c.venueId && r.revenueSource === EVENT_REVENUE_SOURCE && r.closingStatus != null && (canManagePosPrivilegedAction(account) || r.closingStatus === "open")).map(shift => account.role === "cashier" ? posShiftView(shift) : workdayPersonnelView(shift,canReadManagementWorkday(account))),
      events:c.events.filter(e => e.venueId === c.venueId && canReadPosSaleHistory(c.actor,e) && (!new URL(request.url).searchParams.get("externalId") || e.externalId === new URL(request.url).searchParams.get("externalId"))).slice(-100).reverse().map(event => account.role === "cashier" ? posSalesEventView(event) : event),
      permissions:{post:hasPermission(account,"sales.post") && hasPermission(account,"sales.create"),reverse:hasPermission(account,"sales.reverse"),shifts:canManagePosPrivilegedAction(account) && hasPermission(account,"shifts.manage"),managementDay:canReadManagementWorkday(account)} }));
  } catch(error) { return navigation(controlled(error)); }
}
export async function POST(request:Request):Promise<Response> { return withStoreCasRetries(request,command); }
async function command(request:Request):Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  const parsed = await readJsonRequest<{action:string;venueId:number;command:SalesEventCommand;previewHash:string;eventId:string;shiftId:string;name:string;openingFloat?:number;actualCash?:number;cash?:Pick<PosCashEntry,"operationId"|"kind"|"amount"|"reason">}>(request,{maxBytes:100_000});
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const permissions:Record<string,PermissionKey> = {preview:"sales.create",post:"sales.post",reverse:"sales.reverse",open_shift:"shifts.manage",close_shift:"shifts.manage",cash:"shifts.manage"};
  if (!permissions[body.action]) return reply({ok:false,code:"ACTION_INVALID"},422);
  if (!hasPermission(account,permissions[body.action]) || body.action === "post" && !hasPermission(account,"sales.create") || ["reverse","open_shift","close_shift","cash"].includes(body.action) && !canManagePosPrivilegedAction(account)) return reply({ok:false,code:"ACCESS_DENIED"},403);
  if (body.venueId !== account.venueId) return reply({ok:false,code:"VENUE_CHANGED"},409);
  const pricingKeys = ["discount","discountId","discountRuleId","discountSnapshot","discountAmount","grossAmount","netAmount","grossRevenue","netRevenue","posDiscount","prices","unitPrice","total"];
  if (pricingKeys.some(key => Object.hasOwn(body,key) || body.command && Object.hasOwn(body.command,key))
    || body.command?.lines?.some(line=>pricingKeys.some(key=>Object.hasOwn(line,key)))) return reply({ok:false,code:"SALES_EVENT_DISCOUNT_REQUIRES_ORDER"},422);
  try {
    const {db,snapshots,context:c,orders,workdays,stockRevision,eventRevision} = await load(account,body.action==="reverse"?body.eventId:undefined,body.action==="reverse"?{id:body.eventId}:body.action==="preview"||body.action==="post"?{externalId:body.command?.id,source:body.command?.source}:undefined,body.command?.shiftId,{shiftId:body.shiftId});
    let updates: [string,unknown][], result:unknown;
    let accountingMonth = venueDate(c.now, c.timezone).slice(0,7);
    if (body.action === "preview" || body.action === "post") {
      if (account.role === "cashier" && body.command?.source !== "POS_API") return reply({ok:false,code:"ACCESS_DENIED"},403);
      const plan = await planSalesEvent(c,body.command);
      if (plan.duplicate && !canReadPosSaleHistory(c.actor,plan.event)) return reply({ok:false,code:"ACCESS_DENIED"},403);
      accountingMonth = plan.event.businessDate.slice(0,7);
      result = {ok:true,duplicate:plan.duplicate,event:account.role === "cashier" ? posSalesEventView(plan.event) : plan.event,previewHash:plan.previewHash};
      if (!plan.duplicate) { const gate=posWorkdayGate(workdays,c.venueId,plan.event.businessDate); if(!gate.ok)return reply(gate,409); if(!body.command.shiftId)return reply({ok:false,code:"SALES_EVENT_SHIFT_NOT_FOUND",error:"Откройте связанную кассу рабочего дня."},409); }
      if (body.action === "preview" || plan.duplicate) return reply(result);
      if (!body.previewHash || body.previewHash !== plan.previewHash) return reply({ok:false,code:"SALES_EVENT_PREVIEW_CHANGED",error:"Цена, рецептура или условия продажи изменились. Проверьте продажу ещё раз."},409);
      updates=[[keys[0],plan.assortment],[keys[1],plan.movements],[keys[2],plan.events],[keys[3],plan.revenues]];
    } else if (body.action === "reverse") {
      const target=c.events.find(event => event.id === body.eventId && event.venueId === c.venueId);
      if (target?.source === "POS_API") return reply({ok:false,code:"POS_REVERSAL_NOT_AVAILABLE",error:"Отмена кассовой продажи пока недоступна."},409);
      const plan=planReverseSalesEvent(c,body.eventId); accountingMonth=plan.event.businessDate.slice(0,7); result={ok:true,duplicate:plan.duplicate,event:account.role === "cashier" ? posSalesEventView(plan.event) : plan.event};
      if (plan.duplicate) return reply(result);
      updates=[[keys[0],plan.assortment],[keys[1],plan.movements],[keys[2],plan.events],[keys[3],plan.revenues]];
    } else if (body.action === "cash") {
      const revenues=planPosCash(c,body.shiftId,body.cash!);
      result={ok:true,shiftId:body.shiftId,report:readPosShiftReport({...c,revenues},body.shiftId)};
      if (revenues===c.revenues) return reply({...result as object,duplicate:true});
      accountingMonth=String(revenues.find(row=>row.id===body.shiftId)?.date).slice(0,7); updates=[[keys[3],revenues]];
    } else {
      const original=c.revenues.find(row=>row.id===body.shiftId && row.venueId===c.venueId);
      if (body.action==="close_shift") assertPosShiftClosable(orders,c.venueId,body.shiftId);
      const active=workdays.filter(row=>row?.venueId===c.venueId&&row.workdayStatus==="OPEN");
      if(body.action==="open_shift"&&!original){const other=c.revenues.find(r=>r.venueId===c.venueId&&r.closingStatus==="open");if(other)return reply({ok:false,code:"SALES_EVENT_SHIFT_ALREADY_OPEN",error:"Сначала закройте кассу «"+String(other.shiftName||other.id)+"» за "+String(other.date)+".",blockingCash:{id:other.id,date:other.date,name:other.shiftName,href:"/cashier?venue="+c.venueId}},409);}
      if(body.action==="open_shift"&&!original&&active.length>1)return reply({ok:false,code:"WORKDAY_NEEDS_REVIEW",error:"Найдены несколько открытых рабочих смен."},409);
      let revenues=planSalesShift(c,body.action as "open_shift"|"close_shift",body.shiftId,body.name,body.action==="open_shift"?active[0]?.date:undefined);
      if (revenues===c.revenues) {
        if (body.action==="open_shift" && body.openingFloat!==undefined && body.openingFloat!==original?.openingFloat) return reply({ok:false,code:"SALES_EVENT_IDEMPOTENCY_CONFLICT"},409);
        return reply({ok:true,shiftId:body.shiftId,duplicate:true,...(body.action==="close_shift" ? {report:readPosShiftReport(c,body.shiftId)} : {})});
      }
      if (body.action==="open_shift") {
        const date=revenues.find(row=>row.id===body.shiftId&&row.venueId===c.venueId)?.date;
        const gate=posWorkdayGate(workdays,c.venueId,String(date));if(!gate.ok)return reply(gate,409);
        if(workdays.some(row=>row?.venueId===c.venueId&&row.date===date&&row.workdayStatus==="CLOSED"))return reply({ok:false,code:"WORKDAY_CLOSED",error:"Рабочий день за эту дату уже закрыт. Новую кассовую смену открыть нельзя."},409);
        if (body.openingFloat!==undefined) posDiscountCents(body.openingFloat);
        revenues=revenues.map(row=>row.id===body.shiftId ? {...row,openingFloat:body.openingFloat??null}:row);
      } else {
        if (body.actualCash!==undefined) posDiscountCents(body.actualCash);
        revenues=revenues.map(row=>row.id===body.shiftId ? {...row,actualCash:body.actualCash??null}:row);
        const report=buildPosShiftReport({...c,revenues},body.shiftId);
        revenues=revenues.map(row=>row.id===body.shiftId ? {...row,closingReport:report}:row);
      }
      result={ok:true,shiftId:body.shiftId,...(body.action==="close_shift" ? {report:readPosShiftReport({...c,revenues},body.shiftId)} : {})};
      accountingMonth=String(revenues.find(row=>row.id===body.shiftId)?.date).slice(0,7);
      updates=[[keys[3],revenues]];
    }
    const statements:D1PreparedStatement[]=[];
    for(const [key,value] of updates){
      statements.push(...(key===SALES_EVENT_STORE_KEY&&eventRevision!==null
        ?await salesEventStatements(db,{accountId:account.id,venueId:account.venueId},eventRevision,c.events,value as any[])
        :key==='bd_stock_movements'&&stockRevision!==null
        ?await saleStockStatements(db,{accountId:account.id,venueId:account.venueId},stockRevision,c.movements,value as any[])
        :await stockStoreStatements(db,account.id,key,value,c.now)));
    }
    statements.push(db.prepare(`INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
      VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?)`).bind(account.id,SALES_EVENT_STORE_KEY,body.action,body.command?.id ?? body.eventId ?? body.shiftId,"Продажи и смены",accountingMonth,JSON.stringify(eventRevision!==null?{action:body.action,eventId:(result as any).event?.id,status:(result as any).event?.status,revenue:(result as any).event?.revenue,revision:eventRevision+1}:result),'["status","revenue","movements"]',c.actor.name,c.actor.role,"Подтверждённая операция",c.now));
    statements.unshift(posMembershipGuard(db,account,c.now));
    await runStoreCasBatch(db,account.id,snapshots,statements,c.now);
    return reply(result,201);
  } catch(error) { return controlled(error); }
}

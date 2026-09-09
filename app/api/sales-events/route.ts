import { getD1 } from "../../../db";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission, type PermissionKey } from "../../../lib/bardoctor/access-control";
import { accountingCurrencyFromRestaurantJson } from "../../../lib/bardoctor/currency";
import { closedMonthsFromStore } from "../../../lib/bardoctor/data-trust";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import { readStoreSnapshots, runStoreCasBatch, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { SALES_EVENT_STORE_KEY, EVENT_REVENUE_SOURCE, planSalesEvent, planReverseSalesEvent, planSalesShift, type SalesEventContext, type SalesEventCommand } from "../../../lib/bardoctor/sales-events";

const keys = ["bd_assortment_v1","bd_stock_movements",SALES_EVENT_STORE_KEY,"bd_finance_revenue","bd_sales_mappings","bd_sales_warehouse_routes","bd_warehouses","bd_month_closings"];
const reply = (data: unknown,status=200) => Response.json(data,{ status,headers:{ "Cache-Control":"private, no-store" } });
async function load(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const db = getD1(), snapshots = await readStoreSnapshots(db,account.id,keys);
  const read = (key:string,fallback:unknown): unknown => { const raw = snapshots.find(s => s.key === key)?.dataJson; return raw == null ? fallback : JSON.parse(raw); };
  const rows = (key:string) => { const value=read(key,[]); if (!Array.isArray(value) || value.some(v => !v || typeof v !== "object" || Array.isArray(v))) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW"); return value; };
  const assortment = read(keys[0],{});
  if (!assortment || typeof assortment !== "object" || Array.isArray(assortment)) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW");
  const events = rows(SALES_EVENT_STORE_KEY);
  if (events.some(e => !e.id || !e.fingerprint || !e.batch || !Array.isArray(e.originalMovements) || !Array.isArray(e.prices) || !["POSTED","REVERSED"].includes(e.status))) throw new Error("SALES_EVENT_STORE_NEEDS_REVIEW");
  const context: SalesEventContext = { venueId:account.venueId,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson)||"",now:new Date().toISOString(),
    actor:{ accountId:account.actorAccountId,name:[account.firstName,account.lastName].filter(Boolean).join(" "),role:account.role },
    assortment:assortment as Record<string,unknown>,movements:rows(keys[1]),events,revenues:rows(keys[3]),mappings:rows(keys[4]),warehouseRoutes:rows(keys[5]),warehouses:rows(keys[6]),closedMonths:closedMonthsFromStore(read(keys[7],null)) };
  return { db,snapshots,context };
}
function controlled(error:unknown) {
  if (error instanceof SyntaxError) return reply({ok:false,code:"SALES_EVENT_STORE_NEEDS_REVIEW",error:"Данные требуют проверки. Ничего не изменено."},409);
  if (error instanceof Error && error.message.startsWith("SALES_EVENT_")) return reply({ok:false,code:error.message,error:"Продажа или смена требует проверки. Проверьте позиции, цены, состояние смены и ранее внесённую выручку. Ничего не изменено."},409);
  throw error;
}
export async function GET(request:Request) {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  if (!hasPermission(account,"sales.view")) return reply({ok:false,code:"ACCESS_DENIED"},403);
  try {
    const {context:c} = await load(account);
    const menu = Array.isArray(c.assortment.menuItems) ? c.assortment.menuItems : [];
    return reply({ok:true,venueId:c.venueId,currency:c.currency,
      menu:menu.filter(m => m && typeof m === "object" && (m.venueId == null || m.venueId === c.venueId) && m.active !== false && m.archived !== true)
        .map(m => ({id:m.id,name:m.name,salePrice:m.salePrice ?? null,currency:m.currency ?? c.currency})),
      shifts:c.revenues.filter(r => r.venueId === c.venueId && r.revenueSource === EVENT_REVENUE_SOURCE && r.closingStatus != null),
      events:c.events.filter(e => e.venueId === c.venueId).slice(-100).reverse(),
      permissions:{post:hasPermission(account,"sales.post") && hasPermission(account,"sales.create"),reverse:hasPermission(account,"sales.reverse"),shifts:hasPermission(account,"shifts.manage")} });
  } catch(error) { return controlled(error); }
}
export async function POST(request:Request):Promise<Response> { return withStoreCasRetries(request,command); }
async function command(request:Request):Promise<Response> {
  const account = await authenticateRequest(request); if (!account) return unauthorized();
  const parsed = await readJsonRequest<{action:string;venueId:number;command:SalesEventCommand;previewHash:string;eventId:string;shiftId:string;name:string}>(request,{maxBytes:100_000});
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const permissions:Record<string,PermissionKey> = {preview:"sales.create",post:"sales.post",reverse:"sales.reverse",open_shift:"shifts.manage",close_shift:"shifts.manage"};
  if (!permissions[body.action]) return reply({ok:false,code:"ACTION_INVALID"},422);
  if (!hasPermission(account,permissions[body.action]) || body.action === "post" && !hasPermission(account,"sales.create")) return reply({ok:false,code:"ACCESS_DENIED"},403);
  if (body.venueId !== account.venueId) return reply({ok:false,code:"VENUE_CHANGED"},409);
  try {
    const {db,snapshots,context:c} = await load(account);
    let updates: [string,unknown][], result:unknown;
    if (body.action === "preview" || body.action === "post") {
      const plan = await planSalesEvent(c,body.command);
      result = {ok:true,duplicate:plan.duplicate,event:plan.event,previewHash:plan.previewHash};
      if (body.action === "preview" || plan.duplicate) return reply(result);
      if (!body.previewHash || body.previewHash !== plan.previewHash) return reply({ok:false,code:"SALES_EVENT_PREVIEW_CHANGED",error:"Цена, рецептура или условия продажи изменились. Проверьте продажу ещё раз."},409);
      updates=[[keys[0],plan.assortment],[keys[1],plan.movements],[keys[2],plan.events],[keys[3],plan.revenues]];
    } else if (body.action === "reverse") {
      const plan=planReverseSalesEvent(c,body.eventId); result={ok:true,duplicate:plan.duplicate,event:plan.event};
      if (plan.duplicate) return reply(result);
      updates=[[keys[0],plan.assortment],[keys[1],plan.movements],[keys[2],plan.events],[keys[3],plan.revenues]];
    } else {
      const revenues=planSalesShift(c,body.action as "open_shift"|"close_shift",body.shiftId,body.name);
      result={ok:true,shiftId:body.shiftId}; if (revenues===c.revenues) return reply({...result as object,duplicate:true});
      updates=[[keys[3],revenues]];
    }
    const statements=updates.map(([key,value]) => db.prepare(`INSERT INTO domain_data (account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(account.id,key,JSON.stringify(value),c.now));
    statements.push(db.prepare(`INSERT INTO audit_log (account_id,store_key,action,entity_id,entity_label,month_key,before_json,after_json,changed_fields_json,actor_name,actor_role,reason,created_at)
      VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?)`).bind(account.id,SALES_EVENT_STORE_KEY,body.action,body.command?.id ?? body.eventId ?? body.shiftId,"Продажи и смены",c.now.slice(0,7),JSON.stringify(result),'["status","revenue","movements"]',c.actor.name,c.actor.role,"Подтверждённая операция",c.now));
    await runStoreCasBatch(db,account.id,snapshots,statements,c.now);
    return reply(result,201);
  } catch(error) { return controlled(error); }
}

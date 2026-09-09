import { createOrUpdateSalesBatch, postSalesBatch, reverseSalesBatch, SALES_SOURCES, type SalesBatch, type SalesSource } from "./sales-consumption";
import type { StockMovement } from "./inventory";

export const SALES_EVENT_STORE_KEY = "bd_sales_events_v1";
export const EVENT_REVENUE_SOURCE = "sales_events_v1";
type Row = Record<string, unknown>;
export type SalesEventCommand = { id: string; source: SalesSource; shiftId?: string; occurredAt?: string; lines: { id: string; menuItemId: string; quantity: number }[] };
export type SalesEvent = {
  id: string; externalId: string; source: SalesSource; venueId: number; fingerprint: string;
  status: "POSTED" | "REVERSED"; acceptedAt: string; reversedAt?: string; businessDate: string;
  shiftId?: string; revenueRowId: string; currency: string; revenue: number;
  prices: { lineId: string; menuItemId: string; name: string; quantity: number; unitPrice: number; total: number }[];
  batch: SalesBatch; originalMovements: StockMovement[];
};
export type SalesEventContext = {
  venueId: number; currency: string; now: string; actor: SalesBatch["createdBy"];
  assortment: Row; movements: StockMovement[]; events: SalesEvent[]; revenues: Row[];
  mappings: unknown[]; warehouseRoutes: unknown[]; warehouses: unknown[]; closedMonths: Set<string>;
};
export function stableSalesValue(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableSalesValue).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => JSON.stringify(k) + ":" + stableSalesValue(v)).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableSalesValue(value)));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,"0")).join("");
}
function fail(code: string): never { throw new Error("SALES_EVENT_" + code); }
function id(value: unknown): value is string { return typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= 160; }
function scoped(row: Row, venue: number) { return row.venueId == null || row.venueId === venue; }
function contextCheck(c: SalesEventContext) {
  if (!Number.isSafeInteger(c.venueId) || c.venueId <= 0 || !c.currency || !Number.isFinite(Date.parse(c.now))) fail("CONTEXT_INVALID");
  if (c.closedMonths.has(c.now.slice(0,7))) fail("MONTH_LOCKED");
  if (new Set(c.events.map(e => e.id)).size !== c.events.length) fail("HISTORY_NEEDS_REVIEW");
}
function revenueCheck(c: SalesEventContext, date: string) {
  if (c.revenues.some(r => scoped(r,c.venueId) && r.date === date && r.revenueSource !== EVENT_REVENUE_SOURCE)) fail("LEGACY_REVENUE_CONFLICT");
}
function shift(c: SalesEventContext, shiftId: string, date: string) {
  const matches = c.revenues.filter(r => r.id === shiftId && r.venueId === c.venueId);
  if (matches.length !== 1) fail("SHIFT_NOT_FOUND");
  const value = matches[0];
  if (value.date !== date || value.closingStatus !== "open") fail("SHIFT_CLOSED_OR_DATE_MISMATCH");
  if (value.revenueSource !== EVENT_REVENUE_SOURCE || value.currency !== c.currency) fail("SHIFT_NEEDS_REVIEW");
  return value;
}
function capacity(events: SalesEvent[]) {
  if (new TextEncoder().encode(JSON.stringify(events)).byteLength > 4_000_000) fail("HISTORY_CAPACITY_REQUIRES_REVIEW");
}
function project(c: SalesEventContext, events: SalesEvent[], rowId: string, date: string): Row[] {
  revenueCheck(c,date);
  const matching = c.revenues.filter(r => r.id === rowId && r.venueId === c.venueId);
  if (matching.length > 1) fail("REVENUE_NEEDS_REVIEW");
  if (!matching.length && c.events.some(e => e.venueId === c.venueId && e.revenueRowId === rowId)) fail("REVENUE_NEEDS_REVIEW");
  const active = events.filter(e => e.venueId === c.venueId && e.revenueRowId === rowId && e.status === "POSTED");
  const row = { ...(matching[0] ?? {}), id: rowId, venueId: c.venueId, date, accountingMonth: date.slice(0,7),
    shiftName: matching[0]?.shiftName ?? "Продажи без смены", revenueSource: EVENT_REVENUE_SOURCE, currency: c.currency,
    revenue: Math.round(active.reduce((sum,e) => sum + e.revenue,0)*100)/100, receipts: active.length,
    createdAt: matching[0]?.createdAt ?? c.now, updatedAt: c.now };
  return [...c.revenues.filter(r => !(r.id === rowId && r.venueId === c.venueId)), row];
}
export async function planSalesEvent(c: SalesEventContext, command: SalesEventCommand) {
  if (!command || !id(command.id) || !SALES_SOURCES.includes(command.source) || command.occurredAt != null
    || command.shiftId !== undefined && !id(command.shiftId)) fail("LIVE_COMMAND_REQUIRED");
  if (!Array.isArray(command.lines) || command.lines.length < 1 || command.lines.length > 100
    || command.lines.some(l => !l || !id(l.id) || !id(l.menuItemId) || typeof l.quantity !== "number" || !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > 1_000_000)
    || new Set(command.lines.map(l => l.id)).size !== command.lines.length) fail("LINES_INVALID");
  const normalized = { id: command.id, source: command.source, shiftId: command.shiftId,
    lines: command.lines.map(l => ({ id:l.id, menuItemId:l.menuItemId, quantity:l.quantity })) };
  const fingerprint = await digest(normalized);
  const eventId = "sales-event:" + await digest([c.venueId,command.source,command.id]);
  const existing = c.events.filter(e => e.id === eventId);
  if (existing.length > 1) fail("HISTORY_NEEDS_REVIEW");
  if (existing[0]) {
    if (existing[0].venueId !== c.venueId || existing[0].source !== command.source) fail("HISTORY_NEEDS_REVIEW");
    if (existing[0].fingerprint !== fingerprint) fail("IDEMPOTENCY_CONFLICT");
    return { duplicate:true, event:existing[0], events:c.events, assortment:c.assortment, movements:c.movements, revenues:c.revenues, previewHash:"" };
  }
  contextCheck(c);
  const date = c.now.slice(0,10);
  revenueCheck(c,date);
  if (command.shiftId) shift(c,command.shiftId,date);
  const menu = Array.isArray(c.assortment.menuItems) ? c.assortment.menuItems as Row[] : [];
  if (menu.some(m => !m || typeof m !== "object" || Array.isArray(m))) fail("MENU_NEEDS_REVIEW");
  const prices = command.lines.map(line => {
    const found = menu.filter(m => m.id === line.menuItemId && scoped(m,c.venueId) && m.active !== false && m.archived !== true);
    if (found.length !== 1) fail("MENU_NEEDS_REVIEW");
    const item = found[0], price = item.salePrice;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || (item.currency != null && item.currency !== c.currency)) fail("PRICE_NEEDS_REVIEW");
    const total = Math.round(price*line.quantity*100)/100;
    if (!Number.isSafeInteger(Math.round(total*100))) fail("PRICE_NEEDS_REVIEW");
    return { lineId:line.id, menuItemId:line.menuItemId, name:String(item.name ?? ""), quantity:line.quantity, unitPrice:price, total };
  });
  const common = { assortment:c.assortment, mappings:c.mappings, warehouseRoutes:c.warehouseRoutes, warehouses:c.warehouses,
    stockMovements:c.movements, venueId:c.venueId, actor:c.actor, now:c.now, costAsOf:c.now };
  const draft = createOrUpdateSalesBatch({ ...common, batches:[], batchId:eventId, draft:{ source:command.source, businessDate:date, shiftId:command.shiftId,
    lines:command.lines.map((l,i) => ({ ...l, rawName:prices[i].name })), warnings:[] } });
  if (!draft.ok || draft.batch.lines.some(l => l.processingStatus !== "READY")) fail("CONSUMPTION_NEEDS_REVIEW");
  const posted = postSalesBatch({ ...common, batches:draft.batches, batchId:eventId });
  if (!posted.ok || posted.batch.status !== "POSTED" || posted.postedNow !== prices.length) fail("CONSUMPTION_NEEDS_REVIEW");
  const event: SalesEvent = { id:eventId, externalId:command.id, source:command.source, venueId:c.venueId, fingerprint,
    status:"POSTED", acceptedAt:c.now, businessDate:date, shiftId:command.shiftId,
    revenueRowId:command.shiftId ?? `sales-events:${c.venueId}:${date}`, currency:c.currency,
    revenue:Math.round(prices.reduce((sum,p) => sum+p.total,0)*100)/100, prices, batch:posted.batch,
    originalMovements:posted.stockMovements.filter(m => m.salesBatchId === eventId && m.venueId === c.venueId) };
  const events = [...c.events,event]; capacity(events);
  const previewHash = await digest({ date, currency:c.currency, prices, shiftId:command.shiftId,
    recipes:posted.batch.lines.map(l => { const snapshot = l.recipeSnapshot!; return { ...snapshot, capturedAt:undefined }; }) });
  return { duplicate:false, event, events, assortment:posted.assortment, movements:posted.stockMovements,
    revenues:project(c,events,event.revenueRowId,date), previewHash };
}
export function planReverseSalesEvent(c: SalesEventContext, eventId: string) {
  const matches = c.events.filter(e => e.id === eventId && e.venueId === c.venueId);
  if (matches.length !== 1) fail("NOT_FOUND");
  const event = matches[0];
  if (event.status === "REVERSED") return { duplicate:true,event,events:c.events,assortment:c.assortment,movements:c.movements,revenues:c.revenues };
  contextCheck(c);
  if (c.closedMonths.has(event.businessDate.slice(0,7))) fail("MONTH_LOCKED");
  if (event.shiftId) shift(c,event.shiftId,event.businessDate);
  if (event.currency !== c.currency) fail("CURRENCY_CHANGED");
  // Durable event originals make reversal independent of ledger retention.
  const currentIds = new Set(c.movements.map(m => m.id));
  const movements = [...c.movements,...event.originalMovements.filter(m => !currentIds.has(m.id))];
  const reversed = reverseSalesBatch({ batches:[event.batch], batchId:event.id, assortment:c.assortment,
    stockMovements:movements, venueId:c.venueId, actor:c.actor, now:c.now });
  if (!reversed.ok) fail("REVERSAL_NEEDS_REVIEW");
  const next: SalesEvent = { ...event,status:"REVERSED",reversedAt:c.now };
  const events = c.events.map(e => e.id === event.id ? next : e); capacity(events);
  return { duplicate:false,event:next,events,assortment:reversed.assortment,movements:reversed.stockMovements,
    revenues:project(c,events,event.revenueRowId,event.businessDate) };
}
export function planSalesShift(c: SalesEventContext, action: "open_shift" | "close_shift", shiftId: string, name?: string) {
  if (!id(shiftId)) fail("SHIFT_ID_INVALID");
  contextCheck(c);
  const rows = c.revenues.filter(r => r.id === shiftId && r.venueId === c.venueId);
  if (rows.length > 1) fail("SHIFT_NEEDS_REVIEW");
  const existing = rows[0];
  if (action === "close_shift") {
    if (!existing || existing.revenueSource !== EVENT_REVENUE_SOURCE) fail("SHIFT_NOT_FOUND");
    if (c.closedMonths.has(String(existing.date).slice(0,7))) fail("MONTH_LOCKED");
    if (existing.closingStatus === "closed") return c.revenues;
    if (existing.closingStatus !== "open") fail("SHIFT_NEEDS_REVIEW");
    return c.revenues.map(r => r === existing ? { ...r,closingStatus:"closed",endTime:c.now.slice(11,16),closedAt:c.now,updatedAt:c.now } : r);
  }
  if (!id(name)) fail("SHIFT_NAME_INVALID");
  if (existing) {
    if (existing.revenueSource !== EVENT_REVENUE_SOURCE || existing.shiftName !== name) fail("IDEMPOTENCY_CONFLICT");
    return c.revenues;
  }
  const date = c.now.slice(0,10); revenueCheck(c,date);
  return [...c.revenues,{ id:shiftId,venueId:c.venueId,date,accountingMonth:date.slice(0,7),shiftName:name,
    revenueSource:EVENT_REVENUE_SOURCE,currency:c.currency,revenue:0,receipts:0,closingStatus:"open",startTime:c.now.slice(11,16),createdAt:c.now,updatedAt:c.now }];
}
/** Legacy writers may neither replace event totals nor add another daily total. */
export function eventRevenueMutation(before: unknown[], after: unknown[]): boolean {
  const managed = before.filter(v => v && typeof v === "object" && (v as Row).revenueSource === EVENT_REVENUE_SOURCE) as Row[];
  const incoming = after.filter(v => v && typeof v === "object") as Row[];
  return incoming.some(r => r.revenueSource === EVENT_REVENUE_SOURCE && !managed.some(m => stableSalesValue(m) === stableSalesValue(r)))
    || managed.some(m => incoming.filter(r => stableSalesValue(m) === stableSalesValue(r)).length !== 1)
    || incoming.some(r => r.revenueSource !== EVENT_REVENUE_SOURCE && managed.some(m => m.date === r.date && (r.venueId == null || r.venueId === m.venueId)));
}

import { posDiscountCents, validatePosDiscountSnapshot } from "./pos-discounts";
import { posShiftCashReport } from "./pos-shift-cash";
import { EVENT_REVENUE_SOURCE, type SalesEvent, type SalesEventContext } from "./sales-events";
import { canonicalVenueTimezone } from "./venue-time";
type Row = Record<string, unknown>;
type Context = Pick<SalesEventContext, "revenues" | "events" | "venueId">;
function fail(): never { throw new Error("POS_SHIFT_REPORT_NEEDS_REVIEW"); }
function row(value: unknown): Row | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null; }
function cents(value: unknown): number { try { return posDiscountCents(value); } catch { return fail(); } }
function moneyAdd(a: number, b: number): number { const n = cents(a) + cents(b); if (!Number.isSafeInteger(n)) fail(); return n / 100; }
function instant(value: unknown): string | null { return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null; }
function clock(value: unknown): string | null { return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : null; }
function actor(value: unknown) {
  const a = row(value);
  return a && Number.isSafeInteger(a.accountId) && Number(a.accountId) > 0 && typeof a.name === "string" && typeof a.role === "string"
    ? { accountId: Number(a.accountId), name: a.name, role: a.role, jobTitle: typeof a.jobTitle === "string" ? a.jobTitle : null } : null;
}
function shiftRow(c: Context, shiftId: string) {
  const matches = c.revenues.filter(r => r.id === shiftId && r.venueId === c.venueId && r.revenueSource === EVENT_REVENUE_SOURCE);
  if (matches.length !== 1 || !["open","closed"].includes(String(matches[0].closingStatus)) || typeof matches[0].currency !== "string") fail();
  return matches[0];
}
function eventPricing(event: SalesEvent) {
  const net = cents(event.revenue) / 100;
  if (!Array.isArray(event.prices) || event.prices.reduce((sum,p) => moneyAdd(sum,p.total),0) !== net) fail();
  if (event.grossAmount == null && event.discountAmount == null && event.netAmount == null) return { grossAmount: null, discountAmount: null, netAmount: net };
  const gross = cents(event.grossAmount), discount = cents(event.discountAmount);
  if (gross - discount !== cents(net) || cents(event.netAmount) !== cents(net)) fail();
  if (event.prices.reduce((sum,p) => moneyAdd(sum,p.grossTotal!),0) !== gross/100
    || event.prices.reduce((sum,p) => moneyAdd(sum,p.discountAmount!),0) !== discount/100
    || event.prices.some(p => cents(p.grossTotal) - cents(p.discountAmount) !== cents(p.total))) fail();
  if (event.discount) {
    try {
      const snapshot = validatePosDiscountSnapshot(event.discount);
      if (snapshot.venueId !== event.venueId || snapshot.currency !== event.currency || cents(snapshot.grossAmount) !== gross || cents(snapshot.discountAmount) !== discount
        || snapshot.lines.length !== event.prices.length || snapshot.lines.some(l => { const p=event.prices.find(p=>p.lineId===l.lineId); return !p || cents(p.grossTotal)!==cents(l.grossAmount) || cents(p.total)!==cents(l.netAmount); })) fail();
    } catch { fail(); }
  } else if (discount !== 0) fail();
  return { grossAmount: gross/100, discountAmount: discount/100, netAmount: net };
}
export function posSalesEventView(event: SalesEvent) {
  const pricing = eventPricing(event), discount = event.discount;
  return { id: event.id, externalId: event.externalId, source: event.source, venueId: event.venueId, status: event.status,
    acceptedAt: event.acceptedAt, reversedAt: event.reversedAt, businessDate: event.businessDate, timezone: event.timezone,
    shiftId: event.shiftId, currency: event.currency, revenue: event.revenue, comment: event.comment, ...pricing,
    discount: discount ? { ruleId: discount.ruleId, ruleRevision: discount.ruleRevision, name: discount.name, kind: discount.kind, value: discount.value, currency: discount.currency,
      appliedAt: discount.appliedAt, appliedBy: actor(discount.appliedBy), reason: discount.reason, ...pricing,
      lines: discount.lines.map(l => ({ lineId: l.lineId, grossAmount: l.grossAmount, discountAmount: l.discountAmount, netAmount: l.netAmount })) } : undefined,
    actor: actor(event.actor), orderId: event.orderId, orderActor: actor(event.orderActor), tableNumber: event.tableNumber,
    prices: event.prices.map(p => ({ lineId:p.lineId, menuItemId:p.menuItemId, name:p.name, quantity:p.quantity, unitPrice:p.unitPrice, total:p.total, grossTotal:p.grossTotal ?? null, discountAmount:p.discountAmount ?? null })),
    payments: event.payments?.map(p => ({ id:p.id, method:p.method, amount:p.amount })) };
}
export function posShiftView(shift: Row) {
  return { id:shift.id, venueId:shift.venueId, date:shift.date, timezone:shift.timezone, shiftName:shift.shiftName, currency:shift.currency,
    closingStatus:shift.closingStatus, startTime:shift.startTime, endTime:shift.endTime, openedAt:shift.openedAt ?? shift.createdAt, closedAt:shift.closedAt };
}
function aggregate() { return { paidRevenue:0, paidReceipts:0, reversedRevenue:0, reversedReceipts:0,
  paidGrossRevenue:0 as number|null, paidDiscountAmount:0 as number|null, paidPricingUnknownReceipts:0,
  reversedGrossRevenue:0 as number|null, reversedDiscountAmount:0 as number|null, reversedPricingUnknownReceipts:0 }; }
type Aggregate = ReturnType<typeof aggregate>;
function add(a: Aggregate, status: SalesEvent["status"], amount: number, pricing: ReturnType<typeof eventPricing>) {
  const p = status === "POSTED" ? "paid" : "reversed";
  a[`${p}Revenue`] = moneyAdd(a[`${p}Revenue`],amount); a[`${p}Receipts`]++;
  if (pricing.grossAmount == null || pricing.discountAmount == null) {
    a[`${p}PricingUnknownReceipts`]++; a[`${p}GrossRevenue`] = null; a[`${p}DiscountAmount`] = null;
  } else if (a[`${p}PricingUnknownReceipts`] === 0) {
    a[`${p}GrossRevenue`] = moneyAdd(a[`${p}GrossRevenue`]!,pricing.grossAmount); a[`${p}DiscountAmount`] = moneyAdd(a[`${p}DiscountAmount`]!,pricing.discountAmount);
  }
}
export function buildPosShiftReport(c: Context, shiftId: string) {
  const shift = shiftRow(c,shiftId), totals = aggregate();
  const employees = new Map<number|null, Aggregate & { accountId:number|null; name:string|null; role:string|null; jobTitle:string|null }>();
  const payments = new Map(["CASH","CARD_EXTERNAL","UNSPECIFIED"].map(method => [method,{ ...aggregate(),method }]));
  const events = c.events.filter(e=>e.venueId===c.venueId && (e.shiftId===shiftId || e.revenueRowId===shiftId));
  if (new Set(events.map(e=>e.id)).size!==events.length) fail();
  for (const sale of events) {
    if (sale.currency !== shift.currency || sale.businessDate !== shift.date || sale.revenueRowId !== shiftId || sale.shiftId != null && sale.shiftId !== shiftId || !["POSTED","REVERSED"].includes(sale.status)) fail();
    const pricing = eventPricing(sale), owner = actor(sale.orderActor) ?? actor(sale.actor) ?? actor(sale.batch?.createdBy), key = owner?.accountId ?? null;
    if (!employees.has(key)) employees.set(key,{...aggregate(),accountId:key,name:owner?.name??null,role:owner?.role??null,jobTitle:owner?.jobTitle??null});
    add(totals,sale.status,sale.revenue,pricing); add(employees.get(key)!,sale.status,sale.revenue,pricing);
    const tenders = sale.payments?.length ? sale.payments : [{id:"unknown",method:"UNSPECIFIED",amount:sale.revenue}];
    if (tenders.reduce((n,p)=>moneyAdd(n,p.amount),0)!==sale.revenue) fail();
    const byMethod = new Map<string,number>();
    for (const p of tenders) { if (!payments.has(p.method)) fail(); byMethod.set(p.method,moneyAdd(byMethod.get(p.method)??0,p.amount)); }
    for (const [method,amount] of byMethod) add(payments.get(method)!,sale.status,amount,byMethod.size===1 ? pricing : {grossAmount:null,discountAmount:null,netAmount:amount});
  }
  if (shift.revenue != null && cents(shift.revenue)!==cents(totals.paidRevenue) || shift.receipts != null && shift.receipts!==totals.paidReceipts) fail();
  return { version:1,shiftId,venueId:c.venueId,shiftName:String(shift.shiftName??""),businessDate:String(shift.date),timezone:canonicalVenueTimezone(shift.timezone)||"UTC",currency:String(shift.currency),status:shift.closingStatus as "open"|"closed",
    openedAt:instant(shift.openedAt)??instant(shift.createdAt),closedAt:instant(shift.closedAt),startTime:clock(shift.startTime),endTime:clock(shift.endTime),openedBy:actor(shift.openedBy),closedBy:actor(shift.closedBy),
    totals:{...totals,totalReceipts:totals.paidReceipts+totals.reversedReceipts,grossRevenue:moneyAdd(totals.paidRevenue,totals.reversedRevenue)},employees:[...employees.values()].sort((a,b)=>(a.accountId??Number.MAX_SAFE_INTEGER)-(b.accountId??Number.MAX_SAFE_INTEGER)),payments:[...payments.values()],
    cash:posShiftCashReport(shift,payments.get("CASH")!,payments.get("UNSPECIFIED")!.paidRevenue),costOfGoods:null,costStatus:"NOT_INCLUDED" };
}
export type PosShiftReport = ReturnType<typeof buildPosShiftReport>;
/** Closed reports are immutable historical snapshots; legacy missing fields remain unknown. */
export function readPosShiftReport(c: Context, shiftId: string): PosShiftReport {
  const shift=shiftRow(c,shiftId), saved=row(shift.closingReport);
  if (shift.closingStatus!=="closed" || !saved) return buildPosShiftReport(c,shiftId);
  if (saved.version!==1 || saved.shiftId!==shiftId || saved.venueId!==c.venueId || saved.status!=="closed" || saved.businessDate!==shift.date || saved.currency!==shift.currency || !row(saved.totals) || !Array.isArray(saved.employees) || !Array.isArray(saved.payments) || !row(saved.cash)) fail();
  const result=structuredClone(saved) as PosShiftReport;
  for (const a of [result.totals,...result.employees,...result.payments]) {
    for (const p of ["paid","reversed"] as const) {
      cents(a[`${p}Revenue`]);
      if (!Number.isSafeInteger(a[`${p}Receipts`]) || a[`${p}Receipts`]<0) fail();
      if (a[`${p}GrossRevenue`]===undefined || a[`${p}DiscountAmount`]===undefined) { a[`${p}GrossRevenue`]=null; a[`${p}DiscountAmount`]=null; a[`${p}PricingUnknownReceipts`]=a[`${p}Receipts`]; }
    }
  }
  return result;
}

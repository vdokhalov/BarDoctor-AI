import { canManagePosPrivilegedAction, isAccessRole } from "./access-control";
import { parsePosOrders, posOrderViews, type PosOrder, type PosOrderActor } from "./pos-orders";
import { posSalesEventView } from "./pos-shift-report";
import { EVENT_REVENUE_SOURCE, type SalesEvent, type SalesEventContext } from "./sales-events";
import { isStaffJobTitle, staffJobTitle, validStaffJobTitle, type StaffJobTitle } from "./staff-job-title";
import { canonicalVenueTimezone } from "./venue-time";

type Row = Record<string, unknown>;
export type PosOverviewMember = { accountId: number; name: string; role: string; jobTitle: StaffJobTitle | null };
type Owner = { accountId: number; name: string; role: string; jobTitle: StaffJobTitle | null };
type Pricing = { grossAmount: number | null; discountAmount: number | null; netAmount: number | null; currency: string };
type OpenCard = {
  id: string; tableNumber: string; status: "OPEN" | "PRECHECK"; revision: number; createdAt: string; updatedAt: string;
  waiter: Owner; comment: string; totals: Pricing; pricingStatus: "KNOWN" | "UNAVAILABLE";
  pricingBasis: "CURRENT_MENU" | "PRECHECK_SNAPSHOT" | "DISCOUNT_SNAPSHOT";
  lines: { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number | null; total: number | null }[];
};
type Receipt = Omit<ReturnType<typeof posSalesEventView>, "orderId" | "tableNumber"> & { waiter: Owner | null; ownershipBasis: string; orderId: string | null; tableNumber: string | null };
export type PosOverviewSummary = {
  openTableCount: number; openOrderCount: number; openNetAmount: number | null; openGrossAmount: number | null; openDiscountAmount: number | null; openPricingUnknownCount: number;
  paidCheckCount: number; paidNetAmount: number; paidGrossAmount: number | null; paidDiscountAmount: number | null; paidPricingUnknownCount: number;
  reversedCheckCount: number;
};
export type PosOverviewStaff = PosOverviewSummary & {
  accountId: number | null; name: string | null; role: string | null; jobTitle: StaffJobTitle | null;
  membershipStatus: "ACTIVE" | "HISTORICAL" | "UNKNOWN"; hasActivity: boolean; openOrders: OpenCard[]; paidReceipts: Receipt[];
};
export type PosLiveOverview = {
  venueId: number; serverNow: string; currency: string; activityBasis: "ORDERS_AND_SALES_NOT_ATTENDANCE";
  shift: { id: string; name: string; businessDate: string; status: "open" | "closed"; timezone: string; isLive: boolean };
  summary: PosOverviewSummary; staff: PosOverviewStaff[];
};
function fail(code = "STORE_NEEDS_REVIEW"): never { throw new Error("POS_OVERVIEW_" + code); }
function record(value: unknown): Row | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : null; }
function money(value: unknown): number {
  if (typeof value !== "number" || value < 0 || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) fail();
  return Math.round(value * 100);
}
function add(left: number, right: number): number { const total = money(left) + money(right); if (!Number.isSafeInteger(total)) fail(); return total / 100; }
function capturedOwner(value: unknown): Owner | null {
  const actor = record(value);
  if (!actor || !Number.isSafeInteger(actor.accountId) || Number(actor.accountId) <= 0 || typeof actor.name !== "string" || typeof actor.role !== "string") return null;
  return { accountId: Number(actor.accountId), name: actor.name, role: actor.role,
    jobTitle: actor.role === "cashier" && isStaffJobTitle(actor.jobTitle) ? actor.jobTitle : null };
}
function emptySummary(): PosOverviewSummary {
  return { openTableCount: 0, openOrderCount: 0, openNetAmount: 0, openGrossAmount: 0, openDiscountAmount: 0, openPricingUnknownCount: 0,
    paidCheckCount: 0, paidNetAmount: 0, paidGrossAmount: 0, paidDiscountAmount: 0, paidPricingUnknownCount: 0, reversedCheckCount: 0 };
}
function currentPricing(order: PosOrder, currency: string): Pricing {
  if (order.lines.some(line => line.pricingUnavailable || line.currency !== currency)) return { grossAmount: null, discountAmount: null, netAmount: null, currency };
  const gross = order.lines.reduce((sum, line) => add(sum, line.total), 0);
  if (order.discount) return { grossAmount: order.discount.grossAmount, discountAmount: order.discount.discountAmount, netAmount: order.discount.netAmount, currency };
  // Operational, unpaid drafts have no hidden discount when their saved discount is absent.
  return { grossAmount: gross, discountAmount: 0, netAmount: gross, currency };
}
function openCard(order: PosOrder, currency: string): OpenCard {
  const waiter = capturedOwner(order.createdBy); if (!waiter) fail();
  const totals = currentPricing(order, currency);
  return { id: order.id, tableNumber: order.tableNumber, status: order.precheck ? "PRECHECK" : "OPEN", revision: order.revision,
    createdAt: order.createdAt, updatedAt: order.updatedAt, waiter, comment: order.comment, totals,
    pricingStatus: totals.netAmount == null ? "UNAVAILABLE" : "KNOWN",
    pricingBasis: order.discount ? "DISCOUNT_SNAPSHOT" : order.precheck ? "PRECHECK_SNAPSHOT" : "CURRENT_MENU",
    lines: order.lines.map(line => ({ id: line.id, menuItemId: line.menuItemId, name: line.name, quantity: line.quantity,
      unitPrice: line.pricingUnavailable || line.currency !== currency ? null : line.unitPrice,
      total: line.pricingUnavailable || line.currency !== currency ? null : line.total })) };
}
function addOpen(summary: PosOverviewSummary, card: OpenCard) {
  summary.openOrderCount++;
  if (card.totals.netAmount == null || card.totals.grossAmount == null || card.totals.discountAmount == null) {
    summary.openPricingUnknownCount++; summary.openNetAmount = null; summary.openGrossAmount = null; summary.openDiscountAmount = null;
  } else if (summary.openPricingUnknownCount === 0) {
    summary.openNetAmount = add(summary.openNetAmount!, card.totals.netAmount);
    summary.openGrossAmount = add(summary.openGrossAmount!, card.totals.grossAmount);
    summary.openDiscountAmount = add(summary.openDiscountAmount!, card.totals.discountAmount);
  }
}
function addPaid(summary: PosOverviewSummary, receipt: Receipt) {
  summary.paidCheckCount++; summary.paidNetAmount = add(summary.paidNetAmount, receipt.revenue);
  if (receipt.grossAmount == null || receipt.discountAmount == null) {
    summary.paidPricingUnknownCount++; summary.paidGrossAmount = null; summary.paidDiscountAmount = null;
  } else if (summary.paidPricingUnknownCount === 0) {
    summary.paidGrossAmount = add(summary.paidGrossAmount!, receipt.grossAmount);
    summary.paidDiscountAmount = add(summary.paidDiscountAmount!, receipt.discountAmount);
  }
}

/** A read model of this shift's orders and canonical sales, never an attendance list or closing writer. */
export function buildPosLiveOverview(c: SalesEventContext, ordersValue: unknown, members: PosOverviewMember[], shiftId: string): PosLiveOverview {
  if (!canManagePosPrivilegedAction(c.actor)) fail("ACCESS_DENIED");
  if (typeof shiftId !== "string" || !shiftId.trim() || shiftId !== shiftId.trim() || shiftId.length > 160) fail("SHIFT_INVALID");
  const shifts = c.revenues.filter(value => value.id === shiftId && value.venueId === c.venueId && value.revenueSource === EVENT_REVENUE_SOURCE);
  if (shifts.length !== 1) fail(shifts.length ? "STORE_NEEDS_REVIEW" : "SHIFT_NOT_FOUND");
  const shift = shifts[0];
  if (!["open", "closed"].includes(String(shift.closingStatus)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(shift.date)) || typeof shift.currency !== "string" || !shift.currency) fail();
  const currency = shift.currency;
  const orders = parsePosOrders(ordersValue).filter(order => order.venueId === c.venueId && order.shiftId === shiftId);
  const events = c.events.filter(event => event.venueId === c.venueId && (event.shiftId === shiftId || event.revenueRowId === shiftId));
  if (new Set(events.map(event => event.id)).size !== events.length) fail();
  const paidOrders = orders.filter(order => order.status === "PAID");
  if (new Set(paidOrders.map(order => order.salesEventId)).size !== paidOrders.length
    || paidOrders.some(order => !events.some(event => event.id === order.salesEventId))) fail("HISTORY_NEEDS_REVIEW");
  const staff = new Map<number | null, PosOverviewStaff>();
  const summary = emptySummary();
  const allTables = new Set<string>();
  for (const member of members) {
    if (!Number.isSafeInteger(member.accountId) || member.accountId <= 0 || staff.has(member.accountId) || typeof member.name !== "string"
      || !isAccessRole(member.role) || !validStaffJobTitle(member.role, member.jobTitle)) fail("ROSTER_NEEDS_REVIEW");
    staff.set(member.accountId, { ...emptySummary(), accountId: member.accountId, name: member.name, role: member.role,
      jobTitle: staffJobTitle(member.role, member.jobTitle), membershipStatus: "ACTIVE", hasActivity: false, openOrders: [], paidReceipts: [] });
  }
  const employee = (owner: Owner | null) => {
    const key = owner?.accountId ?? null;
    if (!staff.has(key)) staff.set(key, { ...emptySummary(), accountId: key, name: owner?.name ?? null, role: owner?.role ?? null,
      jobTitle: owner?.jobTitle ?? null, membershipStatus: owner ? "HISTORICAL" : "UNKNOWN", hasActivity: false, openOrders: [], paidReceipts: [] });
    return staff.get(key)!;
  };
  const views = posOrderViews({ ...c, currency }, orders.filter(order => order.status === "OPEN"));
  for (const order of views) {
    const card = openCard(order, currency), owner = employee(card.waiter);
    owner.openOrders.push(card); owner.hasActivity = true; allTables.add(card.tableNumber);
    addOpen(summary, card); addOpen(owner, card);
  }
  for (const event of events) {
    if (!["POSTED", "REVERSED"].includes(event.status) || event.currency !== currency || event.businessDate !== shift.date
      || event.revenueRowId !== shiftId || event.shiftId != null && event.shiftId !== shiftId) fail();
    const attributed = event as SalesEvent & { orderId?: string; orderActor?: PosOrderActor; tableNumber?: string };
    const linked = orders.filter(order => order.salesEventId === event.id || order.id === attributed.orderId);
    if (linked.length > 1 || attributed.orderId != null && !linked.length
      || linked[0] && (linked[0].status !== "PAID" || linked[0].salesEventId !== event.id)) fail("HISTORY_NEEDS_REVIEW");
    let waiter: Owner | null = null, ownershipBasis = "UNKNOWN";
    if (linked[0]) {
      waiter = capturedOwner(linked[0].createdBy); ownershipBasis = "ORDER_CREATOR";
      const original = capturedOwner(attributed.orderActor);
      if (original && original.accountId !== waiter?.accountId) fail("HISTORY_NEEDS_REVIEW");
    } else if (attributed.orderId != null || attributed.orderActor != null) {
      waiter = capturedOwner(attributed.orderActor); ownershipBasis = waiter ? "EVENT_ORDER_ACTOR" : "UNKNOWN";
    } else {
      waiter = capturedOwner(event.actor) ?? capturedOwner(event.batch?.createdBy);
      ownershipBasis = waiter ? event.actor ? "DIRECT_SALE_ACTOR" : "LEGACY_BATCH_CREATOR" : "UNKNOWN";
    }
    const owner = employee(waiter); owner.hasActivity = true;
    if (event.status === "REVERSED") { summary.reversedCheckCount++; owner.reversedCheckCount++; continue; }
    const safe = posSalesEventView(event);
    const receipt: Receipt = { ...safe, waiter, ownershipBasis, orderId: linked[0]?.id ?? attributed.orderId ?? null,
      tableNumber: linked[0]?.tableNumber ?? (typeof attributed.tableNumber === "string" ? attributed.tableNumber : null) };
    owner.paidReceipts.push(receipt); addPaid(summary, receipt); addPaid(owner, receipt);
  }
  // A damaged/missing event store must not turn recorded paid activity into successful zeros.
  if (shift.revenue != null && money(shift.revenue) !== money(summary.paidNetAmount)
    || shift.receipts != null && shift.receipts !== summary.paidCheckCount) fail("HISTORY_NEEDS_REVIEW");
  summary.openTableCount = allTables.size;
  const rows = [...staff.values()];
  for (const row of rows) {
    row.openTableCount = new Set(row.openOrders.map(order => order.tableNumber)).size;
    row.openOrders.sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    row.paidReceipts.sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt) || a.id.localeCompare(b.id));
  }
  rows.sort((a, b) => Number(b.membershipStatus === "ACTIVE") - Number(a.membershipStatus === "ACTIVE") || Number(a.accountId == null) - Number(b.accountId == null)
    || String(a.name ?? "").localeCompare(String(b.name ?? ""), "ru") || (a.accountId ?? 0) - (b.accountId ?? 0));
  return { venueId: c.venueId, serverNow: c.now, currency, activityBasis: "ORDERS_AND_SALES_NOT_ATTENDANCE",
    shift: { id: shiftId, name: String(shift.shiftName ?? ""), businessDate: String(shift.date), status: shift.closingStatus as "open" | "closed",
      timezone: canonicalVenueTimezone(shift.timezone) || "UTC", isLive: shift.closingStatus === "open" }, summary, staff: rows };
}

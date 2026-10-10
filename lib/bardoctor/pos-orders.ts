import { capturePosDiscount, posDiscountCents, validatePosDiscountSnapshot, type PosDiscountRule, type PosDiscountSnapshot, type PosDiscountTotals } from "./pos-discounts";
import { canManagePosPrivilegedAction, type AccessRole } from "./access-control";
import { EVENT_REVENUE_SOURCE, planSalesEvent, stableSalesValue, type PosPayment, type SalesEvent, type SalesEventContext } from "./sales-events";

/** Operational drafts only. Revenue and captured COGS belong exclusively to sales events. */
export const POS_ORDER_STORE_KEY = "bd_pos_orders_v1";
export type PosOrderActor = SalesEventContext["actor"];
export type PosOrderLine = { id: string; menuItemId: string; quantity: number; name: string; unitPrice: number; total: number; currency: string; pricingUnavailable?: boolean; grossTotal?: number; discountAmount?: number };
export type PosOrderOperation = { id: string; action: string; fingerprint: string; at: string; actor: PosOrderActor; details: Record<string, unknown> };
export type PosOrder = {
  id: string; venueId: number; shiftId: string; tableNumber: string; status: "OPEN" | "PAID" | "CANCELLED"; revision: number;
  lines: PosOrderLine[]; comment: string; createdAt: string; updatedAt: string; createdBy: PosOrderActor; updatedBy: PosOrderActor;
  precheck: { id: string; issuedAt: string; issuedBy: PosOrderActor; revision: number } | null;
  parentOrderId?: string; salesEventId?: string; paidAt?: string; paidBy?: PosOrderActor; cancelledAt?: string;
  discount?: PosDiscountSnapshot | null; totals?: PosDiscountTotals;
  operations: PosOrderOperation[];
};
export type PosOrderCommand = {
  action: "create" | "add_items" | "cancel_item" | "cancel_order" | "precheck" | "cancel_precheck" | "split" | "preview_payment" | "pay" | "apply_discount" | "remove_discount";
  operationId: string; orderId: string; expectedRevision: number;
  shiftId?: string; tableNumber?: string; comment?: string;
  lines?: { id?: string; menuItemId?: string; lineId?: string; quantity: number }[];
  lineId?: string; quantity?: number; reason?: string; newOrderId?: string;
  ruleId?: string; ruleRevision?: number;
  payment?: PosPayment; previewHash?: string;
};
type SalesPlan = Awaited<ReturnType<typeof planSalesEvent>>;
export type PosOrderPlan = { orders: PosOrder[]; order: PosOrder; duplicate: boolean; event?: SalesEvent; previewHash?: string; salesPlan?: SalesPlan };
export type PosOrderContext = SalesEventContext & { discountRules?: PosDiscountRule[] };
const actions = new Set(["create", "add_items", "cancel_item", "cancel_order", "precheck", "cancel_precheck", "split", "preview_payment", "pay", "apply_discount", "remove_discount"]);
const privileged = new Set(["cancel_item", "cancel_order", "cancel_precheck", "split", "apply_discount", "remove_discount"]);
function fail(code: string): never { throw new Error("POS_ORDER_" + code); }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const identifier = (value: unknown): value is string => typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= 120;
const quantity = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 999;
const actor = (value: unknown): value is PosOrderActor => record(value) && Number.isSafeInteger(value.accountId) && Number(value.accountId) > 0 && typeof value.name === "string" && typeof value.role === "string";
const instant = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
function table(value: unknown): string {
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value) || Number(value) < 1) fail("TABLE_INVALID");
  return String(Number(value));
}
function priceLine(c: SalesEventContext, line: { id: string; menuItemId: string; quantity: number }): PosOrderLine {
  const items = Array.isArray(c.assortment.menuItems) ? c.assortment.menuItems : [];
  const matches = items.filter(value => record(value) && value.id === line.menuItemId && (value.venueId == null || value.venueId === c.venueId) && value.active !== false && value.archived !== true);
  if (matches.length !== 1) fail("MENU_NEEDS_REVIEW");
  const item = matches[0] as Record<string, unknown>, unitPrice = item.salePrice;
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0 || item.currency != null && item.currency !== c.currency
    || !Number.isSafeInteger(Math.round(unitPrice * 100)) || Math.abs(unitPrice * 100 - Math.round(unitPrice * 100)) > 0.000001) fail("PRICE_NEEDS_REVIEW");
  const total = Math.round(unitPrice * line.quantity * 100) / 100;
  if (!Number.isSafeInteger(Math.round(total * 100))) fail("PRICE_NEEDS_REVIEW");
  return { id: line.id, menuItemId: line.menuItemId, quantity: line.quantity, name: String(item.name ?? ""), unitPrice, total, currency: c.currency };
}
function assertShiftOpen(c: SalesEventContext, shiftId: string) {
  const matches = c.revenues.filter(row => row.id === shiftId && row.venueId === c.venueId);
  if (matches.length !== 1) fail("SHIFT_NOT_FOUND");
  const row = matches[0];
  if (row.closingStatus !== "open") fail("SHIFT_CLOSED");
  if (row.revenueSource !== EVENT_REVENUE_SOURCE || row.currency !== c.currency || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) fail("SHIFT_NEEDS_REVIEW");
  if (c.closedMonths.has(String(row.date).slice(0, 7))) throw new Error("SALES_EVENT_MONTH_LOCKED");
}
function totals(lines: PosOrderLine[], currency: string): PosDiscountTotals {
  const cents = lines.reduce((sum, line) => { const next = sum + posDiscountCents(line.total); if (!Number.isSafeInteger(next)) fail("PRICE_NEEDS_REVIEW"); return next; }, 0);
  return { grossAmount: cents / 100, discountAmount: 0, netAmount: cents / 100, currency };
}
function discountTotals(discount: PosDiscountSnapshot): PosDiscountTotals {
  return { grossAmount: discount.grossAmount, discountAmount: discount.discountAmount, netAmount: discount.netAmount, currency: discount.currency };
}
function assertFrozenPrices(c: SalesEventContext, order: PosOrder): PosOrderLine[] {
  const current = order.lines.map(line => priceLine(c, line));
  if (order.discount && stableSalesValue(current) !== stableSalesValue(order.lines)) fail("DISCOUNT_PRICE_CHANGED");
  if (order.precheck && stableSalesValue(current) !== stableSalesValue(order.lines)) fail("PRECHECK_CHANGED");
  return current;
}
export function parsePosOrders(value: unknown): PosOrder[] {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("STORE_NEEDS_REVIEW");
  const ids = new Set<string>(), operationIds = new Set<string>();
  for (const order of value) {
    if (!record(order) || !identifier(order.id) || ids.has(order.id) || !Number.isSafeInteger(order.venueId) || Number(order.venueId) <= 0
      || !identifier(order.shiftId) || typeof order.tableNumber !== "string" || !/^[1-9]\d{0,3}$/.test(order.tableNumber)
      || !["OPEN", "PAID", "CANCELLED"].includes(String(order.status)) || !Number.isSafeInteger(order.revision) || Number(order.revision) < 1
      || !Array.isArray(order.lines) || order.lines.length > 100 || !Array.isArray(order.operations) || !order.operations.length
      || !actor(order.createdBy) || !actor(order.updatedBy) || !instant(order.createdAt) || !instant(order.updatedAt)
      || typeof order.comment !== "string" || order.comment.length > 500) fail("STORE_NEEDS_REVIEW");
    ids.add(order.id);
    const lineIds = new Set<string>();
    for (const line of order.lines) {
      if (!record(line) || !identifier(line.id) || lineIds.has(line.id) || !identifier(line.menuItemId) || !quantity(line.quantity)
        || typeof line.name !== "string" || typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice) || line.unitPrice < 0
        || typeof line.total !== "number" || !Number.isFinite(line.total) || line.total < 0 || typeof line.currency !== "string") fail("STORE_NEEDS_REVIEW");
      lineIds.add(line.id);
    }
    try {
      if (order.totals !== undefined) {
        if (!record(order.totals) || typeof order.totals.currency !== "string"
          || posDiscountCents(order.totals.grossAmount) - posDiscountCents(order.totals.discountAmount) !== posDiscountCents(order.totals.netAmount)) fail("STORE_NEEDS_REVIEW");
      }
      if (order.discount != null) {
        const discount = validatePosDiscountSnapshot(order.discount);
        if (discount.venueId !== order.venueId || stableSalesValue(order.totals) !== stableSalesValue(discountTotals(discount))
          || discount.lines.length !== order.lines.length || discount.lines.some(part => {
            const line = (order.lines as unknown[]).find(line => record(line) && line.id === part.lineId) as PosOrderLine | undefined;
            return !line || line.currency !== discount.currency || posDiscountCents(order.status === "PAID" ? line.grossTotal : line.total) !== posDiscountCents(part.grossAmount)
              || order.status === "PAID" && (posDiscountCents(line.total) !== posDiscountCents(part.netAmount) || posDiscountCents(line.discountAmount) !== posDiscountCents(part.discountAmount));
          })) fail("STORE_NEEDS_REVIEW");
      }
    } catch { fail("STORE_NEEDS_REVIEW"); }
    if (order.precheck !== null && (!record(order.precheck) || !identifier(order.precheck.id) || !instant(order.precheck.issuedAt)
      || !actor(order.precheck.issuedBy) || !Number.isSafeInteger(order.precheck.revision))) fail("STORE_NEEDS_REVIEW");
    if (order.status === "PAID" && (typeof order.salesEventId !== "string" || !actor(order.paidBy) || !instant(order.paidAt))) fail("STORE_NEEDS_REVIEW");
    if (order.status === "CANCELLED" && !instant(order.cancelledAt)) fail("STORE_NEEDS_REVIEW");
    for (const operation of order.operations) {
      if (!record(operation) || !identifier(operation.id) || operationIds.has(operation.id) || typeof operation.fingerprint !== "string"
        || typeof operation.action !== "string" || !instant(operation.at) || !actor(operation.actor) || !record(operation.details)) fail("STORE_NEEDS_REVIEW");
      operationIds.add(operation.id);
    }
  }
  return value as PosOrder[];
}
export function assertPosShiftClosable(orders: PosOrder[], venueId: number, shiftId: string): void {
  if (orders.some(order => order.venueId === venueId && order.shiftId === shiftId && order.status === "OPEN")) fail("SHIFT_HAS_OPEN_ORDERS");
}
/** Management sees venue history; POS staff see their authored or collected receipts only. */
export function canReadPosSaleHistory(viewer: PosOrderActor, event: unknown): boolean {
  if (canManagePosPrivilegedAction({ role: viewer.role as AccessRole })) return true;
  if (!record(event)) return false;
  const original = record(event.orderActor) ? event.orderActor : null;
  const payer = record(event.actor) ? event.actor : null;
  const batch = record(event.batch) ? event.batch : null;
  const legacy = !payer && batch && record(batch.createdBy) ? batch.createdBy : null;
  return [original?.accountId, payer?.accountId, legacy?.accountId].some(id => id === viewer.accountId);
}
function canReadOrder(viewer: PosOrderActor, order: PosOrder): boolean {
  return order.status === "OPEN" || canManagePosPrivilegedAction({ role: viewer.role as AccessRole })
    || order.createdBy.accountId === viewer.accountId || order.paidBy?.accountId === viewer.accountId;
}
/** Draft display prices can refresh; an issued non-fiscal precheck is immutable until cancelled. */
export function posOrderViews(c: SalesEventContext, orders: PosOrder[]): PosOrder[] {
  return orders.filter(order => order.venueId === c.venueId && canReadOrder(c.actor, order)).map(order => {
    if (order.status !== "OPEN") return order;
    if (order.precheck || order.discount) return { ...order, lines: order.lines.map(line => {
      try { priceLine(c,line); return line; } catch { return { ...line, pricingUnavailable:true }; }
    }) };
    const lines = order.lines.map(line => { try { return priceLine(c, line); } catch { return { ...line, pricingUnavailable: true }; } });
    return { ...order, lines, totals: totals(lines, c.currency) };
  });
}
function normalize(c: PosOrderCommand): Record<string, unknown> {
  if (!record(c) || !actions.has(c.action) || !identifier(c.operationId) || !identifier(c.orderId)
    || !Number.isSafeInteger(c.expectedRevision) || c.expectedRevision < 0) fail("COMMAND_INVALID");
  const base: Record<string, unknown> = { action: c.action, operationId: c.operationId, orderId: c.orderId, expectedRevision: c.expectedRevision };
  if (c.action === "create" || c.action === "add_items") {
    if (c.action === "create") {
      if (!identifier(c.shiftId) || c.expectedRevision !== 0 || c.comment != null && (typeof c.comment !== "string" || c.comment.length > 500)) fail("COMMAND_INVALID");
      Object.assign(base, { shiftId: c.shiftId, tableNumber: table(c.tableNumber), comment: c.comment?.trim() ?? "" });
    }
    const lines = c.lines ?? (c.action === "create" ? [] : undefined);
    if (!Array.isArray(lines) || lines.length > 100 || c.action === "add_items" && lines.length === 0
      || lines.some(line => !record(line) || !identifier(line.id) || !identifier(line.menuItemId) || !quantity(line.quantity))
      || new Set(lines.map(line => line.id)).size !== lines.length) fail("LINES_INVALID");
    base.lines = lines.map(line => ({ id: line.id, menuItemId: line.menuItemId, quantity: line.quantity }));
  }
  if (["cancel_item", "cancel_order", "cancel_precheck", "apply_discount", "remove_discount"].includes(c.action)) {
    if (typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 500) fail("REASON_REQUIRED");
    base.reason = c.reason.trim();
  }
  if (c.action === "apply_discount") {
    if (!identifier(c.ruleId) || !Number.isSafeInteger(c.ruleRevision) || Number(c.ruleRevision) < 1) fail("DISCOUNT_RULE_INVALID");
    Object.assign(base, { ruleId: c.ruleId, ruleRevision: c.ruleRevision });
  }
  if (["discount", "totals", "discountAmount", "grossAmount", "netAmount"].some(key => Object.hasOwn(c, key))) fail("DISCOUNT_FIELDS_FORBIDDEN");
  if (c.action === "cancel_item") {
    if (!identifier(c.lineId) || c.quantity !== undefined && !quantity(c.quantity)) fail("LINES_INVALID");
    Object.assign(base, { lineId: c.lineId, quantity: c.quantity });
  }
  if (c.action === "split") {
    if (!identifier(c.newOrderId) || c.newOrderId === c.orderId || !Array.isArray(c.lines) || !c.lines.length || c.lines.length > 100
      || c.lines.some(line => !record(line) || !identifier(line.lineId) || !quantity(line.quantity))
      || new Set(c.lines.map(line => line.lineId)).size !== c.lines.length) fail("SPLIT_INVALID");
    Object.assign(base, { newOrderId: c.newOrderId, lines: c.lines.map(line => ({ lineId: line.lineId, quantity: line.quantity })), ...(c.tableNumber === undefined ? {} : { tableNumber: table(c.tableNumber) }) });
  }
  if (c.action === "pay" || c.action === "preview_payment") {
    if (!record(c.payment) || !identifier(c.payment.id) || !["CASH", "CARD_EXTERNAL"].includes(c.payment.method)
      || typeof c.payment.amount !== "number" || c.payment.amount < 0 || !Number.isSafeInteger(Math.round(c.payment.amount * 100))
      || Math.abs(c.payment.amount * 100 - Math.round(c.payment.amount * 100)) > 0.000001) fail("PAYMENT_INVALID");
    base.payment = { id: c.payment.id, method: c.payment.method, amount: c.payment.amount };
    if (c.action === "pay") base.previewHash = c.previewHash;
  }
  return base;
}
async function operationFingerprint(details: Record<string, unknown>): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableSalesValue(details)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
function saveOperation(order: PosOrder, c: SalesEventContext, command: PosOrderCommand, details: Record<string, unknown>, fingerprint: string): PosOrder {
  return { ...order, updatedAt: c.now, updatedBy: { ...c.actor }, operations: [...order.operations, {
    id: command.operationId, action: command.action, fingerprint, at: c.now, actor: { ...c.actor }, details,
  }] };
}
export async function planPosOrder(c: PosOrderContext, existing: PosOrder[], command: PosOrderCommand): Promise<PosOrderPlan> {
  const details = normalize(command), fingerprint = await operationFingerprint(details), orders = parsePosOrders(existing);
  if (!actor(c.actor) || !Number.isSafeInteger(c.venueId) || c.venueId <= 0 || !c.currency || !instant(c.now)) fail("CONTEXT_INVALID");
  if (privileged.has(command.action) && !canManagePosPrivilegedAction({ role: c.actor.role as AccessRole })) fail("ACCESS_DENIED");
  const seenOrder = orders.find(order => order.operations.some(operation => operation.id === command.operationId));
  if (seenOrder) {
    if (!canReadOrder(c.actor, seenOrder)) fail("NOT_FOUND");
    const seen = seenOrder.operations.find(operation => operation.id === command.operationId)!;
    if (seenOrder.venueId !== c.venueId || seenOrder.id !== command.orderId || seen.fingerprint !== fingerprint) fail("IDEMPOTENCY_CONFLICT");
    const event = seenOrder.salesEventId ? c.events.find(event => event.id === seenOrder.salesEventId && event.venueId === c.venueId) : undefined;
    if (seen.action === "pay" && !event) fail("STORE_NEEDS_REVIEW");
    return { orders, order: seenOrder, duplicate: true, ...(seen.action === "pay" ? { event } : {}) };
  }
  let order = orders.find(order => order.id === command.orderId && order.venueId === c.venueId);
  if (command.action === "create") {
    if (orders.some(order => order.id === command.orderId)) fail("ID_CONFLICT");
    assertShiftOpen(c, command.shiftId!);
    order = { id: command.orderId, venueId: c.venueId, shiftId: command.shiftId!, tableNumber: String(details.tableNumber), status: "OPEN", revision: 1,
      lines: (details.lines as { id: string; menuItemId: string; quantity: number }[]).map(line => priceLine(c, line)), comment: String(details.comment),
      createdAt: c.now, updatedAt: c.now, createdBy: { ...c.actor }, updatedBy: { ...c.actor }, precheck: null, discount: null, operations: [] };
    order.totals = totals(order.lines, c.currency);
  } else {
    if (!order || !canReadOrder(c.actor, order)) fail("NOT_FOUND");
    if (order.revision !== command.expectedRevision) fail("REVISION_CONFLICT");
    if (order.status !== "OPEN") fail("NOT_OPEN");
    assertShiftOpen(c, order.shiftId);
    if (order.precheck && ["add_items", "cancel_item", "split", "precheck", "apply_discount", "remove_discount"].includes(command.action)) fail("PRECHECK_LOCKED");
    if (order.discount && ["add_items", "cancel_item", "split"].includes(command.action)) fail(command.action === "split" ? "SPLIT_DISCOUNTED" : "DISCOUNT_LOCKED");
    order = { ...order, revision: order.revision + 1 };
    if (command.action === "add_items") {
      const incoming = details.lines as { id: string; menuItemId: string; quantity: number }[];
      if (incoming.some(line => order!.lines.some(current => current.id === line.id)) || order.lines.length + incoming.length > 100) fail("LINES_INVALID");
      order.lines = [...order.lines, ...incoming].map(line => priceLine(c, line));
    } else if (command.action === "cancel_item") {
      const target = order.lines.find(line => line.id === command.lineId);
      if (!target || command.quantity !== undefined && command.quantity > target.quantity) fail("LINES_INVALID");
      const removed = command.quantity ?? target.quantity;
      order.lines = order.lines.flatMap(line => line.id !== target.id ? [line] : line.quantity === removed ? [] : [priceLine(c, { ...line, quantity: line.quantity - removed })]);
    } else if (command.action === "apply_discount") {
      if (!order.lines.length) fail("EMPTY");
      const current = order.lines.map(line => priceLine(c, line));
      const discount = capturePosDiscount(c, c.discountRules ?? [], command.ruleId!, command.ruleRevision!, String(details.reason),
        current.map(line => ({ lineId: line.id, grossAmount: line.total })));
      details.previousDiscount = order.discount ?? null;
      details.discount = discount;
      order = { ...order, lines: current, discount, totals: discountTotals(discount) };
    } else if (command.action === "remove_discount") {
      if (!order.discount) fail("DISCOUNT_NOT_FOUND");
      details.previousDiscount = order.discount;
      order = { ...order, discount: null, lines: order.lines.map(line => priceLine(c, line)) };
    } else if (command.action === "cancel_order") {
      order = { ...order, status: "CANCELLED", cancelledAt: c.now, precheck: null };
    } else if (command.action === "precheck") {
      if (!order.lines.length) fail("EMPTY");
      order.lines = assertFrozenPrices(c, order);
      order.precheck = { id: command.operationId, issuedAt: c.now, issuedBy: { ...c.actor }, revision: order.revision };
    } else if (command.action === "cancel_precheck") {
      if (!order.precheck) fail("PRECHECK_NOT_FOUND");
      order.precheck = null;
    } else if (command.action === "split") {
      if (orders.some(current => current.id === command.newOrderId)) fail("ID_CONFLICT");
      const selected = command.lines!;
      if (selected.some(part => !order!.lines.some(line => line.id === part.lineId && line.quantity >= part.quantity))) fail("SPLIT_INVALID");
      const moved = order.lines.flatMap(line => { const part = selected.find(part => part.lineId === line.id); return part ? [priceLine(c, { ...line, quantity: part.quantity })] : []; });
      const retained = order.lines.flatMap(line => { const part = selected.find(part => part.lineId === line.id); return !part ? [priceLine(c, line)] : part.quantity === line.quantity ? [] : [priceLine(c, { ...line, quantity: line.quantity - part.quantity })]; });
      if (!retained.length) fail("SPLIT_REQUIRES_REMAINDER");
      order.lines = retained; order.totals = totals(retained, c.currency);
      // Split order keeps the original server-authenticated waiter; the splitting actor is separately audited.
      const child: PosOrder = { ...order, id: command.newOrderId!, tableNumber: command.tableNumber === undefined ? order.tableNumber : String(details.tableNumber), parentOrderId: order.id,
        revision: 1, lines: moved, discount: null, totals: totals(moved, c.currency), createdAt: c.now, updatedAt: c.now, updatedBy: { ...c.actor }, operations: [{
          id: `split:${fingerprint}`, action: "split_created", fingerprint, at: c.now, actor: { ...c.actor }, details: { parentOrderId: order.id, operationId: command.operationId },
        }] };
      order = saveOperation(order, c, command, details, fingerprint);
      const next = [...orders.map(current => current.id === order!.id ? order! : current), child];
      capacity(next); parsePosOrders(next);
      return { orders: next, order, duplicate: false };
    } else if (command.action === "preview_payment" || command.action === "pay") {
      if (!order.lines.length) fail("EMPTY");
      assertFrozenPrices(c, order);
      const salesPlan = await planSalesEvent(c, { id: `pos-order:${order.id}`, source: "POS_API", shiftId: order.shiftId,
        comment: order.comment, payments: [command.payment!], lines: order.lines.map(line => ({ id: line.id, menuItemId: line.menuItemId, quantity: line.quantity })) }, { discount: order.discount ?? undefined });
      if (salesPlan.duplicate) fail("EVENT_CONFLICT");
      if (command.action === "preview_payment") return { orders, order: orders.find(current => current.id === order!.id)!, duplicate: false, event: salesPlan.event, previewHash: salesPlan.previewHash };
      if (!command.previewHash || command.previewHash !== salesPlan.previewHash) fail("PREVIEW_CHANGED");
      Object.assign(salesPlan.event, { orderId: order.id, orderActor: { ...order.createdBy }, tableNumber: order.tableNumber });
      order = { ...order, status: "PAID", salesEventId: salesPlan.event.id, paidAt: c.now, paidBy: { ...c.actor }, totals: { grossAmount: salesPlan.event.grossAmount!, discountAmount: salesPlan.event.discountAmount!, netAmount: salesPlan.event.revenue, currency: c.currency },
        lines: salesPlan.event.prices.map(line => ({ id: line.lineId, menuItemId: line.menuItemId, quantity: line.quantity, name: line.name, unitPrice: line.unitPrice, total: line.total, grossTotal: line.grossTotal, discountAmount: line.discountAmount, currency: salesPlan.event.currency })) };
      order = saveOperation(order, c, command, details, fingerprint);
      const next = orders.map(current => current.id === order!.id ? order! : current); capacity(next); parsePosOrders(next);
      return { orders: next, order, duplicate: false, event: salesPlan.event, salesPlan, previewHash: salesPlan.previewHash };
    }
  }
  if (order.status === "OPEN" && !order.discount) order.totals = totals(order.lines, c.currency);
  order = saveOperation(order, c, command, details, fingerprint);
  const next = command.action === "create" ? [...orders, order] : orders.map(current => current.id === order!.id ? order! : current);
  capacity(next); parsePosOrders(next);
  return { orders: next, order, duplicate: false };
}
function capacity(orders: PosOrder[]): void {
  if (new TextEncoder().encode(JSON.stringify(orders)).byteLength > 4_000_000) fail("HISTORY_CAPACITY_REQUIRES_REVIEW");
}

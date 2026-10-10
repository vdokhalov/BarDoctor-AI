import { posDiscountCents } from "./pos-discounts";
import { canManagePosPrivilegedAction } from "./access-control";
import { EVENT_REVENUE_SOURCE, stableSalesValue, type SalesEventContext } from "./sales-events";
type Row = Record<string, unknown>;
export type PosCashEntry = { operationId: string; kind: "IN" | "OUT" | "SAFE_DROP"; amount: number; reason: string; at: string; actor: SalesEventContext["actor"] };
function fail(): never { throw new Error("POS_CASH_NEEDS_REVIEW"); }
export function parsePosCashEntries(value: unknown): PosCashEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail();
  const ids = new Set<string>();
  for (const e of value) {
    if (!e || typeof e !== "object" || !["IN", "OUT", "SAFE_DROP"].includes(e.kind) || typeof e.operationId !== "string" || !e.operationId || ids.has(e.operationId)
      || typeof e.reason !== "string" || !e.reason.trim() || !Number.isFinite(Date.parse(e.at)) || !Number.isSafeInteger(e.actor?.accountId) || !canManagePosPrivilegedAction(e.actor)) fail();
    if (posDiscountCents(e.amount) <= 0) fail();
    ids.add(e.operationId);
  }
  return value;
}
export function planPosCash(c: SalesEventContext, shiftId: string, command: Pick<PosCashEntry, "operationId" | "kind" | "amount" | "reason">): Row[] {
  if (!canManagePosPrivilegedAction(c.actor)) throw new Error("POS_CASH_ACCESS_DENIED");
  if (!command || typeof command.operationId !== "string" || !command.operationId.trim() || command.operationId.length > 120
    || !["IN", "OUT", "SAFE_DROP"].includes(command.kind) || typeof command.reason !== "string" || !command.reason.trim() || command.reason.length > 500 || posDiscountCents(command.amount) <= 0) fail();
  const matches = c.revenues.filter(row => row.id === shiftId && row.venueId === c.venueId && row.revenueSource === EVENT_REVENUE_SOURCE);
  if (matches.length !== 1) fail();
  const shift = matches[0], entries = parsePosCashEntries(shift.cashEntries);
  const normalized = { operationId: command.operationId, kind: command.kind, amount: command.amount, reason: command.reason.trim() };
  const existing = entries.find(entry => entry.operationId === command.operationId);
  if (existing) {
    const { operationId, kind, amount, reason } = existing;
    if (stableSalesValue({ operationId, kind, amount, reason }) !== stableSalesValue(normalized)) throw new Error("POS_CASH_IDEMPOTENCY_CONFLICT");
    return c.revenues;
  }
  if (shift.closingStatus !== "open" || c.closedMonths.has(String(shift.date).slice(0,7))) throw new Error("POS_CASH_SHIFT_CLOSED");
  const next = [...entries, { ...normalized, at: c.now, actor: { ...c.actor } }];
  if (JSON.stringify(next).length > 1_000_000) fail();
  return c.revenues.map(row => row === shift ? { ...row, cashEntries: next, updatedAt: c.now } : row);
}
export function posShiftCashReport(shift: Row, cash: { paidRevenue: number; reversedRevenue: number }, unclassifiedRevenue: number) {
  const entries = parsePosCashEntries(shift.cashEntries);
  const sum = (kind: PosCashEntry["kind"]) => entries.filter(e => e.kind === kind).reduce((n,e) => n + posDiscountCents(e.amount),0) / 100;
  const openingFloat = shift.openingFloat == null ? null : posDiscountCents(shift.openingFloat) / 100;
  const actual = shift.actualCash == null ? null : posDiscountCents(shift.actualCash) / 100;
  const cashIn = sum("IN"), cashOut = sum("OUT"), safeDrop = sum("SAFE_DROP");
  const expectedCents = openingFloat === null || unclassifiedRevenue > 0 ? null : posDiscountCents(openingFloat) + posDiscountCents(cash.paidRevenue) + posDiscountCents(cashIn) - posDiscountCents(cashOut) - posDiscountCents(safeDrop);
  if (expectedCents !== null && !Number.isSafeInteger(expectedCents)) fail();
  const expected = expectedCents === null ? null : expectedCents / 100;
  return { openingFloat, salesRevenue: cash.paidRevenue, reversedRevenue: cash.reversedRevenue, cashIn, cashOut, safeDrop, expected, actual,
    variance: expectedCents === null || actual === null ? null : (posDiscountCents(actual) - expectedCents) / 100,
    status: expected === null ? "UNKNOWN" : expected < 0 ? "NEGATIVE_EXPECTED" : actual === null ? "NOT_COUNTED" : actual === expected ? "BALANCED" : "DISCREPANCY", entries };
}

import assert from "node:assert/strict";
import test from "node:test";
import { buildPosShiftReport, readPosShiftReport, posSalesEventView, type PosShiftReport } from "../lib/bardoctor/pos-shift-report";
import { planSalesShift, planSalesEvent, type SalesEvent } from "../lib/bardoctor/sales-events";
import { allocatePosDiscount, type PosDiscountSnapshot } from "../lib/bardoctor/pos-discounts";
import { hasPermission, permissionsFor, type AccessRole } from "../lib/bardoctor/access-control";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { openingRuntime } from "./helpers/opening-runtime";

const actor = { accountId: 7, name: "Waiter", role: "cashier", jobTitle: "waiter" as const };
function sale(id: string, gross: number | null, discount: number | null, net: number, options: { reversed?: boolean; method?: "CASH" | "CARD_EXTERNAL"; employee?: number } = {}): SalesEvent {
  const owner = { ...actor, accountId: options.employee ?? actor.accountId };
  const pricing = gross == null || discount == null ? {} : { grossAmount: gross, discountAmount: discount, netAmount: net,
    ...(discount > 0 ? { discount: { ruleId: "loyalty", ruleRevision: 1, venueId: 1, name: "Loyalty", kind: "FIXED", value: discount, currency: "MDL", appliedAt: "2026-09-09T12:00:00.000Z",
      appliedBy: { accountId: 9, name: "Manager", role: "manager" }, reason: "Loyal guest", grossAmount: gross, discountAmount: discount, netAmount: net,
      lines: [{ lineId: "line", grossAmount: gross, discountAmount: discount, netAmount: net }] } } : {}) };
  return { id, externalId: id, source: "POS_API", venueId: 1, fingerprint: id, status: options.reversed ? "REVERSED" : "POSTED",
    acceptedAt: "2026-09-09T12:00:00.000Z", businessDate: "2026-09-09", shiftId: "shift", revenueRowId: "shift", currency: "MDL", revenue: net, actor: owner,
    prices: [{ lineId: "line", menuItemId: "coffee", name: "Coffee", quantity: 1, unitPrice: gross ?? net, total: net, ...(gross == null ? {} : { grossTotal: gross, discountAmount: discount }) }],
    payments: [{ id: "payment", method: options.method ?? "CASH", amount: net }], batch: { createdBy: owner, totalTheoreticalCost: 5, lines: [{ recipeSnapshot: { secret: true } }] } as unknown as SalesEvent["batch"], originalMovements: [], ...pricing } as SalesEvent;
}
function context(events: SalesEvent[]) {
  const c = salesEventFixture(); c.revenues = planSalesShift(c, "open_shift", "shift", "Day");
  c.revenues[0].openingFloat = 50; c.events = events;
  const paid = events.filter(item => item.status === "POSTED");
  c.revenues[0].revenue = paid.reduce((sum, item) => sum + item.revenue, 0); c.revenues[0].receipts = paid.length;
  return c;
}

test("discount report aggregates captured gross/discount/net by employee and payment, while cash uses net only", () => {
  const c = context([sale("cash", 100, 10, 90), sale("card", 30, 0, 30, { method: "CARD_EXTERNAL", employee: 8 }), sale("reversed", 50, 5, 45, { reversed: true })]);
  const report = buildPosShiftReport(c, "shift");
  assert.equal(report.totals.paidGrossRevenue, 130); assert.equal(report.totals.paidDiscountAmount, 10); assert.equal(report.totals.paidRevenue, 120);
  assert.equal(report.totals.reversedGrossRevenue, 50); assert.equal(report.totals.reversedDiscountAmount, 5); assert.equal(report.totals.reversedRevenue, 45);
  assert.equal(report.totals.paidPricingUnknownReceipts, 0);
  assert.equal(report.totals.grossRevenue, 165, "legacy field remains paid+reversed net, not redefined as pre-discount gross");
  assert.equal(report.employees.find(item => item.accountId === 7)?.paidGrossRevenue, 100);
  assert.equal(report.employees.find(item => item.accountId === 7)?.paidDiscountAmount, 10);
  assert.equal(report.employees.find(item => item.accountId === 7)?.jobTitle, "waiter");
  assert.equal(report.payments.find(item => item.method === "CASH")?.paidRevenue, 90);
  assert.equal(report.payments.find(item => item.method === "CARD_EXTERNAL")?.paidDiscountAmount, 0);
  assert.equal(report.cash.expected, 140); assert.equal(report.cash.salesRevenue, 90);
});

test("historical missing discount snapshots are unknown, distinct from recorded zero and an empty shift", () => {
  const c = context([sale("known", 100, 10, 90), sale("historical", null, null, 25, { employee: 8, method: "CARD_EXTERNAL" })]);
  const report = buildPosShiftReport(c, "shift");
  assert.equal(report.totals.paidGrossRevenue, null); assert.equal(report.totals.paidDiscountAmount, null);
  assert.equal(report.totals.paidPricingUnknownReceipts, 1); assert.equal(report.totals.paidRevenue, 115);
  assert.equal(report.employees.find(item => item.accountId === 7)?.paidDiscountAmount, 10);
  assert.equal(report.employees.find(item => item.accountId === 8)?.paidDiscountAmount, null);
  assert.equal(report.payments.find(item => item.method === "CARD_EXTERNAL")?.paidGrossRevenue, null);
  const zero = buildPosShiftReport(context([sale("zero", 25, 0, 25)]), "shift"); assert.equal(zero.totals.paidDiscountAmount, 0);
  const empty = buildPosShiftReport(context([]), "shift"); assert.equal(empty.totals.paidDiscountAmount, 0); assert.equal(empty.totals.paidGrossRevenue, 0);
});

test("discount report refuses inconsistent gross/discount/net snapshots and snapshot metadata", () => {
  for (const event of [sale("bad-net", 100, 10, 91), sale("too-large", 5, 10, 0)]) assert.throws(() => buildPosShiftReport(context([event]), "shift"), /REPORT_NEEDS_REVIEW/);
  const event = sale("bad-snapshot", 100, 10, 90) as SalesEvent & { discount: { discountAmount: number } };
  event.discount.discountAmount = 11;
  assert.throws(() => buildPosShiftReport(context([event]), "shift"), /REPORT_NEEDS_REVIEW/);
  const mismatchedLines = sale("bad-lines", 100, 10, 90); mismatchedLines.prices[0].total = 91;
  assert.throws(() => buildPosShiftReport(context([mismatchedLines]), "shift"), /REPORT_NEEDS_REVIEW/);
});

test("discount safe receipt projects immutable amounts and allocation without exposing costs or recipes", () => {
  const event = sale("safe", 100, 10, 90);
  const before = JSON.stringify(event); const safe = posSalesEventView(event);
  assert.equal(safe.grossAmount, 100); assert.equal(safe.discountAmount, 10); assert.equal(safe.netAmount, 90);
  assert.equal(safe.prices[0].grossTotal, 100); assert.equal(safe.prices[0].discountAmount, 10); assert.equal(safe.prices[0].total, 90);
  assert.equal(safe.discount?.appliedBy?.name, "Manager"); assert.equal(safe.actor?.jobTitle, "waiter");
  assert.doesNotMatch(JSON.stringify(safe), /recipeSnapshot|theoreticalCost|totalTheoreticalCost|originalMovements/);
  assert.equal(JSON.stringify(event), before);
  const legacy = posSalesEventView(sale("legacy", null, null, 25)); assert.equal(legacy.grossAmount, null); assert.equal(legacy.discountAmount, null); assert.equal(legacy.netAmount, 25);
});

test("closed discount report never reprices history, and a legacy snapshot stays explicitly unknown without writes", () => {
  const c = context([sale("paid", 100, 10, 90)]); c.revenues = planSalesShift(c, "close_shift", "shift");
  const saved = buildPosShiftReport(c, "shift"); c.revenues[0].closingReport = saved;
  c.events = [sale("paid", 200, 20, 180)];
  assert.equal(readPosShiftReport(c, "shift").totals.paidGrossRevenue, 100);
  const old = JSON.parse(JSON.stringify(saved)) as PosShiftReport;
  for (const aggregate of [old.totals, ...old.employees, ...old.payments]) {
    for (const key of ["paidGrossRevenue", "paidDiscountAmount", "paidPricingUnknownReceipts", "reversedGrossRevenue", "reversedDiscountAmount", "reversedPricingUnknownReceipts"]) delete (aggregate as unknown as Record<string, unknown>)[key];
  }
  c.revenues[0].closingReport = old; const before = JSON.stringify(c.revenues);
  const read = readPosShiftReport(c, "shift"); assert.equal(read.totals.paidGrossRevenue, null); assert.equal(read.totals.paidDiscountAmount, null); assert.equal(read.totals.paidRevenue, 90);
  assert.equal(read.totals.paidPricingUnknownReceipts, 1); assert.equal(JSON.stringify(c.revenues), before);
});

test("split-payment legacy discount has known total net but does not invent gross allocations by payment method", () => {
  const event = sale("mixed", 100, 10, 90); event.payments = [{ id: "cash", method: "CASH", amount: 40 }, { id: "card", method: "CARD_EXTERNAL", amount: 50 }];
  const report = buildPosShiftReport(context([event]), "shift");
  assert.equal(report.totals.paidGrossRevenue, 100); assert.equal(report.payments.find(item => item.method === "CASH")?.paidGrossRevenue, null);
  assert.equal(report.payments.find(item => item.method === "CASH")?.paidRevenue, 40); assert.equal(report.cash.expected, 90);
});

test("direct sales-event API rejects client discount/pricing overrides for every role before writes", async t => {
  for (const role of ["owner", "manager", "shift_manager", "cashier"] as AccessRole[]) {
    const r = openingRuntime(new URL("../app/api/sales-events/route.ts", import.meta.url), { hasPermission,
      authenticateRequest: async () => ({ id: 7, venueId: 1, actorAccountId: 7, role, permissions: permissionsFor(role), firstName: "Viewer", restaurantJson: JSON.stringify({ currency: "MDL" }) }) }); t.after(r.close);
    const command = { id: "forged", source: "POS_API", shiftId: "shift", payments: [{ id: "payment", method: "CASH", amount: 1 }], lines: [{ id: "line", menuItemId: "coffee", quantity: 1 }] };
    for (const key of ["discount", "discountId", "discountRuleId", "discountSnapshot", "discountAmount", "grossAmount", "netAmount", "grossRevenue", "netRevenue", "posDiscount"]) {
      for (const location of ["body", "command"]) {
        const body = { action: "preview", venueId: 1, command: location === "command" ? { ...command, [key]: 1 } : command, ...(location === "body" ? { [key]: 1 } : {}) };
        const response = await r.api.POST(new Request("https://test/api/sales-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
        assert.equal(response.status, 422); assert.equal((await response.json() as { code: string }).code, "SALES_EVENT_DISCOUNT_REQUIRES_ORDER");
      }
    }
    assert.equal(r.batches(), 0);
  }
});

test("canonical discounted sale keeps inventory/cost unchanged and closes a net-revenue cash report", async t => {
  for (const percent of [25, 100]) {
    const c = context([]);
    const base = { id: "discounted", source: "POS_API" as const, shiftId: "shift", lines: [{ id: "line", menuItemId: "beer", quantity: 2 }], payments: [{ id: "payment", method: "CASH" as const, amount: 40 }] };
    const regular = await planSalesEvent(c, base);
    const allocation = allocatePosDiscount([{ lineId: "line", grossAmount: 40 }], "PERCENT", percent, "MDL");
    const discount: PosDiscountSnapshot = { ...allocation, ruleId: "rule", ruleRevision: 1, venueId: 1, name: "Approved", kind: "PERCENT", value: percent,
      appliedAt: c.now, appliedBy: { accountId: 7, name: "Manager", role: "manager" }, reason: "Approved discount" };
    const planned = await planSalesEvent(c, { ...base, payments: [{ ...base.payments[0], amount: allocation.netAmount }] }, { discount });
    assert.equal(planned.event.revenue, allocation.netAmount); assert.equal(planned.event.grossAmount, 40); assert.equal(planned.event.discountAmount, allocation.discountAmount);
    assert.deepEqual(planned.assortment, regular.assortment); assert.equal(planned.event.batch.totalTheoreticalCost, regular.event.batch.totalTheoreticalCost);
    assert.deepEqual(planned.event.originalMovements.map(item => ({ ...item, id: undefined })), regular.event.originalMovements.map(item => ({ ...item, id: undefined })), "discount does not alter inventory consumption or captured cost");
    const r = openingRuntime(new URL("../app/api/sales-events/route.ts", import.meta.url)); t.after(r.close);
    r.put("bd_assortment_v1", planned.assortment); r.put("bd_sales_events_v1", planned.events); r.put("bd_finance_revenue", planned.revenues); r.put("bd_stock_movements", planned.movements);
    const beforeStock = JSON.stringify(r.get("bd_stock_movements"));
    const response = await r.api.POST(new Request("https://test/api/sales-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close_shift", venueId: 1, shiftId: "shift", actualCash: 50 + allocation.netAmount }) }));
    assert.equal(response.status, 201); const report = (await response.json() as { report: PosShiftReport }).report;
    assert.equal(report.totals.paidGrossRevenue, 40); assert.equal(report.totals.paidDiscountAmount, allocation.discountAmount);
    assert.equal(report.totals.paidRevenue, allocation.netAmount); assert.equal(report.totals.paidReceipts, 1);
    assert.equal(report.cash.expected, 50 + allocation.netAmount); assert.equal(report.cash.variance, 0);
    assert.equal(JSON.stringify(r.get("bd_stock_movements")), beforeStock);
  }
});

test("legacy paid-event replay stays byte-for-byte historical and does not gain invented zero-discount metadata", async () => {
  const c = context([]);
  const command = { id: "old-sale", source: "POS_API" as const, shiftId: "shift", lines: [{ id: "line", menuItemId: "beer", quantity: 1 }], payments: [{ id: "payment", method: "CASH" as const, amount: 20 }] };
  const first = await planSalesEvent(c, command); const legacy = structuredClone(first.event);
  delete legacy.grossAmount; delete legacy.discountAmount; delete legacy.netAmount;
  for (const line of legacy.prices) { delete line.grossTotal; delete line.discountAmount; }
  c.events = [legacy]; c.revenues = first.revenues;
  const before = JSON.stringify(legacy); (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 999;
  const replay = await planSalesEvent(c, command); assert.equal(replay.duplicate, true); assert.equal(JSON.stringify(replay.event), before);
  const report = buildPosShiftReport(c, "shift"); assert.equal(report.totals.paidDiscountAmount, null); assert.equal(report.totals.paidRevenue, 20);
});

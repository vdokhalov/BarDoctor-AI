import test from "node:test";
import assert from "node:assert/strict";
import { allocatePosDiscount, capturePosDiscount, parsePosDiscountRules, planPosDiscountRule, validatePosDiscountSnapshot, type PosDiscountKind, type PosDiscountRuleCommand } from "../lib/bardoctor/pos-discounts";
import { parsePosOrders, planPosOrder, posOrderViews, type PosOrder, type PosOrderCommand, type PosOrderContext } from "../lib/bardoctor/pos-orders";
import { planSalesEvent, planSalesShift, planReverseSalesEvent } from "../lib/bardoctor/sales-events";
import { itemSalesInputs } from "../lib/bardoctor/item-sales-inputs";
import { salesEventFixture } from "./helpers/sales-event-fixture";

const save = (extra: Partial<PosDiscountRuleCommand> = {}): PosDiscountRuleCommand => ({ action: "save", ruleId: "rule", operationId: "save", expectedRevision: 0, rule: { name: "Guest discount", kind: "PERCENT", value: 10, active: true }, ...extra });
async function fixture(kind: PosDiscountKind = "PERCENT", value = 10) {
  const c: PosOrderContext = salesEventFixture(); c.revenues = planSalesShift(c, "open_shift", "shift", "Day");
  c.discountRules = (await planPosDiscountRule(c, [], save({ rule: { name: "Guest discount", kind, value, active: true } }))).rules;
  c.movements = [{ id: "receipt", type: "receipt", venueId: 1, productKey: "beer-stock", productName: "Beer", amount: 20, unit: "pcs", costAmount: 200,
    costStatus: "KNOWN", currency: "MDL", date: "2026-09-01", sourceDocumentId: "purchase", sourceLineId: "purchase-line", createdAt: "2026-09-01T10:00:00Z" }];
  return c;
}
const cmd = (action: PosOrderCommand["action"], order: PosOrder, extra: Partial<PosOrderCommand> = {}): PosOrderCommand => ({ action, orderId: order.id, expectedRevision: order.revision, operationId: `${action}-${order.revision}`, ...extra });
const create = (c: PosOrderContext) => planPosOrder(c, [], { action: "create", orderId: "order", operationId: "create", expectedRevision: 0, shiftId: "shift", tableNumber: "7", lines: [{ id: "a", menuItemId: "beer", quantity: 3 }, { id: "b", menuItemId: "coffee", quantity: 1 }] });
const apply = (c: PosOrderContext, plan: Awaited<ReturnType<typeof create>>) => planPosOrder(c, plan.orders, cmd("apply_discount", plan.order, { ruleId: "rule", ruleRevision: c.discountRules![0].revision, reason: "Guest loyalty" }));
async function pay(c: PosOrderContext, plan: Awaited<ReturnType<typeof create>>) {
  const payment = { id: "payment", method: "CASH" as const, amount: plan.order.totals!.netAmount };
  const preview = await planPosOrder(c, plan.orders, cmd("preview_payment", plan.order, { payment }));
  const command = cmd("pay", plan.order, { payment, previewHash: preview.previewHash });
  return { plan: await planPosOrder(c, plan.orders, command), command };
}

test("discount configuration requires owner/manager even on retries; edits are CAS and preserve author", async () => {
  const c = await fixture(), first = c.discountRules!;
  for (const role of ["owner", "manager"]) {
    const actor = { accountId: 9, name: "Editor", role };
    const edit = await planPosDiscountRule({ ...c, actor }, first, save({ operationId: `edit-${role}`, expectedRevision: 1, rule: { name: "New", kind: "FIXED", value: 5, active: false } }));
    assert.equal(edit.rule.revision, 2); assert.equal(edit.rule.createdBy.accountId, 7); assert.equal(edit.rule.updatedBy.accountId, 9);
  }
  for (const role of ["cashier", "shift_manager", "auditor", "accountant"]) {
    await assert.rejects(() => planPosDiscountRule({ ...c, actor: { ...c.actor, role } }, first, save()), /CONFIG_ACCESS_DENIED/);
  }
  assert.equal((await planPosDiscountRule(c, first, save())).duplicate, true);
  await assert.rejects(() => planPosDiscountRule(c, first, save({ operationId: "stale" })), /REVISION_CONFLICT/);
  await assert.rejects(() => planPosDiscountRule(c, first, save({ rule: { ...save().rule, value: 11 } })), /IDEMPOTENCY_CONFLICT/);
  assert.deepEqual(parsePosDiscountRules(JSON.parse(JSON.stringify(first))), first);
});

test("discount values reject negative, nonfinite, sub-cent, unsafe or out-of-range values", async () => {
  const c = await fixture();
  for (const kind of ["PERCENT", "FIXED"] as const) for (const value of [-1, Infinity, NaN, 0.001, Number.MAX_SAFE_INTEGER]) {
    await assert.rejects(() => planPosDiscountRule(c, [], save({ rule: { ...save().rule, kind, value } })), /POS_DISCOUNT_/);
  }
  await assert.rejects(() => planPosDiscountRule(c, [], save({ rule: { ...save().rule, value: 100.01 } })), /PERCENT_INVALID/);
  for (const value of [0, 0.01, 99.99, 100]) assert.equal((await planPosDiscountRule(c, [], save({ rule: { ...save().rule, value } }))).rule.value, value);
  assert.throws(() => allocatePosDiscount([{ lineId: "a", grossAmount: 1 }], "FIXED", 1.01, "MDL"), /EXCEEDS_GROSS/);
  assert.throws(() => allocatePosDiscount([{ lineId: "a", grossAmount: 50_000_000_000_000 }, { lineId: "b", grossAmount: 50_000_000_000_000 }], "PERCENT", 1, "MDL"), /AMOUNT_INVALID/);
});

test("largest-remainder allocation conserves exact cents, with stable line IDs deciding ties", () => {
  const input = [{ lineId: "b", grossAmount: 0.01 }, { lineId: "a", grossAmount: 0.01 }, { lineId: "c", grossAmount: 0.01 }];
  const result = allocatePosDiscount(input, "FIXED", 0.02, "MDL");
  assert.deepEqual(result.lines.map(line => line.discountAmount), [0.01, 0.01, 0]);
  assert.equal(result.grossAmount, 0.03); assert.equal(result.netAmount, 0.01);
  const flipped = allocatePosDiscount([...input].reverse(), "FIXED", 0.02, "MDL");
  assert.deepEqual(flipped.lines.slice().sort((a, b) => a.lineId.localeCompare(b.lineId)), result.lines.slice().sort((a, b) => a.lineId.localeCompare(b.lineId)));
  for (let cents = 0; cents <= 333; cents++) {
    const each = allocatePosDiscount([{ lineId: "a", grossAmount: 1.11 }, { lineId: "b", grossAmount: 2.22 }], "FIXED", cents / 100, "MDL");
    assert.equal(each.lines.reduce((sum, line) => sum + Math.round(line.discountAmount * 100), 0), cents);
    assert.equal(each.lines.reduce((sum, line) => sum + Math.round(line.netAmount * 100), 0), 333 - cents);
  }
  assert.equal(allocatePosDiscount([{ lineId: "a", grossAmount: 0.01 }], "PERCENT", 50, "MDL").discountAmount, 0.01);
});

test("only management can apply/remove/reapply including replay; rule actor and original waiter are immutable", async () => {
  const c = await fixture(); c.actor = { accountId: 44, name: "Waiter", role: "cashier", jobTitle: "waiter" };
  const first = await create(c);
  await assert.rejects(() => apply(c, first), /ACCESS_DENIED/);
  for (const role of ["owner", "manager", "shift_manager"]) {
    c.actor = { accountId: 7, name: "Management", role };
    const discounted = await apply(c, first), operation = cmd("apply_discount", first.order, { ruleId: "rule", ruleRevision: 1, reason: "Guest loyalty" });
    assert.equal(discounted.order.totals?.netAmount, 67.5); assert.equal(discounted.order.discount?.appliedBy.role, role); assert.equal(discounted.order.createdBy.jobTitle, "waiter");
    assert.equal((await planPosOrder(c, discounted.orders, operation)).duplicate, true);
    c.actor = { accountId: 44, name: "Waiter", role: "cashier", jobTitle: "waiter" };
    await assert.rejects(() => planPosOrder(c, discounted.orders, operation), /ACCESS_DENIED/);
    await assert.rejects(() => planPosOrder(c, discounted.orders, cmd("remove_discount", discounted.order, { reason: "Remove" })), /ACCESS_DENIED/);
    const paid = await pay(c, discounted); assert.equal(paid.plan.order.paidBy?.jobTitle, "waiter");
  }
});

test("applied rule freezes totals; catalogue edits do not reprice it, new inactive/revised applications reject", async () => {
  const c = await fixture(), first = await create(c), discounted = await apply(c, first), snapshot = structuredClone(discounted.order.discount);
  c.discountRules = (await planPosDiscountRule(c, c.discountRules!, save({ operationId: "deactivate", expectedRevision: 1, rule: { ...save().rule, value: 20, active: false } }))).rules;
  assert.deepEqual(posOrderViews(c, discounted.orders)[0].discount, snapshot);
  const paid = await pay(c, discounted); assert.deepEqual(paid.plan.event?.discount, snapshot);
  await assert.rejects(() => planPosOrder(c, first.orders, cmd("apply_discount", first.order, { ruleId: "rule", ruleRevision: 1, reason: "Old" })), /RULE_CHANGED/);
  await assert.rejects(() => apply(c, first), /INACTIVE/);
  (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 40;
  assert.equal(posOrderViews(c, discounted.orders)[0].totals?.netAmount, 67.5);
  await assert.rejects(() => pay(c, discounted), /DISCOUNT_PRICE_CHANGED/);
  const removed = await planPosOrder(c, discounted.orders, cmd("remove_discount", discounted.order, { reason: "Review new price" }));
  assert.equal(removed.order.discount, null); assert.equal(removed.order.totals?.netAmount, 135);
  assert.deepEqual(removed.order.operations.at(-1)?.details.previousDiscount, snapshot);
  assert.deepEqual(paid.plan.event?.discount, snapshot);
});

test("discount locks item edits and split for all roles; precheck must be cancelled before discount changes", async () => {
  const c = await fixture(), first = await create(c), discounted = await apply(c, first);
  for (const role of ["owner", "manager", "shift_manager", "cashier"]) {
    c.actor.role = role;
    await assert.rejects(() => planPosOrder(c, discounted.orders, cmd("add_items", discounted.order, { lines: [{ id: "new", menuItemId: "beer", quantity: 1 }] })), /DISCOUNT_LOCKED/);
    if (role !== "cashier") {
      await assert.rejects(() => planPosOrder(c, discounted.orders, cmd("cancel_item", discounted.order, { lineId: "a", reason: "Wrong" })), /DISCOUNT_LOCKED/);
      await assert.rejects(() => planPosOrder(c, discounted.orders, cmd("split", discounted.order, { newOrderId: "split", lines: [{ lineId: "a", quantity: 1 }] })), /SPLIT_DISCOUNTED/);
    }
  }
  c.actor.role = "owner";
  const printed = await planPosOrder(c, discounted.orders, cmd("precheck", discounted.order));
  for (const action of ["apply_discount", "remove_discount"] as const) await assert.rejects(() => planPosOrder(c, printed.orders, cmd(action, printed.order, { reason: "Change", ruleId: "rule", ruleRevision: 1 })), /PRECHECK_LOCKED/);
  const unlocked = await planPosOrder(c, printed.orders, cmd("cancel_precheck", printed.order, { reason: "Guest changed check" }));
  const removed = await planPosOrder(c, unlocked.orders, cmd("remove_discount", unlocked.order, { reason: "Split check" }));
  const split = await planPosOrder(c, removed.orders, cmd("split", removed.order, { newOrderId: "split", lines: [{ lineId: "a", quantity: 1 }] }));
  assert.equal(split.orders.every(order => order.discount === null), true);
  assert.equal(split.orders.reduce((sum, order) => sum + order.totals!.netAmount, 0), 75);
});

test("reapplying replaces one whole-check discount and audits both snapshots without stacking", async () => {
  const c = await fixture("FIXED", 5), first = await create(c), once = await apply(c, first), twice = await apply(c, once);
  assert.equal(once.order.totals?.netAmount, 70); assert.equal(twice.order.totals?.netAmount, 70);
  assert.deepEqual(twice.order.operations.at(-1)?.details.previousDiscount, once.order.discount);
  c.discountRules = (await planPosDiscountRule(c, c.discountRules!, save({ operationId: "edit", expectedRevision: 1, rule: { ...save().rule, kind: "PERCENT", value: 20 } }))).rules;
  const changed = await apply(c, twice);
  assert.equal(changed.order.totals?.grossAmount, 75); assert.equal(changed.order.totals?.discountAmount, 15); assert.equal(changed.order.totals?.netAmount, 60);
  assert.equal(changed.order.discount?.ruleRevision, 2); assert.equal(once.order.discount?.ruleRevision, 1);
  c.closedMonths.add("2026-09"); await assert.rejects(() => apply(c, changed), /MONTH_LOCKED/);
  c.closedMonths.clear(); c.revenues = planSalesShift(c, "close_shift", "shift"); await assert.rejects(() => apply(c, changed), /SHIFT_CLOSED/);
});

test("discount payment recognizes net per item/document, preserves stock and captured COGS, and reversal reverses net", async () => {
  const c = await fixture("FIXED", 5), first = await create(c), discounted = await apply(c, first);
  const ordinary = (await pay(c, first)).plan, paid = (await pay(c, discounted)).plan;
  assert.equal(paid.event?.grossAmount, 75); assert.equal(paid.event?.discountAmount, 5); assert.equal(paid.event?.revenue, 70);
  assert.deepEqual(paid.salesPlan?.assortment, ordinary.salesPlan?.assortment);
  assert.deepEqual(paid.event?.batch.lines.map(line => line.theoreticalCost), ordinary.event?.batch.lines.map(line => line.theoreticalCost));
  assert.deepEqual(paid.event?.originalMovements.map(({ id: _id, ...rest }) => { void _id; return rest; }), ordinary.event?.originalMovements.map(({ id: _id, ...rest }) => { void _id; return rest; }));
  assert.equal(paid.event?.prices.reduce((sum, line) => sum + Math.round(line.total * 100), 0), 7000);
  // unitPrice remains the captured menu price. quantity*unitPrice is grossTotal; total is allocated NET.
  assert.equal(paid.event?.prices.every(line => line.quantity * line.unitPrice === line.grossTotal), true);
  assert.equal(paid.event?.prices.some(line => line.quantity * line.unitPrice !== line.total), true);
  const inputs = itemSalesInputs({ events: [paid.event], venueId: 1 });
  assert.equal(inputs.documents[0].total, 70);
  assert.equal((inputs.documents[0].items as { grossSales: number }[]).reduce((sum, item) => sum + Math.round(item.grossSales * 100), 0), 7000);
  const reverse = planReverseSalesEvent({ ...c, ...paid.salesPlan! }, paid.event!.id);
  assert.equal(reverse.revenues[0].revenue, 0); assert.deepEqual(reverse.event.discount, paid.event?.discount);
  assert.deepEqual(parsePosOrders(JSON.parse(JSON.stringify(paid.orders))), paid.orders);
});

test("100 percent and fixed=gross accept zero payment without fake revenue or skipped stock consumption", async () => {
  for (const [kind, value] of [["PERCENT", 100], ["FIXED", 75]] as const) {
    const c = await fixture(kind, value), first = await create(c), discounted = await apply(c, first), { plan, command } = await pay(c, discounted);
    assert.equal(plan.order.totals?.netAmount, 0); assert.equal(plan.event?.payments?.[0].amount, 0);
    assert.equal(plan.event?.revenue, 0); assert.equal(plan.salesPlan?.revenues[0].revenue, 0);
    assert.equal((plan.salesPlan?.assortment.stockBalances as { current: number }[])[0].current, 17);
    assert.equal(plan.event?.prices.every(line => line.total === 0), true);
    assert.equal(plan.event?.originalMovements[0].costAmount, -30);
    const retry = await planPosOrder({ ...c, ...plan.salesPlan! }, plan.orders, command);
    assert.equal(retry.duplicate, true); assert.deepEqual(retry.event, plan.event);
  }
});

test("corrupt snapshots and direct client discount fields cannot change recognized money", async () => {
  const c = await fixture(), first = await create(c), discounted = await apply(c, first);
  assert.throws(() => validatePosDiscountSnapshot({ ...discounted.order.discount, discountAmount: 999 }), /POS_DISCOUNT_/);
  assert.throws(() => parsePosOrders([{ ...discounted.order, totals: { ...discounted.order.totals, netAmount: 0 } }]), /STORE_NEEDS_REVIEW/);
  assert.throws(() => parsePosOrders([{ ...discounted.order, lines: [{ ...discounted.order.lines[0], total: 1 }, discounted.order.lines[1]] }]), /STORE_NEEDS_REVIEW/);
  const body = { id: "spoof", source: "POS_API" as const, shiftId: "shift", lines: [{ id: "a", menuItemId: "beer", quantity: 1 }], payments: [{ id: "pay", method: "CASH" as const, amount: 0 }], discount: discounted.order.discount };
  await assert.rejects(() => planSalesEvent(c, body), /DISCOUNT_FIELDS_FORBIDDEN/);
  await assert.rejects(() => planPosOrder(c, first.orders, { ...cmd("precheck", first.order), discount: discounted.order.discount } as PosOrderCommand), /DISCOUNT_FIELDS_FORBIDDEN/);
  const snapshot = capturePosDiscount(c, c.discountRules!, "rule", 1, "Reason", [{ lineId: "a", grossAmount: 1 }]);
  const { discount: _ignored, ...safe } = body; void _ignored;
  await assert.rejects(() => planSalesEvent(c, safe, { discount: snapshot }), /DISCOUNT_SNAPSHOT_CHANGED/);
});

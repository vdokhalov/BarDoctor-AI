import assert from "node:assert/strict";
import test from "node:test";
import { buildPosLiveOverview, type PosLiveOverview, type PosOverviewMember } from "../lib/bardoctor/pos-live-overview";
import { planPosOrder, type PosOrder, type PosOrderCommand, type PosOrderContext } from "../lib/bardoctor/pos-orders";
import { planSalesEvent, planSalesShift, type SalesEvent, type SalesEventContext } from "../lib/bardoctor/sales-events";
import { planPosDiscountRule } from "../lib/bardoctor/pos-discounts";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

const manager = { accountId: 7, name: "Manager", role: "manager" };
const waiter = { accountId: 44, name: "Captured waiter", role: "cashier", jobTitle: "waiter" as const };
const member = (accountId: number, name = "Current waiter"): PosOverviewMember => ({ accountId, name, role: "cashier", jobTitle: "waiter" });
function fixture(): PosOrderContext { const c = salesEventFixture(); c.actor = manager; c.revenues = planSalesShift(c, "open_shift", "night", "Night"); return c; }
const cmd = (action: PosOrderCommand["action"], order: PosOrder, extra: Partial<PosOrderCommand> = {}): PosOrderCommand => ({ action, orderId: order.id, operationId: `${action}-${order.id}-${order.revision}`, expectedRevision: order.revision, ...extra });
const create = (c: PosOrderContext, orders: PosOrder[] = [], id = "order", table = "7", menu = "beer", quantity = 2) => planPosOrder(c, orders, { action: "create", operationId: `create-${id}`, orderId: id, expectedRevision: 0, shiftId: "night", tableNumber: table, lines: [{ id: `line-${id}`, menuItemId: menu, quantity }] });
async function pay(c: PosOrderContext, orders: PosOrder[], order: PosOrder) {
  const payment = { id: `payment-${order.id}`, method: "CASH" as const, amount: order.totals!.netAmount };
  const preview = await planPosOrder(c, orders, cmd("preview_payment", order, { payment }));
  return planPosOrder(c, orders, cmd("pay", order, { payment, previewHash: preview.previewHash }));
}
function withSales(c: SalesEventContext, plan: Awaited<ReturnType<typeof planSalesEvent>>) { c.events = plan.events; c.revenues = plan.revenues; c.assortment = plan.assortment; c.movements = plan.movements; }
async function sale(c: SalesEventContext, id: string, actor = waiter) {
  const planned = await planSalesEvent({ ...c, actor }, { id, source: "POS_API", shiftId: "night", lines: [{ id: `line-${id}`, menuItemId: "beer", quantity: 1 }], payments: [{ id: `payment-${id}`, method: "CASH", amount: 20 }] });
  withSales(c, planned); return planned.event;
}
const overview = (c: SalesEventContext, orders: unknown = [], members: PosOverviewMember[] = []) => buildPosLiveOverview(c, orders, members, "night");

test("live roster seeds all active roles and jobs at zero without implying attendance", () => {
  const c = fixture();
  const members: PosOverviewMember[] = [member(44), ...["cashier", "barista", "bartender"].map((jobTitle, i) => ({ ...member(50 + i), jobTitle } as PosOverviewMember)),
    ...["owner", "manager", "shift_manager"].map((role, i) => ({ accountId: 60 + i, name: role, role, jobTitle: null })), { ...member(70), jobTitle: null }];
  const result = overview(c, [], members);
  assert.equal(result.staff.length, members.length); assert.equal(result.activityBasis, "ORDERS_AND_SALES_NOT_ATTENDANCE");
  for (const row of result.staff) { assert.equal(row.hasActivity, false); assert.equal(row.membershipStatus, "ACTIVE"); assert.equal(row.paidCheckCount, 0); assert.equal(row.openOrderCount, 0); }
  assert.equal(result.staff.find(row => row.accountId === 70)?.jobTitle, "cashier");
  assert.equal(result.summary.openNetAmount, 0); assert.equal(result.summary.paidDiscountAmount, 0);
  assert.doesNotMatch(JSON.stringify(result), /clockedIn|attendanceStatus|recipe|cost|email|phone/);
});

test("overnight selection uses actual POS shift, and split checks occupy one distinct table", async () => {
  const c = fixture(); c.actor = waiter;
  const first = await create(c); c.actor = manager;
  const split = await planPosOrder(c, first.orders, cmd("split", first.order, { newOrderId: "split", lines: [{ lineId: "line-order", quantity: 1 }] }));
  c.now = "2026-09-10T02:30:00.000Z";
  const result = overview(c, split.orders, [member(44), { ...manager, jobTitle: null }]);
  assert.equal(result.shift.businessDate, "2026-09-09"); assert.equal(result.serverNow, c.now);
  assert.equal(result.summary.openOrderCount, 2); assert.equal(result.summary.openTableCount, 1); assert.equal(result.summary.openNetAmount, 40);
  const row = result.staff.find(item => item.accountId === 44)!;
  assert.equal(row.name, "Current waiter"); assert.equal(row.openTableCount, 1); assert.equal(row.openOrders[0].waiter.name, "Captured waiter");
  assert.equal(result.staff.find(item => item.accountId === 7)?.hasActivity, false, "manager who split is not reassigned the waiter's activity");
  assert.throws(() => buildPosLiveOverview(c, split.orders, [], "today"), /SHIFT_NOT_FOUND/);
});

test("canonical paid event is counted once and credited to original waiter, not the collecting manager", async () => {
  const c = fixture(); c.actor = waiter; const first = await create(c); c.actor = manager;
  const paid = await pay(c, first.orders, first.order); withSales(c, paid.salesPlan!);
  const before = JSON.stringify({ c, orders: paid.orders });
  const result = overview(c, paid.orders, [member(44), { ...manager, jobTitle: null }]);
  assert.equal(result.summary.paidCheckCount, 1); assert.equal(result.summary.paidNetAmount, 40); assert.equal(result.summary.openOrderCount, 0);
  const row = result.staff.find(item => item.accountId === 44)!;
  assert.equal(row.paidCheckCount, 1); assert.equal(row.paidReceipts[0].waiter?.accountId, 44); assert.equal(row.paidReceipts[0].actor?.accountId, 7);
  assert.equal(row.paidReceipts[0].tableNumber, "7"); assert.equal(row.paidReceipts[0].ownershipBasis, "ORDER_CREATOR");
  assert.equal(result.staff.find(item => item.accountId === 7)?.paidCheckCount, 0);
  assert.doesNotMatch(JSON.stringify(result), /recipeSnapshot|totalTheoreticalCost|originalMovements|fingerprint|stockBalances/);
  assert.equal(JSON.stringify({ c, orders: paid.orders }), before);
});

test("departed actors remain historical, legacy direct owners are explicit, and unattributed legacy sales stay unknown", async () => {
  const c = fixture(); await sale(c, "direct");
  const legacy = await sale(c, "legacy", { ...waiter, accountId: 45, name: "Legacy employee" }); delete legacy.actor;
  const unknown = await sale(c, "unknown"); delete unknown.actor; Reflect.deleteProperty(unknown.batch, "createdBy");
  const reversed = await sale(c, "reversed", { ...waiter, accountId: 46 }); reversed.status = "REVERSED";
  c.revenues[0].revenue = 60; c.revenues[0].receipts = 3;
  const result = overview(c, [], [member(90)]);
  assert.equal(result.summary.paidCheckCount, 3); assert.equal(result.summary.reversedCheckCount, 1);
  const direct = result.staff.find(row => row.accountId === 44)!; assert.equal(direct.membershipStatus, "HISTORICAL"); assert.equal(direct.paidReceipts[0].ownershipBasis, "DIRECT_SALE_ACTOR");
  assert.equal(result.staff.find(row => row.accountId === 45)?.paidReceipts[0].ownershipBasis, "LEGACY_BATCH_CREATOR");
  const unattributed = result.staff.find(row => row.accountId === null)!;
  assert.equal(unattributed.membershipStatus, "UNKNOWN"); assert.equal(unattributed.paidCheckCount, 1); assert.equal(unattributed.paidReceipts[0].waiter, null);
  assert.equal(unattributed.paidReceipts[0].actor, null);
  assert.equal(result.staff.find(row => row.accountId === 46)?.paidCheckCount, 0);
});

test("discounted draft and paid snapshots keep gross/discount/net; historical absent breakdown stays unknown", async () => {
  for (const percent of [25, 100]) {
    const c = fixture(); c.discountRules = (await planPosDiscountRule(c, [], { action: "save", operationId: "rule", ruleId: "rule", expectedRevision: 0, rule: { name: "Guest", kind: "PERCENT", value: percent, active: true } })).rules;
    c.actor = waiter; const first = await create(c); c.actor = manager;
    const discounted = await planPosOrder(c, first.orders, cmd("apply_discount", first.order, { ruleId: "rule", ruleRevision: 1, reason: "Guest loyalty" }));
    const draft = overview(c, discounted.orders);
    assert.equal(draft.summary.openGrossAmount, 40); assert.equal(draft.summary.openDiscountAmount, 40 * percent / 100); assert.equal(draft.summary.openNetAmount, 40 * (100 - percent) / 100);
    assert.equal(draft.staff[0].openOrders[0].pricingBasis, "DISCOUNT_SNAPSHOT");
    const paid = await pay(c, discounted.orders, discounted.order); withSales(c, paid.salesPlan!);
    const result = overview(c, paid.orders); assert.equal(result.summary.paidCheckCount, 1); assert.equal(result.summary.paidNetAmount, draft.summary.openNetAmount);
    assert.equal(result.summary.paidGrossAmount, 40); assert.equal(result.summary.paidDiscountAmount, draft.summary.openDiscountAmount);
    assert.equal(result.staff[0].paidReceipts[0].payments?.[0].amount, draft.summary.openNetAmount);
    (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 999;
    assert.equal(overview(c, paid.orders).summary.paidNetAmount, result.summary.paidNetAmount);
  }
  const c = fixture(); const historical = await sale(c, "legacy"); delete historical.grossAmount; delete historical.discountAmount; delete historical.netAmount;
  for (const line of historical.prices) { delete line.grossTotal; delete line.discountAmount; }
  await sale(c, "known", { ...waiter, accountId: 45 });
  const result = overview(c);
  assert.equal(result.summary.paidNetAmount, 40); assert.equal(result.summary.paidGrossAmount, null); assert.equal(result.summary.paidDiscountAmount, null); assert.equal(result.summary.paidPricingUnknownCount, 1);
  assert.equal(result.staff.find(row => row.accountId === 45)?.paidDiscountAmount, 0);
});

test("any unavailable draft pricing nulls the whole live total; precheck stays frozen and marked", async () => {
  const c = fixture(); c.actor = waiter;
  const a = await create(c), b = await create(c, a.orders, "coffee", "8", "coffee", 1);
  c.actor = manager; (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 0.001;
  const result = overview(c, b.orders);
  assert.equal(result.summary.openOrderCount, 2); assert.equal(result.summary.openNetAmount, null); assert.equal(result.summary.openGrossAmount, null); assert.equal(result.summary.openPricingUnknownCount, 1);
  assert.equal(result.staff[0].openNetAmount, null); assert.equal(result.staff[0].openOrders.find(row => row.id === "order")?.lines[0].total, null);
  assert.equal(result.staff[0].openOrders.find(row => row.id === "coffee")?.totals.netAmount, 15);
  (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 20;
  const printed = await planPosOrder(c, a.orders, cmd("precheck", a.order));
  (c.assortment.menuItems as { salePrice: number }[])[0].salePrice = 999;
  const frozen = overview(c, printed.orders).staff[0].openOrders[0];
  assert.equal(frozen.status, "PRECHECK"); assert.equal(frozen.pricingBasis, "PRECHECK_SNAPSHOT"); assert.equal(frozen.totals.netAmount, 40);
});

test("overview excludes foreign venue/shift data and never mutates a closed snapshot", async () => {
  const c = fixture(), first = await create(c); const other = structuredClone(first.order); other.id = "foreign"; other.venueId = 2;
  const otherShift = structuredClone(first.order); otherShift.id = "other-shift"; otherShift.shiftId = "other";
  for (const order of [other, otherShift]) for (const operation of order.operations) operation.id = order.id + operation.id;
  const event = await sale(c, "paid"); const foreignEvent = structuredClone(event); foreignEvent.id = "foreign-paid"; foreignEvent.venueId = 2; c.events.push(foreignEvent);
  c.revenues[0].closingStatus = "closed"; c.revenues[0].closingReport = { immutable: "original closing snapshot" };
  const before = JSON.stringify(c.revenues); const result = overview(c, [first.order, other, otherShift]);
  assert.equal(result.summary.openOrderCount, 1); assert.equal(result.summary.paidCheckCount, 1); assert.equal(result.shift.isLive, false); assert.equal(JSON.stringify(c.revenues), before);
  assert.throws(() => overview({ ...c, actor: waiter }), /ACCESS_DENIED/);
});

test("incomplete, conflicting or duplicated canonical paid history fails instead of showing successful zeros", async () => {
  const c = fixture(); const created = await create(c); const paid = await pay(c, created.orders, created.order); withSales(c, paid.salesPlan!);
  assert.throws(() => overview({ ...c, events: [] }, paid.orders), /HISTORY_NEEDS_REVIEW/);
  assert.throws(() => overview({ ...c, events: [] }, []), /HISTORY_NEEDS_REVIEW/);
  assert.throws(() => overview({ ...c, events: [...c.events, ...c.events] }, paid.orders), /STORE_NEEDS_REVIEW/);
  assert.throws(() => overview(c, []), /HISTORY_NEEDS_REVIEW/, "order-backed event requires its atomically saved paid order");
  Object.assign(c.events[0], { orderActor: { ...waiter, accountId: 99 } });
  assert.throws(() => overview(c, paid.orders), /HISTORY_NEEDS_REVIEW/);
});

type Runtime = Awaited<ReturnType<typeof lifecycleRuntime>>;
type User = Awaited<ReturnType<Runtime["register"]>>;
function put(r: Runtime, dataAccountId: number, key: string, value: unknown) {
  r.sqlite.prepare("INSERT INTO domain_data (account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(dataAccountId, key, JSON.stringify(value));
}
function selected(r: Runtime, user: User, venueId: number, path = "/api/pos-overview?shiftId=night") {
  const request = r.request(user, path); const headers = new Headers(request.headers); headers.set("X-Venue-Id", String(venueId)); return new Request(request, { headers });
}
function seedShift(r: Runtime, owner: User) {
  const c = fixture(); c.venueId = owner.activeVenueId; c.revenues[0].venueId = owner.activeVenueId;
  put(r, owner.userId, "bd_finance_revenue", c.revenues); put(r, owner.userId, "bd_sales_events_v1", []); put(r, owner.userId, "bd_pos_orders_v1", []); put(r, owner.userId, "bd_assortment_v1", { menuItems: [] });
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ currency: "MDL", timezone: "Europe/Chisinau" }), owner.userId); return c;
}
function join(r: Runtime, owner: User, accountId: number, role: string, title: string | null = null, permissions: unknown = null) {
  const workspace = r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(owner.activeVenueId)!.workspace_id;
  r.sqlite.prepare("INSERT OR IGNORE INTO workspace_memberships (workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace!, accountId);
  r.sqlite.prepare("INSERT INTO venue_memberships (venue_id,account_id,role,job_title,status,permissions_json) VALUES (?,?,?,?,'active',?)").run(owner.activeVenueId, accountId, role, title, permissions == null ? null : JSON.stringify(permissions));
}
function identity(r: Runtime, label: string, kind = "user") {
  return Number(r.sqlite.prepare("INSERT INTO accounts (chatgpt_email,app_email,first_name,last_name,account_kind,owns_venue) VALUES (?,?,?,'Staff',?,0)").run(`${label}@isolated.test`, `${label}@isolated.test`, label, kind).lastInsertRowid);
}

test("real-auth overview includes active role/job zeros only, excludes disabled/foreign/invited/container identities, and performs no writes", async t => {
  const r = await lifecycleRuntime({ overview: "./app/api/pos-overview/route" }); t.after(r.close);
  const owner = await r.register("overview-owner@isolated.test"), foreign = await r.register("overview-foreign@isolated.test"); seedShift(r, owner);
  const expected = [owner.userId];
  for (const job of ["cashier", "waiter", "barista", "bartender", null]) { const id = identity(r, `active-${job}`); join(r, owner, id, "cashier", job); expected.push(id); }
  for (const role of ["owner", "manager", "shift_manager"]) { const id = identity(r, `active-${role}`); join(r, owner, id, role); expected.push(id); }
  const disabled = identity(r, "disabled-venue"), disabledWorkspace = identity(r, "disabled-workspace"), container = identity(r, "container", "venue_data"), foreignSameWorkspace = identity(r, "foreign-same-workspace");
  for (const id of [disabled, disabledWorkspace, container]) join(r, owner, id, "cashier", "waiter");
  r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE venue_id=? AND account_id=?").run(owner.activeVenueId, disabled);
  const workspace = r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(owner.activeVenueId)!.workspace_id;
  r.sqlite.prepare("UPDATE workspace_memberships SET status='disabled' WHERE workspace_id=? AND account_id=?").run(workspace!, disabledWorkspace);
  r.sqlite.prepare("INSERT INTO workspace_memberships (workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace!, foreignSameWorkspace);
  join(r, foreign, foreignSameWorkspace, "cashier", "waiter");
  r.sqlite.prepare("INSERT INTO venue_invites (venue_id,code_hash,role,job_title,created_by_account_id,expires_at) VALUES (?,'unclaimed','cashier','waiter',?,'2099-01-01')").run(owner.activeVenueId, owner.userId);
  const state = () => JSON.stringify(r.sqlite.prepare("SELECT name,sql FROM sqlite_master ORDER BY name").all()) + JSON.stringify(["domain_data", "venue_memberships", "workspace_memberships", "audit_log", "sessions"].map(table => r.sqlite.prepare(`SELECT * FROM ${table} ORDER BY 1`).all()));
  const before = state();
  const response = await r.api.overview.GET(selected(r, owner, owner.activeVenueId)); assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const result = await response.json() as PosLiveOverview & { ok: boolean };
  assert.equal(result.ok, true); assert.deepEqual(result.staff.map(row => row.accountId).sort((a, b) => Number(a) - Number(b)), expected.sort((a, b) => a - b));
  assert.equal(result.staff.every(row => !row.hasActivity && row.paidCheckCount === 0), true); assert.equal(result.staff.find(row => row.name === "active-null Staff")?.jobTitle, "cashier");
  assert.doesNotMatch(JSON.stringify(result), /permissionsJson|permissions_json|@isolated|phone|recipe|cost/); assert.equal(state(), before);
});

test("real-auth overview needs management plus sales.view, ignores shift-manage grants, and enforces selected venue", async t => {
  const r = await lifecycleRuntime({ overview: "./app/api/pos-overview/route" }); t.after(r.close);
  const owner = await r.register("gate-owner@isolated.test"), staff = await r.register("gate-staff@isolated.test"), outsider = await r.register("gate-outsider@isolated.test"); seedShift(r, owner);
  join(r, owner, staff.userId, "cashier", "waiter", { allow: ["shifts.manage", "finance.view", "sales.view"] });
  const get = (user = staff, path = "/api/pos-overview?shiftId=night", venueId = owner.activeVenueId) => r.api.overview.GET(selected(r, user, venueId, path));
  for (const title of ["cashier", "waiter", "barista", "bartender"]) {
    r.sqlite.prepare("UPDATE venue_memberships SET job_title=? WHERE venue_id=? AND account_id=?").run(title, owner.activeVenueId, staff.userId); assert.equal((await get()).status, 403);
  }
  for (const role of ["manager", "shift_manager"]) {
    r.sqlite.prepare("UPDATE venue_memberships SET role=?,job_title=NULL,permissions_json=? WHERE venue_id=? AND account_id=?").run(role, JSON.stringify({ deny: ["shifts.manage"] }), owner.activeVenueId, staff.userId);
    assert.equal((await get()).status, 200, role + " only needs sales.view");
  }
  r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({ deny: ["sales.view"], allow: ["shifts.manage"] }), owner.activeVenueId, staff.userId);
  assert.equal((await get()).status, 403); assert.equal((await get(outsider)).status, 401);
  assert.equal((await get(owner, `/api/pos-overview?shiftId=night&venueId=${outsider.activeVenueId}`)).status, 403);
  assert.equal((await get(owner, "/api/pos-overview?shiftId=foreign")).status, 404); assert.equal((await get(owner, "/api/pos-overview")).status, 400);
  assert.equal((await get(owner, "/api/pos-overview?shiftId=night", outsider.activeVenueId)).status, 401);
  assert.equal((await r.api.overview.GET(new Request("https://isolated.test/api/pos-overview?shiftId=night"))).status, 401);
});

test("real-auth overview rejects persisted null, malformed/incomplete history and database failure without zero fallback", async t => {
  const r = await lifecycleRuntime({ overview: "./app/api/pos-overview/route" }); t.after(r.close);
  const owner = await r.register("fail-owner@isolated.test"); const c = seedShift(r, owner);
  const get = () => r.api.overview.GET(selected(r, owner, owner.activeVenueId));
  for (const key of ["bd_pos_orders_v1", "bd_sales_events_v1", "bd_finance_revenue", "bd_assortment_v1"]) {
    put(r, owner.userId, key, null); const response = await get(); assert.equal(response.status, 409, key); assert.equal((await response.json() as { ok: boolean }).ok, false); seedShift(r, owner);
  }
  put(r, owner.userId, "bd_assortment_v1", { menuItems: null }); assert.equal((await get()).status, 409); seedShift(r, owner);
  c.revenues[0].revenue = 20; c.revenues[0].receipts = 1; put(r, owner.userId, "bd_finance_revenue", c.revenues);
  assert.equal((await get()).status, 409); seedShift(r, owner);
  r.failDatabase(); const failedBatch = await get(); assert.equal(failedBatch.status, 503); assert.equal((await failedBatch.json() as { code: string }).code, "POS_OVERVIEW_UNAVAILABLE");
  r.failDatabaseRead(); assert.equal((await get()).status, 503);
  assert.equal((await get()).status, 200, "failed read does not poison a future successful read");
});

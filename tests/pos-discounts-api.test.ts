import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import { hasPermission, type AccessRole } from "../lib/bardoctor/access-control";
import { POS_DISCOUNT_STORE_KEY, type PosDiscountRule } from "../lib/bardoctor/pos-discounts";
import { POS_ORDER_STORE_KEY, type PosOrder } from "../lib/bardoctor/pos-orders";
import { SALES_EVENT_STORE_KEY, planSalesShift, type SalesEvent } from "../lib/bardoctor/sales-events";
import { salesEventFixture } from "./helpers/sales-event-fixture";

type Payload = { ok: boolean; code?: string; error?: string; order: PosOrder; duplicate?: boolean; previewHash?: string; rules: PosDiscountRule[]; permissions: { configure: boolean; apply: boolean } };
function runtime() {
  let role: AccessRole = "owner", signedIn = true;
  const deps = { hasPermission, authenticateRequest: async () => signedIn ? { id: 7, venueId: 1, actorAccountId: role === "cashier" ? 44 : 7, role,
    jobTitle: role === "cashier" ? "waiter" : null, firstName: "Authenticated", lastName: role, restaurantJson: JSON.stringify({ currency: "MDL" }),
    permissions: ["sales.view", "sales.create", "sales.post", "settings.manage", "finance.view"] } : null };
  const r = openingRuntime(new URL("../app/api/pos-orders/route.ts", import.meta.url), deps);
  const config = r.loadRoute(new URL("../app/api/pos-discounts/route.ts", import.meta.url));
  const c = salesEventFixture(); c.revenues = planSalesShift(c, "open_shift", "shift", "Day");
  r.put("bd_assortment_v1", c.assortment); r.put("bd_finance_revenue", c.revenues);
  const send = (api: typeof config, body: object) => api.POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ venueId: 1, ...body }) }));
  const save = (extra: object = {}) => ({ action: "save", ruleId: "rule", operationId: "save", expectedRevision: 0, rule: { name: "Loyalty", kind: "PERCENT", value: 10, active: true }, ...extra });
  const command = (action: string, order: PosOrder, extra: object = {}) => ({ action, operationId: `${action}-${order.revision}`, orderId: order.id, expectedRevision: order.revision, ...extra });
  const create = async () => {
    const response = await send(r.api, { action: "create", orderId: "order", operationId: "create", expectedRevision: 0, shiftId: "shift", tableNumber: "7", lines: [{ id: "line", menuItemId: "beer", quantity: 3 }] });
    assert.equal(response.status, 201); return (await response.json() as Payload).order;
  };
  const apply = async (order: PosOrder, extra: object = {}) => send(r.api, command("apply_discount", order, { ruleId: "rule", ruleRevision: 1, reason: "Loyalty visit", ...extra }));
  const payCommand = async (order: PosOrder) => {
    const payment = { id: "payment", method: "CARD_EXTERNAL", amount: order.totals!.netAmount };
    const preview = await send(r.api, command("preview_payment", order, { payment })); assert.equal(preview.status, 200);
    return command("pay", order, { payment, previewHash: (await preview.json() as Payload).previewHash });
  };
  return { ...r, config, send, save, command, create, apply, payCommand, role: (value: AccessRole) => { role = value; }, signedIn: (value: boolean) => { signedIn = value; } };
}

test("HTTP discount rule configuration hard-gates roles, server actor, venue and malformed input", async () => {
  const r = runtime();
  try {
    for (const role of ["cashier", "shift_manager", "accountant", "viewer"] as AccessRole[]) {
      r.role(role); const denied = await r.send(r.config, r.save({ actor: { role: "owner" } }));
      assert.equal(denied.status, 403); assert.match((await denied.json() as Payload).error!, /владельцу и управляющему/);
    }
    r.role("owner"); assert.equal((await r.send(r.config, r.save())).status, 201);
    assert.equal((r.get(POS_DISCOUNT_STORE_KEY) as PosDiscountRule[])[0].createdBy.name, "Authenticated owner");
    assert.equal((await r.send(r.config, r.save())).status, 200);
    r.role("manager"); assert.equal((await r.send(r.config, r.save({ operationId: "edit", expectedRevision: 1, rule: { name: "Off", kind: "FIXED", value: 5, active: false } }))).status, 201);
    let list = await (await r.config.GET(new Request("http://localhost/api"))).json() as Payload;
    assert.equal(list.rules.length, 1); assert.equal(list.permissions.configure, true);
    r.role("shift_manager"); list = await (await r.config.GET(new Request("http://localhost/api"))).json() as Payload;
    assert.equal(list.rules.length, 0); assert.equal(list.permissions.configure, false);
    r.role("cashier"); assert.equal((await r.config.GET(new Request("http://localhost/api"))).status, 403);
    assert.equal((await r.send(r.config, r.save())).status, 403);
    r.role("owner"); assert.equal((await r.send(r.config, r.save({ venueId: 2 }))).status, 409);
    assert.equal((await r.send(r.config, r.save({ operationId: "invalid", rule: { name: "Bad", kind: "PERCENT", value: 101, active: true } }))).status, 409);
    assert.equal((await r.config.POST(new Request("http://localhost/api", { method: "POST", body: "null" }))).status, 400);
    r.signedIn(false); assert.equal((await r.config.GET(new Request("http://localhost/api"))).status, 401);
    assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log").get()?.n, 2);
  } finally { r.close(); }
});

test("HTTP apply/remove/replay are management-only; authenticated waiter title persists into discounted receipt", async () => {
  const r = runtime();
  try {
    await r.send(r.config, r.save()); r.role("cashier"); const order = await r.create();
    assert.equal((await r.apply(order, { actor: { role: "owner" }, role: "manager" })).status, 403);
    r.role("shift_manager"); const applied = await r.apply(order); assert.equal(applied.status, 201);
    const discounted = (await applied.json() as Payload).order;
    assert.equal(discounted.discount?.name, "Loyalty"); assert.equal(discounted.discount?.appliedBy.role, "shift_manager");
    assert.equal(discounted.createdBy.jobTitle, "waiter");
    assert.equal((await r.apply(order)).status, 200);
    r.role("cashier"); assert.equal((await r.apply(order)).status, 403);
    assert.equal((await r.send(r.api, r.command("remove_discount", discounted, { reason: "Remove" }))).status, 403);
    assert.equal((await r.send(r.api, r.command("add_items", discounted, { lines: [{ id: "new", menuItemId: "beer", quantity: 1 }] }))).status, 409);
    const command = await r.payCommand(discounted); assert.equal((await r.send(r.api, command)).status, 201);
    const events = r.get(SALES_EVENT_STORE_KEY) as SalesEvent[];
    assert.equal(events[0].revenue, 54); assert.equal(events[0].actor?.jobTitle, "waiter");
    assert.equal(events[0].discount?.appliedBy.role, "shift_manager");
    assert.equal((await r.send(r.api, command)).status, 200);
    assert.equal((r.get(SALES_EVENT_STORE_KEY) as unknown[]).length, 1);
    assert.equal((r.get("bd_assortment_v1") as { stockBalances: { current: number }[] }).stockBalances[0].current, 17);
  } finally { r.close(); }
});

test("HTTP config and application CAS races reject stale rules or orders without losing either change", async () => {
  for (const race of ["config", "apply", "order"] as const) {
    const r = runtime();
    try {
      await r.send(r.config, r.save()); const order = await r.create();
      r.beforeBatch(() => {
        if (race === "order") {
          const orders = r.get(POS_ORDER_STORE_KEY) as PosOrder[]; orders[0].revision++; r.put(POS_ORDER_STORE_KEY, orders);
        } else {
          const rules = r.get(POS_DISCOUNT_STORE_KEY) as PosDiscountRule[]; rules[0].revision++; rules[0].active = false; r.put(POS_DISCOUNT_STORE_KEY, rules);
        }
      });
      const response = race === "config" ? await r.send(r.config, r.save({ operationId: "edit", expectedRevision: 1 })) : await r.apply(order);
      assert.equal(response.status, 409);
      assert.equal((await response.json() as Payload).code, race === "config" ? "POS_DISCOUNT_REVISION_CONFLICT" : race === "apply" ? "POS_DISCOUNT_RULE_CHANGED" : "POS_ORDER_REVISION_CONFLICT");
      assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].discount, null);
      assert.equal(r.get(SALES_EVENT_STORE_KEY), null);
    } finally { r.close(); }
  }
});

test("HTTP config/application/discounted payment failures roll back state and audit atomically", async () => {
  for (const stage of ["config", "apply", "pay"] as const) for (const failure of stage === "pay" ? [1, 2, 3, 4, 5, 6] : [1, 2]) {
    const r = runtime();
    try {
      let body: object = r.save(); let api = r.config;
      if (stage !== "config") {
        await r.send(r.config, r.save()); const order = await r.create(); api = r.api;
        if (stage === "apply") body = r.command("apply_discount", order, { ruleId: "rule", ruleRevision: 1, reason: "Loyalty" });
        else { const discounted = (await (await r.apply(order)).json() as Payload).order; body = await r.payCommand(discounted); }
      }
      const keys = [POS_DISCOUNT_STORE_KEY, POS_ORDER_STORE_KEY, SALES_EVENT_STORE_KEY, "bd_assortment_v1", "bd_stock_movements", "bd_finance_revenue"];
      const before = keys.map(key => r.get(key)), audits = r.sqlite.prepare("SELECT count(*) n FROM audit_log").get()?.n;
      r.failAt(failure); await assert.rejects(() => r.send(api, body), /SIMULATED_D1_WRITE_FAILURE/);
      assert.deepEqual(keys.map(key => r.get(key)), before); assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log").get()?.n, audits);
    } finally { r.close(); }
  }
});

test("HTTP free check closes with zero payment and stale/forged monetary requests never persist", async () => {
  const r = runtime();
  try {
    await r.send(r.config, r.save({ rule: { name: "Complimentary", kind: "PERCENT", value: 100, active: true } }));
    const order = await r.create(), discounted = (await (await r.apply(order)).json() as Payload).order;
    assert.equal(discounted.totals?.netAmount, 0);
    const command = await r.payCommand(discounted);
    const forged = await r.send(r.api, { ...command, discountAmount: 0, totals: { netAmount: 0 } });
    assert.equal(forged.status, 409); assert.equal((await forged.json() as Payload).code, "POS_ORDER_DISCOUNT_FIELDS_FORBIDDEN");
    assert.equal((await r.send(r.api, command)).status, 201);
    assert.equal((r.get(SALES_EVENT_STORE_KEY) as SalesEvent[])[0].revenue, 0);
    assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].status, "PAID");
  } finally { r.close(); }
});

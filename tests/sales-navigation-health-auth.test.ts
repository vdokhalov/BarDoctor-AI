import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";

test("Sales owner may read Business Health; unchanged default cashier and anonymous contracts deny access", async () => {
  const runtime = await lifecycleRuntime({ health: "./app/api/business-health/route", me: "./app/api/users/me/route" });
  try {
    const owner = await runtime.register("health-owner@isolated.test");
    const me = await runtime.api.me.GET(runtime.request(owner, "/api/users/me"));
    assert.equal(me.status, 200);
    const allowed = await runtime.api.health.GET(runtime.request(owner, "/api/business-health"));
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json() as { success: boolean }).success, true);

    const cashier = await runtime.register("health-cashier@isolated.test");
    const workspace = runtime.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(owner.activeVenueId)?.workspace_id;
    runtime.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspace as number, cashier.userId);
    runtime.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'cashier')").run(owner.activeVenueId, cashier.userId);
    runtime.sqlite.prepare("UPDATE sessions SET active_venue_id=? WHERE account_id=?").run(owner.activeVenueId, cashier.userId);
    const denied = await runtime.api.health.GET(runtime.request(cashier, "/api/business-health"));
    assert.equal(denied.status, 403);
    assert.equal((await denied.json() as { code: string }).code, "ACCESS_DENIED");
    assert.equal((await runtime.api.health.GET(new Request("https://isolated.test/api/business-health"))).status, 401);
  } finally { runtime.close(); }
});

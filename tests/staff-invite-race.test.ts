import test from "node:test";
import assert from "node:assert/strict";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { readMemberJob } from "./helpers/staff-job-fixture";

for (const scenario of ["two-invites-one-account", "one-invite-two-accounts", "same-invite-same-account"] as const) {
  test(`claim race ${scenario}: losing preflight consumes and changes nothing`, async t => {
    const r = await lifecycleRuntime({ access: "./app/api/access/route", service: "./lib/bardoctor/access-service" }, { now: "2026-10-10T12:00:00.000Z" }); t.after(r.close);
    const owner = await r.register("race-owner@isolated.test"), first = await r.register("race-first@isolated.test"), second = await r.register("race-second@isolated.test");
    const issue = async (jobTitle: string, deny: string[]) => {
      const response = await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle, permissions: { deny } }));
      assert.equal(response.status, 201); return (await response.json() as { invite: { id: number; code: string } }).invite;
    };
    const a = await issue("waiter", ["sales.post"]), b = scenario === "two-invites-one-account" ? await issue("barista", ["sales.create"]) : a;
    const winner = scenario === "one-invite-two-accounts" ? second : first;
    const identityA = await r.api.auth.authenticateIdentityRequest(r.request(first, "/api/access/join")); assert.ok(identityA);
    const identityB = await r.api.auth.authenticateIdentityRequest(r.request(winner, "/api/access/join")); assert.ok(identityB);
    const service = r.api.service as unknown as typeof import("../lib/bardoctor/access-service");
    const snapshot = () => ["venue_memberships", "venue_invites", "workspace_memberships", "domain_data", "sqlite_sequence"]
      .map(table => r.sqlite.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    let committed: ReturnType<typeof snapshot> | undefined;
    // A has completed all preflight reads. Commit B at the last possible point
    // before A's transaction. Both calls deliberately have the same timestamp.
    r.beforeNextDomainWrite(async () => {
      assert.ok(await service.claimVenueInvite(identityB, b.code));
      committed = snapshot();
    });
    assert.equal(await service.claimVenueInvite(identityA, a.code), null);
    assert.ok(committed); assert.deepEqual(snapshot(), committed, "loser makes zero durable changes, including sequences");
    const rows = r.sqlite.prepare("SELECT * FROM venue_memberships WHERE venue_id=? AND role='cashier'").all(owner.activeVenueId);
    assert.equal(rows.length, 1); assert.equal(rows[0].account_id, winner.userId);
    assert.equal(readMemberJob(r.sqlite, winner.userId, owner.activeVenueId), scenario === "two-invites-one-account" ? "barista" : "waiter");
    assert.deepEqual(JSON.parse(String(rows[0].permissions_json)).deny, scenario === "two-invites-one-account" ? ["sales.create"] : ["sales.post"]);
    if (a !== b) assert.equal(r.sqlite.prepare("SELECT used_at FROM venue_invites WHERE id=?").get(a.id)?.used_at, null, "losing invite remains usable");
    assert.equal(r.sqlite.prepare("SELECT used_by_account_id FROM venue_invites WHERE id=?").get(b.id)?.used_by_account_id, winner.userId);
  });
}

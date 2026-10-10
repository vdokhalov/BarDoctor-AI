import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { readMemberJob } from "./helpers/staff-job-fixture";
import { canReadStore, canWriteStore } from "../lib/bardoctor/data-trust";
import { permissionsFor } from "../lib/bardoctor/access-control";

const routes = { access: "./app/api/access/route", join: "./app/api/access/join/route", members: "./app/api/access/members/[id]/route" };
const baseline = "4644a85c2843f0f51935555c4122facc3e1030ad";

test("no DDL or historical migration metadata change; title keys cannot use generic store access", () => {
  assert.equal(execFileSync("git", ["diff", baseline, "--", "db/schema.ts", "drizzle"], { encoding: "utf8" }), "");
  for (const role of ["owner", "manager", "shift_manager", "cashier"] as const) {
    for (const key of ["__bd_staff_job_v1__:12", "__bd_invite_job_v1__:hash"]) {
      const subject = { role, permissions: permissionsFor(role) };
      assert.equal(canReadStore(subject, key), false); assert.equal(canWriteStore(subject, key), false);
    }
  }
});

test("actual v505 member permissions and role edits preserve separately stored titles across rollback", async t => {
  const legacyPath = "app/api/access/members/[id]/route.ts";
  const r = await lifecycleRuntime({ ...routes, legacy: "legacy-v505-member-route" }, { plugins: [{ name: "exact-v505-member-handler", setup(build) {
    build.onResolve({ filter: /^legacy-v505-member-route$/ }, () => ({ path: legacyPath, namespace: "v505" }));
    build.onLoad({ filter: /.*/, namespace: "v505" }, () => ({ contents: execFileSync("git", ["show", `${baseline}:${legacyPath}`], { encoding: "utf8" }), loader: "ts", resolveDir: resolve("app/api/access/members/[id]") }));
  } }] }); t.after(r.close);
  const owner = await r.register("rollback-owner@isolated.test"), user = await r.register("rollback-staff@isolated.test");
  const invitation = await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle: "waiter", permissions: { deny: ["sales.post"] } }));
  const { invite } = await invitation.json() as { invite: { code: string } };
  assert.equal((await r.api.join.POST(r.request(user, "/api/access/join", "POST", { code: invite.code }))).status, 200);
  const row = r.sqlite.prepare("SELECT id FROM venue_memberships WHERE account_id=? AND venue_id=?").get(user.userId, owner.activeVenueId)!;
  const selected = () => { const request = r.request(user, "/api/access"); request.headers.set("X-Venue-Id", String(owner.activeVenueId)); return request; };
  for (const role of ["cashier", "manager", "cashier"]) {
    const response = await r.api.legacy.PATCH(r.request(owner, "/api/access/members/" + row.id, "PATCH", { role, permissions: { deny: ["sales.post"] } }), { params: Promise.resolve({ id: String(row.id) }) });
    assert.equal(response.status, 200);
    assert.equal(readMemberJob(r.sqlite, user.userId, owner.activeVenueId), "waiter");
    const account = await r.api.auth.authenticateRequest(selected());
    assert.equal(account?.role, role); assert.equal(account?.jobTitle, role === "cashier" ? "waiter" : null);
    assert.equal(account?.permissions.includes("sales.post"), false);
  }
});

test("metadata failure rolls back invite issue, one-use claim and combined role/title edit", async t => {
  const r = await lifecycleRuntime(routes); t.after(r.close);
  const owner = await r.register("atomic-owner@isolated.test"), user = await r.register("atomic-staff@isolated.test");
  r.sqlite.exec("CREATE TRIGGER reject_job BEFORE INSERT ON domain_data WHEN NEW.store_key LIKE '__bd_invite_job_v1__:%' BEGIN SELECT RAISE(ABORT,'isolated job failure'); END");
  await assert.rejects(r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle: "barista" })), /isolated job failure/);
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venue_invites").get()?.n, 0);
  r.sqlite.exec("DROP TRIGGER reject_job");
  const { invite } = await (await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle: "barista" }))).json() as { invite: { code: string; id: number } };
  r.sqlite.exec("CREATE TRIGGER reject_job BEFORE INSERT ON domain_data WHEN NEW.store_key LIKE '__bd_staff_job_v1__:%' BEGIN SELECT RAISE(ABORT,'isolated job failure'); END");
  await assert.rejects(r.api.join.POST(r.request(user, "/api/access/join", "POST", { code: invite.code })), /isolated job failure/);
  assert.equal(r.sqlite.prepare("SELECT used_at FROM venue_invites WHERE id=?").get(invite.id)?.used_at, null);
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venue_memberships WHERE account_id=? AND venue_id=?").get(user.userId, owner.activeVenueId)?.n, 0);
  r.sqlite.exec("DROP TRIGGER reject_job");
  assert.equal((await r.api.join.POST(r.request(user, "/api/access/join", "POST", { code: invite.code }))).status, 200);
  const before = r.sqlite.prepare("SELECT * FROM venue_memberships WHERE account_id=? AND venue_id=?").get(user.userId, owner.activeVenueId)!;
  r.sqlite.exec("CREATE TRIGGER reject_job BEFORE INSERT ON domain_data WHEN NEW.store_key LIKE '__bd_staff_job_v1__:%' BEGIN SELECT RAISE(ABORT,'isolated job failure'); END");
  await assert.rejects(r.api.members.PATCH(r.request(owner, "/api/access/members/" + before.id, "PATCH", { role: "manager" }), { params: Promise.resolve({ id: String(before.id) }) }), /isolated job failure/);
  assert.deepEqual(r.sqlite.prepare("SELECT * FROM venue_memberships WHERE id=?").get(before.id!), before);
  assert.equal(readMemberJob(r.sqlite, user.userId, owner.activeVenueId), "barista");
});

test("an invitation claimed by exact v505 retains its job after upgrade, with strict claim provenance", async t => {
  const r = await lifecycleRuntime({ ...routes, legacy: "legacy-v505-invite-service" }, { plugins: [{ name: "exact-v505-claim", setup(build) {
    build.onResolve({ filter: /^legacy-v505-invite-service$/ }, () => ({ path: "lib/bardoctor/access-service.ts", namespace: "v505" }));
    build.onLoad({ filter: /.*/, namespace: "v505" }, () => ({ contents: execFileSync("git", ["show", `${baseline}:lib/bardoctor/access-service.ts`], { encoding: "utf8" }), loader: "ts", resolveDir: resolve("lib/bardoctor") }));
  } }] }); t.after(r.close);
  const owner = await r.register("legacy-claim-owner@isolated.test"), user = await r.register("legacy-claim-staff@isolated.test");
  const { invite } = await (await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle: "bartender" }))).json() as { invite: { id: number; code: string } };
  const identity = await r.api.auth.authenticateIdentityRequest(r.request(user, "/api/access/join")); assert.ok(identity);
  const legacy = r.api.legacy as unknown as { claimVenueInvite: (account: typeof identity, code: string) => Promise<unknown> };
  assert.ok(await legacy.claimVenueInvite(identity, invite.code));
  assert.equal(readMemberJob(r.sqlite, user.userId, owner.activeVenueId), null, "v505 did not know the metadata store");
  const request = () => { const req = r.request(user, "/api/access"); req.headers.set("X-Venue-Id", String(owner.activeVenueId)); return req; };
  assert.equal((await r.api.auth.authenticateRequest(request()))?.jobTitle, "bartender");
  const membership = r.sqlite.prepare("SELECT * FROM venue_memberships WHERE account_id=? AND venue_id=?").get(user.userId, owner.activeVenueId)!;
  for (const field of ["venue_id", "used_by_account_id", "created_by_account_id"]) {
    const before = r.sqlite.prepare(`SELECT ${field} value FROM venue_invites WHERE id=?`).get(invite.id)!.value;
    const other = field === "venue_id" ? user.activeVenueId : field === "used_by_account_id" ? owner.userId : user.userId;
    r.sqlite.prepare(`UPDATE venue_invites SET ${field}=? WHERE id=?`).run(other, invite.id);
    assert.equal((await r.api.auth.authenticateRequest(request()))?.jobTitle, "cashier", field + " cannot borrow title metadata");
    r.sqlite.prepare(`UPDATE venue_invites SET ${field}=? WHERE id=?`).run(before!, invite.id);
  }
  r.sqlite.prepare("UPDATE venue_invites SET used_at='2000-01-01' WHERE id=?").run(invite.id);
  assert.equal((await r.api.auth.authenticateRequest(request()))?.jobTitle, "cashier", "claim timestamp must match");
  r.sqlite.prepare("UPDATE venue_invites SET used_at=? WHERE id=?").run(membership.joined_at!, invite.id);
  const patch = await r.api.members.PATCH(r.request(owner, "/api/access/members/" + membership.id, "PATCH", { jobTitle: "waiter" }), { params: Promise.resolve({ id: String(membership.id) }) });
  assert.equal(patch.status, 200); assert.equal((await r.api.auth.authenticateRequest(request()))?.jobTitle, "waiter", "explicit edit overrides historical invitation");
});

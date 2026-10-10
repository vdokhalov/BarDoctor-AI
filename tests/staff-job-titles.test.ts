import { readMemberJob } from "./helpers/staff-job-fixture";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { lifecycleRuntime } from "./helpers/lifecycle-runtime";
import { hasPermission, permissionsFor, type PermissionKey } from "../lib/bardoctor/access-control";
import { STAFF_JOB_TITLES, staffJobTitle, validStaffJobTitle } from "../lib/bardoctor/staff-job-title";

const routes = {
  access: "./app/api/access/route", members: "./app/api/access/members/[id]/route",
  invites: "./app/api/access/invites/[id]/route", join: "./app/api/access/join/route",
  activeVenue: "./app/api/access/active-venue/route", events: "./app/api/sales-events/route",
};
const cashierPermissions = ["sales.view", "sales.create", "sales.post"];
type InvitePayload = { invite: { id: number; code: string; role: string; jobTitle: string } };
type AccessPayload = { current: { jobTitle: string }; canManageAccess: boolean; members: { role: string; jobTitle: string }[] };
type User = { email: string; token: string; userId: number; activeVenueId: number; role: string; jobTitle: string | null; permissions: string[] };

test("job titles never define an access role or broaden the cashier boundary", () => {
  for (const jobTitle of STAFF_JOB_TITLES) {
    assert.equal(validStaffJobTitle("cashier", jobTitle), true);
    assert.equal(staffJobTitle("cashier", jobTitle), jobTitle);
    assert.equal(validStaffJobTitle("manager", jobTitle), false);
    assert.equal(staffJobTitle("manager", jobTitle), null);
    const permissions = permissionsFor("cashier", JSON.stringify({ allow: ["shifts.manage", "finance.view", "inventory.manage", "sales.reverse", "access.manage"] }));
    assert.deepEqual(permissions, cashierPermissions);
    for (const permission of ["shifts.manage", "finance.view", "inventory.manage", "sales.reverse", "access.manage"] as PermissionKey[]) {
      assert.equal(hasPermission({ role: "cashier", permissions: [...permissions, permission] }, permission), false);
    }
  }
  assert.equal(staffJobTitle("cashier", null), "cashier", "legacy cashier metadata stays compatible");
  assert.equal(validStaffJobTitle("cashier", "administrator"), false);
  assert.equal(validStaffJobTitle("cashier", ""), false);
});

test("each job survives one-use invite, fresh registration/login, auth and team display without owner fallback", async t => {
  const r = await lifecycleRuntime(routes); t.after(r.close);
  const owner = await r.register("jobs-owner@isolated.test");
  const other = await r.register("jobs-other-owner@isolated.test");
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Jobs QA", currency: "MDL" }), owner.userId);
  for (const jobTitle of STAFF_JOB_TITLES) {
    const invitation = await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle, permissions: { allow: ["finance.view", "shifts.manage", "access.manage"] } }));
    assert.equal(invitation.status, 201);
    const { invite } = await invitation.json() as InvitePayload;
    assert.equal(invite.role, "cashier"); assert.equal(invite.jobTitle, jobTitle);
    assert.equal(JSON.parse(String(r.sqlite.prepare("SELECT j.data_json FROM domain_data j JOIN venue_invites i ON j.account_id=i.created_by_account_id AND j.store_key='__bd_invite_job_v1__:' || i.code_hash WHERE i.id=?").get(invite.id)?.data_json)), jobTitle);
    const email = `jobs-${jobTitle}@isolated.test`;
    const registration = await r.api.register.POST(new Request("https://isolated.test/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName: "Staff", password: "Isolated-Test-Password-123!", registrationMode: "join", invitationCode: invite.code, role: "owner", jobTitle: "manager" }),
    }));
    assert.equal(registration.status, 201);
    const user = await registration.json() as User;
    assert.equal(user.role, "cashier"); assert.equal(user.jobTitle, jobTitle);
    assert.equal(user.activeVenueId, owner.activeVenueId); assert.deepEqual(user.permissions, cashierPermissions);
    assert.equal(r.sqlite.prepare("SELECT owns_venue FROM accounts WHERE id=?").get(user.userId)?.owns_venue, 0);
    assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venues WHERE created_by_account_id=?").get(user.userId)?.n, 0);
    const membership = r.sqlite.prepare("SELECT * FROM venue_memberships WHERE account_id=?").get(user.userId)!;
    assert.equal(membership.role, "cashier"); assert.equal(readMemberJob(r.sqlite,user.userId,owner.activeVenueId), jobTitle);
    const freshLogin = await r.api.login.POST(new Request("https://isolated.test/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "Isolated-Test-Password-123!" }) }));
    assert.equal(freshLogin.status, 200);
    const login = await freshLogin.json() as User;
    assert.equal(login.role, "cashier"); assert.equal(login.jobTitle, jobTitle); assert.deepEqual(login.permissions, cashierPermissions);
    const authenticated = await r.api.auth.authenticateRequest(r.request(login, "/api/access"));
    assert.equal(authenticated?.role, "cashier"); assert.equal(authenticated?.jobTitle, jobTitle);
    const overview = await r.api.access.GET(r.request(login, "/api/access"));
    const self = await overview.json() as AccessPayload;
    assert.equal(self.current.jobTitle, jobTitle); assert.equal(self.canManageAccess, false);
    assert.equal(self.members.length, 1); assert.equal(self.members[0].jobTitle, jobTitle);
    assert.equal((await r.api.access.POST(r.request(login, "/api/access", "POST", { role: "manager" }))).status, 403);
    assert.equal((await r.api.members.PATCH(r.request(login, `/api/access/members/${membership.id}`, "PATCH", { role: "manager" }), { params: Promise.resolve({ id: String(membership.id) }) })).status, 403);
    assert.equal((await r.api.events.POST(r.request(login, "/api/sales-events", "POST", { action: "open_shift", venueId: owner.activeVenueId, shiftId: "forbidden", name: "Forbidden" }))).status, 403);
    assert.equal((await r.api.join.POST(r.request(other, "/api/access/join", "POST", { code: invite.code }))).status, 400, "code is single use");
    const foreignHeaders = new Headers(r.request(login, "/api/access").headers); foreignHeaders.set("X-Venue-Id", String(other.activeVenueId));
    assert.equal(await r.api.auth.authenticateRequest(new Request("https://isolated.test/api/access", { headers: foreignHeaders })), null);
  }
  const list = await (await r.api.access.GET(r.request(owner, "/api/access"))).json() as AccessPayload;
  assert.deepEqual(list.members.filter((member: { role: string }) => member.role === "cashier").map((member: { jobTitle: string }) => member.jobTitle).sort(), [...STAFF_JOB_TITLES].sort());
});

test("existing-account join preserves venue-scoped job and title editing preserves cashier restrictions", async t => {
  const r = await lifecycleRuntime(routes); t.after(r.close);
  const owner = await r.register("join-owner@isolated.test");
  const user = await r.register("existing-user@isolated.test");
  const originalVenue = user.activeVenueId;
  const { invite } = await (await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier", jobTitle: "waiter", permissions: { deny: ["sales.post"] } }))).json() as InvitePayload;
  const joined = await r.api.join.POST(r.request(user, "/api/access/join", "POST", { code: invite.code }));
  assert.equal(joined.status, 200);
  const payload = await joined.json() as User; assert.equal(payload.jobTitle, "waiter"); assert.equal(payload.role, "cashier");
  const membership = r.sqlite.prepare("SELECT * FROM venue_memberships WHERE venue_id=? AND account_id=?").get(owner.activeVenueId, user.userId)!;
  const patch = (body: unknown) => r.api.members.PATCH(r.request(owner, `/api/access/members/${membership.id}`, "PATCH", body), { params: Promise.resolve({ id: String(membership.id) }) });
  assert.equal((await patch({ jobTitle: "bartender" })).status, 200);
  const authenticated = await r.api.auth.authenticateRequest(r.request(user, "/api/access"));
  assert.equal(authenticated?.jobTitle, "bartender"); assert.equal(authenticated?.role, "cashier"); assert.equal(authenticated?.permissions.includes("sales.post"), false);
  assert.equal((await patch({ role: "cashier", jobTitle: "barista", permissions: { allow: ["finance.view", "sales.reverse"], deny: ["sales.post"] } })).status, 200);
  assert.deepEqual((await r.api.auth.authenticateRequest(r.request(user, "/api/access")))?.permissions, ["sales.view", "sales.create"]);
  assert.equal((await patch({ jobTitle: "administrator" })).status, 400);
  assert.equal((await patch({ role: "manager", jobTitle: "waiter" })).status, 400);
  assert.equal((await patch({ role: "manager" })).status, 200);
  assert.equal(readMemberJob(r.sqlite,user.userId,owner.activeVenueId), null);
  assert.equal((await patch({ role: "cashier", jobTitle: "waiter", permissions: { allow: [], deny: [] } })).status, 200);
  assert.equal((await patch({ status: "disabled" })).status, 200);
  const disabledHeaders = new Headers(r.request(user, "/api/access").headers); disabledHeaders.set("X-Venue-Id", String(owner.activeVenueId));
  assert.equal(await r.api.auth.authenticateRequest(new Request("https://isolated.test/api/access", { headers: disabledHeaders })), null);
  assert.equal((await patch({ status: "active" })).status, 200);
  const switched = await r.api.activeVenue.POST(r.request(user, "/api/access/active-venue", "POST", { venueId: originalVenue }));
  assert.equal(switched.status, 200); assert.equal((await switched.json() as User).jobTitle, null, "job never follows user to another venue");
});

test("invalid titles and cross-role metadata fail before issuing an invitation", async t => {
  const r = await lifecycleRuntime(routes); t.after(r.close);
  const owner = await r.register("invalid-jobs@isolated.test");
  for (const body of [{ role: "waiter" }, { role: "cashier", jobTitle: "administrator" }, { role: "cashier", jobTitle: "" }, { role: "manager", jobTitle: "waiter" }, { role: "owner", jobTitle: "barista" }]) {
    assert.equal((await r.api.access.POST(r.request(owner, "/api/access", "POST", body))).status, 400);
  }
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venue_invites").get()?.n, 0);
  const legacy = await (await r.api.access.POST(r.request(owner, "/api/access", "POST", { role: "cashier" }))).json() as InvitePayload;
  assert.equal(legacy.invite.jobTitle, "cashier");
  for (const table of ["venue_memberships", "venue_invites"]) assert.equal(r.sqlite.prepare(`PRAGMA table_info(${table})`).all().some(column => column.name === "job_title"), false, "unchanged production schema");
});

test("team controls send canonical cashier plus job metadata and joined staff land in cashier", () => {
  const source = readFileSync("public/team-access.js", "utf8");
  const prelude = source.slice(source.indexOf("  var ROLE_LABELS"), source.indexOf("  function sessionHeaders"));
  const context = vm.createContext({}); vm.runInContext(prelude, context);
  for (const jobTitle of STAFF_JOB_TITLES) {
    assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext(`choicePayload('${jobTitle}')`, context))), { role: "cashier", jobTitle });
  }
  assert.match(source, /result\.role === "cashier" \? "\/cashier" : "\/employees"/);
  assert.match(source, /if \(changes\.role !== member\.role\) changes\.permissions/);
  const html = readFileSync("app/team-access/route.ts", "utf8");
  for (const label of ["Кассир", "Официант", "Бариста", "Бармен"]) assert.ok(html.includes(label));
  const bootstrap = readFileSync("public/bardoctor-preview.js", "utf8");
  assert.match(bootstrap, /confirmedPosRole\.role === "cashier"/);
  assert.match(bootstrap, /window\.location\.replace\("\/cashier\?venue="/);
});

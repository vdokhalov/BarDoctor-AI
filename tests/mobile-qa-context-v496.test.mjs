import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const projectRoot = process.env.BD_MOBILE_QA_CONTEXT_ROOT || fileURLToPath(new URL("../", import.meta.url));
const permissions = ["inventory.view", "inventory.manage", "equipment.view", "equipment.manage", "reports.view", "finance.view", "finance.manage", "team.view"];
const ownerContext = {
  email: "mobile-qa@bardoctor.local", token: "mobile-qa-token", userId: "mobile-qa-user", role: "owner",
  activeVenueId: 901, activeWorkspaceId: "mobile-qa", activeVenueIsPrimary: true,
  canCreateVenues: true, permissions,
  venues: [
    { id: 901, workspaceId: "mobile-qa", name: "Mobile QA A", role: "owner", isPrimary: true, status: "active", permissions },
    { id: 902, workspaceId: "mobile-qa", name: "Mobile QA B", role: "owner", isPrimary: false, status: "active", permissions },
  ],
};
const fixtureCases = [
  { name: "assortment", filename: "assortment-qa-v170.js", query: "?qaAssortment=default", fallbackEmail: "assortment-v170-qa@bardoctor.local", fallbackUserId: "qa-assortment-user", fallbackVenue: "501", fallbackWorkspace: "qa-assortment-workspace", fixtureKey: "bd_assortment_v1_cache" },
  { name: "equipment", filename: "equipment-qa-v167.js", query: "?qaEquipment=default", fallbackEmail: "equipment-v167-qa@bardoctor.local", fallbackUserId: "qa-equipment-user", fallbackVenue: "301", fallbackWorkspace: "qa-equipment-workspace", fixtureKey: "bd_equipment_cache" },
  { name: "monthly report", filename: "monthly-report-qa-v165.js", query: "?qaReport=closed&month=2026-07", fallbackEmail: "monthly-report-qa@bardoctor.local", fallbackUserId: "qa-local-user", fallbackVenue: "qa-monthly-venue", fixtureKey: "bd_finance_revenue_cache" },
];

function runFixture(fixture, { marker, hostname = "127.0.0.1", search = fixture.query, forbidMarkerRead = false } = {}) {
  const data = new Map();
  const writes = [];
  if (marker) {
    for (const [key, value] of Object.entries({
      bd_session: marker.email, bd_session_token: marker.token, bd_session_userid: marker.userId,
      bd_active_venue_id: marker.activeVenueId, bd_active_venue_is_primary: marker.activeVenueIsPrimary ? "1" : "0", bd_active_role: marker.role,
      bd_active_permissions: JSON.stringify(marker.permissions),
      ["bd_venue_context__" + marker.email]: JSON.stringify({ activeVenueId: marker.activeVenueId, activeWorkspaceId: marker.activeWorkspaceId, canCreateVenues: marker.canCreateVenues, venues: marker.venues }),
    })) data.set(key, String(value));
  }
  const initialEntries = [...data];
  const localStorage = {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { writes.push({ key, value: String(value) }); data.set(key, String(value)); },
    removeItem(key) { writes.push({ key, removed: true }); data.delete(key); },
  };
  const forwarded = [];
  const originalFetch = async (input, init) => { forwarded.push({ input, init }); return new Response(JSON.stringify({ original: true }), { status: 202 }); };
  const window = { location: { hostname, search, origin: "http://" + hostname }, fetch: originalFetch };
  if (forbidMarkerRead) Object.defineProperty(window, "__bdMobileQaContextV496", { get() { throw new Error("fixture marker read before eligibility guard"); } });
  else if (marker) window.__bdMobileQaContextV496 = marker;
  const source = readFileSync(path.join(projectRoot, "public", fixture.filename), "utf8");
  vm.runInNewContext(source, { window, localStorage, URLSearchParams, URL, Response, Date, console }, { filename: fixture.filename });
  return { data, writes, window, originalFetch, initialEntries, forwarded };
}

for (const fixture of fixtureCases) {
  test(`${fixture.name}: module fixture preserves pre-bootstrap mobile owner context`, async () => {
    const marker = structuredClone(ownerContext);
    const before = structuredClone(marker);
    const runtime = runFixture(fixture, { marker });
    for (const [key, expected] of Object.entries({ bd_session: marker.email, bd_session_token: marker.token, bd_session_userid: marker.userId, bd_active_venue_id: "901", bd_active_venue_is_primary: "1", bd_active_role: "owner" })) assert.equal(runtime.data.get(key), expected, key);
    assert.deepEqual(JSON.parse(runtime.data.get("bd_active_permissions")), marker.permissions);
    const access = JSON.parse(runtime.data.get("bd_venue_context__" + marker.email));
    assert.equal(access.activeVenueId, 901);
    assert.equal(access.activeWorkspaceId, marker.activeWorkspaceId);
    assert.equal(access.canCreateVenues, marker.canCreateVenues);
    assert.deepEqual(access.venues, marker.venues);
    assert.ok(access.venues.some((venue) => String(venue.id) === runtime.data.get("bd_active_venue_id")), "active venue must belong to advertised owner venues");
    const scope = "__" + marker.email + "__venue_901";
    assert.ok(JSON.parse(runtime.data.get("bd_restaurant_cache" + scope)).name, "module profile fixture retained");
    assert.ok(runtime.data.has(fixture.fixtureKey + scope), "module business fixture remains in owner scope");
    assert.equal(runtime.data.has("bd_restaurant_cache__" + fixture.fallbackEmail + "__venue_" + fixture.fallbackVenue), false, "no standalone profile leaks into owner fixture");
    assert.deepEqual(marker, before, "fixture must not mutate supplied owner context");
    if (fixture.name === "assortment") {
      assert.notEqual(runtime.window.fetch, runtime.originalFetch, "existing assortment API wrapper retained");
      const response = await runtime.window.fetch("/api/auth/bootstrap", { method: "POST" });
      assert.equal(response.status, 200);
      const bootstrap = await response.json();
      assert.equal(response.bodyUsed, true, "native Response body consumption retained");
      assert.equal(bootstrap.email, marker.email);
      assert.equal(bootstrap.token, marker.token);
      assert.equal(bootstrap.userId, marker.userId);
      assert.equal(bootstrap.activeVenueId, marker.activeVenueId);
      assert.equal(bootstrap.activeWorkspaceId, marker.activeWorkspaceId);
      assert.equal(bootstrap.activeVenueIsPrimary, marker.activeVenueIsPrimary);
      assert.deepEqual(bootstrap.venues, marker.venues);
      assert.deepEqual(bootstrap.permissions, marker.permissions);
      const me = await (await runtime.window.fetch("/api/users/me")).json();
      assert.equal(me.user.email, marker.email);
      assert.equal(me.user.activeWorkspaceId, marker.activeWorkspaceId);
      assert.deepEqual(me.user.venues, marker.venues);
      const analytics = await (await runtime.window.fetch("/api/assortment/overview")).json();
      assert.equal(analytics.venueId, marker.activeVenueId);
      assert.ok(analytics.analytics.menuItems.length > 0, "real module fixture remains available");
      const request = new Request("http://127.0.0.1:4188/api/unhandled", { method: "POST", body: "fixture body" });
      const init = { cache: "no-store" };
      assert.equal((await runtime.window.fetch(request, init)).status, 202);
      assert.equal(runtime.forwarded[0].input, request);
      assert.equal(runtime.forwarded[0].init, init);
    } else assert.equal(runtime.window.fetch, runtime.originalFetch, "storage-only fixtures must not add a fetch wrapper");
  });

  test(`${fixture.name}: absent marker keeps standalone QA identity and original venue representation`, async () => {
    const runtime = runFixture(fixture);
    assert.equal(runtime.data.get("bd_session"), fixture.fallbackEmail);
    assert.equal(runtime.data.get("bd_session_token"), "qa-local-token");
    assert.equal(runtime.data.get("bd_session_userid"), fixture.fallbackUserId);
    assert.equal(runtime.data.get("bd_active_venue_id"), fixture.fallbackVenue);
    const scope = "__" + fixture.fallbackEmail + "__venue_" + fixture.fallbackVenue;
    assert.ok(runtime.data.has(fixture.fixtureKey + scope));
    if (fixture.fallbackWorkspace) {
      const access = JSON.parse(runtime.data.get("bd_venue_context__" + fixture.fallbackEmail));
      assert.equal(access.activeWorkspaceId, fixture.fallbackWorkspace);
      assert.ok(access.venues.some((venue) => String(venue.id) === fixture.fallbackVenue));
    } else assert.equal(runtime.data.has("bd_venue_context__" + fixture.fallbackEmail), false, "monthly standalone helper historically omits access context");
    if (fixture.name === "assortment") {
      const bootstrap = await (await runtime.window.fetch("/api/auth/bootstrap", { method: "POST" })).json();
      assert.equal(bootstrap.email, fixture.fallbackEmail);
      assert.equal(bootstrap.token, "qa-local-token");
      assert.equal(String(bootstrap.activeVenueId), fixture.fallbackVenue);
    }
  });

  test(`${fixture.name}: production hostname exits before reading marker or writing storage`, () => {
    const runtime = runFixture(fixture, { marker: structuredClone(ownerContext), hostname: "bardoctor.example", forbidMarkerRead: true });
    assert.deepEqual([...runtime.data], runtime.initialEntries);
    assert.deepEqual(runtime.writes, []);
    assert.equal(runtime.window.fetch, runtime.originalFetch);
  });

  test(`${fixture.name}: marker alone does not activate a module fixture`, () => {
    const runtime = runFixture(fixture, { marker: structuredClone(ownerContext), search: "?venue=901", forbidMarkerRead: true });
    assert.deepEqual([...runtime.data], runtime.initialEntries);
    assert.deepEqual(runtime.writes, []);
    assert.equal(runtime.window.fetch, runtime.originalFetch);
  });
}

for (const fixture of fixtureCases) {
  test(`${fixture.name}: secondary owner fixture preserves denied venue creation and primary flag`, async () => {
    const marker = { ...structuredClone(ownerContext), activeVenueId: 902, activeVenueIsPrimary: false, canCreateVenues: false };
    const before = structuredClone(marker);
    const runtime = runFixture(fixture, { marker });
    assert.equal(runtime.data.get("bd_session"), marker.email);
    assert.equal(runtime.data.get("bd_session_token"), marker.token);
    assert.equal(runtime.data.get("bd_session_userid"), marker.userId);
    assert.equal(runtime.data.get("bd_active_venue_id"), "902");
    assert.equal(runtime.data.get("bd_active_venue_is_primary"), "0");
    const access = JSON.parse(runtime.data.get("bd_venue_context__" + marker.email));
    assert.equal(access.activeVenueId, 902);
    assert.equal(access.canCreateVenues, false);
    assert.deepEqual(access.venues, marker.venues);
    assert.ok(runtime.data.has(fixture.fixtureKey + "__" + marker.email + "__venue_902"));
    assert.deepEqual(marker, before);
    if (fixture.name === "assortment") {
      const bootstrap = await (await runtime.window.fetch("/api/auth/bootstrap", { method: "POST" })).json();
      assert.equal(bootstrap.canCreateVenues, false);
      assert.equal(bootstrap.activeVenueIsPrimary, false);
      assert.equal(bootstrap.activeVenueId, 902);
      const me = await (await runtime.window.fetch("/api/users/me")).json();
      assert.equal(me.user.canCreateVenues, false);
      assert.equal(me.user.activeVenueIsPrimary, false);
    }
  });
}

test("assortment: readonly fixture restricts role and permissions without mutating owner marker", async () => {
  const marker = structuredClone(ownerContext);
  const before = structuredClone(marker);
  const fixture = fixtureCases[0];
  const runtime = runFixture(fixture, { marker, search: "?qaAssortment=readonly" });
  assert.equal(runtime.data.get("bd_session"), marker.email);
  assert.equal(runtime.data.get("bd_session_token"), marker.token);
  assert.equal(runtime.data.get("bd_session_userid"), marker.userId);
  assert.equal(runtime.data.get("bd_active_venue_id"), "901");
  assert.equal(runtime.data.get("bd_active_role"), "manager");
  const allowed = marker.permissions.filter((permission) => permission !== "inventory.manage");
  assert.deepEqual(JSON.parse(runtime.data.get("bd_active_permissions")), allowed);
  const access = JSON.parse(runtime.data.get("bd_venue_context__" + marker.email));
  for (const venue of access.venues) {
    assert.equal(venue.role, "manager");
    assert.deepEqual(venue.permissions, allowed);
  }
  const bootstrap = await (await runtime.window.fetch("/api/auth/bootstrap", { method: "POST" })).json();
  assert.equal(bootstrap.role, "manager");
  assert.deepEqual(bootstrap.permissions, allowed);
  assert.deepEqual(bootstrap.venues, access.venues);
  const me = await (await runtime.window.fetch("/api/users/me")).json();
  assert.equal(me.user.role, "manager");
  assert.deepEqual(me.user.permissions, allowed);
  assert.deepEqual(me.user.venues, access.venues);
  assert.deepEqual(marker, before, "readonly fixture must not mutate owner marker or nested venues/permissions");
});

test("assortment: standalone readonly fixture keeps legacy manager restriction", async () => {
  const runtime = runFixture(fixtureCases[0], { search: "?qaAssortment=readonly" });
  assert.equal(runtime.data.get("bd_session"), "assortment-v170-qa@bardoctor.local");
  assert.equal(runtime.data.get("bd_active_role"), "manager");
  assert.equal(JSON.parse(runtime.data.get("bd_active_permissions")).includes("inventory.manage"), false);
  const bootstrap = await (await runtime.window.fetch("/api/auth/bootstrap", { method: "POST" })).json();
  assert.equal(bootstrap.role, "manager");
  assert.equal(bootstrap.permissions.includes("inventory.manage"), false);
});

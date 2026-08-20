import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  permissionsFor,
  sanitizePermissionOverrides,
} from "../lib/bardoctor/access-control";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner, manager and shift manager have intentionally different defaults", () => {
  const owner = new Set(permissionsFor("owner"));
  const manager = new Set(permissionsFor("manager"));
  const shiftManager = new Set(permissionsFor("shift_manager"));

  assert.equal(owner.has("integrations.manage"), true);
  assert.equal(owner.has("access.manage"), true);

  assert.equal(manager.has("finance.manage"), true);
  assert.equal(manager.has("payroll.approve"), true);
  assert.equal(manager.has("month.close"), true);
  assert.equal(manager.has("integrations.manage"), false);
  assert.equal(manager.has("finance.export"), false);
  assert.equal(manager.has("month.reopen"), false);
  assert.equal(manager.has("shifts.delete"), false);

  assert.equal(shiftManager.has("shifts.manage"), true);
  assert.equal(shiftManager.has("expenses.create"), true);
  assert.equal(shiftManager.has("equipment.manage"), true);
  assert.equal(shiftManager.has("finance.view"), false);
  assert.equal(shiftManager.has("payroll.view"), false);
  assert.equal(shiftManager.has("settings.manage"), false);
});

test("owner overrides can narrow or extend delegated rights without delegating owner-only integrations", () => {
  const overrides = sanitizePermissionOverrides("manager", {
    allow: ["finance.export", "access.manage", "integrations.manage"],
    deny: ["payroll.view", "finance.manage"],
  });
  const permissions = new Set(permissionsFor("manager", JSON.stringify(overrides)));

  assert.equal(permissions.has("finance.export"), true);
  assert.equal(permissions.has("payroll.view"), false);
  assert.equal(permissions.has("payroll.manage"), false);
  assert.equal(permissions.has("payroll.approve"), false);
  assert.equal(permissions.has("finance.manage"), false);
  assert.equal(permissions.has("access.manage"), false);
  assert.equal(permissions.has("integrations.manage"), false);
});

test("a delegated write permission is removed when its required view permission is denied", () => {
  const manager = new Set(permissionsFor("manager", JSON.stringify({
    allow: ["shifts.delete"],
    deny: ["finance.view", "shifts.manage"],
  })));

  assert.equal(manager.has("finance.view"), false);
  assert.equal(manager.has("finance.manage"), false);
  assert.equal(manager.has("shifts.manage"), false);
  assert.equal(manager.has("shifts.delete"), false);
});

test("client navigation keeps audit viewing separate from canonical access management", async () => {
  const [client, dataControl, dataControlRoute, teamAccess] = await Promise.all([
    read("public/bardoctor-preview.js"),
    read("public/data-control.js"),
    read("app/data-control/route.ts"),
    read("public/team-access.js"),
  ]);

  for (const path of [
    "/shifts",
    "/equipment",
    "/catalog",
    "/cases",
    "/tasks",
    "/market",
    "/reviews",
    "/opportunities",
    "/settings",
    "/integrations",
  ]) {
    assert.match(client, new RegExp(`prefix: "${path.replace("/", "\\/")}"`));
  }
  assert.match(client, /prefix: "\/data-control", permission: "audit\.view"/);
  assert.match(client, /prefix: "\/team-access", permission: "access\.manage"/);
  assert.match(dataControl, /\/api\/audit/);
  assert.match(dataControl, /options && options\.canReopen/);
  assert.doesNotMatch(dataControl, /permissionSheet|\/api\/import\/preview/);
  assert.match(dataControlRoute, /data-tab="overview">Обзор/);
  assert.match(dataControlRoute, /data-tab="journal">Журнал/);
  assert.match(dataControlRoute, /data-tab="periods">Периоды/);
  assert.doesNotMatch(dataControlRoute, /data-tab="access"|data-tab="exchange"|trust-bottom-nav/);
  assert.match(teamAccess, /\/api\/access/);
  assert.match(teamAccess, /\/api\/access\/members\//);
  assert.match(teamAccess, /\/api\/access\/invites/);
});

test("access migration preserves every existing account as owner of its own venue", async () => {
  const migration = await read("drizzle/0010_furry_squadron_sinister.sql");
  assert.match(migration, /CREATE TABLE `venues`/);
  assert.match(migration, /CREATE TABLE `venue_memberships`/);
  assert.match(migration, /CREATE TABLE `venue_invites`/);
  assert.match(migration, /INSERT OR IGNORE INTO `venues`/);
  assert.match(migration, /INSERT OR IGNORE INTO `venue_memberships`/);
});

test("registration role comes from a one-time invite rather than the client", async () => {
  const [register, accessRoute, memberRoute, storeRoute] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("app/api/access/route.ts"),
    read("app/api/access/members/[id]/route.ts"),
    read("app/api/store/[key]/route.ts"),
  ]);

  assert.match(register, /findActiveInvite\(body\.invitationCode/);
  assert.match(register, /claimVenueInvite\(account/);
  assert.match(register, /role: invite\?\.role \?\? "owner"/);
  assert.match(register, /ownsVenue: !invite/);
  assert.doesNotMatch(register, /body\.role/);
  assert.match(accessRoute, /createVenueInvite/);
  assert.match(memberRoute, /serializePermissionOverrides/);
  assert.match(storeRoute, /canReadStore\(account, key\)/);
  assert.match(storeRoute, /canWriteStore\(account, key, mutations\)/);
});

test("task lifecycle is persisted and protected by task permissions", async () => {
  const [constants, dataTrust] = await Promise.all([
    read("lib/bardoctor/constants.ts"),
    read("lib/bardoctor/data-trust.ts"),
  ]);

  assert.match(constants, /"bd_tasks"/);
  assert.match(constants, /"bd_ai_diagnosis_v4"/);
  assert.match(constants, /"bd_ai_diagnosis_v5"/);
  assert.match(constants, /"bd_ai_diagnosis_v6"/);
  assert.match(constants, /"bd_ai_diagnosis_v7"/);
  assert.match(constants, /"bd_ai_diagnosis_v8"/);
  assert.match(constants, /"bd_ai_diagnosis_v9"/);
  assert.match(
    dataTrust,
    /bd_tasks: \{ read: "tasks\.view", write: "tasks\.manage" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v4: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v5: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v6: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v7: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v8: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(
    dataTrust,
    /bd_ai_diagnosis_v9: \{ read: "analysis\.view", write: "analysis\.run" \}/,
  );
  assert.match(constants, /"bd_suppliers"/);
  assert.match(constants, /"bd_purchase_documents"/);
  assert.match(constants, /"bd_assortment_v1"/);
  assert.match(constants, /"bd_stock_movements"/);
  assert.match(constants, /"bd_sales_documents"/);
  assert.match(
    dataTrust,
    /bd_suppliers: \{ read: "inventory\.view", write: "inventory\.manage" \}/,
  );
  assert.match(
    dataTrust,
    /bd_purchase_documents: \{ read: "inventory\.view", write: "inventory\.manage" \}/,
  );
  assert.match(
    dataTrust,
    /bd_assortment_v1: \{ read: "inventory\.view", write: "inventory\.manage" \}/,
  );
  assert.match(
    dataTrust,
    /bd_stock_movements: \{ read: "inventory\.view", write: "inventory\.manage" \}/,
  );
  assert.match(
    dataTrust,
    /bd_sales_documents: \{ read: "shifts\.view", write: "shifts\.manage" \}/,
  );
});

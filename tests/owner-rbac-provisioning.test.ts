import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  PERMISSION_KEYS,
  hasPermission,
  permissionsFor,
} from "../lib/bardoctor/access-control";

const root = new URL("../", import.meta.url);
const migrationDirectory = new URL("../drizzle/", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

async function applyMigrations(database: DatabaseSync) {
  const files = (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, migrationDirectory), "utf8");
    database.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }
}

function sqlConstant(source: string, name: string): string {
  const match = new RegExp("export const " + name + " = `([\\s\\S]*?)`;").exec(source);
  assert.ok(match, `${name} must remain an exported, testable reconciliation contract`);
  return match[1];
}

test("owner is a venue-scoped wildcard over the complete current permission catalog", () => {
  const permissions = permissionsFor("owner");
  assert.deepEqual(new Set(permissions), new Set(PERMISSION_KEYS));
  assert.equal(permissions.length, PERMISSION_KEYS.length);
  for (const representative of [
    "settings.manage",
    "access.manage",
    "finance.manage",
    "inventory.manage",
    "analysis.run",
    "reports.view",
    "integrations.manage",
  ] as const) {
    assert.equal(hasPermission({ role: "owner", permissions: [] }, representative), true);
  }
  assert.equal(hasPermission({ role: "shift_manager", permissions: [] }, "settings.manage"), false);
});

test("owner reconciliation is idempotent, repairs only the confirmed creator, and preserves venue isolation", async () => {
  const source = await read("lib/bardoctor/owner-access.ts");
  const venueUpsert = sqlConstant(source, "OWNER_VENUE_MEMBERSHIP_UPSERT_SQL");
  const workspaceUpsert = sqlConstant(source, "OWNER_WORKSPACE_MEMBERSHIP_UPSERT_SQL");
  const database = new DatabaseSync(":memory:");
  await applyMigrations(database);

  const account = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name, account_kind, owns_venue)
    VALUES (?, ?, ?, 'user', 1) RETURNING id
  `);
  const creator = account.get("creator@rbac.test", "creator@rbac.test", "Creator") as { id: number };
  const otherOwner = account.get("other@rbac.test", "other@rbac.test", "Other") as { id: number };
  const workspace = database.prepare(`
    INSERT INTO workspaces (name, created_by_account_id) VALUES (?, ?) RETURNING id
  `);
  const workspaceA = workspace.get("A", creator.id) as { id: number };
  const workspaceB = workspace.get("B", otherOwner.id) as { id: number };
  const venue = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id, status)
    VALUES (?, ?, ?, ?) RETURNING id
  `);
  const venueA = venue.get(workspaceA.id, creator.id, creator.id, "active") as { id: number };
  const venueB = venue.get(workspaceB.id, otherOwner.id, otherOwner.id, "active") as { id: number };

  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (?, ?, 'member', 'active')
  `).run(workspaceA.id, creator.id);
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role, permissions_json, status)
    VALUES (?, ?, 'shift_manager', '{"allow":[],"deny":["settings.manage"]}', 'disabled')
  `).run(venueA.id, creator.id);
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (?, ?, 'owner', 'active')
  `).run(workspaceB.id, otherOwner.id);
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role, status)
    VALUES (?, ?, 'owner', 'active')
  `).run(venueB.id, otherOwner.id);
  database.prepare(`
    INSERT INTO venue_memberships (venue_id, account_id, role, status)
    VALUES (?, ?, 'manager', 'active')
  `).run(venueB.id, creator.id);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    database.prepare(workspaceUpsert).run(venueA.id);
    database.prepare(venueUpsert).run(venueA.id);
  }

  const repaired = database.prepare(`
    SELECT role, status, permissions_json AS permissionsJson
    FROM venue_memberships WHERE venue_id = ? AND account_id = ?
  `).get(venueA.id, creator.id) as { role: string; status: string; permissionsJson: string | null };
  assert.deepEqual({ ...repaired }, { role: "owner", status: "active", permissionsJson: null });
  const repairedWorkspace = database.prepare(`
    SELECT role, status FROM workspace_memberships WHERE workspace_id = ? AND account_id = ?
  `).get(workspaceA.id, creator.id) as { role: string; status: string };
  assert.deepEqual({ ...repairedWorkspace }, { role: "owner", status: "active" });
  assert.equal(database.prepare(`
    SELECT COUNT(*) AS count FROM venue_memberships WHERE venue_id = ? AND account_id = ?
  `).get(venueA.id, creator.id)?.count, 1);
  assert.equal(database.prepare(`
    SELECT role FROM venue_memberships WHERE venue_id = ? AND account_id = ?
  `).get(venueB.id, creator.id)?.role, "manager");
  database.close();
});

test("reconciliation never reactivates an archived venue", async () => {
  const source = await read("lib/bardoctor/owner-access.ts");
  const venueUpsert = sqlConstant(source, "OWNER_VENUE_MEMBERSHIP_UPSERT_SQL");
  const workspaceUpsert = sqlConstant(source, "OWNER_WORKSPACE_MEMBERSHIP_UPSERT_SQL");
  const database = new DatabaseSync(":memory:");
  await applyMigrations(database);
  const owner = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name, account_kind, owns_venue)
    VALUES ('archived@rbac.test', 'archived@rbac.test', 'Archived', 'user', 1) RETURNING id
  `).get() as { id: number };
  const workspace = database.prepare(`
    INSERT INTO workspaces (name, created_by_account_id) VALUES ('Archived', ?) RETURNING id
  `).get(owner.id) as { id: number };
  const venue = database.prepare(`
    INSERT INTO venues (workspace_id, data_account_id, created_by_account_id, status)
    VALUES (?, ?, ?, 'archived') RETURNING id
  `).get(workspace.id, owner.id, owner.id) as { id: number };
  database.prepare(workspaceUpsert).run(venue.id);
  database.prepare(venueUpsert).run(venue.id);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM venue_memberships").get()?.count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM workspace_memberships").get()?.count, 0);
  assert.equal(database.prepare("SELECT status FROM venues WHERE id = ?").get(venue.id)?.status, "archived");
  database.close();
});

test("signup, bootstrap, route guards and role UI preserve owner semantics without self-lockout", async () => {
  const [register, auth, ownerAccess, memberRoute, accessControl, client, adminAuditRoute] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("lib/bardoctor/auth.ts"),
    read("lib/bardoctor/owner-access.ts"),
    read("app/api/access/members/[id]/route.ts"),
    read("lib/bardoctor/access-control.ts"),
    read("public/bardoctor-preview.js"),
    read("app/api/admin/owner-access-integrity/route.ts"),
  ]);
  assert.match(register, /await ensureOwnerVenue\(account\)/);
  assert.match(auth, /await reconcileConfirmedOwnerVenues\(account\.id\)/);
  assert.match(auth, /const activeRole = active\?\.role \?\? null/);
  assert.match(ownerAccess, /v\.created_by_account_id = \?1/);
  assert.match(ownerAccess, /a\.account_kind = 'user'/);
  assert.match(ownerAccess, /v\.status = 'active'/);
  assert.match(memberRoute, /nextRole === "owner"/);
  assert.match(accessControl, /target\.role !== "owner"/);
  assert.doesNotMatch(client, /prefix: "\/settings", permission: "settings\.manage"/);
  assert.match(client, /localStorage\.removeItem\("bd_active_role"\)/);
  assert.match(client, /localStorage\.removeItem\("bd_active_venue_id"\)/);
  assert.match(adminAuditRoute, /authenticatePlatformAdmin/);
  assert.match(adminAuditRoute, /readOwnerAccessIntegrityAudit/);
  assert.doesNotMatch(adminAuditRoute, /export async function POST/);
});

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationDirectory = new URL("../drizzle/", import.meta.url);
const restorationMigration = new URL(
  "../drizzle/0022_restore_confirmed_venue_3287.sql",
  import.meta.url,
);

async function applySchema(database: DatabaseSync) {
  const files = (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.startsWith("0022_"))
    .sort();
  for (const file of files) {
    database.exec((await readFile(new URL(file, migrationDirectory), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
}

function insertAccount(database: DatabaseSync, id: number, ownsVenue = true) {
  database.prepare(`
    INSERT INTO accounts (
      id, chatgpt_email, app_email, first_name, account_kind, owns_venue
    ) VALUES (?, ?, ?, 'QA', 'user', ?)
  `).run(id, `account-${id}@restore.test`, `account-${id}@restore.test`, ownsVenue ? 1 : 0);
}

test("venue 3287 recovery is exact, owner-proven, audited and idempotent", async () => {
  const database = new DatabaseSync(":memory:");
  await applySchema(database);
  insertAccount(database, 1);
  insertAccount(database, 14);
  insertAccount(database, 15);
  database.prepare(`
    INSERT INTO platform_admins (account_id, permissions_json, status, provisioned_by)
    VALUES (1, '["platform.admin"]', 'active', 'verified_identity_bootstrap')
  `).run();
  database.prepare(`
    INSERT INTO workspaces (id, name, status, created_by_account_id)
    VALUES (3167, 'Other', 'active', 14), (3168, 'Target', 'active', 15)
  `).run();
  database.prepare(`
    INSERT INTO venues (
      id, workspace_id, data_account_id, status, created_by_account_id
    ) VALUES
      (3286, 3167, 14, 'archived', 14),
      (3287, 3168, 15, 'archived', 15)
  `).run();
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (3168, 15, 'owner', 'active')
  `).run();
  database.prepare(`
    INSERT INTO venue_memberships (
      venue_id, account_id, role, permissions_json, status
    ) VALUES (3287, 15, 'owner', NULL, 'active')
  `).run();

  const migration = (await readFile(restorationMigration, "utf8"))
    .replaceAll("--> statement-breakpoint", "");
  database.exec(migration);
  database.exec(migration);

  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3287").get()?.status,
    "active",
  );
  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3286").get()?.status,
    "archived",
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM venue_memberships
      WHERE venue_id = 3287 AND account_id = 15 AND role = 'owner'
        AND status = 'active' AND permissions_json IS NULL
    `).get()?.count,
    1,
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM platform_admin_audit
      WHERE request_id = 'restore-venue-3287-20260824'
        AND action = 'venue.restore_confirmed' AND result = 'success'
    `).get()?.count,
    1,
  );
  database.close();
});

test("venue 3287 recovery refuses a non-canonical owner membership", async () => {
  const database = new DatabaseSync(":memory:");
  await applySchema(database);
  insertAccount(database, 1);
  insertAccount(database, 15);
  database.prepare(`
    INSERT INTO platform_admins (account_id, permissions_json, status, provisioned_by)
    VALUES (1, '["platform.admin"]', 'active', 'verified_identity_bootstrap')
  `).run();
  database.prepare(`
    INSERT INTO workspaces (id, name, status, created_by_account_id)
    VALUES (3168, 'Target', 'active', 15)
  `).run();
  database.prepare(`
    INSERT INTO venues (id, workspace_id, data_account_id, status, created_by_account_id)
    VALUES (3287, 3168, 15, 'archived', 15)
  `).run();
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (3168, 15, 'owner', 'active')
  `).run();
  database.prepare(`
    INSERT INTO venue_memberships (
      venue_id, account_id, role, permissions_json, status
    ) VALUES (3287, 15, 'manager', NULL, 'active')
  `).run();

  database.exec((await readFile(restorationMigration, "utf8"))
    .replaceAll("--> statement-breakpoint", ""));

  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3287").get()?.status,
    "archived",
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM platform_admin_audit
      WHERE request_id = 'restore-venue-3287-20260824'
    `).get()?.count,
    0,
  );
  database.close();
});

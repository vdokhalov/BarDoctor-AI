import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationDirectory = new URL("../drizzle/", import.meta.url);
const restorationMigration = new URL(
  "../ops/manual-migrations/0023_restore_confirmed_venue_3162.sql",
  import.meta.url,
);

async function applySchema(database: DatabaseSync) {
  const files = (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.includes("_restore_confirmed_venue_"))
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

test("venue 3162 recovery is exact, owner-proven, audited and idempotent", async () => {
  const database = new DatabaseSync(":memory:");
  await applySchema(database);
  insertAccount(database, 1);
  insertAccount(database, 7);
  insertAccount(database, 8);
  database.prepare(`
    INSERT INTO platform_admins (account_id, permissions_json, status, provisioned_by)
    VALUES (1, '["platform.admin"]', 'active', 'verified_identity_bootstrap')
  `).run();
  database.prepare(`
    INSERT INTO workspaces (id, name, status, created_by_account_id)
    VALUES (3162, 'Target', 'active', 7), (3163, 'Other', 'active', 8)
  `).run();
  database.prepare(`
    INSERT INTO venues (
      id, workspace_id, data_account_id, status, created_by_account_id
    ) VALUES
      (3162, 3162, 7, 'archived', 7),
      (3163, 3163, 8, 'archived', 8)
  `).run();
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (3162, 7, 'owner', 'active')
  `).run();
  database.prepare(`
    INSERT INTO venue_memberships (
      venue_id, account_id, role, permissions_json, status
    ) VALUES (3162, 7, 'owner', NULL, 'active')
  `).run();

  const migration = (await readFile(restorationMigration, "utf8"))
    .replaceAll("--> statement-breakpoint", "");
  database.exec(migration);
  database.exec(migration);

  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3162").get()?.status,
    "active",
  );
  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3163").get()?.status,
    "archived",
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM venue_memberships
      WHERE venue_id = 3162 AND account_id = 7 AND role = 'owner'
        AND status = 'active' AND permissions_json IS NULL
    `).get()?.count,
    1,
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM platform_admin_audit
      WHERE request_id = 'restore-venue-3162-20260824'
        AND action = 'venue.restore_confirmed' AND result = 'success'
    `).get()?.count,
    1,
  );
  database.close();
});

test("venue 3162 recovery refuses a non-canonical owner membership", async () => {
  const database = new DatabaseSync(":memory:");
  await applySchema(database);
  insertAccount(database, 1);
  insertAccount(database, 7);
  database.prepare(`
    INSERT INTO platform_admins (account_id, permissions_json, status, provisioned_by)
    VALUES (1, '["platform.admin"]', 'active', 'verified_identity_bootstrap')
  `).run();
  database.prepare(`
    INSERT INTO workspaces (id, name, status, created_by_account_id)
    VALUES (3162, 'Target', 'active', 7)
  `).run();
  database.prepare(`
    INSERT INTO venues (id, workspace_id, data_account_id, status, created_by_account_id)
    VALUES (3162, 3162, 7, 'archived', 7)
  `).run();
  database.prepare(`
    INSERT INTO workspace_memberships (workspace_id, account_id, role, status)
    VALUES (3162, 7, 'owner', 'active')
  `).run();
  database.prepare(`
    INSERT INTO venue_memberships (
      venue_id, account_id, role, permissions_json, status
    ) VALUES (3162, 7, 'manager', NULL, 'active')
  `).run();

  database.exec((await readFile(restorationMigration, "utf8"))
    .replaceAll("--> statement-breakpoint", ""));

  assert.equal(
    database.prepare("SELECT status FROM venues WHERE id = 3162").get()?.status,
    "archived",
  );
  assert.equal(
    database.prepare(`
      SELECT COUNT(*) AS count FROM platform_admin_audit
      WHERE request_id = 'restore-venue-3162-20260824'
    `).get()?.count,
    0,
  );
  database.close();
});

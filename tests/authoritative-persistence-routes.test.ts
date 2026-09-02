import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function databaseBeforePlakuchayaInitialization(): Promise<DatabaseSync> {
  const database = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  const migrations = (await readdir(directory))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.startsWith("0021_"))
    .sort();
  for (const migration of migrations) {
    database.exec((await readFile(new URL(migration, directory), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("bulk store bootstrap is read-only and exposes missing authoritative stores", async () => {
  const source = await readFile(new URL("../app/api/store/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /INSERT INTO|UPDATE domain_data|database\.batch|\.insert\(/);
  assert.match(source, /missingAuthoritativeStores/);
  assert.match(source, /writesPerformed: 0/);
});

test("generic writes cannot mutate immutable movement ledger or bootstrap over history", async () => {
  const source = await readFile(new URL("../app/api/store/[key]/route.ts", import.meta.url), "utf8");
  assert.match(source, /IMMUTABLE_STOCK_LEDGER/);
  assert.match(source, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
  assert.match(source, /INVENTORY_SNAPSHOT_STORE_KEY/);
  assert.doesNotMatch(source, /repairInventoryPurchaseAmounts|repairedStockMovements/);
});

test("purchase posting and inventory finalization stop at a missing authoritative assortment", async () => {
  const purchase = await readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8");
  const counts = await readFile(new URL("../app/api/inventory/counts/route.ts", import.meta.url), "utf8");
  assert.match(purchase, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
  assert.match(purchase, /INVENTORY_SNAPSHOT_STORE_KEY/);
  assert.match(counts, /assortmentExists/);
  assert.match(counts, /AUTHORITATIVE_BACKFILL_APPROVAL_REQUIRED/);
});

test("confirmed purchases persist the canonical product resolved by the stock receipt", async () => {
  const route = await readFile(new URL("../app/api/purchases/confirm/route.ts", import.meta.url), "utf8");
  assert.match(route, /resolvedProductByLine/);
  assert.match(route, /inventory\.movements\.map/);
  assert.match(route, /purchaseProductKey: productKey/);
  assert.match(route, /canonicalProductKey: productKey/);
  assert.ok(
    route.indexOf("inventory.summary.unresolvedLines") < route.indexOf("resolvedProductByLine"),
    "canonical links must be persisted only after ambiguous receipt lines have been rejected",
  );
});

test("export candidate preview is owner-only and read-only", async () => {
  const source = await readFile(new URL("../app/api/data-integrity/export/route.ts", import.meta.url), "utf8");
  assert.match(source, /account\.role !== "owner"/);
  assert.match(source, /writesPerformed: 0/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});

test("new secondary venues initialize isolated empty authoritative stores", async () => {
  const source = await readFile(new URL("../lib/bardoctor/venue-service.ts", import.meta.url), "utf8");
  assert.match(source, /authoritativeVenueStoreRows/);
  assert.match(source, /dataAccountId/);
  assert.match(source, /venueId: venue\.id/);
  assert.doesNotMatch(source, /actor\.id.*authoritativeVenueStoreRows/);
});

test("new owner account initializes stores only when its venue is newly created", async () => {
  const [source, registration] = await Promise.all([
    readFile(new URL("../lib/bardoctor/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(source, /let createdVenue = false/);
  assert.match(source, /createdVenue = true/);
  assert.match(source, /createdVenue \|\| account\.migrationStatus === "server_authoritative"/);
  assert.match(source, /authoritativeVenueStoreRows/);
  assert.match(registration, /migrationStatus: "server_authoritative"/);
  assert.doesNotMatch(registration, /migrationStatus: "local"/);
});

test("new primary and secondary venue paths declare server authority", async () => {
  const [registration, venueService] = await Promise.all([
    readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/venue-service.ts", import.meta.url), "utf8"),
  ]);
  assert.match(registration, /migrationStatus: "server_authoritative"/);
  assert.match(venueService, /migrationStatus: "server_authoritative"/);
  assert.match(venueService, /authoritativeVenueStoreRows/);
});

test("Plakuchaya Iva empty initialization is backup-guarded and never overwrites data", async () => {
  const migration = await readFile(new URL("../ops/manual-migrations/0021_initialize_empty_plakuchaya_iva.sql", import.meta.url), "utf8");
  assert.match(migration, /v\.`id` = 3280/);
  assert.match(migration, /EXISTS \(SELECT 1 FROM `venue_migration_exports`/);
  assert.equal((migration.match(/INSERT OR IGNORE INTO `domain_data`/g) || []).length, 5);
  assert.match(migration, /migration_status` = 'server_authoritative'/);
  assert.match(migration, /venue\.initialize_confirmed_empty_stores/);
  assert.doesNotMatch(migration, /DELETE FROM|DROP TABLE|UPDATE `domain_data`|INSERT OR REPLACE/);
});

test("Plakuchaya Iva initialization preserves an existing server store and fills only four missing stores", async () => {
  const database = await databaseBeforePlakuchayaInitialization();
  database.exec(`
    INSERT INTO accounts (id, chatgpt_email, app_email, first_name) VALUES
      (1, 'owner@test', 'owner@test', 'Owner'),
      (8, 'venue@test', 'venue@test', 'Venue'),
      (15, 'admin@test', 'admin@test', 'Admin');
    INSERT INTO workspaces (id, name, created_by_account_id) VALUES (1, 'Workspace', 1);
    INSERT INTO venues (id, workspace_id, data_account_id, created_by_account_id) VALUES (3280, 1, 8, 1);
    INSERT INTO platform_admins (account_id, permissions_json) VALUES (15, '["platform.admin"]');
    INSERT INTO venue_migration_exports (
      export_id, venue_id, data_account_id, source_commit, schema_version, checksum,
      payload_json, record_counts_json, generated_at, created_by_account_id
    ) VALUES ('backup-3280', 3280, 8, 'commit', 'schema', 'checksum', '{}', '{}', '2026-08-24T06:00:00.000Z', 15);
    INSERT INTO domain_data (account_id, store_key, data_json) VALUES (8, 'bd_suppliers', '[{"id":"keep"}]');
  `);
  const migration = await readFile(new URL("../ops/manual-migrations/0021_initialize_empty_plakuchaya_iva.sql", import.meta.url), "utf8");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM domain_data WHERE account_id = 8").get()?.count, 5);
  assert.equal(database.prepare("SELECT data_json FROM domain_data WHERE account_id = 8 AND store_key = 'bd_suppliers'").get()?.data_json, '[{"id":"keep"}]');
  assert.equal(database.prepare("SELECT migration_status FROM accounts WHERE id = 8").get()?.migration_status, "server_authoritative");
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admin_audit WHERE action = 'venue.initialize_confirmed_empty_stores'").get()?.count, 1);
  database.close();
});

test("platform export is platform-admin only and performs no persistence writes", async () => {
  const source = await readFile(new URL("../app/api/admin/data-integrity/route.ts", import.meta.url), "utf8");
  assert.match(source, /authenticatePlatformAdmin\(request\)/);
  assert.match(source, /productionWritesPerformed/);
  assert.match(source, /writesPerformed: 0/);
  assert.match(source, /platform_immutable_export_bundle/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("platform migration endpoint separates read-only phase A from explicit per-venue phase B", async () => {
  const route = await read("app/api/admin/data-migrations/route.ts");
  assert.match(route, /authenticatePlatformAdmin/);
  assert.match(route, /action === "dry_run"/);
  assert.match(route, /action === "persist_phase_a_backups"/);
  assert.match(route, /persist-phase-a-backups/);
  assert.match(route, /venue_data_migration\.phase_a_backups/);
  assert.match(route, /migrate_safe_venue/);
  assert.match(route, /PHASE_B_CONFIRMATION/);
  assert.match(route, /x-admin-intent/);
  assert.match(route, /plan\.migrationClass !== "SAFE_AUTOMATABLE"/);
  assert.match(route, /plan\.writes\.length === 0/);
  assert.match(route, /INSERT INTO venue_migration_operations/);
  assert.match(route, /ON CONFLICT\(account_id, store_key\) DO NOTHING/);
  assert.doesNotMatch(route, /UPDATE domain_data SET data_json/);
  assert.doesNotMatch(route, /DELETE FROM domain_data/);
});

test("phase A persistence writes immutable exports only and exposes a protected operator surface", async () => {
  const [route, page, client] = await Promise.all([
    read("app/api/admin/data-migrations/route.ts"),
    read("app/admin/migrations/route.ts"),
    read("public/admin-migrations-v265.js"),
  ]);
  const phaseAStart = route.indexOf('action === "persist_phase_a_backups"');
  const phaseAEnd = route.indexOf('action === "rollback_fixture_only"');
  const phaseA = route.slice(phaseAStart, phaseAEnd);
  assert.match(phaseA, /await persistBackup\(plan, admin\.account\.id\)/);
  assert.doesNotMatch(phaseA, /domainData|INSERT INTO domain_data|UPDATE domain_data|DELETE FROM domain_data/);
  assert.match(page, /internalAdminRouteState/);
  assert.match(page, /state !== "admin"/);
  assert.match(client, /persist_phase_a_backups/);
  assert.match(client, /X-Admin-Intent/);
});

test("immutable backup is verified before business-store batch starts", async () => {
  const route = await read("app/api/admin/data-migrations/route.ts");
  const backup = route.indexOf("await persistBackup(plan, adminAccountId)");
  const batch = route.indexOf("await getD1().batch(statements)");
  assert.ok(backup > 0 && batch > backup);
  assert.match(route, /IMMUTABLE_BACKUP_VERIFICATION_FAILED/);
  assert.match(route, /venueMigrationExports\.exportId/);
  assert.match(route, /persisted\.checksum !== plan\.backup\.checksum\.value/);
});

test("migration schema is append-only and tenant-scoped", async () => {
  const migration = await read("drizzle/0020_deep_silver_centurion.sql");
  assert.match(migration, /CREATE TABLE `venue_migration_exports`/);
  assert.match(migration, /`export_id` text PRIMARY KEY NOT NULL/);
  assert.match(migration, /`venue_id` integer NOT NULL/);
  assert.match(migration, /`data_account_id` integer NOT NULL/);
  assert.match(migration, /ON DELETE restrict/);
  assert.match(migration, /CREATE UNIQUE INDEX `venue_migration_exports_venue_checksum_uq`/);
  assert.match(migration, /CREATE TRIGGER `venue_migration_exports_no_update`/);
  assert.match(migration, /CREATE TRIGGER `venue_migration_exports_no_delete`/);
  assert.match(migration, /CREATE TABLE `venue_migration_operations`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `domain_data`/);
});

test("browser discovery is local, read-only, venue-aware, and does not upload automatically", async () => {
  const [script, html, response] = await Promise.all([
    read("public/server-migration-discovery-v262.js"),
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
  ]);
  assert.match(script, /bdCollectLegacyMigrationCandidates/);
  assert.match(script, /bd_active_venue_id/);
  assert.match(script, /browser_local_storage/);
  assert.match(script, /writesPerformed: 0/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|removeItem|deleteDatabase/);
  assert.match(html, /server-migration-discovery-v262\.js/);
  assert.match(response, /server-migration-discovery-v262\.js/);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const startedAt = Date.now();
const root = process.cwd();
const drillDirectory = mkdtempSync(path.join(tmpdir(), "bardoctor-restore-drill-"));
const sourcePath = path.join(drillDirectory, "source.sqlite3");
const backupPath = path.join(drillDirectory, "backup.sqlite3");
const restoredPath = path.join(drillDirectory, "restored.sqlite3");

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

try {
  const source = new DatabaseSync(sourcePath);
  source.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync(path.join(root, "drizzle"))
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    source.exec(readFileSync(path.join(root, "drizzle", migration), "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  source.prepare(`
    INSERT INTO accounts
      (id, chatgpt_email, app_email, first_name, role, owns_venue, account_kind, migration_status)
    VALUES (1, 'restore-drill@example.invalid', 'restore-drill@example.invalid', 'Restore', 'owner', 1, 'user', 'server_authoritative')
  `).run();
  source.prepare("INSERT INTO workspaces (id, name, created_by_account_id) VALUES (1, 'Restore drill', 1)").run();
  source.prepare("INSERT INTO venues (id, workspace_id, data_account_id, created_by_account_id) VALUES (1, 1, 1, 1)").run();
  source.prepare("INSERT INTO workspace_memberships (workspace_id, account_id, role) VALUES (1, 1, 'owner')").run();
  source.prepare("INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (1, 1, 'owner')").run();
  source.prepare("INSERT INTO domain_data (account_id, store_key, data_json) VALUES (1, 'bd_purchase_documents', '[]')").run();
  source.prepare(`
    INSERT INTO invoice_recognition_jobs (account_id, venue_id, fingerprint, job_id)
    VALUES (1, 1, 'restore-proof', 'restore-proof-job')
  `).run();
  source.close();

  copyFileSync(sourcePath, backupPath);
  const backupSha256 = sha256(backupPath);
  rmSync(sourcePath);
  copyFileSync(backupPath, restoredPath);

  const restored = new DatabaseSync(restoredPath, { readOnly: true });
  assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.deepEqual(restored.prepare("PRAGMA foreign_key_check").all(), []);
  const tables = restored.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  for (const table of ["accounts", "domain_data", "invoice_recognition_jobs", "venue_memberships", "venues", "workspaces"]) {
    assert.ok(tables.includes(table), `restored database is missing ${table}`);
  }
  assert.equal(restored.prepare("SELECT COUNT(*) AS count FROM accounts").get().count, 1);
  assert.equal(restored.prepare("SELECT COUNT(*) AS count FROM venues WHERE id = 1 AND data_account_id = 1").get().count, 1);
  assert.equal(restored.prepare("SELECT COUNT(*) AS count FROM domain_data WHERE account_id = 1").get().count, 1);
  assert.equal(restored.prepare("SELECT COUNT(*) AS count FROM invoice_recognition_jobs WHERE venue_id = 1").get().count, 1);
  restored.close();
  assert.equal(sha256(restoredPath), backupSha256);

  console.log(JSON.stringify({
    status: "PASS",
    scope: "isolated synthetic SQLite backup; not a production backup",
    schemaVersion: migrations.at(-1)?.slice(0, 4) ?? "unknown",
    migrationsApplied: migrations.length,
    integrityCheck: "ok",
    foreignKeyViolations: 0,
    backupDigestMatched: true,
    elapsedMs: Date.now() - startedAt,
  }, null, 2));
} finally {
  rmSync(drillDirectory, { recursive: true, force: true });
}

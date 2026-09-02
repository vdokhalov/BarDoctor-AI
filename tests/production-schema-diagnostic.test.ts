import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  authenticateSchemaDiagnosticAdmin,
  readProductionSchemaDiagnostic,
  type ReadOnlyDatabase,
  type ReadOnlyStatement,
  type ReadOnlyValue,
} from "../lib/bardoctor/production-schema-diagnostic";

class SqliteStatement implements ReadOnlyStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly bindings: ReadOnlyValue[] = [],
  ) {}

  bind(...values: ReadOnlyValue[]): ReadOnlyStatement {
    return new SqliteStatement(this.database, this.sql, values);
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.database.prepare(this.sql).all(...this.bindings) as T[] };
  }

  async first<T>(): Promise<T | null> {
    return (this.database.prepare(this.sql).get(...this.bindings) as T | undefined) ?? null;
  }
}

class RecordingDatabase implements ReadOnlyDatabase {
  readonly sql: string[] = [];

  constructor(readonly sqlite = new DatabaseSync(":memory:")) {}

  prepare(sql: string): ReadOnlyStatement {
    this.sql.push(sql.trim());
    return new SqliteStatement(this.sqlite, sql);
  }
}

function authenticationSchema(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE accounts (
      id integer PRIMARY KEY,
      chatgpt_email text NOT NULL,
      app_email text NOT NULL,
      account_kind text DEFAULT 'user' NOT NULL
    );
    CREATE TABLE sessions (
      token_hash text PRIMARY KEY,
      account_id integer NOT NULL,
      expires_at text NOT NULL
    );
    CREATE TABLE platform_admins (
      account_id integer PRIMARY KEY,
      permissions_json text DEFAULT '[]' NOT NULL,
      status text DEFAULT 'active' NOT NULL
    );
  `);
  database.prepare("INSERT INTO accounts VALUES (?, ?, ?, 'user')")
    .run(1, "normal@example.test", "normal@example.test");
  database.prepare("INSERT INTO accounts VALUES (?, ?, ?, 'user')")
    .run(2, "admin@example.test", "admin@example.test");
  database.prepare("INSERT INTO platform_admins VALUES (?, ?, 'active')")
    .run(2, JSON.stringify(["platform.admin"]));
  const token = "diagnostic-admin-session";
  database.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
    createHash("sha256").update(token).digest("hex"),
    2,
    "2099-01-01T00:00:00.000Z",
  );
  return token;
}

test("schema diagnostic denies an unauthenticated request", async () => {
  const database = new RecordingDatabase();
  authenticationSchema(database.sqlite);
  assert.equal(await authenticateSchemaDiagnosticAdmin(
    new Request("https://example.test/api/admin/schema-diagnostic"),
    database,
  ), false);
});

test("schema diagnostic denies a normal authenticated user", async () => {
  const database = new RecordingDatabase();
  authenticationSchema(database.sqlite);
  assert.equal(await authenticateSchemaDiagnosticAdmin(new Request(
    "https://example.test/api/admin/schema-diagnostic",
    { headers: { "oai-authenticated-user-email": "normal@example.test" } },
  ), database), false);
});

test("schema diagnostic allows an active platform administrator without schema repair", async () => {
  const database = new RecordingDatabase();
  const token = authenticationSchema(database.sqlite);
  assert.equal(await authenticateSchemaDiagnosticAdmin(new Request(
    "https://example.test/api/admin/schema-diagnostic",
    { headers: { Cookie: `bd_server_session=${token}` } },
  ), database), true);
  assert.ok(database.sql.every((sql) => /^SELECT\b/i.test(sql)));
});

test("schema inspection reports missing objects without creating them", async () => {
  const database = new RecordingDatabase();
  database.sqlite.exec(`
    CREATE TABLE accounts (id integer PRIMARY KEY, avatar_id text);
    CREATE TABLE domain_data (id integer PRIMARY KEY, data_json text NOT NULL);
    CREATE TABLE sessions (token_hash text PRIMARY KEY);
  `);
  const before = database.sqlite.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all();
  const result = await readProductionSchemaDiagnostic(database);
  const after = database.sqlite.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name").all();

  assert.equal(result.objects["accounts.avatar_id"].exists, true);
  assert.equal(result.objects.invoice_recognition_jobs.exists, false);
  assert.equal(result.objects.auth_rate_limits.exists, false);
  assert.equal(result.objects["domain_data.revision"].exists, false);
  assert.equal(result.objects["domain_data.mutation_id"].exists, false);
  assert.equal(result.objects["sessions.last_seen_at"].exists, false);
  assert.deepEqual(after, before);
});

test("schema inspection executes only SELECT and PRAGMA statements", async () => {
  const database = new RecordingDatabase();
  database.sqlite.exec(`
    CREATE TABLE accounts (id integer PRIMARY KEY, avatar_id text);
    CREATE INDEX accounts_avatar_idx ON accounts(avatar_id);
    CREATE TABLE domain_data (id integer PRIMARY KEY, revision integer DEFAULT 1 NOT NULL, mutation_id text);
    CREATE TABLE sessions (token_hash text PRIMARY KEY, last_seen_at text);
    CREATE TABLE auth_rate_limits (key text PRIMARY KEY);
    CREATE TABLE invoice_recognition_jobs (job_id text PRIMARY KEY);
  `);
  await readProductionSchemaDiagnostic(database);
  assert.ok(database.sql.length > 0);
  assert.ok(database.sql.every((sql) => /^(SELECT|PRAGMA)\b/i.test(sql)));
  assert.ok(database.sql.every((sql) => !/\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql)));
});

test("schema diagnostic never returns business, user, or session row data", async () => {
  const database = new RecordingDatabase();
  database.sqlite.exec(`
    CREATE TABLE accounts (id integer PRIMARY KEY, avatar_id text, app_email text);
    CREATE TABLE domain_data (id integer PRIMARY KEY, revision integer DEFAULT 1 NOT NULL, mutation_id text, data_json text);
    CREATE TABLE sessions (token_hash text PRIMARY KEY, last_seen_at text);
  `);
  database.sqlite.prepare("INSERT INTO accounts VALUES (1, NULL, ?)").run("private@example.test");
  database.sqlite.prepare("INSERT INTO domain_data VALUES (1, 1, NULL, ?)").run('{"purchase":"secret"}');
  database.sqlite.prepare("INSERT INTO sessions VALUES (?, NULL)").run("secret-session-token");

  const serialized = JSON.stringify(await readProductionSchemaDiagnostic(database));
  assert.doesNotMatch(serialized, /private@example\.test|secret-session-token|purchase|secret/);
});

test("malformed schema fails without issuing any mutation", async () => {
  const statements: string[] = [];
  const database: ReadOnlyDatabase = {
    prepare(sql: string) {
      statements.push(sql.trim());
      throw new Error("malformed metadata state");
    },
  };
  await assert.rejects(readProductionSchemaDiagnostic(database), /malformed metadata state/);
  assert.ok(statements.every((sql) => /^(SELECT|PRAGMA)\b/i.test(sql)));
});

test("migration ledger absence is NOT_FOUND and does not create a ledger", async () => {
  const database = new RecordingDatabase();
  database.sqlite.exec("CREATE TABLE accounts (id integer PRIMARY KEY)");
  const result = await readProductionSchemaDiagnostic(database);
  assert.equal(result.migrationLedger.exists, false);
  assert.equal(result.migrationLedger.status, "NOT_FOUND");
  const count = database.sqlite.prepare(
    "SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name LIKE '%migration%'",
  ).get() as { count: number };
  assert.equal(count.count, 0);
});

test("migration ledger is discovered from schema inventory and returns metadata only", async () => {
  const database = new RecordingDatabase();
  database.sqlite.exec(`
    CREATE TABLE d1_migrations (
      id integer PRIMARY KEY,
      name text NOT NULL,
      applied_at text NOT NULL
    );
  `);
  database.sqlite.prepare("INSERT INTO d1_migrations VALUES (?, ?, ?)")
    .run(21, "0021_release_schema_contract.sql", "2026-09-02T00:00:00.000Z");
  const result = await readProductionSchemaDiagnostic(database);
  assert.equal(result.migrationLedger.exists, true);
  assert.equal(result.migrationLedger.table, "d1_migrations");
  assert.equal(result.migrationLedger.count, 1);
  assert.equal(result.migrationLedger.entries0021To0024.length, 1);
});

test("route is fail-closed and contains no schema or data mutation statement", async () => {
  const route = await readFile(new URL(
    "../app/api/admin/schema-diagnostic/route.ts",
    import.meta.url,
  ), "utf8");
  assert.match(route, /authenticateSchemaDiagnosticAdmin\(request, database\)/);
  assert.match(route, /SCHEMA_DIAGNOSTIC_FAILED/);
  assert.doesNotMatch(route, /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE)\b/i);
});

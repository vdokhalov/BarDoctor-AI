export interface ReadOnlyStatement {
  bind(...values: ReadOnlyValue[]): ReadOnlyStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface ReadOnlyDatabase {
  prepare(sql: string): ReadOnlyStatement;
}

type SqliteColumnRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

type SqliteIndexRow = {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
};

type SqliteIndexColumnRow = {
  seqno: number;
  cid: number;
  name: string | null;
};

type SafeLedgerValue = string | number | null;
export type ReadOnlyValue = string | number | null;

const TARGET_TABLES = [
  "accounts",
  "invoice_recognition_jobs",
  "auth_rate_limits",
  "domain_data",
  "sessions",
] as const;

const EXACT_LEDGER_NAMES = new Set([
  "__drizzle_migrations",
  "d1_migrations",
  "drizzle_migrations",
]);

const SAFE_LEDGER_COLUMNS = new Set([
  "id",
  "name",
  "tag",
  "hash",
  "version",
  "applied_at",
  "created_at",
  "timestamp",
  "when",
]);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getTrustedChatGPTEmail(request: Request): string | null {
  const value = request.headers.get("oai-authenticated-user-email");
  return value?.trim() ? normalizeEmail(value) : null;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function allRows<T>(
  database: ReadOnlyDatabase,
  sql: string,
  bindings: ReadOnlyValue[] = [],
): Promise<T[]> {
  const statement = bindings.length ? database.prepare(sql).bind(...bindings) : database.prepare(sql);
  const result = await statement.all<T>();
  return Array.isArray(result.results) ? result.results : [];
}

async function firstRow<T>(
  database: ReadOnlyDatabase,
  sql: string,
  bindings: ReadOnlyValue[] = [],
): Promise<T | null> {
  const statement = bindings.length ? database.prepare(sql).bind(...bindings) : database.prepare(sql);
  return statement.first<T>();
}

function permissionsContainPlatformAdmin(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.includes("platform.admin");
  } catch {
    return false;
  }
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function sessionCredentials(request: Request): { email: string | null; token: string } | null {
  const headerEmail = request.headers.get("x-session-email");
  const headerToken = request.headers.get("x-session-token");
  if (headerEmail || headerToken) {
    if (!headerEmail?.trim() || !headerToken) return null;
    return { email: normalizeEmail(headerEmail), token: headerToken };
  }
  const token = cookieValue(request, "bd_server_session");
  return token ? { email: null, token } : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Platform-admin authorization for this diagnostic only. Unlike v400's normal
 * session bootstrap, this path deliberately performs no runtime schema repair.
 */
export async function authenticateSchemaDiagnosticAdmin(
  request: Request,
  database: ReadOnlyDatabase,
): Promise<boolean> {
  const trustedIdentity = getTrustedChatGPTEmail(request);
  if (trustedIdentity) {
    const row = await firstRow<{ permissions_json: string }>(database, `
      SELECT pa.permissions_json
      FROM platform_admins pa
      INNER JOIN accounts a ON a.id = pa.account_id
      WHERE pa.status = 'active'
        AND a.account_kind = 'user'
        AND a.chatgpt_email = ?
      LIMIT 1
    `, [normalizeEmail(trustedIdentity)]);
    return permissionsContainPlatformAdmin(row?.permissions_json);
  }

  const credentials = sessionCredentials(request);
  if (!credentials) return false;
  const tokenHash = await sha256Hex(credentials.token);
  const row = await firstRow<{ permissions_json: string }>(database, `
    SELECT pa.permissions_json
    FROM sessions s
    INNER JOIN accounts a ON a.id = s.account_id
    INNER JOIN platform_admins pa ON pa.account_id = a.id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND pa.status = 'active'
      AND a.account_kind = 'user'
      AND (? IS NULL OR a.app_email = ?)
    LIMIT 1
  `, [tokenHash, new Date().toISOString(), credentials.email, credentials.email]);
  return permissionsContainPlatformAdmin(row?.permissions_json);
}

async function tableColumns(database: ReadOnlyDatabase, table: string) {
  const rows = await allRows<SqliteColumnRow>(
    database,
    `PRAGMA table_info(${quoteIdentifier(table)})`,
  );
  return rows.map((row) => ({
    name: row.name,
    type: row.type,
    notNull: Boolean(row.notnull),
    default: row.dflt_value,
    primaryKeyPosition: row.pk,
  }));
}

async function tableIndexes(database: ReadOnlyDatabase, table: string) {
  const rows = await allRows<SqliteIndexRow>(
    database,
    `PRAGMA index_list(${quoteIdentifier(table)})`,
  );
  return Promise.all(rows.map(async (row) => ({
    name: row.name,
    unique: Boolean(row.unique),
    origin: row.origin,
    partial: Boolean(row.partial),
    columns: (await allRows<SqliteIndexColumnRow>(
      database,
      `PRAGMA index_info(${quoteIdentifier(row.name)})`,
    )).map((column) => column.name).filter((name): name is string => Boolean(name)),
  })));
}

async function identifyMigrationLedger(
  database: ReadOnlyDatabase,
  tableNames: string[],
): Promise<{ table: string | null; candidates: string[] }> {
  const exact = tableNames.filter((name) => EXACT_LEDGER_NAMES.has(name.toLowerCase()));
  if (exact.length === 1) return { table: exact[0], candidates: exact };
  if (exact.length > 1) return { table: null, candidates: exact };

  const structuralCandidates: string[] = [];
  for (const name of tableNames.filter((table) => table.toLowerCase().includes("migration"))) {
    const columns = await tableColumns(database, name);
    const names = new Set(columns.map((column) => column.name.toLowerCase()));
    const hasIdentifier = ["name", "tag", "hash", "version", "migration_id"]
      .some((column) => names.has(column));
    const hasAppliedMarker = ["applied_at", "created_at", "timestamp", "when"]
      .some((column) => names.has(column));
    const isBusinessScoped = names.has("venue_id") || names.has("account_id") || names.has("data_account_id");
    if (hasIdentifier && hasAppliedMarker && !isBusinessScoped) structuralCandidates.push(name);
  }
  return structuralCandidates.length === 1
    ? { table: structuralCandidates[0], candidates: structuralCandidates }
    : { table: null, candidates: structuralCandidates };
}

async function migrationLedger(database: ReadOnlyDatabase, tableNames: string[]) {
  const identified = await identifyMigrationLedger(database, tableNames);
  if (!identified.table) {
    return {
      exists: false,
      table: null,
      status: identified.candidates.length ? "AMBIGUOUS" : "NOT_FOUND",
      candidates: identified.candidates,
      count: null,
      latest: null,
      entries: [] as Array<Record<string, SafeLedgerValue>>,
      entries0021To0024: [] as Array<Record<string, SafeLedgerValue>>,
      truncated: false,
    };
  }

  const columns = await tableColumns(database, identified.table);
  const safeColumns = columns
    .map((column) => column.name)
    .filter((name) => SAFE_LEDGER_COLUMNS.has(name.toLowerCase()));
  if (!safeColumns.length) {
    return {
      exists: true,
      table: identified.table,
      status: "UNSUPPORTED_LEDGER_SHAPE",
      candidates: identified.candidates,
      count: null,
      latest: null,
      entries: [] as Array<Record<string, SafeLedgerValue>>,
      entries0021To0024: [] as Array<Record<string, SafeLedgerValue>>,
      truncated: false,
    };
  }

  const countRow = await firstRow<{ count: number }>(
    database,
    `SELECT COUNT(*) AS count FROM ${quoteIdentifier(identified.table)}`,
  );
  const orderColumn = ["applied_at", "created_at", "timestamp", "when", "id"]
    .map((candidate) => safeColumns.find((column) => column.toLowerCase() === candidate))
    .find(Boolean) ?? safeColumns[0];
  const rows = await allRows<Record<string, SafeLedgerValue>>(database, `
    SELECT ${safeColumns.map(quoteIdentifier).join(", ")}
    FROM ${quoteIdentifier(identified.table)}
    ORDER BY ${quoteIdentifier(orderColumn)} DESC
    LIMIT 500
  `);
  const entries0021To0024 = rows.filter((row) => {
    const value = Object.values(row).map((item) => String(item ?? "")).join(" ");
    return /(?:^|\D)002[1-4](?:\D|$)/.test(value);
  });
  const count = Number(countRow?.count ?? 0);
  return {
    exists: true,
    table: identified.table,
    status: "FOUND",
    candidates: identified.candidates,
    count,
    latest: rows[0] ?? null,
    entries: rows,
    entries0021To0024,
    truncated: count > rows.length,
  };
}

export async function readProductionSchemaDiagnostic(database: ReadOnlyDatabase) {
  const tables = (await allRows<{ name: string }>(database, `
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table'
    ORDER BY name
  `)).map((row) => row.name);
  const tableSet = new Set(tables);
  const metadata: Record<string, { columns: Awaited<ReturnType<typeof tableColumns>>; indexes: Awaited<ReturnType<typeof tableIndexes>> }> = {};

  for (const table of TARGET_TABLES) {
    if (!tableSet.has(table)) continue;
    metadata[table] = {
      columns: await tableColumns(database, table),
      indexes: await tableIndexes(database, table),
    };
  }

  const columnExists = (table: string, column: string) => Boolean(
    metadata[table]?.columns.some((item) => item.name === column),
  );

  return {
    environment: "production",
    readOnly: true,
    objects: {
      "accounts.avatar_id": { exists: columnExists("accounts", "avatar_id") },
      invoice_recognition_jobs: { exists: tableSet.has("invoice_recognition_jobs") },
      auth_rate_limits: { exists: tableSet.has("auth_rate_limits") },
      "domain_data.revision": { exists: columnExists("domain_data", "revision") },
      "domain_data.mutation_id": { exists: columnExists("domain_data", "mutation_id") },
      "sessions.last_seen_at": { exists: columnExists("sessions", "last_seen_at") },
    },
    migrationLedger: await migrationLedger(database, tables),
    tables,
    metadata,
  };
}

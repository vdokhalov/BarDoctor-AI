export type StoreSnapshot = {
  key: string;
  dataJson: string | null;
  updatedAt: string | null;
};

type StoreRow = {
  store_key: string;
  data_json: string;
  updated_at?: string | null;
};

export class StoreWriteConflictError extends Error {
  constructor() {
    super("The persisted domain state changed while the command was running");
    this.name = "StoreWriteConflictError";
  }
}

export function storeSnapshots(rows: StoreRow[], keys: string[]): StoreSnapshot[] {
  const byKey = new Map(rows.map((row) => [row.store_key, row]));
  return [...new Set(keys)].map((key) => {
    const row = byKey.get(key);
    return {
      key,
      dataJson: row?.data_json ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  });
}

export async function readStoreSnapshots(
  database: D1Database,
  accountId: number,
  keys: string[],
): Promise<StoreSnapshot[]> {
  const uniqueKeys = [...new Set(keys)];
  if (!uniqueKeys.length) return [];
  const placeholders = uniqueKeys.map(() => "?").join(", ");
  const result = await database.prepare(`
    SELECT store_key, data_json, updated_at FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(accountId, ...uniqueKeys).all<StoreRow>();
  return storeSnapshots(result.results ?? [], uniqueKeys);
}

export function storeCasGuard(
  database: D1Database,
  accountId: number,
  snapshots: StoreSnapshot[],
  now: string,
): D1PreparedStatement {
  const clauses: string[] = [];
  const values: unknown[] = [accountId, "__bd_store_cas_guard_v1__", now];
  for (const snapshot of snapshots) {
    if (snapshot.dataJson === null) {
      clauses.push("NOT EXISTS (SELECT 1 FROM domain_data WHERE account_id = ? AND store_key = ?)");
      values.push(accountId, snapshot.key);
      continue;
    }
    clauses.push(`EXISTS (
      SELECT 1 FROM domain_data
      WHERE account_id = ? AND store_key = ? AND data_json = ?
        AND ((updated_at = ?) OR (updated_at IS NULL AND ? IS NULL))
    )`);
    values.push(accountId, snapshot.key, snapshot.dataJson, snapshot.updatedAt, snapshot.updatedAt);
  }
  const predicate = clauses.length ? clauses.join(" AND ") : "1";
  return database.prepare(`
    INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    SELECT ?, ?, NULL, ?
    WHERE NOT (${predicate})
  `).bind(...values);
}

function isGuardConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(?:NOT NULL constraint failed: domain_data\.data_json|D1_ERROR.*data_json)/i.test(message);
}

export async function runStoreCasBatch(
  database: D1Database,
  accountId: number,
  snapshots: StoreSnapshot[],
  statements: D1PreparedStatement[],
  now: string,
): Promise<D1Result[]> {
  try {
    return await database.batch([
      storeCasGuard(database, accountId, snapshots, now),
      ...statements,
    ]);
  } catch (error) {
    if (isGuardConflict(error)) throw new StoreWriteConflictError();
    throw error;
  }
}

export async function withStoreCasRetries(
  request: Request,
  command: (attemptRequest: Request) => Promise<Response>,
  maxAttempts = 3,
): Promise<Response> {
  const attempts = Array.from({ length: maxAttempts }, () => request.clone());
  for (const attemptRequest of attempts) {
    try {
      return await command(attemptRequest as unknown as Request);
    } catch (error) {
      if (!(error instanceof StoreWriteConflictError)) throw error;
    }
  }
  return Response.json({
    ok: false,
    code: "STORE_WRITE_CONFLICT",
    retryable: true,
    error: "Данные изменились параллельно. Обновите состояние и повторите операцию.",
  }, { status: 409 });
}

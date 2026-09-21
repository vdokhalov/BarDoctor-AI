import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/** Actual route/auth/service modules, all migrations, and transactional isolated SQLite. */
export async function lifecycleRuntime(extraRoutes: Record<string, string> = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  const dir = new URL('../../drizzle/', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, dir), 'utf8').replaceAll('--> statement-breakpoint', ''));
  let failBatch = false, failStorage = false;
  const prepare = (sql: string) => {
    let values: SQLInputValue[] = [];
    const statement = {
      bind(...args: SQLInputValue[]) { values = args; return statement; },
      async all() { const results = sqlite.prepare(sql).all(...values); return { results, success: true, meta: { changes: Number(sqlite.prepare('SELECT changes() n').get()?.n ?? 0) } }; },
      async first(column?: string) { const row = sqlite.prepare(sql).get(...values); return column ? row?.[column] ?? null : row ?? null; },
      async raw() { const query = sqlite.prepare(sql); query.setReturnArrays(true); return query.all(...values); },
      async run() { const result = sqlite.prepare(sql).run(...values); return { results: [], success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; },
    };
    return statement;
  };
  const db = { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      if (failBatch) { failBatch = false; throw new Error('injected database failure'); }
      sqlite.exec('COMMIT'); return results;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  const objects = new Map<string, string>();
  const bucket = {
    async list({ prefix, limit }: { prefix: string; limit: number }) { if (failStorage) throw new Error('injected storage failure'); return { objects: [...objects.keys()].filter(key => key.startsWith(prefix)).slice(0, limit).map(key => ({ key })), truncated: false }; },
    async delete(keys: string | string[]) { if (failStorage) throw new Error('injected storage failure'); for (const key of typeof keys === 'string' ? [keys] : keys) objects.delete(key); },
  };
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const compiled = await build({ stdin: { contents: `${Object.entries(extraRoutes).map(([name, file]) => `export * as ${name} from '${file}';`).join(' ')} export * as auth from './lib/bardoctor/auth'; export * as register from './app/api/auth/register/route'; export * as login from './app/api/auth/login/route'; export * as bootstrap from './app/api/auth/bootstrap/route'; export * as venue from './app/api/venues/[id]/route'; export * as venues from './app/api/venues/route'; export * as account from './app/api/users/lifecycle/route'; export * as lifecycle from './lib/bardoctor/account-lifecycle';`, resolveDir: root }, bundle: true, format: 'cjs', platform: 'node', write: false, external: ['cloudflare:workers'], logLevel: 'silent' });
  type Route = Record<string, (request: Request, context?: { params: Promise<{ id?: string }> }) => Promise<Response>>;
  type Api = { auth: typeof import('../../lib/bardoctor/auth'); lifecycle: typeof import('../../lib/bardoctor/account-lifecycle'); register: Route; login: Route; bootstrap: Route; venue: Route; venues: Route; account: Route };
  const loaded = { exports: {} as Api };
  const require = createRequire(import.meta.url);
  new Function('require', 'module', 'exports', compiled.outputFiles[0].text)((name: string) => name === 'cloudflare:workers' ? { env: { DB: db, BUCKET: bucket } } : require(name), loaded, loaded.exports);
  const api = loaded.exports as Api & Record<string, Route>;
  async function register(email: string) {
    const response = await api.register.POST(new Request('https://isolated.test/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Isolated-Test-Password-123!', firstName: 'Test' }) }));
    const result = await response.json(); if (!response.ok) throw new Error(JSON.stringify(result));
    return result as { email: string; token: string; userId: number; activeVenueId: number };
  }
  function request(user: { email: string; token: string }, path: string, method = 'GET', data?: unknown) {
    return new Request(`https://isolated.test${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Session-Email': user.email, 'X-Session-Token': user.token }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  }
  return { api, sqlite, objects, register, request, failDatabase: () => { failBatch = true; }, failStorage: (value: boolean) => { failStorage = value; }, close: () => sqlite.close() };
}

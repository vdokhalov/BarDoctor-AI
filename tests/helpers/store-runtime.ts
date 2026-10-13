import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { build } from "esbuild";
import { drizzle } from "drizzle-orm/d1";
import { permissionsFor, type AccessRole, type PermissionKey } from "../../lib/bardoctor/access-control";

type Reply = { status: number; body: Record<string, unknown> };

/** Actual store GET/PUT, permissions and Drizzle SQL; only auth/connection are TEST fixtures. */
export async function storeRuntime(venueId = 901, venueCurrency = "MDL") {
  const sqlite = new DatabaseSync(":memory:");
  const migrations = new URL('../../drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(file, migrations), 'utf8').replaceAll('--> statement-breakpoint', ''));
  sqlite.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,restaurant_json) VALUES(7,'qa@example.invalid','qa@example.invalid',?)").run(JSON.stringify({currency:venueCurrency}));
  sqlite.exec("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(7,'Store QA',7)");
  sqlite.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(?,7,7,7)").run(venueId);
  sqlite.exec("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(7,7,'owner')");
  sqlite.prepare("INSERT INTO venue_memberships(id,venue_id,account_id,role) VALUES(7,?,7,'owner')").run(venueId);
  function prepare(sql: string, values: SQLInputValue[] = []) {
    return {
      bind(...next: SQLInputValue[]) { return prepare(sql, next); },
      async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; },
      async raw() { const statement = sqlite.prepare(sql); statement.setReturnArrays(true); return statement.all(...values); },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async run() {
        const result = sqlite.prepare(sql).run(...values);
        return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
    };
  }
  const db = drizzle({ prepare } as unknown as D1Database);
  const d1 = { prepare, async batch(statements: { all(): Promise<unknown> }[]) {
    sqlite.exec("BEGIN");
    try { const results = []; for (const statement of statements) results.push(await statement.all()); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } };
  let role: AccessRole = "owner";
  let permissionOverride: PermissionKey[] | undefined;
  const account = () => ({ id: 7, actorAccountId: 7, membershipId: 7, workspaceId: 7, venueId, role,
    permissions: permissionOverride ?? permissionsFor(role), firstName: "QA", lastName: "Owner",
    appEmail: "qa@example.invalid", restaurantJson: JSON.stringify({ currency: venueCurrency }) });
  // Bundle the real route dependency graph so nested DB imports use the same
  // isolated connection. The old top-level import rewriter leaked cloudflare:
  // workers into Node when a real dependency gained its own DB import.
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const compiled = await build({
    stdin: { contents: `export * as store from './app/api/store/[key]/route'; export * as taxonomy from './app/api/nomenclature/taxonomy/route'; export * as ingestion from './app/api/menu/ingestion/route';`, resolveDir: root },
    bundle: true, format: "cjs", platform: "node", write: false, logLevel: "silent",
    plugins: [{ name: "isolated-store-connection", setup(builder) {
      builder.onResolve({ filter: /^\./ }, args => {
        const path = resolve(args.resolveDir, args.path);
        if (path === resolve(root, "db") || path === resolve(root, "db/index")) return { path: "fixture:db", external: true };
        if (path === resolve(root, "lib/bardoctor/auth")) return { path: "fixture:auth", external: true };
      });
    } }],
  });
  const require = createRequire(import.meta.url);
  const loaded = { exports: {} as Record<string, Record<string, (...args: unknown[]) => Promise<Response>>> };
  const fixtureAuth = { authenticateRequest: async () => account(), unauthorized: () => Response.json({ ok: false }, { status: 401 }) };
  new Function("require", "module", "exports", compiled.outputFiles[0].text)((name: string) => name === "fixture:db" ? { getDb: () => db, getD1: () => d1 } : name === "fixture:auth" ? fixtureAuth : require(name), loaded, loaded.exports);
  const { store: api, taxonomy: taxonomyApi, ingestion: ingestionApi } = loaded.exports;
  async function request(method: "GET" | "PUT", key: string, payload?: unknown): Promise<Reply> {
    const response: Response = await api[method](new Request(`https://qa.invalid/api/store/${key}`, {
      method, headers: { "X-Venue-Id": String(venueId), "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify(payload) } : {}),
    }), { params: Promise.resolve({ key }) });
    return { status: response.status, body: await response.json() };
  }
  const rows = () => sqlite.prepare("SELECT * FROM domain_data ORDER BY id").all();
  const audits = () => sqlite.prepare("SELECT * FROM audit_log ORDER BY id").all();
  return {
    async ingestion(body: unknown): Promise<Reply> {
      const response: Response = await ingestionApi.POST(new Request("https://qa.invalid/api/menu/ingestion", { method: "POST", headers: { "Content-Type": "application/json", "X-Venue-Id": String(venueId) }, body: JSON.stringify(body) }));
      return { status: response.status, body: await response.json() };
    },
    async taxonomyGet(): Promise<Reply> {
      const response: Response = await taxonomyApi.GET(new Request("https://qa.invalid/api/nomenclature/taxonomy", {headers:{"X-Venue-Id":String(venueId)}}));
      return {status:response.status,body:await response.json()};
    },
    setPermissions: (value: PermissionKey[]) => { permissionOverride = value; },
    sqlite, rows, audits, close: () => sqlite.close(), setRole: (value: AccessRole) => { role = value; sqlite.prepare("UPDATE venue_memberships SET role=? WHERE id=7").run(value); },
    bytes: () => JSON.stringify({ domain: rows(), audit: audits() }),
    seed(key: string, value: unknown) {
      sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(7,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at")
        .run(key, JSON.stringify(value), "2026-09-01T00:00:00.000Z");
    },
    get: (key: string) => request("GET", key),
    put: (key: string, data: unknown, reason = "Isolated Phase 7 correction", baseData?: unknown) => request("PUT", key, {
      data, reason, ...(baseData === undefined ? {} : { baseData }),
    }),
  };
}

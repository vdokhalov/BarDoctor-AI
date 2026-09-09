import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import * as opening from "../../lib/bardoctor/opening-stock";
import * as csv from "../../lib/bardoctor/onboarding-csv";
import * as cas from "../../lib/bardoctor/store-cas";
import * as taxonomy from "../../lib/bardoctor/nomenclature-taxonomy";
import * as inventory from "../../lib/bardoctor/inventory";
import * as nomenclature from "../../lib/bardoctor/nomenclature";
import * as currency from "../../lib/bardoctor/currency";
import * as http from "../../lib/bardoctor/http";
import * as trust from "../../lib/bardoctor/data-trust";

/** Real route + real CAS SQL on isolated SQLite. Auth fixture never enters production code. */
export function openingRuntime(route = new URL("../../app/api/inventory/opening/route.ts", import.meta.url), extraDependencies: Record<string, unknown> = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE domain_data (account_id INTEGER, store_key TEXT, data_json TEXT NOT NULL, updated_at TEXT, PRIMARY KEY(account_id, store_key));
    CREATE TABLE audit_log (account_id INTEGER, store_key TEXT, action TEXT, entity_id TEXT, entity_label TEXT, month_key TEXT, before_json TEXT, after_json TEXT, changed_fields_json TEXT, actor_name TEXT, actor_role TEXT, reason TEXT, created_at TEXT);`);
  let allowed = true, signedIn = true, batches = 0;
  let beforeBatch: (() => void) | undefined;
  let failAt = -1;
  const prepare = (sql: string) => {
    let values: SQLInputValue[] = [];
    const stmt = {
      bind(...args: SQLInputValue[]) { values = args; return stmt; },
      async all() { return { results: sqlite.prepare(sql).all(...values), success: true }; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async run() { sqlite.prepare(sql).run(...values); return { success: true }; },
    };
    return stmt;
  };
  const db = { prepare, async batch(statements: ReturnType<typeof prepare>[]) {
    batches++; const hook = beforeBatch; beforeBatch = undefined; hook?.();
    sqlite.exec("BEGIN");
    try { const out = []; for (let i = 0; i < statements.length; i++) {
      if (i === failAt) throw new Error("SIMULATED_D1_WRITE_FAILURE"); out.push(await statements[i].run());
    } sqlite.exec("COMMIT"); return out; } catch (e) { sqlite.exec("ROLLBACK"); throw e; }
  } };
  const dependencies = { ...opening, ...csv, ...cas, ...taxonomy, ...inventory, ...nomenclature, ...currency, ...http, ...trust,
    getD1: () => db as unknown as D1Database,
    authenticateRequest: async (request: Request) => signedIn ? { id: 7, venueId: Number(request.headers.get("X-Venue-Id") || 1), role: "owner", firstName: "QA", lastName: "", restaurantJson: '{"currency":"MDL"}' } : null,
    unauthorized: () => new Response(null, { status: 401 }), hasPermission: () => allowed, ...extraDependencies };
  const source = readFileSync(route, "utf8");
  const compiled = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, "")).replace(/export async function /g, "async function ");
  const api = new Function("dependencies", `const {${Object.keys(dependencies).join(",")}} = dependencies;\n${compiled}\nreturn {GET,POST};`)(dependencies) as { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> };
  return { api, sqlite, close: () => sqlite.close(), batches: () => batches,
    setAllowed: (value: boolean) => { allowed = value; }, setSignedIn: (value: boolean) => { signedIn = value; },
    beforeBatch: (hook: () => void) => { beforeBatch = hook; }, failAt: (index: number) => { failAt = index; },
    put(key: string, value: unknown) { sqlite.prepare("INSERT INTO domain_data VALUES (7, ?, ?, 'test') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(key, JSON.stringify(value)); },
    get(key: string): unknown { const row = sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=7 AND store_key=?").get(key) as { data_json: string } | undefined; return row ? JSON.parse(row.data_json) : null; },
  };
}

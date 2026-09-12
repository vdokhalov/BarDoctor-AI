import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { drizzle } from "drizzle-orm/d1";
import * as orm from "drizzle-orm";
import { permissionsFor, type AccessRole } from "../../lib/bardoctor/access-control";

type Reply = { status: number; body: Record<string, unknown> };

/** Actual store GET/PUT, permissions and Drizzle SQL; only auth/connection are TEST fixtures. */
export async function storeRuntime() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE domain_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL,
    store_key TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(account_id, store_key));
    CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL,
    store_key TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT, entity_label TEXT,
    month_key TEXT, before_json TEXT, after_json TEXT, changed_fields_json TEXT,
    actor_name TEXT NOT NULL, actor_role TEXT NOT NULL, reason TEXT, created_at TEXT);`);
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
  let role: AccessRole = "owner";
  const account = () => ({ id: 7, actorAccountId: 7, venueId: 901, role,
    permissions: permissionsFor(role), firstName: "QA", lastName: "Owner",
    appEmail: "qa@example.invalid", restaurantJson: '{"currency":"MDL"}' });
  const route = new URL("../../app/api/store/[key]/route.ts", import.meta.url);
  const source = readFileSync(route, "utf8");
  const pattern = /^import\s+\{([\s\S]*?)\}\s+from\s+"([^"]+)";\r?\n/gm;
  const dependencies: Record<string, unknown> = {};
  for (const match of source.matchAll(pattern)) {
    const specifier = match[2];
    let exports: Record<string, unknown>;
    if (specifier === "drizzle-orm") exports = orm;
    else if (specifier === "../../../../db") exports = { getDb: () => db };
    else if (specifier === "../../../../lib/bardoctor/auth") exports = {
      authenticateRequest: async () => account(),
      unauthorized: () => Response.json({ ok: false }, { status: 401 }),
    };
    else {
      assert.ok(specifier.startsWith("."));
      exports = await import(new URL(`${specifier}.ts`, route).href);
    }
    for (const name of match[1].split(",").map(value => value.trim()).filter(Boolean)) {
      assert.match(name, /^[A-Za-z_$][\w$]*$/);
      assert.ok(name in exports, `Missing real dependency ${name}`);
      dependencies[name] = exports[name];
    }
  }
  const withoutImports = source.replace(pattern, "");
  assert.doesNotMatch(withoutImports, /^import\b/m);
  const compiled = stripTypeScriptTypes(withoutImports).replace(/export async function /g, "async function ");
  const api = new Function("dependencies", `const {${Object.keys(dependencies).join(",")}} = dependencies;\n${compiled}\nreturn {GET,PUT};`)(dependencies);
  async function request(method: "GET" | "PUT", key: string, payload?: unknown): Promise<Reply> {
    const response: Response = await api[method](new Request(`https://qa.invalid/api/store/${key}`, {
      method, headers: { "X-Venue-Id": "901", "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: JSON.stringify(payload) } : {}),
    }), { params: Promise.resolve({ key }) });
    return { status: response.status, body: await response.json() };
  }
  const rows = () => sqlite.prepare("SELECT * FROM domain_data ORDER BY id").all();
  const audits = () => sqlite.prepare("SELECT * FROM audit_log ORDER BY id").all();
  return {
    sqlite, rows, audits, close: () => sqlite.close(), setRole: (value: AccessRole) => { role = value; },
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

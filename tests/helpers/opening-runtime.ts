import * as stockJournal from "../../lib/bardoctor/stock-journal";
import * as stockStorage from "../../lib/bardoctor/stock-storage";
import * as posWorkday from "../../lib/bardoctor/pos-workday-gate";
import * as posShiftCash from "../../lib/bardoctor/pos-shift-cash";
import * as posShiftReport from "../../lib/bardoctor/pos-shift-report";
import * as posDiscounts from "../../lib/bardoctor/pos-discounts";
import * as posOrders from "../../lib/bardoctor/pos-orders";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import * as retention from "../../lib/bardoctor/stock-retention";
import * as opening from "../../lib/bardoctor/opening-stock";
import * as csv from "../../lib/bardoctor/onboarding-csv";
import * as cas from "../../lib/bardoctor/store-cas";
import * as taxonomy from "../../lib/bardoctor/nomenclature-taxonomy";
import * as inventory from "../../lib/bardoctor/inventory";
import * as nomenclature from "../../lib/bardoctor/nomenclature";
import * as currency from "../../lib/bardoctor/currency";
import * as http from "../../lib/bardoctor/http";
import * as trust from "../../lib/bardoctor/data-trust";
import * as access from "../../lib/bardoctor/access-control";
import * as salesEvents from "../../lib/bardoctor/sales-events";
import * as venueIdentity from "../../lib/bardoctor/venue-identity";
import * as operationalDay from "../../lib/bardoctor/operational-day";
import * as managementWorkday from "../../lib/bardoctor/management-workday";
import * as operationalReport from "../../lib/bardoctor/operational-report";
import * as venueTime from "../../lib/bardoctor/venue-time";

/** Real route + real CAS SQL on isolated SQLite. Auth fixture never enters production code. */
export function openingRuntime(route = new URL("../../app/api/inventory/opening/route.ts", import.meta.url), extraDependencies: Record<string, unknown> = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE domain_data (account_id INTEGER, store_key TEXT, data_json TEXT NOT NULL, updated_at TEXT, PRIMARY KEY(account_id, store_key));
    CREATE TABLE audit_log (account_id INTEGER, store_key TEXT, action TEXT, entity_id TEXT, entity_label TEXT, month_key TEXT, before_json TEXT, after_json TEXT, changed_fields_json TEXT, actor_name TEXT, actor_role TEXT, reason TEXT, created_at TEXT);`);
  let allowed = true, signedIn = true, batches = 0, accountingCurrency = "MDL";
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
  const dependencies = { ...stockStorage, ...posWorkday, ...posOrders, ...posDiscounts, ...posShiftReport, ...posShiftCash, ...retention, ...opening, ...csv, ...cas, ...taxonomy, ...inventory, ...nomenclature, ...currency, ...http, ...trust, ...access, ...venueIdentity, ...venueTime, ...salesEvents, ...operationalDay, ...operationalReport, ...managementWorkday,
    // This fixture explicitly substitutes auth; real membership/CAS coverage lives in lifecycleRuntime.
    posMembershipGuard: () => db.prepare("SELECT 1"),
    getD1: () => db as unknown as D1Database,
    authenticateRequest: async (request: Request) => signedIn ? { id: 7, venueId: Number(request.headers.get("X-Venue-Id") || 1), actorAccountId: 7, role: "owner", firstName: "QA", lastName: "", restaurantJson: JSON.stringify({ currency: accountingCurrency }) } : null,
    unauthorized: () => new Response(null, { status: 401 }), hasPermission: () => allowed, ...extraDependencies };
  function loadRoute(route: URL, extra: Record<string, unknown> = {}) {
    const injected = { ...dependencies, ...extra };
    const source = readFileSync(route, "utf8");
    const compiled = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from "[^"]+";\r?\n/gm, "")).replace(/export async function /g, "async function ");
    const loaded = new Function("dependencies", `const {${Object.keys(injected).join(",")}} = dependencies;\n${compiled}\nreturn {GET: typeof GET === 'function' ? GET : undefined,POST};`)(injected) as { GET(request: Request): Promise<Response>; POST(request: Request): Promise<Response> };
    if(process.env.BD_TEST_STOCK_JOURNAL==='1'){
      for(const method of ['GET','POST'] as const){const handler=loaded[method];if(handler)loaded[method]=async request=>{await normalizeStock();const response=await handler(request);await normalizeStock();return response;};}
    }
    return loaded;
  }
  async function normalizeStock(){
    const source=sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=7 AND store_key='bd_stock_movements'").get() as {data_json:string}|undefined;
    if(!source||!Array.isArray(JSON.parse(source.data_json)))return;
    if(!sqlite.prepare("SELECT 1 FROM sqlite_schema WHERE name='stock_journals'").get()){
      sqlite.exec("CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY);INSERT OR IGNORE INTO accounts(id) VALUES(7);CREATE TABLE IF NOT EXISTS venues(id INTEGER PRIMARY KEY,data_account_id INTEGER);INSERT OR IGNORE INTO venues(id,data_account_id) VALUES(1,7);");
      sqlite.exec(readFileSync(new URL('../../drizzle/0032_stock_journal.sql',import.meta.url),'utf8'));
    }
    while((await stockJournal.copyLegacyJournal(db as unknown as D1Database,{accountId:7,venueId:1})).state!=='verified'){}
    await stockJournal.activateJournal(db as unknown as D1Database,{accountId:7,venueId:1});
  }
  const api = loadRoute(route);
  return { api, loadRoute, normalizeStock, sqlite, close: () => sqlite.close(), batches: () => batches,
    setCurrency: (value: string) => { accountingCurrency = value; },
    setAllowed: (value: boolean) => { allowed = value; }, setSignedIn: (value: boolean) => { signedIn = value; },
    beforeBatch: (hook: () => void) => { beforeBatch = hook; }, failAt: (index: number) => { failAt = index; },
    put(key: string, value: unknown) { sqlite.prepare("INSERT INTO domain_data VALUES (7, ?, ?, 'test') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json").run(key, JSON.stringify(value)); },
    get(key: string): unknown { const row = sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=7 AND store_key=?").get(key) as { data_json: string } | undefined; if(!row)return null;const parsed=JSON.parse(row.data_json);
      if(key==='bd_stock_movements'&&stockStorage.stockJournalMarker(parsed))return sqlite.prepare('SELECT m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=7 ORDER BY m.position').all().map(row=>({...JSON.parse(String(row.payload_json)),...(row.snapshot_hash?{recipeSnapshot:JSON.parse(String(row.snapshot_json))}:{})}));return parsed; },
  };
}

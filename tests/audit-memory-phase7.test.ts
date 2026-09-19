import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { Miniflare } from "miniflare";
import { auditSourceProjection } from "../lib/bardoctor/audit-source-projection";
import * as presentation from "../lib/bardoctor/audit-presentation";
import * as diagnostics from "../lib/bardoctor/audit-d1-diagnostics";
import { openingRuntime } from "./helpers/opening-runtime";

const documents: (string | null)[] = [null, "", "{bad", "null", "42", '"hello"', "true", "[]", "{}",
  '{"source":"import","payload":{"source":"integration"}}',
  '{"source":"AI-assisted"}', '{"sourceType":"API integration","externalSystem":"ERP"}',
  '{"source":"integration","externalSystem":"1С"}',
  '[null,4,"not-json",[],{}, {"source":null},{"source":"system"},{"source":"import"}]',
  '[{"source":"","sourceType":false},{"source":"integration","externalSystem":false},{"externalSystem":"ERP"}]',
  '[{"source":"integration"},{"sourceType":"local_connector"},{"externalSystem":"1C"}]',
  '{"source":true,"sourceType":4,"externalSystem":true}',
  '{"source":["import","ai"],"externalSystem":{"private":"not used by String"}}',
  '{"source":"import","source":"integration","externalSystem":"ERP"}',
  '[{"source":"import","source":null},{"source":"ai"}]',
  '{"source":1.2345678901234567,"sourceType":1e400,"externalSystem":-1e400}',
  '{"externalSystem":1.2345678901234567,"source":"integration"}',
];
function expectedMetadata(input: string | null) {
  let value: unknown; try { value = JSON.parse(input ?? "null"); } catch { value = null; }
  const rows = (Array.isArray(value) ? value : [value]).filter(item => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[];
  return Object.fromEntries(["source", "sourceType", "externalSystem"].map(key => [key, rows.find(row => row[key] != null)?.[key] ?? null]));
}
const projection = `SELECT ${auditSourceProjection("before_json")} AS beforeJson, ${auditSourceProjection("after_json")} AS afterJson FROM audit_log`;
type AuditResponse = { venueId: number; overview: { metrics: { value: number }[] }; page: { total: number }; rows: { id: number }[] };

test("compact SQL source metadata preserves JSON parsing, array order, duplicate keys and classification", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE audit_log (before_json TEXT, after_json TEXT)");
    for (const before of documents) for (const after of documents) {
      db.exec("DELETE FROM audit_log"); db.prepare("INSERT INTO audit_log VALUES (?, ?)").run(before, after);
      const row = db.prepare(projection).get() as { beforeJson: string; afterJson: string };
      assert.deepEqual(JSON.parse(row.beforeJson), expectedMetadata(before));
      assert.deepEqual(JSON.parse(row.afterJson), expectedMetadata(after));
      for (const actor of [{ actorName: "QA", actorRole: "owner", reason: null }, { actorName: "Система", actorRole: "system", reason: "импорт файла" }]) {
        assert.deepEqual(presentation.sourceFromAudit({ ...actor, ...row }), presentation.sourceFromAudit({ ...actor, beforeJson: before, afterJson: after }));
      }
    }
  } finally { db.close(); }
});

test("compact source projection executes against actual local D1, including malformed legacy JSON", { timeout: 60_000 }, async () => {
  const mf = new Miniflare({ modules: true, script: "export default {fetch(){return new Response('QA')}}", compatibilityDate: "2026-01-01", d1Databases: ["DB"] });
  try {
    const db = await mf.getD1Database("DB");
    await db.exec("CREATE TABLE audit_log (before_json TEXT, after_json TEXT)");
    await db.batch(documents.map((value, i) => db.prepare("INSERT INTO audit_log VALUES (?, ?)").bind(value, documents[documents.length - 1 - i])));
    const result = await db.prepare(projection + " ORDER BY rowid").all<{ beforeJson: string; afterJson: string }>();
    assert.equal(result.results.length, documents.length);
    result.results.forEach((row, i) => {
      assert.deepEqual(JSON.parse(row.beforeJson), expectedMetadata(documents[i]));
      assert.deepEqual(JSON.parse(row.afterJson), expectedMetadata(documents[documents.length - 1 - i]));
    });
    await db.prepare(`WITH RECURSIVE fixture(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM fixture WHERE n<5000)
      INSERT INTO audit_log SELECT json_object('source','user','snapshot',CASE WHEN n<=100 THEN hex(zeroblob(16384)) ELSE '' END),
        json_object('source','import','snapshot',CASE WHEN n<=100 THEN hex(zeroblob(16384)) ELSE '' END) FROM fixture`).run();
    const bulk = await db.prepare(projection + " WHERE rowid > ? ORDER BY rowid LIMIT 5000").bind(documents.length).all<{ beforeJson: string; afterJson: string }>();
    assert.equal(bulk.results.length, 5000);
    assert.ok(Buffer.byteLength(JSON.stringify(bulk.results)) < 1_000_000);
    for (const row of bulk.results) {
      assert.equal(JSON.parse(row.beforeJson).source, "user");
      assert.equal(JSON.parse(row.afterJson).source, "import");
      assert.doesNotMatch(row.beforeJson + row.afterJson, /snapshot/);
    }
  } finally { await mf.dispose(); }
});

test("actual audit GET preserves aggregate/page/CSV contract and venue isolation without materializing snapshots in bulk reads", async () => {
  const r = openingRuntime();
  r.sqlite.exec(`ALTER TABLE audit_log ADD COLUMN id INTEGER;
    CREATE TABLE integration_connections (id TEXT, venue_id INTEGER, data_account_id INTEGER);
    CREATE TABLE integration_sync_runs (id TEXT, connection_id TEXT, source_name TEXT, data_type TEXT, status TEXT, received_count INTEGER, error_count INTEGER, mapping_issue_count INTEGER, errors_json TEXT, finished_at TEXT, created_at TEXT, venue_id INTEGER, data_account_id INTEGER);`);
  const calls: { sql: string; bytes: number; rows: number }[] = [];
  let enforceBudget = false;
  const prepare = (sql: string) => {
    let values: SQLInputValue[] = [];
    return { bind(...args: SQLInputValue[]) { values = args; return this; },
      async first() { return r.sqlite.prepare(sql).get(...values) ?? null; },
      async all() {
        const results = r.sqlite.prepare(sql).all(...values), bytes = Buffer.byteLength(JSON.stringify(results));
        calls.push({ sql, bytes, rows: results.length });
        // A deterministic transfer-budget sentinel, not a claim to emulate D1's
        // undocumented internal memory allocator. Legacy projection exceeds it.
        if (enforceBudget && /LIMIT (5000|10000)$/.test(sql) && bytes > 4_000_000) throw new Error("QA_BULK_SNAPSHOT_BUDGET");
        return { results };
      },
    };
  };
  const route = (compact: boolean) => r.loadRoute(new URL("../app/api/audit/route.ts", import.meta.url), {
    ...presentation, ...diagnostics, auditSourceProjection: compact ? auditSourceProjection : (column: string) => column,
    getD1: () => ({ prepare }), POST: undefined,
  });
  const get = (api: ReturnType<typeof route>, query = "limit=1") => api.GET(new Request("https://qa.invalid/api/audit?" + query, { headers: { "X-Venue-Id": "3293" } }));
  try {
    const date = new Date().toISOString(), insert = r.sqlite.prepare("INSERT INTO audit_log (id,account_id,store_key,action,entity_label,before_json,after_json,actor_name,actor_role,created_at) VALUES (?, ?, ?, 'update', ?, ?, ?, ?, 'owner', ?)");
    r.sqlite.exec("BEGIN");
    for (let i = 1; i <= 10010; i++) {
      const payload = JSON.stringify({ source: i === 5011 ? "import" : "user", amount: i, ignoredSnapshot: i >= 5011 && i < 5111 ? "x".repeat(32_768) : "" });
      insert.run(i, 7, i === 5011 ? "bd_guest_reviews" : "bd_finance_expenses", "QA", payload, payload, "QA" + i % 3, date);
    }
    insert.run(10011, 8, "restaurant_profile", "FOREIGN", '{"source":"integration","externalSystem":"FOREIGN"}', null, "FOREIGN", date);
    r.sqlite.exec("COMMIT");
    const before = r.sqlite.prepare("SELECT COUNT(*) AS n, SUM(length(before_json)+length(after_json)) AS bytes FROM audit_log").get();
    const legacy = route(false), compact = route(true);
    const expected = await (await get(legacy)).json();
    const baselineBytes = calls.filter(call => /LIMIT (5000|10000)$/.test(call.sql)).map(call => call.bytes).sort((a,b)=>a-b);
    assert.ok(baselineBytes.every(bytes => bytes > 4_000_000), "both legacy aggregate reads reproduce excess snapshot transfer");
    enforceBudget = true;
    const log = console.error; console.error = () => {};
    try { await assert.rejects(get(legacy), /QA_BULK_SNAPSHOT_BUDGET/); } finally { console.error = log; }
    calls.length = 0;
    const response = await get(compact), actual = await response.json() as AuditResponse;
    assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(actual, expected, "metadata, counts, row order, filters and visibility must remain exact");
    assert.equal(actual.overview.metrics[0].value, 10000); assert.equal(actual.page.total, 10010);
    assert.equal(actual.venueId, 3293); assert.doesNotMatch(JSON.stringify(actual), /FOREIGN|ignoredSnapshot/);
    const bulk = calls.filter(call => /LIMIT (5000|10000)$/.test(call.sql));
    assert.deepEqual(bulk.map(call => call.rows).sort((a,b)=>a-b), [5000,10000]);
    assert.ok(bulk.every(call => call.bytes < 4_000_000));
    const compactBytes = bulk.map(call => call.bytes).sort((a,b)=>a-b);
    assert.ok(compactBytes.every((bytes,i)=>bytes < baselineBytes[i] / 2));
    console.info(JSON.stringify({ auditBulkTransferBytes: { baseline: baselineBytes, compact: compactBytes }, rows: [5000,10000] }));
    const pageTwo = await (await get(compact, "limit=2&offset=1")).json() as AuditResponse;
    assert.deepEqual(pageTwo.rows.map((row: {id:number}) => row.id), [10009,10008]);
    assert.equal(await (await get(compact, "format=csv&actor=QA1")).text(), await (await get(legacy, "format=csv&actor=QA1")).text());
    assert.deepEqual(r.sqlite.prepare("SELECT COUNT(*) AS n, SUM(length(before_json)+length(after_json)) AS bytes FROM audit_log").get(), before);
  } finally { r.close(); }
});

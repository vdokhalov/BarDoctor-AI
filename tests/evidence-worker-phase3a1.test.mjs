import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Miniflare } from "miniflare";

test("actual compiled Worker routes evidence GET with isolated native D1 and no canonical writes", { timeout: 120000 }, async () => {
  const server = path.resolve("dist/server");
  const config = JSON.parse(readFileSync(path.join(server, "wrangler.json"), "utf8"));
  const modules = ["index.js", ...readdirSync(server, { recursive: true }).filter(file => file !== "index.js" && /\.(?:m?js)$/.test(file)).sort()]
    .map(file => ({ type: "ESModule", path: path.join(server, file) }));
  let outbound = 0;
  const mf = new Miniflare({ modules, modulesRoot: server, compatibilityDate: config.compatibility_date, compatibilityFlags: config.compatibility_flags,
    d1Databases: { DB: "isolated-evidence-foundation" }, r2Buckets: ["BUCKET"],
    serviceBindings: { ASSETS: () => new Response(null, { status: 404 }) },
    outboundService: () => { outbound++; return new Response(null, { status: 502 }); } });
  const schema = new DatabaseSync(":memory:");
  try {
    schema.exec("PRAGMA foreign_keys=ON");
    for (const name of readdirSync("drizzle").filter(n => n.endsWith(".sql")).sort()) schema.exec(readFileSync(`drizzle/${name}`, "utf8"));
    const db = await mf.getD1Database("DB");
    const definitions = schema.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all();
    for (let i = 0; i < definitions.length; i += 30) await db.batch(definitions.slice(i, i + 30).map(row => db.prepare(row.sql)));
    const token = "isolated-evidence-worker-session";
    const raw = '{"menuItems":[{"id":"worker-menu","venueId":1,"name":"Worker menu","salePrice":17,"currency":"MDL","active":true,"source":"MANUAL"}]}';
    await db.batch([
      db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,restaurant_json) VALUES(1,'worker@isolated.test','worker@isolated.test','{\"name\":\"Worker QA\",\"currency\":\"MDL\"}')"),
      db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Worker QA',1)"),
      db.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)"),
      db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO sessions(token_hash,account_id,active_venue_id,expires_at) VALUES(?,1,1,?)").bind(createHash("sha256").update(token).digest("hex"), new Date(Date.now() + 3600000).toISOString()),
      db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,'bd_assortment_v1',?,'2026-10-01T12:00:00Z')").bind(raw),
    ]);
    // Guard canonical mutations inside native D1, in addition to byte comparisons.
    for (const action of ["INSERT", "UPDATE", "DELETE"]) await db.exec(`CREATE TRIGGER evidence_no_${action.toLowerCase()} BEFORE ${action} ON domain_data BEGIN SELECT RAISE(ABORT, 'canonical writes forbidden'); END`);
    const before = (await db.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all()).results;
    const ref = { contractVersion: 1, kind: "MENU_ITEM", id: "worker-menu", venueId: 1, workspaceId: 1 };
    const headers = { "X-Session-Token": token, "X-Session-Email": "worker@isolated.test", "X-Venue-Id": "1" };
    const call = (reference, auth = headers) => mf.dispatchFetch("http://localhost/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(reference)), { headers: auth });
    assert.equal((await call(ref, {})).status, 401);
    const response = await call(ref); assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const body = await response.json(); assert.equal(body.evidence.projection.salePrice, 17); assert.equal(body.evidence.binding, "CURRENT_RECORD");
    assert.equal((await (await call(body.evidence.reference)).json()).evidence.binding, "EXPECTED_REVISION");
    assert.equal((await (await call({ ...ref, workspaceId: 999 })).json()).outcome, "unavailable");
    assert.equal((await (await call({ ...ref, expectedRevision: "sha256:" + "0".repeat(64) })).json()).outcome, "changed");
    assert.equal((await call({ ...ref, storeKey: "bd_assortment_v1" })).status, 400);
    assert.deepEqual((await db.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all()).results, before);
    assert.equal(outbound, 0);
  } finally { schema.close(); await mf.dispose(); }
});

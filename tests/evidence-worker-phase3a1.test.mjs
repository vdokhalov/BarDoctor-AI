import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Miniflare } from "miniflare";
import { register } from "tsx/esm/api";
register();

test("actual compiled Worker routes evidence, DAILY_REVENUE and captured cost GET with isolated native D1 and no canonical writes", { timeout: 120000 }, async () => {
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
    const [{ salesEventFixture }, { planSalesEvent }] = await Promise.all([import("./helpers/sales-event-fixture.ts"), import("../lib/bardoctor/sales-events.ts")]);
    const costContext = salesEventFixture(); costContext.now = "2026-10-01T12:00:00Z";
    costContext.revenues = [{ id: "worker-cash", venueId: 1, date: "2026-10-01", timezone: "UTC", revenueSource: "sales_events_v1", closingStatus: "open", currency: "MDL", revenue: 0 }];
    costContext.movements = [{ id: "worker-receipt", venueId: 1, type: "receipt", date: "2026-10-01", productKey: "coffee-stock", productName: "Beans", amount: 1, unit: "kg", costAmount: 100, costStatus: "KNOWN", currency: "MDL", sourceDocumentId: "worker-purchase", sourceLineId: "worker-purchase-line", createdAt: "2026-10-01T09:00:00Z", status: "active" }];
    const costPlan = await planSalesEvent(costContext, { id: "worker-cost-sale", source: "MANUAL_GRID", shiftId: "worker-cash", lines: [{ id: "worker-cost-line", menuItemId: "coffee", quantity: 2 }] });
    const raw = JSON.stringify({ ...costPlan.assortment, menuItems: [...costPlan.assortment.menuItems, { id: "worker-menu", venueId: 1, name: "Worker menu", salePrice: 17, currency: "MDL", active: true, source: "MANUAL" }] });
    await db.batch([
      db.prepare("INSERT INTO accounts(id,chatgpt_email,app_email,restaurant_json) VALUES(1,'worker@isolated.test','worker@isolated.test','{\"name\":\"Worker QA\",\"currency\":\"MDL\"}')"),
      db.prepare("INSERT INTO workspaces(id,name,created_by_account_id) VALUES(1,'Worker QA',1)"),
      db.prepare("INSERT INTO venues(id,data_account_id,workspace_id,created_by_account_id) VALUES(1,1,1,1)"),
      db.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES(1,1,'owner')"),
      db.prepare("INSERT INTO sessions(token_hash,account_id,active_venue_id,expires_at) VALUES(?,1,1,?)").bind(createHash("sha256").update(token).digest("hex"), new Date(Date.now() + 3600000).toISOString()),
      db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,'bd_assortment_v1',?,'2026-10-01T12:00:00Z')").bind(raw),
      db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,'bd_finance_revenue',?,'2026-10-01T12:00:00Z')").bind(JSON.stringify([
        { id: "worker-cash", venueId: 1, date: "2026-10-01", revenueSource: "sales_events_v1", revenue: 90, currency: "MDL", receipts: 4, closingStatus: "open", createdAt: "2026-10-01T12:00:00Z" },
      ])),
      db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,'bd_sales_events_v1',?,'2026-10-01T12:00:00Z')").bind(JSON.stringify([costPlan.event, ...[10, 20, 30].map((revenue, i) => (
        { id: "worker-sale:" + i, venueId: 1, businessDate: "2026-10-01", revenueRowId: "worker-cash", shiftId: "worker-cash", source: "POS_API", status: "POSTED", revenue, currency: "MDL", acceptedAt: "2026-10-01T12:00:00Z" }
      ))])),
      db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(1,'bd_stock_movements',?,'2026-10-01T12:00:00Z')").bind(JSON.stringify(costPlan.movements)),
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
    const dailyUrl = "http://localhost/api/evidence/facts/daily-revenue?businessDate=2026-10-01";
    assert.equal((await mf.dispatchFetch(dailyUrl)).status, 401);
    const factResponse = await mf.dispatchFetch(dailyUrl, { headers });
    assert.equal(factResponse.status, 200); assert.equal(factResponse.headers.get("Cache-Control"), "private, no-store");
    const { fact } = await factResponse.json();
    assert.equal(fact.value, 90); assert.equal(fact.sourceType, "BARDOC_POS"); assert.equal(fact.finality, "PROVISIONAL"); assert.equal(fact.evidenceStatus, "COMPLETE");
    assert.equal((await (await mf.dispatchFetch(dailyUrl + "&expectedRevision=" + fact.revision, { headers })).json()).binding, "EXPECTED_REVISION");
    assert.equal((await (await call({ ...fact.traceTarget.reference, expectedRevision: "sha256:" + "0".repeat(64) })).json()).code, "READ_MODEL_CHANGED");
    const root = (await (await call(fact.traceTarget.reference)).json()).evidence;
    const finance = (await (await call(root.relations[0].reference)).json()).evidence;
    const shift = (await (await call(finance.relations.find(r => r.reference.kind === "CASH_SHIFT").reference)).json()).evidence;
    let salesTotal = 0;
    for (const relation of shift.relations) {
      const sale = (await (await call(relation.reference)).json()).evidence;
      assert.equal(sale.projection.lifecycle, "POSTED"); salesTotal += sale.projection.revenue;
    }
    assert.equal(salesTotal, fact.value); assert.equal(finance.projection.revenue, fact.value);
    const dayResponse = await mf.dispatchFetch("http://localhost/api/operational-days", { headers });
    assert.equal((await dayResponse.json()).days[0].revenue.amount, fact.value);
    assert.equal((await mf.dispatchFetch(dailyUrl + "&dataAccountId=2", { headers })).status, 400);
    const costUrl = "http://localhost/api/evidence/facts/sale-cost?saleId=" + encodeURIComponent(costPlan.event.id);
    assert.equal((await mf.dispatchFetch(costUrl)).status, 401);
    const costResponse = await mf.dispatchFetch(costUrl, { headers }); assert.equal(costResponse.status, 200); assert.equal(costResponse.headers.get("Cache-Control"), "private, no-store");
    const cost = (await costResponse.json()).fact; assert.equal(cost.value, 1.6); assert.equal(cost.costStatus, "KNOWN"); assert.equal(cost.evidenceStatus, "COMPLETE");
    const line = (await (await call(cost.evidenceRefs[0])).json()).evidence;
    const recipe = (await (await call(line.relations.find(r => r.reference.kind === "CAPTURED_RECIPE").reference)).json()).evidence;
    const ingredient = (await (await call(recipe.relations.find(r => r.reference.kind === "CAPTURED_INGREDIENT").reference)).json()).evidence;
    const movement = (await (await call(ingredient.relations.find(r => r.reference.kind === "WAREHOUSE_MOVEMENT").reference)).json()).evidence;
    assert.equal(movement.projection.quantity, -0.016); assert.equal(movement.projection.unit, "kg"); assert.equal(movement.projection.costAmount, -1.6);
    assert.equal(movement.projection.saleId, cost.saleId); assert.equal(movement.projection.saleLineId, "worker-cost-line");
    assert.equal((await (await call({ ...cost.traceTarget.reference, workspaceId: 999 })).json()).code, "EVIDENCE_UNAVAILABLE");
    assert.equal((await (await mf.dispatchFetch(costUrl + "&expectedRevision=sha256:" + "0".repeat(64), { headers })).json()).code, "READ_MODEL_CHANGED");
    assert.deepEqual((await db.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all()).results, before);
    assert.equal(outbound, 0);
  } finally { schema.close(); await mf.dispose(); }
});

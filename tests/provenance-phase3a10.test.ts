import assert from "node:assert/strict";
import test from "node:test";
import { provenanceFixture as fixture } from "./helpers/provenance-runtime";
import { contextProvenance } from "../lib/bardoctor/context-provenance";
import type { WriterInput } from "../lib/bardoctor/integrations/domain-writer";
import type { CanonicalEnvelope } from "../lib/bardoctor/integrations/contracts";

test("G05 client/stale/spoofed numeric input cannot override canonical metrics, currency, staff or weekday calculations", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_employees", [{ id: "staff-1", venueId: r.venueId, status: "active" }]);
  const body = { profile: { currency: "USD", timezone: "Pacific/Kiritimati" }, finance: { tracked: true, recentDaily: [{ date: "2026-10-03", revenue: 999999, receipts: 999 }], monthToDate: { revenue: 888888, payroll: 777777, expenses: 666666, result: 555555, guests: 999, avgReceipt: 999 }, hourly: [{ revenue: 999 }] }, employees: { total: 999, active: 999 } };
  const before = r.snapshot(), a = await r.context.loadVenueAIContext(r.account, "diagnosis"), b = await r.context.loadVenueAIContext(r.account, "diagnosis", body);
  assert.deepEqual(b.promptData, a.promptData); assert.deepEqual(b.metricEvidence, a.metricEvidence); assert.equal(b.accountingCurrency, "MDL");
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_revenue", b)!.value, 150);
  assert.equal(r.metrics.recommendationMetricSnapshot("active_employees", b)!.value, 1);
  assert.equal(b.ownerProvidedContext!.authority, "OWNER_PROVIDED_CONTEXT"); assert.deepEqual(r.snapshot(), before);
  const reference = r.metrics.recommendationMetricSnapshot("current_period_revenue", a)!.provenance!.evidenceRef!;
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Isolated provenance", currency: "USD", timezone: "UTC" }), r.accountId);
  assert.equal((await r.resolve(reference)).body.outcome, "changed", "canonical currency changes invalidate the monetary calculation even when its numeric amount is equal");
});

test("G05 metric → calculation → business facts → exact canonical source resolver; stable inputs and revisions reject change", async t => {
  const r = await fixture(); t.after(r.close);
  const context = await r.context.loadVenueAIContext(r.account, "diagnosis"), metric = r.metrics.recommendationMetricSnapshot("current_period_revenue", context)!;
  assert.equal(metric.provenance!.authority, "CANONICAL_SERVER"); assert.equal(metric.provenance!.state, "AVAILABLE");
  const result = await r.resolve(metric.provenance!.evidenceRef!); assert.equal(result.body.outcome, "resolved");
  assert.ok("evidence" in result.body); const source = result.body.evidence.relations.find(relation => relation.reference.id === "bd_finance_revenue")!.reference;
  const resolvedSource = await r.resolve(source); assert.equal(resolvedSource.body.outcome, "resolved"); assert.ok("evidence" in resolvedSource.body); assert.equal(resolvedSource.body.evidence.relations.length, 2);
  assert.equal((await r.resolve(resolvedSource.body.evidence.relations[0].reference)).body.outcome, "resolved");
  r.put("bd_finance_revenue", [{ id: "shift-a", venueId: r.venueId, date: "2026-10-03", revenue: 175, receipts: 3, status: "closed" }]);
  assert.equal((await r.resolve(metric.provenance!.evidenceRef!)).body.outcome, "changed"); assert.equal((await r.resolve(source)).body.outcome, "changed");
});

test("G05 missing sources stay PARTIAL; supplied zero cannot make evidence KNOWN ZERO", async t => {
  const r = await fixture(); t.after(r.close); r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key='bd_finance_revenue'").run(r.accountId);
  const context = await r.context.loadVenueAIContext(r.account, "diagnosis", { finance: { recentDaily: [{ date: "2026-10-03", revenue: 0 }], monthToDate: { revenue: 0 } } });
  const metric = r.metrics.recommendationMetricSnapshot("current_period_revenue", context);
  assert.ok(metric === null || metric.provenance!.state === "PARTIAL");
});

test("G05 explicit foreign/nested inputs cannot turn an excluded source set into KNOWN ZERO", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_employees", [{ id: "foreign", venueId: r.foreign.activeVenueId, status: "active" }]);
  const context = await r.context.loadVenueAIContext(r.account, "diagnosis");
  assert.equal(r.metrics.recommendationMetricSnapshot("active_employees", context), null);
  assert.equal(context.canonicalInputs!.blocks.team.find(source => source.key === "bd_employees")!.state, "PARTIAL");
});

test("G05 absent guest/receipt fields remain UNKNOWN; captured zero remains known", async t => {
  const r = await fixture(); t.after(r.close);
  const load = () => r.context.loadVenueAIContext(r.account, "diagnosis");
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_guests", await load()), null);
  r.put("bd_finance_revenue", [{ id: "missing-counts", venueId: r.venueId, date: "2026-10-03", revenue: 0, status: "closed" }]);
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_receipts", await load()), null);
  r.put("bd_finance_revenue", [{ id: "zero-counts", venueId: r.venueId, date: "2026-10-03", revenue: 0, receipts: 0, guests: 0, status: "closed" }]);
  const zero = await load();
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_receipts", zero)!.value, 0);
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_guests", zero)!.value, 0);
});

test("G05 unrelated missing sources cannot hide known zero or invalidate another metric's calculation", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_finance_revenue", []);
  const context = await r.context.loadVenueAIContext(r.account, "diagnosis");
  const employee = r.metrics.recommendationMetricSnapshot("active_employees", context)!;
  const revenue = r.metrics.recommendationMetricSnapshot("current_period_revenue", context)!;
  r.sqlite.prepare("UPDATE domain_data SET updated_at='2026-10-04T12:01:00Z' WHERE account_id=? AND store_key='bd_payroll_entries'").run(r.accountId);
  assert.equal((await r.resolve(employee.provenance!.evidenceRef!)).body.outcome, "resolved", "unrelated freshness cannot change the metric binding");
  r.sqlite.prepare("DELETE FROM domain_data WHERE account_id=? AND store_key IN ('bd_payroll_entries','bd_finance_expenses','bd_purchase_documents')").run(r.accountId);
  const next = await r.context.loadVenueAIContext(r.account, "diagnosis");
  assert.equal(r.metrics.recommendationMetricSnapshot("active_employees", next)!.value, 0);
  assert.equal(r.metrics.recommendationMetricSnapshot("current_period_revenue", next)!.value, 0);
  assert.equal((await r.resolve(employee.provenance!.evidenceRef!)).body.outcome, "resolved");
  assert.equal((await r.resolve(revenue.provenance!.evidenceRef!)).body.outcome, "resolved");
  const before = r.snapshot();
  for (let repeat = 0; repeat < 3; repeat++) {
    await r.context.loadVenueAIContext(r.account, "diagnosis");
    assert.equal((await r.api.health.GET(r.request(r.owner, "/api/business-health"))).status, 200);
    assert.equal((await r.api.hub.GET(r.request(r.owner, "/api/integration-hub"))).status, 200);
    assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "bd_purchase_documents"))).body.outcome, "unavailable");
    assert.equal((await r.resolve(employee.provenance!.evidenceRef!)).body.outcome, "resolved");
    assert.equal(r.sqlite.prepare("SELECT 1 FROM domain_data WHERE account_id=? AND store_key='bd_purchase_documents'").get(r.accountId), undefined);
  }
  assert.deepEqual(r.snapshot(), before, "repeated reads preserve schema, all record bytes, timestamps, audit, population and DML count");
  r.put("bd_purchase_documents", [{ id: "existing", venueId: r.venueId, status: "draft", items: [] }]);
  for (let repeat = 0; repeat < 3; repeat++) assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "bd_purchase_documents"))).body.outcome, "resolved");
});

test("G05 missing assortment collection stays UNKNOWN while explicit empty collection proves known zero", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_assortment_v1", {});
  const missing = await r.context.loadVenueAIContext(r.account, "diagnosis");
  assert.equal(r.metrics.recommendationMetricSnapshot("menu_active_items", missing), null);
  assert.equal(r.metrics.recommendationMetricSnapshot("low_stock_items", missing), null);
  assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "bd_assortment_v1.menuItems"))).body.outcome, "unavailable");
  r.put("bd_assortment_v1", { menuItems: [], stockBalances: [] });
  const zero = await r.context.loadVenueAIContext(r.account, "diagnosis");
  assert.equal(r.metrics.recommendationMetricSnapshot("menu_active_items", zero)!.value, 0);
  assert.equal(r.metrics.recommendationMetricSnapshot("low_stock_items", zero)!.value, 0);
});

test("G05 source and metric scope/RBAC/closed registry reject foreign, restricted and arbitrary selectors", async t => {
  const r = await fixture(); t.after(r.close);
  assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), r.foreign)).body.outcome, "unavailable");
  assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "accounts"))).body.outcome, "unsupported");
  assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "__proto__"))).body.outcome, "unsupported");
  const member = await r.register("provenance-manager@isolated.test");
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES(?,?,'member','active')").run(r.workspaceId, member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,permissions_json,status) VALUES(?,?,'manager',?,'active')").run(r.venueId, member.userId, JSON.stringify({ deny: ["finance.view"] }));
  assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), member, r.venueId)).body.outcome, "restricted");
  assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "bd_finance_expenses"), member, r.venueId)).body.outcome, "restricted");
  r.put("bd_finance_revenue", [{ id: "nested", venueId: r.venueId, items: [{ venueId: r.foreign.activeVenueId, revenue: 999 }] }]);
  for (let repeat = 0; repeat < 3; repeat++) {
    assert.equal((await r.resolve(r.ref("CANONICAL_SOURCE", "bd_finance_revenue", { partId: "nested" }))).body.outcome, "unavailable");
    assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), member, r.venueId)).body.outcome, "restricted");
    assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), r.foreign)).body.outcome, "unavailable");
  }
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, member.userId);
  for (let repeat = 0; repeat < 3; repeat++) assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), member, r.venueId)).status, 401);
  // Even confirmed owner access must not be repaired by an evidence read.
  r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(r.venueId, r.owner.userId);
  for (let repeat = 0; repeat < 3; repeat++) assert.equal((await r.resolve(r.ref("AI_METRIC", "current_period_revenue"), r.owner, r.venueId)).status, 401);
});

test("G16 all six authorities are distinct; URLs/confirmation do not certify external provider facts", () => {
  assert.equal(contextProvenance({ confirmed: true, sourceUrls: ["https://example.test/a"] }, "market").authority, "OWNER_CONFIRMED_CONTEXT");
  assert.equal(contextProvenance({ origin: "web", sourceUrls: ["https://example.test/a"] }, "calendar").authority, "EXTERNAL_OBSERVATION");
  assert.equal(contextProvenance({ origin: "manual" }, "calendar").authority, "OWNER_PROVIDED_CONTEXT");
  assert.equal(contextProvenance({}, "calendar").authority, "HYPOTHESIS");
  assert.equal(contextProvenance({ confirmed: true }, "legacy", true).authority, "LEGACY_CONTEXT");
  assert.equal(contextProvenance({ confirmed: true }, "market").independentVerification, "NOT_ESTABLISHED");
});

test("G16 same-name canonical context and legacy competitor keep separate identities and disclose conflict", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_market_analysis_v1", { competitors: [{ key: "provider-a", name: "Same name", confirmed: true, sourceUrls: ["https://example.test/a"] }] });
  const legacy = { competitors: [{ key: "legacy-b", name: "Same name", confirmed: true, sourceUrls: ["https://example.test/b"] }] };
  r.sqlite.prepare("UPDATE accounts SET competitors_json=? WHERE id=?").run(JSON.stringify(legacy), r.accountId);
  const account = await r.api.auth.authenticateRequest(r.request(r.owner, "/api/ai/diagnosis")); assert.ok(account);
  const external = r.api.external as unknown as typeof import("../lib/bardoctor/diagnosis-context");
  const result = await external.loadDiagnosisExternalContext(account); assert.equal(result.confirmedCompetitors.length, 2);
  assert.deepEqual(result.confirmedCompetitors.map(row => row.provenance!.authority), ["OWNER_CONFIRMED_CONTEXT", "LEGACY_CONTEXT"]);
  assert.ok(result.confirmedCompetitors.every(row => row.provenance!.identityConflict === "SAME_NAME_DIFFERENT_SOURCE"));
});

test("G16 stored arbitrary provenance label cannot upgrade external context to canonical fact", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_market_analysis_v1", { competitors: [{ key: "context-only", name: "External", confirmed: true, provenance: { authority: "CANONICAL_INTERNAL_FACT" } }] });
  const context = await r.context.loadVenueAIContext(r.account, "diagnosis");
  const competitor = (context.promptData.market.confirmedCompetitors as { provenance: { authority: string } }[])[0];
  assert.equal(competitor.provenance.authority, "OWNER_CONFIRMED_CONTEXT");
});

test("G05 bounded canonical source pagination retains exact references and excludes duplicate ambiguous identities", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_finance_revenue", Array.from({ length: 23 }, (_, index) => ({ id: `shift-${index}`, venueId: r.venueId, revenue: index, date: "2026-10-03" })));
  const first = await r.resolve(r.ref("CANONICAL_SOURCE", "bd_finance_revenue")); assert.ok("evidence" in first.body);
  assert.equal(first.body.evidence.relations.length, 20); assert.equal(first.body.evidence.page.nextOffset, 20);
  r.put("bd_finance_revenue", [{ id: "duplicate", revenue: 1 }, { id: "duplicate", revenue: 2 }]);
  const ambiguous = await r.resolve(r.ref("CANONICAL_SOURCE", "bd_finance_revenue", { partId: "duplicate" })); assert.equal(ambiguous.body.outcome, "unavailable");
});

test("G18 real integration run/item → accepted write → canonical entity exact revision; later change remains changed", async t => {
  const r = await fixture(); t.after(r.close);
  const run = await r.sync.runIntegrationSync({ account: r.account, connectionId: "qa-connection", trigger: "file", dataType: "supplier", records: [r.envelope("supplier", "supplier-external", { name: "Accepted supplier" })], writer: r.writer.integrationBusinessWriter(r.request(r.owner, "/api/integration-hub/import"), r.account) });
  assert.equal(run.status, "success");
  const item = r.sqlite.prepare("SELECT * FROM integration_sync_items WHERE run_id=?").get(run.runId)!;
  const binding = JSON.parse(String(item.payload_json)).bardoctorAcceptedWrite; assert.equal(binding.authority, "ACCEPTED_CANONICAL_WRITE"); assert.equal(binding.historicalReconstruction, false);
  const resolved = await r.resolve(r.ref("INTEGRATION_EVENT", String(item.id))); assert.equal(resolved.body.outcome, "resolved"); assert.ok("evidence" in resolved.body);
  assert.equal((await r.resolve(resolved.body.evidence.relations[0].reference)).body.outcome, "resolved");
  r.put("bd_suppliers", [{ id: item.internal_id, venueId: r.venueId, name: "Changed after acceptance" }]);
  assert.equal((await r.resolve(resolved.body.evidence.relations[0].reference)).body.outcome, "changed");
  assert.equal((await r.resolve(resolved.body.evidence.reference)).body.outcome, "resolved", "accepted event revision is retained separately from mutable canonical current state");
  assert.equal((await r.resolve(r.ref("INTEGRATION_EVENT", String(item.id)), r.foreign)).body.outcome, "unavailable");
});

test("G18 multi-entity return binds accepted stock, movements, document and expense revisions", async t => {
  const r = await fixture(); t.after(r.close);
  r.put("bd_assortment_v1", { menuItems: [], recipes: [], nomenclature: [], stockBalances: [{ id: "balance", productKey: "product", venueId: r.venueId, name: "Return stock", unit: "pcs", current: 5, averageUnitCost: 10 }] });
  r.put("bd_inventory_returns", []);
  const data = { venueId: r.venueId, date: "2026-10-03", direction: "from_customer" as const, currency: "MDL", items: [{ id: "return-line", productExternalId: "product", productKey: "product", name: "Return stock", quantity: 2, unit: "pcs", amount: 20 }] };
  const envelope = { ...r.envelope("product", "return", data), entityType: "return" } as CanonicalEnvelope;
  const result = await r.write.writeCanonicalDomainEntity({ account: r.account, entityType: "return", internalId: "return", data, envelope });
  assert.equal(result.ok, true); assert.ok(result.acceptedWrite);
  assert.deepEqual(result.acceptedWrite.entities.map(ref => ref.id).sort(), ["bd_assortment_v1", "bd_finance_expenses", "bd_inventory_returns", "bd_stock_movements"]);
  for (const reference of result.acceptedWrite.entities) assert.equal((await r.resolve(reference)).body.outcome, "resolved");
});

test("G18 failed CAS produces no accepted revision/audit; legacy history stays UNKNOWN with no backfill", async t => {
  const r = await fixture(); t.after(r.close);
  const input = { account: r.account, entityType: "supplier", internalId: "conflict", data: { name: "A" }, envelope: r.envelope("supplier", "conflict", { name: "A" }), isUpdate: false } as WriterInput;
  r.beforeNextDomainWrite(() => { r.put("bd_suppliers", [{ id: "B", name: "Concurrent B" }]); });
  const result = await r.write.writeCanonicalDomainEntity(input); assert.equal(result.ok, false); assert.equal(result.acceptedWrite, undefined);
  assert.deepEqual(r.sqlite.prepare("SELECT * FROM audit_log").all(), []);
  r.sqlite.prepare("INSERT INTO integration_sync_runs(id,venue_id,data_account_id,connection_id,trigger,status,data_type) VALUES('legacy-run',?,?,'qa-connection','file','success','supplier')").run(r.venueId, r.accountId);
  r.sqlite.prepare("INSERT INTO integration_sync_items(id,venue_id,data_account_id,connection_id,run_id,entity_type,external_id,internal_id,status,payload_hash,payload_json) VALUES('legacy-item',?,?,'qa-connection','legacy-run','supplier','old','B','success','legacy-hash','{}')").run(r.venueId, r.accountId);
  const before = r.snapshot(), resolved = await r.resolve(r.ref("INTEGRATION_EVENT", "legacy-item")); assert.equal(resolved.body.outcome, "partial"); assert.ok("evidence" in resolved.body); assert.ok(resolved.body.evidence.projection.type === "INTEGRATION_EVENT"); assert.equal(resolved.body.evidence.projection.provenanceState, "UNKNOWN"); assert.deepEqual(resolved.body.evidence.relations, []); assert.deepEqual(r.snapshot(), before);
});

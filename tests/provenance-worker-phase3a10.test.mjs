import test from "node:test";
import assert from "node:assert/strict";
import { nativeWorkerRuntime } from "./helpers/native-worker-runtime.mjs";

test("Phase3A.10 compiled Worker/native D1 authority, exact revisions, integration acceptance and RBAC", { timeout: 120000 }, async t => {
  const r = await nativeWorkerRuntime(); t.after(r.close);
  await r.put("bd_finance_revenue", [{ id: "native-shift", venueId: 1, date: "2026-10-03", revenue: 150, receipts: 3, status: "closed" }]);
  for (const key of ["bd_operational_reports_v1", "bd_sales_events_v1", "bd_sales_documents", "bd_finance_expenses", "bd_payroll_entries", "bd_month_closings", "bd_guest_reviews", "bd_employees", "bd_suppliers", "bd_inventory_snapshots", "bd_stock_movements", "bd_purchase_documents", "bd_sales_batches", "bd_inventory_writeoffs"]) await r.put(key, []);
  await r.put("bd_assortment_v1", { stockBalances: [], menuItems: [], recipes: [], nomenclature: [] });
  const diagnosis = await r.call("/api/ai/diagnosis", "POST", { profile: { currency: "USD" }, finance: { recentDaily: [{ date: "2026-10-03", revenue: 999999 }], monthToDate: { revenue: 999999, result: 999999 } }, employees: { active: 999 } });
  assert.equal(diagnosis.status, 200); const data = (await diagnosis.json()).data;
  const metric = data.metricProvenance.current_period_revenue; assert.equal(metric.value, 150); assert.equal(data.inputAuthority.metrics, "CANONICAL_SERVER");
  const resolve = async (ref, role = "owner") => { const response = await r.call("/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)), "GET", undefined, role); return { response, body: await response.json() }; };
  const bound = await resolve(metric.provenance.evidenceRef); assert.equal(bound.body.outcome, "resolved");
  const source = bound.body.evidence.relations.find(row => row.reference.id === "bd_finance_revenue").reference;
  assert.equal((await resolve(source)).body.outcome, "resolved"); assert.equal((await resolve(metric.provenance.evidenceRef, "manager")).body.outcome, "restricted");
  await r.put("bd_finance_revenue", [{ id: "native-shift", venueId: 1, date: "2026-10-03", revenue: 175, receipts: 3, status: "closed" }]);
  assert.equal((await resolve(metric.provenance.evidenceRef)).body.outcome, "changed");
  const form = new FormData(); form.append("externalSystem", "Native isolated provenance"); form.append("entityType", "supplier");
  form.append("file", new File([JSON.stringify({ entityType: "supplier", records: [{ externalId: "native-supplier", name: "Native accepted supplier" }] })], "supplier.json", { type: "application/json" }));
  const headers = r.headers("owner"); delete headers["Content-Type"];
  // Serialize with Node's fetch implementation before crossing Miniflare's
  // separate fetch realm; a foreign FormData instance is not a request body.
  const upload = new Request("http://localhost/api/integration-hub/import", { method: "POST", headers, body: form });
  const imported = await r.worker.dispatchFetch(upload.url, { method: "POST", headers: Object.fromEntries(upload.headers), body: new Uint8Array(await upload.arrayBuffer()) });
  const importBody = await imported.json(); assert.equal(imported.status, 201, JSON.stringify(importBody)); assert.equal(importBody.run.status, "success");
  const item = await r.db.prepare("SELECT id FROM integration_sync_items WHERE run_id=?").bind(importBody.run.runId).first(); assert.ok(item);
  const event = await resolve({ contractVersion: 1, kind: "INTEGRATION_EVENT", id: item.id, venueId: 1, workspaceId: 1 });
  assert.equal(event.body.outcome, "resolved"); assert.equal(event.body.evidence.projection.provenanceState, "ACCEPTED_REVISION_BOUND");
  for (const relation of event.body.evidence.relations) assert.equal((await resolve(relation.reference)).body.outcome, "resolved");
  assert.equal(r.outbound(), 0);
});

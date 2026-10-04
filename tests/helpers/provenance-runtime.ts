import assert from "node:assert/strict";
import { lifecycleRuntime } from "./lifecycle-runtime";
import { VENUE_CONTEXT_SOURCES } from "../../lib/bardoctor/venue-context-access";
import type { EvidenceReference, EvidenceResolution } from "../../lib/bardoctor/evidence-contracts";
import type { CanonicalEnvelope } from "../../lib/bardoctor/integrations/contracts";

export async function provenanceFixture() {
  const r = await lifecycleRuntime({ context: "./lib/bardoctor/venue-ai-context", metrics: "./lib/bardoctor/recommendation-outcomes", evidence: "./app/api/evidence/resolve/route", health: "./app/api/business-health/route", integration: "./lib/bardoctor/integrations/domain-writer", sync: "./lib/bardoctor/integrations/sync-engine", writer: "./app/api/integration-hub/business-writer", doctor: "./lib/bardoctor/ai-handlers", external: "./lib/bardoctor/diagnosis-context", hub: "./app/api/integration-hub/route" }, { now: "2026-10-04T12:00:00Z" });
  const owner = await r.register("provenance-owner@isolated.test"), foreign = await r.register("provenance-foreign@isolated.test");
  const venueId = owner.activeVenueId, workspaceId = Number(r.sqlite.prepare("SELECT workspace_id FROM venues WHERE id=?").get(venueId)!.workspace_id), accountId = owner.userId;
  const put = (key: string, data: unknown) => r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,'2026-10-04T12:00:00Z') ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(accountId, key, JSON.stringify(data));
  for (const key of new Set(Object.values(VENUE_CONTEXT_SOURCES).flat())) put(key, key === "bd_assortment_v1" ? { menuItems: [], recipes: [], stockBalances: [], nomenclature: [] } : []);
  put("bd_finance_revenue", [{ id: "shift-a", venueId, date: "2026-10-03", revenue: 100, receipts: 2, status: "closed" }, { id: "shift-b", venueId, date: "2026-10-03", revenue: 50, receipts: 1, status: "closed" }]);
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Isolated provenance", currency: "MDL", timezone: "UTC" }), accountId);
  const account = await r.api.auth.authenticateRequest(r.request(owner, "/api/business-health")); assert.ok(account);
  const context = r.api.context as unknown as typeof import("../../lib/bardoctor/venue-ai-context");
  const metrics = r.api.metrics as unknown as typeof import("../../lib/bardoctor/recommendation-outcomes");
  const write = r.api.integration as unknown as typeof import("../../lib/bardoctor/integrations/domain-writer");
  const sync = r.api.sync as unknown as typeof import("../../lib/bardoctor/integrations/sync-engine");
  const writer = r.api.writer as unknown as typeof import("../../app/api/integration-hub/business-writer");
  const snapshot = () => {
    const schema = r.sqlite.prepare("SELECT * FROM sqlite_schema ORDER BY type,name").all();
    const tables = schema.filter(row => row.type === "table").map(row => {
      const name = String(row.name).replaceAll('"', '""');
      return { name, rows: r.sqlite.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all() };
    });
    return { schema, databaseBytes: JSON.stringify(tables), objects: [...r.objects.entries()], changes: r.sqlite.prepare("SELECT total_changes() AS count").get() };
  };
  const ref = (kind: EvidenceReference["kind"], id: string, more = {}) => ({ contractVersion: 1, kind, id, venueId, workspaceId, ...more }) as EvidenceReference;
  const resolve = async (reference: unknown, user = owner, selectedVenue?: number) => {
    const before = snapshot(); const request = r.request(user, "/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(reference))); if (selectedVenue) request.headers.set("X-Venue-Id", String(selectedVenue)); const response = await r.api.evidence.GET(request);
    assert.deepEqual(snapshot(), before, "all evidence paths must be read-only"); return { status: response.status, body: await response.json() as EvidenceResolution };
  };
  const envelope = (type: "supplier" | "product", id: string, data: object) => ({ venueId, entityType: type, data, externalId: id, externalSystem: "Isolated QA", sourceType: "file_import", sourcePriority: 10, importedAt: "2026-10-04T12:00:00Z", operation: "upsert", syncStatus: "pending" }) as CanonicalEnvelope;
  r.sqlite.prepare("INSERT INTO integration_connections(id,venue_id,data_account_id,provider,adapter_key,display_name,channel,status,sync_enabled,capabilities_json,config_json,created_by_account_id) VALUES('qa-connection',?,?,'file','universal-file-v1','Isolated provenance','file','connected',1,?,?,?)").run(venueId, accountId, JSON.stringify(["supplier", "product"]), JSON.stringify({ enabledEntities: ["supplier", "product"] }), accountId);
  return { ...r, owner, foreign, account, venueId, workspaceId, accountId, put, context, metrics, write, sync, writer, snapshot, ref, resolve, envelope };
}

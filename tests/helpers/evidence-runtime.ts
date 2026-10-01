import assert from "node:assert/strict";
import { lifecycleRuntime } from "./lifecycle-runtime";
import { salesEventFixture, saleCommand } from "./sales-event-fixture";
import { defaultNomenclatureStructure } from "../../lib/bardoctor/nomenclature";
import type { EvidenceReference, EvidenceResourceKind, EvidenceResolution } from "../../lib/bardoctor/evidence-contracts";
import type { SalesEvent } from "../../lib/bardoctor/sales-events";
import type { MenuDraft } from "../../lib/bardoctor/menu-ingestion";

/** Real session/auth, canonical writes, and resolver against isolated transactional SQLite. */
export async function evidenceRuntime(options: { now?: string } = {}) {
  const r = await lifecycleRuntime({ evidence: "./app/api/evidence/resolve/route", daily: "./app/api/evidence/facts/daily-revenue/route",
    days: "./app/api/operational-days/route", sales: "./app/api/sales-events/route", ingestion: "./app/api/menu/ingestion/route" }, options);
  const owner = await r.register("evidence-owner@isolated.test");
  const foreign = await r.register("evidence-foreign@isolated.test");
  const member = await r.register("evidence-member@isolated.test");
  const venueId = owner.activeVenueId;
  const workspaceId = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(venueId)!.id);
  const put = (key: string, value: unknown, accountId = owner.userId) => r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(accountId, key, JSON.stringify(value), "2026-10-01T12:00:00.000Z");
  const get = (key: string, accountId = owner.userId): unknown => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(accountId, key)?.data_json ?? "null"));
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Evidence QA", currency: "MDL", timezone: "Europe/Chisinau" }), owner.userId);
  const assortment = JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1', '"venueId":' + venueId));
  assortment.nomenclatureStructure = defaultNomenclatureStructure();
  put("bd_assortment_v1", assortment);
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId, member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(venueId, member.userId);
  const permissions = (role: string, deny: string[] = [], allow: string[] = []) => r.sqlite.prepare("UPDATE venue_memberships SET role=?,permissions_json=?,status='active' WHERE venue_id=? AND account_id=?").run(role, JSON.stringify({ deny, allow }), venueId, member.userId);
  const command = async (api: "sales" | "ingestion", body: object) => {
    const request = r.request(owner, api === "sales" ? "/api/sales-events" : "/api/menu/ingestion", "POST", { venueId, ...body });
    request.headers.set("X-Venue-Id", String(venueId));
    const response = await r.api[api].POST(request);
    assert.ok(response.ok, JSON.stringify(await response.clone().json()));
    return response.json();
  };
  await command("sales", { action: "open_shift", shiftId: "evidence-shift", name: "Evidence shift" });
  const sale = { ...saleCommand("beer", 1), id: "evidence-sale", shiftId: "evidence-shift" };
  const preview = await command("sales", { action: "preview", command: sale }) as { previewHash: string };
  const posted = await command("sales", { action: "post", command: sale, previewHash: preview.previewHash }) as { event: SalesEvent };
  const created = await command("ingestion", { action: "create", source: "MANUAL", draftId: "draft:evidence-123", items: [{ name: "New menu service", salePrice: 12, currency: "MDL", sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE", type: "service", active: true }] }) as { draft: MenuDraft };
  const reference = (kind: EvidenceResourceKind, id: string, more: object = {}) => ({ contractVersion: 1, kind, id, venueId, workspaceId, ...more } as EvidenceReference);
  const resolve = async (ref: unknown, user = owner, query = "", selectedVenue = venueId) => {
    const before = snapshot();
    const request = r.request(user, "/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)) + query);
    request.headers.set("X-Venue-Id", String(selectedVenue));
    const response = await r.api.evidence.GET(request);
    assert.deepEqual(snapshot(), before, "Evidence requests must preserve canonical bytes, timestamps, audit and files, including failure paths");
    return { response, body: await response.json() as EvidenceResolution & { ok?: boolean } };
  };
  const snapshot = () => ({ domain: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all(), audit: r.sqlite.prepare("SELECT * FROM audit_log ORDER BY id").all(),
    objects: [...r.objects.entries()] });
  return { ...r, owner, foreign, member, venueId, workspaceId, put, get, permissions, command, reference, resolve, snapshot, event: posted.event, draft: created.draft };
}

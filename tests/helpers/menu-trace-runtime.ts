import assert from "node:assert/strict";
import { menuImportRuntime } from "./menu-import-runtime";
import type { MenuImportDraft } from "../../lib/bardoctor/catalog";
import type { MenuDraft } from "../../lib/bardoctor/menu-ingestion";
import type { EvidenceReference, EvidenceResourceKind, EvidenceResolution, MenuOriginResolution } from "../../lib/bardoctor/evidence-contracts";

export async function menuTraceRuntime(options: { recognition?: () => unknown } = {}) {
  const r = await menuImportRuntime({ ingestion: "./app/api/menu/ingestion/route", evidence: "./app/api/evidence/resolve/route", origin: "./app/api/evidence/facts/menu-origin/route" }, options);
  const owner = await r.register("menu-origin-owner@isolated.test"), foreign = await r.register("menu-origin-foreign@isolated.test"), member = await r.register("menu-origin-member@isolated.test");
  const venueId = owner.activeVenueId, workspaceId = Number(r.sqlite.prepare("SELECT workspace_id id FROM venues WHERE id=?").get(venueId)!.id);
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({ name: "Menu origin QA", currency: "MDL", timezone: "Europe/Chisinau" }), owner.userId);
  r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role) VALUES (?,?,'member')").run(workspaceId, member.userId);
  r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role) VALUES (?,?,'manager')").run(venueId, member.userId);
  const permissions = (deny: string[] = []) => r.sqlite.prepare("UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?").run(JSON.stringify({ deny }), venueId, member.userId);
  const get = (key = "bd_assortment_v1", accountId = owner.userId): Record<string, unknown> => JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?").get(accountId, key)?.data_json ?? "null"));
  const put = (key: string, data: unknown, accountId = owner.userId) => r.sqlite.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").run(accountId, key, JSON.stringify(data), new Date().toISOString());
  const snapshot = () => ({ domain: r.sqlite.prepare("SELECT * FROM domain_data ORDER BY account_id,store_key").all(), audit: r.sqlite.prepare("SELECT * FROM audit_log ORDER BY id").all(), uploads: [...r.uploads].map(([id, bytes]) => [id, Buffer.from(bytes).toString("hex")]), metadata: [...r.uploadMetadata].map(([id, head]) => [id, structuredClone(head)]) });
  const request = (user: typeof owner, path: string, method = "GET", body?: unknown, selectedVenue = venueId) => { const req = r.request(user, path, method, body); req.headers.set("X-Venue-Id", String(selectedVenue)); return req; };
  const send = async (body: object) => { const response = await r.api.ingestion.POST(request(owner, "/api/menu/ingestion", "POST", { venueId, ...body })); return { status: response.status, body: await response.json() as { draft: MenuDraft; preview: { diff: { status: string }[] }; code?: string; idempotent?: boolean } }; };
  const command = async (body: object) => { const result = await send(body); assert.ok(result.status < 300, JSON.stringify(result)); return result.body; };
  const create = async (id: string, items: unknown[], source = "MANUAL", provenance?: unknown) => (await command({ action: "create", draftId: id, items, source, provenance })).draft;
  const review = async (draft: MenuDraft, patch: Record<string, unknown> = {}) => (await command({ action: "update", draftId: draft.id, revision: draft.revision, rows: draft.rows.map(l => ({ ...l, decision: "apply", reviewed: true, item: { ...l.item, ...patch } })) })).draft;
  const confirm = async (draft: MenuDraft) => {
    const validated = (await command({ action: "validate", draftId: draft.id, revision: draft.revision })).draft;
    const input = { action: "confirm", draftId: validated.id, revision: validated.revision, validationHash: validated.validationHash };
    return { draft: (await command(input)).draft, input };
  };
  const reference = (kind: EvidenceResourceKind, id: string, partId?: string) => ({ contractVersion: 1, kind, id, venueId, workspaceId, ...(partId ? { partId } : {}) }) as EvidenceReference;
  const resolve = async (ref: unknown, user = owner, query = "", selectedVenue = venueId) => {
    const before = snapshot(), response = await r.api.evidence.GET(request(user, "/api/evidence/resolve?ref=" + encodeURIComponent(JSON.stringify(ref)) + query, "GET", undefined, selectedVenue));
    assert.deepEqual(snapshot(), before, "resolver must preserve canonical contents/timestamps/audit/R2"); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    return { status: response.status, body: await response.json() as EvidenceResolution };
  };
  const origin = async (id: string, user = owner, query = "", selectedVenue = venueId) => {
    const before = snapshot(), response = await r.api.origin.GET(request(user, "/api/evidence/facts/menu-origin?menuItemId=" + encodeURIComponent(id) + query, "GET", undefined, selectedVenue));
    assert.deepEqual(snapshot(), before, "fact must preserve canonical contents/timestamps/audit/R2"); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    return { status: response.status, body: await response.json() as MenuOriginResolution };
  };
  const upload = async (bytes: Uint8Array, name: string, mime: string, user = owner) => {
    const form = new FormData(); form.append("file", new File([new Uint8Array(bytes)], name, { type: mime }));
    const response = await r.api.catalogImport.POST(new Request("https://isolated.test/api/catalog/import", { method: "POST", headers: { "X-Session-Email": user.email, "X-Session-Token": user.token, "X-Venue-Id": String(user.activeVenueId) }, body: form }));
    const body = await response.json() as { draft: MenuImportDraft }; assert.equal(response.status, 200, JSON.stringify(body)); assert.ok(body.draft.sourceFileIds?.length, "actual upload retains source file IDs"); return { ...body.draft, sourceFileIds: body.draft.sourceFileIds };
  };
  return { ...r, owner, foreign, member, venueId, workspaceId, permissions, get, put, snapshot, request, send, command, create, review, confirm, reference, resolve, origin, upload };
}
export const service = (name: string, extra: object = {}) => ({ name, salePrice: 15, currency: "MDL", sectionId: "bar", taxonomyCategoryId: "alcohol", consumptionMode: "NONE", type: "service", active: true, ...extra });
export function menuFact(result: MenuOriginResolution) { assert.ok("fact" in result, JSON.stringify(result)); return result.fact; }
export function menuEvidence(result: EvidenceResolution) { assert.ok("evidence" in result, JSON.stringify(result)); return result.evidence; }

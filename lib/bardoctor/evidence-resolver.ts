import { canReadPosSaleHistory } from "./pos-orders";
import { resolveProvenanceEvidence } from "./provenance-evidence";
import { isStockEvidenceKind, resolveStockEvidence } from "./stock-evidence";
import { isMenuEvidenceKind, resolveMenuEvidence, readMenuOrigin, menuTraceRelations } from "./menu-evidence";
import { isCostEvidenceKind, readSaleCost, resolveCostEvidence } from "./cost-evidence";
import { getD1 } from "../../db";
import { authenticateReadOnlyRequest } from "./auth";
import { hasPermission, isAccessRole, permissionPayload, type AuthenticatedAccount, type PermissionKey } from "./access-control";
import { readStoreSnapshots, type StoreSnapshot } from "./store-cas";
import { readDailyRevenue, validBusinessDate } from "./daily-revenue";
import { operationalDay } from "./operational-day";
import { revenueEvidenceRevision } from "./revenue-evidence";
import {
  evidenceContentRevision, MAX_EVIDENCE_REFERENCES, MAX_EVIDENCE_OFFSET, parseEvidenceReference,
  type EvidenceDiagnostic, type EvidenceProjection, type EvidenceReference, type EvidenceRelation,
  type EvidenceResolution, type EvidenceResourceKind, type EvidenceScope, type Finality,
  type MenuSourceType, type RevenueSourceType,
} from "./evidence-contracts";

type Row = Record<string, unknown>;
type Context = EvidenceScope & { account: AuthenticatedAccount };
type Adapter = { key: string; permission: PermissionKey; strictVenue: boolean };
/** Closed registry. Reserved contract kinds have no adapter and cannot select a store. */
const adapters = {
  SALE_EVENT: { key: "bd_sales_events_v1", permission: "sales.view", strictVenue: true },
  CASH_SHIFT: { key: "bd_finance_revenue", permission: "shifts.view", strictVenue: false },
  FINANCE_REVENUE: { key: "bd_finance_revenue", permission: "shifts.view", strictVenue: false },
  MENU_ITEM: { key: "bd_assortment_v1", permission: "inventory.view", strictVenue: false },
  MENU_INGESTION_DRAFT: { key: "bd_menu_ingestion_v1", permission: "inventory.manage", strictVenue: true },
} satisfies Partial<Record<EvidenceResourceKind, Adapter>>;
type SupportedKind = keyof typeof adapters;
const object = (v: unknown): Row | null => v && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const rows = (v: unknown): Row[] => Array.isArray(v) ? v.map(object).filter((r): r is Row => r !== null) : [];
const number = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const text = (v: unknown): string | null => typeof v === "string" && v.length <= 240 ? v : null;
const date = (v: unknown): string | null => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v ? v : null;
const instant = (v: unknown): string | null => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
function belongs(row: Row, scope: EvidenceScope, strictVenue: boolean) {
  return (row.venueId === scope.venueId || !strictVenue && row.venueId == null)
    && (row.workspaceId == null || row.workspaceId === scope.workspaceId);
}
function nativeRevenueSource(v: unknown): RevenueSourceType {
  return ["POS_API", "MANUAL_GRID"].includes(String(v)) ? "BARDOC_POS"
    : ["TEXT_IMPORT", "FILE_IMPORT", "IMAGE_IMPORT", "VOICE_IMPORT"].includes(String(v)) ? "IMPORT"
    : ["ONE_C", "LOCAL_CONNECTOR", "OTHER_API"].includes(String(v)) ? "INTEGRATION" : "LEGACY_UNKNOWN";
}
const menuSource = (v: unknown): MenuSourceType => ["MANUAL", "SCAN", "IMPORT"].includes(String(v)) ? v as MenuSourceType : "LEGACY_UNKNOWN";

/** Reuse session authentication once; add SELECT-only validation of its selected tenant. */
export async function authenticatedEvidenceContext(request: Request): Promise<Context | null> {
  const account = await authenticateReadOnlyRequest(request);
  if (!account) return null;
  const boundary = await getD1().prepare(`
    SELECT v.workspace_id, vm.role, vm.permissions_json FROM venues v
    JOIN workspaces w ON w.id=v.workspace_id AND w.status='active'
    JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active'
    JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active'
    WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?
  `).bind(account.actorAccountId, account.venueId, account.id, account.membershipId)
    .first<{ workspace_id: number; role: string; permissions_json: string | null }>();
  if (!boundary || !Number.isSafeInteger(boundary.workspace_id) || !isAccessRole(boundary.role)) return null;
  return { venueId: account.venueId, workspaceId: boundary.workspace_id,
    account: { ...account, ...permissionPayload(boundary.role, boundary.permissions_json) } };
}

function result(outcome: "unavailable" | "restricted" | "changed" | "unsupported", asOf: string, diagnostics: EvidenceDiagnostic[] = []): EvidenceResolution {
  const base = { contractVersion: 1 as const, asOf, diagnostics };
  switch (outcome) {
    case "restricted": return { ...base, outcome, code: "ACCESS_DENIED" };
    case "changed": return { ...base, outcome, code: "READ_MODEL_CHANGED" };
    case "unsupported": return { ...base, outcome, code: "UNSUPPORTED_REFERENCE_KIND" };
    case "unavailable": return { ...base, outcome, code: "EVIDENCE_UNAVAILABLE" };
  }
}

type Loaded = { snapshot: StoreSnapshot; records: Row[] };
function loadedStores(snapshots: StoreSnapshot[]): Map<string, Loaded> {
  return new Map(snapshots.map(snapshot => {
    const value: unknown = JSON.parse(snapshot.dataJson ?? "null");
    const container = snapshot.key === "bd_assortment_v1" ? object(value)?.menuItems : value;
    if (value !== null && (!Array.isArray(container) || container.some(v => !object(v)))) throw new Error("EVIDENCE_STORE_NEEDS_REVIEW");
    return [snapshot.key, { snapshot, records: rows(container) }];
  }));
}
function uniqueRecord(stores: Map<string, Loaded>, kind: SupportedKind, id: string, scope: EvidenceScope): Row | null {
  const adapter = adapters[kind];
  const matches = (stores.get(adapter.key)?.records ?? []).filter(r => r.id === id && belongs(r, scope, adapter.strictVenue));
  if (matches.length !== 1) return null;
  if (kind === "CASH_SHIFT" && !["open", "closed"].includes(String(matches[0].closingStatus))) return null;
  return matches[0];
}
function resourceRevision(stores: Map<string, Loaded>, reference: EvidenceReference, parent: Row, scope: EvidenceScope) {
  // Revenue-row source classification depends on these canonical events too.
  // Bind that input set, so changing it cannot silently prove an older read model.
  const finance = reference.kind === "CASH_SHIFT" || reference.kind === "FINANCE_REVENUE";
  return finance ? revenueEvidenceRevision(reference, parent, stores.get(adapters.SALE_EVENT.key)?.records ?? null, scope,
    stores.get("bd_sales_documents")?.records ?? []) : evidenceContentRevision(reference, parent);
}
function saleChild(parent: Row, partId: string, scope: EvidenceScope): Row | null {
  const batch = object(parent.batch);
  if (!batch || batch.id !== parent.id || !belongs(batch, scope, true)) return null;
  const prices = rows(parent.prices).filter(p => p.lineId === partId && belongs(p, scope, false));
  const lines = rows(batch.lines).filter(l => l.id === partId && l.salesBatchId === parent.id && belongs(l, scope, false));
  return prices.length === 1 && lines.length === 1 && prices[0].menuItemId === lines[0].menuItemId ? prices[0] : null;
}
function draftChild(parent: Row, partId: string, scope: EvidenceScope): Row | null {
  const lines = rows(parent.rows).filter(l => l.id === partId && belongs(l, scope, false));
  if (lines.length !== 1) return null;
  const item = object(lines[0].item);
  // A draft line is scoped by its actual parent; explicit item ownership must agree too.
  return item && belongs(item, scope, false) ? lines[0] : null;
}

/** Trusted-context core; the public API only obtains context through authentication. */
async function resolveInContext(context: Context, reference: EvidenceReference, limit: number, offset: number, asOf: string): Promise<EvidenceResolution> {
  if (reference.venueId !== context.venueId || reference.workspaceId !== context.workspaceId) return result("unavailable", asOf);
  if (["CANONICAL_SOURCE", "AI_METRIC", "INTEGRATION_EVENT"].includes(reference.kind)) return resolveProvenanceEvidence(context, reference, limit, offset, asOf);
  if (isMenuEvidenceKind(reference.kind)) return resolveMenuEvidence(context, reference, limit, offset, asOf);
  if (isStockEvidenceKind(reference.kind)) return resolveStockEvidence(context, reference, limit, offset, asOf);
  if (isCostEvidenceKind(reference.kind)) return resolveCostEvidence(context, reference, limit, offset, asOf);
  if (reference.kind === "DAILY_REVENUE") {
    const resolution = await readDailyRevenue(context, reference, limit, offset, asOf);
    if (!("fact" in resolution)) return resolution;
    const { fact, binding, page } = resolution;
    const boundReference = fact.traceTarget!.reference as EvidenceReference & { expectedRevision: typeof fact.revision };
    return { contractVersion: 1, asOf, outcome: resolution.outcome, code: resolution.code, diagnostics: [...fact.diagnostics], evidence: {
      reference: boundReference, revision: fact.revision, binding,
      projection: { type: "DAILY_REVENUE", businessDate: fact.businessDate, revenue: fact.value, currency: fact.currency, sourceType: fact.sourceType },
      finality: fact.finality, availability: fact.availability === "AVAILABLE" ? "AVAILABLE" : "PARTIAL", evidenceStatus: "PARTIAL",
      observedAt: fact.observedAt ?? null, updatedAt: fact.updatedAt ?? null, freshness: fact.freshness,
      relations: fact.evidenceRefs.map(ref => ({ type: "derived_from", reference: ref })), page, traceTarget: fact.traceTarget!,
    } };
  }
  if (!Object.hasOwn(adapters, reference.kind)) return result("unsupported", asOf);
  const kind = reference.kind as SupportedKind, adapter = adapters[kind];
  if (!hasPermission(context.account, adapter.permission)) return result("restricted", asOf);

  const keys = [adapter.key];
  if (kind === "SALE_EVENT" && hasPermission(context.account, "shifts.view")) keys.push(adapters.FINANCE_REVENUE.key);
  if (["CASH_SHIFT", "FINANCE_REVENUE"].includes(kind) && hasPermission(context.account, "sales.view")) keys.push(adapters.SALE_EVENT.key);
  if (["CASH_SHIFT", "FINANCE_REVENUE"].includes(kind)) keys.push("bd_sales_documents");
  if (kind === "MENU_INGESTION_DRAFT" && hasPermission(context.account, "inventory.view")) keys.push(adapters.MENU_ITEM.key);
  let stores: Map<string, Loaded>;
  try { stores = loadedStores(await readStoreSnapshots(getD1(), context.account.id, keys)); }
  catch (error) {
    if (error instanceof SyntaxError || error instanceof Error && error.message === "EVIDENCE_STORE_NEEDS_REVIEW") return result("unavailable", asOf, ["RECORD_NEEDS_REVIEW"]);
    throw error;
  }
  const parent = uniqueRecord(stores, kind, reference.id, context);
  if (!parent) return result("unavailable", asOf);
  if (kind === "SALE_EVENT" && !canReadPosSaleHistory({ accountId:context.account.actorAccountId, name:"", role:context.account.role }, parent)) return result("unavailable", asOf);
  const child = reference.partId === undefined ? null : kind === "SALE_EVENT"
    ? saleChild(parent, reference.partId, context) : kind === "MENU_INGESTION_DRAFT" ? draftChild(parent, reference.partId, context) : null;
  if (reference.partId !== undefined && !child) return result("unavailable", asOf);
  const revision = await resourceRevision(stores, reference, parent, context);
  if (reference.expectedRevision !== undefined && reference.expectedRevision !== revision) return result("changed", asOf, ["NO_HISTORICAL_SNAPSHOT"]);

  const diagnostics: EvidenceDiagnostic[] = ["PARTIAL_EVIDENCE", "FRESHNESS_POLICY_UNDEFINED"];
  let partial = false;
  const unavailableRelation = () => { partial = true; diagnostics.push("RELATED_EVIDENCE_UNAVAILABLE"); };
  const relations: EvidenceRelation[] = [];
  const addRelation = async (type: EvidenceRelation["type"], targetKind: SupportedKind, id: unknown) => {
    // No inaccessible relation ID, revision, count or target DTO is emitted.
    if (!hasPermission(context.account, adapters[targetKind].permission)) {
      diagnostics.push("RELATIONS_RESTRICTED"); partial = true; return;
    }
    if (typeof id !== "string" || id.length === 0 || id.length > 200) { unavailableRelation(); return; }
    const target = uniqueRecord(stores, targetKind, id, context);
    if (!target) { unavailableRelation(); return; }
    const ref = { contractVersion: 1, kind: targetKind, id, venueId: context.venueId, workspaceId: context.workspaceId } as EvidenceReference;
    if (!parseEvidenceReference(ref).ok) { unavailableRelation(); return; }
    relations.push({ type, reference: ref });
  };
  let projection: EvidenceProjection, finality: Finality = "UNKNOWN";
  if (kind === "SALE_EVENT") {
    const lifecycle = ["POSTED", "REVERSED"].includes(String(parent.status)) ? parent.status as "POSTED" | "REVERSED" : null;
    if (!lifecycle) partial = true;
    // Event lifecycle is distinct from the eventual daily-revenue finality.
    projection = child ? { type: "SALE_LINE", menuItemId: text(child.menuItemId), quantity: number(child.quantity), unitPrice: number(child.unitPrice), total: number(child.total), currency: text(parent.currency) }
      : { type: "SALE_EVENT", businessDate: date(parent.businessDate), revenue: number(parent.revenue), currency: text(parent.currency), lifecycle, sourceType: nativeRevenueSource(parent.source) };
    if (child) await addRelation("belongs_to", "SALE_EVENT", parent.id);
    else await addRelation("belongs_to", "FINANCE_REVENUE", parent.revenueRowId);
    const costRef: EvidenceReference = { contractVersion: 1, kind: "CAPTURED_COST", id: reference.id, venueId: context.venueId, workspaceId: context.workspaceId, ...(reference.partId ? { partId: reference.partId } : {}) };
    const cost = await resolveCostEvidence(context, costRef, 1, 0, asOf);
    if ("evidence" in cost) relations.push({ type: "derived_from", reference: cost.evidence.reference });
    else unavailableRelation();
  } else if (kind === "CASH_SHIFT" || kind === "FINANCE_REVENUE") {
    const sourceEvents = (stores.get(adapters.SALE_EVENT.key)?.records ?? []).filter(e => belongs(e, context, true)
      && e.revenueRowId === parent.id && e.businessDate === parent.date);
    const events = sourceEvents.filter(e => ["POSTED", "REVERSED"].includes(String(e.status)));
    const families = new Set(events.map(e => nativeRevenueSource(e.source)));
    let sourceType: RevenueSourceType = "LEGACY_UNKNOWN";
    if (parent.revenueSource === "sales_events_v1") {
      if (!hasPermission(context.account, "sales.view")) { diagnostics.push("RELATIONS_RESTRICTED"); partial = true; }
      else {
        sourceType = families.size === 1 ? [...families][0] : families.size === 0 && number(parent.revenue) === 0 && kind === "CASH_SHIFT" ? "BARDOC_POS" : "LEGACY_UNKNOWN";
        for (const e of events.filter(e => e.status === "POSTED")) await addRelation("derived_from", "SALE_EVENT", e.id);
        if (!events.length && number(parent.revenue) !== 0) unavailableRelation();
      }
    } else if (parent.revenueSource === "MANUAL_SUMMARY" || ["guided-v17", "canonical-writeoff-v272"].includes(String(parent.closedVia))) sourceType = "MANUAL_SUMMARY";
    if (validBusinessDate(parent.date) && (parent.revenueSource !== "sales_events_v1" || hasPermission(context.account, "sales.view"))) {
      const day = operationalDay({ venueId: context.venueId, businessDate: parent.date, asOf, revenues: [parent], events: sourceEvents,
        // Only document-backed rows depend on the document basis bound above.
        documents: parent.revenueSource === "sales_documents"
          ? (stores.get("bd_sales_documents")?.records ?? []).filter(d => belongs(d, context, false)) : [] });
      sourceType = day.revenue.source;
      finality = day.revenue.status;
      if (day.revenue.consistency === "MISMATCH") { diagnostics.push("REVENUE_READ_MODEL_MISMATCH"); partial = true; }
    }
    const lifecycle = parent.closingStatus === "open" ? "OPEN" : parent.closingStatus === "closed" ? "CLOSED" : null;
    if (lifecycle === "OPEN") finality = "PROVISIONAL";
    else if (sourceType === "MANUAL_SUMMARY") finality = "FINAL";
    if (kind === "FINANCE_REVENUE" && sourceType === "BARDOC_POS" && lifecycle !== null) await addRelation("derived_from", "CASH_SHIFT", parent.id);
    projection = { type: kind, businessDate: date(parent.date), revenue: number(parent.revenue), currency: text(parent.currency), receipts: number(parent.receipts), lifecycle, sourceType };
  } else if (kind === "MENU_ITEM") {
    projection = { type: "MENU_ITEM", name: text(parent.name), salePrice: number(parent.salePrice), currency: text(parent.currency), active: typeof parent.active === "boolean" ? parent.active : null, sourceType: menuSource(parent.source) };
    // Current menu contents alone do not prove their import/manual history.
  } else {
    const lifecycle = ["DRAFT", "VALIDATED", "CONFIRMED", "CANCELLED"].includes(String(parent.status))
      ? parent.status as "DRAFT" | "VALIDATED" | "CONFIRMED" | "CANCELLED" : null;
    projection = child ? { type: "MENU_INGESTION_LINE", decision: ["pending", "apply", "skip"].includes(String(child.decision)) ? child.decision as "pending" | "apply" | "skip" : null, reviewed: typeof child.reviewed === "boolean" ? child.reviewed : null }
      : { type: "MENU_INGESTION_DRAFT", lifecycle, sourceType: menuSource(parent.source), revisionNumber: number(parent.revision), rowCount: Array.isArray(parent.rows) ? parent.rows.length : null };
    if (!lifecycle || !Array.isArray(parent.rows)) partial = true;
    if (child) await addRelation("belongs_to", "MENU_INGESTION_DRAFT", parent.id);
    else if (lifecycle === "CONFIRMED") {
      // These IDs confirm participation in an operation, not origin of current values.
      if (!Array.isArray(parent.resultIds)) unavailableRelation();
      else for (const id of [...new Set(parent.resultIds)]) await addRelation("confirmed_for", "MENU_ITEM", id);
    }
    if (parent.source !== "MANUAL" && !rows([parent.provenance])[0]?.sourceFileIds) diagnostics.push("SOURCE_METADATA_MISSING");
  }
  if (kind === "MENU_ITEM") {
    if (hasPermission(context.account, "inventory.manage")) {
      const trace = await menuTraceRelations(context, reference); relations.push(...trace);
      if (!trace.length) unavailableRelation();
    }
    else { diagnostics.push("RELATIONS_RESTRICTED"); partial = true; }
  }
  if ("sourceType" in projection && projection.sourceType === "LEGACY_UNKNOWN") { diagnostics.push("SOURCE_UNKNOWN"); partial = true; }
  if (Object.values(projection).some(v => v === null)) { diagnostics.push("RECORD_NEEDS_REVIEW"); partial = true; }

  const observedAt = instant(parent.acceptedAt) ?? instant(parent.confirmedAt) ?? instant(parent.createdAt);
  const updatedAt = instant(parent.updatedAt) ?? instant(parent.reversedAt);
  const recordTime = updatedAt ?? observedAt;
  const storeTime = instant(stores.get(adapter.key)?.snapshot.updatedAt);
  const nextOffset = offset + limit < relations.length ? offset + limit : null;
  if (nextOffset !== null || offset > 0) diagnostics.push("RELATIONS_PAGINATED");
  // Only hash the bounded page. Larger canonical collections do not expand the DTO.
  const pageRelations = await Promise.all(relations.slice(offset, offset + limit).map(async relation => ({
    ...relation, reference: relation.reference.expectedRevision ? relation.reference : { ...relation.reference, expectedRevision: await resourceRevision(stores,
      relation.reference, uniqueRecord(stores, relation.reference.kind as SupportedKind, relation.reference.id, context)!, context) },
  })));
  const boundReference = { ...reference, expectedRevision: revision };
  const evidence = { reference: boundReference, revision,
    binding: reference.expectedRevision ? "EXPECTED_REVISION" as const : "CURRENT_RECORD" as const,
    projection, finality, availability: partial ? "PARTIAL" as const : "AVAILABLE" as const,
    evidenceStatus: "PARTIAL" as const, observedAt, updatedAt,
    freshness: { basis: recordTime ? "RECORD" as const : storeTime ? "STORE_FALLBACK" as const : "UNKNOWN" as const, timestamp: recordTime ?? storeTime, assessment: "UNKNOWN" as const },
    relations: pageRelations, page: { limit, offset, nextOffset },
    traceTarget: { type: "EVIDENCE_RESOURCE" as const, reference: boundReference } };
  return { contractVersion: 1, asOf, diagnostics: [...new Set(diagnostics)],
    ...(partial ? { outcome: "partial" as const, code: "PARTIAL_EVIDENCE" as const } : { outcome: "resolved" as const, code: "RESOLVED" as const }), evidence };
}

/** Minimal scalar query; tenant identity comes only from the selected session. */
export async function readDailyRevenueRequest(request: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, X-Session-Token, X-Session-Email, X-Venue-Id" } });
  const context = await authenticatedEvidenceContext(request);
  if (!context) return reply({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => !["businessDate", "expectedRevision"].includes(key) || params.getAll(key).length !== 1)
    || !validBusinessDate(params.get("businessDate"))) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  const reference = { contractVersion: 1, kind: "DAILY_REVENUE", id: params.get("businessDate"), venueId: context.venueId, workspaceId: context.workspaceId,
    ...(params.has("expectedRevision") ? { expectedRevision: params.get("expectedRevision") } : {}) };
  const parsed = parseEvidenceReference(reference);
  if (!parsed.ok) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  return reply(await readDailyRevenue(context, parsed.reference, MAX_EVIDENCE_REFERENCES, 0, new Date().toISOString()));
}

/** One sale/line selector; no client namespace or arbitrary facts engine. */
export async function readSaleCostRequest(request: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, X-Session-Token, X-Session-Email, X-Venue-Id" } });
  const context = await authenticatedEvidenceContext(request);
  if (!context) return reply({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => !["saleId", "lineId", "expectedRevision"].includes(key) || params.getAll(key).length !== 1)) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  const parsed = parseEvidenceReference({ contractVersion: 1, kind: "CAPTURED_COST", id: params.get("saleId"), venueId: context.venueId, workspaceId: context.workspaceId,
    ...(params.has("lineId") ? { partId: params.get("lineId") } : {}), ...(params.has("expectedRevision") ? { expectedRevision: params.get("expectedRevision") } : {}) });
  if (!parsed.ok) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  return reply(await readSaleCost(context, parsed.reference, MAX_EVIDENCE_REFERENCES, 0, new Date().toISOString()));
}

/** The only public resolver entry: no caller-supplied account or namespace. */
export async function resolveEvidenceRequest(request: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, X-Session-Token, X-Session-Email, X-Venue-Id" } });
  const context = await authenticatedEvidenceContext(request);
  if (!context) return reply({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);
  const params = new URL(request.url).searchParams;
  const allowed = ["ref", "limit", "offset"];
  if ([...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1)) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  const raw = params.get("ref");
  if (!raw || raw.length > 2048) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return reply({ ok: false, code: "INVALID_REFERENCE" }, 400); }
  const parsed = parseEvidenceReference(value), asOf = new Date().toISOString();
  if (!parsed.ok) {
    if (parsed.code === "INVALID_REFERENCE") return reply({ ok: false, code: parsed.code }, 400);
    const foreign = parsed.scope.venueId !== context.venueId || parsed.scope.workspaceId !== context.workspaceId;
    return reply(result(foreign ? "unavailable" : "unsupported", asOf));
  }
  const paging = (name: string, fallback: number) => { const v = params.get(name); return v === null ? fallback : /^\d{1,5}$/.test(v) ? Number(v) : NaN; };
  const limit = paging("limit", MAX_EVIDENCE_REFERENCES), offset = paging("offset", 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_EVIDENCE_REFERENCES || !Number.isInteger(offset) || offset < 0 || offset > MAX_EVIDENCE_OFFSET) return reply({ ok: false, code: "INVALID_PAGINATION" }, 400);
  const resolution = await resolveInContext(context, parsed.reference, limit, offset, asOf);
  return reply(resolution);
}

/** One canonical Menu selector. Tenant identity is server-derived. */
export async function readMenuOriginRequest(request: Request): Promise<Response> {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, X-Session-Token, X-Session-Email, X-Venue-Id" } });
  const context = await authenticatedEvidenceContext(request);
  if (!context) return reply({ ok: false, code: "AUTHENTICATION_REQUIRED" }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => !["menuItemId", "expectedRevision"].includes(key) || params.getAll(key).length !== 1)) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  const parsed = parseEvidenceReference({ contractVersion: 1, kind: "MENU_ORIGIN", id: params.get("menuItemId"), venueId: context.venueId, workspaceId: context.workspaceId, ...(params.has("expectedRevision") ? { expectedRevision: params.get("expectedRevision") } : {}) });
  if (!parsed.ok) return reply({ ok: false, code: "INVALID_REFERENCE" }, 400);
  return reply(await readMenuOrigin(context, parsed.reference, MAX_EVIDENCE_REFERENCES, 0, new Date().toISOString()));
}

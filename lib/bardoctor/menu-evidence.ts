import { env } from "cloudflare:workers";
import { getD1 } from "../../db";
import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { readStoreSnapshots } from "./store-cas";
import { MENU_INGESTION_STORE_KEY, validateMenuDraft, stable, type MenuDraft } from "./menu-ingestion";
import { canonicalTaxonomyForAssortment } from "./nomenclature-taxonomy";
import { accountingCurrencyFromRestaurantJson } from "./currency";
import { businessFactIdentity, boundedEvidenceReferences, evidenceContentRevision, type EvidenceScope, type EvidenceReference, type EvidenceResolution,
  type EvidenceDiagnostic, type EvidenceRelation, type EvidenceProjection, type MenuValues, type MenuSourceType,
  type MenuOriginView, type MenuOriginResolution, type MenuConfirmationOutcome } from "./evidence-contracts";

type Row = Record<string, unknown>;
type Context = EvidenceScope & { account: AuthenticatedAccount };
type Audit = { id: number; entity_id: string; before_json: string | null; after_json: string | null; created_at: string; reason: string };
type Proof = { draft: Row; line: Row; audit: Audit; before: Row | null; applied: Row; outcome: MenuConfirmationOutcome };
const kinds = new Set(["MENU_ORIGIN", "MENU_SOURCE", "MENU_SOURCE_FILE", "MENU_REVIEWED_INPUT", "MENU_CONFIRMATION", "MENU_RECIPE", "MENU_TAXONOMY"]);
export const isMenuEvidenceKind = (kind: string) => kinds.has(kind);
const obj = (v: unknown): Row | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Row : null;
const list = (v: unknown): Row[] => Array.isArray(v) ? v.filter(x => obj(x)) as Row[] : [];
const txt = (v: unknown, max = 240) => typeof v === "string" && v.trim() ? v.slice(0, max) : null;
const num = (v: unknown) => (typeof v === "number" || typeof v === "string" && v.trim() !== "") && Number.isFinite(Number(v)) ? Number(v) : null;
const instant = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : null;
const source = (v: unknown): MenuSourceType => ["MANUAL", "SCAN", "IMPORT"].includes(String(v)) ? v as MenuSourceType : "LEGACY_UNKNOWN";
const scoped = (r: Row, c: Context, strict = false) => (strict ? r.venueId === c.venueId : r.venueId == null || r.venueId === c.venueId) && (r.workspaceId == null || r.workspaceId === c.workspaceId);
const unique = (rows: Row[], id: unknown, c: Context, strict = false) => { const matches = rows.filter(r => r.id === id); return matches.length === 1 && scoped(matches[0], c, strict) ? matches[0] : null; };
const validFileId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9-]{20,80}$/.test(id);
export function menuValues(v: unknown): MenuValues {
  const r = obj(v) ?? {};
  return { id: txt(r.id, 200), name: txt(r.name), salePrice: num(r.salePrice), currency: txt(r.currency, 12), sectionId: txt(r.sectionId, 120), taxonomyCategoryId: txt(r.taxonomyCategoryId, 120), subcategoryId: txt(r.subcategoryId, 120), consumptionMode: txt(r.consumptionMode, 30), type: txt(r.type, 30), active: typeof r.active === "boolean" ? r.active : null };
}
function files(draft: Row) {
  const ids = obj(draft.provenance)?.sourceFileIds;
  return Array.isArray(ids) ? [...new Set(ids.filter(validFileId))].slice(0, 12) : [];
}
function child(draft: Row, id: unknown, c: Context) {
  const row = unique(list(draft.rows), id, c), item = obj(row?.item), base = obj(row?.base);
  return row && item && scoped(item, c) && (!base || scoped(base, c)) ? row : null;
}
function recipeOwned(r: Row, menuId: string, c: Context) {
  return scoped(r, c) && (r.menuItemId === menuId || r.ownerId === menuId)
    && (r.menuItemId == null || r.menuItemId === menuId) && (r.ownerId == null || r.ownerId === menuId);
}

/** Existing stores, existing confirm audit, and existing R2 metadata. No history is persisted or synthesized. */
async function load(context: Context, reference: EvidenceReference) {
  const manage = hasPermission(context.account, "inventory.manage");
  const snapshots = await readStoreSnapshots(getD1(), context.account.id, ["bd_assortment_v1", ...(manage ? [MENU_INGESTION_STORE_KEY] : [])]);
  const assortment = JSON.parse(snapshots.find(s => s.key === "bd_assortment_v1")?.dataJson ?? "null") as unknown;
  const root = obj(assortment);
  if (assortment !== null && !root) throw Error("MENU_EVIDENCE_RECORD_INVALID");
  const array = (v: unknown): Row[] => { if (v == null) return []; if (!Array.isArray(v) || v.some(r => !obj(r))) throw Error("MENU_EVIDENCE_RECORD_INVALID"); return v; };
  const menu = array(root?.menuItems), recipes = array(root?.recipes);
  const drafts = array(manage ? JSON.parse(snapshots.find(s => s.key === MENU_INGESTION_STORE_KEY)?.dataJson ?? "null") : null);
  if (drafts.some(d => d.version !== 1 || !Array.isArray(d.rows) || d.rows.some(r => !obj(r)) || source(d.source) === "LEGACY_UNKNOWN")) throw Error("MENU_EVIDENCE_RECORD_INVALID");
  const menuKind = ["MENU_ORIGIN", "MENU_ITEM", "MENU_RECIPE", "MENU_TAXONOMY"].includes(reference.kind);
  const item = menuKind ? unique(menu, reference.id, context) : null;
  const draft = menuKind ? null : unique(drafts, reference.id, context, true);
  const candidates = menuKind ? drafts.filter(d => scoped(d, context, true) && list(d.rows).some(l => obj(l.item)?.id === reference.id || l.targetId === reference.id)) : draft ? [draft] : [];
  const audits = new Map<string, Audit[]>();
  for (const d of candidates) {
    if (d.status !== "CONFIRMED") continue;
    const result = await getD1().prepare("SELECT id,entity_id,before_json,after_json,created_at,reason FROM audit_log WHERE account_id=? AND store_key='bd_assortment_v1' AND action='update' AND entity_id=? AND reason=? LIMIT 3")
      .bind(context.account.id, d.id, "menu ingestion " + d.source).all<Audit>();
    audits.set(String(d.id), result.results ?? []);
  }
  const proof = (d: Row, l: Row): Proof | null => {
    if (!scoped(d, context, true) || d.status !== "CONFIRMED" || l.decision !== "apply" || l.reviewed !== true || !instant(d.confirmedAt) || typeof d.validationHash !== "string" || !/^[a-f0-9]{64}$/.test(d.validationHash)
      || !child(d, l.id, context) || !Array.isArray(d.resultIds)) return null;
    const input = obj(l.item)!, target = input.id;
    if (typeof target !== "string" || !d.resultIds.includes(target) || d.resultIds.filter(x => x === target).length !== 1) return null;
    const records = audits.get(String(d.id)) ?? [];
    if (records.length !== 1 || Date.parse(records[0].created_at) !== Date.parse(String(d.confirmedAt))) return null;
    try {
      const beforeRows: unknown = JSON.parse(records[0].before_json ?? "null"), afterRows: unknown = JSON.parse(records[0].after_json ?? "null");
      if (!Array.isArray(beforeRows) || !Array.isArray(afterRows) || [...beforeRows, ...afterRows].some(r => !obj(r))) return null;
      const applied = unique(afterRows, target, context), beforeMatches = beforeRows.filter(r => r.id === target);
      if (!applied || beforeMatches.length > 1 || beforeMatches.some(r => !scoped(r, context))) return null;
      const before = beforeMatches[0] ?? null;
      if (l.targetId == null ? before !== null || l.base != null : l.targetId !== target || !before || stable(l.base) !== stable(before)) return null;
      const reviewed = menuValues(input), confirmed = menuValues(applied);
      for (const key of ["id", "name", "salePrice", "sectionId", "taxonomyCategoryId", "subcategoryId", "consumptionMode"] as const) if (reviewed[key] !== confirmed[key]) return null;
      if (reviewed.currency !== null && reviewed.currency !== confirmed.currency) return null;
      return { draft: d, line: l, audit: records[0], before, applied, outcome: !before ? "ADDED" : stable(before) === stable(applied) ? "UNCHANGED" : "CHANGED" };
    } catch { return null; }
  };
  const proofs = candidates.flatMap(d => list(d.rows).filter(l => obj(l.item)?.id === reference.id).flatMap(l => { const p = proof(d, l); return p ? [p] : []; }))
    .sort((a, b) => String(a.draft.confirmedAt).localeCompare(String(b.draft.confirmedAt)) || String(a.draft.id).localeCompare(String(b.draft.id)));
  const origins = proofs.filter(p => p.outcome === "ADDED"), origin = origins.length === 1 ? origins[0] : null, latest = proofs.at(-1) ?? null;
  const selectedDrafts = item ? [...new Map([origin, latest].filter(p => p !== null).map(p => [String(p!.draft.id), p!.draft])).values()] : draft ? [draft] : [];
  const heads = new Map<string, Row | null>();
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  for (const d of selectedDrafts) for (const id of files(d)) {
    if (heads.has(id)) continue;
    const head = bucket?.head ? await bucket.head(`catalog/${context.account.id}/${id}`) : null;
    heads.set(id, head ? { size: head.size, etag: head.etag,
      httpMetadata: { contentType: head.httpMetadata?.contentType ?? null },
      customMetadata: { originalName: head.customMetadata?.originalName ?? null, uploadedAt: head.customMetadata?.uploadedAt ?? null } } : null);
  }
  const ref = (kind: EvidenceReference["kind"], id: string, partId?: string): EvidenceReference => ({ contractVersion: 1, kind, id, venueId: context.venueId, workspaceId: context.workspaceId, ...(partId !== undefined ? { partId } : {}) }) as EvidenceReference;
  const recipe = (menuId: string, id: unknown) => { const r = unique(recipes, id, context); return r && recipeOwned(r, menuId, context) ? r : null; };
  const taxonomy = canonicalTaxonomyForAssortment(root ?? {});
  const allowed = (r: EvidenceReference) => hasPermission(context.account, ["MENU_ORIGIN", "MENU_ITEM", "MENU_RECIPE", "MENU_TAXONOMY"].includes(r.kind) ? "inventory.view" : "inventory.manage");
  const recordFor = (r: EvidenceReference): unknown => {
    if (r.kind === "MENU_ITEM") return unique(menu, r.id, context);
    if (r.kind === "MENU_INGESTION_DRAFT") return unique(drafts, r.id, context, true);
    if (r.kind === "MENU_ORIGIN") return item && { item, manage, candidates, confirmations: [...audits.entries()], relatedRecipes: recipes.filter(x => recipeOwned(x, String(item.id), context)), taxonomy: taxonomy.taxonomy, taxonomyBasis: root?.nomenclatureStructure ?? null, files: [...heads.entries()] };
    if (r.kind === "MENU_TAXONOMY") { const m = unique(menu, r.id, context); return m && { item: m, taxonomy: taxonomy.taxonomy, taxonomyBasis: root?.nomenclatureStructure ?? null }; }
    if (r.kind === "MENU_RECIPE") { const m = unique(menu, r.id, context), rec = recipe(r.id, r.partId); return m && rec && { item: m, recipe: rec }; }
    const d = unique(drafts, r.id, context, true);
    if (!d) return null;
    if (r.kind === "MENU_SOURCE_FILE") return files(d).includes(r.partId ?? "") && heads.get(r.partId!) ? { draft: d, head: heads.get(r.partId!) } : null;
    if (r.kind === "MENU_SOURCE") return { draft: d, files: files(d).map(id => ({ id, head: heads.get(id) ?? null })) };
    const l = child(d, r.partId, context);
    if (!l) return null;
    if (r.kind === "MENU_REVIEWED_INPUT") return { draft: d, audits: audits.get(r.id) ?? [], ...(d.status !== "CONFIRMED" ? { currentValidationBasis: root } : {}) };
    if (r.kind === "MENU_CONFIRMATION") { const p = proof(d, l); return p && { draft: d, audit: p.audit, current: unique(menu, p.applied.id, context) }; }
    return null;
  };
  const bound = async (r: EvidenceReference) => { if (!allowed(r)) return null; const record = recordFor(r); return record ? { ...r, expectedRevision: await evidenceContentRevision(r, record) } : null; };
  return { root: root ?? {}, menu, recipes, drafts, item, draft, candidates, proof, proofs, origins, origin, latest, heads, ref, recipe, taxonomy, manage, recordFor, bound };
}

export async function resolveMenuEvidence(context: Context, reference: EvidenceReference, limit: number, offset: number, asOf: string): Promise<EvidenceResolution> {
  const base = { contractVersion: 1 as const, asOf };
  const fail = (outcome: "unavailable" | "restricted" | "changed", diagnostics: EvidenceDiagnostic[] = []): EvidenceResolution => outcome === "unavailable" ? { ...base, outcome, code: "EVIDENCE_UNAVAILABLE", diagnostics } : outcome === "restricted" ? { ...base, outcome, code: "ACCESS_DENIED", diagnostics } : { ...base, outcome, code: "READ_MODEL_CHANGED", diagnostics };
  if (reference.venueId !== context.venueId || reference.workspaceId !== context.workspaceId) return fail("unavailable");
  const visible = ["MENU_ORIGIN", "MENU_RECIPE", "MENU_TAXONOMY"].includes(reference.kind);
  if (!hasPermission(context.account, visible ? "inventory.view" : "inventory.manage")) return fail("restricted");
  let data: Awaited<ReturnType<typeof load>>;
  try { data = await load(context, reference); } catch (e) { if (e instanceof SyntaxError || e instanceof Error && e.message === "MENU_EVIDENCE_RECORD_INVALID") return fail("unavailable", ["RECORD_NEEDS_REVIEW"]); throw e; }
  const record = data.recordFor(reference);
  if (!record) return fail(reference.expectedRevision && ["MENU_SOURCE_FILE", "MENU_CONFIRMATION"].includes(reference.kind) ? "changed" : "unavailable");
  const revision = await evidenceContentRevision(reference, record);
  if (reference.expectedRevision && reference.expectedRevision !== revision) return fail("changed", ["NO_HISTORICAL_SNAPSHOT"]);
  const diagnostics: EvidenceDiagnostic[] = ["FRESHNESS_POLICY_UNDEFINED"], refs: EvidenceRelation[] = [];
  const add = async (type: EvidenceRelation["type"], kind: EvidenceReference["kind"], id: string, partId?: string) => {
    const r = data.ref(kind, id, partId), b = await data.bound(r);
    if (b) refs.push({ type, reference: b }); else diagnostics.push(data.manage ? "RELATED_EVIDENCE_UNAVAILABLE" : "RELATIONS_RESTRICTED");
  };
  let projection: EvidenceProjection, parent: Row, finality: "FINAL" | "UNKNOWN" = "UNKNOWN";
  if (reference.kind === "MENU_ORIGIN") {
    parent = data.item!; const latest = data.latest, origin = data.origin;
    const view: MenuOriginView = { menuItemId: reference.id, currentMenu: menuValues(parent), originSourceType: origin ? source(origin.draft.source) : "LEGACY_UNKNOWN", originDraftId: origin ? String(origin.draft.id) : null, originRowId: origin ? String(origin.line.id) : null,
      confirmationResult: origin?.outcome ?? null, latestConfirmationDraftId: latest ? String(latest.draft.id) : null, latestConfirmationRowId: latest ? String(latest.line.id) : null, latestConfirmationResult: latest?.outcome ?? null,
      currentMatchesConfirmed: latest ? stable(menuValues(latest.applied)) === stable(menuValues(parent)) : null, originalSourceValuesAvailable: false };
    projection = { type: "MENU_ORIGIN", ...view }; finality = origin ? "FINAL" : "UNKNOWN";
    diagnostics.push("SOURCE_VALUES_NOT_RETAINED"); if (!origin) diagnostics.push(data.origins.length > 1 ? "ORIGIN_AMBIGUOUS" : "ORIGIN_UNKNOWN");
    if (!data.manage) diagnostics.push("RELATIONS_RESTRICTED");
    if (view.currentMatchesConfirmed === false) diagnostics.push("CURRENT_MENU_CHANGED");
    if (data.candidates.some(d => d.status === "CONFIRMED" && list(d.rows).some(l => obj(l.item)?.id === reference.id && l.decision === "apply" && !data.proof(d, l)))) diagnostics.push("CONFIRMATION_RECORD_MISSING");
    await add("current_definition", "MENU_ITEM", reference.id);
    for (const p of [...new Map([origin, latest].filter(p => p !== null).map(p => [String(p!.draft.id) + ":" + String(p!.line.id), p!])).values()]) await add("derived_from", "MENU_CONFIRMATION", String(p.draft.id), String(p.line.id));
    for (const recipe of data.recipes.filter(r => recipeOwned(r, reference.id, context))) if (typeof recipe.id === "string") await add("current_definition", "MENU_RECIPE", reference.id, recipe.id);
    await add("current_definition", "MENU_TAXONOMY", reference.id);
  } else if (reference.kind === "MENU_RECIPE") {
    parent = data.recipe(reference.id, reference.partId)!;
    projection = { type: "MENU_RECIPE", menuItemId: reference.id, recipeId: reference.partId!, version: num(parent.version), status: txt(parent.status, 60), reviewStatus: txt(parent.reviewStatus, 60), lifecycleStatus: txt(parent.lifecycleStatus, 60), current: typeof parent.current === "boolean" ? parent.current : null, ingredientCount: list(parent.ingredients).length, currentDefinitionOnly: true, historicalConfirmationSnapshotAvailable: false };
    diagnostics.push("CURRENT_DEFINITION_ONLY", "HISTORICAL_RECIPE_NOT_RETAINED"); await add("belongs_to", "MENU_ITEM", reference.id);
  } else if (reference.kind === "MENU_TAXONOMY") {
    parent = data.item!; const tree = data.taxonomy.taxonomy, node = (items: typeof tree.sections, id: unknown) => { const n = items.find(n => n.id === id); return n ? { id: n.id, name: n.name, active: n.active } : null; };
    const structure = obj(data.root.nomenclatureStructure), stored = [structure?.sections, structure?.categories, structure?.subcategories].some(Array.isArray);
    projection = { type: "MENU_TAXONOMY", menuItemId: reference.id, basis: stored ? "STORED_TREE" : "DEFAULT_FALLBACK", section: node(tree.sections, parent.sectionId), category: node(tree.categories, parent.taxonomyCategoryId), subcategory: node(tree.subcategories, parent.subcategoryId), currentDefinitionOnly: true };
    diagnostics.push("CURRENT_DEFINITION_ONLY"); await add("belongs_to", "MENU_ITEM", reference.id);
  } else {
    parent = data.draft!; const row = child(parent, reference.partId, context);
    if (reference.kind === "MENU_SOURCE") {
      projection = { type: "MENU_SOURCE", sourceType: source(parent.source), draftId: reference.id, sourceFileCount: files(parent).length, originalValues: null, recognitionRecordAvailable: false, originalUploadHashAvailable: false };
      diagnostics.push("SOURCE_VALUES_NOT_RETAINED"); if (parent.source !== "MANUAL" && !files(parent).length) diagnostics.push("SOURCE_METADATA_MISSING");
      await add("belongs_to", "MENU_INGESTION_DRAFT", reference.id); for (const id of files(parent)) await add("derived_from", "MENU_SOURCE_FILE", reference.id, id);
    } else if (reference.kind === "MENU_SOURCE_FILE") {
      const h = data.heads.get(reference.partId!)!, metadata = obj(h.customMetadata), http = obj(h.httpMetadata); let name: string | null = null;
      try { name = txt(decodeURIComponent(String(metadata?.originalName ?? "")), 180); } catch { /* No guessed file name. */ }
      projection = { type: "MENU_SOURCE_FILE", draftId: reference.id, fileId: reference.partId!, name, mimeType: txt(http?.contentType, 120), sizeBytes: num(h.size), uploadedAt: instant(metadata?.uploadedAt), contentBinding: txt(h.etag, 200) ? { type: "R2_ETAG", value: String(h.etag) } : null, downloadPath: "/api/catalog/files/" + reference.partId };
      await add("belongs_to", "MENU_SOURCE", reference.id);
    } else if (reference.kind === "MENU_REVIEWED_INPUT") {
      const d = data.proof(parent, row!); let outcome: Extract<EvidenceProjection, { type: "MENU_REVIEWED_INPUT" }>["outcome"] = "UNKNOWN", basis: Extract<EvidenceProjection, { type: "MENU_REVIEWED_INPUT" }>["outcomeBasis"] = "STORED_DECISION";
      if (row!.decision === "skip") outcome = "SKIPPED";
      else if (d) { outcome = d.outcome; basis = "CONFIRMATION_AUDIT"; }
      else if (["DRAFT", "VALIDATED"].includes(String(parent.status)) && instant(parent.updatedAt)) {
        const validation = validateMenuDraft(parent as unknown as MenuDraft, data.root, accountingCurrencyFromRestaurantJson(context.account.restaurantJson), String(parent.updatedAt));
        outcome = validation.diff.find(r => r.id === row!.id)?.status ?? "UNKNOWN"; basis = "CURRENT_VALIDATION_PREVIEW";
      } else if (parent.status === "CONFIRMED") diagnostics.push("CONFIRMATION_RECORD_MISSING");
      projection = { type: "MENU_REVIEWED_INPUT", draftId: reference.id, rowId: reference.partId!, values: menuValues(row!.item), targetMenuItemId: txt(row!.targetId, 200), reviewed: typeof row!.reviewed === "boolean" ? row!.reviewed : null, decision: ["pending", "apply", "skip"].includes(String(row!.decision)) ? row!.decision as "pending" | "apply" | "skip" : null, draftLifecycle: txt(parent.status, 30), validationState: parent.status === "VALIDATED" || parent.status === "CONFIRMED" ? "VALIDATED_HASH_RETAINED" : "NOT_VALIDATED", outcome, outcomeBasis: basis, sourceValues: null };
      diagnostics.push("SOURCE_VALUES_NOT_RETAINED"); await add("belongs_to", "MENU_INGESTION_DRAFT", reference.id); await add("derived_from", "MENU_SOURCE", reference.id);
      if (d) await add("confirmed_for", "MENU_CONFIRMATION", reference.id, reference.partId);
    } else {
      const d = data.proof(parent, row!)!; const current = unique(data.menu, d.applied.id, context);
      projection = { type: "MENU_CONFIRMATION", draftId: reference.id, rowId: reference.partId!, menuItemId: String(d.applied.id), outcome: d.outcome, decision: "apply", reviewed: true, draftRevision: num(parent.revision), confirmedAt: instant(parent.confirmedAt), validationHash: txt(parent.validationHash, 100), reviewedValues: menuValues(row!.item), appliedValues: menuValues(d.applied), currentMatchesConfirmed: current ? stable(menuValues(current)) === stable(menuValues(d.applied)) : null, recordBasis: "EXISTING_CONFIRMATION_AUDIT" };
      finality = "FINAL"; await add("derived_from", "MENU_REVIEWED_INPUT", reference.id, reference.partId); await add("belongs_to", "MENU_INGESTION_DRAFT", reference.id);
      if (current) await add("current_definition", "MENU_ITEM", String(current.id)); else diagnostics.push("RELATED_EVIDENCE_UNAVAILABLE");
    }
  }
  const nextOffset = offset + limit < refs.length ? offset + limit : null;
  if (offset > 0 || nextOffset !== null) diagnostics.push("RELATIONS_PAGINATED");
  const boundReference = { ...reference, expectedRevision: revision }, observedAt = instant(parent.confirmedAt) ?? instant(parent.createdAt), updatedAt = instant(parent.updatedAt);
  return { ...base, outcome: "partial", code: "PARTIAL_EVIDENCE", diagnostics: [...new Set(diagnostics)], evidence: { reference: boundReference, revision, binding: reference.expectedRevision ? "EXPECTED_REVISION" : "CURRENT_RECORD", projection, finality, availability: "PARTIAL", evidenceStatus: "PARTIAL", observedAt, updatedAt,
    freshness: { basis: updatedAt || observedAt ? "RECORD" : "UNKNOWN", timestamp: updatedAt ?? observedAt, assessment: "UNKNOWN" }, relations: refs.slice(offset, offset + limit), page: { limit, offset, nextOffset }, traceTarget: { type: "EVIDENCE_RESOURCE", reference: boundReference } } };
}

/** Add bounded, separately bound trace relations to the original Phase 3A.1 record adapters. */
export async function menuTraceRelations(context: Context, reference: EvidenceReference): Promise<EvidenceRelation[]> {
  if (!hasPermission(context.account, "inventory.manage")) return [];
  let data: Awaited<ReturnType<typeof load>>;
  try { data = await load(context, reference); }
  catch (e) {
    // A malformed private staging record cannot break the existing current-Menu adapter.
    if (e instanceof SyntaxError || e instanceof Error && e.message === "MENU_EVIDENCE_RECORD_INVALID") return [];
    throw e;
  }
  const relations: EvidenceRelation[] = [];
  const add = async (kind: EvidenceReference["kind"], id: string, partId?: string) => { const ref = await data.bound(data.ref(kind, id, partId)); if (ref) relations.push({ type: "derived_from", reference: ref }); };
  if (reference.kind === "MENU_ITEM" && data.item) await add("MENU_ORIGIN", reference.id);
  return relations;
}

export async function readMenuOrigin(context: Context, reference: EvidenceReference, limit: number, offset: number, asOf: string): Promise<MenuOriginResolution> {
  const resolution = await resolveMenuEvidence(context, reference, limit, offset, asOf);
  if (!("evidence" in resolution)) { if (resolution.outcome === "unsupported") throw Error("MENU_ORIGIN_ADAPTER_INVALID"); return resolution; }
  const e = resolution.evidence; if (e.projection.type !== "MENU_ORIGIN") throw Error("MENU_ORIGIN_ADAPTER_INVALID");
  const { type: _type, ...view } = e.projection; void _type;
  return { contractVersion: 1, asOf, outcome: "partial", code: "PARTIAL_EVIDENCE", diagnostics: resolution.diagnostics, binding: e.binding, page: e.page,
    fact: { contractVersion: 1, factType: "MENU_ORIGIN", factId: businessFactIdentity({ ...context, factType: "MENU_ORIGIN", menuItemId: reference.id }), venueId: context.venueId, workspaceId: context.workspaceId, ...view, value: reference.id, unit: "IDENTITY", revision: e.revision,
      sourceRef: e.relations.find(r => r.reference.kind === "MENU_CONFIRMATION")?.reference ?? null, evidenceRefs: boundedEvidenceReferences(e.relations.map(r => r.reference)).evidenceRefs, traceTarget: e.traceTarget, finality: e.finality, availability: "PARTIAL", evidenceStatus: "PARTIAL", diagnostics: resolution.diagnostics,
      ...(e.observedAt ? { observedAt: e.observedAt } : {}), ...(e.updatedAt ? { updatedAt: e.updatedAt } : {}), freshness: e.freshness } };
}

import { derivedInputBelongs } from "./derived-input-scope";
import { getD1 } from "../../db";
import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { boundSource, scopedSource, selectorAllowed, SOURCE_SELECTORS, sourceFactId } from "./canonical-input-evidence";
import { loadCanonicalHealthInputs } from "./canonical-health-inputs";
import { evidenceContentRevision, parseEvidenceReference, type EvidenceReference, type EvidenceResolution, type EvidenceScope, type EvidenceProjection, type EvidenceRelation } from "./evidence-contracts";
import { isRecommendationMetricId, recommendationMetricSnapshot } from "./recommendation-outcomes";
import { readAcceptedWrite } from "./integrations/accepted-write";
import { reviewsForCurrentGoogleLocation } from "./review-sources";

type Context = EvidenceScope & { account: AuthenticatedAccount };
const fail = (outcome: "unavailable" | "restricted" | "changed" | "unsupported", asOf: string): EvidenceResolution => ({ contractVersion: 1, asOf, diagnostics: [], outcome, code: ({ unavailable: "EVIDENCE_UNAVAILABLE", restricted: "ACCESS_DENIED", changed: "READ_MODEL_CHANGED", unsupported: "UNSUPPORTED_REFERENCE_KIND" } as const)[outcome] } as EvidenceResolution);
export async function resolveProvenanceEvidence(context: Context, ref: EvidenceReference, limit: number, offset: number, asOf: string): Promise<EvidenceResolution> {
  const scope = { venueId: context.venueId, workspaceId: context.workspaceId, dataAccountId: context.account.id };
  let relationCount: number | undefined;
  let projection: EvidenceProjection, relations: EvidenceRelation[] = [], parent: unknown, observedAt: string | null = null, partial = false;
  if (ref.kind === "CANONICAL_SOURCE") {
    const selector = Object.hasOwn(SOURCE_SELECTORS, ref.id) ? SOURCE_SELECTORS[ref.id] : null;
    if (!selector) return fail("unsupported", asOf);
    if (!selectorAllowed(context.account, ref.id)) return fail("restricted", asOf);
    const stored = await getD1().prepare("SELECT CASE WHEN length(data_json)<=4194304 THEN data_json ELSE NULL END data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?").bind(scope.dataAccountId, selector.key).first<{ data_json: string | null; updated_at: string }>();
    if (!stored?.data_json) return fail("unavailable", asOf);
    let data: unknown;
    try { const raw: unknown = JSON.parse(stored.data_json); partial = !derivedInputBelongs(raw, scope); data = scopedSource(raw, scope); } catch { return fail("unavailable", asOf); }
    if (selector.key === "bd_guest_reviews" && Array.isArray(data)) data = await reviewsForCurrentGoogleLocation(scope.dataAccountId, data);
    if (data == null) return fail("unavailable", asOf);
    if (selector.collection) data = (data as Record<string, unknown>)[selector.collection];
    if (Array.isArray(data) && data.length > 10000) return fail("unavailable", asOf);
    if (ref.partId) {
      if (!Array.isArray(data)) return fail("unavailable", asOf);
      const matches = data.filter(row => row && typeof row === "object" && String(row.id ?? row.productKey ?? row.key) === ref.partId);
      if (matches.length !== 1) return fail("unavailable", asOf);
      data = matches[0];
    } else {
      const collections = Array.isArray(data) ? [[ref.id, data] as const] : selector.key === "bd_assortment_v1" && !selector.collection ? Object.entries(data as Record<string, unknown>).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [`${selector.key}.${key}`, value] as const) : [];
      for (const [selected, values] of collections) {
        if (!SOURCE_SELECTORS[selected] || !Array.isArray(values)) continue;
        if (values.length > 10000) { partial = true; continue; }
        const counts = new Map<string, number>();
        for (const row of values) { const id = String(row?.id ?? row?.productKey ?? row?.key ?? ""); counts.set(id, (counts.get(id) ?? 0) + 1); }
        for (const row of values) {
          const id = row && typeof row === "object" ? String(row.id ?? row.productKey ?? row.key ?? "") : "";
          if (!id || id.length > 200 || counts.get(id) !== 1) { partial = true; continue; }
          relationCount ??= 0;
          const relationIndex = relationCount++;
          if (relationIndex >= offset && relationIndex < offset + limit) relations.push({ type: "derived_from", reference: await boundSource(scope, selected, row, id) });
        }
      }
    }
    parent = { dataAccountId: scope.dataAccountId, data };
    observedAt = stored.updated_at;
    projection = { type: "CANONICAL_SOURCE", factId: sourceFactId(scope, ref.id, ref.partId), authority: "CANONICAL_INTERNAL_FACT", sourceKey: selector.key, entityId: ref.partId ?? null, rowCount: Array.isArray(data) ? data.length : null, historicalSnapshotAvailable: false };
  } else if (ref.kind === "AI_METRIC") {
    if (!isRecommendationMetricId(ref.id) || ref.partId) return fail("unsupported", asOf);
    const canonical = await loadCanonicalHealthInputs(context.account, asOf);
    if (!canonical) return fail("unavailable", asOf);
    if (canonical.restricted) return fail("restricted", asOf);
    const metric = recommendationMetricSnapshot(ref.id, canonical.context);
    if (!metric) return fail("unavailable", asOf);
    const { evidenceRef: _reference, ...provenance } = metric.provenance!;
    void _reference;
    parent = { ...metric, provenance };
    projection = { type: "AI_METRIC", metric: parent, factId: `fact:v1:${scope.workspaceId}:${scope.venueId}:AI_METRIC:${ref.id}`, calculation: { version: provenance.calculationVersion, metricId: ref.id, periodKey: metric.periodKey, unit: metric.unit } };
    relations = provenance.facts.flatMap(fact => fact.reference ? [{ type: "derived_from" as const, reference: fact.reference }] : []);
    partial = provenance.state !== "AVAILABLE";
    observedAt = metric.observedAt;
  } else if (ref.kind === "INTEGRATION_EVENT") {
    if (!hasPermission(context.account, "integrations.manage")) return fail("restricted", asOf);
    const item = await getD1().prepare(`SELECT i.* FROM integration_sync_items i JOIN integration_sync_runs r ON r.id=i.run_id AND r.connection_id=i.connection_id JOIN integration_connections c ON c.id=i.connection_id
      WHERE i.id=? AND i.venue_id=? AND i.data_account_id=? AND r.venue_id=? AND r.data_account_id=? AND c.venue_id=? AND c.data_account_id=?`).bind(ref.id, scope.venueId, scope.dataAccountId, scope.venueId, scope.dataAccountId, scope.venueId, scope.dataAccountId).first<Record<string, unknown>>();
    if (!item) return fail("unavailable", asOf);
    let accepted = null;
    try { accepted = ["success", "skipped"].includes(String(item.status)) ? readAcceptedWrite(JSON.parse(String(item.payload_json))) : null; } catch { /* legacy/invalid provenance stays UNKNOWN */ }
    if (accepted) for (const entity of accepted.entities) {
      const parsed = parseEvidenceReference(entity);
      if (!parsed.ok || parsed.reference.kind !== "CANONICAL_SOURCE" || parsed.reference.venueId !== scope.venueId || parsed.reference.workspaceId !== scope.workspaceId || !parsed.reference.expectedRevision) { accepted = null; break; }
      if (!selectorAllowed(context.account, parsed.reference.id)) return fail("restricted", asOf);
    }
    parent = { runId: item.run_id, itemId: item.id, connectionId: item.connection_id, payloadHash: item.payload_hash, status: item.status, accepted };
    partial = !accepted;
    projection = { type: "INTEGRATION_EVENT", ...parent as Record<string, unknown>, provenanceState: accepted ? "ACCEPTED_REVISION_BOUND" : "UNKNOWN", historicalReconstruction: false };
    relations = accepted?.entities.map(reference => ({ type: "derived_from" as const, reference })) ?? [];
    observedAt = String(item.updated_at);
  } else return fail("unsupported", asOf);
  const revision = await evidenceContentRevision(ref, parent);
  if (ref.expectedRevision && ref.expectedRevision !== revision) return fail("changed", asOf);
  const reference = { ...ref, expectedRevision: revision }, pageRelations = relationCount === undefined ? relations.slice(offset, offset + limit) : relations, nextOffset = offset + limit < (relationCount ?? relations.length) ? offset + limit : null;
  return { contractVersion: 1, asOf, outcome: partial ? "partial" : "resolved", code: partial ? "PARTIAL_EVIDENCE" : "RESOLVED", diagnostics: [...(partial ? ["PARTIAL_EVIDENCE" as const] : []), ...(nextOffset !== null ? ["RELATIONS_PAGINATED" as const] : [])], evidence: {
    reference, revision, binding: ref.expectedRevision ? "EXPECTED_REVISION" : "CURRENT_RECORD", projection, finality: "UNKNOWN", availability: partial ? "PARTIAL" : "AVAILABLE", evidenceStatus: "PARTIAL", observedAt, updatedAt: observedAt, freshness: { basis: "RECORD", timestamp: observedAt, assessment: "UNKNOWN" }, relations: pageRelations, page: { limit, offset, nextOffset }, traceTarget: { type: "EVIDENCE_RESOURCE", reference },
  } };
}

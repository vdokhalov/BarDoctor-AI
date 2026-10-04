import type { AuthenticatedAccount } from "./access-control";
import { derivedInputBelongs } from "./derived-input-scope";
import { evidenceContentRevision, type EvidenceReference, type EvidenceScope, type ContentRevision } from "./evidence-contracts";
import { canReadVenueSource, VENUE_CONTEXT_SOURCES } from "./venue-context-access";
import { RECOMMENDATION_METRIC_IDS, recommendationMetricSnapshot, type RecommendationMetricId } from "./recommendation-outcomes";
import type { StoredVenueValue, VenueAIContext } from "./venue-ai-context";

export const AI_METRIC_CALCULATION_VERSION = "canonical-ai-metrics-v1";
export type CanonicalInputScope = EvidenceScope & { dataAccountId: number };
export type SourceBinding = { key: string; state: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL"; updatedAt: string | null; factId: string; reference: EvidenceReference | null };
export type CanonicalInputs = { scope: CanonicalInputScope; blocks: Record<string, SourceBinding[]>; metrics: Partial<Record<RecommendationMetricId, SourceBinding[]>> };
/** Completeness follows the calculation, independently of unrelated data quality. */
export function metricSourceSelectors(id: RecommendationMetricId): string[] {
  if (id.startsWith("closed_month_")) return VENUE_CONTEXT_SOURCES.performanceHistory;
  if (id.startsWith("review_")) return ["bd_guest_reviews"];
  const selectors: Partial<Record<RecommendationMetricId, string[]>> = {
    current_period_revenue: ["bd_finance_revenue"],
    current_period_receipts: ["bd_finance_revenue", "bd_operational_reports_v1"],
    current_period_guests: ["bd_finance_revenue", "bd_operational_reports_v1"],
    current_period_average_receipt: ["bd_finance_revenue", "bd_operational_reports_v1"],
    current_period_expenses: ["bd_finance_revenue", "bd_operational_reports_v1", "bd_finance_expenses", "bd_payroll_entries"],
    active_employees: ["bd_employees"],
    confirmed_purchase_documents: ["bd_purchase_documents"],
    inventory_snapshots: ["bd_inventory_snapshots"],
    low_stock_items: ["bd_assortment_v1.stockBalances"],
    menu_active_items: ["bd_assortment_v1.menuItems"],
    recipe_coverage_percent: ["bd_assortment_v1.menuItems", "bd_assortment_v1.recipes", "bd_assortment_v1.nomenclature", "bd_assortment_v1.stockBalances"],
  };
  return selectors[id] ?? [];
}
// Closed selectors. A public reference can never choose an arbitrary store/field.
export const SOURCE_SELECTORS: Record<string, { key: string; collection?: string }> = Object.fromEntries([
  ...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(), "bd_warehouses", "bd_inventory_returns"]),
].map(key => [key, { key }]));
for (const collection of ["menuItems", "recipes", "nomenclature", "stockBalances"]) SOURCE_SELECTORS[`bd_assortment_v1.${collection}`] = { key: "bd_assortment_v1", collection };

const object = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v));
/** Identical scope filtering in calculation and resolver, never a copy in a ledger. */
export function scopedSource(data: unknown, scope: CanonicalInputScope): unknown {
  if (Array.isArray(data)) return data.filter(row => object(row) && derivedInputBelongs(row, scope));
  if (!object(data) || !Object.entries(scope).every(([key, value]) => data[key] == null || Number(data[key]) === value)) return null;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.filter(row => derivedInputBelongs(row, scope)) : derivedInputBelongs(value, scope) ? value : null]));
}
export function sourceFactId(scope: CanonicalInputScope, selector: string, id?: string) {
  return `fact:v1:${scope.workspaceId}:${scope.venueId}:CANONICAL_SOURCE:${encodeURIComponent(selector)}:${encodeURIComponent(id ?? "source-set")}`;
}
export async function boundSource(scope: CanonicalInputScope, selector: string, data: unknown, id?: string): Promise<EvidenceReference> {
  const ref: EvidenceReference = { contractVersion: 1, kind: "CANONICAL_SOURCE", id: selector, venueId: scope.venueId, workspaceId: scope.workspaceId, ...(id ? { partId: id } : {}) };
  return { ...ref, expectedRevision: await evidenceContentRevision(ref, { dataAccountId: scope.dataAccountId, data }) };
}
export async function canonicalInputScope(account: AuthenticatedAccount): Promise<CanonicalInputScope | null> {
  const { getD1 } = await import("../../db");
  const row = await getD1().prepare("SELECT workspace_id FROM venues WHERE id=? AND data_account_id=? AND status='active'").bind(account.venueId, account.id).first<{ workspace_id: number }>();
  return row ? { venueId: account.venueId, workspaceId: row.workspace_id, dataAccountId: account.id } : null;
}
export async function bindCanonicalContext(context: VenueAIContext, scope: CanonicalInputScope, stores: Map<string, StoredVenueValue>) {
  const inputs: CanonicalInputs = { scope, blocks: {}, metrics: {} };
  const bindings = new Map<string, SourceBinding>();
  for (const key of new Set([...context.blocks.flatMap(block => VENUE_CONTEXT_SOURCES[block.id] ?? []), ...RECOMMENDATION_METRIC_IDS.flatMap(metricSourceSelectors)])) {
    const selector = SOURCE_SELECTORS[key], stored = stores.get(selector.key), root = stored ? scopedSource(stored.data, scope) : null;
    const selected = selector.collection && object(root) ? root[selector.collection] : root;
    const data = selector.collection && !Array.isArray(selected) ? null : selected;
    const state = !stored ? "UNAVAILABLE" : data == null || stored.sourceState === "PARTIAL" || !derivedInputBelongs(stored.data, scope) || Array.isArray(stored.data) && !stored.data.every(object) ? "PARTIAL" : "AVAILABLE";
    bindings.set(key, { key, state, updatedAt: stored?.updatedAt ?? null, factId: sourceFactId(scope, key), reference: stored && data != null ? await boundSource(scope, key, data) : null });
  }
  for (const block of context.blocks) inputs.blocks[block.id] = (VENUE_CONTEXT_SOURCES[block.id] ?? []).map(key => bindings.get(key)!);
  for (const id of RECOMMENDATION_METRIC_IDS) inputs.metrics[id] = metricSourceSelectors(id).map(key => bindings.get(key)!);
  context.canonicalInputs = inputs;
  context.metricEvidence = {};
  for (const id of RECOMMENDATION_METRIC_IDS) {
    const metric = recommendationMetricSnapshot(id, context);
    if (!metric) continue;
    const ref: EvidenceReference = { contractVersion: 1, kind: "AI_METRIC", id, venueId: scope.venueId, workspaceId: scope.workspaceId };
    context.metricEvidence[id] = { ...ref, expectedRevision: await evidenceContentRevision(ref, metric) };
  }
  return context;
}
export function selectorAllowed(account: AuthenticatedAccount, selector: string) {
  const selected = Object.hasOwn(SOURCE_SELECTORS, selector) ? SOURCE_SELECTORS[selector] : null;
  return Boolean(selected && canReadVenueSource(account, selected.key));
}
export type MetricEvidenceMap = Partial<Record<typeof RECOMMENDATION_METRIC_IDS[number], EvidenceReference & { expectedRevision?: ContentRevision }>>;

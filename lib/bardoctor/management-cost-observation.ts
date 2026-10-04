import { buildAssortmentAnalytics } from "./assortment-analytics";
import { boundSource } from "./canonical-input-evidence";
import { derivedInputBelongs } from "./derived-input-scope";
import type { StoreSnapshot } from "./store-cas";
import type { CostObservationV1, CostReason, CostScope } from "./management-cost-contracts";

export const COST_SOURCE_KEYS = ["bd_assortment_v1", "bd_purchase_documents", "bd_stock_movements"];
export const COST_CALCULATION_VERSION = "current-recipe-cost-phase4a-v1";
export const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const canonicalItemId = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 120 && id.trim() === id && !/[\u0000-\u001f]/.test(id);
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
export async function costRevision(value: unknown): Promise<string> {
  const normalize = (v: unknown): unknown => Array.isArray(v) ? v.map(normalize) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => [k, normalize(val)])) : v;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(normalize(value))));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
export function parseCostSources(snapshots: StoreSnapshot[], scope: CostScope) {
  const sources: Record<string, unknown> = {}, reasons: CostReason[] = [];
  for (const snapshot of snapshots.filter(s => COST_SOURCE_KEYS.includes(s.key))) {
    if (snapshot.dataJson === null) { reasons.push("SOURCE_MISSING"); continue; }
    try {
      if (bytes(snapshot.dataJson) > 2_000_000) throw new Error("source size");
      const value: unknown = JSON.parse(snapshot.dataJson);
      const collections = snapshot.key === "bd_assortment_v1" ? [record(value).menuItems, record(value).recipes, record(value).nomenclature, record(value).stockBalances] : [value];
      if (!collections.every(c => Array.isArray(c) && c.length <= 10000 && c.every(v => v && typeof v === "object" && !Array.isArray(v)))) throw new Error("source shape");
      if (!derivedInputBelongs(value, scope)) { reasons.push("SCOPE_CONFLICT"); continue; }
      const declared = record(value);
      if (["STALE", "PARTIAL", "UNAVAILABLE", "CONFLICT"].includes(String(declared.sourceState)) || declared.stale === true || declared.sourceConflict === true) { reasons.push("SOURCE_CHANGED"); continue; }
      sources[snapshot.key] = value;
    } catch { reasons.push("SOURCE_INVALID"); }
  }
  return { sources, reasons: [...new Set(reasons)], assortment: record(sources.bd_assortment_v1) };
}

/** Strict certification boundary around the existing current recipe calculator.
 * No historical sale input or fallback source is supplied to this projection. */
export async function observeCurrentCost(input: { scope: CostScope; snapshots: StoreSnapshot[]; profileJson: string | null; menuItemId: string; now: string }) {
  const { scope, snapshots, profileJson, menuItemId, now } = input;
  const parsed = parseCostSources(snapshots, scope), reasons = [...parsed.reasons];
  let profile: Record<string, unknown> = {};
  try { profile = record(JSON.parse(profileJson ?? "null")); } catch { reasons.push("SOURCE_INVALID"); }
  const currency = typeof profile.currency === "string" && /^[A-Z]{3}$/.test(profile.currency) ? profile.currency : null;
  if (!currency) reasons.push("CURRENCY_UNKNOWN");
  const manifest = await Promise.all(snapshots.filter(s => COST_SOURCE_KEYS.includes(s.key)).map(async s => ({ sourceKey: s.key, present: s.dataJson !== null, updatedAt: s.updatedAt, contentRevision: await costRevision([scope, s.key, s.dataJson]) })));
  const profileRevision = await costRevision(profileJson);
  const observation: CostObservationV1 = { metric: "current_recipe_unit_cost", status: "UNKNOWN", value: null, currency, asOf: now, calculationVersion: COST_CALCULATION_VERSION, recipeId: null, recipeVersion: null, reasonCodes: reasons, quality: { availability: reasons.length ? "UNAVAILABLE" : "AVAILABLE", scopeValid: !reasons.includes("SCOPE_CONFLICT"), freshness: reasons.length ? "UNAVAILABLE" : "CURRENT_READ" }, sourceManifest: manifest, profileRevision, observationRevision: "", evidence: [] };
  const items = Array.isArray(parsed.assortment.menuItems) ? parsed.assortment.menuItems.map(record) : [];
  const matches = items.filter(item => item.id === menuItemId);
  const identityValid = canonicalItemId(menuItemId) && matches.length <= 1 && items.every(item => canonicalItemId(item.id)) && new Set(items.map(item => item.id)).size === items.length;
  if (!identityValid) observation.reasonCodes.push("SOURCE_INVALID");
  const item = matches.length === 1 ? matches[0] : null;
  let applicable = item !== null && item.active !== false && item.consumptionMode === "RECIPE";
  // Absence cannot certify deletion if the authoritative menu source is unavailable.
  if (!parsed.sources.bd_assortment_v1 || !identityValid) applicable = true;
  let eligible = false;
  if (item && identityValid && !parsed.reasons.length) {
    observation.evidence.push(await boundSource(scope, "bd_assortment_v1.menuItems", item, menuItemId));
    const cards = (parsed.assortment.recipes as unknown[]).map(record).filter(card => (card.menuItemId === menuItemId || card.ownerId === menuItemId) && !["superseded", "inactive"].includes(String(card.lifecycleStatus)) && card.reviewStatus !== "superseded" && card.status !== "superseded" && card.current !== false && card.active !== false);
    const conflicting = cards.some(card => card.menuItemId && card.ownerId && card.menuItemId !== card.ownerId);
    const approved = cards.filter(card => card.status === "confirmed" && card.reviewStatus === "approved");
    // A separate pending draft never supersedes a unique approved current card.
    const current = approved.length === 1 && cards.every(card => card === approved[0] || card.currentDraft === true) ? approved : cards;
    if (conflicting || current.length > 1) observation.reasonCodes.push("RECIPE_AMBIGUOUS");
    else {
      const card = current[0];
      if (card && (!canonicalItemId(card.id) || !Array.isArray(card.ingredients) || card.version != null && (!Number.isSafeInteger(Number(card.version)) || Number(card.version) < 1))) observation.reasonCodes.push("SOURCE_INVALID");
      if (card && canonicalItemId(card.id)) {
        observation.recipeId = card.id;
        observation.recipeVersion = Number.isFinite(Number(card.version)) ? Number(card.version) : 1;
        observation.evidence.push(await boundSource(scope, "bd_assortment_v1.recipes", card, card.id));
      }
      const primary: CostReason | null = !card ? "RECIPE_MISSING" : !Array.isArray(card.ingredients) || !card.ingredients.length ? "RECIPE_EMPTY" : card.status !== "confirmed" || card.reviewStatus !== "approved" ? "RECIPE_UNAPPROVED" : null;
      if (primary) { observation.reasonCodes.push(primary); eligible = applicable; }
      else if (applicable && card && canonicalItemId(card.id)) {
        const analytics = buildAssortmentAnalytics({ assortment: { ...parsed.assortment, menuItems: [item] }, purchaseDocuments: parsed.sources.bd_purchase_documents as unknown[], stockMovements: parsed.sources.bd_stock_movements as unknown[], ...scope, now: new Date(now) });
        const metric = analytics.menuItems.find(metric => metric.id === menuItemId);
        if (metric && metric.recipeId === card.id && metric.consumptionStatus === "CONFIGURED" && metric.recipeCostStatus !== "UNKNOWN" && typeof metric.recipeCost === "number" && Number.isFinite(metric.recipeCost) && metric.recipeCost >= 0 && metric.costCurrency === currency && currency) {
          for (const key of ["bd_purchase_documents", "bd_stock_movements"]) observation.evidence.push(await boundSource(scope, key, parsed.sources[key]));
          observation.status = metric.recipeCost === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE";
          observation.value = metric.recipeCost;
        } else {
          observation.reasonCodes.push(metric?.costCurrency && metric.costCurrency !== currency ? "CURRENCY_UNKNOWN" : metric?.missingPriceCount ? "PRICE_UNKNOWN" : "UNIT_UNKNOWN");
        }
      } else if (applicable) observation.reasonCodes.push("SOURCE_INVALID");
    }
  }
  observation.reasonCodes = [...new Set(observation.reasonCodes)];
  if (observation.reasonCodes.some(code => ["SOURCE_INVALID", "SOURCE_MISSING", "SCOPE_CONFLICT", "CURRENCY_UNKNOWN", "RECIPE_AMBIGUOUS", "SOURCE_CHANGED"].includes(code))) {
    observation.status = "UNKNOWN"; observation.value = null; eligible = false;
    observation.quality.availability = "UNAVAILABLE";
    observation.quality.freshness = observation.reasonCodes.includes("SOURCE_CHANGED") ? "STALE" : "UNAVAILABLE";
  } else if (observation.status === "UNKNOWN") observation.quality.availability = "PARTIAL";
  observation.observationRevision = await costRevision({ scope, menuItemId, manifest, profileRevision, status: observation.status, value: observation.value, reasons: observation.reasonCodes, applicable });
  return { observation, eligible, applicable, itemName: typeof item?.name === "string" ? item.name.slice(0, 240) : menuItemId };
}

/** Read contracts only: canonical domain records remain the source of truth. */
export const EVIDENCE_CONTRACT_VERSION = 1 as const;
export const MAX_EVIDENCE_REFERENCES = 20;
export const MAX_EVIDENCE_OFFSET = 10_000;

export type EvidenceScope = { venueId: number; workspaceId: number };
export type ContentRevision = `sha256:${string}`;
export const EVIDENCE_RESOURCE_KINDS = [
  "MENU_ORIGIN", "MENU_SOURCE", "MENU_SOURCE_FILE", "MENU_REVIEWED_INPUT", "MENU_CONFIRMATION", "MENU_RECIPE", "MENU_TAXONOMY",
  "DAILY_REVENUE", "CAPTURED_COST", "CAPTURED_RECIPE", "CAPTURED_INGREDIENT", "NOMENCLATURE",
  "SALE_EVENT", "CASH_SHIFT", "FINANCE_REVENUE", "MENU_ITEM", "MENU_INGESTION_DRAFT",
  "SALES_DOCUMENT", "WAREHOUSE_MOVEMENT", "PURCHASE_DOCUMENT", "INVENTORY_DOCUMENT",
  "WRITEOFF_DOCUMENT", "OPERATIONAL_REPORT", "INTEGRATION_EVENT", "REVIEW", "PAYROLL_ENTRY",
] as const;
export type EvidenceResourceKind = typeof EVIDENCE_RESOURCE_KINDS[number];
type ReferenceBase = EvidenceScope & {
  contractVersion: typeof EVIDENCE_CONTRACT_VERSION;
  id: string;
  expectedRevision?: ContentRevision;
};
/** IDs are references, never capabilities. Every resolve reauthorizes the scope. */
export type EvidenceReference = {
  [K in EvidenceResourceKind]: ReferenceBase & { kind: K } &
    (K extends "MENU_SOURCE_FILE" | "MENU_REVIEWED_INPUT" | "MENU_CONFIRMATION" | "MENU_RECIPE" | "SALE_EVENT" | "MENU_INGESTION_DRAFT" | "CAPTURED_COST" | "CAPTURED_RECIPE" | "CAPTURED_INGREDIENT" ? { partId?: string } : { partId?: never }) & (K extends "CAPTURED_INGREDIENT" ? { ingredientId: string } : { ingredientId?: never });
}[EvidenceResourceKind];
export type TraceTarget = { type: "EVIDENCE_RESOURCE"; reference: EvidenceReference };
export type Finality = "PROVISIONAL" | "FINAL" | "UNKNOWN";
export type Availability = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
export type EvidenceStatus = "COMPLETE" | "PARTIAL" | "NONE";
export type RevenueSourceType = "BARDOC_POS" | "MANUAL_SUMMARY" | "IMPORT" | "INTEGRATION" | "LEGACY_UNKNOWN";
export type MenuSourceType = "MANUAL" | "SCAN" | "IMPORT" | "LEGACY_UNKNOWN";
export type EvidenceDiagnostic =
  | "NO_HISTORICAL_SNAPSHOT" | "PARTIAL_EVIDENCE" | "SOURCE_UNKNOWN"
  | "SOURCE_METADATA_MISSING" | "RECORD_NEEDS_REVIEW" | "RELATIONS_RESTRICTED"
  | "RELATED_EVIDENCE_UNAVAILABLE" | "RELATIONS_PAGINATED" | "FRESHNESS_POLICY_UNDEFINED"
  | "REVENUE_READ_MODEL_MISMATCH" | "COST_SNAPSHOT_MISSING" | "COST_READ_MODEL_MISMATCH"
  | "COST_UNKNOWN" | "COST_PARTIAL" | "CURRENT_DEFINITION_ONLY"
  | "SOURCE_VALUES_NOT_RETAINED" | "CONFIRMATION_RECORD_MISSING" | "ORIGIN_UNKNOWN" | "ORIGIN_AMBIGUOUS"
  | "CURRENT_MENU_CHANGED" | "HISTORICAL_RECIPE_NOT_RETAINED";
export type FreshnessBasis = {
  basis: "RECORD" | "SOURCE_SYNC" | "STORE_FALLBACK" | "UNKNOWN";
  timestamp: string | null;
  assessment: "UNKNOWN"; // No freshness threshold is invented by this foundation.
};
export type FactPeriod = {
  start: string; end: string; endInclusive: boolean; timezone?: string;
};
type FactBase = EvidenceScope & {
  contractVersion: 1;
  factId: string;
  revision: ContentRevision;
  sourceRef: EvidenceReference | null;
  evidenceRefs: readonly EvidenceReference[]; // Producers must use boundedEvidenceReferences.
  finality: Finality;
  availability: Availability;
  evidenceStatus: EvidenceStatus;
  observedAt?: string;
  effectiveAt?: string;
  updatedAt?: string;
  freshness: FreshnessBasis;
  diagnostics: readonly EvidenceDiagnostic[];
  traceTarget: TraceTarget | null;
};
export type CapturedCostStatus = "KNOWN" | "UNKNOWN" | "PARTIAL" | "NONE";
export type CapturedSaleCost = {
  saleId: string; saleLineId: string | null; menuItemId: string | null;
  quantity: number | null; capturedUnitCost: number | null; capturedTotalCost: number | null;
  costStatus: CapturedCostStatus; canonicalBatchCostStatus: "FULL" | "PARTIAL" | "UNVALUED" | null;
  costMethod: "latest_confirmed_receipt" | "NOT_APPLICABLE" | null;
  unitCostBasis: "CAPTURED_TOTAL_PER_SALE_QUANTITY" | null;
  businessDate: string | null; lifecycle: "POSTED" | "REVERSED";
  currency: string | null;
};
/** Scalar read projections; never persisted as a ledger. */
export type MenuValues = { id: string | null; name: string | null; salePrice: number | null; currency: string | null; sectionId: string | null; taxonomyCategoryId: string | null; subcategoryId: string | null; consumptionMode: string | null; type: string | null; active: boolean | null };
export type MenuConfirmationOutcome = "ADDED" | "CHANGED" | "UNCHANGED" | "UNKNOWN";
export type MenuOriginView = { menuItemId: string; currentMenu: MenuValues; originSourceType: MenuSourceType; originDraftId: string | null; originRowId: string | null; confirmationResult: MenuConfirmationOutcome | null; latestConfirmationDraftId: string | null; latestConfirmationRowId: string | null; latestConfirmationResult: MenuConfirmationOutcome | null; currentMatchesConfirmed: boolean | null; originalSourceValuesAvailable: false };
export type BusinessFact =
  | (FactBase & MenuOriginView & { factType: "MENU_ORIGIN"; value: string; unit: "IDENTITY" })
  | (FactBase & CapturedSaleCost & { factType: "SALE_CAPTURED_COST"; value: number | null; unit: "MONEY" })
  | (FactBase & {
    factType: "DAILY_REVENUE"; businessDate: string; period?: never;
    value: number | null; unit: "MONEY"; currency: string | null; sourceType: RevenueSourceType;
  })
  | (FactBase & {
    factType: "CURRENT_MENU_SALE_PRICE"; menuItemId: string; businessDate?: never; period?: never;
    value: number | null; unit: "MONEY_PER_SALE"; currency: string | null; sourceType: MenuSourceType;
  });
export type BusinessFactReadModel = {
  contractVersion: 1; asOf: string; fact: BusinessFact;
};
export type FactIdentityInput = EvidenceScope & (
  | { factType: "DAILY_REVENUE"; businessDate: string }
  | { factType: "MENU_ORIGIN"; menuItemId: string }
  | { factType: "CURRENT_MENU_SALE_PRICE"; menuItemId: string }
  | { factType: "SALE_CAPTURED_COST"; saleId: string; saleLineId?: string }
);
export function businessFactIdentity(input: FactIdentityInput): string {
  const key = input.factType === "DAILY_REVENUE" ? input.businessDate : input.factType === "SALE_CAPTURED_COST"
    ? JSON.stringify([input.saleId, input.saleLineId ?? null]) : input.menuItemId;
  return `fact:v1:${input.workspaceId}:${input.venueId}:${input.factType}:${encodeURIComponent(key)}`;
}
export function boundedEvidenceReferences(refs: readonly EvidenceReference[]) {
  return { evidenceRefs: refs.slice(0, MAX_EVIDENCE_REFERENCES), truncated: refs.length > MAX_EVIDENCE_REFERENCES };
}

export type EvidenceRelation = {
  type: "belongs_to" | "derived_from" | "confirmed_for" | "current_definition" | "compensates";
  reference: EvidenceReference;
};
type MoneyProjection = { currency: string | null; revenue: number | null; businessDate: string | null };
export type EvidenceProjection =
  | (MenuOriginView & { type: "MENU_ORIGIN" })
  | { type: "MENU_SOURCE"; sourceType: MenuSourceType; draftId: string; sourceFileCount: number; originalValues: null; recognitionRecordAvailable: false; originalUploadHashAvailable: false }
  | { type: "MENU_SOURCE_FILE"; draftId: string; fileId: string; name: string | null; mimeType: string | null; sizeBytes: number | null; uploadedAt: string | null; contentBinding: { type: "R2_ETAG"; value: string } | null; downloadPath: string }
  | { type: "MENU_REVIEWED_INPUT"; draftId: string; rowId: string; values: MenuValues; targetMenuItemId: string | null; reviewed: boolean | null; decision: "pending" | "apply" | "skip" | null; draftLifecycle: string | null; validationState: string | null; outcome: "ADDED" | "CHANGED" | "UNCHANGED" | "SKIPPED" | "INVALID" | "CONFLICT" | "UNKNOWN"; outcomeBasis: "CONFIRMATION_AUDIT" | "CURRENT_VALIDATION_PREVIEW" | "STORED_DECISION"; sourceValues: null }
  | { type: "MENU_CONFIRMATION"; draftId: string; rowId: string; menuItemId: string; outcome: MenuConfirmationOutcome; decision: "apply"; reviewed: true; draftRevision: number | null; confirmedAt: string | null; validationHash: string | null; reviewedValues: MenuValues; appliedValues: MenuValues; currentMatchesConfirmed: boolean | null; recordBasis: "EXISTING_CONFIRMATION_AUDIT" }
  | { type: "MENU_RECIPE"; menuItemId: string; recipeId: string; version: number | null; status: string | null; reviewStatus: string | null; lifecycleStatus: string | null; current: boolean | null; ingredientCount: number; currentDefinitionOnly: true; historicalConfirmationSnapshotAvailable: false }
  | { type: "MENU_TAXONOMY"; menuItemId: string; basis: "STORED_TREE" | "DEFAULT_FALLBACK"; section: { id: string; name: string; active: boolean } | null; category: { id: string; name: string; active: boolean } | null; subcategory: { id: string; name: string; active: boolean } | null; currentDefinitionOnly: true }
  | (CapturedSaleCost & { type: "CAPTURED_COST" })
  | { type: "CAPTURED_RECIPE"; saleId: string; saleLineId: string; recipeId: string | null; recipeVersion: number | null;
      capturedAt: string | null; consumptionMode: string | null; menuItemId: string | null; menuItemName: string | null; ingredientCount: number }
  | { type: "CAPTURED_INGREDIENT"; saleId: string; saleLineId: string; ingredientId: string; nomenclatureItemId: string | null;
      productKey: string | null; name: string | null; recipeQuantity: number | null; recipeUnit: string | null;
      baseQuantityPerPortion: number | null; baseQuantityTotal: number | null; baseUnit: string | null; warehouseId: string | null;
      unitCost: number | null; totalCost: number | null; costStatus: string | null; costBasisMethod: string | null;
      currency: string | null; costSourceDocumentId: string | null; costSourceLineId: string | null; costEffectiveDate: string | null;
      conversion: { inputQuantity: number | null; inputUnit: string | null; factor: number | null; outputUnit: string | null; source: string | null } | null }
  | { type: "NOMENCLATURE"; id: string; productKey: string | null; name: string | null; unit: string | null; currentDefinitionOnly: true }
  | { type: "WAREHOUSE_MOVEMENT"; movementType: string | null; warehouseId: string | null; productKey: string | null;
      quantity: number | null; unit: string | null; direction: "IN" | "OUT" | "ZERO" | null; costAmount: number | null;
      costStatus: string | null; currency: string | null; businessDate: string | null; sourceDocumentId: string | null;
      sourceLineId: string | null; saleId: string | null; saleLineId: string | null; originalMovementId: string | null;
      lifecycle: string | null; recordBasis: "MOVEMENT_STORE" | "SALE_ORIGINAL_MOVEMENT" }
  | (MoneyProjection & { type: "DAILY_REVENUE"; sourceType: RevenueSourceType })
  | (MoneyProjection & { type: "SALE_EVENT"; lifecycle: "POSTED" | "REVERSED" | null; sourceType: RevenueSourceType })
  | { type: "SALE_LINE"; menuItemId: string | null; quantity: number | null; unitPrice: number | null; total: number | null; currency: string | null }
  | (MoneyProjection & { type: "CASH_SHIFT" | "FINANCE_REVENUE"; lifecycle: "OPEN" | "CLOSED" | null; sourceType: RevenueSourceType; receipts: number | null })
  | { type: "MENU_ITEM"; name: string | null; salePrice: number | null; currency: string | null; active: boolean | null; sourceType: MenuSourceType }
  | { type: "MENU_INGESTION_DRAFT"; lifecycle: "DRAFT" | "VALIDATED" | "CONFIRMED" | "CANCELLED" | null; sourceType: MenuSourceType; revisionNumber: number | null; rowCount: number | null }
  | { type: "MENU_INGESTION_LINE"; decision: "pending" | "apply" | "skip" | null; reviewed: boolean | null };
export type ResolvedEvidence = {
  reference: EvidenceReference & { expectedRevision: ContentRevision };
  revision: ContentRevision;
  binding: "EXPECTED_REVISION" | "CURRENT_RECORD";
  projection: EvidenceProjection;
  finality: Finality;
  availability: "AVAILABLE" | "PARTIAL";
  evidenceStatus: "PARTIAL"; // Resolving one record does not certify its entire provenance graph.
  observedAt: string | null;
  updatedAt: string | null;
  freshness: FreshnessBasis;
  relations: EvidenceRelation[];
  page: { limit: number; offset: number; nextOffset: number | null };
  traceTarget: TraceTarget;
};
type ResolutionBase = { contractVersion: 1; asOf: string; diagnostics: EvidenceDiagnostic[] };
export type EvidenceResolution = ResolutionBase & (
  | { outcome: "resolved" | "partial"; code: "RESOLVED" | "PARTIAL_EVIDENCE"; evidence: ResolvedEvidence }
  | { outcome: "unavailable"; code: "EVIDENCE_UNAVAILABLE" }
  | { outcome: "restricted"; code: "ACCESS_DENIED" }
  | { outcome: "changed"; code: "READ_MODEL_CHANGED" }
  | { outcome: "unsupported"; code: "UNSUPPORTED_REFERENCE_KIND" }
);

const resourceId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200 && v === v.trim() && !/[\u0000-\u001f\u007f]/.test(v);
export type ParsedReference =
  | { ok: true; reference: EvidenceReference }
  | { ok: false; code: "INVALID_REFERENCE" }
  | { ok: false; code: "UNSUPPORTED_REFERENCE_KIND"; scope: EvidenceScope };
export function parseEvidenceReference(value: unknown): ParsedReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, code: "INVALID_REFERENCE" };
  const r = value as Record<string, unknown>;
  const allowed = ["contractVersion", "kind", "id", "venueId", "workspaceId", "partId", "ingredientId", "expectedRevision"];
  if (Object.keys(r).some(key => !allowed.includes(key)) || r.contractVersion !== 1
    || typeof r.kind !== "string" || !resourceId(r.id)
    || !Number.isSafeInteger(r.venueId) || Number(r.venueId) <= 0
    || !Number.isSafeInteger(r.workspaceId) || Number(r.workspaceId) <= 0
    || "partId" in r && !resourceId(r.partId)
    || "expectedRevision" in r && (typeof r.expectedRevision !== "string" || !/^sha256:[a-f0-9]{64}$/.test(r.expectedRevision))) {
    return { ok: false, code: "INVALID_REFERENCE" };
  }
  if (!EVIDENCE_RESOURCE_KINDS.includes(r.kind as EvidenceResourceKind)) {
    return { ok: false, code: "UNSUPPORTED_REFERENCE_KIND", scope: { venueId: Number(r.venueId), workspaceId: Number(r.workspaceId) } };
  }
  if ("ingredientId" in r && (r.kind !== "CAPTURED_INGREDIENT" || !resourceId(r.ingredientId))
    || r.kind === "CAPTURED_INGREDIENT" && (!resourceId(r.partId) || !resourceId(r.ingredientId))
    || r.kind === "CAPTURED_RECIPE" && !resourceId(r.partId)) return { ok: false, code: "INVALID_REFERENCE" };
  if (["MENU_SOURCE_FILE", "MENU_REVIEWED_INPUT", "MENU_CONFIRMATION", "MENU_RECIPE"].includes(r.kind) && !resourceId(r.partId)) return { ok: false, code: "INVALID_REFERENCE" };
  if ("partId" in r && !["MENU_SOURCE_FILE", "MENU_REVIEWED_INPUT", "MENU_CONFIRMATION", "MENU_RECIPE", "SALE_EVENT", "MENU_INGESTION_DRAFT", "CAPTURED_COST", "CAPTURED_RECIPE", "CAPTURED_INGREDIENT"].includes(r.kind)) return { ok: false, code: "INVALID_REFERENCE" };
  return { ok: true, reference: r as EvidenceReference };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Bind the full canonical parent, including children, but never persist a copy. */
export async function evidenceContentRevision(reference: EvidenceReference, record: unknown): Promise<ContentRevision> {
  const { contractVersion, kind, id, venueId, workspaceId, partId, ingredientId } = reference;
  const content = canonical({ contractVersion, kind, id, venueId, workspaceId, partId: partId ?? null, ...(ingredientId !== undefined ? { ingredientId } : {}), record });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `sha256:${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")}`;
}

export type DailyRevenueFact = Extract<BusinessFact, { factType: "DAILY_REVENUE" }>;
export type EvidencePage = { limit: number; offset: number; nextOffset: number | null };
export type DailyRevenueResolution = ResolutionBase & (
  | { outcome: "resolved" | "partial"; code: "RESOLVED" | "PARTIAL_EVIDENCE"; fact: DailyRevenueFact;
      binding: "CURRENT_RECORD" | "EXPECTED_REVISION"; page: EvidencePage }
  | { outcome: "unavailable"; code: "EVIDENCE_UNAVAILABLE" }
  | { outcome: "restricted"; code: "ACCESS_DENIED" }
  | { outcome: "changed"; code: "READ_MODEL_CHANGED" }
);

export type SaleCostFact = Extract<BusinessFact, { factType: "SALE_CAPTURED_COST" }>;
export type SaleCostResolution = { contractVersion: 1; asOf: string; diagnostics: EvidenceDiagnostic[] } & (
  | { outcome: "resolved" | "partial"; code: "RESOLVED" | "PARTIAL_EVIDENCE"; fact: SaleCostFact; binding: "CURRENT_RECORD" | "EXPECTED_REVISION"; page: EvidencePage }
  | { outcome: "unavailable"; code: "EVIDENCE_UNAVAILABLE" }
  | { outcome: "restricted"; code: "ACCESS_DENIED" }
  | { outcome: "changed"; code: "READ_MODEL_CHANGED" }
);

export type MenuOriginFact = Extract<BusinessFact, { factType: "MENU_ORIGIN" }>;
export type MenuOriginResolution = ResolutionBase & (
  | { outcome: "resolved" | "partial"; code: "RESOLVED" | "PARTIAL_EVIDENCE"; fact: MenuOriginFact; binding: "CURRENT_RECORD" | "EXPECTED_REVISION"; page: EvidencePage }
  | { outcome: "unavailable"; code: "EVIDENCE_UNAVAILABLE" }
  | { outcome: "restricted"; code: "ACCESS_DENIED" }
  | { outcome: "changed"; code: "READ_MODEL_CHANGED" }
);

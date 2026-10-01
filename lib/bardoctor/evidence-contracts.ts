/** Read contracts only: canonical domain records remain the source of truth. */
export const EVIDENCE_CONTRACT_VERSION = 1 as const;
export const MAX_EVIDENCE_REFERENCES = 20;
export const MAX_EVIDENCE_OFFSET = 10_000;

export type EvidenceScope = { venueId: number; workspaceId: number };
export type ContentRevision = `sha256:${string}`;
export const EVIDENCE_RESOURCE_KINDS = [
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
    (K extends "SALE_EVENT" | "MENU_INGESTION_DRAFT" ? { partId?: string } : { partId?: never });
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
  | "RELATED_EVIDENCE_UNAVAILABLE" | "RELATIONS_PAGINATED" | "FRESHNESS_POLICY_UNDEFINED";
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
/** Two small scalar contracts, without a persisted ledger or domain projections yet. */
export type BusinessFact =
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
  | { factType: "CURRENT_MENU_SALE_PRICE"; menuItemId: string }
);
export function businessFactIdentity(input: FactIdentityInput): string {
  const key = input.factType === "DAILY_REVENUE" ? input.businessDate : input.menuItemId;
  return `fact:v1:${input.workspaceId}:${input.venueId}:${input.factType}:${encodeURIComponent(key)}`;
}
export function boundedEvidenceReferences(refs: readonly EvidenceReference[]) {
  return { evidenceRefs: refs.slice(0, MAX_EVIDENCE_REFERENCES), truncated: refs.length > MAX_EVIDENCE_REFERENCES };
}

export type EvidenceRelation = {
  type: "belongs_to" | "derived_from" | "confirmed_for";
  reference: EvidenceReference;
};
type MoneyProjection = { currency: string | null; revenue: number | null; businessDate: string | null };
export type EvidenceProjection =
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
  const allowed = ["contractVersion", "kind", "id", "venueId", "workspaceId", "partId", "expectedRevision"];
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
  if ("partId" in r && !["SALE_EVENT", "MENU_INGESTION_DRAFT"].includes(r.kind)) return { ok: false, code: "INVALID_REFERENCE" };
  return { ok: true, reference: r as EvidenceReference };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Bind the full canonical parent, including children, but never persist a copy. */
export async function evidenceContentRevision(reference: EvidenceReference, record: unknown): Promise<ContentRevision> {
  const { contractVersion, kind, id, venueId, workspaceId, partId } = reference;
  const content = canonical({ contractVersion, kind, id, venueId, workspaceId, partId: partId ?? null, record });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `sha256:${Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")}`;
}

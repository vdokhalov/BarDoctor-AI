import { getD1 } from "../../db";
import { hasPermission, type AuthenticatedAccount } from "./access-control";
import { readStoreSnapshots } from "./store-cas";
import { operationalDay } from "./operational-day";
import { evidenceRowBelongs, revenueEvidenceRevision, type RevenueEvidenceRow as Row } from "./revenue-evidence";
import {
  boundedEvidenceReferences, businessFactIdentity, evidenceContentRevision, parseEvidenceReference,
  type DailyRevenueFact, type DailyRevenueResolution, type EvidenceDiagnostic, type EvidenceReference, type EvidenceScope,
} from "./evidence-contracts";

export type RevenueEvidenceContext = EvidenceScope & { account: AuthenticatedAccount };
export function validBusinessDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
const instant = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const latest = (values: unknown[]) => values.filter(instant).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1);

/** SELECT-only projection of the same three revenue inputs used by Operational Day.
 * Sales data is read internally under the existing shifts.view daily-read boundary;
 * IDs, child references and payloads still require sales.view on EVERY resolve.
 */
export async function readDailyRevenue(context: RevenueEvidenceContext, reference: EvidenceReference,
  limit: number, offset: number, asOf: string): Promise<DailyRevenueResolution> {
  const base = { contractVersion: 1 as const, asOf };
  const unavailable = (diagnostics: EvidenceDiagnostic[] = []): DailyRevenueResolution => ({ ...base, outcome: "unavailable", code: "EVIDENCE_UNAVAILABLE", diagnostics });
  if (reference.venueId !== context.venueId || reference.workspaceId !== context.workspaceId) return unavailable();
  if (!hasPermission(context.account, "shifts.view")) return { ...base, outcome: "restricted", code: "ACCESS_DENIED", diagnostics: [] };
  if (!validBusinessDate(reference.id)) return unavailable(["RECORD_NEEDS_REVIEW"]);
  const keys = ["bd_finance_revenue", "bd_sales_events_v1", "bd_sales_documents"];
  const snapshots = await readStoreSnapshots(getD1(), context.account.id, keys);
  let collections: Row[][];
  try {
    collections = keys.map(key => {
      const value: unknown = JSON.parse(snapshots.find(s => s.key === key)?.dataJson ?? "[]");
      if (!Array.isArray(value) || value.some(row => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("REVENUE_STORE_NEEDS_REVIEW");
      return value as Row[];
    });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error && error.message === "REVENUE_STORE_NEEDS_REVIEW") return unavailable(["RECORD_NEEDS_REVIEW"]);
    throw error;
  }
  const businessDate = reference.id;
  // Operational Day inherits the verified data-owner namespace. An explicit
  // contradictory workspace must not be filtered into a different daily total.
  const scopeNeedsReview = collections.some((rows, i) => rows.some(row =>
    (row.venueId === context.venueId || i !== 1 && row.venueId == null)
    && (i === 1 ? row.businessDate : row.date) === businessDate
    && row.workspaceId != null && row.workspaceId !== context.workspaceId));
  const [revenues, events, documents] = collections.map((rows, i) => rows.filter(row =>
    evidenceRowBelongs(row, context, i === 1) && (i === 1 ? row.businessDate : row.date) === businessDate));
  const salesVisible = hasPermission(context.account, "sales.view");
  // Bind all relevant canonical inputs before checking disappearance/inconsistency.
  // No persisted snapshot; asOf and unrelated store rows are deliberately excluded.
  const revision = await evidenceContentRevision(reference, { revenues, events, documents, salesVisible, scopeNeedsReview });
  if (reference.expectedRevision && reference.expectedRevision !== revision) {
    return { ...base, outcome: "changed", code: "READ_MODEL_CHANGED", diagnostics: ["NO_HISTORICAL_SNAPSHOT"] };
  }
  if (scopeNeedsReview) return unavailable(["RECORD_NEEDS_REVIEW"]);
  if (!revenues.length && !events.length && !documents.length) return unavailable();
  const day = operationalDay({ venueId: context.venueId, businessDate, asOf, revenues, events, documents });
  // Use the canonical consistency check per parent too: offsetting bad rows must
  // not make an aggregate look verified. Never add a second revenue formula.
  const inconsistent = day.revenue.consistency === "MISMATCH" || revenues.some(row => row.revenueSource === "sales_events_v1"
    && operationalDay({ venueId: context.venueId, businessDate, asOf, revenues: [row],
      events: events.filter(e => e.revenueRowId === row.id) }).revenue.consistency === "MISMATCH");
  if (inconsistent) return unavailable(["REVENUE_READ_MODEL_MISMATCH"]);
  const diagnostics: EvidenceDiagnostic[] = ["FRESHNESS_POLICY_UNDEFINED"];
  const validId = (row: Row, kind: "FINANCE_REVENUE" | "SALE_EVENT") => typeof row.id === "string"
    && parseEvidenceReference({ contractVersion: 1, kind, id: row.id, venueId: context.venueId, workspaceId: context.workspaceId }).ok;
  const uniqueIds = (rows: Row[]) => new Set(rows.map(row => row.id)).size === rows.length;
  // A total can be read with incomplete evidence, but ambiguous identities cannot
  // be emitted as resolvable evidence or certified as a complete proof.
  const unambiguous = (rows: Row[], collection: Row[], strictVenue: boolean) => rows.every(row => collection.filter(candidate =>
    evidenceRowBelongs(candidate, context, strictVenue) && candidate.id === row.id).length === 1);
  if (!uniqueIds(revenues) || !uniqueIds(events) || !unambiguous(revenues, collections[0], false)
    || !unambiguous(events, collections[1], true)) return unavailable(["RECORD_NEEDS_REVIEW"]);
  const currencies = new Set([...revenues, ...events].map(row => row.currency));
  const currency = currencies.size === 1 && typeof [...currencies][0] === "string" && /^[A-Z]{3}$/.test(String([...currencies][0]))
    ? String([...currencies][0]) : null;
  const metadataValid = currency !== null && [...revenues, ...events].every(row => typeof row.revenue === "number" && Number.isFinite(row.revenue));
  const identityValid = revenues.every(row => validId(row, "FINANCE_REVENUE")) && events.every(row => validId(row, "SALE_EVENT"));
  const cashLinked = revenues.every(row => ["open", "closed"].includes(String(row.closingStatus)))
    && events.every(event => event.shiftId === event.revenueRowId && revenues.some(row => row.id === event.shiftId));
  const complete = day.revenue.source === "BARDOC_POS" && day.revenue.consistency === "MATCH"
    && identityValid && metadataValid && cashLinked && salesVisible;
  if (!metadataValid || !identityValid) diagnostics.push("RECORD_NEEDS_REVIEW");
  if (day.revenue.source === "LEGACY_UNKNOWN") diagnostics.push("SOURCE_UNKNOWN");
  if (!salesVisible && revenues.some(row => row.revenueSource === "sales_events_v1")) diagnostics.push("RELATIONS_RESTRICTED");
  if (!complete) diagnostics.push("PARTIAL_EVIDENCE");
  if (day.revenue.source === "BARDOC_POS" && (!cashLinked || day.revenue.consistency !== "MATCH")) diagnostics.push("RELATED_EVIDENCE_UNAVAILABLE");
  const readableRows = revenues.filter(row => validId(row, "FINANCE_REVENUE"));
  const nextOffset = offset + limit < readableRows.length ? offset + limit : null;
  if (nextOffset !== null || offset > 0) diagnostics.push("RELATIONS_PAGINATED");
  const refs = await Promise.all(readableRows.slice(offset, offset + limit).map(async row => {
    const ref: EvidenceReference = { contractVersion: 1, kind: "FINANCE_REVENUE", id: String(row.id), venueId: context.venueId, workspaceId: context.workspaceId };
    return { ...ref, expectedRevision: await revenueEvidenceRevision(ref, row, salesVisible ? collections[1] : null, context, collections[2]) };
  }));
  const { evidenceRefs } = boundedEvidenceReferences(refs);
  const updatedAt = latest([day.revenue.updatedAt, ...revenues.map(row => row.closedAt), ...events.map(row => row.reversedAt)]);
  const observedAt = latest([...revenues.map(row => row.createdAt), ...events.map(row => row.acceptedAt)]);
  const recordTime = updatedAt ?? observedAt;
  const storeTime = latest(snapshots.map(s => s.updatedAt));
  const bound: EvidenceReference = { ...reference, expectedRevision: revision };
  const fact: DailyRevenueFact = {
    contractVersion: 1, factType: "DAILY_REVENUE", factId: businessFactIdentity({ ...context, factType: "DAILY_REVENUE", businessDate }),
    venueId: context.venueId, workspaceId: context.workspaceId, businessDate, value: day.revenue.amount, unit: "MONEY", currency,
    sourceType: day.revenue.source, finality: day.revenue.status,
    availability: metadataValid ? "AVAILABLE" : "PARTIAL", evidenceStatus: complete ? "COMPLETE" : evidenceRefs.length ? "PARTIAL" : "NONE",
    revision, sourceRef: readableRows.length === 1 ? evidenceRefs[0] ?? null : null, evidenceRefs,
    ...(observedAt ? { observedAt } : {}), ...(updatedAt ? { updatedAt } : {}),
    freshness: { basis: recordTime ? "RECORD" : storeTime ? "STORE_FALLBACK" : "UNKNOWN", timestamp: recordTime ?? storeTime ?? null, assessment: "UNKNOWN" },
    diagnostics, traceTarget: { type: "EVIDENCE_RESOURCE", reference: bound },
  };
  return { ...base, outcome: complete ? "resolved" : "partial", code: complete ? "RESOLVED" : "PARTIAL_EVIDENCE", diagnostics,
    fact, binding: reference.expectedRevision ? "EXPECTED_REVISION" : "CURRENT_RECORD", page: { limit, offset, nextOffset } };
}

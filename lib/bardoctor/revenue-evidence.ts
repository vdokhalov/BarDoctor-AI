import { evidenceContentRevision, type EvidenceReference, type EvidenceScope } from "./evidence-contracts";

export type RevenueEvidenceRow = Record<string, unknown>;
export function evidenceRowBelongs(row: RevenueEvidenceRow, scope: EvidenceScope, strictVenue = false) {
  return (row.venueId === scope.venueId || !strictVenue && row.venueId == null)
    && (row.workspaceId == null || row.workspaceId === scope.workspaceId);
}

/** Same binding for references produced by facts and by the existing resolver. */
export function revenueEvidenceRevision(reference: EvidenceReference, row: RevenueEvidenceRow,
  events: RevenueEvidenceRow[] | null, scope: EvidenceScope, documents: RevenueEvidenceRow[] = []) {
  const sourceEvents = row.revenueSource === "sales_events_v1"
    ? events?.filter(e => evidenceRowBelongs(e, scope, true) && e.revenueRowId === row.id && e.businessDate === row.date) ?? null
    : undefined;
  const sourceDocuments = row.revenueSource === "sales_documents" ? documents.filter(d => evidenceRowBelongs(d, scope)
    && d.date === row.date && d.status === "confirmed") : undefined;
  return evidenceContentRevision(reference, sourceDocuments !== undefined ? { record: row, sourceDocuments }
    : sourceEvents === undefined ? row : { record: row, sourceEvents });
}

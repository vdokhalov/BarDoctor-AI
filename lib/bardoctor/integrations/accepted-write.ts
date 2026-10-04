import type { AuthenticatedAccount } from "../access-control";
import { boundSource, canonicalInputScope, scopedSource, SOURCE_SELECTORS, type CanonicalInputScope } from "../canonical-input-evidence";
import { derivedInputBelongs } from "../derived-input-scope";
import type { EvidenceReference } from "../evidence-contracts";

export type AcceptedRecord = { selector: string; id?: string; data: unknown };
export type AcceptedWrite = { contractVersion: 1; authority: "ACCEPTED_CANONICAL_WRITE"; acceptedAt: string; entities: EvidenceReference[]; historicalReconstruction: false };
/** Called with the actual accepted writer result, never a later DB reread. */
export async function captureAcceptedWrite(account: AuthenticatedAccount, records: AcceptedRecord[], acceptedAt: string, acceptedScope?: CanonicalInputScope): Promise<AcceptedWrite | undefined> {
  const scope = acceptedScope ?? await canonicalInputScope(account);
  if (!scope || scope.dataAccountId !== account.id || scope.venueId !== account.venueId || !records.length || records.some(record => !Object.hasOwn(SOURCE_SELECTORS, record.selector) || record.data == null || record.id && !derivedInputBelongs(record.data, scope))) return undefined;
  return { contractVersion: 1, authority: "ACCEPTED_CANONICAL_WRITE", acceptedAt, entities: await Promise.all(records.map(record => boundSource(scope, record.selector, JSON.parse(JSON.stringify(record.id ? record.data : scopedSource(record.data, scope))), record.id))), historicalReconstruction: false };
}
export function readAcceptedWrite(payload: unknown): AcceptedWrite | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).bardoctorAcceptedWrite;
  if (!value || typeof value !== "object") return null;
  const row = value as AcceptedWrite;
  return row.contractVersion === 1 && row.authority === "ACCEPTED_CANONICAL_WRITE" && row.historicalReconstruction === false && typeof row.acceptedAt === "string" && Array.isArray(row.entities) ? row : null;
}

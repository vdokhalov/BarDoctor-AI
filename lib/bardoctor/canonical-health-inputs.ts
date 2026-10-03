import { getD1 } from "../../db";
import { hasPermission, isAccessRole, permissionPayload, type AuthenticatedAccount } from "./access-control";
import { canReadDiagnosisSources, canReadVenueSource, VENUE_CONTEXT_SOURCES } from "./venue-context-access";
import { buildVenueAIContextFromSources, type StoredVenueValue } from "./venue-ai-context";
import { buildBusinessIntelligenceFromVenueContext } from "./business-intelligence";
import { buildBusinessHealthSnapshot } from "./business-health-snapshot";
import { derivedInputBelongs } from "./derived-input-scope";
import { evidenceContentRevision } from "./evidence-contracts";
import { storeSnapshots } from "./store-cas";
import { reviewsForCurrentGoogleLocation } from "./review-sources";
import { buildHealthOperationsInputs, HEALTH_OPERATIONS_KEYS, MAX_HEALTH_ROWS, MAX_HEALTH_SOURCE_BYTES, type HealthSource } from "./health-operations-inputs";

type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => Boolean(v && typeof v === "object" && !Array.isArray(v));
export const HEALTH_INPUT_KEYS = [...new Set([...Object.values(VENUE_CONTEXT_SOURCES).flat(), ...HEALTH_OPERATIONS_KEYS])];

/** One SELECT snapshot of existing sources, profile and live scope/permissions.
 * No body inputs, new persistence, history reconstruction or source mutation. */
export async function loadCanonicalHealthInputs(account: AuthenticatedAccount, asOf = new Date().toISOString()) {
  const database = getD1();
  const keys = HEALTH_INPUT_KEYS.filter(key => canReadVenueSource(account, key));
  const rows = await database.prepare(`SELECT store_key, CASE WHEN length(data_json)>? THEN NULL ELSE data_json END data_json,updated_at FROM domain_data WHERE account_id=? AND store_key IN (${keys.map(() => "?").join(",") || "NULL"})
    UNION ALL SELECT '__profile__',restaurant_json,updated_at FROM accounts WHERE id=?
    UNION ALL SELECT '__access__',(SELECT json_object('workspaceId',v.workspace_id,'role',vm.role,'permissions',vm.permissions_json) FROM venues v JOIN workspaces w ON w.id=v.workspace_id AND w.status='active' JOIN venue_memberships vm ON vm.venue_id=v.id AND vm.account_id=? AND vm.status='active' JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id AND wm.status='active' WHERE v.id=? AND v.data_account_id=? AND v.status='active' AND vm.id=?),NULL`)
    .bind(MAX_HEALTH_SOURCE_BYTES, account.id, ...keys, account.id, account.actorAccountId, account.venueId, account.id, account.membershipId)
    .all<{ store_key: string; data_json: string | null; updated_at: string | null }>();
  const boundaryRow = rows.results.find(row => row.store_key === "__access__"), profileRow = rows.results.find(row => row.store_key === "__profile__");
  if (!boundaryRow?.data_json || !profileRow) return null;
  const boundary = JSON.parse(boundaryRow.data_json) as Row;
  if (!Number.isSafeInteger(boundary.workspaceId) || !isAccessRole(boundary.role)) return null;
  const currentAccount = { ...account, ...permissionPayload(boundary.role, typeof boundary.permissions === "string" ? boundary.permissions : null) };
  if (!hasPermission(currentAccount, "analysis.run") || !canReadDiagnosisSources(currentAccount)) return { restricted: true as const };
  const scope = { venueId: account.venueId, workspaceId: Number(boundary.workspaceId), dataAccountId: account.id };
  const snapshots = storeSnapshots(rows.results.filter(row => row.data_json != null).map(row => ({ ...row, data_json: row.data_json! })), keys);
  const sources: HealthSource[] = [];
  const stores = new Map<string, StoredVenueValue>();
  const revision = (kind: "OPERATIONAL_REPORT" | "REVIEW", key: string, data: unknown) => evidenceContentRevision({ contractVersion: 1, kind, id: key, venueId: scope.venueId, workspaceId: scope.workspaceId }, { dataAccountId: account.id, data });
  for (const key of HEALTH_INPUT_KEYS) {
    const snapshot = snapshots.find(row => row.key === key), present = rows.results.some(row => row.store_key === key);
    const source: HealthSource = { key, state: "UNAVAILABLE", revision: null, updatedAt: snapshot?.updatedAt ?? null, data: null };
    if (!canReadVenueSource(currentAccount, key)) { source.state = "RESTRICTED"; source.updatedAt = null; sources.push(source); continue; }
    source.revision = await revision("OPERATIONAL_REPORT", key, { present, dataJson: snapshot?.dataJson ?? null, updatedAt: source.updatedAt });
    if (snapshot?.dataJson != null) {
      try {
        const raw: unknown = JSON.parse(snapshot.dataJson);
        const arrays = object(raw) ? Object.values(raw).filter(Array.isArray) : [raw];
        const valid = key === "bd_assortment_v1" ? object(raw) && Array.isArray(raw.stockBalances) : Array.isArray(raw) || !HEALTH_OPERATIONS_KEYS.includes(key) && object(raw);
        if (!valid || arrays.some(value => Array.isArray(value) && (value.length > MAX_HEALTH_ROWS || value.some(child => !object(child))))) source.state = "PARTIAL";
        else {
          source.state = derivedInputBelongs(raw, scope) ? "AVAILABLE" : "PARTIAL";
          // Exclude explicit foreign ownership at every level before summaries.
          source.data = Array.isArray(raw) ? raw.filter(value => derivedInputBelongs(value, scope)) : object(raw) ? Object.fromEntries(Object.entries(raw).map(([field, value]) => [field, Array.isArray(value) ? value.filter(child => derivedInputBelongs(child, scope)) : derivedInputBelongs(value, scope) ? value : null])) : null;
          if (key === "bd_guest_reviews" && Array.isArray(source.data)) {
            source.data = await reviewsForCurrentGoogleLocation(account.id, source.data as Row[]);
            source.revision = await revision("REVIEW", key, { sourceRevision: source.revision, selected: source.data });
          }
          stores.set(key, { data: source.data, updatedAt: source.updatedAt ?? "" });
        }
      } catch { source.state = "PARTIAL"; }
    } else if (present) source.state = "PARTIAL";
    sources.push(source);
  }
  let profile: Row = {};
  try { const raw: unknown = JSON.parse(profileRow.data_json ?? "{}"); if (object(raw)) profile = raw; } catch { /* unknown profile */ }
  const context = buildVenueAIContextFromSources("diagnosis", { access: currentAccount, workspaceId: scope.workspaceId, accountProfile: profile, accountUpdatedAt: profileRow.updated_at, stores, now: new Date(asOf) });
  const operations = buildHealthOperationsInputs({ sources, ...scope, profile, asOf, currency: context.accountingCurrency });
  const inputManifest = { contractVersion: 1 as const, scope, sources: sources.map(source => ({ key: source.key, state: source.state, revision: source.revision, updatedAt: source.updatedAt })), profileRevision: await revision("OPERATIONAL_REPORT", "__profile__", profileRow.data_json) };
  const inputRevision = await revision("OPERATIONAL_REPORT", "business-health-inputs", { inputManifest, operations, localDate: operations.counters.unclosedShifts.window });
  const intelligence = buildBusinessIntelligenceFromVenueContext({ venueId: account.venueId, context, canonicalOperations: operations });
  const baseSnapshot = buildBusinessHealthSnapshot({ venueId: account.venueId, dataAccountId: account.id, intelligence, context });
  const snapshot = { ...baseSnapshot, snapshotId: `${baseSnapshot.snapshotId}:${inputRevision}`, inputRevision, inputManifest, operationsInputs: operations };
  return { restricted: false as const, context, intelligence, snapshot, account: currentAccount };
}

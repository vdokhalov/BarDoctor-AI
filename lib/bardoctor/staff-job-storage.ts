import { getTableColumns, sql } from "drizzle-orm";
import { venueInvites, venueMemberships } from "../../db/schema";

// Server-owned display metadata, deliberately separate from editable permissions.
// v505 permission edits cannot erase it. Generic store APIs reject unknown keys.
// No migration ledger, historical SQL, employee linkage or invite code is changed.
export const MEMBER_JOB_PREFIX = "__bd_staff_job_v1__:";
export const INVITE_JOB_PREFIX = "__bd_invite_job_v1__:";
export const memberJobKey = (venueId: number) => MEMBER_JOB_PREFIX + venueId;
export const inviteJobKey = (codeHash: string) => INVITE_JOB_PREFIX + codeHash;

export const memberJobTitle = sql<string | null>`CASE WHEN ${venueMemberships.role}='cashier' THEN (SELECT json_extract(j.data_json, '$') FROM domain_data j
  WHERE j.account_id=${venueMemberships.accountId} AND j.store_key=${MEMBER_JOB_PREFIX} || ${venueMemberships.venueId}) ELSE NULL END`;
export const inviteJobTitle = sql<string | null>`CASE WHEN ${venueInvites.role}='cashier' THEN (SELECT json_extract(j.data_json, '$') FROM domain_data j
  WHERE j.account_id=${venueInvites.createdByAccountId} AND j.store_key=${INVITE_JOB_PREFIX} || ${venueInvites.codeHash}) ELSE NULL END`;
export const membershipWithJobTitle = { ...getTableColumns(venueMemberships), jobTitle: memberJobTitle };
export const inviteWithJobTitle = { ...getTableColumns(venueInvites), jobTitle: inviteJobTitle };

export function setMemberJob(db: D1Database, accountId: number, venueId: number, title: string | null, now: string) {
  return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
    .bind(accountId, memberJobKey(venueId), JSON.stringify(title), now);
}

import { getTableColumns, sql } from "drizzle-orm";
import { venueInvites, venueMemberships } from "../../db/schema";

// Server-owned display metadata, deliberately separate from editable permissions.
// v505 permission edits cannot erase it. Generic store APIs reject unknown keys.
// No migration ledger, historical SQL, employee linkage or invite code is changed.
export const MEMBER_JOB_PREFIX = "__bd_staff_job_v1__:";
export const INVITE_JOB_PREFIX = "__bd_invite_job_v1__:";
export const memberJobKey = (venueId: number) => MEMBER_JOB_PREFIX + venueId;
export const inviteJobKey = (codeHash: string) => INVITE_JOB_PREFIX + codeHash;

// The fallback also covers an invitation issued here and claimed during a v505
// rollback. Match the actual immutable claim provenance, never a guessed user/name.
// Explicit metadata (including JSON null) wins over the invitation fallback.
export const MEMBER_JOB_TITLE_SQL = `CASE WHEN vm.role='cashier' THEN json_extract(COALESCE(
  (SELECT j.data_json FROM domain_data j WHERE j.account_id=vm.account_id AND j.store_key='__bd_staff_job_v1__:' || vm.venue_id),
  (SELECT j.data_json FROM venue_invites i JOIN domain_data j
    ON j.account_id=i.created_by_account_id AND j.store_key='__bd_invite_job_v1__:' || i.code_hash
    WHERE i.venue_id=vm.venue_id AND i.used_by_account_id=vm.account_id
      AND i.created_by_account_id=vm.invited_by_account_id AND i.used_at=vm.joined_at
    ORDER BY i.id DESC LIMIT 1)
), '$') ELSE NULL END`;
export const memberJobTitle = sql<string | null>`${sql.raw(MEMBER_JOB_TITLE_SQL.replaceAll('vm.', 'venue_memberships.'))}`;
export const inviteJobTitle = sql<string | null>`CASE WHEN ${venueInvites.role}='cashier' THEN (SELECT json_extract(j.data_json, '$') FROM domain_data j
  WHERE j.account_id=${venueInvites.createdByAccountId} AND j.store_key=${INVITE_JOB_PREFIX} || ${venueInvites.codeHash}) ELSE NULL END`;
export const membershipWithJobTitle = { ...getTableColumns(venueMemberships), jobTitle: memberJobTitle };
export const inviteWithJobTitle = { ...getTableColumns(venueInvites), jobTitle: inviteJobTitle };

export function setMemberJob(db: D1Database, accountId: number, venueId: number, title: string | null, now: string) {
  return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`)
    .bind(accountId, memberJobKey(venueId), JSON.stringify(title), now);
}

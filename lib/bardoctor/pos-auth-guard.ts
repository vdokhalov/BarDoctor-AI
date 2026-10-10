import { MEMBER_JOB_TITLE_SQL } from "./staff-job-storage";
import type { AuthenticatedAccount } from "./access-control";
/** Same transaction as the domain CAS: a revoked membership cannot finish an in-flight POS write. */
export function posMembershipGuard(db: D1Database, account: AuthenticatedAccount, now: string): D1PreparedStatement {
  return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at)
    SELECT ?, '__bd_pos_access_guard_v1__', NULL, ? WHERE NOT EXISTS (
      SELECT 1 FROM venue_memberships vm JOIN venues v ON v.id=vm.venue_id
      JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=vm.account_id
      JOIN workspaces w ON w.id=v.workspace_id
      WHERE vm.id=? AND vm.account_id=? AND vm.venue_id=? AND v.data_account_id=?
      AND vm.role=? AND vm.permissions_json IS ? AND ${MEMBER_JOB_TITLE_SQL} IS ?
      AND vm.status='active' AND v.status='active' AND wm.status='active' AND w.status='active'
    )`).bind(account.id,now,account.membershipId,account.actorAccountId,account.venueId,account.id,
      account.role,account.membershipPermissionsJson??null,account.membershipJobTitle??null);
}

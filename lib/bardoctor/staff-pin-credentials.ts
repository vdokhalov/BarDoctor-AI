import { getD1 } from '../../db';
import type { AuthenticatedAccount } from './access-control';
import { generateStaffPin, hashStaffPin, pinLookupTag } from './staff-pin-crypto';

// Both management authority and the target are rechecked inside the write transaction.
// Ordinary managerial rights are not expanded. A shift_manager is not a PIN manager.
const authorizedTarget = `SELECT target.id FROM venue_memberships target
 JOIN venues v ON v.id=target.venue_id
 JOIN workspaces w ON w.id=v.workspace_id
 JOIN workspace_memberships tw ON tw.workspace_id=w.id AND tw.account_id=target.account_id
 JOIN venue_memberships actor ON actor.venue_id=v.id
 JOIN workspace_memberships aw ON aw.workspace_id=w.id AND aw.account_id=actor.account_id
 WHERE target.id=? AND target.venue_id=? AND target.role='cashier'
 AND actor.id=? AND actor.account_id=? AND actor.role IN ('owner','manager') AND actor.status='active'
 AND aw.status='active' AND tw.status='active' AND v.status='active' AND w.status='active'`;

function assertManager(actor: AuthenticatedAccount, membershipId: number) {
  if (!['owner','manager'].includes(actor.role)) throw Error('PIN_ACCESS_DENIED');
  if (!Number.isSafeInteger(membershipId) || membershipId<=0) throw Error('PIN_INVALID_MEMBER');
}
const managerParams=(actor:AuthenticatedAccount,membershipId:number)=>[membershipId,actor.venueId,actor.membershipId,actor.actorAccountId];

/** Server-generated secret returned once to the authorized issuer; never stored in audit. */
export async function issueStaffPin(actor: AuthenticatedAccount, membershipId: number) {
  assertManager(actor,membershipId);
  const db=getD1(), now=new Date().toISOString();
  for(let attempt=0;attempt<5;attempt++){
    const pin=generateStaffPin(),tag=await pinLookupTag(actor.venueId,pin),record=await hashStaffPin(pin);
    try{
      const rows=await db.batch([
        db.prepare(`INSERT INTO staff_pin_credentials
          (membership_id,venue_id,lookup_tag,password_hash,password_salt,password_iterations,updated_by_account_id,updated_at)
          SELECT target.id,?,?,?,?,?,?,? FROM venue_memberships target
          WHERE target.id IN (${authorizedTarget} AND target.status='active')
          ON CONFLICT(membership_id) DO UPDATE SET lookup_tag=excluded.lookup_tag,
            password_hash=excluded.password_hash,password_salt=excluded.password_salt,password_iterations=excluded.password_iterations,
            revision=staff_pin_credentials.revision+1,revoked_at=NULL,
            updated_by_account_id=excluded.updated_by_account_id,updated_at=excluded.updated_at
          WHERE staff_pin_credentials.lookup_tag<>excluded.lookup_tag
          RETURNING revision`).bind(actor.venueId,tag,record.passwordHash,record.passwordSalt,record.passwordIterations,actor.actorAccountId,now,...managerParams(actor,membershipId)),
        db.prepare(`INSERT INTO staff_pin_audit(venue_id,membership_id,actor_account_id,action,revision,created_at)
          SELECT venue_id,membership_id,?,'issue_or_reset',revision,? FROM staff_pin_credentials WHERE membership_id=? AND changes()=1`)
          .bind(actor.actorAccountId,now,membershipId),
      ]);
      const row=rows[0].results?.[0] as {revision:number}|undefined;
      if(!row){
        // A reset must not reissue the current PIN, including concurrent resets.
        // A skipped upsert emits no audit and does not clear any attempt budget.
        const same=await db.prepare('SELECT 1 FROM staff_pin_credentials WHERE membership_id=? AND lookup_tag=?').bind(membershipId,tag).first();
        if(same)continue;
        throw Error('PIN_ACCESS_DENIED');
      }
      return {pin,membershipId,venueId:actor.venueId,revision:row.revision};
    }catch(error){
      // Only retry the exact venue/PIN uniqueness conflict; all other failures stay closed.
      if(!(error instanceof Error)||!error.message.includes('UNIQUE constraint failed: staff_pin_credentials.venue_id, staff_pin_credentials.lookup_tag'))throw error;
    }
  }
  throw Error('PIN_ISSUE_RETRY');
}

export async function revokeStaffPin(actor: AuthenticatedAccount,membershipId:number){
  assertManager(actor,membershipId);
  const db=getD1(),now=new Date().toISOString();
  const rows=await db.batch([
    db.prepare(`UPDATE staff_pin_credentials SET revoked_at=?,revision=revision+1,updated_by_account_id=?,updated_at=?
      WHERE membership_id IN (${authorizedTarget}) RETURNING revision`)
      .bind(now,actor.actorAccountId,now,...managerParams(actor,membershipId)),
    db.prepare(`INSERT INTO staff_pin_audit(venue_id,membership_id,actor_account_id,action,revision,created_at)
      SELECT venue_id,membership_id,?,'revoke',revision,? FROM staff_pin_credentials WHERE membership_id=? AND changes()=1`)
      .bind(actor.actorAccountId,now,membershipId),
  ]);
  if(!rows[0].results?.length)throw Error('PIN_ACCESS_DENIED');
  return {membershipId,revoked:true};
}

import { getD1 } from '../../db';
import type { AuthenticatedAccount } from './access-control';
import { isStaffJobTitle } from './staff-job-title';
/** Staff have a real accounts row but no email/password login. The legacy
 * app_email column holds a non-address internal identifier for account_kind=staff.
 * It is never exposed as an email or accepted by findAccountByAppEmail (user only).
 */
export async function createPinStaff(actor:AuthenticatedAccount,name:string,jobTitle:unknown){
 if(!['owner','manager'].includes(actor.role)||actor.posSession)throw Error('PIN_ACCESS_DENIED');
 if(typeof name!=='string'||!name.trim()||name.trim().length>100||!isStaffJobTitle(jobTitle))throw Error('PIN_INVALID_MEMBER');
 const id='staff:'+crypto.randomUUID(),db=getD1(),now=new Date().toISOString();
 const rows=await db.batch([
  db.prepare(`INSERT INTO accounts(chatgpt_email,app_email,first_name,account_kind,role,owns_venue)
   SELECT '',?,?,'staff','cashier',0 FROM venue_memberships m JOIN venues v ON v.id=m.venue_id
   JOIN workspaces w ON w.id=v.workspace_id JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=m.account_id
   WHERE m.id=? AND m.account_id=? AND m.venue_id=? AND m.role IN ('owner','manager') AND m.status='active'
   AND v.status='active' AND w.status='active' AND wm.status='active'`).bind(id,name.trim(),actor.membershipId,actor.actorAccountId,actor.venueId),
  db.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,status)
   SELECT v.workspace_id,a.id,'member','active' FROM accounts a JOIN venues v ON v.id=? WHERE a.app_email=? AND a.account_kind='staff'`).bind(actor.venueId,id),
  db.prepare(`INSERT INTO venue_memberships(venue_id,account_id,role,status,invited_by_account_id)
   SELECT ?,id,'cashier','active',? FROM accounts WHERE app_email=? AND account_kind='staff' RETURNING id,account_id`).bind(actor.venueId,actor.actorAccountId,id),
  db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at)
   SELECT id,?,?,? FROM accounts WHERE app_email=? AND account_kind='staff'`).bind('__bd_staff_job_v1__:'+actor.venueId,JSON.stringify(jobTitle),now,id),
 ]);
 const created=rows[2].results[0] as {id:number;account_id:number}|undefined;if(!created)throw Error('PIN_ACCESS_DENIED');
 return {membershipId:created.id,actorId:created.account_id};
}

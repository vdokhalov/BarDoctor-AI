import { normalizeStaffLogin } from './staff-login-name';
import { getD1 } from '../../db';
import type { AuthenticatedAccount } from './access-control';
import { isStaffJobTitle } from './staff-job-title';
// The venue's authoritative roster, not staffing selected for a workday.
// Legacy rows without venueId belong to the venue owning this domain_data store.
export const activeRoster = `SELECT json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id') AS employee_id,
 json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.name') AS name FROM domain_data d, json_each(CASE WHEN json_valid(d.data_json) THEN d.data_json ELSE '[]' END) e
 WHERE d.account_id=v.data_account_id AND d.store_key='bd_employees'
 AND json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id')='text' AND length(trim(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.id')))>0
 AND json_type(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.name')='text' AND length(trim(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.name')))>0
 AND json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.status')='active'
 AND (json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.venueId') IS NULL OR CAST(json_extract(CASE WHEN e.type='object' THEN e.value ELSE '{}' END,'$.venueId') AS TEXT)=CAST(v.id AS TEXT))`;
export const linkedActiveEmployee = `target.employee_id IS NOT NULL
 AND (SELECT count(*) FROM (${activeRoster}) roster WHERE roster.employee_id=target.employee_id)=1
 AND NOT EXISTS(SELECT 1 FROM venue_memberships duplicate WHERE duplicate.venue_id=target.venue_id
 AND duplicate.employee_id=target.employee_id AND duplicate.id<>target.id)`;
const authorizedIssuer = `SELECT v.* FROM venues v JOIN workspaces w ON w.id=v.workspace_id
 JOIN venue_memberships issuer ON issuer.venue_id=v.id JOIN workspace_memberships iw ON iw.workspace_id=w.id AND iw.account_id=issuer.account_id
 WHERE v.id=? AND issuer.id=? AND issuer.account_id=? AND issuer.role IN ('owner','manager')
 AND issuer.status='active' AND iw.status='active' AND v.status='active' AND w.status='active'`;
const issuerParams=(actor:AuthenticatedAccount)=>[actor.venueId,actor.membershipId,actor.actorAccountId];
function validRequest(actor:AuthenticatedAccount,employeeId:unknown){
 if(!['owner','manager'].includes(actor.role)||actor.posSession)throw Error('PIN_ACCESS_DENIED');
 if(typeof employeeId!=='string'||!employeeId.trim()||employeeId.length>120)throw Error('PIN_INVALID_MEMBER');
}
/** Explicitly link an existing identity; never merge by name or rewrite historical actors. */
export async function linkPinStaff(actor:AuthenticatedAccount,membershipId:number,employeeId:string){
 validRequest(actor,employeeId);
 if(!Number.isSafeInteger(membershipId)||membershipId<=0)throw Error('PIN_INVALID_MEMBER');
 const row=await getD1().prepare(`UPDATE venue_memberships AS target SET employee_id=?,updated_at=?
 WHERE target.id=? AND target.role='cashier' AND target.status='active'
 AND (target.employee_id IS NULL OR target.employee_id=?)
 AND EXISTS(SELECT 1 FROM (${authorizedIssuer}) v WHERE v.id=target.venue_id
 AND EXISTS(SELECT 1 FROM workspace_memberships tw WHERE tw.workspace_id=v.workspace_id AND tw.account_id=target.account_id AND tw.status='active')
 AND (SELECT count(*) FROM (${activeRoster}) roster WHERE roster.employee_id=?)=1)
 AND NOT EXISTS(SELECT 1 FROM venue_memberships duplicate WHERE duplicate.venue_id=target.venue_id AND duplicate.employee_id=? AND duplicate.id<>target.id)
 RETURNING id,account_id`).bind(employeeId,new Date().toISOString(),membershipId,employeeId,...issuerParams(actor),employeeId,employeeId).first();
 if(!row)throw Error('PIN_INVALID_MEMBER');return {membershipId,employeeId};
}
/** Create access only for an existing employee. The conditional transaction also
 * makes concurrent/repeated requests reuse the same identity without changing its login. */
export async function createPinStaff(actor:AuthenticatedAccount,employeeId:string,jobTitle:unknown,loginValue:unknown){
 validRequest(actor,employeeId);
 if(!isStaffJobTitle(jobTitle))throw Error('PIN_INVALID_MEMBER');
 const login=normalizeStaffLogin(loginValue);if(!login)throw Error('PIN_INVALID_LOGIN');
 const id='staff:'+crypto.randomUUID(),db=getD1(),now=new Date().toISOString();
 await db.batch([
  db.prepare(`INSERT INTO accounts(chatgpt_email,app_email,first_name,account_kind,role,owns_venue)
   SELECT '',?,(SELECT name FROM (${activeRoster}) roster WHERE roster.employee_id=?),'staff','cashier',0
   FROM (${authorizedIssuer}) v WHERE (SELECT count(*) FROM (${activeRoster}) roster WHERE roster.employee_id=?)=1
   AND NOT EXISTS(SELECT 1 FROM venue_memberships m WHERE m.venue_id=v.id AND m.employee_id=?)`)
   .bind(id,employeeId,...issuerParams(actor),employeeId,employeeId),
  db.prepare(`INSERT INTO workspace_memberships(workspace_id,account_id,role,status)
   SELECT v.workspace_id,a.id,'member','active' FROM accounts a JOIN venues v ON v.id=? WHERE a.app_email=? AND a.account_kind='staff'`).bind(actor.venueId,id),
  db.prepare(`INSERT INTO venue_memberships(venue_id,account_id,role,status,employee_id,invited_by_account_id)
   SELECT ?,id,'cashier','active',?,? FROM accounts WHERE app_email=? AND account_kind='staff'`).bind(actor.venueId,employeeId,actor.actorAccountId,id),
  db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at)
   SELECT id,?,?,? FROM accounts WHERE app_email=? AND account_kind='staff'`).bind('__bd_staff_job_v1__:'+actor.venueId,JSON.stringify(jobTitle),now,id),
  db.prepare(`INSERT INTO staff_logins(membership_id,login)
   SELECT target.id,? FROM venue_memberships target JOIN (${authorizedIssuer}) v ON v.id=target.venue_id
   JOIN workspace_memberships tw ON tw.workspace_id=v.workspace_id AND tw.account_id=target.account_id AND tw.status='active'
   WHERE target.employee_id=? AND target.role='cashier' AND target.status='active' AND ${linkedActiveEmployee}
   ON CONFLICT(membership_id) DO NOTHING`).bind(login,...issuerParams(actor),employeeId),
 ]);
 const row=await db.prepare(`SELECT target.id AS membershipId,target.account_id AS actorId,l.login FROM venue_memberships target
 JOIN (${authorizedIssuer}) v ON v.id=target.venue_id JOIN staff_logins l ON l.membership_id=target.id
 WHERE target.employee_id=? AND target.role='cashier' AND target.status='active' AND ${linkedActiveEmployee}`)
 .bind(...issuerParams(actor),employeeId).first<{membershipId:number;actorId:number;login:string}>();
 if(!row)throw Error('PIN_INVALID_MEMBER');return row;
}
export async function setStaffLogin(actor:AuthenticatedAccount,membershipId:number,value:unknown){
 const login=normalizeStaffLogin(value);
 if(!['owner','manager'].includes(actor.role)||actor.posSession)throw Error('PIN_ACCESS_DENIED');
 if(!login||!Number.isSafeInteger(membershipId)||membershipId<=0)throw Error('PIN_INVALID_LOGIN');
 const row=await getD1().prepare(`INSERT INTO staff_logins(membership_id,login)
 SELECT target.id,? FROM venue_memberships target JOIN venues v ON v.id=target.venue_id
 JOIN workspaces w ON w.id=v.workspace_id JOIN venue_memberships actor ON actor.venue_id=v.id
 JOIN workspace_memberships aw ON aw.workspace_id=w.id AND aw.account_id=actor.account_id
 WHERE target.id=? AND target.venue_id=? AND target.role='cashier' AND target.status='active'
 AND ${linkedActiveEmployee}
 AND EXISTS(SELECT 1 FROM workspace_memberships tw WHERE tw.workspace_id=v.workspace_id AND tw.account_id=target.account_id AND tw.status='active')
 AND actor.id=? AND actor.account_id=? AND actor.role IN ('owner','manager') AND actor.status='active'
 AND aw.status='active' AND v.status='active' AND w.status='active'
 ON CONFLICT(membership_id) DO UPDATE SET login=excluded.login RETURNING login`)
 .bind(login,membershipId,actor.venueId,actor.membershipId,actor.actorAccountId).first();
 if(!row)throw Error('PIN_ACCESS_DENIED');return {membershipId,login};
}

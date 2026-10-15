import { staffLoginSource } from './staff-login-source';
import { normalizeStaffLogin } from './staff-login-name';
import { getD1, getDb } from '../../db';
import { accounts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyStaffPin } from './staff-pin-crypto';
import { venueContextForAccount } from './auth';
import type { AuthenticatedAccount } from './access-control';
import { POS_SESSION_COOKIE,POS_LIFETIME_SECONDS,posCookie,posDigest,posSameOrigin,posToken } from './staff-pin-cookie';
export * from './staff-pin-cookie';
export function posAllowedRequest(request:Request){
 const path=new URL(request.url).pathname;
 return (['/api/pos-orders','/api/sales-events'].includes(path)&&['GET','POST'].includes(request.method))
  || (path==='/api/staff-pin/session'&&['GET','POST','DELETE'].includes(request.method));
}
export const POS_SESSION_VALID_SQL=`SELECT s.token_hash,s.membership_id,s.pin_revision,vm.account_id,vm.venue_id
 FROM staff_login_sessions s
 JOIN staff_pin_credentials p ON p.membership_id=s.membership_id
 JOIN venue_memberships vm ON vm.id=s.membership_id
 JOIN venues v ON v.id=vm.venue_id JOIN workspaces w ON w.id=v.workspace_id
 JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id
 WHERE s.token_hash=? AND s.expires_at>?
 AND p.revoked_at IS NULL AND s.pin_revision=p.revision
 AND vm.role='cashier' AND vm.status='active' AND wm.status='active' AND v.status='active' AND w.status='active'
 AND p.venue_id=vm.venue_id`;
export async function validPosSession(request:Request){
 const token=posCookie(request,POS_SESSION_COOKIE);if(!token)return null;
 const now=new Date().toISOString();
 return getD1().prepare(POS_SESSION_VALID_SQL).bind(await posDigest(token),now).first<{token_hash:string;membership_id:number;pin_revision:number;account_id:number;venue_id:number}>();
}
export async function authenticatePosRequest(request:Request):Promise<AuthenticatedAccount|null>{
 if(!posAllowedRequest(request))return null;
 if(request.method!=='GET'&&!posSameOrigin(request))return null;
 const session=await validPosSession(request);if(!session)return null;
 if(new URL(request.url).pathname!=='/api/staff-pin/session'&&(request.method!=='GET'||request.headers.has('x-pos-actor'))&&request.headers.get('x-pos-actor')!==String(session.account_id))return null;
 const venue=request.headers.get('x-venue-id');if(venue!==null&&venue!==String(session.venue_id))return null;
 const [identity]=await getDb().select().from(accounts).where(eq(accounts.id,session.account_id)).limit(1);if(!identity)return null;
 const context=await venueContextForAccount(identity,session.venue_id,true);if(!context||context.role!=='cashier')return null;
 return {...context.dataAccount,firstName:identity.firstName,lastName:identity.lastName,role:'cashier',
  actorAccountId:identity.id,venueId:session.venue_id,membershipId:session.membership_id,
  membershipPermissionsJson:context.membership.permissionsJson,membershipJobTitle:context.membership.jobTitle,
  jobTitle:context.jobTitle,permissions:context.permissions,
  posSession:{tokenHash:session.token_hash}};
}
// A fixed non-secret verifier makes unknown-login failures perform the same KDF.
const dummy={passwordHash:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',passwordSalt:'AAAAAAAAAAAAAAAAAAAAAA',passwordIterations:100000};
export async function loginStaffPin(request:Request,pin:string,loginValue:unknown){
 if(!posSameOrigin(request))throw Error('PIN_ACCESS_DENIED');
 const login=normalizeStaffLogin(loginValue);
 const source=staffLoginSource(request);
 const db=getD1(),now=new Date().toISOString(),window=Math.floor(Date.now()/900000);
 const sourceScope='staff-source:'+await posDigest(source.toLowerCase());
 const loginScope='staff-login:'+await posDigest(login||'invalid-format');
 // Source first: an exhausted source cannot consume another account's budget.
 const counts=await db.batch([
  db.prepare(`INSERT INTO staff_pos_attempts(scope,window_start,attempts) VALUES (?,?,1)
   ON CONFLICT(scope) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start
   WHERE window_start<>excluded.window_start OR attempts<50 RETURNING attempts`).bind(sourceScope,window),
  db.prepare(`INSERT INTO staff_pos_attempts(scope,window_start,attempts) SELECT ?,?,1 WHERE changes()=1
   ON CONFLICT(scope) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start
   WHERE window_start<>excluded.window_start OR attempts<5 RETURNING attempts`).bind(loginScope,window),
  db.prepare('DELETE FROM staff_pos_attempts WHERE window_start<?').bind(window-2),
 ]);
 if(!counts[0].results.length||!counts[1].results.length)throw Error('PIN_RATE_LIMIT');
 const credential=login?await db.prepare(`SELECT p.*,m.account_id FROM staff_logins l JOIN staff_pin_credentials p ON p.membership_id=l.membership_id JOIN venue_memberships m ON m.id=p.membership_id WHERE l.login=? AND p.revoked_at IS NULL AND m.status='active' AND m.role='cashier'`)
 .bind(login).first<{membership_id:number;venue_id:number;revision:number;password_hash:string;password_salt:string;password_iterations:number}>():null;
 const valid=await verifyStaffPin(/^\d{6}$/.test(pin)?pin:'000000',credential?{passwordHash:credential.password_hash,passwordSalt:credential.password_salt,passwordIterations:credential.password_iterations}:dummy);
 if(!credential||!valid||!/^\d{6}$/.test(pin))throw Error('PIN_INVALID');
 const token=posToken(),tokenHash=await posDigest(token),expiry=new Date(Date.now()+POS_LIFETIME_SECONDS*1000).toISOString();
 // Independent sessions permit multiple devices. Concurrent valid logins do not
 // delete each other. Each insertion + reservation refund is a single transaction.
 const committed=await db.batch([
 db.prepare(`INSERT INTO staff_login_sessions(token_hash,membership_id,pin_revision,expires_at)
 SELECT ?,p.membership_id,p.revision,? FROM staff_pin_credentials p
 JOIN venue_memberships m ON m.id=p.membership_id JOIN staff_logins l ON l.membership_id=m.id
 JOIN venues v ON v.id=m.venue_id JOIN workspaces w ON w.id=v.workspace_id
 JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=m.account_id
 WHERE p.membership_id=? AND p.revision=? AND p.revoked_at IS NULL AND l.login=?
 AND m.role='cashier' AND m.status='active' AND wm.status='active' AND v.status='active' AND w.status='active' RETURNING token_hash`)
 .bind(tokenHash,expiry,credential.membership_id,credential.revision,login),
 ...[sourceScope,loginScope].map(scope=>db.prepare(`UPDATE staff_pos_attempts SET attempts=attempts-1 WHERE scope=? AND window_start=? AND attempts>0 AND EXISTS (SELECT 1 FROM staff_login_sessions WHERE token_hash=?)`).bind(scope,window,tokenHash)),
 ]);
 if(!committed[0].results.length)throw Error('PIN_INVALID');
 return {token,venueId:credential.venue_id,expiresAt:expiry};
}

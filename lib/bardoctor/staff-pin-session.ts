import { getD1, getDb } from '../../db';
import { accounts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { pinLookupTag, verifyStaffPin } from './staff-pin-crypto';
import { venueContextForAccount } from './auth';
import type { AuthenticatedAccount } from './access-control';
import { POS_DEVICE_COOKIE,POS_SESSION_COOKIE,POS_LIFETIME_SECONDS,posCookie,posDigest,posSameOrigin,posToken } from './staff-pin-cookie';
export * from './staff-pin-cookie';
export function posAllowedRequest(request:Request){
 const path=new URL(request.url).pathname;
 return (['/api/pos-orders','/api/sales-events'].includes(path)&&['GET','POST'].includes(request.method))
  || (path==='/api/staff-pin/session'&&['GET','POST','DELETE'].includes(request.method));
}
export const POS_SESSION_VALID_SQL=`SELECT s.token_hash,s.membership_id,s.device_id,s.pin_revision,vm.account_id,vm.venue_id
 FROM staff_pos_sessions s JOIN staff_pos_devices d ON d.id=s.device_id
 JOIN staff_pin_credentials p ON p.membership_id=s.membership_id
 JOIN venue_memberships vm ON vm.id=s.membership_id
 JOIN venues v ON v.id=vm.venue_id JOIN workspaces w ON w.id=v.workspace_id
 JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=vm.account_id
 WHERE s.token_hash=? AND d.token_hash=? AND s.expires_at>? AND d.expires_at>?
 AND d.revoked_at IS NULL AND p.revoked_at IS NULL AND s.pin_revision=p.revision
 AND vm.role='cashier' AND vm.status='active' AND wm.status='active' AND v.status='active' AND w.status='active'
 AND d.venue_id=vm.venue_id AND p.venue_id=vm.venue_id`;
export async function validPosSession(request:Request){
 const token=posCookie(request,POS_SESSION_COOKIE),device=posCookie(request,POS_DEVICE_COOKIE);if(!token||!device)return null;
 const now=new Date().toISOString();
 return getD1().prepare(POS_SESSION_VALID_SQL).bind(await posDigest(token),await posDigest(device),now,now).first<{token_hash:string;membership_id:number;device_id:string;pin_revision:number;account_id:number;venue_id:number}>();
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
  posSession:{tokenHash:session.token_hash,deviceHash:await posDigest(posCookie(request,POS_DEVICE_COOKIE)!)}};
}
export async function authorizePosDevice(actor:AuthenticatedAccount){
 if(!['owner','manager'].includes(actor.role)||actor.posSession)throw Error('PIN_ACCESS_DENIED');
 const token=posToken(),id=crypto.randomUUID(),expires=new Date(Date.now()+POS_LIFETIME_SECONDS*1000).toISOString();
 const result=await getD1().prepare(`INSERT INTO staff_pos_devices(id,token_hash,venue_id,authorized_by,expires_at)
 SELECT ?,?,?,?,? FROM venue_memberships m JOIN venues v ON v.id=m.venue_id
 JOIN workspaces w ON w.id=v.workspace_id JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=m.account_id
 WHERE m.id=? AND m.account_id=? AND m.venue_id=? AND m.status='active' AND m.role IN ('owner','manager')
 AND wm.status='active' AND v.status='active' AND w.status='active' RETURNING id`)
 .bind(id,await posDigest(token),actor.venueId,actor.actorAccountId,expires,actor.membershipId,actor.actorAccountId,actor.venueId).first();
 if(!result)throw Error('PIN_ACCESS_DENIED');return {token,id,expires};
}
export async function loginStaffPin(request:Request,pin:string){
 if(!posSameOrigin(request))throw Error('PIN_ACCESS_DENIED');
 const deviceToken=posCookie(request,POS_DEVICE_COOKIE);if(!deviceToken)throw Error('PIN_DEVICE_REQUIRED');
 const db=getD1(),now=new Date().toISOString(),deviceHash=await posDigest(deviceToken);
 const device=await db.prepare(`SELECT id,venue_id FROM staff_pos_devices WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?`).bind(deviceHash,now).first<{id:string;venue_id:number}>();
 if(!device)throw Error('PIN_DEVICE_REQUIRED');
 // Reserve every attempt atomically before lookup/hash. Success does not reset a
 // concurrent attacker's counter. Shared venue budget limits distributed devices.
 const window=Math.floor(Date.now()/900000);
 const counts=await db.batch([['device:'+device.id,5],['venue:'+device.venue_id,50]].map(([scope])=>db.prepare(`INSERT INTO staff_pos_attempts(scope,window_start,attempts) VALUES (?,?,1)
 ON CONFLICT(scope) DO UPDATE SET attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`).bind(scope,window)));
 if(Number((counts[0].results[0] as {attempts:number}).attempts)>5||Number((counts[1].results[0] as {attempts:number}).attempts)>50)throw Error('PIN_RATE_LIMIT');
 if(!/^\d{6}$/.test(pin))throw Error('PIN_INVALID');
 const tag=await pinLookupTag(device.venue_id,pin);
 const credential=await db.prepare(`SELECT p.*,m.account_id FROM staff_pin_credentials p JOIN venue_memberships m ON m.id=p.membership_id WHERE p.venue_id=? AND p.lookup_tag=? AND p.revoked_at IS NULL AND m.status='active' AND m.role='cashier'`)
 .bind(device.venue_id,tag).first<{membership_id:number;account_id:number;revision:number;password_hash:string;password_salt:string;password_iterations:number}>();
 if(!credential||!await verifyStaffPin(pin,{passwordHash:credential.password_hash,passwordSalt:credential.password_salt,passwordIterations:credential.password_iterations}))throw Error('PIN_INVALID');
 const token=posToken(),tokenHash=await posDigest(token),expiry=new Date(Date.now()+POS_LIFETIME_SECONDS*1000).toISOString();
 // Membership/device/PIN revision must still be valid when the session is inserted.
 const inserted=await db.prepare(`INSERT INTO staff_pos_sessions(token_hash,device_id,membership_id,pin_revision,expires_at)
 SELECT ?,d.id,p.membership_id,p.revision,? FROM staff_pos_devices d
 JOIN staff_pin_credentials p ON p.venue_id=d.venue_id JOIN venue_memberships m ON m.id=p.membership_id
 JOIN venues v ON v.id=m.venue_id JOIN workspaces w ON w.id=v.workspace_id
 JOIN workspace_memberships wm ON wm.workspace_id=w.id AND wm.account_id=m.account_id
 WHERE d.id=? AND d.revoked_at IS NULL AND d.expires_at>? AND p.membership_id=? AND p.revision=? AND p.revoked_at IS NULL
 AND m.role='cashier' AND m.status='active' AND wm.status='active' AND v.status='active' AND w.status='active' RETURNING token_hash`)
 .bind(tokenHash,expiry,device.id,now,credential.membership_id,credential.revision).first();
 if(!inserted)throw Error('PIN_INVALID');
 // One active employee per physical browser grant. Concurrent logins invalidate
 // each other rather than leaving two identities active on a shared terminal.
 await db.prepare('DELETE FROM staff_pos_sessions WHERE device_id=? AND token_hash<>?').bind(device.id,tokenHash).run();
 // Release only this successful reservation, never reset other failed attempts.
 await db.batch(['device:'+device.id,'venue:'+device.venue_id].map(scope=>db.prepare('UPDATE staff_pos_attempts SET attempts=attempts-1 WHERE scope=? AND window_start=? AND attempts>0').bind(scope,window)));
 return {token,venueId:device.venue_id,expiresAt:expiry};
}

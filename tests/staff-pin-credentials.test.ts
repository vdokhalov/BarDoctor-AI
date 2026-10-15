import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
const routes={pin:'./lib/bardoctor/staff-pin-credentials',pinCrypto:'./lib/bardoctor/staff-pin-crypto',access:'./app/api/access/route',join:'./app/api/access/join/route'};
const bindings={STAFF_PIN_LOOKUP_KEY:'synthetic-fixture-only-not-a-production-secret'};
async function setup(){
 const r=await lifecycleRuntime(routes,{bindings});
 const owner=await r.register('pin-owner@isolated.test');
 async function member(name:string,role:string){
  const user=await r.register(name+'@isolated.test');
  const response=await r.api.access.POST(r.request(owner,'/api/access','POST',{role,...(role==='cashier'?{jobTitle:'waiter'}:{})}));
  assert.equal(response.status,201);const invite=(await response.json()).invite;
  assert.equal((await r.api.join.POST(r.request(user,'/api/access/join','POST',{code:invite.code}))).status,200);
  const req=new Request(r.request(user,'/api/pos-orders'),{headers:{...Object.fromEntries(r.request(user,'/api/pos-orders').headers),'X-Venue-Id':String(owner.activeVenueId)}});
  const actor=await r.api.auth.authenticateRequest(req);assert.ok(actor);return actor;
 }
 const actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 return {r,owner,actor,member,pin:r.api.pin as unknown as typeof import('../lib/bardoctor/staff-pin-credentials'),crypto:r.api.pinCrypto as unknown as typeof import('../lib/bardoctor/staff-pin-crypto')};
}
test('owner issues distinct personal secrets; reset and revoke advance version; no secret in audit',async t=>{
 const {r,actor,member,pin,crypto}=await setup();t.after(r.close);
 const a=await member('pin-a','cashier'),b=await member('pin-b','cashier');
 const issued=await pin.issueStaffPin(actor,a.membershipId),other=await pin.issueStaffPin(actor,b.membershipId);
 assert.match(issued.pin,/^\d{6}$/);assert.notEqual(issued.pin,other.pin);
 const row=r.sqlite.prepare('SELECT * FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)!;
 assert.notEqual(row.password_hash,issued.pin);assert.notEqual(row.lookup_tag,issued.pin);
 assert.equal(await crypto.verifyStaffPin(issued.pin,{passwordHash:String(row.password_hash),passwordSalt:String(row.password_salt),passwordIterations:Number(row.password_iterations)}),true);
 const reset=await pin.issueStaffPin(actor,a.membershipId);assert.equal(reset.revision,2);
 await pin.revokeStaffPin(actor,a.membershipId);
 const revoked=r.sqlite.prepare('SELECT revision,revoked_at FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)!;
 assert.equal(revoked.revision,3);assert.ok(revoked.revoked_at);
 const audit=r.sqlite.prepare('SELECT action,revision FROM staff_pin_audit WHERE membership_id=? ORDER BY id').all(a.membershipId);
 assert.deepEqual(audit.map(x=>[x.action,x.revision]),[['issue_or_reset',1],['issue_or_reset',2],['revoke',3]]);
 assert.ok(!JSON.stringify(audit).includes(issued.pin));
});
test('manager can issue/reset/revoke; shift manager and staff cannot; targets must be venue-local staff',async t=>{
 const {r,actor,member,pin}=await setup();t.after(r.close);
 const manager=await member('pin-manager','manager'),admin=await member('pin-admin','shift_manager'),staff=await member('pin-staff','cashier');
 await pin.issueStaffPin(manager,staff.membershipId);await pin.issueStaffPin(manager,staff.membershipId);await pin.revokeStaffPin(manager,staff.membershipId);
 for(const denied of [admin,staff]){await assert.rejects(pin.issueStaffPin(denied,staff.membershipId),/PIN_ACCESS_DENIED/);await assert.rejects(pin.revokeStaffPin(denied,staff.membershipId),/PIN_ACCESS_DENIED/);}
 for(const id of [actor.membershipId,manager.membershipId,admin.membershipId,999999])await assert.rejects(pin.issueStaffPin(manager,id),/PIN_ACCESS_DENIED/);
 const outsider=await r.register('pin-outsider@isolated.test');const outsideActor=await r.api.auth.authenticateRequest(r.request(outsider,'/api/access'));assert.ok(outsideActor);
 await assert.rejects(pin.issueStaffPin(outsideActor,staff.membershipId),/PIN_ACCESS_DENIED/);
});
test('revoked issuer cannot win a stale-authority write; failed transaction writes no PIN or audit',async t=>{
 const {r,member,pin}=await setup();t.after(r.close);
 const manager=await member('pin-stale-manager','manager'),staff=await member('pin-stale-staff','cashier');
 r.beforeNextBatch(()=>{r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").run(manager.membershipId);});
 await assert.rejects(pin.issueStaffPin(manager,staff.membershipId),/PIN_ACCESS_DENIED/);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_credentials').get()?.n,0);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_audit').get()?.n,0);
 r.sqlite.prepare("UPDATE venue_memberships SET status='active' WHERE id=?").run(manager.membershipId);
 r.failDatabase();await assert.rejects(pin.issueStaffPin(manager,staff.membershipId),/injected/);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_credentials').get()?.n,0);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_audit').get()?.n,0);
});
test('venue uniqueness is enforced by SQLite, not a preflight race; lookup is venue-scoped and hashing salted',async t=>{
 const {r,actor,member,pin,crypto}=await setup();t.after(r.close);
 const a=await member('pin-unique-a','cashier'),b=await member('pin-unique-b','cashier');
 await pin.issueStaffPin(actor,a.membershipId);
 assert.throws(()=>r.sqlite.prepare(`INSERT INTO staff_pin_credentials SELECT ?,venue_id,lookup_tag,password_hash,password_salt,password_iterations,revision,revoked_at,updated_by_account_id,updated_at FROM staff_pin_credentials WHERE membership_id=?`).run(b.membershipId,a.membershipId),/UNIQUE/);
 assert.notEqual(await crypto.pinLookupTag(1,'012345'),await crypto.pinLookupTag(2,'012345'));
 const first=await crypto.hashStaffPin('012345'),second=await crypto.hashStaffPin('012345');assert.notEqual(first.passwordSalt,second.passwordSalt);assert.notEqual(first.passwordHash,second.passwordHash);
 assert.equal(await crypto.verifyStaffPin('012345',first),true);assert.equal(await crypto.verifyStaffPin('12345',first),false);assert.equal(await crypto.verifyStaffPin('999999',first),false);
});
test('lookup fails closed without a configured server key; no public default',async t=>{
 const r=await lifecycleRuntime(routes);t.after(r.close);
 const crypto=r.api.pinCrypto as unknown as typeof import('../lib/bardoctor/staff-pin-crypto');
 await assert.rejects(crypto.pinLookupTag(1,'012345'),/PIN_NOT_CONFIGURED/);
});
test('reset never reissues current PIN or clears its budget when RNG repeats it',async t=>{
 const {r,actor,member,pin}=await setup();t.after(r.close);
 const staff=await member('pin-repeat','cashier'),issued=await pin.issueStaffPin(actor,staff.membershipId);
 const scope='credential:'+staff.membershipId+':synthetic';
 r.sqlite.prepare('INSERT INTO staff_login_limits(scope,attempts,window_start,window_attempts) VALUES (?,10,0,5)').run(scope);
 const original=globalThis.crypto.getRandomValues.bind(globalThis.crypto);
 t.mock.method(globalThis.crypto,'getRandomValues',(array:Uint8Array|Uint32Array)=>{
  if(array instanceof Uint32Array&&array.length===1){array[0]=Number(issued.pin);return array;}
  return original(array);
 });
 await assert.rejects(pin.issueStaffPin(actor,staff.membershipId),/PIN_ISSUE_RETRY/);
 assert.equal(r.sqlite.prepare('SELECT revision FROM staff_pin_credentials WHERE membership_id=?').get(staff.membershipId)?.revision,1);
 assert.equal(r.sqlite.prepare('SELECT attempts FROM staff_login_limits WHERE scope=?').get(scope)?.attempts,10);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_audit').get()?.n,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {seedRosterEmployee} from './helpers/staff-roster-fixture';
async function setup(){
 const r=await lifecycleRuntime({session:'./app/api/staff-pin/session/route',members:'./lib/bardoctor/staff-pin-members',pin:'./lib/bardoctor/staff-pin-credentials',route:'./app/api/staff-pin/members/route',patch:'./app/api/access/members/[id]/route'},{bindings:{STAFF_PIN_LOOKUP_KEY:'synthetic-roster-key-at-least-thirty-two-bytes'}});
 const owner=await r.register('roster-owner@isolated.test');const actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 const members=r.api.members as unknown as typeof import('../lib/bardoctor/staff-pin-members');
 const pin=r.api.pin as unknown as typeof import('../lib/bardoctor/staff-pin-credentials');
 const seed=(id:string,status='active',venue=actor.venueId)=>seedRosterEmployee(r.sqlite,actor.id,venue,id,'Roster '+id,status);
 const post=(body:object)=>{const req=r.request(owner,'/api/staff-pin/members','POST',body);req.headers.set('origin',new URL(req.url).origin);return r.api.route.POST(req);};
 return {r,owner,actor,members,pin,seed,post};
}
test('only active venue roster entries can acquire access; repeated and concurrent issuance reuse identity',async t=>{
 const {r,actor,members,pin,seed,post}=await setup();t.after(r.close);
 for(const [id,status,venue] of [['active','active',actor.venueId],['dismissed','dismissed',actor.venueId],['leave','on_leave',actor.venueId],['foreign','active',actor.venueId+1]] as const)seed(id,status,venue);
 const before=r.sqlite.prepare('SELECT count(*) n FROM accounts').get()!.n;
 for(const employeeId of ['', 'missing','dismissed','leave','foreign'])assert.equal((await post({action:'create',employeeId,jobTitle:'waiter',login:'test.user'})).status,400,employeeId);
 assert.equal((await post({action:'create',name:'Ad hoc person',jobTitle:'waiter',login:'test.user'})).status,400);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM accounts').get()!.n,before);
 const [a,b]=await Promise.all([members.createPinStaff(actor,'active','waiter','test.user'),members.createPinStaff(actor,'active','waiter','test.user')]);assert.equal(a.membershipId,b.membershipId);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM accounts').get()!.n,Number(before)+1);
 assert.equal(r.sqlite.prepare('SELECT employee_id FROM venue_memberships WHERE id=?').get(a.membershipId)!.employee_id,'active');
 assert.equal(r.sqlite.prepare('SELECT first_name FROM accounts WHERE id=?').get(a.actorId)!.first_name,'Roster active');
 const issued=await pin.issueStaffPin(actor,a.membershipId);assert.match(issued.pin,/^\d{6}$/);
 const again=await members.createPinStaff(actor,'active','waiter','different.login');assert.equal(again.login,'test.user');
 assert.equal(r.sqlite.prepare('SELECT revision FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)!.revision,1);
 const view=await (await r.api.route.GET(r.request((await r.register('irrelevant@isolated.test')),'/api/staff-pin/members'))).json();assert.equal(view.members.length,0);
});
test('legacy unlinked access is retained; explicit same-venue link preserves identity and PIN; duplicate/relink denied',async t=>{
 const {r,actor,owner,members,pin,seed,post}=await setup();t.after(r.close);seed('one');seed('two');
 const a=await members.createPinStaff(actor,'one','waiter','legacy.user');const issued=await pin.issueStaffPin(actor,a.membershipId);
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=NULL WHERE id=?').run(a.membershipId);
 const legacyLogin=()=>r.api.session.POST(new Request('https://isolated.test/api/staff-pin/session',{method:'POST',headers:{origin:'https://isolated.test','Content-Type':'application/json'},body:JSON.stringify({login:'legacy.user',pin:issued.pin})}));
 assert.equal((await legacyLogin()).status,200,'existing unlinked access remains usable');
 const before=r.sqlite.prepare('SELECT * FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId);
 await assert.rejects(pin.issueStaffPin(actor,a.membershipId),/ACCESS_DENIED/);
 await assert.rejects(members.setStaffLogin(actor,a.membershipId,'changed'),/ACCESS_DENIED/);
 const listing=await (await r.api.route.GET(r.request(owner,'/api/staff-pin/members'))).json();assert.equal(listing.members[0].employee_active,false);assert.equal(listing.members[0].pin_active,1);
 assert.equal((await post({action:'link',membershipId:a.membershipId,employeeId:'missing'})).status,400);
 assert.equal((await post({action:'link',membershipId:a.membershipId,employeeId:'one'})).status,200);
 assert.deepEqual(r.sqlite.prepare('SELECT * FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId),before);
 assert.equal((await legacyLogin()).status,200,'linking preserves the existing PIN');
 assert.equal((await members.createPinStaff(actor,'one','waiter','legacy.user')).actorId,a.actorId);
 await assert.rejects(members.linkPinStaff(actor,a.membershipId,'two'),/INVALID_MEMBER/);
 const b=await members.createPinStaff(actor,'two','waiter','second.user');
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=NULL WHERE id=?').run(b.membershipId);
 await assert.rejects(members.linkPinStaff(actor,b.membershipId,'one'),/INVALID_MEMBER/);
 const response=await r.api.patch.PATCH(r.request(owner,'/api/access/members/'+a.membershipId,'PATCH',{employeeId:null}),{params:Promise.resolve({id:String(a.membershipId)})});assert.equal(response.status,400);
 // Revocation remains available even without a link; historical identities are never deleted.
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=NULL WHERE id=?').run(a.membershipId);
 await pin.revokeStaffPin(actor,a.membershipId);
 assert.ok(r.sqlite.prepare('SELECT revoked_at FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)!.revoked_at);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM accounts WHERE id IN (?,?)').get(a.actorId,b.actorId)!.n,2);
 assert.match(issued.pin,/^\d{6}$/);
});
test('transaction rechecks roster and issuer; cross-venue/role/POS requests fail closed',async t=>{
 const {r,actor,members,pin,seed}=await setup();t.after(r.close);seed('one');
 const a=await members.createPinStaff(actor,'one','waiter','one.user');
 for(const role of ['shift_manager','cashier'] as const){await assert.rejects(members.createPinStaff({...actor,role},'one','waiter','x.user'),/ACCESS_DENIED/);await assert.rejects(pin.issueStaffPin({...actor,role},a.membershipId),/ACCESS_DENIED/);}
 await assert.rejects(pin.issueStaffPin({...actor,posSession:{tokenHash:'synthetic'}},a.membershipId),/ACCESS_DENIED/);
 const foreignOwner=await r.register('foreign@isolated.test'),foreign=await r.api.auth.authenticateRequest(r.request(foreignOwner,'/api/access'));assert.ok(foreign);
 await assert.rejects(members.linkPinStaff(foreign,a.membershipId,'one'),/INVALID_MEMBER/);
 await assert.rejects(pin.issueStaffPin(foreign,a.membershipId),/ACCESS_DENIED/);
 r.beforeNextBatch(()=>r.sqlite.prepare("UPDATE domain_data SET data_json='[]' WHERE account_id=? AND store_key='bd_employees'").run(actor.id));
 await assert.rejects(pin.issueStaffPin(actor,a.membershipId),/ACCESS_DENIED/);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_pin_audit').get()!.n,0);
 seed('late');r.beforeNextBatch(()=>r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").run(actor.membershipId));
 await assert.rejects(members.createPinStaff(actor,'late','waiter','late.user'),/INVALID_MEMBER/);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venue_memberships WHERE employee_id='late'").get()!.n,0);
});

test('manager can assign existing staff; deleted/ambiguous roster and competing links fail closed',async t=>{
 const {r,actor,members,pin,seed}=await setup();t.after(r.close);seed('one');seed('two');seed('duplicate');seed('duplicate');
 const user=await r.register('roster-manager@isolated.test');
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(actor.venueId)!.workspace_id;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,user.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'manager','active')").run(actor.venueId,user.userId);
 const req=r.request(user,'/api/access');req.headers.set('X-Venue-Id',String(actor.venueId));
 const manager=await r.api.auth.authenticateRequest(req);assert.ok(manager);assert.equal(manager.role,'manager');
 const a=await members.createPinStaff(manager,'one','waiter','managed.one');await pin.issueStaffPin(manager,a.membershipId);
 await assert.rejects(members.createPinStaff(manager,'duplicate','waiter','dup.user'),/INVALID_MEMBER/);
 const b=await members.createPinStaff(manager,'two','waiter','managed.two');
 r.sqlite.prepare('UPDATE venue_memberships SET employee_id=NULL WHERE id IN (?,?)').run(a.membershipId,b.membershipId);
 const links=await Promise.allSettled([members.linkPinStaff(manager,a.membershipId,'one'),members.linkPinStaff(manager,b.membershipId,'one')]);
 assert.equal(links.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM venue_memberships WHERE employee_id='one'").get()!.n,1);
});

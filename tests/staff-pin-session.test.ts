import test from 'node:test';
import { seedOpenWorkday } from './helpers/pos-workday-fixture';
import { salesEventFixture } from './helpers/sales-event-fixture';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
const routes={sales:'./app/api/sales-events/route',orders:'./app/api/pos-orders/route',pin:'./lib/bardoctor/staff-pin-credentials',pos:'./lib/bardoctor/staff-pin-session',session:'./app/api/staff-pin/session/route',device:'./app/api/staff-pin/device/route',access:'./app/api/access/route',join:'./app/api/access/join/route',guard:'./lib/bardoctor/pos-auth-guard',database:'./db'};
async function setup(){
 const r=await lifecycleRuntime(routes,{bindings:{STAFF_PIN_LOOKUP_KEY:'synthetic-fixture-only-not-production-key'}});
 const owner=await r.register('session-owner@isolated.test'),staff=await r.register('session-staff@isolated.test');
 const invite=await(await r.api.access.POST(r.request(owner,'/api/access','POST',{role:'cashier',jobTitle:'waiter'}))).json();
 await r.api.join.POST(r.request(staff,'/api/access/join','POST',{code:invite.invite.code}));
 const actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 const member=r.sqlite.prepare("SELECT id FROM venue_memberships WHERE account_id=? AND venue_id=?").get(staff.userId,owner.activeVenueId)!;
 const service=r.api.pin as unknown as typeof import('../lib/bardoctor/staff-pin-credentials');
 const pos=r.api.pos as unknown as typeof import('../lib/bardoctor/staff-pin-session');
 const issued=await service.issueStaffPin(actor,Number(member.id)),device=await pos.authorizePosDevice(actor);
 function req(path='/api/staff-pin/session',method='POST',data:unknown={pin:issued.pin},session=''){
  return new Request('https://isolated.test'+path,{method,headers:{origin:'https://isolated.test',cookie:'bd_pos_device='+device.token+(session?'; bd_pos_session='+session:''),'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(data)})});
 }
 return {r,owner,staff,actor,service,pos,issued,device,req};
}
test('persistent cookie authenticates only POS, binds venue and ignores forged identity; logout revokes',async t=>{
 const {r,req,staff,owner}=await setup();t.after(r.close);
 const response=await r.api.session.POST(req());assert.equal(response.status,200);
 const set=response.headers.get('set-cookie')!;assert.match(set,/HttpOnly/);assert.match(set,/SameSite=Strict/);assert.match(set,/Secure/);assert.match(set,/Max-Age=2592000/);
 const token=set.split(';')[0].split('=')[1];
 const actor=await r.api.auth.authenticateRequest(req('/api/pos-orders','GET',null,token));assert.equal(actor?.actorAccountId,staff.userId);assert.equal(actor?.venueId,owner.activeVenueId);
 for(const path of ['/api/access','/api/store','/api/auth/bootstrap','/api/venues','/api/users/me'])assert.equal(await r.api.auth.authenticateRequest(req(path,'GET',null,token)),null,path);
 assert.equal(await r.api.auth.authenticateIdentityRequest(req('/api/users/me','GET',null,token)),null);
 const forged=req('/api/pos-orders','GET',null,token);forged.headers.set('x-venue-id','999');assert.equal(await r.api.auth.authenticateRequest(forged),null);
 assert.equal((await r.api.session.GET(req('/api/staff-pin/session','GET',null,token))).status,200);
 assert.equal((await r.api.session.DELETE(req('/api/staff-pin/session','DELETE',{},token))).status,200);
 assert.equal(await r.api.auth.authenticateRequest(req('/api/pos-orders','GET',null,token)),null);
});
test('reset, revoked membership/device and role promotion invalidate persisted sessions',async t=>{
 const {r,pos,req,service,issued,actor,device}=await setup();t.after(r.close);
 const session=await pos.loginStaffPin(req(),issued.pin);
 await service.issueStaffPin(actor,issued.membershipId);assert.equal(await pos.validPosSession(req('/api/pos-orders','GET',null,session.token)),null);
 const current=await service.issueStaffPin(actor,issued.membershipId),next=await pos.loginStaffPin(req(),current.pin);
 r.sqlite.prepare("UPDATE venue_memberships SET role='manager' WHERE id=?").run(issued.membershipId);
 assert.equal(await pos.validPosSession(req('/api/pos-orders','GET',null,next.token)),null);
 r.sqlite.prepare("UPDATE venue_memberships SET role='cashier' WHERE id=?").run(issued.membershipId);
 r.sqlite.prepare("UPDATE staff_pos_devices SET revoked_at='now' WHERE id=?").run(device.id);
 assert.equal(await pos.validPosSession(req('/api/pos-orders','GET',null,next.token)),null);
});
test('parallel guesses reserve shared attempts before verification; no device or cross-origin cannot login',async t=>{
 const {r,req}=await setup();t.after(r.close);
 const results=await Promise.all(Array.from({length:9},()=>r.api.session.POST(req('/api/staff-pin/session','POST',{pin:'bad'}))));
 assert.equal(results.filter(x=>x.status===401).length,5);assert.equal(results.filter(x=>x.status===429).length,4);
 const noDevice=req();noDevice.headers.delete('cookie');assert.equal((await r.api.session.POST(noDevice)).status,403);
 const cross=req();cross.headers.set('origin','https://attacker.test');assert.equal((await r.api.session.POST(cross)).status,403);
});
test('in-flight POS transaction guard rejects session revoked after authentication',async t=>{
 const {r,pos,req,issued,service,actor}=await setup();t.after(r.close);
 const session=await pos.loginStaffPin(req(),issued.pin),authenticated=await r.api.auth.authenticateRequest(req('/api/pos-orders','GET',null,session.token));assert.ok(authenticated);
 await service.revokeStaffPin(actor,issued.membershipId);
 const guard=r.api.guard as unknown as typeof import('../lib/bardoctor/pos-auth-guard');
 const database=r.api.database as unknown as typeof import('../db');
 await assert.rejects(database.getD1().batch([guard.posMembershipGuard(database.getD1(),authenticated,new Date().toISOString())]));
});
test('successful logins release only their own reservations; stale actor cannot write after switching',async t=>{
 const {r,pos,req,issued,staff}=await setup();t.after(r.close);
 let session;
 for(let i=0;i<7;i++)session=await pos.loginStaffPin(req(),issued.pin);
 assert.equal(r.sqlite.prepare("SELECT attempts FROM staff_pos_attempts WHERE scope LIKE 'device:%'").get()?.attempts,0);
 const post=req('/api/pos-orders','POST',{action:'create'},session!.token);
 assert.equal(await r.api.auth.authenticateRequest(post),null);
 post.headers.set('x-pos-actor',String(staff.userId));assert.ok(await r.api.auth.authenticateRequest(post));
 post.headers.set('x-pos-actor','999');assert.equal(await r.api.auth.authenticateRequest(post),null);
});
test('staff identity has no email/password login and receives a distinct actor account',async t=>{
 const r=await lifecycleRuntime({...routes,members:'./lib/bardoctor/staff-pin-members'},{bindings:{STAFF_PIN_LOOKUP_KEY:'synthetic-fixture-only-not-production-key'}});t.after(r.close);
 const owner=await r.register('identity-owner@isolated.test'),actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 const members=r.api.members as unknown as typeof import('../lib/bardoctor/staff-pin-members');
 const a=await members.createPinStaff(actor,'Анна','waiter'),b=await members.createPinStaff(actor,'Борис','barista');assert.notEqual(a.actorId,b.actorId);
 const stored=r.sqlite.prepare('SELECT * FROM accounts WHERE id=?').get(a.actorId)!;assert.equal(stored.account_kind,'staff');assert.equal(stored.password_hash,null);assert.equal(stored.chatgpt_email,'');assert.match(String(stored.app_email),/^staff:[0-9a-f-]+$/);assert.ok(!String(stored.app_email).includes('@'));
 assert.equal(await r.api.auth.findAccountByAppEmail(String(stored.app_email)),null);
 const service=r.api.pin as unknown as typeof import('../lib/bardoctor/staff-pin-credentials'),pos=r.api.pos as unknown as typeof import('../lib/bardoctor/staff-pin-session');
 const pin=await service.issueStaffPin(actor,a.membershipId),device=await pos.authorizePosDevice(actor);
 const request=new Request('https://isolated.test/api/staff-pin/session',{method:'POST',headers:{origin:'https://isolated.test',cookie:'bd_pos_device='+device.token}});
 const session=await pos.loginStaffPin(request,pin.pin);
 const apiRequest=new Request('https://isolated.test/api/pos-orders',{headers:{cookie:'bd_pos_device='+device.token+'; bd_pos_session='+session.token}});
 const staff=await r.api.auth.authenticateRequest(apiRequest);assert.equal(staff?.actorAccountId,a.actorId);assert.equal(staff?.jobTitle,'waiter');assert.equal(staff?.role,'cashier');
});
test('real POS payment derives author from PIN session; restrictions and in-flight revocation remain enforced',async t=>{
 const {r,pos,req,issued,staff,owner,actor,service}=await setup();t.after(r.close);
 seedOpenWorkday(r.sqlite,owner.userId,owner.activeVenueId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',owner.userId);
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(salesEventFixture().assortment));
 const opened=await r.api.sales.POST(r.request(owner,'/api/sales-events','POST',{action:'open_shift',shiftId:'pin-shift',name:'Synthetic',venueId:owner.activeVenueId}));assert.equal(opened.status,201);
 const session=await pos.loginStaffPin(req(),issued.pin);
 const send=(body:object)=>{const request=req('/api/sales-events','POST',{venueId:owner.activeVenueId,...body},session.token);request.headers.set('x-pos-actor',String(staff.userId));return r.api.sales.POST(request);};
 for(const action of ['open_shift','close_shift','reverse'])assert.equal((await send({action,shiftId:'pin-shift'})).status,403);
 const command={id:'pin-payment',source:'POS_API',shiftId:'pin-shift',payments:[{id:'p',method:'CASH',amount:20}],lines:[{id:'l',menuItemId:'beer',quantity:1}],actor:{accountId:owner.userId,name:'forged'}};
 const preview=await(await send({action:'preview',command})).json();assert.ok(preview.previewHash);
 const posted=await send({action:'post',command,previewHash:preview.previewHash,actorAccountId:owner.userId});assert.equal(posted.status,201);
 const stored=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));
 assert.equal(stored[0].actor.accountId,staff.userId);
 const next={...command,id:'pin-revoked-payment'},nextPreview=await(await send({action:'preview',command:next})).json();
 r.beforeNextDomainWrite(async()=>{await service.revokeStaffPin(actor,issued.membershipId);});
 const denied=await send({action:'post',command:next,previewHash:nextPreview.previewHash});assert.ok([401,403].includes(denied.status));
 const after=JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));assert.equal(after.length,1);
});

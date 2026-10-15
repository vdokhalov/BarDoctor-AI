import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { seedOpenWorkday } from './helpers/pos-workday-fixture';
import { salesEventFixture } from './helpers/sales-event-fixture';
const routes={pin:'./lib/bardoctor/staff-pin-credentials',pos:'./lib/bardoctor/staff-pin-session',members:'./lib/bardoctor/staff-pin-members',session:'./app/api/staff-pin/session/route',sales:'./app/api/sales-events/route'};
async function setup(){
 const r=await lifecycleRuntime(routes,{bindings:{STAFF_PIN_LOOKUP_KEY:'synthetic-only-never-production-secret'}});
 const owner=await r.register('owner@isolated.test'),actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 const members=r.api.members as unknown as typeof import('../lib/bardoctor/staff-pin-members'),pins=r.api.pin as unknown as typeof import('../lib/bardoctor/staff-pin-credentials'),pos=r.api.pos as unknown as typeof import('../lib/bardoctor/staff-pin-session');
 const a=await members.createPinStaff(actor,'Anna','waiter','  Anna  '),b=await members.createPinStaff(actor,'Boris','barista','boris');
 const pin=await pins.issueStaffPin(actor,a.membershipId),other=await pins.issueStaffPin(actor,b.membershipId);
 function request(login='anna',secret=pin.pin,source='192.0.2.1',token='',path='/api/staff-pin/session',method='POST'){
  return new Request('https://isolated.test'+path,{method,headers:{origin:'https://isolated.test','cf-connecting-ip':source,'Content-Type':'application/json',cookie:token?'bd_pos_session='+token:''},...(method==='GET'?{}:{body:JSON.stringify({login,pin:secret})})});
 }
 async function enter(login='anna',secret=pin.pin,source='192.0.2.1') {const response=await r.api.session.POST(request(login,secret,source));assert.equal(response.status,200);assert.match(response.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict; Max-Age=2592000; Secure/);return response.headers.get('set-cookie')!.split(';')[0].split('=')[1];}
 return {r,owner,actor,members,pins,pos,a,b,pin,other,request,enter};
}
test('global normalized login is unique; staff needs no email or approved device; source/venue/role bound',async t=>{
 const {r,members,actor,a,owner,enter,request}=await setup();t.after(r.close);
 const before=r.sqlite.prepare('SELECT count(*) n FROM accounts').get()?.n;
 await assert.rejects(members.createPinStaff(actor,'duplicate','cashier','ANNA'),/UNIQUE/);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM accounts').get()?.n,before,'duplicate rolls account and memberships back');
 await assert.rejects(members.createPinStaff(actor,'bad','cashier','a@b'),/INVALID_LOGIN/);
 const token=await enter('ANNA');const req=request('','','192.0.2.1',token,'/api/pos-orders','GET');
 const identity=await r.api.auth.authenticateRequest(req);assert.equal(identity?.actorAccountId,a.actorId);assert.equal(identity?.venueId,owner.activeVenueId);
 assert.equal(await r.api.auth.findAccountByAppEmail('staff:'+a.actorId),null);
 for(const path of ['/api/access','/api/store','/api/evidence/resolve','/api/pos-overview','/api/users/me'])assert.equal(await r.api.auth.authenticateRequest(request('','','192.0.2.1',token,path,'GET')),null,path);
 req.headers.set('x-venue-id','999');assert.equal(await r.api.auth.authenticateRequest(req),null);
 assert.equal(await r.api.auth.authenticateIdentityRequest(request('','','192.0.2.1',token,'/api/users/me','GET')),null);
});
test('unknown login and wrong PIN have equal errors; atomic account/source limits do not block venue',async t=>{
 const {r,pin,other,request,enter}=await setup();t.after(r.close);
 const wrong=pin.pin==='000000'?'000001':'000000';
 const known=await r.api.session.POST(request('anna',wrong)),unknown=await r.api.session.POST(request('nobody',wrong));assert.equal(known.status,unknown.status);assert.deepEqual(await known.json(),await unknown.json());
 const responses=await Promise.all(Array.from({length:8},(_,i)=>r.api.session.POST(request('anna',wrong,'192.0.2.'+(i+2)))));
 assert.equal(responses.filter(x=>x.status===401).length,4);assert.equal(responses.filter(x=>x.status===429).length,4);
 assert.ok(await enter('boris',other.pin,'198.51.100.1'));
 for(let i=0;i<55;i++)await r.api.session.POST(request('unknown'+i,wrong,'203.0.113.1'));
 const before=r.sqlite.prepare("SELECT attempts FROM staff_pos_attempts WHERE scope LIKE 'staff-login:%'").all();
 assert.equal((await r.api.session.POST(request('boris',other.pin,'203.0.113.1'))).status,429);
 assert.deepEqual(r.sqlite.prepare("SELECT attempts FROM staff_pos_attempts WHERE scope LIKE 'staff-login:%'").all(),before);
 assert.ok(await enter('boris',other.pin,'198.51.100.2'));
});
test('parallel logins remain valid independently; explicit logout, reset and disable-enable revoke permanently',async t=>{
 const {r,enter,request,pos,pins,actor,a,pin}=await setup();t.after(r.close);
 const [first,second]=await Promise.all([enter(),enter()]);assert.notEqual(first,second);
 const req=(token:string)=>request('','','192.0.2.1',token,'/api/pos-orders','GET');
 assert.ok(await pos.validPosSession(req(first)));assert.ok(await pos.validPosSession(req(second)));
 assert.equal((await r.api.session.DELETE(request('','','192.0.2.1',first,'/api/staff-pin/session','DELETE'))).status,200);
 assert.equal(await pos.validPosSession(req(first)),null);assert.ok(await pos.validPosSession(req(second)));
 await pins.issueStaffPin(actor,a.membershipId);assert.equal(await pos.validPosSession(req(second)),null);
 const fresh=await pins.issueStaffPin(actor,a.membershipId),third=await enter('anna',fresh.pin);
 r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").run(a.membershipId);r.sqlite.prepare("UPDATE venue_memberships SET status='active' WHERE id=?").run(a.membershipId);
 assert.equal(await pos.validPosSession(req(third)),null);assert.equal((await r.api.session.POST(request('anna',fresh.pin))).status,401);
 const cross=request('anna',pin.pin);cross.headers.set('origin','https://foreign.test');assert.equal((await r.api.session.POST(cross)).status,403);
 const missing=request();missing.headers.delete('cf-connecting-ip');assert.equal((await r.api.session.POST(missing)).status,503);
});
test('real payment author is server-derived; stale actor and in-flight reset cannot post',async t=>{
 const {r,owner,a,actor,pins,enter,request}=await setup();t.after(r.close);
 seedOpenWorkday(r.sqlite,owner.userId,owner.activeVenueId);r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',owner.userId);
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(salesEventFixture().assortment));
 assert.equal((await r.api.sales.POST(r.request(owner,'/api/sales-events','POST',{action:'open_shift',shiftId:'shift',name:'Synthetic',venueId:owner.activeVenueId}))).status,201);
 const token=await enter();
 const send=(body:object,author=a.actorId)=>{const req=request('','','192.0.2.1',token,'/api/sales-events');req.headers.set('x-pos-actor',String(author));return r.api.sales.POST(new Request(req,{body:JSON.stringify({venueId:owner.activeVenueId,...body})}));};
 const command={id:'login-sale',source:'POS_API',shiftId:'shift',payments:[{id:'p',method:'CASH',amount:20}],lines:[{id:'l',menuItemId:'beer',quantity:1}],actor:{accountId:owner.userId}};
 assert.equal((await send({action:'preview',command},owner.userId)).status,401);
 for(const action of ['open_shift','close_shift','reverse'])assert.equal((await send({action,shiftId:'shift'})).status,403);
 const preview=await(await send({action:'preview',command})).json();assert.equal((await send({action:'post',command,previewHash:preview.previewHash})).status,201);
 const events=()=>JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));assert.equal(events()[0].actor.accountId,a.actorId);
 const next={...command,id:'blocked'},p=await(await send({action:'preview',command:next})).json();r.beforeNextDomainWrite(async()=>{await pins.revokeStaffPin(actor,a.membershipId);});
 assert.ok([401,403].includes((await send({action:'post',command:next,previewHash:p.previewHash})).status));assert.equal(events().length,1);
});

test('only venue owner/manager can change globally unique login; change revokes existing sessions',async t=>{
 const {r,members,actor,a,b,pin,enter,request,pos}=await setup();t.after(r.close);
 const token=await enter();
 await assert.rejects(members.setStaffLogin({...actor,role:'shift_manager'},a.membershipId,'renamed'),/ACCESS_DENIED/);
 await assert.rejects(members.setStaffLogin({...actor,role:'cashier'},a.membershipId,'renamed'),/ACCESS_DENIED/);
 await assert.rejects(members.setStaffLogin({...actor,venueId:999},a.membershipId,'renamed'),/ACCESS_DENIED/);
 await assert.rejects(members.setStaffLogin(actor,a.membershipId,' BORIS '),/UNIQUE/);
 await assert.rejects(members.setStaffLogin(actor,a.membershipId,'bad@email'),/INVALID_LOGIN/);
 assert.ok(await pos.validPosSession(request('','','192.0.2.1',token,'/api/pos-orders','GET')));
 assert.equal((await members.setStaffLogin(actor,a.membershipId,' RENAMED ')).login,'renamed');
 assert.equal(await pos.validPosSession(request('','','192.0.2.1',token,'/api/pos-orders','GET')),null);
 assert.equal((await r.api.session.POST(request('anna',pin.pin))).status,401);
 assert.ok(await enter('renamed',pin.pin));
 assert.equal(r.sqlite.prepare('SELECT login FROM staff_logins WHERE membership_id=?').get(b.membershipId)?.login,'boris');
});

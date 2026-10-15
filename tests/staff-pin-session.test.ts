import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { seedOpenWorkday } from './helpers/pos-workday-fixture';
import { salesEventFixture } from './helpers/sales-event-fixture';
const routes={memberRoute:'./app/api/staff-pin/members/route',orders:'./app/api/pos-orders/route',pin:'./lib/bardoctor/staff-pin-credentials',pos:'./lib/bardoctor/staff-pin-session',members:'./lib/bardoctor/staff-pin-members',session:'./app/api/staff-pin/session/route',sales:'./app/api/sales-events/route'};
async function setup(sourcePolicy: string|undefined=''){
 const r=await lifecycleRuntime(routes,{bindings:{STAFF_PIN_SOURCE_POLICY:sourcePolicy,STAFF_PIN_LOOKUP_KEY:'synthetic-only-never-production-secret'}});
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
 const {r,pin,other,request,enter}=await setup('verified-cloudflare');t.after(r.close);
 const wrong=pin.pin==='000000'?'000001':'000000';
 const known=await r.api.session.POST(request('anna',wrong)),unknown=await r.api.session.POST(request('nobody',wrong));assert.equal(known.status,unknown.status);assert.deepEqual(await known.json(),await unknown.json());
 const responses=await Promise.all(Array.from({length:8},(_,i)=>r.api.session.POST(request('anna',wrong,'192.0.2.'+(i+2)))));
 assert.equal(responses.filter(x=>x.status===401).length,2);assert.equal(responses.filter(x=>x.status===429).length,6);
 assert.ok(await enter('boris',other.pin,'198.51.100.1'));
 for(let i=0;i<55;i++)await r.api.session.POST(request('unknown'+i,wrong,'203.0.113.1'));
 const before=r.sqlite.prepare("SELECT * FROM staff_login_limits").all();
 assert.equal((await r.api.session.POST(request('boris',other.pin,'203.0.113.1'))).status,429);
 assert.deepEqual(r.sqlite.prepare("SELECT * FROM staff_login_limits").all(),before);
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
 const missing=request('boris');missing.headers.delete('cf-connecting-ip');assert.equal((await r.api.session.POST(missing)).status,401,'missing source is not an admission failure');
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
 const preview: unknown=await(await send({action:'preview',command})).json();
 assert.ok(preview && typeof preview === 'object' && 'previewHash' in preview);
 assert.ok(typeof preview.previewHash === 'string' && preview.previewHash.length > 0);
 assert.equal((await send({action:'post',command,previewHash:preview.previewHash})).status,201);
 const events=()=>JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_sales_events_v1'").get(owner.userId)!.data_json));assert.equal(events()[0].actor.accountId,a.actorId);
 const stored=events()[0];assert.ok(stored.batch,'fixture includes internal cost-bearing batch');
 const safe=await r.api.sales.GET(request('','','192.0.2.1',token,'/api/sales-events','GET'));
 assert.equal(safe.status,200);assert.doesNotMatch(await safe.text(),/totalTheoreticalCost|originalMovements|recipeSnapshot|salary|payroll|staffing|openingFloat|closingReport/);
 const report=await r.api.sales.GET(request('','','192.0.2.1',token,'/api/sales-events?reportShiftId=shift','GET'));assert.equal(report.status,403);
 const next={...command,id:'blocked'};
 const p: unknown=await(await send({action:'preview',command:next})).json();
 assert.ok(p && typeof p === 'object' && 'previewHash' in p);
 assert.ok(typeof p.previewHash === 'string' && p.previewHash.length > 0);
 r.beforeNextDomainWrite(async()=>{await pins.revokeStaffPin(actor,a.membershipId);});
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

test('security review: in-flight login cannot cross revoke-restore transitions',async t=>{
 for(const transition of ['login','workspace-member','venue','workspace'])await t.test(transition,async()=>{
  const {r,a,owner,request}=await setup();try{
   r.beforeNextBatch(()=>r.beforeNextBatch(()=>{
    if(transition==='login'){
     r.sqlite.prepare("UPDATE staff_logins SET login='temporary' WHERE membership_id=?").run(a.membershipId);
     r.sqlite.prepare("UPDATE staff_logins SET login='anna' WHERE membership_id=?").run(a.membershipId);
    }else{
     const venue=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(owner.activeVenueId)!;
     const [table,where,id]=transition==='workspace-member'?['workspace_memberships','account_id',a.actorId]:transition==='venue'?['venues','id',owner.activeVenueId]:['workspaces','id',venue.workspace_id];
     r.sqlite.prepare(`UPDATE ${table} SET status='disabled' WHERE ${where}=?`).run(id);
     r.sqlite.prepare(`UPDATE ${table} SET status='active' WHERE ${where}=?`).run(id);
    }
   }));
   assert.equal((await r.api.session.POST(request())).status,401,'pre-revocation credential snapshot must not mint a session after restoration');
   assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_login_sessions').get()?.n,0);
  }finally{r.close();}
 });
});

test('security review: optional source policy only adds limits; canonical IP budgets ignore forwarding headers',async t=>{
 const disabled=await setup('');try{const req=disabled.request();req.headers.delete('cf-connecting-ip');assert.equal((await disabled.r.api.session.POST(req)).status,200);assert.equal(disabled.r.sqlite.prepare('SELECT count(*) n FROM staff_pos_attempts').get()?.n,0);}finally{disabled.r.close();}
 const {r,request}=await setup('verified-cloudflare');t.after(r.close);
 for(const source of ['.',':','abc','1.2.3.999','1.2.3.4, 5.6.7.8'])assert.equal((await r.api.session.POST(request('unknown','bad',source))).status,503);
 const spellings=['2001:db8::1','2001:0DB8:0:0:0:0:0:1'];
 for(let i=0;i<51;i++){
  const req=request('unknown'+i,'bad',spellings[i%2]);req.headers.set('x-forwarded-for','198.51.100.'+i);req.headers.set('x-real-ip','192.0.2.'+i);
  assert.equal((await r.api.session.POST(req)).status,i<50?401:429);
 }
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM staff_pos_attempts WHERE scope LIKE 'staff-source:%'").get()?.n,1);
});

test('security review: public enumeration, manager authority and cross-venue boundaries',async t=>{
 const {r,owner,actor,members,pins,a,pin,request,enter}=await setup();t.after(r.close);
 const other=await r.register('other-review@isolated.test'),foreign=await r.api.auth.authenticateRequest(r.request(other,'/api/access'));assert.ok(foreign);
 await assert.rejects(members.createPinStaff(foreign,'Conflict','cashier','ANNA'),/UNIQUE/);
 await assert.rejects(pins.issueStaffPin(foreign,a.membershipId),/ACCESS_DENIED/);
 await assert.rejects(pins.revokeStaffPin(foreign,a.membershipId),/ACCESS_DENIED/);
 await assert.rejects(members.setStaffLogin(foreign,a.membershipId,'foreign'),/ACCESS_DENIED/);
 const employee=await r.register('employee-review@isolated.test');
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(owner.activeVenueId)!.workspace_id;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,employee.userId);
 const membership=Number(r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'shift_manager','active')").run(owner.activeVenueId,employee.userId).lastInsertRowid);
 const managerRequest=r.request(employee,'/api/staff-pin/members');managerRequest.headers.set('x-venue-id',String(owner.activeVenueId));
 for(const role of ['shift_manager','cashier']){
  r.sqlite.prepare('UPDATE venue_memberships SET role=? WHERE id=?').run(role,membership);
  await assert.rejects(pins.issueStaffPin({...actor,role},a.membershipId),/ACCESS_DENIED/);
  await assert.rejects(pins.revokeStaffPin({...actor,role},a.membershipId),/ACCESS_DENIED/);
  assert.equal((await r.api.memberRoute.GET(managerRequest)).status,403);
 }
 r.sqlite.prepare("UPDATE venue_memberships SET role='manager' WHERE id=?").run(membership);
 const manager=await r.api.auth.authenticateRequest(managerRequest);assert.equal(manager?.role,'manager');
 const fresh=await pins.issueStaffPin(manager!,a.membershipId);
 const token=await enter('anna',fresh.pin);
 assert.equal((await r.api.memberRoute.GET(request('','','192.0.2.1','', '/api/staff-pin/members','GET'))).status,403);
 assert.equal((await r.api.memberRoute.GET(request('','','192.0.2.1',token,'/api/staff-pin/members','GET'))).status,403);
 for(const login of ['anna','unknown-review']){
  const responses=[];
  for(let i=0;i<6;i++){const response=await r.api.session.POST(request(login,'bad','198.51.100.'+(i+1)));responses.push([response.status,await response.json()]);}
  assert.deepEqual(responses.map(x=>x[0]),[401,401,401,401,401,429]);
  if(login==='anna')r.sqlite.prepare('DELETE FROM staff_pos_attempts').run();
 }
 const cross=request('','','192.0.2.1',token,'/api/pos-orders','GET');cross.headers.set('x-venue-id',String(other.activeVenueId));
 assert.equal((await r.api.orders.GET(cross)).status,401);
 const body=request('','','192.0.2.1',token,'/api/sales-events');body.headers.set('x-pos-actor',String(a.actorId));
 assert.equal((await r.api.sales.POST(new Request(body,{body:JSON.stringify({action:'preview',venueId:other.activeVenueId})}))).status,409);
 await pins.revokeStaffPin(manager!,a.membershipId);
 assert.equal((await r.api.session.GET(request('','','192.0.2.1',token,'/api/staff-pin/session','GET'))).status,401);
});

test('IP-independent limits: temporary lock recovers automatically with unchanged PIN beyond ten failures',async t=>{
 const {r,request,enter,members,actor,a,pin,other}=await setup();t.after(r.close);
 const original=r.sqlite.prepare('SELECT password_hash FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)?.password_hash;
 let login='anna';
 for(let round=0;round<3;round++){
  for(let i=0;i<5;i++){
   const req=request(i%2?login.toUpperCase():' '+login+' ','bad','203.0.113.'+(round*5+i));req.headers.set('x-forwarded-for',crypto.randomUUID());req.headers.delete('cf-connecting-ip');
   assert.equal((await r.api.session.POST(req)).status,401);
  }
  assert.equal((await r.api.session.POST(request(login,pin.pin))).status,429);
  if(round===0){
   await members.setStaffLogin(actor,a.membershipId,'renamed');login='renamed';
   assert.equal((await r.api.session.POST(request(login,pin.pin))).status,429,'rename cannot bypass the current credential window');
  }
  assert.ok(await enter('boris',other.pin),'colleague is not blocked');
  const before=r.sqlite.prepare('SELECT scope,window_start,window_attempts FROM staff_login_limits ORDER BY scope').all();
  assert.equal((await r.api.session.POST(request(login,pin.pin))).status,429);
  assert.deepEqual(r.sqlite.prepare('SELECT scope,window_start,window_attempts FROM staff_login_limits ORDER BY scope').all(),before,'blocked requests do not extend the delay');
  // Advance the persisted fixture window; no PIN reset/unlock/owner action.
  r.sqlite.prepare('UPDATE staff_login_limits SET window_start=window_start-1').run();
  assert.ok(await enter(login,pin.pin),'same correct PIN works in the next window');
 }
 assert.equal(r.sqlite.prepare('SELECT password_hash FROM staff_pin_credentials WHERE membership_id=?').get(a.membershipId)?.password_hash,original);
});
test('IP-independent limits: parallel admission, expired lease and reset in-flight are fail closed',async t=>{
 const {r,request,pins,actor,a,enter}=await setup();t.after(r.close);
 const responses=await Promise.all(Array.from({length:12},(_,i)=>r.api.session.POST(request('anna','bad','192.0.2.'+i))));
 assert.equal(responses.filter(x=>x.status===401).length,2);assert.equal(responses.filter(x=>x.status===429).length,10);
 assert.equal(r.sqlite.prepare("SELECT attempts FROM staff_login_limits WHERE scope='login:anna'").get()?.attempts,2);
 r.beforeNextBatch(()=>r.beforeNextBatch(()=>{r.sqlite.prepare('UPDATE staff_login_leases SET expires_at=0').run();}));
 assert.equal((await r.api.session.POST(request())).status,401,'expired work cannot mint a session');
 r.beforeNextBatch(()=>r.beforeNextBatch(async()=>{await pins.issueStaffPin(actor,a.membershipId);}));
 assert.equal((await r.api.session.POST(request())).status,401,'reset invalidates pending lease and credential snapshot');
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_login_leases').get()?.n,0);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM staff_login_sessions').get()?.n,0);
 r.beforeNextBatch(async()=>{await pins.issueStaffPin(actor,a.membershipId);});
 assert.equal((await r.api.session.POST(request())).status,429,'stale credential snapshot cannot reserve against the replacement PIN');
 assert.equal(r.sqlite.prepare("SELECT attempts FROM staff_login_limits WHERE scope='login:anna'").get()?.attempts,0);
});
test('IP-independent limits: unknown login follows same lockout and new staff cannot inherit pre-lockout',async t=>{
 const {r,request,members,pins,actor,enter}=await setup();t.after(r.close);
 for(let round=0;round<2;round++){
  for(let i=0;i<5;i++)assert.equal((await r.api.session.POST(request('future','bad'))).status,401);
  assert.equal((await r.api.session.POST(request('future','bad'))).status,429);
  r.sqlite.prepare('UPDATE staff_login_limits SET window_start=window_start-1').run();
 }
 assert.equal((await r.api.session.POST(request('future','bad'))).status,401,'unknown login also recovers in a new window after ten failures');
 const future=await members.createPinStaff(actor,'Future','cashier','future'),pin=await pins.issueStaffPin(actor,future.membershipId);
 assert.ok(await enter('future',pin.pin));
});

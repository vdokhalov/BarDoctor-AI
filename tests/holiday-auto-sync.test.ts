import test from 'node:test';import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const now='2026-10-28T06:00:00Z';
const source=(date='2027-01-01')=>[{nationwide:true,type:'Public',startDate:date,endDate:date,name:[{language:'EN',text:date.endsWith('-01-01')?'New Year':'Labor Day'}]}];
async function setup(){const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route',sync:'./lib/bardoctor/holiday-auto-sync'},{now});const user=await r.register('auto@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Молдова',city:'Кишинёв',timezone:'Europe/Chisinau'}),user.userId);return {r,user,api:r.api as any};}
function stored(r:any,id:number,key='bd_opportunity_calendar_v1'){return JSON.parse(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(id,key)?.data_json??'null');}
test('authenticated automatic refresh reaches source once; repeat, tenant, deletion and decisions survive',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(source())};try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));
  const response=await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh',automatic:true}));assert.equal(response.status,200);assert.equal((await response.json()).syncOutcome,'updated');assert.equal(calls,1);
  const cal=stored(r,user.userId),target=cal.events.find((e:any)=>e.title==='Новый год');target.decision='planned';target.potentialScore=77;target.assessmentAvailable=true;
  cal.events.push({...target,id:'custom',title:'Моё событие',sourceUrls:['https://local.test/event']});
  const deleted=cal.events.find((e:any)=>e.id!==target.id&&e.id!=='custom');cal.deletedEventIds=[deleted.id];cal.events=cal.events.filter((e:any)=>e.id!==deleted.id);
  r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(cal),user.userId);
  const repeat=await api.sync.syncHolidayAccount(user.userId);assert.equal(repeat.status,'not_due');assert.equal(calls,1);
  r.setNow('2026-11-05T06:00:00Z');await api.sync.syncHolidayAccount(user.userId);
  const after=stored(r,user.userId);assert.equal(after.events.find((e:any)=>e.id===target.id).decision,'planned');assert.equal(after.events.find((e:any)=>e.id===target.id).potentialScore,77);assert.ok(after.events.some((e:any)=>e.id==='custom'));assert.ok(!after.events.some((e:any)=>e.id===deleted.id));assert.equal(new Set(after.events.map((e:any)=>e.id)).size,after.events.length);
  const foreign=await r.register('foreign@local.test');assert.equal(stored(r,foreign.userId),null);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,0);
  assert.equal((await api.opportunities.POST(new Request('https://isolated.test/api/opportunities',{method:'POST',body:JSON.stringify({action:'refresh',automatic:true})}))).status,401);
 }finally{globalThis.fetch=old;r.close()}
});
test('failure preserves snapshot, backs off; static country never contacts source',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;let calls=0;try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));const before=stored(r,user.userId);
  globalThis.fetch=async()=>{calls++;throw Error('offline')};assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'failed');assert.deepEqual(stored(r,user.userId),before);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'not_due');assert.equal(calls,1);assert.ok(stored(r,user.userId,'bd_holiday_sync_v1').error);assert.equal(stored(r,user.userId,'bd_holiday_sync_v1').lastSuccess,undefined);
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Россия',city:'Москва'}),user.userId);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'static');assert.equal(calls,1);
 }finally{globalThis.fetch=old;r.close()}
});
test('per-venue updates remain isolated and do not send notifications',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(source())};try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));const other=await r.register('other@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Other',country:'Молдова',city:'Бельцы'}),other.userId);await api.opportunities.GET(r.request(other,'/api/opportunities'));
  const untouched=stored(r,other.userId);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'updated');assert.deepEqual(stored(r,other.userId),untouched);
  assert.equal((await api.sync.syncHolidayAccount(other.userId)).status,'updated');assert.equal(calls,2);assert.notEqual(stored(r,user.userId).venueName,stored(r,other.userId).venueName);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'not_due');assert.equal(calls,2);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,0);
 }finally{globalThis.fetch=old;r.close()}
});
test('concurrent requests and concurrent calendar edit do not lose decisions',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;let calls=0;try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  globalThis.fetch=async()=>{calls++;await gate;return Response.json(source())};const first=api.sync.syncHolidayAccount(user.userId);while(!calls)await new Promise(r=>setTimeout(r,1));
  assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'not_due');
  const cal=stored(r,user.userId);cal.events[0].decision='dismissed';const id=cal.events[0].id;r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(cal),user.userId);release();assert.equal((await first).status,'updated');assert.equal(stored(r,user.userId).events.find((e:any)=>e.id===id).decision,'dismissed');assert.equal(calls,1);
 }finally{globalThis.fetch=old;r.close()}
});
test('future year comes from real source; source removal is visible and profile changes abort',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));globalThis.fetch=async()=>Response.json(source());await api.sync.syncHolidayAccount(user.userId);
  r.setNow('2026-11-06T06:00:00Z');globalThis.fetch=async()=>Response.json(source('2027-01-02'));await api.sync.syncHolidayAccount(user.userId);assert.match(stored(r,user.userId).events.find((e:any)=>e.startDate==='2027-01-01'&&e.title==='Новый год').summary,/отсутствует/);
  r.setNow('2027-11-06T06:00:00Z');globalThis.fetch=async()=>Response.json(source('2028-01-01'));await api.sync.syncHolidayAccount(user.userId);assert.ok(stored(r,user.userId).events.some((e:any)=>e.startDate==='2028-01-01'));
  const before=stored(r,user.userId);r.setNow('2027-11-15T06:00:00Z');globalThis.fetch=async()=>{r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Changed',country:'Германия'}),user.userId);return Response.json(source('2028-01-01'))};assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'failed');assert.deepEqual(stored(r,user.userId),before);
 }finally{globalThis.fetch=old;r.close()}
});
test('permission denial, malformed response, expired lease and atomic rollback are safe',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));
  const member=await r.register('readonly@local.test');r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) SELECT workspace_id,?,'member','active' FROM venues WHERE id=?").run(member.userId,user.activeVenueId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status,permissions_json) VALUES(?,?,'manager','active',?)").run(user.activeVenueId,member.userId,JSON.stringify({deny:['calendar.manage']}));
  const req=r.request(member,'/api/opportunities','POST',{action:'refresh',automatic:true});req.headers.set('X-Venue-Id',String(user.activeVenueId));assert.equal((await api.opportunities.POST(req)).status,403);
  const before=stored(r,user.userId);globalThis.fetch=async()=>Response.json([{nationwide:true,type:'Public',startDate:'2027-02-30',endDate:'2027-02-30',name:[{language:'EN',text:'Bad'}]}]);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'failed');assert.deepEqual(stored(r,user.userId),before);
  r.setNow('2026-10-28T08:00:00Z');globalThis.fetch=async()=>{r.failDatabase();return Response.json(source())};assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'failed');assert.deepEqual(stored(r,user.userId),before);
  r.setNow('2026-10-28T10:00:00Z');globalThis.fetch=async()=>Response.json(source());assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'updated');assert.ok(stored(r,user.userId,'bd_holiday_sync_v1').lastSuccess);
 }finally{globalThis.fetch=old;r.close()}
});
test('malformed synchronization metadata does not erase events',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;globalThis.fetch=async()=>Response.json(source());try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?)').run(user.userId,'bd_holiday_sync_v1','not-json',now);
  const result=await api.sync.syncHolidayAccount(user.userId);assert.equal(result.status,'updated');assert.ok(stored(r,user.userId).events.length);assert.ok(stored(r,user.userId,'bd_holiday_sync_v1').lastSuccess);
 }finally{globalThis.fetch=old;r.close()}
});
test('provider UUID survives date/title correction, never adopts legacy decisions, and deletion survives another correction',async()=>{
 const {r,user,api}=await setup();const old=globalThis.fetch;const uuid='091f8ddb-fe35-496a-b9ed-abf9c36688cd';let date='2027-01-01';let title='New Year';
 globalThis.fetch=async()=>Response.json([{...source(date)[0],id:uuid,name:[{language:'EN',text:title}]}]);
 try{
  await api.opportunities.GET(r.request(user,'/api/opportunities'));
  const legacy=stored(r,user.userId);const original=legacy.events.find((e:any)=>e.title==='Новый год');original.decision='dismissed';
  r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(legacy),user.userId);
  await api.sync.syncHolidayAccount(user.userId);let cal=stored(r,user.userId);let event=cal.events.find((e:any)=>e.sourceIdentity);const id=event.id;
  assert.equal(event.decision,'watching');assert.equal(cal.events.find((e:any)=>e.id===original.id).decision,'dismissed');
  event.decision='planned';r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(cal),user.userId);
  date='2027-01-03';title='Labor Day';r.setNow('2026-11-06T06:00:00Z');await api.sync.syncHolidayAccount(user.userId);cal=stored(r,user.userId);event=cal.events.find((e:any)=>e.id===id);
  assert.equal(event.startDate,date);assert.equal(event.title,'Праздник труда');assert.equal(event.decision,'planned');assert.equal(event.sourceScheduleChanged,true);assert.equal(cal.events.filter((e:any)=>e.sourceIdentity).length,1);
  const deleted=await api.opportunities.PATCH(r.request(user,'/api/opportunities','PATCH',{action:'delete-event',eventId:id}));assert.equal(deleted.status,200);
  date='2027-01-04';r.setNow('2026-11-15T06:00:00Z');await api.sync.syncHolidayAccount(user.userId);assert.equal(stored(r,user.userId).events.some((e:any)=>e.id===id),false);
  assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,0);
 }finally{globalThis.fetch=old;r.close()}
});

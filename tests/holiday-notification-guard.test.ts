import test from 'node:test';import assert from 'node:assert/strict';import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const now='2026-10-28T06:00:00Z';
async function fixture(){const r=await lifecycleRuntime({calendar:'./lib/bardoctor/opportunity-calendar',sync:'./lib/bardoctor/holiday-auto-sync',opportunities:'./app/api/opportunities/route',jobs:'./lib/bardoctor/notification-jobs',guard:'./lib/bardoctor/holiday-notification-guard'},{now,bindings:{ONESIGNAL_APP_ID:'local-app',ONESIGNAL_REST_API_KEY:'local-test-only'}});const owner=await r.register('guard@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country:'Молдова',city:'Кишинёв'}),owner.userId);return {r,owner,api:r.api as any};}
function source(date:string){return [{nationwide:true,type:'Public',startDate:date,endDate:date,name:[{language:'EN',text:date.endsWith('-01-01')?'New Year':'Labor Day'}]}]}
async function job(api:any,owner:any,id:string,key:string,time='2027-01-01T09:00:00Z'){return api.jobs.enqueueNotificationJob({accountId:owner.userId,venueId:owner.activeVenueId,sourceType:'opportunity',sourceId:`venue:${owner.activeVenueId}:${id}`,category:'calendar',dedupeKey:key,title:'Local',message:'Local',targetUrl:'/opportunities',targetAt:time,timezone:'UTC'});}
test('source date change atomically cancels only unsent jobs; decision, provider jobs and foreign venue survive',async()=>{
 const {r,owner,api}=await fixture(),old=globalThis.fetch;globalThis.fetch=async()=>Response.json(source('2027-01-01'));try{
  await api.opportunities.GET(r.request(owner,'/api/opportunities'));await api.sync.syncHolidayAccount(owner.userId);
  const read=()=>JSON.parse(String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(owner.userId)?.data_json));
  const cal=read(),event=cal.events.find((e:any)=>e.title==='Новый год');event.decision='planned';r.sqlite.prepare("UPDATE domain_data SET data_json=? WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").run(JSON.stringify(cal),owner.userId);
  const queued=await job(api,owner,event.id,'queued'),scheduled=await job(api,owner,event.id,'provider');r.sqlite.prepare("UPDATE notification_jobs SET status='scheduled',provider_message_id='provider-local' WHERE id=?").run(scheduled.id);
  const foreign=await r.register('foreign-guard@local.test');const untouched=await job(api,foreign,event.id,'foreign');
  r.setNow('2026-11-06T06:00:00Z');globalThis.fetch=async()=>Response.json(source('2027-01-02'));await api.sync.syncHolidayAccount(owner.userId);
  assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(queued.id)?.status,'cancelled');assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(scheduled.id)?.status,'scheduled');assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(untouched.id)?.status,'queued');
  const held=read().events.find((e:any)=>e.id===event.id);assert.equal(held.sourceMissing,true);assert.equal(held.decision,'planned');assert.equal(await api.guard.holidaySourceHeld(owner.activeVenueId,`venue:${owner.activeVenueId}:${event.id}`),true);
  const audits=r.sqlite.prepare("SELECT count(*) n FROM notification_job_events WHERE job_id=? AND to_status='cancelled'").get(queued.id)?.n;await api.sync.syncHolidayAccount(owner.userId);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM notification_job_events WHERE job_id=? AND to_status='cancelled'").get(queued.id)?.n,audits);
 }finally{globalThis.fetch=old;r.close()}
});
test('provider cancellation must succeed; sent history untouched, retry does not resend or double cancel',async()=>{
 const {r,owner,api}=await fixture(),old=globalThis.fetch;try{
  const scheduled=await job(api,owner,'held','provider'),past=await job(api,owner,'held','past','2026-10-20T09:00:00Z');r.sqlite.prepare("UPDATE notification_jobs SET status='scheduled',provider_message_id='provider-local' WHERE id=?").run(scheduled.id);r.sqlite.prepare("UPDATE notification_jobs SET status='accepted',provider_message_id='sent-local' WHERE id=?").run(past.id);
  let calls=0;globalThis.fetch=async(_url,options)=>{calls++;assert.equal(options?.method,'DELETE');return new Response('{}',{status:503})};const invoke=()=>api.jobs.cancelPendingOpportunityJobs(owner.userId,owner.activeVenueId,`venue:${owner.activeVenueId}:held`);
  await assert.rejects(invoke,/не подтверждена/);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(scheduled.id)?.status,'scheduled');
  globalThis.fetch=async()=>{calls++;return Response.json({success:false})};await assert.rejects(invoke,/не подтверждена/);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(scheduled.id)?.status,'scheduled');
  globalThis.fetch=async(_url,options)=>{calls++;assert.equal(options?.method,'DELETE');return Response.json({success:true})};await invoke();await invoke();assert.equal(calls,3);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(scheduled.id)?.status,'cancelled');assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(past.id)?.status,'accepted');
  const flight=await job(api,owner,'held','inflight');r.sqlite.prepare("UPDATE notification_jobs SET status='dispatching' WHERE id=?").run(flight.id);await assert.rejects(invoke,/уже выполняется/);assert.equal(calls,3);
 }finally{globalThis.fetch=old;r.close()}
});
test('dispatch rechecks held source and never submits a stale queued reminder',async()=>{
 const {r,owner,api}=await fixture(),old=globalThis.fetch;try{
  const calendar={events:[{id:'held',sourceMissing:true}]};r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?)').run(owner.userId,'bd_opportunity_calendar_v1',JSON.stringify(calendar),now);
  r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(owner.userId);r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'guard-device','guard-sub','granted',1,1)").run(owner.userId);
  const queued=await job(api,owner,'held','stale-dispatch','2026-10-30T09:00:00Z');let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Provider must not be called')};await api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:owner.userId});assert.equal(calls,0);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(queued.id)?.status,'cancelled');
 }finally{globalThis.fetch=old;r.close()}
});
test('actual calendar reconciliation keeps a held planned event without recreating jobs',async()=>{
 const {r,owner,api}=await fixture(),old=globalThis.fetch;try{
  r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(owner.userId);r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'held-device','held-sub','granted',1,1)").run(owner.userId);
  const queued=await job(api,owner,'held','reconcile-held');const event={id:'held',sourceMissing:true,startDate:'2027-01-01',activationDate:'2027-01-01',title:'Local',decision:'planned',potentialScore:80,recommendation:{decisionDeadline:'2026-12-15',leadDays:17},notificationPlan:{status:'queued',count:0,queuedCount:1,messages:[],signature:'',nextAt:null}};
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No send')};const base={events:[event],sources:[]};const next=await api.calendar.reconcileOpportunityNotifications({accountId:owner.userId,venueId:owner.activeVenueId,origin:'https://local.test',previous:structuredClone(base),next:structuredClone(base)});assert.equal(next.events[0].decision,'planned');assert.equal(next.events[0].notificationPlan.status,'not_needed');assert.equal(calls,0);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(queued.id)?.status,'cancelled');assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,1);
 }finally{globalThis.fetch=old;r.close()}
});
test('changed source schedule waits for acknowledged cancellation and persisted release before replacement',async()=>{
 const {r,owner,api}=await fixture(),old=globalThis.fetch;try{
  r.setNow('2026-12-18T06:00:00Z');
  r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(owner.userId);
  r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'change-device','change-sub','granted',1,1)").run(owner.userId);
  const queued=await job(api,owner,'changed','old-schedule');r.sqlite.prepare("UPDATE notification_jobs SET status='scheduled',provider_message_id='old-provider' WHERE id=?").run(queued.id);
  const event={id:'changed',sourceScheduleChanged:true,sourceRevision:1,startDate:'2027-01-03',activationDate:'2027-01-03',title:'Local',decision:'planned',potentialScore:80,recommendation:{decisionDeadline:null,leadDays:14},notificationPlan:{status:'scheduled',count:1,queuedCount:0,messages:[],signature:'',nextAt:null}};
  const base={events:[event],sources:[]};const save=(value:any)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_opportunity_calendar_v1',JSON.stringify(value),now);save(base);
  const reconcile=(value:any)=>api.calendar.reconcileOpportunityNotifications({accountId:owner.userId,venueId:owner.activeVenueId,origin:'https://local.test',previous:structuredClone(value),next:structuredClone(value)});
  let sends=0,deletes=0;globalThis.fetch=async(_url,options)=>{assert.equal(options?.method,'DELETE');deletes++;return Response.json({success:false})};await assert.rejects(()=>reconcile(base));assert.equal(await api.guard.holidaySourceHeld(owner.activeVenueId,`venue:${owner.activeVenueId}:changed`),true);
  globalThis.fetch=async(_url,options)=>{assert.equal(options?.method,'DELETE');deletes++;return Response.json({success:true})};const released=await reconcile(base);assert.equal(released.events[0].sourceScheduleChanged,false);assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs').get()?.n,1);save(released);
  assert.equal(await api.guard.holidaySourceHeld(owner.activeVenueId,`venue:${owner.activeVenueId}:changed`),false);
  globalThis.fetch=async(_url,options)=>{assert.equal(options?.method,'POST');sends++;return Response.json({id:'new-provider-'+sends})};const planned=await reconcile(released);save(planned);await reconcile(planned);
  assert.equal(deletes,2);assert.equal(sends,3);assert.equal(r.sqlite.prepare("SELECT count(*) n FROM notification_jobs WHERE dedupe_key LIKE '%:r1'").get()?.n,3);assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(queued.id)?.status,'cancelled');
 }finally{globalThis.fetch=old;r.close()}
});

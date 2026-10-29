import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {lifecycleRuntime} from './helpers/lifecycle-runtime';
const now='2026-10-29T05:10:00Z';
const fixture='tests/fixtures/signed-release-40821389360/';
const payload=readFileSync(fixture+'payload.json','utf8'),bundle=readFileSync(fixture+'bundle.json','utf8');
const config=JSON.stringify({source:{releaseFeed:true},policy:JSON.parse(readFileSync(fixture+'policy.json','utf8')),root:JSON.parse(readFileSync(fixture+'trusted-root.json','utf8'))});
// Mutable binding models admission checks; real deployed env revisions do not cancel old isolates.
class Bucket{objects=new Map<string,{text:string;etag:string}>();seq=0;async get(k:string){const o=this.objects.get(k);return o?{etag:o.etag,text:async()=>o.text}:null}async put(k:string,text:string,options:any={}){const old=this.objects.get(k),c=options.onlyIf;if(c?.etagDoesNotMatch==='*'&&old||c?.etagMatches&&old?.etag!==c.etagMatches)return null;const result={etag:String(++this.seq)};this.objects.set(k,{text,...result});return result}}
async function setup(country='Молдова'){const bucket=new Bucket();let flag='true';const binding={trim:()=>flag};const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route',sync:'./lib/bardoctor/holiday-auto-sync',signed:'./lib/bardoctor/holiday-signed-source',control:'./lib/bardoctor/holiday-sync-control',guard:'./lib/bardoctor/holiday-notification-guard',jobs:'./lib/bardoctor/notification-jobs'},{now,bindings:{ONESIGNAL_APP_ID:'local-app',ONESIGNAL_REST_API_KEY:'local-test-only',BUCKET:bucket,HOLIDAY_AUTO_SYNC_DISABLED:binding,HOLIDAY_SIGNED_SOURCE:config}});const user=await r.register('control@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',country,city:'Local'}),user.userId);return {r,user,bucket,api:r.api as any,set:(v:string)=>flag=v}}
const rows=(r:any)=>r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all();
const source=()=>Response.json([{nationwide:true,type:'Public',startDate:'2027-01-01',endDate:'2027-01-01',name:[{language:'EN',text:'New Year'}]}]);
for(const country of ['Молдова','Германия','Россия'])test('paused '+country+' automatic handler/source make no writes or fetch',async()=>{
 const {r,user,api}=await setup(country),old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not fetch')};try{
 await api.opportunities.GET(r.request(user,'/api/opportunities'));const before=rows(r),objects=[...r.objects];
 const res=await(await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh',automatic:true}))).json();assert.equal(res.syncOutcome,'disabled');assert.equal(res.sync.due,false);assert.equal(res.sync.paused,true);
 assert.equal((await api.signed.refreshSignedSource()).status,'disabled');assert.deepEqual(rows(r),before);assert.deepEqual([...r.objects],objects);assert.equal(calls,0);
 }finally{globalThis.fetch=old;r.close()}
});
test('enabled resumes; in-flight completion allowed but new concurrent admission denied',async()=>{
 const {r,user,api,set}=await setup(),old=globalThis.fetch;let calls=0,release!:()=>void;const gate=new Promise<void>(f=>release=f);globalThis.fetch=async()=>{calls++;await gate;return source()};try{
 await api.opportunities.GET(r.request(user,'/api/opportunities'));set('false');const first=api.sync.syncHolidayAccount(user.userId);while(!calls)await new Promise(f=>setTimeout(f,1));set('true');const during=rows(r);
 assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'disabled');assert.deepEqual(rows(r),during);release();assert.equal((await first).status,'updated');assert.equal(calls,1);
 const after=rows(r);assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'disabled');assert.deepEqual(rows(r),after);set('false');assert.equal((await api.sync.syncHolidayAccount(user.userId)).status,'not_due');assert.equal(calls,1);
 set('typo');assert.equal(api.control.holidayAutoSyncPaused(),true);
 }finally{release();globalThis.fetch=old;r.close()}
});
test('paused signed source still reads last-good and held date safeguard stays active',async()=>{
 const {r,user,api,set,bucket}=await setup('Россия'),old=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url:any)=>{calls++;return String(url).startsWith('https://api.github.com/')?Response.json([{tag_name:'holiday-feed-40821389360-1',published_at:now,draft:false,prerelease:false,assets:['holiday-source.json','holiday-source.sigstore.json'].map(name=>({name,state:'uploaded',size:100,browser_download_url:`https://github.com/vdokhalov/BarDoctor-AI/releases/download/holiday-feed-40821389360-1/${name}`}))}]):new Response(String(url).endsWith('.sigstore.json')?bundle:payload)};
 try{set('false');assert.equal((await api.signed.refreshSignedSource()).status,'stored');const before=await api.signed.readSignedSource(),objects=[...bucket.objects];set('true');assert.equal((await api.signed.refreshSignedSource()).status,'disabled');assert.deepEqual(await api.signed.readSignedSource(),before);assert.deepEqual([...bucket.objects],objects);assert.equal(calls,3);assert.equal((await api.signed.signedSourceStatus()).due,false);
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?)').run(user.userId,'bd_opportunity_calendar_v1',JSON.stringify({events:[{id:'held',sourceScheduleChanged:true,decision:'planned'}]}),now);
 assert.equal(await api.guard.holidaySourceHeld(user.activeVenueId,`venue:${user.activeVenueId}:held`),true);
 r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(user.userId);
 r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'local-device','local-sub','granted',1,1)").run(user.userId);
 const job=await api.jobs.enqueueNotificationJob({accountId:user.userId,venueId:user.activeVenueId,sourceType:'opportunity',sourceId:`venue:${user.activeVenueId}:held`,category:'calendar',dedupeKey:'paused-held',title:'Local',message:'Local',targetUrl:'/opportunities',targetAt:'2026-10-30T09:00:00Z',timezone:'UTC'});
 globalThis.fetch=async()=>{throw Error('held reminder must not send')};await api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:user.userId});assert.equal(r.sqlite.prepare('SELECT status FROM notification_jobs WHERE id=?').get(job.id)?.status,'cancelled');
 }finally{globalThis.fetch=old;r.close()}
});

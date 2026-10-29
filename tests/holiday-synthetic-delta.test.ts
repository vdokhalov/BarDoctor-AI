import test from 'node:test';import assert from 'node:assert/strict';import {syntheticDeltaRuntime} from './helpers/synthetic-calendar';
test('synthetic revisions: automatic open adds reviewed data; canonical alias preserves mark; date/ambiguous corrections remain unresolved; legacy hidden hash survives',async()=>{
 const f=await syntheticDeltaRuntime();try{
 let data=await f.open();assert.equal(data.syncOutcome,'updated');let events=data.calendar.events;
 const marked=events.find((e:any)=>e.startDate==='2028-01-01'),hidden=events.find((e:any)=>e.startDate==='2028-05-09');assert.ok(marked&&hidden);
 const conflictId=events.find((e:any)=>e.startDate==='2028-02-23').id;
 for(const body of [{action:'set-decision',eventId:conflictId,decision:'planned'},{action:'set-decision',eventId:marked.id,decision:'planned'},{action:'delete-event',eventId:hidden.id}]){const res=await f.api.opportunities.PATCH(f.r.request(f.user,'/api/opportunities','PATCH',body));assert.equal(res.status,200,await res.text());}
 f.next();data=await f.open();assert.equal(data.syncOutcome,'updated');events=data.calendar.events;
 assert.equal(events.find((e:any)=>e.id===marked.id).decision,'planned');assert.ok(events.some((e:any)=>e.startDate==='2028-06-12'&&e.title==='День России'));
 assert.ok(!events.some((e:any)=>e.id===hidden.id||e.startDate==='2028-05-10'||e.title.startsWith('Неоднозначная')));
 assert.equal(events.find((e:any)=>e.startDate==='2028-02-23'&&e.title==='День защитника Отечества').sourceMissing,true);
 assert.ok(!events.some((e:any)=>e.startDate==='2028-02-24'));assert.equal(events.find((e:any)=>e.id===conflictId).decision,'planned');
 assert.ok(!events.some((e:any)=>e.startDate==='2028-06-14'||e.startDate==='2028-06-15'));assert.ok(!events.find((e:any)=>e.startDate==='2028-03-08')?.sourceMissing);
 assert.match(data.calendar.summary,/требующие проверки: 6/);
 const saved=f.r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(f.user.userId)!.data_json;
 assert.ok(JSON.parse(String(saved)).deletedEventIds.includes(hidden.id));
 data=await f.open();assert.equal(data.sync.due,false);assert.equal(f.r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_opportunity_calendar_v1'").get(f.user.userId)!.data_json,saved);
 // A new source event uses the existing authenticated mutation route.
 const added=events.find((e:any)=>e.startDate==='2028-06-12');assert.equal((await f.api.opportunities.PATCH(f.r.request(f.user,'/api/opportunities','PATCH',{action:'set-decision',eventId:added.id,decision:'planned'}))).status,200);
 const other=await f.r.register('other@local.test');assert.equal((await f.api.opportunities.PATCH(f.r.request(other,'/api/opportunities','PATCH',{action:'set-decision',eventId:added.id,decision:'planned'}))).status,400);
 }finally{f.r.close()}
});
test('viewer reads saved calendar but forced automatic POST is 403 without calendar writes (existing auth membership maintenance remains)',async()=>{
 const f=await syntheticDeltaRuntime();try{await f.open();const viewer=await f.r.register('viewer@local.test');f.r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) SELECT workspace_id,?,'member','active' FROM venues WHERE id=?").run(viewer.userId,f.user.activeVenueId);f.r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES(?,?,'shift_manager','active')").run(f.user.activeVenueId,viewer.userId);const request=(method='GET',body?:unknown)=>{const r=f.r.request(viewer,'/api/opportunities',method,body);r.headers.set('X-Venue-Id',String(f.user.activeVenueId));return r;};
 const get=await f.api.opportunities.GET(request());assert.equal(get.status,200);assert.equal((await get.json()).sync.allowed,false);
 const before=JSON.stringify(f.r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());let domainWrites=0;f.r.beforeNextDomainWrite(()=>{domainWrites++});
 const post=await f.api.opportunities.POST(request('POST',{action:'refresh',automatic:true}));assert.equal(post.status,403,await post.text());assert.equal(domainWrites,0);assert.equal(JSON.stringify(f.r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
 }finally{f.r.close()}
});

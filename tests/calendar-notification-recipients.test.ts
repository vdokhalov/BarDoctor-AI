import assert from 'node:assert/strict';
import test from 'node:test';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';

test('calendar fans out to subscribed venue roles once, with membership/preferences/isolation and retry guards',async()=>{
 const r=await lifecycleRuntime({recipients:'./lib/bardoctor/calendar-notification-recipients',calendar:'./lib/bardoctor/opportunity-calendar',jobs:'./lib/bardoctor/notification-jobs'}, {now:'2026-10-27T10:00:00Z',bindings:{ONESIGNAL_APP_ID:'local-app',ONESIGNAL_REST_API_KEY:'local-test-only'}});
 const api=r.api as any;
 try{
 const owner=await r.register('owner@local.test'),manager=await r.register('manager@local.test'),admin=await r.register('admin@local.test'),cashier=await r.register('cashier@local.test'),outsider=await r.register('outsider@local.test');
 const venue=owner.activeVenueId;
 for (const user of [manager,admin,cashier]) r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) SELECT workspace_id,?,'member','active' FROM venues WHERE id=?").run(user.userId,venue);
 for(const [user,role] of [[manager,'manager'],[admin,'shift_manager'],[cashier,'cashier']] as const)r.sqlite.prepare('INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES(?,?,?,?)').run(venue,user.userId,role,'active');
 for(const user of [owner,manager,admin,cashier,outsider]){
 r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(user.userId);
 r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,?,?,'granted',1,1)").run(user.userId,'device-'+user.userId,'sub-'+user.userId);
 }
 r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'second-device','second-sub','granted',1,1)").run(owner.userId);
 assert.deepEqual((await api.recipients.calendarNotificationRecipients(venue)).sort(),[owner.userId,manager.userId,admin.userId].sort());
 r.sqlite.prepare('UPDATE notification_preferences SET calendar_alerts=0 WHERE account_id=?').run(manager.userId);
 r.sqlite.prepare("UPDATE notification_devices SET permission='denied' WHERE account_id=?").run(admin.userId);
 assert.deepEqual(await api.recipients.calendarNotificationRecipients(venue),[owner.userId]);
 r.sqlite.prepare('UPDATE notification_preferences SET calendar_alerts=1 WHERE account_id=?').run(manager.userId);
 r.sqlite.prepare("UPDATE notification_devices SET permission='granted' WHERE account_id=?").run(admin.userId);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run(JSON.stringify({deny:['calendar.view']}),venue,admin.userId);
 assert.deepEqual((await api.recipients.calendarNotificationRecipients(venue)).sort(),[owner.userId,manager.userId].sort());
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=NULL WHERE venue_id=? AND account_id=?').run(venue,admin.userId);
 // Dates outside provider scheduling window: real DB/job code, no provider invocation.
 const event={id:'same-event',startDate:'2027-12-20',activationDate:'2027-12-20',title:'Local',decision:'planned',potentialScore:80,recommendation:{decisionDeadline:'2027-12-01',leadDays:19,format:'Local',operations:'Local'},notificationPlan:{status:'not_needed',count:0,messages:[],signature:'',nextAt:null}};
 const base={events:[event],sources:[]};
 r.sqlite.prepare('UPDATE notification_devices SET active=0 WHERE account_id=?').run(outsider.userId);
 const unavailable=await api.calendar.reconcileOpportunityNotifications({accountId:outsider.userId,venueId:outsider.activeVenueId,origin:'https://local.test',previous:null,next:structuredClone(base)});
 assert.equal(unavailable.events[0].notificationPlan.status,'unavailable');
 assert.equal(unavailable.events[0].notificationPlan.count,0);
 r.sqlite.prepare('UPDATE notification_devices SET active=1 WHERE account_id=?').run(outsider.userId);
 const originalFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('EXTERNAL_CALL_FORBIDDEN')};
 try{
 const first=await api.calendar.reconcileOpportunityNotifications({accountId:owner.userId,venueId:venue,origin:'https://local.test',previous:null,next:structuredClone(base)});
 assert.equal(first.events[0].notificationPlan.status,'queued');
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE venue_id=?').get(venue)?.n,9);
 await api.calendar.reconcileOpportunityNotifications({accountId:owner.userId,venueId:venue,origin:'https://local.test',previous:first,next:structuredClone(first)});
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE venue_id=?').get(venue)?.n,9);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM notification_jobs WHERE target_url NOT LIKE ?").get('%venue='+venue+'%')?.n,0);
 // Same event ID for another venue does not collide with owner's other subscriptions.
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) SELECT workspace_id,?,'member','active' FROM venues WHERE id=?").run(owner.userId,outsider.activeVenueId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES(?,?,'manager','active')").run(outsider.activeVenueId,owner.userId);
 await api.calendar.reconcileOpportunityNotifications({accountId:outsider.userId,venueId:outsider.activeVenueId,origin:'https://local.test',previous:null,next:structuredClone(base)});
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE account_id=?').get(owner.userId)?.n,6);
 // Preference is checked again at dispatch, before contacting provider.
 r.sqlite.prepare('UPDATE notification_preferences SET enabled=0 WHERE account_id=?').run(manager.userId);
 await api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:manager.userId,now:new Date('2027-11-30T10:00:00Z')});
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM notification_jobs WHERE account_id=? AND status='cancelled'").get(manager.userId)?.n,3);
 assert.equal(calls,0);
 // Only mocked provider acknowledgments; no device delivery claim.
 const aliases:string[]=[];
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));aliases.push(body.include_aliases.external_id[0]);return Response.json({id:'mock-'+aliases.length});};
 r.setNow('2027-11-30T10:00:00Z');
 await Promise.all([1,2].map(()=>api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:owner.userId,now:new Date('2027-11-30T10:00:00Z')})));
 assert.equal(aliases.length,6);
 assert.equal(new Set(aliases).size,1);
 assert.match(aliases[0],new RegExp(String(owner.userId)+'$'));
 await api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:owner.userId,now:new Date('2027-11-30T10:00:00Z')});
 assert.equal(aliases.length,6);
 r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE venue_id=? AND account_id=?").run(venue,admin.userId);
 await api.jobs.dispatchNotificationJobs({origin:'https://local.test',accountId:admin.userId,now:new Date('2027-11-30T10:00:00Z')});
 assert.equal(aliases.length,6);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM notification_jobs WHERE account_id=? AND status='cancelled'").get(admin.userId)?.n,3);
 // No active subscription is not reported as a delivery or even a queued plan.
 r.sqlite.prepare('UPDATE notification_devices SET active=0 WHERE account_id=?').run(outsider.userId);
 r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE venue_id=? AND account_id=?").run(outsider.activeVenueId,owner.userId);
 assert.deepEqual(await api.recipients.calendarNotificationRecipients(outsider.activeVenueId),[]);
 }finally{globalThis.fetch=originalFetch}
 }finally{r.close()}
});

test('existing notification runner processes manager subscription when owner notifications are off',async()=>{
 const r=await lifecycleRuntime({triggers:'./lib/bardoctor/notification-triggers'}, {now:'2026-10-27T10:00:00Z',bindings:{ONESIGNAL_APP_ID:'local-app',ONESIGNAL_REST_API_KEY:'local-test-only'}});
 const oldFetch=globalThis.fetch;let externalCalls=0;globalThis.fetch=async()=>{externalCalls++;throw new Error('EXTERNAL_CALL_FORBIDDEN')};
 try{
 const owner=await r.register('runner-owner@local.test'),manager=await r.register('runner-manager@local.test');
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) SELECT workspace_id,?,'member','active' FROM venues WHERE id=?").run(manager.userId,owner.activeVenueId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES(?,?,'manager','active')").run(owner.activeVenueId,manager.userId);
 r.sqlite.prepare('INSERT INTO notification_preferences(account_id,enabled,calendar_alerts) VALUES(?,1,1) ON CONFLICT(account_id) DO UPDATE SET enabled=1,calendar_alerts=1').run(manager.userId);
 r.sqlite.prepare('UPDATE notification_preferences SET shift_alerts=0,task_alerts=0,equipment_alerts=0,incident_alerts=0,finance_alerts=0 WHERE account_id=?').run(manager.userId);
 r.sqlite.prepare("INSERT INTO notification_devices(account_id,device_key,subscription_id,permission,opted_in,active) VALUES(?,'runner-device','runner-sub','granted',1,1)").run(manager.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Local',timezone:'UTC'}),owner.userId);
 const calendar={events:[{id:'runner',startDate:'2027-12-20',activationDate:'2027-12-20',title:'Local',decision:'planned',potentialScore:80,recommendation:{decisionDeadline:'2027-12-01',leadDays:19,format:'Local',operations:'Local'},notificationPlan:{status:'not_needed',count:0,messages:[],signature:'',nextAt:null}}],sources:[]};
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?)').run(owner.userId,'bd_opportunity_calendar_v1',JSON.stringify(calendar));
 const api=r.api as any;await api.triggers.runNotificationTriggers('https://local.test');
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE venue_id=? AND account_id=?').get(owner.activeVenueId,manager.userId)?.n,3);
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE account_id=?').get(owner.userId)?.n,0);
 await api.triggers.runNotificationTriggers('https://local.test');
 assert.equal(r.sqlite.prepare('SELECT count(*) n FROM notification_jobs WHERE venue_id=? AND account_id=?').get(owner.activeVenueId,manager.userId)?.n,3);
 assert.equal(externalCalls,0);
 }finally{globalThis.fetch=oldFetch;r.close()}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';

test('shift incidents GET shares count grain, isolates venue/account, handles empty and never writes',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route'});t.after(r.close);
 const owner=await r.register('shift-cases-owner@isolated.test'),other=await r.register('shift-cases-other@isolated.test'),venue=owner.activeVenueId,date='2026-10-20';
 const cases=[{id:'one',venueId:venue,businessDate:date,shiftId:'cash-one'},{id:'two',venueId:venue,eventDate:date+'T20:00:00Z',shiftId:'cash-two'},{id:'legacy',date},{id:'next',venueId:venue,businessDate:'2026-10-21'},{id:'foreign',venueId:other.activeVenueId,businessDate:date},{id:'account',dataAccountId:other.userId,businessDate:date},{id:'workspace',workspaceId:999999,businessDate:date}];
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?)').run(owner.userId,'bd_cases',JSON.stringify(cases));
 const before=JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());
 const get=(path:string,user=owner)=>r.api.workdays.GET(r.request(user,path));
 const response=await get(`/api/workdays?view=incidents&venue=${venue}&date=${date}`);assert.equal(response.status,200);
 const result=await response.json() as {incidents:{id:string}[]};assert.deepEqual(result.incidents.map((x:any)=>x.id),['one','two','legacy']);
 const day=await (await get(`/api/workdays?date=${date}`)).json() as {day:{operations:{incidentCount:number}}};assert.equal(day.day.operations.incidentCount,result.incidents.length);
 assert.deepEqual((await (await get(`/api/workdays?view=incidents&venue=${venue}&date=2026-10-19`)).json() as {incidents:unknown[]}).incidents,[]);
 assert.equal((await get(`/api/workdays?view=incidents&venue=${other.activeVenueId}&date=${date}`)).status,409);
 assert.equal((await get(`/api/workdays?view=incidents&venue=${venue}&date=${date}`,other)).status,409);
 assert.equal((await get(`/api/workdays?view=incidents&venue=${venue}&date=2026-02-31`)).status,400);
 assert.equal((await r.api.workdays.GET(new Request(`https://isolated.test/api/workdays?view=incidents&venue=${venue}&date=${date}`))).status,401);
 assert.equal(JSON.stringify(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all()),before);
});

test('member needs incident read permission in addition to workday access',async t=>{
 const r=await lifecycleRuntime({workdays:'./app/api/workdays/route'});t.after(r.close);
 const owner=await r.register('incident-permission-owner@isolated.test'),member=await r.register('incident-permission-member@isolated.test'),venue=owner.activeVenueId;
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,member.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status,permissions_json) VALUES (?,?,'manager','active',?)").run(venue,member.userId,JSON.stringify({deny:['incidents.view']}));
 const request=r.request(member,`/api/workdays?view=incidents&venue=${venue}&date=2026-10-20`);request.headers.set('X-Venue-Id',String(venue));
 assert.equal((await r.api.workdays.GET(request)).status,403);
});

test('shared header/back preserves workday scope and detail filters without history',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm');
 const context:any={URL,URLSearchParams,Set,window:{location:{href:'https://bardoctor.test/home',origin:'https://bardoctor.test'}},document:{documentElement:{setAttribute(){}}}};
 vm.runInNewContext(readFileSync('public/navigation-contract-v247.js','utf8'),context);
 const resolve=context.window.bdNavigationContract.resolve;
 assert.equal(resolve('https://bardoctor.test/cases?venue=7&workdayVenue=7&workday=2026-10-20').parent,'/shifts?venue=7&workday=2026-10-20&month=2026-10');
 assert.equal(resolve('https://bardoctor.test/cases/item?venue=7&workdayVenue=7&workday=2026-10-20&status=open&q=coffee&sort=date').parent,'/cases?venue=7&workdayVenue=7&workday=2026-10-20&status=open&q=coffee&sort=date');
 assert.equal(resolve('https://bardoctor.test/cases?status=open').title,'Дела');
 assert.equal(resolve('https://bardoctor.test/cases?workday=invalid').parent,'/shifts');
});

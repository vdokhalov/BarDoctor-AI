import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { salesEventFixture } from './helpers/sales-event-fixture';
import { planSalesShift, planSalesEvent } from '../lib/bardoctor/sales-events';
import { venueTimeFromJson, venueDate } from '../lib/bardoctor/venue-time';

test('POS single-open cash shift: concurrent real handlers, retry, close and venue/account isolation',async t=>{
 const r=await lifecycleRuntime({events:'./app/api/sales-events/route'});t.after(r.close);
 const a=await r.register('single-a@isolated.test'),b=await r.register('single-b@isolated.test');
 for(const u of [a,b])r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({currency:'MDL',timezone:'Europe/Chisinau'}),u.userId);
 const send=(u:typeof a,shiftId:string,action='open_shift')=>r.api.events.POST(r.request(u,'/api/sales-events','POST',{action,venueId:u.activeVenueId,shiftId,name:shiftId}));
 const responses=await Promise.all([send(a,'A'),send(a,'B')]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 const bodies=await Promise.all(responses.map(async r=>await r.json() as {ok:boolean;code:string}));assert.equal(bodies.find(r=>!r.ok)?.code,'SALES_EVENT_SHIFT_ALREADY_OPEN');
 const get=async(u:typeof a)=>await (await r.api.events.GET(r.request(u,'/api/sales-events'))).json() as {shifts:{id:string;closingStatus:string}[]};
 const first=await get(a);assert.equal(first.shifts.length,1);const winner=first.shifts[0].id;
 assert.equal((await send(a,winner)).status,200,'same operation is idempotent');assert.equal((await send(a,'C')).status,409);
 assert.equal((await send(b,'B')).status,201,'independent account and venue');assert.equal((await get(b)).shifts.length,1);
 assert.equal(r.sqlite.prepare("SELECT count(*) n FROM audit_log WHERE account_id=? AND action='open_shift'").get(a.userId)?.n,1);
 assert.equal((await send(a,winner,'close_shift')).status,201);assert.equal((await send(a,'C')).status,201);assert.equal((await get(a)).shifts.filter((s:{closingStatus:string})=>s.closingStatus==='open').length,1);
 const foreign=await r.api.events.POST(r.request(a,'/api/sales-events','POST',{action:'open_shift',venueId:b.activeVenueId,shiftId:'foreign',name:'foreign'}));assert.equal(foreign.status,409);
});

test('Single cash shift rule ignores operational/daily/foreign rows and preserves legacy parallel shifts',()=>{
 const c=salesEventFixture();c.revenues=[{id:'operational',venueId:1,closingStatus:'open'},{id:'daily',venueId:1,revenueSource:'sales_events_v1'},{id:'foreign',venueId:2,revenueSource:'sales_events_v1',closingStatus:'open'}];
 c.revenues=planSalesShift(c,'open_shift','A','A');assert.equal(c.revenues.length,4);
 const legacy={...c.revenues[3],id:'legacy',shiftName:'Legacy'};c.revenues.push(legacy);const before=JSON.stringify(c.revenues);
 assert.throws(()=>planSalesShift(c,'open_shift','new','New'),/SHIFT_ALREADY_OPEN/);assert.equal(JSON.stringify(c.revenues),before);
 c.revenues=planSalesShift(c,'close_shift','A');assert.throws(()=>planSalesShift(c,'open_shift','new','New'),/SHIFT_ALREADY_OPEN/);
 c.revenues=planSalesShift(c,'close_shift','legacy');assert.equal(planSalesShift(c,'open_shift','new','New').filter(r=>r.venueId===1&&r.revenueSource==='sales_events_v1'&&r.closingStatus==='open').length,1);
});

test('Missing timezone stays explicit UTC; configured midnight and open-shift business date stay authoritative',async()=>{
 const missing=venueTimeFromJson('{}');assert.deepEqual(missing,{timezone:'UTC',timezoneConfigured:false});
 const explicit=venueTimeFromJson('{"timezone":"UTC"}');assert.equal(explicit.timezoneConfigured,true);
 for(const [zone,instant,date] of [['Europe/Chisinau','2026-09-27T21:30:00Z','2026-09-28'],['America/New_York','2026-09-28T02:30:00Z','2026-09-27'],['America/Los_Angeles','2026-03-08T10:30:00Z','2026-03-08']] as const){
  const c={...salesEventFixture(),...venueTimeFromJson(JSON.stringify({timezone:zone})),now:String(instant)};assert.equal(venueDate(instant,c.timezone),date);
  c.revenues=planSalesShift(c,'open_shift','night','Night');assert.equal(c.revenues[0].date,date);c.now=new Date(Date.parse(instant)+24*3600000).toISOString();
  for(const source of ['POS_API','MANUAL_GRID'] as const){const result=await planSalesEvent(c,{id:source,source,shiftId:'night',lines:[{id:'l',menuItemId:'beer',quantity:1}],...(source==='POS_API'?{payments:[{id:'p',method:'CASH' as const,amount:20}]}:{})});assert.equal(result.event.businessDate,date);}
 }
 assert.notEqual(venueDate('2026-09-27T21:30:00Z',missing.timezone),venueDate('2026-09-27T21:30:00Z','Europe/Chisinau'));
});

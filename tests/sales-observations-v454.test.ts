import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { salesEventFixture } from './helpers/sales-event-fixture';
import type { SalesEvent, SalesEventCommand } from '../lib/bardoctor/sales-events';

type Reply = { ok: boolean; code: string; duplicate: boolean; event: SalesEvent; previewHash: string;
  shifts: { id: string; closingStatus: string }[]; batches: { readOnly: boolean }[]; venue: { id: number } };

test('OBS01 real handlers: overnight open cash shift accepts manual preview/post, POS and close guards', async t => {
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-24T23:55:00Z')});
  const r=await lifecycleRuntime({events:'./app/api/sales-events/route',documents:'./app/api/sales-batches/route'}); t.after(r.close);
  const user=await r.register('obs01@isolated.test');
  const venue=user.activeVenueId;
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'OBS01 QA',currency:'MDL'}),user.userId);
  const fixture=JSON.parse(JSON.stringify(salesEventFixture().assortment).replaceAll('"venueId":1','"venueId":'+venue));
  const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value),new Date().toISOString());
  const read=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(user.userId,key)?.data_json || 'null'));
  put('bd_assortment_v1',fixture);
  const send=(body:object)=>r.api.events.POST(r.request(user,'/api/sales-events','POST',{venueId:venue,...body}));
  const get=async()=>await (await r.api.events.GET(r.request(user,'/api/sales-events'))).json<Reply>();
  assert.equal((await send({action:'open_shift',shiftId:'C',name:'C'})).status,201);
  t.mock.timers.setTime(Date.parse('2026-09-25T00:10:00Z'));
  assert.equal((await send({action:'open_shift',shiftId:'D',name:'D'})).status,201);
  // Legacy/operational finance rows and an unshifted daily projection are not cash shifts.
  put('bd_finance_revenue',[...read('bd_finance_revenue'),
    {id:'legacy-C',venueId:venue,date:'2026-09-23',shiftName:'C',closingStatus:'open',revenue:0,currency:'MDL'},
    {id:'daily',venueId:venue,date:'2026-09-23',revenueSource:'sales_events_v1',revenue:0,currency:'MDL'}]);
  const available=await get();
  assert.deepEqual(available.shifts.filter((s:{closingStatus:string})=>s.closingStatus==='open').map((s:{id:string})=>s.id),['C','D']);
  const legacy=await send({action:'preview',command:{id:'legacy',source:'MANUAL_GRID',shiftId:'legacy-C',lines:[{id:'l',menuItemId:'beer',quantity:1}]}});
  assert.equal(legacy.status,409);assert.equal((await legacy.json<Reply>()).code,'SALES_EVENT_SHIFT_NEEDS_REVIEW');
  const command:SalesEventCommand={id:'manual-C',source:'MANUAL_GRID',shiftId:'C',lines:[{id:'line',menuItemId:'beer',quantity:1}]};
  const preview=await send({action:'preview',command}); const quote=await preview.json<Reply>();
  assert.equal(preview.status,200,JSON.stringify(quote));
  assert.equal(quote.event.shiftId,'C'); assert.equal(quote.event.businessDate,'2026-09-24');
  assert.equal(quote.event.acceptedAt,'2026-09-25T00:10:00.000Z'); assert.equal(read('bd_sales_events_v1'),null);
  const posted=await send({action:'post',command,previewHash:quote.previewHash}); assert.equal(posted.status,201);
  const event=(await posted.json<Reply>()).event as SalesEvent;
  assert.equal(event.shiftId,'C'); assert.equal(event.revenueRowId,'C'); assert.equal(event.batch.shiftId,'C');
  assert.equal(read('bd_assortment_v1').stockBalances[0].current,19);
  assert.equal(read('bd_stock_movements')[0].businessDate,'2026-09-24');
  assert.equal(read('bd_finance_revenue').find((s:{id:string})=>s.id==='C').revenue,20);
  const pos:SalesEventCommand={...command,id:'pos-C',source:'POS_API',payments:[{id:'p',method:'CASH',amount:20}]};
  const p=await (await send({action:'preview',command:pos})).json<Reply>(); assert.equal(p.event.businessDate,event.businessDate);
  assert.equal((await send({action:'post',command:pos,previewHash:p.previewHash})).status,201);
  const next={...command,id:'manual-D',shiftId:'D'}; const d=await (await send({action:'preview',command:next})).json<Reply>();
  assert.equal(d.event.businessDate,'2026-09-25'); assert.equal((await send({action:'post',command:next,previewHash:d.previewHash})).status,201);
  const stale=await (await send({action:'preview',command:{...command,id:'closed-C'}})).json<Reply>();
  assert.equal((await send({action:'close_shift',shiftId:'C'})).status,201);
  assert.deepEqual((await get()).shifts.filter((s:{closingStatus:string})=>s.closingStatus==='open').map((s:{id:string})=>s.id),['D']);
  for(const action of ['preview','post']) {
    const response=await send({action,command:{...command,id:'closed-C'},previewHash:stale.previewHash});
    assert.equal(response.status,409); assert.equal((await response.json<Reply>()).code,'SALES_EVENT_SHIFT_CLOSED_OR_DATE_MISMATCH');
  }
  const saved=JSON.stringify(read('bd_sales_events_v1'));
  const duplicate=await send({action:'post',command,previewHash:quote.previewHash}); assert.equal(duplicate.status,200); assert.equal((await duplicate.json<Reply>()).duplicate,true);
  assert.equal(JSON.stringify(read('bd_sales_events_v1')),saved); assert.equal(read('bd_stock_movements').length,3);
  const journal=await (await r.api.documents.GET(r.request(user,'/api/sales-batches'))).json<Reply>();
  assert.equal(journal.batches.filter((b:{readOnly:boolean})=>b.readOnly).length,3);
});

test('OBS01 real auth isolates shift selection, preview and direct POST across accounts and venues',async t=>{
  const r=await lifecycleRuntime({events:'./app/api/sales-events/route'});t.after(r.close);
  const a=await r.register('obs01-a@isolated.test'),b=await r.register('obs01-b@isolated.test');
  for(const u of [a,b])r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'QA',currency:'MDL'}),u.userId);
  const send=(u:typeof a,body:object)=>r.api.events.POST(r.request(u,'/api/sales-events','POST',{venueId:u.activeVenueId,...body}));
  assert.equal((await send(a,{action:'open_shift',shiftId:'A-only',name:'Same label'})).status,201);
  assert.equal((await send(b,{action:'open_shift',shiftId:'B-only',name:'Same label'})).status,201);
  const list=await (await r.api.events.GET(r.request(b,'/api/sales-events'))).json<Reply>(); assert.deepEqual(list.shifts.map((s:{id:string})=>s.id),['B-only']);
  for(const action of ['preview','post']) {
    const result=await send(b,{action,command:{id:'foreign',source:'MANUAL_GRID',shiftId:'A-only',lines:[{id:'l',menuItemId:'missing',quantity:1}]},previewHash:'irrelevant'});
    assert.equal(result.status,409);assert.equal((await result.json<Reply>()).code,'SALES_EVENT_SHIFT_NOT_FOUND');
    const wrongVenue=await send(a,{action,venueId:b.activeVenueId});assert.equal(wrongVenue.status,409);assert.equal((await wrongVenue.json<Reply>()).code,'VENUE_CHANGED');
  }
  const foreign=r.request(a,'/api/sales-events');foreign.headers.set('X-Venue-Id',String(b.activeVenueId));
  assert.ok([401,403].includes((await r.api.events.GET(foreign)).status));
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='bd_sales_events_v1'").get()?.n,0);
});

test('OBS02 real handler distinguishes anonymous, invalid and expired sessions from authenticated access',async t=>{
  const r=await lifecycleRuntime({events:'./app/api/sales-events/route'});t.after(r.close);
  const user=await r.register('obs02@isolated.test');
  for(const request of [new Request('https://isolated.test/api/sales-events'),r.request({...user,token:'invalid'},'/api/sales-events')]) {
    const response=await r.api.events.GET(request); assert.equal(response.status,401);assert.equal((await response.json<Reply>()).ok,false);
  }
  assert.equal((await r.api.events.GET(r.request(user,'/api/sales-events'))).status,200);
  r.sqlite.prepare("UPDATE sessions SET expires_at='2000-01-01T00:00:00.000Z'").run();
  assert.equal((await r.api.events.GET(r.request(user,'/api/sales-events'))).status,401);
});


test('OBS01 same account venue switching cannot reuse another venue cash shift',async t=>{
  const r=await lifecycleRuntime({events:'./app/api/sales-events/route'});t.after(r.close);
  const user=await r.register('obs01-venues@isolated.test');
  const profile={name:'Second QA',businessType:'Бар',country:'Молдова',city:'Кишинёв',currency:'MDL'};
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),user.userId);
  const created=await r.api.venues.POST(r.request(user,'/api/venues','POST',profile));assert.equal(created.status,201);
  const second=(await created.json<Reply>()).venue.id;
  const req=(venue:number,body?:object)=>{const request=r.request(user,'/api/sales-events',body?'POST':'GET',body?{venueId:venue,...body}:undefined);request.headers.set('X-Venue-Id',String(venue));return request;};
  for(const [venue,shiftId] of [[user.activeVenueId,'first'],[second,'second']] as const){
    assert.equal((await r.api.events.POST(req(venue,{action:'open_shift',shiftId,name:'Same name'}))).status,201);
  }
  for(const [venue,own,foreign] of [[user.activeVenueId,'first','second'],[second,'second','first']] as const){
    const list=await (await r.api.events.GET(req(venue))).json<Reply>();assert.deepEqual(list.shifts.map((s:{id:string})=>s.id),[own]);
    for(const action of ['preview','post']){
      const response=await r.api.events.POST(req(venue,{action,command:{id:'foreign',source:'MANUAL_GRID',shiftId:foreign,lines:[{id:'l',menuItemId:'none',quantity:1}]},previewHash:'irrelevant'}));
      assert.equal(response.status,409);assert.equal((await response.json<Reply>()).code,'SALES_EVENT_SHIFT_NOT_FOUND');
    }
  }
});

test('OBS01 overnight manual sale still respects the selected shift closed accounting month',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-08-31T23:55:00Z')});
  const r=await lifecycleRuntime({events:'./app/api/sales-events/route'});t.after(r.close);
  const user=await r.register('obs01-month@isolated.test');
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'QA',currency:'MDL'}),user.userId);
  const send=(body:object)=>r.api.events.POST(r.request(user,'/api/sales-events','POST',{venueId:user.activeVenueId,...body}));
  assert.equal((await send({action:'open_shift',shiftId:'month-end',name:'C'})).status,201);
  t.mock.timers.setTime(Date.parse('2026-09-01T00:10:00Z'));
  r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?)').run(user.userId,'bd_month_closings',JSON.stringify([{monthKey:'2026-08',status:'closed'}]),new Date().toISOString());
  for(const action of ['preview','post']){
    const response=await send({action,command:{id:'locked',source:'MANUAL_GRID',shiftId:'month-end',lines:[{id:'l',menuItemId:'none',quantity:1}]},previewHash:'irrelevant'});
    assert.equal(response.status,423);assert.equal((await response.json<Reply>()).code,'MONTH_LOCKED');
  }
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE store_key='bd_sales_events_v1'").get()?.n,0);
});

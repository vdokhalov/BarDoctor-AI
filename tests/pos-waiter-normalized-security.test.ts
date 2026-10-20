import test from 'node:test';
import assert from 'node:assert/strict';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';
import { seedRosterEmployee } from './helpers/staff-roster-fixture';
import { seedOpenWorkday } from './helpers/pos-workday-fixture';
import { salesEventFixture } from './helpers/sales-event-fixture';

test('normalized POS: waiter confirmed-line restrictions, no owner fallback and unchanged persisted state', async t => {
 const r=await lifecycleRuntime({orders:'./app/api/pos-orders/route',sales:'./app/api/sales-events/route',members:'./lib/bardoctor/staff-pin-members',pins:'./lib/bardoctor/staff-pin-credentials',session:'./app/api/staff-pin/session/route',storage:'./lib/bardoctor/pos-order-storage',database:'./db',stock:'./lib/bardoctor/stock-journal',events:'./lib/bardoctor/sales-event-storage'}, {bindings:{STAFF_PIN_LOOKUP_KEY:'synthetic-only-never-production-secret'}});t.after(r.close);
 const owner=await r.register('normalized-owner@isolated.test'), actor=await r.api.auth.authenticateRequest(r.request(owner,'/api/access'));assert.ok(actor);
 const a=r.api as any,scope={accountId:owner.userId,venueId:owner.activeVenueId},db=a.database.getD1();
 seedRosterEmployee(r.sqlite,owner.userId,scope.venueId,'waiter');
 const member=await a.members.createPinStaff(actor,'waiter','waiter','normalized.waiter'),pin=await a.pins.issueStaffPin(actor,member.membershipId);
 const login=await a.session.POST(new Request('https://isolated.test/api/staff-pin/session',{method:'POST',headers:{origin:'https://isolated.test','Content-Type':'application/json'},body:JSON.stringify({login:'normalized.waiter',pin:pin.pin})}));assert.equal(login.status,200);
 const staffCookie=login.headers.get('set-cookie')!.split(';')[0],ownerCookie='bd_server_session='+encodeURIComponent(owner.token);
 const request=(body:object,cookie=staffCookie+'; '+ownerCookie,author=member.actorId,venue=scope.venueId)=>new Request('https://isolated.test/api/pos-orders',{method:'POST',headers:{origin:'https://isolated.test','Content-Type':'application/json',cookie,'x-pos-actor':String(author),'x-venue-id':String(venue)},body:JSON.stringify({venueId:scope.venueId,...body})});
 assert.equal((await r.api.auth.authenticateRequest(request({},ownerCookie)))?.role,'owner');
 const identity=await r.api.auth.authenticateRequest(request({}));assert.equal(identity?.role,'cashier');assert.equal(identity?.jobTitle,'waiter');assert.equal(identity?.actorAccountId,member.actorId);assert.equal(identity?.venueId,scope.venueId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 seedOpenWorkday(r.sqlite,owner.userId,scope.venueId);r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',owner.userId);
 const assortment=salesEventFixture().assortment;(assortment.menuItems as any[]).forEach(x=>x.sectionId='bar');put('bd_assortment_v1',assortment);
 assert.equal((await a.sales.POST(r.request(owner,'/api/sales-events','POST',{venueId:scope.venueId,action:'open_shift',shiftId:'shift',name:'Synthetic'}))).status,201);
 put('bd_pos_orders_v1',[]);put(`__bd_pos_preparation_v1__:${scope.venueId}`,{version:1,venueId:scope.venueId,revision:1,routes:[{sectionId:'bar',printerId:'bar',printerName:'Bar'}],operations:[]});
 const objects=new Map<string,string>(),bucket={async put(k:string,v:string){objects.set(k,v)},async get(k:string){return objects.has(k)?{async text(){return objects.get(k)!}}:null}};
 await a.stock.copyLegacyJournal(db,scope);await a.stock.activateJournal(db,scope);await a.events.copyLegacySalesEvents(db,scope);await a.events.activateSalesEvents(db,scope);
 await a.storage.preparePosOrderMigration(db,bucket,scope);while((await a.storage.copyPosOrders(db,bucket,scope,1)).state!=='verified'){}await a.storage.activatePosOrders(db,bucket,scope);
 const send=(body:object)=>a.orders.POST(request(body));
 assert.equal((await send({action:'create',operationId:'create',orderId:'order',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'line',menuItemId:'beer',quantity:3}]})).status,201);
 assert.equal((await send({action:'confirm',operationId:'confirm',orderId:'order',expectedRevision:1})).status,201);
 const read=()=>a.storage.readPosOrders(db,owner.userId,String(r.sqlite.prepare("SELECT data_json FROM domain_data WHERE account_id=? AND store_key='bd_pos_orders_v1'").get(owner.userId)!.data_json));
 const confirmed=(await read())[0];assert.equal(confirmed.preparationTickets.length,1);assert.equal(confirmed.createdBy.accountId,member.actorId);
 // Snapshot every persisted table, including normalized orders/tickets, stock, queue and audit.
 const snapshot=()=>r.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(row=>[row.name,r.sqlite.prepare('SELECT * FROM "'+String(row.name).replaceAll('"','""')+'" ORDER BY rowid').all()]);
 const common={orderId:'order',expectedRevision:2,lineId:'line',reason:'Synthetic cancellation',stockDecision:'NO_WRITE_OFF'};
 for(const change of [{action:'set_quantity',quantity:4},{action:'set_quantity',quantity:2},{action:'set_quantity',quantity:0},{action:'cancel_item',quantity:1},{action:'cancel_item',quantity:3},{action:'cancel_order'}]){
  const before=snapshot(),response=await send({...common,...change,operationId:change.action+String(change.quantity)}),body=await response.json();
  assert.equal(response.status,change.action==='set_quantity'?409:403,JSON.stringify(body));assert.deepEqual(snapshot(),before,JSON.stringify(change));
 }
 const add={action:'add_items',operationId:'add',orderId:'order',expectedRevision:2,lines:[{id:'new-line',menuItemId:'beer',quantity:1}]};
 for(const req of [request(add,'bd_pos_session=invalid; '+ownerCookie),request(add,undefined,owner.userId),request(add,undefined,member.actorId,999)]){const before=snapshot();assert.equal((await a.orders.POST(req)).status,401);assert.deepEqual(snapshot(),before);}
 const added=await send(add);assert.equal(added.status,201,await added.clone().text());const updated=(await read())[0];assert.equal(updated.lines.length,2);assert.equal(updated.lines[0].quantity,3);assert.deepEqual(updated.preparationTickets,confirmed.preparationTickets);assert.equal(updated.updatedBy.accountId,member.actorId);
 assert.equal((await send({action:'set_quantity',operationId:'draft-qty',orderId:'order',expectedRevision:3,lineId:'new-line',quantity:2})).status,201);
 r.sqlite.prepare("UPDATE venue_memberships SET status='disabled' WHERE id=?").run(member.membershipId);const before=snapshot();assert.equal((await send({...add,operationId:'revoked',expectedRevision:4})).status,401);assert.deepEqual(snapshot(),before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {planSalesShift} from '../lib/bardoctor/sales-events';
import {planPosOrder,parsePosOrders,type PosOrderContext,type PosOrderCommand} from '../lib/bardoctor/pos-orders';
import {preparationConfig,preparationKey} from '../lib/bardoctor/pos-preparation';
import {defaultNomenclatureStructure} from '../lib/bardoctor/nomenclature';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
function assortment(){const a=salesEventFixture().assortment;const taxonomy=defaultNomenclatureStructure();taxonomy.sections.push({...taxonomy.sections[0],id:'pastry',name:'Кондитерская'});a.nomenclatureStructure=taxonomy;(a.menuItems as any[]).forEach((m,i)=>{m.sectionId=['bar','kitchen','pastry','bar'][i];m.department='WRONG';m.salesWarehouseId='not-a-printer'});return a;}
async function fixture(){const c:PosOrderContext={...salesEventFixture(),assortment:assortment()};c.revenues=planSalesShift(c,'open_shift','shift','Day');c.preparationConfig=preparationConfig({version:1,venueId:1,revision:1,routes:[{sectionId:'bar',printerId:'bar-device',printerName:'Бар'}],operations:[]},1);const p=await planPosOrder(c,[],{action:'create',orderId:'order',operationId:'create',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'a',menuItemId:'beer',quantity:2},{id:'b',menuItemId:'whisky',quantity:1},{id:'c',menuItemId:'coffee',quantity:1}]});return{c,p};}
const confirm=(revision:number,operationId='confirm'):PosOrderCommand=>({action:'confirm',orderId:'order',expectedRevision:revision,operationId});
test('canonical custom sections, truthful queue, immutable delta batches and replay',async()=>{const {c,p}=await fixture();const before=JSON.stringify(c);const first=await planPosOrder(c,p.orders,confirm(1));const tickets=first.order.preparationTickets!;assert.deepEqual(tickets.map(t=>[t.sectionId,t.status,t.printerId]),[['bar','pending','bar-device'],['kitchen','unconfigured',null],['pastry','unconfigured',null]]);assert.equal(first.salesPlan,undefined);assert.equal(JSON.stringify(c),before);assert.equal((await planPosOrder(c,first.orders,confirm(1))).duplicate,true);await assert.rejects(()=>planPosOrder(c,first.orders,confirm(2,'new-confirm')),/NOTHING_TO_CONFIRM/);
 const added=await planPosOrder(c,first.orders,{action:'add_items',operationId:'add',orderId:'order',expectedRevision:2,lines:[{id:'d',menuItemId:'beer',quantity:1}]});c.preparationConfig!.routes[0].printerId='replacement';c.preparationConfig!.revision++;
 const second=await planPosOrder(c,added.orders,confirm(3,'second'));assert.deepEqual(second.order.preparationTickets!.slice(0,3),tickets);assert.deepEqual(second.order.preparationTickets![3].lines.map(l=>l.lineId),['d']);assert.equal(second.order.preparationTickets![3].printerId,'replacement');assert.deepEqual(parsePosOrders(JSON.parse(JSON.stringify(second.orders))),second.orders);
});
test('sent lines and documents cannot be silently changed, including by senior staff; draft additions stay editable',async()=>{const {c,p}=await fixture();const first=await planPosOrder(c,p.orders,confirm(1));for(const role of ['cashier','manager','owner']){c.actor.role=role;for(const action of ['set_quantity','cancel_order','split'] as const)await assert.rejects(()=>planPosOrder(c,first.orders,{action,operationId:role+action,orderId:'order',expectedRevision:2,lineId:'a',quantity:1,reason:'Correction',newOrderId:'split',lines:[{lineId:'a',quantity:1}]}),/CONFIRMED_LOCKED|ACCESS_DENIED/)}
 const added=await planPosOrder(c,first.orders,{action:'add_items',operationId:'add',orderId:'order',expectedRevision:2,lines:[{id:'d',menuItemId:'beer',quantity:1}]});const edited=await planPosOrder(c,added.orders,{action:'set_quantity',operationId:'edit',orderId:'order',expectedRevision:3,lineId:'d',quantity:0});assert.equal(edited.order.lines.length,3);const corrupt=structuredClone(first.orders);corrupt[0].lines[0].quantity++;assert.throws(()=>parsePosOrders(corrupt),/PREPARATION_INVALID/);
});
test('missing canonical section, closed shift and closed month fail without creating tickets',async()=>{const {c,p}=await fixture();delete (c.assortment.menuItems as any[])[0].sectionId;await assert.rejects(()=>planPosOrder(c,p.orders,confirm(1)),/SECTION_REQUIRED/);c.assortment=assortment();c.closedMonths.add('2026-09');await assert.rejects(()=>planPosOrder(c,p.orders,confirm(1)),/MONTH/);c.closedMonths.clear();c.revenues=planSalesShift(c,'close_shift','shift');await assert.rejects(()=>planPosOrder(c,p.orders,confirm(1)),/SHIFT/);assert.equal(p.order.preparationTickets,undefined);});
test('real routes: manager routing, atomic confirmation/retry/reload, CAS, rollback and revocation',async t=>{
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route',orders:'./app/api/pos-orders/route',prep:'./app/api/pos-preparation/route',store:'./app/api/store/route'});t.after(r.close);
 const owner=await r.register('prep-owner@isolated.test'),staff=await r.register('prep-staff@isolated.test'),venue=owner.activeVenueId;seedOpenWorkday(r.sqlite,owner.userId,venue);
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venue,staff.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',owner.userId);
 const put=(key:string,value:unknown)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,key,JSON.stringify(value));
 const get=(key:string)=>JSON.parse(String(r.sqlite.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').get(owner.userId,key)?.data_json??'null'));
 put('bd_assortment_v1',assortment());
 const req=(user:typeof owner,body?:object)=>{const headers=new Headers(r.request(user,'/api').headers);headers.set('X-Venue-Id',String(venue));return new Request('https://isolated.test/api',{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify({venueId:venue,...body})}:{})});};
 const route={operationId:'route',expectedRevision:0,sectionId:'bar',printerId:'p',printerName:'Бар'};
 assert.equal((await r.api.prep.POST(req(staff,route))).status,403);assert.equal((await r.api.prep.POST(req(owner,route))).status,201);assert.equal((await r.api.prep.POST(req(owner,route))).status,200);assert.equal((await r.api.prep.POST(req(owner,{...route,printerId:'other'}))).status,409);
 const boot=await (await r.api.store.GET(req(owner))).json() as {entries:Record<string,unknown>};assert.equal(boot.entries[preparationKey(venue)],undefined);
 assert.equal((await r.api.sales.POST(req(owner,{action:'open_shift',shiftId:'shift',name:'Synthetic'}))).status,201);
 const create={action:'create',operationId:'create',orderId:'order',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'a',menuItemId:'beer',quantity:2}]};assert.equal((await r.api.orders.POST(req(staff,create))).status,201);
 const finance=JSON.stringify(get('bd_finance_revenue')),stock=JSON.stringify(get('bd_stock_movements')),events=JSON.stringify(get('bd_sales_events_v1'));
 r.failDatabase();await assert.rejects(()=>r.api.orders.POST(req(staff,confirm(1))),/injected database failure/);assert.equal(get('bd_pos_orders_v1')[0].preparationTickets,undefined);
 const responses=await Promise.all([r.api.orders.POST(req(staff,confirm(1))),r.api.orders.POST(req(staff,confirm(1)))]);assert.deepEqual(responses.map(x=>x.status).sort(),[200,201]);assert.equal(get('bd_pos_orders_v1')[0].preparationTickets.length,1);
 assert.equal(JSON.stringify(get('bd_finance_revenue')),finance);assert.equal(JSON.stringify(get('bd_stock_movements')),stock);assert.equal(JSON.stringify(get('bd_sales_events_v1')),events);
 const reload=await(await r.api.orders.GET(req(staff))).json() as {orders:{preparationTickets:unknown[]}[]};assert.equal(reload.orders[0].preparationTickets.length,1);
 assert.equal((await r.api.orders.POST(req(staff,{action:'set_quantity',operationId:'tamper',orderId:'order',expectedRevision:2,lineId:'a',quantity:0}))).status,409);
 assert.equal((await r.api.orders.POST(req(staff,{action:'add_items',operationId:'add',orderId:'order',expectedRevision:2,lines:[{id:'b',menuItemId:'beer',quantity:1}]}))).status,201);
 r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET status='revoked' WHERE venue_id=? AND account_id=?").run(venue,staff.userId)});
 assert.notEqual((await r.api.orders.POST(req(staff,confirm(3,'revoked')))).status,201);assert.equal(get('bd_pos_orders_v1')[0].preparationTickets.length,1);assert.equal((await r.api.orders.POST(req(staff,confirm(1)))).status,401);
 r.sqlite.prepare("UPDATE venue_memberships SET status='active',role='manager' WHERE venue_id=? AND account_id=?").run(venue,staff.userId);
 r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET role='cashier' WHERE venue_id=? AND account_id=?").run(venue,staff.userId)});
 assert.notEqual((await r.api.prep.POST(req(staff,{...route,operationId:'revoked-route',expectedRevision:1,printerId:'changed'}))).status,201);assert.equal(get(preparationKey(venue)).revision,1);
 const cut={action:'cancel_item',operationId:'cut-route',orderId:'order',expectedRevision:3,lineId:'a',quantity:1,reason:'Guest cancellation'};
 assert.equal((await r.api.orders.POST(req(staff,cut))).status,403);
 r.sqlite.prepare("UPDATE venue_memberships SET role='manager' WHERE venue_id=? AND account_id=?").run(venue,staff.userId);
 const cancellations=await Promise.all([r.api.orders.POST(req(staff,cut)),r.api.orders.POST(req(staff,cut))]);assert.deepEqual(cancellations.map(x=>x.status).sort(),[200,201]);
 assert.equal(get('bd_pos_orders_v1')[0].preparationTickets.length,2);assert.equal(get('bd_pos_orders_v1')[0].lines[0].quantity,1);
 assert.equal(JSON.stringify(get('bd_finance_revenue')),finance);assert.equal(JSON.stringify(get('bd_stock_movements')),stock);
 const audit=r.sqlite.prepare("SELECT after_json,reason FROM audit_log WHERE account_id=? AND store_key='bd_pos_orders_v1' AND reason=?").all(owner.userId,cut.reason);assert.equal(audit.length,1);assert.match(String(audit[0].after_json),/CANCELLATION/);
 r.beforeNextDomainWrite(()=>{r.sqlite.prepare("UPDATE venue_memberships SET role='cashier' WHERE venue_id=? AND account_id=?").run(venue,staff.userId)});
 assert.notEqual((await r.api.orders.POST(req(staff,{...cut,operationId:'cut-revoked',expectedRevision:4}))).status,201);assert.equal(get('bd_pos_orders_v1')[0].preparationTickets.length,2);
 assert.equal((await r.api.orders.POST(req(staff,cut))).status,403);

});
test('confirmation leaves payment separate; paid order retains immutable tickets and replay',async()=>{const {c,p}=await fixture();const first=await planPosOrder(c,p.orders,confirm(1));const common={orderId:'order',expectedRevision:2,payment:{id:'payment',method:'CASH' as const,amount:95}};const preview=await planPosOrder(c,first.orders,{...common,action:'preview_payment',operationId:'preview'});const paid=await planPosOrder(c,first.orders,{...common,action:'pay',operationId:'pay',previewHash:preview.previewHash});assert.equal(paid.order.status,'PAID');assert.equal(paid.event?.revenue,95);assert.deepEqual(paid.order.preparationTickets,first.order.preparationTickets);assert.equal((await planPosOrder({...c,...paid.salesPlan},paid.orders,{...common,action:'pay',operationId:'pay',previewHash:preview.previewHash})).duplicate,true);});
test('senior partial/full cancellation snapshots original route, requires reason, prevents over-cancel and ID reuse',async()=>{
 const {c,p}=await fixture(),first=await planPosOrder(c,p.orders,confirm(1)),original=structuredClone(first.order.preparationTickets!);
 const cancel:PosOrderCommand={action:'cancel_item',operationId:'cancel-a',orderId:'order',expectedRevision:2,lineId:'a',quantity:1,reason:'Guest changed mind'};
 c.actor.role='cashier';await assert.rejects(()=>planPosOrder(c,first.orders,cancel),/ACCESS_DENIED/);c.actor.role='manager';await assert.rejects(()=>planPosOrder(c,first.orders,{...cancel,reason:' '}),/REASON_REQUIRED/);await assert.rejects(()=>planPosOrder(c,first.orders,{...cancel,quantity:3}),/LINES_INVALID/);
 c.preparationConfig!.routes[0].printerId='different';(c.assortment.menuItems as any[])[0].sectionId='kitchen';
 const partial=await planPosOrder(c,first.orders,cancel),ticket=partial.order.preparationTickets!.at(-1)!;
 assert.equal(partial.order.lines[0].quantity,1);assert.equal(ticket.kind,'CANCELLATION');assert.equal(ticket.originalTicketId,original[0].id);assert.equal(ticket.sectionId,'bar');assert.equal(ticket.printerId,'bar-device');assert.equal(ticket.reason,cancel.reason);assert.equal(ticket.lines[0].quantity,1);assert.equal(partial.salesPlan,undefined);assert.deepEqual(partial.order.preparationTickets!.slice(0,3),original);assert.equal((await planPosOrder(c,partial.orders,cancel)).duplicate,true);
 c.actor.role='cashier';await assert.rejects(()=>planPosOrder(c,partial.orders,cancel),/ACCESS_DENIED/);c.actor.role='manager';
 const full=await planPosOrder(c,partial.orders,{...cancel,operationId:'rest',expectedRevision:3});assert.equal(full.order.lines.some(l=>l.id==='a'),false);assert.equal(full.order.preparationTickets!.length,5);
 await assert.rejects(()=>planPosOrder(c,full.orders,{action:'add_items',operationId:'reuse',orderId:'order',expectedRevision:4,lines:[{id:'a',menuItemId:'beer',quantity:1}]}),/LINES_INVALID/);
 const tampered=structuredClone(full.orders);tampered[0].preparationTickets!.at(-1)!.lines[0].quantity=2;assert.throws(()=>parsePosOrders(tampered),/PREPARATION_INVALID/);
 const paidEvidence={...c,events:[{orderId:'order',venueId:1}] as any};await assert.rejects(()=>planPosOrder(paidEvidence,first.orders,cancel),/CANCELLATION_HAS_PAYMENT/);
 c.closedMonths.add('2026-09');await assert.rejects(()=>planPosOrder(c,first.orders,cancel),/MONTH/);c.closedMonths.clear();c.revenues=planSalesShift(c,'close_shift','shift');await assert.rejects(()=>planPosOrder(c,first.orders,cancel),/SHIFT_CLOSED/);
});
test('cancellation before payment posts only remaining quantity once; paid order cannot be corrected',async()=>{
 const {c,p}=await fixture(),first=await planPosOrder(c,p.orders,confirm(1));const cut=await planPosOrder(c,first.orders,{action:'cancel_item',operationId:'cut',orderId:'order',expectedRevision:2,lineId:'a',quantity:1,reason:'Guest cancellation'});
 const common={orderId:'order',expectedRevision:3,payment:{id:'payment',method:'CASH' as const,amount:75}},preview=await planPosOrder(c,cut.orders,{...common,action:'preview_payment',operationId:'preview'}),paid=await planPosOrder(c,cut.orders,{...common,action:'pay',operationId:'pay',previewHash:preview.previewHash});
 assert.equal(paid.event?.revenue,75);assert.equal((paid.salesPlan!.assortment.stockBalances as any[]).find(x=>x.productKey==='beer-stock').current,19);assert.deepEqual(paid.order.preparationTickets,cut.order.preparationTickets);
 await assert.rejects(()=>planPosOrder({...c,...paid.salesPlan},paid.orders,{action:'cancel_item',operationId:'after-paid',orderId:'order',expectedRevision:paid.order.revision,lineId:'a',reason:'Too late'}),/NOT_OPEN/);
});
test('unconfigured correction stays unconfigured; full cancellation allows closing empty draft',async()=>{
 const {c,p}=await fixture();c.preparationConfig=undefined;
 const first=await planPosOrder(c,p.orders,confirm(1));let current=first;
 for(const line of first.order.lines)current=await planPosOrder(c,current.orders,{action:'cancel_item',operationId:'remove-'+line.id,orderId:'order',expectedRevision:current.order.revision,lineId:line.id,reason:'Cancel entire order'});
 assert.equal(current.order.lines.length,0);assert.equal(current.order.preparationTickets!.length,6);for(const ticket of current.order.preparationTickets!){assert.equal(ticket.status,'unconfigured');assert.equal(ticket.printerId,null)}
 const closed=await planPosOrder(c,current.orders,{action:'cancel_order',operationId:'close-empty',orderId:'order',expectedRevision:current.order.revision,reason:'All lines cancelled'});assert.equal(closed.order.status,'CANCELLED');assert.deepEqual(closed.order.preparationTickets,current.order.preparationTickets);
 await assert.rejects(()=>planPosOrder(c,closed.orders,{action:'cancel_item',operationId:'closed',orderId:'order',expectedRevision:closed.order.revision,lineId:'a',reason:'Not allowed'}),/NOT_OPEN/);
});

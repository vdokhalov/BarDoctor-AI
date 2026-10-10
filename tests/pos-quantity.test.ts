import test from 'node:test';
import assert from 'node:assert/strict';
import { salesEventFixture } from './helpers/sales-event-fixture';
import { planSalesShift } from '../lib/bardoctor/sales-events';
import { planPosOrder, type PosOrderCommand, type PosOrder, POS_ORDER_STORE_KEY } from '../lib/bardoctor/pos-orders';
import { openingRuntime } from './helpers/opening-runtime';
import { planPosDiscountRule } from '../lib/bardoctor/pos-discounts';
import type { PosOrderContext } from '../lib/bardoctor/pos-orders';
import { lifecycleRuntime } from './helpers/lifecycle-runtime';

const cmd=(order:PosOrder,quantity:number,operationId='qty'):PosOrderCommand=>({action:'set_quantity',orderId:order.id,expectedRevision:order.revision,lineId:'line',quantity,operationId});
async function fixture(){const c=salesEventFixture();c.revenues=planSalesShift(c,'open_shift','shift','Day');const p=await planPosOrder(c,[],{action:'create',orderId:'order',operationId:'create',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'line',menuItemId:'beer',quantity:3}]});return {c,p};}
for(const role of ['cashier','shift_manager','manager','owner'])test(`${role}: adjust 3→5→2→0 before precheck, no revenue or stock write`,async()=>{
 const {c,p}=await fixture();c.actor={...c.actor,role};const before=JSON.stringify(c);
 const increase=await planPosOrder(c,p.orders,cmd(p.order,5));assert.equal(increase.order.lines[0].quantity,5);assert.equal(increase.order.totals?.netAmount,100);assert.equal(increase.salesPlan,undefined);
 const decrease=await planPosOrder(c,increase.orders,cmd(increase.order,2,'decrease'));assert.equal(decrease.order.totals?.netAmount,40);
 const remove=await planPosOrder(c,decrease.orders,cmd(decrease.order,0,'remove'));assert.equal(remove.order.lines.length,0);assert.equal(remove.order.status,'OPEN');assert.equal(remove.order.totals?.netAmount,0);
 assert.equal(JSON.stringify(c),before);
});
test('quantity validates bounds, precheck/revision/discount locks, and preserves replay identity',async()=>{
 const {c,p}=await fixture();
 for(const quantity of [-1,1.5,1000,NaN,Infinity])await assert.rejects(()=>planPosOrder(c,p.orders,cmd(p.order,quantity)),/LINES_INVALID/);
 const max=await planPosOrder(c,p.orders,cmd(p.order,999));assert.equal(max.order.lines[0].quantity,999);
 assert.equal((await planPosOrder(c,max.orders,cmd(p.order,999))).duplicate,true);
 await assert.rejects(()=>planPosOrder(c,max.orders,cmd(p.order,1)),/IDEMPOTENCY_CONFLICT/);
 const pre=await planPosOrder(c,p.orders,{action:'precheck',orderId:p.order.id,expectedRevision:p.order.revision,operationId:'precheck'});
 c.actor.role='cashier';
 await assert.rejects(()=>planPosOrder(c,pre.orders,cmd(p.order,2)),/REVISION_CONFLICT/);
 await assert.rejects(()=>planPosOrder(c,pre.orders,cmd(pre.order,2)),/PRECHECK_LOCKED/);
 for(const action of ['cancel_precheck','split','cancel_order'] as const) await assert.rejects(()=>planPosOrder(c,pre.orders,{action,orderId:p.order.id,expectedRevision:pre.order.revision,operationId:action,reason:'test',newOrderId:'new',lines:[{lineId:'line',quantity:1}]}),/ACCESS_DENIED/);
 c.actor.role='manager';const unlocked=await planPosOrder(c,pre.orders,{action:'cancel_precheck',orderId:p.order.id,expectedRevision:pre.order.revision,operationId:'unlock',reason:'Quantity correction'});
 c.actor.role='cashier';assert.equal((await planPosOrder(c,unlocked.orders,cmd(unlocked.order,2))).order.lines[0].quantity,2);
 c.actor.role='owner';const discountedContext:PosOrderContext={...c,discountRules:(await planPosDiscountRule(c,[],{action:'save',ruleId:'rule',operationId:'save-rule',expectedRevision:0,rule:{name:'Ten',kind:'PERCENT',value:10,active:true}})).rules};
 const discounted=await planPosOrder(discountedContext,p.orders,{action:'apply_discount',ruleId:'rule',ruleRevision:1,reason:'Synthetic',operationId:'discount',orderId:p.order.id,expectedRevision:p.order.revision});
 await assert.rejects(()=>planPosOrder(discountedContext,discounted.orders,cmd(discounted.order,2)),/DISCOUNT_LOCKED/);
 const cancelled=await planPosOrder(c,p.orders,{action:'cancel_order',operationId:'cancel',orderId:p.order.id,expectedRevision:p.order.revision,reason:'Synthetic'});
 await assert.rejects(()=>planPosOrder(c,cancelled.orders,cmd(cancelled.order,2)),/NOT_OPEN/);
});
test('real handler denies stale precheck race and privileged actions but permits staff quantity changes',async t=>{
 let role='cashier';const r=openingRuntime(new URL('../app/api/pos-orders/route.ts',import.meta.url),{authenticateRequest:async()=>({id:7,venueId:1,actorAccountId:7,role,firstName:'Test',lastName:'Staff',restaurantJson:'{"currency":"MDL"}',permissions:['sales.view','sales.create','sales.post']})});t.after(r.close);
 const {c,p}=await fixture();r.put('bd_assortment_v1',c.assortment);r.put('bd_finance_revenue',c.revenues);r.put(POS_ORDER_STORE_KEY,p.orders);
 const send=(body:object)=>r.api.POST(new Request('https://test/api',{method:'POST',body:JSON.stringify({venueId:1,...body})}));
 const initial=await send(cmd(p.order,2));assert.equal(initial.status,201);const order=(await initial.json() as {order:PosOrder}).order;
 const checked=await planPosOrder(c,[order],{action:'precheck',operationId:'race',orderId:order.id,expectedRevision:order.revision});
 r.beforeBatch(()=>r.put(POS_ORDER_STORE_KEY,checked.orders));
 const race=await send(cmd(order,1,'stale'));assert.equal(race.status,409);assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0].lines[0].quantity,2);
 assert.equal((await send(cmd(checked.order,0,'blocked'))).status,409);
 const cancel={action:'cancel_precheck',operationId:'unlock',orderId:order.id,expectedRevision:checked.order.revision,reason:'Correction'};
 assert.equal((await send(cancel)).status,403);role='manager';assert.equal((await send(cancel)).status,201);
 const current=(r.get(POS_ORDER_STORE_KEY) as PosOrder[])[0];role='cashier';assert.equal((await send(cmd(current,0,'remove'))).status,201);
 assert.equal(r.get('bd_stock_movements'),null);assert.equal(r.get('bd_sales_events_v1'),null);
});
test('real membership: waiter quantity edits retain authorization on replay and cannot unlock precheck',async t=>{
 const r=await lifecycleRuntime({sales:'./app/api/sales-events/route',orders:'./app/api/pos-orders/route'});t.after(r.close);
 const owner=await r.register('quantity-owner@isolated.test'),staff=await r.register('quantity-staff@isolated.test'),venue=owner.activeVenueId;
 const workspace=r.sqlite.prepare('SELECT workspace_id FROM venues WHERE id=?').get(venue)!.workspace_id!;
 r.sqlite.prepare("INSERT INTO workspace_memberships(workspace_id,account_id,role,status) VALUES (?,?,'member','active')").run(workspace,staff.userId);
 r.sqlite.prepare("INSERT INTO venue_memberships(venue_id,account_id,role,status) VALUES (?,?,'cashier','active')").run(venue,staff.userId);
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run('{"currency":"MDL"}',owner.userId);
 r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(owner.userId,'bd_assortment_v1',JSON.stringify(salesEventFixture().assortment));
 const req=(user:typeof owner,body:object)=>{const headers=new Headers(r.request(user,'/api').headers);headers.set('X-Venue-Id',String(venue));return new Request('https://isolated.test/api',{method:'POST',headers,body:JSON.stringify({venueId:venue,...body})});};
 assert.equal((await r.api.sales.POST(req(owner,{action:'open_shift',shiftId:'shift',name:'Synthetic'}))).status,201);
 const created=await r.api.orders.POST(req(staff,{action:'create',orderId:'order',operationId:'create',expectedRevision:0,shiftId:'shift',tableNumber:'1',lines:[{id:'line',menuItemId:'beer',quantity:3}]}));assert.equal(created.status,201);
 const order=(await created.json() as {order:PosOrder}).order,change=cmd(order,2);
 assert.equal((await r.api.orders.POST(req(staff,change))).status,201);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=? WHERE venue_id=? AND account_id=?').run(JSON.stringify({deny:['sales.create']}),venue,staff.userId);
 assert.equal((await r.api.orders.POST(req(staff,change))).status,403);
 r.sqlite.prepare('UPDATE venue_memberships SET permissions_json=NULL WHERE venue_id=? AND account_id=?').run(venue,staff.userId);
 const check=await r.api.orders.POST(req(staff,{action:'precheck',orderId:'order',operationId:'check',expectedRevision:2}));assert.equal(check.status,201);
 const checked=(await check.json() as {order:PosOrder}).order;
 assert.equal((await r.api.orders.POST(req(staff,cmd(checked,0,'blocked')))).status,409);
 assert.equal((await r.api.orders.POST(req(staff,{action:'cancel_precheck',orderId:'order',operationId:'unlock',expectedRevision:checked.revision,reason:'No permission'}))).status,403);
});

test('payment consumes the final edited quantity once, with matching revenue',async()=>{
 const {c,p}=await fixture();const edited=await planPosOrder(c,p.orders,cmd(p.order,2));
 const common={orderId:edited.order.id,expectedRevision:edited.order.revision,payment:{id:'payment',method:'CASH' as const,amount:40}};
 const preview=await planPosOrder(c,edited.orders,{...common,action:'preview_payment',operationId:'preview'});
 const paid=await planPosOrder(c,edited.orders,{...common,action:'pay',operationId:'pay',previewHash:preview.previewHash});
 assert.equal(paid.event?.revenue,40);assert.equal(paid.order.lines[0].quantity,2);
 assert.equal((paid.salesPlan?.assortment.stockBalances as {productKey:string;current:number}[]).find(row=>row.productKey==='beer-stock')?.current,18);
 assert.equal(paid.salesPlan?.movements.length,1);
 const replay=await planPosOrder({...c,...paid.salesPlan},paid.orders,{...common,action:'pay',operationId:'pay',previewHash:preview.previewHash});assert.equal(replay.duplicate,true);assert.equal(replay.salesPlan,undefined);
});

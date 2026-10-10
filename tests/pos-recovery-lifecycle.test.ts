import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { openingRuntime } from "./helpers/opening-runtime";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { planSalesShift } from "../lib/bardoctor/sales-events";
import { planPosOrder, POS_ORDER_STORE_KEY, posOrderViews, type PosOrder } from "../lib/bardoctor/pos-orders";
import { hasPermission, permissionsFor } from "../lib/bardoctor/access-control";
import { canReadStore, canWriteStore } from "../lib/bardoctor/data-trust";
function fixture() {
 const c=salesEventFixture(); c.now="2026-09-09T22:30:00.000Z"; c.revenues=planSalesShift(c,"open_shift","night","Night"); c.revenues[0].openingFloat=100;
 const r=openingRuntime(new URL("../app/api/sales-events/route.ts",import.meta.url));r.put("bd_assortment_v1",c.assortment);r.put("bd_finance_revenue",c.revenues);
 const orderApi=r.loadRoute(new URL("../app/api/pos-orders/route.ts",import.meta.url));
 const send=(api:typeof r.api,body:object)=>api.POST(new Request("https://test/api",{method:"POST",body:JSON.stringify({venueId:1,...body})}));
 return {c,r,send,orderApi};
}
test("cash movements replay once, close snapshot reconciles cash and remains immutable",async t=>{
 const {r,send}=fixture();t.after(r.close);
 for(const [operationId,kind,amount] of [["in","IN",20],["out","OUT",10],["safe","SAFE_DROP",15]] as const){
  const body={action:"cash",shiftId:"night",cash:{operationId,kind,amount,reason:"Synthetic test"}};
  assert.equal((await send(r.api,body)).status,201);assert.equal((await send(r.api,body)).status,200);
 }
 const closed=await send(r.api,{action:"close_shift",shiftId:"night",actualCash:93});assert.equal(closed.status,201);
 const report=(await closed.json() as {report:{cash:{expected:number;variance:number}}}).report;
 assert.equal(report.cash.expected,95);assert.equal(report.cash.variance,-2);
 const before=JSON.stringify(r.get("bd_finance_revenue"));
 const retry=await send(r.api,{action:"close_shift",shiftId:"night",actualCash:999});assert.equal(retry.status,200);assert.equal(JSON.stringify(r.get("bd_finance_revenue")),before);
 assert.equal((await send(r.api,{action:"cash",shiftId:"night",cash:{operationId:"late",kind:"IN",amount:1,reason:"Late"}})).status,409);
});
test("concurrent order prevents close and preserves the open shift",async t=>{
 const {c,r,send}=fixture();t.after(r.close);
 const plan=await planPosOrder(c,[],{action:"create",orderId:"order",operationId:"create",expectedRevision:0,shiftId:"night",tableNumber:"1",lines:[{id:"line",menuItemId:"beer",quantity:1}]});
 r.beforeBatch(()=>r.put(POS_ORDER_STORE_KEY,plan.orders));
 const close=await send(r.api,{action:"close_shift",shiftId:"night",actualCash:100});assert.equal(close.status,409);
 assert.equal((r.get("bd_finance_revenue") as {closingStatus:string}[])[0].closingStatus,"open");
 assert.equal((r.get(POS_ORDER_STORE_KEY) as PosOrder[]).length,1);
});
test("lost payment response replays exact operation once after close with one receipt and one stock deduction",async t=>{
 const {r,send,orderApi}=fixture();t.after(r.close);
 const created=await send(orderApi,{action:"create",orderId:"order",operationId:"create",expectedRevision:0,shiftId:"night",tableNumber:"3",lines:[{id:"line",menuItemId:"beer",quantity:2}]});
 assert.equal(created.status,201);
 const common={orderId:"order",expectedRevision:1,payment:{id:"payment",method:"CASH",amount:40}};
 const preview=await send(orderApi,{...common,action:"preview_payment",operationId:"preview"});const {previewHash}=await preview.json() as {previewHash:string};
 const command={...common,action:"pay",operationId:"pay",previewHash};assert.equal((await send(orderApi,command)).status,201);
 const stock=JSON.stringify(r.get("bd_stock_movements"));
 assert.equal((await send(r.api,{action:"close_shift",shiftId:"night",actualCash:140})).status,201);
 const replay=await send(orderApi,command);assert.equal(replay.status,200);assert.equal((await replay.json() as {duplicate:boolean}).duplicate,true);
 assert.equal((r.get("bd_sales_events_v1") as unknown[]).length,1);assert.equal(JSON.stringify(r.get("bd_stock_movements")),stock);
});
test("archived items mark frozen prechecks unavailable and forged cashier permissions stay bounded",async()=>{
 const {c,r}=fixture();r.close();const create=await planPosOrder(c,[],{action:"create",orderId:"o",operationId:"c",expectedRevision:0,shiftId:"night",tableNumber:"2",lines:[{id:"l",menuItemId:"beer",quantity:1}]});
 const check=await planPosOrder(c,create.orders,{action:"precheck",orderId:"o",operationId:"p",expectedRevision:1});
 (c.assortment.menuItems as {archived?:boolean}[])[0].archived=true;
 assert.equal(posOrderViews(c,check.orders)[0].lines[0].pricingUnavailable,true);
 for(const permission of ["shifts.manage","shifts.view","finance.view","inventory.view"] as const) assert.equal(hasPermission({role:"cashier",permissions:[permission]},permission),false);
 assert.deepEqual(permissionsFor("cashier",JSON.stringify({allow:["finance.view","shifts.manage"]})),["sales.view","sales.create","sales.post"]);
 for(const key of ["bd_pos_orders_v1","bd_pos_discounts_v1","bd_sales_events_v1"]){assert.equal(canWriteStore("owner",key),false);assert.equal(canReadStore("owner",key),false);}
});
test("refresh does not overlap, poll hidden views, or discard old data on transient errors",async()=>{
 const context=vm.createContext({});vm.runInContext(readFileSync("public/pos-refresh.js","utf8"),context);
 let time=0,visible=true,canRun=true,loads=0,timers=0,clears=0,success=0,errors=0,resolve:(v?:unknown)=>void=()=>{};
 const controller=context.bdPosRefresh({now:()=>time,isVisible:()=>visible,canRun:()=>canRun,setInterval:()=>++timers,clearInterval:()=>clears++,load:()=>{loads++;return new Promise(r=>{resolve=r;});},onSuccess:()=>success++,onError:()=>errors++});
 controller.start();controller.start();assert.equal(timers,1);
 const first=controller.refresh(true);await controller.refresh(true);assert.equal(loads,1);resolve();await first;assert.equal(success,1);
 visible=false;time=16000;await controller.refresh(true);assert.equal(loads,1);
 visible=true;canRun=false;await controller.refresh(true);assert.equal(loads,1);
 canRun=true;const second=controller.refresh();controller.stop();resolve();await second;assert.equal(success,1);assert.equal(clears,1);assert.equal(errors,0);
});

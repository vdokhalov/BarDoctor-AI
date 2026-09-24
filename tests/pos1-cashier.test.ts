import test from "node:test";
import assert from "node:assert/strict";
import { openingRuntime } from "./helpers/opening-runtime";
import * as sales from "../lib/bardoctor/sales-events";
import { salesEventFixture } from "./helpers/sales-event-fixture";
import { canManagePosPrivilegedAction, permissionsFor } from "../lib/bardoctor/access-control";

function isolated() {
  const r=openingRuntime(new URL("../app/api/sales-events/route.ts",import.meta.url),sales);
  r.setCurrency("PMR_RUB");
  const fixture=salesEventFixture();
  fixture.assortment={
    menuItems:[{id:"vodka40",name:"TEST VODKA 40",venueId:1,active:true,department:"bar",category:"Vodka",type:"composite",consumptionMode:"RECIPE",salePrice:30,currency:"PMR_RUB"}],
    nomenclature:[{id:"vodka",productKey:"vodka-stock",name:"TEST VODKA",unit:"l",venueId:1,active:true}],
    stockBalances:[{productKey:"vodka-stock",name:"TEST VODKA",unit:"l",current:1,venueId:1,currency:"PMR_RUB"}],
    recipes:[{id:"vodka-recipe",menuItemId:"vodka40",ownerId:"vodka40",venueId:1,version:1,current:true,status:"confirmed",reviewStatus:"approved",ingredients:[{id:"vodka-line",nomenclatureItemId:"vodka",purchaseProductKey:"vodka-stock",name:"TEST VODKA",quantity:0.04,unit:"l",normalizedQuantity:0.04,normalizedUnit:"l",venueId:1}]}]
  };
  r.put("bd_assortment_v1",fixture.assortment);
  r.put("bd_stock_movements",[{id:"vodka-receipt",type:"receipt",venueId:1,productKey:"vodka-stock",productName:"TEST VODKA",amount:1,unit:"l",costAmount:300,costStatus:"KNOWN",currency:"PMR_RUB",date:"2026-09-01",sourceDocumentId:"confirmed-purchase",sourceLineId:"purchase-line",createdAt:"2026-09-01T10:00:00Z"}]);
  const send=(body:object,venue=1)=>r.api.POST(new Request("http://localhost/api/sales-events",{method:"POST",headers:{"Content-Type":"application/json","X-Venue-Id":String(venue)},body:JSON.stringify({venueId:venue,...body})}));
  const getApi=()=>r.api.GET(new Request("http://localhost/api/sales-events",{headers:{"X-Venue-Id":"1"}}));
  return {...r,send,getApi};
}
const command={id:"pos-vodka-sale",source:"POS_API" as const,shiftId:"night-shift",payments:[{id:"payment-1",method:"CASH" as const,amount:30}],lines:[{id:"line-1",menuItemId:"vodka40",quantity:1}]};

test("POS-1 HTTP: TEST VODKA 40 persists revenue 30, cost 12, stock 0.96 and one shift/employee",async()=>{
  const r=isolated();
  try{
    const noShift=await r.send({action:"preview",command});assert.equal(noShift.status,409);
    r.put("bd_finance_revenue",[{id:"night-shift",venueId:1,date:new Date().toISOString().slice(0,10),accountingMonth:new Date().toISOString().slice(0,7),shiftName:"Night",revenueSource:"sales_events_v1",currency:"PMR_RUB",revenue:0,receipts:0,closingStatus:"open"}]);
    const quote=await r.send({action:"preview",command});assert.equal(quote.status,200);const preview=await quote.json() as {previewHash:string;event:sales.SalesEvent};
    assert.equal(preview.event.revenue,30);assert.equal(preview.event.batch.totalTheoreticalCost,12);
    assert.equal((r.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[0].current,1,"preview does not mutate stock");
    const paid=await r.send({action:"post",command,previewHash:preview.previewHash});assert.equal(paid.status,201);
    const event=(await paid.json() as {event:sales.SalesEvent}).event;
    assert.equal(event.shiftId,"night-shift");assert.equal(event.actor?.name,"QA");assert.equal(event.payments?.[0].method,"CASH");
    assert.equal(event.revenue,30);assert.equal(event.batch.totalTheoreticalCost,12);
    assert.equal(event.originalMovements.length,1);assert.equal(event.originalMovements[0].amount,-0.04);
    assert.equal((r.get("bd_assortment_v1") as {stockBalances:{current:number}[]}).stockBalances[0].current,0.96);
    assert.equal((r.get("bd_finance_revenue") as {revenue:number;receipts:number}[])[0].revenue,30);
    const before=JSON.stringify(r.get("bd_stock_movements"));
    const retry=await r.send({action:"post",command,previewHash:preview.previewHash});assert.equal(retry.status,200);assert.equal((await retry.json() as {duplicate:boolean}).duplicate,true);
    assert.equal(JSON.stringify(r.get("bd_stock_movements")),before);
    const reread=await (await r.getApi()).json() as {events:sales.SalesEvent[];shifts:{revenue:number;receipts:number}[]};
    assert.equal(reread.events.length,1);assert.equal(reread.events[0].batch.totalTheoreticalCost,12);assert.equal(reread.shifts[0].receipts,1);
    assert.equal((await r.send({action:"reverse",eventId:event.id})).status,409,"POS-2 reversal is not available");
  }finally{r.close();}
});

test("POS-1: midnight stays in opened shift; card, modes and role contract",async()=>{
  const c=salesEventFixture();c.now="2026-09-10T01:15:00.000Z";c.revenues=[{id:"night",venueId:1,date:"2026-09-09",closingStatus:"open",revenueSource:"sales_events_v1",currency:"MDL",shiftName:"Night",revenue:0,receipts:0}];
  for(const [item,amount] of [["beer",20],["whisky",40],["coffee",15],["ticket",0]] as const){
    const cmd={id:`card-${item}`,source:"POS_API" as const,shiftId:"night",payments:[{id:"p",method:"CARD_EXTERNAL" as const,amount}],lines:[{id:"l",menuItemId:item,quantity:1}]};
    const plan=await sales.planSalesEvent(c,cmd);assert.equal(plan.event.businessDate,"2026-09-09");assert.equal(plan.event.acceptedAt,c.now);assert.equal(plan.event.payments?.[0].method,"CARD_EXTERNAL");
    assert.equal(plan.event.batch.totalTheoreticalCost,item==="ticket"?0:null);
  }
  await assert.rejects(()=>sales.planSalesEvent(c,{...command,id:"missing"}),/SHIFT_NOT_FOUND/);
  for(const role of ["cashier","waiter","bartender","barista"]){assert.equal(canManagePosPrivilegedAction({role} as never),false);}
  for(const role of ["owner","manager","shift_manager"]){assert.equal(canManagePosPrivilegedAction({role} as never),true);}
  assert.equal(permissionsFor("cashier").includes("sales.post"),true);assert.equal(permissionsFor("cashier").includes("sales.reverse"),false);
});





test("POS-1 rejects missing/closed shifts, mismatched payment, foreign venue and unsafe quantity",async()=>{
  const c=salesEventFixture();
  const cmd={id:"strict",source:"POS_API" as const,shiftId:"shift",payments:[{id:"p",method:"CASH" as const,amount:15}],lines:[{id:"l",menuItemId:"coffee",quantity:1}]};
  await assert.rejects(()=>sales.planSalesEvent(c,cmd),/SHIFT_NOT_FOUND/);
  c.revenues=sales.planSalesShift(c,"open_shift","shift","Day");
  await assert.rejects(()=>sales.planSalesEvent(c,{...cmd,payments:[{...cmd.payments[0],amount:14}]}),/POS_PAYMENT_MISMATCH/);
  await assert.rejects(()=>sales.planSalesEvent(c,{...cmd,lines:[{...cmd.lines[0],quantity:1.5}]}),/POS_QUANTITY_INVALID/);
  await assert.rejects(()=>sales.planSalesEvent(c,{...cmd,lines:[{...cmd.lines[0],quantity:1000}]}),/POS_QUANTITY_INVALID/);
  const foreign={...c,venueId:2};await assert.rejects(()=>sales.planSalesEvent(foreign,cmd),/SHIFT_NOT_FOUND/);
  c.revenues=sales.planSalesShift(c,"close_shift","shift");
  await assert.rejects(()=>sales.planSalesEvent(c,cmd),/SHIFT_CLOSED_OR_DATE_MISMATCH/);
  assert.equal(c.events.length,0);
});

test("POS-1 cashier override cannot unlock reversal; actor snapshot stays with sale",async()=>{
  const { hasPermission }=await import("../lib/bardoctor/access-control");
  assert.equal(hasPermission({role:"cashier",permissions:["sales.view","sales.create","sales.post","sales.reverse"]},"sales.reverse"),false);
  const c=salesEventFixture();c.actor={accountId:42,name:"TEST CASHIER",role:"cashier"};c.revenues=sales.planSalesShift(c,"open_shift","shift","Day");
  const cmd={id:"actor",source:"POS_API" as const,shiftId:"shift",payments:[{id:"p",method:"CARD_EXTERNAL" as const,amount:20}],lines:[{id:"l",menuItemId:"beer",quantity:1}]};
  const first=await sales.planSalesEvent(c,cmd);assert.equal(first.event.actor?.accountId,42);assert.equal(first.event.actor?.name,"TEST CASHIER");
  const persisted={...c,events:JSON.parse(JSON.stringify(first.events)),revenues:JSON.parse(JSON.stringify(first.revenues)),assortment:JSON.parse(JSON.stringify(first.assortment)),movements:JSON.parse(JSON.stringify(first.movements))};
  persisted.actor={accountId:77,name:"OTHER EMPLOYEE",role:"owner"};
  const reread=await sales.planSalesEvent(persisted,cmd);assert.equal(reread.duplicate,true);assert.equal(reread.event.actor?.accountId,42);
  await assert.rejects(()=>sales.planSalesEvent(persisted,{...cmd,payments:[{...cmd.payments[0],method:"CASH"}]}),/IDEMPOTENCY_CONFLICT/);
});

test("POS-1 real auth and SQLite deny another venue without touching its sales",async t=>{
  const {lifecycleRuntime}=await import("./helpers/lifecycle-runtime");
  const r=await lifecycleRuntime({salesEvents:"./app/api/sales-events/route"});t.after(r.close);
  const a=await r.register("pos-owner-a@isolated.test"),b=await r.register("pos-owner-b@isolated.test");
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({name:"A",currency:"PMR_RUB"}),a.userId);
  r.sqlite.prepare("UPDATE accounts SET restaurant_json=? WHERE id=?").run(JSON.stringify({name:"B",currency:"PMR_RUB"}),b.userId);
  const own=await r.api.salesEvents.GET(r.request(a,"/api/sales-events"));assert.equal(own.status,200);
  const ownPayload=await own.json() as {venueId:number};assert.equal(ownPayload.venueId,a.activeVenueId);
  const foreignBody=await r.api.salesEvents.POST(r.request(a,"/api/sales-events","POST",{venueId:b.activeVenueId,action:"open_shift",shiftId:"foreign",name:"Unauthorized"}));
  assert.equal(foreignBody.status,409);
  const headers=new Headers(r.request(a,"/api/sales-events").headers);headers.set("X-Venue-Id",String(b.activeVenueId));
  const foreignGet=await r.api.salesEvents.GET(new Request("https://isolated.test/api/sales-events",{headers}));assert.ok([401,403].includes(foreignGet.status));
  assert.equal(r.sqlite.prepare("SELECT count(*) n FROM domain_data WHERE account_id=? AND store_key='bd_finance_revenue'").get(b.userId)?.n,0);
});

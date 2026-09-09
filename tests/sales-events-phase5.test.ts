import test from "node:test";
import assert from "node:assert/strict";
import { planSalesEvent, planReverseSalesEvent, planSalesShift, eventRevenueMutation, type SalesEventContext } from "../lib/bardoctor/sales-events";
import { salesEventFixture, saleCommand } from "./helpers/sales-event-fixture";
import { reconcileSalesRevenue } from "../lib/bardoctor/sales-revenue";
function persist(c:SalesEventContext,p:Awaited<ReturnType<typeof planSalesEvent>>):SalesEventContext {
  return {...c,...JSON.parse(JSON.stringify({events:p.events,revenues:p.revenues,assortment:p.assortment,movements:p.movements}))};
}

test("fixed quantity uses balance units for quantity, receipt cost and persisted reversal", async () => {
  for (const [unit, inputUnit, size, initial, perSale] of [
    ["l", "ml", 50, 2, 0.05], ["ml", "l", 0.05, 2000, 50],
    ["kg", "g", 50, 2, 0.05], ["g", "kg", 0.05, 2000, 50],
  ] as const) {
    for (const cost of [null, 0, 200]) {
      const c = salesEventFixture();
      const menu = c.assortment.menuItems as {saleSize?: {quantity:number;unit:string}}[];
      menu[1].saleSize = {quantity:size, unit:inputUnit};
      (c.assortment.nomenclature as {unit:string}[])[1].unit = unit;
      const balance = (c.assortment.stockBalances as {unit:string;current:number}[])[1];
      Object.assign(balance, {unit, current:initial});
      if (cost !== null) c.movements = [{id:"receipt", type:"receipt", venueId:1,
        productKey:"whisky-stock", productName:"Whisky", amount:1000,
        unit:unit === "l" || unit === "ml" ? "ml" : "g", costAmount:cost,
        costStatus:cost === 0 ? "KNOWN_ZERO" : "KNOWN", currency:"MDL",
        date:"2026-09-01", sourceDocumentId:"purchase", sourceLineId:"line",
        createdAt:"2026-09-01T10:00:00Z"}];
      const p = await planSalesEvent(c, saleCommand("whisky", 2));
      const ingredient = p.event.batch.lines[0].recipeSnapshot!.ingredients[0];
      assert.equal(ingredient.baseUnit, unit);
      assert.equal(ingredient.baseQuantityPerPortion, perSale);
      assert.equal(ingredient.baseQuantityTotal, perSale * 2);
      assert.equal(ingredient.conversion.outputUnit, unit);
      assert.equal(ingredient.conversion.factor, perSale / size);
      assert.equal(ingredient.totalCost, cost === null ? null : cost / 10);
      assert.equal(ingredient.unitCost, cost === null ? null : cost / (initial / 2));
      const movement = p.event.originalMovements[0];
      assert.equal(movement.unit, unit);
      assert.equal(movement.amount, -perSale * 2);
      assert.equal(movement.costAmount, cost === null ? undefined : -cost / 10);
      assert.equal((p.assortment.stockBalances as {current:number}[])[1].current, initial - perSale * 2);
      const saved = persist(c, p), before = structuredClone(saved.events[0].batch);
      const reversed = planReverseSalesEvent(saved, p.event.id);
      assert.equal((reversed.assortment.stockBalances as {current:number}[])[1].current, initial);
      const credit = reversed.movements.find(m => m.type === "sale_reversal")!;
      assert.equal(credit.unit, unit);
      assert.equal(credit.amount, perSale * 2);
      assert.equal(credit.costAmount, cost === null ? undefined : cost / 10);
      assert.deepEqual(reversed.event.batch, before);
    }
  }
});

test("fixed quantity rejects incompatible balance dimensions without mutation", async () => {
  const c = salesEventFixture();
  (c.assortment.stockBalances as {unit:string}[])[1].unit = "kg";
  const before = structuredClone(c);
  await assert.rejects(() => planSalesEvent(c, saleCommand("whisky", 2)), /SALES_EVENT_CONSUMPTION_NEEDS_REVIEW/);
  assert.deepEqual(c, before);
});
test("all active consumption modes post exact canonical amounts, UNKNOWN and known zero",async()=>{
  for (const [menu,qty,index,expected] of [["beer",2,0,18],["whisky",2,1,1.9],["coffee",10,2,0.92],["ticket",1,0,20]] as const) {
    const c=salesEventFixture(),before=structuredClone(c),p=await planSalesEvent(c,saleCommand(menu,qty));
    assert.deepEqual(c,before,"preview must not mutate inputs");
    assert.equal((p.assortment.stockBalances as {current:number}[])[index].current,expected);
    assert.equal(p.event.batch.totalTheoreticalCost,menu==="ticket"?0:null);
    assert.equal(p.event.batch.status,"POSTED");
    assert.equal(p.revenues[0].revenue,p.event.revenue);
    assert.equal(p.event.originalMovements.length,menu==="ticket"?0:1);
  }
});
test("identical retry is unchanged after price/recipe changes; conflicting payload rejects",async()=>{
  const c=salesEventFixture(),cmd=saleCommand(),p=await planSalesEvent(c,cmd),saved=persist(c,p);
  (saved.assortment.menuItems as {salePrice:number}[])[2].salePrice=99;
  (saved.assortment.recipes as {ingredients:unknown[]}[])[0].ingredients=[];
  const retried=await planSalesEvent(saved,cmd);
  assert.equal(retried.duplicate,true); assert.deepEqual(retried.event,JSON.parse(JSON.stringify(p.event))); assert.deepEqual(retried.movements,JSON.parse(JSON.stringify(p.movements)));
  await assert.rejects(()=>planSalesEvent(saved,{...cmd,lines:[{...cmd.lines[0],quantity:11}]}),/IDEMPOTENCY_CONFLICT/);
  const reversed=planReverseSalesEvent(saved,p.event.id),r=planReverseSalesEvent({...saved,...reversed},p.event.id);
  assert.equal(reversed.revenues[0].revenue,0);assert.equal(r.duplicate,true);assert.deepEqual(r.movements,reversed.movements);
  assert.equal((reversed.assortment.stockBalances as {current:number}[])[2].current,1);
  assert.deepEqual(reversed.event.batch,JSON.parse(JSON.stringify(p.event.batch)),"original persisted recipe and cost snapshot stay immutable");
});
test("retained event permits full reversal after ledger retention; no duplicate replay afterward",async()=>{
  const c=salesEventFixture(),p=await planSalesEvent(c,saleCommand()),saved=persist(c,p);saved.movements=[];
  const r=planReverseSalesEvent(saved,p.event.id);
  assert.equal((r.assortment.stockBalances as {current:number}[])[2].current,1);
  assert.equal(r.movements.filter(m=>m.type==="sale_reversal").length,1);
  assert.equal((await planSalesEvent({...saved,...r},saleCommand())).duplicate,true);
});
test("receipt snapshot and sale price remain captured after a later receipt and menu edit",async()=>{
  const c=salesEventFixture();c.movements=[{id:"receipt",type:"receipt",venueId:1,productKey:"coffee-stock",productName:"Beans",amount:1,unit:"kg",costAmount:100,costStatus:"KNOWN",currency:"MDL",date:"2026-09-01",sourceDocumentId:"purchase",sourceLineId:"purchase-line",createdAt:"2026-09-01T10:00:00Z"}];
  const p=await planSalesEvent(c,saleCommand());assert.equal(p.event.batch.totalTheoreticalCost,8);assert.equal(p.event.revenue,150);
  const saved=persist(c,p);saved.movements.unshift({...c.movements[0],id:"new",date:"2026-09-09",costAmount:200,createdAt:c.now});
  (saved.assortment.menuItems as {salePrice:number}[])[2].salePrice=30;
  const newer=await planSalesEvent(saved,{...saleCommand(),id:"new-sale"});assert.equal(newer.event.batch.totalTheoreticalCost,16);assert.equal(newer.event.revenue,300);
  assert.deepEqual(newer.events[0],JSON.parse(JSON.stringify(p.event)));
  const free=salesEventFixture();free.movements=[{...c.movements[0],costAmount:0,costStatus:"KNOWN_ZERO"}];assert.equal((await planSalesEvent(free,saleCommand())).event.batch.totalTheoreticalCost,0);
});
test("blocked mixed lines, missing price, backdated command and legacy daily revenue cannot partially post",async()=>{
  const c=salesEventFixture(),before=structuredClone(c),cmd=saleCommand();
  await assert.rejects(()=>planSalesEvent(c,{...cmd,lines:[...cmd.lines,{id:"bad",menuItemId:"missing",quantity:1}]}),/MENU_NEEDS_REVIEW/);
  await assert.rejects(()=>planSalesEvent(c,{...cmd,occurredAt:"2026-01-01"}),/LIVE_COMMAND_REQUIRED/);
  assert.deepEqual(c,before);
  c.revenues=[{id:"legacy",date:c.now.slice(0,10),revenue:123}];await assert.rejects(()=>planSalesEvent(c,cmd),/LEGACY_REVENUE_CONFLICT/);
  c.revenues=[];(c.assortment.menuItems as {salePrice?:number}[])[2].salePrice=undefined;await assert.rejects(()=>planSalesEvent(c,cmd),/PRICE_NEEDS_REVIEW/);
});
test("shift lifecycle, permissions-independent venue boundaries and projection guards",async()=>{
  const c=salesEventFixture();c.revenues=planSalesShift(c,"open_shift","shift","Day");
  const cmd={...saleCommand(),shiftId:"shift"};const p=await planSalesEvent(c,cmd),saved=persist(c,p);
  assert.equal(p.revenues[0].revenue,150);
  assert.equal(eventRevenueMutation(p.revenues,structuredClone(p.revenues)),false);
  assert.equal(eventRevenueMutation(p.revenues,[]),true);
  assert.equal(eventRevenueMutation(p.revenues,[...p.revenues,{id:"legacy",date:c.now.slice(0,10),revenue:150}]),true);
  saved.revenues=planSalesShift(saved,"close_shift","shift");
  await assert.rejects(()=>planSalesEvent(saved,{...cmd,id:"after-close"}),/SHIFT_CLOSED/);
  assert.throws(()=>planReverseSalesEvent(saved,p.event.id),/SHIFT_CLOSED/);
  await assert.rejects(()=>planSalesEvent({...c,venueId:2},cmd),/SHIFT_NOT_FOUND/);
  assert.throws(()=>planReverseSalesEvent({...saved,venueId:2},p.event.id),/NOT_FOUND/);
  const legacy=reconcileSalesRevenue({revenues:p.revenues,salesDocuments:[],now:c.now,document:{id:"report",venueId:1,date:c.now.slice(0,10),sourceSystem:"POS",currency:"MDL",totalRevenue:150,items:[],warnings:[],confidence:1,status:"confirmed"}});
  assert.equal(legacy.ok,false);
});

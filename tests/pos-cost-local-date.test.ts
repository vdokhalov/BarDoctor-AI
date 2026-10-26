import test from 'node:test';
import assert from 'node:assert/strict';
import {salesEventFixture} from './helpers/sales-event-fixture';
import {planSalesEvent,planSalesShift, type SalesEventContext} from '../lib/bardoctor/sales-events';

function context(now:string, timezone:string|undefined, receiptDate:string, unit='kg', quantity=.1) {
 const c:SalesEventContext=salesEventFixture();c.now=now;c.timezone=timezone;
 c.assortment.recipes=[{id:'recipe',menuItemId:'coffee',ownerId:'coffee',venueId:1,version:1,current:true,status:'confirmed',reviewStatus:'approved',ingredients:[{id:'beans',nomenclatureItemId:'nom-coffee',purchaseProductKey:'coffee-stock',name:'Ingredient',quantity,unit,venueId:1}]}];
 c.movements=[{id:'receipt',type:'receipt',venueId:1,productKey:'coffee-stock',productName:'Ingredient',amount:1,unit:'kg',costAmount:50,costStatus:'KNOWN',currency:'MDL',date:receiptDate,sourceDocumentId:'purchase',sourceLineId:'line',createdAt:'2026-10-25T21:00:00Z',status:'active'}];
 c.revenues=planSalesShift(c,'open_shift','shift','Test');return c;
}
const command={id:'sale',source:'POS_API' as const,shiftId:'shift',payments:[{id:'pay',method:'CASH' as const,amount:30}],lines:[{id:'sold',menuItemId:'coffee',quantity:2}]};
for(const [now,tz,date] of [
 ['2026-10-25T22:17:45.181Z','Europe/Chisinau','2026-10-26'],
 ['2026-10-24T21:00:00Z','Europe/Chisinau','2026-10-25'],
 ['2026-10-25T00:30:00Z','Europe/Chisinau','2026-10-25'],
 ['2026-10-25T01:30:00Z','Europe/Chisinau','2026-10-25'],
 ['2026-10-26T10:00:00Z','Europe/Chisinau','2026-10-26'],
 ['2026-10-26T00:30:00Z','America/New_York','2026-10-25'],
 ['2026-10-25T22:17:45Z',undefined,'2026-10-25'],
 ['2026-10-25T22:17:45Z','invalid/timezone','2026-10-25'],
] as const)test(`new POS cost uses venue date: ${now} / ${tz}`,async()=>{
 const c=context(now,tz,date);const result=await planSalesEvent(c,command);
 assert.equal(result.event.batch.totalTheoreticalCost,10);
 assert.equal(result.event.batch.lines[0].recipeSnapshot?.capturedAt,now,'keep UTC evidence timestamp');
 assert.equal(result.event.businessDate,date);
 const balance=(result.assortment.stockBalances as Record<string,unknown>[]).find(x=>x.productKey==='coffee-stock')!;
 assert.equal(balance.current,.8);assert.equal(balance.inventoryValue,40);assert.equal(balance.costNeedsReview,undefined);
 const repeat=await planSalesEvent({...c,assortment:result.assortment,events:result.events,revenues:result.revenues,movements:result.movements},command);
 assert.equal(repeat.duplicate,true);assert.equal(repeat.movements.length,result.movements.length);
});
test('equivalent kg/g and an overnight business date use acceptance local date for cost',async()=>{
 for(const [unit,quantity] of [['kg',.1],['g',100],['кг',.1],['г',100]] as const){
  const c=context('2026-10-25T22:17:45Z','Europe/Chisinau','2026-10-26',unit,quantity);
  c.revenues[0].date='2026-10-25';
  const r=await planSalesEvent(c,command);assert.equal(r.event.businessDate,'2026-10-25');assert.equal(r.event.batch.totalTheoreticalCost,10);
 }
});
test('receipt dates before/after venue today, unknown latest receipt and foreign venue stay distinct',async()=>{
 for(const scenario of ['previous','future','unknown','foreign'] as const){
  const c=context('2026-10-25T22:17:45Z','Europe/Chisinau',scenario==='previous'?'2026-10-25':scenario==='future'?'2026-10-27':'2026-10-26');
  if(scenario==='unknown'){c.movements[0].costStatus='UNKNOWN';delete c.movements[0].costAmount;}
  if(scenario==='foreign')c.movements[0].venueId=2;
  const result=await planSalesEvent(c,command);assert.equal(result.event.batch.totalTheoreticalCost,scenario==='previous'?10:null,scenario);
 }
});
test('past posted KNOWN and UNKNOWN captures are not repriced by replay',async()=>{
 for(const known of [true,false]){
  const c=context('2026-10-25T22:17:45Z','Europe/Chisinau','2026-10-26');
  if(!known){c.movements[0].costStatus='UNKNOWN';delete c.movements[0].costAmount;}
  const result=await planSalesEvent(c,command),before=JSON.stringify(result.event);
  const updated=structuredClone(result.movements);updated[0].costStatus='KNOWN';updated[0].costAmount=500;
  const replay=await planSalesEvent({...c,now:'2026-10-26T15:00:00Z',events:result.events,revenues:result.revenues,movements:updated,assortment:result.assortment},command);
  assert.equal(JSON.stringify(replay.event),before);assert.equal(replay.movements.length,updated.length);
 }
});

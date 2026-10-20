import test from 'node:test';
import {buildBusinessIntelligence} from '../lib/bardoctor/business-intelligence';
import assert from 'node:assert/strict';
import {lifecycleRuntime} from './helpers/lifecycle-runtime';
import {openingRuntime} from './helpers/opening-runtime';
import {seedOpenWorkday} from './helpers/pos-workday-fixture';
import {salesEventFixture,saleCommand} from './helpers/sales-event-fixture';
import * as purchases from '../lib/bardoctor/purchases';
import * as conversion from '../lib/bardoctor/purchase-conversion';
import * as scope from '../lib/bardoctor/purchase-venue-scope';
import * as matching from '../lib/bardoctor/invoice-recognition-v2';
import * as posStorage from '../lib/bardoctor/pos-order-storage';
import * as sales from '../lib/bardoctor/sales-events';
import {currentFinance} from '../lib/bardoctor/current-finance';
import {historicalPeriodCost} from '../lib/bardoctor/financial-reconciliation';
import {buildVenueAIContextFromSources} from '../lib/bardoctor/venue-ai-context';
test('confirmed purchase and POS capture reconcile despite unused absent channels; unknown inputs and retries stay honest',async()=>{
const r=openingRuntime();
try{
 const purchase=r.loadRoute(new URL('../app/api/purchases/confirm/route.ts',import.meta.url),{...purchases,...conversion,...scope,...matching,INVENTORY_SNAPSHOT_STORE_KEY:'bd_inventory_snapshots'});
 const sale=r.loadRoute(new URL('../app/api/sales-events/route.ts',import.meta.url),{...sales,...posStorage});
 const send=async(api:any,body:object)=>{const res=await api.POST(new Request('http://localhost/api/test',{method:'POST',headers:{'Content-Type':'application/json','X-Venue-Id':'1'},body:JSON.stringify({venueId:1,...body})}));const data=await res.json();assert.ok(res.ok,JSON.stringify(data));return data as any};
 r.put('bd_assortment_v1',salesEventFixture().assortment);r.put('bd_suppliers',[{id:'supplier',name:'Synthetic',venueId:1,status:'active'}]);
 await send(purchase,{document:{id:'purchase',venueId:1,documentType:'invoice',supplierId:'supplier',supplierName:'Synthetic',date:'2026-09-08',currency:'MDL',paymentMethod:'unknown',source:'manual',total:100,items:[{id:'beans-line',name:'Beans',rawName:'Beans',nomenclatureId:'nom-coffee',purchaseProductKey:'coffee-stock',quantity:1,unit:'kg',quantityMode:'measure',unitPrice:100,lineTotal:100,category:'products',mappingSource:'manual'}]}});
 seedOpenWorkday(r.sqlite,7,1);await send(sale,{action:'open_shift',shiftId:'fixture',name:'Synthetic'});
 const command={...saleCommand('coffee',10),source:'POS_API',shiftId:'fixture',payments:[{id:'payment',method:'CASH',amount:150}]};
 const quote=await send(sale,{action:'preview',command});const posted=await send(sale,{action:'post',command,previewHash:quote.previewHash});
 assert.equal(posted.event.batch.totalTheoreticalCost,8);assert.equal(posted.event.batch.costStatus,'FULL');
 const date=posted.event.businessDate,now=posted.event.acceptedAt,profile={venueId:1,currency:'MDL',timezone:'Europe/Chisinau'};
 const stores:any={bd_finance_revenue:r.get('bd_finance_revenue'),bd_sales_events_v1:r.get('bd_sales_events_v1'),bd_stock_movements:r.get('bd_stock_movements'),bd_finance_expenses:[],bd_payroll_entries:[],bd_operational_reports_v1:[{id:'report',venueId:1,date,closingStatus:'closed',payrollBreakdown:{total:0}}]};
 const input:any={profile,venueId:1,currency:'MDL',asOf:now,startDate:date.slice(0,7)+'-01',endDate:date,revenues:stores.bd_finance_revenue,events:stores.bd_sales_events_v1,movements:stores.bd_stock_movements,reports:stores.bd_operational_reports_v1,expenses:[],payrollEntries:[],documents:[],batches:[],costInputsAvailable:true};
 const good=currentFinance(input);assert.equal(good.costOfGoods,8);assert.equal(good.resultAfterCost,142);
 const health=(data:any)=>{const s=new Map(Object.entries(data).map(([key,data])=>[key,{data,updatedAt:now}]));return (buildVenueAIContextFromSources('diagnosis',{accountProfile:profile,stores:s,now:new Date(now)}).promptData.performanceHistory.period as any).inputContract};
 const absent=health(stores),present=health({...stores,bd_sales_documents:[],bd_sales_batches:[]});assert.equal(absent.costOfGoods,8);assert.equal(absent.resultAfterCost,142);assert.deepEqual(absent.costReasons,[]);assert.equal(present.costOfGoods,8);assert.equal(present.resultAfterCost,142);
 const movement={id:'unvalued-adjustment',venueId:1,businessDate:date,date,type:'inventory_adjustment',costStatus:'UNKNOWN',valuationStatus:'unvalued',currency:'MDL'};
 const unknownInput={...input,movements:[...input.movements,movement]};const history=historicalPeriodCost({...unknownInput,monthKey:date.slice(0,7),accountingCurrency:'MDL'});const adjustment=currentFinance(unknownInput);assert.equal(history.cost,8);assert.deepEqual(history.reasons,['INVENTORY_ADJUSTMENT_COST_UNKNOWN']);assert.equal(adjustment.costOfGoods,8);assert.equal(adjustment.inventoryAdjustmentNet,null);assert.equal(adjustment.resultAfterCost,null);
 const score=(value:any)=>buildBusinessIntelligence({venueId:'1',now:new Date(now),currentFinancialPeriod:{...value,monthKey:date.slice(0,7)}} as any).businessHealth.components.find(c=>c.id==='finance')!.score;
 assert.equal(score(good),90);assert.equal(score(absent),90);assert.equal(score(adjustment),null);
 const savedBefore=JSON.stringify(r.get('bd_sales_events_v1'));await send(sale,{action:'post',command,previewHash:quote.previewHash});assert.equal(JSON.stringify(r.get('bd_sales_events_v1')),savedBefore);assert.equal(currentFinance({...input,events:r.get('bd_sales_events_v1'),revenues:r.get('bd_finance_revenue'),movements:r.get('bd_stock_movements')}).costOfGoods,8);
 const missingPrice=structuredClone(input);missingPrice.events[0].batch.lines[0].recipeSnapshot.ingredients[0].unitCost=null;assert.equal(currentFinance(missingPrice).costOfGoods,null);assert.equal(score(currentFinance(missingPrice)),null);
 const legacy={...input,revenues:input.revenues.map((row:any)=>({...row,revenueSource:'manual'}))};assert.equal(currentFinance(legacy).costOfGoods,null);assert.ok(currentFinance(legacy).costReasons.includes('HISTORICAL_SALES_COST_MISSING'));
 const unavailable=currentFinance({...input,costSourceStates:{bd_sales_events_v1:'AVAILABLE',bd_stock_movements:'AVAILABLE',bd_sales_documents:'UNAVAILABLE',bd_sales_batches:'ABSENT'}});assert.equal(unavailable.costOfGoods,null);assert.equal(score(unavailable),null);
 const missingUsed=currentFinance({...input,costSourceStates:{bd_sales_events_v1:'ABSENT',bd_stock_movements:'AVAILABLE',bd_sales_documents:'ABSENT',bd_sales_batches:'ABSENT'}});assert.equal(missingUsed.costOfGoods,null);
 const partialStores=new Map(Object.entries(stores).map(([key,data])=>[key,{data,updatedAt:now}]));partialStores.set('bd_sales_documents',{data:null,sourceState:'PARTIAL',updatedAt:now} as any);const partial=(buildVenueAIContextFromSources('diagnosis',{accountProfile:profile,stores:partialStores,now:new Date(now)}).promptData.performanceHistory.period as any).inputContract;assert.equal(partial.costOfGoods,null);
 const live=await lifecycleRuntime({month:'./app/api/month-close/route'},{now});
 try{
  const user=await live.register('cost-chain@isolated.test');assert.equal(user.activeVenueId,1);
  live.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),user.userId);
  for(const[key,value]of Object.entries(stores))live.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(user.userId,key,JSON.stringify(value));
  const snapshot=()=>JSON.stringify(live.sqlite.prepare('SELECT * FROM domain_data ORDER BY account_id,store_key').all());const before=snapshot();
  const response=await live.api.month.GET(live.request(user,'/api/month-close?monthKey=current&view=current'));assert.equal(response.status,200);const body=await response.json() as any;assert.equal(body.report.costOfGoods,8);assert.equal(body.report.resultAfterCost,142);assert.equal(snapshot(),before);
 }finally{live.close()}
 const result={syntheticOnly:true,purchaseConfirmed:true,recipe:'8g beans per coffee; 10 coffees; confirmed receipt100MDL/kg',persistedPos:{revenue:150,capturedCost:8,costStatus:'FULL'},baseline:{cogs:good.costOfGoods,afterCost:good.resultAfterCost},unusedStoresAbsent:{cogs:absent.costOfGoods,afterCost:absent.resultAfterCost,costReasons:absent.costReasons},sameSaleWithEmptyUnusedStores:{cogs:present.costOfGoods,afterCost:present.resultAfterCost},unknownAdjustment:{capturedSalesCost:history.cost,displayedCogs:adjustment.costOfGoods,afterCost:adjustment.resultAfterCost,reasons:history.reasons}};
 console.log(JSON.stringify(result,null,2));
}finally{r.close()}
});

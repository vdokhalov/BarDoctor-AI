import test from 'node:test';
import assert from 'node:assert/strict';
import {allocatePosDiscount} from '../lib/bardoctor/pos-discounts';
import {openingRuntime} from './helpers/opening-runtime';
import * as purchases from '../lib/bardoctor/purchases';
import * as conversion from '../lib/bardoctor/purchase-conversion';
import * as scope from '../lib/bardoctor/purchase-venue-scope';
import * as matching from '../lib/bardoctor/invoice-recognition-v2';
import {planSalesEvent,planSalesShift,type SalesEventContext} from '../lib/bardoctor/sales-events';
import {buildAssortmentAnalytics} from '../lib/bardoctor/assortment-analytics';
async function fixture(unit='kg',quantity=.1,unknown=false){const r=openingRuntime();try{
const assortment={nomenclature:[{id:'lemon',productKey:'lemon-key',name:'Лимон — тест',unit:'kg',displayUnit:'kg',unitModelVersion:4,venueId:1,active:true},{id:'water',productKey:'water-key',name:'Вода',unit:'pcs',venueId:1,active:true}],stockBalances:[],menuItems:[{id:'lemonade',name:'Лимонад',venueId:1,type:'composite',consumptionMode:'RECIPE',salePrice:50,currency:'MDL',active:true}],recipes:[{id:'recipe',menuItemId:'lemonade',ownerId:'lemonade',venueId:1,current:true,version:1,status:'confirmed',reviewStatus:'approved',ingredients:[{id:'lemon-line',nomenclatureItemId:'lemon',purchaseProductKey:'lemon-key',name:'Лимон — тест',quantity,unit,venueId:1},{id:'water-line',nomenclatureItemId:'water',purchaseProductKey:'water-key',name:'Вода',quantity:1,unit:'pcs',venueId:1}]}]};
r.put('bd_assortment_v1',assortment);r.put('bd_suppliers',[{id:'supplier',name:'Synthetic',venueId:1,status:'active'}]);
const api=r.loadRoute(new URL('../app/api/purchases/confirm/route.ts',import.meta.url),{...purchases,...conversion,...scope,...matching,INVENTORY_SNAPSHOT_STORE_KEY:'bd_inventory_snapshots'});
const res=await api.POST(new Request('http://localhost/api/purchases/confirm',{method:'POST',headers:{'Content-Type':'application/json','X-Venue-Id':'1'},body:JSON.stringify({venueId:1,document:{id:'receipt',venueId:1,documentType:'invoice',supplierId:'supplier',supplierName:'Synthetic',date:'2026-10-25',currency:'MDL',paymentMethod:'unknown',source:'manual',total:170,items:[{id:'a',name:'Лимон — тест',rawName:'Лимон — тест',nomenclatureId:'lemon',purchaseProductKey:'lemon-key',quantity:1,unit:'kg',quantityMode:'measure',unitPrice:50,lineTotal:50,category:'products',mappingSource:'manual'},{id:'b',name:'Вода',rawName:'Вода',nomenclatureId:'water',purchaseProductKey:'water-key',quantity:10,unit:'pcs',quantityMode:'measure',unitPrice:12,lineTotal:120,category:'products',mappingSource:'manual'}]}})}));assert.equal(res.status,201,await res.text());
const a=r.get('bd_assortment_v1') as Record<string,unknown>,m=r.get('bd_stock_movements') as SalesEventContext['movements'];
if(unknown){const lemon=m.find(x=>x.productKey==='lemon-key')!;lemon.costStatus='UNKNOWN';delete lemon.costAmount;}
const context:SalesEventContext={venueId:1,currency:'MDL',now:'2026-10-26T12:00:00Z',actor:{accountId:7,name:'QA',role:'owner'},assortment:a,movements:m,events:[],revenues:[],mappings:[],warehouseRoutes:[],warehouses:[],closedMonths:new Set()};
context.revenues=planSalesShift(context,'open_shift','shift','QA');
const command={id:'sale',source:'POS_API' as const,shiftId:'shift',payments:[{id:'pay',method:'CASH' as const,amount:90}],lines:[{id:'sold',menuItemId:'lemonade',quantity:2}]};
const discount={...allocatePosDiscount([{lineId:'sold',grossAmount:100}],'PERCENT',10,'MDL'),ruleId:'discount',ruleRevision:1,venueId:1,name:'10%',kind:'PERCENT' as const,value:10,appliedAt:context.now,appliedBy:context.actor!,reason:'Test discount'};
const sale=await planSalesEvent(context,command,{discount});
const input={assortment:sale.assortment,purchaseDocuments:r.get('bd_purchase_documents') as unknown[],stockMovements:sale.movements,salesEvents:sale.events,venueId:1,period:'2026-10',now:new Date(context.now)};
const snapshot=JSON.stringify(input);const out=buildAssortmentAnalytics(input);
assert.equal(JSON.stringify(input),snapshot,'analytics must not mutate source documents or movements');
assert.deepEqual(buildAssortmentAnalytics({...JSON.parse(snapshot),now:input.now}).menuItems,out.menuItems,'reload gives same result');
const retry=await planSalesEvent({...context,events:sale.events,movements:sale.movements,revenues:sale.revenues,assortment:sale.assortment},command,{discount});
assert.equal(retry.duplicate,true);assert.equal(retry.movements.length,sale.movements.length);
return {input,out,sale};
}finally{r.close()}}
for(const [unit,quantity] of [['kg',.1],['g',100],['кг',.1],['г',100]] as const)test(`purchase kg50 → recipe ${quantity}${unit} → discounted POS2 → analytics`,async()=>{
 const {out,sale}=await fixture(unit,quantity);assert.equal(out.menuItems[0].recipeCost,17);assert.equal(sale.event.batch.totalTheoreticalCost,34);
 assert.deepEqual(out.menuItems[0].sales,{quantity:2,revenue:90,revenueComplete:true,documentCount:1,costOfGoods:34,grossProfit:56});
 const balances=(sale.assortment.stockBalances as Record<string,unknown>[]);assert.equal(balances.find(x=>x.productKey==='lemon-key')?.current,.8);assert.equal(balances.find(x=>x.productKey==='lemon-key')?.inventoryValue,40);assert.equal(balances.find(x=>x.productKey==='water-key')?.current,8);
});
test('unknown cost does not hide accepted POS quantity/revenue or fabricate cost',async()=>{
 const {out}=await fixture('kg',.1,true);assert.equal(out.menuItems[0].recipeCost,null);assert.equal(out.menuItems[0].sales?.quantity,2);assert.equal(out.menuItems[0].sales?.revenue,90);assert.equal(out.menuItems[0].sales?.costOfGoods,null);assert.equal(out.menuItems[0].sales?.grossProfit,null);
});
test('manual totals without item lines, other period and foreign venue do not create item sales',async()=>{
 const {input}=await fixture();
 for(const change of [{salesEvents:[],financeRevenue:[{id:'manual',venueId:1,date:'2026-10-26',revenue:30,receipts:1,revenueSource:'MANUAL_SUMMARY'}]}, {period:'2026-09'}, {salesEvents:input.salesEvents.map(e=>({...e,venueId:2}))}]){
  const out=buildAssortmentAnalytics({...input,...change});assert.equal(out.menuItems[0].sales,null);
 }
});
test('a newly known receipt recalculates current recipe without rewriting unknown captured sale or stock movements',async()=>{
 const {input}=await fixture('kg',.1,true);
 const receipt=input.stockMovements.find(x=>x.type==='receipt'&&x.productKey==='lemon-key')!;
 receipt.costStatus='KNOWN';receipt.costAmount=50;
 const before=JSON.stringify(input);
 const out=buildAssortmentAnalytics(input);
 assert.equal(out.menuItems[0].recipeCost,17);
 assert.equal(out.menuItems[0].sales?.quantity,2);assert.equal(out.menuItems[0].sales?.revenue,90);
 assert.equal(out.menuItems[0].sales?.costOfGoods,null,'captured UNKNOWN cannot silently become current-price historical cost');
 assert.equal(JSON.stringify(input),before);
});

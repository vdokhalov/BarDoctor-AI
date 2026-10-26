import test from 'node:test';
import assert from 'node:assert/strict';
import {allocatePosDiscount} from '../../lib/bardoctor/pos-discounts';
import {openingRuntime} from './opening-runtime';
import * as purchases from '../../lib/bardoctor/purchases';
import * as conversion from '../../lib/bardoctor/purchase-conversion';
import * as scope from '../../lib/bardoctor/purchase-venue-scope';
import * as matching from '../../lib/bardoctor/invoice-recognition-v2';
import {planSalesEvent,planSalesShift,type SalesEventContext} from '../../lib/bardoctor/sales-events';
import {buildAssortmentAnalytics} from '../../lib/bardoctor/assortment-analytics';
export async function enrichmentFixture(unit='kg',quantity=.1,unknown=false){const r=openingRuntime();try{
const assortment={nomenclature:[{id:'lemon',productKey:'lemon-key',name:'Лимон — тест',unit:'kg',displayUnit:'kg',unitModelVersion:4,venueId:1,active:true},{id:'water',productKey:'water-key',name:'Вода',unit:'pcs',venueId:1,active:true}],stockBalances:[],menuItems:[{id:'lemonade',name:'Лимонад',venueId:1,type:'composite',consumptionMode:'RECIPE',salePrice:50,currency:'MDL',active:true}],recipes:[{id:'recipe',menuItemId:'lemonade',ownerId:'lemonade',venueId:1,current:true,version:1,status:'confirmed',reviewStatus:'approved',ingredients:[{id:'lemon-line',nomenclatureItemId:'lemon',purchaseProductKey:'lemon-key',name:'Лимон — тест',quantity,unit,venueId:1},{id:'water-line',nomenclatureItemId:'water',purchaseProductKey:'water-key',name:'Вода',quantity:1,unit:'pcs',venueId:1}]}]};
r.put('bd_assortment_v1',assortment);r.put('bd_suppliers',[{id:'supplier',name:'Synthetic',venueId:1,status:'active'}]);
const api=r.loadRoute(new URL('../../app/api/purchases/confirm/route.ts',import.meta.url),{...purchases,...conversion,...scope,...matching,INVENTORY_SNAPSHOT_STORE_KEY:'bd_inventory_snapshots'});
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
return {input,out,sale,documents:r.get("bd_purchase_documents") as any[]};
}finally{r.close()}}

const enrichmentScope={venueId:1,workspaceId:1,dataAccountId:7};
export async function unknownCostFixture(unit='kg',q=.1){
 const fixture=await enrichmentFixture(unit,q),event:any=fixture.sale.event,docs:any[]=fixture.documents,movements:any[]=fixture.sale.movements;
 event.timezone='Europe/Chisinau';event.acceptedAt='2026-10-25T22:17:45.181Z';event.businessDate='2026-10-26';event.batch.businessDate=event.businessDate;
 for(const d of docs){d.date='2026-10-26';d.createdAt=d.confirmedAt=d.updatedAt='2026-10-25T22:07:03.774Z';}
 for(const m of movements.filter(m=>m.type==='receipt')){m.date='2026-10-26';if(m.businessDate)m.businessDate=m.date;m.createdAt='2026-10-25T22:07:03.774Z';}
 event.batch.costStatus='UNVALUED';event.batch.totalTheoreticalCost=null;
 for(const l of event.batch.lines){l.theoreticalCost=null;l.recipeSnapshot.capturedAt=event.acceptedAt;const lemon=l.recipeSnapshot.ingredients.find((i:any)=>i.productKey==='lemon-key');lemon.unitCost=null;lemon.totalCost=null;lemon.costStatus='UNKNOWN';}
 for(const m of [...movements,...(event.originalMovements??[])].filter((m:any)=>m.type==='sale_consumption'&&m.productKey==='lemon-key')){m.costAmount=null;m.costStatus='UNKNOWN';}
 const input={event,documents:docs,movements,scope:enrichmentScope,now:'2026-10-26T14:00:00Z'};
 return {...fixture,input};
}

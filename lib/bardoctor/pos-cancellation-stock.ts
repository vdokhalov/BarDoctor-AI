import { createOrUpdateSalesBatch, type RecipeSnapshot } from './sales-consumption';
import { resolveCostBasis, COST_BASIS_METHOD } from './cost-basis';
import { retainStockMovements } from './stock-retention';
import { nextWriteOffNumber, syncWriteOffExpense, type WriteOffDocument, type WriteOffItem } from './write-offs';
import type { StockMovement } from './inventory';
import type { PosOrderContext, PosOrder } from './pos-orders';
import type { PreparationTicket } from './pos-preparation';
function fail(code:string):never {throw Error('POS_ORDER_STOCK_'+code)}
const round=(n:number)=>Math.round(n*1e6)/1e6;
const known=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
/** Read-only resolver: incomplete recipes remain explicitly unavailable, never guessed later. */
export function preparationConsumption(c:PosOrderContext,order:PosOrder){
 const result=createOrUpdateSalesBatch({batches:[],batchId:`prep:${order.id}`,draft:{source:'POS_API',warnings:[],businessDate:String(c.revenues.find(r=>r.id===order.shiftId)?.date),shiftId:order.shiftId,lines:order.lines.map(l=>({id:l.id,menuItemId:l.menuItemId,rawName:l.name,quantity:l.quantity}))},assortment:c.assortment,mappings:c.mappings,warehouseRoutes:c.warehouseRoutes,warehouses:c.warehouses,stockMovements:c.movements,venueId:c.venueId,actor:c.actor,now:c.now,costAsOf:c.now});
 return new Map(order.lines.map(line=>{const ready=result.ok?result.batch.lines.find(l=>l.id===line.id):undefined;return [line.id,ready?.processingStatus==='READY'&&ready.recipeSnapshot?{consumptionSnapshot:JSON.parse(JSON.stringify(ready.recipeSnapshot))}:{consumptionUnavailable:'Нет подтверждённого состава, единиц или складского источника на момент подтверждения.'}]}));
}
export type CancellationStockPlan={document:WriteOffDocument;documents:unknown[];assortment:Record<string,unknown>;movements:StockMovement[];expenses:unknown[]};
export async function planCancellationStock(c:PosOrderContext,order:PosOrder,ticket:PreparationTicket,operationId:string):Promise<CancellationStockPlan>{
 if(!c.canWriteOff)fail('ACCESS_DENIED');
 const line=ticket.lines[0],snapshot=line.consumptionSnapshot;
 if(!snapshot)fail('SNAPSHOT_REQUIRED');
 if(!snapshot.ingredients.length)fail('NO_CONSUMPTION');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([c.venueId,order.id,operationId])))),v=>v.toString(16).padStart(2,'0')).join('');
 const id=`pos-cancel:${hash}`;
 const documents=c.writeOffDocuments??[];
 if(documents.some(d=>(d as {id?:string}).id===id))fail('LINK_CONFLICT');
 const assortment=structuredClone(c.assortment),balances=assortment.stockBalances as Record<string,unknown>[];
 if(!Array.isArray(balances))fail('SOURCE_REQUIRED');
 const needs=new Map<string,{productKey:string;warehouseId:string;unit:RecipeSnapshot['ingredients'][number]['baseUnit'];quantity:number}>();
 for(const ingredient of snapshot.ingredients){
  if(!ingredient.productKey||!ingredient.warehouseId||!known(ingredient.baseQuantityPerPortion)||ingredient.baseQuantityPerPortion<=0||!['kg','l','g','ml','pcs'].includes(ingredient.baseUnit))fail('SNAPSHOT_REQUIRED');
  const key=JSON.stringify([ingredient.productKey,ingredient.warehouseId,ingredient.baseUnit]),quantity=round(ingredient.baseQuantityPerPortion*line.quantity),prior=needs.get(key);
  if(!known(quantity)||quantity<=0)fail('SNAPSHOT_REQUIRED');
  needs.set(key,{productKey:ingredient.productKey,warehouseId:ingredient.warehouseId,unit:ingredient.baseUnit,quantity:round(quantity+(prior?.quantity??0))});
 }
 const totalByProduct=new Map<string,number>();for(const n of needs.values())totalByProduct.set(n.productKey,round((totalByProduct.get(n.productKey)||0)+n.quantity));
 const matched=new Map<string,Record<string,unknown>>();
 for(const [key,amount] of totalByProduct){const matches=balances.filter(b=>(b.productKey??b.key)===key&&(b.venueId==null||b.venueId===c.venueId)&&b.active!==false&&b.archived!==true);if(matches.length!==1)fail('SOURCE_REQUIRED');const b=matches[0];if(!known(b.current))fail('SOURCE_REQUIRED');if(b.current+1e-6<amount)fail('INSUFFICIENT');matched.set(key,b);}
 for(const n of needs.values()){
  const b=matched.get(n.productKey)!;if(b.unit!==n.unit)fail('SOURCE_REQUIRED');
  const warehouses=b.warehouseBalances as Record<string,Record<string,unknown>>|undefined;
  if(n.warehouseId==='__venue__'){if(warehouses&&Object.keys(warehouses).length)fail('SOURCE_REQUIRED');}
  else{const w=warehouses?.[n.warehouseId],amount=w?.current??w?.quantity??w?.onHand;if(!w||!known(amount))fail('SOURCE_REQUIRED');if(amount+1e-6<n.quantity)fail('INSUFFICIENT');}
 }
 const date=String(c.revenues.find(r=>r.id===order.shiftId)?.date);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||c.closedMonths.has(date.slice(0,7)))fail('PERIOD_LOCKED');
 const items:WriteOffItem[]=[],movements:StockMovement[]=[];
 for(const n of needs.values()){
  const b=matched.get(n.productKey)!,before=b.current as number,after=round(before-n.quantity),lineId=`item-${items.length+1}`;
  const basis=resolveCostBasis({venueId:c.venueId,warehouseId:n.warehouseId==='__venue__'?undefined:n.warehouseId,nomenclatureItem:{productKey:n.productKey,unit:n.unit},asOf:c.now,receipts:c.movements,accountingCurrency:c.currency});
  const cost=basis.known?Math.round(n.quantity*basis.value!*100)/100:null;
  items.push({id:lineId,nomenclatureItemId:n.productKey,productKey:n.productKey,productName:String(b.name??n.productKey),quantity:n.quantity,unit:n.unit,baseQuantity:n.quantity,baseUnit:n.unit,unitCost:basis.value,totalCost:cost,currency:basis.currency,costStatus:basis.known?'valued':'unvalued',costBasisStatus:basis.status,costBasisMethod:COST_BASIS_METHOD,costSourceDocumentId:basis.sourceDocumentId,costSourceLineId:basis.sourceLineId,costEffectiveDate:basis.effectiveDate,stockBefore:before,stockAfter:after,warehouseId:n.warehouseId});
  b.current=after;b.costNeedsReview=true;b.updatedAt=c.now;
  if(n.warehouseId!=='__venue__'){const w=(b.warehouseBalances as Record<string,Record<string,unknown>>)[n.warehouseId];w.current=round(Number(w.current??w.quantity??w.onHand)-n.quantity);if('quantity'in w)w.quantity=w.current;if('onHand'in w)w.onHand=w.current;w.updatedAt=c.now;}
  movements.push({id:`${id}:${lineId}`,venueId:c.venueId,warehouseId:n.warehouseId,type:'writeoff',date,productKey:n.productKey,productName:String(b.name??n.productKey),amount:-n.quantity,unit:n.unit,costAmount:cost===null?undefined:-cost,costStatus:basis.status==='KNOWN_VALUE'?'KNOWN':basis.status,currency:basis.currency,sourceDocumentId:id,sourceLineId:lineId,createdAt:c.now,status:'active'});
 }
 const missing=items.filter(i=>i.totalCost===null).length;
 const document:WriteOffDocument={id,venueId:c.venueId,number:nextWriteOffNumber(documents,c.venueId),date,location:[...new Set([...needs.values()].map(n=>n.warehouseId))].join(', '),reasonCode:'other',reasonLabel:'Отмена подтверждённой позиции',comment:ticket.reason,status:'posted',items,itemCount:items.length,totalCost:missing?null:Math.round(items.reduce((s,i)=>s+i.totalCost!,0)*100)/100,costStatus:missing===items.length?'unvalued':missing?'partial':'full',unvaluedItemCount:missing,currency:c.currency,idempotencyKey:operationId,source:'pos_cancellation',shiftId:order.shiftId,posOrderId:order.id,preparationTicketId:ticket.originalTicketId,cancellationTicketId:ticket.id,movementIds:movements.map(m=>m.id),createdBy:{...c.actor},createdAt:c.now,updatedAt:c.now,postedAt:c.now};
 assortment.updatedAt=c.now;
 return{document,documents:[...documents,document],assortment,movements:retainStockMovements([...c.movements,...movements],assortment,c.movements),expenses:syncWriteOffExpense(c.writeOffExpenses??[],document)};
}

import {convertStockQuantity,normalizePurchaseQuantity} from './stock-units';
type Row=Record<string,any>;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const money=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
/** Read-only forecast against an authorized current-cost snapshot; never posts or revalues history. */
export function purchasePricePreview(draft:Row,analytics:Row){
 const prices:Row[]=[],nextByKey=new Map<string,Row>();
 for(const line of Array.isArray(draft.items)?draft.items:[]){
  if(!['products','alcohol','food','consumables','hookah','household'].includes(line.category||'products'))continue;
  const ref=line.purchaseProductKey||line.nomenclatureId;
  const candidates=(analytics.nomenclatureCosts||[]).filter((r:Row)=>ref&&(r.productKey===ref||r.nomenclatureItemId===ref));
  const previous=candidates.length===1?candidates[0]:null;
  const row:Row={id:line.id,name:line.name||'Позиция',productKey:previous?.productKey||ref,known:false,previous:null,next:null,currency:draft.currency,unit:null,reason:''};
  const conversion=normalizePurchaseQuantity({quantity:line.quantity,unit:line.unit,price:line.unitPrice,totalCost:line.lineTotal,stockUnit:previous?.unit||line.matchedBaseUnit||line.packageContent?.unit||line.unit,packageContent:line.packageContent});
  if(conversion.ok){row.next=conversion.snapshot.normalizedUnitCost;row.unit=conversion.snapshot.canonicalUnit;}
  if(!conversion.ok)row.reason='Проверьте количество, цену, единицу и фасовку.';
  else if(!previous?.complete||previous.costBasisMethod!=='latest_confirmed_receipt'||!finite(previous.unitPrice)||!previous.purchaseDocumentId)row.reason='Нет надёжной предыдущей закупочной цены.';
  else if(previous.purchaseDocumentId===draft.id)row.reason='Нужна предыдущая закупка, отличная от этого документа.';
  else if(!draft.currency||previous.currency!==draft.currency)row.reason='Валюты цен различаются или не подтверждены.';
  else {
   const factor=convertStockQuantity(1,row.unit,previous.unit);
   if(factor===null)row.reason='Единицы цен несопоставимы.';
   else {row.previous=previous.unitPrice*factor;row.previousDate=previous.purchaseDate||previous.priceDate;row.known=true;row.delta=row.next-row.previous;row.percent=row.previous===0?null:row.delta/row.previous*100;}
  }
  if(row.known&&String(draft.date).slice(0,10)<String(row.previousDate).slice(0,10)){row.known=false;row.reason='Документ раньше последней закупки: влияние на текущую себестоимость неизвестно.';}
  if(row.productKey){const existing=nextByKey.get(row.productKey);if(existing&&(existing.next!==row.next||existing.unit!==row.unit||!existing.known||!row.known)){existing.known=false;existing.reason='Несколько строк товара с разными или неполными ценами.';row.known=false;row.reason=existing.reason;}nextByKey.set(row.productKey,row);}
  prices.push(row);
 }
 const dishes:Row[]=[];
 for(const item of analytics.menuItems||[]){
  const ingredients=Array.isArray(item.ingredientRows)?item.ingredientRows:[];
  if(!ingredients.some((r:Row)=>nextByKey.has(r.productKey)))continue;
  const result:Row={id:item.id,name:item.name,known:false,previous:null,next:null,currency:item.costCurrency,reason:'Нет полной подтверждённой техкарты и стоимости всех ингредиентов.'};
  if(item.recipeCostStatus!=='UNKNOWN'&&finite(item.recipeCost)&&item.techCardStatus==='approved'&&ingredients.length&&ingredients.every((r:Row)=>r.complete&&finite(r.cost)&&finite(r.amount))){
   let total=0,valid=true;
   for(const ingredient of ingredients){
    const next=nextByKey.get(ingredient.productKey);
    if(!next){total+=ingredient.cost;continue;}
    const amount=convertStockQuantity(ingredient.amount,ingredient.unit,next.unit);
    if(!next.known||amount===null||next.currency!==item.costCurrency||ingredient.currency!==item.costCurrency){valid=false;result.reason=next.reason||'Единицы или валюта ингредиента не подтверждены.';break;}
    total+=money(amount*next.next);
   }
   if(valid){result.known=true;result.previous=item.recipeCost;result.next=money(total);result.delta=money(result.next-result.previous);result.reason='';}
  }
  dishes.push(result);
 }
 return {prices,dishes};
}

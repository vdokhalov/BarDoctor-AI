import {physicalUnit,convertStockQuantity} from './stock-units';
type Row=Record<string,unknown>;
const finite=(v:unknown)=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
/** Internal supplies use their explicitly entered stock/minimum/on-order values.
 * Purchase receipts are not open orders and must not be subtracted again. */
export function consumableNeeds(items:Row[]){
 const issues:string[]=[],rows: Array<{internalId:string;productKey:string;name:string;unit:'pcs'|'g'|'ml';currentStock:number;safety:number;onOrder:number;projectedNeed:number;shortage:number;packageAmount:number;packages:number|null;recommendedAmount:number;estimatedCost:null;currency:null;supplierName:null;priceDate:null;basis:string[];complete:boolean}>=[];
 let calculated=0;
 for(const item of items){if(item.active===false)continue;const name=String(item.name||'Расходник'),unit=physicalUnit(item.unit),minimum=finite(item.minimumStock),current=finite(item.currentStock),ordered=finite(item.onOrder??0),pack=finite(item.packageAmount??0);
  if(minimum===null||minimum===0){issues.push(`${name}: задайте минимальный остаток`);continue;}
  if(!unit||minimum<0||current===null||ordered===null||ordered<0||pack===null||pack<0){issues.push(`${name}: проверьте остаток, единицы и уже заказанное количество`);continue;}
  const base=unit==='kg'?'g':unit==='l'?'ml':unit;
  const stock=convertStockQuantity(current,unit,base),safety=convertStockQuantity(minimum,unit,base),onOrder=convertStockQuantity(ordered,unit,base),packageAmount=convertStockQuantity(pack,unit,base);
  if(stock===null||safety===null||onOrder===null||packageAmount===null)continue;
  calculated++;const shortage=Math.round(Math.max(0,safety-stock-onOrder)*1e6)/1e6;if(!shortage)continue;
  const packages=packageAmount>0?Math.ceil(shortage/packageAmount):null;
  rows.push({internalId:String(item.id||name),productKey:String(item.purchaseProductKey||''),name,unit:base as 'pcs'|'g'|'ml',currentStock:stock,safety,onOrder,projectedNeed:safety,shortage,packageAmount,packages,recommendedAmount:packages===null?shortage:Math.round(packages*packageAmount*1e6)/1e6,estimatedCost:null,currency:null,supplierName:null,priceDate:null,basis:['Минимальный остаток'],complete:true});
 }
 return{rows,issues,calculated};
}

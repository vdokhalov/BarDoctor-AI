import { resolveMenuConsumption } from './consumption-mode';
import { isPackagedProcurementItem } from './supplier-alternative-rules';
type Row=Record<string,unknown>;
const record=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
export function supplierProcurementTargets(value:unknown,venueId:number):string[]{
 const assortment=record(value),items=Array.isArray(assortment.menuItems)?assortment.menuItems:[];
 return [...new Set(items.map(record).filter(item=>item.active!==false&&item.archived!==true&&item.status!=='archived'&&(!item.venueId||Number(item.venueId)===venueId)).filter(item=>{
   const consumption=resolveMenuConsumption(item,assortment,{venueId});
   // Exact ready-product links do not depend on a brand dictionary or a purchase.
   return consumption.ok&&consumption.mode==='DIRECT_ITEM'||isPackagedProcurementItem(`${String(item.name||'')} ${String(item.category||'')}`);
 }).map(item=>typeof item.name==='string'?item.name.trim().slice(0,160):'').filter(Boolean))];
}

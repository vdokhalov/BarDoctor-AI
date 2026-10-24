type Row=Record<string,unknown>;
const record=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
export function supplierProcurementTargets(value:unknown,venueId:number):string[]{
 const assortment=record(value),items=Array.isArray(assortment.nomenclature)?assortment.nomenclature:[];
 // Procurement identity comes from stock nomenclature, never a menu title or brand dictionary.
 return [...new Set(items.map(record).filter(item=>item.active!==false&&item.archived!==true&&!item.deleted&&!item.isDeleted&&!['archived','deleted'].includes(text(item.status).toLowerCase())&&(!item.venueId||Number(item.venueId)===venueId))
 .filter(item=>![item.kind,item.inventoryType,item.productType,item.type].some(value=>['service','non_stock','non-stock'].includes(text(value).toLowerCase())))
 .map(item=>{const name=text(item.name)||text(item.productName)||text(item.canonicalName),pack=text(item.packageSize)||text(item.displayPackageSize)||text(item.purchasePackageSize);return name?(name+(pack&&!name.toLowerCase().includes(pack.toLowerCase())?' · '+pack:'')).slice(0,160):'';}).filter(Boolean))];
}

import { inventoryProductKey, restoreInventoryProduct } from './inventory';
type Row = Record<string, unknown>;
export const archiveRecord = (v:unknown):Row => v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.map(archiveRecord):[];
export const isArchivedPosition=(v:Row)=>v.active===false||v.archived===true||v.status==='archived';
const scoped=(v:Row,venue:number)=>v.venueId==null||v.venueId===''||Number(v.venueId)===0||Number(v.venueId)===venue;
export function archivePositions(value:unknown,kind:'menu'|'inventory',venue:number):Row[]{
 const root=archiveRecord(value);
 if(kind==='menu')return rows(root.menuItems).filter(v=>scoped(v,venue)&&v.id).map(v=>({...v,archiveKey:String(v.id)}));
 const map=new Map<string,Row>();
 for(const v of [...rows(root.stockBalances),...rows(root.nomenclature)].filter(v=>scoped(v,venue))){const key=String(v.productKey||v.key||v.id||inventoryProductKey(v));if(key)map.set(key,{...map.get(key),...v,archiveKey:key});}
 const archived=new Set(Array.isArray(root.archivedInventoryProductKeys)?root.archivedInventoryProductKeys:[]);
 return [...map.values()].map(v=>archived.has(v.archiveKey)?{...v,archived:true}:v);
}
export function restoreArchivedPosition(value:unknown,kind:'menu'|'inventory',key:string,venue:number,now:string){
 const root=archiveRecord(value),before=archivePositions(root,kind,venue).find(v=>v.archiveKey===key);
 if(!before)return null;
 if(!isArchivedPosition(before))return {data:root,before,after:before,changed:false};
 let data:Row;
 if(kind==='inventory'){
  const result=restoreInventoryProduct({assortment:root,productKey:key,venueId:venue,now});
  if(!result.ok)return null;data=result.assortment;
  for(const field of ['nomenclature','stockBalances'])data[field]=rows(data[field]).map(v=>scoped(v,venue)&&String(v.productKey||v.key||v.id||inventoryProductKey(v))===key&&v.status==='archived'?{...v,status:'active'}:v);
 }else{
  // Update only the lifecycle of the original item. Recipe, prices, IDs and history stay intact.
  data={...root,menuItems:rows(root.menuItems).map(v=>scoped(v,venue)&&String(v.id)===key?{...v,active:true,archived:false,...(v.status==='archived'?{status:'active'}:{}),restoredAt:now,updatedAt:now}:v),updatedAt:now};
 }
 const after=archivePositions(data,kind,venue).find(v=>v.archiveKey===key)!;
 return {data,before,after,changed:true};
}

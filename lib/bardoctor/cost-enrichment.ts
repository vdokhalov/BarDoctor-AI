import {stableSalesValue} from './sales-events';
import {canonicalVenueTimezone,venueDate} from './venue-time';
import {convertStockQuantity} from './stock-units';
import {resolvePurchaseLineAccountingCost} from './valuation';
import {derivedInputBelongs} from './derived-input-scope';

export const COST_ENRICHMENT_KEY='bd_sales_cost_enrichments_v1';
type Row=Record<string,any>;
export type EnrichmentScope={venueId:number;workspaceId:number;dataAccountId:number};
export type CostEnrichment={version:1;id:string;saleId:string;venueId:number;workspaceId:number;dataAccountId:number;batchFacts:Row;sourceHash:string;documentSetHash:string;calculatedAt:string;method:'receipt_before_sale';lines:{id:string;cost:number}[];cost:number;currency:string;sources:{document:Row;movement:Row}[]};
const row=(x:unknown):Row=>x&&typeof x==='object'&&!Array.isArray(x)?x as Row:{};
const rows=(x:unknown):Row[]=>Array.isArray(x)?x.map(row):[];
const num=(x:unknown):number|null=>typeof x==='number'&&Number.isFinite(x)?x:null;
const instant=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)&&/(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const money=(x:number)=>Math.round(x*100)/100;
const same=(a:unknown,b:unknown)=>stableSalesValue(a)===stableSalesValue(b);
export const enrichmentHash=async(x:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stableSalesValue(x)))),v=>v.toString(16).padStart(2,'0')).join('');
export function batchCostFacts(value:unknown){const b=row(value);return {id:b.id,venueId:b.venueId,businessDate:b.businessDate,status:b.status,costStatus:b.costStatus,totalTheoreticalCost:b.totalTheoreticalCost,lines:b.lines};}
export function receiptDocumentFacts(value:unknown){const d=row(value);return {id:d.id,venueId:d.venueId,status:d.status,documentType:d.documentType,date:d.date,createdAt:d.createdAt,confirmedAt:d.confirmedAt,updatedAt:d.updatedAt,cancelledAt:d.cancelledAt,currency:d.currency,accountingCurrency:d.accountingCurrency,items:d.items};}
export function receiptMovementFacts(value:unknown){const m=row(value);return {id:m.id,venueId:m.venueId,type:m.type,status:m.status,reversedAt:m.reversedAt,productKey:m.productKey,warehouseId:m.warehouseId,date:m.date,businessDate:m.businessDate,createdAt:m.createdAt,amount:m.amount,unit:m.unit,costAmount:m.costAmount,costStatus:m.costStatus,currency:m.currency,sourceDocumentId:m.sourceDocumentId,sourceLineId:m.sourceLineId,purchaseConversion:m.purchaseConversion};}
const trusted=new WeakSet<object>();
function eligibleSource(m:Row,d:Row,i:Row,scope:EnrichmentScope,captured:number,localDate:string,currency:string){
 if(!derivedInputBelongs([m,d],scope)||m.venueId!==scope.venueId||d.venueId!==scope.venueId||m.type!=='receipt'||m.status==='cancelled'||m.reversedAt||d.status!=='confirmed'||d.cancelledAt||d.documentType==='price_list'||!m.id||!d.id||!m.sourceLineId)return false;
 if(instant(d.createdAt)===null||instant(d.createdAt)!>instant(d.confirmedAt)!||instant(d.confirmedAt)===null||instant(d.updatedAt)===null||instant(m.createdAt)===null||instant(d.confirmedAt)!>=captured||instant(d.updatedAt)!>captured||instant(m.createdAt)!>captured)return false;
 const date=String(m.businessDate??m.date??'');if(!/^\d{4}-\d\d-\d\d$/.test(date)||date>localDate||d.date!==date)return false;
 if(m.currency!==currency||!['KNOWN','KNOWN_VALUE','KNOWN_ZERO'].includes(m.costStatus)||num(m.costAmount)===null||m.costAmount<0)return false;
 const lines=rows(d.items).filter(l=>l.id===m.sourceLineId);if(lines.length!==1)return false;
 const line=lines[0],conversion=row(line.purchaseConversion);
 if(conversion.version!==4||!same(conversion,m.purchaseConversion))return false;
 if(convertStockQuantity(conversion.canonicalQuantity,conversion.canonicalUnit,m.unit)!==num(m.amount))return false;
 const cost=resolvePurchaseLineAccountingCost({document:d,line,accountingCurrency:currency});
 if(!cost.known||money(cost.amount)!==money(m.costAmount))return false;
 if(m.productKey!==i.productKey||i.warehouseId&&i.warehouseId!=='__venue__'&&m.warehouseId&&m.warehouseId!=='__venue__'&&m.warehouseId!==i.warehouseId)return false;
 return true;
}
/** Produces a separate estimate; never mutates sale, recipe or warehouse facts. */
export async function prepareCostEnrichment(input:{event:unknown;documents:unknown[];movements:unknown[];scope:EnrichmentScope;now:string}):Promise<{entry?:CostEnrichment;reason:string}>{
 const e=row(input.event),b=row(e.batch),scope=input.scope;
 if(e.status!=='POSTED'||b.status!=='POSTED'||e.venueId!==scope.venueId||!derivedInputBelongs(e,scope)||!e.id||!b.id||b.venueId!==scope.venueId||b.businessDate!==e.businessDate)return {reason:'SALE_UNAVAILABLE'};
 if(b.costStatus==='FULL')return {reason:'ALREADY_KNOWN'};
 const timezone=canonicalVenueTimezone(e.timezone),captured=instant(e.acceptedAt);
 if(!timezone||captured===null||!e.currency||!rows(b.lines).length)return {reason:'CAPTURE_INCOMPLETE'};
 const localDate=venueDate(e.acceptedAt,timezone),sources:CostEnrichment['sources']=[],lineCosts:CostEnrichment['lines']=[];let missing=0;
 for(const l of rows(b.lines)){
  const snap=row(l.recipeSnapshot),ingredients=rows(snap.ingredients);
  if(!l.id||!l.menuItemId||row(snap.menuItem).id!==l.menuItemId||l.salesBatchId!==b.id||l.processingStatus!=='POSTED'||!(num(l.quantity)!>0)||instant(snap.capturedAt)!==captured)return {reason:'CAPTURE_INCOMPLETE'};
  if(snap.consumptionMode==='NONE'&&ingredients.length===0&&l.theoreticalCost===0){lineCosts.push({id:l.id,cost:0});continue;}
  if(!ingredients.length||new Set(ingredients.map(i=>i.ingredientId)).size!==ingredients.length)return {reason:'CAPTURE_INCOMPLETE'};
  let total=0;
  for(const i of ingredients){
   const quantity=num(i.baseQuantityTotal);if(!i.ingredientId||!i.productKey||quantity===null||quantity<=0||!i.baseUnit||num(i.baseQuantityPerPortion)===null||Math.abs(i.baseQuantityPerPortion*l.quantity-quantity)>0.000001)return {reason:'CAPTURE_INCOMPLETE'};
   if(['KNOWN','KNOWN_VALUE','KNOWN_ZERO'].includes(i.costStatus)&&num(i.totalCost)!==null){
    if(i.currency!==e.currency||num(i.unitCost)===null||i.unitCost<0||i.totalCost<0||money(quantity*i.unitCost)!==money(i.totalCost))return {reason:'KNOWN_COMPONENT_INVALID'};
    total+=i.totalCost;continue;
   }
   if(i.costStatus!=='UNKNOWN'||i.totalCost!=null||i.unitCost!=null)return {reason:'CAPTURE_INCOMPLETE'};
   missing++;
   const candidates: {m:Row;d:Row}[]=[];
   for(const m of input.movements.map(row)){
    if(m.productKey!==i.productKey)continue;
    const docs=input.documents.map(row).filter(d=>d.id===m.sourceDocumentId);
    if(docs.length===1&&eligibleSource(m,docs[0],i,scope,captured,localDate,e.currency))candidates.push({m,d:docs[0]});
   }
   candidates.sort((a,b)=>String(b.m.businessDate??b.m.date).localeCompare(String(a.m.businessDate??a.m.date))||instant(b.d.confirmedAt)!-instant(a.d.confirmedAt)!);
   const chosen=candidates[0];if(!chosen)return {reason:'NO_PROVEN_RECEIPT'};
   if(candidates.length>1&&String(chosen.m.businessDate??chosen.m.date)===String(candidates[1].m.businessDate??candidates[1].m.date)&&chosen.d.confirmedAt===candidates[1].d.confirmedAt)return {reason:'AMBIGUOUS_RECEIPT'};
   const amount=convertStockQuantity(chosen.m.amount,chosen.m.unit,i.baseUnit);if(amount===null||amount<=0)return {reason:'UNIT_MISMATCH'};
   total+=money(quantity*chosen.m.costAmount/amount);
   const evidence={document:receiptDocumentFacts(chosen.d),movement:receiptMovementFacts(chosen.m)};
   if(!sources.some(s=>s.movement.id===chosen.m.id))sources.push(evidence);
  }
  total=money(total);if(l.theoreticalCost!=null&&l.theoreticalCost!==total)return {reason:'KNOWN_COMPONENT_INVALID'};
  lineCosts.push({id:l.id,cost:total});
 }
 if(!missing)return {reason:'NO_UNKNOWN_COMPONENT'};
 if(new Set(lineCosts.map(l=>l.id)).size!==lineCosts.length)return {reason:'CAPTURE_INCOMPLETE'};
 const productKeys=new Set(sources.map(s=>s.movement.productKey));
 const relevantDocuments=input.documents.map(row).filter(d=>instant(d.confirmedAt)!==null&&instant(d.confirmedAt)!<captured&&rows(d.items).some(l=>productKeys.has(l.purchaseProductKey??l.productKey))).map(receiptDocumentFacts).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const documentSetHash=await enrichmentHash(relevantDocuments);
 const facts=batchCostFacts(b),sourceHash=await enrichmentHash({scope,saleId:e.id,batch:facts,sources,documentSetHash});
 return {reason:'RESOLVED',entry:{version:1,id:sourceHash,saleId:e.id,...scope,batchFacts:facts,sourceHash,documentSetHash,calculatedAt:input.now,method:'receipt_before_sale',lines:lineCosts,cost:money(lineCosts.reduce((n,l)=>n+l.cost,0)),currency:e.currency,sources}};
}
/** Source changes invalidate the overlay; this does not rewrite its stored proof. */
export async function validateCostEnrichments(entries:unknown[],events:unknown[],documents:unknown[],movements:unknown[],scope:EnrichmentScope){
 const valid:CostEnrichment[]=[];
 for(const value of entries){const entry=row(value);if(entry.version!==1||!derivedInputBelongs(entry,scope)||entry.venueId!==scope.venueId||entry.workspaceId!==scope.workspaceId||entry.dataAccountId!==scope.dataAccountId)continue;
  const matching=events.map(row).filter(e=>e.id===entry.saleId);if(matching.length!==1)continue;
  if(!rows(entry.sources).every(s=>{const ds=documents.map(row).filter(d=>d.id===row(s.document).id),ms=movements.map(row).filter(m=>m.id===row(s.movement).id);return ds.length===1&&ms.length===1&&same(receiptDocumentFacts(ds[0]),s.document)&&same(receiptMovementFacts(ms[0]),s.movement)}))continue;
  const planned=await prepareCostEnrichment({event:matching[0],documents,movements:rows(entry.sources).map(s=>s.movement),scope,now:entry.calculatedAt});
  if(!planned.entry||!same(planned.entry,entry))continue;
  trusted.add(entry);valid.push(entry as CostEnrichment);
 }
 return valid;
}
export function enrichmentForBatch(batch:unknown,entries:unknown[],venueId:number,currency:string,lineId?:string){
 const b=row(batch);if(b.status!=='POSTED'||b.costStatus==='FULL')return null;
 const matches=entries.filter((e):e is CostEnrichment=>!!e&&typeof e==='object'&&trusted.has(e)&&row(e).venueId===venueId&&row(e).currency===currency&&same(row(e).batchFacts,batchCostFacts(b)));
 if(matches.length!==1)return null;const e=matches[0];const cost=lineId?e.lines.find(l=>l.id===lineId)?.cost:e.cost;
 return cost==null?null:{known:true as const,cost,batchIds:[String(b.id)],enrichmentId:e.id,calculatedAt:e.calculatedAt,method:e.method};
}

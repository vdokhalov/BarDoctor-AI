import type { RecipeSnapshot } from './sales-consumption';
import { canonicalTaxonomyForAssortment } from './nomenclature-taxonomy';
import type { PosOrder, PosOrderActor } from './pos-orders';
export const preparationKey=(venue:number)=>`__bd_pos_preparation_v1__:${venue}`;
export type PreparationConfig={version:1;venueId:number;revision:number;routes:{sectionId:string;printerId:string;printerName:string}[];operations:{id:string;fingerprint:string}[]};
export type PreparationTicket={kind?:'PREPARATION'|'CANCELLATION';originalTicketId?:string;reason?:string;stockDecision?:'NO_WRITE_OFF'|'WRITE_OFF';writeOffId?:string;id:string;batchId:string;venueId:number;orderId:string;tableNumber:string;sectionId:string;sectionName:string;printerId:string|null;printerName:string|null;routeRevision:number;status:'pending'|'unconfigured';createdAt:string;createdBy:PosOrderActor;lines:{lineId:string;menuItemId:string;name:string;quantity:number;consumptionSnapshot?:RecipeSnapshot;consumptionUnavailable?:string}[]};
export function preparationConfig(raw:unknown,venue:number):PreparationConfig{
 if(raw==null)return{version:1,venueId:venue,revision:0,routes:[],operations:[]};
 const c=raw as PreparationConfig;
 if(c.version!==1||c.venueId!==venue||!Number.isSafeInteger(c.revision)||c.revision<0||!Array.isArray(c.routes)||c.routes.length>200||!Array.isArray(c.operations)||c.operations.length>500||new Set(c.routes.map(r=>r.sectionId)).size!==c.routes.length||c.routes.some(r=>!r||![r.sectionId,r.printerId,r.printerName].every(x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=120))||c.operations.some(o=>!o||typeof o.id!=='string'||typeof o.fingerprint!=='string'))throw Error('POS_ORDER_PREPARATION_INVALID');
 return c;
}
export function preparationSections(assortment:Record<string,unknown>){return canonicalTaxonomyForAssortment(assortment).taxonomy.sections.filter(s=>s.active);}
export const confirmedLineIds=(order:PosOrder)=>new Set((order.preparationTickets||[]).flatMap(t=>t.lines.map(l=>l.lineId)));
export function prepareTickets(order:PosOrder,assortment:Record<string,unknown>,config:PreparationConfig,operationId:string,now:string,actor:PosOrderActor):PreparationTicket[]{
 const sent=confirmedLineIds(order),pending=order.lines.filter(l=>!sent.has(l.id));if(!pending.length)throw Error('POS_ORDER_NOTHING_TO_CONFIRM');
 const sections=preparationSections(assortment),menu=Array.isArray(assortment.menuItems)?assortment.menuItems as Record<string,unknown>[]:[];
 const groups=new Map<string,PreparationTicket>();
 for(const line of pending){const matches=menu.filter(m=>m.id===line.menuItemId&&m.active!==false&&m.archived!==true&&(m.venueId==null||m.venueId===order.venueId));const section=matches.length===1?sections.find(s=>s.id===matches[0].sectionId):null;if(!section)throw Error('POS_ORDER_PREPARATION_SECTION_REQUIRED');
  let ticket=groups.get(section.id);if(!ticket){const route=config.routes.find(r=>r.sectionId===section.id);ticket={id:`prep:${operationId}:${groups.size+1}`,batchId:operationId,venueId:order.venueId,orderId:order.id,tableNumber:order.tableNumber,sectionId:section.id,sectionName:section.name,printerId:route?.printerId||null,printerName:route?.printerName||null,routeRevision:config.revision,status:route?'pending':'unconfigured',createdAt:now,createdBy:{...actor},lines:[]};groups.set(section.id,ticket)}
  ticket.lines.push({lineId:line.id,menuItemId:line.menuItemId,name:line.name,quantity:line.quantity});
 }
 return [...groups.values()];
}
export function cancellationTicket(order:PosOrder,lineId:string,quantity:number,operationId:string,reason:string,now:string,actor:PosOrderActor):PreparationTicket {
 const original=order.preparationTickets?.find(t=>t.kind!=='CANCELLATION'&&t.lines.some(l=>l.lineId===lineId));
 const line=original?.lines.find(l=>l.lineId===lineId);
 if(!original||!line)throw Error('POS_ORDER_PREPARATION_INVALID');
 return {...original,id:`cancel:${operationId}`,batchId:operationId,kind:'CANCELLATION',originalTicketId:original.id,reason,createdAt:now,createdBy:{...actor},lines:[{...line,quantity}]};
}
export function validatePreparationTickets(order:PosOrder){
 if(order.preparationTickets===undefined)return;
 const invalid=()=>{throw Error('POS_ORDER_PREPARATION_INVALID')};
 if(!Array.isArray(order.preparationTickets)||order.preparationTickets.length>100)invalid();
 const ids=new Map<string,PreparationTicket>(),originals=new Map<string,{menuItemId:string;quantity:number}>(),cancelled=new Map<string,number>();
 for(const t of order.preparationTickets!){
  if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||t.venueId!==order.venueId||t.orderId!==order.id||t.tableNumber!==order.tableNumber||!['pending','unconfigured'].includes(t.status)||!Array.isArray(t.lines)||!t.lines.length||!Number.isFinite(Date.parse(t.createdAt))||!t.createdBy||!Number.isSafeInteger(t.createdBy.accountId)||!Number.isSafeInteger(t.routeRevision)||typeof t.sectionId!=='string'||!t.sectionId||typeof t.sectionName!=='string'||typeof t.batchId!=='string'||t.status==='pending'&&(!t.printerId||!t.printerName)||t.status==='unconfigured'&&(t.printerId!==null||t.printerName!==null)||t.kind!==undefined&&!['PREPARATION','CANCELLATION'].includes(t.kind))invalid();
  if(t.kind==='CANCELLATION'){
   if(t.stockDecision!==undefined&&!['NO_WRITE_OFF','WRITE_OFF'].includes(t.stockDecision)||t.stockDecision==='WRITE_OFF'&&!t.writeOffId||t.stockDecision!=='WRITE_OFF'&&t.writeOffId)invalid();
   const source=ids.get(t.originalTicketId!);
   if(!source||source.kind==='CANCELLATION'||typeof t.reason!=='string'||!t.reason.trim()||t.reason.length>500||t.lines.length!==1||!['sectionId','sectionName','printerId','printerName','routeRevision','status'].every(key=>t[key as keyof PreparationTicket]===source[key as keyof PreparationTicket]))invalid();
   for(const l of t.lines){const from=source!.lines.find(x=>x.lineId===l.lineId);if(!from||from.menuItemId!==l.menuItemId||from.name!==l.name||JSON.stringify(from.consumptionSnapshot)!==JSON.stringify(l.consumptionSnapshot))invalid();cancelled.set(l.lineId,(cancelled.get(l.lineId)||0)+l.quantity);}
  }else{
   if(t.originalTicketId!==undefined||t.reason!==undefined)invalid();
   for(const l of t.lines){if(originals.has(l.lineId))invalid();originals.set(l.lineId,l);}
  }
  for(const l of t.lines)if(typeof l.name!=='string'||!Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>999)invalid();
  ids.set(t.id,t);
 }
 for(const [id,source] of originals){const remaining=source.quantity-(cancelled.get(id)||0),live=order.lines.find(l=>l.id===id);if(remaining<0||remaining===0&&live||remaining>0&&(!live||live.menuItemId!==source.menuItemId||live.quantity!==remaining))invalid();}
}
/** POS clients need availability, not recipe/cost evidence from the private command snapshot. */
export function preparationOrderView<T extends PosOrder>(order:T):T {
 return {...order,...(order.preparationTickets?{preparationTickets:order.preparationTickets.map(t=>({...t,lines:t.lines.map(l=>{const {consumptionSnapshot,...visible}=l;return {...visible,consumptionAvailable:!!consumptionSnapshot?.ingredients.length};})}))}:{})};
}

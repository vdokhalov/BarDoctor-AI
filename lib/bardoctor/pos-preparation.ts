import { canonicalTaxonomyForAssortment } from './nomenclature-taxonomy';
import type { PosOrder, PosOrderActor } from './pos-orders';
export const preparationKey=(venue:number)=>`__bd_pos_preparation_v1__:${venue}`;
export type PreparationConfig={version:1;venueId:number;revision:number;routes:{sectionId:string;printerId:string;printerName:string}[];operations:{id:string;fingerprint:string}[]};
export type PreparationTicket={id:string;batchId:string;venueId:number;orderId:string;tableNumber:string;sectionId:string;sectionName:string;printerId:string|null;printerName:string|null;routeRevision:number;status:'pending'|'unconfigured';createdAt:string;createdBy:PosOrderActor;lines:{lineId:string;menuItemId:string;name:string;quantity:number}[]};
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
export function validatePreparationTickets(order:PosOrder){
 if(order.preparationTickets===undefined)return;
 if(!Array.isArray(order.preparationTickets)||order.preparationTickets.length>100)throw Error('POS_ORDER_PREPARATION_INVALID');
 const ids=new Set<string>(),lines=new Set<string>();
 for(const t of order.preparationTickets){if(!t||typeof t.id!=='string'||ids.has(t.id)||t.venueId!==order.venueId||t.orderId!==order.id||t.tableNumber!==order.tableNumber||!['pending','unconfigured'].includes(t.status)||!Array.isArray(t.lines)||!t.lines.length||!Number.isFinite(Date.parse(t.createdAt))||!t.createdBy||!Number.isSafeInteger(t.createdBy.accountId)||!Number.isSafeInteger(t.routeRevision)||typeof t.sectionId!=='string'||!t.sectionId||typeof t.sectionName!=='string'||typeof t.batchId!=='string'||t.status==='pending'&&(!t.printerId||!t.printerName)||t.status==='unconfigured'&&(t.printerId!==null||t.printerName!==null))throw Error('POS_ORDER_PREPARATION_INVALID');ids.add(t.id);
  for(const l of t.lines){const original=order.lines.find(x=>x.id===l.lineId);if(lines.has(l.lineId)||!original||original.menuItemId!==l.menuItemId||original.quantity!==l.quantity||typeof l.name!=='string')throw Error('POS_ORDER_PREPARATION_INVALID');lines.add(l.lineId)}
 }
}

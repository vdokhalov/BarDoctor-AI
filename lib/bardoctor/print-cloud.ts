import {getD1} from '../../db';
import {readStoreSnapshots,runStoreCasBatch} from './store-cas';
import {parsePosOrders,POS_ORDER_STORE_KEY} from './pos-orders';
import type {PreparationTicket} from './pos-preparation';
export const printKey=(venue:number)=>`__bd_print_node_v1__:${venue}`;
export type PrintPayload={id:string;venueId:number;orderId:string;tableNumber:string;sectionId:string;sectionName:string;printerId:string|null;routeRevision:number;kind:string;originalTicketId:string|null;reason:string|null;createdAt:string;lines:{name:string;quantity:number}[]};
type Job={payload:PrintPayload;status:string;nodeId?:string;detail?:string};
export type PrintState={version:1;venueId:number;revision:number;baseline:string[];jobs:Job[];pair?:{hash:string;expires:string};node?:{id:string;hash:string;expires:string;revoked:boolean;printers:{id:string;name:string}[];lastSeen?:string};};
export const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export function printPayload(t:PreparationTicket):PrintPayload{return {id:t.id,venueId:t.venueId,orderId:t.orderId,tableNumber:t.tableNumber,sectionId:t.sectionId,sectionName:t.sectionName,printerId:t.printerId,routeRevision:t.routeRevision,kind:t.kind??'PREPARATION',originalTicketId:t.originalTicketId??null,reason:t.reason??null,createdAt:t.createdAt,lines:t.lines.map(l=>({name:l.name,quantity:l.quantity}))}}
export async function loadPrint(accountId:number,venueId:number){
 const db=getD1(),key=printKey(venueId),snapshots=await readStoreSnapshots(db,accountId,[key,POS_ORDER_STORE_KEY]);
 const raw=JSON.parse(snapshots[0].dataJson??'null') as PrintState|null;
 if(raw&&(raw.version!==1||raw.venueId!==venueId||!Array.isArray(raw.baseline)||!Array.isArray(raw.jobs)))throw Error('PRINT_STATE_INVALID');
 const tickets=parsePosOrders(JSON.parse(snapshots[1].dataJson??'[]')).filter(o=>o.venueId===venueId).flatMap(o=>o.preparationTickets??[]).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
 const state:PrintState=raw??{version:1,venueId,revision:0,baseline:[],jobs:[]};
 if(raw){const known=new Set([...state.baseline,...state.jobs.map(j=>j.payload.id)]);for(const t of tickets)if(!known.has(t.id)){state.jobs.push({payload:printPayload(t),status:t.originalTicketId&&state.baseline.includes(t.originalTicketId)?'blocked_history':t.printerId?'queued':'unconfigured'});known.add(t.id)}}
 if(state.jobs.length>2000)throw Error('PRINT_QUEUE_CAPACITY_REVIEW');
 return {db,key,snapshots,state,tickets,accountId};
}
export async function savePrint(c:Awaited<ReturnType<typeof loadPrint>>,guards:D1PreparedStatement[]=[]){
 c.state.revision++;const now=new Date().toISOString();
 await runStoreCasBatch(c.db,c.accountId,c.snapshots,[...guards,c.db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?, '__bd_print_access_guard__', NULL, ? WHERE NOT EXISTS(SELECT 1 FROM venues WHERE id=? AND data_account_id=? AND status='active')").bind(c.accountId,now,c.state.venueId,c.accountId),c.db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(c.accountId,c.key,JSON.stringify(c.state),now)],now);
}
export function publicPrint(s:PrintState){return {revision:s.revision,active:!!s.node&&!s.node.revoked&&s.node.expires>new Date().toISOString(),node:s.node?{id:s.node.id,revoked:s.node.revoked,expires:s.node.expires,lastSeen:s.node.lastSeen,printers:s.node.printers}:null,jobs:s.jobs.map(j=>({id:j.payload.id,orderId:j.payload.orderId,kind:j.payload.kind,printerId:j.payload.printerId,sectionName:j.payload.sectionName,status:j.status,detail:j.detail}))}}

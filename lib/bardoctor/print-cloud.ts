import {readPosTickets} from './pos-order-storage';
import {getD1} from '../../db';
import {readStoreSnapshots,runStoreCasBatch} from './store-cas';
import {parsePosOrders,POS_ORDER_STORE_KEY} from './pos-orders';
import type {PreparationTicket} from './pos-preparation';
export const printKey=(venue:number)=>`__bd_print_node_v1__:${venue}`;
export const archivePrefix=(venue:number)=>`__bd_print_job_v1__:${venue}:`;
export const archiveKey=(venue:number,id:string)=>archivePrefix(venue)+encodeURIComponent(id);
export const PRINT_ACTIVE_LIMIT=100,PRINT_ACTIVE_BYTES=400_000,PRINT_STATE_BYTES=1_500_000;
const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).byteLength;
const terminal=new Set(['accepted_by_transport','operator_confirmed','operator_resolved']);
export type PrintPayload={id:string;venueId:number;orderId:string;tableNumber:string;sectionId:string;sectionName:string;printerId:string|null;routeRevision:number;kind:string;originalTicketId:string|null;reason:string|null;createdAt:string;lines:{name:string;quantity:number}[]};
export type PrintJob={payload:PrintPayload;status:string;nodeId?:string;detail?:string;archivedAt?:string;reviewedBy?:number;reviewedAt?:string};
export type PrintState={version:1;venueId:number;revision:number;baseline:string[];jobs:PrintJob[];archivedCount?:number;backlog?:number;oversized?:number;retiredTokenHash?:string;pair?:{hash:string;expires:string};node?:{id:string;hash:string;expires:string;revoked:boolean;printers:{id:string;name:string}[];lastSeen?:string};};
export const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export function printPayload(t:PreparationTicket):PrintPayload{return {id:t.id,venueId:t.venueId,orderId:t.orderId,tableNumber:t.tableNumber,sectionId:t.sectionId,sectionName:t.sectionName,printerId:t.printerId,routeRevision:t.routeRevision,kind:t.kind??'PREPARATION',originalTicketId:t.originalTicketId??null,reason:t.reason??null,createdAt:t.createdAt,lines:t.lines.map(l=>({name:l.name,quantity:l.quantity}))}}
export async function loadPrint(accountId:number,venueId:number){
 const db=getD1(),key=printKey(venueId),snapshots=await readStoreSnapshots(db,accountId,[key,POS_ORDER_STORE_KEY]);
 const raw=JSON.parse(snapshots[0].dataJson??'null') as PrintState|null;
 if(raw&&(raw.version!==1||raw.venueId!==venueId||!Array.isArray(raw.baseline)||!Array.isArray(raw.jobs)))throw Error('PRINT_STATE_INVALID');
 const tickets=(await readPosTickets(db,accountId,snapshots[1].dataJson)).filter(t=>t.venueId===venueId).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
 const state:PrintState=raw??{version:1,venueId,revision:0,baseline:[],jobs:[]};
 const archives=new Map<string,PrintJob>(),known=new Set(state.baseline);
 // Query only source IDs still in the bounded order store, never scan all lifetime archives.
 const ids=[...new Set([...tickets.map(t=>t.id),...state.jobs.map(j=>j.payload.id)])];
 for(let i=0;i<ids.length;i+=50){const chunk=ids.slice(i,i+50);const rows=await db.prepare(`SELECT store_key FROM domain_data WHERE account_id=? AND store_key IN (${chunk.map(()=>'?').join(',')})`).bind(accountId,...chunk.map(id=>archiveKey(venueId,id))).all<{store_key:string}>();for(const row of rows.results)known.add(decodeURIComponent(row.store_key.slice(archivePrefix(venueId).length)))}
 // Keep the active document bounded. Archive rows preserve exact payload/route, node and outcome.
 for(const job of state.jobs)if(terminal.has(job.status)){archives.set(job.payload.id,{...job,archivedAt:job.archivedAt??new Date().toISOString()});known.add(job.payload.id)}
 state.archivedCount=(state.archivedCount??0)+archives.size;
 state.jobs=state.jobs.filter(j=>!terminal.has(j.status));for(const j of state.jobs)known.add(j.payload.id);
 state.backlog=0;state.oversized=0;
 // Reserve space for node ID, status and a 500-character Unicode review reason.
 let used=bytes(state.jobs)+2500*state.jobs.length;
 if(raw)for(const t of tickets)if(!known.has(t.id)){
  const job:PrintJob={payload:printPayload(t),status:t.originalTicketId&&state.baseline.includes(t.originalTicketId)?'blocked_history':t.printerId?'queued':'unconfigured'};
  const size=bytes(job)+1;
  if(size>PRINT_ACTIVE_BYTES/2){state.oversized++;state.backlog++;continue}
  if(state.jobs.length>=PRINT_ACTIVE_LIMIT||used+size+2500>PRINT_ACTIVE_BYTES){state.backlog++;continue}
  if(job.status==='queued'&&t.originalTicketId&&!state.jobs.some(j=>j.payload.id===t.originalTicketId)){
   const parent=archives.get(t.originalTicketId)??JSON.parse((await db.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').bind(accountId,archiveKey(venueId,t.originalTicketId)).first<{data_json:string}>())?.data_json??'null') as PrintJob|null;
   if(!parent||!state.node||parent.nodeId!==state.node.id)job.status='replacement_review';
  }
  state.jobs.push(job);known.add(t.id);used+=size+2500;
 }
 return {db,key,snapshots,state,tickets,accountId,archives};
}
export const printHasRoom=(s:PrintState,j:PrintJob)=>s.jobs.length<PRINT_ACTIVE_LIMIT&&bytes([...s.jobs,j])+2500*(s.jobs.length+1)<=PRINT_ACTIVE_BYTES;
export type PrintContext=Awaited<ReturnType<typeof loadPrint>>;
export async function archivedJob(c:PrintContext,id:string):Promise<PrintJob|null>{
 if(c.archives.has(id))return c.archives.get(id)!;
 const snapshots=await readStoreSnapshots(c.db,c.accountId,[archiveKey(c.state.venueId,id)]);c.snapshots.push(...snapshots);
 return JSON.parse(snapshots[0].dataJson??'null') as PrintJob|null;
}
export async function savePrint(c:PrintContext,guards:D1PreparedStatement[]=[]){
 c.state.revision++;const now=new Date().toISOString();
 // Archive acknowledgements in the same atomic batch as removing their active entries.
 for(const j of c.state.jobs)if(terminal.has(j.status)){if(!c.archives.has(j.payload.id))c.state.archivedCount=(c.state.archivedCount??0)+1;c.archives.set(j.payload.id,{...j,archivedAt:now})}
 c.state.jobs=c.state.jobs.filter(j=>!terminal.has(j.status));
 if(c.state.jobs.length>PRINT_ACTIVE_LIMIT||bytes(c.state.jobs)>PRINT_ACTIVE_BYTES||bytes(c.state)>PRINT_STATE_BYTES)throw Error('PRINT_ACTIVE_CAPACITY_REVIEW');
 const statements=[...c.archives.values()].map(j=>c.db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(c.accountId,archiveKey(c.state.venueId,j.payload.id),JSON.stringify(j),now));
 await runStoreCasBatch(c.db,c.accountId,c.snapshots,[...guards,...statements,c.db.prepare("INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?, '__bd_print_access_guard__', NULL, ? WHERE NOT EXISTS(SELECT 1 FROM venues WHERE id=? AND data_account_id=? AND status='active')").bind(c.accountId,now,c.state.venueId,c.accountId),c.db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(c.accountId,c.key,JSON.stringify(c.state),now)],now);
}
export const printJobView=(j:PrintJob)=>({id:j.payload.id,orderId:j.payload.orderId,kind:j.payload.kind,printerId:j.payload.printerId,sectionName:j.payload.sectionName,status:j.status,detail:j.detail,archivedAt:j.archivedAt,reviewedBy:j.reviewedBy,reviewedAt:j.reviewedAt});
export function publicPrint(s:PrintState){return {revision:s.revision,archivedCount:s.archivedCount??0,backlog:s.backlog??0,oversized:s.oversized??0,active:!!s.node&&!s.node.revoked&&s.node.expires>new Date().toISOString(),node:s.node?{id:s.node.id,revoked:s.node.revoked,expires:s.node.expires,lastSeen:s.node.lastSeen,printers:s.node.printers}:null,jobs:s.jobs.map(printJobView)}}

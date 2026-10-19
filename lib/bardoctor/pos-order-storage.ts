import {parsePosOrders,POS_ORDER_STORE_KEY as KEY,type PosOrder} from './pos-orders';
import {stableSalesValue} from './sales-events';
import {stockScope} from './stock-storage';
import type {JournalScope} from './stock-journal';
import type {BackupStore} from './journal-migration-runner';
import {readStoreSnapshots,storeCasGuard,StoreWriteConflictError} from './store-cas';
export const POS_ORDER_FORMAT='bardoctor-pos-orders-v1';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
const canonical=(v:unknown)=>stableSalesValue(v);
function fail(code='STORE_NEEDS_REVIEW'):never{throw Error('POS_ORDER_'+code)}
type State={account_id:number;venue_id:number;state:string;source_hash:string;source_count:number;copied_count:number;revision:number;next_position:number;backup_key:string;backup_hash:string};
type Row={order_id:string;position:number;revision:number;status:string;shift_id:string;payload_hash:string};
type Component={kind:string;item_id:string;position:number;payload_hash:string;chunk_count:number};
export function posOrderMarker(raw:string|null|undefined){const v=JSON.parse(raw??'[]');return !Array.isArray(v)&&v?.format===POS_ORDER_FORMAT&&Number.isSafeInteger(v.revision)?v as {format:string;revision:number}:null}
export async function posOrderState(db:D1Database,s:JournalScope){return db.prepare('SELECT j.* FROM pos_order_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=?').bind(s.accountId,s.venueId).first<State>()}
function guard(db:D1Database,s:JournalScope,state:State){return db.prepare("INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__pos_order_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM pos_order_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=? AND j.state=? AND j.revision=? AND j.copied_count=? AND j.backup_hash=?)").bind(s.accountId,s.accountId,s.venueId,state.state,state.revision,state.copied_count,state.backup_hash)}
function split(json:string){const out:string[]=[];let part='';for(const c of json){part+=c;if(part.length>=32000){out.push(part);part=''}}if(part)out.push(part);return out}
const coreId=(o:Pick<PosOrder,'id'|'revision'>)=>JSON.stringify([o.id,o.revision]);
function components(o:PosOrder){const {operations,preparationTickets,...core}=o;return [
 {kind:'core',id:coreId(o),position:o.revision,value:{core,hasTickets:Object.hasOwn(o,'preparationTickets'),operationCount:operations.length,ticketCount:(preparationTickets??[]).length}},
 ...operations.map((v,i)=>({kind:'operation',id:v.id,position:i,value:v})),
 ...(preparationTickets??[]).map((v,i)=>({kind:'ticket',id:v.id,position:i,value:v}))];}
async function hydratePage(db:D1Database,s:JournalScope,rows:Row[]){
 if(!rows.length)return [];
 // One indexed join for a page: avoid one D1 round trip per historical operation/ticket.
 const data=(await db.prepare(`SELECT c.order_id,c.kind,c.item_id,c.position,c.payload_hash,c.chunk_count,p.ordinal,p.payload FROM pos_order_components c JOIN pos_order_records r ON r.account_id=c.account_id AND r.order_id=c.order_id LEFT JOIN pos_order_chunks p ON p.account_id=c.account_id AND p.kind=c.kind AND p.item_id=c.item_id WHERE c.account_id=? AND c.order_id IN (${rows.map(()=>'?').join(',')}) AND (c.kind!='core' OR c.position=r.revision) ORDER BY c.order_id,c.kind,c.position,p.ordinal`).bind(s.accountId,...rows.map(r=>r.order_id)).all<Component&{order_id:string;ordinal:number|null;payload:string|null}>()).results;
 const byOrder=new Map<string,Map<string,{c:Component;parts:{ordinal:number|null;payload:string|null}[]}>>();
 for(const part of data){let groups=byOrder.get(part.order_id);if(!groups){groups=new Map();byOrder.set(part.order_id,groups)}const key=JSON.stringify([part.kind,part.item_id]);let group=groups.get(key);if(!group){group={c:part,parts:[]};groups.set(key,group)}group.parts.push(part)}
 const orders:PosOrder[]=[];
 for(const row of rows){let core:any;const operations:PosOrder['operations']=[],tickets:NonNullable<PosOrder['preparationTickets']>=[];
 for(const {c,parts} of byOrder.get(row.order_id)?.values()??[]){if(parts.length!==c.chunk_count||parts.some((p,i)=>p.ordinal!==i||p.payload===null))fail();const json=parts.map(p=>p.payload).join('');if(await digest(json)!==c.payload_hash)fail();const value=JSON.parse(json);
 if(c.kind==='core'){if(core||c.item_id!==coreId({id:row.order_id,revision:row.revision}))fail();core=value}else{const list=c.kind==='operation'?operations:tickets;if(c.position!==list.length)fail();list.push(value)}}
 if(!core||core.operationCount!==operations.length||core.ticketCount!==tickets.length||core.orderHash!==row.payload_hash)fail();const order={...core.core,operations,...(core.hasTickets?{preparationTickets:tickets}:{})};parsePosOrders([order]);if(order.id!==row.order_id||order.revision!==row.revision||order.status!==row.status||order.shiftId!==row.shift_id||order.venueId!==s.venueId||await digest(canonical(order))!==row.payload_hash)fail();orders.push(order);
 }return orders;
}
export async function readPosOrders(db:D1Database,accountId:number,raw:string|null|undefined,filter:{id?:string;shiftId?:string;open?:boolean}={}){
 const value=JSON.parse(raw??'[]');if(Array.isArray(value))return parsePosOrders(value);const marker=posOrderMarker(raw);if(!marker)fail();const scope=await stockScope(db,accountId),state=await posOrderState(db,scope);if(!state||state.state!=='active'||state.revision!==marker.revision)throw new StoreWriteConflictError();
 const orders:PosOrder[]=[];let after=-1;
 do{const rows=(await db.prepare(`SELECT * FROM pos_order_records WHERE account_id=? AND position>? ${filter.id?'AND order_id=?':''} ${filter.shiftId?'AND shift_id=?':''} ${filter.open?"AND status='OPEN'":''} ORDER BY position LIMIT 50`).bind(accountId,after,...(filter.id?[filter.id]:[]),...(filter.shiftId?[filter.shiftId]:[])).all<Row>()).results;
 orders.push(...await hydratePage(db,scope,rows));if(rows.length<50)break;after=rows.at(-1)!.position;}while(true);
 if((await posOrderState(db,scope))?.revision!==marker.revision)throw new StoreWriteConflictError();return parsePosOrders(orders);
}
async function insertOrder(db:D1Database,s:JournalScope,o:PosOrder,position:number,prior?:PosOrder){
 parsePosOrders([o]);if(o.venueId!==s.venueId)fail();if(prior&&(o.revision!==prior.revision+1||canonical(o.operations.slice(0,prior.operations.length))!==canonical(prior.operations)||canonical((o.preparationTickets??[]).slice(0,(prior.preparationTickets??[]).length))!==canonical(prior.preparationTickets??[])))fail('HISTORY_CHANGED');
 const hash=await digest(canonical(o));const statements=[prior?db.prepare('UPDATE pos_order_records SET revision=?,status=?,shift_id=?,payload_hash=? WHERE account_id=? AND order_id=?').bind(o.revision,o.status,o.shiftId,hash,s.accountId,o.id):db.prepare('INSERT INTO pos_order_records(account_id,order_id,position,revision,status,shift_id,payload_hash) VALUES(?,?,?,?,?,?,?)').bind(s.accountId,o.id,position,o.revision,o.status,o.shiftId,hash)];
 for(const c of components(o)){
  if(prior&&c.kind==='operation'&&c.position<prior.operations.length||prior&&c.kind==='ticket'&&c.position<(prior.preparationTickets??[]).length)continue;
  const json=canonical(c.kind==='core'?{...c.value,orderHash:hash}:c.value),parts=split(json);statements.push(db.prepare('INSERT INTO pos_order_components(account_id,order_id,kind,item_id,position,payload_hash,chunk_count) VALUES(?,?,?,?,?,?,?)').bind(s.accountId,o.id,c.kind,c.id,c.position,await digest(json),parts.length));
  for(let i=0;i<parts.length;i++)statements.push(db.prepare('INSERT INTO pos_order_chunks(account_id,kind,item_id,ordinal,payload) VALUES(?,?,?,?,?)').bind(s.accountId,c.kind,c.id,i,parts[i]));
 }
 return statements;
}
export async function posOrderStatements(db:D1Database,s:JournalScope,raw:string|null|undefined,before:PosOrder[],after:PosOrder[],now:string){
 const marker=posOrderMarker(raw);if(!marker)return [db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(s.accountId,KEY,JSON.stringify(after),now)];
 const state=await posOrderState(db,s);if(!state||state.state!=='active'||state.revision!==marker.revision)throw new StoreWriteConflictError();parsePosOrders(after);if(before.some(o=>!after.some(n=>n.id===o.id)))fail('HISTORY_CHANGED');
 const statements=[guard(db,s,state)];let next=state.next_position;
 for(const o of after){const old=before.find(p=>p.id===o.id);if(old&&canonical(old)===canonical(o))continue;
 if(old){const row=await db.prepare('SELECT * FROM pos_order_records WHERE account_id=? AND order_id=?').bind(s.accountId,o.id).first<Row>();if(!row||row.payload_hash!==await digest(canonical(old)))throw new StoreWriteConflictError();}
 statements.push(...await insertOrder(db,s,o,old?0:next++,old));}
 statements.push(db.prepare('UPDATE pos_order_journals SET revision=revision+1,next_position=? WHERE account_id=?').bind(next,s.accountId),db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(JSON.stringify({format:POS_ORDER_FORMAT,revision:state.revision+1}),now,s.accountId,KEY));return statements;
}
/** Trusted local/operator functions only: no HTTP endpoint and no automatic activation. */
export async function preparePosOrderMigration(db:D1Database,bucket:BackupStore,s:JournalScope){
 const valid=await stockScope(db,s.accountId);if(valid.venueId!==s.venueId)fail();const existing=await posOrderState(db,s);if(existing)return existing;
 const snapshots=await readStoreSnapshots(db,s.accountId,[KEY]);const raw=snapshots[0].dataJson;const orders=parsePosOrders(JSON.parse(raw??'[]'));if(orders.some(o=>o.venueId!==s.venueId))fail();
 // Full domain snapshot preserves related cash/stock references; existing normalized journals are never modified here.
 const stores=(await db.prepare('SELECT store_key,data_json,updated_at FROM domain_data WHERE account_id=? ORDER BY store_key').bind(s.accountId).all()).results;
 const backup=JSON.stringify({format:'bardoctor-pos-backup-v1',scope:s,capturedAt:new Date().toISOString(),source:snapshots[0],stores});const key=`pos-backups/${s.accountId}/${crypto.randomUUID()}.json`,hash=await digest(backup);
 await bucket.put(key,backup);const read=await bucket.get(key);if(!read||await digest(await read.text())!==hash)fail('BACKUP_UNVERIFIED');
 await db.batch([storeCasGuard(db,s.accountId,snapshots,new Date().toISOString()),db.prepare("INSERT INTO pos_order_journals(account_id,venue_id,state,source_hash,source_count,backup_key,backup_hash) VALUES(?,?,'copying',?,?,?,?)").bind(s.accountId,s.venueId,await digest(raw??'[]'),orders.length,key,hash)]);return (await posOrderState(db,s))!;
}
async function backupRead(bucket:BackupStore,s:JournalScope,state:State){const b=await bucket.get(state.backup_key);if(!b)fail('BACKUP_UNAVAILABLE');const json=await b.text();if(await digest(json)!==state.backup_hash)fail('BACKUP_UNVERIFIED');const v=JSON.parse(json);if(v.format!=='bardoctor-pos-backup-v1'||v.scope.accountId!==s.accountId||v.scope.venueId!==s.venueId||await digest(v.source.dataJson??'[]')!==state.source_hash)fail('BACKUP_UNVERIFIED');return v}
export async function copyPosOrders(db:D1Database,bucket:BackupStore,s:JournalScope,limit=5){
 if(!Number.isSafeInteger(limit)||limit<1||limit>10)fail();const state=await posOrderState(db,s);if(!state)fail('BACKUP_REQUIRED');await backupRead(bucket,s,state);if(state.state==='active')return state;
 const snapshots=await readStoreSnapshots(db,s.accountId,[KEY]);const raw=snapshots[0].dataJson??'[]';if(await digest(raw)!==state.source_hash)fail('MIGRATION_SOURCE_CHANGED');const orders=parsePosOrders(JSON.parse(raw));if(state.state==='verified')return state;
 const end=Math.min(orders.length,state.copied_count+limit),cas=()=>storeCasGuard(db,s.accountId,snapshots,new Date().toISOString());const statements=[cas(),guard(db,s,state)];for(let i=state.copied_count;i<end;i++)statements.push(...await insertOrder(db,s,orders[i],i));
 statements.push(db.prepare('UPDATE pos_order_journals SET copied_count=?,next_position=? WHERE account_id=?').bind(end,end,s.accountId));await db.batch(statements);
 if(end===orders.length){await verifyCopies(db,s,orders);await db.batch([cas(),guard(db,s,{...state,copied_count:end}),db.prepare("UPDATE pos_order_journals SET state='verified' WHERE account_id=?").bind(s.accountId)])}return (await posOrderState(db,s))!;
}
async function verifyCopies(db:D1Database,s:JournalScope,orders:PosOrder[]){const rows=(await db.prepare('SELECT * FROM pos_order_records WHERE account_id=? ORDER BY position').bind(s.accountId).all<Row>()).results;if(rows.length!==orders.length)fail('MIGRATION_INCOMPLETE');for(let start=0;start<rows.length;start+=50){const page=await hydratePage(db,s,rows.slice(start,start+50));for(let i=0;i<page.length;i++)if(rows[start+i].position!==start+i||canonical(page[i])!==canonical(orders[start+i]))fail('MIGRATION_VALUE_MISMATCH')}}
export async function activatePosOrders(db:D1Database,bucket:BackupStore,s:JournalScope){
 const state=await posOrderState(db,s);if(!state)fail('BACKUP_REQUIRED');const backup=await backupRead(bucket,s,state);if(state.state==='active')return;if(state.state!=='verified')fail('MIGRATION_INCOMPLETE');const snapshots=await readStoreSnapshots(db,s.accountId,[KEY]);if(await digest(snapshots[0].dataJson??'[]')!==state.source_hash)fail('MIGRATION_SOURCE_CHANGED');await verifyCopies(db,s,parsePosOrders(JSON.parse(backup.source.dataJson??'[]')));
 await db.batch([storeCasGuard(db,s.accountId,snapshots,new Date().toISOString()),guard(db,s,state),db.prepare("UPDATE pos_order_journals SET state='active' WHERE account_id=?").bind(s.accountId),db.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES(?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').bind(s.accountId,KEY,JSON.stringify({format:POS_ORDER_FORMAT,revision:0}))]);
}
/** Before the first normalized write only. Never restore stale orders over new sales or cancellations. */
export async function restorePosOrderMigration(db:D1Database,bucket:BackupStore,s:JournalScope){
 const state=await posOrderState(db,s);if(!state)return;if(state.revision!==0)fail('ROLL_FORWARD_REQUIRED');const backup=await backupRead(bucket,s,state);const snapshots=await readStoreSnapshots(db,s.accountId,[KEY]);if(state.state!=='active'&&await digest(snapshots[0].dataJson??'[]')!==state.source_hash)fail('MIGRATION_SOURCE_CHANGED');
 const source=backup.source;await db.batch([storeCasGuard(db,s.accountId,snapshots,new Date().toISOString()),guard(db,s,state),db.prepare('DELETE FROM pos_order_journals WHERE account_id=?').bind(s.accountId),...(source.dataJson===null?[db.prepare('DELETE FROM domain_data WHERE account_id=? AND store_key=?').bind(s.accountId,KEY)]:[db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(source.dataJson,source.updatedAt,s.accountId,KEY)])]);
}
/** Discard only inactive staging after a source change; never overwrite the live legacy source. Backups remain. */
export async function restartPosOrderMigration(db:D1Database,s:JournalScope){const state=await posOrderState(db,s);if(!state)return;if(state.state==='active')fail('ROLL_FORWARD_REQUIRED');await db.batch([guard(db,s,state),db.prepare('DELETE FROM pos_order_journals WHERE account_id=?').bind(s.accountId)])}
/** Print intake needs immutable outbox tickets, not every order operation/core revision. */
export async function readPosTickets(db:D1Database,accountId:number,raw:string|null|undefined){
 const marker=posOrderMarker(raw);if(!marker)return (await readPosOrders(db,accountId,raw)).flatMap(o=>o.preparationTickets??[]);
 const scope=await stockScope(db,accountId),state=await posOrderState(db,scope);if(!state||state.state!=='active'||state.revision!==marker.revision)throw new StoreWriteConflictError();
 const tickets:NonNullable<PosOrder['preparationTickets']>=[];let after=0;
 do{const rows=(await db.prepare("SELECT rowid AS cursor,order_id,kind,item_id,position,payload_hash,chunk_count FROM pos_order_components WHERE account_id=? AND kind='ticket' AND rowid>? ORDER BY rowid LIMIT 40").bind(accountId,after).all<Component&{cursor:number;order_id:string}>()).results;if(!rows.length)break;
 const parts=(await db.prepare(`SELECT item_id,ordinal,payload FROM pos_order_chunks WHERE account_id=? AND kind='ticket' AND item_id IN (${rows.map(()=>'?').join(',')}) ORDER BY item_id,ordinal`).bind(accountId,...rows.map(r=>r.item_id)).all<{item_id:string;ordinal:number;payload:string}>()).results;
 const groups=new Map<string,typeof parts>();for(const p of parts){const group=groups.get(p.item_id)??[];group.push(p);groups.set(p.item_id,group)}
 for(const row of rows){const group=groups.get(row.item_id)??[];if(group.length!==row.chunk_count||group.some((p,i)=>p.ordinal!==i))fail();const json=group.map(p=>p.payload).join('');if(await digest(json)!==row.payload_hash)fail();const ticket=JSON.parse(json);if(ticket.id!==row.item_id||ticket.orderId!==row.order_id||ticket.venueId!==scope.venueId)fail();tickets.push(ticket)}after=rows.at(-1)!.cursor;
 }while(true);if((await posOrderState(db,scope))?.revision!==marker.revision)throw new StoreWriteConflictError();return tickets;
}

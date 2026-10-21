import {derivedInputBelongs} from './derived-input-scope';
import {stockScope} from './stock-storage';
import type {JournalScope} from './stock-journal';
import type {SalesEvent} from './sales-events';
import {stableSalesValue} from './sales-events';
import {markSalesEventHistory,bindSalesEventTotal,bindPaidOrders} from './sales-event-history';
import {storeCasGuard,StoreWriteConflictError} from './store-cas';
const KEY='bd_sales_events_v1';
export const SALES_EVENT_FORMAT='bardoctor-sales-events-v1';
const hash=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');
function fail():never{throw Error('SALES_EVENT_STORE_NEEDS_REVIEW');}
type State={account_id:number;venue_id:number;state:string;source_hash:string;source_count:number;copied_count:number;revision:number;next_position:number};
type RecordRow={event_id:string;position:number;version:number;payload_hash:string;chunk_count:number};
export type EventSelector={id?:string;externalId?:string;source?:string;shiftId?:string;date?:string;orderId?:string};
function marker(value:{format?:unknown;revision?:unknown}|null|undefined):value is {format:string;revision:number}{return value?.format===SALES_EVENT_FORMAT&&Number.isSafeInteger(value.revision);}
export async function salesEventState(db:D1Database,scope:JournalScope){return db.prepare('SELECT j.* FROM sales_event_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=?').bind(scope.accountId,scope.venueId).first<State>();}
function guard(db:D1Database,scope:JournalScope,revision:number,state='active',copied?:number){return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__sales_event_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM sales_event_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=? AND j.revision=? AND j.state=? ${copied===undefined?'':'AND j.copied_count=?'})`).bind(scope.accountId,scope.accountId,scope.venueId,revision,state,...(copied===undefined?[]:[copied]));}
function validate(event:SalesEvent & {dataAccountId?:unknown},scope:JournalScope):asserts event is SalesEvent{
 if(!event||typeof event.id!=='string'||!event.id||typeof event.externalId!=='string'||!event.externalId||typeof event.fingerprint!=='string'||!event.fingerprint||event.venueId!==scope.venueId||!event.batch||!Array.isArray(event.originalMovements)||!Array.isArray(event.prices)||!['POSTED','REVERSED'].includes(event.status)||typeof event.businessDate!=='string'||typeof event.revenueRowId!=='string'||typeof event.source!=='string')fail();
 if(event.dataAccountId!=null&&event.dataAccountId!==scope.accountId)fail();
}
// Split on Unicode code points: each TEXT stays below 128 KB even for non-ASCII payloads.
function chunks(json:string){const values:string[]=[];let part='';for(const char of json){part+=char;if(part.length>=32000){values.push(part);part='';}}if(part)values.push(part);return values;}
async function insert(db:D1Database,scope:JournalScope,event:SalesEvent,position:number){
 validate(event,scope);const json=JSON.stringify(event),parts=chunks(json),digest=await hash(json);
 const statements=[db.prepare('INSERT INTO sales_event_records(account_id,event_id,position,external_id,source,business_date,revenue_row_id,order_id,actor_id,order_actor_id,fingerprint,payload_hash,chunk_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(scope.accountId,event.id,position,event.externalId,event.source,event.businessDate,event.revenueRowId,event.orderId??null,event.actor?.accountId??event.batch.createdBy?.accountId??null,event.orderActor?.accountId??null,event.fingerprint,digest,parts.length)];
 statements.push(db.prepare(`INSERT INTO sales_event_totals(account_id,revenue_row_id,currency,cents,receipts) VALUES (?,?,?,?,?) ON CONFLICT(account_id,revenue_row_id) DO UPDATE SET cents=cents+excluded.cents,receipts=receipts+excluded.receipts`).bind(scope.accountId,event.revenueRowId,event.currency,event.status==='POSTED'?Math.round(event.revenue*100):0,event.status==='POSTED'?1:0));
 for(let i=0;i<parts.length;i++)statements.push(db.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES (?,?,0,?,?)').bind(scope.accountId,event.id,i,parts[i]));
 if(event.status==='REVERSED')statements.push(db.prepare('INSERT INTO sales_event_reversals(account_id,event_id,reversed_at,original_hash) VALUES (?,?,?,?)').bind(scope.accountId,event.id,event.reversedAt??'',digest));
 if((event as SalesEvent & {workspaceId?:unknown}).workspaceId!=null)statements.push(db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__sales_event_scope__',NULL WHERE NOT EXISTS(SELECT 1 FROM venues WHERE id=? AND data_account_id=? AND workspace_id=?)`).bind(scope.accountId,scope.venueId,scope.accountId,(event as SalesEvent & {workspaceId?:unknown}).workspaceId));
 return statements;
}
type EventPart={ordinal:number;payload:string};
async function hydrateParts(scope:JournalScope,row:RecordRow,parts:EventPart[]){
 if(parts.length!==row.chunk_count||parts.some((p,i)=>p.ordinal!==i))fail();
 const json=parts.map(p=>p.payload).join('');if(await hash(json)!==row.payload_hash)fail();const event=JSON.parse(json);validate(event,scope);if(event.id!==row.event_id)fail();return event as SalesEvent;
}
async function hydrate(db:D1Database,scope:JournalScope,row:RecordRow){
 const parts=await db.prepare('SELECT ordinal,payload FROM sales_event_chunks WHERE account_id=? AND event_id=? AND version=? ORDER BY ordinal').bind(scope.accountId,row.event_id,row.version).all<EventPart>();
 return hydrateParts(scope,row,parts.results);
}
/** Bounded chunk reads replace one round trip per event. Keep every integrity check. */
async function hydratePage(db:D1Database,scope:JournalScope,rows:RecordRow[]){
 const events:SalesEvent[]=[];
 for(let start=0;start<rows.length;start+=40){
  const batch=rows.slice(start,start+40);
  const parts=await db.prepare(`SELECT event_id,version,ordinal,payload FROM sales_event_chunks WHERE account_id=? AND (${batch.map(()=>'(event_id=? AND version=?)').join(' OR ')}) ORDER BY event_id,version,ordinal`).bind(scope.accountId,...batch.flatMap(row=>[row.event_id,row.version])).all<EventPart&{event_id:string;version:number}>();
  const grouped=new Map<string,EventPart[]>();
  for(const part of parts.results){const key=JSON.stringify([part.event_id,part.version]);const list=grouped.get(key)||[];list.push(part);grouped.set(key,list);}
  for(const row of batch)events.push(await hydrateParts(scope,row,grouped.get(JSON.stringify([row.event_id,row.version]))||[]));
 }
 return events;
}
export async function salesEventPage(db:D1Database,scope:JournalScope,revision:number,after=-1,limit=100,selector:EventSelector={}){
 if(!Number.isSafeInteger(after)||!Number.isSafeInteger(limit)||limit<1||limit>100)fail();
 const state=await salesEventState(db,scope);if(!state||!['active','verified'].includes(state.state)||state.revision!==revision)throw new StoreWriteConflictError();
 const fields={id:'event_id',externalId:'external_id',source:'source',shiftId:'revenue_row_id',date:'business_date',orderId:'order_id'};
 const filters=Object.entries(selector).filter(([,v])=>v!==undefined);if(filters.some(([key,value])=>!Object.hasOwn(fields,key)||typeof value!=='string'))fail();
 const rows=await db.prepare(`SELECT event_id,position,version,payload_hash,chunk_count FROM sales_event_records WHERE account_id=? AND position>? ${filters.map(([k])=>'AND '+fields[k as keyof typeof fields]+'=?').join(' ')} ORDER BY position LIMIT ?`).bind(scope.accountId,after,...filters.map(([,v])=>v),limit+1).all<RecordRow>();
 const page=rows.results.slice(0,limit),items=await hydratePage(db,scope,page);
 const current=await salesEventState(db,scope);if(!current||current.revision!==revision||current.state!==state.state)throw new StoreWriteConflictError();
 return {items,next:rows.results.length>limit?page.at(-1)!.position:null};
}
/** Only explicit report/export callers request full compatibility history. Raw CAS snapshots remain untouched. */
export async function readSalesEvents(db:D1Database,accountId:number,raw:string|null|undefined,selector?:EventSelector,limits:{rows?:number;bytes?:number}={}){
 const value=JSON.parse(raw??'[]');if(Array.isArray(value))return value as SalesEvent[];if(!marker(value))fail();
 const scope=await stockScope(db,accountId),events:SalesEvent[]=[];let after=-1,bytes=2;
 do{const page=await salesEventPage(db,scope,value.revision,after,100,selector);events.push(...page.items);bytes+=new TextEncoder().encode(JSON.stringify(page.items)).length;if(events.length>(limits.rows??Infinity)||bytes>(limits.bytes??Infinity))throw Error('SALES_EVENT_READ_LIMIT');if(page.next===null)break;after=page.next;}while(true);
 return events;
}
/** Read bounded projections for reconciliation and Health. Validate one captured event at a
 * time instead of retaining the entire expanded POS history in request memory.
 * Raw journal marker/revision still belongs to the caller's CAS snapshot. */
async function readProjectedSalesEvents<T>(db:D1Database,accountId:number,raw:string|null|undefined,ownership:{venueId:number;workspaceId:number;dataAccountId:number},limits:{rows:number;bytes:number},project:(event:SalesEvent)=>T){
 const value=JSON.parse(raw??'[]'),refs:T[]=[];
 const bytes=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).length;let referenceBytes=2;
 const scope=await stockScope(db,accountId);
 if(scope.venueId!==ownership.venueId||accountId!==ownership.dataAccountId)throw Error('SALES_EVENT_SCOPE_MISMATCH');
 const append=(event:SalesEvent)=>{
  if(!derivedInputBelongs(event,ownership))throw Error('SALES_EVENT_SCOPE_MISMATCH');
  if(!event||typeof event.batch?.id!=='string'||!event.batch.id)fail();
  const ref=project(event);
  referenceBytes+=bytes(ref)+(refs.length?1:0);if(referenceBytes>limits.bytes)throw Error('SALES_EVENT_READ_LIMIT');
  refs.push(ref);
 };
 if(Array.isArray(value)){
  if(value.length>limits.rows||bytes(value)>limits.bytes)throw Error('SALES_EVENT_READ_LIMIT');
  for(const event of value)append(event);
  return refs;
 }
 if(!marker(value))fail();
 const state=await salesEventState(db,scope);
 if(!state||!['active','verified'].includes(state.state)||state.revision!==value.revision)throw new StoreWriteConflictError();
 const records=await db.prepare('SELECT event_id,position,version,payload_hash,chunk_count FROM sales_event_records WHERE account_id=? ORDER BY position LIMIT ?').bind(accountId,limits.rows+1).all<RecordRow>();
 if(records.results.length>limits.rows||bytes(records.results)>limits.bytes)throw Error('SALES_EVENT_READ_LIMIT');
 for(const record of records.results){
  if(!Number.isSafeInteger(record.chunk_count)||record.chunk_count<1||record.chunk_count>Math.ceil(limits.bytes/32000)+1)throw Error('SALES_EVENT_READ_LIMIT');
 }
 // Bound transferred payload for the entire group in SQL. If a group exceeds
 // the byte budget, split it; never omit an event or weaken individual checks.
 const hydrateGroup=async(batch:RecordRow[]):Promise<void>=>{
  const parts=await db.prepare(`SELECT event_id,version,ordinal,
   CASE WHEN SUM(length(CAST(payload AS BLOB))) OVER ()>? THEN NULL ELSE payload END payload
   FROM sales_event_chunks WHERE account_id=? AND (${batch.map(()=>'(event_id=? AND version=?)').join(' OR ')})
   ORDER BY event_id,version,ordinal LIMIT ?`)
   .bind(limits.bytes,accountId,...batch.flatMap(row=>[row.event_id,row.version]),batch.reduce((n,row)=>n+row.chunk_count,0)+1)
   .all<EventPart&{event_id:string;version:number}>();
  if(parts.results.some(p=>typeof p.payload!=='string')){
   if(batch.length===1)throw Error('SALES_EVENT_READ_LIMIT');
   const middle=Math.floor(batch.length/2);await hydrateGroup(batch.slice(0,middle));await hydrateGroup(batch.slice(middle));return;
  }
  if(parts.results.reduce((n,p)=>n+new TextEncoder().encode(p.payload).length,0)>limits.bytes)throw Error('SALES_EVENT_READ_LIMIT');
  const grouped=new Map<string,EventPart[]>();
  for(const part of parts.results){const key=JSON.stringify([part.event_id,part.version]),list=grouped.get(key)??[];list.push(part);grouped.set(key,list);}
  for(const record of batch)append(await hydrateParts(scope,record,grouped.get(JSON.stringify([record.event_id,record.version]))??[]));
 };
 for(let start=0;start<records.results.length;start+=40)await hydrateGroup(records.results.slice(start,start+40));
 const current=await salesEventState(db,scope);
 if(!current||current.revision!==value.revision||current.state!==state.state)throw new StoreWriteConflictError();
 if(bytes(refs)>limits.bytes)throw Error('SALES_EVENT_READ_LIMIT');
 return refs;
}
export async function readSalesEventBatchReferences(db:D1Database,accountId:number,raw:string|null|undefined,ownership:{venueId:number;workspaceId:number;dataAccountId:number},limits={rows:10000,bytes:2000000}){
 return readProjectedSalesEvents(db,accountId,raw,ownership,limits,event=>({id:event.id,venueId:event.venueId,batch:{id:event.batch.id}}));
}
/** Health never reads originalMovements. Keep complete batch cost captures,
 * prices and operational fields; check all original nested ownership first. */
export async function readHealthSalesEvents(db:D1Database,accountId:number,raw:string|null|undefined,ownership:{venueId:number;workspaceId:number;dataAccountId:number},limits={rows:10000,bytes:2000000}){
 return readProjectedSalesEvents(db,accountId,raw,ownership,limits,event=>{
  const {originalMovements,...projection}=event;return projection;
 });
}
export async function readSaleEvent(db:D1Database,accountId:number,raw:string|null|undefined,selector:EventSelector,revenueRowId?:string){
 const value=JSON.parse(raw??'[]');if(Array.isArray(value))return {events:value as SalesEvent[],revision:null};if(!marker(value))fail();
 if(!selector.id&&!(selector.externalId&&selector.source))fail();
 const scope=await stockScope(db,accountId),page=await salesEventPage(db,scope,value.revision,-1,2,selector);if(page.next!==null||page.items.length>1)fail();
 const id=page.items[0]?.revenueRowId??revenueRowId;
 if(id){const total=await db.prepare('SELECT currency,cents,receipts FROM sales_event_totals WHERE account_id=? AND revenue_row_id=?').bind(accountId,id).first<{currency:string;cents:number;receipts:number}>();bindSalesEventTotal(page.items,{id,currency:total?.currency??null,cents:total?.cents??0,receipts:total?.receipts??0});}
 const current=await salesEventState(db,scope);if(!current||current.revision!==value.revision)throw new StoreWriteConflictError();
 return {events:markSalesEventHistory(page.items),revision:value.revision};
}
export async function salesEventStatements(db:D1Database,scope:JournalScope,revision:number,before:SalesEvent[],after:SalesEvent[]){
 const state=await salesEventState(db,scope);if(!state||state.state!=='active'||state.revision!==revision)throw new StoreWriteConflictError();
 if(before.length>1||after.length>2||new Set(after.map(e=>e.id)).size!==after.length)fail();
 const statements=[guard(db,scope,revision)];let next=state.next_position;
 for(const event of before)if(!after.some(row=>row.id===event.id))fail();
 for(const event of after){validate(event,scope);const prior=before.find(row=>row.id===event.id);if(prior&&stableSalesValue(prior)===stableSalesValue(event))continue;
  if(!prior){statements.push(...await insert(db,scope,event,next++));continue;}
  if(prior.status!=='POSTED'||event.status!=='REVERSED'||!event.reversedAt||stableSalesValue({...event,status:prior.status,reversedAt:prior.reversedAt})!==stableSalesValue(prior))fail();
  const stored=await db.prepare('SELECT event_id,position,version,payload_hash,chunk_count FROM sales_event_records WHERE account_id=? AND event_id=?').bind(scope.accountId,event.id).first<RecordRow>();if(!stored||stored.version!==0||stableSalesValue(await hydrate(db,scope,stored))!==stableSalesValue(prior))throw new StoreWriteConflictError();
  const json=JSON.stringify(event),parts=chunks(json);
  statements.push(db.prepare('UPDATE sales_event_totals SET cents=cents-?,receipts=receipts-1 WHERE account_id=? AND revenue_row_id=?').bind(Math.round(event.revenue*100),scope.accountId,event.revenueRowId));
  statements.push(db.prepare('INSERT INTO sales_event_reversals(account_id,event_id,reversed_at,original_hash) VALUES (?,?,?,?)').bind(scope.accountId,event.id,event.reversedAt,stored.payload_hash));
  for(let i=0;i<parts.length;i++)statements.push(db.prepare('INSERT INTO sales_event_chunks(account_id,event_id,version,ordinal,payload) VALUES (?,?,1,?,?)').bind(scope.accountId,event.id,i,parts[i]));
  statements.push(db.prepare('UPDATE sales_event_records SET version=1,payload_hash=?,chunk_count=? WHERE account_id=? AND event_id=?').bind(await hash(json),parts.length,scope.accountId,event.id));
 }
 statements.push(db.prepare('UPDATE sales_event_journals SET revision=revision+1,next_position=? WHERE account_id=? AND venue_id=?').bind(next,scope.accountId,scope.venueId));
 statements.push(db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(JSON.stringify({format:SALES_EVENT_FORMAT,revision:revision+1}),new Date().toISOString(),scope.accountId,KEY));return statements;
}
export async function copyLegacySalesEvents(db:D1Database,scope:JournalScope,limit=5){
 if(!Number.isSafeInteger(limit)||limit<1||limit>10)fail();
 const valid=await stockScope(db,scope.accountId);if(valid.venueId!==scope.venueId)fail();
 const source=await db.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').bind(scope.accountId,KEY).first<{data_json:string;updated_at:string}>();
 let state=await salesEventState(db,scope);if(state?.state==='active')return state;
 const raw=source?.data_json??'[]',events=JSON.parse(raw);if(!Array.isArray(events))fail();const digest=await hash(raw);
 if(state&&state.source_hash!==digest)throw Error('SALES_EVENT_MIGRATION_SOURCE_CHANGED');
 const cas=()=>storeCasGuard(db,scope.accountId,[{key:KEY,dataJson:source?.data_json??null,updatedAt:source?.updated_at??null}],new Date().toISOString());
 if(!state){await db.batch([cas(),db.prepare("INSERT INTO sales_event_journals(account_id,venue_id,state,source_hash,source_count) VALUES (?,?,'copying',?,?) ON CONFLICT(account_id) DO NOTHING").bind(scope.accountId,scope.venueId,digest,events.length)]);state=await salesEventState(db,scope);if(!state||state.source_hash!==digest)fail();}
 if(state.state==='verified')return state;
 const end=Math.min(events.length,state.copied_count+limit),statements=[cas(),guard(db,scope,state.revision,'copying',state.copied_count)];
 for(let i=state.copied_count;i<end;i++)statements.push(...await insert(db,scope,events[i],i));
 statements.push(db.prepare('UPDATE sales_event_journals SET copied_count=?,next_position=? WHERE account_id=?').bind(end,end,scope.accountId));await db.batch(statements);
 if(end===events.length){
  const rows=await db.prepare('SELECT event_id,position,version,payload_hash,chunk_count FROM sales_event_records WHERE account_id=? ORDER BY position').bind(scope.accountId).all<RecordRow>();if(rows.results.length!==events.length)fail();
  for(let i=0;i<rows.results.length;i++)if(stableSalesValue(await hydrate(db,scope,rows.results[i]))!==stableSalesValue(events[i]))fail();
  await db.batch([cas(),guard(db,scope,state.revision,'copying',end),db.prepare("UPDATE sales_event_journals SET state='verified' WHERE account_id=?").bind(scope.accountId)]);
 }
 return (await salesEventState(db,scope))!;
}
export async function activateSalesEvents(db:D1Database,scope:JournalScope,extraGuards:D1PreparedStatement[]=[]){
 const state=await salesEventState(db,scope);if(state?.state==='active')return;if(!state||state.state!=='verified')fail();
 const source=await db.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').bind(scope.accountId,KEY).first<{data_json:string;updated_at:string}>();if(await hash(source?.data_json??'[]')!==state.source_hash)throw new StoreWriteConflictError();
 const revenue=await db.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').bind(scope.accountId,'bd_finance_revenue').first<{data_json:string;updated_at:string}>();
 const revenues=JSON.parse(revenue?.data_json??'[]');if(!Array.isArray(revenues))fail();
 const totals=new Map<string,{cents:number;count:number;currency:string}>();
 for(const event of JSON.parse(source?.data_json??'[]') as SalesEvent[]){validate(event,scope);const total=totals.get(event.revenueRowId)??{cents:0,count:0,currency:event.currency};if(total.currency!==event.currency)fail();if(event.status==='POSTED'){total.cents+=Math.round(event.revenue*100);total.count++;}totals.set(event.revenueRowId,total);}
 for(const row of revenues)if(row.venueId===scope.venueId&&row.revenueSource==='sales_events_v1'&&!totals.has(row.id)&&(row.revenue!==0||row.receipts!==0))throw Error('SALES_EVENT_REVENUE_NEEDS_REVIEW');
 for(const [id,total] of totals){const rows=revenues.filter((row:{id:unknown;venueId:unknown})=>row.id===id&&row.venueId===scope.venueId);if(rows.length!==1||rows[0].revenueSource!=='sales_events_v1'||rows[0].currency!==total.currency||Math.round(rows[0].revenue*100)!==total.cents||rows[0].receipts!==total.count)throw Error('SALES_EVENT_REVENUE_NEEDS_REVIEW');}
 await db.batch([...extraGuards,storeCasGuard(db,scope.accountId,[{key:KEY,dataJson:source?.data_json??null,updatedAt:source?.updated_at??null},{key:'bd_finance_revenue',dataJson:revenue?.data_json??null,updatedAt:revenue?.updated_at??null}],new Date().toISOString()),guard(db,scope,state.revision,'verified'),db.prepare("UPDATE sales_event_journals SET state='active' WHERE account_id=?").bind(scope.accountId),db.prepare('INSERT INTO domain_data(account_id,store_key,data_json) VALUES (?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').bind(scope.accountId,KEY,JSON.stringify({format:SALES_EVENT_FORMAT,revision:state.revision}))]);
}

/** Restart only unactivated staging; legacy source remains untouched. */
export async function restartLegacySalesEvents(db:D1Database,scope:JournalScope,extraGuards:D1PreparedStatement[]=[]){
 const state=await salesEventState(db,scope);if(!state)return;if(state.state==='active')fail();
 await db.batch([...extraGuards,guard(db,scope,state.revision,state.state,state.copied_count),
 db.prepare('DELETE FROM sales_event_reversals WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM sales_event_chunks WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM sales_event_totals WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM sales_event_records WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM sales_event_journals WHERE account_id=?').bind(scope.accountId)]);
}

/** Cashier refresh is bounded before hydration, including staff-owned history. */
export async function readRecentSalesEvents(db:D1Database,accountId:number,raw:string|null|undefined,options:{actorId?:number;externalId?:string}={}){
 const value=JSON.parse(raw??'[]');if(Array.isArray(value))return value as SalesEvent[];if(!marker(value))fail();
 const scope=await stockScope(db,accountId),state=await salesEventState(db,scope);if(!state||state.state!=='active'||state.revision!==value.revision)throw new StoreWriteConflictError();
 const result=await db.prepare(`SELECT event_id,position,version,payload_hash,chunk_count FROM sales_event_records WHERE account_id=? ${options.actorId===undefined?'':'AND (actor_id=? OR order_actor_id=?)'} ${options.externalId===undefined?'':'AND external_id=?'} ORDER BY position DESC LIMIT 100`).bind(accountId,...(options.actorId===undefined?[]:[options.actorId,options.actorId]),...(options.externalId===undefined?[]:[options.externalId])).all<RecordRow>();
 const items:SalesEvent[]=[];for(const row of result.results.reverse())items.push(await hydrate(db,scope,row));
 if((await salesEventState(db,scope))?.revision!==value.revision)throw new StoreWriteConflictError();return items;
}
/** Order views need payment identities, not recipe/cost payloads. */
export async function readOrderPaymentFacts(db:D1Database,accountId:number,raw:string|null|undefined,orderIds:string[]){
 const value=JSON.parse(raw??'[]');if(Array.isArray(value))return value as SalesEvent[];if(!marker(value))fail();
 const scope=await stockScope(db,accountId),state=await salesEventState(db,scope);if(!state||state.state!=='active'||state.revision!==value.revision)throw new StoreWriteConflictError();
 const ids=new Set<string>();
 for(let start=0;start<orderIds.length;start+=40){const part=orderIds.slice(start,start+40),marks=part.map(()=>'?').join(',');
  const result=await db.prepare(`SELECT order_id,external_id FROM sales_event_records WHERE account_id=? AND (order_id IN (${marks}) OR external_id IN (${marks}))`).bind(accountId,...part,...part.map(id=>'pos-order:'+id)).all<{order_id:string|null;external_id:string}>();
  for(const row of result.results){if(row.order_id)ids.add(row.order_id);if(row.external_id.startsWith('pos-order:'))ids.add(row.external_id.slice(10));}
 }
 if((await salesEventState(db,scope))?.revision!==value.revision)throw new StoreWriteConflictError();const events:SalesEvent[]=[];bindPaidOrders(events,ids);return events;
}

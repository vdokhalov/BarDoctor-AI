/** Normalized journal primitives. Schema installation never activates migration.
 * Every query is scoped by authenticated data account AND its venue. */
import {storeCasGuard,StoreWriteConflictError,type StoreSnapshot} from './store-cas';
const KEY='bd_stock_movements';
export const JOURNAL_FORMAT='bardoctor-stock-journal-v1';
type Row=Record<string,unknown>;
// Internal identity only: never add fields to exported legacy evidence.
const positions=new WeakMap<object,number>();
export function journalPosition(row:object){const position=positions.get(row);if(position===undefined)fail();return position;}
export type JournalScope={accountId:number;venueId:number};
type Journal={account_id:number;venue_id:number;state:'copying'|'verified'|'active';source_hash:string;source_count:number;copied_count:number;revision:number;next_position:number};
const object=(x:unknown):x is Row=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=(x:unknown)=>typeof x==='string'?x:null;
const effectiveDate=(x:unknown)=>{const value=String(x??'').trim();return /^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):null;};
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
function fail():never{throw Error('STOCK_JOURNAL_NEEDS_REVIEW');}
export async function journalState(db:D1Database,scope:JournalScope){
 return db.prepare(`SELECT j.account_id,j.venue_id,j.state,j.source_hash,j.source_count,j.copied_count,j.revision,j.next_position FROM stock_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=?`).bind(scope.accountId,scope.venueId).first<Journal>();
}
function journalGuard(db:D1Database,scope:JournalScope,revision:number,state:string,cursor?:number){
 return db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_stock_journal_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM stock_journals j JOIN venues v ON v.id=j.venue_id AND v.data_account_id=j.account_id WHERE j.account_id=? AND j.venue_id=? AND j.revision=? AND j.state=? ${cursor===undefined?'':'AND j.copied_count=?'})`).bind(scope.accountId,scope.accountId,scope.venueId,revision,state,...(cursor===undefined?[]:[cursor]));
}
async function checkedBatch(db:D1Database,statements:D1PreparedStatement[]){try{return await db.batch(statements);}catch(error){if(/NOT NULL constraint failed: domain_data.data_json/.test(String(error)))throw new StoreWriteConflictError();throw error;}}
async function movementStatements(db:D1Database,scope:JournalScope,value:unknown,position:number,update=false){
 if(!object(value)||value.venueId!=null&&value.venueId!==scope.venueId||value.dataAccountId!=null&&value.dataAccountId!==scope.accountId)fail();
 const payload={...value};let hash:string|null=null;const statements:D1PreparedStatement[]=[];
 if(value.workspaceId!=null){
  if(!Number.isSafeInteger(Number(value.workspaceId)))fail();
  statements.push(db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_stock_workspace_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM venues WHERE id=? AND data_account_id=? AND workspace_id=?)`).bind(scope.accountId,scope.venueId,scope.accountId,Number(value.workspaceId)));
 }
 if(Object.hasOwn(payload,'recipeSnapshot')){
  const snapshot=JSON.stringify(payload.recipeSnapshot);hash=await sha(snapshot);delete payload.recipeSnapshot;
  statements.push(db.prepare('INSERT INTO stock_recipe_snapshots(account_id,snapshot_hash,snapshot_json) VALUES (?,?,?) ON CONFLICT(account_id,snapshot_hash) DO NOTHING').bind(scope.accountId,hash,snapshot));
  // Hash equality alone must not authorize silently substituting different evidence.
  statements.push(db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__bd_stock_snapshot_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM stock_recipe_snapshots WHERE account_id=? AND snapshot_hash=? AND snapshot_json=?)`).bind(scope.accountId,scope.accountId,hash,snapshot));
 }
 statements.push(db.prepare(`INSERT INTO stock_journal_movements(account_id,position,movement_id,idempotency_key,product_key,warehouse_id,kind,effective_date,created_at,source_document_id,source_line_id,sales_batch_id,status,reversed_at,payload_json,snapshot_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ${update?'ON CONFLICT(account_id,position) DO UPDATE SET movement_id=excluded.movement_id,idempotency_key=excluded.idempotency_key,product_key=excluded.product_key,warehouse_id=excluded.warehouse_id,kind=excluded.kind,effective_date=excluded.effective_date,created_at=excluded.created_at,source_document_id=excluded.source_document_id,source_line_id=excluded.source_line_id,sales_batch_id=excluded.sales_batch_id,status=excluded.status,reversed_at=excluded.reversed_at,payload_json=excluded.payload_json,snapshot_hash=excluded.snapshot_hash':''}`).bind(scope.accountId,position,text(value.id),text(value.idempotencyKey),text(value.productKey),String(value.warehouseId??'').trim(),text(value.type),effectiveDate(value.businessDate??value.date),text(value.createdAt),text(value.sourceDocumentId),text(value.sourceLineId),text(value.salesBatchId),text(value.status),value.reversedAt?'reversed':null,JSON.stringify(payload),hash));
 return statements;
}
async function hydrate(row:{position?:number;payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}):Promise<Row>{
 const value=JSON.parse(row.payload_json);if(!object(value))fail();
 if(row.snapshot_hash!==null){if(row.snapshot_json===null||Object.hasOwn(value,'recipeSnapshot')||await sha(row.snapshot_json)!==row.snapshot_hash)fail();value.recipeSnapshot=JSON.parse(row.snapshot_json);}
 if(row.position!==undefined)positions.set(value,row.position);
 return value;
}
/** Keyset pagination: no OFFSET scan, and no unbounded HTTP history response. */
export async function journalPage(db:D1Database,scope:JournalScope,after:number|null=null,limit=100,expectedRevision?:number,sourceDocumentId?:string){
 if(!Number.isSafeInteger(limit)||limit<1||limit>500||after!==null&&!Number.isSafeInteger(after))fail();
 const j=await journalState(db,scope);if(!j||j.state!=='active'&&j.state!=='verified')fail();
 if(expectedRevision!==undefined&&j.revision!==expectedRevision)throw new StoreWriteConflictError();
 if(sourceDocumentId!==undefined&&(!sourceDocumentId.trim()||sourceDocumentId.length>240))fail();
 const rows=await db.prepare(`SELECT m.position,m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=? ${sourceDocumentId===undefined?'':'AND (m.source_document_id=? OR m.sales_batch_id=?)'} ${after===null?'':'AND m.position>?'} ORDER BY m.position LIMIT ?`).bind(scope.accountId,...(sourceDocumentId===undefined?[]:[sourceDocumentId,sourceDocumentId]),...(after===null?[]:[after]),limit+1).all<{position:number;payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
 const current=await journalState(db,scope);if(!current||current.revision!==j.revision||current.state!==j.state)throw new StoreWriteConflictError();
 const items=rows.results.slice(0,limit);return {revision:j.revision,items:await Promise.all(items.map(hydrate)),next:rows.results.length>limit?items.at(-1)!.position:null};
}
/** Resume a bounded batch against the exact unchanged legacy source. No cutover. */
export async function copyLegacyJournal(db:D1Database,scope:JournalScope,limit=25){
 if(!Number.isSafeInteger(limit)||limit<1||limit>25)fail();
 const valid=await db.prepare('SELECT id FROM venues WHERE id=? AND data_account_id=?').bind(scope.venueId,scope.accountId).first();if(!valid)fail();
 const source=await db.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').bind(scope.accountId,KEY).first<{data_json:string;updated_at:string}>();
 if(!source)fail();let j=await journalState(db,scope);
 if(j?.state==='active')return {state:j.state,copied:j.copied_count,total:j.source_count};
 const values:unknown=JSON.parse(source.data_json);if(!Array.isArray(values))fail();
 const hash=await sha(source.data_json);
 if(j&&j.source_hash!==hash)throw Error('STOCK_JOURNAL_MIGRATION_SOURCE_CHANGED');
 if(!j){
  const snapshots:StoreSnapshot[]=[{key:KEY,dataJson:source.data_json,updatedAt:source.updated_at}];
  await checkedBatch(db,[storeCasGuard(db,scope.accountId,snapshots,new Date().toISOString()),db.prepare(`INSERT INTO stock_journals(account_id,venue_id,state,legacy_json,source_hash,source_count) VALUES (?,?,'copying',?,?,?) ON CONFLICT(account_id) DO NOTHING`).bind(scope.accountId,scope.venueId,source.data_json,hash,values.length)]);
  j=await journalState(db,scope);if(!j||j.source_hash!==hash)fail();
 }
 if(j.state==='verified')return {state:j.state,copied:j.copied_count,total:j.source_count};
 const stop=Math.min(values.length,j.copied_count+limit),statements=[storeCasGuard(db,scope.accountId,[{key:KEY,dataJson:source.data_json,updatedAt:source.updated_at}],new Date().toISOString()),journalGuard(db,scope,j.revision,'copying',j.copied_count)];
 for(let i=j.copied_count;i<stop;i++)statements.push(...await movementStatements(db,scope,values[i],i));
 statements.push(db.prepare('UPDATE stock_journals SET copied_count=? WHERE account_id=? AND venue_id=?').bind(stop,scope.accountId,scope.venueId));
 await checkedBatch(db,statements);
 if(stop===values.length){
  // Compare complete values, including unknown fields, in original order.
  const copied=await db.prepare('SELECT m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=? ORDER BY m.position').bind(scope.accountId).all<{payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
  const canonical=(v:unknown):string=>JSON.stringify(v,(_key,value)=>object(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
  if(copied.results.length!==values.length||(await Promise.all(copied.results.map(hydrate))).some((row,i)=>canonical(row)!==canonical(values[i])))fail();
  await checkedBatch(db,[storeCasGuard(db,scope.accountId,[{key:KEY,dataJson:source.data_json,updatedAt:source.updated_at}],new Date().toISOString()),journalGuard(db,scope,j.revision,'copying',stop),db.prepare("UPDATE stock_journals SET state='verified' WHERE account_id=? AND venue_id=?").bind(scope.accountId,scope.venueId)]);
 }
 return {state:stop===values.length?'verified':'copying',copied:stop,total:values.length};
}
/** Cutover is separate and must not be wired into a release until all consumers
 * support normalized storage. Kept local for migration/transaction verification. */
export async function activateJournal(db:D1Database,scope:JournalScope,extraGuards:D1PreparedStatement[]=[]){
 const j=await journalState(db,scope);if(!j)fail();if(j.state==='active')return;
 if(j.state!=='verified')fail();const source=await db.prepare('SELECT data_json,updated_at FROM domain_data WHERE account_id=? AND store_key=?').bind(scope.accountId,KEY).first<{data_json:string;updated_at:string}>();if(!source||await sha(source.data_json)!==j.source_hash)throw new StoreWriteConflictError();
 await checkedBatch(db,[...extraGuards,storeCasGuard(db,scope.accountId,[{key:KEY,dataJson:source.data_json,updatedAt:source.updated_at}],new Date().toISOString()),journalGuard(db,scope,j.revision,'verified'),db.prepare("UPDATE stock_journals SET state='active' WHERE account_id=? AND venue_id=?").bind(scope.accountId,scope.venueId),db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(JSON.stringify({format:JOURNAL_FORMAT,revision:j.revision}),new Date().toISOString(),scope.accountId,KEY)]);
}
/** Append a bounded delta within the caller's sale/balance/revenue transaction. */
export async function appendJournalStatements(db:D1Database,scope:JournalScope,revision:number,movements:unknown[]){
 if(movements.length>500)fail();const j=await journalState(db,scope);if(!j||j.state!=='active'||j.revision!==revision)throw new StoreWriteConflictError();
 const statements=[journalGuard(db,scope,revision,'active')];
 for(let i=0;i<movements.length;i++)statements.push(...await movementStatements(db,scope,movements[i],j.next_position-movements.length+1+i));
 statements.push(db.prepare('UPDATE stock_journals SET revision=revision+1,next_position=next_position-? WHERE account_id=? AND venue_id=?').bind(movements.length,scope.accountId,scope.venueId));
 statements.push(db.prepare('UPDATE domain_data SET data_json=?,updated_at=? WHERE account_id=? AND store_key=?').bind(JSON.stringify({format:JOURNAL_FORMAT,revision:revision+1}),new Date().toISOString(),scope.accountId,KEY));
 return statements;
}

/** Latest receipt date per product/warehouse. Keep every tie: the existing JS
 * cost resolver owns locale ordering and unknown-cost semantics. No sale history
 * or legacy backup is loaded. Excessive ties fail closed instead of truncating. */
export async function journalReceiptFacts(db:D1Database,scope:JournalScope,productKeys:string[],asOf:string,expectedRevision:number){
 if(productKeys.length>50||productKeys.some(key=>typeof key!=='string'||!key))fail();
 const j=await journalState(db,scope);if(!j||j.state!=='active'||j.revision!==expectedRevision)throw new StoreWriteConflictError();
 if(!productKeys.length)return [];
 const date=effectiveDate(asOf);
 const rows=await db.prepare(`WITH candidates AS (
 SELECT m.*,DENSE_RANK() OVER(PARTITION BY product_key,warehouse_id ORDER BY effective_date DESC) AS receipt_rank
 FROM stock_journal_movements m WHERE account_id=? AND kind='receipt'
 AND product_key IN (${productKeys.map(()=>'?').join(',')})
 AND (status IS NULL OR status!='cancelled') AND reversed_at IS NULL
 AND effective_date IS NOT NULL ${date?'AND effective_date<=?':''}
 ) SELECT m.position,m.payload_json,m.snapshot_hash,s.snapshot_json FROM candidates m
 LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash
 WHERE m.receipt_rank=1 ORDER BY m.position LIMIT 501`).bind(scope.accountId,...productKeys,...(date?[date]:[])).all<{payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
 if(rows.results.length>500)throw Error('STOCK_JOURNAL_RECEIPT_FACTS_LIMIT');
 const current=await journalState(db,scope);if(!current||current.revision!==expectedRevision||current.state!=='active')throw new StoreWriteConflictError();
 return Promise.all(rows.results.map(hydrate));
}

/** Existing identities stay at their positions. Only changed payloads are updated.
 * Callers still include their original raw marker in the domain CAS transaction. */
export async function updateJournalStatements(db:D1Database,scope:JournalScope,revision:number,values:unknown[]){
 const j=await journalState(db,scope);if(!j||j.state!=='active'||j.revision!==revision)throw new StoreWriteConflictError();
 const unique=new Map<string,Row>();
 const unidentified=values.filter(value=>object(value)&&(typeof value.id!=='string'||!value.id));
 if(unidentified.length){
  const old=await db.prepare('SELECT m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=? AND (m.movement_id IS NULL OR m.movement_id=?)').bind(scope.accountId,'').all<{payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
  const canonical=(value:unknown)=>JSON.stringify(value,(_key,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const known=new Set((await Promise.all(old.results.map(hydrate))).map(canonical));
  if(unidentified.some(value=>!known.has(canonical(value))))fail();
 }
 for(const value of values){if(!object(value))fail();if(typeof value.id!=='string'||!value.id)continue;const prior=unique.get(value.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(value))fail();unique.set(value.id,value);}
 const existing=new Map<string,{position:number;value:Row}>(),ids=[...unique.keys()];
 for(let i=0;i<ids.length;i+=80){const part=ids.slice(i,i+80);
  const rows=await db.prepare(`SELECT m.position,m.movement_id,m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=? AND m.movement_id IN (${part.map(()=>'?').join(',')})`).bind(scope.accountId,...part).all<{position:number;movement_id:string;payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
  for(const row of rows.results)existing.set(row.movement_id,{position:row.position,value:await hydrate(row)});
 }
 const additions:Row[]=[],updates:D1PreparedStatement[]=[];
 for(const [id,value] of unique){const prior=existing.get(id);if(!prior){additions.push(value);continue;}
  // Older planners may project known fields; unknown evidence must survive.
  const merged={...prior.value,...value};
  if(Object.hasOwn(prior.value,'recipeSnapshot')&&JSON.stringify(merged.recipeSnapshot)!==JSON.stringify(prior.value.recipeSnapshot))fail();
  if(JSON.stringify(merged)!==JSON.stringify(prior.value))updates.push(...await movementStatements(db,scope,merged,prior.position,true));
 }
 return [...await appendJournalStatements(db,scope,revision,additions),...updates];
}
/** Closed selector set; identifiers are SQL constants, values always bound. */
export async function journalSelect(db:D1Database,scope:JournalScope,field:'id'|'productKey'|'sourceDocumentId'|'salesBatchId',value:string,limit=20001){
 if(!Number.isSafeInteger(limit)||limit<1||limit>20001)fail();
 const j=await journalState(db,scope);if(!j||j.state!=='active')fail();
 const column={id:'m.movement_id',productKey:'m.product_key',sourceDocumentId:'m.source_document_id',salesBatchId:'m.sales_batch_id'}[field];
 const rows=await db.prepare(`SELECT m.position,m.payload_json,m.snapshot_hash,s.snapshot_json FROM stock_journal_movements m LEFT JOIN stock_recipe_snapshots s ON s.account_id=m.account_id AND s.snapshot_hash=m.snapshot_hash WHERE m.account_id=? AND ${column}=? ORDER BY m.position LIMIT ?`).bind(scope.accountId,value,limit).all<{payload_json:string;snapshot_hash:string|null;snapshot_json:string|null}>();
 const current=await journalState(db,scope);if(!current||current.revision!==j.revision)throw new StoreWriteConflictError();return Promise.all(rows.results.map(hydrate));
}
/** Discard only unactivated staging after a changing legacy source. Canonical
 * legacy data is untouched. An active journal can never be reset by this API. */
export async function restartLegacyJournal(db:D1Database,scope:JournalScope,extraGuards:D1PreparedStatement[]=[]){
 const j=await journalState(db,scope);if(!j)return;if(j.state==='active')fail();
 await checkedBatch(db,[...extraGuards,journalGuard(db,scope,j.revision,j.state,j.copied_count),
 db.prepare('DELETE FROM stock_journal_movements WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM stock_recipe_snapshots WHERE account_id=?').bind(scope.accountId),
 db.prepare('DELETE FROM stock_journals WHERE account_id=? AND venue_id=?').bind(scope.accountId,scope.venueId)]);
}

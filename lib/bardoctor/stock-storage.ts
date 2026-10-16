/** Explicit compatibility boundary. Raw CAS snapshots are never decoded or changed. */
import {journalState,journalPage,journalPosition,appendJournalStatements,updateJournalStatements,JOURNAL_FORMAT,type JournalScope} from './stock-journal';
import {markNormalizedStockHistory,isNormalizedStockHistory} from './stock-retention';
import {StoreWriteConflictError} from './store-cas';
const saleRevisions=new WeakMap<object,number>();
export const STOCK_KEY='bd_stock_movements';
export function stockJournalMarker(value:unknown):value is {format:string;revision:number}{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&(value as {format?:unknown}).format===JOURNAL_FORMAT;
}
export async function stockScope(db:D1Database,accountId:number):Promise<JournalScope>{
 const venue=await db.prepare('SELECT id FROM venues WHERE data_account_id=?').bind(accountId).first<{id:number}>();
 if(!venue)throw Error('STOCK_JOURNAL_NEEDS_REVIEW');return {accountId,venueId:venue.id};
}
/** Full reads are explicit for reconciliation/export; live sales use receipt and document queries. */
export async function readStockHistory(db:D1Database,accountId:number,raw:string|null|undefined,limits:{rows?:number;bytes?:number}={}):Promise<any[]>{
 const value=raw==null?[]:JSON.parse(raw);
 if(Array.isArray(value))return value;
 if(!stockJournalMarker(value)||!Number.isSafeInteger(value.revision))throw Error('STOCK_JOURNAL_NEEDS_REVIEW');
 const scope=await stockScope(db,accountId),items:any[]=[];let cursor:number|null=null,bytes=2;
 do{const page=await journalPage(db,scope,cursor,500,value.revision);items.push(...page.items);bytes+=new TextEncoder().encode(JSON.stringify(page.items)).length;if(items.length>(limits.rows??Infinity)||bytes>(limits.bytes??Infinity))throw Error("STOCK_JOURNAL_READ_LIMIT");cursor=page.next;}while(cursor!==null);
 return markNormalizedStockHistory(items);
}
/** Only actual changed rows are written; historical omissions never delete evidence. */
export async function stockStoreStatements(db:D1Database,accountId:number,key:string,value:unknown,now:string):Promise<D1PreparedStatement[]>{
 if(key!==STOCK_KEY)return [db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(accountId,key,JSON.stringify(value),now)];
 const raw=await db.prepare('SELECT data_json FROM domain_data WHERE account_id=? AND store_key=?').bind(accountId,key).first<{data_json:string}>();
 const stored=raw?JSON.parse(raw.data_json):[];
 if(!stockJournalMarker(stored))return [db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at`).bind(accountId,key,JSON.stringify(value),now)];
 if(!Array.isArray(value))throw Error('STOCK_JOURNAL_NEEDS_REVIEW');
 return updateJournalStatements(db,await stockScope(db,accountId),stored.revision,value);
}
/** Hot-path output contains only receipt facts and a bounded command delta. */
export async function saleStockStatements(db:D1Database,scope:JournalScope,revision:number,before:any[],after:any[]){
 const old=new Map(before.filter(row=>typeof row.id==='string'&&row.id).map(row=>[row.id,JSON.stringify(row)]));
 const unidentified=new Set(before.filter(row=>typeof row.id!=='string'||!row.id).map(row=>JSON.stringify(row)));
 for(const row of after)if(old.has(row.id)&&old.get(row.id)!==JSON.stringify(row))throw Error('STOCK_JOURNAL_SALE_HISTORY_CHANGED');
 const additions=after.filter(row=>typeof row.id==='string'&&row.id?!old.has(row.id):!unidentified.has(JSON.stringify(row)));
 if(additions.some(row=>typeof row.id!=='string'||!row.id))throw Error('STOCK_JOURNAL_SALE_HISTORY_CHANGED');
 const state=await journalState(db,scope);if(!state||state.revision!==revision)throw new StoreWriteConflictError();
 return appendJournalStatements(db,scope,revision,additions);
}
/** A sale reads latest receipt candidates for catalog products, never consumption history. */
export async function readSaleStock(db:D1Database,accountId:number,raw:string|null|undefined,assortment:Record<string,unknown>,asOf:string,documents:string[]=[],valuationAsOf:string=asOf){
 const value=raw==null?[]:JSON.parse(raw);if(Array.isArray(value))return {movements:value,revision:null};
 if(!stockJournalMarker(value))throw Error('STOCK_JOURNAL_NEEDS_REVIEW');
 const {journalReceiptFacts,journalSelect}=await import('./stock-journal');const scope=await stockScope(db,accountId);
 const keys=[...new Set(['nomenclature','stockBalances'].flatMap(key=>Array.isArray(assortment[key])?(assortment[key] as any[]).map(row=>String(row.productKey??row.key??row.id??'')).filter(Boolean):[]))];
 const facts:any[]=[];
 for(const date of new Set([asOf.slice(0,10),valuationAsOf.slice(0,10)]))
  for(let i=0;i<keys.length;i+=50)facts.push(...await journalReceiptFacts(db,scope,keys.slice(i,i+50),date,value.revision));
 for(const id of documents){const rows=await journalSelect(db,scope,'salesBatchId',id,20001);if(rows.length>20000)throw Error('STOCK_JOURNAL_DOCUMENT_LIMIT');facts.push(...rows);}
 const current=await journalState(db,scope);if(!current||current.revision!==value.revision)throw new StoreWriteConflictError();
 const movements=markNormalizedStockHistory([...new Map(facts.map(row=>[journalPosition(row),row])).entries()].sort(([a],[b])=>a-b).map(([,row])=>row));saleRevisions.set(movements,value.revision);return {movements,revision:value.revision};
}

/** Partial sale facts must never masquerade as a complete legacy history array. */
export function stockMovementResponse(before:any[],after:any[],changed=true){
 if(!isNormalizedStockHistory(before))return {stockMovements:after};
 const old=new Map(before.filter(row=>typeof row.id==='string'&&row.id).map(row=>[row.id,JSON.stringify(row)]));
 const unidentified=new Set(before.filter(row=>typeof row.id!=='string'||!row.id).map(row=>JSON.stringify(row)));
 return {stockMovementDelta:{upserts:after.filter(row=>typeof row.id==='string'&&row.id?old.get(row.id)!==JSON.stringify(row):!unidentified.has(JSON.stringify(row))),revision:(saleRevisions.get(before)??0)+(changed?1:0),historyComplete:false,historyEndpoint:'/api/inventory/movements'}};
}

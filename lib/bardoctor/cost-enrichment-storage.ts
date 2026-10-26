import {COST_ENRICHMENT_KEY,validateCostEnrichments,type EnrichmentScope} from './cost-enrichment';
import {stockJournalMarker,stockScope} from './stock-storage';
import {journalSelect,journalState} from './stock-journal';
import {StoreWriteConflictError} from './store-cas';
const rows=(x:unknown):Record<string,any>[]=>Array.isArray(x)?x:[];
/** Only named receipt evidence is loaded; never materialize a whole normalized journal. */
export async function readEnrichmentReceipts(db:D1Database,scope:EnrichmentScope,entries:unknown[],rawStock:string|null|undefined){
 const value=JSON.parse(rawStock??'[]');if(Array.isArray(value))return value;
 if(!stockJournalMarker(value))throw Error('STOCK_JOURNAL_NEEDS_REVIEW');
 const journal=await stockScope(db,scope.dataAccountId);if(journal.venueId!==scope.venueId)throw Error('SOURCE_SCOPE_MISMATCH');
 const ids=[...new Set(rows(entries).flatMap(e=>rows(e.sources).map(s=>String(s.movement?.id??'')).filter(Boolean)))];
 if(ids.length>2000)throw Error('ENRICHMENT_LIMIT');
 const result:Record<string,any>[]=[];
 for(const id of ids){const found=await journalSelect(db,journal,'id',id,3);if(found.length!==1)continue;result.push(found[0]);}
 const state=await journalState(db,journal);if(state?.revision!==value.revision)throw new StoreWriteConflictError();
 return result;
}
export async function readCostEnrichmentState(db:D1Database,scope:EnrichmentScope,events:unknown[],given?:{ledger:string|null;documents:string|null;stock:string|null}){
 if(!given){const result=await db.prepare('SELECT store_key,data_json FROM domain_data WHERE account_id=? AND store_key IN (?,?,?)').bind(scope.dataAccountId,COST_ENRICHMENT_KEY,'bd_purchase_documents','bd_stock_movements').all<{store_key:string;data_json:string}>();const map=new Map(result.results.map(r=>[r.store_key,r.data_json]));given={ledger:map.get(COST_ENRICHMENT_KEY)??null,documents:map.get('bd_purchase_documents')??null,stock:map.get('bd_stock_movements')??null};}
 const entries=rows(JSON.parse(given.ledger??'[]')),eventIds=new Set(rows(events).map(e=>e.id)),selected=entries.filter(e=>eventIds.has(e.saleId));
 if(!selected.length)return [];
 const movements=await readEnrichmentReceipts(db,scope,selected,given.stock);
 return validateCostEnrichments(selected,events,rows(JSON.parse(given.documents??'[]')),movements,scope);
}

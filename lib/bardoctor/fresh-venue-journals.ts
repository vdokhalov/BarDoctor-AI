import {JOURNAL_FORMAT} from './stock-journal';
import {SALES_EVENT_FORMAT} from './sales-event-storage';
// SHA-256 of the canonical empty array; no historical source is being migrated.
const EMPTY_HASH='4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
/** Creation-only statements: caller includes venue creation in this same D1 batch.
 * Never called by normal authentication/bootstrap for an existing account. */
export function freshVenueJournalStatements(db:D1Database,accountId:number,actorId:number,now:string){
 const stock=JSON.stringify({format:JOURNAL_FORMAT,revision:0}),sales=JSON.stringify({format:SALES_EVENT_FORMAT,revision:0});
 return [
  db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__fresh_journal_guard__',NULL WHERE NOT (
   EXISTS(SELECT 1 FROM venues WHERE data_account_id=? AND created_by_account_id=? AND status='active') AND (
   (NOT EXISTS(SELECT 1 FROM stock_journals WHERE account_id=?) AND NOT EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=?) AND NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=? AND store_key IN ('bd_stock_movements','bd_sales_events_v1')))
   OR EXISTS(SELECT 1 FROM stock_journals s JOIN sales_event_journals e ON e.account_id=s.account_id AND e.venue_id=s.venue_id JOIN venues v ON v.id=s.venue_id AND v.data_account_id=s.account_id JOIN domain_data ds ON ds.account_id=s.account_id AND ds.store_key='bd_stock_movements' JOIN domain_data de ON de.account_id=e.account_id AND de.store_key='bd_sales_events_v1' WHERE s.account_id=? AND s.state='active' AND e.state='active' AND json_extract(ds.data_json,'$.format')=? AND json_extract(ds.data_json,'$.revision')=s.revision AND json_extract(de.data_json,'$.format')=? AND json_extract(de.data_json,'$.revision')=e.revision)))`).bind(accountId,accountId,actorId,accountId,accountId,accountId,accountId,JOURNAL_FORMAT,SALES_EVENT_FORMAT),
  db.prepare(`INSERT INTO stock_journals(account_id,venue_id,state,legacy_json,source_hash,source_count) SELECT ?,id,'active','[]',?,0 FROM venues WHERE data_account_id=? AND NOT EXISTS(SELECT 1 FROM stock_journals WHERE account_id=?)`).bind(accountId,EMPTY_HASH,accountId,accountId),
  db.prepare(`INSERT INTO sales_event_journals(account_id,venue_id,state,source_hash,source_count) SELECT ?,id,'active',?,0 FROM venues WHERE data_account_id=? AND NOT EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=?)`).bind(accountId,EMPTY_HASH,accountId,accountId),
  ...[['bd_stock_movements',stock],['bd_sales_events_v1',sales]].map(([key,value])=>db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json,updated_at) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=? AND store_key=?)`).bind(accountId,key,value,now,accountId,key)),
 ];
}

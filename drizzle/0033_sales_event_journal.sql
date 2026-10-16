-- Installation does not activate migration. Legacy store remains authoritative until verified cutover.
CREATE TABLE IF NOT EXISTS sales_event_journals (
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, venue_id INTEGER NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
 state TEXT NOT NULL CHECK(state IN ('copying','verified','active')), source_hash TEXT NOT NULL,
 source_count INTEGER NOT NULL, copied_count INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0,
 next_position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sales_event_records (
 account_id INTEGER NOT NULL REFERENCES sales_event_journals(account_id) ON DELETE CASCADE, event_id TEXT NOT NULL,
 position INTEGER NOT NULL, external_id TEXT NOT NULL, source TEXT NOT NULL, business_date TEXT NOT NULL,
 revenue_row_id TEXT NOT NULL, order_id TEXT, actor_id INTEGER, order_actor_id INTEGER, fingerprint TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0 CHECK(version IN (0,1)), payload_hash TEXT NOT NULL, chunk_count INTEGER NOT NULL,
 PRIMARY KEY(account_id,event_id), UNIQUE(account_id,position), UNIQUE(account_id,source,external_id)
);
CREATE INDEX IF NOT EXISTS sales_event_date ON sales_event_records(account_id,business_date,position);
CREATE INDEX IF NOT EXISTS sales_event_shift ON sales_event_records(account_id,revenue_row_id,position);
CREATE INDEX IF NOT EXISTS sales_event_order ON sales_event_records(account_id,order_id);
CREATE TABLE IF NOT EXISTS sales_event_chunks (
 account_id INTEGER NOT NULL, event_id TEXT NOT NULL, version INTEGER NOT NULL, ordinal INTEGER NOT NULL,
 payload TEXT NOT NULL, PRIMARY KEY(account_id,event_id,version,ordinal),
 FOREIGN KEY(account_id,event_id) REFERENCES sales_event_records(account_id,event_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sales_event_reversals (
 account_id INTEGER NOT NULL, event_id TEXT NOT NULL, reversed_at TEXT NOT NULL, original_hash TEXT NOT NULL,
 PRIMARY KEY(account_id,event_id), FOREIGN KEY(account_id,event_id) REFERENCES sales_event_records(account_id,event_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS sales_event_legacy_update BEFORE UPDATE OF data_json ON domain_data
 WHEN NEW.store_key='bd_sales_events_v1' AND EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=NEW.account_id AND state='active')
 AND (json_valid(NEW.data_json)=0 OR json_extract(NEW.data_json,'$.format') IS NOT 'bardoctor-sales-events-v1'
 OR json_extract(NEW.data_json,'$.revision') IS NOT (SELECT revision FROM sales_event_journals WHERE account_id=NEW.account_id))
 BEGIN SELECT RAISE(ABORT,'SALES_EVENT_LEGACY_WRITE_FORBIDDEN'); END;
CREATE TRIGGER IF NOT EXISTS sales_event_legacy_insert BEFORE INSERT ON domain_data
 WHEN NEW.store_key='bd_sales_events_v1' AND NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key)
 AND EXISTS(SELECT 1 FROM sales_event_journals WHERE account_id=NEW.account_id AND state='active')
 AND (json_valid(NEW.data_json)=0 OR json_extract(NEW.data_json,'$.format') IS NOT 'bardoctor-sales-events-v1'
 OR json_extract(NEW.data_json,'$.revision') IS NOT (SELECT revision FROM sales_event_journals WHERE account_id=NEW.account_id))
 BEGIN SELECT RAISE(ABORT,'SALES_EVENT_LEGACY_WRITE_FORBIDDEN'); END;

CREATE TABLE IF NOT EXISTS sales_event_totals (
 account_id INTEGER NOT NULL REFERENCES sales_event_journals(account_id) ON DELETE CASCADE,
 revenue_row_id TEXT NOT NULL, currency TEXT NOT NULL, cents INTEGER NOT NULL, receipts INTEGER NOT NULL,
 PRIMARY KEY(account_id,revenue_row_id), CHECK(cents>=0 AND receipts>=0)
);

CREATE INDEX IF NOT EXISTS sales_event_external ON sales_event_records(account_id,external_id,position);
CREATE INDEX IF NOT EXISTS sales_event_actor ON sales_event_records(account_id,actor_id,position);
CREATE INDEX IF NOT EXISTS sales_event_order_actor ON sales_event_records(account_id,order_actor_id,position);

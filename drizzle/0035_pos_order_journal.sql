-- Inactive until an explicitly backed-up, verified migration activates this account.
CREATE TABLE IF NOT EXISTS pos_order_journals (
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 venue_id INTEGER NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
 state TEXT NOT NULL CHECK(state IN ('copying','verified','active')),
 source_hash TEXT NOT NULL, source_count INTEGER NOT NULL, copied_count INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0, next_position INTEGER NOT NULL DEFAULT 0,
 backup_key TEXT NOT NULL, backup_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pos_order_records (
 account_id INTEGER NOT NULL REFERENCES pos_order_journals(account_id) ON DELETE CASCADE,
 order_id TEXT NOT NULL, position INTEGER NOT NULL, revision INTEGER NOT NULL,
 status TEXT NOT NULL, shift_id TEXT NOT NULL, payload_hash TEXT NOT NULL,
 PRIMARY KEY(account_id,order_id), UNIQUE(account_id,position)
);
CREATE INDEX IF NOT EXISTS pos_order_status ON pos_order_records(account_id,status,position);
CREATE INDEX IF NOT EXISTS pos_order_shift ON pos_order_records(account_id,shift_id,position);
-- Immutable core revisions, individual operations and individual tickets; large components are chunked.
CREATE TABLE IF NOT EXISTS pos_order_components (
 account_id INTEGER NOT NULL, order_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('core','operation','ticket')),
 item_id TEXT NOT NULL, position INTEGER NOT NULL, payload_hash TEXT NOT NULL, chunk_count INTEGER NOT NULL,
 PRIMARY KEY(account_id,kind,item_id), UNIQUE(account_id,order_id,kind,position),
 FOREIGN KEY(account_id,order_id) REFERENCES pos_order_records(account_id,order_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pos_order_chunks (
 account_id INTEGER NOT NULL, kind TEXT NOT NULL, item_id TEXT NOT NULL, ordinal INTEGER NOT NULL,
 payload TEXT NOT NULL CHECK(length(CAST(payload AS BLOB))<=128000),
 PRIMARY KEY(account_id,kind,item_id,ordinal),
 FOREIGN KEY(account_id,kind,item_id) REFERENCES pos_order_components(account_id,kind,item_id) ON DELETE CASCADE
);
CREATE TRIGGER IF NOT EXISTS pos_order_legacy_update BEFORE UPDATE OF data_json ON domain_data
 WHEN NEW.store_key='bd_pos_orders_v1' AND EXISTS(SELECT 1 FROM pos_order_journals WHERE account_id=NEW.account_id AND state='active')
 AND (json_valid(NEW.data_json)=0 OR json_extract(NEW.data_json,'$.format') IS NOT 'bardoctor-pos-orders-v1'
 OR json_extract(NEW.data_json,'$.revision') IS NOT (SELECT revision FROM pos_order_journals WHERE account_id=NEW.account_id))
 BEGIN SELECT RAISE(ABORT,'POS_ORDER_LEGACY_WRITE_FORBIDDEN'); END;
CREATE TRIGGER IF NOT EXISTS pos_order_legacy_insert BEFORE INSERT ON domain_data
 WHEN NEW.store_key='bd_pos_orders_v1' AND NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key)
 AND EXISTS(SELECT 1 FROM pos_order_journals WHERE account_id=NEW.account_id AND state='active')
 AND (json_valid(NEW.data_json)=0 OR json_extract(NEW.data_json,'$.format') IS NOT 'bardoctor-pos-orders-v1'
 OR json_extract(NEW.data_json,'$.revision') IS NOT (SELECT revision FROM pos_order_journals WHERE account_id=NEW.account_id))
 BEGIN SELECT RAISE(ABORT,'POS_ORDER_LEGACY_WRITE_FORBIDDEN'); END;

-- Canonical journal rows. No data is migrated by schema installation.
CREATE TABLE stock_journals (
 account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
 venue_id INTEGER NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
 state TEXT NOT NULL CHECK(state IN ('copying','verified','active')),
 legacy_json TEXT NOT NULL,
 source_hash TEXT NOT NULL,
 source_count INTEGER NOT NULL,
 copied_count INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0,
 next_position INTEGER NOT NULL DEFAULT -1,
 CHECK(source_count>=0 AND copied_count>=0 AND copied_count<=source_count)
);
--> statement-breakpoint
CREATE TABLE stock_recipe_snapshots (
 account_id INTEGER NOT NULL REFERENCES stock_journals(account_id) ON DELETE CASCADE,
 snapshot_hash TEXT NOT NULL,
 snapshot_json TEXT NOT NULL,
 PRIMARY KEY(account_id,snapshot_hash)
);
--> statement-breakpoint
CREATE TABLE stock_journal_movements (
 account_id INTEGER NOT NULL REFERENCES stock_journals(account_id) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 movement_id TEXT,
 idempotency_key TEXT,
 product_key TEXT,
 warehouse_id TEXT,
 kind TEXT,
 effective_date TEXT,
 created_at TEXT,
 source_document_id TEXT,
 source_line_id TEXT,
 sales_batch_id TEXT,
 status TEXT,
 reversed_at TEXT,
 payload_json TEXT NOT NULL,
 snapshot_hash TEXT,
 PRIMARY KEY(account_id,position),
 FOREIGN KEY(account_id,snapshot_hash) REFERENCES stock_recipe_snapshots(account_id,snapshot_hash)
);
--> statement-breakpoint
CREATE UNIQUE INDEX stock_journal_id_uq ON stock_journal_movements(account_id,movement_id) WHERE movement_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX stock_journal_idempotency_uq ON stock_journal_movements(account_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
--> statement-breakpoint
CREATE INDEX stock_journal_product_receipts ON stock_journal_movements(account_id,kind,product_key,warehouse_id,effective_date DESC,created_at DESC);
--> statement-breakpoint
CREATE INDEX stock_journal_document ON stock_journal_movements(account_id,source_document_id,source_line_id);
--> statement-breakpoint
-- Legacy import/maintenance writers must never replace an active journal marker.
CREATE TRIGGER stock_journal_marker_update BEFORE UPDATE OF data_json ON domain_data
WHEN NEW.store_key='bd_stock_movements' AND EXISTS(SELECT 1 FROM stock_journals WHERE account_id=NEW.account_id AND state='active')
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_journals WHERE account_id=NEW.account_id AND state='active'
 AND CASE WHEN json_valid(NEW.data_json) THEN json_extract(NEW.data_json,'$.format')='bardoctor-stock-journal-v1' AND json_extract(NEW.data_json,'$.revision')=revision ELSE 0 END)
 THEN RAISE(ABORT,'STOCK_JOURNAL_LEGACY_WRITE_FORBIDDEN') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_journal_marker_insert BEFORE INSERT ON domain_data
WHEN NEW.store_key='bd_stock_movements' AND NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key) AND EXISTS(SELECT 1 FROM stock_journals WHERE account_id=NEW.account_id AND state='active')
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM stock_journals WHERE account_id=NEW.account_id AND state='active'
 AND CASE WHEN json_valid(NEW.data_json) THEN json_extract(NEW.data_json,'$.format')='bardoctor-stock-journal-v1' AND json_extract(NEW.data_json,'$.revision')=revision ELSE 0 END)
 THEN RAISE(ABORT,'STOCK_JOURNAL_LEGACY_WRITE_FORBIDDEN') END;
END;

--> statement-breakpoint
CREATE INDEX stock_journal_sale_batch ON stock_journal_movements(account_id,sales_batch_id,position);

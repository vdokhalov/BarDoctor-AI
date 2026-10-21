-- Read-only period selection for Finance; no journal rows/markers are changed.
CREATE INDEX IF NOT EXISTS stock_journal_period ON stock_journal_movements(account_id,effective_date,position);

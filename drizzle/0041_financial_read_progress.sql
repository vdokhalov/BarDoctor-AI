-- Derived, disposable read progress only. No sales, inventory or captures change.
CREATE TABLE IF NOT EXISTS financial_read_jobs (
 id TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 source_revision TEXT NOT NULL, start_date TEXT NOT NULL, end_exclusive TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('EVENTS','STOCK','READY')),
 result_json TEXT, result_hash TEXT, progress_json TEXT,
 cursor INTEGER, revision INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS financial_read_scope ON financial_read_jobs(account_id,venue_id,start_date,end_exclusive);
CREATE TABLE IF NOT EXISTS financial_read_events (
 job_id TEXT NOT NULL REFERENCES financial_read_jobs(id) ON DELETE CASCADE,
 event_id TEXT NOT NULL, batch_id TEXT NOT NULL, revenue_id TEXT NOT NULL,
 business_date TEXT NOT NULL, status TEXT NOT NULL, currency TEXT, source TEXT,
 revenue REAL, accounting_revenue REAL, cost REAL, cost_reason TEXT, linked INTEGER NOT NULL,
 accepted_at TEXT, payments_json TEXT NOT NULL,
 PRIMARY KEY(job_id,event_id)
);
CREATE INDEX IF NOT EXISTS financial_read_event_batches ON financial_read_events(job_id,batch_id,status,linked);
CREATE INDEX IF NOT EXISTS financial_read_event_revenues ON financial_read_events(job_id,revenue_id,business_date);
CREATE TABLE IF NOT EXISTS financial_read_movements (
 job_id TEXT NOT NULL REFERENCES financial_read_jobs(id) ON DELETE CASCADE,
 position INTEGER NOT NULL, movement_id TEXT, batch_id TEXT, business_date TEXT,
 kind TEXT, active INTEGER NOT NULL, amount REAL, known INTEGER NOT NULL,
 PRIMARY KEY(job_id,position)
);
CREATE INDEX IF NOT EXISTS financial_read_movement_batches ON financial_read_movements(job_id,batch_id);

CREATE INDEX IF NOT EXISTS financial_read_movement_ids ON financial_read_movements(job_id,movement_id);

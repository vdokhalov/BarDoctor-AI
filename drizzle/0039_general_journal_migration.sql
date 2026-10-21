-- Generalize the existing operator runner; preserve every run, backup pointer and audit row.
DROP TRIGGER journal_pause_domain_update;
DROP TRIGGER journal_pause_domain_insert;
DROP TRIGGER journal_pause_domain_delete;
DROP TRIGGER journal_pause_profile;
DROP TRIGGER journal_pause_venue;
DROP TRIGGER journal_pause_venue_delete;
CREATE TABLE journal_migration_runs_next (
 venue_id INTEGER PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
 account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE, run_id TEXT NOT NULL UNIQUE,
 phase TEXT NOT NULL, paused INTEGER NOT NULL DEFAULT 0 CHECK(paused IN (0,1)),
 backup_key TEXT NOT NULL, backup_hash TEXT NOT NULL, created_at TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE journal_migration_log_next (
 run_id TEXT NOT NULL REFERENCES journal_migration_runs_next(run_id) ON DELETE CASCADE, sequence INTEGER NOT NULL,
 phase TEXT NOT NULL, actor_id INTEGER NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(run_id,sequence)
);

INSERT INTO journal_migration_runs_next SELECT * FROM journal_migration_runs;
INSERT INTO journal_migration_log_next SELECT * FROM journal_migration_log;
DROP TABLE journal_migration_log;
DROP TABLE journal_migration_runs;
ALTER TABLE journal_migration_runs_next RENAME TO journal_migration_runs;
ALTER TABLE journal_migration_log_next RENAME TO journal_migration_log;
CREATE TRIGGER journal_pause_domain_update BEFORE UPDATE ON domain_data
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE account_id=OLD.account_id AND paused=1)
 AND NOT COALESCE((
 NEW.account_id=OLD.account_id AND NEW.store_key=OLD.store_key AND json_valid(NEW.data_json)
 AND json_type(OLD.data_json)='array' AND json_extract(NEW.data_json,'$.revision')=0 AND (
 (NEW.store_key='bd_stock_movements' AND json_extract(NEW.data_json,'$.format')='bardoctor-stock-journal-v1'
 AND EXISTS(SELECT 1 FROM journal_migration_runs r JOIN stock_journals j ON j.account_id=r.account_id WHERE r.account_id=OLD.account_id AND r.phase='VERIFIED' AND j.state='active' AND j.revision=0))
 OR (NEW.store_key='bd_sales_events_v1' AND json_extract(NEW.data_json,'$.format')='bardoctor-sales-events-v1'
 AND EXISTS(SELECT 1 FROM journal_migration_runs r JOIN sales_event_journals j ON j.account_id=r.account_id WHERE r.account_id=OLD.account_id AND r.phase='STOCK_ACTIVE' AND j.state='active' AND j.revision=0)))),0)
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;
CREATE TRIGGER journal_pause_domain_insert BEFORE INSERT ON domain_data
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE account_id=NEW.account_id AND paused=1)
 AND NOT COALESCE((NEW.store_key='bd_sales_events_v1' AND json_valid(NEW.data_json)
 AND json_extract(NEW.data_json,'$.format')='bardoctor-sales-events-v1' AND json_extract(NEW.data_json,'$.revision')=0
 AND EXISTS(SELECT 1 FROM journal_migration_runs r JOIN sales_event_journals j ON j.account_id=r.account_id WHERE r.account_id=NEW.account_id AND r.phase='STOCK_ACTIVE' AND j.state='active' AND j.revision=0)
 AND NOT EXISTS(SELECT 1 FROM domain_data WHERE account_id=NEW.account_id AND store_key=NEW.store_key AND json_type(data_json)!='array')),0)
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;
CREATE TRIGGER journal_pause_domain_delete BEFORE DELETE ON domain_data
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE account_id=OLD.account_id AND paused=1)
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;
CREATE TRIGGER journal_pause_profile BEFORE UPDATE OF restaurant_json ON accounts
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE account_id=OLD.id AND paused=1)
 AND NEW.restaurant_json IS NOT OLD.restaurant_json
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;
CREATE TRIGGER journal_pause_venue BEFORE UPDATE OF data_account_id,workspace_id,status ON venues
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE venue_id=OLD.id AND paused=1)
 AND (NEW.data_account_id!=OLD.data_account_id OR NEW.workspace_id!=OLD.workspace_id OR NEW.status!=OLD.status)
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;

CREATE TRIGGER journal_pause_venue_delete BEFORE DELETE ON venues
 WHEN EXISTS(SELECT 1 FROM journal_migration_runs WHERE venue_id=OLD.id AND paused=1)
 BEGIN SELECT RAISE(ABORT,'JOURNAL_MIGRATION_PAUSED'); END;

-- Preserve the independent QA backup pause guards.
CREATE TRIGGER qa_pos_pause_journal_migration_runs_insert BEFORE INSERT ON journal_migration_runs WHEN NEW.venue_id=3389 AND EXISTS(SELECT 1 FROM qa_pos_backup_runs WHERE paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;
CREATE TRIGGER qa_pos_pause_journal_migration_runs_update BEFORE UPDATE ON journal_migration_runs WHEN (OLD.venue_id=3389 OR NEW.venue_id=3389) AND EXISTS(SELECT 1 FROM qa_pos_backup_runs WHERE paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;
CREATE TRIGGER qa_pos_pause_journal_migration_runs_delete BEFORE DELETE ON journal_migration_runs WHEN OLD.venue_id=3389 AND EXISTS(SELECT 1 FROM qa_pos_backup_runs WHERE paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;
CREATE TRIGGER qa_pos_pause_old_log BEFORE INSERT ON journal_migration_log WHEN EXISTS(SELECT 1 FROM journal_migration_runs j JOIN qa_pos_backup_runs q ON q.account_id=j.account_id WHERE j.run_id=NEW.run_id AND q.paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;
CREATE TRIGGER qa_pos_pause_old_log_update BEFORE UPDATE ON journal_migration_log WHEN EXISTS(SELECT 1 FROM journal_migration_runs j JOIN qa_pos_backup_runs q ON q.account_id=j.account_id WHERE j.run_id=OLD.run_id AND q.paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;
CREATE TRIGGER qa_pos_pause_old_log_delete BEFORE DELETE ON journal_migration_log WHEN EXISTS(SELECT 1 FROM journal_migration_runs j JOIN qa_pos_backup_runs q ON q.account_id=j.account_id WHERE j.run_id=OLD.run_id AND q.paused=1) BEGIN SELECT RAISE(ABORT,'QA_POS_BACKUP_PAUSED'); END;

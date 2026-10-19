-- Metadata only: progress is committed with the existing run revision guard.
ALTER TABLE qa_pos_backup_runs ADD COLUMN progress_json TEXT;

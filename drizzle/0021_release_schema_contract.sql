CREATE TABLE `invoice_recognition_jobs` (
	`account_id` integer NOT NULL,
	`venue_id` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`result_json` text,
	`metrics_json` text,
	`issues_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`account_id`, `venue_id`, `fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `invoice_recognition_jobs_updated_idx` ON `invoice_recognition_jobs` (`updated_at`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `avatar_id` text;

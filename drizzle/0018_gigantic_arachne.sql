CREATE TABLE `ai_usage_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`actor_account_id` integer,
	`venue_id` integer,
	`request_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`feature` text DEFAULT 'other' NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_tokens` integer,
	`status` text NOT NULL,
	`latency_ms` integer,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_usage_events_request_uq` ON `ai_usage_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_created_idx` ON `ai_usage_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_venue_created_idx` ON `ai_usage_events` (`venue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_actor_created_idx` ON `ai_usage_events` (`actor_account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_feature_created_idx` ON `ai_usage_events` (`feature`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_job_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `notification_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_job_events_job_created_idx` ON `notification_job_events` (`job_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`venue_id` integer,
	`source_type` text DEFAULT 'system' NOT NULL,
	`source_id` text,
	`category` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`target_url` text DEFAULT '/home' NOT NULL,
	`target_at` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider_message_id` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`leased_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_jobs_account_dedupe_uq` ON `notification_jobs` (`account_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notification_jobs_dispatch_idx` ON `notification_jobs` (`status`,`target_at`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `notification_jobs_source_idx` ON `notification_jobs` (`account_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `notification_jobs_venue_status_idx` ON `notification_jobs` (`venue_id`,`status`);
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chatgpt_email` text NOT NULL,
	`app_email` text NOT NULL,
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text,
	`phone` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`restaurant_json` text,
	`competitors_json` text,
	`review_sources_json` text,
	`migration_status` text DEFAULT 'local' NOT NULL,
	`migration_summary_json` text,
	`imported_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_chatgpt_email_uq` ON `accounts` (`chatgpt_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_app_email_uq` ON `accounts` (`app_email`);--> statement-breakpoint
CREATE TABLE `domain_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`store_key` text NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_data_account_key_uq` ON `domain_data` (`account_id`,`store_key`);--> statement-breakpoint
CREATE INDEX `domain_data_account_id_idx` ON `domain_data` (`account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_account_id_idx` ON `sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);
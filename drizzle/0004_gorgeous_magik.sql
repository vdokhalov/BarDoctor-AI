CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`store_key` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text,
	`entity_label` text,
	`month_key` text,
	`before_json` text,
	`after_json` text,
	`changed_fields_json` text,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_log_account_created_idx` ON `audit_log` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_account_store_idx` ON `audit_log` (`account_id`,`store_key`);--> statement-breakpoint
CREATE INDEX `audit_log_account_month_idx` ON `audit_log` (`account_id`,`month_key`);
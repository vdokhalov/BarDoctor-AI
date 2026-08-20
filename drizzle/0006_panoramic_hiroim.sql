CREATE TABLE `notification_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`category` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`target_url` text DEFAULT '/home' NOT NULL,
	`status` text NOT NULL,
	`provider_message_id` text,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_deliveries_account_dedupe_uq` ON `notification_deliveries` (`account_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_account_created_idx` ON `notification_deliveries` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`shift_alerts` integer DEFAULT true NOT NULL,
	`task_alerts` integer DEFAULT true NOT NULL,
	`equipment_alerts` integer DEFAULT true NOT NULL,
	`calendar_alerts` integer DEFAULT true NOT NULL,
	`finance_alerts` integer DEFAULT true NOT NULL,
	`quiet_start` text DEFAULT '23:00' NOT NULL,
	`quiet_end` text DEFAULT '08:00' NOT NULL,
	`timezone` text DEFAULT 'Europe/Chisinau' NOT NULL,
	`last_test_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);

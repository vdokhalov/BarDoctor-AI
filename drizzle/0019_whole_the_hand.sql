CREATE TABLE `notification_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`device_key` text NOT NULL,
	`subscription_id` text,
	`permission` text DEFAULT 'default' NOT NULL,
	`opted_in` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_devices_account_device_uq` ON `notification_devices` (`account_id`,`device_key`);--> statement-breakpoint
CREATE INDEX `notification_devices_active_seen_idx` ON `notification_devices` (`active`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `notification_devices_subscription_idx` ON `notification_devices` (`subscription_id`);
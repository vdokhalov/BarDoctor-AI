CREATE TABLE `google_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`linked_url` text,
	`place_id` text,
	`cid` text,
	`lat` text,
	`lng` text,
	`location_name` text,
	`google_account_id` text,
	`google_location_id` text,
	`access_token_encrypted` text,
	`refresh_token_encrypted` text,
	`token_expires_at` text,
	`pending_locations_json` text,
	`last_synced_at` text,
	`last_sync_error` text,
	`auto_sync_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_connections_account_id_uq` ON `google_connections` (`account_id`);--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` integer NOT NULL,
	`redirect_uri` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_states_expires_at_idx` ON `oauth_states` (`expires_at`);--> statement-breakpoint
CREATE TABLE `review_source_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`source` text NOT NULL,
	`event` text NOT NULL,
	`detail` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_source_events_account_source_idx` ON `review_source_events` (`account_id`,`source`);
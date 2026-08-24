CREATE TABLE `venue_migration_exports` (
	`export_id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`source_commit` text NOT NULL,
	`schema_version` text NOT NULL,
	`checksum` text NOT NULL,
	`payload_json` text NOT NULL,
	`record_counts_json` text NOT NULL,
	`generated_at` text NOT NULL,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `venue_migration_exports_venue_created_idx` ON `venue_migration_exports` (`venue_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_migration_exports_venue_checksum_uq` ON `venue_migration_exports` (`venue_id`,`checksum`);--> statement-breakpoint
CREATE TRIGGER `venue_migration_exports_no_update`
BEFORE UPDATE ON `venue_migration_exports`
BEGIN
	SELECT RAISE(ABORT, 'venue migration exports are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `venue_migration_exports_no_delete`
BEFORE DELETE ON `venue_migration_exports`
BEGIN
	SELECT RAISE(ABORT, 'venue migration exports are immutable');
END;--> statement-breakpoint
CREATE TABLE `venue_migration_operations` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`export_id` text NOT NULL,
	`source_commit` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`plan_json` text NOT NULL,
	`affected_store_keys_json` text NOT NULL,
	`before_checksum` text NOT NULL,
	`after_checksum` text,
	`cutover_at` text,
	`rollback_at` text,
	`failure_reason` text,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`export_id`) REFERENCES `venue_migration_exports`(`export_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `venue_migration_operations_venue_created_idx` ON `venue_migration_operations` (`venue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `venue_migration_operations_status_idx` ON `venue_migration_operations` (`status`);

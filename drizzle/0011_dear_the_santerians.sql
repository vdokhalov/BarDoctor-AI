CREATE TABLE `integration_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`provider` text NOT NULL,
	`adapter_key` text NOT NULL,
	`display_name` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'requires_setup' NOT NULL,
	`capabilities_json` text DEFAULT '[]' NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`cursor_json` text,
	`last_sync_at` text,
	`last_success_at` text,
	`last_error` text,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_connections_tenant_idx` ON `integration_connections` (`venue_id`,`data_account_id`);--> statement-breakpoint
CREATE INDEX `integration_connections_tenant_status_idx` ON `integration_connections` (`venue_id`,`data_account_id`,`status`);--> statement-breakpoint
CREATE TABLE `integration_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`key` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`rotated_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_credentials_connection_key_uq` ON `integration_credentials` (`venue_id`,`data_account_id`,`connection_id`,`key`);--> statement-breakpoint
CREATE INDEX `integration_credentials_tenant_idx` ON `integration_credentials` (`venue_id`,`data_account_id`);--> statement-breakpoint
CREATE TABLE `integration_entity_links` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`internal_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`external_updated_at` text,
	`sync_status` text DEFAULT 'success' NOT NULL,
	`last_sync_run_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_entity_links_external_uq` ON `integration_entity_links` (`venue_id`,`data_account_id`,`connection_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `integration_entity_links_internal_idx` ON `integration_entity_links` (`venue_id`,`data_account_id`,`entity_type`,`internal_id`);--> statement-breakpoint
CREATE TABLE `integration_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`external_name` text NOT NULL,
	`external_unit` text,
	`internal_id` text,
	`internal_name` text,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`external_payload_json` text,
	`confirmed_by_account_id` integer,
	`confirmed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`confirmed_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_mappings_external_uq` ON `integration_mappings` (`venue_id`,`data_account_id`,`connection_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `integration_mappings_tenant_status_idx` ON `integration_mappings` (`venue_id`,`data_account_id`,`status`);--> statement-breakpoint
CREATE TABLE `integration_sync_items` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`run_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`internal_id` text,
	`status` text NOT NULL,
	`payload_hash` text NOT NULL,
	`payload_json` text NOT NULL,
	`error_code` text,
	`error_message` text,
	`mapping_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `integration_sync_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_sync_items_run_external_uq` ON `integration_sync_items` (`run_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `integration_sync_items_tenant_status_idx` ON `integration_sync_items` (`venue_id`,`data_account_id`,`status`);--> statement-breakpoint
CREATE TABLE `integration_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`trigger` text NOT NULL,
	`data_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source_name` text,
	`received_count` integer DEFAULT 0 NOT NULL,
	`created_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`mapping_issue_count` integer DEFAULT 0 NOT NULL,
	`errors_json` text DEFAULT '[]' NOT NULL,
	`retry_of_run_id` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_sync_runs_tenant_created_idx` ON `integration_sync_runs` (`venue_id`,`data_account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `integration_sync_runs_connection_status_idx` ON `integration_sync_runs` (`connection_id`,`status`);
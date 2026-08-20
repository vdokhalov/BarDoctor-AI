CREATE TABLE `integration_field_mapping_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`name` text NOT NULL,
	`file_kind` text NOT NULL,
	`header_signature` text NOT NULL,
	`mapping_json` text NOT NULL,
	`defaults_json` text DEFAULT '{}' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_field_templates_signature_uq` ON `integration_field_mapping_templates` (`venue_id`,`data_account_id`,`connection_id`,`entity_type`,`header_signature`);--> statement-breakpoint
CREATE INDEX `integration_field_templates_tenant_idx` ON `integration_field_mapping_templates` (`venue_id`,`data_account_id`);--> statement-breakpoint
CREATE TABLE `integration_ingress_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`delivery_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`run_id` text,
	`cursor_json` text,
	`error` text,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `integration_sync_runs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_ingress_deliveries_external_uq` ON `integration_ingress_deliveries` (`venue_id`,`data_account_id`,`connection_id`,`delivery_id`);--> statement-breakpoint
CREATE INDEX `integration_ingress_deliveries_tenant_status_idx` ON `integration_ingress_deliveries` (`venue_id`,`data_account_id`,`status`);--> statement-breakpoint
CREATE TABLE `integration_ingress_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`label` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`scopes_json` text DEFAULT '[]' NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`revoked_at` text,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_ingress_tokens_hash_uq` ON `integration_ingress_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `integration_ingress_tokens_connection_idx` ON `integration_ingress_tokens` (`venue_id`,`data_account_id`,`connection_id`);--> statement-breakpoint
DROP INDEX `integration_connections_source_uq`;--> statement-breakpoint
ALTER TABLE `integration_connections` ADD `source_key` text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE `integration_connections` ADD `source_type` text DEFAULT 'file_import' NOT NULL;--> statement-breakpoint
ALTER TABLE `integration_connections` ADD `sync_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `integration_connections`
SET `source_key` = lower(replace(`provider`, ' ', '-')) || ':' || `channel`;--> statement-breakpoint
CREATE UNIQUE INDEX `integration_connections_source_uq` ON `integration_connections` (`venue_id`,`data_account_id`,`adapter_key`,`source_key`);
--> statement-breakpoint
CREATE TRIGGER `integration_connections_tenant_guard`
BEFORE INSERT ON `integration_connections`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `venues` v
  WHERE v.`id` = NEW.`venue_id` AND v.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_connections_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id` ON `integration_connections`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `venues` v
  WHERE v.`id` = NEW.`venue_id` AND v.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_credentials_tenant_guard`
BEFORE INSERT ON `integration_credentials`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_credentials_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_credentials`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_mappings_tenant_guard`
BEFORE INSERT ON `integration_mappings`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_mappings_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_mappings`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_entity_links_tenant_guard`
BEFORE INSERT ON `integration_entity_links`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_entity_links_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_entity_links`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_sync_runs_tenant_guard`
BEFORE INSERT ON `integration_sync_runs`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_sync_runs_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_sync_runs`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_sync_items_tenant_guard`
BEFORE INSERT ON `integration_sync_items`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_sync_runs` r
  WHERE r.`id` = NEW.`run_id`
    AND r.`connection_id` = NEW.`connection_id`
    AND r.`venue_id` = NEW.`venue_id`
    AND r.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_sync_items_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id`, `run_id` ON `integration_sync_items`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_sync_runs` r
  WHERE r.`id` = NEW.`run_id`
    AND r.`connection_id` = NEW.`connection_id`
    AND r.`venue_id` = NEW.`venue_id`
    AND r.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_field_templates_tenant_guard`
BEFORE INSERT ON `integration_field_mapping_templates`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_field_templates_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_field_mapping_templates`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_ingress_tokens_tenant_guard`
BEFORE INSERT ON `integration_ingress_tokens`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_ingress_tokens_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_ingress_tokens`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_ingress_deliveries_tenant_guard`
BEFORE INSERT ON `integration_ingress_deliveries`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;
--> statement-breakpoint
CREATE TRIGGER `integration_ingress_deliveries_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_ingress_deliveries`
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM `integration_connections` c
  WHERE c.`id` = NEW.`connection_id`
    AND c.`venue_id` = NEW.`venue_id`
    AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;

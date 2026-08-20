CREATE TABLE `integration_connector_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` integer NOT NULL,
	`data_account_id` integer NOT NULL,
	`connection_id` text NOT NULL,
	`machine_id_hash` text NOT NULL,
	`machine_name` text NOT NULL,
	`agent_version` text NOT NULL,
	`operating_system` text,
	`adapter_key` text DEFAULT 'onec-common-catering-v1' NOT NULL,
	`platform_version` text,
	`configuration_name` text,
	`configuration_version` text,
	`infobase_name` text,
	`read_only` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'connected' NOT NULL,
	`auto_sync` integer DEFAULT false NOT NULL,
	`interval_minutes` integer DEFAULT 60 NOT NULL,
	`last_entity_type` text,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`last_seen_at` text NOT NULL,
	`last_sync_at` text,
	`last_error` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `integration_connections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_connector_agents_machine_uq` ON `integration_connector_agents` (`venue_id`,`data_account_id`,`connection_id`,`machine_id_hash`);--> statement-breakpoint
CREATE INDEX `integration_connector_agents_tenant_seen_idx` ON `integration_connector_agents` (`venue_id`,`data_account_id`,`last_seen_at`);--> statement-breakpoint
CREATE TRIGGER `integration_connector_agents_tenant_guard`
BEFORE INSERT ON `integration_connector_agents`
FOR EACH ROW WHEN NOT EXISTS (
	SELECT 1 FROM `integration_connections` c
	WHERE c.`id` = NEW.`connection_id`
		AND c.`venue_id` = NEW.`venue_id`
		AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;--> statement-breakpoint
CREATE TRIGGER `integration_connector_agents_tenant_update_guard`
BEFORE UPDATE OF `venue_id`, `data_account_id`, `connection_id` ON `integration_connector_agents`
FOR EACH ROW WHEN NOT EXISTS (
	SELECT 1 FROM `integration_connections` c
	WHERE c.`id` = NEW.`connection_id`
		AND c.`venue_id` = NEW.`venue_id`
		AND c.`data_account_id` = NEW.`data_account_id`
)
BEGIN SELECT RAISE(ABORT, 'INTEGRATION_TENANT_MISMATCH'); END;

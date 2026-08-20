CREATE TABLE `workspace_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_memberships_workspace_account_uq` ON `workspace_memberships` (`workspace_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_account_status_idx` ON `workspace_memberships` (`account_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_workspace_status_idx` ON `workspace_memberships` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'Рабочее пространство' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `workspaces_creator_status_idx` ON `workspaces` (`created_by_account_id`,`status`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `account_kind` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `active_venue_id` integer;--> statement-breakpoint
CREATE INDEX `sessions_active_venue_id_idx` ON `sessions` (`active_venue_id`);--> statement-breakpoint
ALTER TABLE `venues` ADD `workspace_id` integer REFERENCES workspaces(id);--> statement-breakpoint
ALTER TABLE `venues` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `venues` ADD `created_by_account_id` integer REFERENCES accounts(id);--> statement-breakpoint
CREATE INDEX `venues_workspace_status_idx` ON `venues` (`workspace_id`,`status`);--> statement-breakpoint
INSERT OR IGNORE INTO `workspaces` (
	`id`,
	`name`,
	`status`,
	`created_by_account_id`,
	`created_at`,
	`updated_at`
)
SELECT
	`venues`.`id`,
	CASE
		WHEN json_valid(`accounts`.`restaurant_json`)
			AND trim(COALESCE(json_extract(`accounts`.`restaurant_json`, '$.name'), '')) <> ''
		THEN trim(json_extract(`accounts`.`restaurant_json`, '$.name'))
		ELSE 'Рабочее пространство'
	END,
	'active',
	`venues`.`data_account_id`,
	`venues`.`created_at`,
	`venues`.`updated_at`
FROM `venues`
INNER JOIN `accounts` ON `accounts`.`id` = `venues`.`data_account_id`;--> statement-breakpoint
UPDATE `venues`
SET
	`workspace_id` = `id`,
	`created_by_account_id` = `data_account_id`
WHERE `workspace_id` IS NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `workspace_memberships` (
	`workspace_id`,
	`account_id`,
	`role`,
	`status`,
	`joined_at`,
	`created_at`,
	`updated_at`
)
SELECT DISTINCT
	`venues`.`workspace_id`,
	`venue_memberships`.`account_id`,
	CASE WHEN `venue_memberships`.`role` = 'owner' THEN 'owner' ELSE 'member' END,
	`venue_memberships`.`status`,
	`venue_memberships`.`joined_at`,
	`venue_memberships`.`created_at`,
	`venue_memberships`.`updated_at`
FROM `venue_memberships`
INNER JOIN `venues` ON `venues`.`id` = `venue_memberships`.`venue_id`
WHERE `venues`.`workspace_id` IS NOT NULL;--> statement-breakpoint
CREATE TRIGGER `venues_workspace_guard`
BEFORE INSERT ON `venues`
FOR EACH ROW WHEN NEW.`workspace_id` IS NULL OR NOT EXISTS (
	SELECT 1 FROM `workspaces` w
	WHERE w.`id` = NEW.`workspace_id` AND w.`status` = 'active'
)
BEGIN SELECT RAISE(ABORT, 'VENUE_WORKSPACE_MISMATCH'); END;--> statement-breakpoint
CREATE TRIGGER `venues_workspace_update_guard`
BEFORE UPDATE OF `workspace_id`, `status` ON `venues`
FOR EACH ROW WHEN NEW.`workspace_id` IS NULL OR NOT EXISTS (
	SELECT 1 FROM `workspaces` w
	WHERE w.`id` = NEW.`workspace_id` AND w.`status` = 'active'
)
BEGIN SELECT RAISE(ABORT, 'VENUE_WORKSPACE_MISMATCH'); END;

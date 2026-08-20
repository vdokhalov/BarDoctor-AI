CREATE TABLE `venue_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`role` text NOT NULL,
	`permissions_json` text,
	`created_by_account_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`used_by_account_id` integer,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venue_invites_code_hash_uq` ON `venue_invites` (`code_hash`);--> statement-breakpoint
CREATE INDEX `venue_invites_venue_created_idx` ON `venue_invites` (`venue_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `venue_invites_expires_idx` ON `venue_invites` (`expires_at`);--> statement-breakpoint
CREATE TABLE `venue_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`role` text DEFAULT 'shift_manager' NOT NULL,
	`permissions_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`employee_id` text,
	`invited_by_account_id` integer,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venue_memberships_venue_account_uq` ON `venue_memberships` (`venue_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `venue_memberships_account_status_idx` ON `venue_memberships` (`account_id`,`status`);--> statement-breakpoint
CREATE INDEX `venue_memberships_venue_status_idx` ON `venue_memberships` (`venue_id`,`status`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data_account_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`data_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_data_account_id_uq` ON `venues` (`data_account_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `owns_venue` integer DEFAULT true NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `venues` (`data_account_id`, `created_at`, `updated_at`)
SELECT `id`, `created_at`, `updated_at`
FROM `accounts`
WHERE `owns_venue` = true;--> statement-breakpoint
INSERT OR IGNORE INTO `venue_memberships` (
  `venue_id`,
  `account_id`,
  `role`,
  `status`,
  `joined_at`,
  `created_at`,
  `updated_at`
)
SELECT
  `venues`.`id`,
  `accounts`.`id`,
  'owner',
  'active',
  `accounts`.`created_at`,
  `accounts`.`created_at`,
  `accounts`.`updated_at`
FROM `accounts`
INNER JOIN `venues` ON `venues`.`data_account_id` = `accounts`.`id`
WHERE `accounts`.`owns_venue` = true;

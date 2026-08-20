CREATE TABLE `platform_admin_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_account_id` integer NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`before_json` text,
	`after_json` text,
	`result` text NOT NULL,
	`reason` text,
	`request_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `platform_admin_audit_created_idx` ON `platform_admin_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `platform_admin_audit_admin_created_idx` ON `platform_admin_audit` (`admin_account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `platform_admin_audit_target_idx` ON `platform_admin_audit` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `platform_admin_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`account_id` integer NOT NULL,
	`action` text NOT NULL,
	`window_started_at` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `platform_admin_rate_limits_account_action_idx` ON `platform_admin_rate_limits` (`account_id`,`action`);--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`permissions_json` text DEFAULT '["platform.admin"]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`provisioned_by` text DEFAULT 'manual' NOT NULL,
	`granted_by_account_id` integer,
	`mfa_required` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`granted_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `platform_admins_status_idx` ON `platform_admins` (`status`);
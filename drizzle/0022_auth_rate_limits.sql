CREATE TABLE `auth_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`scope` text NOT NULL,
	`window_started_at` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_rate_limits_action_updated_idx` ON `auth_rate_limits` (`action`,`updated_at`);
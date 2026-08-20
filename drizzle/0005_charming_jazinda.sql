PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_usage_limits` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`used_requests` integer DEFAULT 0 NOT NULL,
	`request_limit` integer DEFAULT 250 NOT NULL,
	`period_key` text DEFAULT 'legacy' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ai_usage_limits`("account_id", "used_requests", "request_limit", "period_key", "created_at", "updated_at") SELECT "account_id", "used_requests", "request_limit", 'legacy', "created_at", "updated_at" FROM `ai_usage_limits`;--> statement-breakpoint
DROP TABLE `ai_usage_limits`;--> statement-breakpoint
ALTER TABLE `__new_ai_usage_limits` RENAME TO `ai_usage_limits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

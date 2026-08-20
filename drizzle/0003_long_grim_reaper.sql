CREATE TABLE `ai_usage_limits` (
	`account_id` integer PRIMARY KEY NOT NULL,
	`used_requests` integer DEFAULT 0 NOT NULL,
	`request_limit` integer DEFAULT 20 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);

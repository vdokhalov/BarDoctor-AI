DROP INDEX `accounts_chatgpt_email_uq`;--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_salt` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `password_iterations` integer;
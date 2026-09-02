ALTER TABLE `domain_data` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `domain_data` ADD `mutation_id` text;
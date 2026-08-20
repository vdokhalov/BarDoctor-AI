ALTER TABLE `notification_preferences` ADD `incident_alerts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `last_run_at` text;
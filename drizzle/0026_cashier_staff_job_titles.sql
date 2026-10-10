-- Apply before deploying code which reads these nullable columns.
-- Existing roles, permissions, invitations and memberships are unchanged.
ALTER TABLE `venue_memberships` ADD `job_title` text
  CHECK (`job_title` IS NULL OR (`role` = 'cashier' AND `job_title` IN ('cashier', 'waiter', 'barista', 'bartender')));
--> statement-breakpoint
ALTER TABLE `venue_invites` ADD `job_title` text
  CHECK (`job_title` IS NULL OR (`role` = 'cashier' AND `job_title` IN ('cashier', 'waiter', 'barista', 'bartender')));

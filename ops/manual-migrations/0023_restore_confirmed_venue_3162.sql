-- User-confirmed recovery of the exact archived venue #3162.
-- The migration is tenant-scoped, idempotent, and refuses to reactivate the venue
-- unless every canonical owner/workspace precondition still matches the audited state.
INSERT INTO `platform_admin_audit` (
  `admin_account_id`, `action`, `target_type`, `target_id`, `before_json`, `after_json`,
  `result`, `reason`, `request_id`, `created_at`
)
SELECT pa.`account_id`, 'venue.restore_confirmed', 'venue', '3162',
  '{"status":"archived","workspaceId":3162,"dataAccountId":7,"createdByAccountId":7}',
  '{"status":"active","workspaceId":3162,"dataAccountId":7,"createdByAccountId":7}',
  'success',
  'User explicitly authorized restoring archived venue 3162; canonical owner memberships verified',
  'restore-venue-3162-20260824', CURRENT_TIMESTAMP
FROM `platform_admins` pa
WHERE pa.`status` = 'active'
  AND EXISTS (
    SELECT 1
    FROM `venues` v
    INNER JOIN `workspaces` w ON w.`id` = v.`workspace_id`
    INNER JOIN `accounts` a ON a.`id` = v.`created_by_account_id`
    WHERE v.`id` = 3162
      AND v.`status` = 'archived'
      AND v.`workspace_id` = 3162
      AND v.`data_account_id` = 7
      AND v.`created_by_account_id` = 7
      AND w.`status` = 'active'
      AND w.`created_by_account_id` = 7
      AND a.`account_kind` = 'user'
      AND a.`owns_venue` = 1
      AND EXISTS (
        SELECT 1 FROM `venue_memberships` vm
        WHERE vm.`venue_id` = v.`id`
          AND vm.`account_id` = 7
          AND vm.`role` = 'owner'
          AND vm.`status` = 'active'
          AND vm.`permissions_json` IS NULL
      )
      AND EXISTS (
        SELECT 1 FROM `workspace_memberships` wm
        WHERE wm.`workspace_id` = v.`workspace_id`
          AND wm.`account_id` = 7
          AND wm.`role` = 'owner'
          AND wm.`status` = 'active'
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM `platform_admin_audit` existing
    WHERE existing.`request_id` = 'restore-venue-3162-20260824'
  )
ORDER BY pa.`created_at` ASC
LIMIT 1;
--> statement-breakpoint
UPDATE `venues`
SET `status` = 'active', `updated_at` = CURRENT_TIMESTAMP
WHERE `id` = 3162
  AND `status` = 'archived'
  AND `workspace_id` = 3162
  AND `data_account_id` = 7
  AND `created_by_account_id` = 7
  AND EXISTS (
    SELECT 1 FROM `workspaces` w
    WHERE w.`id` = `venues`.`workspace_id`
      AND w.`status` = 'active'
      AND w.`created_by_account_id` = 7
  )
  AND EXISTS (
    SELECT 1 FROM `accounts` a
    WHERE a.`id` = `venues`.`created_by_account_id`
      AND a.`account_kind` = 'user'
      AND a.`owns_venue` = 1
  )
  AND EXISTS (
    SELECT 1 FROM `venue_memberships` vm
    WHERE vm.`venue_id` = `venues`.`id`
      AND vm.`account_id` = 7
      AND vm.`role` = 'owner'
      AND vm.`status` = 'active'
      AND vm.`permissions_json` IS NULL
  )
  AND EXISTS (
    SELECT 1 FROM `workspace_memberships` wm
    WHERE wm.`workspace_id` = `venues`.`workspace_id`
      AND wm.`account_id` = 7
      AND wm.`role` = 'owner'
      AND wm.`status` = 'active'
  );

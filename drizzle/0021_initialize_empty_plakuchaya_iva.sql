-- User-confirmed empty venue initialization for Плакучая Ива #3280.
-- Every insert is guarded by the existing immutable Phase A export and never overwrites a server row.
INSERT OR IGNORE INTO `domain_data` (`account_id`, `store_key`, `data_json`, `updated_at`)
SELECT v.`data_account_id`, 'bd_assortment_v1', '{"version":"authoritative-persistence-v1","venueId":3280,"nomenclature":[],"stockBalances":[],"supplierProductMappings":[],"recipes":[],"inventoryProductAliases":[],"canonicalProductAliases":[],"canonicalSupersessions":[]}', CURRENT_TIMESTAMP
FROM `venues` v
WHERE v.`id` = 3280 AND v.`status` = 'active'
  AND EXISTS (SELECT 1 FROM `venue_migration_exports` e WHERE e.`venue_id` = v.`id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `domain_data` (`account_id`, `store_key`, `data_json`, `updated_at`)
SELECT v.`data_account_id`, 'bd_stock_movements', '[]', CURRENT_TIMESTAMP
FROM `venues` v
WHERE v.`id` = 3280 AND v.`status` = 'active'
  AND EXISTS (SELECT 1 FROM `venue_migration_exports` e WHERE e.`venue_id` = v.`id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `domain_data` (`account_id`, `store_key`, `data_json`, `updated_at`)
SELECT v.`data_account_id`, 'bd_purchase_documents', '[]', CURRENT_TIMESTAMP
FROM `venues` v
WHERE v.`id` = 3280 AND v.`status` = 'active'
  AND EXISTS (SELECT 1 FROM `venue_migration_exports` e WHERE e.`venue_id` = v.`id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `domain_data` (`account_id`, `store_key`, `data_json`, `updated_at`)
SELECT v.`data_account_id`, 'bd_inventory_snapshots', '[]', CURRENT_TIMESTAMP
FROM `venues` v
WHERE v.`id` = 3280 AND v.`status` = 'active'
  AND EXISTS (SELECT 1 FROM `venue_migration_exports` e WHERE e.`venue_id` = v.`id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `domain_data` (`account_id`, `store_key`, `data_json`, `updated_at`)
SELECT v.`data_account_id`, 'bd_suppliers', '[]', CURRENT_TIMESTAMP
FROM `venues` v
WHERE v.`id` = 3280 AND v.`status` = 'active'
  AND EXISTS (SELECT 1 FROM `venue_migration_exports` e WHERE e.`venue_id` = v.`id`);
--> statement-breakpoint
UPDATE `accounts`
SET `migration_status` = 'server_authoritative', `updated_at` = CURRENT_TIMESTAMP
WHERE `id` = (SELECT v.`data_account_id` FROM `venues` v WHERE v.`id` = 3280)
  AND 5 = (
    SELECT COUNT(*) FROM `domain_data` d
    WHERE d.`account_id` = `accounts`.`id`
      AND d.`store_key` IN ('bd_assortment_v1', 'bd_stock_movements', 'bd_purchase_documents', 'bd_inventory_snapshots', 'bd_suppliers')
  );
--> statement-breakpoint
INSERT INTO `platform_admin_audit` (
  `admin_account_id`, `action`, `target_type`, `target_id`, `before_json`, `after_json`,
  `result`, `reason`, `request_id`, `created_at`
)
SELECT pa.`account_id`, 'venue.initialize_confirmed_empty_stores', 'venue', '3280',
  '{"legacyBusinessData":"none","authorization":"user_confirmed"}',
  '{"authoritativeStores":5,"status":"server_authoritative","overwritten":false}',
  'success', 'User confirmed that Плакучая Ива contained no legacy business data',
  lower(hex(randomblob(16))), CURRENT_TIMESTAMP
FROM `platform_admins` pa
WHERE pa.`status` = 'active'
  AND 5 = (
    SELECT COUNT(*) FROM `domain_data` d
    WHERE d.`account_id` = (SELECT v.`data_account_id` FROM `venues` v WHERE v.`id` = 3280)
      AND d.`store_key` IN ('bd_assortment_v1', 'bd_stock_movements', 'bd_purchase_documents', 'bd_inventory_snapshots', 'bd_suppliers')
  )
ORDER BY pa.`created_at` ASC
LIMIT 1;

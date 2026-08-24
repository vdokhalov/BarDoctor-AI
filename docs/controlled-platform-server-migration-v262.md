# Controlled platform-wide server migration

Version: `controlled-server-migration-v1`  
Safety boundary: preparation and dry-run are read-only; production business rows change only after explicit Phase B approval.

## Authority contract

For every venue, `venues.data_account_id` owns its isolated `domain_data` namespace. The five core server stores are:

- `bd_assortment_v1` — canonical nomenclature, balances, packaging, cost basis, tech cards, ingredient links, aliases and supplier mappings;
- `bd_stock_movements` — immutable stock ledger;
- `bd_purchase_documents` — purchase documents and lines;
- `bd_inventory_snapshots` — immutable inventory documents and adjustments;
- `bd_suppliers` — supplier directory.

Client storage is cache, draft, offline queue, or migration evidence only. It cannot overwrite an existing server store and cannot become authoritative without a checksum-bound per-venue plan.

## Known physical legacy sources

The production bundle historically used venue-scoped local-storage keys:

`<store_key>__<account_email>__venue_<venue_id>`

Primary-venue compatibility keys could also be `<store_key>__<account_email>` or an unscoped `<store_key>`. The sync queue is stored with the same account/venue namespace. No production business-object IndexedDB contract exists; IndexedDB is therefore reported as observable metadata, never guessed or automatically read.

`server-migration-discovery-v262.js` exposes a read-only collector. It does not upload, delete, rename, or rewrite browser values. A platform administrator must explicitly submit its evidence to the dry-run endpoint.

## Phase A API

`GET /api/admin/data-migrations` returns the platform inventory and summarized dry-run plans.

`GET /api/admin/data-migrations?venueId=<id>&mode=bundle` returns the checksum-backed immutable backup payload for one venue.

`POST /api/admin/data-migrations` with `action: dry_run` accepts read-only legacy candidates in memory. It performs zero writes.

Every plan contains:

- exact server and legacy lineage;
- records already server-side and proposed inserts;
- duplicates, ambiguous mappings, orphan references, unit/package conflicts, unknown cost, historical gaps and tenant violations;
- stock quantity and valuation snapshots;
- deterministic `operationId`, `exportId`, SHA-256 checksum and rollback contract.

## Phase B API

The endpoint accepts exactly one venue per request. A migration requires:

- authenticated platform administrator;
- same-origin request;
- `x-admin-intent: migrate-safe-venue`;
- the current dry-run `operationId`, `exportId` and backup checksum;
- confirmation value `PHASE_B_SAFE_VENUE_MIGRATION_APPROVED`;
- classification `SAFE_AUTOMATABLE`;
- provable rollback.

The order is fixed:

1. persist and re-read the immutable backup;
2. record the prepared operation;
3. insert missing server stores only;
4. verify every inserted payload checksum;
5. mark cutover complete and audit the platform action.

Existing `domain_data` rows are never updated by the migration route. A re-run is idempotent. `REQUIRES_REVIEW` and `BLOCKED` venues cannot partially migrate.

## Rollback and cleanup

The fixture rollback is automated and tested. Production rollback is intentionally disabled until a separate explicit authorization exists. The immutable backup table rejects updates and deletes at the database level. Legacy browser/server sources remain untouched for the stabilization window; cleanup is outside this migration.

## Non-negotiable data rules

- no synthetic stock movement history;
- unknown cost remains unknown, never zero;
- existing purchase, line, snapshot and source IDs are copied unchanged;
- aliases remain additive;
- ambiguous canonical identities are not auto-merged;
- cross-account or cross-venue data blocks automatic migration;
- platform batches are forbidden: migrate and validate one venue at a time.

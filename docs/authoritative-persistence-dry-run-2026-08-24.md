# Authoritative persistence dry-run · 2026-08-24

Mode: read-only. Production writes: **0**. Reconciliation: **blocked**.

## Live D1 evidence

- 13 active venues were enumerated; each has a distinct `data_account_id`.
- For the primary venue (`venue_id=1`, `data_account_id=1`), D1 contains an
  inventory snapshot store and purchase history, while
  `bd_assortment_v1` and `bd_stock_movements` are absent.
- Integration mapping/link/sync-item tables contain 0 rows.
- The bounded database reader stopped at an oversized `domain_data` row, so it
  cannot safely return complete purchase payloads or exact item-level counts.
  Those counts must not be inferred from truncated JSON.

## Dry-run result

| Measure | Result |
| --- | --- |
| Server-authoritative core stores | incomplete (at least 2 of 5 missing) |
| Writes performed | 0 |
| Automatically repairable records | not provable until legacy candidate export is supplied |
| Ambiguous records | not provable until legacy candidate export is supplied |
| Stock positions potentially affected | all legacy client-only positions |
| Valuation potentially affected | all positive client-only balances and their cost basis |
| History potentially affected | purchase lines, snapshots, mappings, aliases and tech links using legacy keys |

The missing assortment/movement stores make an empty server result ambiguous:
it can mean “no data” or “data remained in the browser cache.” Therefore an
item-level reconciliation plan is intentionally not generated and
`reconciliationAllowed=false`.

## Required approval boundary

1. Produce the owner-only immutable export with legacy candidates using
   `POST /api/data-integrity/export` after the preview is updated.
2. Retain its SHA-256 checksum and exact five-store payload.
3. Review deterministic `highConfidenceAutomatic`, `ambiguous`, stock,
   valuation and history impact counts.
4. Approve a separate versioned import/reconciliation operation. This change
   does not implement or execute that write operation.

Rollback for a future approved operation must restore each exact exported store
under the same venue data account, invalidate the operation id, rebuild read
models, and re-run quantity, valuation, purchase-chain and venue-isolation
invariants.

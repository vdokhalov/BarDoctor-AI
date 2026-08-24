# BarDoctor data-integrity audit — 2026-08-24

## Scope and safety

Read-only inspection covered canonical nomenclature, supplier/source identity,
tech cards and ingredients, units and packaging, valuation, purchase posting and
reversal, snapshots, Data Quality, venue boundaries, orphan records and
supersession aliases. No production data was changed. Reconciliation remains a
separate, approval-gated operation.

The reusable dry-run entry point is:

```sh
npx tsx scripts/data-integrity-dry-run.ts venue-export.json
```

It does not mutate its input and reports affected/high-confidence/ambiguous
records plus stock, valuation and history impact and a rollback plan.

## Server-store dry-run result

The D1 overview contains 13 active venue records. For the primary owner data
account, `bd_purchase_documents` and `bd_inventory_snapshots` exist, while
`bd_assortment_v1` and `bd_stock_movements` are absent. The integration mapping,
entity-link, sync-item and sync-run tables are empty.

Therefore an exact canonical/product-line reconciliation count cannot be
derived from the authoritative server stores: the input side of that join is
not server-resident. The safe dry-run result for production writes is:

- records changed: **0**;
- automatically reconciled: **0**;
- ambiguous records changed: **0**;
- production stock/value/history changed: **0**;
- primary-account server canonical positions available for reconciliation: **0**;
- primary-account server stock-movement records available for reconciliation: **0**.

This is itself a high-severity integrity finding: purchases/snapshots and the
canonical/stock ledger do not currently share one authoritative persistence
boundary. Exact product counts require a complete immutable export of the
client-held assortment plus the four server stores; proceeding without it could
silently reconstruct the wrong cost and stock history.

## Systemic defects and root causes

| Class | Root cause | Safe code action |
|---|---|---|
| Canonical duplicates / supplier rows masquerading as products | Purchase confirmation generated `purchaseProductKey` from every invoice label before canonical resolution. | Raw supplier identity is preserved; canonical identity is assigned only after resolution. |
| Ambiguous canonical matches posted to stock | A review result still fell back to a generated key and created nomenclature, balance and receipt movement. | Review cases now block posting and return `INVENTORY_REVIEW_REQUIRED`. |
| False ambiguity for valid products | Nomenclature and stock balance representations of the same product were ranked as two candidates. | Candidate ranking is deduplicated by canonical product key. |
| Duplicate/stale supplier mappings | Upsert replaced only the first row for a source key. | All stale rows for that source identity are removed before inserting the current mapping. |
| Cross-venue ingredient links missed | Candidate filtering discarded the evidence needed to distinguish missing from wrong-venue keys. | Rejected product keys are retained as audit evidence and explicit foreign links become `wrong_venue`. |
| Historical price/cost fragmentation after merge | Canonical aliases were written, but procurement history grouped by the old key. | Procurement readers now resolve alias chains without rewriting history. |
| Duplicate packaging and incompatible units | Package strings lack one normalized uniqueness/compatibility invariant. | Read-only audit detects normalized duplicates and base-unit conflicts; ambiguous conversions remain review-only. |
| Quantity without cost basis | Legacy/partial writes can hold quantity while moving-average inputs are unavailable. | Existing write guard is retained; audit reports every positive balance without cost/value. |
| Purchase → movement → cost and snapshots | Stores are persisted independently and historical readers do not uniformly resolve aliases. | Dry-run checks missing/orphan/duplicate receipts, cancellation conflicts, snapshot orphans and valuation exposure. |
| Multi-venue leakage | Legacy null/shared venue records plus filtered lookups weakened explicit reference validation. | Explicit cross-venue ingredient validation and venue-isolation regression coverage added. |

## Reconciliation requiring explicit approval

Before any real data repair, export immutable copies of assortment, purchases,
movements, snapshots and supplier mappings for each venue. A reviewed batch must
carry an operation id and before/after key map, preserve total base quantity and
valuation per currency, retain original historical keys, and be reversible by
restoring those stores and invalidating the batch id. Ambiguous identity, unit,
packaging and missing-cost cases must not be auto-fixed.


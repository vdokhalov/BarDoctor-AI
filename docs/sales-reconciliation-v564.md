# Explicit legacy sales reconciliation

A venue owner or manager with `finance.manage`, `sales.view`, `shifts.view`, and `inventory.view` can explicitly link legacy revenue rows to existing POSTED, FULL captured-cost batches. The entry is a collapsible form in the existing `/sales-import` journal. This is not an import, sale, inventory posting, historical repricing, or migration.

The new server-only ledger is `bd_sales_reconciliations_v1`; it is deliberately absent from generic store write/read allowlists. No venue ID is hardcoded. Account/venue/workspace comes from authenticated active membership. Every source, including nested ownership, must belong to that scope. Permission and profile/venue scope are rechecked by guards inside the same transaction as the write.

## Supported flow

1. `GET /api/sales-reconciliation?from=2026-10-02&to=2026-10-08` in the selected authorized venue (at most 31 days). Returns scoped legacy revenue candidates and posted batches with dates, quantities and captured costs. Candidates are not automatically matched or preselected.
2. `POST /api/sales-reconciliation` with `action: "preview"`, numeric `venueId`, optional matching `workspaceId` / `dataAccountId`, unique `operationId` (16–100 ASCII alphanumeric / underscore / hyphen characters), `mappings: [{revenueId: "existing ID", batchIds: ["existing ID"]}]`, and evidence below. At most 31 mappings and 31 batches per mapping. Preview performs no writes.
3. Review `summary` (date/currency, unchanged revenue/checks, each line's quantity, captured cost); download the complete response including `backup`, `previewRevision`, and `backupRevision`. The backup contains exact selected original rows/batches and previous link records, scoped source timestamps, and the preview revision.
4. Submit the same command with `action: "apply"`, unchanged `previewRevision`, `backupRevision`, `backupSaved: true`, `confirmCoverage: true`. A single D1 CAS transaction writes only the link ledger and `legacy_sales.reconcile` audit, whose before image contains the backup. The source revision binds all raw input store snapshots and profile, not just a timestamp. Closed months, ambiguous IDs, invalid captures, conflicting shift IDs, existing document/POS links, and reused batches are rejected.
5. If the response is uncertain, first send `{action:"status", venueId, operationId}`. `APPLIED` returns persisted records; `NOT_APPLIED` permits a new preview. Do not blindly resubmit. Identical operation IDs/commands return the existing links; changed commands under the same ID are rejected.

Evidence is `{kind: "PRIMARY_RECORDS" | "OWNER_RECONCILIATION" | "SYNTHETIC_FIXTURE", reference: string, method: string, completeCoverage: true, historicalPricesAvailable: boolean}`. It is an explicit attestation, not an invented original sales document. Amount equality alone is never sufficient: the caller must reconcile quantities and coverage and identify the evidence. Missing evidence or unchecked coverage cannot be applied.

## Read behavior and invariants

Finance, current Finance/Health, and verified month close load the ledger. A link only contributes when revenue financial identity/facts and the entire captured batch still match its saved operands, evidence remains valid, and captured line/ingredient arithmetic and currency validate. Every batch is counted once across POS, sales documents and explicit links. A modified operand becomes `RECONCILIATION_INPUT_CHANGED`; unresolved rows/batches keep their existing unknown reason codes. Unavailable/truncated link sources cannot certify known COGS. Ordinary POS/document/manual totals paths are not reclassified as legacy.

No SQL updates revenue, check counts, batches/captures, stock movements, or balances. Existing missing movement references remain missing. The operation supplies a revenue-coverage attestation for captured costs; it does not certify physical stock integrity. Missing month-boundary inventory and other closure requirements still block final closed-month profit.

Limits: source/ledger 2 MB, 10,000 rows; larger histories fail closed and need a separately reviewed storage extension. Reconciliation is additive only; there is no edit/delete/reversal endpoint in this scope. An erroneous attestation would require a separately authorized correction design. Existing ledger records have audit and original operands retained.

## QA3389 handoff — no live apply performed

Before any live operation, parent browser worker must freshly verify active venue 3389, the exact seven revenue/batch IDs and full preview against its `qa3389-seven-batches.json`. Local tests use separate synthetic IDs, never guessed live IDs.

| Date 2026-10 | Revenue | Checks | Cappuccino / espresso / croissant | Captured cost |
|---|---:|---:|---|---:|
| 02 | 1600 | 24 | 20 / 10 / 12 | 350 |
| 03 | 1725 | 26 | 22 / 10 / 13 | 378 |
| 04 | 2300 | 34 | 30 / 10 / 20 | 520 |
| 05 | 2400 | 36 | 32 / 10 / 20 | 538 |
| 06 | 1600 | 24 | 20 / 10 / 12 | 350 |
| 07 | 1450 | 22 | 18 / 10 / 10 | 312 |
| 08 | 1525 | 23 | 18 / 10 / 13 | 342 |
| Total | 12600 | 189 | 160 / 70 / 100 | 2790 |

Use `SYNTHETIC_FIXTURE`, `historicalPricesAvailable:false`. Reference: original 9 October weekly QA report, v503/fa836b, scenario `test_weekly_venue_workflow`. Method: per-day quantities/current menu prices 50/30/25 reproduce the seven daily totals; weekly quantities match the original test report; historical selling prices were not retained. This is the explicitly authorized fixture reconciliation, not recovered primary documentation. Do not restore the 28 absent movements.

Expected before/after: the seven unchanged revenue records total 12600/189; seven unchanged cost captures total2790. Before, their financial linkage is unknown; after, these exact captures have an explicit audited coverage link. No new sales/stock rows, no quantity or capture edits, one operation audit; repeated apply creates no extra link/audit. Re-read current Finance/Health and actual remaining reason codes. Do not promise an overall Health PASS or reuse old monthly totals as current.

## Validation

- 89 scoped TAP checks: new real API/auth/SQLite flow plus existing financial reconciliation/current Finance/payroll regressions.
- New flow covers seven-day preview/backup, strict tenant and nested ownership, owner/manager vs cashier, stale preview, closed month, duplicate batches, captured arithmetic, malformed/oversized sources, generic store rejection, mid-flight revocation, CAS race, transactional rollback, operation replay, Finance/Health agreement and preservation of UNKNOWN for another unlinked batch.
- Chromium at 390×844: actual journal component markup/controller and real isolated API; download gate, stale rejection, lost-success-response resolved by status, one audit and no stock mutations, no horizontal overflow. Other journal controllers omitted from this scoped component probe; full live shell/browser verification belongs to parent.
- Project-wide typecheck retains two pre-existing errors in `business-health-snapshot.ts:372` and `health-partial-operations-v539.test.ts:10`; no new diagnostics in this change.
- Logs/checkpoint under `/workspace/checkpoint/sales-reconciliation-v564/`.

# Resumable current-period financial verification

Local candidate on top of d24f6fb3. No production operation or deployment is part of this change.

## Behavior
Month-close and Health retain the bounded synchronous path for small operands. If normalized operands exceed it, the same readers verify pages and persist derived progress. HTTP 202 contains no report or cost proof. Clients continue only the same job with increasing revisions; cancellation, changed sources and invalid progress never commit partial results.

Pages use account/day/position indexes: at most 40 event captures or 50 movements, 2,000,000 encoded payload bytes, four steps per request. Totals accumulate in the cursor CAS rather than a final receipt scan. Scratch cleanup deletes at most 500 rows per table per step and finishes before the final result. The compact summary grows with shift/day/source groups, not check count; existing bounds on supplementary non-journal inputs remain.

Captured cost rules, known zero, UNKNOWN, duplicate references and reconciliation evidence remain intact. Original source snapshots include documents, inventory anchors and payroll. Profile, tenant, period, original JSON/revisions and nested ownership/hash verification guard progress. Only a server-local capability supplies verified compact costs; browser-local calculations cannot fabricate it.

Changed source revisions abort/restart calculation. A continuously changing account may require another load; stale operands are never relabelled current. Canonical writers must advance revisions. Unsupported direct SQL corruption without advancing revisions is outside cache invalidation; fresh verification validates payload hashes.

## Evidence
- 10,001 current checks and movements, over 7.12 MB event fixture, preceding/following-month rows excluded: original oracle COGS 13,334 and result 86,676, business rows unchanged.
- Known/unknown/duplicate scenarios; interrupted batch, retry, hash corruption, source revision and tenant guards.
- Native D1 atomic failure/retry, known zero and negative adjustment.
- Handler/client continuation, exact completed result, error/retry, deadline/late-response and venue/period cancellation.
- Explicit reconciliation, unknown adjustment and day/position query plans without temporary sorting.
- Local fixtures are not live latency, measured peak memory, infrastructure SLA or actual hosting quota evidence.

## Rollout
1. Review additive 0040 stock period index and 0041 disposable financial_read_* tables/indexes. No business table is dropped or migrated.
2. Schema precedes matching Worker/client. Previous Worker ignores extra tables; rollback may retain them.
3. Publication requires separate approval and preserves audience. No credentials or publication in this local task.
4. Ordinary read-only smoke after release; no synthetic live account/transactions.
5. Regenerable caches are explicitly outside the historical backup contract; prior backup hashes remain compatible.

No blanket readiness claim: oversized individual captures fail closed; supplementary JSON contracts remain; abandoned calculations may retain temporary rows; actual hosting quota is unavailable. Universal new-account recovery is a separate unfinished prerequisite. Historical QA3389 recovery evidence does not establish it.

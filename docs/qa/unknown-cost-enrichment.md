# UNKNOWN-only historical costing — local acceptance

Base: `cc4514b241b050a30af8990a1927bd80ddca2160`, retaining v650.
No production mutation, paid request, push or deployment performed.

## Cause and behavior

A local 26 October sale at `2026-10-25T22:17:45.181Z` previously used the UTC date (25 October) for receipt selection. The confirmed receipt dated 26 October, confirmed at `2026-10-25T22:07:03.774Z`, was therefore excluded. `cc4514b` fixes new captures using the venue timezone.

Existing UNKNOWN captures are not edited. The journal now offers **Дорасчитать за месяц** for months containing unvalued native sales. The explicit authenticated POST command writes a separate `bd_sales_cost_enrichments_v1` record and an audit entry. It does not run on GET, reload, or opening a document. Owner/manager and existing finance/sales/inventory/shift permissions are required; the transaction rechecks membership, profile and source snapshots.

A proof uses frozen sale quantities, units and IDs, an immutable source hash, exact purchase-line conversion and a receipt confirmed strictly before the capture. Ambiguous, cancelled, foreign-currency, foreign-venue, missing-time, changed or late evidence is not accepted. Already known components remain untouched. A source change invalidates the supplemental read result. A repeat with the same proof does not write or change cache revisions.

Shared readers expose the supplement in the check, item analytics, current Finance/Home and new report calculations. Original captured-cost evidence stays separately visible. Financial cache inputs include the ledger revision and receipt sources. Closed reports and saved Health snapshots are not rewritten by the command. A new Health calculation still uses its existing closed-period boundary.

## Local evidence

- Final targeted set: 38 passing tests (cost-enrichment, POS venue date, lemon purchase/sales chain, current finance chain, financial read concurrency).
- Real authenticated routes, transaction rollback and source CAS tested against isolated SQLite, both legacy arrays and normalized journals.
- Fixture: water KNOWN 24 + lemon UNKNOWN 0.2 kg with a proven 50 MDL/kg receipt → supplement 10, check cost 34, item gross profit 56 on revenue 90. Original capture and stock movements remain byte-identical.
- kg/g; midnight/DST; incomplete/late/ambiguous evidence; source cancellation/change; known cost preservation; manual totals without item costs; other tenant; failed save, retry; cache invalidation and repeat checked.
- Browser: existing standalone journal rendered from the prepared application assets, real isolated API handlers; 390/820/1280. Error/retry, double click (one POST), reload, Browser Back and venue-switch clearing. No additional POST/AI calls. Screenshots visually inspected.
- Build passed, including emitted artifact validation. Typecheck has only the two pre-existing errors in `business-health-snapshot.ts:372` and `health-partial-operations-v539.test.ts:10`.
- Additional old cost-warehouse-trace suite: 10 failures in its fixture (`movements is not iterable`). Reproduced unchanged on clean `cc4514b`; not caused by this patch.

Screenshots: `outputs/cost-enrichment/before-{390,820,1280}.png`, `after-{390,820,1280}.png`.

## Boundaries

No live write or live acceptance has been performed. The real audit's remaining manual totals without item evidence remain UNKNOWN; repairing this check does not prove the entire period's profit.

Only complete native captures with reliable evidence can be supplemented. Missing or ambiguous historical records are not guessed. The explicit command is bounded to 10,000 source rows / 2 MB per source and 2 MB supplemental ledger; it refuses oversized inputs without partial writes. This is not a general accounting backfill service.

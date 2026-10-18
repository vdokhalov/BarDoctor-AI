# Cost evaluation: canonical PMR_RUB support and truthful incomplete results

Base a0a777d6 (published v537). This fix is not published.

The cost reader formerly accepted only three-letter currency identifiers, incorrectly rejecting the application's supported PMR_RUB with CURRENCY_UNKNOWN. It now uses accountingCurrencyFromProfile from the existing currency module. No other calculator/currency module or exchange-rate logic changed. COST_CALCULATION_VERSION advances to v2, invalidating input receipts from the old semantics; the first subsequent pass therefore recalculates.

The optimized page still fails closed for unavailable observations and performs no partial page writes or false resolution. It now returns the observation's reason codes and blocked menu item instead of discarding that evidence. The client shows recognized human-readable reasons. An empty saved list no longer claims saved results are shown: it says no saved signals exist and the check is incomplete. Missing, invalid, unsupported and mixed-currency data remain unknown.

Actual handler tests compare equivalent independently denominated fixtures, not conversion: a recipe consumes2units costing5each and resolves to10RUB or10PMR_RUB respectively. Known zero resolves to0 in both currencies. Persisted before/after verification and subsequent receipt reuse are checked. Mixed-currency inputs, unsupported profile currency and missing stock retain active signals, return specific reasons and create no success receipt.

38 scoped tests passed:6 currency/concurrent-Health cases,24 batch/invalidation cases,5 coordinator cases,3 baseline reader/reconciliation cases. The historical calculation oracle remains pinned; only its explicit version label was aligned to v2, with a separate PMR regression test for the intended behavior change. Nine isolated Chromium UI scenarios passed, including empty list + UNAVAILABLE + specific currency reason without false saved-results text. Build/final artifact validation is recorded in /workspace/checkpoint/cost-pmr-fix.

TypeScript still reports the two unchanged base errors in business-health-snapshot.ts:372 and purchases.ts:687; no changed-file diagnostic remains.

## Health concurrency boundary

Startup cost refresh and Health GET have no shared scheduling gate and can overlap. Both read D1/source projections and perform synchronous JavaScript calculations, so resource contention is plausible, not established as the production failure. Health does not read private calculation receipts: it queries only active episode keys (LIMIT26, processes up to25) with its own request-owned reader. The batch's new atomic writes may overlap reads; local actual-handler Promise.all produced200Health and available cost without changing Health's score. This small SQLite test does not simulate Cloudflare CPU limits or network load and does not prove production Health recovery. No scheduling, Health math or infrastructure behavior was changed. A production Health status/code/requestId or timing trace is still required to diagnose its separate failure; bootstrap/store/me200 is not that evidence.

No publication, push, new credentials, production requests or full suite in this task. No speed promise: PMR_RUB now performs genuine numeric computation that v536 could silently skip.

# Köln final post-migration calculation reconciliation

Date: 2026-08-28  
Production baseline: version 323, runtime commit `55aec808018e6454af5bed673c4ae19dc8a24f84`  
Audit baseline: `12adec15418cb5c7a9ae4f4ee032d809688a3fbb`  
Scope: read-only production verification after the completed PMR_RUB relabel.

## Final verdict

- **SYSTEM CALCULATIONS: NOT VERIFIED in production version 323.** The accounting, purchase, debt, warehouse and closed-month arithmetic reproduces, but a real browser-cache freshness defect can still expose stale Finance and Health values. A narrow v324 fix is prepared and fully regression-tested; it is not deployed.
- **HISTORICAL KÖLN DATA: CORRECTION REQUIRED only after source verification.** The two contradictory purchase lines remain unchanged. They do not make the current arithmetic engine incorrect.
- No production data was changed. No production deployment was made.

## Finance 43,500 root cause

`43,500` is absent from the authoritative `bd_finance_expenses` D1 row. That row contains 26 linked purchase payments totaling `32,880.25 PMR_RUB` and no independent non-purchase expense records.

The old value came from a device-local `bd_finance_expenses_cache` / monthly scalar created by an older mixed client calculation. Production version 323 bootstraps local data before reading D1 and overwrites only keys present in the server response. Consequently:

1. an old tab or failed/offline bootstrap can retain and display `43,500`;
2. a successful online bootstrap replaces Finance with the authoritative payment ledger;
3. a locally cached store absent on the server is never removed;
4. the same defect explains the stale `bd_ai_diagnosis_v9` Health snapshot.

This is not a hard-coded number, a canonical finance formula or a persisted server snapshot. The exact composition of the old scalar cannot be reconstructed from D1 because it existed only in client state.

The prepared v324 bootstrap reads D1 first, hydrates present server stores, removes absent server-backed caches only after a successful read, preserves queued offline edits, and never clears on failed/offline reads. This makes `43,500` non-recurrent after deployment and reload.

## Reconciliation matrix

| Metric / period | Raw authoritative source | Independent expected | Domain/backend | API contract | Production UI v323 |
|---|---:|---:|---:|---:|---|
| August purchase documents | 26 confirmed documents | 32,880.25 PMR_RUB | 32,880.25 | canonical route tested | may be obscured by stale local scalar |
| August supplier payments | 26 linked payments | 32,880.25 PMR_RUB | 32,880.25 | canonical route tested | successful hydration: 32,880.25 |
| Other stored Finance expenses | 0 records | 0 PMR_RUB | 0 | canonical route tested | same cache caveat |
| Supplier debt | purchases − valid linked payments | 0 PMR_RUB | 0 | debt regression PASS | 0 after hydration |
| Warehouse valuation | 116 balances | 28,997.67 PMR_RUB | 28,997.67 | valuation regression PASS | canonical value |
| White Stork | 361; 3,000 ml | 361 PMR_RUB; 0.120333/ml | exact | exact | canonical value |
| Closed July revenue | closed snapshot | 104,946.00 | 104,946.00 | closed report contract PASS | exact baseline |
| Closed July purchases | closed snapshot | 30,409.21 | 30,409.21 | closed report contract PASS | exact baseline |
| Closed July COGS | 24,703 + 30,409.21 − 23,729 | 31,383.21 | 31,383.21 | closed report contract PASS | exact baseline |
| Closed July cash result | 104,946 − 30,409.21 − 10,075.50 − 41,348 − 9,000 − 6,500 | 7,613.29 | 7,613.29 | PASS | exact baseline |
| Closed July final result | 104,946 − 31,383.21 − 10,075.50 − 41,348 − 9,000 − 6,500 | 6,639.29 | 6,639.29 | PASS | exact baseline |
| Current revenue | long D1 row is projection-truncated | not independently reconstructable | previous visible 82,166 is not promoted to authoritative | route contract PASS | **VERIFICATION INCOMPLETE** |
| Current payroll | long D1 row is projection-truncated | not independently reconstructable | previous visible 34,006 is not promoted to authoritative | route contract PASS | **VERIFICATION INCOMPLETE** |
| Current cash result | revenue − 32,880.25 − other cash expenses | requires verified revenue | formula verified | PASS | **VERIFICATION INCOMPLETE** |
| Current accrual/final result | revenue − COGS − payroll − taxes − utilities − other accrual expenses | requires full current inputs/closing basis | formula verified | PASS | **VERIFICATION INCOMPLETE** |

Cash and accrual indicators remain separately labelled. The audit does not call purchase payments, COGS and final profit by one generic “expenses” name.

## Home, Dashboard, Finance and Reports

All prepared client paths use the same monthly-report/accounting-money engine and PMR_RUB profile currency. Purchases, payments, debt, valuation and closed July totals reconcile across their canonical sources. Current revenue, payroll and current result cannot be independently promoted from the production reader because its long JSON cells are truncated and the authenticated application session was unavailable to this audit browser.

Therefore the old visible values `82,166`, `34,006` and `3,101` remain observed UI values, not independently verified authoritative totals. `43,500` is specifically rejected.

## Health Score

There is no current authoritative `bd_ai_diagnosis_v9` row for account 1. D1 contains only legacy `bd_ai_diagnosis_v4`, updated 2026-08-01. The previously visible `83/100`, confidence `68%`, has no server factor payload and cannot be reproduced as:

`sum(normalized factor × weight) = score`.

Root cause is not reader truncation: the canonical v9 row is absent. Production v323 can retain a device-local v9 envelope because missing server keys are not invalidated. The correct authoritative state is “Health not calculated” until a fresh diagnosis creates a server v9 payload. The v324 cache fix enforces that state. A new diagnosis, not a fabricated reconstruction of 83, is required after deployment.

## AI Doctor

- Accounting evidence is built with `accountingCurrency=PMR_RUB`; unresolved foreign money is excluded and no RUB/MDL/FX path is used for Köln history.
- `plan_1783892352555_ju1g` was created on 2026-07-12 from five early-July shifts. On 2026-08-28 it is 47 days old, outside the 14-day evidence window, and is projected as stale rather than current.
- The legacy v4 diagnosis from 2026-08-01 is also not a current canonical v9 diagnosis.
- The prepared invalidation prevents old Finance `43,500` and absent-server Health snapshots from re-entering the current AI surface after successful bootstrap.

## Supplier debt, warehouse and White Stork

- Purchases: `32,880.25 PMR_RUB`.
- Raw linked supplier payments: `32,880.25 PMR_RUB`.
- Debt: `0 PMR_RUB`.
- Quantity balances: `116/116` exact.
- Active movement lineage: `156/156` exact; cancelled/reversed movements excluded.
- Currency relabel created no duplicate or orphan movement and changed no quantity, purchase amount or payment amount.
- Warehouse valuation: `28,997.67 PMR_RUB`.
- White Stork purchase `b54e2f38-a4df-49b0-8510-12904fbe183e`: amount `361`, currency `PMR_RUB`, quantity `3,000 ml`, valuation `361`, average unit cost `0.120333 PMR_RUB/ml`, debt `0`.

## Percentage, period and timezone logic

- Ordinary change is `(current − previous) / previous × 100` when the previous value is positive.
- `previous=0` and null inputs return null, never NaN/Infinity.
- `current=0` produces `−100%` for a positive previous value.
- Closed and incomplete periods are explicitly distinct.
- For a negative previous result, closed-month comparison deliberately divides by `abs(previous)` so an improvement has an intuitive positive sign; this is labelled as a magnitude comparison rather than a standard positive-baseline percentage.
- Server AI/current-period boundaries now use `Europe/Chisinau`, including the 21:00 UTC / local-midnight rollover and DST. Tests cover the August→September boundary.

## Source verification

### Апельсины

- Purchase: `e1707650-e919-4bd0-9447-8286eebe8257`.
- Line: `17b0346d-a394-4ff3-ae0b-35f2f0f2397e`.
- Original: R2 key `purchases/1/c6495d8d-7703-437c-a5ee-e77fb60f0977`, JPEG `image.jpg`.
- Stored/OCR: quantity `1.124`, unit price `23`, line total `25.35`, confidence `0.98`.
- Math: `25.85` after currency rounding.
- The protected object route requires an authenticated production session; original bytes and OCR trace were not available through the read-only D1/Sites reader. **SOURCE VERIFICATION REQUIRED.**

### Пакетики для чая

- Purchase: `5213dae2-5f69-4cc8-aa87-fe4debe2d12b`.
- Line: `eb0fdcc0-5cff-41f5-a6e4-9fb05185fb1e`.
- Original: R2 key `purchases/1/ad2ac9fe-8e48-415b-a960-05125342737c`, JPEG `image.jpg`.
- Stored/OCR: quantity `100`, unit price `0.50`, line total `60.00`, confidence `0.95`.
- Math: `50.00`.
- Original bytes and OCR trace were unavailable through the same authenticated boundary. **SOURCE VERIFICATION REQUIRED.**

Neither production record was changed. Current purchase posting rejects equivalent contradictions before finance/stock writes, so these are historical data discrepancies rather than a current engine P1.

## Severity

### System code

- P0: 0.
- P1: 1 — authoritative bootstrap/cache invalidation defect in production v323; fix prepared, not deployed.
- P2: 1 — UTC date-key usage in AI/current-period windows; fix prepared and tested.
- P3: 0 new.

### Historical data

- Two contradictory purchase lines: `SOURCE VERIFICATION REQUIRED`.
- No correction proposal is safe until the original JPEGs are read.

### Verification incomplete

- Current raw revenue, payroll, taxes/utilities and current final result from untruncated authoritative records.
- Authenticated production UI values on Home/Finance/Reports after a fresh clean bootstrap.
- A current Health factor payload, because no authoritative v9 snapshot exists.

## Verification gates

- Full suite: `675/675 PASS`.
- Build: PASS.
- Typecheck: PASS.
- Lint: 0 errors; one pre-existing unrelated unused-import warning in `app/api/migration/koln-assortment/route.ts`.
- Finance, calculation, currency, purchase, warehouse, Health and AI regressions: PASS within the full suite.
- Mobile smoke: PASS on iPhone 13 and Pixel 7 scenarios.
- Desktop smoke: PASS at 1280×720 and profile 1366×900; profile also PASS at 390×844 and 320×700.
- Production worker errors in the latest 24-hour read: 0.

## Deployment decision

A new production deployment is required to eliminate stale Finance/Health caches and apply Chisinau date boundaries. The code is prepared only. Deployment remains blocked pending explicit user confirmation. Production data needs no write for these code fixes.

# BD-05 — current menu readiness

Baseline: v654 / ba47df55cae2045dabc52dd972ba37bc12db59e7. Local only.

## Cause and bounded change
The overview percentage combines six existing menu checks, including purchase cost; it is not a purely structural percentage. The price check previously counted missing ingredient prices rather than the availability of the resulting recipe cost. Two fully priced ingredients in different currencies produce recipeCost=null without a valid common currency, but previously produced score=100, item status=ready, recipeCostStatus=KNOWN and no price signal. Independently, the shortcut said “Расчёты готовы” whenever no recipes were missing/draft, irrespective of cost.

Keep the existing percentage denominator, label it “Проверки меню”. Derive the existing cost check/status from recipeCost availability. Do not change cost arithmetic, currencies, snapshots, movements or enrichment. Show “Себестоимость рассчитана: N из M”; use the existing signal and menu attention list with “Неполная себестоимость: N позиций”. The shortcut now says “Техкарты подтверждены”. Server loading/error never asserts a verified percentage or complete calculation. Historical UNKNOWN sales do not invalidate current known recipes; period economics retains its independent unknown values.

Small responsive adjustment uses the actual overview container width: below 600px the two panels stack, and the percentage does not wrap.

## Verification
48 targeted tests: assortment-readiness, assortment-analytics, cost-enrichment. Cases include mixed currencies, absent/partial prices, known zero, complete/no-sales, empty menu, historical UNKNOWN with current known recipe, unchanged source data, repeat, venue/period isolation, and enrichment regression coverage.

Compiled browser fixture uses the real authenticated GET /api/assortment/overview, real derived model and isolated SQLite stores. Screens at 390/820/1280, signal→item, browser Back→existing menu list, Overview→reload, HTTP503/recovery, delayed loading, empty menu, other account read and no business/AI writes. Browser Back closes the drawer but preserves menu tab state even when URL no longer specifies tab; return to overview uses its existing tab. No routing changes in this task.

Build: scripts/build-verified.sh. Typecheck retains only the two known baseline failures: business-health-snapshot.ts:372 TS2322; health-partial-operations-v539.test.ts:10 TS2352. No full suite.

## Limits
PDF page6 was read. The exact historical 3394 input causing the audit screenshot has not been reconstructed; mixed-currency reproduction proves a general defect, not that this was that venue's historical cause. No live writes, deployment, migration, historical snapshot changes or financial policy changes. Screenshot fixtures are synthetic, not production records.

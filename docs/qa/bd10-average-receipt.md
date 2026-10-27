# BD-10 — average receipt precision

Baseline v658, d99e451cd2a8c32e1f02d5744e35096c4f3b81b7.

Cause: `Ym` (shift), `wn` (period), legacy finance KPI and document detail used `Math.round` on revenue/receipt count before formatting money. Thus 125/2 became63 and145/3 became48. Period aggregation already correctly sums revenue and receipts; no averaging-of-averages bug was found.

Minimal change: remove these four integer-rounding operations. Existing currency formatter performs final monetary rounding. No change to source revenues, receipts, returns, period/currency filtering, accounting, histories or snapshots. Build patch is idempotent and placed after existing patches.

Validation:
- 11 focused tests PASS on final code:125/2=62.50;145/3=48.33;115/2=57.50; zero/negative revenue; zero/missing/nonpositive receipts; multiple shifts same date; weighted total; net return row without inventing receipts; foreign currency/out-of-period exclusion; source immutability; all7 currencies;1.005 displayed1.01.
- Existing current-finance-ui-v556 suite:3 PASS,2 failures `BdFinanceDocumentAmount is not defined`. Both reproduced against untouched v658 via extracted baseline source, unrelated to change.
- Final build PASS. Cosmetic generated whitespace restored afterward, with non-whitespace byte equality asserted; prepared client artifact re-finalized and verified. No functional changes after build.
- Typecheck: two known baseline errors business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10; no new errors.
- Compiled UI isolated SQLite/native API fixture: Finance week145/3=48.33MDL, shift list115/2=57.50MDL and detail57.50MDL; repeat/reload;125/2=62.50MDL list and period.390/820/1280; mobile period and desktop detail screenshots inspected. No non-bootstrap write requests/page errors. Fixture clock23Oct, rows21/22Oct, working schedule configured; actual audit dates/production untouched.
- Screenshots outputs/bd10-average-receipt/finance-{390,820,1280}.png, shifts-{390,820,1280}.png,detail-1280.png.

Limits: no live verification, no full regression, no actual return/reversal operation created. Return test validates already-projected net revenue/count inputs; return bookkeeping unchanged. Multi-venue integration not retested; no data access/scope changes, currency and period partition tested. No AI, push or publication.

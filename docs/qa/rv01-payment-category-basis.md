# RV-01 — cash category basis

Baseline v662 / a96897f063dc9d6dfd1d030d684355f20b82199b. Audit page11 separates payments from accrued service costs. Existing v646 afbf5884 correctly recognizes confirmed services once and keeps payment/cancellation independent.

## Proven reproduction
Real calculateVerifiedMonth, isolated fixtures: goods payment120 MDL plus confirmed unpaid service15 gives periodExpenses120, otherExpenses15 and category rows Products120 + Other15 (135). After service payment, total135 but rows Products120 + Other30 (150). Existing compiled report UI reproduced the unpaid mismatch. This is a wrong breakdown, not an incorrect payable total or duplicate P&L expense.

## Minimal correction
Four lines in verified-month-close.ts: calculate expenseBreakdown from the original scoped payment/expense ledger using the existing monthly category calculation, rather than the service-accrual augmented ledger. No new grouping or accounting formula. P&L, cashResult, periodExpenses, debt, stock and source records unchanged. Existing report bars and expense-detail rows consume the corrected breakdown. Existing text already explains actual supplier payments and other cash expenses; no extra UI section or copy added.

## Checks
- 18 targeted tests: four RV01 states plus 14 existing service-accrual tests. Unpaid: payments120 / service accrual15 / supplier debt15; paid: payments135 / accrual15 / debt0; cancelled with live payment: payments135 / accrual0 / debt0; cancelled and payment voided: payments120 / accrual0 / debt0. Revenue240 produces result-before-COGS225 while service is confirmed,240 after cancellation. Category sums equal totals, no repeated deduction, deterministic reread and immutable inputs.
- Existing service tests include partial payment, foreign venue/period, equipment/draft exclusions, linked legacy deduction, FX and actual current/month API rereads without writes.
- Real local handlers + compiled UI: baseline mismatch; corrected unpaid/paid/cancel/void, chart categories, expense details, Back/reload; 390/820/1280 screenshots inspected, no horizontal overflow/page exceptions. Only isolated auth bootstrap POST; no business commands from browser and no AI. Fixture states are changed directly in isolated SQLite.
- Final verified build PASS, emitted Worker contains corrected breakdown, artifact validation PASS. Generated whitespace drift restored after non-whitespace equality and assets re-finalized. Tests rerun on final code. Known TS errors remain business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

Screenshots: outputs/rv01-payment-categories/unpaid-{390,820,1280}.png.

## Limits
No production check or mutation, no whole-app regression. This corrects current/recomputed report views and future captures; already closed monthly snapshots are returned unchanged and are not silently repaired. Health snapshots are untouched. UI fixture uses an isolated September period; exact October numbers are asserted by calculation tests. Cancellation/payment persistence handlers are not modified or replayed; their resulting states are supplied as fixtures.

At 820px the existing report layout is cramped: this card is 162px wide and words/amounts wrap heavily. No horizontal overflow, but this is not a responsive-design PASS. The change does not modify CSS/layout; kept separate from the category arithmetic fix. 390/1280 cards are readable.

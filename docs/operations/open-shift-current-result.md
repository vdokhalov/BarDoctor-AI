# Open shift current result (review candidate, not deployed)

Baseline: v582 / 33262fa0b9d90d3101f6abffa84de7d2ae935259.

`operationalDay` intentionally leaves OPEN payroll unrecorded. `readFinanceInputs`
therefore marks PAYROLL missing, and `currentFinance` previously suppressed the
whole result. The recorded contract and month-close eligibility remain unchanged.

The current read now supplies separate provisional payroll/before-cost/after-cost
fields from COMPLETE, scoped, saved workday drafts. Every missing day must have a
single OPEN report, complete matching employee breakdown, matching monetary sum,
valid currency and unchanged sales base. Nested foreign ownership, duplicate or
incomplete reports and missing cost/expense inputs remain unknown. Bonuses are
added once. No domain writes, schema changes, posting or closing operations occur.

Home, Finance and current monthly report select the provisional result explicitly
and label payroll and result as provisional. Health receives the same explanation
but retains unknown confirmed payroll and no confirmed profitability score.

Important limit: this uses the saved workday calculation, not a new live payroll
engine. It does not extrapolate hours, reread changed wage rules or certify an
estimate after its sales base changes. A fresh workday calculation is needed then
(without requiring day closure). This is a narrow fix for the confirmed scenario;
it is not a claim that every unsaved staffing/sales change has a live estimate.
Confirmed cash-after-supplier-payments remains unknown until payroll confirmation.

Validation: 4 new contract tests, 10 existing finance/cost tests, 5 UI contract
tests; emitted authenticated mobile UI Home -> Finance -> Reports, 7 successful
real-handler reads, revenue100/checks2/COGS20/recorded payroll10/estimated payroll10,
writeoff10/shortage10/provisional result40; no JS errors and business snapshot equal.
Build and emitted artifact validation pass. Typecheck has only the two documented
baseline errors in business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

Local evidence: outputs/open-payroll-artifact; checkpoint /workspace/checkpoint/open-payroll.
No production calls, publish, credentials or live business-data changes.

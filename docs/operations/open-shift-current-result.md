# Open shift current result (review candidate, not deployed)

Baseline: v582 / 33262fa0b9d90d3101f6abffa84de7d2ae935259.

`operationalDay` intentionally leaves OPEN payroll unrecorded. `readFinanceInputs`
therefore marks PAYROLL missing, and `currentFinance` previously suppressed the
whole result. The recorded contract and month-close eligibility remain unchanged.

The current read supplies separate provisional payroll/before-cost/after-cost
fields. A single scoped OPEN report with saved staffing and a COMPLETE draft is
required, but its saved total is never reused. The existing workday calculator
recomputes from current authorized employee/rule snapshots, saved hours and
current venue sales. A changed shift/hourly rate or venue-sales percentage is
therefore reflected on the next read. Confirmed closed-day payroll is unchanged.

Finance reads optional employee/rule sources in its existing SQL snapshot only
with their existing permissions; no additional permission is required for the
old confirmed report. Missing permission or source means no provisional estimate.
Health uses the same calculation with its validated sources. It retains unknown
confirmed payroll and no confirmed profitability score.

Known boundary: automatic personal-sales attribution needs membership/payment
facts outside this financial read; it remains unknown, never a stale saved sum.
Department-sales estimates fail closed when the saved sales base changes. Missing
hours/rules/drafts, incomplete drafts, duplicate reports or nested foreign scope
remain unknown. No hours are extrapolated from elapsed time. Current calculation
means current rules plus entered facts, not an automatic prediction of future work.
Confirmed cash-after-supplier-payments remains unknown until payroll confirmation.
No production writes, schema changes, posting or closing operations occur.

Validation: 7 new contract tests, 10 existing finance/cost tests, 5 UI contract
tests; emitted authenticated mobile UI Home -> Finance -> Reports, 7 successful
real-handler reads, revenue100/checks2/COGS20/recorded payroll10/estimated payroll10,
writeoff10/shortage10/provisional result40; no JS errors and business snapshot equal.
Build and emitted artifact validation pass. Typecheck has only the two documented
baseline errors in business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

Local evidence: outputs/open-payroll-artifact; checkpoint /workspace/checkpoint/open-payroll.
No production calls, publish, credentials or live business-data changes.

Freshness follow-up: same emitted UI + real handler verified initial result40,
then local-only rate10 ->20, browser reload, provisional payroll30/result30.
Original saved draft total10 remained unchanged. Source snapshots before/after
reads matched. Baseline v582 typecheck was independently rerun in detached
/workspace/bardoctor-typecheck-v582; the exact same TS2322/TS2352 locations occurred.

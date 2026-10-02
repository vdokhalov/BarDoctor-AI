# Phase 3A.6 — Business Day & Finance Input Consistency

Production baseline: Sites v476, `9a7ef94f7caf4510ed7374526e8ef17589423297`.
Scope: G03, G04, G14 only. Implementation and release preparation; production deployment requires the owner's separate confirmation. This document does not declare the production phase COMPLETE.

## Root causes and exact changes

| GAP | Proven root cause on v476 | Change |
|---|---|---|
| G03 | `normaliseDailyMetrics` used a date-keyed Map; a later accepted session replaced the earlier session although period summation retained both. Historical window selection treated a calendar date as completion. | `business-day-rows.ts` groups scoped eligible identities by business date and currency and sums them once. `business-intelligence.ts` consumes that projection and requires explicit final revenue and complete operations for completed windows. OPEN sessions are excluded from historical comparable baselines. |
| G04 | Server payroll summary read only raw revenue rows, missing the separate saved Operational Report; expense filters omitted `voided`, `reversed`, and `reversedAt`. Client report wrappers used a different payroll precedence. | `finance-inputs.ts` joins the existing report once per business date and supplies one declared current-result contract to Finance, Reports, Operational Day projection and canonical server context. Shared lifecycle and existing captured FX handling replace inconsistent filters. |
| G14 | Salaries recalculated saved days using current employee rules. FinanceProvider recalculated neighbouring saved days and persisted them during hydration/month updates. Reopening an Operational Report recalculated its payroll even when staffing and sales were unchanged. | Saved report breakdown wins for historical reads. Provider hydration no longer writes recalculated history; explicit new/edit saves retain their workflow. `payrollForOperationalEdit` preserves a recorded breakdown when the underlying operational inputs are unchanged; changed/new inputs use an explicitly labelled current-rule estimate. |

The provider root cause is reproduced by running `tests/payroll-recorded-provider-phase3a6.test.mjs` against the exact baseline bundle: the unchanged baseline performs one business write during hydration; the prepared implementation performs zero. The same test requires an explicit save to preserve historical 90 and new recorded zero. Assertions have not been relaxed.

## Authoritative business facts and read contract

No new ledger or persisted financial read model is introduced. Existing accepted SALE_EVENT facts and their existing Finance revenue/cash-session projection retain their IDs, reversals, writers and idempotency. Existing `bd_operational_reports_v1` remains the recorded operational/payroll source. Legacy guided rows retain a labelled historical compatibility basis.

One venue + existing accepted `businessDate` + accounting currency defines the daily revenue projection. Eligible sessions are deduplicated by their existing scoped identity. Thus A=100, B=200 and C=0 produce daily revenue 300, three cash-session identities and one report payroll 90. No SALE_EVENT is copied into legacy sales documents. The read code does not reinterpret accepted dates through UTC; venue timezone and overnight assignment remain the responsibility of existing posting contracts.

`readFinanceInputs` declares `business-day-finance-v1`, metric `recorded_current_result_before_cogs`:

`current result = accepted revenue − recorded accrued FOT (including bonuses once) − active recorded operating expenses`.

The read includes venue, optional authoritative workspace/dataAccount boundary, date range, currency, source identities, payroll-by-date basis, exclusions and missing inputs. Internal event/report stores remain outside generic bulk client sync. Existing authenticated Operational Day metadata is reused on the client only when venue/date/currency, complete source-ID population and accounting amount match the current rows. Server reads derive facts from authorized stores and do not accept a client-supplied operational projection.

The existing full monthly calculation still includes its existing recurring allocations and captured historical cost where applicable. Those are separate declared calculations, not silently substituted into this before-COGS metric. Protected closed-month snapshots remain frozen and retain their existing explicit reopen workflow.

## States, payroll, expenses and currency

| Condition | Meaning |
|---|---|
| Any OPEN eligible cash session | Revenue PROVISIONAL; operational day OPERATING. |
| Cash sessions CLOSED, no recorded report | Revenue may be FINAL; operational day AWAITING_OPERATIONAL_DATA. |
| Report recorded but required FOT absent | Payroll MISSING, result PARTIAL; not a completed operational day. |
| Recorded report + known FOT + final revenue + no proven mismatch | Operational day COMPLETE. Cash close and report recording remain independent facts. |
| Complete inputs for current/open month | Current result is PROVISIONAL/PRELIMINARY, not final profit. |
| Protected closed-month snapshot | Existing frozen final calculation, unchanged by current rules or this read wrapper. |

Recorded FOT 90 is joined once even with three cash sessions. Recorded zero is KNOWN ZERO and wins over a payroll-expense fallback. Missing FOT remains null; a partly recorded period cannot silently obtain zero for missing days. A legacy payroll expense is an explicitly labelled fallback only when a recorded basis is absent. Current employee rules do not recalculate saved historical report amounts.

Bonuses increase accrual once. Payments and confirmed deductions affect salary settlement/balance; they do not duplicate accrual in the declared operating-expense metric. Existing salary entries, confirmations and payment workflows are retained. Report editor copy distinguishes saved FOT, current-rule estimate and missing data without adding a screen or redesigning the editor.

Expense eligibility excludes cancelled/canceled, void, voided, reversed, draft, explicit draft state and `reversedAt`. Active records remain included. Existing accountingMonth/date conventions and captured `resolveAccountingMoney` conversion remain in use. Explicit incompatible currency without valid existing FX produces an unknown amount/result, not a mixed-currency total. Currency-less legacy venue rows keep the existing venue-currency compatibility convention and are not presented as newly captured FX history.

## Code surface

- Shared source: `lib/bardoctor/business-day-rows.ts`, `finance-inputs.ts`, `operational-day.ts`.
- Authorized readers: `app/api/operational-days/route.ts`, `venue-ai-context.ts`, `venue-context-access.ts`.
- Minimal existing derived-reader propagation: `business-intelligence.ts`; no Health weights/caps or AI prompt changes.
- Existing shipped client: `scripts/patch-finance-inputs-phase3a6.mjs` embeds the exact transpiled server helpers into the established bundle; restoration/reapplication is verified through the existing artifact preparation pipeline.
- Build integration: `package.json`, `scripts/build-verified.sh`; existing canonical client release integrity checks remain required.

## Regression evidence and acceptance matrix

Targeted tests: `tests/finance-inputs-phase3a6.test.ts` (22), `tests/finance-inputs-client-phase3a6.test.mjs` (5), `tests/payroll-recorded-provider-phase3a6.test.mjs` (1).

| Required scenarios | Evidence |
|---|---|
| 1–4, 13–17, 23 | Scoped shared-read tests: 100+200=300, three-session report join once, OPEN/provisional, CLOSED-without-report, recorded 90, zero vs missing, later rule edits, same metric across Operational Day/Finance/server context. Actual final client wrapper tests retain numeric result oracles. |
| 5–8 | Explicit month/year/DST accepted-date cases; existing Revenue Trace, Sales overnight and venue-timezone suites retain real posting/date semantics. Operational Day browser matrix exercises cached/delayed month/year boundaries. |
| 9–10 | Reversed facts, duplicate identities, repeated read and actual repeated POST acceptance; existing Revenue Trace and Sales/POS idempotency/reversal regression. |
| 11–12, 18–19 | Every specified expense lifecycle state, reversedAt, bonus/payment/deduction precedence, explicit incompatible currency and captured FX, zero vs unavailable required inputs. |
| 20–22 | Actual authenticated handlers: restricted source 403, revoked membership 401, foreign venue/workspace/dataAccount isolation. Existing restricted-Finance browser, source-boundary and tenant/security suites remain required. |
| 24 | Existing Phase 3A.1 evidence, 3A.2 revenue, 3A.3 captured cost/Warehouse, 3A.4 Menu Origin, 3A.5 canonical-boundary suites and compiled Worker/native D1 checks. |
| Historical writes/editor | Negative baseline provider reproduction; fixed provider test requires no hydration writes. Isolated actual report editor saves after rule change must preserve recorded 90. |

Browser acceptance uses only newly created local synthetic accounts/venues and in-memory SQLite with actual handlers. `scripts/finance-inputs-phase3a6-browser.ts` exercises 390px, 820px and 1280px, actual multi-session Sales posting, report FOT 90, Finance/current monthly result 210, Salaries, later rule edits and unchanged report editor save. Served bundle bytes must equal the prepared canonical bundle. Screenshots and result JSON are in `outputs/finance-inputs-phase3a6/`.

Local WebKit cannot start because this environment lacks required system libraries and has no privilege to install them. The existing GitHub Ubuntu Chromium/WebKit infrastructure runs the same new phase acceptance with WebKit; READY requires that job to pass, not a claim of a local WebKit pass. Responsive browser simulation is not a physical-device test.

Full regression, verified build, typecheck, lint, repeated artifact preparation, native Worker/D1, restricted manager and Operational Day acceptance must all pass for the exact release commit. Two pre-existing lint warnings are unrelated and must not be presented as new errors. Release SHA, individual GitHub job conclusions/head SHA and prepared Sites version are recorded separately in `outputs/phase3a6-release.json` after release preparation, avoiding a self-referential commit hash in this document.

Local results: full `npm test` **2048/2048 PASS**; targeted phase tests **28/28 PASS**; repeated artifact preparation **5/5 PASS**; compiled Worker/native D1/client-release checks **3/3 PASS**; lint **0 errors, 2 existing warnings**. Phase 3A.6 Chromium acceptance **390/820/1280 PASS**, including unchanged report-editor save after current-rule edits. Existing Evidence/Revenue Trace, Cost/Warehouse, Menu Origin and Canonical Boundary browser acceptance **390/1280 PASS**. Cached and delayed Operational Day month/year-boundary acceptance preserves Chisinau businessDate. Restricted manager/owner Finance 403 and role regression remains required in CI as well as local acceptance.

Fixture corrections require explicit input evidence: cost-only tests now provide synthetic known-zero Operational Reports; completion-window fixtures explicitly declare FINAL/COMPLETE. The Operational Day wizard browser first proves omitted payroll is incomplete, then explicitly records a synthetic zero and retains the original completed-day assertions. No application code invents historical zero, and production records are not rewritten.

## Release boundary and remaining work

Migrations: **NO**. Backfill: **NO**. New source of truth: **NO**. Production business-data mutations during implementation/preparation: **NO**. Production resources/secrets/DB structure changes: **NO**.

GitHub release branch remains `fix/product-inventory-phase1`. All required jobs must be GREEN and GitHub HEAD = CI head SHA = prepared Sites source commit. Saving a Sites version does not authorize deployment. Production remains v476 until the owner's explicit confirmation; subsequent production smoke must create a NEW isolated QA venue and must not mutate working venues.

G03/G04/G14 are remediated in the prepared source; production completion is pending deployment and isolated smoke. Remaining P1: G05, G06, G07, G08, G12, G13. Remaining P2: G15, G16, G17, G18. In particular, existing client-body AI overrides, broader Business Health completeness/provenance, closed-result provenance and other G05/G06/G07 work are not declared fixed here. Historical `docs/phase3a-gap-audit.md` remains unchanged. Phase 3A.7 is not started.

PRIMARY D1 FAILURE ROOT CAUSE: **UNKNOWN — NOT REPRODUCED**. Native regression passing does not establish a cause or fix for the previously reported production failure.

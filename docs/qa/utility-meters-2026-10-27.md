# Utility meters — local implementation, 27 October 2026

Baseline: v663 / cbe8bbfc2c498331f1be04df98bbda827902ad5b. No production data or AI calls. No release authorized.

## Model and integration

The existing Finance utility action opens `/finance/utilities`. Water, gas and electricity have independent stable meter IDs. Names are optional; renaming preserves readings. Parent/submeter inclusion is explicit; counting both is rejected. Water/gas use m³, electricity kWh.

Readings produce intervals, charged wholly in the ending reading's month. No daily or shift allocation is fabricated. Missing tariffs and a tariff change inside an interval retain the measured usage but leave money unknown. A reading explicitly identified at a tariff boundary permits exact pricing on each side. Month-to-month comparison requires complete calendar boundary measurements; it is not inferred from billing month totals.

Dedicated scoped `bd_utility_meters_v1` state uses preview tokens, revision CAS, actor permissions rechecked at the write boundary and persistent operation IDs. GET does not write. A lost response can be retried with the same operation ID. No generic expense-store write is performed.

From the explicitly selected start month, meter accrual replaces the previous aggregate utility plan in current Finance and the monthly report. Payments are linked separately to a valued interval; they reduce cash, not profit a second time. Existing unlinked utility expenses are not guessed to be the same invoice: that combination remains uncertain. No old records are migrated or deleted. Closed month snapshots are returned unchanged.

## Targeted checks

32 tests: `tests/utility-payment-correction.test.ts`, `tests/utility-meter.test.ts`, `tests/utility-api.test.ts`, `tests/payment-category-basis.test.ts`, `tests/service-accruals.test.ts`.

Actual API fixture: 100 → 108 at tariff 2 = 16; previous plan 900 is replaced, not added. Revenue 100 minus payroll 10 minus utility accrual 16 gives 74 in both report modes. Payment 5 leaves profit 74 and cash result 85. Further payment 11 leaves profit 74 and cash result 74. Overpayment fails. Replayed operations, concurrent requests, mandatory preview, rename/reload, foreign venue and closed month guards checked. Original expense collection remains untouched.

Pure fixtures cover fractional values, all three types, multiple meters, parent/submeter exclusion, cross-month interval assignment, absent/changing tariff, explicit boundary reading, closed-neighbour edits, duplicate IDs/dates and exact/insufficient monthly comparison.

`bash scripts/build-verified.sh` is the canonical verified build. `npm run build` uses an obsolete prebuild guard and fails on the unchanged baseline; it is not the release gate used here.

Typecheck retains only baseline errors in business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

## Boundaries

No tariff inference, bank integration, automatic payment, rent or tax-model changes. No meter replacement/rollover inference. An actual decrease in readings is rejected. Inclusion cannot change after the first billed interval; paid intervals cannot be retroactively repriced. An erroneous payment record can be cancelled with preview and confirmation; this does not execute a real refund. Original amount/date remain in history with cancellation date/actor/reason. Correcting a previously paid interval requires cancelling every active linked payment first. Reading corrections retain before/after values and actor/date. Closed accrual months, payment months and the current cancellation month are protected. Individual shift utility allocation is unknown rather than fabricated from an interval. Existing closed Health snapshots are not rewritten.

Screenshots contain isolated local fixture data only, not live venue records. Live tests, physical-device testing and publication have not been performed.

## Final browser evidence

Actual handlers and the final built application assets in an isolated SQLite fixture passed the browser scenario: create → tariff → readings → preview → save → reload → partial payment → rename → cancel → lost response after server commit → retry/double click → finance entry/back/reopen → tenant switch. No AI mutation requests. Viewports 390/820/1280 had no horizontal overflow; all screenshots visually inspected.

After the final reading increased accrual to 18, both real rendered Finance and Monthly report showed revenue 100, payroll 10, result before COGS 72. COGS remained visibly unknown. The report showed utility accrual 18 and cash result 85 after payment 5. Its cash categories explicitly exclude utilities, as in the existing design. Individual shift utility result remained unknown instead of receiving a made-up allocation.

Library screenshots (same identities, local metadata applied):
- overview: libfile_ef6e5191f79881918ff5a4de51a2ad22, version 3
- input: libfile_c7d74901b0b08191a4bbbe00dac3d27f, version 4

Browser navigation limitation: the existing app bootstrap inserts a Home history entry when Finance is loaded as a full document. No global navigation rewrite was included. The normal Finance → Utilities → Browser Back → Finance → reopen flow passed.

## Payment correction follow-up

Actual API tests: two payments (5 + 3) against accrual 16. Cancelling only one still blocks reading edits. Cancelling both leaves accrual 16/result 74, restores recorded cash result 90, and keeps both original payment rows. Editing 108 to 109 changes accrual to 18/result 72 and records the old reading; entering the corrected payment 18 produces cash result 72 without a duplicate expense. Same-operation cancellation replay keeps revision unchanged. Closing the month or removing finance.manage between preview and commit rejects the write without partial cancellation.

UI adds “Отменить запись оплаты” inside the existing payment history. Confirmation explicitly states that no money is returned. No new section or payment provider is introduced.

Final browser follow-up passed: cancel preview 5 → 0 with accrual unchanged; lose response after committed cancellation; retry/double click; reload shows exactly one cancelled payment and no active cancel action; edit the formerly paid reading 108 → 107; reload preserves cancellation and both reading values in history. Mobile cancellation dialog and corrected history screenshots visually inspected. The full targeted utility UI scenario still passes 390/820/1280 and makes no AI mutation requests. Final verified build passes; typecheck has only the two baseline errors.

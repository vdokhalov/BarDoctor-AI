# SALES UX/UI REDESIGN — STEP 1

Production baseline: v453 / `bb55b193cecf1fc2ae3a2eaa8e34586daaff8bdf`. Implementation is presentation-only. Production has not been deployed or used for business tests.

## Information architecture

Before: `/sales-import` primarily presented import and stock-processing KPIs, with secondary links to cashier and `/sales-entry`. Manual entry, shift management and a second recent-sales list shared `/sales-entry`. POS document headers displayed technical shift IDs; the journal omitted payment, revenue and employee information.

After: Sales opens a single journal. The primary action opens cashier; a scoped existing POS draft offers Continue order. Secondary navigation separates Journal, Cashier, Cash shifts, Manual entry and Import. Import processing metrics and source selection live inside Import. Manual entry has a dedicated operation form; its stock-only legacy menu grid has a separate, explicitly labelled entry. `/sales-entry?view=shifts` uses the existing shift handlers. A selected manual sale can open its existing full-return action, but `/sales-entry` no longer provides a competing history list.

## Data and scope

No API handlers, database schema, indexes, sale creation, authoritative event, cost snapshot, finance calculation, stock planning, permissions, retry or idempotency implementation changed. The journal reads the existing `/api/sales-batches` event projections; `/api/sales-events` supplies the current account/venue, permission and cash-shift context. The existing draft reader and shift selection key are reused. Draft amounts are not estimated from stale data.

Cash shifts and the global operational Shifts section share the finance revenue store, but cash shifts are a distinct `revenueSource=SALES_EVENTS` subset with open/closed lifecycle. They are presented separately, not merged or recreated. Revenue and receipt counts come from stored shift results; cash/card totals are a read-only sum of the existing posted event payments. The shift model does not store an opening employee: the UI states Not specified rather than guessing from the latest cashier.

The journal filters date range, shift, employee, payment, source and status on the complete existing batch response. It searches IDs, item names and available comments. Revenue/count/average use posted authoritative event documents in the venue currency, excluding reversed documents and import reports without receipt revenue. No currency conversion or invented report revenue is introduced. Date filters use the accounting business date; the UI distinguishes that date from document creation/posting time.

Sale documents show short readable identifiers, full IDs in optional technical details, shift names, employee, payment, source, quantities, unit prices, totals, comments and the existing status-aware cost formatter. KNOWN / UNKNOWN / PARTIAL / TRUE ZERO semantics are preserved. NONE consumption explicitly explains why no stock movement is needed. A scoped read-only warehouse presentation filter provides document → movements; the existing movement → document link is retained.

## Changed files

- `app/sales-import/route.ts`, `public/sales-import.js`: journal-first operations page, filtering, separate import/manual entries and sale documents.
- `public/sales-journal.js`, `public/sales-journal.css`: shared read-only presentation and responsive journal/document/shift styling.
- `app/sales-entry/route.ts`, `public/sales-entry.js`: separate manual/shift/action views around existing handlers; no second history list.
- `scripts/patch-sales-ux1.mjs`, generated `public/assets/index-BQGspy0I.js`: repeatable document-scoped warehouse filter and clear-filter control.
- `package.json`, `scripts/build-verified.sh`: replay integration. Lint excludes generated local `outputs` and `.sites-runtime` archives, not application source.
- `scripts/patch-shell-first-startup-v397.mjs`, `tests/phase5-artifact-preparation.test.mjs`: preserve the already-present v453 registration clean-navigation guard when regenerating v397 from v396. The initial build diff exposed its accidental removal by the old generator; the emitted baseline behavior is retained.
- `tests/pos1-functional.test.ts`, `tests/sales-consumption-v275.test.mjs`: supply shared presentation in the isolated cost renderer and update deliberately changed UI labels, preserving cost and API/RBAC assertions.
- `tests/sales-ux1.test.ts`: real sales snapshots, filters, totals, null-cost preservation, escaping and NONE consumption.
- `scripts/pos1-hardening-browser.ts`, `scripts/sales-browser-qa-phase5.ts`: retain business assertions and adapt navigation; extend journal/filter/document/manual/import/shift viewport coverage and warehouse round trip.
- Generated release entrypoints may change solely to reference the final versioned client asset.

## Verification

- Initial and expanded Chrome runs: 390×844, 820×1000, 1280×800 PASS for POS and journal flows. Each independent fixture retains 3 sales / 120 revenue / 3 stock movements / stock 100→97. Stable-ID retries add no event or movement. Draft reload, account/venue/shift isolation and cross-tab conflict protection pass.
- Manual-entry HTTP/SQLite browser regression: 390×844 and 1280×720 PASS, including preview, discard, lost response, reload/retry, full return, shift opening/closing and venue switch.
- New journal read-model tests: 3/3 PASS.
- Final typecheck: PASS.
- Lint: PASS, no errors; 2 pre-existing warnings in the migration route and v399 patcher.
- Full suite: 1,256/1,256 TypeScript tests; artifact suites 434/434 and 100/100; ancillary suites 7/7, 4/4 and 6/6. All button/navigation/header/modern audits passed. Two old-label assertions in the initial artifact run were corrected without removing behavior checks.
- Verified vinext Worker build and strict Worker/manifest/client-release/connector-checksum validation: PASS. Final versioned client: `index-BQGspy0I-90d81d97750c.js`.
- Repeated full artifact preparation on an isolated copy: 5/5 tests PASS, including two complete preparation cycles and byte stability.
- Final browser: all three viewports PASS for journal/search/filters, empty states, import posting, error/refresh recovery, Continue order, cash shifts, manual entry and document → filtered warehouse → document.
- Original POS numerical browser control: desktop/mobile/tablet PASS (revenue 30, cost 12, stock 1→0.96 L).
- GitHub CI is required on the pushed commit; its exact SHA, run URL and final result are recorded in the release handoff.

Screenshots: `outputs/sales-ux1/{mobile,tablet,desktop}-{journal,filters,document,shifts,manual-entry,manual-form,import,empty-search,empty-journal,error}.png`. These are local isolated QA fixtures, not production records or physical-device tests.

## Known limits

- Imported report models do not guarantee receipt-level revenue, exact sale time, payment or employee. Missing values are explicitly labelled, not derived from current menu prices. Business date and document timestamp remain distinct.
- Shift opening employee is not persisted by the existing model. No new write or schema is added to fill it.
- Browser viewport emulation does not certify a physical touchscreen or on-screen keyboard.
- Existing explicit manual posting semantics and legacy stock-only grid semantics remain distinct.
- Production publication requires the user's final confirmation after all release gates pass.

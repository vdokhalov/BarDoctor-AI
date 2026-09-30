# Phase 1A — Operational Day and revenue source contract

Baseline: production v462, `6bf169eab61580ee9f683131317fece3339af29c`, confirmed through Sites version provenance and successful production deployment status on 2026-09-30. Product decisions: user-supplied PRODUCT ARCHITECTURE vNEXT, 2026-09-30. This change does not publish production.

## Read model and persistence

`GET /api/operational-days` authenticates the selected venue and reads one coherent D1 snapshot. It projects `venueId + businessDate` from existing `bd_sales_events_v1`, `bd_sales_documents`, `bd_finance_revenue`, `bd_inventory_writeoffs` and `bd_cases`. It exposes amount/source/finality/receipts/payments/asOf, cash shift identities and timestamps, operational completeness, and consistency diagnostics. Finance and Shifts use the same endpoint through the existing Finance hook. Finance retains the existing projection rows and amounts; operational metadata is overlaid only on reads, once per day for FOT.

No SQL schema change, migration, second sales ledger, event copying, or revenue table. A new `domain_data` key, `bd_operational_reports_v1`, stores only operational report metadata and hashed operation receipts. This key is necessary because the old stores have no independent day staffing/FOT report: those fields were embedded in authoritative Finance revenue rows. Existing warehouse and incident stores/services are reused. The operational key is written only through the authenticated domain operation, not generic client store replacement.

## Revenue source contract

Explicit values: `BARDOC_POS`, `MANUAL_SUMMARY`, `IMPORT`, `INTEGRATION`. `LEGACY_UNKNOWN` is a read representation for ambiguous/missing provenance, not an automatically selected venue mode. No HYBRID or new external/mixed workflow.

- Native posted Sales events (`POS_API`, `MANUAL_GRID`) classify as BarDoctor sales. Empty cash shifts with explicit lifecycle and zero amount are also identifiable.
- Import/integration sources are classified only from explicit existing fact provenance. Conflicting source families remain unknown.
- Manual guided/canonical operational close provenance identifies a manual summary. Unmarked historical rows remain readable with original amounts and an unknown source; no guessed reclassification is persisted.
- Posted event amounts/receipts/payments come from immutable facts. An amount or identity mismatch with Finance is exposed and blocks a write; it is never silently repaired.
- A confirmed legacy sales document remains protected and readable even if its source cannot be classified safely.

## Compatible section save

The existing `POST /api/shifts/close` gains the explicit opt-in `sectionsVersion: 1`. Its existing request fields and response fields remain available. New clients include the opt-in and an optional `incidents` array. Existing permission and closed-month boundaries remain enforced.

For a protected Sales day, a manual amount/receipts/payments/zoneRevenue attempt returns HTTP 201 with `ok: true`, `sections.revenue.status: REJECTED`, code `SALES_EVENT_REVENUE_PROTECTED`, and `sections.operations.status: SAVED`. `ok` confirms the saved operational operation, not acceptance of every section. With omitted monetary fields, revenue status is `READ_ONLY`. The authoritative Finance row is not written at all.

Staffing, FOT, notes, canonical writeoffs, incident rows, operation receipts and audit are committed in one CAS-protected D1 batch. Invalid writeoffs/incidents, period locks, inconsistent/corrupt stores or persistence failure leave all stores untouched. Stable operation IDs reject changed-payload retries and do not duplicate incidents or stock; an old retry after a later save cannot restore old metadata. A new editor session uses a fresh operation ID. Warehouse documents link back to the operational day through the existing Shifts deep link.

Old clients without the opt-in retain the protected-revenue rejection and write nothing. This is deliberate compatibility: those clients do not understand section results and otherwise try to write the successful response back as another Finance row. Manual clients continue to save the existing daily summary plus staffing/FOT through the same endpoint.

## Status and UI

Cash shift lifecycle remains `OPEN/CLOSED`, including the existing one-open-shift server guard. The aggregate separately exposes `OPERATING`, `AWAITING_OPERATIONAL_DATA`, `COMPLETE`. A submitted operational report records empty writeoff/incident sections as explicitly checked. A sale alone never completes the day. Open cash shifts keep the day operating even after operational data is submitted.

Posted POS revenue exists immediately as `PROVISIONAL`. Closing the cash shift changes it to `FINAL` without changing its amount. Historical standalone posted facts do not receive an invented cash shift. Multiple historical cash sessions on one date are retained in `cashShifts`; `cashShift` is populated only when singular.

The existing wizard and pages remain in place. The POS revenue section is read-only, including during contract loading, and shows human source/finality labels. Team/FOT/writeoffs/incidents save independently. The Shifts revenue summary includes posted open-day revenue and does not label it complete. No roles, device management, terminal UI, Menu redesign, Health/AI merge or new correction/refund lifecycle.

## Multi-user / multi-terminal check

The cash row owns date/currency/lifecycle, not an employee or device. Each event/batch retains its own immutable `actor`/`createdBy`. Identity is scoped to venue + source + operation ID; payload fingerprint detects conflicting reuse. Different sale IDs share a cash shift without overwriting each other. Each sale owns its batch/movement identities and captured costs. CAS retry rebuilds from fresh venue stores. Aggregation selects posted facts without a device dependency.

No foundation blocker was found for independent concurrent sales. Phase 2/3 prerequisites remain employee authentication/authorization and device/terminal identity. Existing finite CAS retries can return a retryable conflict under contention; the event history still has a 4 MB capacity guard. High-volume load certification and per-terminal delivery identity are future work, not implemented here.

## Verification and release boundary

Targeted checks cover A–M through actual authenticated routes and isolated transactional SQLite, existing Sales/POS/Finance/cost/period regressions, canonical stock and writeoff expense persistence, older operation retries, malformed-store/period/venue failures and mobile 390×844 / desktop 1280×800 UI. Browser smoke reads and writes synthetic fixtures only; physical iPhone/keyboard certification is not claimed. New UI smoke is added to GitHub CI.

Local build runs the repository's ordered prebuild/compiler/postbuild/strict Worker and asset checks through the existing Windows adapter (Bash itself is unavailable on this host). Typecheck is direct `tsc --noEmit --incremental false`; lint uses the repository ESLint config, with two pre-existing warnings and no errors. The full regression gate is the existing GitHub Actions workflow, rather than a duplicate full local browser matrix. Release approval requires its successful run for the pushed commit and synchronized GitHub source.

Production data has not been read for a full conflict census or changed. No historical cost recalculation, sales edits, row deletion, migration or cleanup. Unknown legacy provenance remains explicit; existing monetary history stays intact. Production publishing requires the user's final confirmation after all gates pass.

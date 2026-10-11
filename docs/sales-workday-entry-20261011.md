# Sales entry and workday prerequisite

Candidate based on v507 / e70c7ede8cb59c18d406d5a75eca7e8091d45dd2. Publication is not authorized for this checkpoint.

More → Sales reuses `/sales-import` and `/cashier`, retaining venue and permission checks. Shifts keeps its cashier entry. Home no longer exposes the cashier button. Warehouse removes its Sales tab/entry, retains stock movements and sales-document evidence, and redirects legacy `?tab=sales` links while preserving other parameters/hash.

Home Today uses the venue calendar timezone, refreshing while visible and on focus. The persisted working date is separately labelled, including overnight days. No reports or dates are rewritten.

New cash sessions and nonduplicate live sales/order operations require an OPEN workday with a team for the same venue/business date. Direct API and manual quick-entry paths use the same prerequisite. Workday state participates in the existing transaction snapshot/CAS boundary. Existing operation replays remain idempotent even after closure. Imports/accounting documents are not reclassified as live POS operations.

## Legacy compatibility and release decision

Existing cash sessions, orders, receipts and reports are never adopted, closed or rewritten by this change. A legacy OPEN cash session without an OPEN workday cannot accept new operations until a manager opens the workday for that same date. History and successful-operation replays remain available.

**Prepublication decision:** if an existing OPEN cash session belongs to an already CLOSED historical workday, this candidate blocks new sales and nonduplicate order changes (including cancellation). Automatic reopening would alter historical semantics and is deliberately absent. Confirm absence of that state or authorize an explicit recovery procedure before release. This checkpoint does not inspect or mutate production venues.

## Validation

- Build: PASS, generated client `index-BQGspy0I-3553c481c3e4.js`; validated ESM Worker and hosting manifest.
- Targeted domain/security/date/evidence tests: 43 PASS. Includes no-day/CLOSED/foreign venue/empty team/night dates, direct API denial, idempotent replay, and concurrent workday closure preventing cash/order writes.
- Typecheck PASS; lint no errors, three existing warnings.
- Chromium navigation: owner, administrator (`shift_manager`), cashier at 390px PASS; Sales entry, day prerequisite, Home calendar, Warehouse removal and compatible legacy redirect.
- Workday lifecycle browser: owner390/admin1280 PASS, open day/team → cash → sale → close, payroll once.
- Management/quantity browser:390/1280 PASS, quantity/precheck locking, stale-data recovery and historical report stability.
- POS recovery browser: PASS, 259 real API calls, widths 390/820/1440, no console errors.
- No full CI, remote CI or publication initiated for this candidate. Old fixtures that intentionally created live cash without a workday need explicit workday setup; changed targeted fixtures preserve their original assertions.

Screenshots and complete logs are included in the recovery archive.

## Follow-up: single active workday and cash session

User clarification supersedes the earlier suggestion to open a workday matching an already open legacy cash session: **no new workday may open while any workday OR cash session remains open in this venue, including the same date**. New cash requires an active staffed workday and no other open cash session. Existing successful open replays remain permitted. Both stores participate in CAS; concurrent-device tests allow exactly one winner.

The blocked cashier screen now retains manager-only close for an existing cash session without outstanding orders, and read-only navigation to orders/report. With outstanding orders it explicitly explains that closure, payment and cancellation are unavailable pending an explicit recovery decision. Six mobile browser cases (MISSING/CLOSED × empty/outstanding/staff) pass and preserve workday JSON. The workday screen shows the exact blocking session/date and a link to finish it. Eleven targeted server tests pass, including simultaneous cash/day opens, previous/same dates, CLOSED-day legacy cash, venue isolation, overnight and replay.

Production existence of conflicting legacy records remains unknown; no broad production scan or mutation was performed.

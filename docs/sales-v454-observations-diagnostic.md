# SALES v454 — OBS01/OBS02 targeted diagnostic

Baseline: production v454, `21bb74f089f18afaad91b73f25b6e56d4b953f55`.
Scope: two functional corrections only. No STEP 2, visual redesign, schema changes, production deployment or production data operations.

## OBS01 — reproduced

An isolated SQLite database, actual registration/authentication and `/api/sales-events` handlers reproduce the audit symptom. Open cash shift C at 2026-09-24 23:55 UTC; advance the server clock to 2026-09-25 00:10 UTC; open D. GET still returns C and D as open. Before the fix, manual preview for C returns HTTP 409 / `SALES_EVENT_SHIFT_CLOSED_OR_DATE_MISMATCH` with “Эта смена уже закрыта. Выберите открытую смену.” POS accepts C.

Root cause: backend date-validation inconsistency. POS takes the selected authoritative cash shift's business date. Manual Sale instead takes the current UTC date, then requires the shift's date to equal it. An open overnight shift therefore fails the same check/message used for a closed shift. No stale state, account/venue mismatch or ID/display substitution is necessary to reproduce it.

All three views obtain cash shifts from GET `/api/sales-events`. The authoritative records are `bd_finance_revenue` rows scoped to the authenticated data account and venue, with `revenueSource: sales_events_v1` and an explicit `closingStatus`. Cashier and Manual Sale select records with `closingStatus === open`; Cash Shifts renders the same records. The selected record's ID is sent unchanged in `command.shiftId` for both preview and post. Legacy/operational financial rows without this source and daily projections without `closingStatus` are excluded. No separate operational shift entity is joined or inferred by name in these workflows.

Fix: every command with an explicit cash shift uses that validated shift's business date, matching POS. Commands without a shift retain today's UTC date. Actual acceptance timestamp remains current; no historical record is rewritten. Closed shifts, incompatible revenue sources, month locks, account/venue boundaries, stock validation and idempotency remain enforced.

## OBS02 — auth handoff defect reproduced; literal network symptom not reproduced

Anonymous cold `/cashier`, invalid token and expired persisted session each produce HTTP 401 from the first `/api/sales-events` data request through real authentication handlers. Baseline cashier stays at `/cashier`, displays “Необходима авторизация” and marks the connection “На связи”. A genuine fetch failure produces “Нет соединения”. Thus the audit's literal offline text is not reproduced with a pure 401; there is no evidence to label it a production network failure.

Root cause of confirmed defect: standalone cashier handles 401 as an ordinary operation error and never hands off to the existing `/login` route. Fix: after preserving the existing identity/venue guard, 401 freezes work, clears session identity keys and replaces the page with canonical `/login`. Venue-scoped POS drafts and pending idempotency keys are retained. No new authentication system is added. Non-401 server failures remain controlled operation errors, and real network failure retains the existing offline message.

## Changed files

- `lib/bardoctor/sales-events.ts`: selected shift determines business date.
- `public/cashier.js`: canonical login handoff for 401; pending order retained.
- `app/cashier/route.ts`: cashier JS cache version only; markup/layout unchanged.
- `tests/sales-observations-v454.test.ts`: five isolated real-handler regression tests.
- `scripts/sales-observations-browser.ts`: local real-handler/auth browser fixtures at 390/820/1280, including auth/network/server distinction and payment recovery after expired session.
- `scripts/pos1-hardening-browser.ts`: bring the original tab to front before observing its cross-tab storage guard; retain the same guard assertions.
- `.github/workflows/google-reviews-setup-v400.yml`: mandatory new browser regression in existing CI.
- This diagnostic report.

## Regression evidence

Five new handler tests cover overnight open → GET selection → manual preview/post → same cash shift/event/batch/revenue row → POS → second open shift → close → new preview/direct POST denied; idempotent retry of an already posted sale after close; legacy shift rejection; account isolation; same-account venue switching; foreign venue denial; prior-month lock; anonymous/invalid/expired session 401 and authenticated 200.

Browser scenarios cover actual canonical login screen, authenticated startup, HTTP 503 without login or offline misclassification, interrupted network/recovery, manual overnight sale, POS overnight sale, multiple shifts, closed shift selection/direct POST, journal, persisted finance/warehouse effects, draft reload, pending order retention across 401 and retry with original ID. Existing POS hardening, manual sale and POS browser suites supply navigation, sales document/warehouse links, import, venue/account switching, lost response, duplicate click and retry coverage.

Local full pipeline PASS: 1,261 unit/handler tests plus 555 artifact/interface/operator checks (1,816 total executions; zero failures, cancellations or skips). Verified build and artifact validation PASS. Typecheck PASS. Full lint PASS with the two pre-existing warnings named below; changed-file lint has zero warnings. New OBS browser regression PASS at 390×844, 820×1000 and 1280×800, including Finance screen and expired-payment recovery. Existing POS hardening PASS separately at 390/820/1280 (cross-tab conflict, account/venue/shift isolation, drafts, retry, lost response, journal/import/document/warehouse round trip). Manual Sale Phase 5 PASS at 390/1280 (preview/cancel/post/retry/reverse/open/close/venue). Original POS-1 browser suite PASS at 390/820/1280. The exact release SHA and GitHub CI run are recorded in the deployment handoff.

Browser harness note: the first POS hardening run timed out while observing the original background tab's storage-event guard. Bringing that tab to front before the unchanged visibility assertion made the mobile cross-tab/retry scenario pass. This is a test focus correction, not a change to production storage handling.

Existing lint warnings: unused `venueMigrationExports` in `app/api/migration/koln-assortment/route.ts` and unused `cssPath` in `scripts/patch-warehouse-unit-integrity-v399.mjs`.

## Limitations and deployment boundary

The audit's original production C record was not inspected or modified in this diagnostic. The exact contradictory behavior is reproduced on isolated data with a proven overnight-date cause; the original anonymous “Нет соединения” wording remains unconfirmed. Browser QA is Chromium at 390/820/1280, not a physical iPhone/Safari test. Lint has two existing unrelated unused-variable warnings. Production remains v454; post-deployment smoke must use only the QA venue after separate explicit approval. No migrations, recalculation, production rewrite, secrets changes or additional UX stage are included.

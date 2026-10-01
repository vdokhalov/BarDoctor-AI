# CSV UTF-8 release: mandatory CI failures at 6096ff987865f62be234ecadd115efdc571e5d87

Production remains v467. This follow-up changes QA synchronization, fixtures and CI coverage only. The CSV decoding fix and application authorization/readiness implementation are unchanged.

## Operational Day: D — incorrect test calendar assumption

The failed job ran at 2026-09-30 21:02 UTC. Its isolated venue declares `Europe/Chisinau`, where the business date was already 2026-10-01. Actual Sales and Operational Day handlers returned HTTP 200 with an `OPERATING`, provisional BarDoctor POS day and revenue 20. The browser inherited UTC and the Shifts calendar selected September; the correctly persisted October record was filtered out of that month. “Касса открыта” was present, but `.bd-shift-card.operating` could not appear in September. Waiting longer cannot change that filter.

At that pinned instant, the original UTC browser reproduces the same 30-second timeout. Changing only the fixture browser timezone to its declared venue timezone produces the October card against the same application and API handlers. This is not a CloudSync/profile hydration failure or a CSV application regression. The fixture now declares its timezone and asserts its selected month against the real API business date. A scoped clock in isolated bundled handlers and Playwright's fixed browser time exercise month/year boundaries without changing Node timers or product code.

The cached-profile variant also used a fixed one-second sleep and required global readiness to remain false. That requirement predates the profile-identity hydration fix: finance can render while global sync is pending, then global sync becomes ready. It now waits for the actual `financeReady` contract and retains read-only revenue, finality, persistence, reload and page-error assertions. Test teardown drains HTTP handlers before closing its isolated SQLite database.

## Sales Navigation: B — test document-lifecycle race

Original CI artifact `sales-navigation-timings`, WebKit 390 px / 600 ms, records:

| UTC epoch milliseconds | Event |
| --- | --- |
| 1790802065469 | Authenticated `/api/business-health` response: HTTP 200 |
| 1790802065947 | SPA `/api/store` response: HTTP 200 |
| 1790802066054 | P, Warehouse → Document: Sales iframe interactive |
| 1790802066067 | Test starts a forced top-document `/cashier` navigation |
| 1790802066069 | Old SPA starts its store-event-triggered Business Health fetch |

The last fetch is rejected by WebKit's document access checks during navigation; there is no HTTP response or server authorization denial for that fetch. The prior same-origin owner fetch succeeded. The stack runs through the native fetch wrappers and the Business Health hook, whose promise rejection is caught. Playwright WebKit reports JavaScript-source console errors as `pageerror`; Chromium does not report this teardown cancellation in the same way. An interactive Sales iframe does not imply the SPA host has completed bootstrap/store reads and the resulting debounced health refresh.

Before test-forced `goto`/`reload`, QA now observes actual host profile/CloudSync readiness, no pending fetches, and a successful health read completed after the latest store read. Standalone fixture Sales documents have no SPA bootstrap/health hook and wait for their own pending reads. This synchronization is outside measured user-interface transitions. No timer duration, request header, response, permission, application gate, error filter or `errors === []` assertion is changed. API tests independently require owner HTTP 200, default cashier HTTP 403 `ACCESS_DENIED`, and anonymous HTTP 401; cashier receives no added permissions.

## Verification and deployment gate

Local Chromium 390 px: delays 0, 600 × 3 and 1200 ms, all 100 measured transitions PASS with zero page errors; widths 820 and 1280 PASS, including existing expired-session 401, server 503 and network-failure scenarios. Operational Day month boundary with cached profile and 600 ms API delay passes three full mobile/desktop repetitions; fresh profile and delayed year boundary also pass. Encoding/catalog/ingestion/health authorization targeted tests: 31/31 PASS.

Full Phase 2 browser regression passes all nine profiles: seven permitted owner/manager profiles, two denied profiles, 28 actual UTF-8 without/with BOM, ASCII and XLSX imports. Manual, Scan, Import Diff, invalid/conflict/exclusion/duplicate handling, cancel, concurrent target, lost response, idempotency, canonical/read Unicode and taxonomy, reload/hydration and existing Menu/Recipes/stock records retain their assertions. External AI/OCR is a deterministic provider fixture, not a production model call. Separate Recipes, POS, Warehouse and existing Menu compatibility suites pass on desktop/mobile emulation.

Local WebKit download remains blocked by the selected environment's domain allowlist. The required GitHub runner installs WebKit and runs both engines at delays 0/100/300/600 × 3/1200 and widths 390/820/1280. This is an explicit remaining release gate, not a local WebKit PASS claim. All three mandatory jobs (`verify`, `sales-navigation`, `sales-scroll-layout`) must complete successfully for the exact new commit before saving any Sites version.

Verified build, typecheck, lint (zero errors, two unchanged warnings), full `npm test` (1,345 TypeScript tests plus artifact/posttest suites), and actual compiled Worker/static client mobile/desktop release check all PASS. The application files under `app`, `lib`, and `public` have zero diff from 6096ff987865f62be234ecadd115efdc571e5d87; the canonical client remains `index-BQGspy0I-551eece3184c.js`.

There are no application changes beyond the preceding CSV fix, migrations, backfills, production data repairs or production mutations. The version must be saved from the exact GREEN GitHub commit, with source equality verified, and must not be deployed without the user's final confirmation. Phase 2 remains incomplete until the complete production acceptance suite passes.

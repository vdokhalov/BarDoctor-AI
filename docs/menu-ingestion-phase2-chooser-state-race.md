# Phase 2 Menu chooser ownership regression after production v468

Production remains v468 (`4cd16b34b98a43487c8022d551c84985acfa76e6`). Phase 2 is incomplete until an approved deployment passes the entire production acceptance suite. No Phase 3 work is included.

## Proven defect and source audit

Production QA venue 3316 reproduced: change Overview's analysis period, hold delivery of its real successful overview response, switch to Menu, open Add, then deliver the unchanged HTTP 200. The source chooser disappeared without user input. Owner permission, CloudSync, finance and profile readiness stayed true; canonical data stayed unchanged; no JavaScript error occurred.

This checkout has no original TSX implementation of the legacy Catalog command page. Its maintained React source is `scripts/fragments/assortment-command-v170.fragment.txt`, installed by `scripts/patch-assortment-command-v170.mjs`; later preparation scripts adapt the canonical client in `public/assets/index-BQGspy0I.js`. The Phase 2 generator runs during both artifact preparation and build. The read-only audit inspected the authoring fragment, shipped component, generator, source-choice component, Menu editor, ingestion review, Recipe editor, URL sheet, image selection, historical Catalog page and neighboring Procurement page before changing application code.

The command component's `[$,ee]=S.useState(false)` owned two incompatible lifecycles. Add/Overview import opened it with true; source selection/dismiss/venue invalidation closed it with false. The analytics effect wrote `"loading"`, null and `"error"` to that same hook. The content's analytics status/error readers and the chooser's strict boolean reader therefore shared state. An analytics start, success or error could dismiss the chooser. A successful result did not need to fail any readiness gate to cause the regression.

| State | Readers | Writers / owner |
| --- | --- | --- |
| Source chooser `$/ee` | `true` renders the source choice sheet | Add; Overview Add menu; Manual/camera/gallery/file/URL selection; explicit dismiss; existing venue invalidation |
| Analytics status, previously also `$/ee` | `data-analytics-state`; analytics offline banner | Overview request start/success/error |
| Analytics data `V/Y` | Projected analytics and existing local fallback | Current successful overview result; failure clears server analytics |
| Canonical view `E/_`, purchases `C/x`, sales `T/F` | Menu, Recipes, needs and analytics dependencies | Their own authoritative store reads/notifications and existing explicit saves |
| Manual editor `O/M` | Menu editor/detail transition | Manual selection, explicit edit, successful staging/close and existing venue invalidation |
| Scan/Import review `A/k` | Unified ingestion review | Source adapter creates persisted draft; review update/confirm/cancel; venue invalidation |
| Recognition progress `K/Q`, gallery files `te/ne`, URL sheet `L/q` | Their own progress/selection/editor UI | Recognition adapters, file selection, URL flow and explicit close |
| Recipe editor `D/z`, internal editor `B/U`, structure editor `H/I` | Their own editors | Explicit lifecycle actions and existing venue invalidation |
| Ingestion lines, preview, busy, error and dirty | Review form, Import Diff, validation messages and actions | Review editing and ingestion commands; draft identity/revision reconciliation |

The analytics effect does not write any Manual/Scan/Import/validation hook listed above. The historical Catalog page uses separate import, progress and source-selection hooks. Procurement has independent analytics status and source-selection bindings. No additional unrelated state ownership collision was found within the audited neighboring flows; their code was not changed.

## Minimal correction

The chooser's existing boolean hook, handlers and strict boolean render condition are preserved. Analytics now owns `[bdAnalyticsStatusPhase2,bdSetAnalyticsStatusPhase2]=useState(null)`. Only its three lifecycle writes and two status/error readers move to the new hook. Analytics data, request dependencies, request sequence guard, AbortController cleanup, period controls, fallback, permissions and canonical writes remain unchanged.

The existing Phase 2 generator applies this separation idempotently to both the canonical client and original authoring fragment, including its already-prepared early-return path. No timeout, retry, response suppression, DOM workaround, venue/date exception or automatic chooser reopening is introduced. Existing venue-switch invalidation still closes stale source/editor state for venue isolation.

## Deterministic regression

The new unit suite extracts and executes the actual shipped analytics effect, Add/dismiss handlers and render readers. It checks delayed success, error, request start while open, repeated periods with a superseded result, explicit close/reopen and completion while never opened. It is mandatory in `npm test`.

The existing mandatory Phase 2 browser matrix now gates delivery of responses from real isolated authenticated HTTP/SQLite overview handlers. Desktop and mobile reproduced the pre-fix failure after delivery, then passed with the separation. Browser checks retain the chooser and all Manual/Scan/Import options, apply real analytics, preserve exact readiness and canonical data, expose a controlled 503 independently, exercise repeated period changes, dismiss/reopen and source selections. Manual unsaved input survives delivery; native Scan/Import pickers retain their own selection lifecycle. Full adapters/drafts use the existing safe external OCR/model contract.

During the full matrix, real background reads and controlled error responses also preserve the dirty Manual editor, each encoding's Import Diff/validation error and Scan draft. Observations read React's committed tree without modifying application state. They verify real analytics application, exact draft/editor/error contents, readiness and unchanged canonical data. No assertion or error collection was removed.

The complete matrix retains UTF-8 CSV without BOM, UTF-8 CSV with BOM, ASCII and XLSX uploads/preprocessing, exact Cyrillic and `Без подраздела`, Manual/Scan/Import draft/validate/confirm/reload, diff additions/changes/unchanged/invalid/duplicates/exclusions/conflicts, cancel, concurrent/stale target, lost-response retry/idempotency, five taxonomy mappings and Menu grouping, owner/manager/denied permissions and reload/bootstrap readiness. Mobile checks use viewport/touch emulation.

## Release verification and safety

Local verification passed build, typecheck, lint (zero errors; two existing unrelated warnings), full npm test (including 1,345 TypeScript tests and six new ownership tests), targeted CSV/ingestion/RBAC/bootstrap tests (35/35), and five repeated artifact-preparation tests. The complete Phase 2 matrix passed all nine profiles. Seven permitted profiles produced 42 chooser scenarios and 84 background-read checks of Manual/Scan/Import/validation state; two denied profiles preserved the hidden action and server rejection contract.

Operational Day passed all five CI commands, including cached timezone/month/year boundary cases with 600 ms delay. Sales background-read navigation passed Chromium and WebKit at 390/820/1280 px, with 0/100/300/repeated 600/1200 ms delivery. WebKit and Chromium iPhone pending Back/Back each passed normal ×3 and delayed 600 ms ×3; the complete iPhone/mobile/tablet/desktop suite also passed. All 24 browser-related commands in the required verify job passed, including Menu consumption, Recipes/tech cards, Warehouse opening/CSV, purchase units, POS/navigation/retries, timezone/accounting/overnight shifts, startup/reload, general navigation and Home viewports.

Initial local WebKit scroll assertions sampled unfinished native wheel motion under parallel browser workload: 191 + 49 px and 88 + 152 px each equal the requested 240 px. Both traces had zero document-height change, zero idle ResizeObserver change and no page error. This is an existing scroll harness's fixed-delay measurement assumption, separate from chooser ownership; neither its application code nor its assertions were changed. A full v468 baseline tablet control passed, followed by the unchanged current tablet scenario after the other heavy browser job completed. The full unchanged scroll command then passed 15 profiles but stopped at WebKit plain/mobile journal idle: 73 + 167 px again equals the requested 240 px, with unchanged height/observers and no page errors. The two remaining WebKit tablet/desktop profiles were executed separately and passed, totaling 17 PASS and one local FAIL across all 18 profiles. The failed run is retained as FAIL, not reclassified as a complete local PASS. The required GitHub scroll job must pass its entire unmodified matrix before saving any Sites version.

Changed-files review confirms that all canonical client bytes outside `bdAssortmentCommandPageV170` equal v468. Removing the new hook and reversing the three writes and two readers restores that component exactly. The pushed commit must pass every required GitHub job before a matching Sites version is saved. Production deployment requires the user's final confirmation.

All verification mutations use isolated local SQLite fixtures. This fix does not mutate production QA venues 3315/3316 or any real venue, including Köln. No migration, schema, backfill, dependency, auth/RBAC, server API or business-data change is included. Application risk is confined to client state ownership; production acceptance must be rerun completely after the authorized deployment.

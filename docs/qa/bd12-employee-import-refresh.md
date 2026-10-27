# BD-12 — employee list refresh after import

Baseline production v660 / fe942950a74dc884ba1e354393848fed37a1ac29.

## Separate from BD-03
BD-03 fixed server mapping of imported job titles to position/customPositionLabel. Its browser fixture imported before opening the browser; it did not test an already-mounted employee list. The v653 and v660 employee provider and integration import client were identical. No BD-03 behavior is replaced.

## Actual baseline reproduction
Opened current compiled employee UI with two isolated employees. Navigated through the existing SPA to the native integration screen, selected CSV employee import, previewed mapping and imported third employee. Server stored three records. Returned through SPA navigation without document reload: list and count still showed two. A reload showed the third employee. Log: /tmp/bd12-baseline-ui3.log. This confirms current behavior, rather than relying on the audit symptom.

## Cause and bounded change
The integration screen refreshed only its own data after import. EmployeesProvider retained its initial array and did not subscribe to store updates. Successful employee creation/update now signals the parent application for the same venue/session. The provider reads the existing authorized /api/store/bd_employees endpoint and replaces its cache and state together. Returning to the main employee list also performs a read, allowing recovery from a failed refresh. Existing bd:store-updated signals are observed.

Read requests explicitly include venue; responses are ignored after venue/session change, newer request, unmount or a concurrent local state change. Failure retains the previous list; there is no success fabrication, optimistic employee creation or write-back. No server endpoint, authorization, PIN, role, deduplication or job title mapping changes.

## Checks
- 7 provider tests PASS: current-tenant authoritative read; foreign-tenant/account signal rejection; late response after venue change; newest response wins; HTTP failure retains state and retry works; list-entry fallback; unmount invalidation.
- 4 real import/position route tests PASS (existing BD-03 suite): titles, validation, update, repeat external ID, tenant isolation and legacy read compatibility.
- Compiled UI with real local native API routes: create third; list and count3 without reload; update name with same ID; repeat without duplicate; HTTP import failure leaves three unchanged; final reload; Бариста retained. 390/820/1280 and mobile screenshot inspected; no page errors. Mutation allowlist limited to local import/preview and auth bootstrap; no PIN or AI calls.
- Final build PASS; generated whitespace-only drift restored with non-whitespace equality check, artifact finalized and asset references verified.
- Typecheck only the two known baseline errors business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

Screenshots: outputs/bd12-employee-refresh/team-{390,820,1280}.png. Reproduction harness: scripts/employee-import-refresh-browser.ts; BASELINE=1 asserts old behavior when run with baseline assets.

## Limits
No live employee import or changes. Native multi-venue picker UI was not exercised in this scenario; scoped async behavior is tested at provider level and isolation through real import route tests. No full regression. No publication or push.

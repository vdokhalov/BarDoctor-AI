# Phase 3A.5 — Restricted Manager Finance 403 Root Cause

Date: 2026-10-02 UTC. Production remains **Sites v475**. Phase 3A.5 is **NOT COMPLETE** pending an approved deployment and passing isolated production smoke.

## Verdict

- ROOT CAUSE: startup Finance warm-read rejects before its delayed React/CloudSync consumer attaches a rejection handler.
- CLASSIFICATION: **pre-existing application defect discovered by the stronger 3A.5 acceptance** (A).
- EXISTED IN v474: **YES**.
- INTRODUCED BY 3A.5: **NO**.
- APPLICATION FIX REQUIRED: **YES**, minimal client fix prepared.
- HARNESS FIX REQUIRED: **NO** for the original smoke assertion. Browser `pageerror` and uncaught rejection correctly failed acceptance; new regression coverage keeps those assertions strict.
- SECURITY/RBAC PRESERVED: **YES**; no permission, backend authorization, schema, or canonical business writer changes.
- PRODUCTION CHANGED: **NO** in this diagnosis/remediation task.

## Exact-source behavioral proof

Both committed trees were checked out separately, without modifying their tracked sources:

| Source | Exact commit | Desktop 1280px | Mobile 390px |
|---|---|---|---|
| v474 baseline | `efdbae969272d72da6843a7cfbd193d872bfb0c4` | expected 403; real pageerror/unhandledrejection | same |
| v475 production source | `1d4ff726b1f0ced541c6f35fd5aec3abb120126b` | expected 403; real pageerror/unhandledrejection | same |
| corrected source | release commit containing this report | expected 403; no pageerror/unhandledrejection | same |

`scripts/qa/restricted-manager-runtime.mjs` serves each exact tree's committed client assets/startup shell and bundles that tree's actual API handlers. Each run uses disposable migrated SQLite and synthetic owner/invited-manager identities. The manager joins only the local QA venue through actual invitation/registration handlers, with `finance.view` denied. No production D1/R2 binding or working venue is used. This is local exact-source runtime reproduction, not a re-deployment of historical production v474.

`scripts/restricted-manager-403-browser.mjs` performs ordinary UI login, Home reload, and allowed Sales navigation at both widths. It records `pageerror`, `unhandledrejection`, `rejectionhandled`, console, network, bootstrap and response contracts across document navigation. Evidence files: `outputs/restricted-manager-403/{v474,v475,fixed}/results.json` plus screenshots. They contain no session credentials.

Example original event timings (milliseconds since document navigation; evidence, not timing assertions):

| Tree / width | unhandledrejection | later rejectionhandled | Difference |
|---|---:|---:|---:|
| v474 / 1280 | 348.2 | 458.2 | 110.0 |
| v474 / 390 | 265.2 | 437.0 | 171.8 |
| v475 / 1280 | 265.7 | 352.5 | 86.8 |
| v475 / 390 | 198.8 | 250.8 | 52.0 |

Auth/bootstrap reaches `state: ready`, reason `active_venue_ready`, one accessible venue, in every case. Sales journal remains operational. The failure is a real browser diagnostic, not a failed transport request or a crashed React root. A later handler allows CloudSync fallback to continue; it cannot undo the already emitted uncaught event. Expected HTTP 403 console resource messages alone are not treated as pageerrors.

Console also records Chrome's `Failed to load resource ... 403 (Forbidden)` and an anonymous bootstrap 401 before login. These HTTP diagnostics are distinct from the recorded `pageerror`/`unhandledrejection`. Diagnostic runs additionally record `net::ERR_ABORTED` for Operational Day background reads and, on old trees, `/api/client-runtime-diagnostic` during the login/reload/navigation sequence. Those cancellations are retained in the artifacts, not renamed PASS or used to excuse the Finance rejection; the Finance read itself completes with HTTP 403. The full regression waits for fetches/bootstrap to settle before test-forced document navigation and explicitly verifies CloudSync readiness and Operational Day behavior.

## Endpoint and response

`GET /api/store/bd_finance_expenses` returns **HTTP 403**, JSON `{ok:false, code:"ACCESS_DENIED", error:...}` and **no `data`**. The denied private expense sentinel/amount is absent from responses and restricted UI. Revenue/gap reads retain their existing source permission contracts; `finance.view` is not granted to make the warm batch succeed.

`lib/bardoctor/data-trust.ts` is the source-permission authority; `app/api/store/[key]/route.ts` enforces it. A Finance 403 for the restricted manager is correct and remains unchanged.

## Failing client path

The old getter, warm producer, and late consumer are identical in v474 and v475:

1. `bdWarmCriticalHomeV349()` runs during bundle evaluation. It creates `window.__bdStartupFinanceWarmV349 = Promise.all(...)` for revenue, expenses, gap reasons.
2. `Yse()` parses the expense denial and throws `Error("GET /api/store/bd_finance_expenses failed")`.
3. No rejection handler is attached to that startup Promise yet. The browser emits `unhandledrejection`, Playwright `pageerror`, and the application's promise diagnostic on `/home`.
4. `Woe` (CloudSync provider) waits for restaurant readiness, then calls `bdApplyHomeFinanceWarmV349()`.
5. That consumer attaches `.then(...).catch(()=>false)` later. The browser emits `rejectionhandled`; the generic/bootstrap read can continue. This delayed catch is the precise missing handling boundary.

Original stack in both trees: `Yse` at bundle `574:4581`, warm map at `619:373`, `Promise.all (index 1)`.

3A.5 changed analysis source authorization and other domain writers, but did not introduce this producer/consumer timing. The exact-source browser reproductions independently establish that distinction. The old production smoke report is preserved in `docs/phase3a5-production-smoke.md`; its original NOT PASS remains historical fact.

## Minimal remediation

Only the canonical client bundle and its existing reversible preparation script change application behavior:

- `Yse` retains HTTP status, source key, and response code on errors; both HTTP status and JSON `ok` must indicate success. A success-shaped 500 is rejected.
- Each Finance warm read handles its expected denial immediately; the aggregate rejection also has an immediate handler. Only the three expected Finance warm source keys with 403/`ACCESS_DENIED` produce `{availability:"RESTRICTED"}`. Source 401 produces `{availability:"UNAVAILABLE"}` for expired/revoked auth. Neither contains financial data. A denial cannot mask a later 500 from another warm source: the aggregate waits for all resolved reads and remains rejected on any unexpected error.
- The existing warm consumer skips these explicit unavailable results without cache writes. The authoritative RBAC-filtered bootstrap remains responsible for hydration/clearing; no parallel state or persistence framework is introduced.
- Unexpected 403 contracts, server 5xx (including misleading denial/success bodies), malformed responses, and network failures remain rejected and detectable.
- The patch's restore/reapply lifecycle preserves existing artifact preparation and content-versioned release behavior.

There is no UI redesign, permission grant, server-error suppression, schema change, migration/backfill, secret change, production mutation, deployment, or rollback. Existing provisional/derived Finance presentation semantics outside this rejection defect are not redesigned.

## Regression acceptance

`tests/restricted-finance-warm-phase3a5.test.mjs` executes actual generated getter/producer/consumer code in an isolated child process, deliberately delaying the React consumer. It tests denial timing/no cache fabrication, successful owner/permitted warm data, expired auth, unexpected 403, server 500, misleading 500 denial/success bodies, connection failure, and mixed expected 403/401 followed by another source's 500. Running against either exact old v474/v475 bundle fails five regressions (5 pass / 5 fail, deliberately retained as negative baseline evidence); corrected source passes all ten. The initial aggregate-only candidate also failed the two mixed-error controls and was replaced before any Sites version/deployment. Existing boundary and Home readiness tests remain unchanged and green.

`scripts/restricted-manager-regression.mjs` uses actual UI/handlers on desktop/mobile for restricted manager, permitted manager and owner: Home, Finance, Sales journal, Shifts, Menu catalog, Warehouse, Equipment, Reviews, Health and AI analysis; bootstrap/reload; normal profile logout and manager login; owner venue switching with isolated store verification; foreign identity denial. Permitted roles avoid real AI/provider invocation. Strict request acceptance allows expected 403 only for the restricted scenario's exact source endpoints and contract. Unexpected 401/403/5xx and every pageerror still fail. Negative acceptance probes explicitly prove this validator remains strict.

The foreign API control uses a blank same-origin QA document and a complete foreign identity header pair: its own venue read must first return 200; the QA owner's venue then returns 401 without data. This avoids confusing incomplete authentication headers or the application's intentional stale/foreign response-scope guard with server tenant authorization. Fault controls also accept a fast React consumer legitimately catching an unexpected rejection; their real unexpected HTTP statuses still fail normal acceptance. The delayed-consumer generated-code tests independently prove those errors remain rejected. These are new fixture/control corrections, not a correction of the original production `pageErrors=[]` assertion.

The new generated-code regression is included in full `npm test`; actual-client matrix is included in required GitHub `verify` CI. Existing Phase 3A.1–3A.5 handler, native D1, evidence/browser and security checks are retained without weaker assertions.

## Release / completion boundary

Local gates on the prepared source:

| Check | Result |
|---|---|
| Targeted generated-code, analysis boundary, Home readiness | 15 PASS |
| Phase 3A.1–3A.5 actual-handler security/evidence/writer tests | 87 PASS |
| Full `npm test` including verified build/typecheck and the new regression | 2020 PASS; 0 fail; 0 skipped |
| Lint | PASS; 0 errors; two unchanged warnings in the existing migration route and warehouse patch |
| Actual compiled Worker / native D1 phase boundaries and evidence | 2 PASS |
| Repeated artifact preparation, stable packaged/canonical bytes | 5 PASS |
| Evidence foundation / Revenue browser, desktop/mobile | PASS; revenue 90, 3 sales; foreign/anonymous/revoked denied; read-only |
| Cost/Warehouse browser, desktop/mobile | PASS; captured cost and writeoff valuation 18.3; 3 ingredients/movements |
| Menu Origin browser, desktop/mobile | PASS; 8 resolved record types; tenant/RBAC; read-only |
| Phase 3A.5 native-browser security/reviews/Equipment-Finance | PASS; no external provider calls |
| Operational Day browser, desktop/mobile | PASS; businessDate/finality; Finance 20; Warehouse -1 |
| Corrected actual-client Finance denial, desktop/mobile | PASS; 403 retained; no uncaught rejection/pageerror; bootstrap ready; Sales usable |
| Final actual-client role/route/CloudSync/logout/reload/switch matrix | 6 role/width cases PASS; 10 routes each; valid foreign identity denied; three real fault controls rejected by acceptance |
| Compiled Worker and emitted static client release integrity, desktop/mobile | 1 PASS; content-versioned bundle agrees with canonical source across five emitted entrypoints |

Changed files: `public/assets/index-BQGspy0I.js`, `scripts/patch-canonical-boundary-phase3a5.mjs`, `tests/restricted-finance-warm-phase3a5.test.mjs`, `scripts/qa/restricted-manager-runtime.mjs`, `scripts/restricted-manager-403-browser.mjs`, `scripts/restricted-manager-regression.mjs`, `package.json`, `.github/workflows/google-reviews-setup-v400.yml`, this RCA report and the preserved historical production smoke report. Application scope is only the first two files; other changes are QA, CI and evidence documentation. Manual diff review confirms no backend/RBAC/schema/business-writer changes.

Source must be committed/pushed, all required CI jobs green for that exact SHA, and the next saved Sites version must report that same source SHA. The final handoff records those returned release identifiers; the report is included in that exact commit and does not embed a self-referential commit SHA. **Saving does not authorize deployment.** Production remains v475 until one final user confirmation. Phase 3A.5 remains NOT COMPLETE until the subsequently approved isolated production smoke passes.

**PRIMARY D1 FAILURE ROOT CAUSE: UNKNOWN — NOT REPRODUCED.** This reproduced Promise-handling defect is independent of that incident. Phase 3A.6 and other audit GAP remediation are not started.

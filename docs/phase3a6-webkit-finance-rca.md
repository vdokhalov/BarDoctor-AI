# Phase 3A.6 Finance WebKit 390px — isolated RCA

## Authorized continuation — harness corrected and gate PASS

On 2026-10-03, following owner authorization, only the observer's serialization was corrected: it is evaluated from the plain QA JavaScript file `scripts/qa/finance-save-refresh-observer.js`. This preserves the six-notification barrier and every business/no-page-errors assertion. One final pass succeeded in Chromium and WebKit at 390/820/1280 with the same controlled 40ms API latency. Finance remained 300 / 90 / 210 and all six runs had zero pageerrors. The earlier STOP below is historical. RCA-only script sources were retained outside the minimal release tree at `/workspace/phase3a7-rca-diagnostics/scripts/`; execution logs remain in the documented outputs. No application code changed in this continuation.

Date: 2026-10-03. Production remains **Sites v479**, source **f017250aa8c7f45af8abc227e8b8d46a1f4074c8**. No commit, push, Sites save, deployment, rollback, migration, backfill or production business-data mutation was performed. Phase 3A.7 remains NOT COMPLETE; Phase 3A.8 was not started.

## Verdict on the original blocker

- **ROOT CAUSE:** the Finance browser harness replaces the Shifts document before both scheduled post-save store-notification batches have finished. The readiness predicate can observe pending fetches = 0 between batches. Subsequent notifications initiate operational-day reads after `beforeunload` in the outgoing document; WebKit rejects those requests during navigation and reports “Fetch API cannot load … due to access control checks.” This is not a demonstrated permission denial or a server CORS failure.
- **CLASSIFICATION:** TEST BUG / navigation race. Ordinary effect-cleanup AbortController cancellations are expected browser behavior and are distinct from the four failing requests.
- **USER-VISIBLE IMPACT:** none demonstrated in Finance calculation. Isolated runs preserved revenue 300, recorded payroll 90 and preliminary result 210. Recorded payroll remained 90 after a current-rule change; completed day revenue remained FINAL. The original failure is in the no-page-errors assertion. This RCA does not claim all mobile/browser release gates passed.
- **DATA CORRUPTION:** NO observed in the reproduced isolated scenario; the failing calls are reads, and duplicate-sale / recorded-payroll assertions passed before the original assertion failure. No production data was used or changed.
- **APPLICATION FIX REQUIRED:** NO for this blocker.
- **TEST FIX REQUIRED:** YES.
- **MINIMAL FIX:** observe the existing save contract’s six scheduled store notifications, registered before the save action, then drain their resulting reads before a test-forced document replacement. Preserve all existing business assertions and `assert.deepEqual(errors, [])`; do not filter messages, modify app requests, add retries or increase timeouts.
- **REGRESSION REQUIRED:** the actual Finance flow in Chromium and WebKit at 390/820/1280, including save→Reports, recorded payroll after rule changes, revenue aggregation/idempotency/finality and strict no-page-errors. Include controlled response latency to expose notification/navigation interleaving; verify ordinary handled AbortError remains separate from unexpected errors.

## Exact source and request lifecycle

`public/assets/index-BQGspy0I.js` contains `Ur()` (`useFinance`) and `bdShiftCloseApiV272()`. Both functions are byte-identical to exact baseline f017250. SHA256:

- `Ur()`: `d5ada7e4b0afc8c76c1dea1532ceca08b32fd3b4fd6fdf4bf311c37b9c3056d5`.
- `bdShiftCloseApiV272()`: `79c114b9c41961c2853fc73f192dd76de810afac476991e26fcdbcec36a68314`.

The only existing application asset difference from f017250 remains the previously authorized removal of the warehouse auto-repair invocation. This RCA introduced no application change.

`Ur()` requests `/api/operational-days` with authenticated same-origin headers, credentials, cache=no-store and an AbortController signal. Its effect depends on ready, scope, revenue and refresh revision. `bd:store-updated`, `bd:shift-closed` and focus increment that revision. Effect cleanup aborts the previous read; rejected reads are caught. The Shifts screen and open report editor both consume this hook, explaining paired requests while the editor is mounted.

`bdShiftCloseApiV272()` accepts the successful POST `/api/shifts/close`, updates existing client projections and schedules two `setTimeout(..., 0)` notification batches:

1. `bd_finance_revenue`, `bd_cases`.
2. `bd_assortment_v1`, `bd_stock_movements`, `bd_inventory_writeoffs`, `bd_finance_expenses`.

The editor also dispatches `bd:shift-closed` and closes. Editor disappearance is not proof that scheduled refresh work has finished.

The original harness `scripts/finance-inputs-phase3a6-browser.ts` waits for editor disappearance, closes isolated shift C server-side, then calls `navigate('/reports…')`. `tests/helpers/sales-navigation-settled.ts` checks provider readiness and the current fetch pending counter. It does not track scheduled future store events. `page.waitForLoadState('networkidle')` in `navigate()` applies to the destination document, after `page.goto()`.

In the failing reproduction, the later Finance refresh is not caused by a venue switch or `location.replace()`. It is caused by queued save notifications crossing the harness’s explicit `page.goto()` boundary. Ordinary React cleanup aborts earlier reads on the same page; those produce handled AbortError, not the four access-control pageerrors.

## Independent reproduction and browser comparison

All actual application runs use the same local lifecycle runtime, migrations and real route handlers, fresh synthetic owners and isolated venues, Europe/Chisinau, MDL, fixed business date 2026-10-02. Two sales produce 100 + 200; the recorded report payroll is 90. No provider or production endpoint is used.

Diagnostic scripts observe fetch signal state, effect abort stacks, store events, document identities, beforeunload/pagehide and browser events. They preserve actual request behavior. The served module is asserted byte-identical to the working canonical module before appending the existing QA observer.

A diagnostic run without artificial latency passed; the timing-sensitive failure reproduced with the existing fixture delay setting at 40ms. This is timing variation, not evidence that the original gate should be retried until green.

| Same isolated 390px scenario, 40ms API fixture latency | Chromium | WebKit |
|---|---:|---:|
| Operational-day fetch starts over the whole flow | 39 | 38 |
| Successful HTTP 200 fetch resolutions | 14 | 13 |
| Handled AbortError rejections | 25 | 21 |
| TypeError Load failed during outgoing-document navigation | 0 | 4 |
| Pageerrors | 0 | 4 |
| Revenue / recorded payroll / preliminary result | 300 / 90 / 210 | 300 / 90 / 210 |

Request totals vary with effect scheduling; they are observations, not a fixed request-count product contract.

WebKit’s four pageerrors have the **old Shifts document URL**. The trace establishes this sequence (milliseconds from the fixed time origin):

- +8518: report save POST returns 201.
- +8519: `bd:shift-closed`.
- +8527/+8529: reads 8 and 9 start.
- +8589/+8593: reads 8 and 9 return 200.
- +8598: first scheduled notification batch.
- +8608: **beforeunload** begins.
- +8610: second scheduled notification batch in the same old document; reads 10 and 11 start.
- +8618: both reject with **TypeError / Load failed**, signal not aborted at rejection.
- +8620: subsequent cleanup aborts those signals.
- +8622: superseding reads 12 and 13 start while navigation remains in progress.
- +8623: **pagehide**.
- +8644: reads 12 and 13 also reject with **TypeError / Load failed**, signal not aborted at rejection.

Successful 200 reads therefore coexist with later cancelled reads of the same endpoint. A success does not retroactively complete future refreshes. There is no foreign-venue response, 403, business-value mismatch or proven CORS rejection in this trace.

Playwright WebKit maps protocol console messages with level=error/source=javascript to `pageerror` (`node_modules/playwright-core/lib/server/webkit/wkPage.js`, `_onConsoleMessage`). The observed access-control messages did not trigger DOM `window.error` or `unhandledrejection` in the diagnostic document. Ordinary signal abortions were caught as AbortError. No app exception suppression was added.

## Minimal independent browser control

`scripts/finance-cancellation-browser-rca.mjs` uses a standalone HTML document and a local JSON endpoint; **no BarDoctor code**. It compares ordinary caught AbortController cancellation against a deferred fetch launched after beforeunload, with a controlled destination response delay to retain the outgoing document long enough to observe the race.

Eight cases per engine cover interception on/off, fixed clock on/off and unloading on/off:

- Chromium: 0 pageerrors in all 8 cases.
- WebKit: ordinary handled cancellation gives 0 pageerrors in all 4 non-unloading cases. Deferred outgoing-document fetch gives the **same access-control pageerror in all 4 unloading cases**, with and without clock/interception.
- The ordinary read still returns `{ok:true, revenue:300, payroll:90}` in each case.

This excludes application calculations, RBAC, application AbortController cleanup, the QA probe, fixed-clock emulation and route interception as necessary causes of this browser message. It does not authorize ignoring unexplained errors elsewhere.

## Minimal harness correction attempted — mandatory STOP

Only `scripts/finance-inputs-phase3a6-browser.ts` was changed: before save it registers observation of all six expected store notifications; after editor close it waits for notifications, network idle and host readiness. Assertions, timeouts, application code, configuration and security gates were not weakened.

**Typecheck PASS. Lint PASS: 0 errors, 2 existing warnings.**

The first corrected-gate runs were started in Chromium and WebKit with the same 40ms fixture latency. Both failed at **line 120**, before save and before the intended new barrier could execute:

- WebKit: `page.evaluate: ReferenceError: Can't find variable: __name`.
- Chromium: `page.evaluate: ReferenceError: __name is not defined`.

**New blocker classification: TEST BUG.** The newly added nested named callback is transformed by tsx/esbuild with a `__name` helper. Playwright serializes the evaluate callback into the browser without that Node-side helper. Type checking cannot detect this cross-runtime serialization dependency. This is a mistake in the attempted harness correction, not a business defect.

Both first-attempt runs report no earlier application pageerrors, but **neither is a passing gate**. The failure occurs before save; no conclusion about the corrected save→navigation behavior is claimed. Tablet/desktop were not reached in either corrected run. There were no retries, further code fixes or release operations after this FAIL, as requested.

Next minimal test-only correction, requiring resumed authorization after this STOP: make the browser observer self-contained without relying on tsx-injected closure helpers, for example through a QA-only plain-JavaScript observer file following the existing probe pattern. Retain exact notification coverage, cleanup and strict assertions, then rerun the Finance gate once and stop on any failure. Do not add a global `__name` to application code or suppress ReferenceError.

## Evidence files

- Original failure retained: `outputs/finance-webkit-rca/preceding-failure-network.json`.
- Actual WebKit causal trace: `outputs/finance-webkit-rca/webkit/delay40-failure-network.json`; `webkit-reproduction-delay40.log`.
- Same-scenario Chromium trace: `outputs/finance-webkit-rca/chromium/success-network.json`; `chromium-reproduction-delay40.log`.
- Standalone controls: `outputs/finance-webkit-rca/minimal-{webkit,chromium}.json` and associated logs.
- First corrected-gate failures: `outputs/finance-webkit-rca/{webkit,chromium}-fixed-gate.log`.
- Static checks: `outputs/finance-webkit-rca/{typecheck,lint}.log`.

The diagnostics are local and uncommitted. Earlier result files are historical; the first corrected-gate logs above are authoritative for the current STOP.

## OWNER EXPLANATION — SIMPLE LANGUAGE

Финансовые суммы в проверке были правильными. Тест слишком рано уходил со страницы после сохранения: часть обновлений ещё была в очереди. WebKit сообщал об отмене запросов уходящей страницы так, будто была проблема с доступом. Причина этого сообщения доказана отдельно. Попытка исправить ожидание в тесте остановилась из-за ошибки самого нового тестового обработчика. Поэтому проверка ещё не пройдена и публикация не готова. Рабочие заведения и production не менялись.

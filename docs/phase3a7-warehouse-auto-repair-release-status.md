# Phase 3A.7 warehouse auto-repair remediation — STOP

## Current final release pass — local GREEN (2026-10-03)

The owner authorized a minimal correction of the Finance harness serialization defect and one full final pass. The observer now runs as plain QA JavaScript from `scripts/qa/finance-save-refresh-observer.js`, avoiding tsx closure helpers. All six post-save notifications and subsequent reads are still required before replacing the document. The strict no-page-errors and business assertions remain intact.

All mandatory local gates passed on the final release source: typecheck; lint (0 errors / 2 existing warnings); npm test 2097/2097; build; A/B 44/44; explicit repair 4/4; warehouse client 2/2; compiled native Worker/D1 4/4; artifact preparation 5/5 and independent repeat 5/5; Phase 3A.1–3A.6/security targeted 109/109; client contracts 18/18. Real Chromium and WebKit acquisition, warehouse navigation/read-only and Finance each passed 390/820/1280. Finance retained 300 revenue / 90 recorded FOT / 210 preliminary result and zero pageerrors with controlled 40ms API latency. Existing evidence, canonical boundary, cost/warehouse, menu origin and restricted/permitted/owner browser gates also passed.

The application asset still differs from production f017250 only by removal of the automatic repair call from the warehouse readiness effect. No server or business calculation source changed. LAST PURCHASE PRICE and published A/B remain unchanged. Existing explicit repair retains RBAC/CAS/idempotency/accepted-mutation audit.

Local logs and gate manifests: `outputs/phase3a7-final-pass/`. Prior RCA-only source copies were archived to `/workspace/phase3a7-rca-diagnostics/` after passing typecheck/lint, solely to keep them out of the minimal release diff, not to make checks green. No compiler exclusions changed. Current source includes the necessary regression fixtures and QA observer.

GitHub CI, exact source push and a saved Sites version are subsequent release gates; this local record does not itself claim deployment readiness or production completion. Production remains v479/f017250 until separately approved. Migration/backfill/production mutations: NO. Phase 3A.8 not started. PRIMARY D1 FAILURE ROOT CAUSE: UNKNOWN — NOT REPRODUCED.

The following STOP sections retain historical evidence and are superseded for local gate status by this final pass.

## Current RCA outcome — STOP (2026-10-03)

The independent Finance WebKit RCA is in [phase3a6-webkit-finance-rca.md](phase3a6-webkit-finance-rca.md). The original access-control pageerror is proven to originate from a harness navigation race crossing queued post-save refresh events, reproduced without BarDoctor in WebKit. Business calculations are not the demonstrated defect.

The authorized minimal Finance harness correction was attempted without removing assertions or modifying application behavior. Typecheck and lint passed. **Its first Chromium and WebKit gate attempts both failed at `scripts/finance-inputs-phase3a6-browser.ts:120`, with a `__name` ReferenceError caused by serialization of a tsx-transformed nested callback.** This is a new TEST BUG in the attempted correction. The run did not reach save or tablet/desktop. No retry or further fix was performed after FAIL. No release actions were performed. Production remains Sites v479/f017250; Phase 3A.7 remains NOT COMPLETE.

The following sections retain prior execution history; their earlier UNKNOWN RCA status is superseded by the linked report, not a new release PASS.

Authoritative baseline: production Sites v479, GitHub/source `f017250aa8c7f45af8abc227e8b8d46a1f4074c8`. Changes remain uncommitted in `/workspace/BarDoctor-warehouse-readonly`. The lost working tree was not searched or recovered.

## Current resumed attempt — warehouse test fixed, STOP at WebKit Finance

The authorized TEST BUG fix is implemented only in `scripts/warehouse-readonly-phase3a7-browser.ts`. Venue switching now registers the exact target URL/load wait before clicking the selected venue, verifies the old-document marker is absent in the new document, checks the active venue and waits for settled host reads. No assertions were removed or weakened. Application code was not changed during this resumed attempt.

Repeated gates:

- Typecheck PASS; lint PASS with 0 errors and 2 existing warnings.
- Targeted A/B 44/44; readiness/valuation client 2/2; explicit repair 4/4 PASS.
- Full npm test 2097/2097; build PASS.
- Native Worker/D1 4/4; artifact preparation 5/5 and independent repeat 5/5 PASS.
- Chromium and real WebKit acquisition A/B and warehouse navigation PASS at 390/820/1280.
- Repair POST count 0 and canonical bytes/timestamps/audit unchanged across current v4 and legacy fixtures in both browser engines.
- Separately scheduled Phase 3A.1–3A.6/security unit regression 116/116; client contracts 18/18 PASS.
- Canonical Boundary, Evidence/Revenue, Cost/Warehouse and Menu Origin browser checks PASS.
- Restricted/permitted/owner Finance authorization and mobile/desktop navigation, login/reload/venue switch browser regression PASS.
- Chromium Finance Phase 3A.6 PASS at 390/820/1280.
- **WebKit Finance Phase 3A.6 FAIL at 390px**, before reaching 820/1280.

Exact failing command:

```
BD_FINANCE_BROWSER=webkit node --import tsx scripts/finance-inputs-phase3a6-browser.ts
```

The gate fails at `scripts/finance-inputs-phase3a6-browser.ts:125` on its unchanged `assert.deepEqual(errors, [])`. Four page errors were recorded:

```
Fetch API cannot load http://127.0.0.1:45429/api/operational-days due to access control checks.
```

Direct evidence: the failed-request events report **Load request cancelled**. All four errorEvents were recorded on `/shifts?month=2026-10&venue=1`, following the explicit Operational Report close action, although the final assertion executes later on Reports. Fetch trace also contains successful HTTP 200 reads of `/api/operational-days`. Therefore this error message alone is not proof of server RBAC denial or CORS failure, and it must not be classified as another venue-switch test bug without evidence.

The existing client operational-data effect uses an AbortController, aborts on effect cleanup, and catches rejected fetches; it depends on ready/scope/revenue/revision. This provides a cancellation hypothesis. The current trace does not prove which browser/application/test layer produces the pageerror during cancelled fetches. **Root cause and APPLICATION BUG vs TEST/RUNTIME classification remain UNKNOWN pending targeted RCA.** WebKit itself launched and executed the warehouse/acquisition suites successfully, so this is not the previous missing-runtime/libraries environment blocker.

The Finance harness and application effect were not changed. No rerun, retry, assertion suppression or automatic fix was performed after this mandatory FAIL. No commit, push, new CI run, Sites save or deployment was performed. Production remains v479/f017250; migration/backfill/production business-data mutations remain NO. Phase 3A.8 was not started.

Evidence: `outputs/webkit-finance.log`, `outputs/finance-inputs-phase3a6/webkit/failure.{png,txt}`; passing warehouse results are in `outputs/warehouse-readonly-phase3a7/{chromium,webkit}/results.json`.

Owner explanation: ожидание переключения заведения в тесте исправлено, и проверки склада прошли в обоих браузерах. Публикацию остановила отдельная проверка финансов в WebKit: браузер сообщает об отменённых запросах рабочего дня. Причину ещё нужно доказать. Рабочие заведения и production не менялись.

## Historical preceding STOP attempt

The sections below preserve the preceding attempt's evidence. Its warehouse-navigation failure is resolved by the current attempt above; it is not the current blocker.

## Restored scope

Warehouse readiness now calls only `L()`. The automatic `bdWarehouseRepairProducts()` invocation was removed. The preparation patch preserves that expression through restore/build. Byte comparison against baseline proves the application asset differs only in this single expression; all `app/` and `lib/` source bytes, including published A/B, repair endpoint, LAST PURCHASE PRICE and stock calculations, remain unchanged.

New type-safe regression files cover the readiness effect, canonical four-position partial valuation, real owner/manager authorization, restricted/revoked/foreign denial, explicit legacy repair, idempotency, accepted-mutation audit, stale CAS conflict and transaction rollback. The browser harness uses actual local handlers and two owned isolated venues with separate data accounts, current v4 and legacy fixtures. POST bootstrap and both Home initializations complete before the canonical baseline. The baseline includes all domain store JSON bytes, timestamps and all audit rows. Existing A/B coverage is reused without changing assertions or business logic.

The existing repair endpoint and client command are retained. This change adds no repair button or other UI flow.

## Gates executed

| Gate | Result |
|---|---|
| Typecheck | PASS after final fixture typing changes |
| Lint | PASS, 0 errors, 2 existing warnings |
| Targeted A/B | 44/44 PASS |
| Readiness/valuation client contract | 2/2 PASS |
| Explicit repair | 4/4 PASS |
| Full npm test | 2097/2097 PASS, repeated after final fixture changes |
| Build | PASS |
| Native Worker/D1 | 4/4 PASS |
| Artifact preparation | 5/5 PASS |
| Independent repeated artifact preparation | 5/5 PASS |
| Chromium acquisition A/B, 390/820/1280 | PASS |
| Chromium read-only warehouse navigation, 390/820/1280 | PASS |
| WebKit acquisition A/B, 390/820/1280 | PASS on actual WebKit 26.0 |
| WebKit warehouse navigation | FAIL at 820px, final return to primary venue; 390px completed; 1280px not reached |
| Subsequent separately scheduled security / Phase 3A.1–3A.6 gates | Not executed after STOP; existing relevant unit/native coverage passed above |
| Commit / push / new CI / Save Sites version / deployment | Not performed |

Chromium navigation verifies repair POST count 0 for open/reload/away-back/viewport resize/venue switch, with canonical bytes/timestamps/audit unchanged in both fixtures. It verifies denominator 4, valuedCount 3, unvaluedCount 1, canonical total null, knownSubtotal 280, UNKNOWN value null and genuine KNOWN_ZERO value 0. Quantity completeness is checked separately: KNOWN_ZERO price does not make an unanchored quantity complete.

A/B suites preserve exact count 2 − sale 1 + receipt 2 − sale 1 = 2, contributorCount 3, MATCH, complete true; advancing-clock stable revision and valid old binding; real business changes invalidate bindings; historical captured cost stays 20 while current LAST PURCHASE PRICE becomes 40 then 50. No global timestamp/hash semantics were changed.

## Exact blocker

Failing gate: `BD_STOCK_BROWSER=webkit node --import tsx scripts/warehouse-readonly-phase3a7-browser.ts`, at width 820.

Classification: **TEST BUG — incomplete navigation synchronization**, not a WebKit environment failure.

Exact error (ephemeral local port shown as observed):

```
page.goto: Navigation to "http://127.0.0.1:35473/warehouse" is interrupted by another navigation to "http://127.0.0.1:35473/warehouse?venue=3"
    at goto (.../scripts/warehouse-readonly-phase3a7-browser.ts:68:119)
    at async <anonymous> (.../scripts/warehouse-readonly-phase3a7-browser.ts:97:59)
```

Root cause: the new harness `switchVenue()` at lines 69–71 waits for `bd_active_venue_id` and current-page read readiness, but does not wait for the venue switch's new document navigation. Existing `public/venue-switcher.js` persists the ID at line 239, then calls `window.location.replace(safeTargetForVenue(...))` at line 243. The test's following forced `page.goto()` at line 97 races that replacement. The replacement targets the correctly selected venue 3. This is not evidence of a stock calculation, authorization or repair regression.

The 820px pass assertions at line 95 had already checked unchanged canonical snapshots and repair POST count 0 in both primary and legacy venues. The final switch-back check did not complete, so this viewport and the full WebKit navigation gate are **not PASS**. The failure screenshot and page text are retained in the new checkout's `outputs/warehouse-readonly-phase3a7/webkit/failure-820.*`; the exact error is in `outputs/webkit-warehouse-readonly.log`.

Minimal follow-up: synchronize the harness with the actual expected venue target URL/document load and then settled host reads before any forced goto. Keep every current business/RBAC/snapshot/POST-count assertion. No arbitrary retry or increased timeout is needed. **This test change was not implemented after FAIL**, following the owner's STOP rule.

## Safety and release state

Production remains Sites v479. No migration, backfill, production business-data mutation, repair, reset, rollback, deployment, secrets or production resource changes. QA business mutations occurred only in local isolated SQLite/native D1 fixtures. Phase 3A.8 was not started. PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED.

Phase 3A.7 remains NOT COMPLETE; no GAP closure is claimed. No new release SHA/version exists, and no deployment approval is requested while a mandatory gate is failing.

## OWNER EXPLANATION — SIMPLE LANGUAGE

Подготовлено исправление, при котором открытие склада не запускает исправление его данных. Проверки расчётов, доступа и чтения прошли. Публикация остановлена: один тест в WebKit начал открывать склад раньше, чем завершилось переключение заведения. Нужно поправить ожидание в тесте и повторить проверки. В production ничего не изменено.

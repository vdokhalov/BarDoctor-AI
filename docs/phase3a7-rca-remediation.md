# Phase 3A.7 RCA A+B remediation — pre-deployment verification

## 2026-10-03 authorized continuation — both blockers resolved; fresh local release gates GREEN

Production remains **Sites v478**, exact source `d5ebcc21f995972c55581c794d74925fd62b99ce`. Phase 3A.7 remains **NOT COMPLETE** pending a separately authorized deployment and fresh isolated production smoke. Phase 3A.8 has not started. The earlier STOP records below are retained as historical evidence.

### Native setup correction and read-only proof

Only the fixture/setup in `tests/acquisition-stock-worker-phase3a7.test.mjs` changed in this continuation. Bootstrap now uses the existing **POST** endpoint; response status and body are checked once. Both owner and manager must select active venue 1 / workspace 1, have the expected role, and expose that active membership. The cold manager's expected own-venue initialization creates exactly the five canonical stores identified by RCA. A second bootstrap preserves all `domain_data` rows (including every tenant's content and timestamps) and all audit rows. Only after complete initialization do the evidence reads take before/after snapshots; each permitted, denied or guessed-reference read preserves those snapshots. No production auth or A/B business behavior was changed.

Classification: **TEST FIXTURE BUG / EXPECTED INITIALIZATION**. The wrong-method 405 was not an application defect. Fresh native acquisition preflight: **2/2 PASS**. After the full build, the compiled Worker/native D1 release group: **5/5 PASS**, including phase 3A.1 evidence, phase 3A.5 writer safety and actual compiled/static client integrity.

### Real WebKit runtime, without validation bypass

The cached Playwright 1.58.2 WebKit revision 2248 was available. Official Debian packages were downloaded through the configured proxy and checked against repository SHA-256 values. Host execution still lacked a system `ldconfig` entry for libGLESv2 and non-root access could not refresh that cache; validation was not disabled. Instead, the managed Docker daemon successfully pulled official `debian:trixie-slim`, digest `sha256:a99cfc517144bc59b1978475ec53b46ecabec7e43635402ee5b77cc54cd1b20a`. In that isolated QA container, the existing Playwright **install-deps webkit** completed normally and the full dependency validation passed. The checkout and node_modules were mounted read-only; only QA output artifacts were writable. Suites ran as UID 1000 using the actual cached WebKit runtime. No Forbidden Playwright-image pull was repeated, no TLS/proxy bypass or browser substitution was used.

WebKit acquisition prerequisite: **390 / 820 / 1280 PASS**. After the full build, WebKit acquisition and existing Finance 3A.6 suites were repeated: **390 / 820 / 1280 PASS** for both. Chromium passed the same six cases. Screenshots and result JSON are under `outputs/acquisition-stock-phase3a7/{chromium,webkit}` and the existing Finance QA output directories.

### Fresh full local release gate

| Gate | Result |
| --- | --- |
| Targeted acquisition + RCA A/B | **44/44 PASS** |
| Typecheck, including local diagnostic scripts | **PASS** |
| Lint | **PASS**, 0 errors / 2 unchanged warnings |
| Full npm test and included verified build | **2093/2093 PASS**, build PASS |
| Compiled Worker/native D1 group | **5/5 PASS** |
| Acquisition Chromium 390 / 820 / 1280 | **PASS / PASS / PASS** |
| Acquisition WebKit 390 / 820 / 1280 | **PASS / PASS / PASS**, actual runtime |
| Finance 3A.6 Chromium and WebKit 390 / 820 / 1280 | **PASS**, both engines |
| Evidence Foundation, Cost/Warehouse, Menu Origin, Canonical Boundary browser regressions | **PASS** |
| Operational Day mobile/desktop | **PASS** |
| Restricted Finance 403 and owner/permitted/restricted manager navigation | **PASS**, mobile/desktop |
| Phase 3A.1–3A.6 unit, source permission, tenant, live nested RBAC, revoked membership and writer/CAS regressions | **PASS**, included in full npm test and native group |
| Repeated byte-stable artifact preparation | **5/5 PASS** |
| Artifact manifest/ESM Worker source integrity and git diff whitespace | **PASS** |

Fresh logs: `/tmp/phase3a7ab-rerun-{targeted,typecheck,lint,full,native,chromium,webkit,artifact,source-integrity,evidence-foundation,cost-warehouse,menu-origin,canonical-boundary-browser,finance-browser,finance-webkit,restricted-finance,restricted-manager,operational-day}.log`. Environment preparation and native preflight logs: `/tmp/phase3a7ab-{post-bootstrap-native,webkit-dependencies,webkit-debian-pull,webkit-container-deps,container-webkit-prerequisite}.log`.

### A / B / historical cost / security evidence

**A:** Real purchase/count/sales handlers and compiled Worker reproduce count 2 → named-warehouse sale −1 → receipt +2 → named-warehouse sale −1: current **2 pcs**, explained **2 pcs**, post-anchor contributors **3**, **MATCH**, evidenceComplete **true**. Pre-anchor receipts are excluded. Global proof retains __venue__, one configured warehouse and multiple warehouse contributors; explicit warehouse proof keeps its own grain and cannot borrow an aggregate anchor. Opening/count/lifecycle, idempotency/same-time boundaries and legitimate PARTIAL/UNKNOWN/KNOWN_ZERO remain covered.

**B:** Real advancing clock in native D1 and advancing server clock in both browser engines preserve unchanged content revision and successfully resolve the prior binding. Relevant purchase document/line, stock quantity, movement amount/lifecycle, anchor actual/identity, selected receipt cost/identity/disappearance and canonical document updatedAt mutations return **READ_MODEL_CHANGED**. An advancing business date that actually changes receipt eligibility invalidates the binding without writes. An unrelated product movement leaves the binding valid. Only derived line costBasis.asOf is excluded from valuation revision; canonical timestamps remain relevant.

**Historical cost:** New purchase Z changes quantity **2 → 4**, last price **40 → 50**, valuation **80 → 200** and selected document **Y → Z**; the old binding becomes stale and the historical sale's captured cost remains **20**, with its batch unchanged. LAST PURCHASE PRICE is unchanged; UNKNOWN does not become zero. Missing acquisition remains honest PARTIAL.

**Security/read-only:** Owner/permitted/restricted/revoked checks, foreign venue/workspace/dataAccount, guessed warehouse/purchase/line/movement/source-file IDs and live nested acquisition authorization retain their assertions. Parent availability grants no child access. Every evidence resolution in the targeted helper and native test preserves canonical content/timestamps/audit; failed reads are included. No outbound provider operation was made by the native fixture.

Final source/manual review and GitHub/CI/Sites provenance are the next release steps; this local GREEN record does not itself claim required GitHub CI, a prepared Sites version or production completion. The prepared version and exact SHA will be recorded in the release handoff after verification.

**Migration: NO. Backfill: NO. Production business-data mutations: NO. New ledger/source of truth: NO. Deployment/rollback: NO. PRIMARY D1 FAILURE ROOT CAUSE: UNKNOWN — NOT REPRODUCED.** Remaining GAP count stays **10** until successful deployment and smoke close G08/G15/G17: G05, G06, G07, G08, G12, G13, G15, G16, G17, G18.

## 2026-10-03 continuation — classification established; setup attempts failed, STOP

Original native blocker classification: **TEST FIXTURE BUG**; the observed first-call writes are **EXPECTED INITIALIZATION**, not a newly proved A/B application defect. `tests/helpers/native-worker-runtime.mjs` manually inserts manager account 2 without owns_venue, whose schema default is true (`db/schema.ts:19`); that account has no own venue. `auth.ts:314–353` creates the missing own venue and its five canonical stores on first authentication. The prior failure's five account-2/venue-2 rows exactly match this branch. No production auth or A/B helper was changed.

The RCA native test was extended to complete initialization before business/evidence baseline snapshots, assert the five expected stores, assert a second bootstrap leaves canonical bytes/timestamps/audit unchanged, and retain every original full read-only/RBAC assertion. However, this implementation attempt used the wrong bootstrap HTTP method, and its verification failed before completing setup:

- Command: `node --test tests/acquisition-stock-worker-phase3a7.test.mjs`.
- Result: **FAIL, 1/2 PASS**; new RCA case fails during fixture setup with `SyntaxError: Unexpected end of JSON input`.
- Exact cause: fixture calls **GET** `/api/auth/bootstrap`, while `app/api/auth/bootstrap/route.ts:10` exports **POST**. Compiled Worker telemetry explicitly reports **405**, and parsing that empty response causes the SyntaxError. This is an introduced test-fixture error, not an observed mutation after completed initialization.
- Initialization/idempotency and evidence read-only after initialization remain unverified by this attempt. No automatic correction/rerun was made after observing the mandatory FAIL. No assertions were removed or narrowed to hide account-2 writes.
- Log: `/tmp/phase3a7ab-initialized-native.log`.

WebKit setup used the available managed Docker daemon (verified explicitly through `/var/run/docker.sock`) and attempted the official runtime `mcr.microsoft.com/playwright:v1.58.2-noble`. Image layer/configuration download failed: **`error pulling image configuration: download failed after attempts=6: Forbidden`**. The daemon is available; the chosen official image download is blocked. This output does not establish the precise rejecting registry/proxy host or prove that every other dependency-installation method is impossible. No policy/TLS bypass, privilege escalation, custom application behavior or browser assertions change was attempted. WebKit remains unavailable and no WebKit viewport acceptance ran in this continuation. Log: `/tmp/phase3a7ab-webkit-container-pull.log`.

STOP applied. Fresh full release gates were not completed. Earlier PASS results remain historical evidence, not a newly successful release gate. No commit/push/CI/new Sites version/deployment/rollback; no production data mutation, migration/backfill or secrets/resource changes. Production is still v478 / `d5ebcc21f995972c55581c794d74925fd62b99ce`. Phase 3A.7 NOT COMPLETE; Phase 3A.8 not started; PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED.

## Latest continuation: typecheck resolved; native manager fixture and WebKit host dependencies block release

The sole remaining diagnostic error was corrected by declaring the browser JSON result as the existing EvidenceResolution contract and asserting/narrowing permitted outcomes before evidence access. Existing projection value, restricted role, no writes, no browser errors and no 5xx assertions are preserved. No A/B production business helper, compiler configuration, exclusions or security gates were changed in this continuation. The production diagnostic script was typechecked only, not executed.

Fresh required gate results:

| Gate | Result |
| --- | --- |
| Typecheck including all local diagnostics | **PASS**, exit 0 |
| Lint | **PASS**, 0 errors, 2 existing warnings |
| Targeted A/B + acquisition | **44/44 PASS** |
| Full npm test / included verified build | **2093/2093 PASS**, exit 0 |
| Chromium 390 / 820 / 1280 | **PASS / PASS / PASS** |
| Repeated artifact preparation / byte stability | **5/5 PASS** |
| Compiled Worker/native D1 group | **FAIL**, 4/5 PASS, 1 FAIL |
| WebKit 390 / 820 / 1280 | **BLOCKED / FAIL at launch**, no viewport acceptance completed |

Chromium covers the exact count 2 → named sale −1 → receipt +2 → named sale −1 chain (current 2, contributors 3, MATCH, complete), price 40/value 80, advancing-clock stable binding, real purchase Z invalidation (quantity 4/value 200), historical captured cost 20 preserved, read-only snapshots, warehouse/procurement/suppliers/menu/Finance navigation and no overflow/browser errors. Targeted regression separately checks explained quantity, pre-anchor exclusion, explicit warehouse scope, legitimate PARTIAL/UNKNOWN/KNOWN_ZERO, relevant changes and tenant/RBAC/live nested authorization. Full npm test retains the Phase 3A.1–3A.7 unit/artifact regression. This does not establish full release readiness while mandatory gates below fail.

### Exact blocker 1 — native read-only assertion on first manager request

Failure: `tests/acquisition-stock-worker-phase3a7.test.mjs:18` inside snapshot comparison, called by line 22 (first `manager` STOCK_VALUATION resolve). Before that request, native owner quantity proof and advancing real-clock stable-binding assertions (lines 19–21) pass.

Snapshot adds five empty domain rows for **account_id=2**, timestamp `2026-10-02T22:22:55.836Z`: `bd_assortment_v1` (authoritative-persistence-v1, **venueId=2**), `bd_inventory_snapshots`, `bd_purchase_documents`, `bd_stock_movements`, `bd_suppliers`. This is not a changed owner stock quantity or valuation result. The assertion compares all accounts and correctly rejects these writes; it must not be weakened to ignore the manager's data.

Existing native fixture manually inserts account 2 without supplying `owns_venue` or its own venue; the first authenticated request traverses existing `auth.ensure_owner_venue`. `lib/bardoctor/auth.ts:314–353` creates an owner venue for an account marked as owning one when absent and initializes authoritative stores when `createdVenue=true`. The native fixture therefore reaches read-only measurement before that account's initialization is complete. This is a fixture/auth-initialization boundary blocker, not evidence that the A/B helpers write owner stock. No correction or rerun was performed after FAIL. A future correction must finish valid fixture initialization before the measured reads, retain full before/after canonical/timestamp/audit equality, and leave production auth/business logic unchanged unless separately justified.

### Exact blocker 2 — WebKit host dependencies

`browserType.launch` fails at `scripts/acquisition-stock-phase3a7-browser.ts:44`: missing `libgtk-4.so.1`, `libgraphene-1.0.so.0`, `libmanette-0.2.so.0`, `libhyphen.so.0`, `libGLESv2.so.2`. No WebKit viewport test ran. Earlier local dependency preparation supplied woff/harfbuzz libraries in the local browser cache; that did not satisfy the full Playwright host validation. Validation was not bypassed. No dependency correction or retry was made after this mandatory FAIL.

Logs: `/tmp/phase3a7ab-final-typecheck.log`, `/tmp/phase3a7ab-final-lint.log`, `/tmp/phase3a7ab-final-targeted.log`, `/tmp/phase3a7ab-final-full.log`, `/tmp/phase3a7ab-final-native.log`, `/tmp/phase3a7ab-final-chromium.log`, `/tmp/phase3a7ab-final-webkit.log`, `/tmp/phase3a7ab-final-artifact.log`. Chromium artifacts: `outputs/acquisition-stock-phase3a7/chromium/result.json` and screenshots.

**STOP rule applied:** no automatic fixes/reruns after these mandatory failures; no commit/push/required GitHub CI/new Sites version/deployment/rollback. Production remains v478 at `d5ebcc21f995972c55581c794d74925fd62b99ce`; no production business mutations, migration or backfill. Phase 3A.7 NOT COMPLETE; 10 GAP remain; Phase 3A.8 not started. PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED.

## Continuation: original 20 errors corrected; one newly exposed type error blocks release

The owner authorized correction of the current type errors and a fresh release gate. This continuation did not change either production business helper, TypeScript/compiler settings, exclusions, assertions or security/CI gates. Diagnostic scripts remain in the checked tree and were not executed against production.

Individual original diagnostics and corrections (line numbers refer to the original failure):

| # | Original diagnostic | Correction |
| --- | --- | --- |
| 1 | browser regression 90:14, `second` unknown | Type the JSON result with existing EvidenceResolution contract and narrow through resolvedEvidence |
| 2 | browser regression 90:26, `first` unknown | Same response contract; first retains asOf |
| 3 | browser regression 90:51, `first` unknown | Narrow first evidence before accessing revision |
| 4 | browser regression 90:75, `second` unknown | Narrow second evidence before accessing revision |
| 5 | browser regression 90:114, returned read unknown | reread returns EvidenceResolution; compare its declared code |
| 6 | browser regression 90:128, `first` unknown | Use narrowed firstEvidence.reference |
| 7 | browser regression 92:58, returned read unknown | Same typed reread contract for real mutation |
| 8 | browser regression 92:72, `first` unknown | Use narrowed firstEvidence.reference |
| 9 | browser regression 93:53, `latest` unknown | resolvedEvidence validates outcome before projection access |
| 10 | browser regression 93:105, `latest` unknown | Same narrowed projection; quantity/value assertions preserved |
| 11 | production diagnostic 87:153, callback `e` implicit any | Browser is Playwright Browser rather than any; pageerror callback infers Error |
| 12 | production diagnostic 87:199, callback `r` implicit any | Typed Browser/Context/Page infers Response |
| 13 | production diagnostic 87:294, callback `r` implicit any | Typed Browser/Context/Page infers Request |
| 14 | production diagnostic 88:57, `route` implicit any | Typed context.route infers Route |
| 15 | production diagnostic 96:42, `venueId` implicit any | Typed page.evaluate infers numeric input from supplied argument |
| 16 | production diagnostic 96:50, `workspaceId` implicit any | Same Playwright evaluate input inference |
| 17 | production diagnostic 96:62, `key` implicit any | Same supplied argument inference |
| 18 | production diagnostic 96:66, `email` implicit any | Same supplied argument inference |
| 19 | production diagnostic 96:72, `token` implicit any | Same supplied argument inference |
| 20 | sensitivity diagnostic 23:90, delete required asOf | Destructure only derived asOf and construct the stable basis; no delete or optionality weakening |

Fresh verification:

- Targeted A/B + acquisition regression: **44/44 PASS**, `/tmp/phase3a7ab-resume-targeted.log`.
- Typecheck: **FAIL, exit 2**, exactly one remaining diagnostic: `outputs/phase3a7-production-smoke.ts(97,40): error TS18046: 'read' is of type 'unknown'`. This was newly exposed when Browser stopped being any: page.evaluate's returned JSON also needs an explicit/narrowed evidence result contract. It is a diagnostic-script typing issue, not a reason to change production business logic.
- Lint: 0 errors, two existing warnings, `/tmp/phase3a7ab-resume-lint.log`.
- Diff whitespace check: PASS.
- Build/full npm test/native/Chromium/WebKit/required CI were not completed in this continuation; no GREEN claim is made.

Per the owner's mandatory STOP rule, no further code correction or gate rerun was made after observing this failure. No commit/push/new Sites version/deployment/rollback. Production stays v478; no production business mutations/migration/backfill. Phase 3A.8 not started. Phase 3A.7 NOT COMPLETE. PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED.

Baseline: production Sites v478, `d5ebcc21f995972c55581c794d74925fd62b99ce`.
Status: **NOT READY FOR DEPLOYMENT; Phase 3A.7 NOT COMPLETE**.

## Implemented locally, not committed

- A: `stock-quantity-evidence.ts` now selects all own-scope product movements for an authoritative global balance, including named warehouses. Explicit warehouse movement scopes remain restricted. A global anchor is not accepted as proof of a specific warehouse balance, including explicit `__venue__`.
- B: `stock-evidence.ts` excludes only derived `valuation.lines[*].costBasis.asOf` from revision input; response/eligibility metadata and canonical timestamps remain. Selected valuation receipts and live acquisition document/line content use existing `readReceiptAcquisition`, including multiple warehouse bases. Missing/incompatible acquisition remains partial. `evidenceContentRevision` and expectedRevision guard are unchanged.
- No changes to LAST PURCHASE PRICE, writers/CAS, ledgers/storage, historical captured sale cost, UI/UX or Phase 3A.8.
- Added handler/pure A+B regressions, isolated real-command fixture, compiled Worker/native regression, stronger existing browser scenario and inclusion of targeted RCA tests in existing required CI.

## Verification actually completed

`node --import tsx --test tests/stock-evidence-rca-phase3a7.test.ts tests/acquisition-stock-phase3a7.test.ts`: **44/44 PASS**.

This proves locally: count 2 → named warehouse sale −1 → receipt +2 → named warehouse sale −1, quantity 2 / contributors 3 / MATCH / complete; no pre-anchor duplication; global/specific scopes; legitimate PARTIAL/UNKNOWN/KNOWN_ZERO; advancing real clock stable valuation revision and successful old binding; purchase document/line/quantity/movement/lifecycle/anchor/receipt/updatedAt/date-eligibility changes invalidate binding; unrelated product movement does not. Purchase Z changes quantity 2→4, cost 40→50, value 80→200 while historical sale batch is unchanged. Actual nested/revoked/restricted/foreign/guessed evidence checks and read-only snapshots also pass in this targeted suite.

`npm run lint`: **PASS, 0 errors**, two existing warnings (`koln-assortment/route.ts` and `patch-warehouse-unit-integrity-v399.mjs`).

`git diff --check`: PASS.

## Mandatory gate failure and stop

`npm test`: **FAIL, exit 2 at typecheck**. No later full-test/build/native/browser/release gate is claimed PASS.

Exact diagnostics: **20 TypeScript errors**:

| File | Errors | Cause |
| --- | --- | --- |
| `scripts/acquisition-stock-phase3a7-browser.ts` | 10 | New `page.evaluate` reread result inferred as unknown; accesses at lines 90, 92, 93 lack typed/narrowed response |
| `outputs/phase3a7-production-smoke.ts` | 9 | Pre-existing ignored local diagnostic script has implicit-any bindings/callbacks |
| `outputs/phase3a7-rca-sensitivity.ts` | 1 | Pre-existing ignored RCA script deletes a non-optional typed property |

The local `tsconfig.json` includes `**/*.ts` and excludes only node_modules, so ignored diagnostic scripts are still typechecked. The browser errors are introduced by this implementation work and require correction; they are not a flaky test or evidence of infrastructure failure.

User gate instruction applies literally: «Если любой обязательный gate FAIL: STOP». No fixes or gate reruns were made after observing this mandatory failure. Assertions, compiler configuration and CI gates were not weakened or bypassed. Full log: `/tmp/phase3a7ab-full.log`; targeted/lint logs: `/tmp/phase3a7ab-targeted.log`, `/tmp/phase3a7ab-lint.log`.

Required next work before any release: correctly type/validate browser responses, address local diagnostic typechecking without weakening the gate, then resume all requested mandatory checks under a separate continuation instruction. Native/browser tests added here have not yet been run against a new build.

## Safety / release state

- Production remains v478; no production business data mutations during this remediation turn, including QA mutations.
- No migration/backfill/data repair/reset/secrets/provider operations.
- No commit, push, required CI run, new Sites version, deployment or rollback.
- PRIMARY D1 FAILURE ROOT CAUSE: **UNKNOWN — NOT REPRODUCED**.
- Phase 3A.7 remains NOT COMPLETE. No GAP is newly CLOSED: remaining 10 — G05, G06, G07, G08, G12, G13, G15, G16, G17, G18. Phase 3A.8 not started.

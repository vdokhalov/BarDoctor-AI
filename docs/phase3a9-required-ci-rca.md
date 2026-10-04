# Phase 3A.9 required CI RCA
## Current owner-directed decision scope

The owner now authorizes a bounded final RCA, minimal test/CI corrections and an
explicit PASS/FAIL/ENVIRONMENT_BLOCKED release policy. Native crashes must have
process and lifecycle evidence; ordinary application/security failures remain
blocking. Only after all application gates are green may the exact tested source
be committed, pushed, checked by required GitHub CI and saved as a Sites version.
Production deployment still requires a separate owner confirmation.

Current policy and bounded comparison: [WebKit release gate](phase3a9-webkit-release-gate.md).
The original CI failure evidence below is retained; it is not evidence of the
status of a future exact-SHA CI run.


Classification: **B. TEST BUG**. Application code is unchanged by the correction.

Implementation SHA: `76400a1a39fd26fb1be1789158af22c62709a884`.
The supplied `76400a1a39fd26fb1be1789158af22cc62709a884` contains an extra `c` and is not the checked-out commit.

Run: https://github.com/vdokhalov/BarDoctor-AI/actions/runs/37144413135
Job: `sales-navigation`, ID `111265309061`.
Step 9: `Phase 3A.9 WebKit canonical Health, source revisions, reload and venue switch`.
Start/end: 2026-10-03 18:33:22Z / 18:34:09Z.

Exact command:

```sh
BD_HEALTH_BROWSER=webkit node --import tsx scripts/health-inputs-phase3a9-browser.ts
```

Exit code: 1. First real failure and complete relevant stack:

```text
page.waitForFunction: Timeout 30000ms exceeded.
    at waitForSalesHostReads (/home/runner/work/BarDoctor-AI/BarDoctor-AI/tests/helpers/sales-navigation-settled.ts:5:14)
    at <anonymous> (/home/runner/work/BarDoctor-AI/BarDoctor-AI/scripts/health-inputs-phase3a9-browser.ts:41:189) {
  name: 'TimeoutError'
}
Node.js v24.19.0
Process completed with exit code 1.
```

Column 189 identifies the final wait after `page.reload()` and `networkidle`.
The preceding assertions verified complete-zero Operations, Home/Doctor snapshot equality,
changed source revision, null Operations for the missing source and accepted UI cache update
for that iteration. No business assertion failed. The failed wait is a compound readiness predicate.

CI browser: Playwright 1.58.2, WebKit 26.0 revision 2248, Ubuntu 24.04 build.
The script runs 390/820/1280 x 900. The exact failing CI width is **not recorded** in the
job log. Its failure screenshots/HTML/results were generated locally on the runner but
the upload paths omitted `outputs/health-inputs-phase3a9/webkit`; the downloaded artifact
contains only the previous Finance suite. Do not infer the CI width from elapsed time.
The navigation is fixture `/home` (then `/home?venue=1`) on an ephemeral loopback port.
The CI log does not record that port or any failed network URL. The relevant readiness
reads are `/api/business-health`, `/api/store` and `/api/store/:key`.

## Causal evidence

The exact implementation was reproduced in a separate detached checkout with diagnostic
logging only, preserving all assertions and the 30000ms timeout. Initial runs passed;
a subsequent unforced WebKit run reproduced the same post-reload wait failure at 1280x900:

```text
pending: 0
healthStatus: 200
lastStoreEnd: 3328
lastHealthEnd: 3258
```

A server Health snapshot was present with the expected insufficient-data state.
The guard requires `lastHealthEnd >= lastStoreEnd`, which remained false for the entire wait.

A controlled read-only experiment reproduced that condition at 390x900 by completing
a valid Store GET after the bootstrap Health GET. At timeout it recorded:

```text
pending: 0
healthStatus: 200
lastStoreEnd: 3923
lastHealthEnd: 3411
cloudReady: true
financeReady: true
restaurantReady: true
profile: true
```

An explicit authenticated canonical Health GET returned 200, Operations score null,
low confidence and unavailable operational-report evidence. Its input revision matched
the revision encoded in the existing UI snapshot ID. The **unchanged** readiness guard
then passed, without changing any business data, application code, predicate or timeout.
The diagnostic experiment rethrew the original timeout and exited 1; it did not turn a
failure into a passing test. Eight additional diagnostic runs passed all three widths,
confirming dependence on request completion order rather than a deterministic score failure.

Root cause: G06 used the existing host-read guard without ensuring its prerequisite:
an explicitly completed Health read after the final Store read. Bootstrap timing can
leave the guard false even with ready providers and a valid canonical snapshot. Canonical
Health reads D1 directly, so the relative completion time of unrelated client Store reads
does not itself establish whether the Health evidence is current.

## Environment comparison and correction

CI: Ubuntu 24.04.5 hosted runner, Node 24.19.0, npm 11.17.0, clean locked install,
Playwright-installed browser dependencies and Ubuntu WebKit revision 2248.
Local: Debian 13.6, Node 24.19.0, npm 11.9.0, the same locked Playwright/browser revision,
session-provided native browser libraries. Local host validation was bypassed after actual
library loading was verified; browser execution and assertions remained active.
Both environments use isolated actual-handler SQLite fixtures, fixed browser date and
the checked-in production client. No production endpoint or business venue is involved.
No particular OS or npm difference is asserted to cause the failure: it reproduced locally.

Correction is limited to the G06 browser harness: explicitly read and decode canonical
Health, assert HTTP 200, then invoke the unchanged host-read guard. This follows the
existing Phase 3A.8 harness preparation. Every previous assertion and timeout is preserved. The reload scenario also asserts a successful read-only Store GET before settling, covering the previously order-sensitive prerequisite.
CI also uploads the existing G06 screenshots, HTML and results for later failures.
No application logic, thresholds, permissions, source contracts, migration or backfill changes.

Release remains gated on all post-fix checks, required CI, exact source equality,
owner-approved deployment and isolated production smoke. G06 remains OPEN until smoke PASS.

## Blocker 1: verify / Mobile and desktop navigation QA

Classification: **B. TEST BUG**.

Original run 37144413135, implementation SHA above. Job `verify`, ID
`111265308883`; step 51 `Mobile and desktop navigation QA`, start/end
2026-10-03 18:51:58Z / 18:53:24Z. Exact command:

```sh
npm run test:mobile-navigation
```

The job-log connector repeatedly returned `Transport closed`. Other retrieval attempts
included the individual Actions step URL, the run log archive endpoint and the run/job
metadata endpoint. Metadata confirmed the failed step, but these adapters did not expose
its log bytes. This is a retrieval limitation, not a proven root cause of the CI failure.
The original CI log and its exact first failing line remain unavailable through these tools;
no claim is made that GitHub deleted it.

The exact command was reproduced without changes in detached checkout
`/workspace/phase3a9-ci-repro` at the exact implementation SHA. Exit code 1;
first failing scenario `iphone-13/business-health-cold-start`:

```text
Business Health Home did not render
    at businessHealthColdStartFlow (scripts/mobile-navigation-qa-v269.cjs:1222:11)
    at runProfile (scripts/mobile-navigation-qa-v269.cjs:1591:18)
    at scripts/mobile-navigation-qa-v269.cjs:1609:23
```

Local browser: packaged Chromium 149, iPhone 13 descriptor, viewport 390x664.
Fixture Home URL: `http://127.0.0.1:4175/home?venue=901`; Home and mocked Health
requests returned 200. The UI remained in the existing Health loading state. No console
or network error was collected in this reproduction. Evidence:
`/workspace/blocker1-navigation-exact.log`.

The freshly returned fixture declares `business-health-engine-v4`, while this exact
implementation's client requires `business-health-engine-v5`. A diagnostic invoked the
actual client parser against the original envelope and the same envelope with only its
calculationVersion corrected. Result:

```json
{"clientVersion":"business-health-engine-v5","fixtureVersion":"business-health-engine-v4","oldRejected":true,"matchingParsed":true}
```

Evidence: `/workspace/blocker1-version-proof.log`. The diagnostic retained and rethrew
the original assertion failure; it was not used as a passing gate. This deterministic
contract mismatch exists in the exact command's checked-in fixture on both CI and local.
CI Ubuntu 24.04.5/npm 11.17 versus local Debian 13.6/npm 11.9 does not change these
version strings or the parser's required version; both use Node 24.19 and the locked client.

Permitted correction: change only the *fresh* navigation fixture from engine-v4 to engine-v5.
The deliberately stale saved engine-v3 snapshot, expected scores, rendering assertions,
timeouts and error collection remain unchanged. The full post-fix exact navigation command
passed (exit 0, `passed: true`, no failures), evidence
`/workspace/blockers-fixed-navigation.log`.

## Blocker 2: Phase 3A.8 WebKit access-control page error

Classification of the original access-control page error: **B. TEST BUG**.

Exact command:

```sh
BD_DERIVED_BROWSER=webkit node --import tsx scripts/derived-metrics-phase3a8-browser.ts
```

Original unchanged assertion: `assert.deepEqual(errors, [])` at the end of the foreign
venue probe. Exit code 1. The assertion collects errors over the *whole* page lifetime;
its location after venue switch did not identify when the error actually happened.
Chromium reproduced the exact sequence successfully at 390/820/1280x900.
Natural WebKit reproduction failed at 820x900. Instrumentation retained the original
assertions, error collection and timeouts.

The original error happened during forced document reload, before venue switch. Recorded
lifecycle on the isolated fixture (epoch milliseconds):

| Time | Event |
| --- | --- |
| 1791055208240 | Explicit Health read completes with HTTP 200 for venue/account 1 |
| 1791055208245 | Test starts reload, email `month-close@isolated.test`, venue 1, pending reads 0 |
| 1791055208247 | Existing delayed Health callback invokes fetch in the departing document |
| 1791055208249 | WebKit reports access-control page error |
| 1791055208255 | Replacement document navigation |
| 1791055209515 | Foreign venue probe begins, venue 1 → 2, same actor/account 1 |
| 1791055209541 | Explicit foreign Health probe receives 401 / authorization required |

The failing old-document fetch was blocked before a browser network request/server receipt.
It has **no HTTP status or response body**; inventing a 403/401 for it would be incorrect.
The prior completed read was 200; the later foreign Health read was
`401 {"ok":false,"error":"Необходима авторизация"}`. The foreign month-close probe
returned 401 / UNAVAILABLE, without old closing 304 or foreign business data.

Relevant browser stack:

```text
Fetch API cannot load http://127.0.0.1:46183/api/business-health due to access control checks.
    web-inspector://bootstrap.js:550:29
    tracedFetch (bardoctor-preview-v397.js:45:32)
    authenticatedFetch (bardoctor-preview-v397.js:1672:38)
    guardedFetch (venue-switcher.js:145:40)
    bdFetchBusinessHealthV377 (assets/index-BQGspy0I.js:618:165)
    bdRefreshLiveBusinessHealthV335 (assets/index-BQGspy0I.js:622)
    debounced Health refresh callback
    Playwright clock _callFirstTimer / _runTo
```

Root cause: `page.clock.setFixedTime` installs Playwright's clock. A successful Store update
schedules the existing 120ms Health debounce. The old harness's pending-read guard observes
started fetches but cannot see a future timer. One trace recorded a timer due at performance
3902 while reload began at 3899 (3ms left), pending reads zero. The fake clock subsequently
ran this callback while its document was leaving. The callback's effect was still live
(`disposed: false`), and it already had its application rejection handler; this was not a
foreign-venue response or a backend authorization denial.

Evidence:
`/workspace/blocker2-lifecycle/timer-8/webkit/820-lifecycle.json`,
`/workspace/blocker2-timer-8.log`,
`/workspace/blocker2-lifecycle/1/webkit/820-lifecycle.json`.

A controlled harness experiment completes the documented 120ms debounce in the live
document, waits for the existing Health promise to become idle, and retains the explicit
HTTP-200 read plus the unchanged readiness/error assertions. It passed both engines at all
three widths. Permitted local correction uses this synchronization in the Phase 3A.8
harness only; it does not increase a timeout or change application sources.

An additional actual-handler check creates a second owned isolated QA venue through
`POST /api/venues` and switches through the existing switcher/active-venue route. Both
engines at all three widths returned Health 200 with the new venue/dataAccount, no old
Finance score/closing value, and no page errors. Foreign venue probes retained 401.
Evidence: `/workspace/blocker2-owned-controlled-chromium.log`,
`/workspace/blocker2-owned-controlled-webkit.log` and the
`/workspace/blocker2-lifecycle/authorized-controlled/` traces.
The observed original error has no demonstrated user-visible or RBAC impact in these
normal authorized-switch checks; this does not prove the absence of every possible impact.

## Additional post-correction FAIL: session disappears after WebKit reload

Classification: **D. UNKNOWN — mandatory release STOP**.

After the permitted test corrections, the exact main-tree Phase 3A.8 WebKit gate failed
at 390x900 before any foreign venue probe. Exit 1:

```text
AssertionError [ERR_ASSERTION]: 401 !== 200
    at settled (scripts/derived-metrics-phase3a8-browser.ts:32:342)
    at scripts/derived-metrics-phase3a8-browser.ts:40:158
```

Evidence: `/workspace/blockers-fixed-derived-webkit.log`. Chromium passed the main-tree
390/820/1280 suite. The unexpected 401 was reproduced with diagnostic logging at 1280
(`/workspace/blocker2-postfix-5.log`) and at 820
(`/workspace/blocker2-session-local-4.log`). Passing diagnostic repetitions do not erase
this failure and are not substituted for a GREEN release gate.

A buffered storage/request trace at 820 records:

- Auth bootstrap succeeds with the original actor/session and venue 1 (HTTP 200).
- The main document writes the session email/token and active venue 1 after reload.
- Several subsequent Health/Store/profile reads are authorized and return 200.
- `/api/operational-days` reports cancellation and then `WebKit encountered an internal error`.
- Session email, token and active venue subsequently read as null.
- The explicit Health probe sends empty email/token/venue headers and receives
  `401 {"ok":false,"error":"Необходима авторизация"}`.
- Storage instrumentation records the successful session writes but **no clear/remove
  call in the observed main-document realm**. It therefore does not identify a JavaScript
  clearing stack or prove that the browser reset storage. No foreign venue was selected.

Evidence: `/workspace/blocker2-postfix-buffer-820.json`. QA tokens are redacted.
The backend rejects the unauthenticated request; this is not evidence of a backend RBAC leak.
The QA sequence cannot read canonical Health after the session disappears. A production
user impact or application-wide cause has not been established.

Native logs (`/workspace/blocker2-webkit-native-*.log`) contain a MiniBrowser automation
context warning in passing runs too, so it is **not** classified as the root cause.
An independent plain-HTML two-browser storage isolation control passed, including closing
the other browser context (`/workspace/blocker2-storage-isolation.log`). Cgroup OOM counters
are zero. Neither an environment fault nor an application bug is proven by these signals.

Missing evidence: the actual initiator/mechanism of session loss (including other document
realms/native storage lifecycle), and a causally equivalent reproduction with native browser
clock versus Playwright clock and a supported CI-native WebKit environment. These are needed
to distinguish application behavior from harness or browser/environment failure. No
speculative storage repair, session reinjection, assertion/timeout change or application fix
was attempted after this unexpected failure.

## Release state

Earlier pre-navigation/Phase-3A.8 corrections: targeted G06 22/22, npm test 2144/2144,
typecheck/build/lint, native Worker/D1 6/6, artifact repeatability 5/5, G06 browser matrix,
Phase 3A.1–3A.7 critical regressions and security/RBAC passed. These earlier results do
not constitute a complete gate for the new local test corrections.

The two original UNKNOWN causes are classified above and their permitted fixes are local.
The additional session-loss failure remains UNKNOWN. Full release gates are paused;
no commit/push, new required CI run, Sites source push, saved Sites version or deployment.
Implementation HEAD remains `76400a1a39fd26fb1be1789158af22c62709a884`.
Production remains Sites v481 at `38689be624d3c2bf440b767af6bfbab17c23b265`.
Migration NO; backfill NO; production business-data mutation NO. Only isolated local QA
fixtures were used. G06 remains OPEN; remaining gaps G05/G06/G16/G18. Phase 3A.10 not started.

## Follow-up: standalone session-loss investigation

See [the separate narrow RCA](phase3a9-session-loss-rca.md). It records document lifecycle,
cookies/storageState, actual headers, native process signals/stacks, app-free reproduction,
native/Playwright clock and Chromium comparisons. The loss follows a native
WPENetworkProcess crash/restart; it does not happen at document creation itself. The
originating native memory fault and a stable correction remain unresolved. The final
instability/stop classification stays D. UNKNOWN. No new correction was adopted and
no full release gate or release action followed.

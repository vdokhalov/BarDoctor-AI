# Phase 3A.9 WebKit release policy and final bounded RCA

Production remains Sites v481, source `38689be624d3c2bf440b767af6bfbab17c23b265`.
The application implementation is `76400a1a39fd26fb1be1789158af22c62709a884`.
All subsequent changes are test, artifact output, observation, CI and documentation.
No migration, backfill, production business-data mutation or deployment is authorized here.

## Harness correction

The stable runner failed with ENOTDIR because three new paths appended `/webkit`
after `browser.json` / `summary.json`. The correction places the browser directory
before the filename. Chromium paths stay unchanged. Actual stable execution now
produces distinct Chromium and WebKit files, with all three WebKit widths present.
All seven mandatory stable suites pass at 390/820/1280: Finance, acquisition,
warehouse, actual-login/session/canonical Health/RBAC, evidence/revenue/security,
captured cost/warehouse/security and menu-origin/security.

The passive observer now runs on HTTP(S) documents, where storage exists, instead
of the opaque initial about:blank document. It never restores lost credentials.
Application pageerrors, console errors and failed requests remain recorded.

## Two precise native signatures

1. **WPENetworkProcess SIGABRT/SIGSEGV**, followed by measured same-origin,
   same-document loss of previously present localStorage/sessionStorage/cookie,
   then a real empty-auth Health request (or the single G06 post-reload
   `/api/store/bd_assortment_v1` control read) with its unchanged read200 assertion
   failing on exactly 401 / `Необходима авторизация`. This chain already reproduces
   without the BarDoctor frontend, with native and Playwright clocks.
2. **WPEWebProcess SIGSEGV during teardown after all unchanged application assertions
   PASS.** Historical 1280 trace identifies main process PID 102093 (plus its
   threads), executable WPEWebProcess, fatal SIGSEGV at 1791063853.550898 seconds.
   Child exit was 0 and its completed output confirms Home=Doctor, source revision,
   reload, venue switch and pageErrors=[]; the native fault was observed while
   finishing context teardown. This is a native runtime teardown failure under
   the owner's explicit release policy, not evidence of a failed G06 contract.
   An originating allocator defect or equivalence to the NetworkProcess defect
   is not claimed.

The new classifier accepts signature 2 ONLY with live evidence: all assertions
completed, intact session/cookie, context-close started before the fatal signal,
no test failure or pageerror, no unexpected Health result/server error, and only
explicitly identified WPENetworkProcess or WPEWebProcess/SIGSEGV fatal processes.
Unknown processes/signals, an assertion failure before teardown or missing
lifecycle evidence remain FAIL. Historical success output alone is insufficient
for granting an exception to a new execution.

## Bounded comparison, 2026-10-04

Raw presence-only evidence: `/workspace/phase3a9-final-rca/`.

| Comparison | Result | Native observation |
| --- | --- | --- |
| A exact BarDoctor WebKit 1280 | ENVIRONMENT_BLOCKED | WPENetworkProcess PID 105013, SIGABRT; intact session then loss; exact empty-auth Health401; pageErrors=[] |
| B plain standalone, same context/page/reload/close lifecycle, no app frontend | PASS | Session/cookie preserved; both real Health requests200; no native fatal, pageerror, failed request or console error |
| C exact Chromium 1280 | Application assertions PASS | No native crash; session/cookie preserved; a passive-observer opaque-document bug was identified and corrected in the harness |
| D repeat exact WebKit 1280 | PASS | All business/API/security assertions completed; intact session/cookie before close; no native fatal/pageerror |
| E/F final WebKit1280 teardown observations | PASS | Completion, context/browser-close timestamps recorded; session intact; no native fatal/pageerror |

The subsequent live six-sequence gate reproduced **WPEWebProcess SIGSEGV at390px**
with the same teardown signature as historical1280: main PID106246 (and its
threads), complete assertions PASS at1791089753616ms, intact session/cookie at
1791089753621ms, context-close starts1791089753623ms and completes1791089753630ms;
browser-close spans1791089753631–3670ms; native SIGSEGV begins at
1791089753653.919ms, main PID106246 dies1791089753667.689ms. Child exit0; pageErrors=[]; no failed business/API/RBAC assertion.
This supplies fresh process/lifecycle evidence and resolves the final WPEWebProcess
classification as ENVIRONMENT_BLOCKED. It does not identify an originating allocator
write or prove that the runtime crash is fixed. No further native debug research
is undertaken.

HTTP404 console output and cancellations are retained: these originate from the
isolated harness's unsupported manifest/Operational Day route, occur in Chromium
as well, and are separate from canonical Health responses. Foreign venue401 is
an asserted denial, not a suppressed authorization failure. The classifier may
never waive an unexplained Health/console/network failure as teardown.

The first instrumented gate also reproduced the same NetworkProcess/session-loss
chain during the G06 post-reload Store control: PID106083 SIGABRT, unchanged
Store200 assertion received401, all session/storage/cookie absent in the same
new document, pageErrors=[]. The classifier initially rejected the observation
because only Health response metadata was recorded. Passive Store response
observation and a guard limited to that exact GET were added. The exception
requires its actual empty-auth401 body and the full native/session causal chain;
a Health401 cannot substitute for a failed Store request. All other Store
paths, authenticated401s and unrelated assertions remain FAIL. No Store business
logic or assertion is modified. The subsequent six-sequence live gate produced G06390 ENVIRONMENT_BLOCKED (all
assertions PASS, then native WPEWebProcess teardown SIGSEGV) and G06820/1280 plus
Phase3A.8 at all three widths PASS. This does not prove the native crash is eliminated.

## Mandatory gates and negative controls

The stable WebKit runner has no exception policy: any child failure, missing
artifact/viewport or application error fails it. Existing WebKit navigation,
iPhone and scroll regressions remain mandatory, unchanged.

The two SPA lifecycle suites run once per width with syscall process observation,
raw logs and live session/lifecycle evidence. CI distinguishes PASS, FAIL and
ENVIRONMENT_BLOCKED; the latter retains its child exit, process/PID/signal and
causal evidence rather than relabeling a crash PASS. No blind timeout increase,
assertion reduction, global skip or continue-on-error is introduced.

Classifier controls cover both exact native chains and reject ordinary assertion,
canonical, HTTP, pageerror, console, network, session, scope, clock-independent
and unknown-process failures. G06 remains OPEN pending approved deployment and
production smoke. Remaining gaps: G05/G06/G16/G18; Phase3A.10 is not started.

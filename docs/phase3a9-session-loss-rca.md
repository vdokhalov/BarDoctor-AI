# Phase 3A.9: WebKit session loss RCA

The investigation below records the preceding STOP, before the owner's final
release-policy authorization. The current bounded RCA, fresh post-assertion
WPEWebProcess reproduction and narrowly evidenced environment gate are in
[the WebKit release policy](phase3a9-webkit-release-gate.md). No native crash is
considered fixed or ordinary PASS. Production deployment still needs confirmation.

Historical RCA classification: **C. WEBKIT/PLAYWRIGHT ENVIRONMENT BUG — RELEASE BLOCKER**.
The owner has stopped low-level native RCA and authorized independent application gates.
The proven native WPENetworkProcess crash reproduces without the BarDoctor frontend;
after process replacement, ephemeral browser storage/cookie disappear and the existing
auth handler correctly rejects subsequent unauthenticated Health requests with 401.
The originating native invalid memory write and a reliable browser correction remain
unresolved. This does not establish a BarDoctor application bug. No speculative
correction, passing-rerun substitution or WebKit gate waiver is accepted.

Implementation HEAD: `76400a1a39fd26fb1be1789158af22c62709a884`.
Production remains Sites v481 at `38689be624d3c2bf440b767af6bfbab17c23b265`.
No application-code changes, commit/push, new CI run, Sites preparation or deployment.
Migration NO; backfill NO; production business-data mutation NO. All runtime data
belongs to new isolated in-memory QA venues and actual handlers. Phase 3A.10 not started.

## Proven mechanism, and the limit of that conclusion

The browser does not lose credentials at the reload boundary itself. They survive
`beforeunload`, `pagehide`, replacement-document initialization and `load`. Subsequently
the native **WPENetworkProcess** aborts/crashes. WebKit starts a new NetworkProcess, and
the previous ephemeral context's localStorage, sessionStorage and HttpOnly cookie disappear.
The JavaScript document/page/context remains the same during that loss. Requests made
afterward have empty explicit auth headers and no cookie, so the existing backend correctly
returns `401 {"ok":false,"error":"Необходима авторизация"}`.

The same fault was reproduced **without the BarDoctor frontend**. A standalone page logs
in through the actual isolated auth handler, writes session keys once, confirms the
HttpOnly cookie and a sessionStorage marker, reloads, and replays fetch/cancel lifecycles.
A later Health request fails with the same real 401 after the native process crashes.
No session reinjection or recovery is performed in this standalone test.

This establishes a native-runtime failure as the actor, rather than a demonstrated
application JavaScript clear/logout or a backend authorization bug. It does **not** identify
the original invalid native memory write/free. An earlier commentary classified the location
as C; an earlier owner-directed instability STOP recorded D pending native RCA. The
current owner-directed release decision treats the established native crash as a separate
environment blocker, without requiring more low-level RCA. Native allocator detection
is not assumed to identify the library that originally corrupted its memory.

## Exact reproductions

Diagnostic source, observer, wrapper and complete evidence are retained in
`/workspace/phase3a9-session-rca/`. Its README contains executable commands.
These are diagnostic scripts, not replacement passing release tests.

1. Exact Phase 3A.8 sequence retains the original closing conflict, verified closing,
   captured profit 304, reload, reopened state, foreign-venue 401 and zero-page-error
   assertions. Only lifecycle instrumentation and explicitly selected clock/environment
   controls were added. Failing WebKit/Playwright-clock reproduction: 1280x900,
   `/workspace/phase3a9-session-rca/exact-webkit-playwright-4.log`, exit 1:

   ```text
   AssertionError [ERR_ASSERTION]: 401 !== 200
       at settled (scripts/.session-loss-exact-rca.ts:32:427)
       at scripts/.session-loss-exact-rca.ts:40:410
   ```

2. Native-clock reproduction: 820x900,
   `exact-webkit-native-5.log`, exit 1 at the same unchanged Health-200 assertion.
   `native-clock-process-5.log` records WPENetworkProcess PID 70371 sending itself
   SIGABRT, exiting, and replacement PID 70419 starting.

3. Minimal standalone reproduction: `minimal-abort-lifecycle.log`, 820x900,
   native clock, no BarDoctor frontend, exit 1. Iteration 2 / third reload:

   ```text
   AssertionError [ERR_ASSERTION]: 401 !== 200
       at health (scripts/.session-loss-abort-rca.ts:64:494)
       at scripts/.session-loss-abort-rca.ts:76:4
   ```

   Full presence-only trace: `abort-minimal-webkit-native-820-2.json`.
   `minimal-abort-lifecycle-process.log` records NetworkProcess PID 73265 dying
   with SIGSEGV and replacement PID 73315 starting. The server, URL/origin,
   browser context and page were not recreated.

Native process traces collect process/signal events, or native stack/stderr events only;
they do not dump HTTP payloads or session tokens. Browser and server observations record
auth presence, names, scopes and metadata, never token/cookie values. storageState is
sanitized in memory before being logged.

## Document and request lifecycle

Detailed full-shell example: `exact-webkit-playwright-4/1280-lifecycle.json`.
Origin throughout: `http://127.0.0.1:39561`. Actor/data account and venue are the isolated
account 1 / venue 1. No foreign switch occurred before this failure.

| Epoch ms | Event | Auth/storage evidence |
| --- | --- | --- |
| 1791058158244 | Completed Health GET, HTTP 200 | email/token/venue headers and `bd_server_session` cookie present |
| 1791058158249 | Before reload | 23 localStorage keys; session email/token/userId/venue present; sessionStorage marker/scroll key present |
| 1791058158251 | beforeunload | same session and storage present |
| 1791058158255 | pagehide, persisted=false | same session and storage present |
| 1791058158262 | New document created | previous localStorage/sessionStorage still present |
| 1791058158461 | Bootstrap session writes | correct session fields written; successful bootstrap 200 |
| 1791058158611 | New-document Health GET, HTTP 200 | correct headers and cookie still present |
| 1791058158649 | After load | session present, canonical bootstrap ready |
| 1791058158711 | `/api/operational-days` request failure | `WebKit encountered an internal error` |
| 1791058159213 | After networkidle | localStorage and sessionStorage empty; same document ID |
| 1791058159542 | Before explicit Health fetch | auth fields absent |
| 1791058159563 | Health response | real 401; empty explicit headers; cookie absent |
| 1791058159571 | Utility-world storageState | cookies empty; origins empty |

The native strace reproduction correlates the same lifecycle more directly:
`native-process-1.log` records PID 68713 self-SIGABRT at 1791058341.942462,
exit at 1791058341.945628 and replacement WPENetworkProcess PID 68767 at
1791058341.971410. The request internal error is recorded at 1791058341949.
The subsequent Health probe fails with 401.

The native stack from `abort-stack-1.log` includes:

```text
libc gsignal → abort → allocator internal frames → __libc_calloc
libglib g_malloc0
bundled libsoup internal frames → soup_session_send_async
libWPEWebKit request handling / GLib main context
```

This places the fatal detection in native allocation while sending a network request.
The stripped internal frames do not expose the original corrupting write/free or its
source line. No specific libsoup patch/version is claimed to be the proven root cause.

## Initiator and auth checks

- The observer runs in every frame/document, with distinct document IDs, and records
  session set/remove/clear call stacks, external storage events, lifecycle events and
  the state immediately before native Health fetch. The loss has no corresponding
  observed JavaScript clear/remove/blank-session write. Normal initialization and
  successful bootstrap writes are recorded.
- Auth headers are recorded at the actual server receipt, not inferred from storage.
  The last authorized request has headers/cookie; the failed one has none.
- HttpOnly cookie presence is checked through context.cookies/storageState, not
  document.cookie (which correctly cannot read that cookie).
- sessionStorage is inspected separately; Playwright storageState does not serialize it.
- Utility-world storageState is also empty after the fault, excluding a main-world
  getItem wrapper merely returning false values as an explanation of these captures.
- Origin, main document, page and BrowserContext are unchanged during the loss.
  The native NetworkProcess is what restarts. The minimal page initializes auth once,
  so reload cannot repair storage by its init script.
- Service-worker controller is null; no service-worker registrations/workers participate
  in the observed standalone and shell sequences.
- Existing auth handlers correctly reject missing credentials and return no business data.
  This is not evidence of an RBAC leak or an incorrect Health score calculation.

## Clock and negative controls

| Sequence | WebKit + Playwright clock | WebKit + native clock | Chromium + same sequence |
| --- | --- | --- | --- |
| Standalone login → reload → Health, without cancellation replay | 10 contexts / 30 reload PASS | 10 contexts / 30 reload PASS | 10 contexts / 30 reload PASS |
| Exact Phase 3A.8 sequence | native crash and 401 reproduced | same native crash and 401 reproduced | 390/820/1280 PASS |
| Standalone cancellation replay, no BarDoctor frontend | native controls below; no stable correction established | native SIGSEGV and 401 reproduced | 6 contexts / 18 reload PASS |

The native-clock reproduction excludes Playwright clock as a necessary cause. A plain
two-browser/context storage-isolation control from the earlier RCA also passed; closing
another context is not itself established as the cause.

The freshly downloaded official **Debian 13** WebKit v2248 WPENetworkProcess has the
same SHA256 as the installed executable:
`89d82ffa2084817392f4b83c36294a63172b38dee0aa97006b55b60de6822df7`.
An incorrect browser archive is not established. Native automation warnings occur in
passing runs too and are not called the root cause. Cgroup OOM counters are zero.

## Unaccepted correction controls and remaining instability

- Replacing only the browser's bundled libsoup with the host library through the diagnostic
  wrapper did not stabilize the sequence. Both report version 3.6.5; their binary hashes
  differ. `exact-system-soup-2.log` reproduces the unchanged 401 assertion failure.
  That environment change was scoped to that child process and was not adopted.
- The Phase 3A.8 fixture does not route `/api/operational-days`; it returns an empty 404.
  A diagnostic fixture using the existing actual canonical handler passed six complete
  Phase 3A.8 matrices and 18 standalone native-clock plus 18 Playwright-clock reloads.
  However `real-days-process-2.log` still records a native SIGSEGV while finishing a
  context. Passing assertions therefore do not prove a stable runtime correction. This
  fixture change was **not adopted**. Changing the missing route's 404 body to JSON also
  reproduced a native SIGSEGV and Health 401 (`minimal-404-json.log`).
- No storage restoration, persistent-context substitution, exception filtering, timeout
  increase, assertion weakening, test skip or application change was used.

## G06 when session is retained

The same standalone authenticated Health request returns 200 whenever its session remains
present. Chromium's unchanged complete G06 sequence passes 390/820/1280, including known
zero, unavailable report evidence, changed input revision, Home/Doctor snapshot equality,
reload and foreign-venue denial: `g06-chromium.log`.

WebKit's diagnostic G06 runs did not establish stable completion: `g06-webkit.log` and
`g06-webkit-preserved-control.log` fail the unchanged Health-200 assertion after native
NetworkProcess SIGABRT/SIGSEGV. The fault can also occur during initial bootstrap, not
only after reload. Earlier G06 passing runs remain historical evidence, not a substitute
for these failures. No full release gate is claimed GREEN.

## Current release boundary / mandatory STOP

Native debug/ASan, allocator/libsoup investigations and browser fixes are outside the
current authorized scope. Existing evidence establishes an environment blocker; it does
not establish the first corrupting native allocation/write/free or a stable correction.
The blocked full-SPA WebKit Health lifecycle sequence remains BLOCKED, including the
G06 and Phase 3A.8 bootstrap/reload/venue-switch consumers. Historical or limited-control
passing results do not clear that required gate.

Independent unit/artifact/native-Worker/Chromium gates and stable plain-document WebKit
API controls may be verified separately. Their exact current results are recorded in
`docs/phase3a9-release-decision-report.md`; they are not a complete WebKit release PASS.
No commit/push, new required CI run, prepared Sites version or deployment is authorized.
Production stays exact v481. G06 OPEN; remaining G05/G06/G16/G18. Phase 3A.10 not started.

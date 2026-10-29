# Local alternative: signed shared feed + automatic calendar open

Baseline 7e644a8a; local only. No GitHub workflow/run, Sites publication, credential or production setting changed.

The existing GitHub producer can publish the shared signed reference while the app is closed. This change does NOT write venue calendars in Sites while closed and does NOT provide background notification processing. Actual persisted venue snapshots refresh only when an authorized calendar manager opens the calendar (existing GET status -> automatic POST refresh). View-only users keep their existing rights and see saved snapshots.

Signed-source discovery now checks at most hourly, globally shared with CAS lease and hourly error backoff. This is not instantaneous freshness: new release discovery waits until the next eligible authorized open. UI shows last successful source check and an error when saved data is used. The separate MD/DE source retains its existing weekly policy.

## Identity and coverage boundaries

Upstream content IDs hash date/name/category and are NOT stable correction IDs. Current CIS reader deliberately uses reviewed country/date/name rules and explicit country-specific aliases; display IDs use canonical date/title. Known alias renames preserve canonical identity. Unknown date/name corrections and ambiguous rows are not guessed into existing events: they remain unapplied and are counted in the coverage warning. Existing decisions and legacy deleted hashes stay in the saved calendar. We cannot recover metadata from historical hash-only tombstones or guarantee matching arbitrary corrections. This change does not pretend to solve that limitation or broaden the reviewed holiday policy.

The two real signed releases previously validated have equal payload digests: they do not demonstrate a changed date. Synthetic A/B data is used ONLY at a mocked already-verified source boundary, not presented as valid signed external data or a complete real holiday calendar. A/B tests add a reviewed future occurrence, rename through an existing alias, move a hidden event to an unreviewed date, and introduce two ambiguous rows. Unreviewed changes are withheld, not silently attached to another event.

## Verification

- tests/holiday-signed-open.test.ts: actual signatures/discovery/CAS/concurrency; hourly boundary; altered signed bytes rejected, last-good retained.
- tests/holiday-sync-control.test.ts: disabled/read-last-good/resume/in-flight protections unchanged.
- tests/holiday-synthetic-delta.test.ts: actual authenticated handlers and isolated SQLite, A/B delta, normal PATCH decisions/delete, legacy tombstone, cross-account rejection and no-churn reload.
- scripts/holiday-synthetic-open-browser.ts: actual client + actual handlers/SQLite with synthetic source seam, automatic POST without clicking Refresh, reload, widths390/820/1280, no external network. Screenshots outputs/holiday-synthetic-open/*.png. Source/auth transport is local test adaptation, not live hosted proof.

Production release requires a separately reviewed release composition/configuration and approval. Existing experimental background endpoints in ancestry must not be activated as part of this alternative. No closed-app Sites update claim.

## App startup follow-up (local, 29 October)

The shared calendar client now schedules a nonblocking check after authoritative `bd:bootstrap-complete`, with a selected venue, session and `calendar.manage` (or owner). It yields two frames and a task; app rendering does not await calendar I/O. A failed bootstrap, offline browser or viewer does not initiate this startup check. The existing backend membership/permission checks are unchanged.

The automatic refresh lease is shared with the calendar page, and keyed by SHA-256 of user/session/venue. No bearer is stored in the lease. A captured generation and session context reject late results following venue changes or bootstrap/logout; client abort does not cancel or roll back already admitted server work. The backend CAS, membership and profile guards remain authoritative. A successful startup check is retained per session/venue in page memory. Failures have bounded retries after30s and60s (maximum3 failed attempts); errors do not advance the successful-check timestamp.401/403 are terminal until new authoritative bootstrap. A context/pagehide cancellation releases only the client lease, does not consume a failed attempt and never claims server cancellation. On persisted pageshow, only the same previously authoritative session with ready bootstrap can resume. Reload/reauthorization resets page-local retry state, subject to server hourly backoff. This is not a closed-app schedule.

Exact single-rule name/alias conflicts now flag the retained old event as `sourceMissing` with visible “Дата требует проверки”. Date/identity and marks are not moved. Hidden IDs remain hidden. Ambiguous/unknown corrections are withheld and counted in the overall partial notice. They are not silently accepted as updated dates. Existing reminder cancellation protections apply to flagged events.

Focused checks: startup tests cover no premature request, shared lease, repeated venue event, late result after venue switch, logout/new session, offline/viewer/failure, session-specific lease and stale release. Synthetic source A/B tests cover visible February 23 versus rejected February 24 with planned mark; hidden May 9 versus rejected May 10; canonical name alias; new reviewed June 12; ambiguous rows. Actual calendar DOM at 390/820/1280 asserts these dates, mark buttons, hidden absence, warning, reload and no horizontal overflow. Source fixtures are not published and do not prove new real-world holiday dates.

Viewer GET remains available; forced automatic POST returns 403 and performs no domain/calendar write. Literal zero SQL changes is NOT claimed: existing authentication maintains membership rows even on denied requests; this task does not change auth middleware.

Timing harness: `scripts/holiday-startup-timing.ts`, real application HTML and scripts in headless Chromium, viewport390x844, fully intercepted localhost APIs and local assets. Disabled/enabled use identical mocks and differ only in startup hook. Cold means fresh browser context; warm means repeat navigation in the same context, not a measured real HTTP cache (routing disables HTTP cache). App-ready means home visible and startup splash hidden. Normal calendar request delay100ms, slow1500ms per request,503 and source-only network failure scenarios. Existing home summary GET is present in both baselines; automatic POST counts identify the new work. This is a local isolation benchmark, not production latency, physical iPhone performance, a real remote signature/download duration, or full-device offline launch. Raw measurements: `outputs/holiday-startup/timings.json`.

Release gates: final build, baseline-only type errors, independent review, user review of local results and separate publication permission. No production/GitHub settings, credentials, live runs or business data changed.

Final stable-build timing sample (ms; one observation per cell, not a statistical latency claim):

| Scenario | Off cold/warm app-ready | On cold/warm app-ready | On cold/warm hook start→end |
|---|---|---|---|
| normal | 2295 / 2223 | 2380 / 2078 | 507→871 / 384→745 |
| slow | 2134 / 2468 | 2172 / 2052 | 328→3354 / 362→3371 |
| error | 2133 / 2001 | 2113 / 2081 | 342→470 / 361→494 |
| offline | 2153 / 2433 | 2133 / 2032 | 359→366 / 300→302 |

Hook timing uses test-only performance marks injected in the served helper; no production telemetry was added. Normal/slow each generated exactly one automatic POST;503/network failure generated none. Existing home summary GET remains in both variants. The 1–2 second target is not met consistently. Physical-device offline startup and production remote verifier latency remain unmeasured. An earlier attempt timed out while assets were being rebuilt; it is excluded, not counted as a pass. Client localStorage lease is best-effort across independently racing browser contexts; authoritative server CAS remains essential.

## Lifecycle review follow-up

Fixed poisoned attempts after503/network/timeout and A→B→A, bfcache resumption and unhandled crypto rejection.13 targeted startup-client tests pass, including HTTP200 failed sync, ignored abort transport, bounded30s/60s retries, maximum3 failures, successful dedupe, session changes and no elevation from cached-ready/viewer. Timers in these unit tests use controlled time; no claim of physical Safari bfcache validation. No new dependency, server route/auth change or initial startup delay. Timing harness instrumentation updated for the new finish function; previous table belongs to5a0e1c2; the follow-up sample is below. Successful contexts remain deduped through bfcache in this page lifetime; restoration does not force a new check after an already successful attempt.

Lifecycle follow-up timing sample, same harness/mocks (ms):

| Scenario | Off cold/warm app-ready | On cold/warm app-ready | On cold/warm hook start→end |
|---|---|---|---|
| normal | 2219 / 2124 | 2127 / 2135 | 356→650 / 404→797 |
| slow | 2322 / 2172 | 2134 / 2113 | 383→3393 / 356→3372 |
| error | 2304 / 2077 | 2193 / 2094 | 367→494 / 404→526 |
| offline | 2072 / 2000 | 2154 / 2127 | 334→337 / 407→410 |

Final checks:13 startup-client tests PASS; actual calendar UI390/820/1280 PASS; build PASS. Typecheck still has only the two documented baseline errors. No initial wait added. Retry behavior validated with controlled timers, not measured by holding a production session open. No publication or external changes.

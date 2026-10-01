# Phase 2 CSV UTF-8 regression: iPhone CI navigation diagnosis

Baseline: `5b7f1354930392459aeefca8857c9dd24ee80f4a`.
Original CI run: https://github.com/vdokhalov/BarDoctor-AI/actions/runs/36819799592
Failing job: `verify` (110232709727), `sales-iphone-browser.ts:75:122`.

## Root cause and classification

**E — test synchronization/assumption**, specifically removing Playwright request
interception while an asynchronously mounted iframe starts loading. The outer
host reaching `/sales-import?venue=1` does not establish iframe document readiness.
This produced an iframe resource-loading race in the browser QA harness. No
application navigation, auth or venue regression was demonstrated.

The failing verify job runs Chromium 149.0.7827.0 at an iPhone viewport, not WebKit.
The workflow's separate navigation and scroll jobs also require WebKit. The
initial failing sequence starts at a direct Cashier document; later parts of the
same suite and the navigation matrix exercise Sales → embedded Cashier and SPA
host reuse. Two Back taps here mean two touch inputs on the Cashier Back control,
not two calls to browser history.back(). The distinct browser Back/Back document
modal regression remains in the full suite.

No application code was edited to diagnose or fix this failure. Running the
existing artifact preparation/build was necessary to match CI; its resulting
tracked application tree remained unchanged.

## Observed sequence

The detailed host/frame, network and server snapshots are in
`phase2-iphone-ci-root-cause-evidence.json`. Playwright page errors include child
frame errors. Absent bootstrap state in the direct Cashier document means no SPA
bootstrap is present there; its authenticated sales read completed successfully.

| Step | URL/history | Iframe/load | Auth and venue | Reads and UI |
| --- | --- | --- | --- | --- |
| Direct Cashier ready | `/cashier?venue=1`; history null | No iframe; complete | Active venue 1; real authenticated sales handler | No pending reads; Cashier visible |
| Venue sheet opens | Same URL; temporary `bdTransientLayer` pushed | No iframe | Venue 1 unchanged | Sheet visible |
| Venue sheet closes | Same URL; popstate restores null | No iframe | Venue 1 unchanged | Sheet removed, transient entry cleanup observed |
| First Back touch | Same Cashier URL/history at delivery | No iframe | Venue 1 unchanged | One native Sales navigation requested; pending feedback displayed |
| Second Back touch | Same Cashier document; pending control receives input | No iframe | Venue 1 unchanged | Duplicate navigation suppressed |
| Sales host URL matches | `/sales-import?venue=1`; canonical navigation state | Sales iframe created; embedded URL `/sales-import?venue=1&embedded=1`, loading | Host bootstrap ready; venue 1 | Host reads finish; iframe resources start |
| Original test unroutes | Host URL and venue unchanged | Iframe still loading | Bootstrap ready | `Fetch.disable` races iframe subresource startup |
| Original timeout | Host complete; same canonical history | Iframe exists at correct URL, still loading | Bootstrap ready; venue 1 | Blocked script/resource requests never reach fixture server; Sales API reads never start; journal venue absent |
| Fixed completion | Same Sales host URL and venue | Embedded document complete | Bootstrap ready; venue 1 | Both Sales APIs return 200; `#journal-venue` contains Atelier; interception removed after load |

The original CI log contains the timeout but no state trace. The above failure
state was reproduced locally on its exact source revision and browser, including
normal timing, rather than inferred from the timeout alone.

## Causal evidence

Three clean baseline series reproduced the same assertion failure:

- Original removal order: failure on repetition 2.
- Explicit early-unroute A/B variant: 13 passes, then failure on repetition 14.
- Early-unroute with Chromium protocol logging: 6 passes, then failure on repetition 7.

In the protocol reproduction, the embedded document response arrives at
06:11:22.839 UTC; `Fetch.disable` is sent at 06:11:22.840. Iframe subresource
`Network.requestWillBeSent` events follow at 06:11:22.844–.846, with no matching
resource responses or server arrivals through the 30-second timeout. The host's
subsequent `/api/business-health` request still completes, excluding a general
server/network outage. Bootstrap remains ready and venue remains 1.

Changing only the removal order to wait for the journal and iframe load produced
20/20 passes in the A/B series. Normal ×3 and delayed ×1 passes from the prior
session alone had not established a cause. The new paired reproduction and
protocol evidence establish a harness race; this is not an unexplained flaky
classification. A diagnostic run overlapping asset preparation was excluded
from the clean reproduction counts.

## Fix

- Replace the fixed 1200 ms navigation sleep with a gate released after both
  touch inputs. This establishes that repeated input targets a pending Cashier.
- Keep interception until the correct Sales iframe has loaded and the unchanged
  `Atelier` assertion passes. Observe its real `load` state before unroute.
- Observe the host's existing bootstrap/domain read readiness before test-forced
  document goto/reload and before closing a navigation-only context.
- Serve actual isolated health, inventory, Operational Day and web manifest
  handlers required by the canonical host. WebKit also requests the manifest;
  omitting that handler produced a fixture-only 404, now fixed.
- Record URL/history, host/frame lifecycle, active venue, bootstrap, pending
  requests, server arrivals, errors and journal value. Reject network errors in
  the Back/Back regression instead of concealing them.
- Add repeated normal/delayed Chromium and WebKit iPhone runs to required CI,
  preserving all existing viewport/browser suites and uploading failure evidence.

The venue assertion, existing timeout, safe-area/touch checks, browser-history
Back/Back, posting, drafts, Warehouse roundtrip and timezone regressions remain.

A full delayed-resource run additionally demonstrated the same outer-URL
assumption on Manual → Sales → Cashier: the static `#open-cashier` anchor was
clicked while the iframe was only interactive and its deferred navigation bridge
had not executed. It navigated only the child frame to `/cashier`, leaving the
host at Sales. Waiting for the unchanged Atelier read-model readiness before
clicking this control makes the test act on the initialized application.
The trace recorded the early pointer target, aborted deferred scripts, child
Cashier navigation and unchanged host URL; no assertion was removed.

## Additional required-suite calendar diagnosis

Full local verification also reproduced a deterministic failure in
`mobile-navigation-qa-v269.cjs:810`. On 2026-10-01 the authenticated, ready host
is `/shifts?venue=901&month=2026-10`; its sole row is October 1, “Запланирована”.
There are no elapsed days in the selected month, so the test's expected
“Смена не заполнена” button cannot exist. This is a separate E — calendar/fixture
assumption, not a navigation race or application regression.

The first local attempt also exposed an occupied development-server port; a
fresh-port run reproduced the same shifts failure, excluding that port collision
as its cause. The targeted state capture records venue 901, auth ready, zero
closed/elapsed shifts and the planned row. Fix: set Playwright's date to the
existing fixtures' 2026-08-28 in each of the three isolated shifts modal contexts.
`setFixedTime` leaves timers running. Keep the same missing-shift locator and all
close, reload, URL and native Back assertions. Other calendar/timezone scenarios
retain their own configured clocks.

## Verification record

The final isolated Back/Back stability series passed 65/65 runs:

| Browser | Timing | Repetitions | Result |
| --- | --- | --- | --- |
| Chromium 149, iPhone 390×844 | Normal | 25 | PASS |
| Chromium 149, iPhone 390×844 | 600 ms responses, CPU ×4 | 20 | PASS |
| WebKit 26, iPhone 390×844 | Normal | 10 | PASS |
| WebKit 26, iPhone 390×844 | 600 ms responses | 10 | PASS |

Every run checks Atelier after two pending Back taps and completed iframe load,
with zero page/frame errors, failed requests or HTTP errors in that transition.
The machine-readable counts are in the accompanying evidence JSON.

The full iPhone suite passed normal ×3 and 600 ms delayed ×3 across iPhone,
Android, tablet and desktop (24 profile completions), retaining POS, Manual,
drafts, Warehouse roundtrip, native browser Back/Back and timezone checks. No
page/frame exceptions or HTTP errors occurred. The full traces retain request
cancellations when later intentional navigation disposes old documents; these
are outside the isolated Back/Back target, whose network-error assertion is zero.
A further three instrumented navigation runs confirm venue 1 and workspace 1
in both the ready Sales host and iframe. Direct Cashier has no workspace context
before the canonical host bootstrap establishes it.

All required workflow browser commands were executed locally: the verify suite,
Chromium/WebKit navigation delays and tablet/desktop widths, and the full scroll
matrix. Operational Day passed all five variants, including cached and delayed
runs with September 30 and December 31 fixed clocks. Phase 2 ingestion passed
mobile, mobile-wide, stock-first, manager and desktop; Menu/Recipes/POS/Warehouse
and the remaining procurement/account/startup suites passed. Mobile navigation
and Home Reviews passed after the documented calendar fixture fix.

The initial sandboxed WebKit tablet scroll attempt failed the idle-offset check;
the complete rerun outside the filesystem sandbox passed every scroll variant.
No scroll assertion or application code changed. The required GitHub scroll job
remains part of the mandatory GREEN gate.

Final local checks: targeted CSV UTF-8/ingestion/iPhone/Operational Day tests
34/34 PASS; full `npm test` (including verified build, artifact, unit and posttest
suites) PASS; typecheck PASS; lint PASS with zero errors and two pre-existing
unused-variable warnings. The tracked application tree is unchanged.
GitHub results are checked against the pushed commit and reported separately;
this source file is frozen before CI so recording GREEN cannot change HEAD.
No Sites version is created before all required GitHub jobs pass. Production
remains v467 until the user explicitly confirms deployment. No new migration,
backfill or production data mutation is part of this change; API tests use
isolated local SQLite and local HTTP only.

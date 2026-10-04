# Phase 3A.10 — canonical AI metrics and integration result provenance

Baseline: production Sites v482 and GitHub main
`9a067bb55731e8f4f21fc3b961a987a1d6358794`, tree
`5b77c94f1dcde5408d1c4c57d3686376254ca722`, 1477 tracked files.
Fresh fetch and a clean working tree were verified before implementation.

**BARDOCTOR v482 BASELINE VERIFIED — CLOUD WEBKIT ENVIRONMENT_BLOCKED**

Baseline npm test 2179/2179, typecheck and verified build PASS; lint zero errors
and two existing warnings; native Worker/D1 6/6; artifact repeatability 5/5 and
integrity PASS. Critical Phase3A.1–3A.9, source RBAC, Chromium390/820/1280,
compiled-client integrity, Operational Day and navigation passed.

## Environment decision

Environment RCA is closed. Ordinary cloud sessions run as uid1000 `agent`, with
no system/root privileges or effective capabilities; `sudo` is unavailable.
Environment Setup Script root privileges are UNKNOWN and not proven. Its script
is unchanged. No manual system-package installation or workaround is authorized.

Cloud-local WebKit downloaded but cannot launch because of missing GTK4,
Graphene, HarfBuzz ICU, Manette, Hyphen, WOFF2 and GLESv2 libraries. This is
ENVIRONMENT_BLOCKED, never PASS, and does not establish a BarDoctor application
failure. The separate known native WebKit lifecycle blocker is not declared fixed.
All existing required CI WebKit assertions and the narrow native lifecycle policy
remain mandatory. Phase3A.10 adds a strict WebKit provenance gate, with no exception.

## G05

AI context uses server Finance inputs, canonical profile/currency and employees.
Client recentDaily, monthToDate, hourly and staff summaries cannot override them.
Owner input remains explicitly contextual. Doctor deterministic metrics and Health
come from the same canonical server snapshot; model narrative is interpretation.

Metric snapshots carry calculation version, metric identity, period, completeness,
source-set fact identities, canonical accounting currency and scoped expected
revisions. AI_METRIC resolves the current server calculation; CANONICAL_SOURCE resolves the exact scoped source set
and its paginated entity references. Revision disagreement returns READ_MODEL_CHANGED.
Partial/missing/foreign-filtered inputs cannot establish KNOWN ZERO.
Missing guest/receipt fields remain UNKNOWN; captured zero stays known. A canonical
currency change invalidates a monetary metric reference even if its number is unchanged.
Completeness and freshness bind each metric's actual source selectors, rather than
unrelated stores in a whole context block. Missing nested collections stay UNKNOWN;
an explicitly captured empty collection can prove zero.

Evidence, AI action authorization, canonical Health and integration Hub reads use
SELECT-only authentication against existing session and live membership state.
They skip lazy schema initialization, owner venue bootstrap and reconciliation.
Explicit login/bootstrap and all purchase writers retain their original behavior.
Missing membership/access fails closed; a read never repairs access or seeds stores.
The original mutation chain was evidence resolve → authenticateRequest →
venueContextForAccount → membershipsForAccount → ensureOwnerVenue →
authoritativeVenueStoreRows → INSERT OR IGNORE domain_data. The existing
server_authoritative owner branch seeded an empty bd_purchase_documents on a read.
The isolated regression compares schema, every table's serialized bytes (including
all timestamps/audit/population) and SQLite total_changes across repeated reads.
Missing purchase store remains missing; existing purchase documents are retained.
Owner/member revocation, restricted sources, foreign and nested scopes remain guarded.
The infrastructure failure regression now injects failure into an actual SELECT,
rather than into the removed auth write batch; HTTP500/private/no-store remains required.

No source projection returns an arbitrary store payload. Live tenant/source permissions are
checked for every resolver request. Unsupported/ambiguous identities remain honest.

## G16

The context authority contract distinguishes canonical internal fact, owner-provided
context, owner-confirmed context, external observation, hypothesis and legacy context.
Owner confirmation and source URLs do not certify an independent provider observation.
Same-name market/legacy competitors keep their source identities and disclose conflicts;
legacy identity is not silently merged into a current confirmed provider fact.
Stored arbitrary authority annotations cannot upgrade a competitor to canonical fact.

## G18

New accepted integration writes bind the actual accepted canonical writer objects
to exact revisions. Direct writers calculate candidate bindings before CAS and return
them only after successful acceptance. The purchase/sale bridge binds the accepted
response objects, using tenant scope obtained before its validated domain operation.
An existing sync item's payload_json carries the server-generated acceptance binding;
an untrusted reserved payload field cannot supply it. No new table or ledger exists.

Integration run → item → accepted write → canonical entity/entities → expected revision
is discoverable through the existing Hub's bounded run-item view and INTEGRATION_EVENT.
Resolver reads reauthorize both integration access and the canonical result source.
The accepted event remains stable after a later canonical edit; its original source
reference reports changed instead of proving a newer revision. Legacy items, failed
writes and skips without a retained acceptance binding remain UNKNOWN. No prior
history is reconstructed or backfilled. Current source sets are not historical copies.

Migration NO. Backfill NO. Destructive operations NO. Production business-data mutation
NO. LAST PURCHASE PRICE, captured historical COGS, verified month close, canonical
Health, Home=Doctor, separate Data Quality and existing release gates remain protected.

Phase3A.10 is not COMPLETE and G05/G16/G18 are not CLOSED until separately approved
production deployment and smoke PASS in a new isolated QA venue. No next phase starts.

## Local release verification

Targeted G05/G16/G18 15/15; full npm test 2194/2194; typecheck and verified build
PASS; lint zero errors and two unchanged warnings. Compiled native Worker/D1 7/7,
artifact repeatability 5/5 and integrity PASS. Source RBAC/security and critical
Phase3A.1–3A.9 regression selection 192/192; additional writer/CAS/security selection 64/64.
Chromium critical suites, provenance 390/820/1280, Operational Day, navigation and
compiled-client release integrity passed on isolated fixtures. The final monetary
provenance change was rechecked with full npm test, typecheck, native Worker/D1,
Chromium provenance, compiled-client integrity and artifact repeatability.

Cloud-local WebKit remains ENVIRONMENT_BLOCKED. Required GitHub CI (including
stable WebKit and the existing narrow native lifecycle policy) remains a release
gate; a local PASS does not substitute for it. No deployment is authorized yet.

## Required CI timeout RCA and coverage preservation

Run [37192809908](https://github.com/vdokhalov/BarDoctor-AI/actions/runs/37192809908)
used implementation commit `1db1e01d379020ffba0dff41fdbe2195a5e88256`.
Fresh GitHub job/check APIs establish a cancelled verify job from 09:38:36 to
10:08:37 UTC, with annotation “The job has exceeded the maximum execution time
of 30m0s”. This run is not GREEN.

The final step detail is more precise than the initial STOP description:
Home reviews ran 10:08:06–10:08:32 and returned SUCCESS in 26 seconds.
The job had already consumed 29m30s when that step began. All recorded application
steps returned SUCCESS; the cancellation belongs to the overall job limit, not
a proven hanging Home reviews assertion. Sales navigation/WebKit and scroll jobs
completed SUCCESS in 13m35s and 8m34s respectively. The native lifecycle blocker
is not declared fixed by those job results.

| Original verify step | GitHub duration |
| --- | ---: |
| Locked dependency installation | 22s |
| Full regression and verified build | 185s |
| Repeated artifact preparation | 129s |
| Chromium preparation | 7s |
| Restricted manager QA | 154s |
| Operational Day: five declared variants | 106s |
| Menu ingestion | 275s |
| Menu consumption | 79s |
| iPhone: complete, repeated normal, repeated delayed | 93s |
| Mobile and desktop navigation | 247s |
| Home reviews: five viewport profiles | 26s |

Existing repeats are declared retry/idempotency, delayed navigation or calendar
boundary coverage, not harness retries of a failing gate. Each original verify
runner installs Chromium once; the other two jobs prepare both browsers on their
own isolated runners. No additional browser download happens in the mobile harness
when its installed executable is present. Full navigation covers two mobile plus
desktop scenarios, while Home reviews adds 320px/normal/430px iPhone, Pixel and
desktop checks; these overlapping scenarios are intentionally retained.

The 54 original verify steps (complete step objects, including all commands and
environment variants) remain exactly present in verify-core + verify-browser.
The split is before Phase2 menu ingestion: the old measured step totals are
849s and 949s. Both retain the original 30-minute limit. The downstream runner
restores this exact run/SHA's already verified dist artifact, checks integrity,
and prepares its own Chromium. No build or test step is silently skipped.
Both existing WebKit/navigation and scroll job definitions are unchanged.
The existing required verify job now aggregates all four jobs with always(),
requiring success for every result. Local negative controls prove exit0 for all-success
and exit1 for failure, cancelled and skipped browser jobs; these cannot turn it green.

The mobile harness adds scenario/profile duration reporting without changing
flows/assertions. Its server teardown now terminates the complete owned QA process
group, avoiding the observed orphan Vite left by killing only npm. strictPort
prevents automatic port fallback. This is test orchestration, not an application fix.
Fresh CI must still complete GREEN at the exact release SHA before any Sites version
is saved. Production remains v482 until separately approved deployment and smoke.

Final immutable harness reruns passed: Home reviews five profiles in 35.337s
including server startup; general navigation all 32 declared mobile/desktop flows
in 238.693s. Immediate socket-bind checks after both runs prove the QA port is
released, and the second starts a new server. Per-scenario timing reporting confirms
no harness retries. Home review Chromium timings were 5286/5156/5299/5175/4977ms
for small/normal/large iPhone, Pixel and desktop respectively. Original run APIs
only expose whole-step durations; these finer viewport measurements are from the
fresh local reproduction, not invented historical CI timings.

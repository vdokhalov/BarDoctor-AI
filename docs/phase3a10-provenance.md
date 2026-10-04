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

Targeted G05/G16/G18 13/13; full npm test 2192/2192; typecheck and verified build
PASS; lint zero errors and two unchanged warnings. Compiled native Worker/D1 7/7,
artifact repeatability 5/5 and integrity PASS. Source RBAC/security and critical
Phase3A.1–3A.9 regression selection 190/190; additional writer/CAS selection 47/47.
Chromium critical suites, provenance 390/820/1280, Operational Day, navigation and
compiled-client release integrity passed on isolated fixtures. The final monetary
provenance change was rechecked with full npm test, typecheck, native Worker/D1,
Chromium provenance, compiled-client integrity and artifact repeatability.

Cloud-local WebKit remains ENVIRONMENT_BLOCKED. Required GitHub CI (including
stable WebKit and the existing narrow native lifecycle policy) remains a release
gate; a local PASS does not substitute for it. No deployment is authorized yet.

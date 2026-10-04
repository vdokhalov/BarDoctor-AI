# Phase 3A.9 application verification and release decision

Production baseline is Sites v481, source
`38689be624d3c2bf440b767af6bfbab17c23b265`; GitHub main matches it.
Application implementation is `76400a1a39fd26fb1be1789158af22c62709a884`.
Subsequent changes are limited to necessary test/harness/CI infrastructure and
RCA documentation. Application files stay identical to that implementation.

The owner authorizes release preparation after all application gates pass and
permits only explicitly evidenced native WebKit environment failures as
ENVIRONMENT_BLOCKED. [The policy and bounded RCA](phase3a9-webkit-release-gate.md)
define two allowlisted SPA sequences and strict negative controls. No native
crash is ordinary PASS; no application assertion/security check/timeout is
weakened. Stable WebKit coverage remains mandatory at all three widths.

Fresh core gates (2026-10-04): G06 22/22, npm test2179/2179 (including 35 classifier
controls), typecheck/build PASS, lint zero errors and two existing warnings,
Native Worker/D1 6/6. Stable WebKit Finance/acquisition/warehouse/Health-session/
evidence-revenue/captured-cost/menu-origin APIs and RBAC pass at390/820/1280.
All 61 additional Chromium/stable-WebKit/security/navigation/previous-critical
regression commands PASS; repeatability5/5; navigation32 scenarios PASS. The two
SPA suites produce five PASS results and one precisely evidenced ENVIRONMENT_BLOCKED
(G06390: all assertions PASS, then WPEWebProcess SIGSEGV during browser close).
Commands and evidence are recorded in `/workspace/phase3a9-final-rca/`.

Commit/push, exact-SHA GitHub CI verification and Sites save occur only after the
completed local gates are reviewed. Their final SHA/version/run results belong in the
release handoff; this document does not claim an as-yet-uncreated saved version
or a passed future CI run. G06 remains OPEN pending approved production deployment
and production smoke. Remaining gaps: G05/G06/G16/G18 (4).

## Canonical inputs and business behavior

Health uses existing scoped cash shifts/Operational Day and saved operational
reports; cases; equipment, history/work orders and supported repair/maintenance
signals; stock balances/counts/opening/movements; and previously corrected
Finance/Demand/Reviews metrics. No new module or ledger is introduced. Venue,
workspace, dataAccount, live/source/nested RBAC, bounded reads and source/content
revision contracts remain enforced. Home and Doctor use the same canonical Health
snapshot; identical input revisions produce identical results.

KNOWN_ZERO requires available, complete, actually read evidence and measured zero.
Missing/restricted/partial inputs retain explicit states and null values.
Incomplete Operations stays null with low confidence. Open cash shift means
OPERATING without an automatic penalty; a closed cash shift without operational
report means awaiting operational data. Data Quality remains a separate axis.
Weights and thresholds, last purchase price, historical COGS, Finance, month close,
review/POS aggregates, Sales posting, Google sync, UI architecture and navigation
business logic remain unchanged.

## Safety and owner explanation

Migration NO. Backfill NO. Production business-data mutations NO. No destructive
operation. All runtime data uses new isolated local QA fixtures. Production v481
is not deployed or modified by this work. Phase3A.10 is not started.

Previously an unread source could be interpreted as zero problems and yield high
confidence. The canonical completeness contract now distinguishes verified zero
from insufficient evidence. An owner sees a confident Operations result only
when its required sources have actually been read completely. The remaining
browser failure is a proven native test-runtime crash; it does not establish a
business-data or authorization defect. G05/G16/G18 remain separate work after G06
passes approved production smoke.

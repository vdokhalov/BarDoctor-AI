# Phase 3A.9 — Business Health from complete canonical inputs

Scope: G06 only. Baseline gate confirmed production Sites v481 (successful deployment), GitHub main and clean local HEAD at `38689be624d3c2bf440b767af6bfbab17c23b265`. G05, G16, G18 remain open. Phase 3A.10 is not started. Production deployment requires the owner's separate confirmation after the exact-source/required-CI/prepared-version gates pass.

Root cause: Home's Health GET omitted operationalInput. The shared engine converted missing arrays/counters to zero and always assigned high Operations confidence. Doctor supplied body-authored cases/equipment/calendar counters, so matching venues could have different Health results without canonical evidence.

## Canonical read and access

`loadCanonicalHealthInputs` reads the existing context stores plus cash-shift/Operational Day sources, cases, equipment/history/work orders, expenses, inventory snapshots, opening stock and stock movements. One D1 SELECT snapshot includes source content, the account profile and live active venue/workspace membership/permissions. Scope comes from authenticated actor/venue/data account, never client IDs. Every source is permission checked again against this live boundary. Explicit foreign ownership in nested facts is withheld; it also prevents completeness. Account-local untagged legacy ownership remains compatible. No new persistence or ledger is introduced.

Per-source bounds are 2,000,000 JSON characters and 10,000 rows; over-limit, malformed or invalid container content is PARTIAL. Missing stores are UNAVAILABLE. An explicitly saved valid empty container is distinct from an absent source. Content revisions bind presence, raw content, update revision, authorized scope and data account. Reviews retain the existing current Google location selection and Phase 3A.8 aggregation. The selected review population is additionally bound to its revision. Profile revision and venue-local day are bound to the Health input revision; snapshot identity includes that revision. No result/source content is written by this loader.

Home and Doctor invoke this same loader. Both return its identical Business Health and snapshot when source revisions and calculation period/as-of are the same. Doctor client body cannot alter this snapshot. Contextual Doctor briefing/memory, prompt and recommendation provenance remain on their existing path (G05). Saved Doctor snapshots require cases/equipment read permissions as well as existing nested source/task permissions; raw and bulk store readers cannot reveal an earlier unrestricted snapshot after permission revocation.

## Operations counters

| Existing counter | Grain / uniqueness | Window | Sources / completeness |
| --- | --- | --- | --- |
| unclosedShifts | Venue + business date, once per day | All retained recorded business dates through the venue-local current day | Existing Operational Day over Finance revenue, sale events, sales documents and operational reports; all four stores required |
| criticalBlockers | Case ID | Current active cases | Existing cases; critical priority; closed/resolved/cancelled/reversed/draft do not contribute; missing case state or duplicate/absent ID is partial |
| recurringEquipmentFailures | Equipment ID, once even when both recurring and overdue | Retained repair history/current work orders and maintenance due before the venue-local current day | Equipment/history/work orders/Finance expenses; explicit work-order links deduplicate its stages/history/expense; >=2 repairs or supported nextMaintenance overdue; archived/replaced/decommissioned assets excluded |
| stockAnomalies | Product + warehouse + unit, once | Current captured balance | Existing stock balances + snapshots/opening stock/movements; Phase 3A.7 stockQuantityEvidence must validate each balance; <=0 or at/below existing safety minimum; missing projections for retained active stock products/movements are partial |

Cash OPEN means OPERATING, with no automatic penalty. Cash CLOSED without operational data means AWAITING_OPERATIONAL_DATA. A saved report is reported independently of cash state. COMPLETE retains the existing Operational Day definition (recorded payroll, final consistent revenue and operational report). No missing operational report is relabeled as an open cash shift. No schedule-only missing day is invented; this counter covers actual retained business-day records.

KNOWN_ZERO requires AVAILABLE/COMPLETE evidence and measured value 0. Missing/restricted/partial inputs carry null values and their explicit states, never verified zero. A complete counter can still show its proven problem when another counter is unavailable. Operations score is null with low confidence until every required counter is complete; its gaps identify the missing evidence. Its interpretation cannot say no deviations were found when the score is unavailable.

The existing Operations formula, weights and score thresholds are preserved (90 less existing capped penalties; Operations weight 25). Low/negative stock is counted once per canonical grain, not twice through lowStock and negativeStock UI summaries or a capped sample. Supported overdue maintenance remains in the existing combined equipment counter; no new product metric is added. Component evidence completeness affects Health confidence; Data Quality remains its separate existing axis and does not subtract points from a known business score.

Limitations are deliberate: absent history is not reconstructed; ambiguous/duplicate identities and unknown stock anchors remain partial. Retained historical repairs without explicit shared identities are independent observations; no guessed identity is invented. This phase does not extend Health history, AI statement/recommendation provenance, or the G16/G18 contracts.

## Verification and triage

All runtime fixtures use newly created isolated in-memory or local native-D1 venues. No production business data, Köln, Google sync service, migration, backfill or destructive business operation is used.

Targeted assertions cover complete empty inputs, missing/corrupt/restricted inputs, critical/resolved/closed cases, recurring repair identity, overdue maintenance, open/closed cash state versus report state, complete day/recorded zero payroll, proven stock anomaly/partial anchor/missing stock projection, Home=Doctor despite forged body, changed content at an unchanged timestamp, revoked membership, foreign venue/workspace/data account, nested/guessed IDs, source bounds and saved-snapshot nested permissions. Browser QA uses actual handlers and the prepared production client in Chromium and WebKit at 390/820/1280, with source-revision updates, accepted Home cache update, reload, venue switch and zero page errors.

Observed failures were classified before continuing:

- TEST BUG: the new fixture directly imported a Worker-only module in Node instead of loading it through the established isolated runtime. The fixture import was corrected; assertions unchanged.
- TEST BUG: an old Operations score fixture supplied only stockAnomalies and relied on the other absent inputs becoming zero. It now supplies explicit measured zeros; the score assertion remains 70. A cache-version fixture's alternate version now differs from the new v5; the isolation assertion is retained.
- TEST BUG: native restricted-data assertion used the generic word critical, also present in allowed Data Quality status. A unique forbidden-record marker replaced it; the no-leak assertion remains strict.
- TEST BUG: the browser fixture omitted the fetch probe required by the existing settled-read guard and omitted response type annotations. The probe/types were added; the guard and zero-page-error assertions were retained.
- ENVIRONMENT: WebKit libraries were missing. Official Debian packages were downloaded from the allowed package host, extracted outside the repository and linked into this session's browser dependency directory. Actual browser launch and assertions passed; only the inaccurate host-install precheck is skipped. The image's default Debian snapshot endpoint was proxy-denied; no network policy was changed.
- ENVIRONMENT: GitHub authentication verification fails and api.github.com is proxy-denied. Required CI/exact-source preparation cannot be declared passed without resolving this access and observing the matching CI head SHA.

Final local check counts, local commit SHA and any eventual GitHub CI/prepared Sites version are recorded in the release evidence. Production stays at v481; G06 is not CLOSED before an approved deployment and production smoke PASS.

Migration: NO. Backfill: NO. Production business-data mutations: NO. Remaining GAPs until production smoke: G05, G06, G16, G18; after approved Phase 3A.9 smoke PASS: G05, G16, G18.

## Final local release gates

- `npm test`: 2,144/2,144 PASS, including verified build, typecheck and previous Phase 3A.1–3A.8 unit/artifact/security suites.
- Targeted G06: 22/22 PASS; preceding Health/RBAC focused regression: 77/77 PASS.
- Compiled Worker/native D1: 6/6 PASS (new G06 and all preceding critical evidence/canonical boundary/acquisition/month-close scenarios).
- Artifact preparation repeatability: 5/5 PASS; repeated declared preparation retains the canonical Health v5 exactly once and preserves emitted client/Worker bytes.
- Lint: zero errors, the two unchanged pre-existing warnings. Typecheck PASS. Build and Sites ESM/manifest validation PASS.
- Chromium/WebKit at 390/820/1280: G06 PASS, actual Home snapshot cache update PASS, Home=Doctor PASS, missing-source revision/reload/venue switch PASS; no page errors.
- Previous Finance, acquisition/stock, read-only warehouse and verified month-close browser suites PASS in both engines at 390/820/1280. Phase 3A.1–3A.5 evidence/cost/menu/canonical-boundary mobile/desktop gates PASS.
- Restricted manager browser and strict security regression PASS: owner/permitted/restricted manager, navigation, login/reload, exact authorized 403, zero uncaught errors and venue switching. Actual-handler tests additionally cover newly required saved Doctor operational-source permissions.
- Diff review: G06 read adapter, completeness/confidence/interpretation, minimal shared Doctor Health snapshot, nested saved-snapshot access, reversible client calculation-version preparation, CI coverage/tests and this documentation. No schema/dependency-lock changes, migration, backfill, financial/review/POS calculation edits or production business-data mutations.

GitHub push / required CI / prepared Sites version remain a separate release gate and are not asserted by these local results.

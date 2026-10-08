# BarDoctor stable UI rollback from production v492

**SUPERSEDED:** This document describes the rejected v489 UI candidate `51132f45f95c53655eb81096f8e285869a5bd9bf`. The owner explicitly selected the interface before Phase 4B/C. Use [stable-ui-history-v485.md](stable-ui-history-v485.md) and the v485 release handoff. This v489 candidate was not saved or deployed by this task; its CI was cancelled after the scope clarification. The statements below are retained as a record of that earlier candidate, not current release instructions.

This is a saved-release preparation, not authorization to publish. Production must remain v492 until the owner separately approves the exact saved candidate. No Visual Wave 2 is included.

## Baseline and provenance

- Stable UI: Sites v489, `b7708cadb01ff8e8ee11c1bcfdab448c15068878`, successful publication `appgdep_6ac63b8ff2bc8191afc94943d4ba13d8` (2026-10-07 12:32 UTC).
- First V1.2 implementation: `9f70d846` (`feat(ui): implement V1.2 intelligence reference slice`), subsequently published in v490 `17de9a7c4934ad92c1b7c7b0a14f173155539ed9`.
- Current production base: Sites v492, `7d4eeb44ea9ac0419d55881e846268bc31da57ee`, successful publication `appgdep_6ac753e163b08191a63defcd59f827a4` (2026-10-08 08:28 UTC).
- GitHub main was v483 (`e48ac83476850bc33cc433a4ffe21804300da20a`) when work started. The candidate descends from the actual Sites v492 source, so Phase 4A/B/C and later fixes are retained; it does not reset GitHub main or the whole repository.

## Returned presentation

`bdHomeDaily`, `c_e` and `Uce` are the exact v489 Home, Business Health and legacy Doctor functions. Home exposes the original Health summary, every canonical priority in its original order, cost correction, Finance, Reviews, Today, Competitors and Calendar. Health retains the original score, zones, source quality, retry, canonical queue, cost verification and history. Doctor restores the persistent seven-question panel, original fact/source/limitations layout and legacy diagnosis run/retry/cached-report/refresh controls and original report actions. Existing mobile and desktop navigation stays unchanged.

V1.2's score ring, identity components, Home split wrappers, compact one-item queue, answer-first presentation, CSS and icon assets are removed. The reversible preparation guard strips recorded V1.2 renders on every preparation and cannot reapply the design. Regression expectations target the returned v489 controls.

## Preserved independent fixes

- The full v492 API, authorization, RBAC, venue/account isolation, schemas, migrations, binding configuration, domain calculations, dependencies and lockfile are byte-identical, excluding the two presentation adapters and removed V1.2 adapter.
- Phase 3A provenance, canonical Health inputs and read-only evidence; stock quantity/valuation and explicit repair; recorded payroll and Finance inputs; verified monthly close; review denominators; ingestion, POS, Menu and editor persistence remain intact.
- Phase 4 cost episodes, concurrency-safe correction/verification/history, canonical prioritized queue and contextual Tasks/Inventory/Day actions; seven deterministic venue-scoped Doctor contracts are preserved.
- `7ad4769`: linear history partitioning and one-time scoped payroll projection; canonical request timeout, cancellation and burst coalescing in both returned adapters.
- No hidden curated answer computation before explicit selection or a valid venue-bound deep link. Refresh is disabled before selection; selected-question permission errors remain visible. Server RBAC is unchanged, and the v492 restricted/permitted/owner browser gate is retained.
- Two Payroll default-month initializer calls remain fixed, including repeated preparation; no payroll calculation or writer changes.
- Content-addressed client/bootstrap release integrity, corrected test server isolation and settled navigation gates are retained.

## Verification and compatibility

Local `npm test` succeeded, including the verified build, 1740 unit tests, artifact/navigation/UX and data-integrity suites. Typecheck succeeded; lint has zero errors and two existing warnings. The additional rollback/protected-file/function/parity contracts pass. Chromium smoke passes 390x844, 820x1024 and 1280x900, covering Home, Health, Doctor, Shifts, Finance, Warehouse, Menu/catalog, Payroll, Reports, Tasks, Reviews, Integrations, Settings and More, with all Home priorities, real Health-to-Doctor navigation, no page errors, HTTP 500 or horizontal overflow.

Further acceptance gates run on the immutable prepared client: 306-item v489 functional parity in Chromium and WebKit at all three widths; seven Doctor questions and context/reload/return; legacy diagnosis error/retry/refresh/cached reload/report actions; real Day/Inventory/Cost correction; slow/error/stalled reads; restricted/permitted/owner and foreign venue negative controls. GitHub CI must succeed for the final pushed SHA before release handoff. Evidence lives in `outputs/stable-ui-rollback`, `outputs/reference-slice-recovery`, `outputs/curated-doctor-phase4c`, `outputs/management-loop-targeted` and `outputs/health-doctor-performance`; CI uploads it alongside the verified build.

Only production table metadata and `/api/healthz` were read: binding DB is available; healthz reports `{"status":"ok","storage":"sites-d1"}`. No production business API writer, migration, rollback, cleanup or deletion was executed. Current APIs and schema are unchanged, and browser writes use isolated local SQLite fixtures only. Existing production business data does not need conversion or rollback.

## Limits and release discipline

Native iOS keyboard/PWA device acceptance is distinct from desktop automation of WebKit. Data-dependent inventory entries absent under identical baseline/candidate inputs remain explicitly conditional, not claimed as exercised. Live authenticated owner workflows against production business records are not exercised before publication; compatibility is established by unchanged backend/contracts and isolated actual-handler regressions. Existing gaps remain UNKNOWN/PARTIAL instead of being invented into known facts.

After CI, push the exact candidate to the Sites source repository with ordinary non-publishing credentials, package its verified build, and save a version without any deploy operation. Record the returned exact SHA/version in the handoff. Before a later separately authorized deployment, recheck production/source heads and verify the saved artifact hash; if production changed, reconcile independent changes first. There are no new database migrations to apply.

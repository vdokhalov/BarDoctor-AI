# v493 Owner UAT failure and minimal repair

Production v493 (`e8fe4568d694b42000649231a1269b52a390b479`) is **OWNER UAT FAIL** on the owner's physical iPhone. The preceding publication check was BLOCKED for authenticated flows; its anonymous healthz/login results do not establish working Health or Doctor.

## 1. Snapshot read fails in the production Worker

Native Sites Worker logs contain authenticated, venue-scoped `/api/business-health` invocations:

| UTC, 2026-10-08 | Outcome | CPU | Wall |
| --- | --- | --- | --- |
| 12:38:13.061 | exceededCpu | 32,500 ms | 37,663 ms |
| 12:40:47.483 | exceededCpu | 32,500 ms | 36,147 ms |
| 12:41:22.102 | connection lost exception | 26,451 ms | 30,115 ms |

The matching exceptions explicitly say `Worker exceeded CPU time limit.` Successful cost-evaluation requests used 27–61 ms CPU, while other cost/store requests were canceled after long waits. These observations establish failed execution, rather than simply a missing client score. They do not independently attribute every canceled request to D1 or to a shared Worker isolate.

The Health route builds its snapshot synchronously from current canonical sources; there is no missing background snapshot job to start. Killing the Worker prevents that response from reaching the client. The client then shows its generic unavailable state. No database rollback or manual business-data write can repair that path.

Isolated SQLite, real current handlers, 5,000 recorded days, Europe/Chisinau: CPU profiling shows repeated full-history scans in `revenueRowsWithReports` and `readFinanceInputs`: days.find per session, revenues.filter per day, joined.find/report.find/revenue.find per payroll day. This leaves quadratic work after the earlier v492 scope/deduplication optimization. The old performance fixture allowed a 20-second Node read and used an empty menu; passing it did not certify the production Worker budget.

The minimal repair indexes these authorized inputs once per request, preserving first-match order, duplicate winners, captured FX, recorded zero FOT, source identities, UNKNOWN values and all scope checks. An 80-dataset differential test compares the entire projection with v493. On the same isolated 5,000-day fixture, Health headers changed from 2,295 ms to 567 ms; its inputRevision and 688,399-byte response remained identical. These are local measurements, not production timings. The production viewer truncates large JSON values; a complete production history and per-stage v493 CPU profile are unavailable. The exact production hot function and remaining worst-case menu/cost workload require authenticated UAT after an approved publication. Closed, payload-free Health stage telemetry is included for that verification.

Cost client requests also had no transport/body deadline. They now reuse the existing 15-second bounded transport, retaining command methods/bodies and venue authentication. Health's timeout is not increased. A timeout means verification failed; it never resolves a signal, manufactures a cost or reports zero.

## 2. Doctor route exists but entry points were removed

The executable v493 `bdHomeDaily` contains `/* phase4a-home-ai-entry-retained-in-more */` instead of the former Doctor card. The actual More component `t_e` has no `/analysis` item. Phase 4A therefore removed an entry based on a transition that never existed. `/analysis` and its legacy Doctor component `Uce` remain registered, and `/api/ai/diagnosis` remains available behind its unchanged authentication/source/permission checks. This is a discoverability defect; weakening API permissions is not a repair.

The candidate restores an explicit `AI Doctor` entry on Home, Health and More, using existing components/styles and `analysis.view` plus the existing restricted-context guard. The API still separately authorizes diagnosis and its sources. Seven-question Phase 4C and Phase 4B queue presentation remain absent. Runtime configuration is inspected read-only; there is no production Doctor-disable flag identified as the cause.

## 3. v485 presentation was copied accurately but was the wrong functional target

Rollback replaced only `bdHomeDaily`, `c_e`, `Uce` with v485 presentation, plus retained correction confirmation. v485 already includes Phase 4A: a compact Home score, a cost-first Health screen, and removal of Home Doctor. It predates Phase 4B/C but does not provide the owner's confirmed flow. Historic parity tested that same deficient arrangement on small isolated fixtures; it could not recover missing entries or certify production CPU.

The owner confirmed the expected elements: circular /100 index, zones, recommendation cards and a clear Doctor transition. The candidate reuses the existing full Health component, the existing circular-score styles, existing zone/priority components and the legacy diagnosis screen. Health precedes cost on its detail page. Missing snapshots show a truthful server-read failure with retry. This is a bounded functional correction, not a new design concept or another whole-version rollback.

## Minimal release plan and limits

1. Differential Finance and real large-history Health tests; confirm read-only behavior and unchanged projections.
2. Chromium and WebKit at 390/820/1280: actual snapshot/score, Home→Doctor, Health→Doctor, More→Doctor, real diagnosis, controlled 503 retry, cached reload, bounded cost failure/recovery, existing modules and navigation. Local SQLite writes are permitted only for these isolated fixtures.
3. Build/typecheck/lint/tests, source push and CI, then save a matching Sites archive. **Do not deploy.** Current production stays v493 and OWNER UAT FAIL until the owner authorizes and completes a fresh production UAT.

No production business records are copied into fixtures, edited or deleted. No migrations, schema, auth model, dependencies, hosting bindings or runtime environment changes are part of this repair. Independent fixes remain protected by immutable historical manifests with an explicit five-file reviewed exception list and differential coverage. Desktop WebKit is not a physical iPhone. Without a legitimate production app session, authenticated candidate production smoke is BLOCKED, never QA-as-production PASS.

## Completed local gates

- Full `npm test`: PASS, including verified build, typecheck, 454 artifact tests, 1,743 unit/API tests and post-test suites.
- Lint: PASS, zero errors; two existing unused-variable warnings in the migration route and warehouse patch script.
- Repeated complete artifact preparation: PASS, five tests, two preparation/build passes with byte-stable output.
- Reviewed rollback/API protection and parity comparator: PASS, 16 tests. Real compiled Worker/native D1 Health and retained curated API: PASS.
- Chromium and WebKit owner-flow regression: PASS at 390/820/1280, actual Health/legacy diagnosis handlers, three Doctor entry points, controlled error/retry, cached reload, 12 core routes and bottom navigation, bounded cost failure and recovery. QA reports explicitly identify `production: false`.

The broader historical navigation matrix and remote CI remain separate release gates; their final outcomes are recorded in the release handoff rather than presumed from this list. No actual iPhone or authenticated production result is asserted here.

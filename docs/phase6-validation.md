# Phase 6 — Purchases / costing / warehouse integrity

Baseline: production v427 VERIFIED, source e66d2c2fba8647de538196cff682b5da38184509.
Status: IN PROGRESS / NOT READY FOR DEPLOYMENT (2026-09-10).

No Phase 6 deployment, schema change, destructive migration or write to a working venue. The owner authorized actual recognition in an existing isolated TEST venue. This created TEST uploads/jobs, one supplier, one ingredient and its supplier mapping; no receipt was posted and stock remained zero. Production secrets were neither read nor changed. The browser was restored to the original working venue. Photo, ground truth and raw diagnostics remain outside Git.

## Findings and fixes

### Manual invoice matching
- CAUSE: deterministic rematching ignored manual identity; AI batching used generic review status even when only arithmetic needed review.
- BUSINESS IMPACT: an explicit tea selection could be replaced by an incorrect alias.
- FIX: preserve manual identity through deterministic matching, AI batching and proposal application. Missing targets and arithmetic still require review.
- VERIFICATION: fail-first tests preceded the fix. Tests cover a queued AI response arriving after manual correction, including outstanding arithmetic review. Existing AI tests pass.

### Receipt retry after nomenclature changes
- CAUSE: conversion/canonicalization ran before persisted-document lookup.
- BUSINESS IMPACT: retry could fail against current units despite an already committed receipt.
- FIX: return confirmed/cancelled persisted duplicates after authorization and venue checks, before conversion or reconciliation; unconfirmed rows still validate.
- VERIFICATION: actual HTTP/SQLite retries after unit change or target removal preserve document, raw JSON, movements and audit with no CAS writes. An invalid-unit regression in the first implementation was fixed without weakening the existing test.

### Explicit menu and recipe identity
- CAUSE: legacy duplicate consolidation could replace IDs still referenced by ingredients or ready products.
- BUSINESS IMPACT: a purchase could make a valid recipe unpostable.
- FIX: extend protected-identity guard to explicit recipe and ready-product references; no automatic merge for these records.
- VERIFICATION: integrated receipt-to-recipe-sale test passes. Espresso/americano keep coffee-bean identity and latest receipt cost. Tea ambiguities remain reviewable.

### Purchase edits corrupting sale movements
- CAUSE: legacy movement normalization defaulted modern types to receipt, stripping sale links/snapshots.
- BUSINESS IMPACT: full refund could report success without restoring stock (2.92 kg instead of 3 kg observed).
- FIX: preserve immutable opening, sale-consumption and sale-reversal records.
- VERIFICATION: actual HTTP/SQLite chain restores 3 kg and asserts unchanged sale movements. Unsafe receipt cancellation after later movements returns 409 without mutations; safe cancellation restores prior last price exactly once.

### Card coerces kg/l into pieces
- CAUSE: legacy initializer/select accepted only g/ml/pcs; kg/l package and display branches also defaulted to pieces.
- BUSINESS IMPACT: opening a measured item displayed pieces and unrelated metadata save sent the wrong unit.
- FIX: active v421 owner preserves kg/l and legacy g/ml, adds compatible options and uses mass/volume families for defaults and controls. No stored record migration.
- VERIFICATION: four baseline assertions failed. After the fix actual card -> products HTTP -> SQLite -> reopened card preserves units, packages, stock and raw movement JSON for kg/l/pcs/g/ml. Full suite after this card fix: 943 PASS, zero failures/cancellations/skips.

### Quick-create misreads Latin l
- CAUSE: existing helpers recognize Cyrillic litres but omit canonical Latin l from the invoice selector.
- BUSINESS IMPACT: actual quick-create submit persisted a litre ingredient as pcs.
- FIX: recognize the standalone Latin litre token in base/display helpers through active v421 owner.
- VERIFICATION: fail-first actual submit/API test persisted pcs for l; kg/pcs/ml/g controls passed. After correction all 18 combined card/quick-create/API tests pass, zero skipped. Direct second patch application preserves exact bundle bytes.

A 1 g package for an item stocked in kg is valid as 0.001 kg. Direct measured receipt quantity is not converted through that package again; count-to-mass without explicit contents remains blocked. No speculative package cleanup was performed.

## Cost and stock evidence

- Actual HTTP/SQLite create/edit/retry/cancel matrix covers pcs, kg/g, l/ml and packs, stable line IDs and 12 pieces remaining 12.
- Receipt at 100 MDL/kg -> 10 portions at 8 g cost 8 MDL; next receipt at 200 MDL/kg -> next preview cost 16 MDL. Historical sale event/cost snapshot stays unchanged.
- Opening + receipts - consumption + reversals equals expected stock across sequential operations, receipt edit and reload. No duplicate posting/movements/reversal on retry.
- Safe cancellation restores the prior latest purchase price; unsafe cancellation after later movements rejects without mutation. Weighted average is not the current-cost model.

## Actual invoice / Hybrid evidence

- Private manually checked ground truth: 15 photo rows. The old representative synthetic fixture is not photo ground truth.
- Ordinary configured legacy AI-vision/Hybrid flow in isolated TEST: first recognition 15 rows, 0 automatic links, 15 manual, 0 false links; numeric values and order match the photo.
- One appropriate ingredient was explicitly created/selected, then the draft discarded. Fresh upload: 15 rows, 1 semantically correct supplier-history link, 14 manual, 0 false links; corrected identity and numeric values remain stable.
- Existing owner-only QA selector then exercised configured real OCR without exposing secrets. Completed server job: invoice_recognition_v2, primary mode, ocr_space:engine3, ocrSuccess=true, 136 detected text lines, 23 duplicates, 15 parsed item rows. All 15 rows match the photo and ordinary flow.
- Primary OCR: 1 historical link, 14 manual, 0 false links. QA ai-unavailable intentionally makes zero fallback requests; AI_FALLBACK_UNAVAILABLE and VALIDATION_REQUIRED are expected and retained. This is not proof of successful high-confidence AI fallback proposals.
- No purchase was posted. Reload showed zero TEST purchases and zero stock for the new ingredient. Card-unit issue was inspected then cancelled without saving; fixes remain local.
- Earlier OCR_NOT_CONFIGURED/browser timeout attempts remain failures, superseded for actual OCR coverage by the completed TEST-provider evidence. No secret workaround was used.

## Gate checkpoint

Completed before final Latin-litre correction:
- Full suite 936 PASS after two review-gap tests; 943 PASS after card tests. Zero failures/skips. Full typecheck PASS; lint zero errors, two pre-existing unused-variable warnings.
- Strict extended replay before new card fixes: 5/5 PASS, exit 0. LF/CRLF equivalence, marker ownership, fail-closed anchors and two full declared preparation cycles remain strict.
- Sales browser 390x844/1280x720 PASS with real HTTP/SQLite; purchase browser same sizes PASS, including mapping, pack contents, save/reload and discard.
- Home/Reviews five viewports PASS. General navigation hit a missing-iframe timing failure; unchanged embedded retry and full unchanged desktop profile then passed (6/6). Failed evidence retained. Existing data-control fixture has an unmocked audit response, so this does not prove the audit API.

Final source:
- Targeted card/quick-create/API: 18 PASS. Full unit: 948 PASS, zero failures/cancellations/skips (exit 0, 848176 ms). Full typecheck PASS; full lint PASS with zero errors and the same two existing warnings.
- Final-source sales and purchase browser checks PASS at 390x844 and 1280x720. Purchase screenshots visually inspected. General navigation and strict replay remain RUNNING/PENDING.
- Private card browser attempts encountered local startup timing and incorrect private locators before save assertions. Failure evidence is retained; corrected private harness is still running and is not PASS.
- Existing generated-client regression batch: 19 PASS, 1 FAIL because dist/client/app.html is absent. The failed packaged-release assertion remains a build-dependent gate; no artifact was fabricated or assertion removed.
- Standard npm build previously reached prebuild then lacked Bash. Private Windows adapter executed all 80 unchanged precompiler stages in an isolated current-source copy, then FAILED at the original 3-minute compiler limit (VINEXT_BUILD_TIMEOUT). RSC stage 1, analyze client references, did not reach stage 2. No post-build/final validation ran. The caught Git HEAD warning is nonfatal; no syntax/module/OOM error was emitted. Host contention versus compiler stall is unresolved. Independent unchanged Linux GitHub build is required; this attempt is not PASS.
- Sandbox failures happen before loading tests (uv_os_get_passwd ENOMEM / spawn_ready timeout). Only completed executions outside that sandbox are reported as results.

## Git and publication gate

Initial Phase 6 commit: 46217567e3b8cdd79646de3d3fd48c09c1663ed5. Follow-up unit fixes/tests remain uncommitted. Exclude photo, raw evidence and old private resume report.

Automatic approval review rejected push to confirmed PUBLIC vdokhalov/BarDoctor-AI pending explicit public source-disclosure approval. No Phase 6 push or fresh GitHub CI has occurred; GitHub is not yet synchronized/GREEN for Phase 6. Full Linux CI and final user deployment confirmation remain required. Production v427 stays deployed.

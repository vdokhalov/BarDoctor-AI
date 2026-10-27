# BD-07 — CSV inventory lines

Baseline v656 / c998f2f2dd013f7d039e4a09916f93d3052834b1. Local isolated fixtures only.

## Reproduced cause and limits
The existing upload path is POST /api/inventory/scan. It previously passed spreadsheets, including CSV, through AI extraction. Matching converted 0.8kg to the legacy base800g without a target unit, then compared g against the current warehouse's canonical kg. The lemon was placed in unresolved while the water8pcs was mapped. The setup displayed only the mapped count; only a generic unresolved count appeared after document creation. Invalid quantities could also default to zero.

This reproduces the audit's equivalent two-row scenario from code and local data. The original CSV and original extracted provider response are unavailable; neither its delimiter nor the exact historical extraction result is known. Do not claim the decimal comma caused that historical run.

## Minimal changes
- CSV/TSV uses the existing bounded CSV parser directly, with name/quantity/unit headers in English or Russian. Semicolon, comma, quoted decimal comma, tab and UTF-8 BOM supported. No AI for CSV/TSV. Existing image/PDF/Excel provider paths remain; none were called in QA.
- Convert measured amounts directly to the matched warehouse unit via the existing unit converter. Explicit package units use an existing known package factor; missing/incompatible/unknown units are unresolved, not zero. Invalid, negative or subprecision quantities are unresolved.
- Equal-best ambiguous names and duplicate mapped product rows require correction. Explicit foreign-venue balances are excluded. Existing auth and permissions are unchanged.
- Show each unresolved row's name/reason before starting; block creation until the file is corrected/reuploaded. No silent omission or partial application.
- A bare stock-unit package label (kg/l etc.) is not a container. New count documents display the physical entry unit; real package definitions and existing documents are unchanged.

## Verification
24 targeted tests across inventory-csv-scan, inventory-counts-http-phase7, opening-http-phase5, inventory-count-display-phase7. Actual authenticated upload and count handlers with isolated SQLite, CSV delimiters/quotes, quantities0.8 and0,8, 800g→0.8kg, unresolved invalid/missing/negative/subprecision/unknown values, ambiguous names, duplicate rows, foreign venue/account, read-only scan. External fetch is forbidden in the CSV fixture. A0.8→0.7kg count generates exactly one movement; repeated finalize and another import of0.7kg generate no further movements. Existing stale/CAS and count display regressions also pass.

Compiled UI: invalid row visible and start disabled; valid two-row CSV prefills water8 and lemon0.8 with kg entry label, 390/820/1280, reload→existing list→Continue→same saved quantities. No AI requests, local fixture writes only. The browser finalization pathway is covered by HTTP tests, not a live action. UI automation encountered duplicate DOM controls during modal transitions; browser tests target the foreground control. This task does not revise the modal navigation.

Final build verified. Typecheck retains only known baseline business-health-snapshot.ts:372 TS2322 and health-partial-operations-v539.test.ts:10 TS2352. No full regression.

CSV limit:500 data rows,20 columns,512KB and240 characters/cell, UTF-8. Malformed files fail explicitly. Excel/photo/PDF extraction quality and live3394 data are not verified. No production writes, migrations, push, version or deployment.

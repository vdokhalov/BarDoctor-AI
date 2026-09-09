# Phase 6 — Purchases / costing / warehouse integrity

Baseline: production v427 VERIFIED, source e66d2c2fba8647de538196cff682b5da38184509.
Status: IN PROGRESS. No production writes, migrations or deployment authorized or performed in Phase 6.

## Findings and fixes under validation

### Manual invoice matching
- CAUSE: deterministic matching ignored `mappingSource: manual`; AI batching used the generic review flag even when only arithmetic needed review.
- BUSINESS IMPACT: re-recognition could replace an explicit tea selection with an incorrect exact alias and post against the wrong item.
- FIX: preserve operator-selected identity; missing targets and arithmetic issues still require review; manual identity is excluded from AI batching and proposal application.
- VERIFICATION: two tests failed against baseline; four targeted tests pass after the change. Existing AI matching tests also passed (12 combined tests).

### Purchase retry after canonicalization
- CAUSE: confirmation checked current conversion metadata and performed legacy canonicalization before checking the persisted document identity.
- BUSINESS IMPACT: a retry of an already committed receipt could return conversion review instead of the saved result.
- FIX: return the persisted duplicate after authorization and venue checks, before conversion and reconciliation; no writes on retry.
- VERIFICATION: isolated real HTTP/SQLite chain exercises repeated confirmation and byte-equal movements.

### Explicit menu/recipe identity
- CAUSE: legacy duplicate consolidation could replace nomenclature IDs while explicit ingredient and ready-product IDs still referenced the originals.
- BUSINESS IMPACT: a purchase could make a previously valid recipe unpostable.
- FIX: extend the existing protected-identity guard to explicit recipe and ready-product references. No automatic legacy merge for these records.
- VERIFICATION: the integrated receipt-to-recipe-sale test now reaches posting successfully; broad regression pending.

### Purchase edits corrupting sales movement types
- CAUSE: legacy `movementRecord` defaulted unrecognized types to receipt, stripping sale batch linkage and snapshots during purchase edits.
- BUSINESS IMPACT: full refund could report success without restoring stock (observed 2.92 kg instead of 3 kg).
- FIX: preserve immutable opening, sale-consumption and sale-reversal records through legacy normalization.
- VERIFICATION: real HTTP/SQLite chain now restores 3 kg and asserts unchanged sale movement data after purchase edit. Unsafe cancellation after later movements returns 409 without mutations. A separate unused receipt can be cancelled once, restoring prior last purchase price.

## Executed and pending gates

- Baseline targeted purchases, units, costing, invoice AI and ingredient matching: 54 PASS, none skipped.
- Current Phase 6 targeted tests: 5 PASS (four matching, one multi-operation HTTP/SQLite chain).
- Full unit suite, typecheck, lint and strict replay launched; results pending. Do not infer PASS.
- Windows sandbox tsx fails before test loading with uv_os_get_passwd ENOMEM. Targeted tests actually ran outside sandbox successfully.
- Standard build attempted: prebuild succeeded, build blocked because Bash is unavailable. Independent GitHub CI build remains required.
- UI purchases/edit/reopen/unit matrix, full mobile/desktop regression and real invoice OCR/Hybrid scenario remain pending.
- Existing invoice 394 representative runner uses a simulated AI provider; it must not be presented as a real OCR/provider result.
- Commit, push, GitHub synchronization and fresh full CI remain pending. NOT READY FOR DEPLOYMENT.

## Verification checkpoint — 2026-09-10

- Full unit suite after fixes: 934 PASS, 0 FAIL, 0 skipped. The first full run found one invalid-unit regression (932/933); it was fixed without weakening the existing assertion. Early duplicate return now requires confirmed/cancelled status; unconfirmed rows still undergo conversion validation.
- Full typecheck: PASS. Full lint: PASS, zero errors and two pre-existing warnings.
- HTTP unit matrix: pcs, kg/g, l/ml and packs; actual create/edit/retry/cancel calls with SQLite persistence. Stable line ID and expected quantities asserted, including 12 pieces remaining 12.
- Recipe sale costing: 10 portions at 8 g cost 8 MDL from a 100 MDL/kg receipt; a new 200 MDL/kg receipt changes the next preview to 16 MDL. Historical event remains unchanged.
- Espresso and americano both retain the coffee-bean identity and calculate 3.4 from the latest receipt in the existing client costing test.
- Phase 5 sales browser: 390x844 and 1280x720 PASS (HTTP/SQLite, cancel/post/lost response/reload/retry/reverse/shifts/venue).
- Purchase UI: 390x844 and 1280x720 PASS, no reported issues; both screenshots visually inspected. Includes manual remapping, explicit package content, save and reload. This browser fixture uses production conversion/posting functions; the separate HTTP chain tests actual endpoint transactions.
- Representative invoice 394 SIMULATED-provider result: 15 rows, 12 correct automatic links, 3 manual searches, 0 false links. After correction: 15 correct historical links, no AI requests. Not a live OCR/provider proof.
- User will supply an invoice photo. Real OCR/Hybrid verification remains pending.
- Sandbox replay was interrupted after prolonged lack of output; retried unchanged outside sandbox. Do not count interrupted run as PASS. Sandbox helper also reproduced spawn_ready timeout while reading a test file; targeted work continued outside sandbox.
- General navigation, Home/Reviews, unsandboxed strict replay and independent GitHub build/CI still pending at this checkpoint. No publication.

# General tech-card access / menu load fix

Baseline verified on 2026-09-20: branch `fix/product-inventory-phase1`, source `7c3ba9948e84b79f27141e85e1ab762ced49febe`, production Sites release 439, deployment succeeded. No production publication is authorized for this fix.

## Evidence and independent causes

The user's two frames were recorded on an iPhone. There is no authorized desktop session or HAR. The exact failed request/status/transport cause of the recorded `Load failed` is **not established**. The menu's structure loader issues GET `/api/nomenclature/taxonomy`; the former catch displayed the raw error message, had no retry, and allowed save. Controlled transport and HTTP failures are tested separately and do not identify the historical iPhone failure.

Confirmed code defects:

- Optional empty subcategory caused existing section/category to be replaced by a legacy path or the first unrelated taxonomy path.
- Loading errors looked like empty selectors, had no retry, and did not block unsafe save. Late rejection could update an unmounted editor.
- `bdCatState` omitted `nomenclatureStructure` when projecting catalogue data for writes. A real-handler browser test reproduced loss of the taxonomy after saving a tech card, followed by unavailable section/category in the menu editor. The existing field is now preserved.
- Detail action and editor mount depended on consumption mode, preventing access to an existing recipe during conflict review.
- Explicit ingredient selection set `purchaseProductKey` and ID but retained stale `productKey`. Clearing retained ID.
- The modern draft-save parent closed on a failed sync. It now returns failure and leaves the editor open.

## Scope

Menu taxonomy loader, menu/detail access, recipe editor reference selection and draft error handling, and preservation of the existing taxonomy field by the common catalog projection. No schema changes, production records, secrets, historical records, calculations, or consumption-mode normalization changes. No named product exceptions in production code.

The existing mobile editor standard remains: one compact top toolbar, independently scrolling content, no duplicate mobile footer. Existing recipes open without saving the menu, creating a version, or changing consumption mode. Multiple active candidates require explicit selection.

## Validation

- Local verified build passed; final client artifact preparation is also checked by the release pipeline.
- Typecheck passed. Lint has zero errors; the existing unused-variable warnings in the migration route and v399 patch remain.
- Targeted editor tests: 50 passed initially; the one outdated test context was corrected and all five affected normalization/replay tests passed on recheck. New behavior coverage includes seven loader/scope/projection tests and full patch replay idempotence.
- Five actual-handler / SQLite integration scenarios passed: conflicting ingredient reference; another correct recipe; new menu item with new recipe; several ingredients; second isolated venue. Each verifies persistent readback and denial of an editor mutation without inventory.manage. Opening is read-only, IDs/category/recipe count and stock balances are checked.
- Chrome desktop 1280x800 and mobile viewport emulation 390x844 / 412x915 passed the HTTP-backed browser flow. Each makes 65 handler requests and 3 save requests: recipe quantity/save/new GET/reopen, menu load 503/retry/save/new GET/reopen, and a Volk-like ID/key conflict repaired by explicit selection/save/new GET/reopen. Cancellation and dirty menu-to-recipe transition are also exercised.
- The original iPhone recording cannot establish its historical HTTP status or transport cause. The controlled 503/transport tests are separate evidence.

Browser harness uses local source HTML/JS, synthetic authenticated bootstrap, a loopback HTTP server, actual taxonomy/store handlers, and isolated SQLite databases. Other overview/bootstrap APIs remain fixtures. This is not production verification or a full authentication integration test. All writes remain in isolated QA databases.

No physical iPhone, Android device, or native on-screen keyboard was tested. At mobile widths the viewport was additionally reduced to 430px height; the focused quantity input remained below the action bar and fully inside the visible viewport. This is viewport emulation, not a native keyboard test.

## Evidence

Generated screenshots and machine-readable results: outputs/general-tech-card-v440/ (local, ignored by Git):

- 390-menu-error.png: HTTP failure, retry, retained editor input.
- 390-menu.png: recovered structure and retained input.
- 390-recipe-reduced-viewport.png: focused quantity field in a 430px-high viewport.
- 390-conflict.png and 390-conflict-repaired.png: explicit conflict correction and reopen.
- Equivalent screenshots exist for desktop and 412px widths.
- summary.json records browser scenarios, requests and limitations.

## Release gate

The complete GitHub workflow google-reviews-setup-v400 must pass on the pushed final commit. It includes the new actual-handler SQLite browser test in addition to all existing checks; no checks are disabled. Confirm source/remote synchronization and prepare the artifact from that source. Request one publication confirmation only after this gate succeeds.

Production is still release 439. After a separate publication approval, verify actual deployment version/status and perform authorized production test-data save/readback smoke. Without authenticated production access, do not claim PRODUCTION VERIFIED.

# POS-1 FINAL FUNCTIONAL FIX

Baseline: production v452, commit b0cc9d96aefedfeddd9044517a8379ca6720167e, branch fix/product-inventory-phase1. No production mutations, migrations, historical reposting or recalculation are part of this change.

## Causes and implementation

- **F01**: the menu editor saves `sectionId / taxonomyCategoryId / subcategoryId`, but server overview metadata and the Menu accordion read `groupId / subgroupId / department / category`. Those legacy fields can legitimately remain stale after a canonical edit. Server overview now resolves canonical metadata, and the existing accordion receives a read-only projection of the same canonical hierarchy. The TypeScript resolver is compiled into the SPA by `patch-pos1-functional.mjs`; it is not a separately maintained taxonomy. Existing legacy-only accordion behavior is retained. No catalog records are rewritten.
- **F02**: cashier translated section display text into a fixed `bar/kitchen/hookah` list, then appended unmatched names. Default canonical section ID `hookah` has product label **Кальянная**. Cashier now uses returned section IDs and labels, with no display-name classification. Existing legacy group identities (`sectionId`, `legacyDepartment`, group ID) take precedence in the existing compatibility resolver. Renaming a canonical section preserves its identity.
- **F03**: search was ANDed with department/category filters. A nonempty query now searches the entire server-authorized available menu; clearing it restores department/category/subcategory selection. No change to server venue/active/archive filtering.
- **F04**: BarDoctor stores a real three-level taxonomy. POS uses the existing category row plus a subordinate row when a category has subdivisions. Product cards show the saved path, including global search results. The existing layout, cart, payment and sales navigation are retained.

## F07: UNKNOWN is not ZERO

Canonical costing is `cost-basis.ts` → `sales-consumption.ts` snapshot → authoritative `SalesEvent.batch`, with stock movement cost markers. Latest applicable confirmed receipt determines unit cost; quantity alone is insufficient. `financial-reconciliation.ts` already requires FULL captured valuation before recognizing complete cost/profit.

| Case | Snapshot / batch | Movement | Result |
|---|---|---|---|
| Known receipt: 20 units cost 100 | unit cost 5; FULL, total 5 | KNOWN, cost 5 | Known measured cost |
| Quantity exists, no applicable priced receipt | null; UNVALUED, total null | UNKNOWN, null | Unknown, never zero |
| Confirmed receipt explicitly costs 0 | unit cost 0; FULL, total 0 | KNOWN_ZERO | Real zero is supported |
| consumptionMode NONE | FULL, total 0 | No stock movement | No consumption, distinct from UNKNOWN |
| Unknown stocked line plus NONE line | PARTIAL, known subtotal 0 | UNKNOWN only for stocked line | Full cost remains unknown |

The mixed case reproduced the misleading zero: `totalTheoreticalCost` is the known subtotal when `costStatus=PARTIAL`; receipt/document renderers treated it as complete. Cashier receipt, manual-entry event view and linked/main journal document now use one shared presentation function that respects costStatus. The journal KPI reader also requires FULL, matching the existing finance rule. Stored snapshots, finance calculations and historical data are unchanged. The exact production QA document was not fetched or altered during development; the defect is reproduced on isolated data.

## Regression evidence

`tests/pos1-functional.test.ts` exercises canonical Menu projection and server overview, renamed/legacy hookah identity, missing links, actual cashier filtering, compiled SPA integration, and real HTTP handlers backed by isolated SQLite for KNOWN / UNKNOWN / ZERO / NONE / PARTIAL. Stable-ID duplicate submissions verify event count, revenue row, receipt count and identical movement ledger.

`scripts/pos1-hardening-browser.ts` uses real auth, store, sales-event, sales-document and overview handlers with isolated SQLite and actual Chrome. It covers 390×844, 820×1000 and 1280×800. The unrelated venue-switcher transport is omitted in this focused fixture; existing sales and compiled-client CI tests cover the shared shell separately.

Network faults: offline before request; response truncation before the authoritative handler; response truncation after commit; explicit retry; reload reconciliation; repeated stable operation ID. Assertions cover authoritative event count, receipt/revenue totals, stock movement count and balance, draft restoration/cleanup, account/venue/shift isolation. A truncated response is used because Chrome may transparently repeat a socket reset before headers.

Visual outputs: `outputs/pos1-hardening/*-{taxonomy,menu-overview,menu,cart,document}.png`; machine report: `outputs/pos1-hardening/results.json`. These are local QA artifacts, not production fixtures. Viewports are browser emulation, not physical iPhone/Android tests.

Additional regression: existing POS numerical 30 revenue / 12 cost / 0.96 stock case; sales import and manual entry; shifts; financial reconciliation; warehouse; existing Menu/Tech Card tests; the complete GitHub workflow including Google Reviews, setup and lifecycle. No assertions or CI checks are disabled.

## Release gate

Run verified build, typecheck, lint, full tests and mandatory GitHub CI on the final pushed commit. Check GitHub synchronization. Prepare deployment only; publication requires one final user confirmation. POS-2 and sales redesign are out of scope. Existing unrelated recovery documents are not included in this change.

## Verified local results

- Verified Worker build: PASS. Final client: index-BQGspy0I-a024ae656bc0.js.
- Typecheck: PASS. Lint: 0 errors; 2 pre-existing unused-variable warnings.
- Full initial TypeScript run: 1251 tests, 1249 passed; two artifact-reading tests collided with in-progress preparation. Both pass on the stable artifact (invoice suite: 44; venue working-days suite: 4). Added final resolver/renderer tests also pass. Mandatory CI will run the complete final suite again.
- Artifact regression: 434 + 100 + 4 passed. After correcting the legacy patch boundary conflict, 434 + 100 plus all 11 new functional tests passed again.
- Dependent assortment/costing/financial/sales tests: 103 passed.
- Actual Chrome: 390×844, 820×1000, 1280×800 PASS for Menu and cashier. On each independent fixture: 3 sales, 120 PMR_RUB revenue, 3 stock movements, 100→97 units, 3 receipts. Four POST attempts include one failure before the authoritative handler; duplicate stable-ID calls add nothing. Lost response reconciles after reload; drafts clear after confirmed sales.
- Original POS browser control: revenue 30, cost 12, 1→0.96 L, desktop/mobile/tablet PASS.
- Baseline reproduction file confirms Kitchen→Bar and zero search results before the fix, Kitchen and one result after.
- One local compiler timeout and one transient OneDrive file-open failure were diagnosed; the verified build completed. No check or assertion was disabled. Shared Menu helpers were moved outside the legacy rewrite boundary so artifact preparation cannot remove a dependency while retaining its caller.

## Changed files

- lib/bardoctor/nomenclature-taxonomy.ts — shared identity/path/hierarchy projection and legacy identity priority.
- lib/bardoctor/assortment-analytics.ts — canonical overview metadata.
- lib/bardoctor/sales-consumption.ts — complete-cost KPI gate.
- public/cashier.js, public/cashier.css, app/cashier/route.ts — ID filters, global search, subcategories and wrapping.
- public/accounting-currency.js, public/sales-entry.js, public/sales-import.js — shared status-aware cost presentation.
- lib/bardoctor/app-shell.ts, app/sales-entry/route.ts, app/sales-import/route.ts — changed-resource cache versions.
- scripts/patch-pos1-functional.mjs, public/assets/index-BQGspy0I.js — generated shared resolver and existing Menu adapter.
- package.json, scripts/build-verified.sh — repeatable artifact integration.
- tests/pos1-functional.test.ts, tests/pos1-hardening.test.ts, scripts/pos1-hardening-browser.ts — behavioral, real-handler and viewport regression.
- scripts/sales-browser-qa-phase5.ts — manual-entry browser check asserts real UNVALUED/null preview and status-aware text.
- This report.

Final manual-sales browser regression passes on 390×844 and 1280×720. The existing text expectation was updated to the shared “Себестоимость: не рассчитана” wording and strengthened with real server UNVALUED/null and no-zero assertions; cancellation, lost-response recovery, return, shifts and venue switching remain covered.

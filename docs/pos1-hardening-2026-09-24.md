# POS-1 hardening — 24 September 2026

Scope: existing POS-1 only. No production writes, schema migration, sales reposting, currency conversion or POS-2 workflows. Baseline production v451 / commit 1761f753a9dce0941b082d8c84bf5016e3ad74b6, branch fix/product-inventory-phase1. Final commit and CI are recorded in the release handoff.

## Root causes and fixes

| Defect | Proven cause | General fix |
| --- | --- | --- |
| P1-01 | The embedded sales page intercepted the cashier anchor and sent /cashier to the outer React SPA router. Cashier is a standalone server route, absent from that SPA component table. The existing standalone exception covered only /sales-entry. | Extend the existing bridge to cashier, retaining venue and removing embedded. Native route history supports direct URL, back and forward. Register both standalone routes in navigation metadata and venue switching. No manual reload required. |
| P1-02 | Cart Map, comment and payment selection existed only in page memory. Only an uncertain payment had sessionStorage recovery. | Versioned local draft keyed by server account identity, venue and shift. Save on edits, restore against freshly loaded menu prices, keep missing items visible but block payment. Persist the stable order ID and pending command before sending. Reconcile an uncertain result by exact externalId; never automatically post after reload. Clear after confirmed success. Another tab changing the same draft freezes the stale tab. |
| P1-03 | POS writes the authoritative bd_sales_events_v1 record, including its batch snapshot. The main /sales-import journal read only bd_sales_batches; warehouse links already pointed to the event document ID and found nothing. | Read-only event.batch projection in the existing journal GET and document lookup. Display revenue, prices, cost snapshot, shift, actor, payment and movement count. Do not insert a second sale. Existing imports remain editable through their existing workflow; event documents cannot be posted through it. POS is excluded from import templates/frequent imported items. |
| P2-01 | Cashier read stale department/category strings instead of the sectionId/taxonomyCategoryId/subcategoryId relations maintained by Menu. | Resolve canonical nomenclatureStructure through the existing taxonomy resolver, including legacy group/subgroup and nested sections. Unavailable references are explicit and products remain discoverable. No stored taxonomy rewrite. |
| P2-02 | Cashier showed raw codes, the import KPI hardcoded MDL, and warehouse formatting/default arguments used MDL. | Extract the existing accounting money presentation into one shared browser helper. Finance and warehouse wrappers, cashier, sales entry and journal delegate to it. PMR_RUB is shown as руб. ПМР; explicit stored currencies are retained. Unknown cost stays unknown. |

## Architecture and touched surfaces

- Server: app/api/sales-events/route.ts; app/api/sales-batches/route.ts; lib/bardoctor/sales-events.ts; lib/bardoctor/nomenclature-taxonomy.ts.
- Cashier: app/cashier/route.ts; public/cashier.js; public/cashier.css; public/pos-draft.js.
- Shared presentation/navigation: public/accounting-currency.js; lib/bardoctor/app-shell.ts; public/navigation-contract-v247.js; public/venue-switcher.js; public/sales-entry.js; public/sales-import.js; public/sales-import.css; app/sales-import/route.ts; public/assets/index-BQGspy0I.js.
- Reproducible artifact patch: scripts/patch-pos1-hardening.mjs, scripts/patch-phase5-onboarding.mjs, package.json, scripts/build-verified.sh. The legacy bundle embeds the same formatter source for shells that do not load standalone assets.
- Regression: tests/pos1-hardening.test.ts; tests/navigation-consistency.test.mjs; tests/helpers/opening-runtime.ts; scripts/pos1-hardening-browser.ts; existing POS and sales browser suites. Mandatory CI includes the new browser suite.

Sales planning, consumption, cost snapshots, CAS/idempotency, role enforcement and authoritative revenue remain the existing POS-1 mechanisms. No new database persistence for drafts.

## Regression matrix

Browser coverage uses actual HTTP requests to application handlers and isolated SQLite. Focused hardening uses real registration/session validation, bootstrap/store, event and journal handlers; it serves the actual SPA for the Sales → Cashier route. The ancillary venue-switcher transport is disabled in this focused fixture; the existing sales browser suite separately exercises the real switcher.

| Required cases | Evidence |
| --- | --- |
| 1–2 Direct cashier, Sales → Cashier, query venue, back/forward | Full SPA hardening browser at 390/820/1280 |
| 3–5 No shift, one shift, multiple shifts | Existing POS browser + hardening browser |
| 6–8 Search, Bar/Kitchen/Hookah, categories | Canonical conflicting fixtures in all three viewports; taxonomy unit test covers legacy, nested and missing references |
| 9–13 Add/re-add, quantity, remove, comment | Browser assertions; long basket of 15 units |
| 14–15 Cash and external card | Original numeric browser scenario + card hardening scenario |
| 16–18 Reload, draft restore, success cleanup | Reload and close/reopen tab; account/venue/shift isolation; empty cart after success |
| 19–21 Fast add/pay, idempotency | Double-click assertions; stable operation ID and exactly one authoritative event per intended sale |
| 22–24 Network failure/retry/reload after success | Offline before request, recovery and explicit retry; lost response after server commit; reload resolves existing event without reposting |
| 25 Journal consistency | Main journal list + read-only modal, direct linked document API and /sales-entry; finance remains server revenue store; no duplicate bd_sales_batches write |
| 26 Stock movement | TEST VODKA 40: 1 L → 0.96 L, movement −0.04 L, revenue30, cost12 PMR_RUB, exact shift/actor, stable after server reread |
| 27 No-consumption item | NONE scenario: two intended sales, revenue60, zero movements at every viewport |
| 28 Currency | Shared formatter and finance/stock wrappers: PMR_RUB, MDL, RUB, EUR, USD, UAH, RON; unknown cost remains — |
| Existing behavior | Full unit/artifact suites, four consumption modes, unknown cost, midnight shift, role restrictions, other employee/venue; existing sales import/manual entry/reversal and shift lifecycle browser regression |

## Viewport evidence

Windows Chrome/Chromium automation: mobile 390×844, tablet820×1000, desktop1280×800. These are browser viewport emulations, not physical iPhone/Android or touchscreen/keyboard certification.

Generated evidence lives in outputs/pos1-hardening: mobile-menu.png, mobile-cart.png, mobile-document.png, corresponding tablet/desktop files, results.json. Original numeric sale evidence lives in outputs/pos1. Screenshots are local artifacts, not production data.

At all three widths tests check horizontal bounds, long unbroken product names, 15-unit basket, controls and final payment access. Tablet/desktop cart has a bounded scrollable line area below the shared header; comment/payment/total stay reachable. Mobile order jump and ordinary document scrolling remain available.

## Local validation

- Full repeated artifact preparation:5/5 PASS, including byte stability and one standalone navigation handler.
- Verified build: PASS (Windows prepared-build adapter for the repository Linux build pipeline).
- Typecheck: PASS.
- Lint: no errors; two existing unused-variable warnings outside this change.
- Full TypeScript suite executed:1242 tests. Three initial failures were corrected (test-handler dependency wiring and redundant currency fallback in isolated renderers); affected suites and new hardening tests passed53/53. Final GitHub CI repeats the complete suite on the final commit.
- Main artifact suite:434 tests; its only initial failure was the exact registered route count53→55. Updated the count plus explicit cashier/sales-entry parent assertions; navigation suite3/3 PASS.
- Additional artifact suite100/100 PASS; ancillary integration/artifact checks21/21 PASS; button/header/navigation/modern audits PASS.
- Existing sales browser regression: PASS at390/1280, including venue switching, manual sale, lost response, retry and shift lifecycle.
- POS numeric browser and hardening browser: PASS at all three widths. No production data used.

## Operational limits

Drafts survive navigation and closing/reopening in the same browser profile, provided local storage is retained. They do not synchronize devices and are not an offline POS. Private browsing/cleared storage cannot guarantee retention. Storage write failure blocks payment; stale concurrent tabs must reopen. Restored unsubmitted drafts use current server prices and explicitly ask the operator to review them. A pending operation preserves its original command for safe reconciliation.

This report does not claim production verification. Deployment and safe smoke in the dedicated QA venue require the final publication confirmation. Existing venue Кёльн is excluded from business test operations.

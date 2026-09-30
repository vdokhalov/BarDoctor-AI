# Phase 2 taxonomy regression fix after production v465

Phase 2 remains incomplete until the approved next version passes production smoke. No Phase 3 implementation is included.

## Root cause and contract

Production v465 (`c34ab12d07428d6aafb684e31521f2bccff5743d`) accepted the first Manual menu item in a stock-first `bd_assortment_v1` that had no `nomenclatureStructure`. Its saved `sectionId=bar` and `taxonomyCategoryId=alcohol` were correct. The editor taxonomy endpoint and ingestion validator called `canonicalTaxonomyForAssortment` with `defaultNomenclatureStructure()`. Assortment analytics and the shared Menu hierarchy called that same resolver without a fallback, so they resolved an empty tree and displayed unavailable labels. The stock-first test had asserted successful confirmation and preserved balances, but never read the resulting labels. The browser fixture also preseeded a structure in its stock-first case, masking the missing-structure contract.

The shared resolver now defaults to the existing `defaultNomenclatureStructure()` for an absent structure. Ingestion, taxonomy GET, assortment analytics and Menu presentation therefore use the same read-only projection. An explicitly stored tree, including an empty, renamed, archived or reduced custom tree, remains authoritative. The previous unconditional replacement of an explicitly empty tree with presets is removed. Existing legacy menu-group projection remains available without saving it.

The SPA already generates its read-only Menu hierarchy from this TypeScript module. Its preparation script now bundles the resolver's import from the existing nomenclature module, instead of transpiling a dependency-free slice. The resulting client embeds generated code from the same definitions; it does not introduce a stored taxonomy or another editable source of truth.

## Data and migration safety

- No database schema or migration files changed. No backfill, production mutation or deployment is part of this fix.
- Canonical assortment and menu records are not rewritten on reads. Confirmation still changes only its existing menu/recipe lifecycle/receipt contract.
- Existing v465 menu items without a stored tree resolve correctly immediately when the fixed read-model is used; no corrective write is required, including for QA venue 3314.
- Tests use new synthetic accounts and isolated transactional SQLite. Production venue 3314 is not mutated by this preparation; Cologne and other working venues are not test targets.
- Existing renamed/custom/archived/removed structures retain their labels and identities. Explicitly missing references remain visibly unavailable; preset nodes are not reinserted into a saved empty tree.

## Regression evidence

`tests/menu-ingestion-phase2.test.ts` adds the authenticated first-entry scenario on the real stock-first store with no menu or taxonomy structure. The test failed on v465 with the exact unavailable-label mismatch before the fix. It now checks canonical IDs and overview labels after confirm and fresh reload reads, with byte-identical canonical data across GETs, for Bar/Alcohol, Bar/Soft drinks, Kitchen/Food, Hookah/Tobacco, Household/Cleaning and Administration/Services.

`tests/nomenclature-taxonomy.test.ts` covers already stored menu links without a structure, shared fallback equivalence, read-only hierarchy, saved renamed/archived/removed nodes and explicitly empty trees. `tests/pos1-functional.test.ts` executes the generated SPA resolver and compares it with the server TypeScript hierarchy for stock-first links and existing custom/legacy data.

`scripts/menu-ingestion-phase2-browser.ts` covers existing menus and real stock-first stores at 390×844, 412×915 and 1280×800, including dedicated mobile/desktop first-entry cases. It checks Manual, Scan and file Import draft/validate/confirm; Import Diff additions/changes/unchanged/invalid/conflict/exclusion; invalid correction; duplicate exclusion; stale concurrent target; unchanged canonical data before confirm; lost-response retry; repeated confirm; cancel; preservation of existing menu records/recipes/nomenclature/balances; and five taxonomy mappings through canonical GET, overview GET and visible Menu grouping before and after reload.

External OCR output is fixed only in the local browser fixture; source entry and normalization feed real ingestion handlers. This is local regression evidence, not a claim that production OCR or physical-device testing passed. Those remain production smoke checks after the user's deployment approval.

## Verification completed before commit

- Targeted taxonomy, ingestion, analytics and POS tests: 63 passed. Build and typecheck passed. Lint passed with zero errors and two existing unrelated unused-variable warnings.
- Full `npm test`: all stages passed, including 1,334 TypeScript tests and artifact/data-integrity suites. No failed or skipped tests.
- Final Phase 2 browser matrix: all five profiles passed (existing and stock-first desktop/mobile), including every scenario listed above.
- Existing Menu consumption compatibility, Recipes real-handler SQLite compatibility, POS cashier desktop/mobile/tablet, Warehouse opening/confirm/reload desktop/mobile: passed.
- Built static and Worker shells executed the exact final content-versioned client on desktop and iPhone emulation; artifact validation passed.
- A local read-only projection of the captured v465 QA venue 3314 snapshot resolved the existing confirmed item's `bar/alcohol` IDs to `Бар/Алкоголь`, with canonical bytes unchanged. This verifies that this production record needs no backfill; it is not a production deployment or production smoke pass.
- Reviewed changed paths: shared taxonomy resolver, its generated client preparation, regression tests/browser harness and this report only. The generated client diff is entirely inside the shared taxonomy block; the rest of the SPA is byte-identical. No schema, migration, dependency lock or other functional changes.

Verification logs and screenshots are local ignored artifacts under `outputs/phase2-taxonomy-fix/` and `outputs/menu-ingestion-phase2/`. GitHub CI must also pass before saving the next Sites version. Production publication requires the user's final confirmation.

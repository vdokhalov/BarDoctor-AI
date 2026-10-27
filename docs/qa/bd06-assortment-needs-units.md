# BD-06 — needs amount units

Baseline v655 / 36a9611cadc79bbe7273ec21e8cbe3e7d766252c. Local-only isolated fixtures.

## Proven cause
`bdAssortmentAmountV170` previously recognized only `ml` and `g`, and labeled every other unit `шт.`. The current canonical inventory model also uses `kg` and `l`. The needs handler returns those units correctly; only the display helper mislabeled them. All four metrics in `bdAssortmentNeedsV170` use that helper.

Actual purchase-confirmation and sales-event planners reproduce a 1kg lemon receipt, recipe 0.1kg or 100g, and sale of two portions. With planned quantity20 the derived need is2kg, remaining stock0.8kg, shortage1.2kg. Before sale stock1kg implies shortage1kg. Package size1kg produces2 packages /2kg recommended after sale, distinct from the shortage1.2kg. Arithmetic, stock movements and stored units remain unchanged.

## Change
Display kg/l explicitly, retain g/ml scale presentation and explicit pieces, handle missing/unsupported units with “единица не указана” instead of inventing pieces. Preserve fractional values to the model's three-decimal precision; invalid/missing amounts remain “Не определено”. Below 600px actual content width, needs cards stack so the existing tablet layout no longer truncates the unit. No server arithmetic, API/schema, CSV inventory import, purchase packaging or financial changes.

## Checks
52 targeted tests across assortment amount labels, assortment analytics and consumable needs. Actual purchase/sale planners, kg and g recipe input, l/ml equivalent volume model, pcs, fractional values, missing/invalid values, unknown units, canonical compiled helper, tenant isolation, repeat and input immutability.
Compiled browser uses real authenticated overview handler and isolated SQLite fixture, before/after quantity scenarios, 390/820/1280, direct needs route, overview→needs, reload and other-account isolation. No business or AI requests from browser.
Build: scripts/build-verified.sh. Typecheck: only two known baseline errors, business-health-snapshot.ts:372 TS2322 and health-partial-operations-v539.test.ts:10 TS2352. No full regression.

## Limits
No live verification or production writes. Existing audit figures reproduced locally; no claim of changing or rechecking real3394 records. No inventory import BD-07 changes. No push, version or deployment.

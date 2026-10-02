# Phase 3A.3 — Cost & Warehouse Trace

Baseline: production Sites v472, `5a70c19fdf88f30b551c58d1f322c683a3ec44d9`.

## Current source contract

`planSalesEvent` → `createOrUpdateSalesBatch` → `postSalesBatch` captures the already canonical `SalesBatchLine.recipeSnapshot`. The snapshot contains consumed menu ID/name, recipe ID/version/capture timestamp, and each ingredient's nomenclature ID/product key, warehouse, recipe quantity/unit, base quantity per portion/total, conversion snapshot, unit/total cost, cost status/method, receipt document/line and effective date. `theoreticalCost` and `totalTheoreticalCost` are persisted by this existing writer; the projection does not rerun costing.

LAST PURCHASE PRICE is `latest_confirmed_receipt` (`cost-basis.ts`). It selects applicable active receipts under the existing venue/warehouse/as-of/date and currency/unit rules. Confirmed purchasing can normalize physical units (l→ml, kg→g) and update current nomenclature/balance metadata. New sales use this canonical resolver. Old sale snapshots and original movement cost are unchanged.

Sale quantity is portions. Ingredient `baseQuantityPerPortion × sale quantity` is the captured total consumption. `sale_consumption` movements contain negative base quantity and negative captured ingredient total cost, canonical base unit, warehouse, source document/line, sales batch/line, recipe version and snapshot. Existing `idempotencyKey` identifies the ingredient; product identity alone cannot distinguish two recipe ingredients consuming the same product. Existing IDs and this key are used, without creating a new relation table.

Current warehouse balances/value are repriced by latest receipt; this current stock valuation is a different value from historical captured sale/write-off cost. The projection never forces them to equal. Historical consumption valuation equals the sum of captured ingredient costs, subject to existing monetary rounding. A later compensating movement can use the current balance's unit and the existing canonical unit conversion while retaining the original monetary cost.

Native event reversal retains the original posted batch snapshot, marks `SALE_EVENT.status=REVERSED`, and persists separate `sale_reversal` warehouse movements. Thus `event.batch.reversalMovementIds` is not the sole authority: original movement ID plus sale/line source links in the canonical movement store establish reversal. Original captured cost remains historical; compensating movements are separate from original cost totals. POS_API reversal remains unavailable under the existing contract. Unposted draft cancellation creates no sale cost fact/movement; posted sales require existing reversal.

## Read contract

`GET /api/evidence/facts/sale-cost?saleId=...` with optional `lineId=...` and `expectedRevision=sha256:...`. No other query keys, repeated selectors, account/dataAccount/workspace selectors, or arbitrary facts queries are accepted. Authentication and tenant context are derived by the existing Phase 3A.1 context validator. All transport paths retain private/no-store semantics and the infrastructure error boundary.

`SALE_CAPTURED_COST` identity is workspace + venue + sale + optional line. Scalar fields include canonical sale/line/menu IDs, sale quantity, captured line/aggregate total, currency, cost status/method, canonical batch cost status, lifecycle, businessDate, real accepted/reversed timestamps, revision, bounded references, diagnostics and traceTarget. A line's `capturedUnitCost` is explicitly `CAPTURED_TOTAL_PER_SALE_QUANTITY` (division of the saved line total by saved portion quantity), never today's price. The aggregate does not invent an aggregate menu ID/quantity/unit cost.

Cost status is independent of finality, availability and evidence completeness:

- KNOWN: all required captured ingredient/line costs are known, including explicit KNOWN_ZERO.
- UNKNOWN: required cost/snapshot is absent; the missing amount remains null.
- PARTIAL: only part of ingredients or lines have costs. The saved batch's `PARTIAL` known-line subtotal may exist; it is explicitly not full sale cost. A partially priced single recipe can have canonical batch `UNVALUED` and total null: ingredient-level status still honestly reports PARTIAL.
- NONE: existing NONE snapshot is not applicable consumption; canonical cost is zero, method NOT_APPLICABLE, no artificial warehouse movement.

Read projection preserves `batch.costStatus=FULL/PARTIAL/UNVALUED`. Historical lifecycle/captured finality is not daily revenue finality; closing a cash shift is unrelated to captured cost.

## Evidence and binding

`SALE_EVENT[/line] → CAPTURED_COST → CAPTURED_RECIPE → CAPTURED_INGREDIENT → WAREHOUSE_MOVEMENT`.

The captured recipe projection includes the consumed historical menu identity/name, recipe ID/version, capture timestamp and ingredient count. Ingredients are paginated references, not a copied full recipe or warehouse store. Ingredient projections expose only persisted consumption/cost/conversion/source fields. The snapshot is the existing canonical historical evidence, not a newly synthesized snapshot of today's tech card.

Live Menu and Nomenclature references are `current_definition`, with `CURRENT_DEFINITION_ONLY` diagnostics and separate content binding. They explicitly do not prove historical current recipe/prices. Editing today's recipe does not replace the real captured recipe. When no captured snapshot exists, the projection reports missing/partial evidence; it never substitutes today's recipe.

Movements resolve under inventory.view; captured sale/recipe/ingredient records under sales.view. Current menu/nomenclature requires inventory.view. No new permissions are added. Relations to inaccessible records are omitted with RELATIONS_RESTRICTED; every resolve reauthorizes. Scope, source sale/document/line, original movement, menu, product, warehouse, quantity/unit and captured valuation are checked before movement relations are emitted. Multiple identical-product ingredients still resolve distinct movements through canonical identities. Missing or contradictory records never certify complete proof.

Durable `SALE_EVENT.originalMovements` is an existing canonical source when retention removes an original from the bounded movement store; resolver labels `SALE_ORIGINAL_MOVEMENT`. A present conflicting live movement is not hidden by this fallback. No missing compensating history is invented.

References bind the actual sale parent and selected related movement/current-definition inputs plus permission visibility. Monetary captured values remain stable after purchasing; a related mutable current-definition change may invalidate an old whole-trace binding. Bound mutable edits/deletions return READ_MODEL_CHANGED, with no replacement evidence. Unrelated sales/receipts outside these inputs do not silently rewrite the captured cost. Existing reference hashes remain unchanged: the new ingredient selector enters hashes only for ingredient references.

## Validation / scope

Targeted real-handler isolated SQLite tests resolve all IDs and prove known sale total = saved captured line sum = original warehouse consumption valuation. They cover multiple ingredients/quantities, pcs/ml/l/g/kg, canonical purchase price change X→Y with immutable historical X, UNKNOWN/PARTIAL/NONE/known zero, mutable/current and captured bindings, native compensating reversal/idempotence/POS reversal restriction/draft cancel, concurrent independent sales, duplicate/foreign nested inputs, scope/data-owner/RBAC, bounded pages above 20 ingredients, durable fallback and missing evidence. Snapshot and database mutation guards compare canonical content/timestamps, audit and storage.

Compiled native Worker/native D1 covers revenue regression and known captured cost/recipe/ingredient/warehouse API with database mutation guards. Browser HTTP QA uses actual isolated handlers at 390/1280 px, bound pagination, source IDs, signed quantities/value, tenant/RBAC, private caching and read-only content. Existing relevant POS/Menu/Recipe/Warehouse tests and required CI gates remain intact.

No business writer/costing/valuation/reversal formula, UI, Business Health or AI changes. No persisted fact/evidence/cost ledger, schema, migration, historical backfill or production business-data mutation. Authentication's known owner reconciliation behavior is unchanged. PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED.

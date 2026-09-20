# Ingredient reference conflict fix (v441 candidate)

Baseline: production v440, source `a7eaf1b2f00dd9954179d33b8db2181fb8924f4b`, branch `fix/product-inventory-phase1`.

## Reproduction and cause

Authenticated production smoke created one explicitly named TEST item and draft in test venue 3293. A real store PUT with the ingredient ID for grain and both product keys for cookies returned 200. A fresh GET showed that reconciliation had replaced the ID with the cookie ID. Existing recipes, menu items and stock balances remained unchanged. Production testing stopped; no repair or release has been applied there.

`reconcileIngredient` preferred purchaseProductKey before comparing references, then `resolvedIngredient` overwrote nomenclatureItemId. `rememberConfirmedIngredientAliases` could also learn that conflicting key as an explicit choice. Draft consumption validation did not reject this, and confirmation was not independently guarded.

## Fix

- Compare all supplied references after existing canonical alias resolution before selecting any candidate.
- Preserve conflicting ID/keys, mark the ingredient ambiguous/reference_conflict, and clear derived normalized quantity/unit. Never turn a conflict into a learned ingredient alias.
- Keep draft save available so existing conflicts can be opened and explicitly repaired.
- Reject confirmation of changed conflicting recipes with HTTP 422 before persistence. Scope the check to changed recipes/owners; unrelated legacy data is not rewritten or used to block the current edit.
- Retain existing unit, venue, access, pricing and consumption validation. No schema changes, data migrations or client redesign.

## Validation

The new actual-handler SQLite regression failed on the v440 implementation (ID replaced and conflict hidden). Tests cover draft PUT/new GET, explicit repair/new GET, each conflicting key, alias compatibility, unrelated legacy preservation and failed confirmation without a database write. Existing v440 tests cover a second venue, permission rejection, multiple ingredients, mobile/desktop editor access and save/reopen.

Final build, browser and GitHub CI results are recorded in the release handoff. Production remains v440 until publication is separately approved. Physical device/native keyboard tests are not implied by viewport QA.

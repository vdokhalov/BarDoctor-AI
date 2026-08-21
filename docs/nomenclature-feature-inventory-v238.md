# Nomenclature feature inventory — v239

This inventory records the production behaviours that must remain available through the existing `/nomenclature` route during and after the compact tree-view redesign.

## Navigation and context

- Back navigation returns to `/more` through the canonical navigation helper.
- The canonical venue switcher remains in the header and keeps the existing venue-switch transaction and cache isolation.
- The canonical bottom navigation remains mounted with `Ещё` as the active area.
- The global scroll-to-top control remains available above the bottom navigation and iOS safe area.

## Discovery and views

- Search matches item names and the full section/category/subcategory path.
- The existing views remain: `Структура`, `Все позиции`, and `На проверке`.
- The attention count remains visible as a badge and a compact status entry.
- Empty sections, categories, and subcategories remain visible where the taxonomy contains them.

## Hierarchy and item access

- Every section starts collapsed when the screen is opened or reopened.
- Opening a section never opens a category; opening a category never opens a subcategory.
- Section, category, and subcategory rows expand independently.
- Search reveals only matching paths temporarily and restores the user's disclosure state when cleared.
- A venue change resets section, category, and subcategory disclosure state instead of reusing IDs from the previous venue.
- The complete hierarchy row is the disclosure target and exposes `aria-expanded`.
- An item row opens the existing nomenclature editor and never toggles an accordion branch.
- Each product key is rendered once in its corresponding hierarchy branch.
- Product rows show the storage location as secondary text and the current balance in the product's configured display unit.

## Existing actions

- Add a nomenclature position.
- Start `Добавить покупку` and return to nomenclature.
- Open warehouse balances.
- Open, edit, and save a product or service.
- Change section, category, subcategory, storage location, purchase category, and active state.
- Change stock unit when the existing movement/stock lock permits it.
- Change receipt mode, display unit, package size, and the selected package conversion.
- Review an automatically classified position and confirm the corrected path by saving it.

## Safety boundaries

- No database schema, API contract, integration, stock posting, balance calculation, merge, archive, or normalization logic is changed by v239.
- The redesign reads real venue-scoped data and never substitutes mock balance values from the visual reference.
- The existing product editor, purchase-unit conversion, canonical stock values, and duplicate reconciliation remain the source of truth.

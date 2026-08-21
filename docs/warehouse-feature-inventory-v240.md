# Warehouse feature inventory — v240

This inventory records the production behaviours that must remain available through the existing `/warehouse` route during and after the compact hierarchy redesign.

## Navigation and venue context

- Back navigation uses the canonical application helper and returns to `/more`.
- The canonical venue switcher remains available in the header.
- A venue switch keeps venue-scoped balances, movements, inventory snapshots, units, packaging, prices and statuses isolated.
- The canonical bottom navigation remains mounted and keeps the existing finance-area route mapping.
- The global scroll-to-top control remains available above the bottom navigation and iOS safe area.

## Primary actions

- Start a manual inventory count.
- Scan an inventory sheet from photo, PDF, CSV, TSV, XLS or XLSX.
- Open the existing sales import flow.
- Start the existing purchase flow and return to the warehouse.

## Views and filters

- `Остатки`, `Движения`, `Инвентаризации` and the existing `Списания` view remain available.
- Search by product name remains available.
- Grouping by sections, categories, subcategories or a flat list remains available.
- The nomenclature shortcut remains available.
- Zero-stock and negative-stock counters remain dynamic for the current venue.

## Stock hierarchy and product access

- Every section, category and subcategory starts collapsed when the screen is opened or reopened.
- Opening a section never opens a category; opening a category never opens a subcategory.
- Section, category and subcategory rows expand independently and expose `aria-expanded` and `aria-controls`.
- Search may reveal matching paths temporarily and restores the user's disclosure state when cleared.
- A venue change resets all disclosure state and never reuses branch IDs from the previous venue.
- Closing a parent hides its complete descendant subtree without altering stock data.
- Product rows display the configured venue-scoped balance and unit, compact status, storage location, cost and last receipt.
- A tap anywhere on the product row opens the existing warehouse product card.
- Zero and negative balances remain visible and openable.

## Product card and inventory operations

- The existing product card preserves package size, accounting unit, display unit, source, last receipt, recipe links, safe editing and safe archival rules.
- Inventory count creation, scanned-draft review, saved-count viewing and inventory adjustment posting remain unchanged.
- Movement history, write-off creation/deletion and monthly-report navigation remain unchanged.

## Safety boundaries

- No database schema, API contract, stock engine, purchase posting, sales import, inventory engine, integration, connector, balance calculation, duplicate repair, unit conversion or product data is changed by v240.
- The redesign reads the real current-venue taxonomy and balances and never substitutes mock values from the visual reference.


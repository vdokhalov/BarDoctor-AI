# Warehouse controlled refinement — v241

This document records the v241 UI-only refinement layered on top of the verified v240 compact hierarchy.

## Preserved production functionality

- Current-venue KPI values and the existing multi-currency presentation remain unchanged.
- Manual inventory, inventory-sheet scan, sales import and purchase actions keep their existing handlers and routes.
- `Остатки`, `Движения`, `Инвентаризации` and the production `Списания` tab remain available.
- Search, grouping modes, product opening, product details, movements, write-offs, inventory history, venue switching, scroll-to-top and canonical bottom navigation remain available.
- The product card continues to expose the configured unit, packaging, cost, last receipt and status without changing any warehouse data.

## Targeted v241 refinements

- The grouping control uses the complete compact label `Структура` on every supported mobile width.
- `Номенклатура` is a lightweight secondary link in the stock heading, not a primary full-width CTA.
- Items requiring taxonomy review are counted dynamically for the active venue and exposed through a compact warning row above the stock hierarchy.
- The synthetic `Требуют распределения` section is excluded from the real stock-section tree; its row opens the existing Nomenclature review view.
- KPI, action, tab and control spacing is reduced without changing handlers or dropping tap targets.
- Search placeholder typography is quieter while search behaviour remains unchanged.

## Disclosure and venue safety

- Sections, categories and subcategories still start collapsed.
- Every hierarchy row remains fully tappable and each level opens independently.
- Product rows remain fully tappable and keep their dynamic balance and unit.
- Venue changes reset disclosure state and refresh KPI, hierarchy, review count, balances, units and statuses from the new venue.

## Data and architecture boundary

v241 does not change stock balances, units, packaging, categories, currencies, movements, inventory calculations, purchases, sales imports, write-offs, database schema, APIs, integrations or multi-venue architecture.

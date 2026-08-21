# Warehouse v242 — controlled refinement and feature parity

## Scope

Warehouse v242 refines the existing compact Warehouse UI. It does not change stock balances, movements, units, packaging, categories, purchase documents, database schemas, API contracts, or venue isolation.

## Currency architecture audit

- The current venue profile is the source of truth for the accounting currency (`profile.currency`). Venue creation already requires this value.
- Stock balances store `inventoryValue`, `averageUnitCost`, `currency`, and `costNeedsReview`.
- Purchase posting detects currency conflicts and preserves the previous cost/currency while marking the balance for review.
- There is no existing exchange-rate or reporting-currency conversion engine in the current application.
- Therefore the Warehouse KPI totals only positive `inventoryValue` values whose currency equals the current venue currency and whose cost does not require review.
- Zero-value rows in another currency do not affect the total.
- If a positive value is missing currency, uses another currency, or requires cost review, the KPI shows `Не рассчитана полностью` and the unresolved position count. It never adds unlike currencies directly.

## UI refinement

- Preserved the v240/v241 compact hierarchy shared with Nomenclature.
- Preserved fully collapsed initial state and venue-keyed disclosure reset.
- Reduced top-area spacing and action height without changing routes or actions.
- Kept all four actions and all four tabs.
- Kept `Структура`, compact `Номенклатура` link, search, and separate `Требуют распределения` status row.
- Reduced the visual size of scroll-to-top while retaining a 44px effective hit area.
- Added an explicit compact treatment for incomplete inventory-value KPI text.

## Feature parity

- KPI: inventory value, positions, negative balances, last inventory.
- Actions: inventory, scan sheet, sales import, purchase.
- Tabs: stock, movements, inventories, write-offs.
- Search and structure grouping.
- Separate allocation-review workflow.
- Compact section/category/subcategory accordion.
- Compact product rows and product sheet.
- Dynamic units, packaging, status, cost, and last receipt.
- Venue switch and bottom navigation.
- Scroll-to-top.

## Verification record

- Currency unit tests: complete RUB total, mismatched currency fallback, cost-review fallback, missing base-currency fallback.
- Browser: RUB venue → MDL venue → RUB venue; KPI, counts, and collapsed disclosure state updated on every switch.
- Browser: reload preserved the same verified KPI.
- Browser: section → category → subcategory required separate taps; products were absent until the subcategory tap.
- Browser: product rows measured 76px mobile and 78px desktop; product sheet retained quantity, unit, packaging, status, cost, and last receipt.
- Browser: 375px, 390px, 430px and desktop showed no horizontal overflow.
- Browser: long product name used normal word wrapping (`word-break: normal`, no automatic hyphenation).
- Browser: search, structure control, Nomenclature link, allocation link, inventory flow, sales import route, purchase flow, tabs, and bottom navigation remained available.
- Browser: allocation row hidden at zero and shown with a dynamic count when non-zero.

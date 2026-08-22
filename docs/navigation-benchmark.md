# Navigation benchmark (August 2026)

The benchmark was intentionally narrow: navigation patterns only, not visual design.

| Product/pattern | Why it helps | BarDoctor decision |
|---|---|---|
| Toast: hierarchical menu manager with a persistent location selector and detail editing beside the list | Keeps entity hierarchy and venue scope visible while editing | Apply the principle: venue-bound origin and preserved list context; do not copy the UI |
| Square: explicit multi-location inventory context and stock-history drill-down | Prevents acting on the wrong location and makes detail history traceable | Apply: validate venue on return and invalidate cross-venue origins |
| Lightspeed Restaurant: flatter Back Office menu and explicit business-location navigation | Reduces deep global-menu nesting while keeping location orientation | Apply: stable five-item primary navigation plus More; no customizable navigation now |
| MarketMan: operational inventory/procurement work stays grouped by workflow | Users return to the operational parent rather than an arbitrary product root | Apply: canonical parents for Warehouse, Inventory, Suppliers and purchasing documents |
| Clover: inventory administration is location-aware and treats item editing as contextual work | Supports predictable list → detail → list behavior | Apply: query-owned detail/sheet state with Close and browser Back; preserve filters/scroll |

Sources: Toast Platform Guide, Square Support, Lightspeed K-Series Support, MarketMan product/help center, and Clover developer documentation. Competitor-specific visuals, customizable bottom navigation, and deeper menu expansion were not adopted because they would add complexity without improving navigation reliability.

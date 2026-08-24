# Canonical nomenclature and supplier items — v260

## BarDoctor contract

One real product inside one venue is one canonical nomenclature item. Supplier
names, invoice lines, supplier SKUs, barcodes, prices and package variants are
source representations linked to that canonical item. They cannot become
independent stock or recipe identities without evidence that the product is
genuinely different.

The venue is the hard tenant boundary. Matching, aliases, duplicate audit and
reconciliation never cross venues.

## Current architecture and root cause

BarDoctor persists the domain aggregate in the venue-owned `bd_assortment_v1`
store. The relevant path is:

`purchase document line → supplierProductMapping → nomenclature canonical item → stock balance/movements → recipes/reports`.

Before v260, a confirmed purchase line could generate its own stock key from
the raw invoice name. The tech-card client also appended every confirmed
purchase line to the same flat array as nomenclature and stock rows. Therefore
`Сыр Сулугуни` and `Сыр Сулугуни · Рынок` could appear as two selectable rows
even when one was only a supplier representation. Repeated imports could also
produce a second canonical key before the later generic duplicate consolidator
ran.

## Mature-system benchmark

| Pattern | Why it is useful | BarDoctor decision |
| --- | --- | --- |
| Toast/xtraCHEF: Products group multiple invoice items; products are the basis for recipes and inventory | A new vendor item or item code does not fragment recipe cost and inventory identity | Apply: canonical product with many supplier/source mappings |
| Toast/xtraCHEF: new invoice items enter review; prior mappings are remembered; duplicate products can be merged | Automation learns stable mappings but ambiguous items remain reviewable | Apply: stable supplier mapping, high-confidence reuse, review status for ambiguity |
| Square: one item variation can contain repeated vendor information, vendor code and vendor-specific cost | Vendor identity and cost are attributes of a catalog item, not new catalog items | Apply: supplier SKU, last price, package and supplier remain on mapping |
| Square: actual receiving cost belongs to the inventory adjustment/receipt | Historical document cost remains traceable while defaults can change | Apply: purchase line and movement retain actual document context |
| Lightspeed: stock item is configured once for stock count, purchasing and recipes; bulk packaging belongs to inventory settings | Buying by box/bottle does not require another ingredient identity | Apply: package options inside canonical item |
| Lightspeed: imported purchase-order products require match confirmation when no reliable match exists | Avoids silent false-positive catalog creation | Apply: exact/stable/high-confidence reuse and actionable review diagnostics |

Sources reviewed on 2026-08-24:

- Toast, “Get Started With Products” and “Levels of Reporting”
- Toast, “Map Invoice Items”
- Square Catalog API, “Manage Vendor Information on Item Variations”
- Square Support, purchase orders and vendor management
- Lightspeed Restaurant, inventory items, suppliers and purchase orders

## Identity rules

1. Stable mapping by venue + supplier + SKU/barcode/source name wins.
2. An explicit canonical product key wins if it belongs to the venue.
3. High-confidence normalized entity match may reuse canonical identity.
4. Percentage, named volume/weight, brand/variant evidence and base-unit
   conflicts prevent automatic merge.
5. Ambiguous mappings are marked for review; they are not silently pointed to
   an arbitrary existing product.
6. Package options are collected on the canonical item.
7. Tech-card matching emits canonical candidates only. Supplier names and raw
   invoice names are scoring evidence and secondary UI context.

## Historical safety

Normal production writes only create/reuse supplier mappings and publish an
audit report. They do not mass-merge existing canonical records.

The explicit preview reconciliation:

- keeps one primary canonical item;
- combines current stock quantity and valuation exactly once;
- repoints active tech-card links and stock-movement read identities;
- records the movement's original product key;
- keeps purchase documents and inventory snapshots unchanged;
- records aliases and supersession metadata;
- rejects currency, unit and cross-venue conflicts;
- verifies quantity and valuation invariants;
- is idempotent.

Any production mass reconciliation requires a separate approval after review of
the candidate list, before/after stock and valuation, rollback aliases and risk.


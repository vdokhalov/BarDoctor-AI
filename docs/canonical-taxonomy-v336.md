# BarDoctor canonical taxonomy v336–v339

## Audit result

The existing source of truth is `bd_assortment_v1`. Its `nomenclatureStructure` already stores sections, categories, subcategories and storage locations, while current nomenclature, balances, menu items, recipes and supplier mappings share canonical product keys.

The audit found three consistency gaps:

- built-in taxonomy nodes were merged back on every hierarchy repair, so a user could not permanently remove or rename the preset;
- the active Nomenclature page triggered automatic classification on open;
- Menu and purchase-line UX exposed separate hardcoded group/category lists even though inventory and tech cards already depended on canonical nomenclature.

Purchase `expenseCategory` remains a financial expense classification. It is deliberately not used as product taxonomy. Storage `locations` remain a separate physical hierarchy. `itemType` remains a separate entity-kind property.

## Architecture decision

No second table or parallel taxonomy was added. The additive v336 contract normalizes `bd_assortment_v1.nomenclatureStructure` as:

```text
sections[] -> categories[] -> subcategories[]
locations[] (separate storage hierarchy)
```

Nodes use stable IDs, editable names, order and active/archive state. Presets are applied only when a venue has no existing structure. Existing structures are never repopulated with deleted preset nodes.

Current records keep stable taxonomy IDs. A rename therefore appears everywhere that resolves the current taxonomy, without rewriting historical purchase, invoice, inventory, movement, write-off or sales documents.

## Mutation safety

- Rename, move, reorder, archive and restore are audited per data account.
- Non-empty delete returns `TAXONOMY_NOT_EMPTY` and requires an explicit same-level transfer or unassignment.
- Nodes with children cannot be deleted until their children are handled.
- Moves update current classification paths in nomenclature, balances and menu items.
- Storage location fields are not changed by taxonomy mutations.
- Bulk classification updates current canonical records only and leaves historical documents untouched.
- `updated_at` is used as an optimistic freshness token for taxonomy management and bulk operations.

## Shared picker and quick create

Tech cards, goods receipts/manual purchases and write-offs use the same canonical search and quick-create component. It supports exact, transliterated, fuzzy, supplier-alias, archived and purchase-history evidence. Quick create can create taxonomy nodes inline, accepts a missing price, and restores an archived match before using it.

Purchase-history price prefill is resolved into the venue accounting currency only when the document already contains authoritative same-currency or locked historical FX data. Unknown FX is not invented.

## Compatibility and migration

This change needs no SQL migration and does not mutate production data during deployment. The JSON contract is additive and existing IDs/strings remain readable.

If a later production cleanup is desired, it must be a separate preview-and-approve operation:

1. Export counts per legacy section/category/subcategory and unresolved value.
2. Propose an explicit old-ID/string → canonical-ID mapping per venue.
3. Report affected current records and historical documents separately.
4. Apply only to approved current canonical records; never rewrite historical documents.
5. Store the pre-change `bd_assortment_v1` payload and `updated_at` for rollback.

No such production reclassification is part of v336–v339.

## Acceptance coverage

- Tech-card missing ingredient → create → automatic row selection without closing the card.
- Inline section/category/subcategory creation during quick create.
- Similar/archived/supplier-alias duplicate warning with use-existing or explicit create-anyway.
- Goods receipt creates one canonical item and maps the current line.
- Rename resolves through stable IDs in Nomenclature, Menu, purchase and warehouse UI.
- Non-empty delete is blocked until transfer/unassignment.
- API reads and writes are scoped by the authenticated venue data account.
- Mobile quick create is a safe-area-aware bottom/fullscreen sheet; desktop uses a centered sheet.

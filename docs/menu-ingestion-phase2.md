# Phase 2 — Menu entry and unified ingestion, 2026-09-30

## Code audit (before implementation)

Baseline `8aa9f0c`, branch `fix/product-inventory-phase1`; clean checkout. Phase 1A remains unchanged.

| Entry | Existing implementation | Persistence / gap |
| --- | --- | --- |
| Manual | `bdCatMenuEditor` → `Ae` in `bdAssortmentCommandPageV170`; shared mobile editor v439 | Constructs menu/recipe lifecycle/price changes and calls generic assortment PUT; local optimistic save path differs from imports. |
| Scan | camera/gallery → catalog file staging → `recognise-batch`/poll/`merge-batches` in `/api/catalog/import` | R2 holds source documents/jobs; `normalizeMenuImport` returns a client draft, without canonical writes. |
| Import | file/PDF/table or URL → `/api/catalog/import` → `bdAssortmentImportReviewV170` → `Te` | Client matches names using a Map, merges item values, builds recipe drafts and replaces assortment through generic PUT. Diff is advisory/client-only; no server-owned validated revision or operation receipt. |

`/catalog` renders the assortment command page; `/assortment` redirects to `/catalog`. Legacy `bdCatalogPage` and `bdCatImportReview` remain in the bundle as historical code; route aliases were replaced by v170. Existing source chooser already supports camera/gallery/file/URL; manual was a separate add action.

Canonical menu, recipes, nomenclature, balances, taxonomy, price history and source references are in **one** existing `bd_assortment_v1` JSON store in `domain_data`. Reuse `menu-sale-size`, `consumption-mode`, canonical taxonomy projection, venue currency, auth/RBAC and `store-cas`. POS resolves menu IDs and consumption using this store; Warehouse writes balances with separate lifecycle APIs. Generic PUT also serves recipes, taxonomy and other catalog maintenance; do not remove that API or force independent operations through menu ingestion.

## Implementation decision

No schema migration is needed. Persist only ingestion commands/drafts and confirmation receipts under a private `domain_data` key, inaccessible through generic store replacement. This is staging metadata, never a second canonical menu. All sources use the same server create/update → validate (post-row diff) → confirm/cancel endpoint. Confirmation writes only menu items, explicitly reviewed recipe lifecycle transitions, price history and source references, with an atomic CAS batch including the command receipt and audit. Preserve other assortment arrays and all historical facts.

Match IDs first; names suggest a target but require explicit acceptance of changes. Ambiguous names/IDs, invalid classification/units, uncertain OCR values and concurrent edits block confirmation. Missing imported positions never delete existing items. Recipe suggestions from scan/import remain outside canonical recipes; recipe authoring stays in the existing editor. New recipe-mode menu positions receive one empty manual recipe draft through the established lifecycle semantics, requiring separate recipe review before POS consumption.

Production uses Sites (`.openai/hosting.json`). GitHub Actions on this branch verifies builds and regression; it does not deploy. Deployment is gated by the user's final approval after local and GitHub checks pass.

## Implemented contract

- `POST /api/menu/ingestion`: authenticated `inventory.manage`, selected venue required; `create`, `get`, `update`, `validate`, `confirm`, `cancel`.
- Version 1 drafts contain source, venue, stable operation ID, revision, rows and status. Each row carries the candidate, authoritative baseline, target ID, explicit apply/skip/pending decision and review acknowledgement. Recognition response IDs never replace canonical IDs. File/URL import may match canonical IDs; otherwise exact normalized names suggest an existing target.
- One validator checks required fields, nonnegative numeric prices, venue currency, active taxonomy hierarchy, sale units, consumption references, duplicate IDs/names and concurrent changes. Shared sale-size and consumption validators remain authoritative. Ambiguous matches and stale existing items must be excluded or reopened from current data.
- Import/scan require per-row decisions and review. Diff shows additions, changes, unchanged rows, conflicts, invalid rows, excluded rows and existing positions absent from the source. No removal or blind overwrite operation exists.
- Invalid recognition names/prices survive the existing normalizer and batch merge in transient `reviewInput`, then become ordinary draft fields. A missing or negative source price cannot silently become a valid zero-price menu item. This metadata never enters canonical menu records.
- Validation binds draft revision, rows, currency and the complete canonical snapshot with a SHA-256 hash. Subsequent edits invalidate confirmation; concurrent stock/recipe/catalog changes require validation again. Confirmation atomically stores canonical changes, receipt and audit using existing CAS infrastructure. A repeat returns current canonical data and cannot restore earlier values.
- Manual editing stages its existing editor payload and original baseline. The same review opens for all three sources. New recipe-mode items receive one empty draft through the existing recipe lifecycle. Imported AI ingredients never replace recipes. Existing recipe IDs/ingredients survive explicit mode switches and restoration.
- No schema files, migrations, POS, Warehouse, Operational Day, Sales or Finance implementation changed. Generic catalog maintenance still supports independent recipe/taxonomy operations. No production database command is part of preparation.

## Verification

Local evidence is kept under ignored `outputs/` and temporary QA logs:

- Real authenticated handlers and isolated transactional SQLite: all three source lifecycles, import diff, invalid values after recognition/batch merge, duplicate/stale conflicts, cancellation, retries, revision/venue/auth isolation, private staging rejection by generic stores, transaction failure, concurrent confirmations, recipe restoration and POS/Warehouse compatibility.
- Phase 2 browser smoke at 390×844, 412×915 and 1280×800: Manual, Scan and file Import, validation failure/correction, confirm, lost-response retry, cancellation, unchanged recipes/nomenclature/balances and reachable actions in a reduced mobile viewport.
- Existing Menu consumption and general recipe browser matrices at desktop, 390 and 412 px; recipe save/reopen, selection among multiple versions, inactive restoration, venue switching, taxonomy retry, unsaved-change guards and server readback.
- Existing POS browser at mobile, desktop and tablet; existing opening stock/CSV Warehouse browser at mobile and desktop.
- Full `npm test` includes architecture/UI audits, typecheck, verified build, artifact tests and unit regression. Lint has two pre-existing warnings and no errors. GitHub workflow adds the Phase 2 browser matrix without a deployment step.

OCR extraction is fixed at its external-provider boundary in browser QA; normalization, source adapters and ingestion persistence are exercised. Mobile runs use browser device emulation and reduced viewports, not physical-device keyboard testing. Production OCR and authenticated smoke remain checks after approved deployment.

Deployment gate: push the reviewed commit, verify GitHub CI for that commit, build/package from the same commit, push configured Sites source, save the version without deploying, then request the user's single final publication confirmation.

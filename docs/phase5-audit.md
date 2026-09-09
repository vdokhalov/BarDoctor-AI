# Phase 5 audit and implementation contract

Baseline: production Sites v425, commit 323a9272771e0400e99727d2ce97fd4fc5950fbb.
Saved rollback version: appgprj_6a5734bb1abc81919ff978ed0020c64b~appgver_6edc311524388191adccf0515f259099.
Baseline CI: https://github.com/vdokhalov/BarDoctor-AI/actions/runs/34332189794.
No production mutation or deployment is authorized by this phase. Preserve saved v425; no schema/history cleanup. Historical runtime incident remains unresolved/not currently reproducible.

## Code/domain audit

| Area | Existing reusable implementation | Remaining work / risk |
| --- | --- | --- |
| Clean start | CostBasisResolver returns UNKNOWN/null without receipt; cost-knowledge distinguishes explicit zero; UI money helper accepts null | salesBatchKpis currently coerces unknown batch totals to zero. inventory/scan requires existing balances and tells a new user to create a purchase. Empty-account journey needs explicit onboarding rather than fake receipts. |
| Opening stock | Inventory counts support draft/review/finalize, normalized quantities, unknown valuation, closed-month/conflict guards | Counts are adjustments of existing scoped stock, not an independent opening document. No explicit opening source in StockMovement type. Need manual/bulk opening documents and provenance, isolated from receipt costing. |
| Bulk nomenclature | XLSX already installed; inventory/scan and catalog/import parse sheets; canonical taxonomy/selector, inventory/products creation, optional package units exist | Existing inventory scan sends even spreadsheet text through AI and requires stock; cannot be reused as deterministic onboarding. Need bounded deterministic file parser, row preview/mapping, duplicates, explicit row selection, all-or-nothing commit of selected valid rows. |
| Sales consumption | sales-consumption.ts: manual adapter, venue-scoped batches and movements, active consumption modes, persisted snapshots, idempotent post/reverse, immutable-history guards | Existing batch draft is refreshed against current recipe at posting, not arbitrary historical sale time. Mixed ready/blocked batches can partially post. New live event must be atomic and snapshot at acceptance; unprovable backdated recipe basis must require review. |
| Revenue / POS foundation | sales-batches API has menu, quantity, shift selectors, draft/post/reverse with permissions and CAS; public/sales-import.js is working sales-entry surface | Sales batches do not post revenue. sales-revenue.ts aggregates legacy daily sales documents, matches dates without explicit venue input, and can replace existing daily revenue. Do not call it unchanged from a new event flow. Need stable event ID, venue/shift, sale-price/currency snapshot, revenue projection and cancellation without double-counting legacy shift totals. |
| Costing | cost-basis.ts reads receipt movements only, canonical conversion, latest applicable confirmed receipt, UNKNOWN/null fallback | Opening valuation must be a separate provenance, not type receipt or manual last-purchase fallback. Operational cost remains UNKNOWN until actual receipt. Audit aggregates/readers for null coercion. |
| Phase 4 consistency | stock-units.ts, purchase-conversion.ts, versioned conversion snapshots, venue preflight and protected history | Reuse unit factors rather than formulas. Opening quantity must not require a fake price to call purchase normalization. Import cannot create a second identity per package. |
| Persistence | domain_data, readStoreSnapshots/runStoreCasBatch/withStoreCasRetries, audit_log, server authenticateRequest | Reuse atomic CAS for document+assortment+movement/event changes. Validate authoritative venue and references before writing. Protect new immutable stores from generic PUT. |

Inspected runtime paths: cost-basis, stock-units, inventory/counts/scan, nomenclature quick-create/taxonomy, catalog/import, sales-consumption, sales-batches, sales-revenue, store-cas and sales-import UI. Existing code is reusable, not assumed to satisfy new acceptance merely because Phase 4 CI is green.

## Exact bounded scope / implementation order

1. Preserve UNKNOWN end-to-end in sales costing aggregates; regression for empty, unknown, mixed-known/unknown and explicit zero; no history mutation.
2. Shared opening-stock domain and deterministic CSV/XLSX onboarding preview: one canonical item ID, taxonomy references, quantity normalization, optional independently sourced opening valuation. Confirm selected rows atomically, idempotency fingerprint, explicit skip list and preview/revalidation against current store. Manual entry uses same command. Never overwrite existing stock as an opening; existing movements/balance require review or normal count flow.
3. Server/API and minimal existing-style onboarding UI, using existing D1 CAS/audit/permissions. No new auth, global design, OCR or supplier matching. Bound files/rows for Worker memory; reject formulas/unsupported fields; do not evaluate spreadsheet content.
4. Live sales event foundation over existing consumption modes/snapshots: source+venue+event ID, identical retry no-op, changed payload same ID conflict, snapshot price/recipe on acceptance. Atomic stock+event+revenue projection. Full event reversal restores captured quantity and revenue once; partial refunds/payment processing/fiscalization excluded. Validate shift venue/open status. Manual write-offs remain separate.
5. Minimal optional sales-entry UI within existing surface; menu selection, qty, explicit preview/post, shift, full reversal. Legacy daily revenue is not silently added to or overwritten; conflict requires review.
6. Full requested regression, artifact/build, typecheck/lint, mobile390x844/desktop1280x720, venue and history, GitHub CI. No deployment before user's final confirmation.

## Acceptance criteria

- Fresh account/venue: empty menus/stock/history load without seed purchases; missing cost is UNKNOWN, not 0; explicit NONE/known-zero remains distinct.
- Opening 12 pcs remains 12; 6 packages x 0.7 l -> 4.2 l; grams normalize to kg. Invalid dimensions/unknown package content reject before any writes.
- Known opening valuation saved with its source; absent cost null/UNKNOWN; last receipt and purchase histories remain unchanged; operational CostBasisResolver remains UNKNOWN without receipt.
- Initial stock confirm -> persist -> reload retains canonical quantity, captured conversion and independent valuation. Identical confirm retry creates no duplicate movement; conflicting retry returns controlled conflict.
- Existing stock/history is not replaced by opening command. Foreign venue/reference rejected, no foreign row changes.
- CSV/XLSX preview does not persist. Duplicate rows/existing IDs, missing taxonomy/unit and invalid numeric/formula values produce row errors. User may explicitly skip; selected set commits atomically or not at all, including concurrent-write test.
- Explicit nomenclature ID survives rename and is shared by purchases/warehouse/recipes/menu. No packaging stock identity.
- Live sales DIRECT_ITEM/FIXED_QUANTITY/RECIPE/NONE use active mode only; recipe 8 g x10 consumes .08 kg; repeated event consumes once; same event ID/different payload rejected.
- Missing/ambiguous mapping/recipe produces NEEDS_REVIEW without partial stock/revenue writes. Event snapshot cannot be altered by later recipe/purchase/template changes.
- Revenue uses captured sale price/currency, not current menu price. Full reversal once restores captured stock and revenue; repeated reversal no-op; unrelated venue/day/shift unchanged. Legacy daily totals conflict is explicit, never double counted.
- Closed/foreign shift, permissions, parallel retry/CAS, cross-venue same IDs, generic-store mutation protection all tested.
- Persisted browser flows for opening/import/preview/skip/confirm/reload and sales/reverse on both viewports; no overflow/modal locks, safe back/close, venue switching.
- Phase 1–4 regression and bootstrap/cancel recovery tests remain enabled; CI assertions unchanged.

## Residual risks / non-goals

Historical recipe effective dating is not available for arbitrary backdated events: do not infer it. Legacy mixed-venue and ambiguous conversion require review, not cleanup. Existing stock-ledger truncation limits and full POS fiscal/payments architecture remain outside scope; do not claim delivery idempotency based only on retained movements. Retain event/document idempotency records independently. UI currency literals and date-only revenue reconciliation need scoped integration, not a broad financial redesign. No production census or production writes during implementation.

Status: audit/scoping completed; Phase 5 implementation and validation are NOT COMPLETE. Each subsequent slice must record its own tests/CI, not inherit baseline PASS.

## Slice 1 — UNKNOWN sales KPI (2026-09-09)

Implemented: aggregate cost remains null for empty or partially unvalued sales, while explicit zero remains known. Read-only calculation; no snapshot or production mutation.

Evidence: new tests reproduced 2 failures before the fix; focused costing/sales/Phase 4 regression 51/51 PASS after the fix. Full TypeScript unit suite 898/898 PASS, zero skipped/cancelled. Direct TypeScript compiler PASS. Full ESLint PASS with two existing warnings in unrelated files (koln-assortment route and v399 patch). git diff --check PASS.

Local wrapper limitation: npm typecheck/lint/build require Bash, unavailable on this Windows host. Equivalent direct compiler/linter checks ran, but verified build and browser QA are not claimed locally; unchanged GitHub workflow remains their release gate. No Miniflare retry loop. Full CI for this slice is pending; Phase 5 remains incomplete.

Additional import audit: app/api/import/preview already offers authenticated CSV/XLSX/XLS read-only parsing (6 MB, 2000 returned rows); integration-hub/import has UniversalFileAdapter plus field mappings. Reuse those contracts where safe, but current preview parses before truncation and does not reject formula cells, and the integration writer is not the new selected-row atomic opening command. Neither path alone proves Phase 5 onboarding acceptance.

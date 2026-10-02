# Phase 3A.7 — Acquisition & Stock Basis Continuity

## Baseline revalidation (before application edits)

Exact production baseline Sites477: `6dfc6f27fd166d2d55d22b614ae41fd4fe0abbe9`.
Sites version readback and GitHub `fix/product-inventory-phase1` branch both identify this SHA. Separate detached checkout `/workspace/BarDoctor-phase3a7` created from it; prior local reports untouched. Historical GAP audit is unchanged.

Independent reproduction: `outputs/phase3a7-baseline.mts` / `outputs/phase3a7-baseline.json` (local synthetic data only). It executes the actual purchase-confirm and Evidence Resolver HTTP handlers with real auth/memberships and transactional isolated SQLite/D1 adapter, and the production pure valuation/context helpers. No production endpoint or business writer used.

| GAP | Revalidated status | Direct evidence |
| --- | --- | --- |
| G08 P1 | CONFIRMED | Existing actual purchase document reference returns `UNSUPPORTED_REFERENCE_KIND`. Current valuation20 drops selected receipt/document/line identity. With missing receipt it returns unvalued line `value:0`, though cost is UNKNOWN. Current balance has no public quantity/valuation evidence node. |
| G15 P2 | CONFIRMED | Actual purchase-confirm accepts unrelated acquisition at 20,000 existing movements; resulting store remains20,000 but old rare receipt disappears. Rare balance remains1; its last purchase price20 becomes UNKNOWN. |
| G17 P2 | CONFIRMED | Existing server context combines two different canonical product keys named “Same name”:1box +2bottles becomes quantity3, spend160, lastPrice30 from older document despite newest unit price100. |

Pinned baseline source: `app/api/purchases/confirm/route.ts:534`; `lib/bardoctor/inventory.ts:3623,3724`; `lib/bardoctor/sales-consumption.ts:1365,1481`; `lib/bardoctor/write-offs.ts:478,550`; `app/api/inventory/counts/route.ts:664`; `lib/bardoctor/integrations/domain-writer.ts:524,720`; `lib/bardoctor/valuation.ts:105`; `lib/bardoctor/venue-ai-context.ts:731`; `lib/bardoctor/evidence-resolver.ts:19`; `lib/bardoctor/cost-evidence.ts:254`. All refer to exact baseline above, before new edits.

LAST PURCHASE PRICE already works: `lib/bardoctor/cost-basis.ts` selects latest active applicable receipt by business/effective date, createdAt and document/line tie-break, exact warehouse before existing venue fallback. Source-unit price and canonical unit cost are distinct. A latest UNKNOWN is not replaced by an older known receipt. Existing Phase3A3 sale snapshots preserve historical cost. These mechanisms are reused.

## Retention implementation decision

Keep the existing canonical movement store and existing20,000-row bound. Preserve required active receipts and opening/count anchors plus post-anchor quantity contributors for tracked balances, including scoped warehouse balances. Other rows fill remaining bounded capacity. Never synthesize an anchor from current balance or invent a lost receipt.

If required facts themselves exceed capacity, reject the command explicitly **before canonical write/audit success**. This is a storage-capacity guard, not an increased cap or permission to discard evidence. Existing accepted facts remain intact. Continued unlimited history would require a separately approved durable storage design; this phase does not introduce one. Capacity refusal must be tested through real writer/CAS paths and reported as an operational limit.

Migration/backfill/new source of truth: NO planned. No changes to cost method, historical sales, Health/AI architecture, unrelated GAPs or production business data. Production deployment requires separate user confirmation after GREEN release preparation.

## G08 — existing fact chain and current quantity/valuation

`lib/bardoctor/stock-evidence.ts` extends the existing Evidence Resolver registry, with closed parameterized selectors for the authorized data account. Current `COST_BASIS` reaches its actual selected `WAREHOUSE_MOVEMENT`, then the real `PURCHASE_DOCUMENT` + `partId` line. Purchase projections distinguish source quantity/unit/unit price, captured package content/conversion, canonical quantity/unit/factor, source-currency normalized cost and accounting normalized cost. Supplier, warehouse, current nomenclature and source-file metadata are independently resolved. No raw purchase/file/foreign payload is exported.

The adapter checks the live parent/line scope, captured conversion and receipt/document quantity, identity and accounting arithmetic. Inconsistent or missing acquisition evidence is PARTIAL, even when a real existing receipt has a numeric captured price. Cost-basis content binding includes that live acquisition input; changed source data returns READ_MODEL_CHANGED rather than an old-looking current fact. This adds stock evidence binding, not G18 integration result remediation.

`lib/bardoctor/stock-quantity-evidence.ts` **validates/explains the existing authoritative balance**, never replaces it with another stored quantity. It starts only from a real confirmed opening document or completed count line, omits the anchor's own delta and all earlier absorbed history, then checks the eligible contributing movement quantities against current stock. Sale consumption, receipt, write-off, return, reversal and adjustments retain their existing signed quantities. A missing anchor, incompatible unit, duplicate identity, unknown timestamp/boundary or mismatch stays UNKNOWN/PARTIAL.

New count/opening writes record the actual anchor timestamp and IDs already present at that timestamp. `quantityAnchorAt` is a copy of that real document boundary in the existing balance, not a fabricated count or a new quantity fact. `checkedAt` is **not** used as an inventory anchor because purchases refresh it too. Existing legacy boundaries are not backfilled. Same-clock later receipts count exactly once; a completed count with no adjustment still provides a valid anchor.

Quantity relations are paginated through the existing bounded resolver. If the existing maximum pagination offset cannot expose the full contributing history, the response flags QUANTITY_HISTORY_BOUNDED/PARTIAL and does not advertise complete evidence.

`lib/bardoctor/valuation.ts` keeps quantity × latest confirmed applicable receipt cost. Valuation lines now retain selected basis identities. Unvalued line values, invalid quantities and incomplete totals are `null`; `knownSubtotal` is explicitly separate. Actual zero cost and zero stock remain known zero. Warehouse valuation is partitioned by its existing scopes; an aggregate links the separate warehouse valuations rather than pretending a single warehouse price applies to all stock. Foreign nested warehouses cannot leak through the valuation HTTP summary.

The existing warehouse UI reuses this same pure valuation helper via `scripts/patch-stock-basis-phase3a7.mjs`, with existing cached canonical inputs. It keeps the current layout, issue filter, partial-value label and workflows. Unknown value displays “Неизвестно”; calculated partial value stays labeled as the calculated part. No new screen or editor.

Source-file GET revalidates workspace/venue/data account. New pending uploads carry these scope metadata; legacy files need an actual scoped purchase parent. An owned parent cannot grant access to a foreign-tagged child file. These are optional metadata in the existing R2 object; no provider operation or schema change. Read paths preserve purchase, movements, balances, supplier, file metadata, audit and timestamps.

## G15 — bounded retention and writer safety

`lib/bardoctor/stock-retention.ts` replaces the old silent slices in purchase confirm/repost/revision, sale/reversal, write-off/reversal, count, opening and integration stock writers. It preserves active receipts, real active opening/count anchors and post-anchor quantity contributors, resolving existing aliases and retaining original parents of reversals. Unknown ownership/boundaries are preserved conservatively. Optional obsolete/unrelated rows fill the remaining bounded window.

Both bounds apply: **20,000 movements and 1,900,000 serialized UTF-8 bytes**. Native D1 reproduction demonstrated that a large 20k-row fixture can fail with SQLITE_TOOBIG before an application command, so count alone was insufficient. Compact 20k native fixtures exercise the real writer/cap boundary; a separate byte-bound fixture verifies explicit refusal. The byte budget is a conservative application bound, not a claim that all deployment/database limits have been measured or fixed.

If required facts cannot fit, `STOCK_EVIDENCE_CAPACITY_REACHED` returns409 before CAS commit or success audit. The command is not accepted and prior accepted bytes remain unchanged. Existing CAS conflict/retry/idempotency mechanisms remain in place. This intentionally trades silent loss for an explicit capacity refusal; it does **not** promise unlimited history in one JSON value. A future requirement to accept operations beyond required capacity would need separately approved storage design, outside this phase. No schema migration is needed for this bounded fail-closed contract.

PRIMARY D1 FAILURE ROOT CAUSE remains **UNKNOWN — NOT REPRODUCED**. The isolated oversized fixture failure is separate evidence and is not attributed to that historical failure.

## G17 — procurement summary

`lib/bardoctor/procurement-basis.ts` replaces the display-name map in the existing server context's procurement top-products summary. Groups use canonical product identity + compatible stock unit + accounting currency + warehouse. Different IDs sharing a name remain separate. Captured package conversions normalize boxes/bottles into a comparable physical unit. Without a captured package conversion, legacy unknown packages stay unknown; only explicit compatible physical units can be converted mathematically, with legacy evidence marked PARTIAL.

`lastPrice` now explicitly means normalized base-unit **LAST PURCHASE PRICE**, selected by the existing receipt resolver across applicable canonical history, not array iteration. Source-unit purchase price/unit/currency are separate fields. Effective/business date precedes accepted timestamp, document/line IDs and finally movement ID for a deterministic exact tie. Latest UNKNOWN does not fall back to an older known receipt. Existing exact warehouse/venue fallback and FX/currency rules are preserved. Source purchases are bounded, deterministically ordered and flagged if incomplete.

The only context change is this existing procurement summary read. Business Health formulas, score weights/caps, AI prompts/body overrides, recommendations and remaining GAPs are untouched.

## Regression and release gate

Local final application regression: `npm test` **2072/2072 PASS** including targeted **23/23** Phase3A7 tests and the client receipt-helper artifact test. Build/typecheck PASS; lint0 errors with the same2 pre-existing warnings (`koln-assortment`, `patch-warehouse-unit-integrity-v399`). Existing Revenue Trace, Cost/Warehouse, Menu Origin, Canonical Boundary/Writer Safety and Business Day/Finance regressions remain GREEN. No assertion was relaxed to hide a regression: old unvalued-zero/partial-total expectations were replaced with null + explicit known subtotal, and PURCHASE_DOCUMENT is now a supported adapter with missing resources unavailable.

Extra local gates PASS: repeat artifact preparation5/5; compiled Worker/native D1/client release4/4; existing Evidence/Revenue, Cost/Warehouse, Menu Origin and Canonical Boundary browser390/1280; owner/permitted/restricted role regression390/1280; POS390/820/1280; cached/delayed Operational Day month/year boundaries390/1280. Exact final results and release identity are recorded in local `outputs/phase3a7-release.json` after CI/preparation. The repeated artifact test explicitly permits the new reversible scoped read-contract patch and still checks unique markers, preserved behavior and byte stability.

Phase3A7 Chromium acceptance390/820/1280: actual purchase handlers, actual count finalization, old sale at20, later purchase at40; quantity23/current value920/historical captured cost20. Existing Warehouse/Procurement/Suppliers/Menu/Finance navigation has no page errors or horizontal overflow. Phase3A6 recorded payroll and operational result acceptance390/820/1280 passes unchanged (daily300, FOT90, preliminary210). Existing Evidence/Revenue, Cost/Warehouse, Menu Origin and Canonical Boundary browser checks390/1280 are required too.

Local WebKit binary can be downloaded but required system libraries are unavailable and this environment has no install privilege. The existing GitHub Chromium/WebKit infrastructure runs the new same390/820/1280 scenario. READY requires that exact-head job to pass; no local WebKit PASS is claimed. Responsive emulation is not a physical-device claim.

Release branch: `fix/product-inventory-phase1`. Required CI jobs verify/sales-navigation/sales-scroll-layout must all be GREEN for the exact GitHub HEAD. The prepared Sites version must name that SHA and contain build output from an exact clean checkout. Save without deployment. Deployment and a NEW isolated QA production smoke require the owner's explicit confirmation of that prepared version.

Migrations: NO. Backfill: NO. New source of truth/ledger: NO. Historical sale recosting: NO. Production business-data mutations during implementation: NO. Production DB/secrets/resources/provider operations: NO. Historical independent GAP audit is unchanged.

G08/G15/G17 are remediated in prepared source; closure requires exact deployment and production smoke PASS. Production remains v477 until confirmation. Remaining after successful Phase3A7 completion: **7 GAP — G05/G06/G07/G12/G13/G16/G18**. No Phase3A8 is started.

## OWNER EXPLANATION — SIMPLE LANGUAGE

Раньше программа не всегда могла показать, из какой закупки получились цена и остаток: часть старой истории могла исчезнуть, а разные товары с одинаковым названием — попасть в одну сумму.

Теперь последняя закупочная цена берётся из последнего подходящего прихода по дате, с учётом товара, склада, единицы и валюты. Цена коробки или бутылки показана отдельно от цены литра, килограмма или штуки. Новая закупка меняет текущую цену, но уже сохранённая себестоимость старой продажи остаётся прежней.

Остаток объясняется от реальной начальной записи или пересчёта товара, с последующими приходами и списаниями. История до пересчёта повторно не прибавляется. Если части старой истории нет, программа честно сообщает, что доказательств недостаточно; неизвестная стоимость не становится нулём.

Обязательные записи больше не удаляются молча ради места. Если их нельзя безопасно сохранить, новая складская операция отклоняется с понятным сообщением, а прежние данные сохраняются.

Разделы, навигация, редакторы и привычные действия остаются прежними. Меняются согласованность цифр и сообщение об неизвестной стоимости. После отдельного подтверждения публикации остаётся проверка только в новом тестовом заведении; рабочие заведения не используются для тестовых изменений.

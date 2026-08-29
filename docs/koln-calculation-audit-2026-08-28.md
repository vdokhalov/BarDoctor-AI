# BarDoctor — calculation and data-consistency audit: «Кёльн»

Date: 2026-08-28  
Mode: read-only production reconciliation  
Venue: `Кёльн`, `venueId=1`, `dataAccountId=1`  
Authoritative export checksum: `5093fecafdf522f4134a79a821d74c92483566f47883bdb92c4d58685e430bb1`  
Production writes performed: **0**

> Latest authoritative clarification: every historical monetary amount for «Кёльн» was entered in Transnistrian rubles. Legacy `RUB` and `MDL` were labels used before `PMR_RUB` existed. The final relabel conclusion is recorded in the last section of this report and supersedes every earlier requirement for historical FX on these Köln records.

## Executive status

**CALCULATIONS NOT VERIFIED**

Warehouse quantities, receipt lineage, supplier mappings and the July closed-month formula reconcile. The overall account cannot be marked verified because two posted purchase lines are arithmetically inconsistent, one positive MDL stock position has no historical RUB valuation, the current client monthly-report formula can still mix currencies, and the bounded production reader did not provide complete raw Finance, Payroll, Health Score and AI Doctor payloads.

No production data was changed. No purchase, stock movement, expense, payment, debt, write-off, inventory or sales record was created or reposted.

## Coverage

| Domain | Production records checked | Result |
|---|---:|---|
| Purchase documents | 26 | All confirmed; document totals reconcile |
| Purchase lines | 160 | 158 exact/rounding-safe; 2 material discrepancies |
| Embedded payment/debt summaries | 26 | Internally consistent; full raw payment-ledger audit incomplete |
| Stock movements | 171 | 156 active, 15 cancelled/reversed |
| Stock balances | 116 | 116 quantity matches |
| Valued positive balances | 110 | 106 exact, 3 value deltas, 1 unvalued |
| Supplier mappings | 113 | 113 live/alias-resolved |
| Canonical positions | 117 | Identity boundary checked |
| Inventory snapshots | 2 | Totals exact; legacy venue identifier |
| Recipes | 118 | All drafts; none fully costable |
| Menu items | 184 | Recipe-coverage boundary checked |
| Write-offs | 0 | No production write-off documents in the inspected store |
| Sales batches | 1 batch / 1 line | Blocked for missing recipe; no stock consumption |
| Closed months | 1 | July formula and section totals reproduce |

Fifteen formula/invariant families and 935 numeric/identity values were independently evaluated. Of those, 829 matched or produced the expected safe/incomplete classification. The remaining values include the discrepancies below and values that are explicitly unvalued or unavailable rather than silently treated as zero.

## Severity summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 0 | No evidence of an active destructive/double-posting path |
| P1 | 4 | Two bad purchase lines, one unvalued cross-currency stock position, one remaining client mixed-currency formula |
| P2 | 5 | Stale supplier attribution, two legacy snapshot venue IDs, Dashboard semantic mismatch, stale active AI plan |
| P3 | 3 | Small stored valuation/rounding differences |

The previous export reported 47 blocking invariants. Alias-aware independent reconciliation proved 46 of them false positives. After the audit-code correction, the same immutable export reports only the real unvalued stock position as blocking, plus its warning copy.

## Exact production discrepancies

| Severity | Record / entity | Current | Expected | Delta | Root cause / proposed correction |
|---|---|---:|---:|---:|---|
| P1 | purchase `e1707650-e919-4bd0-9447-8286eebe8257`, line `17b0346d-a394-4ff3-ae0b-35f2f0f2397e` — Апельсины | 1.124 × 23 = stored 25.35 | 25.85 | -0.50 RUB | Contradictory stored commercial fields. Manually verify source invoice, then correct the specific line and rebuild valuation through an approved data operation. |
| P1 | purchase `5213dae2-5f69-4cc8-aa87-fe4debe2d12b`, line `eb0fdcc0-5cff-41f5-a6e4-9fb05185fb1e` — Пакетики для чая | 100 × 0.50 = stored 60.00 | 50.00 | +10.00 RUB | Contradictory stored commercial fields. Verify whether quantity, price or total is the authoritative source before correction. |
| P1 | `stock:коньяк белый аист|ml` | 3,000 ml; purchase cost 361 MDL; RUB value absent | Historical MDL→RUB normalized value | unavailable | No historical FX/normalized RUB amount. Supply an approved historical rate or leave explicitly unvalued. Never apply a live rate retroactively. |
| P1 | client monthly report / Home purchase aggregate | RUB and MDL documents may be added as one scalar | RUB-only accounting total plus separately disclosed MDL | currency-dependent | Server Procurement/AI fixed. Client legacy monthly-report bundle still needs the same accounting-currency boundary before deployment. |
| P2 | expense `purchase-payment:b54e2f38-a4df-49b0-8510-12904fbe183e` | supplier «Рынок» / `aaf270dd-75cc-4347-be82-a782bd1e7bec` | current purchase supplier «Розничный магазин» / `806ed11a-ea40-448c-8828-bcbb208bb17a` | attribution only | Payment remains linked by document ID, so debt math is not shown to be wrong; Finance attribution is stale. Correct only after an approved record-level migration. |
| P2 | inventory snapshots `c6564…`, `b6e7e…` | `venueId="primary"` | `venueId=1` | identity | Legacy identifier accepted by current reader. Migrate only with an immutable before/after export. |
| P2 | Home money card | “Purchases and expenses” is accrual-like, while preliminary result uses a different basis | Explicitly labelled bases or one canonical result stack | semantic | UI values can look arithmetically contradictory even when each uses its own formula. |
| P2 | active plan `plan_1783892352555_ju1g` | “Payroll is 104.7% of revenue for 5 shifts” | Current-period evidence or archived historical plan | stale window | Plan was created from an early July sample and remains active. Re-evaluate against a closed/comparable period before presenting as current advice. |
| P3 | `stock:кола|ml` | value 2,263.50 | receipt-ledger value 2,266.20 | -2.70 RUB | Quantity-repair/merge history left a small valuation delta. |
| P3 | `stock:моршинская 1 5 л|ml` | 213.72 | 213.70 | +0.02 RUB | Average-cost rounding. |
| P3 | `stock:мусорные пакеты|ml` | 51.60 | 51.50 | +0.10 RUB | Average-cost rounding. |

## Reconciliation matrix

| Domain | Raw source | Independent expected | BarDoctor value | Result |
|---|---|---|---|---|
| Purchases | 160 stored lines | quantity × unitPrice, cents | stored line/document totals | 2 P1 line mismatches; all 26 document sums exact |
| Supplier debt | 26 embedded summaries | total − linked valid payments | all 26 paid, balance 0 | Embedded values match; raw ledger incomplete, so not fully verified |
| Warehouse quantity | 156 active receipts | sum active alias-resolved base quantities | 116 balances | 116/116 exact |
| Movement lineage | documents + lines + movements | one active valid receipt chain; cancelled excluded | 156 active movements | 156/156 exact; no duplicates/orphans |
| Valuation | receipt cost amounts | weighted average by canonical balance | stored average/value | 106 exact, 3 P3, 1 unvalued P1 |
| Mappings | 113 supplier mappings + aliases | live resolved canonical/balance target | stored targets | 113/113 resolve |
| Inventory snapshots | section values | sum sections | 24,703 and 23,729 | exact totals; legacy venue ID |
| July COGS | opening 24,703; purchases 30,409.21; closing 23,729; write-offs 0 | 31,383.21 | 31,383.21 | exact |
| July final profit | revenue 104,946 − COGS 31,383.21 − other 10,075.50 − payroll 41,348 − taxes 9,000 − utilities 6,500 | 6,639.29 | 6,639.290000000008 | exact to cents; binary-float display residue only |
| July cash result | revenue − purchases − other − payroll − taxes − utilities | 7,613.29 | 7,613.290000000001 | exact to cents |
| Write-offs | empty store | zero documents/movements | zero | exact for available store |
| Sales consumption | one blocked line, no recipe | no movement may be posted | no sale-consumption movement | safe blocked state |
| Recipes | 118 drafts | incomplete until links/costs exist | 0 fully costed | honest incomplete state |
| Dashboard/KPI | live UI + monthly source | formulas differ by basis | Health 83; Aug revenue 82,166; purchases/expenses 43,500; payroll 34,006; result 3,101 | visible values captured; full input reproduction unavailable; semantic P2 |
| Health Score | current UI snapshot | requires full canonical factor payload | 83/100, confidence 68% | canonical handoff tests pass; production score not independently reproduced |
| AI Doctor | action plans/tasks and UI surface | evidence + comparable window | active historical plan exists | stale-plan P2; current conclusions not fully auditable from bounded payload |

## Production control case: «Премиум табак»

Purchase `11d8306f-8403-44ef-b1d4-fdb81dc42aa3`, document №392:

- quantity: `0.15 kg`
- unit price: `3666.67 RUB/kg`
- raw multiplication: `550.0005`
- currency-rounded line total: `550.00 RUB`
- document total: `550.00 RUB`
- supplier mapping resolves to `stock:премиум табак|g`
- payment: `550 RUB`; balance: `0`
- Hybrid Mapping regression: history reuse, no AI fallback in the repeated scenario

The parser regression covers decimal comma/dot, ordinary spaces, NBSP/narrow NBSP, repeated spaces, `3.666,67`, `3,666.67`, quantities below one and prices above 1,000.

## Code fixes prepared

1. Purchase confirm/update routes now reject line arithmetic or document-total contradictions with `PURCHASE_COMMERCIAL_ARITHMETIC_INVALID` before any warehouse/finance write.
2. Data-integrity/export checks resolve inventory aliases and external product keys, ignore cancelled/reversed movements, and do not require stock movements for service purchases.
3. Procurement API and AI context exclude unconverted foreign-currency documents from accounting-currency totals and expose excluded document IDs/totals explicitly.
4. Regression tests cover the production tobacco vector, contradictory line totals, document totals, alias/external-key chains, cancelled movements, service purchases and mixed currencies.

No automatic production-data correction was implemented.

## Currency, rounding, timezone and isolation

- Accounting currency: RUB.
- Purchases in source data: `32,519.25 RUB` and `361 MDL`; these must not be summed without historical FX.
- Financial comparisons were made at currency-cent precision. IEEE-754 residues in the July snapshot disappear when rounded to cents.
- Default venue timezone resolves to `Europe/Chisinau`; timezone/calendar regression tests pass, but the exported five-store snapshot has no boundary-time transactions with which to prove every period edge.
- The authoritative export is scoped to data account 1 and venue 1. All independent stock calculations used only that snapshot.
- Legacy null movement venue IDs and `"primary"` snapshot IDs weaken explicit row-level venue evidence; account-level store isolation prevented another account from entering the recalculation.

## Verification results

| Check | Result |
|---|---|
| Changed-file review / diff check | PASS |
| Typecheck | PASS |
| Build | PASS |
| Lint | PASS with one pre-existing unrelated unused-import warning |
| Full automated suite | PASS — 654/654 |
| Invoice parser/commercial regression | PASS |
| Direct provider OCR QA command | NOT RUN — no real invoice image manifest was available |
| Mobile smoke | PASS — iPhone 13 and Pixel 7 scenarios |
| Desktop smoke | PASS — 1280/1440 desktop scenarios and Procurement flows |
| Read-only production reconciliation | PARTIAL PASS; unresolved P1 data/currency issues remain |

## Required next decisions

1. Verify the two inconsistent purchase lines against source invoices; approve record-specific corrections if warranted.
2. Provide/approve the historical MDL→RUB rate for the White Stork cognac purchase, or accept explicit unvalued status.
3. Apply the accounting-currency boundary to the legacy client monthly report before production deployment.
4. Obtain full untruncated Finance/Payroll/Health/AI source exports for a conclusive account-wide audit.

Until these are complete, production deployment is **not ready** and the audit remains **CALCULATIONS NOT VERIFIED**.

## Continuation pass — 2026-08-28

Baseline: commit `5d1df3fa9c4577d1a6ff9fa9a4e1f1474b6b4d66` and the report above. Production writes remained **0**.

### Status of the four original P1 findings

| P1 | Continuation result | Status |
|---|---|---|
| Legacy client mixed-currency aggregation | Fixed in Home, monthly report, Finance period/chart aggregates and supplier monthly totals. RUB is included directly; foreign currency is included only with a stored accounting amount or `exchangeRateToAccounting`. Unconverted records are excluded and disclosed by domain/currency. Supplier price comparisons and alerts no longer compare different currencies. Server Procurement/AI protection remains intact. | **CODE FIXED** |
| Апельсины line contradiction | Stored line, document, payment and stock movement traced. The original image is referenced by `c6495d8d-7703-437c-a5ee-e77fb60f0977`, but its bytes/OCR trace were not available through the read-only export or live reader. | **SOURCE VERIFICATION REQUIRED** |
| Пакетики для чая line contradiction | Stored line, document, payment and stock movement traced. The original image is referenced by `ad2ac9fe-8e48-415b-a960-05125342737c`, but its bytes/OCR trace were not available through the read-only export or live reader. | **SOURCE VERIFICATION REQUIRED** |
| White Stork RUB valuation | Root cause confirmed: manual MDL document has no `exchangeRateToAccounting`, `accountingLineTotal`, `accountingTotal` or other historical RUB normalization. Quantity is valid; RUB valuation remains explicitly unavailable. | **UNVALUED IN RUB** |

### Source trace: conflicting purchase lines

| Layer | Апельсины | Пакетики для чая |
|---|---|---|
| Purchase | `e1707650-e919-4bd0-9447-8286eebe8257`, 2026-08-17, Рынок, RUB | `5213dae2-5f69-4cc8-aa87-fe4debe2d12b`, 2026-08-01, Шериф, RUB |
| Original | camera `image.jpg`; file `c6495d8d-7703-437c-a5ee-e77fb60f0977`; bytes unavailable | camera `image.jpg`; file `ad2ac9fe-8e48-415b-a960-05125342737c`; bytes unavailable |
| OCR/raw | not present in the authoritative five-store export; live file endpoint requires an authenticated session unavailable to the audit reader | same |
| Stored line | `17b0346d-a394-4ff3-ae0b-35f2f0f2397e`: 1.124 kg × 23; lineTotal 25.35 | `eb0fdcc0-5cff-41f5-a6e4-9fb05185fb1e`: 100 pcs × 0.50; lineTotal 60.00 |
| Arithmetic | rounded multiplication 25.85; stored delta −0.50 RUB | rounded multiplication 50.00; stored delta +10.00 RUB |
| Document | total 768.24 equals the sum of stored line totals; paid 768.24; embedded balance 0 | total 2,893.00 equals the sum of stored line totals; paid 2,893.00; embedded balance 0 |
| Active stock movement | `6d6d842f-ce4b-4a76-a180-4262b7e03e6d`: 1,124 g, cost 25.35 RUB | `72a42110-fd71-47aa-b8bf-bc05a0044f0f`: 100 pcs, cost 60 RUB |
| Authoritative expected fields | **unknown until image verification**; multiplication alone is not treated as source truth | **unknown until image verification**; plausible alternatives cannot be selected without the invoice |

### White Stork / historical FX trace

- Purchase `b54e2f38-a4df-49b0-8510-12904fbe183e`, 2026-08-26, manual, supplier «Розничный магазин», source currency MDL, total and paid amount 361 MDL.
- Line `47d633d5-4b03-442c-833a-c598ac7f57cc`: 3 l, 500 ml package, 120.33 MDL/l, line total 361 MDL.
- Active movement `1b8c1746-35de-4729-a5c5-dac69c0b1d0d`: +3,000 ml and `transactionCostAmount=361`, `transactionCurrency=MDL`.
- Reposted movement `fa7bded3-8aa3-475d-bc82-373477ed1c3c` is cancelled/reversed and is correctly excluded.
- Balance `stock:коньяк белый аист|ml`: 3,000 ml, accounting currency RUB, `averageUnitCost=0`, `inventoryValue=0`, `costNeedsReview=true`, `costReviewReason=missing_fx`.
- No historical exchange-rate or imported RUB-normalized amount exists in the available authoritative records. No rate was invented. Correct behavior is to display 361 MDL as the transaction amount, label the stock **UNVALUED IN RUB**, exclude it from RUB inventory/COGS totals, and require an explicitly approved historical rate or RUB normalized amount.

### Supplier debt reconciliation boundary

The embedded purchase summaries reproduce as follows, but this is **not** a full raw-ledger verification:

| Supplier | Currency | Documents | Posted purchases | Embedded valid payments | Embedded debt |
|---|---:|---:|---:|---:|---:|
| Рынок | RUB | 11 | 7,662.58 | 7,662.58 | 0 |
| Шериф | RUB | 12 | 13,364.87 | 13,364.87 | 0 |
| Впрок | RUB | 1 | 10,291.80 | 10,291.80 | 0 |
| Инстаграм | RUB | 1 | 1,200.00 | 1,200.00 | 0 |
| Розничный магазин | MDL | 1 | 361.00 | 361.00 | 0 |
| **Total** | separate currencies | **26** | **32,519.25 RUB + 361 MDL** | **32,519.25 RUB + 361 MDL** | **0 RUB + 0 MDL** |

The live D1 reader exposes the payment-ledger row but truncates the long JSON value and offers neither SQL nor substring reads. Therefore duplicate-payment, reversal and partial-payment reproduction from the independent raw ledger remains unavailable. Supplier Debt remains **NOT VERIFIED**, not upgraded on the strength of embedded summaries.

### Finance, Payroll, Health and AI authoritative-input result

The read-only Sites D1 connector confirmed the production account rows `bd_finance_revenue`, `bd_finance_expenses`, `bd_payroll_entries`, `bd_month_closings`, `bd_ai_diagnosis_v4`, `bd_action_plans` and `bd_action_tasks`. Long `data_json` values are projection-truncated and cannot be paged within a value. The authenticated application API could not be used without a user session. A local preview export was rejected because it contained MDL UAT/Metro fixtures rather than production «Кёльн».

The immutable evidence manifest is `docs/koln-production-reader-manifest-2026-08-28.json`. It records the authoritative snapshot checksum, physical file checksum, reader capabilities, observed account stores and the rejected UAT checksum.

Consequences:

- July closed-month Finance remains independently reproduced from the immutable authoritative snapshot: revenue 104,946; purchases 30,409.21; other expenses 10,075.50; payroll 41,348; taxes 9,000; utilities 6,500; COGS 31,383.21; cash result 7,613.29; final result 6,639.29 RUB.
- Current-period and all raw-ledger Finance, accrual-vs-cash, Payroll shift/rate detail and crossing-midnight rows cannot be promoted to verified without untruncated payloads.
- Health Score 83/100 cannot be reproduced factor by factor: the current score is visible and the canonical server handoff is tested, but the production factor payload is truncated. This is a verification blocker.
- Production `bd_ai_diagnosis_v4` was generated/updated 2026-08-01. Plan `plan_1783892352555_ju1g` was created from five early-July shifts and is outside the 14-day evidence window on 2026-08-28. The client now projects active plans with expired evidence as `stale`; it does not rewrite production records or present them as current recommendations.

### P2/P3 disposition and record-level correction plan

| Severity | Record | Current | Proposed correction | Gate / risk |
|---|---|---|---|---|
| P1 | purchase line `17b0346d-a394-4ff3-ae0b-35f2f0f2397e`; movement `6d6d842f-ce4b-4a76-a180-4262b7e03e6d`; document/payment totals | contradictory quantity/price/total | Retrieve source file, transcribe quantity/price/total, then update this line and rebuild its document total, payment/debt consequence and movement valuation as one idempotent approved operation | **STOP: source bytes required**; changing multiplication-only would be speculative |
| P1 | purchase line `eb0fdcc0-5cff-41f5-a6e4-9fb05185fb1e`; movement `72a42110-fd71-47aa-b8bf-bc05a0044f0f`; document/payment totals | contradictory quantity/price/total | Same source-first, idempotent correction chain | **STOP: source bytes required** |
| P1 | purchase `b54e2f38-a4df-49b0-8510-12904fbe183e`; line `47d633d5-4b03-442c-833a-c598ac7f57cc`; movement `1b8c1746-35de-4729-a5c5-dac69c0b1d0d`; balance `stock:коньяк белый аист|ml` | 361 MDL; no RUB cost | Enter an approved historical `exchangeRateToAccounting` or authoritative RUB line/document amount, then rebuild only this movement/balance valuation | **STOP: accounting policy/rate required**; do not use live FX |
| P2 | expense `purchase-payment:b54e2f38-a4df-49b0-8510-12904fbe183e` | supplier Рынок / `aaf270dd-75cc-4347-be82-a782bd1e7bec` | supplier «Розничный магазин» / `806ed11a-ea40-448c-8828-bcbb208bb17a` while preserving sourceDocumentId, amount and currency | attribution-only migration after immutable before/after export |
| P2 | snapshots `c6564a5e-b623-48be-b54c-b1228615c1e7`, `b6e7e1d3-d88e-42e9-a4e1-75a8841deb90` | `venueId="primary"` | `venueId=1`, preserving dates/sections/totals | versioned identity migration after full export |
| P2 | Home basis labels | ambiguous basis wording | “Закупки + начисления” and “Результат до себестоимости” | **CODE FIXED** |
| P2 | plan `plan_1783892352555_ju1g` | active despite expired evidence | systemic 14-day evidence freshness projection; historical record retained | **CODE FIXED**, no production write |
| P3 | cola / Morshynska / trash-bag balances | −2.70 / +0.02 / +0.10 RUB valuation deltas | retain pending a separately approved deterministic valuation rebuild | low materiality; no automatic migration |

After code changes, discrepancy counts are: **P0=0, P1=3 production/source issues, P2=3 production records, P3=3**. In addition, full Finance, raw Supplier Debt, Payroll, Health factor payload and current AI evidence remain verification-input blockers rather than explained matches.

The continuation cannot reach `CALCULATIONS VERIFIED` because production source corrections and authoritative full inputs are still missing. Production deployment remains intentionally unprepared/unpublished at this stop point.

### Continuation verification results

| Check | Result |
|---|---|
| Changed-file review / `git diff --check` | **PASS** |
| TypeScript typecheck | **PASS** (included in full `npm test`) |
| Production build | **PASS** (included in full `npm test`) |
| ESLint | **PASS**, 0 errors; one pre-existing unused-variable warning in `app/api/migration/koln-assortment/route.ts` |
| Full artifact + unit suite | **PASS**, 654/654 |
| Mixed-currency regressions | **PASS**: RUB/MDL/EUR boundary, stored historical conversion, excluded/unconverted disclosure, same-currency supplier comparison |
| Invoice commercial arithmetic regression | **PASS**, including decimal comma, thousands separators and the production Premium Tobacco scenario |
| Representative invoice 394 | **PASS**; repeat: 15/15 historical hits, AI requests 0, tokens 0, manual confirmation/search 0, false positives 0 |
| 500-line Hybrid Mapping | **PASS**; repeat: 500/500 history hits, AI requests 0, tokens 0, manual search 0, duplicate batches 0 |
| Desktop smoke | Public production shell/login renders; no application console error. Authenticated Home/Finance of the unpublished build was not accessible without a user session, so this is **PARTIAL**, not a false PASS. |
| Mobile smoke | Responsive contracts and rendered mobile regression suite **PASS**; live authenticated mobile smoke of the unpublished build is **BLOCKED** by the same session/preview boundary. |
| Production writes / deployment | **0 / NOT PUBLISHED** |

The code change is test-clean. A deployable saved version is prepared, but production publication remains blocked by the record-level correction and authoritative-input stop conditions above.

## Corrective accounting-money architecture — final continuation

Baseline: `d86d6abe07ca40e02678884606d51caea36389e5`. Production writes and deployments remained **0**.

### Actual production currency and RUB semantics

The authoritative account row stores `currency="RUB"`. Current BarDoctor UI explicitly labels it `RUB — российский рубль`. For a Bender venue whose business history may use “рубль” for the Transnistrian ruble, the 25 historical RUB purchase documents are therefore semantically ambiguous. The stored data does not safely prove ISO RUB versus PMR ruble.

A distinct canonical `PMR_RUB` code and `руб. ПМР` label are now supported. Legacy `RUB` is not automatically rewritten, and external ISO RUB rates are never applied to `PMR_RUB`.

### Canonical implementation

Newly posted purchase/payment money preserves `originalAmount` and `originalCurrency` and locks `accountingAmount`, `accountingCurrency`, `fxRate`, `fxRateDirection=source_to_accounting`, `fxEffectiveDate`, `fxSource` and `fxLockedAt`.

- Same currency: accounting amount equals original amount; no FX.
- Foreign currency: stored accounting amount or an explicit historical rate with date/source is required.
- Recognition draft is allowed, but confirm/update/repost and foreign payment posting are blocked before finance/stock writes when FX is unresolved.
- Historical accounting values win over later rates. There is no current-rate lookup or implicit 1:1 path.
- Accounting-currency changes are blocked for accounts with financial history and require a controlled effective-date transition.
- Procurement totals, supplier debt, warehouse receipt valuation and AI purchase context consume accounting amounts. Home, Finance and monthly report use accounting values and disclose unresolved legacy records separately.

### White Stork

Purchase `b54e2f38-a4df-49b0-8510-12904fbe183e` remains `361 MDL` original money and `3,000 ml` quantity. Under the currently stored `RUB` setting it has no historical FX and stays **UNRESOLVED IN ACCOUNTING CURRENCY**; `361` is not treated as RUB. Under a future controlled transition to accounting currency MDL it would be same-currency `361 MDL` and require no FX. No rate was invented.

### Migration preview

`docs/koln-accounting-money-migration-preview-2026-08-28.json` was generated read-only from export `bdx_5093fecafdf522f4134a79a8` / checksum `5093fecafdf522f4134a79a821d74c92483566f47883bdb92c4d58685e430bb1`.

| Classification | Count |
|---|---:|
| Historical confirmed purchases | 26 |
| Legacy RUB semantic ambiguous | 25 |
| Requires historical FX under current stored setting | 1 |
| Fully canonical / no action | 0 |
| Safe automatic normalization before RUB meaning is confirmed | 0 |
| Strict arithmetic source-verification documents | 4 documents / 5 lines |

Besides the two material discrepancies, strict future-posting rules flag historical Боксы (-0.10), Кола (-0.30) and Гель для посуды (-0.02). These may reflect source rounding/discounts; none was changed without the invoice.

### Verification status

| Domain | Result |
|---|---|
| Purchase/Invoice future posting | **VERIFIED BY REGRESSION** — arithmetic and accounting conversion gate all writes |
| Premium tobacco | **PASS** — `0.15 kg × 3666.67 = 550.00`; repeat mapping 15/15 history, AI requests/tokens 0/0 |
| Supplier Debt engine | **VERIFIED BY REGRESSION** in accounting currency; full production payment ledger remains truncated |
| Warehouse valuation engine | **VERIFIED BY REGRESSION**; unresolved foreign costs remain unvalued |
| Home/Finance/monthly report | **CODE VERIFIED** — accounting amounts only; unresolved bucket disclosed |
| Payroll | Production row-level recalculation remains unavailable |
| Health Score | Production factor payload remains unavailable; 83/100 cannot be independently reproduced |
| AI Doctor | Accounting context/freshness protected; full current production evidence remains unavailable |

The read-only production connector pages rows but truncates long JSON cell values and has no substring pagination. Full Finance, Payments, Payroll, Health and AI payloads could not be recovered without an authenticated production export. No credentials were inferred or bypassed.

Final classification: calculation code `P0=0`, unresolved code `P1=0`; historical production has two material source-unverified purchase P1 records, one FX/accounting-normalization record, 25 currency-semantic migration candidates, unchanged P2/P3 records, and authoritative-input blockers.

Automated suite **665/665 PASS**; focused invoice/accounting suite **50/50 PASS**; build/typecheck PASS; lint 0 errors plus one pre-existing warning. Desktop preview loaded without overflow. Authenticated purchase UI was verified by artifact tests; mobile responsive/navigation regressions pass in the automated suite.

Source-control handoff: commit `f0cb36bc23b1465de5ae5486b62dc78f0e785480` was pushed to `main`. Sites version 321 was saved from that commit as a deployable artifact. No deployment call was made.

**SYSTEM ACCOUNTING-MONEY ENGINE VERIFIED.**

**HISTORICAL DATA CORRECTION / FX NORMALIZATION REQUIRED.**

**OVERALL PRODUCTION ACCOUNT: CALCULATIONS NOT VERIFIED.**

## Authoritative Köln currency-label correction — final read-only continuation

Baseline: commit `294633b730b4db4f031da31359b9114c24da242e`, `main == origin/main` at the start of this continuation. Production writes and deployment remained **0**.

### Decision

**SIMPLE MANUAL CURRENCY CORRECTION IS NOT SUFFICIENT IN THE CURRENT UI.**

The business operation itself is simple: relabel historical `RUB`/`MDL` as `PMR_RUB`, preserve every numeric amount and apply no FX. The current UI cannot safely complete it because:

1. The venue profile API intentionally rejects an accounting-currency change when financial history exists (`ACCOUNTING_CURRENCY_CHANGE_REQUIRES_PLAN`).
2. `RUB` still means the ISO Russian ruble in implementation semantics. After switching the account to `PMR_RUB`, any legacy `RUB` record left unchanged becomes a foreign-currency record and is excluded until historical FX is supplied.
3. Currency is not stored only on the purchase document. The linked payment, stock movements, balance/valuation metadata, supplier metadata, supplier mappings, menu items and price history contain their own currency labels.
4. A normal confirmed-document update recalculates the stock receipt correctly, but does not relabel the linked payment. White Stork then becomes `paidAmount=0`, `balanceDue=361` until the payment is corrected too.

No new currency architecture is needed. A bounded, atomic label-correction operation across six existing storage rows is the minimum safe solution.

### Dependency graph and normal update behaviour

| Layer | Independent currency field | Normal purchase update result |
|---|---|---|
| Venue profile | `restaurant_json.currency` | Change is blocked for Köln because financial history exists |
| Purchase | `currency`; canonical `originalCurrency` / `accountingCurrency` after normalization | Updated |
| Purchase lines | Legacy rows inherit document currency; canonical rows receive `originalCurrency` / `accountingCurrency` | Updated during normalization |
| Supplier payment / Finance expense | Own `currency`, later canonical money fields | **Not relabelled by purchase update** |
| Stock receipt movement | Own transaction and accounting currency/cost fields | Active receipt is reversed and rebuilt when cost becomes material; cancelled history remains separate |
| Stock balance / valuation | Own `currency`, `accountingCurrency`, `lastTransactionCurrency` | White Stork active balance is rebuilt to 361 PMR when the document is normalized |
| Nomenclature valuation metadata | Duplicates balance/cost metadata | Rebuilt for the active purchase path; historical/other rows remain independent |
| Supplier mapping/default currency | Own currency metadata | Current supplier mapping/default may update; stale/historical mappings are not guaranteed to follow |
| Menu item / menu price history | Own currency | Unrelated to purchase update; must be relabelled separately |
| Inventory snapshots / closed month | No independent currency code in the inspected records | Amounts are interpreted through accounting currency; no numeric write required |
| Dashboard / Reports / AI context | Derived | Recompute dynamically from canonical accounting currency and relabelled records |

### MDL records confirmed in production

The authoritative five-store export contains 12 embedded records with an MDL field. The live read-only Finance row confirms the linked White Stork payment as the thirteenth record. No numeric value changes.

| Record | Domain | Amount before | Label before | Amount after | Label after | Dependants |
|---|---|---:|---|---:|---|---|
| `b54e2f38-a4df-49b0-8510-12904fbe183e` | Purchase | 361 | MDL | 361 | PMR_RUB | payment, movements, balance |
| `purchase-payment:b54e2f38-a4df-49b0-8510-12904fbe183e` | Supplier payment | 361 | MDL | 361 | PMR_RUB | supplier debt, Finance |
| `1b8c1746-35de-4729-a5c5-dac69c0b1d0d` | Active receipt | 361 | MDL | 361 | PMR_RUB | stock valuation |
| `fa7bded3-8aa3-475d-bc82-373477ed1c3c` | Cancelled receipt history | 361 | MDL | 361 | PMR_RUB | audit history only |
| `stock:коньяк белый аист\|ml` | Stock balance | value 0; transaction 361 | RUB / MDL | value 361; transaction 361 | PMR_RUB | warehouse, COGS |
| `stock:коньяк белый аист\|ml` | Nomenclature valuation copy | last price 120.33 | RUB / MDL | 120.33 | PMR_RUB | stock metadata |
| `supplier-item:…806ed…:коньяк белый аист\|ml` | Supplier mapping | 120.33 | MDL | 120.33 | PMR_RUB | price comparison |
| `supplier-item:…aaf270…:коньяк белый аист\|ml` | Supplier mapping | 120.33 | MDL | 120.33 | PMR_RUB | price comparison |
| `aaf270dd-75cc-4347-be82-a782bd1e7bec` | Supplier default | — | MDL | — | PMR_RUB | future document default |
| `806ed11a-ea40-448c-8828-bcbb208bb17a` | Supplier default | — | MDL | — | PMR_RUB | future document default |
| `76008781-38a7-4afe-a87a-bd4c4f38ee1b` | Menu item | 95 | MDL | 95 | PMR_RUB | menu economics |
| `d2e778b2-fe1f-437d-a4db-406d754d800b` | Menu item | 95 | MDL | 95 | PMR_RUB | price history |
| `e6057837-2d33-4be5-9b34-641a979775a6` | Menu price history | 45 → 95 | MDL | 45 → 95 | PMR_RUB | history only |

`confirmedMdlRecordCount = 13` for the authoritative inputs available to this audit. The Finance JSON cell is bounded by the production reader, so the controlled operation must still enumerate the full untruncated store and abort if it finds any additional explicit MDL/RUB code outside the preview.

### Legacy RUB

Option **B** is required. Legacy Köln `RUB` cannot remain untouched.

- The product distinctly supports `PMR_RUB` and labels `RUB` as `RUB — российский рубль`.
- The accounting-money engine compares the codes exactly and can route ISO RUB through FX.
- Therefore the 25 historical Köln purchase documents labelled `RUB` must be relabelled to `PMR_RUB` together with their linked payments and dependent currency copies.
- The authoritative export also contains 169 RUB stock-movement records, 182 RUB menu items, 112 nomenclature currency records, 112 stock-balance currency records and 3 RUB supplier defaults. These are embedded JSON entities, not separate database tables.

Leaving legacy RUB as an account-level alias would preserve ambiguity and could apply Russian-ruble semantics later. It is not safe.

### White Stork read-only simulation

The simulation used the actual exported document, assortment and movement history plus the production-ready accounting/inventory engine.

| Metric | Before | Document only relabelled | Document + payment + dependent labels relabelled |
|---|---:|---:|---:|
| Purchase total | 361 MDL | 361 PMR_RUB | 361 PMR_RUB |
| FX | none | none | none |
| Paid amount | 361 stored | 0 accounted | 361 PMR_RUB |
| Supplier debt | 0 stored | **361 PMR_RUB** | 0 PMR_RUB |
| Stock quantity | 3,000 ml | 3,000 ml | 3,000 ml |
| Average unit cost | 0 | 0.120333 PMR/ml | 0.120333 PMR/ml |
| Inventory value | 0 / review | 361 PMR_RUB | 361 PMR_RUB |

The stock engine can rebuild the active receipt and valuation correctly. The linked payment is the decisive reason why editing only the document is insufficient.

### Reconciliation before / after

| Domain | Before protected state | After complete relabel | Change |
|---|---:|---:|---:|
| Purchases | 32,519.25 RUB included; 361 MDL excluded | 32,880.25 PMR_RUB | +361 becomes included; source numbers unchanged |
| Supplier payments | White Stork 361 MDL excluded from PMR accounting | White Stork 361 PMR_RUB included | Label correction only |
| Supplier debt | 0 on fully paid included documents; White Stork unresolved/excluded | 0 PMR_RUB | no economic change |
| Warehouse valuation | 28,636.67; White Stork value 0/review | 28,997.67 PMR_RUB | +361 recovered valuation |
| Finance / Dashboard August | legacy visible mixed scalar 43,500; protected equivalent 43,139 + 361 excluded | 43,500 PMR_RUB | numeric business total unchanged; exclusion removed |
| Closed July COGS | 31,383.21 | 31,383.21 PMR_RUB | 0; August label correction does not rewrite July inputs |
| Current COGS from White Stork | 0 consumed | 0 consumed | 0; no sale/write-off consumed this receipt |
| Reports | foreign/excluded disclosure for 361 | one PMR_RUB accounting total | presentation corrected |
| AI context | account RUB plus unresolved MDL record | account PMR_RUB, no unresolved historical purchase | refreshed context required; no old AI claim is silently rewritten |

The 43,139 protected Finance figure is the prior visible 43,500 scalar less the one confirmed 361 foreign payment. The full Finance store remains reader-truncated, so the migration must reproduce this reconciliation from the untruncated row before any write.

### Minimum controlled operation

This is not a new migration architecture. It is one bounded, reversible, atomic correction across six existing storage rows:

1. `accounts.restaurant_json`: set Köln currency `RUB → PMR_RUB`.
2. `bd_purchase_documents`: relabel all 26 documents (`25 RUB + 1 MDL`) and lock same-currency accounting fields; keep totals and 160 line amounts unchanged.
3. `bd_finance_expenses`: relabel every Köln payment/expense explicitly carrying legacy `RUB` or `MDL`; keep amounts unchanged.
4. `bd_stock_movements`: relabel transaction/accounting currency fields; rebuild only White Stork's active cost basis to 361 PMR_RUB while preserving cancelled history.
5. `bd_assortment_v1`: relabel menu, price-history, mapping, nomenclature and balance currency copies; set White Stork value to 361 and clear `missing_fx`.
6. `bd_suppliers`: relabel the five supplier defaults to PMR_RUB.

Required controls: immutable before export/checksum, full untruncated target enumeration, closed-month guard, one atomic batch, exact before/after amount equality, reconciliation, audit log and rollback snapshot. No FX fields may be created.

### Future documents and non-currency findings

- New `PMR_RUB` purchase: same-currency posting, no FX.
- Future real `MDL` purchase: historical MDL→PMR_RUB rate, effective date and source are required before posting.
- «Апельсины» and «Пакетики для чая» remain **SOURCE VERIFICATION REQUIRED**. Currency relabel does not change either record.

### Final classification

**PRODUCT CURRENCY ENGINE: VERIFIED.**

**KÖLN BUSINESS MEANING: PMR_RUB CONFIRMED; NO FX.**

**SIMPLE MANUAL DOCUMENT EDITING: INSUFFICIENT.**

**MINIMAL ATOMIC CURRENCY-LABEL CORRECTION REQUIRED.**

### Continuation verification

| Check | Result |
|---|---|
| Changed-file review / `git diff --check` | **PASS** |
| JSON preview validation | **PASS** |
| Focused accounting/purchase/warehouse relabel regression | **PASS — 93/93** |
| Full artifact + unit suite | **PASS — 668/668** |
| TypeScript typecheck | **PASS** |
| Production build / artifact validation | **PASS** |
| ESLint | **PASS**, 0 errors; one pre-existing unrelated unused-import warning in `app/api/migration/koln-assortment/route.ts` |
| Desktop preview smoke | **PASS** at 1363×936; login shell rendered, no horizontal overflow and no application console errors |
| Mobile smoke | **PASS** through responsive/mobile navigation and layout contracts in the full artifact suite; authenticated unpublished-build UI remains outside the available session |
| Product code changes | **NONE** — current safety gates and accounting engine were retained |
| Production writes / deployment | **0 / NOT PUBLISHED** |

## Controlled production execution — 2026-08-28

The account owner subsequently authorized the bounded production correction. The protected three-phase route was deployed as Sites version 323, then executed as `prepare → apply → validate`. Validation matched the prepared checksum; rollback was not required.

### Immutable evidence

| Artifact | ID | SHA-256 |
|---|---|---|
| Before export | `bdx_koln_currency_before_688d6c7bc27af3603dff0d6a` | `0e90ba2c6faf4d1c736d0b20f1bdc29901f4adf49537c1b7b28354ce88a30d20` |
| Expected transformed state | — | `7b20c05175e5032a39b55a23fc520f758342a8dcce16255ed177d397650e521f` |
| After export | `bdx_koln_currency_after_98bc288d269561ab1ff94d4c` | `98bc288d269561ab1ff94d4c138dc06370bc72fc6fbe07c818fc8e7c88a460aa` |

The after-state checksum was exactly `7b20c05175e5032a39b55a23fc520f758342a8d
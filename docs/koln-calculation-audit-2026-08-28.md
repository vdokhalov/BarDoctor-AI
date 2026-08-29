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
- No historical exchange-rate or imported RUB-normalized amount exists in the available authorita
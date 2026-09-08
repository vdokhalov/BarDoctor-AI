# Phase 4 gap analysis — incomplete, NOT release-ready

Audited baseline: `06111cd4114040af5ec5fbe49ad6d2cbb1e3ba4e`.
Baseline full CI: https://github.com/vdokhalov/BarDoctor-AI/actions/runs/34242588083
This CI proves the existing implementation, not the unimplemented Phase 4 contract.
No production requests, data changes, deployment, or Phase 5 work were performed.

## Evidence and remaining requirements

Status terminology: **proven** means the stated narrow behavior is exercised by existing tests;
**partial** means a predecessor exists but does not satisfy the new contract;
**missing** means the required implementation/evidence has not been established.
Existing domain tests using JSON save/reload are not represented as D1/browser end-to-end tests.

| Original requirements | Status | Evidence and gap |
| --- | --- | --- |
| 1, 3: separate stock/purchase/sale units; canonical pcs/l/kg | Partial | `inventory.ts` defines stock units as ml/g/pcs, with l/kg factors of 1000. Display units do not change the persisted basis. Canonical l/kg stock storage and non-destructive compatibility boundaries are missing. |
| 2, 4: ordinary pcs receipt without mandatory packaging | Partial | `purchaseLineBaseAmount` handles pieces and history tests keep 12 pcs as 12. Product definition update still requires packageSize. No complete new basic purchase flow proof. |
| 5–8: package count/content, liquid/weight examples, one conversion layer | Partial | `inventoryPackageAmount` and `purchaseLineBaseAmount` implement legacy conversion in ml/g/pcs. Purchase normalization and client patches contain separate formulas and package inference. No shared Phase 4 result contract with canonical quantity/unit, factor, cost and provenance. |
| 9: normalized canonical CostBasisResolver integration | Partial | Phase 2 resolver is used by posting and cost readers, but bases are ml/g/pcs; unit mismatch returns UNKNOWN. No validated l/kg compatibility adapter for old receipts. |
| 10: DIRECT_ITEM / FIXED_QUANTITY / RECIPE / NONE | Partial | `menu-consumption-phase3.test.ts` proves persisted modes and historical sale snapshot protection. Fixed portions resolve to 200 ml; recipes consume g. Required l/kg integration remains unproved. |
| 11: nomenclature asks only stock unit first | Missing | Creation has package defaults; update requires packaging. Full three-choice stock-unit UX without a packaging prerequisite has not been implemented. |
| 12: quantity/unit/price plus optional package toggle | Missing | Existing purchase UI is driven by packaging patches (including v209/v221). The required optional package-count/content flow is not implemented. |
| 13: optional reusable venue-scoped templates | Partial | Package options and purchase/display metadata exist. They are not a validated optional Phase 4 template contract with independent snapshots. |
| 14: immutable confirmed conversion snapshot | Missing | `PurchaseItem` has quantity/unit/packageSize/price but no versioned conversion snapshot with entered inputs, normalized quantity/cost and provenance. |
| 15: legacy compatibility / controlled review | Partial | The history guard is proven: unproven repair is blocked before consolidation and persistence. New-purchase conversion still has legacy/name inference; no complete shared fail-closed compatibility input layer. |
| 16: invalid dimensional conversions fail closed | Partial | Individual sale/write-off validators reject mismatches; no universal purchase conversion contract or persisted scenario H proof. |
| 17: OCR boundary | Missing | No new validated raw-input conversion contract. OCR redesign remains explicitly excluded. |
| 18: warehouse units / no x1000 pieces bug | Partial | Existing display policies and 12-piece history repair test exist. Canonical l/kg balance display/storage and complete new purchase scenario F remain unproved. |
| 19: inventory count | Partial | Existing count tests cover units/package entry, blank vs zero and persistence in ml/g/pcs. The 3 l / 4 x 0.7 l / -0.2 l canonical posting chain remains unproved. |
| 20: write-off | Partial | Existing tests prove package conversion to 700 ml and receipt-based cost. The required 50 ml -> 0.05 l persisted movement/cost chain is not implemented. Modal ownership/lock release is separately proven by navigation tests and full CI. |
| 21: transfers if present | Unconfirmed | No complete transfer-path inventory was finished before the stop condition. No canonical transfer acceptance claimed. |
| 22: venue isolation | BLOCKED | A deterministic purchase-posting reproduction changes the foreign venue's balance when keys collide; see below. Phase 3 reference and history-audit tests do not cover this mutation. |
| 24, 25: tests, mobile/desktop purchase UX | Partial | Existing full CI covers the existing UI, navigation, menu consumption and Home/Reviews. It does not exercise the unimplemented Phase 4 purchase UX at 390x844 / 1280x720. |
| 26: exclusions | Preserved | No OCR/supplier redesign, cleanup, destructive migration, ledger retention redesign, production writes or global visual redesign. |
| 27, 28: complete validation and release gate | Not reached | Full baseline CI is GREEN, but no completed Phase 4 artifact or full Phase 4 acceptance suite exists. No new commit/push/CI should be described as a finished Phase 4 release. |

## Acceptance A–J

None is yet established as the complete new Phase 4 command -> persist -> reload ->
stock movement -> costing path through production-equivalent persistence.
This does not negate narrower existing tests.

| Scenario | Current evidence | Missing proof |
| --- | --- | --- |
| A: 24 pcs x 15 | Legacy piece posting and direct-item consumption exist | New basic purchase command, persistence/reload, +24 pcs and 15/pcs together |
| B: 2 boxes x 12 pcs | Legacy package parser supports numeric content | Optional-package UI/API -> snapshot -> +24 pcs, total 360, 15/pcs |
| C: 6 x 0.7 l | Historical fixture preserves 4200 ml / 1200 | New canonical 4.2 l receipt and 285.714.../l cost end-to-end |
| D: 8 g x 10 from 1 kg | Phase 3 recipe posting is tested in g | Persisted kg basis, purchase/recipe/posting chain ending at 0.92 kg |
| E: 4 x 50 ml from 1 l | Phase 3 test consumes 200 ml | Persisted l basis ending at 0.8 l, canonical cost snapshot |
| F: 12 pcs, never 12000 | History repair test proves 12 remains 12 | New purchase input/confirm/reload/movement path with this exact assertion |
| G: template change | Repair tests ignore mutable current packaging, including JSON reload | Actual template edit after confirmed versioned conversion snapshot; receipt remains 24 pcs |
| H: kg stock, 2 l input | Individual validators exist | Purchase command rejects incompatible dimensions atomically; no stock/doc writes |
| I: 3 l vs 4 x 0.7 l | Existing package count entry uses legacy bases | Persisted count 2.8 l and adjustment -0.2 l |
| J: colliding template IDs across venues | Phase 3 references and history evidence are venue-aware | Template contract plus mutation isolation. Current same-key purchase posting isolation already fails. |

## Confirmed stop condition: cross-venue mutation risk

An isolated Node execution used the actual `applyPurchaseToInventory` from the
audited baseline. Inputs were synthetic, serialized/reloaded before posting, and
the returned assortment was serialized/reloaded again. No database or production
was contacted.

Fixture: nomenclature and stockBalances both contain `productKey: "beer"`, unit
pcs, active true, in venue 1 and venue 2. Venue 1 begins at 24, venue 2 at 100.
Document `venue1-receipt`, venueId 1, date 2026-09-08, currency RUB, has one line:
`purchaseProductKey: "beer", quantity: 12, unit: "pcs", unitPrice: 15,
lineTotal: 180, category: "alcohol", costStatus: "KNOWN"`.

Expected: venue 1 = 36; venue 2 = 100, or controlled rejection before mutation.
Observed: venue 1 = 24; venue 2 = 112; one +12 pcs movement tagged venue 1;
`summary.unresolvedLines = []`.

Cause: `balanceIndex` keys all balances only by productKey (last row wins).
The canonical resolver filters venue, but `applyPurchaseToInventory` subsequently
retrieves the previous balance from that unscoped map. The nomenclature map and
incoming identity lookup also use unscoped keys. Correct reference selection is
therefore insufficient to guarantee the same venue for stock mutation.

This proves a domain mutation defect for the supplied multi-venue state, not an
assertion that such mixed state currently exists in production or that production
corruption has occurred. The HTTP route also calls consolidation before posting;
the complete HTTP/preflight path requires an independent regression before a fix
can be accepted. It was not exercised against production.

The original Phase 4 stop condition explicitly requires stopping on cross-venue
risk. Implementation stopped here, with this report as the only working-tree
change. No source fix, commit, push, deployment or Phase 5 work was performed.

## Authorized blocker remediation (2026-09-08)

After explicit user authorization, a shared purchase venue preflight was added.
Confirm/update/repost reject mixed-venue stores with HTTP 422
`PURCHASE_VENUE_SCOPE_NEEDS_REVIEW` before ledger migration, consolidation or
database writes. Domain purchase posting and revision also fail closed, returning
no new movements or mutations. No foreign rows are silently filtered out.

This is containment, not a migration or full venue-scoped rewrite of the legacy
indexes. Mixed-venue stores require controlled review. Untagged account-local
legacy records remain supported, including numeric venueId 0 used by old supplier
mappings. Explicit invalid or foreign ownership is rejected. The response exposes
no foreign product identifiers or names.

Ten new behavioral regressions cover both colliding-key payload orders, JSON
persist/reload, unchanged balances/nomenclature/history/costs, revision rejection,
valid local posting (+12 pcs, 24 -> 36, cost 15/pcs), legacy compatibility,
foreign templates/aliases/recipes, and the three executable HTTP handlers with
zero migrations, consolidations and writes. These tests run through the normal
CI test glob without exclusions. The broader Phase 4 gaps above remain open.

## Required resumption order

1. Validate the authorized cross-venue containment in full normal GitHub CI.
   Do not equate its GREEN status with completion of the full Phase 4 contract.
2. Add the shared strict canonical conversion model and versioned confirmed
   purchase snapshots. Keep old confirmed documents/movements immutable; adapt
   legacy units only with explicit proven basis, not string relabeling.
3. Integrate all new posting and costing paths; make packaging optional in the
   purchase/nomenclature UI, preserving existing modal/currency protections.
4. Prove all A–J persisted flows, historical invariants, venue isolation and both
   viewport UIs; execute the requested full checks and normal GitHub CI.
5. Only then assess full Phase 4 release readiness. Production requires separate
   authorization; Phase 5 remains excluded.

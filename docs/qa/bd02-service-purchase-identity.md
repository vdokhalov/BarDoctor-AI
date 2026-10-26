# BD-02: mapped service purchase identity

Baseline: a3b0c5464de41ad862e38b42c8377efc93e95be5 (v651).
Scope: local isolated fixtures only. No production writes, migration, AI, push or release.

## Evidence and cause

The audit (Library libfile_4d5373e73cb08191a053bc4a58ab587f, pp. 4–5, 19) reports two cards after mapping a 15 MDL purchase to an existing service. The historical live IDs have not yet been independently inspected in this task.

A real POST /api/purchases/confirm fixture reproduces the defect: service:учебная уборка тест was explicitly selected (both nomenclatureId and purchaseProductKey), but a manual invoice retains unit/package `шт.`/`1 шт.`. applyPurchaseToInventory regenerated this selected key as stock:учебная уборка тест|pcs, created a second kind=service card, and kept the original. No stock movement and only one purchase were produced. The regression test failed with two cards before the fix.

The stock consolidation called before confirmation also regenerated/merged service identities by names and reset their IDs. This is unsafe for two distinct services with similar or identical labels.

## Change

- Explicit non-stock service selection is validated against the venue's active nomenclature, including agreement of all supplied IDs/keys. Missing, conflicting, archived, foreign or ambiguous references fail closed.
- The existing service retains ID, canonical key, unit, classification and display name. Only purchase date/update metadata and supplier source mapping are refreshed.
- The confirmed purchase records the validated service identity. No physical conversion or stock movement is produced.
- Stock duplicate consolidation preserves service records verbatim rather than merging them by label. No existing duplicate is removed or migrated.
- Financial accrual/payment/cancellation formulas and UI copy/layout are unchanged.

## Verification

`node --import tsx --test tests/purchase-service-identity.test.ts tests/service-accruals.test.ts tests/purchase-venue-scope-phase4.test.ts tests/nomenclature-canonical-supplier.test.ts tests/purchase-conversion-history-phase4.test.ts`

63 tests: selected ID/piece unit, ID-only selection, similar names/distinct IDs, invalid references, legacy ID preservation, new unmapped service and retry, lost response/repeat, transaction rollback/retry, concurrent winner/CAS retry, cancellation and repeated confirmation, 15 MDL accrual once and payment cash-only, stock conversion history/equipment classification regressions, tenant isolation.

Concurrency is a deterministic competing-commit interleaving through the existing CAS mechanism; not a load test. The lightweight SQLite harness cannot run nested concurrent transactions, so the competitor's completed state is inserted before the losing CAS batch.

`ARTIFACT_ROOT=dist/client node --import tsx scripts/purchase-service-identity-browser.ts`

Actual compiled browser UI and real local routes: Add → manual purchase → existing supplier → existing service mapping → confirm → nomenclature list. Captured POST preserves the selected ID; one card after reload, no stock, debt 15. Checks at 390/820/1280; document direct/reload/Close/Back/Forward, new draft cancel, one confirm request and no AI, second authenticated account cannot read the service. Screenshots under outputs/purchase-service-identity/{mapped,list}-{390,820,1280}.png.

Build: scripts/build-verified.sh. Build-only blank-line drift in the prepared legacy bundle is removed without changing nonblank bytes; finalize-prepared-client-release.mjs rebinds emitted asset references.

## Baselines and limits

- Existing TS2322: lib/bardoctor/business-health-snapshot.ts:372.
- Existing TS2352: tests/health-partial-operations-v539.test.ts:10.
- Additional adjacent test `purchase-identity-phase7-hotfix.test.ts` has one pre-existing harness failure: `Identifier 'belongsToVenue' has already been declared` in its legacy receipt repair test. Reproduced independently in a clean a3b0c546 worktree; its other 20 tests pass. No helper fix included.
- Existing tablet nomenclature toolbar wraps some labels at 820px; no layout changes in this task.
- Legacy duplicate cleanup requires actual IDs and dependent links to be reviewed separately. Names alone are insufficient. No live PASS claimed.

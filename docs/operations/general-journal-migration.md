# Controlled legacy journal transition

Extends the existing journal migration runner rather than introducing another importer.
The previous runner, API, UI and database CHECK admitted only venue 3389. Normalized
storage already existed; other venues therefore retained the bounded legacy JSON path.

The owner opens Account → Перенос журналов заведения for the current owned venue.
Preparation creates and reads back a SHA-256 checked R2 backup. Each explicit step copies
at most 25 stock rows and 5 sales events using the existing resumable importers. Source
content and revisions must still match before the durable write pause and activation.
Each journal activation is atomic; the pair is phased under one durable pause, not one
transaction. Both journals and financial totals are verified before writes reopen.
Abort is allowed before activation; afterwards recovery is roll-forward under the pause.
Refresh retains earlier backups. Repeated prepare/step returns the existing run/state.

Preflight rejects foreign nested ownership, duplicate explicit IDs, malformed arrays,
more than 20,000 entries or 2,000,000 UTF-8 bytes per legacy journal, and more than 256
stores or 8,000,000 aggregate source bytes. These are bounded migration limits, not a
promise of unlimited storage. No truncation or capacity bypass occurs. Normalized
writes use the existing storage limits and no longer depend on a 1.9 MB JSON journal.
IDs, original payloads, backup pointers, captures, balances and financial links remain.
This does not reconstruct missing historical rows.

## Additive rollout (supersedes the earlier rebuild plan)

The official Sites storage contract only says migrations precede Worker upload; it does
not promise a transaction spanning all statements. No such guarantee is assumed.
Unapplied 0039 now contains only CREATE TABLE/TRIGGER IF NOT EXISTS: two v2 metadata
tables, six pause guards, six QA-backup guards and two cross-generation exclusivity
triggers. No DROP, ALTER, copying or rewriting old rows occurs during deployment.
Every partial prefix is safe to replay. Existing Worker code and old runs keep using
unchanged old tables and triggers. New code refuses runner operations until all 14
new guards exist; old runs retain the same state machine and old metadata, new runs
use v2 through a narrow SQL-name adapter. Concurrent old/new prepares cannot both win:
mutual insert guards reject overlapping venue/account scope. Run plus initial audit
is committed in the existing runtime D1.batch transaction, as are subsequent CAS
advances and each journal activation. No second importer or automatic conversion exists.

1. Review the replacement commit and approve its publication with additive 0039.
   Retain the read-only export of old service rows as evidence. No global maintenance
   window or destructive schema rollback is needed. A deployment failure may leave
   harmless additive objects; inspect deployment state before retry, never delete them.
2. Preserve access settings. After publication compare old runs/log rows and verify
   schema readiness. Existing QA3389 COMPLETE status is read-only; do not reset/reimport.
3. Inventory owned venues read-only and separately authorize a selected legacy canary.
   Preparation writes only the durable backup and runner metadata. Advance bounded
   steps explicitly, inspecting state after any uncertain response. No mass migration.
4. Verify COMPLETE, IDs/content, unchanged balances/captures/financial links and retained
   backup. Per-account durable pause still spans stock/sales activation; failure after
   either activation requires roll-forward. Full live purchase/sale/cancel/close testing
   requires separate data-operation approval and uses existing QA3389 only.

Compatibility note: historical QA v3/v4 backup contracts remain unchanged/readable.
New runner tables are explicitly recognized by that scoped backup reader only after
checking they contain no QA3389/account148 rows; nonempty scoped rows block backup,
never silently omit evidence. Its original run remains in old tables. Other tenants'
metadata is not captured by a QA3389 backup. Original R2 objects are not deleted.

Storage and preflight limits still apply. This removes the legacy JSON journal size
constraint after successful cutover, not all database or per-record limits. Code rollback
to the old Worker cannot operate new-generation runs; finish/restore the new Worker if
one is paused. Their DB pause triggers remain active even with old Worker code.

## Local evidence

- 10 runner regressions (8 existing plus old-generation resume and partial-expand/atomic-prepare failure): interruption, concurrency/CAS, ownership revocation,
  pause enforcement, abort/refresh and corrupt backup.
- 3 general regressions: non-3389 owner HTTP flow, >1.9 MB history preserved exactly,
  receipt/consumption and repeat without repost; invalid scope/IDs/capacity rejected;
  previous run/audit/schema/foreign keys/pause triggers preserved after each additive statement and retry.
- 1 native Worker/D1/R2 regression: every partial DDL prefix/retry, runtime cutover and injected rollback.
- 1 scoped backup compatibility regression: retained v3 contract, zero-row checks and nonempty refusal.
- 1 browser UI regression (390 px): steps, reload, uncertain response, abort/refresh.
- Typecheck still reports the two pre-existing errors in business-health-snapshot.ts
  and health-partial-operations-v539.test.ts; no new errors in this change.

No production writes, migrations, credentials or publication were performed here.

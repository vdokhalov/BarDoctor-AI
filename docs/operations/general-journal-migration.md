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

## Controlled rollout (requires separate approval)

1. Review the local commit and approve schema migration 0039 plus application publication.
   Check no journal/QA-backup operation is actively paused before the schema upgrade.
   Apply 0039 transactionally using the supported migration path, never statement-by-
   statement without rollback. It preserves existing runs, logs, foreign keys and pause
   triggers. Native local D1 verifies upgrade and rollback on injected final failure.
2. Preserve production access settings. Verify existing QA3389 COMPLETE status and
   normalized revisions read-only; do not reset it to legacy or repeat its import.
3. For an explicitly selected legacy venue, verify current owner/scope, source sizes,
   complete durable backup and dry preparation. Advance bounded steps explicitly;
   inspect progress after an uncertain response before retrying. No mass migration.
4. Verify COMPLETE, full IDs/content, unchanged balances/captures/financial links and
   retained backup. Future live purchase/sale/cancel/close testing requires its own
   data-operation approval and must use existing QA3389, never a newly created venue.

## Local evidence

- 8 existing runner regressions: interruption, concurrency/CAS, ownership revocation,
  pause enforcement, abort/refresh and corrupt backup.
- 3 general regressions: non-3389 owner HTTP flow, >1.9 MB history preserved exactly,
  receipt/consumption and repeat without repost; invalid scope/IDs/capacity rejected;
  previous run/audit/schema/foreign keys/pause triggers preserved.
- 1 native Worker/D1/R2 regression, now replaying actual upgrade and injected rollback.
- 1 browser UI regression (390 px): steps, reload, uncertain response, abort/refresh.
- Typecheck still reports the two pre-existing errors in business-health-snapshot.ts
  and health-partial-operations-v539.test.ts; no new errors in this change.

No production writes, migrations, credentials or publication were performed here.

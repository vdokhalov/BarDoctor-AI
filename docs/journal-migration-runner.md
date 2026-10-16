# QA3389 controlled journal migration runner

Execution requires explicit rollout authorization. This runner supersedes the earlier missing-runner limitation; it does not authorize a rollout.

## Exact boundary

Schema 0034 adds progress/audit tables and database write-pause triggers; it migrates no business data. `/api/migration/journals` permits only a current venue owner with live venue/workspace membership, authenticated through the existing read-only session path. Both authenticated venue and submitted venue must be **3389**. The SQL run table also rejects every other venue. No new credentials, generic SQL executor, global migration switch or automatic startup migration is introduced.

POST requires the same Origin and explicit confirmation `QA3389_JOURNAL_CUTOVER`. Use the existing authenticated operator transport. GET reports run ID, phase, pause state, journal counts/states and sequenced progress. No raw backup payload is exposed by this endpoint.

## Operator sequence, after separate production approval

1. Deploy compatible runtime plus schemas 0032–0034, without migration. Verify application health and take an external operational backup. Other venues remain on their existing format.
2. POST `{ "venueId":3389, "confirmation":"QA3389_JOURNAL_CUTOVER", "action":"prepare" }`. Save returned run ID, R2 backup key and SHA-256. The server takes a transactional snapshot of **all domain_data stores**, venue identity and restaurant profile; records explicit absence of required stores, including events, finance revenue, stock, POS orders, sales batches/documents; writes to existing private R2 binding and reads back/checks SHA-256. This is a complete backup of the business stores being migrated, not a physical backup of every database table or binary attachment.
3. Repeated POST `action:"step", runId:<exact returned ID>` makes bounded progress: stock at most25 records and events at most5 per staging call. Copying occurs with writes open. Each copy has its existing CAS/source checks. If the live source changes, no automatic overwrite/rebase occurs: abort, refresh backup, then restart staging.
4. The phase sequence is `BACKED_UP → STAGED → PAUSED → VERIFIED → STOCK_ACTIVE → BOTH_ACTIVE → COMPLETE`. Before PAUSED, the backup must be no older than15 minutes; the full live source/profile must still equal it under a transactional guard. Verify covers full values/order, event hashes and financial/canonical aggregate consistency. Staging work is outside the pause; paused work is final verification and cutover. No fixed production latency promise has been measured.
5. At each step record the returned revision and state. If the connection/process fails, GET status and repeat `step` on the **same run ID**. A cutover may have committed even if its following progress update did not; the runner discovers that durable state and resumes idempotently. Never infer failure from a lost response alone.
6. On COMPLETE the runner re-verifies both journals against backup, checks untouched stores/profile and revision-zero state, then atomically records completion and removes the pause. Perform narrowly scoped acceptance checks and retain backup/progress evidence.

## Pause and mixed-format recovery

The two journals are **not switched in one transaction**. Stock may be active while events remain verified legacy. Throughout this interval a persistent database gate blocks domain_data changes, profile currency/config changes and venue relocation/deletion. Exceptions permit only the initial revision-zero legacy-to-marker transitions in their exact authorized phases. Existing readers understand either format; ordinary sale writes cannot pass the gate. CAS handlers return503 `JOURNAL_MIGRATION_PAUSED` with Retry-After15; some unrelated non-CAS writers may surface their existing failure response, but database writes remain blocked.

Pause has **no TTL auto-release**: a crashed operator must not reopen writes during mixed state. Read-only operator authentication/status remains available. If failure happens after either activation, retain pause and resume forward. Corrupt/missing backup or inconsistent evidence blocks progress and preserves pause; recover the exact checksummed backup and investigate, never force-clear the flag.

`action:"abort"` releases pause only when neither journal is active, checked inside the transaction. It leaves legacy JSON authoritative. `action:"refresh"` is accepted only after ABORTED, resets inactive staging with owner/run-phase/revision guards in each reset transaction, writes a fresh immutable R2 object and returns to BACKED_UP. Earlier backup objects and progress log entries are retained. Concurrent stale refresh cannot delete a newly staged journal after another invocation progresses. No direct reset/rollback endpoint exists after activation.

After COMPLETE and new normalized sales, **never restore the old JSON or old runtime**. It would discard new sales or fail to understand markers. Preserve journals and roll forward. An independently rehearsed reverse migration would require a new write pause, complete current export, reconciliation and a compatible target; if aggregate JSON exceeds old D1 limits, reversal to legacy storage is not viable.

## Local evidence

Tests cover transactional failure at each persisted step, process interruption immediately after each activation before progress recording, idempotent resume, mixed-state pause, rejection of abort after activation, stale/corrupt/missing backup, source drift, failed backup durability, abort+refresh, owner/venue restrictions, other-venue independence, abort racing activation, and stale concurrent refresh racing recreated staging. Native Miniflare Worker/D1/R2 exercises the same runner with real SQL triggers and private R2 readback. Production has not been touched.

## Owner UI

Select QA3389, then Settings → Venues and account → «Перенос журналов QA3389» (`/settings/journal-migration`). The server denies the page to unauthenticated users, other venues and non-owner roles; every API operation independently repeats live owner authorization. The page uses the existing application session and requires the selected local venue to remain3389. No credentials are exported.

Confirm the checkbox and choose «Создать резервную копию». Record the visible run ID, backup key and SHA-256. «Продолжить перенос — один шаг» executes one bounded server operation; repeat with the same run until COMPLETE. After a lost response, only «Обновить статус» remains available until server state is recovered. Abort is available only before either journal is active; refresh backup requires ABORTED and a new confirmation. Reload resumes the server's existing run. QA readiness requires COMPLETE, paused=0 and both journals active.

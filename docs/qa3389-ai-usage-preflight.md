# QA3389 AI usage support and read-only census

Prepared locally after v550 stopped with `UNSUPPORTED_NONEMPTY_ai_usage_events`.
Production remains v550; this change has not been published and no new real prepare was run.

`ai_usage_events` stores usage metadata: account/actor/venue foreign keys, request ID,
provider/model/feature, token counts, status, latency, error code and timestamps.
`recordAIUsageEvent` never stores prompts or responses. It was previously conservatively
classified as empty-only, not identified as a credential table. Capture now preserves all
columns of rows where venue=3389 OR account=148, including historical NULL-venue rows.
Conflicting non-NULL foreign scope fails closed; it is never silently omitted.
Restoration supplies synthetic identity FK rows and verifies exact captured business rows.

Business manifest is now `qa3389-business-contract-v3`; snapshot/receipt wire formats
remain v2. The new offline recovery package is required; old manifest hashes are rejected.
SQL0037 changes pause triggers only, not stored data. Preflight and paused unsupported
counts use the same account/venue union. Job events follow parent jobs; updates check
both old and new parents. Other tenants remain outside this pause unless they carry a
conflicting QA scope reference.

Explicit GET `?preflight=1` is owner-authorized, read-only and returns all unsupported
counts, missing/unknown table names, and AI scope conflicts. It performs no pause/run
writes, R2 access or AI calls, and reads no business payload columns. The service screen
runs it only on the explicit status button. Prepare checks again before creating a pause;
capture repeats unsupported counts under the persistent pause. Preflight is advisory,
not a transactionally frozen snapshot. Unknown tables still block. The sole explicitly
authorized unverified exclusion remains exactly `__appgarden_migrations`.

Remaining empty-only tables (all checked, not presumed empty):
- integration_connections
- integration_mappings
- integration_entity_links
- integration_sync_runs
- integration_sync_items
- integration_field_mapping_templates
- integration_ingress_deliveries
- invoice_recognition_jobs
- notification_jobs
- notification_job_events
- notification_deliveries

## Live evidence limitation

No live counts for these eleven tables were obtained. Sites database overview exposes
names, and the available row reader has no COUNT, WHERE or projection support. Reading
full integration config/invoice result rows merely to count them would expose unnecessary
private data, so it was not used. A supported aggregate query or a separately authorized
publication of this read-only preflight is needed before claiming a complete live blocker
list. Do not repeat real prepare to discover one blocker at a time.

## Local verification

- 18 scoped service/diagnostic tests PASS: exact AI metadata, actor FK, NULL venue,
  foreign scope rejection, combined blockers without payload reads/run creation,
  NULL-venue arrival blocked during capture, bounded history and cleanup regressions.
- 4 UI/native tests PASS: synthetic D1/R2 capture, offline Node SQLite restoration,
  exact AI rows, migration and rollback; explicit UI gates.
- Typecheck still reports only the two existing Health errors in
  business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.
- `npm run build` PASS, including Sites artifact validation.
- Recovery package: `libfile_7b9490fe4a6c8191a3b0d950fb6a2b6f`, SHA256
  `3f0f79592aa893ab2e38a7cd2a6dbb9b193dbb0acfffe33dbe1afb70f4c0c997`.

All fixtures and packaged artifacts are synthetic/code-only. No production backup,
private SQLite, business files, credentials or provider payloads are included.

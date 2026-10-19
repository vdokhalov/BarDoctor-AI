# QA3389 capture batch diagnostics — prepared, not published

Observed v548 failure: POST /api/migration/pos-backup at 2026-10-19T09:39:59.258Z, request53d01f952bd4f5f49fd9f4cfb13e0da4, D1 _sendOrThrow at captureQaBusiness db.batch. Existing logs omit message/cause. Browser confirmed run a29b5dd9-04fa-49ef-82f5-d449413b9660 ABORTED/paused0/POSlegacy at09:40:35. No backup hash, restore or cutover.

## Minimal change

Only the existing capture batch is wrapped. Same statements, order, bindings, transaction and scope; no retries, split reads, alternative export, SQL endpoint or diagnostic query probes. Error strings/codes are inspected locally through at most4 nested causes, capped to8KB per message, but NEVER emitted. A fixed category allowlist covers query/SQL-variable/SQL-length/value/result/memory/storage/daily-read/daily-write limits, timeout, overload, missing table/column, constraints, pause guard, syntax/type/reset/network and generic/unknown. These are recognized text categories, not an assertion of root cause independent of provider evidence.

Safe output consists of fixed stage/phase/category, validated run UUID, statement count and ordinal/kind list. Only a numeric provider `statementIndex` property can be retained; indexing basis is explicitly unspecified. No index is invented from SQL offsets, line numbers or arbitrary messages. If provider supplies no index, it remains null. No raw error message, stack, cause object, SQL, parameters, column names, row data, email or token is logged. Diagnostic failure returns409 with category in code (visible in current UI), and logs one JSON QA_CAPTURE_DIAGNOSTIC event.

When this specific batch fails during resume/prepare CAPTURE, attempt the existing owner/run-guarded abort once. A successful follow-up status must confirm ABORTED/paused0 before cleanup=ABORTED. If abort fails or cannot be confirmed, emit UNCONFIRMED + sanitized cleanup category and pausedMayRemain=true. Normal status/abort on a fresh request remains the recovery route. No automatic abort for COPY/CUTOVER capture checks; active POS cannot be rolled back by this handler.

Cancellation cannot be guaranteed during D1 outage, exhausted invocation budget, owner revocation or process termination. Do not claim it is guaranteed. Reserve an existing owner browser session: after the single diagnostic prepare, always press status; if paused/nonactive, normal abort, then confirm paused0. If that fails, stop and report the remaining pause rather than retrying migration.

## Local shape and official limits (read 2026-10-19)

Synthetic actual route with all current migrations:34 statements in one capture batch,32 SELECT +2 guard INSERT...SELECT; largest SQL693UTF8bytes, max4bound parameters per statement. Of SELECTs:19 business-table reads,12 empty-only counts,1safe profile. Capture classification performs31 table_info PRAGMAs before the batch plus schema/authorization/run reads. These numbers describe current code/schema, not measured production row sizes or result payloads.

https://developers.cloudflare.com/d1/platform/limits/ documents50 queries/invocation Free or1000 Paid,100bound parameters/query,100KBSQL/query,2MBstring/blob/row,30seconds query/batch duration. Per-query limits apply individually inside batch. Worker limits page has separately evolving subrequest limits; do not substitute its generic numbers for confirmed D1 plan limits. Effective Sites plan/config is unknown.31PRAGMAs+34statements is a query-budget hypothesis under the D1 Free model, NOT a proven cause of the v548 error. No row/result sizes are guessed.

https://developers.cloudflare.com/d1/worker-api/d1-database/#batch documents sequential transactional batch rollback on statement failure. This is preserved.
https://developers.cloudflare.com/d1/observability/debug-d1/ documents error.message/cause and examples containing SQL; therefore raw messages are deliberately not emitted here.

## Validation and next request

Local tests cover typical D1 categories, nested/cyclic causes, hostile getters, secret/SQL/stack non-disclosure; real-route injected capture failure with confirmed auto-abort; failed cleanup followed by normal abort on fresh context; original scoped protections. Native full regression is not repeated. A single diagnostic execution may still return UNKNOWN or a category without statement index: safe diagnostic output cannot guarantee exact root cause if the provider exposes none. Stop at evidence obtained, do not promise another publication will necessarily solve it.

Request publication of this diagnostics-only change, then ONE browser prepare for QA3389 after status confirms prior ABORTED/paused0. Read safe diagnostic and final pause status; no automatic second prepare or cutover. Existing v2 recovery harness remains valid: backup format/schema/contract and migration logic are unchanged. No support contact.

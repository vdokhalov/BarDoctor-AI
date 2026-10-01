# Phase 2 D1 failure observability and safe error contract

Production baseline: Sites v469, commit `40f4ed74c38c276fa2425c924d14932f075cdd3e`.
**PRIMARY D1 FAILURE ROOT CAUSE REMAINS: UNKNOWN.** This patch does not claim to fix the primary D1 failure. Production records, schema and deployment are outside this change.

## Problem and behavior

The confirmed QA venue 3317 ingestion correction failed during owner reconciliation in authentication, before its payload was processed. The original exception reached Vinext's `Response(null, {status: 500})` fallback; available production logs lacked the underlying D1 message/code. The patch keeps that operation fail-closed while making its next failure diagnosable and returning a safe API response.

`POST /api/menu/ingestion` now wraps the entire existing CAS command loop in `withInfrastructureErrorBoundary`. This boundary is inside the framework handler and covers session lookup, membership construction, owner bootstrap/reconciliation and the subsequent command. Existing explicit 401/403/409/422 responses pass through unchanged. Unexpected failures return HTTP 500 with `Cache-Control: no-store`:

```json
{
  "ok": false,
  "code": "INFRASTRUCTURE_ERROR",
  "error": "Не удалось выполнить операцию. Изменения не подтверждены.",
  "requestId": "<server-generated UUID>"
}
```

This does not promise rollback for every possible infrastructure failure after a commit; it says confirmation failed. No automatic retry, success conversion or replay is added. Existing explicit client retry/idempotency behavior is preserved.

## One telemetry mechanism

The existing `bd-runtime-observability-v1` AsyncLocalStorage and browser fetch wrapper now cover the exact ingestion and overview route paths. Overview gains correlation/diagnostics only; its error-response behavior is unchanged. Existing supported routes retain their response behavior. No telemetry HTTP request, external logger, storage or dependency is added.

The Worker creates the request context; direct route execution creates one only when absent. A server-generated UUID identifies each request. Valid UUIDv4 correlation headers are reused; invalid values are discarded and replaced. Browser metadata, response `X-BD-Request-Id` / `X-BD-Correlation-Id`, API boundary and D1 envelope share this context. Raw URLs/query strings are never logged.

Named spans connect `auth.memberships`, `auth.ensure_owner_venue`, `owner.reconcile`, `owner.membership_batch` and `d1.batch`. An `infrastructure.failure` event at the nearest observed failing stage records timestamp, normalized route, request/correlation IDs, operation class, auth/owner stages, error classification and current CAS attempt/max-attempt context. Error identity deduplication avoids repeating the same exception at every unwind stage. The boundary event records the controlled 500. Terminal failure events survive the ordinary per-request event cap.

No statement index is fabricated: native D1 batch errors in the tested runtime do not provide a trustworthy statement position. The operation identifies the two-statement owner batch, and any recognized error code narrows its failure class. Account, venue and workspace identifiers remain excluded under the existing metadata-only telemetry policy.

## Sanitization and limitations

Server diagnostics never serialize an arbitrary exception or copy raw message/stack/SQL. Error names, D1/SQLite code tokens and diagnostic message fragments use a closed vocabulary. Examples retained include `SQLITE_CONSTRAINT_FOREIGNKEY`, `UNIQUE constraint failed`, `database is locked` and `Network connection lost`. Unknown message text becomes `[redacted]`; unknown names/codes are omitted or classified as unknown. Constraint targets, SQL, bind values and arbitrary trigger messages are excluded. Cause traversal is bounded and cycle-safe; property getters and logging failures cannot replace the original request outcome.

This deliberately favors confidentiality over retaining unknown free text. If a future failure has no recognized code/message, its correlated operation/stage/attempt are still available, but provider-side traces may remain necessary. A sanitized envelope cannot reconstruct historical details absent from the v469 incident.

The client receives no D1 code, message, cause, SQL, constraint or stack. Session tokens, cookies, Authorization, passwords, uploaded menu/CSV contents and payload/bind values are not telemetry inputs.

## Preserved semantics

- Both owner membership SQL constants and their order in one D1 batch are unchanged.
- Unconditional reconciliation remains in `ensureOwnerVenue`; bootstrap eligibility, five store INSERT OR IGNORE statements, owner recovery policy and membership selection are unchanged.
- No membership/schema/data correction or migration/backfill is included.
- CAS still retries only `StoreWriteConflictError`, at most three times. Only attempt metadata is added; ordinary D1 errors are not retried.
- Authentication and authorization fail closed before payload processing when owner D1 fails. No draft/canonical write is reached in this early-failure case.
- No Menu/Scan/Import business logic, chooser state, taxonomy, readiness, permission calculation or compatibility flow is changed.

## Regression evidence

`tests/infrastructure-error-contract.test.ts` verifies structured responses, request/correlation matching, auth/owner/CAS context, code/cause classification, hostile/cyclic errors, logger failure, secret canaries and existing CAS retry/exhaustion behavior. Existing ingestion atomic-failure coverage now asserts the structured 500 rather than an uncaught handler rejection, retaining canonical and draft-state assertions.

`tests/ingestion-d1-failure-runtime.test.mjs` runs actual registration, authentication, owner SQL, ingestion and Vinext boundary in native isolated Miniflare/workerd D1 with the migrated application schema. A synthetic owner creates an Import draft, updates price to -1 and validates to 422. BEFORE UPDATE triggers then fail each of workspace membership and venue membership separately during the corrected update to 17.

Desktop 1280 and mobile/touch 390 execute the shipped browser wrapper. All four fault cases require correlated structured 500, a sanitized native D1 error/cause envelope, one owner-batch attempt, no framework fallback, and unread business payload. Full snapshots require owner batch rollback (including the successful first statement when the second fails), unchanged membership sequences, drafts, canonical stores and audit. Trigger text deliberately contains the local session token, SQL and payload canaries; none may appear in captured logs or client errors. These are deliberately injected local faults, not reproduction or identification of the primary production cause.

After removing the local triggers, the identical correction succeeds at revision 3, canonical remains unchanged, and both membership sequences still increment exactly once: healthy unconditional reconciliation behavior is preserved. Invalid session and foreign venue remain denied. Outbound/production requests are zero.

The mandatory CI observability step runs both native D1 runtime suites with desktop/mobile enabled. Existing Phase 2 and compatibility browser suites remain required; no assertion, viewport or browser is skipped or relaxed. Phase 2 remains incomplete until separately authorized deployment and full production acceptance.

## Local release gate

- Targeted observability, owner/RBAC, bootstrap, ingestion and CSV tests: 46/46 PASS.
- Full `npm test`: PASS, including 1,348 TypeScript tests, artifact suites, verified build, typecheck and posttest suites. Lint: zero errors, two pre-existing unrelated warnings.
- Both native D1 observability runtime suites: PASS with desktop/mobile enabled. The final fault test also observes actual CAS-cloned Request body reads: zero on each auth fault, one on healthy correction.
- Repeated artifact preparation: 5/5 PASS. Compiled Worker/client release integrity: PASS.
- Full Phase 2 browser matrix: all nine owner/manager/denied, stock-first, desktop/mobile profiles PASS.
- All 24 browser commands in the required verify job: PASS, including Menu/Recipes, Warehouse, POS, permissions/readiness, startup/reload and navigation compatibility.
- Operational Day: all five CI configurations PASS, including cached timezone/month/year boundaries and 600 ms delay.
- Sales navigation: Chromium/WebKit, 390/820/1280 px, delay series through 1,200 ms PASS. iPhone pending Back/Back normal ×3 and delayed 600 ms ×3 PASS on each browser, venue Atelier retained.
- Full unchanged scroll/layout matrix, run separately from other browser suites: 18/18 profiles PASS.

An initial Operational Day invocation was started before build preparation finished and timed out waiting for the closed shift card. That failed run is retained in local evidence; it is not classified as flaky. The complete final five-command Operational Day gate ran after build completion and passed without changing code, assertions or timeouts.

Changed-files review mechanically removes only the telemetry wrappers and reproduces the original auth, owner-access and CAS sources exactly. The ingestion command differs only in its outer error boundary. Both owner SQL constants, schema/migrations and the canonical Menu client bundle are byte-identical to v469. All test mutations are isolated local fixtures; no production API mutation, migration, backfill or membership correction was performed. GitHub must pass every required job at the pushed commit before saving a matching Sites version; production publication remains separately authorized.

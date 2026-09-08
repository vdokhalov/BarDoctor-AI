# Observability-only controlled deployment candidate

## Incident status (before this patch)

- Production restored and stable on saved v420; mobile/desktop basic smoke passed.
- v421 runtime failure was observed in production: authenticated requests reached the client 30-second timeout; same-artifact republish did not restore sustained availability.
- Outside production the hang has not reproduced. Each version passed 96 real local bootstrap/store/selector requests, including a first-client-abort probe.
- Auth/D1/bootstrap source differences between original v420 and v421 are absent.
- Root cause remains unproven because existing runtime observability does not locate the blocking await. Temporal association with v421 is not a proved source-level cause.
- Phase 4 remains BLOCKED. No Phase 5 work or production deployment is authorized by this patch.

## Diagnostic contract

`bd-runtime-observability-v1` emits structured console info, not database records or outbound telemetry requests.
Observed routes: bootstrap, auth (normalized action), store (normalized key), nomenclature selector, users/me. Query strings and arbitrary route segments never enter logs.

- Fresh Worker `requestId` and client UUID `correlationId`; corresponding response headers when mutable.
- UTC timestamp, elapsed/duration, start/end, paired numbered await spans with parent span, response status.
- User scope only unresolved/authenticated/anonymous; venue scope only unresolved/authorized. No raw or hashed user/venue identifiers.
- Auth identity/schema/result/legacy-import/session-issue and membership stages; store/selector loading; D1 all/raw/first/run/batch/exec boundaries.
- Signal abort, known TimeoutError classification, otherwise explicit unknown timeout/cancel source; caught bootstrap boundary and uncaught request boundary.
- Request/response end means **headers ready**, not body delivered. Bodies are never read, cloned, teed or buffered by telemetry.
- Existing signals, deadlines, retries, queries, binding arguments, return values and thrown error identity are preserved. No new watchdog, timeout, auth recovery or cleanup behavior.
- AsyncLocalStorage isolates concurrent execution; native D1 objects remain method receivers. WeakMap unwraps instrumented statements before native batch calls, including separate getD1 calls.
- Per-request server stage log volume is bounded at 256 events; terminal request end/abort still emitted. A missing end can also mean platform cancellation or log truncation, not proven deadlock.
- Client metadata stays in the browser console; no additional fetch/beacon, localStorage or persistent telemetry buffer.

Never logged: SQL text, bind arguments, D1 results, records, bodies, error messages/stacks, headers, cookies, credentials, emails, names, financial values, full URLs.
Console sink errors are ignored, not substituted for application results/errors.

## Tests and controlled-test runbook

Unit tests cover concurrent correlation/scope isolation, unconsumed response identity, D1 binding/native receiver and batch unwrapping, unchanged errors, logger failure, abort and client Request/init/signal forwarding, and privacy canaries.
Real isolated Miniflare test exercises actual auth/bootstrap/store/selector handlers with real Drizzle/D1, 18 parallel cold/warm requests, persisted stock/other selector, paired await spans and zero outbound requests/store changes.
The same test optionally runs the shipped client wrapper in Chromium at 390x844 and 1280x720 against those real handlers; CI enables this in addition to the unchanged full existing browser matrix.

Only after full CI GREEN and explicit approval: deploy the reviewed artifact as a controlled test. Capture browser console `correlationId`, Network timing and Worker events for that ID. Locate the last unmatched span; distinguish client abort from response headers and Worker exit. If the runtime terminates without abort/end, correlate with platform Worker execution logs. Do not call this a diagnosed root cause based only on one missing event.

No migrations, data cleanup, inventory/financial edits, secrets/config changes, or speculative Phase 4 fixes are included. Instrumentation may affect scheduling slightly; a non-reproduction under instrumentation is not proof of a fix. Rollback requires separate user approval.

## Pre-CI local evidence

- Typecheck PASS; ESLint 0 errors, two existing unrelated warnings.
- Focused observability + Phase 4 persisted tests: 28/28 PASS.
- Real Worker/D1 + Chromium correlation QA at 390x844 and 1280x720: PASS (about 28 seconds), with strict matching browser/Worker correlation and no page errors.
- An earlier combined local browser attempt hit the 120-second test deadline; assertions/deadline were not relaxed. The bounded final isolated attempt passed. This is not a new reproduction of the production 30-second incident.
- Mass parallel local unit run was interrupted without a final result; it is not counted as PASS.
- Standard local npm build reaches its checked-in Bash entrypoint, then fails because Bash is unavailable on this Windows host. No replacement build path or CI bypass was introduced.
- Full verified build, complete regression and existing affected-flow browser matrix remain mandatory in the normal GitHub CI before readiness.

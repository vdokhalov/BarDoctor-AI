# Phase 3A.10 diagnostic evidence completion

This diagnostic branch keeps application SHA `e48ac83476850bc33cc433a4ffe21804300da20a`, the original derived-metrics browser suite and the release classifier unchanged. It cannot grant an environment exception or prepare/deploy a Sites version.

Required CI run `37196241467` finished RED: verify-core, verify-browser and sales-scroll-layout succeeded; sales-navigation failed at the WebKit lifecycle gate, and the final verify aggregate failed. Navigation measurement steps were skipped after that failure. The failing occurrence has a proven WPENetworkProcess self-SIGABRT and later auth/cookie disappearance, but lacks its own post-crash HTTP outcome and database/audit snapshots. Historical standalone evidence cannot fill those gaps.

The separate diagnostic workflow uses the same official Playwright packages, Ubuntu 24.04 and Node 24.19.0 as the failed job. Three observations are planned in advance. Original exit codes and all evidence remain separate; this is not retry-to-green and its workflow success is not a release result.

The diagnostic runner creates a temporary copy of the unchanged suite with 12 marked additions. Removing those additions recovers the original source byte-for-byte. Original assertions, actions and timeouts are retained. Tests fail if a source anchor is absent or ambiguous. The generated file is removed after execution.

Evidence includes:

- Append-only ordered records, collector timestamps and original native signal/termination/execve timestamps.
- Explicit original context/page IDs and page creation count; document IDs/origin; credential presence and cookie metadata without secret values.
- Credential removal/clear call stacks, page errors, browser requests/responses/network errors and server receipts with redacted header presence.
- Read-only SQLite snapshots before navigation, at assertion checkpoints, around every API handler, on observed native signals, after failure and before fixture destruction. Canonical domain rows and timestamps, account business profile/timestamps and audit rows are retained. Every table also has a sorted row hash and count, including access/session tables without raw credentials.
- One labelled post-failure Health read from the existing page with its actual current credentials, without recovery or credential clearing. Its actual HTTP response or network error is retained. It does not replace the first natural application request after crash. Observation timeouts infer no HTTP status.

All database reads use the existing isolated in-memory QA fixture. Existing test business writes remain unchanged. No production origin or production database is used. No native crash is forced, no application failure is hidden, and no release policy is modified.

Local controls verify source equivalence, fail-closed anchors, missing/existing-store snapshot immutability, detection of isolated canonical/audit changes, credential redaction, preservation of network errors without fabricated 401, and original classifier negative controls. An instrumented Chromium 1280 control completes the original conflict/close/reload/reopen/foreign-scope assertions with no page errors.

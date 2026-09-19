# Phase 7: canonical period venue and audit D1 diagnostics

Period closing previously persisted the runtime alias `primary`. Receipt ownership
validation correctly rejected that nonnumeric venue even for a later open month.
The closing client and authenticated store boundary now persist the numeric active
venue, retain snapshot/history, and reject explicit foreign venue IDs. Purchase
ownership checks are unchanged.

The separate reproducible `GET /api/audit` HTTP500 is not yet diagnosed. Existing
Worker stacks identify two reads of `audit_log`; filtered CSV export works. The
diagnostic change does not claim to fix that server failure.

## Diagnostic scope

| Query tag | Statement | Parameters (values never logged) |
| --- | --- | --- |
| `audit.overview.activity` | Existing audit projection, `account_id = ? AND created_at >= ?`, `ORDER BY created_at DESC, id DESC LIMIT 10000`; no join/offset | authenticated data-account ID; rolling30-day cutoff |
| `audit.filters.options` | Existing audit projection, `account_id = ?`, `ORDER BY created_at DESC, id DESC LIMIT 5000`; no join/offset | authenticated data-account ID |

CSV remains on `allAuditRows` with its existing filters and bound50000 cap. SQL,
bindings, concurrency, response body/status and authorization remain unchanged.
The wrapper logs once per failed statement then rethrows the exact exception.
It adds no retry, timeout or database write.

Worker-only `bd-audit-d1-error-v1` events contain a static endpoint/query location,
generated request/error IDs, a validated UUID correlation ID and up to four error
cause entries. Known D1/SQLite codes and diagnostic message vocabulary are retained.
Quoted strings, URLs, emails, numbers and arbitrary words are redacted; each entry
indicates redaction. No request payload, SQL parameters, result rows or raw stack
are logged. Unrecognized text is deliberately not copied verbatim. Logger failures
cannot replace the original exception. No diagnostic detail is added to the client.

After separately approved deployment, reproduce the failing journal once and use
queryTag/errorId plus Worker request metadata to identify the D1 cause. Do not
infer a migration or data repair merely from HTTP500. Remove this narrow diagnostic
instrumentation when the underlying cause is fixed and independently verified.

## Regression coverage

Tests exercise the actual GET route's failing statement tags and original error
identity, unchanged CSV and permission behavior, parallel request isolation,
sensitive-text redaction, bounded/cyclic causes and failing logging. The existing
SQLite-backed inventory/audit suite validates persisted audit history and reload.
Period tests cover primary/non-primary numeric persistence, closed-month rejection,
next-month receipt, price14, sale cost42, full refund and repeated request stability.

Production deployment is a separate user-approved step. This change contains no
schema migration, production data script, credential modification or resource reset.

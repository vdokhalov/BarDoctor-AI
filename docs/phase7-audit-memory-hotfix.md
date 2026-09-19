# Audit journal D1 memory hotfix

## Evidence

Production v433 (diagnostic commit 11e41bf) was published successfully. A single
controlled GET /api/audit?limit=1&offset=0 returned 500 on 2026-09-19. Correlation
ID c53fa51d-e1be-422c-ad06-df04a373fad7 linked it to diagnostic error
91bdcf1c-c0d7-46a3-b4d5-5bd447d2c9a1 and Worker request
90afc8509a31462006ac0d6d9bd607ee.

The observed message prefix is D1_ERROR. No separate numeric or SQLite error code
was supplied. The retained message and cause are:

    D1_ERROR: D1 [redacted] [redacted] exceeded [redacted] memory limit and was reset.
    D1 [redacted] [redacted] exceeded [redacted] memory limit and was reset.

Redacted words are not reconstructed as recovered evidence. This identifies a
D1 memory-limit reset, matching Cloudflare's documented D1 isolate memory error:
https://developers.cloudflare.com/d1/observability/debug-d1/

Query tag: audit.filters.options. Source location:
app/api/audit/route.ts:filterOptions. Compiled v433 stack:
dist/server/index.js:37364:17, auditD1Statement :36488:10,
getAudit :37460:41, Promise.all index 2.

The failing statement selects the full audit projection (including before_json,
after_json and changed_fields_json) from audit_log WHERE account_id = ?, ORDER BY
created_at DESC, id DESC LIMIT 5000, no join or offset. Its account binding is
authenticated and is not logged. Overview similarly reads up to 10000 full rows
after a rolling 30-day cutoff. Client limit=1 does not limit either aggregate read.
Both aggregate paths materialized snapshots that their consumers do not need.
The filtered CSV path read a much smaller set and returned 200.

The error is not evidence of schema corruption. This fix requires no schema/data
mutation, index assumption, reset, credential change or retry. The new diagnostic
event contained only static query information, UUIDs and redacted error text; the
client's error response had zero bytes and no internal diagnostic detail.

## Correction and compatibility

Only the overview activity and filter-options projections change. They retrieve
store/action/actor/reason and the three top-level JSON metadata fields needed by
the existing source classifier. Complete snapshots and changed-field payloads
remain in audit storage and in the existing individual journal/CSV queries.

SQL JSON projection preserves the existing classifier's object/array rules,
first non-null field precedence, after-before precedence, JSON types, invalid
legacy JSON behavior and last duplicate-object-key semantics. Row caps 5000/10000,
ordering, account scope, permissions, metric semantics and filter behavior remain
unchanged. No records are discarded and no failures are converted into success.

Regression tests compare actual GET responses and CSV bytes with the raw-payload
projection, cover 10010 rows, timestamp ties, pagination and a foreign account,
and execute projection SQL in actual local D1 as well as SQLite. A synthetic
transfer-budget check demonstrates the avoided payload: 7.85/9.15 MB becomes
1.33/2.66 MB for 5000/10000 rows. This budget is a test sentinel, not an emulation
of Cloudflare's internal allocator or a claim about production data volume.

The existing numeric period-venue correction, snapshot history, period locking,
purchases, costing and sales/refund behavior are outside this SQL change.

Production remains v433 until the user separately approves the final hotfix.
Local/CI success cannot by itself prove the future production response is 200.

# POS order journal — local implementation, not activated in QA3389

Base: print replacement commit 03d1520642479b49a9450dd53216249b4b11fc97. This migration does not migrate the stock or sales-event journals again.

## Storage and atomicity

0035 installs inactive tables. One indexed `pos_order_records` row identifies each order and its current revision, status, shift, position and canonical SHA-256. Core revisions, operations and preparation/cancellation tickets are separate immutable components. Each component is split on Unicode code points into TEXT chunks <=128000 UTF-8 bytes, with count, sequence and hash verification. No single order, ticket, operation or growing history is stored in an unbounded TEXT. Unknown source fields and absent-versus-empty ticket arrays survive migration. Core revisions retain operation/ticket counts and full-order hash for historical reconstruction. Existing components cannot be edited or deleted by normal commands; global operation/ticket IDs are unique within the account.

Only changed orders and new components are written. The small `bd_pos_orders_v1` marker supplies the existing account-wide CAS revision: concurrent order changes, payment, cancellation/writeoff, audit and print intake use the same transaction boundary. Competing writers retry/reject; no blind overwrite. This deliberately preserves account-wide serialization rather than changing business concurrency semantics. Normalized orders bypass the former aggregate 4MB planning guard; legacy arrays retain it until activation. Normalized order audit rows reference durable order revision and operation ID rather than duplicating large payloads.

Readers cover order screens, shift closing, overview, explicit ticket export and cloud print intake. Shift/export selectors are indexed; components are hydrated with a single indexed join per page of 50 orders. Print intake reads only immutable ticket components, without order operation/core history. Compatibility order views and print intake still collect their full selected history in memory: this removes TEXT capacity failure, not unlimited runtime/memory cost or a claim of arbitrary-scale UI pagination. Large individual orders can also cost significant processing. Future retention/pagination must preserve unresolved orders, receipts, cancellation links and delivery deduplication; nothing is silently pruned here. Finance, writeoff and other stores retain their independent existing limits.

## Explicit migration procedure (trusted operator functions only)

No public API and no automatic cutover. Do not run against a real venue under this local implementation authorization.

Before future QA3389 migration, obtain explicit authorization and a fresh recoverable database backup, including the already normalized stock/sales journals and print archive. The built-in POS backup is additionally mandatory: `preparePosOrderMigration(db,bucket,scope)` writes an immutable UUID object, reads it back and verifies SHA-256 before staging is recorded. It contains exact original POS JSON/timestamp and a domain-data snapshot for related references. It is NOT a full database backup: normalized stock/sales rows are not duplicated by this POS-only helper. Retain both backups outside the live DB.

1. Install 0035 without activation. Check correct account/venue and backup access. Helpers validate scope; caller is a trusted authenticated operator, not user-controlled request data.
2. Prepare verified backup; repeated preparation returns the same staged run.
3. `copyPosOrders(..., limit)` copies 1–10 orders per atomic step, retaining original authority. Repeat after interruption. Exact source hash/CAS must remain unchanged; a concurrent legacy edit stops migration. Final verification compares every complete hydrated order and original ordering, not just counts.
4. `activatePosOrders` rereads/verifies backup, compares complete staged content again and atomically switches only the POS marker. Repeating activation is harmless. No other journal is migrated or changed.
5. Verify source counts, open/historical orders, authors, routes, payments, cancellations and print state before resuming venue work. Existing historical tickets do not become new print requests; IDs and print baseline/archive remain unchanged.

Recovery: `restartPosOrderMigration` discards ONLY inactive staging, leaves live legacy data untouched and retains external backups; prepare a fresh backup after any source change. `restorePosOrderMigration` can restore exact original JSON/timestamp and remove staging only before the first normalized write (journal revision zero), with backup verification and CAS. After any normalized write it refuses with `POS_ORDER_ROLL_FORWARD_REQUIRED`: never overwrite new sales/stock/cancellations using a stale snapshot. Post-write recovery requires reconciliation/roll-forward or restoration of a consistent full database backup under a separate operational plan.

## Scoped evidence

See checkpoint logs: isolated real-route lifecycle covers migration, replay, source race/corruption, restore, confirm, cancellation/writeoff/payment rollback, print delivery and author/route preservation. Native local Worker/D1 rejects a 3.9MB TEXT, then stores a >4MB order containing a >4MB UTF-8 ticket through bounded components and cancels it transactionally; no outbound calls. Real Windows hardware remains untested; this change does not alter the Windows transport.

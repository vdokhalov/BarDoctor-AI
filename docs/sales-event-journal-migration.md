# Local sales event journal integration

Status: implemented and locally reviewed; no push, publication, or production activation.
Depends on stock journal 0032 and P1 fixes 953e70c14c855152afe06895e2db52bca65ab5c4.

## Storage and transaction boundary

0033 installs inactive tables. `copyLegacySalesEvents` copies 1–10 legacy events per call; CAS pins exact source JSON and timestamp, and verified state requires identical complete event values/order. Unknown fields survive. The legacy source remains authoritative until `activateSalesEvents`, which also verifies event-derived revenue against existing financial rows, under CAS. `restartLegacySalesEvents` may clear only inactive staging.

Events have indexed identities scoped to the authenticated data account/venue. Unique `(account, source, externalId)` and event ID enforce idempotency. Payloads are split on Unicode code points into chunks of approximately 32,000 UTF-16 units, no chunk over 128 KB UTF-8; hydration verifies sequence/count and SHA-256. A single event can exceed the native D1 TEXT limit without a giant row. Original version-zero payload remains intact after reversal; a unique reversal record and version-one payload preserve the transition. Pre-migration reversed events retain their supplied historical payload; missing earlier evidence is never invented.

Sale/reversal statements, canonical per-revenue-row totals, stock movements, assortment, financial projection, POS order and audit join one existing guarded transaction. Planning reads only the target event and its canonical totals; incremental revenue must match canonical state before any write. Identical retries reuse the original result. Audit references the durable normalized event, avoiding another full event copy in a TEXT audit column. Legacy array behavior remains in place until cutover.

Cashier refresh reads at most 100 event payloads selected before hydration, respecting staff identity filters. POS order refresh reads payment identities for its orders, without event chunks. Shift reports select the requested shift. Compatibility readers for evidence, days, month close, assortment and export expand normalized records explicitly. Raw CAS snapshots are never rewritten for convenience.

## Validation and practical limits

- Normalized stock+events lifecycle including provided 438-movement export and 202 PMR_RUB sale: 9 PASS, no skips (includes new journal scenarios).
- Native Worker/D1: 2 PASS. D1 rejects one 3.9 MB TEXT, while a chunked 4.1 MB event saves, reads, reverses and rolls back correctly; no outbound requests.
- Relevant sales/POS/workday/evidence/account consumers: 118 PASS.
- Exact release guards: 4 PASS.
- Independent reviewer rerun: 5 PASS, no skips. Migration/revenue reconciliation, venue deletion, and cashier refresh findings closed.
- Nonincremental TypeScript: exactly the same five errors as base84bb207a in unchanged staff-pin-roster.test.ts; byte-identical diagnostics, exit2. Not a clean full typecheck.

Suites overlap; counts must not be summed. Commands and logs are in `/workspace/checkpoint/sales-event-journal`.

Full export and some report compatibility readers still collect complete history in memory; arbitrary-scale reporting is not established. POS draft/order and finance stores remain arrays; this change removes the sales-events aggregate TEXT limit, not every unrelated capacity limit. No broad CI/build/browser rerun was performed under the scoped-local agreement.

## Safe activation and rollback plan

1. Obtain separate release/production authorization; inspect a fresh scoped export with both stock and event-related stores. The earlier private fixture lacks historical sales events and cannot prove their production migration by itself.
2. Install 0032/0033 without activating; verify permissions and reader/writer compatibility using a production-shaped offline copy. Rehearse migration, concurrent changes, deletion isolation and rollback.
3. Copy bounded batches; changed source refuses progress/cutover. Restart only inactive staging when necessary. Verify complete values/order and financial reconciliation; unknown or conflicting evidence blocks activation.
4. Use verified CAS cutover under a controlled write pause and monitor sales/reversal/report errors. No automatic schema activation is wired to runtime authentication.
5. Before activation, rollback simply retains the legacy source. After new writes, do NOT restore the pre-cutover array: it would discard sales. Freeze writes, export current reconstructed events and movements, reconcile totals and versions, and roll forward or use a separately rehearsed reverse migration. If reconstructed arrays exceed D1 limits, reverting to legacy storage is not viable; retain normalized storage and roll forward. Back up original and current evidence before any destructive recovery.

No production migration or rollback has been executed by this work.

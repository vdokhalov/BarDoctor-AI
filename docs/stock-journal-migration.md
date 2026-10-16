# Normalized stock journal — local integration

Production activation is not part of this change. Installing migration 0032 creates empty tables and guards; no existing venue is switched automatically. No HTTP activation endpoint is exposed.

## Storage and migration

`stock_journals` binds one data account to its venue, retains the exact legacy JSON backup, source digest, copy cursor and optimistic revision. `stock_journal_movements` holds each movement at a stable ordered position. Indexed fields support identity, product, receipt and document reads; `payload_json` retains unknown fields. Recipe snapshots live in a tenant-scoped content-addressed table. Reads verify their SHA-256 and reconstruct independent values. Snapshot changes on an existing movement are rejected.

Use the service primitives against an isolated D1 binding:

1. `copyLegacyJournal(db, scope, 25)` resumes a bounded copy against the unchanged raw source. Verification compares every complete value and its order. It never activates the journal.
2. If the legacy source changes during copying, copying and cutover refuse. `restartLegacyJournal` clears only unactivated staging; the authoritative legacy source is untouched. Copy again.
3. `activateJournal` separately CAS-checks the source and verified state, then replaces the old store value with a small revision marker atomically. This primitive is used only in isolated tests here. A production migration needs separately authorized scheduling/cutover.
4. Once active, resetting staging is forbidden. The original backup remains available. Do not roll back to it after new transactions: doing so would discard later sales. Production rollback needs a fresh full export and a separately reviewed operation.

Conflicting identities, tenant ownership, malformed rows, missing/corrupt snapshots and stale revisions fail closed. No migration deduplicates movement identities or silently discards evidence. Older incomplete rows without string IDs can be migrated and retained unchanged; new unidentified updates are rejected.

## Operations and readers

Sales-events and POS-orders read latest receipt candidates for catalog products and the selected reversal document; they do not read the legacy backup or reconstruct the full movement journal. The existing JS cost resolver still chooses warehouse fallback, date and tie ordering, including unknown cost. New movements join the same D1 CAS batch as assortment balances, events, revenue, POS order and audit. Duplicate operations return their existing result; competing revisions retry.

Sales-batch and legacy sale-confirm handlers use receipt/document facts too. Their normalized responses identify movement deltas explicitly instead of pretending a partial fact set is a complete history. Legacy-format responses stay compatible. Other lifecycle operations—purchase confirmation/update/cancel/repost, counts, opening, product repair, writeoffs, shift writeoffs and integration writers—read their reconciliation history explicitly and write only changed/new rows. Historical omissions never delete journal rows.

Inventory valuation and current management cost read receipt facts. Stock and captured-cost evidence use indexed product/document/identity selectors. Overview, reconciliation, month-close, old store/bootstrap clients and export retain compatibility through explicit paged history reads. `/api/inventory/movements` exposes bounded keyset pages with a pinned revision; a change requires restarting the page sequence.

Health/AI evidence retains its existing bounded read policy and reports partial/unavailable evidence when the budget is exceeded. It does not turn a marker or oversized history into a healthy empty array. These bounded readers are not a promise of complete unlimited historical analytics.

Export expands every movement and includes the related sales events/batches/writeoff documents. It checks all raw source snapshots again after reading the journal and retries a conflict; integrity auditing receives the actual source documents. Missing source documents remain findings, including in the old five-store fixture that does not contain them.

Generic legacy imports cannot overwrite an active journal. Existing insert-if-absent bootstrap remains valid. The old one-off Cologne currency relabel explicitly refuses normalized storage because its raw-JSON backup/rollback semantics are incompatible; a separate migration would be needed.

## Validation and practical limits

The private fixture remains outside Git. Its 438 movements occupied 1,898,849 UTF-8 JSON bytes, with 306 recipe copies and 88 unique snapshots. Isolated tests preserve every original value/order, accept the previously failing 202 PMR order, export all original plus new movements and reject replay duplication. Synthetic growth exceeds the old 1.9 MB limit. SQLite-backed actual handlers and local native Worker/D1 verify rollback, revision conflicts, deduplication and tenant boundaries; no production requests are made.

This is not unlimited storage. D1 row/binding/transaction limits still apply. An append is bounded to 500 movements; receipt queries accept 50 products per call and fail closed above 500 same-date candidates (the caller batches catalog keys). Full legacy compatibility exports and reconciliation operations still materialize arrays; they are deliberately not used by the normal POS sale path and may require streaming/aggregation at much larger volumes. Individual recipe snapshots must fit a D1 value. Existing `bd_sales_events_v1` still has its separate 4 MB application limit, and revenue/POS orders remain legacy JSON stores. Their normalization is a separate task, not solved by this journal change.

Repository-wide TypeScript currently reports five pre-existing errors in `tests/staff-pin-roster.test.ts`; this change does not modify that file. Scoped tests and exact-byte release guards are recorded in the local checkpoint. No push, publication, production activation, paid AI or new credentials are authorized or performed.

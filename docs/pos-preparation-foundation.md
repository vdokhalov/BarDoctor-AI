# POS preparation confirmation foundation

A saved table order can be reviewed and explicitly confirmed with the checkmark. Confirmation freezes only lines not already present in preparation tickets. Subsequent additions are separate batches. Quick-sale payment remains unchanged; confirmation is not made a prerequisite for payment in this foundation.

Managers (owner, manager, shift_manager with sales.create) configure an active canonical menu sectionId to a logical printer ID/name through /api/pos-preparation. Menu section taxonomy remains the only department source, including custom departments. Stock warehouse routing is independent. Unknown/missing section assignment blocks confirmation instead of guessing from legacy labels. A valid section without a configured printer produces an unconfigured ticket.

Tickets live inside the venue-scoped POS order and snapshot section, printer route revision, actor, time, table, item names and quantities. Configured tickets are pending; unmapped tickets are unconfigured. Neither means printed. No hardware transport, local bridge, credential storage, automatic resend or physical delivery guarantee is implemented. Changing a route does not retarget previous tickets, including unconfigured ones.

The existing operation identity, expected revision, store CAS, current membership transaction guard, workday/shift/month checks and audit cover confirmation. Confirming the same operation again returns its committed result; a new operation with no new lines fails. Confirmation performs no sales, revenue or stock posting. Normal payment remains a separate operation and retains the ticket snapshots.

Confirmed quantities cannot be directly changed or split. A manager can cancel all or part of a confirmed line with the existing privileged cancel_item operation, a positive cancellation quantity and a required reason. Each operation appends an immutable CANCELLATION ticket, displayed as ОТМЕНА, linked to the original ticket/order and carrying the original route/section snapshot. The preparation ticket remains unchanged; remaining bill quantity equals original quantity minus all corrections. Repeated operations cannot append duplicate corrections; cancelled line IDs cannot be reused. New unconfirmed lines remain editable and additions need a new confirmation.

Cancellation of confirmed lines requires an open unpaid order, open cash shift/month and the ordinary workday gate. Precheck and discount locks still apply. Direct staff requests and revoked in-flight manager rights are denied. A whole order with remaining confirmed lines cannot be silently cancelled; cancel the lines explicitly first, then close the empty draft with the existing cancellation operation. Splitting any ticket-bearing order remains unsupported.

Preparation confirmation/cancellation performs no stock or revenue posting. Payment posts only the remaining quantities once. If an item was already prepared and must be treated as consumption/waste, that requires a separate explicit stock-writeoff decision; this feature creates no automatic disposal/return movement. Paid receipts and their stock postings cannot be changed through this operation. Discounts/payment may update financial values without rewriting preparation documents.

Configuration is a private domain_data key, excluded from bootstrap and inaccessible through generic store-key endpoints. Tickets use existing POS visibility; there is no separate department queue console or printing worker. Limits fail closed (100 tickets per order, 200 routes and 500 configuration operation identities); operation histories are not pruned unsafely.

Validation:
- node --import tsx --test tests/pos-preparation.test.ts tests/pos-quantity.test.ts: 16 PASS.
- node --import tsx scripts/pos-preparation-browser.ts: one Chromium 390x844 synthetic flow PASS, real isolated handlers/SQLite; route setup, confirmation, lost response/reload/retry, delta addition and partial cancellation with original-ticket reference, lost cancellation response/reload/retry, no duplicate, no horizontal overflow or page errors. Not physical iPhone testing.
- npm run build: PASS, verified Sites artifact. No publication.
- npm run typecheck: blocked only by pre-existing business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10; no new POS diagnostics.

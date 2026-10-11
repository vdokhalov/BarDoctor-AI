# Незакрытые счета — review before release

This change adds a venue-wide unpaid account list under Sales, using the existing
POS orders read and access rules. The selected unpaid detail is separate from the
selected cash session and editable POS order. Opening a historical account makes
no request per shift and does not move the account, cash selection or quick draft.
The existing Sales/app shell remains; management uses More, restricted POS staff
retain their Sales-only navigation.

## Grouping and amounts

- CURRENT requires a uniquely linked OPEN cash session and its OPEN workday.
  Midnight does not make the account historical.
- PAST covers a uniquely linked closed cash session or the legacy closed-workday
  case. Stored historical line prices, discounts and totals are not repriced.
- Missing, duplicate, invalid-date/currency or ambiguous active links show REVIEW.
  They never appear current and cannot be cancelled in the list.
- Shift identity/date/status are projected through a whitelist. The change does
  not widen paid-history, payroll or COGS access. The existing snapshot and an
  in-memory shift/payment index are reused; there is no new request per account.

## Cancellation boundary

Whole unpaid cancellation retains the existing privileged permission, required
reason, authenticated actor, revision CAS and operation idempotency. Any linked
sales event or payment/partial-payment evidence blocks cancellation. Closed months
remain locked. Order plus audit are the only writes; stock, revenue, closed-day
report and closed cash report are unchanged. The old precheck remains in audit;
the cancelled draft clears its active precheck and retains its discount/totals.

For OPEN cash, the ordinary workday gate still applies. Its only recovery
exception is exactly one CLOSED workday of the source date with no other OPEN
workday and a unique OPEN cash session. Missing/duplicate workdays and multiple
OPEN cash sessions are not recovery exceptions. An unpaid account linked to an
already CLOSED cash session may be cancelled without changing that snapshot.
After cancelling the last unpaid legacy account, normal cash closure is possible.
New sale/payment against a CLOSED workday remains forbidden. Paid refunds and
partial-payment recovery are not introduced.

## Validation and release state

Targeted evidence includes actual route + isolated SQLite CAS tests, competing
payment/cancellation writes, reason/audit/replay, negative role/venue/payment/month
contracts, overnight grouping, immutable historical pricing, legacy empty close,
Chromium and native WPE WebKit at 390/1280 for owner/shift_manager/cashier, entry and
exit via the app shell, saved quick draft, unchanged cash selection and pending
operation preservation. Existing POS recovery runs 262 API calls at 390/820/1440.
Stale-response race assertions remain intact. Local typecheck, targeted lint and
build are required; screenshots and exact logs are in the Library checkpoint.

The performance comparison uses eaf0c3a9 and the candidate under the same 1200ms
API delay: opening the unpaid tab and a historical detail adds zero API requests.
Single-run timings are diagnostic, not a statistical latency claim.

Several older test fixtures needed the previously introduced OPEN-workday/team
prerequisite or the stale-load helper included in their VM extraction. Their
business assertions were retained. No migration, hosting, production data, full
CI or publish is part of this review change. Release remains separately gated.

# Fresh journal defaults and current financial presentation

## Storage change

A shared creation-only initializer inserts both active empty stock/sales journals and
both revision-zero markers in the same D1 batch as the venue row. Source hashes describe
an empty array, not invented migrated history. Access reconciliation follows that commit.
A durable signup initialization status makes concurrent signup/bootstrap use the same
normalized path; failures inside the batch roll back the workspace/venue/journal pair.
Normal authentication of existing accounts does not convert their legacy data.

Creation paths covered:
- POST /api/auth/register for a new owner and first venue.
- Concurrent bootstrap/login recovery of a pending fresh signup.
- POST /api/venues via createVenueForOwner, including the existing service branches for
  an owner with an active venue or identity-only management after no active venue remains.
- Invite signup joins the existing venue; it must not initialize or migrate its journals.
- Legacy import/provisioning is intentionally unchanged; it is not a clean signup.

Initializer retries preserve existing normalized data/revisions. A partial pair, foreign
actor or existing legacy source fails closed. This does not introduce a generic
idempotency key for POST /api/venues: separate successful create requests still mean
separate venues. Receipt/sale retry and initialization retry are tested independently.

Evidence: six isolated route/storage tests; native Worker/D1 initialization with injected
final failure; first receipt/sale and canonical reads for both creation endpoints; original
account unchanged; partial markers rejected; concurrent bootstrap; growth to 440 stock
rows / 2,266,661 bytes and 24 captured events / 2,202,389 bytes. All original JSON and IDs
survive bounded writes/pages. These synthetic totals are not a measured production SLA.

## Honest capacity / readiness boundary

After publication, genuinely new venues start normalized and do not need migration to
escape the old 1.9 MB JSON journal / silent eviction behavior. Existing data is untouched.
Stock append accepts at most 500 movements per delta; stock pages at most 500. Event
payloads are chunked (32,000 code units); scoped/page readers and revision checks remain.
Growth test uses 20-movement and 2-event pages below 200 KB, not an unbounded response.

This is not certification of unlimited months of all application data. Full compatibility
exports can still materialize complete histories; Health/cost projection readers retain
10,000-row / 2,000,000-byte limits and may refuse an oversized result without deleting
stored history. Hosting database quota, long-term growth performance, universal automated
backup/restore and disaster recovery are not established by this task. The explicit
legacy migration backup is not an ongoing backup for new venues. General backup recovery
for arbitrary accounts is not certified here. Catalog/balances, revenue/expenses/payroll,
purchase documents, POS drafts/orders, operational reports, attachments and audit retention
were not re-audited. No claim of blanket readiness for all real business data is made.
The production default gap remains until this exact new build is published and verified.

## Finance presentation change

Home and monthly presentation use canonical resultAfterCost when both it and costOfGoods
are finite numbers (zero included), labelled current result after cost. They retain the
separate closed-month status. Explanation is selected for the displayed metric: known
cost never accompanies the old before-cost explanation. Current known result renders
its chart even with operatingResult/finalProfit null and isClosed false. Missing cost or
other inputs keep explicit reasons; error/loading never substitute an invented zero.
Backend formulas, financial history and close-month authorization are unchanged.

Current calendar period is already computed in venue timezone. A boundary regression
covers Oct31 23:59:59 → Nov1 00:00:00 Europe/Chisinau: November rows become the current
period without closing/deleting October. Existing history is unchanged.

No production writes, new live accounts/venues, credentials or deployment in this task.

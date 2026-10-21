# Financial journal period reads (local, based on v571)

Scope: current Finance in Health and verified month-close. No production writes,
new accounts, credentials, migration runs, backup runs or deployment occurred.

Normalized event/stock inputs are selected by business date before hydration,
using existing verified projection/page readers. Event captures keep full batch
cost operands; stock projections omit only the recipe snapshot after its hash
and nested ownership checks. Source markers and revisions are unchanged.
Documents, batches, reconciliation attestations, payroll, inventory snapshots
and opening sources retain their existing complete inputs. This is not a new
ledger, stock calculation, backfill, or change in cost policy.

Health full-history consumers retain their original data or explicit PARTIAL.
Only current Finance receives the independently verified period projection;
the manifest exposes its period, state and original source revision separately.
Stock quantity anchors and past operational signals are not replaced with a
monthly subset. A bounded metadata budget check avoids hydrating a full stock
history already known to exceed the existing budget.

Found and fixed during the fresh-journal regression: stock appends occupy
negative positions. The bounded stock reader's initial -1 cursor skipped them.
The initial cursor is now null, like the existing full journal reader. This
includes new adjustments without changing a movement or reposting stock.

Schema 0040 adds only stock_journal_period(account_id,effective_date,position).
Period SQL explicitly uses the date indexes, with separate undated candidates;
selected malformed dates fail closed. Apply the additive index before the new
Worker. No DROP, data rewrite or journal activation is involved. Old code can
operate with the extra index. Missing index fails closed, not a legacy fallback.

Validation: 20 scoped tests PASS (health-reconciled-history,
current-finance-cost-chain, current-finance-v556). Growth fixture adds 10,001
old events and 10,001 old movements beyond both historical row/byte budgets.
Current revenue 31087.40, payroll 9135, captured COGS 7826.69, adjustment -12,
after-cost result 13632.96 are preserved. Seven explicit reconciliation links
remain counted once. November starts a new period without erasing October;
October opening and November closing inventory snapshots remain available.
Hash/chunk/version/revision/nested-ownership failures remain unknown. Known
zero and missing-cost cases are covered. Reads leave all captured persistence
unchanged. Existing legacy route fixtures were explicitly marked legacy after
fresh signup changed to normalized storage; production guards were not relaxed.

Build PASS, unchanged client asset index-BQGspy0I-b04b831c8106.js. Typecheck has
only the previous business-health-snapshot.ts:372 union and
health-partial-operations-v539.test.ts:10 cast errors. No broad suite or live
latency/SLA claim.

Remaining bounds: 10,000 rows / 2,000,000 projected bytes per selected journal
period, with bounded hydration and oversized-row rejection. A month exceeding
these limits still fails closed; this change does not provide unlimited monthly
throughput. Other JSON stores and full-history operational/stock-proof readers
retain their existing limits. No claim of complete multi-domain storage scaling.

Recovery remains separate: existing QA3389 scoped backup evidence is 11 SQLite/
POS tests plus one synthetic native Worker/D1/R2 restore/rehearsal, recorded in
/workspace/checkpoint/qa3389-pos-backup-prepared/README.md. This is not proof of
full recovery for a new real account. Actual project hosting quota/usage remains
unavailable from the exposed metadata; no quota guesses or support contact.

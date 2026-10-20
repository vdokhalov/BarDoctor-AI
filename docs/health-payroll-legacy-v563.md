# Health payroll legacy venue normalization

Base: v562 / 10d261b5fc8ce14d15771eae42c391d31f6b6cdc.

Only the canonical Health reader changes: parse its already-read profile before source processing, then apply Finance's existing normalizeLegacyPayrollEntries to a structurally validated bd_payroll_entries array before recursive ownership validation. No normalization of other stores. Source revisions continue to hash original persisted JSON. No migrations or data writes.

The adapter accepts only the exact account-local profile.id || profile.name || primary key. Unknown text, foreign numeric venue IDs, workspace/account and nested ownership conflicts retain fail-closed behavior. Existing byte/row limits and malformed-source handling remain in force.

## Scoped verification
- tests/health-payroll-legacy-v563.test.ts: 11 scenarios, 12 TAP tests including parent, all PASS against actual loader/auth/month route and isolated SQLite.
- Five legacy entries: source AVAILABLE, recorded9035 + bonus100 = payroll9135 once; no PAYROLL and no missing payroll dates. Health/Finance current payroll and pre-COGS result agree.
- Exact raw source revision retained; domain_data byte-for-byte unchanged by reads.
- HISTORICAL_SALES_COST_MISSING and UNLINKED_SALES_CONSUMPTION remain; resultAfterCost and finance score stay null.
- Unknown string, foreign numeric venue, foreign workspace/account, nested foreign venue/workspace/account, malformed element, row limit and byte limit remain PARTIAL with unknown payroll.
- Typecheck: only the two previously recorded baseline errors at business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.

No live QA3389 records or history changed, no paid AI, no broad audit. Parent/browser worker owns the post-publication read-only comparison. Synthetic fixtures verify contracts; actual post-publication values must be checked separately.

Final npm run build PASS: emitted versioned assets, monthly navigation, Worker default.fetch and hosting manifest gates. Compiled Worker contains the payroll normalization call.

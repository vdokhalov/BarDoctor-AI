# Cashier draft restoration and totals Back guard

Base: v561 / af16b6e48d11e0305db88dc8ef78a09e229b5821.

Cashier startup now restores the persisted workspace before its first working render, reconciles the quick draft to the selected POS session, and persists that reconciliation. Previous session drafts remain in byShift. Pending requests keep their original command and shift; no automatic payment runs. A populated draft without a shift remains intact and blocks new payment for explicit review. assertQuickShift remains unchanged. The precise stored-draft variant in live QA3390 is unproven.

The Back link from manual shift totals uses the existing unsaved-changes dialog. Cancel and Escape preserve entered values; discard navigates to the link destination. Saving remains explicit. Other navigation mechanisms are outside this correction.

## Scoped evidence
- 17 PASS: pos-shift-selection-recovery.test.ts and cashier-dialog-recovery.test.ts.
- Real API/SQLite + Chromium390 browser flow in scripts/cashier-shift-recovery-browser.ts: 4 PASS.
- Previous-session workspace and empty unbound draft: closed manual200, new POS, service300, payment confirmation, reload; exactly one sale in new-pos and combined daily500. Exactly two sales requests (preview + post), no replay on reload. Previous-session draft retained.
- Previous pending: original quick draft and pending preserved, zero sales writes before/after reload.
- Populated unbound draft: unchanged and recovery blocked, zero sales writes before/after reload.
- Totals Back cancel and Escape retain edited cash121 and remain on the totals page.
- Fixture primes the normal authenticated shell before seeding a saved workspace; first-ever login intentionally clears prior access-context data.

No live business data, QA3390 history, paid AI, or broad audit touched. Live post-deployment browser QA belongs to the parent. Chromium390 only for this correction; WebKit not exercised.

Final production build PASS, including versioned asset, monthly navigation and Worker default.fetch/hosting checks. Emitted cashier.js and sales-accounting.js match tested source. No full typecheck repeated for these JS-only product changes.

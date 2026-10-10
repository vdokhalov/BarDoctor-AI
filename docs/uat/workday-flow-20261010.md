# Working day and POS follow-up review

Base: production v506, `957d4c95dc9db704c46c2e3e6aa9a4797c6ac06b`.
Publication is on hold for the user's separate approval. This change uses the existing `/shifts` screen and `bd_operational_reports_v1`; it adds no tables, migration, HR module, payroll ledger, or accounting formula.

The existing Shifts screen now opens a working day with its date, start time, and team. Employee selection uses collapsible groups from Team's actual position/custom position fields, including “Без должности”; access roles do not determine groups. Selection survives collapsing. Working employees, hours, payroll results, cash state, sales, and operation counts stay on the same screen. Closing reviews each cash session separately, requires complete payroll inputs and explicit operation confirmations, then records the daily payroll once. The view groups multiple cash sessions into one working-day row without inserting artificial Finance revenue rows.

`/api/workdays` permits owner/manager/shift_manager with the existing shifts/team permissions. Administrators receive scoped employee requirements and results, not payroll rule definitions or rates. OPEN reports have no recorded payroll. The server preserves existing Wz/Kz arithmetic, blocks missing input, detects changed payroll before closing, and checks revision, role/membership, venue, closed months, cash state, operation counts, CAS, replay identity, and audit. An active working date carries into later cash sessions after midnight; existing legacy cash behavior remains available without an active working day. Old reports remain readable/editable through their existing flow; the old operations editor cannot change a new working day's team, payroll, or close state.

Cashier is directly available from Home, More, and Shifts. Initial quantity can be chosen when adding an item; saved and quick orders expose quantity controls. Staff may decrease/remove an unpaid line before precheck. Precheck cancellation remains managerial, and discount/version/closed-order locks remain enforced. Quantity changes create no stock or revenue until payment. Action-panel expansion survives refresh, and successful recovery clears only transient connection messages.

Validation on isolated local data:

- 48 targeted server/domain tests passed, plus the final four-test workday hardening rerun.
- 15 cashier discovery/More/navigation contract tests passed.
- Working-day browser flow passed at 390 px (owner) and 1280 px (shift_manager): 12 employees, five groups, preserved selection, hours, automatic POS sales, payroll 1600 once, cash reconciliation, one stock movement, and zero additional payroll-entry records. Mobile also saves one incident exactly once; desktop explicitly confirms none.
- Legacy report browser flow passed at both widths: three cashier entry points, unchanged revenue 20, recorded payroll 70, reload, panel preservation, connection recovery, initial/saved quantities, and precheck locks.
- Earlier POS regression passed 259 real API calls at 390/820/1440. New quantity-payment coverage confirms final quantity 2, revenue 40, stock 20→18, and idempotent replay.
- Typecheck passed. Changed-file lint passed; the initial fragment-only unused declaration warning was removed through an exported source fragment. Patch reapplication produces the same client SHA256.
- Full client prebuild passed after preserving unique anchors for consumed deep links and the added More entry. Production artifact build result is recorded in the checkpoint log.

No new whole-application CI was requested or dispatched. Browser checks use desktop Chromium mobile emulation, not hardware iPhone. No real venue data, paid AI, or monetary operations were used.

Known product boundaries remain: no paid refunds, mixed tender, fiscal integration, kitchen/printer integration, or physical-device assurance. UI labels distinguish provisional daily payroll from recorded payroll and never replace missing inputs with zero. Cash-session snapshots remain separate from the current daily report.

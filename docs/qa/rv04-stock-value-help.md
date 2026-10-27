# RV04 — stock valuation explanation

Baseline v664, 6a7907e30ac3b2cb31bb0ccad9fc1f19c9632f36. Presentation-only local change.

The stock value KPI keeps its number and existing label. A 44px question-mark button opens a native dialog, visually consistent with the existing Finance help. Known value copy: «Стоимость рассчитана по последней закупочной цене». Partial/missing values do not claim completed valuation. No formula, document, storage, cost history, role or API changes.

The native dialog has an accessible name/description, keyboard focus handling, Enter activation, Escape and «Понятно» close, backdrop close, and cleanup on Back/unmount. Reload starts closed. The KPI label wraps independently on narrow tablet columns rather than being squeezed by the button.

Targeted calculation suite: 8 cost-basis-phase2 tests pass. The existing latest-confirmed-receipt method remains unchanged; historical known COGS is not revalued. Browser coverage uses an isolated fresh account with canonical stock-journal receipt data, actual handlers, and final built client assets. Known value 132 and missing price are both checked. No production requests or data writes.

Verification limits: browser accessibility semantics and keyboard behaviour are checked, not a physical screen reader/device. Typecheck retains only business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10 baseline errors. No deployment or source push.

Final checks passed: verified build; all 8 targeted costing tests; actual browser flow for known/missing price, Enter/Escape/focus return, «Понятно», Back/reload, 44px target, non-overlap with the value, and 390/820/1280 layouts. Screenshots visually inspected. Existing other warehouse action buttons remain cramped in the narrow 820px app column; that pre-existing layout was not expanded into this task.

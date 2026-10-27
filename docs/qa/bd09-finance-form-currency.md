# BD-09: finance form currency

Baseline: v657 / bb380008b4f2ad8895abd08b2fd236f1abfb8442.

## Cause and scope
The emitted client hardcoded ₽ in both visible labels and aria-labels in `bdPayrollEntrySheet`, `bdRecurringSettingsEditor` and `RAe` (manual expense editor). These labels did not read the current venue currency.

Each now reads the existing reactive profile hook `Un()` and a presentation-only currency label helper. MDL/EUR/USD/UAH/RON use their codes, PMR_RUB uses «руб. ПМР», RUB uses ₽. Missing/unsupported helper input uses «валюта не указана» rather than assuming RUB. Amount, validation, save/cancel, percent and calculation code is unchanged; a source comparison test asserts this narrow boundary against the baseline.

No API, store, permissions, history, financial formulas or conversion changes. Editors retain explicit save. No migration to a new editor shell.

## Verification
- 13 targeted tests: all seven supported currencies, missing input, actual compiled component rendering of visible/accessible labels, blank salary/expense values, percent mode, reactive profile read on rerender, and unchanged save/calculation code.
- `bash scripts/build-verified.sh`: PASS, finalized client and artifact validation.
- `npx tsc --noEmit`: only known baseline errors at business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10. No new errors.
- Compiled UI with isolated SQLite fixture and native handlers: MDL, PMR_RUB, EUR; tax and utility fixed-mode forms, salary operation, manual expense form; 390/820/1280, empty amount, enter 12.50, close/reopen and reload. Accessible name checks; no horizontal overflow; no page errors or non-bootstrap write requests. Settings wait for initial asynchronous loading before editing.
- Form hooks re-rendered against changed profile currency in component tests. Browser runs use separate authenticated local contexts for currency fixtures; real multi-venue picker switching and physical screen-reader/device use are not claimed.
- Screenshots: outputs/bd09-currency/settings-*-*.png, payroll-*-*.png, expense-*-*.png. Mobile MDL payroll and PMR settings inspected.

## Limits
No live verification or production writes. No full regression. Other equipment/demo currency text is outside BD-09. No publication or push. Audit symptom reproduced from current baseline code and equivalent isolated screens, not by editing real accounts.

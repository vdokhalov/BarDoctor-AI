# Sales accounting UI correction (2026-10-20)

Fixes the two defects identified in v559 scoped QA:

- Journal rendering no longer dereferences the removed manual-grid action. The totals link remains the supported manual flow.
- Changing dates with unsaved totals opens a local confirmation dialog. Stay/Cancel/Escape retain the original date, every field and the pending save identity. Discard changes the selected date without writing financial or stock data. Returning fields to their original values avoids unnecessary confirmation.

Verification: journal renderer regression 2 PASS. Real page assets with synthetic local API/SQLite fixtures in Chromium 390x844 and 1280x900 PASS: direct journal, Back from totals, reload, refresh; date cancel, Escape, confirmed discard, clean date change, reload, all persisted rows unchanged, dialog actions visible, no page errors. Production build and emitted resource/Worker gates PASS. Existing 19 scoped unit/integration PASS retained without rerun. WebKit unavailable; live tomorrow boundary remains pending date. Production data untouched.

Publication authorized by user at 2026-10-20 11:12:19 UTC, including both fixes and release. Scope does not add general Back/reload unsaved-draft protection.

# Personal sales and payroll precision

Workday payroll previously required manual personalSales and rounded each employee's sum to whole currency units. It now uses the existing cash report's net paid revenue by order author (the report's existing fallback is sale actor, then batch creator), joined through venue_memberships.employee_id. No name matching or attribution of a venue's total to a selected employee.

The automatic basis covers all cash sessions of the selected operating date. Reversed events do not count. Foreign currencies, inconsistent reports, missing sessions, missing/ambiguous employee links or missing authors remain unknown. Zero is available only from complete cash evidence with an established identity. Manual values, including explicit zero and legacy values, retain priority; clearing the input restores AUTO. AUTO is recomputed on preview/save/close. An altered payroll must be saved and reviewed before closing.

The team operation remains an explicit save. UI shows the cash basis separately from the optional manual override. Employee totals round once to kopecks, department and grand totals retain monetary precision. Rates and monthly divisor are unchanged. GET and closed days preserve recorded payroll; no backfill or data migration. Saved drafts remain estimates until the workday closes.

QA3389's 60 PMR is not assigned to Anna without authenticated attribution evidence. A fixed shift-rate rule intentionally needs no hours input. This patch does not add ad-hoc bonuses or a new rule editor.

## Existing product comparison (2026-10-19)

Poster documents fixed hourly/shift/monthly pay plus personal/shift sales percentages, attributes personal sales to the person opening the check, and keeps historical periods unchanged after rate edits. This supports reusing the order author and preserving recorded payroll, without importing category rules or changing our agreed monthly divisor: https://knowledge-base.joinposter.com/ru/how-to-set-up-payroll-and-salary

iiko's official personal-page documentation describes separately displayed motivation-program accruals (page is JS-rendered; limited indexed evidence): https://ru.iiko.help/articles/iikofront-8-8/topic-5 . No unverified iiko formula was adopted.

r_keeper's official indexed financial-module page describes manual salary accrual documents; opening it failed, so no automatic formula is inferred: https://docs.rkeeper.ru/rk7/latest/nachislenie-zarplaty-61868049.html . This distinction reinforces keeping calculation separate from final accrual.

## Scope of verification

Isolated route lifecycle and calculation tests cover 974.60, explicit zero, automatic refresh, reversal exclusion, unavailable evidence, reload, close, immutable historical totals and existing permission/closing gates. No production read/write, push or publish.

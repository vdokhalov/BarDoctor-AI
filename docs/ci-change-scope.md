# Conservative presentation CI

The workflow always starts and retains the `verify` aggregate. It uses the
classifier from the immutable base revision, not a replacement supplied by the
change being classified. Missing history/classifier, manual runs, unsupported
diffs, classifier failures and unknown outcomes cannot yield a narrow success.

Only modifications to existing presentation declaration values in
`public/sales-journal.css` qualify. This sheet is loaded by both Sales Journal
and Sales Entry. The narrow job covers those consumers plus their Cashier
roundtrip: Chromium geometry at 390/820/1280, touch POS/manual-entry flow,
Chromium and WebKit navigation and scroll at mobile/tablet/desktop widths.
Existing release byte guards and Sales contract assertions remain mandatory.

A companion release-manifest edit may only replace the already-listed CSS
file's `after` hash, bound to the before/after CSS bytes. Adding a newly approved
path, changing guard code, changing other manifest fields, or failing the guard
requires full CI or blocks the run. No approval is created automatically.

Shared shell/navigation styles, new selectors/rules/imports, JS, auth, data,
dependencies, build, workflows, unknown paths and mixed changes use all five
original jobs, unchanged. The current shared-shell v519 correction therefore
still requires full CI. Broader stylesheet coverage must be reviewed explicitly
before expanding the allowlist.

Unselected jobs are visibly skipped, never fabricated as successful. `verify`
accepts only successful classification and successful selected jobs, and requires
unselected jobs to be skipped. Failed, cancelled, missing or skipped selected
jobs fail the aggregate. No protected-branch settings are changed. If protection
requires an individual full job, a narrow run does not satisfy that requirement;
use the full workflow_dispatch path instead of changing protection silently.

This rollout itself takes the full path. It is separate from the saved Sites
v519 source and must not trigger a Site rebuild or publication.

## Owner-approved cashier extension (2026-10-15)

The owner explicitly authorized this separate CI policy rollout without full CI,
then scoped validation and publication of the embedded cashier top-inset fix.
This supersedes the preceding full-rollout requirement for this rollout only.
The two rollout commits carry `[skip ci]` to prevent PR15's cumulative old-base
comparison from launching full CI. Full is NOT RUN, never reported as PASS.
No branch protection or ruleset is changed; PR15 and main are not merged.

The allowlist also covers existing presentation values in `public/cashier.css`.
One exact additive rule is allowed: the reviewed max-width:600px embedded-only
body padding reset, with its exact comment. Other bytes must be unchanged for
that addition. Other structural edits still require full CI. Mixed CSS files,
logic, data, unknown paths and guard-policy edits still require full CI.
The presentation job additionally checks embedded and standalone Cashier at
390, 600, 601, 820 and 1280, top alignment, mobile bottom seam and touch Back /
inner scroll. Safe-area dimensions are simulated, not a native iOS swipe test.
Release byte guards remain exact; new path approval is explicit in the product
commit and does not qualify as an automatic narrow manifest update.

Future small PRs based on the working branch use its trusted base classifier.
The cumulative PR15 against its older base still takes full CI unless an explicit
owner-authorized one-time skip is used. Do not treat its pending checks as success.

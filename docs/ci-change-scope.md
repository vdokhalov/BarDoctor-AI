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

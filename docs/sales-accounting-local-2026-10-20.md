# Venue sales accounting: local implementation

Baseline: `70db05fce306c270a438ed91675a724d2c5bc9f0`. Not deployed.

## Behaviour

- New registration / new venue / first empty venue setup defaults to POS. Existing venues with no setting retain legacy/import behaviour; authentication does not migrate them.
- Owner-only mode command appends an immutable effective-date entry. It requires all workdays, cash shifts and orders closed, and starts on the following venue-local date. Pending changes cannot rewrite an earlier entry.
- Each workday captures its sales mode. Revenue rows retain source identity. POS and order commands use the setting and revenue snapshots inside their existing CAS transaction.
- `/settings/sales-accounting` and `/sales-totals` use existing sales colours/buttons, scoped CSS, existing header/back navigation and venue currency. Settings gets a link in its existing card. The ordinary manual-quantity entry is replaced by totals; historical batches and imports remain readable.
- Manual totals are one authoritative row per venue/day: cash, card, optional receipts and optional owner-declared COGS. Empty is unknown; explicit zero is known. Every correction requires the current revision and a reason; prior values, actor and timestamp remain in the row and audit log. No inventory write occurs.
- Finance uses the existing formula, shared expenses and recorded payroll. Manual COGS has `OWNER_DECLARED` provenance and is not represented as a captured recipe cost. Current Finance exposes `costBasis`. Missing COGS/receipts stay unknown. The existing Health margin bands and confirmed closed-loss guard remain unchanged.
- Generic revenue sync and the old shift-close adapter cannot manufacture or rewrite managed monetary facts. Operational report data still uses its separate existing workflow.
- A conflicting or closed-period import is saved in `bd_sales_import_review_v1` without recognizing revenue or consuming stock. It is visible to the owner from the new screens. An owner may explicitly replace a **versioned manual total** with the exact staged full report, using the expected manual revision and a reason. The normal recipe/stock checks still apply, and replacement, stock posting and audit are atomic. Old manual values remain in `sourceHistory`; their COGS is not counted again.

## Compatibility decisions

- An additional imported report for a day with an already recognized import is staged for coverage reconciliation instead of automatically summing potentially overlapping reports. There is no automatic merge/replacement of multiple imported reports in this change.
- Legacy unversioned totals (including QA3389) are not eligible for the new manual-to-import replacement. Their repair requires a separately scoped operation.
- A pending import with no versioned manual total remains staged; the UI does not offer an unsafe replacement. Neither this nor switching modes retroactively reinterprets a day.
- Recorded historical payroll is not silently recomputed when a manual total is corrected. Existing workday payroll editing/closing continues to own payroll. No per-waiter allocation is invented.
- No new database tables, production data changes, push, deployment, paid AI, or credentials.

## Verification

- Initial focused finance/history/personal-sales run: 77 PASS. This was a milestone run, not a claimed count of unique final tests.
- Scoped POS API/workday/revenue/cost-chain integration run: 19 PASS.
- Latest feature + reconciliation run: 14 PASS, including venue-local dates, role checks, CAS race with a newly opened day, unknown versus zero, retry/revision handling, late import staging, explicit replacement and Finance/Health parity.
- Chromium UI at 390×844 and 1280×900: PASS. Mode selection/confirmation, save, reload, correction and explicit staged import replacement exercised against the real route using isolated SQLite. No horizontal overflow or page errors; primary action height 50px. MDL rendered from venue context. This is not physical iPhone or WebKit coverage.
- `git diff --check` and JS syntax checks passed.
- Typecheck has only the two pre-existing baseline failures: `business-health-snapshot.ts:372` and `health-partial-operations-v539.test.ts:10`. No new type errors.
- No full build, full application suite, or CI was run.

Evidence is under `outputs/sales-accounting/`; recovery checkpoints also contain logs and the source patch/bundle. Screenshots are local implementation evidence, not a published release.

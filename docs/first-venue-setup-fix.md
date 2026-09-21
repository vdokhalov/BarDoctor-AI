# First venue setup recovery

Baseline: production Sites v443, source `019eb828235c362344b7519e1e6240b161e5ff92`, client `index-BQGspy0I-968bac75021c.js`, branch `fix/product-inventory-phase1`.

## Reproduction and causes

The unchanged v443 UI was served with actual registration/bootstrap/profile/store handlers and an isolated SQLite database with repository migrations. A clean browser registered an owner, entered `/setup`, and rendered the first wizard step. Clicking the country selector failed: Playwright's hit-testing reported the static launch image intercepting pointer events. `outputs/setup/before-desktop.png` records the obstructed form. The same behavioral test with `BD_SETUP_BASELINE=1` fails on that click before any changes to form data.

The static element has both `bd-static-startup-v201` and `bd-unified-splash-v394`. The later generic unified-splash rule sets `display:grid`, overriding the earlier static `display:none` rule at equal specificity. `/setup` does not set the startup-pending attribute and had no committed-surface handoff. This is a CSS ownership defect, not a failed login or geography HTTP request.

A separate layout defect leaves the wizard at `min-height:100dvh` with an unconstrained flex content area. At desktop 1280x850, the action started at y=1015.6. The wizard now owns a viewport-height flex layout, a shrinkable content scroller and an accessible action area. Field and button sizes are preserved.

## Changes

- Static splash display follows its pending owner state. The committed setup surface releases any pending startup ownership using a layout effect, not a timer.
- The original five-step `Yle` wizard and its fields/pickers are reused. The footer shows required missing fields and keeps normal validation enabled.
- In-progress draft and step are saved in session storage scoped by account identity and venue. Back, reload and failure retain input.
- A synchronous submission guard prevents repeated final requests. Errors remain in the form; a successful actual profile response clears the draft and opens Home.
- The previous country/city directory is bundled in the client, with no geography API. Region is an optional free-text field in both the previous and current implementation. No invented region service or guessed geography hierarchy was added. There is no separate directory request whose failure can be retried in this wizard.
- The separate additional-venue form now offers retry when its static country/city directory fails to load. Its existing navigation is preserved.
- The isolated D1 adapter now returns positional SQLite arrays for raw queries; object-value conversion lost duplicate column names in joined results. This is test infrastructure only.
- Server authentication, venue allocation, profile persistence, equipment selection, accounting and tenant access rules are unchanged.

## Verification

`scripts/first-venue-setup-browser.ts` runs actual server handlers through `tests/helpers/setup-server.ts`, using the existing isolated database harness. It covers clean registration, all five steps, country/city/region, back and reload, injected HTTP 503 on save followed by actual persistence, double-click submission, server reread, Home refresh, logout/login, and another registration in the same browser. The additional venue form is checked through its actual embedded route. It is included in mandatory GitHub CI.

The save-failure response is deliberately injected; successful writes and reads execute real handlers and SQLite, not browser fixtures. No production accounts or venues are modified during development. Local browser is Chrome with desktop/mobile viewport and touch emulation, not physical iPhone/Android. Installed Opera remnants were found without a runnable browser executable; Opera is not verified.

Production publication requires user confirmation, then full test-account creation through the published UI. Deployment approval never authorizes deleting existing user accounts or venues.

Local final verification: Chrome 153 at 1280x850, 390x850 and 412x850 passed both complete registration/setup paths. The field scroller has 695 CSS px available (content 929/998 px); actions remain in the viewport. Verified build, typecheck and scoped lint pass. Startup/auth/setup regression: 5/5. Lifecycle adapter consumers: 8/8. Full mandatory CI is required on the committed SHA before readiness.

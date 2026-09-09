# Observer error: diagnosis remains open

Production v424 smoke captured a single `MutationObserver.observe` invalid Node
TypeError at 2026-09-09T08:28:58.878Z, around purchase-page reload. Browser tooling
returned no source URL, line or stack. It is not proven to be an app regression.

The shipped source was inspected: observers target document, documentElement,
body after bootstrap, or a guarded React focus-scope element. Six isolated
mobile/desktop purchase loads/reloads on current files passed with no pageerror.
The added CI test exercises actual shipped app files and real UI open/close
actions against test-only API responses; it does not contact production.

A separate diagnostic replay of public deployed HTML encountered Cloudflare
challenge requests and HTTP 405 in the replay harness. It is not a product test
PASS or proof of the observer error's origin. Challenge protections were not
disabled or bypassed. No production records were requested or written by replay.

## Narrow diagnostic change, not a claimed bug fix

Client error location logs only a source category, allowlisted app script path
without query/hash, positive line/column, allowlisted error class and fixed
observer-error category. No raw error message, stack, unknown URL, user/venue ID,
token, cookie or business record is logged. No telemetry request/storage is added.
The listener does not cancel native errors, replace handlers or alter app flows.
Regression verifies error delivery, single installation and privacy canaries.

Production remains v424. This patch requires separate controlled deployment
approval to collect the missing location if the error recurs. Root cause and
Phase 4 production smoke remain unconfirmed. No Phase 5 work is included.

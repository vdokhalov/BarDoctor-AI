# Bounded Health loading after slow successful responses

The published v537 client aborted `/api/business-health` at8seconds. A valid response ready after8.661seconds therefore left Health showing unavailable, even when the Worker completed HTTP200. A second component watchdog also terminated loading independently.

Health now has one15second deadline covering fetch and JSON body, with timer cleanup and abort at expiry. The8second profile/bootstrap fallback can start a request but cannot terminate its loading UI. Invalid JSON and invalid envelopes reject explicitly; successful score:null remains supported by the existing parser. Health detail only renders its snapshot when its current request state is ready, so failed refreshes do not present retained snapshots as current. Retry enters the current subscriber’s loading path. Each mounted subscriber owns its refresh timer, so another subscriber cannot cancel its state transition. Late results from a different account/venue context cannot commit.

Shared request ownership remains unchanged: navigating away disposes the subscriber without cancelling work needed by another page. Request deadline cancellation remains bounded. Calculations, API contracts and background cost scheduling are unchanged.

Validation:18 scoped Node tests; actual emitted390px browser tests with real timers for8.661second success (still loading at8.1s), >15second failure/abort, invalid JSON plus retry recovery, invalid envelope, navigation during pending request, and retained-snapshot rejection. Bounded production build passed; no full suite/CI or publication. Evidence under `/workspace/checkpoint/health-budget`.

This commit builds on the separately verified PMR currency fix57c6a74e. Production response bodies and production performance remain outside this local validation.

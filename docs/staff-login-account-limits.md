# IP-independent, automatically recovering PIN admission

Current owner decision: no lifetime attempt budget, forced PIN change or manual
unlock. This supersedes the lifetime-cap design at 1f1b607d. Incorrect PIN never
authenticates; a correct PIN is temporarily throttled while its window is full,
then works again without owner intervention. Production remains unchanged.

## Actual controls

D1 atomically reserves at most five failed/in-flight checks per 15-minute fixed
window for BOTH normalized login and credential generation. Two concurrent
30-second verification leases are the maximum for each scope. A failed/crashed
request stays charged for that window; lease expiry frees concurrency, not its
window budget. Final session creation checks the lease and credential revision.

A new window automatically allows attempts with the SAME PIN. There is no
attempts<10 condition and no lifetime hard stop. The existing attempts column is
accounting only, not an admission condition. Blocked requests cannot extend the
window or renew a lease. Success refunds only itself, never other failures.
Rename cannot bypass a current credential window; authorization revision changes
do not alter the salted-hash generation key. Existing revocation/actor/venue/POS
write checks remain. Reset/revoke stays available for genuine credential changes,
but it is not a prerequisite for recovering from errors.

No IP header grants admission. Unverified CF-Connecting-IP, X-Real-IP and
X-Forwarded-For are ignored. Optional verified source throttling remains additive
(50/source/window) and disabled by default. No whole-venue attempt budget exists.
Unknown logins have matching window/concurrency rules, dummy PBKDF2 and generic
errors. Creating a staff login or first PIN cannot inherit anonymous pre-lockout.
The displayed throttle message says to retry after 15 minutes, not contact a manager.

## Residual risk — not sufficient for security release approval

A permanent six-digit PIN has one million possibilities. Five checks per 15-minute
window permit up to 480/day. Over 365 days a targeted attacker can test 175,200
distinct candidates: approximately 17.5% of the space. Parallelism and distributed
IP changes cannot exceed the account budget, but do not need to: the budget
replenishes indefinitely. These estimates assume a fixed uniformly random PIN
and no other intervening controls; venue uniqueness slightly changes its space.

Therefore this implementation satisfies the requested recovery behavior, but this
review does NOT endorse a permanent six-digit PIN as sufficient standalone public
authentication under these limits. Minimal alternative without manual recovery:
keep login + auto-throttle, replace the six-digit secret with a substantially longer
random password (e.g. 12 random base32 characters, 60 bits). A passkey is another
option, with larger UX scope. No format change was made without owner approval.
A short-lived six-digit code can also limit accumulation but requires a delivery/
renewal design, so it is not silently substituted here.

Targeted temporary lockout remains possible, and the attacker can repeat it after
each window. Existing sessions are not revoked just because wrong PINs arrive.
Other staff have separate budgets. Across arbitrary fresh usernames, attackers
can still consume D1 storage/KDF resources: this is not application-wide DDoS
protection. Platform abuse/capacity controls remain necessary. No unverified
header or global venue lock is being presented as a solution to these limitations.

## Evidence and production scope

Focused session/credential tests include >10 failures across three windows with
the same PIN succeeding after automatic recovery, unchanged credential hash,
non-extension by blocked requests, rename/IP bypass denial and colleague access.
Native Worker/D1 independently checks window recovery and deterministic two-lease
concurrency with missing IP headers. Existing reset/revoke, cost projection,
account/venue and stale-login checks remain. Counts/results are in checkpoint.

No schema change is needed for removal of the lifetime admission condition.
Pending migrations remain exactly 0026–0031, unchanged. Required runtime secret:
STAFF_PIN_LOOKUP_KEY (>=32 random bytes, secret=true) for issuance/reset uniqueness.
No source setting is required; leave STAFF_PIN_SOURCE_POLICY absent.

See staff-login-production-runbook.md for migration discovery, secret setting,
CI/build, release and rollback. Owner decision on remaining six-digit risk is
still unresolved; tests passing do not mean release PASS.

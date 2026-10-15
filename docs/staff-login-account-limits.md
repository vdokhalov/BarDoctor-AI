# IP-independent PIN admission

Supersedes the ingress release blocker in the cf7fa4fb security review. The
platform's IP-header provenance is still unproven; it is no longer needed to
allow authentication. No production action was performed.

## Mandatory account controls

D1 atomically admits at most two active verification leases per normalized login
AND per credential generation. Each lease expires after 30 seconds. A crashed
request remains charged as a failed attempt; expiration frees concurrency only.
The final session INSERT requires the same live lease and credential revision.

Every admitted verification reserves BOTH counters before PBKDF2:

- At most five failed/in-flight attempts per 15-minute fixed window. Requests
  denied by a limit do not extend the window, increment counts or renew leases.
- At most ten failed/in-flight attempts over the lifetime of that PIN generation.
  A new time window, rename, disable/enable or authorization revision change does
  not reset this limit. The credential scope includes membership and a digest of
  the salted credential hash, rather than the mutable authorization revision.
- A successful login refunds only its own reservations; prior failures remain.
  Success does not provide an attacker another ten guesses. Independent sessions,
  permanent revocation, actor binding and transaction-time POS checks are retained.

There is no venue-wide attempt budget. Client CF-Connecting-IP, X-Real-IP and
X-Forwarded-For are ignored unless an operator has separately enabled the verified
source policy. Changing or omitting those headers cannot alter mandatory account
admission. If enabled, the existing 50/source/15-minute throttle is additional:
it can only deny, never grant or replenish a login/credential budget. It is NOT
needed or recommended for the initial release without platform evidence.

The old five/15-minute limit is retained and strengthened, not removed for tests.
Two leases can finish while other requests are still arriving, so a concurrent
HTTP batch may admit more than two in total; no more than two may be in flight at
once. Native D1 tests use two held leases to test this deterministically, as well
as the total window budget.

## Recovery and unknown logins

After a temporary throttle, wait for the current 15-minute window to finish.
After ten failures, waiting alone cannot unlock the same PIN. Owner/manager uses
existing Reset PIN: SQL refuses to reissue the current PIN, generates a new one,
advances revision, clears that login's lock and pending leases, and audits the
issuance. No unlock-old-PIN endpoint exists. Admin/shift_manager and cashier cannot
recover access. Revoke does not replenish a PIN's lifetime budget. Reset before
admission rejects stale credential snapshots without charging the new login.

Unknown logins use the same window, lifetime and concurrency rules, dummy PBKDF2,
and public error text. Malformed names have a separate non-login namespace.
The rate-limit message is identical for temporary and lifetime exhaustion and
instructs the user to request a new PIN if waiting does not help. No public lock
status or employee directory is exposed. Creating a new employee/first PIN clears
anonymous pre-lockout of that login. Rename clears the destination login lock but
retains the PIN-generation budget, so rename cannot become a brute-force bypass.

Admission rows are persistent: do not routinely erase them to free storage, as
that would replenish guesses. Old credential rows are removed only on genuine
PIN replacement. Unknown-name traffic can create persistent small rows and invoke
KDF work for fresh names. This design bounds guesses against an employee, NOT
aggregate DDoS/resource consumption across arbitrary names; platform abuse controls
and capacity monitoring still apply. No shared application lockout of an entire
venue was introduced to conceal this limitation.

## Sufficiency and residual risk

A replenishing five/15-minute throttle allows up to 480 guesses/day against the
same permanent PIN. The new hard stop prevents that accumulation, even across
many addresses. Ten guesses against a uniformly random six-digit PIN have roughly
0.001% success probability per issuance; venue PIN uniqueness slightly changes the
sample space. Risks accumulate across employees and repeated credential issuances.
This is a bounded online guessing policy, not proof of absolute security or a new
release PASS. Offline database compromise is a separate low-entropy-secret risk;
existing salted PBKDF2 is retained, not represented as strong-password entropy.

An attacker knowing a login can lock that employee out. They cannot lock colleagues
through a shared venue counter, invalidate existing sessions merely by submitting
bad PINs, or recover the blocked employee without owner/manager authority. A reset
can itself be attacked again. If repeated manual recovery or the remaining guessing
risk is unacceptable, the minimal product alternative is username + a longer
random password (or passkey), not silently unlocking/recycling the six-digit PIN.
The present design removes the unverified-IP dependency while making this tradeoff
explicit for the release decision.

## Scoped evidence

20 session/credential tests PASS, including earlier revocation/authorization/cost
projection guards, plus a separate forced-RNG-repeat test: reset cannot reissue
the same PIN, clear its budget or emit an issuance audit. Three focused account-limit tests were rerun after the final
stale-reservation and invalid-name namespace changes. Native Worker/D1 PASS:
missing IP, parallel sessions, shared window budget, deterministic concurrency,
revocation epochs and zero outbound calls. Exact-byte release guards are recorded
in checkpoint. No broad CI/build/browser suite was run for this revision.

## Production delta

Required runtime secret: STAFF_PIN_LOOKUP_KEY, >=32 random bytes, secret=true, for
PIN issuance/reset uniqueness. No new external/API credentials and no required
IP/source setting. Leave STAFF_PIN_SOURCE_POLICY absent; it is optional only after
independent ingress verification. Removing this setting no longer disables login.

Schema: 0026 credentials/audit; 0027 historical device/session tables + optional
source counters; 0028 credential revocation triggers; 0029 logins/new sessions;
0030 revoke/restore epochs; NEW 0031 login/credential limits, leases, indexes and
recovery triggers. Apply only through the approved Sites release migration flow,
never in auth requests. These files were applied only to disposable synthetic DBs.

See staff-login-production-runbook.md for build/CI, packaging and rollback. The
remaining release gates are final exact build/emitted checks, unchanged mandatory
full CI, hosted migration-ledger/package confirmation and publication approval.

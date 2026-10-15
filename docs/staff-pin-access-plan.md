# Staff login + six-digit PIN — local candidate

Base e339cc99 (published v520). Feature branch feat/staff-pin-pos-20261015.
The owner selected a globally unique login and a six-digit personal PIN. Device
activation, venue links/selection and email are not part of this flow. Earlier
device-bound and proposed long-code designs are superseded. Development and
synthetic scoped validation are authorized; publication is not authorized.

## User flow and authority

/login is the employee login form; the ordinary application login also links to
it. /login?management=1 retains management login. Staff enter their login and PIN
on any device and open only the cashier. Logins are normalized to lowercase,
3–32 ASCII letters/digits/dot/hyphen/underscore, starting with a letter or digit.
Global uniqueness is enforced by D1, including concurrent writes.

Owner and manager create employees and issue/reset/revoke PINs at /staff-access.
They may also assign/change a login; changing it revokes existing sessions.
shift_manager and cashier cannot manage this access. The issued PIN is displayed
once, never stored in browser storage, URLs or audit records. Waiter, bartender
and barista are job titles of the cashier access role.

Secure/HttpOnly/SameSite=Strict sessions persist across reopenings for up to 30
days. Explicit logout deletes the current session and requires credentials again.
Independent concurrent sessions are supported. PIN reset/revocation invalidates
all previous sessions by credential revision. Membership/role/permission changes,
venue/workspace disablement and expiry invalidate access. Disable then enable
does not revive an old cookie. No device cookie or activation endpoint is used.

## Storage and server boundary

Each employee has their own account, venue and workspace membership, with
account_kind=staff, no password and owns_venue=false. No email is requested or
fabricated. The existing NOT NULL unique app_email column holds an internal
non-address identifier `staff:<uuid>`; chatgpt_email is empty. Ordinary email
lookup filters account_kind=user and cannot authenticate these identities.

Draft migrations 0026–0031 are explicit; authentication performs no DDL. 0026
stores salted PBKDF2 credentials and issue/reset/revoke audit metadata. 0027/0028
retain historical, now inactive device/session tables and revocation triggers.
0029 adds globally unique logins and independent login sessions with monotonic
revocation triggers. 0030 also advances credential epochs across revoke/restore transitions. No production migration has been applied.

PIN issuance still enforces venue-local PIN uniqueness using an HMAC lookup tag.
STAFF_PIN_LOOKUP_KEY (at least 32 bytes) remains required for issuance/reset and
has NOT been provisioned in production. Login verifies the salted credential
selected by username, without needing this lookup key. Rotation of the issuance
key requires a deliberate credential reissue strategy.

Before hashing, D1 atomically reserves per normalized login AND per credential
at most five failed/in-flight attempts per 15-minute window, ten over the PIN
lifetime, and two concurrent 30-second leases. Successful login refunds only its
own reservation. Expired/crashed work stays charged. Rename or authorization
epoch changes cannot replenish the PIN budget. Owner/manager recovers through a
new PIN, never by unlocking the old one. There is no shared venue counter.

IP is not required and no unverified IP header controls admission. Optional
STAFF_PIN_SOURCE_POLICY=verified-cloudflare enables only an additional source
throttle after ingress provenance is independently confirmed. Leave it absent
for the account-bound design. Unknown logins receive matching error/limit behavior.
See staff-login-account-limits.md for DoS, resource and six-digit guessing tradeoffs.

Scoped auth and Worker routing independently deny non-POS APIs. POS writes check
session validity again in the business transaction. The server derives sale
authorship; a stale tab's actor header cannot post as the next employee. Drafts
are separated by actor, venue and shift. Switching identity freezes other tabs.

## Scoped evidence for this candidate

- Five login/session tests: normalization/uniqueness and rollback, equal public
  errors, concurrent account/source budgets, logout/reset/disable-enable,
  independent concurrent sessions, sale authorship and in-flight revocation,
  authorized login changes and session invalidation.
- 32 focused credential/auth/access/POS/dialog regression tests PASS.
- Native Worker/Miniflare D1 test PASS: concurrent login sessions, shared attempt
  limits and revocation; zero outbound calls.
- WebKit at 390 PASS: no activation, login + PIN, reopen, forbidden API/page,
  Anna -> Boris -> Anna with separate real carts, server-committed payment with
  lost response and idempotent retry (exactly one Anna sale), old second tab
  frozen, revocation and management-login link.
- Exact release guards pin the approved files individually and retain negative
  mutation controls and historical manifests. See checkpoint logs for results.

Full application CI and full production build were not run. This auth/data
change remains full under the unchanged CI policy. There is no release PASS,
physical-device result, production credential, migration or deployment.
Before release: review the account-limit tradeoffs, approved secret
configuration and migrations, and the agreed full CI/build/release gates.

Only the feature branch is synchronized. It is outside workflow push triggers;
no PR is opened, because pull_request would trigger full CI. PR15/main remain
unchanged. Checkpoints preserve bundle, patch and synthetic evidence.

See [targeted security review](staff-login-security-review.md) and [production runbook](staff-login-production-runbook.md) for current findings, exact deployment prerequisites and rollback.

Current security design: [IP-independent admission](staff-login-account-limits.md).

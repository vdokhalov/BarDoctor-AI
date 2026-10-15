# Personal staff PIN — local implementation candidate

Base e339cc99 (v520). Feature branch feat/staff-pin-pos-20261015.
Development and synthetic validation authorized; publication is not authorized.

## User flow and security boundary

An owner or manager signs in normally on the device and explicitly enables the
cashier for the selected venue at /staff-access. This finishes that managerial
session on the device. Employees then use only their personal permanent PIN,
without email or selecting a name. /staff-login exposes no employee directory.
An approved device is required; the PIN is never a global short password.

A successful PIN login opens only the cashier. Secure/HttpOnly/SameSite cookies
persist across reopenings for up to 30 days (also bounded by device expiry).
Explicit logout requires PIN again; a manager can revoke the device remotely.
This is not an indefinite or irrevocable session. Reauthorization is required
when the device grant expires. No production key or PIN has been created.

Owner and manager may create staff, issue/reset/revoke PINs and manage devices.
shift_manager and cashier cannot. Existing management privileges, invitations,
ordinary login, shift management, discounts and cancellation rules remain intact.
Waiter, bartender and barista remain job titles of the cashier access role.

## Identity and storage

Staff have their own accounts row, venue membership and workspace membership.
They have account_kind=staff, no password and owns_venue=false. No email address
is requested or fabricated. For compatibility with the existing NOT NULL unique
app_email storage column, staff use an internal non-address identifier
`staff:<uuid>`; chatgpt_email is empty. This is an explicit storage compatibility
choice, not an email identity. Normal email lookup filters account_kind=user and
cannot authenticate these identities. Staff IDs never inherit the owner's actor.
Existing memberships with real accounts can also receive a personal PIN.

Explicit migrations 0026 and 0027 create credential/audit/device/session/counter
tables. Authentication never performs DDL. PIN hashes use random per-record salt
and the existing Worker-compatible PBKDF2 primitive. A venue-scoped HMAC lookup
tag enforces PIN uniqueness atomically. STAFF_PIN_LOOKUP_KEY is a required new
server binding (at least 32 bytes); missing configuration fails closed. It has
NOT been provisioned in production. Rotation requires a deliberate credential
reissue strategy, not silently changing the binding.

Five failed/in-flight attempts per device and 50 per venue per 15-minute window
are reserved atomically before hashing; a successful login subtracts only its
own reservation, never clears concurrent failures. Counters are shared in D1.

Every PIN session is fixed to its venue, device, membership and credential
revision. Expiry, reset, revocation, membership disablement and role promotion
invalidate it. POS writes recheck the session and revision inside the same
transaction as the business write. A stale page's actor header cannot turn its
pending operation into the next employee's sale. The server determines authors.

Worker routing and scoped auth independently block non-POS APIs. Direct HTML
routes return the cashier/login. PIN-mode cashier omits navigation to other
sections. Logout/switch preserves actor+venue+shift durable drafts, clears the
current screen, and invalidates other tabs via an identity-change marker.
Management PIN operations display a newly issued secret once and do not persist
it in browser storage, URLs or audit entries.

## Completed scoped evidence

- Credential foundation: 5 tests PASS.
- Auth/PIN/access-control/P0 auth recovery: 26 tests PASS.
- POS payment/revocation/history/dialog recovery: 19 tests PASS. Includes real
  handler sale author derivation and revocation between auth and transaction.
- Native Worker/Miniflare D1: 1 test PASS (transactions, audit, cookie session
  revocation, concurrent attempt budget); no outbound calls.
- WebKit 390: manager device approval, PIN-only login, automatic reopen, forbidden
  API 403 and forbidden page redirect, Anna -> Boris with separate durable draft
  comments, revoked PIN -> login, and return to ordinary management login PASS.
- Exact release guards: 4 tests PASS, retaining negative mutation controls and
  immutable historical manifests. New files are pinned individually.
- Browser JS syntax and git diff whitespace checks PASS.

Counts overlap between focused runs and must not be summed as unique tests.
A harness import issue was fixed by moving cookie-only utilities out of the
Cloudflare-dependent session module; its subsequent browser run passed.

Full application CI and full production build are NOT RUN. This auth/data change
is classified full by the existing CI policy; the CSS exception does not apply.
No physical-device verification, production migration or deployment was done.
Before publication: review this security-sensitive candidate, provision the
required server binding through the approved secret workflow, assess/apply the
explicit migrations, and agree the full CI/release gate. Do not publish merely
because scoped development checks passed.

## Synchronization and checkpoints

Only the feature branch is pushed. It is outside workflow push triggers. No PR
is opened yet because pull_request would start full CI. PR15 and main remain
unchanged. Checkpoints contain an incremental bundle, patch and scoped evidence.

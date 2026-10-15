# Personal staff PIN access — implementation checkpoint

Base: e339cc993ccb18941c472a732fab1a82966f16b1 (published v520).
Branch: feat/staff-pin-pos-20261015. No publication authorized.

## Confirmed boundaries

Owner and manager may issue, reset and revoke a personal PIN for a linear POS
member. shift_manager and cashier may not. Waiter, bartender and barista remain
job titles of cashier. Existing managerial login, sections and permissions stay
unchanged. PIN uniqueness is venue-scoped. PIN is not an invite code.

Reuse existing accounts, venue memberships and invitations. This checkpoint
issues credentials for existing active cashier memberships; it creates no
accounts and no fake email addresses. Existing onboarding still requires a real
account. Email-free employee onboarding is not implemented or implied.

## Pending product decision — do not implement activation until answered

PIN-only login without selecting a name requires an approved, venue-bound device.
Choose either (recommended) ordinary owner/manager login on that device followed
by explicit authorization, or a short-lived single-use activation link. There
must be no global public short-code login or public employee directory.
Question was sent before dependent implementation. No answer received yet.

## Completed independent foundation

Explicit additive migration 0026 creates PIN credentials and a secret-free audit
log. No runtime DDL. An atomic unique constraint binds venue and lookup tag.
PINs are generated with rejection sampling, six decimal digits including leading
zeroes; stored as independently salted PBKDF2 hashes using the existing Worker
compatible password primitive. Venue-scoped lookup tags use HMAC with a separate
STAFF_PIN_LOOKUP_KEY binding; missing configuration fails closed. No production
key or credential has been created. Key provisioning/rotation must be planned
before a future deployment, including resetting lookup tags on rotation.

Issue/reset/revoke recheck both issuing and target memberships inside the write
transaction. Revocation increments the credential revision. No HTTP route or
login consumes this service yet: revision enforcement and session invalidation
are NOT implemented at this checkpoint. This is not a shippable PIN login.

## Remaining implementation

1. Approved device lifecycle: random bearer held in Secure/HttpOnly/SameSite
   cookie, hashed server-side, fixed venue, expiry and owner/manager revocation;
   explicit CSRF/origin checks. Never leave managerial credentials in POS mode.
2. Atomic attempt limits shared across Workers, both per approved device and
   venue; generic failures; reserve attempts before expensive hashing; bounded
   cooldown without clearing a concurrent failure's counter on success.
3. Short POS sessions tied to actor membership, venue, device and PIN revision.
   Reset/revoke/device removal and membership changes invalidate them; recheck
   session/revision inside the same POS write transaction, including in-flight
   requests. A cashier later promoted to management must not gain management
   access from an old PIN session.
4. Server-side route/API allowlist, no active-venue switching, no management or
   identity-management routes from PIN sessions. Direct URL navigation returns
   POS landing or denial; localStorage is never authorization. Ordinary manager
   sessions keep their existing behavior.
5. Cashier-only UI plus explicit lock/switch. Persist old actor+venue+shift drafts
   before clearing views and requests; reject stale completions and cross-tab
   identity changes. Never replay another actor's uncertain payment or switch a
   pending operation's author. Server derives sale/order/payment authors.
6. Explicit management operations: issue/reset/revoke, display issued secret
   once, never place it in logs/URLs or retained client storage. PIN management
   must not grant manager broader access.manage rights.

## Risk-based validation (one pass per changed boundary)

Foundation: 5 isolated real-handler/SQLite tests PASS on 2026-10-15. Includes
owner/manager vs admin/staff, cross-venue/management targets, stale-authority
interleaving, transactional rollback, uniqueness constraint, independent salts,
venue-specific tags and missing-key failure. No external services used.

Next: device activation expiry/replay/concurrent use; no unauthorized directory;
parallel guessing and cross-device/venue counter behavior; PIN reset/revoke vs
login/payment races; disabled membership/workspace/device and expired session;
forged venue/actor payloads; allowlisted vs direct forbidden API/routes; ordinary
owner/manager regression and staff privilege limits. Include SQLite transaction
and existing D1-runtime harness coverage for new SQL behavior.

Browser: synthetic A -> B -> A on one device, cross-tab switch, failed network
payment/reload, only cashier sections, direct links, correct author and separate
saved drafts. Reuse existing POS fixtures. No full suite during development.
Full CI is NOT RUN and must be separately assessed before publication; the CSS
exception does not apply. Release byte guards must be explicitly reviewed and
updated for the completed change; they are not weakened to accept this draft.

## Synchronization

Push only the new feature branch, which is absent from the workflow push branch
allowlist, and do not open a PR yet (pull_request would run full CI). No push to
PR15's branch, main merge or Sites publication. Keep checkpoints with commits,
patches, plan and test evidence. Device decision remains the next blocker.

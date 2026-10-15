# Targeted security review — staff login candidate

Reviewed 689b27b192d7019038cdee2cf75ddddebb148228 on 2026-10-15.
This is a separate adversarial review pass, not an external audit or release PASS.
Only synthetic local tests were used. No production requests, business rows,
credentials, migrations or deployment were performed. Sites metadata read confirms
public audience, live version 520, project appgprj_6a5734bb1abc81919ff978ed0020c64b.

## Confirmed defect and correction

High: a login already holding a credential snapshot could mint a new valid session
AFTER login rename-and-restore or workspace-member/venue/workspace disable-and-
restore. Existing cookies were deleted, but those transitions did not increment
the credential revision checked by the final INSERT. Four deterministic tests
interleaved each transition between credential read and session commit. All four
returned 200 instead of required 401 on the reviewed commit.

Append-only migration 0030 increments the credential revision for all four
transitions. Existing deletion triggers remain. PIN itself stays valid after
restoration, but any pre-transition authentication work must restart. The same
four tests now return 401 and leave no session. Native D1 separately verifies
every transition advances the epoch; old cookies remain invalid. Existing member
role/status/permission changes and PIN issue/reset/revoke already advance revision.

## Ingress: release blocker, not an assumed guarantee

Concrete supported path: public `bardoctor-preview.v-dokhalov.chatgpt.site` ->
Sites Dispatch -> hosted Cloudflare Worker. This is grounded in the Sites skill's
hosting and identity contract and current Site metadata. Dispatch owns platform
sign-in/service authorization. The inspected checkout contains only the tenant
Worker, not Dispatch implementation or its header sanitization configuration.
No supported read-only tool exposes that implementation or a trusted source-IP
contract. No bypass token, diagnostic production route or alternate origin was
created to infer it.

Cloudflare's primary documentation distinguishes direct requests from Worker
subrequests: same-zone subrequests can use a Worker-modifiable x-real-ip;
cross-zone subrequests get a fixed Worker client IP. Therefore a CF header name
alone does not establish the original visitor source on this hosting path:
https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-connecting-ip

The candidate previously accepted any header containing hex/dots/colons, even
invalid addresses. It now uses strict IP validation and canonical IPv6 form.
X-Forwarded-For and X-Real-IP never select the budget. A server-only setting
STAFF_PIN_SOURCE_POLICY=verified-cloudflare must also be present; absence/other
values fail closed with 503 BEFORE D1 work. Request headers cannot opt in.
The setting is an operator approval switch, NOT cryptographic proof of ingress.
It remains unset in production. Tests explicitly opt in only in synthetic fixtures.

Required platform evidence before setting it: Dispatch strips/overwrites client
CF-Connecting-IP, preserves an authoritative canonical visitor address through
its Worker invocation, prevents direct tenant-Worker access bypassing Dispatch,
and defines same-zone/cross-zone, IPv6 and proxy behavior. An isolated platform
staging test must demonstrate spoofed CF-Connecting-IP/X-Real-IP/X-Forwarded-For
cannot rotate the source budget. The repository cannot establish these facts.
If the platform cannot supply this contract, use a platform-authenticated source
signal; do not merely rename the trusted header or set the switch.

## Other reviewed boundaries

- Per-login budget is normalized and independent of source: five failed/in-flight
  reservations per 15-minute fixed window. Source budget is 50, charged first.
  Even a spoofable source does not bypass a target login's budget, but would
  undermine protection against spraying many logins and resource exhaustion.
  Saturated source cannot charge additional login budgets. IPv6 textual aliases
  share one source budget. Distributed addresses and targeted account lockout
  remain limitations; no venue-wide lockout is introduced.
- Unknown and known logins execute PBKDF2 with equal work parameters and return
  identical failure bodies/statuses and 401-to-429 progression. There is no public
  directory; unauthenticated/PIN requests cannot access the management listing.
  This is functional/KDF review, not a statistical network timing proof.
- Staff login uniqueness is a global SQLite UNIQUE constraint after server
  normalization; duplicate creation rolls back account/membership writes. An
  authenticated manager can learn that a proposed login is taken (409), which is
  necessary for assignment; no public availability endpoint exists.
- Issue/reset/revoke/create/change require owner/manager and SQL rechecks current
  actor authority in the target venue. Actual non-owner shift_manager/cashier
  HTTP sessions are denied. A real manager issues and revokes successfully.
  A test initially demoted the legacy venue owner, which existing owner repair
  intentionally restored; corrected fixture uses a separate non-owner membership.
  That fixture failure was not classified as an auth bypass.
- Foreign venue manager cannot issue/revoke/change the target's login; duplicate
  username remains disallowed across venues. Spoofed venue header rejects auth;
  foreign venue in sale body returns VENUE_CHANGED. Server derives sale author.
- Only session, pos-orders and sales-events APIs are available in PIN mode; all
  other APIs are denied by gateway and scoped auth. Ordinary auth credentials
  cannot override an invalid PIN cookie. Cookie is HttpOnly/SameSite=Strict,
  Secure on HTTPS, random 256-bit token, SHA256 in D1, 30-day expiry.
- POS write guard rechecks live revision/membership inside the write transaction.
  Reset/revoke cannot finish a stale payment. Public sales projections omit
  internal batch/cost/recipe, payroll/staffing and cash-closing data; own receipt
  filter and privileged shift report checks remain. Local payment test asserts
  safe GET output from a real stored event with internal batch, and report 403.
  Source review of pos-orders finds operational prices/lines/actors only, no cost
  or payroll source. Open orders remain venue-visible by existing POS design;
  private durable cashier carts and paid-history permissions are unchanged.

## Evidence in checkpoint

- revocation-before.log: four reproducible 200-vs-401 failures on the reviewed code.
- review-after.log: 8 tests PASS (includes four transition subtests); focused
  payment projection/revocation, ingress gate/normalization, roles/tenant checks.
- native-d1.log: 1 PASS, actual Worker/D1 epochs and concurrency, zero outbound.
- guards.log: exact-byte and historical-boundary checks after final pin refresh.

No broad regression/browser run repeated. Prior 689b27b1 WebKit evidence remains
historical; it is not an end-to-end browser result for this revised candidate.

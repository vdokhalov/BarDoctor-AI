# BarDoctor — STEP 1.3 CODE-SIDE RELEASE SAFETY AUDIT

Audit date: 2026-09-02
Scope: GitHub source, local code, CI/test tooling, synthetic SQLite/D1-compatible schema, and local browser harnesses.
Safety boundary: no production deployment, production migration, production data mutation, production secret request, or destructive production operation was performed.

## A. Executive summary

Score: **65/100**
New P0: **0**
P1: **15**
P2: **6**
Blocked infrastructure items: **2**

The code-side release candidate has no newly proven P0. Strong existing controls include server-side venue selection, account-scoped D1/R2 namespaces, one-time invitations, server-hashed sessions, exact logout revocation, atomic password-reset/session invalidation, permission-gated platform administration, immutable stock-ledger guards, and idempotency for the main sequential accounting lifecycles.

The application is not GA release-ready. The most material code-side findings are absent authentication throttling, a JavaScript-readable primary bearer session, missing platform-admin MFA, a public state-changing notification GET with query-token support, missing security headers on the main shell, non-atomic generic domain-store audit writes, no storage-level concurrency control, false-positive health, and a directly reachable vulnerable `xlsx` parser used for untrusted uploads.

P0-04 and P0-05 are not code defects and are not PASS. They remain infrastructure-access blockers.

## B. Security

| Area | Status | Evidence | Priority | Action |
|---|---|---|---|---|
| Login, registration, reset, invite throttling | **CODE DEFECT** | No IP/account throttling, lockout, exponential backoff, or credential-stuffing control in `app/api/auth/*`; only platform-admin claim/revoke has a narrow limiter. Registration differentiates an existing account with HTTP 409 and specific text. | P1-01 | Add durable account + IP-prefix counters, exponential backoff, normalized generic responses, and security-event logging. Do not rely on CAPTCHA alone. |
| Password policy | **CODE DEFECT** | `lib/bardoctor/password.ts`: 6–256 chars; no common/compromised-password blocklist. PBKDF2-HMAC-SHA256, 100,000 iterations, 16-byte random salt, 32-byte result, constant-time comparison. | P1-02 | Require 15 chars for password-only auth, allow at least 64 (current 256 is fine), accept spaces/Unicode, apply NFC consistently, block common/compromised/context passwords, and keep no composition rules. Benchmark Argon2id/scrypt in the target runtime; if PBKDF2 is retained, move toward 600,000 HMAC-SHA256 iterations through a compatible implementation and rehash on login. |
| Password reset | **PARTIAL PASS** | Reset is not an emailed bearer-token flow. It requires a trusted ChatGPT identity match and uses one `db.batch` to update the hash and delete every account session. Therefore reset-token entropy/lifetime/replay are not applicable to the implemented architecture. It still lacks request throttling. | P1-01 | Rate-limit reset attempts and preserve the current generic identity-mismatch response and all-session invalidation. |
| Invitations | **PARTIAL PASS** | Eight random characters from a reduced alphabet (about 40 bits), SHA-256 stored hash, 72-hour expiry, one-time atomic claim, revoke support, and owner role prohibited. No attempt throttle. | P1-01 | Add per-code/IP/account throttling; consider at least 64 bits for new invitation codes. |
| Session storage | **CODE DEFECT** | Two active mechanisms exist: `X-Session-Email` + `X-Session-Token` and `bd_server_session`. `public/bardoctor-preview-v401.js` reads/writes `bd_session_token` in `localStorage` and injects it into API requests. Cookie is `HttpOnly`, `SameSite=Strict`, 30 days, and `Secure` on HTTPS. | P1-03 | Move primary auth to an opaque HttpOnly Secure cookie only; stop returning the bearer to JavaScript; remove header/localStorage compatibility after a staged migration. |
| Session replay/rotation | **CODE DEFECT** | Server stores SHA-256 token hashes; token entropy is 256 bits. Tokens have fixed 30-day expiry, no refresh/rotation, no inactivity expiry, and remain replayable until expiry, explicit logout, other-session revocation, or password reset. `localStorage` makes multi-tab sharing automatic and XSS theft replayable. | P1-03 | Rotate on authentication/privilege change, add inactivity and shorter privileged-session limits, record device/session metadata, and support revoke-all including the current session. |
| Platform admin RBAC | **PASS (code)** | `platform.admin` is stored separately from venue roles; active server-side admin membership is required. Member mutation is scoped by `membershipId AND actor.venueId`; request body cannot set owner/platform admin. Bootstrap is hash-bound, same-origin, intent-header guarded, and rate-limited. | — | Keep negative escalation tests in the release suite. |
| Platform admin MFA | **CODE DEFECT** | Admin session reports `mfaAvailable: false`; new admin rows have `mfaRequired: false`. | P1-04 | Require phishing-resistant MFA or equivalent step-up before platform-admin access and sensitive operations; define enrollment and recovery. |
| Venue/account IDOR | **PASS (code), TEST GAP (matrix)** | `authenticateRequest` resolves only an active membership and refuses fallback when an explicit foreign venue is supplied. Domain stores use the authenticated data account; R2 keys are account-scoped. Synthetic two-principal test proves a principal cannot resolve or read the foreign namespace. Existing domain tests cover cross-venue purchases, inventory, tech cards, sales, shifts, finance, integrations, AI context, uploads, and exports. | P2-01 | Add route-level negative tests for every listed ID and a real two-session UI matrix, not only library/static tests. |
| CSRF | **PARTIAL PASS** | Main bearer-header requests are not classic form-CSRFable; cookie is SameSite=Strict. Sensitive admin mutations add same-origin + `X-Admin-Intent`. There is no universal Origin/CSRF middleware for cookie-authenticated mutations. | P2-06 | Standardize Origin verification for cookie-authenticated mutations and keep explicit intent/re-auth for privileged actions. |
| `/api/notifications/run` | **CODE DEFECT** | `GET` can run notification triggers without authentication when due. Auth accepts `?token=`, exposing a long-lived secret to request URLs/logging surfaces. GET therefore has a side effect; POST also accepts the query token. | P1-05 | Remove GET side effects, remove query-token auth, require POST + Authorization header, validate scheduler identity, and make the operation idempotent. |
| Security headers/CSP | **CODE DEFECT** | Main `barDoctorResponse()` sets only cache and content type. CSP, frame controls, nosniff, Referrer-Policy, Permissions-Policy, and app-level HSTS are absent there, although several standalone/admin pages set them. Main HTML contains a large inline script/style and inline `onload`. | P1-06 | First ship CSP Report-Only; move inline startup JS/CSS and `onload` handlers to versioned assets/nonces, then enforce the compatible policy below. Set the remaining headers centrally. Verify HSTS at the hosting layer separately. |
| XSS | **PARTIAL PASS** | No `dangerouslySetInnerHTML`, `eval`, or `new Function` in first-party TypeScript. Representative generated HTML uses escaping. Fourteen first-party legacy public scripts still assign `innerHTML`; many have explicit escaping helpers, but complete taint coverage is absent. No exploitable stored/reflected/DOM XSS was proven. | P2-02 | Add payload-driven browser tests for names, notes, invoices, reviews, imported rows, and AI text; migrate legacy rendering to DOM/textContent or a single audited encoder. |
| Secrets | **PASS (scan)** | Current tree, tracked env files, public assets, fixtures/log paths, and Git history were scanned without printing values. The only API-key-shaped path match, `public/assets/index-BQGspy0I.js` and historical variants, was a CSS-token false positive. No tracked `.env`, private-key marker, credential URL, or verified hard-coded secret was found. | — | Add a maintained CI scanner such as gitleaks with allowlisted false positives. |
| File/upload authorization | **PARTIAL PASS** | Representative invoice, catalog, integration, avatar, employee-photo, venue-logo, and sales uploads authenticate first, enforce size caps, and use account-scoped keys. Images receive stronger signature/normalization checks than spreadsheets; spreadsheet paths rely materially on extension/parser behavior. | P1-15 / P2-06 | Replace or isolate vulnerable spreadsheet parsing, add magic/type checks where reliable, parser time/CPU limits, safe filenames, and cross-venue retrieval negatives. |

### Recommended password policy

BarDoctor currently uses password-only authentication, so the recommended minimum is **15 characters**, maximum **at least 64** (retain 256 if runtime cost remains bounded), all printing ASCII plus spaces and Unicode, Unicode NFC normalization, no mandatory symbol/digit/uppercase rules, no periodic forced changes, and rejection of common, breached, account-specific, venue-specific, or service-name passwords. This aligns with [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) and [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Password storage should prefer Argon2id; OWASP's current baseline is documented in its [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Minimum compatible CSP target

Do not enforce this until the inline startup code/style and inline `onload` handlers are removed or nonced:

```text
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'self';
form-action 'self';
script-src 'self' https://cdn.onesignal.com https://api.onesignal.com;
style-src 'self';
img-src 'self' data: blob: https://*.onesignal.com;
connect-src 'self' https://api.onesignal.com https://*.onesignal.com wss://*.onesignal.com;
worker-src 'self' blob:;
manifest-src 'self';
font-src 'self' data:;
upgrade-insecure-requests
```

If the containing ChatGPT/Sites frame requires a broader `frame-ancestors` allowlist, enumerate exact approved origins; do not use `*`. Start with Report-Only and browser QA.

## C. Data safety

| Area | Status | Evidence | Priority | Action |
|---|---|---|---|---|
| Core accounting idempotency | **PASS for sequential retries** | Purchases, sales, write-offs, inventory deletion/finalization, and shift close carry document/idempotency identities; existing tests prove repeat calls do not double-post stock in sequential scenarios. | — | Preserve these regression tests. |
| Generic store atomicity | **CODE DEFECT** | `/api/store/[key]` upserts `domain_data`, then inserts audit rows one at a time. A later audit failure can leave the business mutation committed without its audit record. | P1-08 | Use one D1 batch/transaction for domain mutation, every audit row, conflict record, and derived state; return success only after the whole unit commits. |
| Dedicated accounting atomicity | **PARTIAL PASS** | Critical purchase, inventory, sales, shift, write-off, and finance paths group related writes in `db.batch`. This prevents a write within the batch from committing alone. Reads/calculation occur before the batch. | P1-09 | Combine atomic writes with storage-level preconditions/version checks so a stale read cannot overwrite a newer committed batch. |
| Concurrent updates/lost updates | **CODE DEFECT** | Generic store's three-way merge requires optional `baseData`; clients may omit it. Dedicated flows use read-compute-batch without compare-and-swap/version predicates. Sequential idempotency tests do not prove two simultaneous writers are safe. | P1-09 | Add version/ETag fields and conditional writes; return 409 on stale versions; add actual parallel request tests for purchases, balances, inventory, tech cards, shifts, employees, and nomenclature. |
| Double submit/unknown outcome | **CODE DEFECT** | Several critical flows are idempotent, but there is no uniform client-generated idempotency key for every business mutation. A lost response after commit can leave UI outcome unknown and invite a second submission. | P1-10 | Generate an operation ID before submit, persist it through retries/refresh, expose operation status, and render explicit saved/not-saved/unknown states. |
| Input validation | **CODE DEFECT** | 86 API route files expose mutations. 22 use the bounded `readJsonRequest` helper. 31 directly call `request.json/text`; only 7 of those show an explicit byte cap, leaving 24 direct parser paths without a visible local size guard. Core accounting libraries check many finite/positive values, but validation is manual and inconsistent rather than schema-wide. | P1-07 | Adopt shared schemas and bounds for every mutation, including types, finite numbers, sign/range, decimal precision, dates, IDs, duplicates, string length, and foreign venue IDs. |
| Accounting numeric handling | **PARTIAL PASS** | Existing tests cover negative quantities, invalid conversions, missing/foreign FX, currency normalization, partial valuations, and cross-venue records. JSON cannot encode NaN/Infinity, but string coercion and extreme numeric bounds remain route-specific. | P1-07 | Add a generated mutation corpus for negative, huge, exponential, malformed date, duplicate ID, and wrong-venue values. |
| Two-principal isolation | **PASS for covered real API paths; TEST GAP for full matrix** | New synthetic test uses all migrations, independent principals/workspaces/venues, identical store keys, and a foreign venue request that resolves no membership/data namespace. The real local API harness passed with two synthetic accounts: 401 unauthenticated, 403 platform-admin denial, foreign venue-header tampering denied, identical entity IDs isolated, authorized venue switch isolated, and export isolated. | P2-01 | Extend the real API/UI harness across every nomenclature, purchase, warehouse, tech-card, employee, finance, upload, integration, and AI object ID. |
| Production schema/ledger | **BLOCKED BY INFRASTRUCTURE ACCESS** | Local ledger: 22 migrations through 0021 PASS. Production D1 ledger/object definitions are unavailable through the current hosting operator surface. | P0-04 blocker | Obtain authorized read-only production D1 metadata/ledger access; do not migrate production during verification. |
| Production backup/restore | **BLOCKED BY INFRASTRUCTURE ACCESS** | Synthetic SQLite backup/restore, digest, integrity, and FK checks PASS. No actual production-class recovery source or isolated restore authority exists. | P0-05 blocker | Authorized operator exports a consistent recovery source and restores only into a separate non-production D1 target. |

## D. Reliability

| Area | Status | Evidence | Priority | Action |
|---|---|---|---|---|
| Offline/network failures | **CODE DEFECT** | Some expensive reads use AbortSignal timeouts, but there is no global mutation timeout/outcome contract. 429, malformed JSON, disconnect-after-commit, and retry behavior are handled inconsistently. | P1-10 | Standardize transport errors and explicit unknown outcome; never enable blind retry without an idempotency key. |
| Error boundaries | **CODE DEFECT** | No `error.tsx`, `global-error.tsx`, React ErrorBoundary, or `componentDidCatch`. Startup listeners capture load failures, but widget failures are not isolated. | P1-12 | Add a global route boundary and local boundaries around Business Health, AI Doctor, reviews, integrations, and notifications. |
| Observability | **NOT READY** | AI usage has request IDs, latency and sanitized venue context. Client startup diagnostics sanitize URLs/tokens and attach venue ID. No global backend exception hook, frontend exception service, request/correlation ID middleware, release SHA on all logs, or general API latency instrumentation exists. Sentry/equivalent is absent. | P1-13 | Add structured JSON logging, request ID propagation, release/build fields, sanitized actor/venue fields, duration/status, and frontend/backend exception collection. |
| Health/readiness | **CODE DEFECT** | `/api/healthz` synchronously returns `status: ok` and `storage: sites-d1` without a DB query, timeout, degraded dependency state, or readiness distinction. It can be green while core requests cannot reach D1. | P1-14 | Separate liveness from readiness; issue a bounded read-only DB probe and return non-2xx/degraded when critical dependencies fail. |
| Release metadata | **PASS** | `/api/release` exposes no-store app version, build number, source commit, build timestamp, schema version, and environment. | — | Extend it with client compatibility fields, without exposing secrets. |
| Account lifecycle | **TEST GAP / INCOMPLETE PRODUCT CONTROL** | Create, invite, role change, disable, exact logout, other-session revoke, and password-reset all-session revoke exist. No self-delete, leave-venue, ownership transfer, or delete-owner policy is implemented; owner role cannot be assigned through the current member route. | P2-03 | Define ownership transfer/last-owner invariants, leave/delete semantics, retention, and revoke-all behavior before GA. |

## E. PWA/mobile

| Area | Status | Evidence | Priority | Action |
|---|---|---|---|---|
| PWA cache model | **PARTIAL** | Manifest and versioned assets exist. The only service workers are OneSignal workers importing the remote OneSignal SDK; there is no first-party application-cache/update lifecycle. Startup recovery can clear caches manually. | P1-11 | Define an explicit first-party update policy or document that the app is network-first and avoid uncontrolled application caching. |
| Old client/new backend compatibility | **CODE DEFECT** | Build/schema metadata exists, but the client never calls `/api/release`; mutations send no client contract version, and backend exposes no minimum supported build or mutation schema. | P1-11 | Add the compatibility handshake described below and reject incompatible mutations before side effects. |
| Startup/mobile regressions | **PASS** | Current browser rerun: 29/29 PASS across iPhone 13, Pixel 7 and desktop Chrome; startup recovery PASS with session preserved, stable splash box, successful handoff, and recovery after blocked bundle requests. Full artifact/navigation/form audits also pass. | — | Keep these jobs mandatory in CI. |
| Native release | **NOT IMPLEMENTED** | No iOS project, Android project, Capacitor/Cordova wrapper, native package IDs, signing structure, Gradle/Xcode projects, or native build scripts were found. | P2-05 | Treat current delivery as web/PWA only; create a separate native release plan if App Store/Play Store delivery is required. |

### Minimum compatibility handshake

1. Add `clientBuild`, `mutationSchemaVersion`, and a client-generated `operationId` to every mutation header/body.
2. Expose `minSupportedClientBuild` and `mutationSchemaVersion` from `/api/release`.
3. Validate compatibility before authentication-dependent side effects and return `409` or `426` with `CLIENT_UPGRADE_REQUIRED`.
4. Preserve the user's draft and operation ID, refresh assets, then retry only after the new client is active.

## F. Dependencies

Critical: **0**
High: **18 package-level findings in the full dependency tree; 5 in `npm audit --omit=dev`**
Medium: **4 in the full tree; 0 in `--omit=dev`**

| Package | Direct/transitive | Runtime relevance | Fix | Release classification |
|---|---|---|---|---|
| `xlsx@0.18.5` | Direct | **Reachable:** arbitrary authenticated spreadsheet uploads are parsed in catalog, purchases, inventory, sales and integration imports. Prototype-pollution and ReDoS advisories apply to crafted files. | No npm registry fix; maintained releases are distributed outside npm. | **P1-15**. Replace library/source or isolate parsing with strict CPU/memory/time limits before GA. See [prototype-pollution advisory](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [ReDoS advisory](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). |
| `next@16.2.6` | Direct | High advisories exist. No middleware/proxy, Server Actions, custom server rewrites, or untrusted image source was found, so the listed high paths were not proven reachable in BarDoctor. | `16.3.4`, non-major according to audit. | P2-04; test a targeted patch, do not mass update. |
| `postcss`, `nanoid` | Transitive via build/Next | No untrusted CSS/custom generator input found in runtime. | Available through dependency updates. | P2-04/build-chain hygiene. |
| `sharp` | Transitive via Next/miniflare | App upload normalization does not import `sharp`; Next Image is used only for a static forgot-password asset. | Available through dependency updates. | P2-04; patch after compatibility tests. |
| `react-server-dom-webpack`, Vite/Wrangler/Cloudflare chain | Direct/dev/build tree | Full audit reports high advisories; no Server Functions were found. Vite/Wrangler issues are development/build exposure, not hosted request paths. | Mostly non-major for Cloudflare/Vite/RSC; `vinext` fix is major/beta. | P2-04; update surgically with build/browser regression. |

No mass dependency update was performed.

## G. Tests added

New release command: `npm run test:release-safety`, included in `npm test`.

1. Synthetic principal A cannot resolve or read principal B's venue namespace.
2. Venue-role mutation remains venue-scoped and cannot become `owner`/`platform.admin` via request state.
3. Exact logout revocation and password-reset all-session invalidation remain server-side.
4. First-party TypeScript remains free of direct dynamic-HTML/code-evaluation sinks.
5. Representative purchase, integration, avatar, and venue-logo uploads remain authenticated, bounded, and account/venue-scoped.

Result: **5/5 PASS**.

Existing TypeScript suite result: **753/753 PASS**.
Release-infrastructure and production-safety evidence suite: **PASS**; local ledger 22 migrations and synthetic restore PASS.
Two-principal local API runtime: **PASS**.
Mobile/desktop browser regression: **29/29 PASS**.
Startup recovery browser regression: **PASS**.
Full `npm test`, typecheck, lint and reproducible build: **PASS**.

## H. Remaining code-side P0

Count: **0**

No code-side defect found in STEP 1.3 met P0 criteria. This does not close the two infrastructure-blocked P0 items.

## I. Remaining code-side P1

Count: **15**

1. P1-01 — auth/invite/reset throttling and registration enumeration.
2. P1-02 — 6-character password minimum, no compromised-password block, PBKDF2 cost below current OWASP baseline.
3. P1-03 — primary bearer token in `localStorage`, dual auth mechanisms, long replay window/no rotation.
4. P1-04 — platform-admin MFA absent.
5. P1-05 — state-changing public GET and query-token support in notifications runner.
6. P1-06 — main-shell CSP/security headers absent and inline execution blocks strict CSP.
7. P1-07 — inconsistent API schemas/bounds; 24 direct parser routes without visible local byte guard.
8. P1-08 — generic store mutation and audit are not atomic.
9. P1-09 — no mandatory storage-level optimistic locking/CAS; simultaneous read-modify-write can lose updates.
10. P1-10 — no uniform mutation idempotency/unknown-outcome contract for offline/retry/double-submit.
11. P1-11 — no old-client/new-backend mutation compatibility handshake.
12. P1-12 — no global/route/widget error boundaries.
13. P1-13 — observability code is incomplete.
14. P1-14 — health endpoint can return false-positive GREEN.
15. P1-15 — vulnerable direct `xlsx` parser is reachable from untrusted uploads.

## J. Infrastructure-blocked items

| ID | Item | Status | Classification |
|---|---|---|---|
| P0-04 | Production DB schema and migration ledger verification | **BLOCKED BY INFRASTRUCTURE ACCESS** | INFRASTRUCTURE ACCESS BLOCKER / PRODUCTION VERIFICATION BLOCKER |
| P0-05 | Production-class backup and isolated restore verification | **BLOCKED BY INFRASTRUCTURE ACCESS** | INFRASTRUCTURE ACCESS BLOCKER / PRODUCTION VERIFICATION BLOCKER |

These items are not PASS, are not mixed with code defects, and were not retried through secrets, production migrations, or production data access.

## K. Release score

Previous: **71/100**
New: **65/100**

The score decreases by six points because STEP 1.3 turned previously unmeasured code-side risk into evidence: 15 concrete P1 findings, including reachable auth/session, concurrency, readiness, and spreadsheet-parser risks. The score remains above the initial 36 because there are no new code-side P0s, the build/release evidence remains reproducible, tenant isolation is structurally strong, critical accounting lifecycles have sequential idempotency/atomic batch coverage, and 753 existing TypeScript tests plus 5 new release-safety tests pass. The two infrastructure P0 blockers cap the full release result.

## L. Verdict

CODE-SIDE: **🟡 BETA READY**
Suitable only for controlled beta with trusted users and restricted upload exposure. Not GA release-ready until the P1 list is remediated or explicitly risk-accepted with compensating controls.

FULL INFRASTRUCTURE: **❌ BLOCKED**
P0-04 and P0-05 still require authorized production D1 operator evidence.

## M. Что агент может делать дальше

Без operator access к production infrastructure агент реально может:

1. Implement and test durable auth/reset/invite throttling in local/test D1.
2. Migrate authentication from JavaScript bearer/localStorage to an HttpOnly cookie in a backward-compatible test release.
3. Remove notification GET side effects and query-token authentication; add scheduler auth/idempotency tests.
4. Add central security headers and CSP Report-Only, then remove inline execution and run browser regressions.
5. Replace/isolate `xlsx` and run safe malformed-file, size, CPU-time, MIME and cross-venue upload tests.
6. Make generic store + audit atomic and add storage versions/ETags with parallel conflict tests.
7. Add mutation operation IDs, outcome lookup, and old-client/new-backend compatibility rejection.
8. Add shared request schemas and generated negative/fuzz tests for every mutating API.
9. Add global and widget-level error boundaries with injected-failure browser tests.
10. Add structured request/error/latency instrumentation with release SHA, request ID, sanitized actor and venue context.
11. Split liveness/readiness and test D1 timeout/failure/degraded responses against a test dependency.
12. Extend the two-principal API/UI matrix across every requested object family using synthetic users only.
13. Run mobile/desktop, startup, keyboard, safe-area, selectors, forms and network-failure browser suites in CI/local infrastructure that permits loopback browser servers.
14. Define and test owner transfer, last-owner protection, leave venue, account deletion and revoke-all-session semantics.

The agent cannot close P0-04 or P0-05 without the missing authorized production infrastructure access.

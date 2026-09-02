# BarDoctor — STEP 1.4 P1 CODE-SIDE HARDENING

Date: 2026-09-02  
Scope: GitHub source, local code, CI/test tooling, synthetic SQLite/D1-compatible schema, and local browser QA.  
Safety boundary: no production deployment, production migration, production data mutation, production-secret request, or destructive production operation was performed.

## A. Executive summary

P1 before: **15**  
P1 closed: **5**  
P1 remaining: **10** — 9 PARTIAL and 1 PRODUCT DECISION REQUIRED  
P0 code-side: **0**  
Infrastructure-blocked P0: **2**

STEP 1.4 closed the code defects in authentication throttling/enumeration, the notification runner, generic-store atomicity, stale-client mutation compatibility, and false-positive readiness. It materially reduced the remaining session, password, CSP, validation, concurrency, error-isolation, observability, and spreadsheet-parser risks without claiming that partial controls are complete.

## B. Original P1 disposition

| P1 | Before | Action | Evidence | After |
| --- | --- | --- | --- | --- |
| P1-01 | No general auth/reset/invite limiter; account enumeration; about 40-bit invite codes | Added durable D1 identity/source/combined buckets, progressive bounded backoff, generic registration conflict, per-code invitation throttle, and 80-bit new invite codes while accepting old codes only through their existing 72-hour lifetime | `auth_rate_limits` migration; runtime blocks login after 8 attempts and invite guessing after 5 despite source/email rotation; raw identities are not stored | **CLOSED** |
| P1-02 | 6-character minimum, no common-password rejection, PBKDF2-SHA256 100k | New/reset passwords require 15–256 NFC characters; common/service passwords rejected; passphrases/Unicode/spaces remain valid; old credentials remain verifiable | Password tests cover minimum, maximum, Unicode/NFC, common passwords and legacy verification | **PARTIAL** — policy fixed; target Worker Web Crypto rejects PBKDF2 above 100k and no reviewed Argon2id/scrypt implementation is present |
| P1-03 | JavaScript-readable primary bearer in localStorage, dual auth, 30-day replay | Current client uses an HttpOnly SameSite=Strict cookie, receives no bearer, and no longer reads/writes the bearer; logout revokes server row; legacy cached clients retain bounded header compatibility | Runtime proves login/bootstrap in two tabs, forged/expired/stale-after-logout rejection and no bearer returned to `cookie-v1` client | **PARTIAL** — remove legacy header compatibility after rollout; add rotation/inactivity and shorter privileged sessions |
| P1-04 | Platform-admin MFA absent | Reverified server-only `platform.admin`, intent/origin/bootstrap controls; did not fabricate MFA | RBAC/escalation tests pass; code still reports MFA unavailable | **PRODUCT DECISION REQUIRED** — phishing-resistant enrollment, recovery and step-up policy is required; **MFA STILL REQUIRED** |
| P1-05 | Notification automation mutated on GET and accepted query token | GET now always returns 405; POST requires `Authorization: Bearer`; query-token path removed; existing delivery/run identities preserve dedupe | Source and local runtime tests prove GET/query rejection, Bearer POST, due/no-op behavior and repeat safety | **CLOSED** |
| P1-06 | Main shell lacked central headers/CSP | Added central CSP, `frame-ancestors`, HSTS, nosniff, no-referrer and Permissions-Policy; removed `unsafe-eval`; added shared server HTML encoder and payload tests | Header/XSS tests plus iPhone, Pixel and desktop browser QA pass | **PARTIAL** — legacy pixel-stable startup/print code still requires documented `unsafe-inline`; hosting-layer HSTS remains production verification |
| P1-07 | 24 directly parsed mutation bodies had no visible local cap; validation inconsistent | All direct JSON/text bodies now have explicit encoded-byte limits; shared default reduced to 1 MiB; negative tests cover malformed, non-object, declared and actual oversize bodies | Automated source inventory finds no uncapped direct parser; accounting/domain regression remains green | **PARTIAL** — 86 mutation routes do not yet share one formal schema/range corpus |
| P1-08 | Generic domain mutation could commit before audit failure | Domain upsert, audit rows and revision mutation now execute in one D1 batch with a mutation identity | Failure injection proves an audit failure rolls back the business mutation | **CLOSED** |
| P1-09 | No mandatory CAS; concurrent writers could silently overwrite | Added mandatory revision/CAS and 409 conflict to generic store; parallel writer test proves one winner and one conflict | `STORE_CONCURRENT_MODIFICATION`; runtime confirms no silent generic-store lost update | **PARTIAL** — dedicated purchase/inventory/write-off/tech-card/shift read-compute-batch flows still need storage predicates |
| P1-10 | No uniform operation/outcome contract | Preserved existing document-level idempotency; generic store now has `mutationId`; incompatible stale clients are rejected before mutation | Sequential accounting idempotency and generic parallel tests pass | **PARTIAL** — no uniform operation-status lookup or saved/not-saved/unknown UI for every mutation |
| P1-11 | Cached old client could mutate a newer backend | Added release contract identity, client handshake/header, proxy rejection before side effects, and a single manual reload prompt without a reload loop; documented network-first PWA policy | Missing/stale/future contract returns 426; current contract and GET pass; mobile/desktop and cold-start QA pass | **CLOSED** |
| P1-12 | No global/route error boundary | Added `app/error.tsx` and `app/global-error.tsx` with recovery UI | Typecheck/build and failure-contract tests pass | **PARTIAL** — Business Health, AI Doctor, reviews, integrations and notifications still lack independent widget boundaries |
| P1-13 | No normalized global observability contract | Added validated request IDs, response propagation, release SHA, endpoint/category/duration, sanitized account/venue context, backend exception helper and authenticated frontend diagnostic hook | Tests prove correlation, redaction and structured fields; no tokens/passwords are logged | **PARTIAL** — **CODE READY FOR MONITORING** for implemented paths; global latency coverage and a production provider are not configured |
| P1-14 | Health always returned green without DB access | `/api/healthz` performs a bounded read-only `SELECT 1`, reports dependency/release state, emits request ID, and returns 503 for missing/failing/timed-out D1 | Unit and local runtime checks prove ready, failure and timeout behavior | **CLOSED** — this is code/test evidence, not production DB verification |
| P1-15 | Reachable vulnerable `xlsx@0.18.5`; no npm fix | Added common size/signature/binary gate before all seven parser calls and parser-level row limits; patched supported framework/toolchain dependencies without `--force` | Empty/oversized/disguised-binary tests pass; production audit now has one HIGH (`xlsx`) instead of five HIGH packages | **PARTIAL** — upstream `xlsx` prototype-pollution/ReDoS advisory remains; parser replacement or process isolation is required |

## C. Security improvements

- Durable server-side throttling for login, registration, password reset, invitation guessing, bootstrap and session exchange.
- Identity, source and combined limiter keys are SHA-256 fingerprints; plaintext email/IP/token values are not persisted.
- Registration no longer identifies an existing email through a distinct 409/message.
- New invitation entropy increased from about 40 to 80 bits, with no forced invalidation of still-valid legacy invitations.
- Current first-party client authentication is HttpOnly-cookie primary; forged, expired, revoked and post-logout sessions fail closed.
- Notification automation is POST/Bearer-only; sensitive tokens are absent from URL/query handling.
- Central CSP/security headers are enforced; `unsafe-eval` is absent; shared HTML escaping has script/event/SVG/entity regression payloads.
- Spreadsheet uploads receive common pre-parse size/signature checks and row limits at every SheetJS call.

## D. Accounting/data safety improvements

- Generic domain write + audit log is one atomic D1 batch.
- `domain_data` carries revision and mutation identity via migration `0023_store_atomic_revision.sql`.
- Stale generic writers receive HTTP 409 rather than silent last-write-wins.
- Failure injection proves audit failure leaves no partially committed domain mutation.
- Existing sequential idempotency remains green for purchases, sales, write-offs, inventory and shift close.
- All remaining direct API body parsers have explicit byte caps; the shared default is 1 MiB.

## E. Reliability improvements

- Old or future-incompatible clients cannot execute protected accounting mutations.
- Release metadata now publishes current/minimum mutation contract versions.
- PWA policy is explicit and network-first; update UX asks for one manual reload and avoids a reload loop.
- Health readiness includes a bounded real test-DB query and fails non-green on a critical dependency failure.
- Global and route render failures have a recovery surface.
- Structured errors carry correlation ID, release SHA, endpoint, category, duration and sanitized tenancy context.
- Targeted dependency updates reduced full-tree HIGH findings from 18 to 3.

## F. Tests added

New suites/files:

1. `tests/auth-rate-limit.test.ts` — policies, durable route coverage, enumeration, invite entropy/throttle, fingerprint storage.
2. `scripts/verify-auth-hardening-runtime.mjs` — real local D1 login/invite throttling and session lifecycle.
3. `tests/session-cookie-hardening.test.ts` — cookie flags, no current-client bearer/localStorage, forged/stale/expiry/multi-tab contracts.
4. `tests/notification-run.test.ts` additions plus `scripts/verify-notifications-runtime.mjs` — method/auth/query/idempotency compatibility.
5. `tests/store-atomicity.test.ts` — atomic failure injection and concurrent revision conflict.
6. `tests/security-headers-xss.test.ts` — global headers/CSP and safe script/event/SVG/entity payload rendering.
7. `tests/api-input-bounds.test.ts` — exhaustive direct-parser inventory and malformed/oversized body cases.
8. `tests/client-contract.test.ts` — stale/missing/future/current mutation compatibility.
9. `tests/readiness-observability.test.ts` — DB success/failure/timeout plus request IDs/redaction/structured fields.
10. `tests/spreadsheet-safety.test.ts` — OOXML/OLE/CSV acceptance and empty/oversized/disguised-binary rejection.

Updated runtime/browser harnesses additionally verify readiness, atomicity/CAS, cookie-primary auth, notification scheduling, release compatibility and current header/XSS behavior.

## G. Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Build | **PASS** | Verified Vinext/Vite production artifact; tracked source unchanged |
| Typecheck | **PASS** | `tsc --noEmit` |
| Lint | **PASS** | 0 errors; 11 pre-existing navigation warnings |
| Tests | **PASS** | Full `npm test`; TypeScript suite 778/778, artifact and post-test suites pass |
| Security | **PASS** | Release-safety 5/5 plus new auth/session/header/XSS/input/spreadsheet suites |
| Auth | **PASS** | Local D1 runtime: login 8-attempt threshold, invite 5-attempt threshold, generic responses, cookie lifecycle |
| RBAC | **PASS** | Platform-admin and venue-role escalation negatives pass; MFA is separately not implemented |
| Isolation | **PASS (covered scope)** | Synthetic two-principal namespace/API tests and existing cross-venue domain/upload/export tests |
| Data integrity | **PASS** | Atomic rollback, migration ledger, relationship and accounting regressions |
| Idempotency | **PASS (existing covered flows)** | Purchases, sales, write-offs, inventory and shifts remain sequentially idempotent; uniform outcome contract remains P1-10 |
| Concurrency | **PASS (generic store scope)** | Parallel CAS conflict test; dedicated lifecycle CAS remains P1-09 |
| Browser | **PASS** | Production-like local browser run |
| Mobile | **PASS** | iPhone 13 and Pixel 7 |
| Desktop | **PASS** | Desktop Chrome |
| Startup | **PASS** | Stable splash/cold-start and previously repaired startup-recovery harness |
| PWA | **PASS (implemented contract)** | current/stale/missing/future contract and cold/warm client logic |
| Reproducible build | **PASS** | clean-install dry run, deterministic adapter check and verified source-read-only build |

Final browser matrix: **29/29 PASS** across iPhone 13, Pixel 7 and desktop Chrome.  
Local migration ledger: **24 migrations through schema 0023 PASS**.  
Synthetic restore: **PASS** with integrity `ok`, zero FK violations and matching digest; this is not a production backup/restore claim.

## H. Remaining P1

1. **P1-02 PARTIAL** — password policy is hardened; replace/upgrade the 100k PBKDF2 implementation only after a compatible target-runtime KDF is proven and benchmarked.
2. **P1-03 PARTIAL** — remove legacy bearer-header compatibility after the cached-client rollout; add rotation, inactivity and privileged-session expiry.
3. **P1-04 PRODUCT DECISION REQUIRED** — define and implement phishing-resistant platform-admin MFA enrollment, recovery and step-up.
4. **P1-06 PARTIAL** — extract/noncify the remaining legacy inline startup/print code without reintroducing splash movement.
5. **P1-07 PARTIAL** — move every mutation to shared formal schemas and generated accounting boundary cases.
6. **P1-09 PARTIAL** — add storage-level conditional predicates to dedicated accounting read-compute-write flows.
7. **P1-10 PARTIAL** — add uniform operation IDs, outcome lookup and explicit saved/not-saved/unknown UI.
8. **P1-12 PARTIAL** — add isolated boundaries to the five critical widgets.
9. **P1-13 PARTIAL** — extend request/latency instrumentation globally; production monitoring provider remains not configured.
10. **P1-15 PARTIAL** — replace or isolate SheetJS; the direct HIGH advisory has no npm-registry fix.

## I. Infrastructure blockers

P0-04 production DB schema/migration-ledger verification:  
**BLOCKED BY INFRASTRUCTURE ACCESS**

P0-05 production-class backup/isolated restore verification:  
**BLOCKED BY INFRASTRUCTURE ACCESS**

Neither item is PASS. Both are infrastructure-access/production-verification blockers, not code defects. No production migration, data read/write, restore, secret request or workaround was attempted.

## J. GitHub

Branch: `hardening/step-1-4-p1-2026-09-02`  
Release-candidate code SHA: `a77b5cdbc5fb2e37a259a89b9578c573496c1fde`  
Pull request: `#5` (draft, no merge/deploy)  
CI: **GREEN** — `release-gate` run 10; verify and browser-critical jobs PASS  
Working tree: **CLEAN before report creation**  
Release metadata: app/build/source/schema plus mutation contract identity; schema `0023`, contract `1`

The report itself is a documentation-only closing commit after the release-candidate code SHA; it does not change the tested runtime artifact.

## K. Score

STEP 1.3: **65/100**  
STEP 1.4: **78/100**

The score increases by 13 points because five P1 defects are closed with runtime/test evidence and the other safely addressable areas gained meaningful compensating controls. Authentication and invitation brute-force exposure, notification GET/query-secret behavior, generic-store partial commits, stale-client mutation risk, and false-positive readiness are closed. Dependency HIGH findings fell from 18 to 3 in the complete tree and from 5 to 1 in the production tree.

The score is deliberately capped below public-release readiness because ten P1 remain: admin MFA, legacy session compatibility/rotation, dedicated accounting CAS, uniform unknown-outcome handling, strict CSP completion, complete mutation schemas, widget isolation, full observability, stronger KDF implementation and the unfixed SheetJS advisory. The two infrastructure P0 blockers cap the full-release result separately.

## L. Verdict

CODE-SIDE: **🟡 BETA READY**

The code is materially safer and suitable for controlled beta. It is not honestly **PUBLIC-RELEASE CODE READY** while the remaining P1 items above are unresolved or formally risk-accepted with proven compensating controls.

FULL RELEASE: **❌ BLOCKED BY INFRASTRUCTURE**

P0-04 and P0-05 require authorized production D1 operator evidence.

## M. Remaining work agent can do without infrastructure access

1. Remove the legacy JavaScript bearer/header session path after a measured compatibility window and add rotation/inactivity tests.
2. Prototype and benchmark a target-runtime-compatible Argon2id/scrypt implementation without invalidating existing passwords.
3. Implement platform-admin MFA after the enrollment/recovery product decision is supplied; keep server-only RBAC meanwhile.
4. Extract or nonce inline startup/print code while preserving the already verified fixed splash geometry.
5. Complete shared server schemas and generated negative accounting inputs for all mutation routes.
6. Add conditional storage predicates and parallel-request tests to dedicated purchases, inventory, write-offs, tech cards and shift close.
7. Add uniform operation IDs, operation-status lookup and explicit unknown-outcome UI for network disconnects.
8. Add independent widget boundaries and injected-failure browser tests for Business Health, AI Doctor, reviews, integrations and notifications.
9. Extend structured request/latency instrumentation across all API paths and prepare a provider-neutral production monitoring adapter.
10. Replace SheetJS with a reviewed maintained parser, or isolate parsing behind hard CPU/memory/time boundaries, then rerun import QA.
11. Expand the real two-session UI/API isolation matrix to every object-ID family.
12. Define and test ownership transfer, last-owner, leave-venue, account deletion and revoke-all lifecycle rules.

Native iOS/Android implementation remains a separate store-distribution release track and was not started in STEP 1.4.

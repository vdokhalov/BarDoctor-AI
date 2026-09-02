# BarDoctor — STEP 1.5 REMAINING P1 CLOSURE

Date: 2026-09-02  
Scope: code, local synthetic D1, CI and browser/test environments only. No production deployment, production data operation, production migration, secret change or production D1 verification was performed.

## A. Executive summary

Score before: **78/100**  
Score after: **82/100**

P1 entering STEP 1.5: **10**  
Closed: **1**  
Partial: **8**  
Blocked: **0** (within the ten STEP 1.5 P1)  
Deferred: **0**  
Decision required: **1**

Code-side P0: **0**  
Infrastructure P0: **2 — P0-04 and P0-05 remain BLOCKED BY INFRASTRUCTURE ACCESS**

STEP 1.5 closed the remaining widget-isolation test gap and materially reduced session, CSP, validation and observability exposure. Seven code-side P1 remain because their safe closure requires a reviewed KDF/runtime change, session rotation, removal of legacy inline styles, a complete mutation-schema corpus, storage-level accounting serialization, a uniform operation-status architecture, or replacement/isolation of SheetJS. Production monitoring remains an external-infrastructure gap. Platform-admin MFA remains an owner decision and public-release requirement.

## B. Remaining P1 disposition

| P1 | STEP 1.4 status | Remaining gap | Action | Evidence | STEP 1.5 status |
| --- | --- | --- | --- | --- | --- |
| P1-02 | PARTIAL | Worker Web Crypto rejects PBKDF2 above 100k; no reviewed Argon2id/scrypt path | Reverified target constraint; retained 15–256 character policy, common-password rejection and legacy verification; did not substitute an unreviewed KDF | `lib/bardoctor/password.ts`; password regression in full suite | **PARTIAL — CODE LIMITATION** |
| P1-03 | PARTIAL | Legacy bearer compatibility, no inactivity/rotation/short privileged lifetime | Removed active JavaScript/localStorage bearer use; retired server-session exchange; bearer headers are rejected; added 7-day inactivity, 30-day absolute expiry, hourly activity touch and 8-hour platform-admin ceiling; migrated active/browser/runtime callers to cookies | `tests/session-cookie-hardening.test.ts`; auth runtime proves no bearer return/replay, forged/expired/inactive rejection and cross-tab logout revocation | **PARTIAL — CODE LIMITATION** — server-side rotation is still absent |
| P1-04 | PRODUCT DECISION REQUIRED | No platform-admin MFA enrollment, recovery or step-up policy | Reverified server-only platform-admin authorization and prepared the decision below; no custom MFA/provider was invented | Admin runtime: owner/manager/employee 403, direct route 404, header tampering denied, audit immutable | **PRODUCT DECISION REQUIRED** |
| P1-06 | PARTIAL | CSP `unsafe-inline`; production HSTS unverified | Hash-pinned executable inline shell code; removed script `unsafe-inline` and `unsafe-eval`; retained style-only `unsafe-inline` because current React/legacy dynamic styles break under a hash-only policy; reran 29-case browser matrix | `lib/bardoctor/security-headers.ts`; `tests/security-headers-xss.test.ts`; mobile/desktop 29/29 PASS | **PARTIAL — CODE LIMITATION**; HSTS proof remains infrastructure-only |
| P1-07 | PARTIAL | 86 mutations lack one shared formal schema/range corpus | Closed the highest-risk purchase/write-off accounting gaps: strict finite numbers, ISO dates, maximum ranges, item-count and string bounds; retained existing global body-size enforcement | `tests/purchases.test.ts`; `tests/write-offs.test.ts`; full 1,258-test gate | **PARTIAL — CODE LIMITATION** |
| P1-09 | PARTIAL | Dedicated accounting read-compute-batch flows lack storage predicates | Traced purchase, inventory, write-off, tech-card and shift flows. D1 `batch()` is atomic but cannot abort the whole batch when a conditional update affects zero rows; a naive CAS predicate could therefore partially commit. Existing generic-store CAS and rollback proof retained | Data-control runtime proves audit rollback and generic CAS conflict; inventory concurrent-finalization tests pass | **PARTIAL — CODE LIMITATION** — requires serialization/Durable Object or aggregate revision architecture |
| P1-10 | PARTIAL | No uniform operation-status lookup or unknown-outcome UI | Reverified strong document identities and idempotency for covered accounting flows; did not apply weak heuristic dedupe. Uniform status lookup/UI remains an architectural change | Purchase, sales, inventory, shift and write-off idempotency regression PASS | **PARTIAL — CODE LIMITATION** |
| P1-12 | PARTIAL | Five critical widgets lacked independent boundaries | Added reusable widget boundaries and safe failure probes for Business Health, AI Doctor, reviews, integrations and notifications; added the proof to the full artifact gate | `tests/widget-boundaries-v405.test.mjs`; full suite; 29/29 browser matrix | **CLOSED** |
| P1-13 | PARTIAL | Global latency coverage and production provider absent | Added normalized backend request completion/error telemetry with request ID, release SHA, endpoint, category, duration and sanitized account/venue context; added frontend global/widget error hooks and redaction | `tests/readiness-observability.test.ts`; runtime structured logs | **PARTIAL — EXTERNAL INFRASTRUCTURE** — code observability PASS; production collection/alerting NOT CONFIGURED |
| P1-15 | PARTIAL | Reachable direct `xlsx@0.18.5` HIGH; no registry fix | Re-audited package and all guarded import paths. Current pre-parse signature/size/row bounds remain. No unsafe mass/major update performed | `npm audit`: 0 critical, 3 high, 4 moderate; `xlsx` has no npm fix | **PARTIAL — CODE LIMITATION** |

The five P1 already CLOSED in STEP 1.4 were not reopened. No new regression evidence justified doing so.

## C. Security

- Primary authentication is now an HttpOnly, SameSite=Strict server cookie. New/current clients receive no bearer token and D1-backed APIs reject bearer replay.
- Legacy session exchange returns `410 LEGACY_SESSION_EXCHANGE_REMOVED`; active auxiliary clients and QA harnesses now use cookie authentication.
- Sessions enforce a 30-day absolute lifetime and seven-day inactivity timeout; stale, forged, expired and revoked sessions fail closed. Platform-admin eligibility additionally requires a session no older than eight hours.
- Executable CSP sources are self/hash-pinned without `unsafe-inline` or `unsafe-eval`. `frame-ancestors`, `object-src 'none'`, `base-uri`, `form-action`, nosniff, referrer and permissions policies remain centralized.
- Platform-admin role/claims remain server-derived. Runtime escalation attempts by owner, manager and employee fail.

## D. Data safety

- Purchase confirmation/update rejects malformed dates, booleans/coercions, NaN/Infinity, negative/unsafe monetary values, excessive item counts and oversized strings.
- Write-offs reject blank/boolean/non-finite quantities and values above the accounting ceiling.
- Generic domain-store conflict detection still produces one winner and one `409 STORE_CONCURRENT_MODIFICATION`; audit failure rolls back the generic mutation.
- Dedicated multi-row accounting CAS is not declared solved: current D1 batch semantics cannot conditionally abort all following statements after a zero-row compare-and-set.
- Browser relationship QA covers procurement, warehouse, menu/tech cards, finance-linked purchase deletion and venue switching with synthetic identities only.

## E. Reliability

- Backend request telemetry now covers success and exception paths and propagates validated correlation IDs.
- Frontend global, widget and window failures use normalized, redacted diagnostics; no password, session token or API key field is emitted.
- Business Health, AI Doctor, reviews, integrations and notifications fail independently instead of taking down the whole Home/application surface.
- Health/readiness code and synthetic DB check remain green. This does not assert production D1 health.
- Startup recovery preserves the session and presents a recoverable state when bundles fail.

## F. PWA/mobile

- Current client/backend compatibility tests reject missing or stale mutation contracts before routing; read-only traffic remains compatible.
- Assortment, procurement and menu browser fixtures were migrated from JavaScript bearer tokens to real synthetic cookie sessions.
- Venue-switch fixtures use deterministic, venue-scoped bootstrap data; no entity or disclosure state from Venue A appears in Venue B after a cold render.
- The dated procurement/finance fixture now requests its explicit August 2026 accounting period, eliminating calendar rollover ambiguity without changing assertions.
- Final browser matrix: **29/29 PASS** across iPhone 13, Pixel 7 and desktop Chrome profiles.

## G. Dependencies

`npm audit` result: **Critical 0; High 3; Moderate 4; Low 0**.

| Package | Relationship / environment | Reachability | Fix assessment | Disposition |
| --- | --- | --- | --- | --- |
| `xlsx@0.18.5` | Direct production dependency | Reachable only through authenticated, byte/signature/row-bounded import paths | No npm-registry fix; advisories cover prototype pollution and ReDoS | Retain P1-15; replace or isolate after a reviewed Worker-compatible choice |
| `image-size@2.0.2` | Transitive through `vinext`; development/build tree | No BarDoctor runtime upload/parser path identified; used by build metadata tooling | Suggested fix is `vinext@1.0.0-beta.9`, a semver-major beta | No risky automatic upgrade; documented dev-tool risk |
| `vinext@0.0.50` | Direct dev dependency | Build-time only for the reported chain | Same semver-major beta upgrade | Deferred pending controlled framework migration |
| `drizzle-kit` / nested `esbuild` chain | Direct/transitive dev tooling, MODERATE | Local schema tooling only; not production request runtime | npm proposes a semver-major/downgrade path | No unsafe formal-score update |

## H. Product decision

**Decision: platform-admin MFA enrollment, step-up and recovery policy before public release.**

- **Option A — managed OIDC/identity provider with passkeys or hardware security keys.** Strong phishing resistance, provider-managed recovery/audit, and the recommended public-release default.
- **Option B — managed provider TOTP MFA.** Faster/common deployment, but weaker against phishing and recovery abuse.
- **Option C — keep platform-admin access disabled outside a tightly controlled beta until A or B is selected.** Lowest immediate implementation risk, but public release remains blocked for admin operations.

**Recommended: Option A**, with two-person/admin recovery, audited step-up for platform-admin actions, and recovery codes stored outside BarDoctor. The owner must choose; STEP 1.5 does not make this product/security decision automatically.

## I. Verification

| Gate | Result |
| --- | --- |
| Full tests | **PASS — 1,258/1,258** across artifact, data-integrity, taxonomy, security and TypeScript suites |
| Build | **PASS** |
| Typecheck | **PASS** |
| Lint | **PASS — 0 errors; 11 pre-existing navigation warnings** |
| Security | **PASS — release-safety 5/5 plus full security regression** |
| Auth | **PASS** — rate limit, enumeration response, cookie primary, bearer replay rejected |
| Session | **PASS for implemented lifecycle** — forged/expired/inactive/revoked rejected; rotation remains P1-03 |
| RBAC | **PASS** — platform-admin escalation runtime denied |
| Isolation | **PASS** — API two-principal/venue runtime plus browser venue switching |
| Validation | **PASS for added accounting boundaries**; full mutation-schema corpus remains P1-07 |
| Idempotency | **PASS for covered purchase/sales/inventory/write-off/shift flows**; uniform outcome contract remains P1-10 |
| Concurrency | **PASS for generic CAS and inventory finalization**; dedicated multi-row storage predicates remain P1-09 |
| Data integrity | **PASS** — rollback, month lock, exports and venue-scoped stores |
| Browser | **PASS** — assortment, procurement, menu and relationship E2E |
| Mobile | **PASS** |
| Desktop | **PASS** |
| Startup | **PASS** — successful handoff and failure recovery |
| PWA | **PASS for implemented client-contract/version gate** |
| Reproducibility | **PASS** |
| CI | **GREEN — GitHub Actions `release-gate`, run 22 for code RC** |

Synthetic migration ledger: **25 deployable migrations, schema version 0024**. Synthetic restore: **PASS**, integrity `ok`, zero FK violations, digest matched. These are test evidence only and do not close production P0-04/P0-05.

## J. GitHub

Branch: `hardening/step-1-4-p1-2026-09-02`  
PR: [#5 — draft](https://github.com/vdokhalov/BarDoctor-AI/pull/5)  
Final code SHA: `33c584cc694571bed1f49d5a8974d9e2d1075985` (GitHub; local equivalent `d9def0a195ae60ebb0c0a5ce1de4e54d71ce9268`)  
CI: **GREEN — release-gate run 22**  
Working tree: **clean after the report commit**  
Release metadata: build/release identity verified; no production version was published.

## K. Remaining code-side P1

Count: **7**

1. P1-02 — reviewed target-runtime password KDF above the current PBKDF2 constraint.
2. P1-03 — server-side session rotation.
3. P1-06 — remove style-only `unsafe-inline` after extracting dynamic/legacy styles.
4. P1-07 — formal shared schema/range corpus for all mutations.
5. P1-09 — storage-level serialization/revisions for dedicated multi-row accounting flows.
6. P1-10 — uniform operation status lookup and explicit saved/not-saved/unknown UI.
7. P1-15 — maintained Worker-compatible spreadsheet parser or isolated parsing boundary.

## L. Deferred/external P1

Count: **2**

1. P1-13 — production error collection and alerting provider are not configured; code observability is ready.
2. P1-04 — platform-admin MFA requires the owner decision in section H and an external managed identity capability.

No remaining STEP 1.5 P1 was deferred to the native release track.

## M. Infrastructure blockers

P0-04: **BLOCKED BY INFRASTRUCTURE ACCESS** — production D1 schema/migration ledger was not verified and is not PASS.

P0-05: **BLOCKED BY INFRASTRUCTURE ACCESS** — production-class backup/restore, PITR, RPO and RTO were not verified and are not PASS.

Production RUM/uptime/alert delivery was not declared PASS without an installed provider and operator evidence.

## N. Score

STEP 1.4: **78/100**  
STEP 1.5: **82/100**

The four-point increase reflects one fully closed P1 (critical widget isolation) and substantial, tested reductions in session replay exposure, CSP script execution, accounting input handling, observability coverage and browser/E2E proof. The score remains below public-release readiness because seven code-side P1, one external monitoring gap, one owner MFA decision and two production-infrastructure P0 blockers remain.

## O. Verdict

CODE-SIDE: **🟡 BETA READY**

No new code-side P0 was found. The verified code is suitable for continued controlled beta/test use, but the remaining accounting concurrency/outcome, KDF/rotation, CSP-style, schema-corpus and spreadsheet-parser risks prevent a `PUBLIC-RELEASE CODE READY` verdict.

FULL RELEASE: **❌ BLOCKED BY INFRASTRUCTURE**

P0-04 and P0-05 remain explicitly blocked and are not PASS. No production deployment was performed.

## P. Next available step

**Yes** — without production infrastructure access, BarDoctor can proceed to **PRE-STEP 2 — CORE ACCOUNTING INTEGRITY AUDIT IN TEST ENVIRONMENT**.

This may examine remaining purchase/inventory/write-off/sales/shift/tech-card atomicity, reconciliation and concurrency behavior using synthetic principals and databases. It must not be called official STEP 2, must not operate on production, and cannot close P0-04/P0-05.

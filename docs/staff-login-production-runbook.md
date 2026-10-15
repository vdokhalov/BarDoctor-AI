# Staff login production change plan — NOT executed

Target: existing public Sites project appgprj_6a5734bb1abc81919ff978ed0020c64b,
DB binding DB, R2 binding BUCKET unchanged. Current live source e339cc993ccb18941c472a732fab1a82966f16b1,
version 520. Do not register another project, change audience or create a PR to
trigger CI implicitly. Feature GitHub sync alone does not publish.

## Required changes relative to v520

Application: PIN credential/member services, global login/session services,
strict ingress selector, scoped auth + transactional POS guard, Worker gateway,
/login and /staff-login, /staff-access and management links, cashier identity/
logout/draft isolation, login/access JS assets and login entry link. Removed draft
/api/staff-pin/device is absent; no production activation endpoint is introduced.
Exact inventory: `git diff --name-status e339cc993ccb18941c472a732fab1a82966f16b1 HEAD`.
No payroll/cost calculations, permissions outside this flow, CI policy, audience,
R2 contents, existing business data or existing credentials require changes.

Apply schema in this order, once, via Sites deployment migration mechanism:

| Migration | Effect |
| --- | --- |
| 0026_staff_pin_credentials.sql | salted credentials, PIN lookup uniqueness, issuance/revocation audit |
| 0027_staff_pin_sessions.sql | attempt counters and historical inactive device/session tables |
| 0028_staff_pin_revocation.sql | historical device generation; membership credential epoch/revocation and historical session triggers |
| 0029_staff_login.sql | unique usernames, new login sessions, session-delete triggers, counter cleanup index |
| 0030_staff_login_revocation_epoch.sql | monotonic epoch for username/workspace-member/venue/workspace transitions |
| 0031_staff_login_attempt_limits.sql | persistent login/credential budgets, concurrency leases, reset/new-name recovery triggers and indexes |

All are additive, schema-only; no staff, PINs or business records are seeded.
Keep 0027/0028 dependencies: removing historical tables would break later SQL.
Do not rewrite already-applied migrations. Existing schema/journal history ends
at 0020 in Drizzle metadata, with subsequent SQL already following the repository's
manual migration convention. build/sites-vite-plugin.ts copies the entire drizzle
folder to dist/.openai/drizzle. Before release verify the exact packaged migration
inventory and the platform's pending/applied ledger; a local SQL fixture is not
proof that hosted migration discovery applied every file. Do not blindly regenerate
Drizzle history from the incomplete schema.ts representation.

Runtime configuration, through native Sites update_environment_variables only:

| Key | Kind | Value / prerequisite |
| --- | --- | --- |
| STAFF_PIN_LOOKUP_KEY | secret, is_secret=true | generate >=32 random bytes through approved secure workflow; used for issuance/reset uniqueness, not login verification |
| STAFF_PIN_SOURCE_POLICY | OPTIONAL, leave absent | enables only an additional source throttle after independent verification; not required for account-bound admission |

No new OpenAI/API/provider credential is needed. Never print a secret, commit it,
put it in hosting.json/browser assets, or request plaintext in chat. Preserve
unrelated runtime entries. No runtime settings were inspected for secret values
or changed in this review. The current tool accepts project_id and set_values
entries {key,value,is_secret}; removal uses remove:[key]. Retain returned revision
and follow runtime application instructions; do not assume changes take effect
without a redeploy if the platform says otherwise.

## Build and validation gate before a release decision

Technical minimum for this auth change (planned, not a substitute for CI policy):

1. Locked dependencies, then ONE exact final `npm run build` (existing verified
   build, including pre/post build behavior). Check resulting /login and session
   routes, Worker node:net compatibility, copied 0026–0031 SQL and exact source
   provenance. No hand-built partial bundle for publication.
2. `node --import tsx --test tests/staff-pin-session.test.ts tests/staff-pin-credentials.test.ts tests/access-control.test.ts tests/auth-schema-recovery-p0.test.ts tests/auth-bootstrap-state.test.ts tests/account-lifecycle.test.ts tests/pos-security-recovery.test.ts tests/cashier-dialog-recovery.test.ts`
3. `node --test tests/staff-pin-d1-runtime.test.mjs` and
   `node --import tsx --test tests/pos-release-amendment.test.ts tests/business-dates-guard.test.ts`.
4. Exact emitted regular auth smoke in Chromium/WebKit using existing
   scripts/auth-recovery-p0-browser.ts; staff WebKit390 using
   `node --import tsx scripts/staff-pin-browser.ts`. Verify management return,
   A->B->A, uncertain payment retry, second tab and revoke on final code.
   The staff harness uses actual handlers, not a built platform ingress, so an
   account-bound admission requires no hosted IP proof. Hosted ingress testing is mandatory only before enabling the optional source policy.

The CURRENT unchanged policy classifies this as full. Release requires successful
changes, auth-recovery-p0, verify-core, verify-browser, sales-navigation,
sales-scroll-layout and required-gates; sales-presentation is skipped in full
mode. New staff tests must also be recorded explicitly (do not assume workflow
lists include them). The narrower list above estimates technical work, not a
waiver of any required gate. No full workflow/build was launched in this review.

## Application sequence after separate authorization

Use mandatory account-bound limits and leave the optional source policy unset. Confirm current
live version and migration ledger/backups with platform-supported operations.
Build/test exact source; use Sites source helper to push/package the reviewed
commit, preserving project identity. Save the archive-backed version, then use
public deploy_site_version for this existing public Site. Sites applies migrations
before Worker upload: a failed deployment can still have changed D1. Inspect its
terminal result and exact migration state before retrying. Provision approved
runtime entries through Sites, respecting returned application instructions.
No employee credentials should be issued until schema, runtime and auth checks
are confirmed. Initial staff creation/issuance is an explicit owner/manager task,
not a migration or a synthetic test against real business records.

## Rollback / disable

- Removing STAFF_PIN_SOURCE_POLICY does NOT disable login; it only removes an
  optional extra source throttle. Account-bound protections always remain active.
  To stop staff access use the complete rollback or approved revocation below.
- For a complete application rollback, redeploy the saved v520 archive-backed
  version through Sites after resolving its actual saved version ID. Do not
  fabricate an ID. Old application does not authenticate bd_pos_session; managers
  use ordinary login. Preserve additive tables/audit and all sales; no DROP or
  whole-DB restore. A build-only rollback does not undo migrations.
- Before re-enabling staff access after an incident, revoke existing credential
  revisions and delete new/historical sessions through an approved forward-only
  emergency migration, applied by the supported Sites pipeline. Proposed SQL
  (NOT executed): UPDATE staff_pin_credentials SET revision=revision+1,
  revoked_at=CURRENT_TIMESTAMP; DELETE FROM staff_login_sessions;
  DELETE FROM staff_pos_sessions. Use separate migration statements and then
  explicit owner/manager PIN reissuance. Retain audit and authorship history.
- Do not remove/rotate STAFF_PIN_LOOKUP_KEY casually: changing it without reissuing
  all credentials invalidates the uniqueness lookup scheme. Preserve it during
  rollback unless compromised; compromise requires a separately reviewed rotation
  and revocation plan. Never restore a snapshot over subsequent business sales.
- If migration state is uncertain or supported rollback controls are unavailable,
  keep staff login disabled and escalate to the platform; no ad-hoc production SQL
  endpoint or alternate database credentials.

Release blockers: acceptance of the bounded six-digit guessing/targeted-lockout tradeoff; final build/emitted checks and
mandatory full CI; hosted migration inventory/ledger confirmation; separately
approved runtime provisioning and release. No release PASS yet.

Current design and residual risk: [IP-independent admission](staff-login-account-limits.md). No new required source/IP runtime setting.

# App-only calendar release composition

Base: production v666 /1433c8dc04b33bf63e5fb3a6290cb41fec0a3b8e, confirmed by read-only Sites metadata on29October2026. Source development checkpoint c7c483d1de479a5ad7903162296b9bc6f16420e2 remains intact in its original worktree. This branch starts directly from production, not from experimental ancestry.

## Included
Free attributed country dates/coverage, preliminary evidence for unscored events; signed public GitHub release discovery and pinned producer verification; R2 v2 atomic last-good storage and hourly source freshness; per-venue existing domain_data CAS, source revision/backoff, marks/hidden/date conflict retention and pending-reminder protections; automatic nonblocking app startup with session/venue guards, bounded failure retries and authoritative-session bfcache recovery; admission kill switch. Calendar user auth/membership middleware unchanged. Existing notification scheduler stays unchanged.

## Excluded
No added routes. No holiday-source push endpoint, holiday-background-sync endpoint, OIDC feed/background identity, background D1 store/DDL, sweep/continuation/fencing or cross-venue dispatcher. No holiday call from Worker scheduled(). No new cron/configuration, GitHub workflow, generator/publisher installation, service credential or runtime setting. Legacy push-trust is ignored and cannot enable feed. Existing baseline Worker, vite config, hosting manifest, migrations and legacy public app bundle are unchanged.

Three runtime seams differ from c7c483d1:
- holiday-feed.ts retains only signed-source enable/read, strict schema/hash validation and reviewed country rules/aliases/conflicts. Legacy receiveHolidayFeed/identity/trust/v1 pointer removed.
- holiday-signed-source.ts reads only R2; no backgroundLastGood/D1 fallback or background checkpoint export. Trust-policy comparison,120sCAS lease, hourly success/failure freshness and failed-source last-good remain.
- holiday-auto-sync.ts retains only scoped status/syncHolidayAccount with per-venue CAS/profile guard and notification safeguards. No BackgroundGuard, batch cache, runHolidaySync or drainHolidayBackground. Each authenticated venue owns its source request, global signed source lease still coalesces shared downloads.

## Dependencies / activation (NOT installed)
Existing DB domain_data and BUCKET bindings. No new D1 schema. Existing nodejs_compat. Vendored verifier uses pinned @sigstore/verify4.1.2, core4.0.1, bundle5.0.0, protobuf-specs0.5.0; lockfile/source and Apache2 notices included. Root package.json and the complete production build-verified.sh pipeline are unchanged. The temporary Phase3a5 invariant adaptation and its associated tests are excluded.

HOLIDAY_SIGNED_SOURCE: exact nonsecret docs/examples/holiday-signed-source-pinned.json, releaseFeed:true, repository vdokhalov/BarDoctor-AI, repositoryId1289866712, ownerId300073239, caller signed-release.yml/main, immutable signed-producer.yml@14727f8a7a12d653fdf634f36dcb8d9fb8a77eac, public Sigstore root,14day candidate freshness. No GitHub or Sites token. HOLIDAY_AUTO_SYNC_DISABLED=true pauses admission; false/absent enables normal flow. No HOLIDAY_FEED_TRUST or background variables.

Production metadata read for readiness: v666/deployment appgdep_6ae18376c19081918c3c4d4fb5160297 succeeded, public, settings revision15, no HOLIDAY_* entries. No settings changed. Publication/activation remain separate decisions.

## Local verification
67 focused app tests +5 release-discovery tests PASS; startup13 tests included. App-only tests enforce schema rejection, no legacy endpoint/DDL/activation and shared signed reader requiring no D1. Runner-specific tests replaced with per-venue isolation assertions; all decision/deletion, source failure, CAS, date and reminder tests retained.

Commands:
```
node_modules/.bin/tsx --test tests/free-holiday-calendar.test.ts tests/cis-holidays.test.ts tests/opportunity-evidence.test.ts tests/holiday-auto-sync.test.ts tests/holiday-notification-guard.test.ts tests/holiday-pinned-release.test.ts tests/holiday-published-release.test.ts tests/holiday-signed-open.test.ts tests/holiday-sync-control.test.ts tests/holiday-startup-client.test.ts tests/holiday-synthetic-delta.test.ts tests/holiday-app-only.test.ts
node --test tests/holiday-release-source.test.mjs
bash scripts/build-verified.sh
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsx scripts/holiday-synthetic-open-browser.ts
```
The npm lifecycle retains its known baseline failure: its older prebuild restore sequence omits later presentation layers. This release uses the existing canonical command above, documented in production docs/qa/utility-meters-2026-10-27.md; no invariant is disabled or patched.

Typecheck baseline only: business-health-snapshot.ts372 TS2322 and health-partial-operations-v539.test.ts10 TS2352. Final build/UI outcome recorded with the exact commit in task report; this document is not hosted approval.

Country coverage remains partial; see published-feed-coverage-20261028.md. Static professional supplements do not become automatically renewed by the signed feed. MD uses separately translated OpenHolidays. No invented religious/local dates or scores. Real signed releases prove signature/discovery, not a changed payload; synthetic revisions prove changed-data behavior separately. Startup1–2seconds is not achieved consistently; previous local mock timings are not production/iPhone measurements. No closed-app calendar sync claimed. Already successful page contexts stay deduped through bfcache; no continuous polling.

## Smoke and recovery gate
After separately approved deployment/configuration: authenticated owner app launch, calendar GET, automatic check without blocking UI; verify exact source policy/digest and last-good, viewer403 on mutation, marks/hidden retained. Do not send test notifications or create real business data. Hosted public-asset access and real provider network are not proved by local fixtures.

Prefer disabling new automatic admission while preserving trust/current source and saved calendars if an issue appears. Already admitted requests can finish. Rolling code back to v666 does not undo saved calendar changes or cancelled pending reminders; do not delete source objects or rewrite historical data as rollback. No schema rollback is needed because this release adds no DDL.

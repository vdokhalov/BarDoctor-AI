# Phase 2 reload action regression after production v466

Production v466 (`99db847b675b71f79ec198e84e6b8b2b7b67c80d`) remains deployed. Phase 2 is incomplete until the next approved deployment passes the full production smoke; no Phase 3 implementation is included.

## Proven root cause

The Menu action uses the existing conjunction `inventory.manage && CloudSync.isReady && activeVenueId > 0`. The authenticated owner, server permissions, active venue/workspace, taxonomy and saved item were valid. The condition that became false was **CloudSync.isReady**.

The restaurant/profile provider initializes synchronously from a cached profile and then refreshes it through `/api/restaurants/me`. The refreshed profile is a new object, even when its fields are unchanged. CloudSync's effect depends on that object (`[profileReady, profile]`). On reload, profile refresh can therefore clean up an in-flight store hydration. Cleanup marks that hydration cancelled. A separate one-shot ref, however, blocked the replacement effect from starting another hydration. The cancelled request could still apply stores/finance readiness, but its cancelled flag prevented setting CloudSync ready. The Menu action consequently remained absent indefinitely, despite successful HTTP responses.

The same race was reproduced locally using the shipped React client, real profile/bootstrap/store handlers and isolated SQLite. Before and after confirm, owner permission, profile readiness and CloudSync readiness were true, with one Add button. After a reload racing fresh profile against the store response, permission/profile/venue remained valid, finance readiness was true, but CloudSync readiness and `canManage` were false, with zero Add buttons. This also explains why taxonomy labels could remain correct while the action disappeared. No feature flag or Menu loading/error gate changed; the permission gate never failed.

## Minimal fix and authorization contract

CloudSync now gives each profile-dependent effect its own hydration lifetime. It removes the incompatible one-shot ref and discards a cancelled/unmounted bulk-store response before applying stores, readiness or queue work. A fresh profile starts a current hydration that can reach ready. Unchanged dependencies still cause one read. The canonical generated client and its existing preparation script contain the same provider change.

There are no new timers, retries, role/venue special cases, security bypasses or taxonomy changes. The Menu action's conjunction, client permission resolver, server authorization, active-venue isolation, ingestion and persistence handlers remain unchanged. Owner and permitted manager see the action once hydration is ready. A user without `inventory.manage` cannot see it and receives HTTP 403 from the real ingestion endpoint.

## Regression coverage

- `tests/cloud-sync-profile-hydration.test.mjs` executes the actual shipped provider with dependency/cleanup semantics: cached-to-fresh profile race, stale cancelled response, unchanged dependencies/later hydration, and unmount. Before the fix, three of four tests failed, including permanently false readiness and stale writes. The suite is mandatory in `npm test`/GitHub CI.
- `scripts/menu-ingestion-phase2-browser.ts` uses real isolated HTTP handlers and SQLite at 390×844, 412×915 and 1280×800. It covers five existing/stock-first owner profiles, mobile/desktop manager, and mobile/desktop without `inventory.manage`. The denied fixture permits unrelated shell finance reads to isolate the inventory permission; it never grants inventory management.
- Each permitted profile checks direct Menu navigation, Add visibility, Manual draft/validate/confirm, reload and Add still visible. Import and Scan also reload and recheck Add. Final mappings and repeated real login/bootstrap recheck the same gate. Reload deliberately lets fresh profile identity arrive during a delayed store response. Read-only React context snapshots record the exact readiness/permission conjunction.
- Full ingestion scenarios retain Import Diff additions/changes/unchanged/invalid/conflict, validation correction, duplicate exclusion, concurrent stale target, cancel before confirm, unchanged data before confirm, lost-response retry and repeated-confirm idempotency. Existing menu records, recipes, nomenclature and balances are preserved.
- Canonical API, overview API and visible Menu grouping verify Bar/Alcohol plus Kitchen/Food, Hookah/Tobacco, Household/Cleaning and Administration/Services before and after reload. The v465 taxonomy correction is preserved.

External OCR output is a fixture at the provider boundary; its adapters, normalization and ingestion lifecycle use real handlers. Mobile checks are browser viewport/touch emulation, not physical devices. This is local regression evidence, not a production smoke PASS.

## Verification completed before commit

- Targeted provider/startup tests: 15 passed. Targeted ingestion/RBAC/bootstrap/analytics API tests: 42 passed.
- Build, typecheck and lint passed. Lint has zero errors and two existing unrelated unused-variable warnings in unchanged files.
- Full `npm test` passed every stage, including 1,334 TypeScript tests, artifact/data integrity suites and the new four provider tests. No failures or skipped tests.
- Final Phase 2 browser matrix passed all nine profiles, including owner and manager ingestion flows, every source reload, repeated login/bootstrap, and hidden action plus real API 403 for both denied profiles.
- Existing Menu consumption browser compatibility, Recipes real-handler SQLite desktop/mobile, POS desktop/mobile/tablet, Warehouse manual/package/CSV/cancel/confirm/reload desktop/mobile, and compiled Worker/static client desktop/mobile release integrity passed.
- Reviewed final paths: CloudSync provider and its generator, mandatory regression hook, provider test, read-only browser helper, expanded existing Phase 2 browser harness, and this report. Every client byte outside the provider is unchanged from v466. Schema, migrations, server permission rules, dependency lock and business data contracts are unchanged.

## Data safety

No database schema, migrations, backfill, canonical assortment transformation, server permission rules or production business data change. All test writes target synthetic accounts/venues in isolated local SQLite. Neither production QA venue 3314 nor any real working venue is mutated by this work. No rollback or deployment is performed during preparation.

Verification logs and browser snapshots/screenshots are ignored local artifacts in `outputs/phase2-reload-action-fix/` and `outputs/menu-ingestion-phase2/`. The exact committed source must pass all GitHub jobs before a matching Sites version is saved. Production deployment requires the user's final confirmation.

# Account and venue lifecycle

Baseline inspected: production v442, `f432cfe68ba6e894a3b5334973def9f354af68eb`, branch `fix/product-inventory-phase1`.

## User entry points

Settings contains **Управление заведениями**, **Архив заведений**, and **Удалить мой аккаунт**. All open `/settings/lifecycle`, an identity-authenticated management page that also works without an active venue. The existing new-venue form is reused. Zero-active-venue recovery offers creation, archive and account management rather than repeatedly redirecting to setup.

Archive/restore reuses `PATCH /api/venues/:id`. Permanent deletion uses `DELETE` on that route. `GET/DELETE /api/users/lifecycle` provides the own-account deletion plan and command. Permissions are checked on the server against owner membership and an active workspace membership, independently of the selected venue. Ordinary venue lists remain active-only.

## Deletion and retention

- Archive hides the venue from normal switching, clears obsolete session selections, and preserves its identity and business data. Restore updates the same record.
- Venue deletion requires its exact current name. The server first quarantines the venue as `deleting`, disables integration synchronization and ingress credentials, stops notification work, cancels scheduled provider notifications, and clears session selections. Pending provider requests must settle before deletion proceeds.
- It then deletes the venue's R2 prefixes (`venues`, `purchases`, `sales`, `catalog`, `employees`), migration snapshots/operations, invoice-recognition jobs, operational stores, audit, AI usage, local connection credentials, membership/invitation and integration rows. Empty workspaces and standalone data containers are removed. Existing account identities and other venues are preserved. No external Google account, external business profile, or external service data is deleted.
- A storage/provider/database failure never returns successful deletion. Quarantined venues remain visible to their owner as incomplete deletion. The same command can be repeated; scoped completion receipts prevent duplicate cleanup. Database changes are transactional and guarded by current owner membership/status. No bulk normalisation or data migration is involved.
- Account deletion verifies the current password, or the existing trusted platform identity for an identity-only account. It requires `УДАЛИТЬ АККАУНТ`. Each last-owned venue additionally needs its own exact-name confirmation. Shared venues with another active owner are preserved; their ownership reconciliation anchor passes to a remaining owner. Merely being a member never authorizes deletion of another venue.
- The profile, credential material, avatar, all sessions, memberships, personal notifications and platform privileges are removed. Anonymous technical account IDs remain where needed by shared business history, immutable administration audit, and workspace references. Shared business history and administration audit are retained; this is explained before confirmation. A non-reversible email digest prevents the legacy import route from resurrecting an erased identity. No email-address identity or login credential remains on that technical record.
- Fresh registration uses a new user ID. Bootstrap distinguishes identity incarnations rather than just email and clears prior local business caches and pending writes when the ID changes. Existing users retain their cache when upgrading. Account deletion clears BarDoctor local/session storage before opening registration.

## Verification

`tests/account-lifecycle.test.ts` executes the actual routes, password/session authentication and service code against an isolated SQLite database with all repository migrations. R2 is an isolated object-store fixture with injected failure; no production data or real external notifications are used. Tests cover owner/foreign-owner authorization, current/last venue, archive/login/restore, delete/retry/isolation, wrong password, last-owner confirmation, other-account survival, shared primary data containers, session revocation, legacy-import prevention and same-email fresh registration. `tests/account-lifecycle-client.test.ts` verifies cache incarnation behavior and entry-point wiring.

`scripts/account-lifecycle-browser.ts` serves those same real handlers and isolated database over HTTP. It exercises archive/reload/restore, cancel and close, exact-name confirmation, incorrect password, preserved input, storage failure/retry, last-venue empty screen, account deletion and browser cache clearing. Screenshots and measurements are written to `outputs/account-lifecycle/`.

Local browser verification: headless Chrome 153, desktop 1280×850 and mobile viewport/touch emulation 390×844 and 412×915. Reduced-height input checks use 430 CSS px. These are **not physical iPhone/Android or OS-keyboard tests**. GitHub CI also runs the lifecycle browser suite alongside the existing full regression workflow. Build, final-commit CI and release identifiers are reported in the delivery message.

Production publication requires a separate final confirmation. Deployment approval never authorizes deleting existing production venues or accounts. Production smoke must remain non-destructive.

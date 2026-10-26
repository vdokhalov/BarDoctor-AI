# BD-03 — imported employee job title

Baseline: v652, `2ccfde1556ac9ddd4297bc3cf7c103351ebbd347`.

## Evidence and cause

The audit CSV maps `position` to the integration's canonical `role` field (label «Должность»). `universal-file-adapter` preserves that value, but the generic domain writer previously copied it directly to `bd_employees`. The card and profile editor read `position` and `customPositionLabel`, so the imported title disappeared from those screens. The exact CSV failed the route test before this fix (`position` undefined).

Parent's authorized read-only check of venue 3394 independently confirmed the historical employee has `role: Бариста`, no `position`/`customPositionLabel`, and the audit external ID. This is evidence of the defect in v652, not a live verification of the unpublished fix.

## Change

Employee imports normalize the job title to the existing editor dictionary. Known labels/codes ignore surrounding whitespace and case. Other nonempty titles, including Бариста, use `position: other` and retain their title in `customPositionLabel`. Empty new titles and the bare selector «Другое» produce an import validation error. An empty title on an update preserves an existing valid title. External identity/upsert behavior is unchanged.

Both authorized store GET paths provide the same compatibility view for legacy imported employees of the current venue with a missing position. They recover the already stored title without writing to the database or overriding an existing position. Manual profiles lacking import metadata are not interpreted this way. A subsequent explicit profile save can persist the displayed title through the existing handler.

This is employment profile information, not account authorization. No membership, PIN, access-role, schema, or production-data changes. No employee count (BD-12) fix.

## Verification

- Real preview → import → store route with the audit CSV.
- 32 targeted tests passed: employee-import-position, integration-hub, integration-mapping-venue-isolation.
- Existing dictionary parity, standard/custom titles, whitespace/case, validation, repeated external ID, blank update, tenant isolation, memberships unchanged.
- Legacy compatibility through bootstrap and individual GET; database rows unchanged; existing manual position retained.
- Final `scripts/build-verified.sh` passed. No product inputs changed afterward.
- Typecheck retains only two known baseline failures: business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.
- Compiled UI uses an isolated SQLite fixture and real import/store handlers; CSV is submitted by the harness, not the browser file picker. Card and editor at 390/820/1280, reload/Back, invalid empty custom title, manual edit and creation/cancel. Screenshots in outputs/employee-import-position.
- Browser mutation whitelist permits only the fixture's bd_employees store save; no PIN or AI requests.

## Limits

No live import or employee edit was performed. No publication. Physical-device keyboard and the browser CSV file-picker interaction were not retested. The canonical import field remains named `role` for compatibility; it is translated at the employee writer boundary.

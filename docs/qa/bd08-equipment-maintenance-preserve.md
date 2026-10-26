# BD-08 — preserve maintenance during equipment profile editing

Baseline: production v653, f0ad56f12991563cfc0568690f7a949afeb3671c. Local isolated fixtures only.

## Proven cause

The verified-maintenance POST saves `lastMaintenance` in `bd_equipment` and returns updated equipment/history/work orders. The browser's `bdEquipmentPersistWorkOrderV167` publishes those arrays through `Kse` and `bd:store-updated`. The detail page uses `bdUseEquipmentArrayV167`, which subscribes to that event. The shared `sle` EquipmentProvider did not subscribe: it retained its pre-maintenance state. Editing the model/installation called its `updateEquipment`, which merged against that stale state and persisted an array without the newly saved date. The editor did not explicitly clear lastMaintenance; server GET was not a derived-date projection.

The compiled browser fixture reproduced the actual final maintenance-verification → edit model plus installation → store PUT path before the fix: lastMaintenance became undefined while the work/history remained. Five provider regression cases also failed before the fix.

## Bounded change

- EquipmentProvider subscribes to the existing equipment-store notification and updates state/ref from the current venue-scoped store.
- Profile updates merge against that current store rather than a previous render. Other equipment and independent fields remain intact.
- If a newly entered installation date is later than a known last-maintenance date, the existing field displays: «Дата установки позже последнего ТО. Проверьте дату.» This is an advisory check, not a new chronology policy or history mutation.
- No backend accounting, repair workflow, permissions, data migration or last-maintenance inference is changed. A repair date is not substituted for maintenance.

## Verification

56 targeted tests: equipment-maintenance-preserve, equipment-maintenance-history, equipment-plan-date, equipment-management, equipment-breakdown, equipment-repair-list, equipment-header-action. Provider tests cover model-only, installation-only, both, empty optional fields, repeat, venue switch, and equipment without maintenance. Real route regression checks that repair verification retains prior maintenance/history.

Final build: `bash scripts/build-verified.sh` PASS. Build-only blank-line drift removed, nonblank bytes asserted unchanged; emitted asset identity refreshed by finalize-prepared-client-release. Tests use the final source.

Compiled UI (`scripts/equipment-maintenance-preserve-browser.ts`) uses actual handlers, an isolated SQLite DB and deterministic server time 2026-10-25. A fixed maintenance work order is seeded; the final verification is submitted through the real UI. It produces lastMaintenance 25 Oct and nextMaintenance 1 Nov. Profile edits preserve both and the exact history/work-order arrays. Screens at 390/820/1280, reload, other equipment, optional-field clearing, cancellation and repeated click. No AI, production or external data writes.

## Boundaries

- The initial detected/assigned/in-progress transitions are not repeated by this UI fixture; adjacent workflow tests cover them.
- Browser Back between two directly opened card URLs returned to /home in the local harness. Data remained unchanged and direct reopening/reload preserved maintenance; correct return-route behavior is not claimed by this test. No navigation code was changed.
- The isolated server omits unrelated dashboard endpoints (404), so this is not a whole-app network smoke test.
- Two existing TypeScript failures remain: business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10. No new type failures.
- The detail page's existing 820px layout is cramped (outside this persistence fix); the edited form is usable at all three tested widths. No responsive redesign included.
- Already lost lastMaintenance values are not restored automatically. Their surviving verified maintenance history must be checked before a separately authorized repair. No production record was edited or migrated.
- No push, version save or publication performed.

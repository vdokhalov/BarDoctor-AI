# Tech card client refresh and conflict handling

Scope: the existing menu/tech-card flow, after production v441 (`003164d8c6c4b46d15b956c5b7fb4fb24898e61c`). No server contracts, calculations, consumption modes, permissions, schema, or production records are changed.

## Findings

1. `bdIngredientReferenceConflictV440` ignored the server's `resolutionStatus: reference_conflict` whenever the local catalogue could not resolve both references. The new unit regression fails against the old helper (`false` instead of `true`). The client now retains the authoritative warning even with an empty catalogue. Explicit product selection clears the stale resolution marker while setting all three references together. Unit conversion alone cannot clear the conflict.
2. `bdCatRecipeEditor` copied its recipe prop only in the initial `useState` call. A later store update changed the source but left the open editor on its old copy. The browser regression saves another value through the actual store handler, reads it over HTTP, and delivers that response through the application's cache notification. The v441 client fails to show the new value; the fixed client updates a pristine editor.
3. If the user has already edited the form, a source update preserves their input and blocks both confirmation and draft saving, with an explanation to reopen. It does not silently merge or discard changes. The warning scrolls with the content; the compact mobile action bar is preserved.

The fresh read-only production session showed the conflicting references correctly before this fix. Therefore the earlier intermittent observation is not described as a universal overwrite on every open. The original iPhone `Load failed` transport error has not been independently captured by this regression.

## Verification

- Unit coverage: authoritative conflict with missing catalogue; explicit repair; pristine refresh; dirty-input preservation; unchanged notifications; persistent save guard.
- Artifact replay: legacy patch chain twice, one helper, refresh wiring, save-handler guard, conflict-preserving unit conversion, no lost menu transition handler.
- Actual GET/PUT handlers and isolated SQLite: conflicting, correct, new, multiple-ingredient recipes and another venue; unrelated conflicts; rejection of invalid confirmation.
- Chromium browser: 1280×800, 390×844, 412×915; direct opening without a write; menu transition; taxonomy failure/retry; save/read/reopen; conflict repair; cancellation; source refresh; both save actions blocked after a concurrent change.
- Mobile keyboard coverage is reduced-viewport simulation only. No physical iPhone, Android or native keyboard was tested.

Browser evidence is written to `outputs/general-tech-card-v440/`. The optional `BD_QA_CLIENT_BASELINE` test input serves an immutable earlier client for a negative run; its output is separate under `outputs/general-tech-card-v441-baseline/`. Persistence still uses the real handler in both runs.

Full mandatory GitHub CI on the final commit is the release gate. The first local Windows build attempt hit the local runner's 240-second timeout. The subsequent direct compilation and the unchanged post-build validation completed successfully (`VERIFIED BUILD PASS`). Production remains on v441 until the corrected release is approved and deployed. No `PRODUCTION VERIFIED` claim is made by this document.

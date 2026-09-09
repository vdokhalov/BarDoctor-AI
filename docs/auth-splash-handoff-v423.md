# Anonymous startup overlay fix

## Proven reproduction

Offline exact committed public files from v420 (7dc906e6) and v422 (0c5d5c11), fresh browser storage, entry /home, bootstrap returning 401 / needsLogin:

- SPA navigates to /login and commits the real email/password form.
- After 14 seconds data-bd-startup-pending is still v201; the fullscreen static splash remains visible.
- No JavaScript page errors. Home-only first-paint completion cannot release an auth page; the watchdog no longer recovers once the path is /login.

This reproduces a concrete defect consistent with the user's embedded-browser-only symptom, also present in v420. It does NOT prove the affected embedded session had empty storage, or explain previous 30-second Worker cancellations.

## Fix boundary

The canonical shell patch installs an auth-page layout effect. It removes the launch overlay only after a committed auth surface exists on /login or /register. Existing Home coordination remains unchanged. No bypass of authentication, no new session, no database changes, timeout changes, retries or browser-specific sniffing. Both client loader and module cache identities change to deliver the fix.

## Tests

New full-client browser test uses actual public HTML, bootstrap, module and CSS with deterministic unauthorized API responses. Both / and /home on 390x844 and 1280x720 must reach login, allow clicking/filling the email input (not merely locate it behind the overlay), remove splash and scroll lock, keep session absent, and not render protected Home. No production network allowed.

Local: new browser test PASS (four cases), typecheck PASS, 18 auth/startup tests PASS, 24 persisted Phase 4 tests PASS. Local focused lint did not complete in sandbox and was interrupted; no lint PASS claimed. Full verified build/regression and browser matrix remain the mandatory GitHub CI gate. Safari/WebKit and actual embedded production smoke remain unverified. Production remains v420; no deployment authorized by this change.

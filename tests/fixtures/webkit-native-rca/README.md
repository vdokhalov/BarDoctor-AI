# Preserved native WebKit RCA controls

These raw process logs and lifecycle JSON are unmodified copies of the v485/v486 RCA artifacts. `manifest.json` records source commit, CI run/attempt (or local baseline gate), original artifact name and SHA-256 for each copy. No tokens, cookie values or real venue data are present. Tests verify the checksums.

The two 1280px first-mount timeouts have NetworkProcess SIGABRT, intact-then-lost authentication in the same document, and post-crash WebKit internal network errors. They precede month-close reads. The Health controls capture guarded empty-auth401 after the same native/session loss chain. The completed month-close controls capture all application assertions PASS, then WPEWebProcess SIGSEGV during teardown; the candidate 820px log includes interleaved unfinished/resumed clone3 (TID7793).

The saved schema-v1 evidence has no step/expected-response annotations. Compatibility is confined to the exact original first-mount callsite and to the full completed month-close suite's single stale-input409 and foreign-venue401. New live schema-v2 evidence records explicit first-mount state and expected response context. Incomplete suites, remount timeouts and unverified HTTP errors receive no compatibility exception.

These controls do not establish that any arbitrary WebKit timeout/crash is environmental. Negative mutations and synthetic process controls must remain APPLICATION_FAIL. All browser suites and their application assertions remain mandatory.

The two `live-*` controls were captured during this hardening validation with schema-v2 diagnostic worktree observations; their application source/build remains a3a08dac. They are marked `diagnosticWorktree: true` rather than attributed to an already committed classifier. They prove a known fixture request internal error after native loss and a secondary WPE fault after the failed guarded read and observed context close. Negative controls remove/reorder that evidence.

The `live-readiness-insufficient-evidence` raw control deliberately remains APPLICATION_FAIL: native loss alone cannot waive a navigation-button timeout without its specific ready-step marker and server-side month-close auth evidence. New observations supply those facts prospectively; historical raw evidence is never fabricated or rewritten.

# BD-13 — saved market focus

Baseline: v661 / 271d8c7096cd199b9f457f1c9afd328272592507. Isolated SQLite and real authenticated market GET/PATCH routes; no provider calls.

## Reproduction
The baseline browser saved new focus with the same address. PATCH persisted it in the existing analysis, but reopening showed the old empty value. Reload (after awaiting GET) restored it. Thus this reproduced the audit's visible symptom, not loss of that existing analysis on the server. saveLocation updated only restaurant, while showLocation read analysis.focus.
Two adjacent persistence gaps: without a previous analysis no focus was stored; explicit empty text fell back to the previous value and could not clear it.

## Change
Save focus as restaurant.marketFocus, with legacy analysis.focus fallback for existing data. Accept the saved analysis in the client immediately and update the scoped snapshot. Explicit blank is preserved, including the input for a later user-requested paid run. No AI is run by this save. Existing analysis contents/generatedAt remain intact.
Profile and pending-analysis changes commit in one existing CAS batch; injected failure rolls back both. Missing coordinates remain absent rather than becoming zero during repeated saves. Existing permissions unchanged. Market script URL updated to invalidate cached client code.

## Checks
- 7 focused tests PASS: 5 actual-route tests for initial/legacy focus, same-address and address-only updates, clearing, idempotent repeat, atomic failure/retry, own/foreign venue isolation; 2 adjacent partial-evidence regressions.
- Browser with real local API: baseline reproduction; final immediate reopen/reload, text clear, changed address, HTTP error retains inputs, retry, Cancel discards unsaved text. No POST /api/market; external traffic blocked. 390/820/1280 screenshots inspected, no horizontal overflow/page exceptions.
- Final verified build PASS; emitted Worker contains the new script URL and persistence path. Generated whitespace drift restored only after non-whitespace byte equality; release assets re-finalized and validated, browser and seven tests rerun PASS. Typecheck reports only known failures: business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10.
- Old market-management-v329 test: 5 pass, 1 obsolete static assertion fails expecting saveAnalysis(account.id, payload, casSnapshots). That string is absent in unchanged v661 as well (existing retained-result path). Not changed as part of BD13.

Screenshots: outputs/bd13-market-focus/focus-{390,820,1280}.png. Reproduction: BASELINE=1 node --import tsx scripts/market-focus-browser.ts on baseline source.

No production mutation, live acceptance, paid analysis, full regression, push or deployment. Browser reloads are explicit; a native multi-venue picker was not exercised (API isolation tested). No change to competitor quality or source verification is claimed.

# Sales shell and tab latency follow-up

Production v507 uses a fullscreen Sales iframe above the app frame. Its route contract disables the shared bottom navigation; cashier also has a separate document handler. This explains the inconsistent navigation even though local back/management links exist.

The candidate reuses the existing `nt` app frame, `Tle` navigation and canonical route header contract for journal and cashier. Direct cashier entry serves the same authenticated SPA host; embedded cashier remains the existing workspace. The staff navigation uses the same component with a POS-only item list. No new sales workspace/data store is introduced. Navigation QA must cover entry/exit, role, venue, and unfinished work for every changed page.

## Measured local reproduction

`scripts/cashier-tab-performance.ts` runs the exact v507 cashier.js from e70c7ede and the candidate against the same isolated server/data, mobile390 Chromium, with a controlled 1200ms latency on each API request. This reproduces network-wait amplification; it is not a hardware iPhone measurement or a claim about production p95.

| View | v507 visible / ready | Candidate visible / ready |
|---|---|---|
| Current shift | 4925 / 4963 ms | 35 / 2513 ms |
| Report | 6397 / 6399 ms | 43 / 2627 ms |

v507 awaits four sequential reads for overview and five for report before rendering. Report is read twice. The candidate renders the selected view immediately, loads base sales/orders concurrently and independent view data concurrently, and reads the report once. Existing data is not marked fresh until reads succeed. Tabs remain navigable during view refresh; mutation controls remain guarded. Stale navigation responses cannot select an older tab. No paid AI or production writes are involved.

Live read-only QA supplied by parent found warm Chrome 0.31–0.32s for cached local tabs and 1.91s to Report on two QA receipts; journal→cashier1.46s, journal reload2.79s for nine documents. Hardware iPhone5–10s was not independently reproduced. The full-history/server aggregation cost remains a separate potential scaling limit; this change does not rewrite accounting reads.

## Home component review correction

The stable presentation restore ran after the initial workday patch and overwrote `bdHomeDaily` input wiring. The final restore now explicitly retains `operationalDays`, the visible clock hook, and memo dependencies. The regression executes the actual bundled component with unchanged profile/revenue, a saved OPEN date, and a midnight clock update; helper-only coverage was insufficient.

Instrumented repeat observed no >50ms main-thread tasks in the baseline tab transitions; candidate Report had one122ms task, other transitions none. Warm transitions made no auth-bootstrap requests. Thus the reproduced multi-second delay is dominated by serial request waits, not a measured multi-second render. Polling was held constant with the browser test clock; existing visible-only15s refresh and revocation/recovery scenarios passed in the separate real POS run.

Final checks: build PASS (`index-BQGspy0I-83553aa859e5.js`),21 targeted domain/component tests plus7 navigation-contract tests PASS; POS262API calls on390/820/1440 PASS; three-role navigation PASS; real quick-draft exit/return and persisted pending retention on390/1280 PASS; six legacy-close cases PASS. Typecheck PASS; lint0errors/3existingwarnings. No full CI or deploy.

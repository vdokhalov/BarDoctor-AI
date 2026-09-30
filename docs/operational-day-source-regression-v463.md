# Phase 1A source/finality regression after production v463

## Root cause and scope

Production smoke reported a correct `BARDOC_POS / FINAL` API response but an unknown-source label in Shifts on desktop and mobile. The actual client `Ur` Finance hook gated the Operational Day GET solely on `Ai().isReady` (global CloudSync readiness).

The existing CloudSync `Woe` effect depends on the restaurant profile. With a cached profile, fetching the refreshed profile cleans up the first hydration effect. Its `useRef` one-shot guard prevents restarting that effect; its cancelled completion does not set global `isReady`. Authoritative Finance warm/full hydration nevertheless sets the separate existing `financeReady` flag. A delayed-profile/store reload reproduces `isReady=false, financeReady=true`, no Operational Day request, and the conservative fallback label. The original cold-bootstrap-only smoke did not exercise this order.

The narrowly scoped fix allows the Operational Day read once either global stores or authoritative Finance are ready. No other CloudSync workflow is changed. Source/finality continue to come from the API; fallback remains conservative. No date, amount, sale-type heuristic, server classification, schema, ledger or business-data change.

## Regression coverage

- Client hook tests reproduce finance-ready/global-not-ready and check `BARDOC_POS / FINAL -> Продажи BarDoctor · Итог`, MANUAL_SUMMARY, IMPORT, INTEGRATION and LEGACY_UNKNOWN, plus PROVISIONAL/UNKNOWN labels, waiting before hydration, input immutability and old-venue metadata isolation.
- The real-handler browser suite exercises both fresh and cached-profile startup/reload, and explicitly observes the blocked global readiness state. It checks FINAL in cards and the read-only editor on mobile and desktop, and all five source labels in cards/detail using synthetic API contracts. Server classification is verified separately by the existing Phase 1A tests.
- Existing operational independent-save, PROVISIONAL -> FINAL, malformed-response fallback, Finance amount and captured Warehouse movement checks remain in the same suite.
- CI runs both fresh and cached-profile modes, followed by the repository's full regression jobs. Production publication requires separate final user confirmation.

All browser writes in these tests use synthetic isolated SQLite fixtures. No production business data is modified.

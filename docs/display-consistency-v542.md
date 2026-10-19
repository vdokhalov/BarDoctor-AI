# Three post-v541 display fixes

Baseline: b0b0b0d589c1de9956d0220cc3303e5f79d0e127 (v541). No business commands or live data changes.

1. General warehouse movements previously used the browser store array `_`; only a sourceDocumentId route used the server-backed reader. Clearing the document filter returned to the browser cache, which could be empty/stale despite persisted movements. The same bounded, venue/auth-checked, revision-pinned server reader now serves the general Movements tab. Legacy arrays also support the paginated general API read; normalized journals retain the existing keyset path. Document filtering still occurs server-side, general type filters remain client-side over loaded pages, and More loads the next page. Loading/error never claims the stock history is empty. No data-loss conclusion is supported by this issue.

2. The writeoff detail inferred “Закрытие смены” from shiftId. POS cancellations also carry shiftId. Source labels now discriminate source=pos_cancellation / shift_close / warehouse / integration; unknown source stays explicitly unknown. The internal __venue__ source is displayed as “Склад заведения”; document location/source fields themselves are unchanged.

3. The menu detail header consumes groupName. Its local bdAssortmentFallbackAnalyticsV170 calculated that label from legacy groupId/department, while the server and preparation ticket resolve canonical sectionId. The fallback now uses the shared menuTaxonomyPresentation resolver, so an item with sectionId=kitchen and stale bar group/department displays “Кухня”. No menu records, print routes or warehouse IDs are reassigned. A regression proves the input objects remain unchanged.

Live evidence supplied by the parent: QA3389 toast order 873868b4-3c19-4e2e-ab42-25d53760d698; original runner prep:41b36abd-a7aa-41b7-abc0-ec0761abb315:1 displays Кухня. Exact live sectionId/menuItemId were not independently read in this environment: no scoped authenticated live API/browser read is available here. Do not claim a literal kitchen ID for that production row without the parent's read-only metadata. The code fix follows whatever canonical ID the row actually contains, including custom sections.

Validation: five new scoped tests PASS (canonical labels, writeoff source/location labels, general legacy/journal history pagination/scope/revision, actual shipped UI at390 with empty cache, document→Show all and error/retry). One patch restore/reapply round-trip PASS. No old 12/10 receipt reconciliation or QA business operations were repeated. Typecheck retains only two pre-existing Health diagnostics. See checkpoint logs for build status.

Publication is not authorized for this change. No new credentials, push or deployment.

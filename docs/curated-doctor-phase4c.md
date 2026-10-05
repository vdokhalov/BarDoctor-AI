# Curated AI Doctor V1

The seven approved questions live in the existing `/analysis` screen. There is no free-form prompt and no generative provider call in this answer path. The legacy diagnosis remains available.

`GET /api/ai/curated?question=attention|cost|stock|shifts|expenses|tasks|next&venueId=...` is an authenticated, private, no-store, read-only projection. Unknown/duplicate query parameters and question IDs are rejected. Selected venue, live membership, analysis permission and existing diagnosis source permissions are checked before returning facts. The live canonical loader reauthorizes the captured snapshot. References and paths are not capabilities; existing destination handlers authorize every read/write again.

## Shared authority

The endpoint uses `loadCanonicalHealthInputs`, the existing Phase 4B management queue, current Phase 4A cost observer, operational-day/stock proof and Finance read contracts. Attention shows the canonical top three; Next uses its first priority. If that priority has no proven correction destination, it offers Health evidence instead of skipping to an unrelated problem. Tasks retain the relative order from the same queue. Domain views do not create management signals or a second ranking.

Each answer has a question, deterministic conclusion, FACT / DERIVED_FACT / UNKNOWN facts, evidence references, limitations, next actions, scope, read time, source revision/update times and explicit coverage. V1 emits no hypotheses or causal claims. Source absence is different from an available empty collection; unknown monetary/quantity values stay null. Declared stale/conflicting sources and malformed identities cannot certify values or correction targets.

## Scope and limits

- Cost reads current active RECIPE positions, at most 25, sequentially to bound Worker memory. It preserves missing recipe/nomenclature/link, PRICE_UNKNOWN, unavailable source and known/known-zero states. Current cost never rewrites historical sale costs. Tracked issues use the existing Phase 4A correction signal. Other valid items use the catalogue's supported search; this does not pretend to open an exact editor.
- Stock shows at most 10 scoped product/warehouse/unit facts, with quantities only when the existing stock proof and sources are complete. Low/minimum stock is not converted into a purchase recommendation or replenishment quantity.
- Shifts show up to 10 registered operational days. Actionable days follow the canonical queue; other days retain date order. Operating sessions are not failures, and incomplete reports cannot establish a final day result.
- Expenses are registered entries for the current accounting month, through the venue-local date. Operating expenses, recorded accrued payroll and payroll payments remain separate. Missing payroll stays unknown. These amounts do not claim all actual business expenses or profit; supplier payments are not COGS.
- Tasks show up to 10 overdue/critical entries from the existing management queue, with recorded status and deadline. Draft/unapproved tasks are outside that queue. Completion is not proof of physical resolution. Phase 4B's UTC task cutoff is retained.
- All bounded populations disclose shown/total/coverage. Unconfigured venue timezone falls back explicitly to the existing UTC venue-time contract. No baseline, financial cause, period comparison, menu profitability or replenishment engine is added.

## Action and return

The answer preserves existing action URLs, venue and signal/day/product context. A short-lived session-only return record contains the selected question, venue and actor, never business facts. It expires after ten minutes and cannot establish verification. The conditional return button uses normal page flow to avoid covering existing mobile actions. Phase 4A/4B return paths remain intact; returning to Doctor rereads the authoritative sources. Pending fetches are cancelled/ignored across question, actor or venue changes.

Opening an editor never closes a condition. The existing day report writer and finalized inventory writer must change authoritative state before Phase 4B verification clears their conditions. A saved inventory draft remains active. Cost purchases continue through Phase 4A verification/history.

## Validation

`npm run test:curated-doctor` exercises actual authenticated handlers, deterministic/read-only contracts, missing/stale/partial data, unknown cost, absent recipes/nomenclature, recorded expenses, task continuity, forged IDs and two authorized venues of one owner. Compiled Worker tests additionally check native D1, live permission changes and zero external AI calls.

`node --import tsx scripts/curated-doctor-phase4c-browser.ts` runs all seven questions, reload, CTA/return and actual day/stock correction at 390×844, 820 and 1280. `BD_CURATED_BROWSER=webkit` runs the identical assertions in WebKit. QA accounts and stores are ephemeral and local; this is automated QA, not Owner UAT. Existing Phase 4A/4B regression and WebKit gates remain mandatory; the native-failure classifier and timeouts are unchanged.

A pre-existing Phase 4A Worker read-only test compared D1 execution duration as though it were persisted state. Its comparison now retains all saved rows and explicitly checks no writes, while excluding wall-clock timing. No application behavior was changed for this diagnostic test fix.

# Phase 4B — management prioritization and action flow

Implementation base: production Sites v485, `dcc0541780db52d8c02b0c3a74f3ea0d31cbce24`.
Production deployment requires the owner's final confirmation. This change prepares an unpublished candidate.

## Scope and architecture

- Business Health owns the canonical management queue. `rankManagementSignals` is the shared selection policy, not a second Doctor priority engine.
- Active critical risks come first. Within that tier, overdue work precedes work without an overdue date. Remaining ordering uses deadline urgency, confirmed business impact/actionability, existing priority score, deadline and stable identity. Each row explains its position. Calendar buckets remain available but no longer exclude overdue critical work from TOP-3.
- Canonical Health reads tasks, operational sources, profile/permissions and existing active Phase 4A cost episodes together. Doctor uses that queue and its first three actions for attention, explanation, summary and action selection. Model output cannot select an unrelated top priority.
- Actual critical cases link to their case. Generic critical status alone establishes no equipment relationship; an unsupported destination stays neutral. Explicit equipment recurrence retains its existing equipment action.
- Day and stock use existing signal types. Day actions identify the business date; stock actions identify product, warehouse and unit. The UI opens existing Shifts and Warehouse screens, preserves venue/action/return context and parses the raw URL once.
- `GET /api/business-health/verify` is read-only. It reauthorizes scope and rereads canonical sources. Outcomes are ACTIVE, CONDITION_CLEARED, CANNOT_VERIFY or NOT_APPLICABLE. Opening a screen, saving an incomplete report or saving an inventory draft cannot certify correction. Missing/deleted identity cannot produce a successful verification.
- Accepted domain saves remain the existing writers. A successful reread returns to Health, shows the checked condition and exposes the current next priorities. Reload performs the same authoritative read.
- The Phase 4A cost episode lifecycle and its before/after verification remain unchanged. Existing cost episodes participate in Health; its bounded projection explicitly reports partial coverage above 25 active episodes. No price-only signals or persistent management registry were added.

## Isolated acceptance fixture

The fixture creates a separate local QA venue and uses real handler/auth/database modules. It contains a verified closed-month loss, active critical incident, overdue critical task, low stock and a recorded day missing operational data. It also has an active employee with an existing shift payroll rule, menu, sales facts and stock authority. No production venue or real business data is used.

The same canonical QA rows were read with the v485 handlers and the new handlers:

| Before v485 | After Phase 4B |
| --- | --- |
| Health selects financial loss | 1. Overdue critical task |
| Doctor attention selects critical blocker; its summary can retain a financial title | 2. Active critical incident |
| Overdue task is visible in Overdue but absent from TOP-3 | 3. Verified financial loss |

Both first actions are critical. The overdue critical task comes first because its deadline passed and its result is unconfirmed; the active incident follows. Financial loss remains important and stays third. Stock and day remain concrete actions in the same queue and surface in TOP-3 as higher priorities clear.

The acceptance tests exercise actual complete/partial report saves and inventory create/save/finalize. A draft does not clear the stock condition; finalized authority does. Complete day status requires final revenue and a saved operational report with recorded payroll. The input revision changes with source changes, not the timestamp of another read.

## Validation

- Full `npm test`: 1,642 TypeScript unit tests, existing artifact/regression suites and verified build passed.
- Targeted Health, attention, Phase 4A and Phase 4B suites passed. Policy tests cover blocker/loss/task combinations, equal severity ties, no critical signals, generic equipment routing, and exact stock URL identity.
- Typecheck passed. Lint has zero errors and two pre-existing warnings in the migration route and warehouse patch; no new warnings.
- Repeated artifact preparation: 5 tests passed, including exactly one Phase 4B adapter and retention of the Phase 4A correction hooks.
- Compiled Worker/native D1 checks passed for Health equality/security, Phase 4A correction and Phase 4B day/stock verification. Verification reads preserve stored source bytes; foreign action IDs are rejected and insufficient evidence cannot certify correction.
- Local automated browser QA passed at 390×844, 820×1180 and 1280×800: initial TOP-3, subsequent queue, exact day editor, day save/verify/return/reload, exact stock card and inventory verification/return. No horizontal overflow or page errors.
- Phase 4A browser lifecycle and full nomenclature/create/PRICE_UNKNOWN/purchase correction passed at all three widths. Its test selectors were scoped to the cost surface because Health now also contains the management queue; its assertions were preserved.

These are automated QA results, not Owner UAT. The earlier production-browser/Owner UAT limitation is not represented as completed. No production runtime repair or persistent staging work is included.

## Scope boundaries and follow-ups

- No onboarding, new Management Center, dashboard widgets, editor redesign, source schema migration or new signal types.
- Verification is deliberately limited to selected day/stock conditions plus the existing Phase 4A cost flow. Physical repair, task business impact and financial recovery are not claimed by this condition check.
- P2 follow-up: a deleted object or changed stock identity needs a new source action; NOT_APPLICABLE explains that correction is unconfirmed. This does not block the supported scenario and is not an identity migration feature.
- P2 follow-up: unavailable task/cost coverage remains explicit instead of claiming an empty venue is healthy. Broad signal registry/history work remains outside this phase.
- GitHub CI and the saved Sites version are release evidence associated with the final commit, reported separately. Production v485 remains unchanged until deployment is explicitly confirmed.

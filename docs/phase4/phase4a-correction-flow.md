# Phase 4A correction continuation

Approved scope, 2026-10-05: management correction in an operating venue. This is not initial onboarding; employees, payroll and setup checklists are excluded. Phase 4B–4D are unchanged.

The existing Phase 4A episode starts only for an active explicit RECIPE menu item with a missing, empty or unapproved current recipe. This change does not create a signal family for all price UNKNOWNs.

## Three different correction states

| State | Truth and action |
| --- | --- |
| Missing ingredient/nomenclature | Open the existing exact Tech Card. Its whole-catalogue search offers existing matches or the existing nested “Создать и добавить”. Creating a product leaves its cost UNKNOWN and does not certify the recipe. |
| Nomenclature linked, authoritative cost missing | Approved recipe save triggers server reread. The same episode remains ACTIVE / PRICE_UNKNOWN. Show the exact blocked ingredient and a deterministic cost-source limitation. Open the existing purchase entry, scoped to that ingredient and episode. |
| All recipe operands have authoritative cost | After a real purchase is confirmed, reread canonical sources, calculate using the existing calculator and commit verified resolution under the existing CAS boundary. Preserve before UNKNOWN/null, after value/currency, revision/evidence, date, history and idempotency. |

Reference catalogue prices, price lists, initial-stock estimates, owner decisions, local drafts and successful writes alone do not close the signal. If authentic cost evidence is unavailable, keep UNKNOWN; never manufacture a receipt to obtain a green result. Fixing only one of multiple blockers does not close the episode.

## Existing components and additive contracts

Reuse Tech Card search/quick-create, products/taxonomy/duplicate handling, purchase entry/review/confirm/mapping, current recipe costing, evidence resolver, cost episodes and private domain_data/CAS. No new calculator, purchasing engine, persistence model, schema migration or historical backfill.

CostObservationV1 may add `blockingIngredients` and `blockingIngredientsTotal`. Each blocker has canonical ingredient/product identity where available, display name, canonical stock unit and reason: NOMENCLATURE_MISSING, LINK_MISSING, PRICE_UNKNOWN or UNIT_UNKNOWN. Derive it from the existing calculator's ingredient rows and same scoped authoritative snapshot. Bound display to 20 rows, disclose total, and continue checking all operands for resolution. Existing observations/history without the optional fields remain readable; immutable before/results are not retrofitted.

Evidence includes revision-bound canonical nomenclature records only when actually present. A missing product or purchase is not fake evidence. The server projects an optional purchase target only for a linked price-blocked ingredient under current, available/partial source reading, never under unavailable/stale quality.

## Navigation and purchase authority

Reuse `/suppliers?create=1`, with the additive internal context:

```
costCorrection=1&venueId=V&signalId=S&menuItemId=M
&productKey=P&returnTo=health
```

The signal ID already includes the episode generation. Before opening the existing source-choice dialog, reread the authenticated signal/current observation and validate venue, item, active episode and exact current blocker. Query strings cannot choose a foreign or unrelated entity. The manual purchase branch prefills canonical nomenclature identity/unit only; price and line total are blank UNKNOWN. Existing upload/mapping and posting handlers retain their business meaning and permissions.

After accepted purchase save, run the existing server verification endpoint and return to the same Health signal. Verification failure preserves the accepted purchase but cannot certify resolution; show a retry notice. Browser Back and explicit cancel return to the original signal. Reload validates context again. Scope guards prevent a late old-venue save response from hydrating a new venue or verifying its signal. No arbitrary return URL is accepted.

Home remains one compact Business Health block. A missing-card state retains “Исправить техкарту”; a price-blocked state names the ingredient and offers “Добавить закупку”. Health shows the deterministic blocker explanation, primary purchase CTA and secondary Tech Card/retry controls. AI is not needed for correction or certification; existing Doctor behavior remains compatible.

## Tests and release gates

Real-handler tests cover both independent working-venue fixtures, creation with reference price, linked recipe PRICE_UNKNOWN, exact entity/evidence/target, opening estimate and price-list rejection as cost, actual purchase confirmation, authoritative before/after, reload/retry, historical sale/neighbor invariance, and mapping blockers.

Browser tests must use actual 390×844, 820×1180 and 1280×720 viewports and the actual purchase UI. Cover in-place create, preserved recipe draft, missing-cost WHY, empty purchase price, explicit return/cancel, browser Back, reload, posting, server verification and retained history. Include save/verification failure and venue-switch races; keep existing Home/Health/Menu/Purchases/AI/Finance/Sales/Shifts/Stock/Reviews/Tasks regression checks.

Owner fixtures contain an already operating menu with known unrelated costs, a retained historical sale and an active supplier. The affected ingredient is absent, its cost starts UNKNOWN, and the owner creates it in the Tech Card then records a synthetic QA purchase fact through the real purchase flow. Two independent owner fixtures start clean; technical smoke mutates separate disposable clones only.

All automated gates, GitHub sync and a saved Sites candidate are required. The two independent owner mobile PASS gate remains required. Technical checks are not human UAT. Production v483 must remain unchanged until the complete release gate and explicit deployment confirmation.

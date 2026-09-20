# Home + Reviews UX — design QA

## Evidence

- Approved direction: `64426203-2671-4039-838E-BE0AB73ADA5B.jpeg`, 864 × 1536.
- Mobile implementation: `qa-artifacts/mobile-navigation-v269/iphone-small-home-reviews-v409.png`, CSS viewport 320 × 568 at DPR 3 (960 × 7077 full-page capture).
- Desktop implementation: live supervised Chrome preview at 1348 px viewport width after the final grid correction.
- Comparison was performed with the approved direction and the mobile implementation in the same visual review input.

## State under test

- Canonical Business Health score: 83.
- Finance: honest no-data state; no invented totals.
- Google Business Profile: connected.
- Reviews: 105 total, 3.19 average rating, 6 new in 7 days, 23 new in 30 days, 7 requiring attention.
- Cached complaint topics: long wait and loud music.

## Iterations

1. The first mobile pass exposed raw topic keys and vertically stacked review actions. The topic labels were mapped to product copy and the actions were compacted into two columns.
2. The first desktop pass exposed an existing `!important` grid rule that kept Health and Finance in the old two-column first row. The v409 selector specificity was increased so Health is full-width, with Finance and Reviews paired below it.
3. The final visual pass confirmed the requested hierarchy on desktop and the approved mobile order: Health → Finance → Reviews → What matters today → operations.

## Interaction checks

- Direct Reviews navigation is visible on desktop.
- “Все отзывы” opens the standalone Reviews module.
- “Подготовить ответы” opens `filter=unanswered` and renders 7 items.
- “Без ответа” and “Негативные” filters each render the expected 7 reviews.
- Search for “долго ждали” preserves the correct 7 matching reviews.
- Original review text remains primary; Google translation is secondary and collapsible.
- Reply preparation uses the selected review and shows a draft confirmation dialog with no publish action.
- Browser Back returns to Home with the Home state restored.
- No horizontal overflow or clipped primary actions was found in the mobile capture; bottom navigation retains the existing fixed navigation contract and safe content clearance.

## Severity review

- P0: none.
- P1: none.
- P2: none after the two corrections above.
- P3: none blocking release.

final result: passed

# Editor standard — Menu / Tech Cards design QA

## Source of truth

- Visual direction: `outputs/reference-editor-target.jpg` (1536 × 1373), supplied by the user.
- Current-problem reference: `outputs/reference-editor-current.jpg` (591 × 1280), supplied by the user.
- Implemented surfaces: `bdCatMenuEditor`, `bdCatRecipeEditor`, and the shared `bdExplicitFormActionsV438` mobile shell patched by `scripts/patch-editor-standard-v439.mjs`.
- Stage boundary: Menu and Tech Cards only. Other editors remain inventory and rollout-plan entries.

## Browser evidence

- Desktop: Chromium viewport 1280 × 720.
- Mobile: Chromium viewport 390 × 844.
- Android-size emulation: Chromium viewport 412 × 915.
- Keyboard state: reduced visual viewport to 430 CSS px. This verifies layout response, focus retention, label visibility, and scroll reachability; it is not a physical device or real OS keyboard test.
- Safe fixture copies: `Спрайт 0,5л. · QA copy` and `Хортица · QA copy`; no production record was changed.

## Iterations

1. P1 — the prior desktop footer remained visible on mobile because an older selector had higher specificity. The scoped mobile rule now hides that footer and leaves one top action row.
2. P1 — the editor toolbar initially rendered below the application header. The Menu and Tech Card workspaces now own the mobile stacking context at z-index 1220.
3. P1 — viewport shrink could leave the active label above the visible region. The shared shell now reads `visualViewport`, keeps the editor at the visual height, and scrolls the active field group into view.
4. P1 — local and global unsaved-change guards could both prompt. Internal editor actions are marked as local navigation, and dirty state is cleared after confirmed close or successful save.
5. P2 — loading changed visible text but did not provide a stable accessible name. The Save action now announces `Сохраняем…`, exposes `aria-busy`, and prevents double submit.
6. P2 — the Tech Card dialog temporarily lost its `aria-labelledby` link. The final patch preserves the real dialog heading and passes the existing modal accessibility contract.

## Final checks

- One visible mobile action row: Cancel, editor name, Save.
- No persistent bottom action row or reserved footer gap on mobile.
- Save draft is available through the Tech Card overflow menu and keeps its existing handler.
- Menu and Tech Card content scroll independently; the background page remains locked.
- Full-height mobile scroll client: 783 CSS px at 390 × 844. Keyboard-emulated client: 369 CSS px at 390 × 430.
- Menu content height: 1294 CSS px; Tech Card content height: 826 CSS px.
- Active name, quantity, and nomenclature-search fields and their labels remain inside the 430 CSS px visual viewport after focus transitions.
- Save, cancel, close, unsaved-warning, rejected-save retention, successful save/reopen, draft save/reopen, ingredient add/remove, unit changes, nomenclature link changes, and all four menu consumption modes pass in the fixture browser suite.
- Desktop retains its existing bottom action layout and keyboard-accessible actions.

## Severity review

- P0: none.
- P1: none open.
- P2: none open.
- P3: physical iPhone, physical Android, and real on-screen-keyboard validation remain outside this local environment and are reported as unverified.

final result: passed
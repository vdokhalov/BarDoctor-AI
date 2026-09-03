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

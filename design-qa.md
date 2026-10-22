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

# Splash v529 design QA

Selected source: Library libfile_f5a7adc22dec819180235c8ed1e3fa09, exec-dadd5421-5e54-49c0-b9b8-f3f77738588f.png (853×1844). Materialized and visually inspected before edits. Supplied artwork is retained verbatim; no regenerated logo or substituted lettering.

Local browser visual comparison: source and final screenshots inspected at 853×1844 and mobile 320×568 / 390×844. Cobalt background, original gradient mark, white BarDoctor and receipt–chart–glass artwork retained; no visible slogan. Fixed an antialiased seam between image layers by overlapping their background edges. Short mobile screens crop background margins, preserving logo and complete lower symbols. Wide screens center the portrait artwork on cobalt.

Motion: brand fade 550ms, lower illustration reveal 850ms, no loop. Reduced-motion and standalone use the complete still. Existing pending flag/removal owns lifetime; no animation event, timeout, auth or business-data changes. Accessible loading status retained.

Scoped browser checks: splash at 320×568,390×844,430×932,1280×720; reduced motion; no overflow; pending flag removal hides immediately. Existing real-client Home/root session handoff and anonymous/login interaction tests passed at mobile and desktop. Production owner browser was not accessed. Native iOS launch behavior is not device-verified; 12 matching raster assets were generated locally.

final result: passed

This is local visual/functional verification under the explicitly requested scoped workflow, not production verification. Save-only; release approval pending.

## Standalone HTML motion correction (v530)

Removed the display-mode:standalone animation override. Native iOS launch PNGs remain static; HTML now animates normally in standalone, while prefers-reduced-motion still disables motion. No artwork, timings, readiness, or auth changes. Scoped regression projects the standalone CSS media condition to screen in the local fixture because Chromium CDP does not emulate display-mode. It checks both animations exist (not a vacuous empty-array check), reduced-motion disables them, and readiness hides the splash immediately. This is a local CSS-condition simulation, not physical iPhone verification.

## Visible duration correction (v531)

User observed v530 disappearing too quickly and requested a 1500ms visible minimum, superseding immediate success hiding. An inline one-shot coordinator starts on a visible animation frame, queues the latest committed success target, and waits only the remaining minimum. Normal motion fades opacity for180ms; reduced motion exits with no transition at the minimum. Slow readiness after1500ms fades immediately. Error/recovery removal cancels the coordinator and its timers; existing recovery code/timeouts are unchanged. Internal navigation does not create another splash. Local scoped fixtures cover fast/slow, standalone CSS condition, reduced motion, recovery, internal navigation, and replacement of a ready target (Home→login). No image/design changes or production business operations.

## v532 — standalone launch coordinate continuity (2026-10-18)

Preserves the selected v529 raster layers and v531 visible minimum/fade. In the existing edge-to-edge standalone policy (`viewport-fit=cover`, `black-translucent`), screen origin is (0,0); safe-area insets are interior exclusion zones, not an extra viewport origin. Screen-size artwork is translated through visualViewport offset and the actual artwork container rect. No missing-height heuristic or device-specific notch offsets. Non-standalone / unknown launch geometry keeps the existing responsive layout.

Scoped Chromium fixtures model standalone, fixed screen, shortened viewport, translated container and visual viewport offset. They do not run iOS or observe an OS viewport origin. Tested 390×844 at844/797/763 and393×852 at852/793/759, including live viewport resize. Current native PNG title and lower-line landmarks agree after alignment. No physical-iPhone PASS claim; stale OS launch caches remain unobserved. Native PNGs and motion assets unchanged.

Origin policy references: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html and https://webkit.org/blog/7929/designing-websites-for-iphone-x/ . A host that violates this edge-to-edge contract or supplies unobservable OS window displacement is outside this emulation's proof.

## v533 local candidate — complete first splash frame (2026-10-18)

User's physical-iPhone feedback after published v532 reports flicker and a rectangular reveal. Confirmed CSS causes: opaque cropped raster band wipes over flat blue, and the logo's entrance starts at opacity0 after native launch already showed it. Replaced three clipped/animated layers with one complete opaque image; no entrance animation, no new design. The original PNG bytes are embedded in HTML (about1.93MB base64, instead of a separate1.45MB image request). This intentionally removes the second-fetch/cache readiness dependency; it does increase HTML transfer/parse size. Visible minimum starts after image.decode settles; decode failure remains fail-open for startup recovery. Final1500ms minimum and180ms exit remain.

Preserved v532 screen-origin contract; use original CSS cover arithmetic to match native raster rounding. Six geometry profiles pass. Current native comparison:393×852 pixel-identical;390×844 differs in39 color channels, max10/255, from eliminating native raster's former clip seams; no global brightness difference. No new native images or cache assertions.

Actual local HTML/bootstrap/client isolated fixture reaches Home without reload. Every observed splash RAF has complete image, naturalWidth853, opacity1, clip:none. First observed155ms; decoded visible event223.6ms; fade1724.6ms; finished1905ms. This is Chromium emulation, not iOS/native handoff proof. Video has an explicit label, fixture-only Home data, and begins at first artwork frame; recorder's initial160ms about:blank removed, no splash frames removed. Raw video and trim metadata retained. No production access, full suite, build, push or publication for this candidate.

## v534 local animated candidate (2026-10-18)

User explicitly requests proper element motion; selected continuity-preserving option is one traveling highlight along the already-visible lower curve. Full separation of the opaque receipt/chart/glass from its gradient would require reconstruction; no such reconstruction attempted. Raster remains complete. Curve center traced from original pixels x235..675 into a transparent SVG polyline; short SVG stroke-dash moves along it, with a wider low-opacity stroke for softness. No mask, clip, rectangle, opaque patch, erased element or duplicate drawing. This is a moving accent, not a claim of drawing formerly hidden elements or growing the bars.

Logo/title/base artwork stay unchanged and opaque from first observed HTML frame. Lossless WebP preserves original decoded pixels, reduces image URI from1,930,046 to1,117,855bytes; inline SVG is about5KB. 100ms after decoded-visible readiness, accent travels1150ms once then returns to transparent. Visible minimum1500ms + exit180ms maintained; reduced-motion hides SVG and preserves immediate minimum-complete exit. Initial native/static artwork has no active highlight, matching first HTML frame before accent starts.

Scoped4PASS plus one actual local root→Home fixture PASS. Six geometry scenarios retain title/lower-line coordinates. Every observed splash RAF has decoded base853px,opacity1,clip:none,constant position; accent offset changes >20times,peak opacity>.9. Local recording viewed as consecutive frames and lower-region contact sheet: highlight follows curve; no rectangular sweep, shifted composition or disappearing logo. Physical iPhone/system compositor/OS cached launch snapshots not tested. Screenshot fixtures do not prove absence of iOS flicker. BasePNG/nativePNGs unchanged; no new imagegen.

Local MP4 labeled explicitly as emulation; fixture-only Home; initial recorder about:blank trimmed until first artwork, no splash frames removed. No full suite, build, push, Sites save or deployment for this candidate.

## Final whole-illustration slide — internal revision v537 (2026-10-18)

User chose the entire lower illustration sliding left→right as ONE transparent layer. Integrated the already-reviewed separated SVG scene and clean background into the actual app splash. One group translateX(-870→0source px),1050ms after80ms delay; no per-element choreography,scale,rotation,line redraw,opacity entrance or moving background. Static clipping excludes old raster lower objects; static background blend is not the animation. Original logo/title remain fixed. Lossless inlineWebP remains1,117,855bytes; full sceneSVG184,341bytes. No additional design changes from selected separated illustration.

Twelve new native launch PNGsv537 and all launch references use initial state WITHOUT lower illustration. Full390×844 and393×852 initialHTML states are pixel-identical to their new nativePNG. Six viewport/origin scenarios retain title coordinates,error0px. Native capture explicitly freezes initial offscreen group; it does NOT use reduced-motion final state. Reduced-motion shows the complete static illustration immediately and disables entrance/exit animation; relative to native initial state this adds static elements, never hides a previously shown final illustration. PhysicaliPhone/OS caches/compositor unverified.

Scoped4PASS + actual local root→Home1PASS. Root trace verifies only one common entrance animation (zero before readiness),identity scale/rotation,no moving-layer clip,opacity1,decoded base. Visible minimum retained; actual busy-app trace1511.1ms to fade,205.6ms exit. Standalone fixtures model navigator flag/fullscreen origin contract, not real iOS. First/middle/end of normal-speed recording inspected. Video uses actual app Home with isolated demo fixture data,not production. CharsetUTF-8 verified, readable final text. No full suite/remoteCI/deployment.


## Finance reference implementation — 2026-10-22 (local, unpublished)

Reference: Library libfile_8c75c9572d7c819183eddfcf8d713ca3 v0, materialized and visually inspected at /workspace/finance-reference/reference.png. The reference is a design, not production evidence.

Implemented its continuous hierarchy, large signed monthly result, separate currency, two-column revenue/expense summary, compact exact expense breakdown and report action. Existing application navigation/chrome is retained. Closing the month remains a secondary action in the calculation details. Values are dynamic; purchases are not counted again as expenses. Missing data stays unknown.

Visual inspection: real emitted authenticated local UI at 390, 820 and 1280px; profit, loss, zero and unknown states. No horizontal overflow. Mobile delivery is a 390x1040 viewport showing the complete main block; functional mobile checks also use 390x844. Library implementation screenshot: libfile_4a3b933cc7d88191a6ba01677c3764cd v4. Reference remains separate.

Evidence: outputs/open-payroll-artifact/results.json and screenshots. Real report CTA clicked successfully with selected October query retained. No JavaScript/console/request failures in scoped harness. Business snapshot unchanged. Seven targeted presentation/breakdown tests passed. Full build passed; final versioned asset verification passed. Two typecheck errors remain and were reproduced on production v582 baseline: business-health-snapshot.ts:372 (status union) and health-partial-operations-v539.test.ts:10 (counter cast).

No blocking visual issue observed in this scoped review. This is not a full application audit; unrelated external/AI panels are excluded by the existing fixture harness. No production writes or publication.

### Purchase summary follow-up
Moved the complete expense breakdown (including stock shortage) into “Как рассчитано”. Purchases are a separate monthly indicator, not a component of expenses. The authoritative report flags invalid/foreign-unconverted purchase totals as unknown for this display; profit formulas are unchanged. Local canonical fixture: purchases120, revenue100, expenses60, profit40; prior September999 and future November888 purchases excluded. Compiled UI additionally checks missing purchase amount, unconverted EUR and known zero, preserving profit40 and the business snapshot. Delivery viewport390x844.

### Scope correction — screenshot version6
Compared actual saved v4 and v5 screenshots. Restored the v4 visible COGS/payroll/writeoff rows and heading; only stock adjustment stays in details. Purchases occupy the following separate row with a small divider/gap. Same totals/formulas. Real 390/820/1280 UI checks pass, including visible retained rows, hidden shortage until disclosure, monthly purchases120, profit40, unknown/zero purchases and report navigation. Seven presentation tests and emitted artifact validation passed. Screenshot Library version6, 390x1040. No publication.

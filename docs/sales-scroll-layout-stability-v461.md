# Sales / POS scroll and layout stability — v461 diagnostic

Baseline: c3a17a6f11507f0f033a5e118890571b4ce66f7a. Production unchanged.

## Evidence and limits

Primary evidence is the supplied 40-second 720×1558 physical-iPhone video, AA328386-12AF-4428-9940-BECEAD753115.mp4. Decoded by playing the original MP4 locally in Chrome and sampling rendered frames; initial seek-based extraction returned stale frames and was discarded. Approximate elapsed playback times (sampling is not an input event trace). Exact video.currentTime values are retained in outputs/scroll-stability/video/timestamps.json, with SHA-256 provenance:

- 0–2 s: Cashier startup, then no-open-shift gate. An empty Order floating button is visible before data readiness.
- 3 s: Journal loading; 4–8 s: Cash Shifts loading, populated list, scrolling down and returning up.
- 9–12 s: pending Manual navigation and blank intermediate surface; 13–16 s: Manual form loads, scrolls down/up. No open shift is offered, consistent with the Cashier gate.
- 17–19 s: Import loading, a lower scroll position, then populated content at a higher position.
- 20–27 s: Import content stays largely stationary. No touch indicators are recorded: rejected swipes, user inactivity and native gesture routing cannot be distinguished from pixels alone. This Import has no reported issues.
- 28–32 s: Journal appears and changes vertical position, including its header.
- 33–35 s: Cashier reloads into the no-shift gate; 36–40 s: shift-name focus opens the keyboard and moves/scales the visible form.

The recording proves visible displacement and intermediate states, not their JavaScript/API cause. No claim that a desktop WebKit pass equals physical Safari certification.

## Confirmed isolated cases

1. **Checkout reservation race:** WebKit 390, 12 cart lines, Menu→Order: document height 1874→2061 px after the first frame, with no additional action. Hidden checkout was measured as zero; the next ResizeObserver/rAF added 187 px bottom padding. Fix: retain positive visible measurements and measure synchronously after the pane is revealed, before its first paint. ResizeObserver callbacks remain coalesced through rAF. Updated regression asserts zero first-frame height delta for 0/1/5/13 lines.
2. **Competing Import scroll owners:** 390 with 15 unmapped fixture lines: document scrollTop remains 354 while the next wheel scrolls the inner quality list. There is no overlay or pending state. The 420 px max-height/overflow:auto list creates a second vertical owner. Mobile now uses the document for those rows. This is a reproduced UX defect, **not proof of the no-issues Import freeze in the supplied video**.
3. **Premature floating Order button:** server HTML showed the empty action before shift/data initialization. It now starts hidden; the existing updateJump logic reveals it only when usable.
4. **Input focus scaling risk:** mobile Cashier gate/comment and Journal/Manual inputs use sub-16 px text. Mobile Sales text controls now use 16 px without disabling pinch zoom. Keyboard focus, viewport shrink/restore and subsequent scroll are tested. Native iOS automatic zoom is outside desktop WebKit; this is a bounded mitigation, not a claimed reproduced native root cause.

5. **Clean Import late-response jump (matches the video scenario):** with no issues and a 1200 ms API delay, Import metrics move from y=523 to y=582 (59 px) at constant scrollTop=120. Empty quality-list gains its success row and the explanatory text shrinks by one line. Mobile now reserves that one compact result row and a two-line explanation. A timezone line and existing feedback row retain their geometry as loading ends, preventing a shorter scroll range near the page bottom. After: metrics y=602.594→602.594, document height 1171→1171, scrollTop 120→120. The baseline and after absolute heights differ because space is reserved up front; this is intentional.

6. **Draft restoration scroll anchoring:** Chromium mobile with a persisted 13-line draft and delayed Import data: primary command height 50→46 px when the initial Cashier link is replaced by Resume; scrollTop 120→116 while the viewport remains 844 px. Reserve a two-line action footprint on mobile, with explicit 1.5 line-height and two visible lines for the 13 px Resume label. Full link text remains in the accessibility tree. This removes the geometry trigger without disabling document anchoring. The Import issue-status CSS also reduced header bottom padding 15→8 px; preserve the 15 px mobile padding across statuses. The first local fix retained 50→50 px and scrollTop 120→120, but Linux CI exposed a 50→54 px expansion from different font wrapping. The final rule reserves 55 px and bounds the label to two visible lines across fonts; full text and navigation semantics remain unchanged. Repeated local Chromium/WebKit measurements are 55→55 px and scrollTop 120→120.

7. **Removed action selected as scroll anchor:** the deterministic delayed touch run exposed scrollTop 105→53 despite an unchanged 55 px command height, unchanged viewport and no scripted scroll call. The initial Cashier link leaves layout (hidden=true) when Resume renders. A paired run excluding only `.journal-primary` from anchor candidates retained 105→105. Apply `overflow-anchor:none` to that volatile action region only; document anchoring remains enabled. The paired control is retained in outputs/scroll-stability/anchor-control.

## Scroll architecture

| Surface | Owner before | Owner after |
|---|---|---|
| Parent SPA shell on Sales | Fixed viewport iframe; parent has no vertical range | Unchanged |
| Journal | Child document | Unchanged |
| Cashier Menu, mobile Order | Child document; fixed checkout | Same, checkout reservation established before first Order paint |
| Cashier desktop Order | Bounded cart-lines scroller inside sticky panel | Unchanged, intentional desktop model |
| Cash Shifts / Manual | Child document | Unchanged |
| Import overview mobile | Document plus bounded quality list | Document only |
| Import overview tablet/desktop | Document plus quality list | Unchanged |
| Sale / Import document modal | editor-body in bounded grid | Unchanged |
| Venue sheet / confirmation dialog | Modal content while underlying page is locked | Unchanged |

## Audits

- No Sales navigation code sets body/html overflow:hidden. Pending feedback is pointer-events:none and does not create a blocking overlay.
- Shared transient manager owns body/html overflow for registered modal layers, restores saved values on removal, and preserves focus with preventScroll. Venue sheet adds/removes its own body class. Open→close→first-scroll is explicitly tested; no stale lock has been established in those cases.
- No touchmove/wheel preventDefault was found in the Sales controller files. Click capture deduplicates navigation; form submit prevention is intentional. touch-action:manipulation permits panning.
- Sales iframe uses 100dvh and fixed inset:0. No child-content-height postMessage/ResizeObserver synchronization exists on these routes. API content growth changes child document height, not iframe height. No one-time innerHeight pixel height is installed.
- Cashier has one ResizeObserver observing shell and checkout, coalesced in rAF. This change does not suppress observer errors. Callback counts/dimensions are retained in QA JSON.
- Cashier pane changes explicitly reset scroll to top. Journal contains deliberate error/review focus scrolling; legacy manual-grid focus schedules a smooth scroll after 120 ms. No global scroll anchoring or history restoration policy was changed.
- The outer shell has legacy multi-attempt scroll restoration (0/60/180 ms); its document is not the Sales child scroll owner. No measured attribution of the clip to this code.
- Real Safari chrome/keyboard/elastic scrolling is not supplied by desktop browsers. Viewport changes and safe-area CSS simulation exercise layout contracts, not UIKit gesture physics.

## QA implementation

scripts/qa/sales-scroll-probe.js is injected only by the browser runner: scroll calls/events, focus, viewport events, ResizeObserver entries/counts, registered touch/pointer/wheel listeners and optional layout-shift entries. Application HTML does not load it.

scripts/sales-scroll-layout-qa.ts uses isolated SQLite and real handlers; no production requests. The first native-wheel or CDP touch sequence must change the expected owner when range exists; no retry is accepted. Failure records active/hit elements, overflow/touch/pointer styles, owner/range, viewport/iframe/document dimensions, checkout/header, overlays, pending state, nested scrollers and event history. NO_SCROLL_RANGE is reported separately, never counted as a swipe pass. The late-response fixture now holds sales read responses until the initial gesture and snapshot finish, then releases them; the 1200 ms minimum delay remains. Slow test machines therefore cannot silently skip the intended in-flight response scenario.

Playwright WebKit supports native taps but not swipe sequences; it explicitly rejects wheel in isMobile mode. Native wheel tests therefore use touch-enabled WebKit at the requested viewport, with that limitation labelled in JSON. Chromium uses mobile emulation, plus a separate CDP touchStart/move/end swipe run. The higher-level CDP synthesizeScrollGesture did not dispatch a useful scroll in this environment; its failed diagnostic is retained separately, and was not counted as an application pass. Explicit touch events passed the same first-gesture contract. Insets are set through CSS properties and asserted as 59/34 before tests; an early inline-style simulation was blocked by CSP and was replaced, with affected profiles rerun. Physical-iPhone verification remains necessary.

## Scope

No posting, payments, finance, warehouse, cost, shifts, business dates, timezone values, auth, retry, idempotency or draft semantics changed. Persistence classifications remain unchanged: Cashier saves its existing draft and performs a distinct payment/post action; Manual Sale previews before its distinct confirmation; Import retains its own draft/post actions. The shared editor standard is not migrated to Sales. No API/schema/migrations. No production data or settings touched. No navigation architecture change or new product feature.

## Validation and release

Local build and artifact integrity PASS. Full test union: 1866 PASS (1304 TypeScript business tests plus 562 artifact/runtime/static tests); no dropped baseline tests. Typecheck PASS. Lint: 0 errors, 2 unchanged warnings in the migration export and warehouse patch script. Diff whitespace review PASS.

Functional browser regression PASS before the final two mobile spacing reservations: POS hardening, Sales UX step 2, iPhone navigation/safe-area, OBS01/OBS02 and venue-timezone suites. Each POS profile (390/820/1280) retains 3 events, revenue 120, 3 movements and stock 100→97 under lost response/retry/duplicate-ID injection. Auth 401 redirects to login; 503 and actual request failures remain controlled errors. Venue/account/shift isolation, draft reload, document↔Warehouse and Import posting pass.

Navigation performance regression PASS in Chromium and WebKit. Shifts→Journal and Manual→Journal each use 2 critical GET; Journal↔Import and Journal↔document use 0 additional GET within the loaded document. Child navigation retains the parent shell, parallel requests and correct venue. Rapid/double taps produce one transition. All 19 measured navigation paths plus repeated taps and auth failure cases pass. No navigation code was modified.

Final local Chromium and WebKit matrix PASS: 390×844 with 59/34 simulated insets, 390×844 without insets, 820×1000 and 1280×800. Mobile cases contain 41 checks each; wide cases 36. Each includes delayed API arrival during scroll, keyboard-like viewport shrink/restore, long documents, dropdown cleanup and history. Mobile adds orientation resize/restore. Clean Import has a separate 1200 ms delayed-response case in each engine. No first-gesture failure where scroll range exists, no unexpected scrollTop changes in the asserted delayed/idle cases, no idle height oscillation and no pageerrors. Final CI repeats the complete normal/300/600/1200 latency matrix plus the touch run.

Evidence: outputs/scroll-stability/release and release-touch contain per-case JSON and Journal/checkout/Import/document screenshots. Negative-control evidence deliberately restores only the old bounded Import list: the page stays still while the inner list moves 0→240 px. That expected FAIL is stored separately in negative-control, proving the detector catches the competing-owner defect. Layout-shift entries remain recorded; inserting real result rows can produce a nonzero layout-shift score, so this report does not claim zero CLS. Scroll position and visible command/header geometry are checked independently.

Release metadata and GitHub CI are recorded after the exact commit is created. Exact commit, CI and artifact hashes are external release metadata, avoiding a self-referential commit SHA in source.

### Changed files

- app/cashier/route.ts — initial floating Order visibility and asset version.
- app/sales-entry/route.ts — asset version only.
- app/sales-import/route.ts — stable timezone placeholder and asset versions.
- public/cashier.js — checkout measurement lifecycle.
- public/sales-journal.css — mobile Import scroll owner and loading geometry.
- public/sales-navigation.css — mobile text-control size.
- tests/sales-navigation-performance.test.mjs — hidden-checkout reservation assertion.
- scripts/qa/sales-scroll-probe.js — QA-only instrumentation.
- scripts/sales-scroll-layout-qa.ts — real-handler browser fixture, first-gesture detector, layout and keyboard regression.
- .github/workflows/google-reviews-setup-v400.yml — dedicated Chromium/WebKit scroll job and evidence upload.
- docs/sales-scroll-layout-stability-v461.md — evidence, scope and results.

### Remaining limitations

A literal lost physical-iPhone swipe was not reproduced with observable input events. The video cannot identify its exact cause; the fixes address measured scroll-owner and layout defects and the tested first-gesture contract. Native Safari toolbar expansion/collapse, keyboard auto-zoom and elastic scrolling still require physical-device replay. Viewport shrink/restore and insets are simulations. The modal editor retains its intentional separate scrolling while open; tablet/desktop Import retains its bounded issue list. No global scroll anchoring, modal locking or navigation restoration behavior was changed. Production remains v461 until separate deployment approval.

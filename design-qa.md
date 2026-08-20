# Settings v182 — Design QA

**Source visual truth path**

`/workspace/scratch/e51da6f6cb04/upload/B91AF294-A231-4EA8-AB32-8E5B75B6A01F.png`

**Implementation screenshot path**

`/workspace/sites/bardoctor-preview/qa/settings-v182-mobile-implementation.jpg`

**Comparison evidence**

- Full view: `/workspace/sites/bardoctor-preview/qa/settings-v182-comparison.jpg`
- Focused account/application/security region: `/workspace/sites/bardoctor-preview/qa/settings-v182-comparison-focused.jpg`

**Viewport and normalization**

- Source pixels: 853 × 1844, approximately @2x mobile density.
- Browser QA frame: 430 × 932 CSS px; inner scroll viewport 415 px wide after the native scrollbar.
- Implementation capture: 430 × 926 px at device pixel ratio 1.
- Source was downsampled to 430 × 926 px before the side-by-side comparison. Browser chrome and the desktop QA canvas were cropped out.
- Desktop verification: 1363 × 936 CSS px; Settings content is capped at 680 px and centered in the application workspace.

**State**

Authenticated owner account with a deliberately long email, active venue `Venue Runtime A`, password auth available, and two active server sessions. Light theme. Top-of-page mobile state is used for the visual comparison; session detail and scrolled bottom states were inspected separately in the cloud browser.

## Findings

- No actionable P0/P1/P2 visual findings remain.
- The implementation intentionally omits mock-only controls for region/currency, account deletion, support, and a configurable theme. The current backend or application runtime does not safely support those actions. Static language/theme rows have no chevron and do not pretend to be editable.
- The mock avatar is replaced with account initials because the current account model has no avatar storage. This is an intentional data-model constraint, not a missing image asset.

## Required fidelity surfaces

- Fonts and typography: existing BarDoctor system typography, hierarchy, optical weights, line height, truncation, and long-email wrapping are preserved. Labels, values, and secondary copy remain readable at 430 px.
- Spacing and layout rhythm: grouped white cards, compact rows, violet icon wells, section labels, radii, shadows, and mobile safe-area behavior follow the reference direction. The desktop content width is bounded rather than stretched.
- Colors and visual tokens: current BarDoctor light background, neutral borders, violet actions, and semantic red logout styling are used consistently.
- Image quality and assets: standard controls use the existing icon library. No mock photo or unsupported avatar asset was fabricated.
- Copy and content: every visible account value, session count, venue, legal label, and build version comes from a real account/API/build source. Unsupported controls are absent rather than simulated.

## Comparison history

1. First pass — P2: rows and explanatory copy were too vertically spacious, pushing the About section farther below the fold than the compact reference direction.
   - Fix: reduced row/card padding and section gaps; shortened the application, sessions, and export explanations without losing product meaning.
   - Post-fix evidence: `qa/settings-v182-comparison.jpg` and `qa/settings-v182-comparison-focused.jpg`.
2. Second pass — no actionable P0/P1/P2 mismatch. Remaining differences are deliberate functional omissions grounded in the audited backend.

## Primary interactions tested in the cloud browser

- `Ещё → Настройки` opens `/settings`, while `Ещё → Интеграции` opens `/integrations`.
- Context-aware Back returns from Settings to More.
- Direct `/settings?venue=14` renders Settings and exactly one canonical navigation mount.
- Profile link opens the existing profile editor; email is read-only and venue role is informational.
- Password action opens the existing identity-gated `/forgot-password` flow.
- Active sessions opens real server-session detail with current-session labeling. The destructive revoke action was not clicked during visual QA.
- Venue switch `A → B → A` preserves account data and keeps one canonical navigation.
- Mobile has no horizontal overflow; desktop content is capped at 680 px.
- The bottom state, legal rows, build 182, logout action, scroll end, and safe-area above canonical navigation were visually inspected.

## Console check

Legacy malformed health-store records initially caused the global startup coordinator to crash before Settings could mount. Date validation and route-scoped startup calculation were added; after the fix no application console errors were observed. A Chrome extension metadata warning remained and is outside the application runtime.

final result: passed

---

# Notifications v183 — Design QA

**Source visual truth path**

`/workspace/scratch/e51da6f6cb04/upload/42851585-C395-412B-A534-543BE27863AA.jpeg`

**Implementation screenshot paths**

- Mobile: `/workspace/scratch/e51da6f6cb04/qa-artifacts/notifications-v183/notifications-mobile-v183.jpg`
- Desktop: `/workspace/scratch/e51da6f6cb04/qa-artifacts/notifications-v183/notifications-desktop-v183.jpg`

**Comparison evidence**

- Full mobile side-by-side: `/workspace/scratch/e51da6f6cb04/qa-artifacts/notifications-v183/notifications-mobile-comparison-v183.jpg`
- Focused header, device and categories: `/workspace/scratch/e51da6f6cb04/qa-artifacts/notifications-v183/notifications-mobile-top-comparison-v183.jpg`

**Viewport and normalization**

- Source pixels: 711 × 1536, approximately @2x mobile density.
- Source normalization: resized to 390 × 844 for a like-for-like comparison.
- Browser-rendered mobile implementation: 390 × 844 CSS px in a same-origin QA viewport, device pixel ratio 1; the surrounding desktop canvas was cropped out.
- Mobile document metrics: 390 px viewport width, 390 px document width, 844 px viewport height and 844 px scroll height; no horizontal overflow.
- Browser-rendered desktop verification: 1363 × 936 CSS px; full-page capture 1363 × 1176 px. Content is capped and centered in the canonical desktop workspace.

**State**

Authenticated synthetic owner account with two venues. Light theme. The test browser does not expose a supported secure push-permission channel, so the implementation correctly renders the honest `Состояние неизвестно` device state instead of copying the green state from the mock.

## Findings

- No actionable P0/P1/P2 visual findings remain.
- The source mock shows a green connected-device state. The browser evidence shows an unknown state because the actual environment cannot confirm permission, subscription and server readiness. This is an intentional evidence-backed state, not visual drift.
- The source mock shows a configurable critical-hours toggle. The existing evaluator has a mandatory, non-configurable critical bypass. The implementation therefore renders `Всегда` without a fake toggle.
- The implementation keeps the six-item canonical BarDoctor navigation, including `Добавить`, rather than copying the five-item navigation in the directional mock.

## Required fidelity surfaces

- Fonts and typography: current BarDoctor Inter/system stack, compact optical weights, readable labels, status pills and secondary text closely follow the reference hierarchy. Long category names wrap without clipping.
- Spacing and layout rhythm: compact white cards, grouped rows, violet/semantic icon wells, restrained radii and dense vertical rhythm match the reference direction. All overview content fits the 390 × 844 viewport above the canonical navigation.
- Colors and visual tokens: dark current header, light neutral page, violet actions and semantic green/red/amber/blue states are consistent with the active design system.
- Image quality and assets: only existing BarDoctor icon assets are used; no emoji, custom inline SVG, CSS illustration or placeholder image replaces visible target assets.
- Copy and content: category names and descriptions are backed by real evaluator rules. Provider terminology, IDs and raw errors are absent. Account-level preference/history scope is stated honestly.
- Responsiveness and accessibility: 390 px and 1363 px layouts were rendered; there is no horizontal overflow, tap targets remain semantic links/buttons, focus styles remain visible, and reduced-motion behavior is preserved.

## Comparison history

1. First pass — P2: the mobile overview had a 1338 px scroll height; the device card stacked its action and 82 px category rows pushed quiet hours and history far below the first viewport.
   - Fix: kept the device action alongside the real state at mobile widths, tightened row/grid spacing and reduced mobile-only typography without changing the desktop density.
   - Post-fix evidence: scroll height reduced to 946 px; quiet hours became visible, but history still sat behind the fixed navigation.
2. Second pass — P2: the history entry and privacy copy remained below the 844 px viewport.
   - Fix: shortened evidence-backed device copy, reduced mobile row height to 53 px and tightened section rhythm and safe-area padding.
   - Post-fix evidence: the final document is exactly 390 × 844 with all six categories, quiet-hours policy, history and canonical navigation visible; full and focused side-by-side captures show no remaining actionable P0/P1/P2 mismatch.

## Primary interactions tested in the cloud browser

- Direct `/notifications` and context-aware Back from category/history/quiet views.
- All six real category detail screens opened; each exposes only evaluator-backed rules and one persisted category preference.
- Finance preference changed, saved automatically, survived reload, and was restored.
- Quiet hours changed to `22:30–07:30`, showed `Сохранено`, survived reload, and were restored to `23:00–08:00`.
- Critical quiet-hours policy exposes zero configurable toggles because the backend policy is mandatory.
- Empty notification history renders a user-facing empty state with no provider diagnostics.
- Venue switch `A → B → A` resets child view context, preserves account-scoped preferences and keeps exactly one canonical navigation.
- Mobile document width equals viewport width; desktop uses a bounded content column.

## Console check

No errors from `terminal.local` application code were observed. Repeated Chrome extension metadata messages came from the cloud-browser extension and are outside the application runtime.

final result: passed

---

# Notifications v184 — Interaction regression QA

## Root cause

The canonical application shell captured clicks from the embedded Notifications iframe and updated only the parent URL query. Because the application router subscribes to pathname changes, the same-path query update did not remount or rerender the iframe. The URL changed, while the visible overview stayed unchanged.

## Runtime verification

- Entered through `Ещё → Уведомления` and opened all six category details by real browser clicks.
- Verified taps on the category title, empty row area and chevron by coordinate input; all three open the correct detail.
- Changed the real `Смены` preference, observed server confirmation, reloaded the route, confirmed persistence, then restored the original value.
- Changed quiet-hours start from `23:00` to `22:30`, confirmed `Сохранено`, reloaded, confirmed persistence and timezone `Europe/Chisinau`, then restored `23:00`.
- Opened History and returned; no provider IDs, raw responses or ISO timestamps were exposed.
- Opened the device action. An unsupported runtime receives actionable browser guidance instead of fake system navigation.
- Verified `A → B → A`; switching venue resets a child detail to Notifications overview.
- Mobile viewport: 390 px client width and 390 px scroll width for both shell and Notifications content; one canonical navigation.
- Desktop viewport: whole-row category targets and the embedded same-path route bridge were exercised.

final result: passed

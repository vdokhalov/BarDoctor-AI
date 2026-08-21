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

# Warehouse v241 — Final refinement QA

## Evidence

- Source visual truth: `/workspace/scratch/2bdf7974f7c0/upload/F7350725-A671-4794-8C4D-8EC036BC5B48.jpeg`.
- Browser-rendered mobile evidence: live `/warehouse-qa-frame-v241.html` canvas containing 375, 390 and 430 px frames.
- Browser-rendered desktop evidence: live `/warehouse?qaNomenclature=1&venue=501` at 1363 × 936 CSS px.
- Full-view comparison: the source image and final three-width browser capture were emitted together in one comparison input. The final implementation retains the accepted compact hierarchy and focuses only on control clarity, information density and workflow separation.

## Viewport, state and responsive coverage

- Initial state: all venue sections are collapsed; categories, subcategories and products are absent until their parent is explicitly opened.
- Expanded state: `Бар → Алкоголь → Пиво`; the user opens each level independently and only then sees seven compact product rows.
- Mobile: 375, 390 and 430 px frames. Document width equals viewport width in every frame (360/360, 375/375 and 415/415 inner CSS px), so no horizontal overflow is present.
- Desktop: the existing bounded stock workspace remains centered inside the canonical application shell.

## Findings and iteration history

1. First pass — P2: the structure select was clipped on narrow mobile layouts and could render as a partial label.
   - Fix: changed the compact label to `Структура`, reserved a stable 128–132 px control column and prevented mobile text inflation/wrapping.
   - Result: the complete label and chevron remain visible at 375, 390 and 430 px without conflicting with search.
2. First pass — P2: `Номенклатура` read as a full-width primary warehouse CTA.
   - Fix: moved it into the stock-heading row as a compact secondary link with a chevron; the route and workflow are unchanged.
3. First pass — P2: `Требуют распределения` was visually mixed into the section hierarchy.
   - Fix: derived its count from current-venue attention data, rendered it as a separate compact status row above the real tree, hid it at zero and deep-linked to the existing `На проверке` queue.
4. Second pass — no actionable P0/P1/P2 mismatch. The upper dashboard is 10–15% denser while preserving practical tap targets, all four actions, all four current tabs and the canonical navigation.

## Required fidelity surfaces

- Typography: the existing BarDoctor font stack and hierarchy are preserved. Search placeholder weight/contrast is quieter; long hierarchy and product names wrap by words with a two-line clamp and no aggressive hyphenation.
- Spacing and layout: KPI, action, tab and control gaps are tightened without reintroducing nested cards. Tree rows, count slots, chevrons and indentation continue to match Nomenclature.
- Colors and tokens: existing neutral surfaces, subtle borders and restrained violet/indigo accents remain. The distribution row uses a compact semantic warning treatment rather than becoming a fake section.
- Assets: existing icon components and brand assets are reused; no emoji, placeholder imagery, custom SVG or decorative CSS illustration was introduced.
- Data fidelity: counts, stock, units, currencies, status, packaging, cost and receipt data remain venue-scoped. No conversion, stock update or other data mutation was added.

## Interaction and regression coverage

- Verified whole-row disclosure at section, category and subcategory levels and product-card opening from the whole product row.
- Verified `Пиво Kozel тёмный` (`60 шт.`) and zero-stock `Сироп тестовый` (`0 мл`, package `1 л`, `0 MDL`) without `NaN`/`undefined`.
- Verified the distribution row at `N > 0`, its direct review-queue transition, its removal from the main tree and its hidden state at zero.
- Verified `Кёльн → Причал → Кёльн`: KPI, counts, units, warning count and collapsed disclosure state stayed isolated per venue.
- Verified grouping modes `Структура`, `Категории`, `Подразделы` and `Список`; returned structure state remained collapsed.
- Verified all current tabs: `Остатки`, `Движения`, `Инвентаризации`, `Списания`.
- Verified all four actions: inventory sheet, single-file scan chooser, sales-import route and add-purchase sheet.
- Verified long-name search, scroll-to-top placement, desktop max width and unchanged six-item bottom navigation.

## Console check

No application-origin console errors were observed. Two metadata errors came from the cloud-browser extension URL and are outside the BarDoctor runtime.

final result: passed

---

# Warehouse v240 — Compact tree redesign QA

## Evidence

- Source visual truth: `/workspace/scratch/2bdf7974f7c0/upload/F7350725-A671-4794-8C4D-8EC036BC5B48.jpeg`.
- Browser-rendered mobile evidence: `/warehouse-qa-frame-v240.html`, containing live 375, 390 and 430 px frames.
- Browser-rendered desktop evidence: `/warehouse?qaNomenclature=1&venue=501` at 1363 × 936 CSS px.
- The source mock and the final three-width mobile canvas were emitted together in one comparison input. The implementation preserves the mock's header, compact action area, tabs, filters, hierarchical stock list, compact product rows and canonical navigation.

## State and responsive coverage

- Initial state: every section, category and subcategory is collapsed. A child level is not rendered until the user explicitly opens its parent.
- Expanded state: `Бар → Алкоголь → Пиво`, with seven venue-scoped beer positions rendered as 76 px rows.
- Mobile: 375, 390 and 430 px frames with no horizontal overflow; the fixed bottom navigation and compact scroll-to-top control remain unobstructed.
- Desktop: the stock workspace is bounded and centered inside the canonical finance layout instead of stretching across the full page.

## Findings

- No actionable P0/P1/P2 visual findings remain.
- Four stock tabs remain because the existing module also includes `Списания`; removing it to copy the three-tab mock would violate feature parity.
- The compact summary strip remains above the actions because its venue-scoped value, item count, negative count and last-inventory data already support the warehouse workflow.
- Mobile action tiles use a 2 × 2 layout so the full Russian labels remain readable and tappable; desktop uses four equal columns.

## Required fidelity surfaces

- Typography: existing BarDoctor font stack and weights are retained. Hierarchy labels, product names, amounts and secondary metadata have distinct optical weight; long names clamp to two lines without hyphenation.
- Spacing and hierarchy: nested product cards were replaced by a single divided tree surface. Indentation, one subtle active-branch guide, compact counts and chevrons match the updated Nomenclature pattern.
- Colors and tokens: light neutral page, white surfaces, restrained violet/indigo accents, compact green/amber/error status text and subtle borders use the established BarDoctor tokens.
- Icons and assets: existing application icon components and logo assets are reused; no emoji, custom SVG, CSS illustration or placeholder imagery was introduced.
- Responsiveness and accessibility: hierarchy rows are semantic buttons with `aria-expanded` and `aria-controls`; the whole product row opens the existing card. Counts and units are non-wrapping, product rows have practical tap height, and 375/390/430/1363 px views have no horizontal overflow.

## Interaction and regression coverage

- Fresh open showed only top-level sections; opening `Бар` revealed collapsed categories, opening `Алкоголь` revealed collapsed subcategories, and opening `Пиво` revealed products only at the fourth user action.
- Closing/reopening and `Кёльн → Причал → Кёльн` reset disclosure state. Köln showed 19 positions and zero counter 3; Причал showed 3 positions and zero counter 0, with no carried counts or open IDs.
- Opened `Пиво Kozel тёмный`; verified `60 шт.`, packaging, accounting/display unit, cost, last receipt and current status without `NaN` or `undefined`.
- Searched and opened zero-stock `Сироп тестовый`; verified `0 мл`, `Нет остатка`, `1 л` packaging, `0 MDL`, last-receipt state and an operable card.
- Verified the inventory sheet opens, scan action produces the existing single-file chooser, sales import navigates to `/sales-import`, and purchase opens the existing suppliers/purchases flow.
- Verified `Остатки`, `Движения`, `Инвентаризации` and preserved `Списания` content. The canonical six-item navigation remained intact and Finance stayed active.
- A legacy warehouse-sales DOM injector initially logged an `insertBefore` error against the redesigned hierarchy. It now detects v240, removes only its obsolete legacy entry and exits; a fresh browser tab showed zero application errors.

## Console check

No `terminal.local` application errors were present after the legacy injector guard. Browser-extension metadata errors were excluded as non-application noise.

final result: passed

---

# Nomenclature v238 — Compact tree redesign QA

## Evidence

- Source visual truth: `/workspace/scratch/c68329c14995/upload/5B52A5B1-4134-4261-93A1-185BBA67BF1E.png`
- Browser-rendered implementation screenshot: `/tmp/nomenclature-v238-qa-all.png` (cloud-browser session artifact containing 375, 390 and 430 px frames).
- Local implementation route: `/nomenclature?qaNomenclature=1&venue=501`.
- Full-view comparison: the source mock and the final three-width browser capture were emitted together in one comparison input. The implementation preserves the same header → structure title → search/tabs → four-level tree → canonical bottom navigation hierarchy.
- Focused comparison: the 390 px frame was inspected at readable scale for the header, segmented tabs, section/category/subcategory rows, stock amount, location line, chevrons and bottom navigation. A separate crop was not required because those controls remained legible in the combined comparison.

## Viewport and normalization

- Source pixels: 941 × 1672. The source includes an iPhone status area and is a directional high-density mock rather than a 1:1 browser capture.
- Implementation comparison frame: 390 × 844 CSS px at device pixel ratio 1, with additional browser-rendered checks at 375 × 844 and 430 × 844.
- Desktop implementation: 1365 × 936 CSS px.
- Density normalization: compared at the shared 390 px content width and ignored source-only status-bar/device-density differences. Layout hierarchy, control proportions, wrapping and information density were judged in CSS-space rather than raw source pixels.
- State: light theme, authenticated synthetic owner, venue `Кёльн`, `Бар → Алкоголь → Пиво` expanded, seven beer positions visible in the rendered tree data.

## Findings

- No actionable P0/P1/P2 visual findings remain.
- The compact action shortcuts `Позиция`, `Покупка`, `Остатки` remain above search. They are an intentional feature-parity deviation from the directional mock, not decorative UI.
- The optional review warning remains as one compact amber row near the tabs. The primary entry point is still the `На проверке` tab, as required.
- Test counts differ from the illustrative mock because the implementation uses venue data as the source of truth.

## Required fidelity surfaces

- Fonts and typography: existing BarDoctor font stack and weights are retained. Heading, hierarchy labels, product names, storage locations and amounts have distinct optical weights; 375/390 px tab and action labels no longer wrap awkwardly.
- Spacing and layout rhythm: one bounded workspace and one tree surface replace nested cards. Section, category, subcategory and item rows use dense, consistent heights with restrained indentation, guide lines and dividers.
- Colors and visual tokens: light neutral page, white surfaces, soft borders, muted secondary text and restrained violet/indigo accents match the mock and existing tokens.
- Image quality and asset fidelity: no raster imagery is required for this data-management screen. Existing BarDoctor/logo assets and the installed icon set are reused; no emoji, handcrafted SVG or decorative CSS illustration substitutes were added.
- Copy and content: the requested structure title, path explanation, search label, tabs, review status, product names, locations and user-configured units are present. Full taxonomy paths are not repeated inside product rows.
- Responsiveness and accessibility: 375, 390, 430 and 1365 px layouts were rendered without horizontal overflow. Accordion rows are semantic buttons with `aria-expanded`/`aria-controls`, the whole row is tappable, item rows open the editor, focus behavior is preserved and the scroll-to-top control respects bottom navigation.

## Comparison history

1. First browser pass — P2: at 375/390 px the `Позиция` action and `На проверке` tab wrapped, while the search placeholder was overly cramped.
   - Fix: tightened mobile-only font/padding values, hid the redundant Plus icon at the narrowest width and made the review tab a non-wrapping compact control.
   - Post-fix evidence: the final combined comparison shows single-line action/tab labels and stable 375/390/430 layouts with no clipping or horizontal scroll.
2. Second browser pass — no actionable P0/P1/P2 mismatch. Remaining differences are deliberate feature-parity constraints described above.

## Primary interactions tested in the cloud browser

- Expanded `Бар → Алкоголь → Пиво`; verified all seven Köln beer rows and per-position `шт.` amounts.
- Opened `Пиво Kozel тёмный`, verified the existing editor and returned to the tree.
- Changed synthetic `Сироп тестовый` from `мл` to `шт.`, saved, and verified the tree changed from `0 мл` to `0 шт.` without touching real data.
- Expanded `Вино и игристое`; verified `Вино Крикова Изабелла` displays `12 шт.` from its configured 0.75 L package.
- Expanded `Кухня → Продукты → Мясо и птица`; verified a long product name, storage location and `5,2 кг` amount.
- Opened `Все позиции` and `На проверке`; verified their existing content and attention item.
- Searched for `Kozel тёмный`; verified the matching product remains and unrelated beer rows are filtered out.
- Used the existing venue switcher to select `Причал`, then verified its `/nomenclature` data separately: `Пиво Kozel тёмный — 24 шт.` and `Вино домашнее — 6 л`.
- Scrolled the 390 px Köln list past the threshold, verified the scroll-to-top control became keyboard reachable, clicked it and confirmed scroll position returned to zero.
- Desktop layout rendered in the canonical bounded workspace with the existing left navigation and venue switcher.

## Console check

No errors from `terminal.local` application code were observed in the final cloud-browser session.

final result: passed

---

# Nomenclature v239 — Collapsed tree refinement QA

## Evidence

- Source visual truth: `/workspace/scratch/c68329c14995/upload/5B52A5B1-4134-4261-93A1-185BBA67BF1E.png`.
- Browser-rendered mobile evidence: the local QA canvas at `/nomenclature-qa-frame-v238.html`, containing live 375, 390 and 430 px frames.
- Browser-rendered desktop evidence: `/nomenclature?qaNomenclature=1&venue=501&visual=1` at 1365 × 936 CSS px.
- The source mock and the final manually expanded implementation were emitted together in one comparison input. The implementation retains the selected compact-tree direction while reducing hierarchy markers, guide lines and row height.

## State and responsive coverage

- Initial state: every top-level section is collapsed; no category, subcategory or product row is mounted until its parent is explicitly opened.
- Expanded comparison state: `Бар → Алкоголь → Пиво`, with the seven synthetic Köln beer rows and their venue-scoped `шт.` amounts visible.
- Mobile: 375 × 844, 390 × 844 and 430 × 844 CSS px, with fixed canonical bottom navigation.
- Desktop: 1365 × 936 CSS px, bounded workspace and canonical left navigation.

## Findings

- No actionable P0/P1/P2 visual findings remain.
- Top-level sections are distinct through the compact letter badge, stronger typography and a very light neutral tint; categories rely on indentation and typography; only subcategories retain the selective violet dot; products have no dot.
- One subtle active-branch guide remains. The second product-level guide was removed, avoiding the previous spreadsheet-like stack of parallel lines.
- Product rows are 54 px on mobile and 56 px on desktop. Storage text is smaller, lighter and closer to the product name, while the stock amount remains high-contrast and data-driven.
- Long hierarchy labels use a two-line clamp with a reserved, non-shrinking count/chevron slot.

## Interaction and regression coverage

- Fresh open/reopen: all five synthetic Köln top-level sections reported `aria-expanded=false`; categories were absent.
- Opened only `Бар`: its three categories appeared and remained collapsed; all sibling sections stayed collapsed.
- Opened `Алкоголь`: all subcategories appeared collapsed; no product row was rendered.
- Opened `Пиво`: only then did the seven beer rows render.
- Closed/reopened the route and confirmed the tree returned to fully collapsed state.
- Search for `Kozel тёмный` temporarily revealed the matching path. A search-only accordion change did not alter the normal tree; clearing via user keyboard input restored the previous normal disclosure state.
- Switched `Кёльн → Причал`, reopened Nomenclature and confirmed the new venue started fully collapsed with its own counts and units. No Köln disclosure state or IDs were reused.
- Opened `Пиво Kozel тёмный` and verified the existing editor, section/category/subcategory controls, storage location, stock unit, purchase unit, display unit and packaging controls.
- Opened `Все позиции`, `На проверке` and returned to `Структура`; headings and existing routes remained functional.
- No `terminal.local` application errors were present. Repeated metadata messages from the cloud-browser extension were excluded as non-application noise.

## Visual comparison result

The implementation preserves the source hierarchy, light surfaces, restrained indigo accent, compact information density, prominent amounts and canonical navigation. The deliberate differences are required by the final brief: the default state is fully collapsed, category/product dots are reduced, parallel guides are removed, product rows are denser and existing BarDoctor quick actions/review status remain for feature parity.

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

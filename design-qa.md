# Design QA — Sales UX v278

- Source visual truth: `/workspace/scratch/98f8b35ed9b7/upload/D2300BEC-4106-47AE-9EF8-4F2C34CC7373.jpeg`
- Browser-rendered implementation evidence:
  - `/workspace/scratch/bardoctor-sales-mobile-390-board.jpg`
  - `/workspace/scratch/bardoctor-sales-quick-entry-320-fixed.jpg`
  - `/workspace/scratch/bardoctor-sales-source-mobile-390-fixed.jpg`
  - `/workspace/scratch/bardoctor-sales-preview-mobile-390-fixed.jpg`
  - `/workspace/scratch/bardoctor-sales-preview-desktop.jpg`
- Combined comparison evidence: `/workspace/scratch/bardoctor-sales-design-comparison.jpg`
- Source pixels: `1200 × 1400`, approved four-state mobile board.
- Implementation pixels: browser boards `1348 × 972` at DPR 1; desktop preview `1363 × 936` at DPR 1.
- CSS viewport: responsive QA frame widths `320`, `375`, `390`, `430`; the desktop browser iframe scrollbar reduces the inner content widths to `303`, `358`, `373`, `413` respectively. Desktop viewport `1363 × 936`.
- Density normalization: reference board resized to 900 px wide; browser boards resized to 900 px wide and placed in the same comparison image. Content regions, rather than device chrome, were used for fidelity judgement.

## State

Compared the approved main screen, source chooser, quick entry, and unified preview against browser-rendered BarDoctor states. The local QA venue contains an existing three-line text draft but no active menu catalogue, so the browser quick-entry evidence shows the honest empty catalogue state; populated category/quantity rows are covered by the presentation fixture tests and the same production CSS selectors.

## Full-view comparison

The implementation preserves the approved information hierarchy: compact sales hero, six KPI cards, documents, the attention block, a four-source bottom sheet, contextual quick-entry controls, a four-column preview summary, actionable line statuses, and a persistent action footer. The purple action hierarchy, neutral canvas, card radii, mobile density, and Russian product terminology align with the approved board. Desktop intentionally expands the KPI and preview table horizontally while retaining the same actions and domain state.

## Focused region comparison

Focused review covered:

- 320 px quick-entry search/category controls and sticky footer;
- 390 px source chooser height, safe-area spacing, and fully clickable cards;
- 390 px preview summary, column labels, mapping selects, statuses, and footer;
- desktop preview table and blocked-state warning.

Focused regions were necessary because the original board contains dense mobile controls that are too small to validate from the full board alone.

## Required fidelity surfaces

- Fonts and typography: existing BarDoctor Inter/system stack retained; hierarchy, weights, labels, wrapping, and focus names remain readable at all checked widths.
- Spacing and layout rhythm: no horizontal overflow at 320/375/390/430; 44+ px touch controls, compact hero, separated category sections, and non-overlapping sticky footer.
- Colors and tokens: established BarDoctor purple, neutral surfaces, and semantic green/amber/red statuses retained with text labels so status is not color-only.
- Image quality and assets: existing project icon assets are used; no emoji, CSS-drawn icons, or placeholder artwork was introduced.
- Copy and content: internal entity vocabulary is removed from production presentation; labels use “Продажи”, “Документы”, “Что не попало на склад”, “Себестоимость продаж”, and localized statuses.

## Comparison history

1. Initial 320 px quick-entry capture found a P2: the category selector was compressed beside search and visibly truncated. Fix: at `max-width: 360px`, search and category now stack in one column; the searchbox also received an explicit accessible name. Post-fix evidence: `/workspace/scratch/bardoctor-sales-quick-entry-320-fixed.jpg`; `scrollWidth === clientWidth` (`303 px`).
2. Initial 390 px preview capture found a P2: “Количество” and “Статус” overlapped, and the mapping option was overly truncated. Fix: the column label is now the approved compact “Кол-во”, and mapping selects use a 12 px mobile-safe type size. Post-fix evidence: `/workspace/scratch/bardoctor-sales-preview-mobile-390-fixed.jpg`; `scrollWidth === clientWidth` (`373 px`).

## Findings

No actionable P0/P1/P2 visual differences remain.

Residual P3/test gap: the browser QA venue has no active menu items, so the populated 15–20-row manual-entry state was not visually captured against live venue data. Responsive row rendering, zero-quantity exclusion, category grouping, templates, keyboard progression, and posting-domain regression are covered by automated tests; the empty catalogue state is rendered honestly.

## Primary interactions tested

- main Sales screen and compact document state;
- source chooser open/close;
- manual entry open, Previous shift/Frequent/All menu tabs, search and category controls;
- responsive overflow checks at 320/375/390/430;
- unified preview with actionable unresolved mappings;
- text-entry screen;
- browser Back closes the active editor without a navigation trap;
- desktop preview;
- application console errors: none. The cloud-browser extension emitted metadata transport errors from `chrome-extension://`; these are outside the BarDoctor origin and were excluded from application QA.

final result: passed

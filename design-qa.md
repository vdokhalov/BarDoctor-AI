# Design QA — классификация номенклатуры v362

## Evidence

- Source visual truth: `/workspace/scratch/0d34a9e3f581/generated_images/exec-9335e213-a2fc-4be8-952d-1c16877f0a23.png`
- Browser-rendered implementation capture: `cloud-browser://cdp/tab-1/nomenclature?qaNomenclature=1#mobile-frame`
- Source pixels: `851 × 1849` at 1×.
- Implementation pixels / CSS viewport: `390 × 844` at device scale factor 1.
- Density normalization: the source and implementation have the same 0.460 aspect scale (`851 → 390`, `1849 → 848`; the four-pixel height difference is browser-frame crop). The comparison used the app content, not browser chrome.
- State: mobile nomenclature card for `Сигареты Winston`; section `Бар`, category `Сигареты`, no subcategory, storage `Склад бара`.

## Findings

No actionable P0, P1, or P2 differences remain.

The implementation preserves the selected visual direction: one compact classification summary, a single disclosure for editing, the existing BarDoctor typography and violet token, large mobile controls, and a sticky save area. Product behavior intentionally extends the static mock by hiding the subcategory control when the category has no children and by displaying category-level items under `Без подкатегории` in the structure tree.

## Required fidelity surfaces

- Fonts and typography: existing product sans-serif stack and established weight hierarchy retained; no new font drift or illegible wrapping in the 390 px viewport.
- Spacing and layout rhythm: compact summary aligns with neighboring fields; the `flex: none` correction prevents mobile collapse; sticky actions remain visible.
- Colors and visual tokens: existing foreground, border, surface, focus-violet, warning, and destructive tokens retained.
- Image quality and asset fidelity: this flow contains no raster imagery, logos, or decorative image assets; existing icon treatment is unchanged.
- Copy and content: path uses `Раздел → Категория → Подкатегория`; optionality is stated in the UI; save-blocking feedback identifies the first missing required field; purchase labels use business language.

## Full-view comparison evidence

The 390 × 844 browser-rendered mobile frame was inspected against the full selected mock. Overall hierarchy, density, classification placement, field rhythm, and the sticky footer match the chosen compact direction. No horizontal clipping or collapsed content remained after the final fix.

## Focused region comparison evidence

The classification region was inspected in both collapsed and expanded states. The final collapsed state shows `Бар → Сигареты`, `Путь задан`, and one `Изменить` disclosure. The expanded state shows section and category controls, omits subcategory for `Сигареты`, and explains that no additional choice is required.

## Comparison history

1. P1 — classification container collapsed to roughly 2 px in the mobile flex layout.
   - Fix: added `flex: none` to `.bd-nomenclature-classification-v362`.
   - Post-fix evidence: browser capture at 390 × 844 shows the full path, status, and disclosure without clipping.
2. P1 — items saved directly to a category could disappear from the structure tree when there was no subcategory.
   - Fix: added a category-level `Без подкатегории` group and rendered direct items there even when sibling subcategories exist.
   - Post-fix evidence: browser DOM and rendered tree show `Сигареты Winston` inside `Бар → Сигареты → Без подкатегории`.

## Primary interactions tested

- Opened section and category in the structure tree.
- Opened a category-level item with no subcategory.
- Expanded and collapsed the classification editor.
- Changed section and confirmed dependent category/subcategory values clear.
- Confirmed disabled save state names the missing category.
- Selected a category with no subcategory and saved successfully in the local QA fixture.
- Confirmed the saved item remains visible under `Без подкатегории`.
- Opened the category manager; confirmed add-category controls follow each section list and row actions are collapsed under `Действия`.
- Opened row actions and confirmed reorder, rename, archive, and delete commands are available.

## Console check

No application-origin console errors were recorded. Browser-extension metadata errors were excluded because they originate from `chrome-extension://` and are unrelated to the app.

## Implementation checklist

- [x] Compact classification summary
- [x] Conditional optional subcategory
- [x] Inline category creation in the current section
- [x] Category-level item visibility
- [x] Compact category manager actions
- [x] Mobile interaction and console verification

## Follow-up polish

No blocking polish remains for this scope.

final result: passed

# Invoice Recognition V2 real-image baseline — 2026-08-26

The two user-authorized photographs were processed from temporary QA storage and are not
included in Git or application assets. Both are photographs of a 1C invoice displayed on a
monitor, with perspective distortion and screen moire.

## Baseline

- Engine: Tesseract 5.3.4, `rus+eng`, official `tessdata_best`.
- Preprocessing: document crop, grayscale, 2x resize, median denoise, contrast stretch,
  sharpening.
- Page segmentation: automatic column-aware mode.

| Metric | Result |
| --- | ---: |
| Documents | 2 |
| Expected purchase lines | 16 |
| Structured lines parsed | 0 |
| Structured line recall | 0% |
| Supplier | 2/2 |
| Document number | 2/2 |
| Russian word date | 2/2 after parser fix |
| Document total | 2/2 |

Tesseract reads the large header and total fields but does not preserve these photographed
tables well enough to recover quantity and price columns. It is therefore rejected as the
production primary engine for this dataset.

## Defects discovered and corrected

1. The deterministic parser previously accepted only numeric dates. Russian dates such as
   “26 августа 2026” are now canonicalized.
2. Supplier selection could fall back to unrelated text above the document. An explicit
   “Поставщик:” field now has priority.
3. Numbered 1C table rows and duplicated unit columns are normalized before quantity/price
   parsing.
4. The Azure adapter now defaults to `prebuilt-layout` and canonicalizes detected table rows,
   instead of relying only on flat `prebuilt-read` lines.

## OCR.Space Engine 3 comparison

The same two unmodified images were processed server-side with Russian language, orientation
detection, scaling and table recognition enabled. OCR.Space extracted 16/16 item rows, both
suppliers, both document numbers/dates and both totals. All displayed quantities, unit prices
and line totals matched the source images. The public demo key was used only for this QA
comparison; production requires a dedicated server-side key.

Repeated runs exposed two valid OCR.Space table layouts: Markdown rows and a vertical sequence
of table cells. The deterministic parser now supports both and only reconstructs a vertical row
when its row number, name, unit, quantity, price, total and arithmetic all validate. The final
live endpoint run produced 16/16 matched rows, 100% quantity accuracy, 100% unit-price accuracy,
100% line-total accuracy and a 16.8 second average recognition time across the two documents.

## Decision

Keep production in `legacy` until a dedicated OCR key is configured and the authenticated
mobile/desktop shadow flow passes. OCR.Space Engine 3 is the recommended provider candidate;
the recognition-quality gate on the available real images passed.

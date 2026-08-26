# Invoice Recognition V2

Scope: image/PDF/spreadsheet to the existing PurchaseDocument draft only. Purchase posting,
stock movements, expenses, supplier debt and warehouse accounting remain unchanged.

## Runtime modes

- INVOICE_RECOGNITION_V2_MODE=legacy — current AI recognition; immediate rollback path and default.
- INVOICE_RECOGNITION_V2_MODE=shadow — legacy remains authoritative while V2 recognition is
  compared without double posting. Intended only for QA because it can double recognition cost.
- INVOICE_RECOGNITION_V2_MODE=primary — OCR, deterministic parsing and mappings run first;
  AI sees only unresolved extracted lines.
- INVOICE_RECOGNITION_V2_AI_FALLBACK=off disables the unresolved-line AI accelerator.

The configured OCR adapter is server-only:

- INVOICE_OCR_PROVIDER=self_hosted|ocr_space|azure_document_intelligence
- INVOICE_OCR_ENDPOINT
- INVOICE_OCR_API_KEY
- INVOICE_OCR_TIMEOUT_MS
- INVOICE_OCR_API_VERSION (Azure default: 2024-11-30)
- INVOICE_OCR_MODEL (Azure default: prebuilt-layout)

The adapter contract returns raw text, lines, optional bounds and confidence. The self-hosted
contract requests non-destructive orientation, document-boundary, perspective, grayscale,
contrast and resize preprocessing. OCR.Space uses Russian Engine 3 with orientation, scaling,
table recognition and text overlay. Azure performs its native orientation/deskew before returning
structured OCR. In every case the original remains unchanged in BarDoctor R2.

## Production OCR

The provider-neutral `self_hosted` adapter remains supported. PaddleOCR and Tesseract cannot
run safely inside the deployed Cloudflare Worker because native executables are unavailable and
the isolate has a 128 MB combined JavaScript/WebAssembly memory limit. The production-compatible
specialized provider adapters are OCR.Space Engine 3 and Azure Document Intelligence
`prebuilt-layout`, invoked only from the server. OCR.Space is the verified real-invoice candidate;
Azure remains available for installations that already have Azure credentials. Both return
structured lines/table data without using OpenAI. The public OCR.Space demo key is QA-only and
must never be configured in production.

No OCR credential is sent to the browser or committed to source. Missing, invalid, throttled and
unavailable OCR is classified and converted to the existing partial-draft/manual-continuation
flow.

## Canonical flow

1. Preserve the original document.
2. OCR into an intermediate representation.
3. Parse headers and lines deterministically.
4. Reuse venue/supplier-scoped confirmed raw-name mappings.
5. Score the complete canonical venue nomenclature by aliases, packaging and fuzzy similarity.
6. Auto-select only high-confidence, unambiguous results.
7. Send only unresolved extracted lines and their bounded candidates to AI when enabled.
8. Require manual confirmation for remaining lines.
9. Emit the existing Purchase Draft and use the unchanged confirmation/posting pipeline.

Provider failures are logged without document contents. Recognition metrics contain durations,
counts and AI request volume; provider token accounting remains in the existing AI observability
layer. No recognition result is posted automatically.

## Real-document quality gate

Create an anonymized manifest from `qa/invoice-recognition-v2/manifest.example.json`, keep its
images outside Git, then run:

`npm run qa:invoice-recognition-v2 -- /absolute/path/manifest.json`

The report contains case IDs and aggregate metrics only; it never logs OCR text or image bytes.
The dataset must include clean, angled, low-light, Cyrillic, Latin, mixed-language,
decimal-comma and decimal-point examples. Production must remain `legacy` until this dataset,
shadow comparison and authenticated mobile/desktop flows pass.

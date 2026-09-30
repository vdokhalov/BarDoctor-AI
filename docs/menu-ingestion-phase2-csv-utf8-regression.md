# Phase 2 CSV UTF-8 regression (v467)

## Proven root cause

The original uploaded CSV was UTF-8 without a BOM. Production storage preserved its original bytes. The first character corruption occurred before AI, inside `XLSX.read(bytes, { type: "array", cellDates: true })` in the catalog import route.

SheetJS 0.18.5 routes delimited input to `prn_to_sheet`. Its array path first calls `cc2str`, mapping each byte to a character. It then calls `utf8read` only when a UTF-8 BOM or `codepage: 65001` is present. Neither condition held for v467's BOM-less CSV. For example, UTF-8 `Б` (`D0 91`) became `U+00D0 U+0091`. `sheet_to_json`, extracted prompt text, recognition normalization, ingestion draft and Import Diff propagated this corruption. UI, taxonomy resolution, transport, upload storage and canonical persistence did not cause it.

The new tests ran against the unchanged v467 parsing options first: three regressions failed (BOM-less preprocessing, delimited compatibility, actual upload before AI). BOM, ASCII, XLSX and BOM-declared UTF-16LE/binary XLS checks passed. With the fix, all targeted tests pass.

## Encoding contract and fix

CSV/TSV identified by the existing filename/MIME contract use UTF-8 at the first SheetJS read, including BOM-less UTF-8, UTF-8 with BOM and ASCII. The existing explicit UTF-16LE BOM path takes precedence. XLS/XLSX retain their original binary read options and internal codepages. No project menu-import contract for arbitrary BOM-less legacy encodings was found; no encoding guessing or new legacy charset selector is introduced.

`menuSpreadsheetText` extracts the existing preprocessing into a shared, directly testable module and adds only the scoped `codepage: 65001` option. It retains SheetJS, separators, quoted/escaped/multiline cells, date handling, trimming and all extraction limits (8 sheets, 900 rows, 30 columns, 350,000 characters). The route retains its permission checks, error response, AI schema and normalization. No post-processing repair, field-specific replacement, second CSV parser, UI change or ingestion-validation bypass is used.

## Regression coverage

Checked-in fixtures contain Cyrillic item name, section, compatibility category and warning text, including `Без подраздела`, `Ё`, punctuation and a quoted comma. Separate UTF-8 BOM and ASCII fixtures are included; XLSX and binary XLS are generated with SheetJS from the same Unicode fixture.

Targeted tests check exact normalized Unicode cells, actual multipart upload/type detection, the extracted AI prompt, original stored bytes, recognized normalized fields, ingestion draft, Diff, validation, confirm, canonical/read APIs, repeated reads/reload and repeated-confirm idempotency. `Бар` is intentionally normalized to department ID `bar`; canonical `sectionId=bar`/`taxonomyCategoryId=alcohol` resolves to `Бар`/`Алкоголь` in the read model. Compatibility category remains exactly `Без подраздела`. Warning text is checked at recognition normalization; ingestion retains its existing persisted-field contract.

The Phase 2 browser suite now runs actual catalog-import upload/preprocessing/normalization handlers for UTF-8 CSV without/with BOM, ASCII and XLSX. Only the external AI model is deterministic and receives the already-preprocessed text. Existing Scan OCR remains a provider-boundary fixture for local QA. Tests use the real permission, ingestion, store, taxonomy and overview handlers with isolated transactional SQLite; no production endpoint is used.

Each permitted browser profile checks Unicode draft input/Diff, validation errors, lost response after real confirm, retry, repeated confirm, exact draft/canonical compatibility category, Menu labels/name before and after reload. The full suite also covers Manual, Scan, Import Diff additions/changes/unchanged/invalid/conflicts/exclusions, duplicates, cancel, concurrent target change, five taxonomy mappings, existing records, cached/fresh profile hydration, repeat login/bootstrap, owner, permitted manager and denied user/server mutation. Mobile widths 390/412 and desktop 1280 are browser emulation, not physical devices.

## Data and release safety

Production remains v467 throughout this fix. All new mutations are synthetic local data. No production QA/work venue data, uploaded source or canonical record is changed. There is no schema change, migration, backfill, data repair or authorization change. Production's failed CSV Import was not confirmed, so no correction of canonical data is needed.

The release must be committed/pushed, pass every mandatory exact-commit GitHub CI job, and be saved as a Sites version with matching source SHA. It must not be published without the user's final deployment confirmation. Phase 2 remains incomplete until full production acceptance passes.

## Local validation result (2026-09-30)

- Targeted encoding/catalog/ingestion: 30/30 PASS.
- Verified build and typecheck: PASS; lint: PASS, zero errors, two existing warnings in unchanged files.
- Full `npm test`: PASS, including 1,344 TypeScript tests and every artifact/posttest suite.
- `scripts/menu-ingestion-phase2-browser.ts`: all nine profiles PASS; 28 actual encoding-format import flows across seven permitted profiles, plus both denied profiles.
- `scripts/general-tech-card-browser-v440.ts`: Recipes desktop 1280/mobile 390/412 PASS.
- `scripts/pos1-browser-qa.ts`: POS desktop 1280/mobile 390/tablet 820 PASS.
- `scripts/opening-browser-qa-phase5.ts`: existing Warehouse manual/package/CSV/confirm/reload desktop/mobile PASS.
- `npm run test:menu-consumption-browser`: existing Menu consumption compatibility PASS.
- `tests/client-release-browser.test.mjs`: actual compiled Worker/static client mobile/desktop PASS.

The canonical client remains `index-BQGspy0I-551eece3184c.js`; only the server preprocessing behavior changes. This is local regression evidence, not a completed production acceptance suite.

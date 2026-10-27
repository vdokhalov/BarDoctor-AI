# BD-11 — repeat review CSV import

Baseline v659 / f62beeca51bacd6cfa146c1bf0a8b1d9c7792722.

## Reproduced cause
The native async preview click handler read `event.currentTarget.disabled` in `finally`, after the event dispatch ended. Browser currentTarget is then null. Baseline browser fixture reproduced the page error and permanently disabled preview button.
After successful import the delayed handler only reset native form controls. It did not reset the stored inspection, mapping DOM, prior result or preview button. Reopening therefore exposed stale state; repeated preview also replaced a user's mapping with suggestions.

## Bounded change
Only public/reviews.js behavior changes. Capture the preview button before await. Reset import state, hidden mapping, result and button availability on new file/open/close/venue change. Retain explicit mapping on repeat preview of the same File, including deliberately unmapped optional fields. Use a request generation and captured venue/File to reject stale responses; cancel the delayed completion timer when resetting. In-flight guard prevents double submit. Failure preserves file/mapping for retry. The existing 900ms result display/automatic close remains.

No import API, permission, review normalization, deduplication, AI or data-model changes. Successful imports still use existing authenticated server route.

## Verification
- Baseline browser using original v659 reviews.js: reproduced currentTarget null error and disabled preview.
- 8 existing review-layer tests PASS: normalization, source-aware identity/deduplication, unchanged metadata, repeated import, summary, CSV field mapping.
- Native compiled UI plus actual local API handlers and isolated SQLite: first import created1; same file repeated created0; new header set/custom mapping; same-file re-preview retains custom mapping; HTTP503 and network abort retain form; retry succeeds; synchronous double submit sends exactly1 request; reload+repeat created0; empty file gives recoverable failure; delayed preview for changed file ignored; delayed preview after venue switch ignored and dialog cleared. Same external ID imported in separately registered foreign local venue creates its own record.
- 390/820/1280 screenshots and horizontal overflow assertions. Mobile mapping screenshot inspected. No browser page errors or AI endpoint requests on final run.
- Final build PASS. Its unrelated generated bundle whitespace was restored with non-whitespace equality assertion; prepared assets re-finalized/verified. public/reviews.js equals dist/client/reviews.js.
- Typecheck has only existing baseline business-health-snapshot.ts:372 and health-partial-operations-v539.test.ts:10 errors.

Evidence: outputs/bd11-review-import/mapping-{390,820,1280}.png and result-1280.png. Reproducible harness scripts/review-repeat-import-browser.ts (ARTIFACT_ROOT=dist/client); BASELINE_JS can supply original source for baseline assertion.

Limits: no live import, original audit CSV unavailable, equivalent isolated files used. Browser network-abort and HTTP failure covered, no separate timeout policy introduced. Full regression not run. No production changes, paid AI, push or publication.

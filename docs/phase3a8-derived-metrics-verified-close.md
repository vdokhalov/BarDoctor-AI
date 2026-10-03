# Phase 3A.8 — derived metric consistency and verified month close

Baseline: production Sites v480, source `1dc5783588d131e7b72dfb758416aa324009f0a2`. Exact baseline recovery is complete. This phase changes G07/G12/G13 only. G05/G06/G16/G18 and Phase 3A.9 are outside scope. Production deployment requires the owner's separate approval. Closure of these GAPs requires production smoke PASS.

## G07 — verified month close

Root cause: the old wizard copied a browser calculation to `bd_month_closings`. Its immutable snapshot protected later editing, but no common revision bound the read inputs to the accepted close.

`GET /api/month-close` reads canonical Finance revenue, Operational Reports, recorded payroll entries, expenses, native sale events, legacy documents/batches, captured stock movements, inventory boundaries, confirmed acquisitions, existing Finance settings/gap reasons, opening stock/writeoffs and the account profile in one D1 statement. The calculation reuses the v480 monthly formula, Phase 3A.6 Finance/recorded FOT and Phase 7 captured financial reconciliation. Payments/deductions remain settlement fields; accrued FOT is recorded base + bonuses, including recorded zero. Current recipes and receipt prices never recost historical sales.

`POST /api/month-close` accepts a preview revision, never a client-authored result. SHA-256 content revisions bind each existing source, its presence/update revision, the profile, venue/workspace/data account, currency, period and calculation version. The server recalculates against the coherent read snapshot. The existing multi-store CAS plus a profile/live membership guard atomically accept the frozen calculation, manifest and audit. A competing accepted mutation rejects with 409, with no close/audit written. Database failures roll back the whole batch. Retrying the same accepted close is idempotent. The generic store writer rejects new `closed` transitions; explicit reopen and frozen-history protection remain in place.

Raw and bulk closing reads also require Finance/payroll/inventory/shifts/sales source permissions in addition to Reports. The accepted client projection uses the existing account/venue cache key and store-update event, checks that context did not change while awaiting the response and waits for an authorized preview before rendering financial fields.

The wizard reads its preview on opening, retains that revision until acceptance and applies the returned closing only after server success. The read endpoint checks manifest/snapshot content bindings. Existing closings without this protocol are `LEGACY_PARTIAL`; corrupt protocol bindings are `INVALID`. Historical closings are neither recalculated nor backfilled. Explicit reopening/reclosing uses the existing lifecycle and creates a new verified result.

Limits: content revisions cover whole account-local source stores, so an unrelated accepted source edit can conservatively require a refreshed preview. The manifest proves the accepted input content/version and selected component identities; it does not archive every old input row or recreate missing legacy history. Missing captured COGS, inventory boundary valuation, payroll, unconverted money, incomplete day coverage or unfinished revenue prevent new verified close. Existing inventory boundary date conventions and recurring tax/utility calculation modes are retained.

## G12 — review aggregate contract

Root cause: server/client/Diagnosis/Health consumers separately interpreted null ratings, analysis state, topic counts and denominators, with different rounding and populations.

`review-aggregate-v1` is shared by the server and compiled into the existing client. Callers first select their authorized population and Google account/location. Ratings must be finite 1–5; null, empty, boolean and invalid zero are unrated. Average = sum of rated values / rated count, rounded to two decimal places; no rated reviews means null. Usable analyzed reviews have `aiStatus=done` and a valid positive/neutral/negative sentiment. Pending/analyzing and failed counts remain separate. Negative denominator = usable analyzed reviews; negative share is rounded to two decimal percentage points (stored as a ratio), or null if the denominator is empty. Date-only windows include their whole end day. Shared calendar trend buckets exclude future reviews and have no overlapping boundary day. Each topic is counted once per analyzed review. Complaint counts use negative mentions; recurring complaints require two negative mentions. Positive mentions cannot become complaints.

Consumers: Reviews client summaries/topic averages/trends, review layer, Google-only Home, Diagnosis external review context, Venue AI guest feedback, Health guest evidence and AI review summary evidence captions. Health's score formula/weights are retained, with the declared analyzed denominator. Pending review sentiment is not inferred from rating in trusted Diagnosis context. Home's selected-Google-only population may legitimately differ from all-source Reviews/Health/AI. Phase 3A.5 account/location binding, legacy/unbound Google exclusion and RBAC remain authoritative. No Google synchronization is required by QA.

Limits: different populations/windows legitimately yield different metrics; analysis-based statistics exclude unusable sentiment. Existing trend availability thresholds remain consumer-specific presentation rules. No historical review relabeling or repair is performed.

## G13 — accepted native sales in item analytics

Root cause: item/menu analytics read legacy confirmed documents/batches while native accepted events lived in `bd_sales_events_v1` and its existing read projection.

`itemSalesInputs` adapts existing `salesEventDocuments` projections into the same document/line grain. Explicit event/batch identities suppress duplicate representations. REVERSED projections suppress prior native representations; only POSTED contributes. Line quantity, revenue and menu ID come from accepted prices/lines. Stable menu IDs survive rename; names are compatibility matching only for lines without an explicit menu ID. Retries cannot duplicate a native event. Finance revenue remains an alternative existing total, never an addition to item/document sales.

Native historical item cost is validated from each captured recipe line using the existing Phase 7 captured-cost reader; UNKNOWN cannot become zero. Batch economics validates the whole native capture. Current recipe cost continues to use the Phase 3A.7 latest confirmed receipt basis. Legacy/import documents and their existing captured-cost compatibility path remain supported. Overview and AI menu context require the permissions of every nested source; explicit foreign ownership on nested facts is excluded from derived input reads.

Limits: unbound legacy lines still use historical name matching. No cross-source identity is invented to deduplicate independent accepted imports and native sales; only explicit shared identities are deduplicated. A sale whose stable menu ID no longer exists is not reassigned to a similarly named menu item. Unknown cost stays unavailable.

## QA and failure classification

All mutations use isolated in-memory/local native D1 test accounts/venues. No working venue, production business data, external Google service, secret, migration or backfill is used.

Targeted fixtures cover null/empty/zero review ratings, rounding, analyzed + pending, repeated positive/negative topics, manual + selected Google, A/B locations and unbound Google; native/legacy/import/retry/reversal/rename, historical COGS versus current recipe/receipt and UNKNOWN; coherent close components, stale read/mutation/close, transactional race/failure, idempotency, immutable legacy, verified reopen/reclose, owner/manager/restricted/revoked/foreign scope and nested ownership.

Failure triage during implementation:
- TEST BUG: initial fixtures used a nonexistent export, wrong analytics result field, missing canonical review date or incorrect captured fixture COGS (actual captured 720, not 600). Fixtures were corrected from the persisted source; no monetary/security assertion was relaxed.
- APPLICATION BUG: the new close permission list initially omitted the existing internal opening-stock permission mapping; owner access was corrected to the existing inventory permission.
- APPLICATION BUG: final review found an overly broad raw manifest read and an unscoped client projection cache write in the new close path. Nested source permissions and the existing cache/context guard now cover both; raw/bulk rejection tests preserve strict 403/no-leak assertions.
- APPLICATION BUG: unscoped legacy-only pure analytics initially applied an artificial venue 0 filter; the old unscoped compatibility behavior was retained while authenticated readers pass explicit scope.
- EXPECTED BEHAVIOR: legacy generic-store close/reclose tests expected a now-prohibited bypass. They now assert rejection and retain frozen-history/reopen/period-lock oracles; actual successful close/reclose is tested through the verified endpoint.
- TEST BUG: an old static Overview assertion required the prior auth helper name. It now requires the stricter live evidence context and all-source permission gate, backed by actual-handler/native RBAC tests.
- TEST BUG: the new browser fixture initially omitted the real Health handler and forced reload around unfinished SPA background reads. It now routes the actual handler, uses the production session/venue header contract for Health and foreign-venue probes, waits for an authorized canonical Health read and the existing settled-read gate, and waits for the actual wizard navigation before mutation. The strict zero-page-error and stale-conflict assertions remain unchanged.
- ENVIRONMENT: running a browser read while artifact preparation was restoring/reapplying the canonical bundle produced a strict byte-identity failure. Browser release gates run after preparation on stable bytes.
- ENVIRONMENT: the local WebKit host validator cannot see libraries in the session-local dependency directory. As in the verified baseline, dependencies and actual browser launch are checked; `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypasses only that inaccurate installation precheck. Browser assertions remain strict.

Release gate results and exact commit/CI/prepared Sites version are recorded in the release evidence after completion. Production remains v480 until separate approval. Phase 3A.8 is not COMPLETE before production smoke PASS.

## Local release evidence (before commit)

- Targeted G07/G12/G13: 25/25 PASS, including permitted manager acceptance with recorded zero FOT + bonus and separate settlement payment.
- Full `npm test`: 2,122/2,122 PASS, with verified build and all Phase 3A.1–3A.7 unit/security contracts. Typecheck PASS. Lint PASS with zero errors and the same two pre-existing warnings.
- Compiled Worker/native D1: 5/5 PASS (Phase 3A.1–3A.4 evidence, Phase 3A.5 canonical boundary, two Phase 3A.7 acquisition/RCA scenarios, Phase 3A.8 close/native sales).
- Chromium + WebKit 390/820/1280: Phase 3A.8 close/conflict/reopen/scoped cache/reload/venue switch PASS; Phase 3A.6 Finance and Phase 3A.7 acquisition/warehouse PASS. Existing Phase 3A.1–3A.5 evidence/cost/menu/boundary mobile/desktop gates PASS.
- RBAC browser and strict controls PASS: owner, permitted/restricted managers, denied source reads, reload and venue switch. Targeted/native tests additionally cover revoked membership, foreign venue/workspace/data account, guessed IDs and nested ownership.
- Artifact preparation repeatability: 5/5 PASS; repeated preparation/build preserves identical client bytes. Sites Worker/manifest validation PASS.
- Changed-file review: only G07/G12/G13 code, shared consumer contracts, reversible artifact preparation, corresponding regression fixtures and release documentation. No schema/dependency lock changes, migrations, backfill or production mutations.

Exact commit, required GitHub CI run/head SHA and saved undeployed Sites version are recorded after the commit in `/workspace/phase3a8-release-evidence.json`. These local results do not assert production smoke or GAP closure.

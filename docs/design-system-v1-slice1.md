# BarDoctor Design System V1 — Reference Slice 1

Baseline: Sites v489, `b7708cadb01ff8e8ee11c1bcfdab448c15068878`.
Target: approved BARDOCTOR Visual Concept V1.2 (“Операционный фокус”); the v489 UX/UI audit supplies supporting constraints. Owner visual approval of the implementation is pending. Production must remain v489.

## Implemented scope

Only Home, Business Health and the existing seven-question Curated Doctor interface change. Home puts the authoritative index and independent data quality before the first canonical priority, short WHY and its business CTA; Doctor is outlined and Today uses operational rows. Health retains the canonical queue, full WHY, supporting signals, evidence/freshness, verification and cost history. Secondary details retain the existing operational handlers.

Doctor keeps the `Сейчас` and `Операции` groups and all seven question contracts. Selecting a question replaces the list with its answer and moves scroll/focus to its beginning. Conclusion and confirmed action (or explicit absence) precede facts, the first limitation, expandable complete limitations, sources/freshness and return. Home/Health return origin is retained under the existing actor, venue and expiry guards. There is no free-form input or new answer generator.

The existing source/permission refusal remains visible as an alert in both the question list and answer view. The restricted-manager browser regression checks all seven questions before selection, list replacement afterwards, and the absence of facts/actions in both states.

## Foundation and semantics

A small React factory supplies the shared activity/dialogue identity, score, action treatment and three presentation adapters. Doctor imports only the identity factory, avoiding a duplicate Home implementation in its bundle. Scoped CSS uses the V1.2 type weights (400/500/600/700), sizes, spacing and restrained purple treatment. Lucide SVG assets include their license. The existing prepared-client migration pipeline remains reversible and repeatable; no architecture rewrite or second design system is introduced.

Score classification is **AUTHORITATIVE**: `businessHealthStatusForScore` in `lib/bardoctor/business-intelligence.ts`, including the existing Finance override in the Business Health builder, supplies `snapshot.status`. The UI uses that status directly. It does not compute thresholds, copy the PDF's sample green 83, or equate score color with verification. The representative fixture produces 28 / CRITICAL. STALE, PARTIAL, UNKNOWN and critical management priority remain independent. A snapshot lacking confirmed freshness explicitly displays UNKNOWN freshness; a missing score is an em dash with no numeric arc.

The ring fills once per appearance in approximately 0.7 seconds; the final number is immediate. Reduced motion shows the final arc immediately. Visible focus, normal-text contrast checks, semantic labels, 44–48 px targets, reflow and no page overflow are checked in the touched content. This is not complete WCAG certification. Existing navigation and safe-area calculations are retained; tablet navigation width adapts on these screens only.

## Regression evidence

The baseline and implementation use identical isolated authoritative fixtures. Entire Health snapshots and all seven complete deterministic Doctor responses compare exactly at 390, 820 and 1280, including canonical priorities, actions, facts and state semantics. No API, scoring, persistence, permission or tenant-isolation implementation changes.

Restoring the three presentation return expressions in memory yields all **3032 original top-level client functions byte-identical** to v489. The generated adapter bundles account for the remaining client changes. Unrelated module implementations are unchanged.

Validation commands include:

- `npm test` (existing artifact checks, unit suite, build and required postchecks).
- `npm run typecheck`, `npm run lint`, `npm run validate:artifact`.
- `tests/intelligence-ui-v1.test.ts`: authoritative high-score/critical classification with STALE/PARTIAL; missing score; existing categories; missing freshness.
- Existing Phase 4A/B/C handler, compiled Worker/native D1, canonical queue, security and multi-venue regressions.
- `scripts/reference-slice-v1-browser.ts` in Chromium and WebKit: exact 390×844, 820×1024 and 1280×900; Home/Health/Doctor before/after; seven usable questions; answer replacement/focus; honest missing action; contrast/type/touch checks; reduced motion; return.
- Existing curated Doctor and integrated management-loop browser suites in Chromium/WebKit; real Tasks, Day, Inventory and Purchase correction flows; Phase 4A lifecycle/race and Phase 4B verification browser suites.
- Existing Home Reviews browser/navigation regression, including the older snapshot representation.
- Repeated artifact preparation and client patching remain lossless and byte-stable.

The two existing lint warnings are the unused `venueMigrationExports` import and `cssPath` variable; no new lint warnings or test exclusions are introduced. Browser harnesses let animation clocks advance on the fixed QA business date, and wait for dependent navigation to settle. They retain strict browser-error, permission, writer and authoritative-state assertions.

## Owner visual review

`outputs/design-system-v1/owner-review/` contains twelve V1.2 target-versus-actual pairs, viewport boards, a PDF, HTML index and an evidence ZIP. Actual Chromium and WebKit viewport/full-page captures and accessibility measurements are under `outputs/design-system-v1/actual/`. `authoritative-before-after.json` and `changed-functions.json` record the contract and source comparison. These ignored QA outputs are also collected by CI.

Review hierarchy, typography, spacing, capability identity, authoritative score, state semantics, CTA hierarchy, responsive composition and Doctor answer-first behavior. Differences in sample content (83 versus the real fixture's 28, climate versus its canonical safety task) are intentional contract preservation. Existing navigation remains operational. Mathematical pixel identity is not the acceptance rule.

Commit/source synchronization, final CI result and the saved **unpublished** Sites version are reported with the release handoff. No deployment is authorized before the owner's actual-UI visual approval.

Deferred: native iOS keyboard/safe-area validation for the later form-heavy slice; P2-B shift-status language; every remaining module redesign.

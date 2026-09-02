# STEP 1.5 — Remaining P1 working disposition

Source of truth: `BarDoctor_STEP_1.4_P1_CODE_SIDE_HARDENING_2026-09-02.md`.

Classification key: A = code implementation; B = automated proof; C = browser/E2E proof; D = external provider; E = production infrastructure; F = product decision; G = native platform; H = current hosting/runtime limitation.

| P1 | Current status | Exact remaining gap | Can close now? | Required action |
| --- | --- | --- | --- | --- |
| P1-02 | PARTIAL | Target Worker Web Crypto rejects PBKDF2 above 100k; no reviewed Argon2id/scrypt implementation is present | No, not safely (H) | Preserve versioned legacy verification and hardened policy; document the target-runtime KDF requirement without substituting an unreviewed implementation |
| P1-03 | PARTIAL | Legacy bearer-header compatibility remains; no rotation/inactivity or shorter privileged-session lifetime | Yes, in part (A/B) | Prove current callers, remove unused JavaScript bearer path, add bounded inactivity/rotation/privileged expiry where compatible, and add lifecycle regression |
| P1-04 | PRODUCT DECISION REQUIRED | Platform-admin MFA enrollment, recovery and step-up policy is undefined | No (F/D) | Produce an owner decision memo; require phishing-resistant MFA before public release and do not invent a custom provider |
| P1-06 | PARTIAL | CSP retains `unsafe-inline` for legacy startup/print code; hosting-layer HSTS is unverified in production | Yes, code-side (A/B/C); HSTS remains E | Noncify or hash the remaining inline code without moving splash geometry, then run header and mobile/desktop regressions |
| P1-07 | PARTIAL | 86 mutation routes lack one formal schema/range corpus | Yes, bounded subset (A/B) | Inventory the routes, prioritize unproven accounting mutations, add shared schemas and generated boundary tests without weakening existing validation |
| P1-09 | PARTIAL | Dedicated purchase/inventory/write-off/tech-card/shift read-compute-batch flows lack storage predicates | Yes, bounded subset (A/B/H) | Trace only the five named flows; add conditional storage predicates and parallel/failure proof where the current D1 model permits |
| P1-10 | PARTIAL | No uniform operation-status lookup or saved/not-saved/unknown UI for every mutation | Yes, bounded subset (A/B/C) | Reuse strong operation identities for critical accounting mutations and add deterministic unknown-outcome handling without heuristic dedupe |
| P1-12 | PARTIAL | Five critical widgets lack independent failure boundaries | Yes (A/B/C) | Isolate Business Health, AI Doctor, reviews, integrations and notifications; inject failures and verify the Home shell survives |
| P1-13 | PARTIAL | Global latency coverage and production error provider are absent | Code-side yes (A/B); provider no (D/E) | Complete global request/error timing and frontend hooks with redaction; classify production collection/alerting separately |
| P1-15 | PARTIAL | Direct production `xlsx@0.18.5` HIGH has no npm-registry fix; replacement or process isolation remains | No safe automatic closure (D/H) | Re-evaluate exact reachability and maintained replacements; retain strict pre-parse limits unless a Worker-compatible reviewed parser is proven |

Already CLOSED P1-01, P1-05, P1-08, P1-11 and P1-14 are outside STEP 1.5 unless a new regression provides evidence to reopen them.

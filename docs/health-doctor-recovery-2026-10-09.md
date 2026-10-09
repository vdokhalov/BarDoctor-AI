# Health / Doctor recovery candidate — 2026-10-09

Local branch: `fix/health-doctor-recovery`. Base: `ad0378431dfea73ded6e67c176dbfcae7ddf4f42`.
No push, merge, Sites save/deploy, production credentials, or production business-data writes were performed.

## Source recovery

The initial checkout was clean `work` at `e48ac83` (remote main). `git ls-remote --heads origin` found `fix/v495-production-rca` at `ad03784`, but no `fix/architectural-stage1`. The available base was fetched and a local repair branch created. Workspace `.agents` and `.codex` were empty; repository AGENTS.md was read. No foreign session directories were accessed.

Read-only Sites version metadata confirms the latest saved version is 501 and records the same `ad03784` source SHA. Its saved archive is a deployment artifact (279 files, 31,744,000 bytes); no new unpublished source revision was exposed by the version history. The previous task's uncommitted optimizations were not recovered. Their test counts and CPU numbers are historical, not current evidence.

## Repair

- Build ingredient identity/alias resolution and known-product lookup once per read pass, preserving alias order, cycle winners, conflicts, and fresh-read behavior.
- Normalize supplier mappings once per candidate collection, preserving supplier evidence order and orphan handling.
- Partition movement operands by product before applying the unchanged cost-basis resolver. Strict receipt matching, reversal, date, venue, warehouse and UNKNOWN/known-zero rules stay in the existing resolver.
- Reuse ingredient reconciliation only inside the current canonical read. Exact operand signatures invalidate the memo; owner/version selection remains independent. The memo is shared by menu summaries, analytics and current cost observations, never across HTTP requests.
- Parse and hash immutable cost sources/profile once per observation reader. Cache source evidence and repeated observations only inside that reader. Return cloned observations so callers cannot mutate subsequent results.

Auth/RBAC, API envelopes, business formulas, schema, UI presentation and deployment limits were not changed. No index truncation, sampling of financial sources, or fake healthy score was introduced.

## Reproducible checks

- `npm test`: full project pipeline, including artifact preparation, audits, typecheck, build, artifact tests, TypeScript tests and posttests.
- `npm run lint`: no new warnings; existing unused-variable warnings in the Koln migration route and warehouse patch remain.
- `node --import tsx --test tests/health-doctor-recovery.test.ts`: exact baseline differential comparison for 16 mixed datasets, 48 certified observations, request memo invalidation, input immutability and output mutation protection.
- `node --import tsx scripts/health-doctor-recovery-cpu.mjs`: actual authenticated handlers, in-memory SQLite initialized with project migrations, isolated synthetic accounts, 500 products / 30 recipes / 4,000 receipts / 1,000 financial days by default. No production calls. Every source must remain below 2 MB. Hard gate: 10 s process CPU; target status: below 5 s.
- Stress: `BD_RECOVERY_PRODUCTS=1000 BD_RECOVERY_MENUS=60 BD_RECOVERY_MOVEMENTS=8000 BD_RECOVERY_QUESTIONS=health,attention,cost,diagnosis BD_RECOVERY_OUTPUT=outputs/health-doctor-recovery/stress node --import tsx scripts/health-doctor-recovery-cpu.mjs`.
- UI: `node --import tsx scripts/health-doctor-recovery-browser.mjs`. Actual auth and API handlers; QA owner at 390/820/1280; Health → reload → Doctor → launch diagnosis → reload. This script explicitly requires absent provider credentials and labels the provider result BLOCKED; it does not mock provider success. It asserts visible canonical results after reload.

Machine-readable measurements and final verification status are in `health-doctor-recovery-2026-10-09.json`. Full local logs and screenshots are under `outputs/health-doctor-recovery/`.

Baseline `ad03784` on the 500-product set: linked Health 23.13 s CPU, attention 24.02 s; unlinked Health 12.88 s, attention 12.62 s. The expensive baseline cost run was stopped after the baseline had already exceeded the hard budget; no completed timing is claimed for it. A separate smaller 50-product/5-recipe corpus completed all six Health/attention/cost baseline calls; complete JSON responses match the candidate exactly.

CPU is measured using `process.cpuUsage` around actual handler dispatch and response consumption. These are local Node/SQLite measurements, not production Cloudflare CPU guarantees. Do not extrapolate them to all possible venues or represent them as an authorized production iPhone test.

## Browser findings and exclusions

The old `curated-doctor-phase4c-browser.ts` fails because this base intentionally uses the restored legacy Doctor UI, not the removed curated panel. The old performance browser script initially rejected the fixed server fixture's October 3 snapshot against the browser's October 9 clock. The new test aligns only the isolated browser clock with the existing fixture server; application freshness rules are unchanged. Those initial failures are retained in local logs, not counted as passing tests.

Chromium shows a real Health score, real deterministic management facts, and a persisted/reloaded Doctor result through actual handlers. The response explicitly reports `context.provider.available=false`. This verifies the existing no-provider fallback, not a live OpenAI diagnosis.

WebKit binary was downloaded into the workspace. Its system libraries are missing. The standard dependency installer attempted `su` and failed authentication; root access was not available. WebKit remains BLOCKED, not PASS; Chromium's mobile viewport is not Safari/iPhone certification.

## Remaining release gates

1. Live `POST /api/ai/diagnosis` with the requested **new** isolated QA key and `context.provider.available=true`, followed by visible result and reload. Health and deterministic curated reads do not need a key.
2. WebKit lifecycle on a runner with its required system libraries; then owner iPhone smoke after separately authorized publication.
3. Review this exact local commit, obtain Vitaliy's deployment approval, push the approved SHA and publish that SHA through the normal Sites flow. No release has been published by this task.

Credential setup is a platform-tool blocker in this environment. The applicable OpenAI API Key skill permits secure Codex provisioning, but `open_codex_api_key_setup` and `confirm_openai_api_key_local_destination` are not exposed here. Only encrypted creation and the prohibited-for-Codex ChatGPT widget flow are exposed. The installed helper is absent from the workspace and could not be read via either documented skill resource location. An encrypted-create tool alone does not supply the missing confirmation/local-write flow. No key was created and no existing rejected key was read or used.

The parent must restore a supported Codex secure setup/local-write flow, obtain its confirmation for the new QA key and destination, and rerun the live test. There is no verified mobile setup URL from these tool results; do not ask Vitaliy to paste a secret, retry an invisible widget indefinitely, or open a computer. A functioning supported secure form is the required platform capability, not a missing business decision from Vitaliy.

Vitaliy will see these code changes in the existing BarDoctor URL only after the approved commit is published. Before then, production is unchanged. Use `/health`, then `/analysis`, launch diagnosis and reload both pages for the post-release owner check.

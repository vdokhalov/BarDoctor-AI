# Phase 3A.7 production deployment and stopped smoke

**Deployment: SUCCEEDED. Production smoke: NOT PASS. Phase 3A.7: NOT COMPLETE.**

Production is Sites **v478**, source commit **d5ebcc21f995972c55581c794d74925fd62b99ce**. Saved version: `appgprj_6a5734bb1abc81919ff978ed0020c64b~appgver_bcf43683266c8191b2cb8abc89ec1d85`. Deployment: `appgdep_6ac01a09175c8191ae327dad9496ef29`, status `succeeded`, environment revision14 unchanged. URL: https://bardoctor-preview.v-dokhalov.chatgpt.site

The owner explicitly approved deployment of v478. The saved archive-backed version was reused; no new version, source change, migration, backfill, environment change or resource replacement was performed. GitHub/required CI/Sites SHA match. Required CI run37059892311: verify, sales-navigation and sales-scroll-layout all success. Predeployment evidence remains in `outputs/phase3a7-release-provenance.json`.

## Production isolation and actual results

Production smoke used only newly registered synthetic accounts and newly created isolated QA venues. The substantive attempt used venue3335 / workspace3209 / account76, `ISOLATED QA Phase3A7 v478 7a8ea97e004209`. Earlier invalid harness attempts used QA venue3333/account74 and QA venue3334/account75; both are new synthetic scopes, and neither is a working venue. No cleanup/deletion was performed. Every authenticated mutation in the request logs targets its newly registered owner's sole QA venue. No Köln or other working venue mutation, real Google/provider operation, retention stress or production database reset occurred.

The two earlier harness issues are distinct from the release blocker:

- Missing `kind: stock` in the test nomenclature caused OPENING_NEEDS_REVIEW422 without a stock write. v477's `opening-stock.ts` already required this field. Only the fixture was corrected.
- Reusing one source file for different QA invoices invoked the pre-existing source-file duplicate protection: duplicate200 returned the already accepted invoice. v477 already contained that rule. Only the fixture was corrected so the file belongs to its corresponding invoice. Assertions were not weakened.

Substantive production checks passed before the stop:

1. New synthetic owner had access to exactly its newly created venue.
2. Real opening document recorded quantity10 without acquisition history; current cost and valuation returned null/UNKNOWN, rather than zero. Repeated confirmation did not double apply.
3. Real confirmed purchase X created receipt facts. Quantity2 without a count anchor remained PARTIAL with evidenceComplete=false.
4. Actual count create/save/review/finalize produced a complete anchor at quantity2, contributorCount0; repeated finalize did not double count the pre-anchor receipt.
5. Actual sale A captured cost20. Later purchase Y established the newer price; actual sale B captured40. Production GET confirmed sale A's recorded batch was unchanged. Repeated purchase/sale commands exercised existing idempotency.

After a further backdated acquisition, the quantity/cost/valuation read group failed an `evidenceComplete === true` assertion: actual false. Quantity2 passed its preceding assertion. The raw responses for that failing group were not saved before the assertion, so **which projection returned false and the root cause of this production completeness failure remain UNKNOWN**. The completeness assertion was not weakened or converted to PASS. It must be diagnosed separately with retained responses before remediation.

Production source-file traversal, full read-only traversal, procurement summary, owner/permitted/restricted browser acceptance390/1280 and revoked membership checks were **NOT COMPLETED** because smoke stopped before them. Local/CI results do not substitute for these production checks. Production smoke is NOT PASS.

## Independently confirmed blocker in exact deployed source

Read-only local analysis of the unchanged exact v478 source reproduced a separate broken evidence-binding contract through the actual register/purchase/count/sales/Evidence Resolver handlers:

| Scenario | First current valuation | Re-read same bound reference with no canonical changes |
|---|---|---|
| Frozen request time | quantity2, price40, value80, complete | RESOLVED |
| Request time advances one second | quantity2, price40, value80, complete | READ_MODEL_CHANGED |

For the advancing-time reproduction, first asOf=`2026-10-02T12:00:20.000Z`, next asOf=`2026-10-02T12:00:21.000Z`. Canonical data bytes, domain timestamps and audit rows are identical before/after the reads. This is **local actual-handler reproduction on the exact deployed source**, not a claimed production response.

Exact root cause:

- `lib/bardoctor/cost-basis.ts:111` puts request `asOf` into the cost-basis result.
- `lib/bardoctor/valuation.ts:175` embeds that result in valuation lines.
- `lib/bardoctor/stock-evidence.ts:125` includes those complete lines in STOCK_VALUATION's revision input.
- Advancing the request clock therefore changes content revision even though the underlying stock, acquisition, quantity anchor and selected cost basis do not change. A previously bound reference is falsely rejected as READ_MODEL_CHANGED.
- Targeted `tests/helpers/stock-runtime.ts:10` and browser acceptance use frozen time. The reproduction with that same frozen-time condition resolves successfully; advancing-time reads reveal the missed case.

This breaks a central Phase3A7 requirement: reliable traversal from current valuation to unchanged quantity and acquisition facts. It is a release blocker. The source root cause is confirmed; it does not establish the root cause of the separate production completeness assertion.

## Stop and release state

The owner's critical-regression STOP rule was applied. Production mutations stopped. **No automatic application fix, commit, push, new Sites version, redeploy or rollback occurred after the blocker was confirmed.** v478 remains deployed. No Phase3A8 work began.

Migration:NO. Backfill:NO. New ledger/source of truth:NO. Production business-data mutations:YES, **synthetic QA only**. Working venue mutations:NO. Secrets/credentials/API key changes:NO. Production D1 schema changes:NO. PRIMARY D1 FAILURE ROOT CAUSE remains UNKNOWN — NOT REPRODUCED; the failed completeness assertion is not evidence of that infrastructure failure being fixed or reproduced.

G08/G15/G17 are **NOT CLOSED**, because production smoke did not pass. Phase3A7 is **NOT COMPLETE**. Remaining unresolved GAP count stays **10**: G05, G06, G07, G08, G12, G13, G15, G16, G17, G18.

Evidence artifacts (no session tokens/passwords):

- `outputs/phase3a7-production/summary.json`: substantive production request log and five passed checkpoints, NOT_PASS.
- `outputs/phase3a7-production/attempt1-invalid-fixture.json` and `attempt2-duplicate-source-fixture.json`: separate harness attempts.
- `outputs/phase3a7-local-smoke-false.json` and `phase3a7-local-smoke-true.json`: exact-source actual-handler binding reproduction and unchanged canonical/audit proof.
- `outputs/phase3a7-production-smoke.ts` and `phase3a7-smoke-analysis.ts`: ignored QA/analysis scripts only. Application source remains the deployed commit.
- `outputs/phase3a7-release.json`: deployment succeeded, smoke NOT_PASS, closure blocked.

## OWNER EXPLANATION — SIMPLE LANGUAGE

Новая версия опубликована, но завершающая проверка не прошла. В тестовом заведении закупки и продажи сохранили правильную старую и новую себестоимость. Однако полное объяснение остатка подтвердить не удалось. Дополнительно найдено, что ссылка на объяснение стоимости может ошибочно считаться изменившейся только потому, что прошло время, хотя сами данные не менялись.

Поэтому этот этап ещё не завершён. Я остановил тестовые изменения и не исправлял, не перепубликовывал и не откатывал сайт автоматически. Рабочие заведения не затронуты. Проверка новых экранов на телефоне и компьютере в production ещё не выполнена; текущий интерфейс не переделывался. Прежде чем закрывать этот этап, нужен отдельный разбор этих проблем, согласованное исправление и повторная полная проверка. К следующему этапу работа не переходила.

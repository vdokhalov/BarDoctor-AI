# Phase 3A.7 — RCA production smoke failures A / B

Дата: 2026-10-02. Результат: оба сбоя воспроизведены и являются APPLICATION BUG. Повреждения данных в проверенных сценариях нет. Исправления application code не выполнялись. **Phase 3A.7 — NOT COMPLETE. Production Sites v478 остаётся без изменения.**

## Exact source, границы и доказательства

- Production: Sites v478, commit `d5ebcc21f995972c55581c794d74925fd62b99ce`.
- Version: `appgprj_6a5734bb1abc81919ff978ed0020c64b~appgver_bcf43683266c8191b2cb8abc89ec1d85`.
- Deployment: `appgdep_6ac01a09175c8191ae327dad9496ef29`, succeeded. Provenance проверен read-only; deployment/configuration/resources не менялись.
- Native reproduction использует уже собранный exact release Worker из `/workspace/BarDoctor-phase3a7-release/dist/server/index.js` и isolated Miniflare/D1. Native outbound requests: **0**.
- Для production RCA создан новый synthetic owner и isolated venue **3337**, workspace **3211**, data account **78**: `ISOLATED QA Phase3A7 RCA v478 b41b4f0a7439b6`. Все production mutations этой проверки ограничены новыми QA scopes. Рабочие заведения, включая Köln, не использовались и не мутировались.
- Это новый захват того же бизнес-сценария на exact v478, с новыми IDs. Raw response исходного stopped smoke venue 3335 не был сохранён; приведённые далее IDs относятся к новой RCA-репродукции, а не к восстановленному исходному response.
- Предварительная попытка capture в новом QA venue 3336 остановилась на неверном диагностическом GET generic-store для opening stock (400, key не в allowlist). В успешной попытке opening прочитан через существующий `/api/inventory/opening`. Это ошибка диагностического скрипта, не причина A/B. Capture этой попытки сохранён отдельно.
- Между сравниваемыми evidence reads не было business writes. Снимки canonical stores, их timestamps, sales events, audit rows и auditTotal до/после идентичны.
- Исторический GAP audit и прежний stopped-smoke report не переписаны. Ни fix, ни commit/push, ни redeploy/rollback не выполнялись. Миграции и backfill не выполнялись.

Основные локальные artifacts (не содержат QA passwords/session credentials):

| Evidence | Artifact |
| --- | --- |
| Production requests, scope, summaries | [capture summary](../outputs/phase3a7-rca-production/summary.json) |
| Canonical facts и неизменность reads | [before](../outputs/phase3a7-rca-production/canonical-before.json), [after](../outputs/phase3a7-rca-production/canonical-after.json) |
| Evidence responses и resolved children | [reads](../outputs/phase3a7-rca-production/reads.json), [quantity relations](../outputs/phase3a7-rca-production/quantity-relations.json) |
| Exact existing quantity helper output | [quantity explanation](../outputs/phase3a7-rca-production/quantity-explanation.json) |
| Точное восстановление production hash | [hash result](../outputs/phase3a7-rca-hash/result.json), [first bytes](../outputs/phase3a7-rca-hash/first-canonical-bytes.txt), [second bytes](../outputs/phase3a7-rca-hash/second-canonical-bytes.txt) |
| Native exact Worker/D1 reproduction | [native result](../outputs/phase3a7-rca-native/result.json) |
| Analysis-only revision dependency controls | [14 controls](../outputs/phase3a7-rca-sensitivity/result.json) |

## A — STOCK EVIDENCE COMPLETENESS

### Какие факты созданы

В QA есть один активный настроенный склад `qa-bar`. У `qa-beer-stock` authoritative balance — общий остаток товара: без `warehouseId`, без `warehouseBalances`, unit `pcs`, `current=2`, текущая стоимость `80`, известная текущая цена `40 MDL/pcs`.

Подтверждены реальные purchase documents и строки:

| Purchase / effective date | Line | Source quantity / unit / price | Canonical quantity / normalized unit cost |
| --- | --- | --- | --- |
| `qa-price-x` / 2026-10-01 | `qa-x-beer` | 2 pcs × 20 MDL | 2 pcs; 20 MDL/pcs |
| `qa-price-x` / 2026-10-01 | `qa-x-liquid` | 1 box (3 l) × 60 MDL | 3 l; 20 MDL/l |
| `qa-price-y` / 2026-10-02 | `qa-y-beer` | 2 pcs × 40 MDL | 2 pcs; 40 MDL/pcs |
| `qa-price-y` / 2026-10-02 | `qa-y-liquid` | 2 bottles (0.5 l) × 20 MDL | 1 l; 40 MDL/l |
| `qa-price-y` / 2026-10-02 | `qa-y-zero` | 2 kg × 0 MDL | 2 kg; KNOWN_ZERO |
| `qa-backdated` / 2026-09-30 | `qa-back-liquid` | 1 l × 99 MDL | 1 l; backdated, не заменяет Y |

У Y есть собственный synthetic source file `924ef00e-1a64-4a5a-af2b-bad056cf8aed`; он не разделяется между разными invoices. Есть confirmed opening `qa-opening-b41b4f0a7439b6` для другого товара `qa-unknown-stock`: 10 kg без acquisition history. Его cost/valuation UNKNOWN/null корректны.

Создано **9 movements с 9 уникальными IDs**: шесть receipts указанных purchase lines, два beer sale consumptions и один opening_balance другого товара. Count с совпадающими expected/actual не создаёт ненужного adjustment movement. Retention cap/truncation в этом малом сценарии не достигнуты. Источники всех девяти фактов сохранены в canonical capture.

### Выбранный anchor и contributing operations

Выбран completed inventory/count document **`5dd74dec-0bd7-4023-b161-4ce6388c21f8`**, scope `all` («Весь активный склад»), line **`count-line-2`**, actual **2 pcs**. Anchor boundary: **2026-10-02T21:37:07.923Z**. `lastInventoryDocumentId` / quantity anchor в balance соответствуют этому документу. Opening другого товара не является anchor для beer.

Ниже createdAt — UTC 2026-10-02; порядок соответствует реальным canonical writes:

| Canonical fact | Movement ID | createdAt | Amount / warehouse | Ожидается в post-anchor evidence | Фактически |
| --- | --- | --- | --- | --- | --- |
| Receipt X / `qa-x-beer` | `64a775f4-ce3f-4e5b-a0cd-a3be60ce40d6` | 21:37:05.017Z | +2 pcs / absent | Нет: уже поглощён count | Исключён корректно |
| Completed count / `count-line-2` | document выше | 21:37:07.923Z | actual 2 pcs / global | Anchor | Anchor присутствует |
| Sale A / `qa-sale-a-line` | `3e18b265-69bb-4c3a-95fb-76db54b437f1` | 21:37:09.832Z | −1 pcs / `qa-bar` | Да | **Пропущен** |
| Receipt Y / `qa-y-beer` | `8fa7836c-643e-47a1-a6bd-c5dc470b7d1a` | 21:37:10.821Z | +2 pcs / absent | Да | Присутствует |
| Sale B / `qa-sale-b-line` | `b62d0905-c653-442b-9cbb-4a8fd64afe8c` | 21:37:11.904Z | −1 pcs / `qa-bar` | Да | **Пропущен** |

Sale A event: `sales-event:dab56cac51d5697bc2aecf1755f1ea780b73e0c84698257c2f5eb3f7d04f7b6e`.
Sale B event: `sales-event:f75fa77e210b904056b0f27a9f5b58e6895500ad119c209fb24e941be67bbca7`.
Sale A captured cost остаётся 20 после Y; новая B захватывает 40. Повторные commands не создают дополнительных receipts/consumptions.

Правильная цепочка объяснения общего остатка: **2 (anchor) − 1 (A) + 2 (Y) − 1 (B) = 2 pcs**, три contributing movements. Фактическая цепочка evidence: **2 + 2 = 4 pcs**, один contributor. Existing stock projection при этом правильно содержит **2 pcs**.

Ответ: `status=PARTIAL`, `consistency=MISMATCH`, `contributorCount=1`, `evidenceComplete=false`, diagnostic `STOCK_QUANTITY_READ_MODEL_MISMATCH`. В valuation значение **80 MDL = 2 × 40** правильно, но quantity evidence делает valuation evidenceComplete=false.

### Root cause в exact source

- [sales-consumption.ts](../lib/bardoctor/sales-consumption.ts), line 550: единственный configured warehouse выбирается для sale consumption как `qa-bar`; без настроенного склада fallback — `__venue__` (line 555).
- Тот же файл, lines 1174–1188 / 1299 / 1326: writer уменьшает общий `balance.current`; обновляет nested warehouse balances только если такая map уже есть; movement сохраняет выбранный `warehouseId`.
- [stock-quantity-evidence.ts](../lib/bardoctor/stock-quantity-evidence.ts), lines **17–20**: когда у общего balance нет warehouse и request без partId, `inWarehouse` принимает лишь untagged / `__venue__`. Два настоящих расхода `qa-bar`, уже учтённые в общем balance, теряются из proof.
- Тот же файл, lines 37–55: anchor cutoff работает правильно; mismatch вызван фильтрацией до него. `evidenceComplete=match` честно отражает неполное объяснение, но само объяснение сформировано неправильно.
- [stock-evidence.ts](../lib/bardoctor/stock-evidence.ts), lines 105–126: использует этот helper для quantity и valuation, поэтому дефект распространяется на обе evidence chains.

**Нет отсутствующего canonical факта или связи:** count, обе продажи, обе purchase lines и receipts доступны в own scope. Нужно перестать терять существующие post-anchor movements. `complete=true` после полного count-сценария — правильное ожидание теста. Это APPLICATION BUG в Phase 3A.7 proof, а не TEST BUG и не корректный EXPECTED PARTIAL.

Отдельные контрольные случаи до count (`NO_QUANTITY_ANCHOR`) и opening без purchase history действительно должны оставаться PARTIAL/UNKNOWN. Они не являются основанием считать этот post-count mismatch нормальным. Native exact Worker воспроизводит тот же результат: current 2, explained 4, один contributor.

### Минимальное исправление — только дизайн

Определять scope объяснения по grain существующего authoritative balance. Для общего balance учитывать own-scope движения этого продукта по всем складам, действительно входящие в общий остаток. Для explicit warehouse / partId / `__venue__` сохранять соответствующий ограниченный scope и подходящий anchor; не выдавать общий anchor или quantity за доказанный остаток отдельного склада.

Сохранить tenant/nested authorization, no pre-anchor double counting, same-time boundary identity, existing lifecycle/reversal/idempotency, bounded reads/pages/retention. Не менять stock writers и не вводить второй алгоритм authoritative stock/ledger. Код этого изменения в RCA не реализован.

### Verdict A

| Field | Verdict |
| --- | --- |
| ROOT CAUSE | Общий stock balance объясняется warehouse-фильтром, который исключает два реально учтённых named-warehouse расхода |
| APPLICATION BUG / TEST BUG / EXPECTED PARTIAL | **APPLICATION BUG** |
| DATA CORRUPTION | **NO** в воспроизведённом сценарии; canonical balance и факты правильны |
| FIX REQUIRED | **YES** |
| MIGRATION/BACKFILL REQUIRED | **NO / NO** |
| MINIMAL FIX | Согласовать scope contributors/anchor с grain authoritative balance, сохранив explicit warehouse boundaries |
| REGRESSION TESTS REQUIRED | Global balance + configured warehouse; полный count→sale→receipt→sale; explicit/mixed warehouse scopes; отсутствие pre-anchor double counting; настоящие PARTIAL/UNKNOWN; lifecycle/reversal/idempotency; bounded evidence; RBAC/read-only |

## B — FALSE READ_MODEL_CHANGED FOR STOCK_VALUATION

### Какие поля и bytes отличаются

На тех же неизменённых business facts выполнены два fresh reads и resolve с binding первого read. Fresh values/quantity/cost/child references не меняются. Bound read возвращает `READ_MODEL_CHANGED` / `NO_HISTORICAL_SNAPSHOT`.

| Read | asOf | STOCK_VALUATION revision |
| --- | --- | --- |
| Первый fresh | 2026-10-02T21:37:17.600Z | `sha256:b82a19d56bd5849891903e151e9d140a03f5a68cf69a010ef707ac569f8792ce` |
| Второй fresh | 2026-10-02T21:37:19.273Z | `sha256:4819fccd062af79e287ea0c1a141951e6a228d879dfc07f122cbd10a3681abb6` |
| Resolve первого binding | 2026-10-02T21:37:19.718Z | outcome `changed`, code `READ_MODEL_CHANGED` |

Оба hash inputs восстановлены из production capture через exact existing pure helpers и `evidenceContentRevision`; **оба hash точно совпадают с реальными server revisions**. Внутри canonical hash input меняется ровно одно поле:

`$.record.lines[0].costBasis.asOf`: `2026-10-02T21:37:17.600Z` → `2026-10-02T21:37:19.273Z`.

Оба UTF-8 canonical inputs имеют длину **6439 bytes**. Изменены четыре bytes (offsets отсчитываются от нуля):

| Byte offset | Первый decimal / character | Второй decimal / character |
| --- | --- | --- |
| 5185 | 55 / `7` | 57 / `9` |
| 5187 | 54 / `6` | 50 / `2` |
| 5188 | 48 / `0` | 55 / `7` |
| 5189 | 48 / `0` | 51 / `3` |

В response JSON отличаются только `$.asOf`, `$.evidence.reference.expectedRevision`, `$.evidence.revision`, `$.evidence.traceTarget.reference.expectedRevision`. Последние три — следствие изменения hash. Полный diff: [response-field-diff.json](../outputs/phase3a7-rca-production/response-field-diff.json).

`generatedAt` не участвует в этом hash. Canonical `createdAt`/`updatedAt`, audit и бизнес-значения не менялись. Их равенство доказано snapshots before/after; это не предположение по одинаковому числу в UI.

### Root cause в exact source

- [evidence-resolver.ts](../lib/bardoctor/evidence-resolver.ts), line **301**: создаёт per-request `new Date().toISOString()` как asOf.
- [cost-basis.ts](../lib/bardoctor/cost-basis.ts), line **111**: возвращает request asOf внутри CostBasisResolution.
- [valuation.ts](../lib/bardoctor/valuation.ts), line **175**: помещает полный basis в valuation line.
- [stock-evidence.ts](../lib/bardoctor/stock-evidence.ts), lines **125–126**: помещает полные `valuation.lines` в revisionInput без исключения derived request time.
- [evidence-contracts.ts](../lib/bardoctor/evidence-contracts.ts), lines **199–211**: hash канонического JSON включает это поле. Общая canonical hashing function работает согласно входу; дефект в выборе content для STOCK_VALUATION.
- [stock-evidence.ts](../lib/bardoctor/stock-evidence.ts), lines **94–98**: COST_BASIS уже исключает собственный derived asOf и включает acquisition document/line. Это существующий пример подходящего reuse, без нового source of truth.

Read-time asOf полезен как metadata ответа/свежести и параметр eligibility. Он **не должен сам по себе** менять identity/content revision неизменного текущего valuation. Реальное изменение выбранного receipt при смене business date должно менять revision через выбранный canonical cost basis, даже без записи в DB.

Удаление одного derived asOf только в analysis приводит к одинаковому hash обоих production reads (`sha256:9a9cc54a0b7ae1f04aba5d34a330558c909e95b2c7b3f84966fd1a2af5124d8b`). Это проверка причины, не application fix.

Native exact Worker/D1 с advancing clock воспроизводит false change без внешней сети: first/second fresh revisions различаются, bound read changed, canonical bytes/timestamps/audit неизменны. Значит проблема не зависит от production infrastructure и воспроизводится на exact v478 source.

### Почему нельзя ограничиться удалением asOf

Current STOCK_VALUATION revision не включает live content выбранного acquisition document/line. В isolated native D1 изменение только content выбранной purchase line делает bound COST_BASIS stale, но STOCK_VALUATION hash после analysis-only исключения времени остаётся прежним. Простое удаление времени оставило бы старый valuation binding актуальным после реального изменения source evidence.

Кроме того, A исключает named-warehouse movements и из quantity/valuation revisionInput. Поэтому корректный набор contributing dependencies требует исправления A.

Минимальный дизайн B: исключить именно derived `valuation.lines[*].costBasis.asOf` из valuation content revision (сохранить metadata в response); включить авторизованную revision/content выбранных actual purchase document/line через существующий `readReceiptAcquisition` / COST_BASIS contract; сохранить selected receipt, units/currency/effective dates, authoritative balance, корректный quantity anchor и все contributing movements. При нескольких действительных cost bases dependencies должны покрывать каждый basis соответствующего declared scope.

Не менять global hashing function и не удалять все timestamps рекурсивно: canonical createdAt/updatedAt/effective dates принадлежат фактам и остаются в revision. Не игнорировать expectedRevision, не создавать snapshots/ledger/migration.

### Проверка stale-binding защиты предлагаемого механизма

На captured own-scope production facts выполнены **14 analysis-only dependency controls**. Это проверка предлагаемого состава revision в локальной памяти, не реализация fix и не доказательство будущего end-to-end resolver после fix.

| Изменение | Ожидается / фактически в candidate revision |
| --- | --- |
| Только request time | Same / same |
| Selected purchase document content | Changed / changed |
| Selected purchase line content | Changed / changed |
| Canonical stock quantity | Changed / changed |
| Amount named-warehouse contributing movement | Changed / changed |
| Lifecycle / reversedAt этого movement | Changed / changed |
| Count anchor content / actual | Changed / changed |
| Anchor identity | Changed / changed |
| Selected receipt captured cost | Changed / changed |
| Selected receipt identity при той же цене | Changed / changed |
| Selected receipt исчез; выбирается старый применимый | Changed / changed |
| Canonical record updatedAt | Changed / changed |
| Unrelated other-product movement | Same / same |
| Следующий business date реально меняет applicable receipt | Changed / changed |

Отдельно native accepted purchase writer Z подтверждает реальное изменение basis/остатка: quantity **2→4**, price **40→50**, valuation **80→200**, selected document **Y→Z**. Эти значения должны инвалидировать прежний binding независимо от clock.

После будущего implementation нужны handler-level bound-read tests всех реальных changes. Offline controls не заменяют эту регрессию и не позволяют объявить Phase 3A.7 COMPLETE.

### Verdict B

| Field | Verdict |
| --- | --- |
| ROOT CAUSE | Per-request `lines[0].costBasis.asOf` включён в canonical STOCK_VALUATION hash |
| APPLICATION BUG / TEST BUG / EXPECTED PARTIAL | **APPLICATION BUG** |
| DATA CORRUPTION | **NO** в проверенном сценарии; false read identity change без изменения canonical data |
| FIX REQUIRED | **YES** |
| MIGRATION/BACKFILL REQUIRED | **NO / NO** |
| MINIMAL FIX | Убрать только derived request-time поле из valuation revision; включить actual selected acquisition content/revision и правильные quantity dependencies; сохранить expectedRevision guard |
| REGRESSION TESTS REQUIRED | Advancing-clock unchanged bound reads; real purchase/doc/line/balance/movement/anchor/basis changes; equal-price source identity changes; date eligibility; canonical timestamps; nested RBAC; read-only; existing cost/revenue/menu chains |

## Почему прежняя QA не обнаружила эти причины

`tests/helpers/stock-runtime.ts` использует fixed `options.now`; [lifecycle-runtime.ts](../tests/helpers/lifecycle-runtime.ts), lines 61–63, фиксирует Date, а [acquisition-stock-phase3a7-browser.ts](../scripts/acquisition-stock-phase3a7-browser.ts), lines 12–14, использует fixedTime. При frozen clock volatile asOf одинаков — B маскируется. Нужно проверить как fixed/same-time boundary, так и advancing real clock.

Предыдущая local fixture без configured warehouses получает sale warehouse `__venue__`; flawed A filter принимает такие движения. В fresh production QA и exact native reproduction один configured warehouse `qa-bar` делает оба sales movements tagged; они теряются. Production smoke не нужно ослаблять до ожидания false.

## Required regression перед любым будущим release

1. A: count 2 → sale −1 → receipt +2 → sale −1; global current/explanation 2, три post-anchor contributors, pre-anchor receipt не повторяется, valuation 80 с complete evidence. Контроли без named warehouse и с одним/несколькими configured warehouses; explicit warehouse proof не подменяется aggregate proof.
2. Quantity: opening/count/adjustment/receipt/sale/write-off/return/reversal, repeated command, same-time boundary, отсутствующий anchor и incompatible/legacy facts; сохраняются честные PARTIAL/UNKNOWN, KNOWN_ZERO и bounded evidence.
3. B: два unchanged fresh reads и старый bound resolve с advancing clock сохраняют revision; изменение purchase document/line, quantity, contributing movement/lifecycle, quantity anchor, cost basis и source identity возвращает READ_MODEL_CHANGED. Новая закупка не пересчитывает captured historical sale cost.
4. Смена effective business date с действительно новым applicable receipt инвалидирует binding; unrelated product change его не инвалидирует; canonical updatedAt не удаляется как volatile metadata.
5. Каждый nested reference повторно авторизуется: owner/permitted/restricted/revoked, foreign venue/workspace/dataAccount, guessed warehouse/purchase/line/movement/source-file IDs; no parent-derived permission. Capture before/after с audit/timestamps подтверждает read-only.
6. Existing Phase 3A.1–3A.6 evidence/security/CAS/writer regressions и Phase 3A.7 retention/procurement tests; native exact Worker/D1, full required regression и 390/820/1280 Chromium/WebKit acceptance перед release. Эти suites в RCA заново целиком не запускались: code fix отсутствует.

RCA verification: production capture + точное совпадение двух server hashes; **3 native RCA cases**, outbound 0; **14/14 offline dependency controls**. Это доказательства причины и минимального дизайна, а не GREEN implementation/release.

## Статус после RCA

Production **v478 unchanged**. Application code не изменён; новая работа — локальные диагностические artifacts и этот RCA report. No commit/push/redeploy/rollback; no migration/backfill/destructive operation; production business mutations только в новых isolated QA venues.

Phase 3A.7 **NOT COMPLETE**. G08/G15/G17 не объявляются CLOSED. Остаются **10 GAP**: G05, G06, G07, G08, G12, G13, G15, G16, G17, G18. Phase 3A.8 не начата. PRIMARY D1 FAILURE ROOT CAUSE остаётся **UNKNOWN — NOT REPRODUCED**; эти read-contract дефекты не доказывают причину иной D1 infrastructure failure.

По существу: остаток и цена в этом сценарии правильны, но объяснение остатка теряет две продажи, а повторное чтение ошибочно выглядит как изменение оценки. Для исправления нужны два небольших изменения чтения и доказательства происхождения; новые таблицы, пересчёт старой истории и изменение LAST PURCHASE PRICE не требуются. Реализация ожидает отдельного указания владельца.

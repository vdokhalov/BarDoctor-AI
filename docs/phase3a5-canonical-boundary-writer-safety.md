# Phase 3A.5 — Canonical Boundary & Writer Safety

Дата: 2026-10-02. Production baseline: Sites **v474**, commit **efdbae969272d72da6843a7cfbd193d872bfb0c4**.

Основание: [независимый GAP audit](phase3a-gap-audit.md). Аудит сохранён как исторический документ exact baseline; его severity/counts не переписаны под remediation.

Статус этого документа: implementation и локальная QA. Release допускается только после GREEN required GitHub CI на exact HEAD и проверки `Sites source.commit_sha`. Production deployment и production smoke требуют отдельного подтверждения владельца; до PASS Phase 3A.5 не COMPLETE.

## 1. Независимое подтверждение GAP

Каждый GAP перепроверен непосредственно на exact baseline source, до внесения исправлений. Расхождений с аудитом для G01/G02/G09/G10/G11 не обнаружено.

| GAP | Baseline root cause | Исправление |
| --- | --- | --- |
| G01 — P0 | Health проверяет только `analysis.run`, recommendation-check только `tasks.view`; общий AI loader читает все domain stores account без source read policy. Сохранённый diagnosis может вернуть ранее рассчитанные закрытые показатели. | Source permission проверяется до domain hydration/provider call; смешанный metric не возвращается при недоступности любой зависимости; сохранённый diagnosis и клиентский cache не обходят ограничение. |
| G02 — P0 | Индекс `existing.filter(externalId).map(...)` используется как индекс полного canonical array. `[manual, google]` приводит к замене manual ID содержимым Google. | Индекс строится по полному canonical array. Совпадение должно быть однозначным; conflicting duplicate external identity отклоняется. |
| G09 — P1 | Несколько server/domain writers выполняют unconditional UPSERT всего JSON store после чтения; существующий generic store CAS не защищает от этих sibling writers. | Writers используют существующие `readStoreSnapshots` / `runStoreCasBatch`; guard относится к тем же прочитанным JSON bytes + revision. Domain writes и существующий audit входят в одну D1 transaction. |
| G10 — P1 | Work order cost и linked Finance expense могут изменяться независимо: optional `syncExpense`, generic financial/work-order writes. | Стабильный существующий expense ID сохраняется. Изменение связанной суммы/даты проводится совместно; независимое изменение или уже противоречивое состояние получает conflict без изменения пользовательской суммы. |
| G11 — P1 | Google reviews сохраняют provider-only metadata; новая selected location может изменить смысл retained history/aggregate. In-flight sync обновляет текущую connection по account. | Review origin сохраняет Google account/location, участвовавшие в fetch; external identity включает эту пару; current aggregates выбирают ту же population. Connection checkpoint/token/error изменяются только для captured connection/location. |

## 2. Source boundary

[venue-context-access.ts](../lib/bardoctor/venue-context-access.ts) перечисляет зависимости уже существующих context blocks и использует существующие permissions из `data-trust`/RBAC. Новые продуктовые permissions или расширение доступа aggregator не добавлены.

- `loadVenueAIContext` ограничивает SQL по authenticated dataAccount и разрешённым store keys **до** hydration. Restricted block атомарно заменяется: `available=false`, `updatedAt=null`, `freshness=missing`, `data.availability=RESTRICTED`; запрещённый store не влияет на раскрываемый metric, timestamp или prompt.
- Health, Doctor и recommendation-check сохраняют свой feature permission и дополнительно проверяют underlying sources. Их существующие смешанные score/recommendation contracts отклоняют запрос с HTTP 403 / `RESTRICTED`, вместо расчёта из скрытой неполной выборки. Общий context loader допускает разрешённые blocks рядом с restricted blocks.
- Doctor memory проверяет `tasks.view`; внешний reviews/market loader проверяет соответствующие source permissions. Denied reviews имеют `RESTRICTED` и null numeric counts, не ложные нули. Google sync не запускается при denied reviews source.
- Diagnosis v3–v9 нельзя прочитать через single-store endpoint или bootstrap без source permissions и доступа к memory. Client при 401/403 инвалидирует текущий analysis context; in-flight отказ venue A не очищает cache venue B. Network/5xx не приравнивается к permission denial.
- Existing Evidence Resolver и его nested source authorization не переписаны. Regression покрывает foreign venue/workspace/dataAccount, guessed IDs, nested references, source denies и revoked membership. Авторизация не выводится из parent fact.

## 3. Canonical writer inventory и concurrency contract

Используется неизменённый [store-cas.ts](../lib/bardoctor/store-cas.ts), без нового generic persistence framework, schema changes или migration.

| Shared canonical store/business truth | Writers в remediation | Guard/read dependencies |
| --- | --- | --- |
| Expenses | standalone expense create; purchase payment/reverse/delete; Equipment work order; integration writeoff/return; existing generic store | Expense store и прочитанные purchase/work-order/month-lock/stock dependencies; existing generic store CAS сохранён |
| Purchases | payment, reverse, delete; existing confirm/cancel/update/repost | Purchase + expenses + month locks, delete также stock movements; ранее guarded lifecycle сохранён |
| Assortment/nomenclature/recipes | inventory product commands, taxonomy, bulk classification, purchase mappings; integration product/recipe/warehouse commands; existing menu/purchase writers | Все stores, прочитанные соответствующим command; taxonomy existing expectedUpdatedAt также сохранён |
| Suppliers/employees | integration single/batch writers; purchase mappings; existing generic store | Исходный supplier/employee store и canonical dependencies; batch не смешивает tenants |
| Stock balances/movements/snapshots/writeoffs/returns | integration domain writer; existing inventory/sales/purchase lifecycle | Все прочитанные multi-store inputs; atomic rollback при stale snapshot |
| Reviews | manual create, file import, Google sync, review analysis, existing generic store | Exact review snapshot. Merge + existing mutation audit atomic; analysis использует тот же guard |
| Equipment/history/work orders | work-order command и existing generic store | Equipment, history, orders, expenses, month locks, employees; linked generic edits/delete запрещены |
| Market analysis | refresh, location/confirmation/delete actions, existing generic store | Market snapshot до чтения/AI work |
| Supplier alternatives | refresh и decision/delete actions, existing generic store | Alternatives snapshot до расчёта/AI work |
| Opportunity calendar | baseline GET persistence, refresh, decisions/delete, notification reconciliation, existing generic store | Calendar snapshot; notification reconciliation использует revision исходной выборки |
| First-use legacy import | existing import writer | `ON CONFLICT DO NOTHING`: accepted local canonical store не заменяется legacy copy; count учитывает только реально вставленные stores |

Полный record/domain command выполняется один раз: stale read → concurrent accepted B → write A даёт HTTP 409 `STORE_WRITE_CONFLICT` / explicit integration conflict; **B сохраняется**, audit A не подтверждается. Standalone additive expense create может повторить существующий command до трёх раз: заново читает state, сохраняет B, создаёт A один раз по existing idempotency. AI/provider operation не повторяется автоматически ради CAS.

Guard использует исходный snapshot, а не revision, прочитанную после подготовки stale payload. Для нескольких stores guard и mutations выполняются одной native D1 batch transaction. Известные уже guarded Phase 3A.1–3A.4 paths не переписаны. Provider fetches/notification scheduling не превращены в новую distributed transaction; успешный canonical write не объявляется при rejected guard.

## 4. Equipment → Finance

Существующий `equipmentExpenseId(workOrderId)` остаётся stable identity. Созданные work orders/expenses получают current venue ID. Foreign/guessed equipment/order не принимаются.

Create создаёт один linked expense. Repeat сохраняет этот ID, update с `syncExpense=true` совместно изменяет order и expense. Изменение связанной cost/date без sync отклоняется. Existing link, equipment/order IDs, amount/date сверяются перед записью; legacy divergence получает `LINKED_EXPENSE_CONFLICT`, без автоматической финансовой корректировки.

Standalone expense API не принимает forged Equipment origin. Generic store API не позволяет независимо изменить/удалить linked expense или linked order. Dedicated Equipment cancel/delete lifecycle в baseline отсутствует; новый не добавлен. Existing workflow statuses сохранены. Concurrent Finance или work-order update вызывает conflict вместо потери B.

## 5. Google review source identity

Новые synced rows связываются с captured Google account/location + venue + external ID. Existing canonical IDs/createdAt сохраняются при однозначном update. Неизменённая resync не переписывает canonical bytes/timestamp/AI annotation; изменённый текст сбрасывает прежнюю annotation по existing behavior.

Home metrics, Reviews summary и AI/current context используют выбранную provider location; исторические canonical rows сохраняются в Reviews list вместе с origin metadata. После A → B старые A rows не становятся B. In-flight A sync может сохранить bound A history, но не обновляет checkpoint/token/error B.

Legacy rows без location не получают выдуманную привязку к текущей connection. Ambiguous collision отклоняет sync с `GOOGLE_REVIEW_SOURCE_NEEDS_REVIEW`, без частичной canonical записи, дубля или relabel/backfill. Unknown origin исключён из current selected-location Google aggregates; исходная запись сохранена. Conflicting duplicate input IDs отклоняются независимо от ordering; existing duplicate canonical IDs не выбираются произвольно.

## 6. QA evidence

Все проверки используют local isolated SQLite/native D1/QA browser fixtures. Рабочие venues и реальный GBP не используются для mutations.

| Проверка | Результат |
| --- | --- |
| New server regressions: source boundary 4 + review model 6 + competing writers 26 + actual Google sync fixture 3 | **39 PASS**; те же 39 проверок на отдельной копии exact baseline дают **39 FAIL** |
| Existing Evidence Resolver / Revenue / Cost & Warehouse / Menu Origin actual-handler security/read-only regressions | **48 PASS** |
| Full `npm test`, включая audit gates, typecheck и verified build | **2 010 PASS**, 0 failures |
| Lint | PASS, 0 errors; 2 существующих unrelated warnings (`koln-assortment` import, warehouse-v399 cssPath) |
| Client source-denial cache regressions | **2 PASS**, включены в full artifact suite |
| Full declared test/build artifact preparation twice | **5 PASS**, byte-stable release и guard сохранён; старые scripts получают исходные anchors через reversible preparation stage |
| Native compiled Worker/D1: foundation + Phase 3A.5 | **2 PASS**; stale snapshots пяти stores отвергнуты транзакционно, B/audit сохранены |
| Phase 3A.5 browser HTTP → actual compiled Worker/native D1, 390px и 1280px | PASS: source permissions, mixed reviews, Equipment Finance, foreign venue; external calls **0** |
| Evidence / Revenue, Cost & Warehouse, Menu Origin browser, 390px и 1280px | PASS, tenant/RBAC и read-only сохраняются |
| Actual compiled client release browser | PASS |
| Existing mobile/desktop navigation и Home/Reviews viewport QA | PASS, 0 failures; Finance, Menu, Equipment, Integrations и related embedded modules сохранены |
| Operational Day actual-handler browser, mobile и desktop | PASS: operations saved, finality, Finance и Warehouse |

New tests находятся в `tests/*phase3a5*`; native runtime — `tests/helpers/native-worker-runtime.mjs`; browser — `scripts/canonical-boundary-browser-phase3a5.mjs`. Full required CI дополнительно проверяет operational cached/overnight/year boundary, Chromium/WebKit navigation/scroll, Home/Reviews, Equipment/Integrations navigation и остальные existing domain browser suites.

Existing source-shape tests адаптированы к transactional writer calls вместо unconditional UPSERT literals; проверки tenant binding, validation-before-write и canonical behavior сохранены. Build assertion проверяет все emitted Worker modules, поскольку компилятор вынес schema в chunk. Repeated preparation test выполняет новый scoped restore stage и проверяет сохранность security guard. Assertions не ослаблены.

PRIMARY D1 FAILURE ROOT CAUSE: **UNKNOWN — NOT REPRODUCED**. Изолированно вызванный expected CAS rejection не является воспроизведением этого incident.

## 7. Data safety и release gate

Migrations/backfill: **NO**. Production business data mutations: **NO**. Database reset/recreation, secrets changes, production resources deletion: **NO**. Google production resync: **NO**. UX/UI redesign, новый Health/Doctor, новые product features или parallel source of truth: **NO**.

Изменённые файлы сгруппированы выше; exact перечень содержится в release commit diff. Historical GAP audit также включён в repository, поскольку был локальным untracked результатом предыдущей задачи. Это не изменение baseline audit conclusions.

Перед deployment обязательны: final diff/manual review, GitHub commit/push, все required CI GREEN для того же SHA, сохранённая Sites version с тем же `source.commit_sha`, затем **одно** подтверждение production deployment. Production остаётся v474 до этого подтверждения. Phase 3A.5 COMPLETE только после isolated QA venue production smoke PASS; при confirmed critical regression — STOP, без автоматического исправления/redeploy/rollback.

## 8. Остаток независимого аудита

Для подготовленной remediation архитектуры: **P0=0, P1=8, P2=5, P3=0**. Для неизменённого production v474 исходные audit counts остаются P0=2/P1=11/P2=5/P3=0 до deployment и подтверждённого smoke.

- P1: **G03** business-day/finality projection; **G04** Finance/report lifecycle consistency; **G05** authoritative AI inputs/metric→fact provenance; **G06** missing canonical operational inputs in Health; **G07** coherent closed-result evidence; **G08** acquisition/stock quantity/valuation evidence; **G12** review null/denominator semantics; **G13** native POS/item analytics/current receipt input coverage.
- P2: **G14** payroll recorded/current-rule basis; **G15** acquisition evidence retention; **G16** market/calendar external provenance; **G17** procurement summary price/unit identity; **G18** integration result→fact revision binding.

G11 selected provider population исправлена, но G12 `Number(null)` и различие review aggregate semantics не объявлены исправленными. CAS интеграции исправлен, но G18 resolver provenance не добавлен. Revenue/Cost/Menu evidence chains остаются доказанными; они не объявляют доказанными остальные Health/AI metrics. Следующий remediation этап автоматически не начинается.

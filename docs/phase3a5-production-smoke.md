# Phase 3A.5 — Production Deployment & Smoke

Дата: 2026-10-02 (UTC). Статус: **DEPLOYED; production smoke NOT PASS; Phase 3A.5 NOT COMPLETE**.

## Deployment

Выполнено явное подтверждение владельца deployment Sites v475. Deployment **SUCCEEDED**; повторный readback подтвердил saved version и source commit.

- Production: https://bardoctor-preview.v-dokhalov.chatgpt.site
- Sites version: **475**.
- Exact source/GitHub HEAD: **1d4ff726b1f0ced541c6f35fd5aec3abb120126b**.
- Saved version ID: `appgprj_6a5734bb1abc81919ff978ed0020c64b~appgver_244d1e215f6c81919ab2b7e9ec816cd1`.
- Deployment ID: `appgdep_6abfa6ba19448191b611741905c84f0b`.
- Environment set revision: **14**, без изменения secrets.
- Required CI: [37005654691](https://github.com/vdokhalov/BarDoctor-AI/actions/runs/37005654691), verify / sales-navigation / sales-scroll-layout GREEN для этого exact SHA.
- Production asset `assets/index-BQGspy0I.js` совпадает с подготовленным dist/client: SHA-256 `85c5ba099a7ee09d017b19dc0445f2d74d1ab5cb0dd1b2d56bdaec5ced0097c4`; marker Phase 3A.5 присутствует.

После deployment application code не изменялся. Второго deployment, rollback, commit или push не было. Этот отчёт — локальный uncommitted документ.

## Isolation и data safety

Создан новый QA owner, **venue 3325 / workspace 3200**, название `ISOLATED QA Phase 3A.5 v475 bab44946861871`. В него приглашён отдельный QA manager. Все тестовые business mutations ограничены этим новым venue; registration/access/session changes относятся только к этим QA identities. Рабочие заведения, включая Кёльн, не использовались.

- Production business mutations: **YES — только новые synthetic QA данные**.
- Working venue data mutations: **NO**.
- Migrations / backfill / reset / production resource deletion: **NO**.
- Secrets changes: **NO**.
- Real GBP/POS calls, real Google sync, provider mutations: **NO**.

## Проверки, которые прошли

| Контур | Production evidence |
| --- | --- |
| Source permissions | Owner Health 200; manager с разрешёнными underlying sources Health 200. Finance / Payroll / Reviews / Inventory denial по отдельности блокирует Health, AI diagnosis и recommendation-check: 403, RESTRICTED, без payload запрещённых sources. Saved diagnosis и bootstrap stores также закрыты. |
| Tenant/RBAC | Revoked membership: 401; guessed foreign venue: 401; foreign venue/workspace evidence refs: EVIDENCE_UNAVAILABLE без evidence. Allowed sale-cost parent не раскрывает inventory child refs; прямой warehouse child для denied inventory: ACCESS_DENIED. Реальные foreign workspace/dataAccount scenarios ранее покрыты isolated local/native regressions; production smoke не читал рабочие foreign tenants. |
| Google/manual merge | Mixed canonical ordering manual → Google → manual → Google; изменённые/неизменённые external rows, reversed update order, повторные updates, duplicate incoming external ID сохраняют соответствующие Google IDs и точные manual canonical записи. |
| Provider/location identity | Synthetic A/B с одинаковым external review ID остаются отдельными origin identities. A не становится B. Проверено через existing canonical merge API; live selected-location switch, checkpoint и in-flight sync покрыты локальными/native tests, в production реальный GBP не подключался. |
| Equipment → Finance | Create / repeat / synced update сохраняют один stable linked expense. Unsynced cost update и independent linked expense amount overwrite: 409 USE_EQUIPMENT_WORK_ORDER_API; сумма не изменена молча. |
| Stale writer | Read A → accepted expense B → stale generic write A с baseData: B сохраняется, ответ A 200 после semantic merge. |
| Concurrent expenses / Equipment | Статусы 201,201,201,409,201,201,200. Все принятые expense IDs сохранены; linked order cost = expense amount; 409 STORE_WRITE_CONFLICT явно отклоняет stale transaction. |
| Concurrent reviews | Статусы 201,409,409,409,201; все принятые новые reviews и исходные mixed IDs сохранены; conflicts явные. |
| Purchase payments | Canonical confirmed purchase; payment / standalone expense concurrency и idempotent repeats сохраняют принятые records и Equipment expense. |
| Integration domain writer | Только synthetic file imports, без integration token/secrets changes. Параллельные supplier imports: два accepted success, один failed run с явным STORE_WRITE_CONFLICT; ранее существующий supplier и accepted imported suppliers сохранены. Repeat import не дублирует canonical IDs. |
| Inventory/products | Несхожие product names; статусы 200,200,409 STORE_WRITE_CONFLICT. Принятые products и existing menu/recipe сохранены. Existing PRODUCT_SIMILAR guard отдельно наблюдался на слишком похожих fixture names; он не объявлен concurrency regression. |
| Revenue Trace | DAILY_REVENUE → FINANCE_REVENUE → CASH_SHIFT → SALE_EVENT: **30 MDL**; PROVISIONAL → FINAL при close_shift с той же суммой; old revision → READ_MODEL_CHANGED. |
| Cost / Warehouse Trace | Продажа 2 × QA Coffee; canonical purchase 1 kg / 100 MDL; captured cost **1.60 MDL**, KNOWN. CAPTURED_COST → CAPTURED_RECIPE / CAPTURED_INGREDIENT → MENU_RECIPE / NOMENCLATURE → WAREHOUSE_MOVEMENT. |
| Menu / Ingestion Trace | MANUAL create → reviewed update → validate → confirm → canonical menu → recipe; repeat confirm idempotent. MENU_ORIGIN / CONFIRMATION / REVIEWED_INPUT / SOURCE / INGESTION_DRAFT / MENU_RECIPE разрешаются. |
| Read-only evidence | Полный обход с page limit=2: revenue trace 18 records, cost trace 14, menu trace 8; Cache-Control private,no-store. Canonical entries и updatedAt до/после всех evidence reads совпадают. |
| Owner UI | Обычный login; desktop 1280 и mobile 390: Home/root reload, Finance, Equipment, Reviews, Integrations, Sales journal, Cashier, Shifts, Warehouse, Menu. Нет JavaScript errors / HTTP 5xx в принятом owner smoke; document scrollWidth = viewport width. Screenshots просмотрены. |

Границы proof: production parallel requests не инжектировали pause внутрь server transaction. Детерминированный read A → commit B → write A для каждого competing writer уже покрыт 39 local regressions, падающими на baseline; production подтверждает реальный explicit conflict и сохранение accepted records. Все integration entity types не импортировались повторно в production: использован supplier представитель общего writer, остальные покрыты native/local tests.

## Acceptance blocker: manager Finance warm-read

**Production smoke в целом НЕ PASS. Assertions не ослаблены.** Extended restricted-manager UI smoke воспроизводимо падает на проверке отсутствия unhandled browser errors:

```
GET /api/store/bd_finance_expenses failed
```

Воспроизведение через обычный product flow, без пересадки локального auth state:

1. Owner login в QA venue; Home и профиль загружаются.
2. «Выйти из аккаунта»: `/api/auth/logout` 200.
3. Manager login: `/api/auth/login` 200; membership активен, venue тот же QA.
4. `/api/business-health` 403, `/api/store/bd_finance_expenses` 403, `/api/store/bd_assortment_v1` 403, `/api/reviews/home` 403 — source boundaries соблюдаются.
5. Client Finance warm-read превращает ожидаемый denied response в unhandled error; `assert.deepEqual(pageErrors, [])` FAIL.

Это **не признано flaky**. Repeated seeded-cache probe и затем обычный logout/login воспроизвели тот же diagnostic. Никаких HTTP 5xx, foreign data или утечки запретённых expense/payroll/review/inventory payload не найдено. Allowed revenue 30 MDL остаётся видимым: существующее permission для `bd_finance_revenue` — `shifts.view`, которым manager обладает; это не обход `finance.view` для expenses.

Дополнительно Home показывает «Результат до себестоимости» 30 MDL при недоступных expenses/payroll вместо честного неизвестного полного результата. Запрещённые суммы не раскрыты, но надёжность этой derived financial presentation ограничена. Это соответствует ранее оставленным gaps финансовых read models; не объявлено новым завершённым Health/AI контрактом.

### Source evidence и предел root cause

В `public/assets/index-BQGspy0I.js` у exact **v474** и **v475** побайтно одинаковы:

```js
async function Yse(e,t){
  const r=await(await fetch(`${EC}/${e}`,{headers:ca(t)})).json();
  if(!r.ok)throw new Error(`GET /api/store/${e} failed`);
  return r.data??void 0;
}
```

Также одинаков `bdWarmCriticalHomeV349`, который создаёт `window.__bdStartupFinanceWarmV349 = Promise.all(...)` для revenue/expenses/gap_reasons. Denied expenses response rejects warm promise; наблюдается unhandled rejection в browser. Existing server read policy для expenses — `finance.view`, revenue — `shifts.view` в `lib/bardoctor/data-trust.ts`.

Доказано наличие соответствующего client path уже в baseline source; production v474 заново не разворачивался. Поэтому **новая critical regression, внесённая commit v475, не доказана**. Однако реальный browser failure остаётся acceptance blocker: overall PASS и COMPLETE не заявлены.

При обнаружении blocker тестовые acceptance действия остановлены. Ничего не исправлялось автоматически в production, не было повторного deployment или rollback.

## Test harness corrections

Ошибки QA inputs исправлялись только в временных smoke scripts, без изменения приложения и без ослабления продуктовых assertions:

- raw review fixture нормализуется existing canonical loader; итоговая проверка использовала canonical manual records, созданные существующим API, и проверяла их полное сохранение;
- purchase confirmation требует active supplier: создан synthetic supplier только в QA;
- contract kind — NOMENCLATURE, не выдуманный NOMENCLATURE_ITEM;
- после close_shift old bindings изменяются; nested permission проверяется fresh bound owner child, а permitted parent — fresh manager-bound ref;
- первые test-forced gotos обрывали ещё выполняющиеся API hydration requests. Принятый mobile expanded smoke ждёт завершения API reads перед document navigation и затем проверяет реальные готовые экраны; ранний timeout не назван flaky;
- injected-localStorage cold-root probe не использован вместо штатного login. Штатный owner login и root reload прошли на desktop/mobile.

Failed diagnostics сохранены отдельно, не удалены и не переименованы в PASS.

## Artifacts

- `outputs/phase3a5-production/summary.json`: честный общий NOT_PASS.
- `outputs/phase3a5-production/api-smoke.json`: 21 passed domain checks и request status evidence.
- `outputs/phase3a5-production/browser-smoke.json`: desktop owner expanded routes.
- `outputs/phase3a5-production/mobile-final-smoke.json`: mobile owner expanded routes.
- `outputs/phase3a5-production/integration-run-evidence.json`: explicit failed run conflict и accepted counters.
- `outputs/phase3a5-production/manager-standard-flow-network.json`: обычный logout/login → denied sources → browser error.
- `outputs/phase3a5-production/manager-standard-flow-failure.png` и `...-dom.json`: failing manager surface.
- `outputs/phase3a5-release-evidence.json`: deployment SUCCEEDED, production smoke NOT_PASS.

Credentials не включены в эти evidence files или отчёт.

## Completion decision и оставшиеся gaps

G01/G02/G09/G10/G11 independently confirmed и source remediation находятся в v475; их server/domain smoke выше PASS. **Phase 3A.5 НЕ COMPLETE**, потому что overall production smoke не PASS. Исторический независимый audit не переписан.

Оставшиеся исходные gaps: P1 — G03/G04/G05/G06/G07/G08/G12/G13; P2 — G14/G15/G16/G17/G18. Source remediation counts из predeployment report — P0=0/P1=8/P2=5/P3=0 — не означают сертифицированный COMPLETE при текущем blocker.

**PRIMARY D1 FAILURE ROOT CAUSE: UNKNOWN — NOT REPRODUCED.** В smoke нет воспроизведения этого incident. CAS conflicts ожидаемы и не подменяют неизвестную причину D1 incident; текущий acceptance blocker относится к client handling ожидаемого RBAC denial.

Следующий phase не начат. Автоматического remediation/deployment/rollback после production smoke не было.

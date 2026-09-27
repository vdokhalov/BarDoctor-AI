# SALES REAL iPHONE NAVIGATION PERFORMANCE

Baseline: production v460, `4b65a6866ad912581e6d1c507eff6ab5731b0072`.
Production не менялся. Все операции выполнялись на изолированной SQLite через реальные handlers.

## Подтверждённые причины и изменения

1. При переходе к Cashier/Manual/Cash Shifts прежний iframe bridge передавал управление через top-level document navigation. Возврат в журнал заново загружал React shell, auth/bootstrap, account/venue/domain context и сам Sales iframe. В измеренных возвратах было 12–13 API-запросов вместо двух необходимых Sales read models.
2. Журнал последовательно читал sales-batches и sales-events. Экран смен последовательно читал те же независимые read models в обратном порядке. Теперь запросы запускаются параллельно; серверные модели, проверки идентичности и обработка ошибок сохранены.
3. Начальная загрузка Cashier/Manual/Shifts использовала общий текст «Выполняем действие…». Теперь он остаётся для реальных операций, а startup сообщает, какой раздел загружается. «Проверка соединения…» в кассе заменена на «Загрузка данных…»: она ожидала один sales-events GET с меню, сменами, timezone и permissions, а не отдельную проверку сети.
4. Cashier и Manual/Shifts подключены к существующему защищённому SPA router. Меняется только дочерний документ, оболочка сохраняется. Query-only переход «Смены → Ручной ввод» подписан на search hook; в ходе regression исправлено сохранение прежнего экрана при смене только query.

Новая система продаж или авторизации не создавалась. Нет изменений posting, payment, Finance, Warehouse, cost, draft, retry/idempotency, one-open-shift, timezone или business-date semantics. API-контракты, DB schema и migrations не менялись.

## Что не воспроизведено и границы evidence

Мёртвые taps, неверный destination и дублирующиеся переходы в проверенных сценариях не воспроизведены. Ранние ошибки document.body в WebKit были в QA probe, который запускается до создания body; probe исправлен и прогон повторён. Это не production defect.

Запись физического iPhone не была доступна среди вложений этой задачи. Поэтому нельзя приписать измеренные причины каждому эпизоду пользовательского видео. WebKit 26.0 проверен локально; Windows Playwright WebKit не равен Safari на физическом iPhone.

## До / после: latency 300 ms

Единица — ms от pointer до первого пригодного для работы состояния. Это отдельные QA-наблюдения, не SLA и не статистический benchmark. Вход в кассу не получил устойчивого ускорения: необходимый один API-запрос сохранён.

| Переход | Chromium до | после | WebKit до | после |
|---|---:|---:|---:|---:|
| Продажи → Касса | 1136 | 1250 | 1253 | 1244 |
| Касса → Журнал | 2382 | 871 | 2989 | 1517 |
| Журнал → Касса | 755 | 1183 | 861 | 823 |
| Журнал → Смены | 1454 | 1276 | 1557 | 1453 |
| Смены → Журнал | 1830 | 815 | 2980 | 968 |
| Ручной ввод: открытие | 741 | 797 | 965 | 893 |
| Ручной ввод → Журнал | 1648 | 931 | 2878 | 1046 |
| Продолжить заказ | 820 | 803 | 843 | 804 |
| Новый заказ | 365 | 359 | 420 | 413 |
| Success → документ | 2009 | 929 | 3637 | 1011 |

## Full reload и свежесть данных

Внутри тёплого Sales workspace устранены top-level reload и повторный auth bootstrap. В возвратах C/F/H/S осталось два критических GET вместо 12–13 запросов общей инициализации. Вход в кассу и Manual Sale по-прежнему требует одного GET; в сменах и журнале два GET выполняются параллельно. Menu/Order, Import/Journal и открытие/закрытие уже загруженного документа не требуют API.

Сохранены прямое открытие /cashier и /sales-entry, reload, auth handoff и смена venue. Первый Back из холодного standalone Cashier также остаётся document navigation.

При выходе из Sales в Warehouse/Finance используется native document boundary. В v460 свежесть глобальных domain stores обеспечивала предшествующая перезагрузка при возврате в Sales. После её удаления regression выявил устаревший складской read model. Поэтому загрузочная граница перенесена на выход из Sales: недавно проведённая продажа и её движения гарантированно читаются заново. Переход O вследствие этого медленнее; мы не выдаём его за ускоренный и не меняем бизнес-модель склада ради скорости.

«Новый заказ» сохраняет один свежий Sales GET для проверки действующей смены, permissions и меню. При API delay 1200 ms это ожидание остаётся видимым и контролируемым.

## Instrumentation и сеть

QA-only probe подключается через Playwright addInitScript и не включён в production HTML. Он фиксирует pointer/click, navigation bridge/history, document/iframe responses, DOM lifecycle, fetch, draft reads, UI readiness и доступные Long Tasks. API handler Server-Timing отделён от искусственной задержки сети.

T0 — pointer; T1 — click capture; T2 — browser navigation start / bridge; T3 — responseStart; T4 — domInteractive (для локальных действий UI commit); T5/T6 — fetch start/response; T7 — meaningful UI; T8 — ready predicate. Для Warehouse T8 является консервативной верхней границей Playwright readiness, T7 — только shell. Поле automationWaitMs хранится отдельно и не подменяет время рендера. Не существующие для локального действия этапы отмечены null.

Переход A измерен через canonical bdNavigate из Home: отдельного прямого Sales control в Home fixture нет. Его T0/T1 не являются физическим tap. Остальные A–S сценарии, кроме этой оговорки и отсутствующих мобильных вкладок на широком экране, используют реальные touch controls. На 820/1280 меню и заказ показаны одновременно.

Профили: normal, latency 100/300/600 ms на uncached HTTP, API-only delay 1200 ms. Это latency simulation, не полноценная модель 4G bandwidth/радиосети. В каждой серии проверяются rapid/double tap, один destination, отсутствие повторного bootstrap и завершение pending. Полный T0–T8 trace и timings.csv сохраняются в QA evidence.

На холодном WebKit сохраняются заметные выбросы времени загрузки и разбора ресурсов. Локальные измерения зависят от запуска движка и нагрузки Windows; нельзя обещать физическому iPhone те же значения. В Chromium при latency 300 ms на возврате C были три Long Tasks до 55 ms, после — ни одной. Отдельной причиной многосекундной задержки main-thread работу эти измерения не подтверждают.

## Regression и безопасность

PASS: POS cash/card, Manual Sale с OPEN authoritative shift, смены и single-open/concurrency guard, business date/timezone, journal, import, documents, Finance, Warehouse links, draft/reload/recovery, lost response, retry, idempotency, duplicate protection, venue/account isolation, permissions, 401/login, 503 и network error.

Численный POS-контроль на 390/820/1280: 3 события, выручка 120, 3 движения, остаток 100 → 97. Пять post attempts с потерянным ответом и повторами не увеличили число продаж. iPhone hardening regression: 390 с top 59/bottom 34 и без inset, 820×1000, 1280×800; 12 строк корзины, checkout/последняя строка, Back hit target, browser Back/Forward, draft resume, документ ↔ движение.

Build PASS. Typecheck PASS. Lint: 0 errors, два прежних unused warnings. Полный локальный набор: 1865 уникальных тестов, включая 1304 business tests и 6 новых navigation contract tests. После добавления двух SPA routes обновлены строгие route inventories и повторены их проверки. Ошибка записи OneDrive при подготовке артефакта устранена повтором идемпотентного шага; это не application failure.

GitHub CI проверяет тот же commit отдельным полным verify job и navigation job (Chromium + WebKit, все три ширины, пять сетевых профилей на 390). Итоговый SHA и CI URL фиксируются в release report после push. Публикация требует отдельного подтверждения пользователя.

## Изменённые файлы

- `.github/workflows/google-reviews-setup-v400.yml`
- `app/cashier/route.ts`
- `app/sales-entry/route.ts`
- `app/sales-import/route.ts`
- `docs/navigation-route-matrix.md`
- `docs/sales-navigation-performance-v460.md`
- `package.json`
- `public/assets/index-BQGspy0I.js`
- `public/cashier.js`
- `public/sales-entry.js`
- `public/sales-import.js`
- `public/sales-navigation.js`
- `scripts/audit-modern-ux.mjs`
- `scripts/audit-navigation-consistency.mjs`
- `scripts/patch-sales-navigation-performance.mjs`
- `scripts/patch-sales-ux1.mjs`
- `scripts/pos1-browser-qa.ts`
- `scripts/pos1-hardening-browser.ts`
- `scripts/qa/sales-navigation-probe.js`
- `scripts/sales-browser-qa-phase5.ts`
- `scripts/sales-iphone-browser.ts`
- `scripts/sales-navigation-performance.ts`
- `scripts/sales-observations-browser.ts`
- `scripts/sales-ux2-browser.ts`
- `scripts/venue-timezone-browser.ts`
- `tests/helpers/sales-surface-page.ts`
- `tests/modern-ux.test.mjs`
- `tests/navigation-consistency.test.mjs`
- `tests/sales-navigation-performance.test.mjs`

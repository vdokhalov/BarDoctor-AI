# BarDoctor глазами владельца заведения

Дата: 26 августа 2026
Режим: автономный owner simulation, mobile-first
Данные: два изолированных UAT-заведения, MDL, реальная цепочка «закупка → остаток → списание → меню/техкарта → продажи → инвентаризация → финансы»
Production deployment: **не выполнялся**

## Резюме

Пройдены все 18 бизнес-сценариев. Полный операционный цикл выполнен на основном заведении; второе пустое заведение использовано для проверки first-run и venue isolation. Найдено 15 P1 и 7 P2; исправлены все 15 P1 и 3 объективных P2. Четыре оставшихся P2 требуют продуктового решения и перечислены отдельно.

Финальные build, typecheck, lint, unit и integration suites проходят. Ручные mobile и desktop smoke проходят. Два автономных Playwright-runner не стартуют в текущем окружении до выполнения тестов: одному не хватает локального Chromium, второму — незадекларированного runtime-модуля `@sparticuz/chromium`. Поэтому формальный статус отчёта — **NOT READY FOR PRODUCTION**, несмотря на отсутствие известного product blocker.

## Бизнес-сценарии

| # | Задача владельца / ожидание / где ожидал найти | Фактический путь и проблема | Severity / root cause | Что исправлено и повторный тест |
|---|---|---|---|---|
| 1 | Утром открыть приложение и сразу увидеть активное заведение и состояние бизнеса. Ожидал Home после bootstrap. | Splash/Home могли бесконечно показывать loading при `null` score или отсутствии snapshot; после изменения профиля active venue cache оставался старым. | P1. UI смешивал «нет расчёта» с «ещё загружается»; cache не обновлялся после server save. | Добавлены честные состояния «Нет диагностики»/«Недостаточно данных», CTA и обновление venue cache. Splash/Home используют один snapshot. **PASS**. |
| 2 | Понять, как вчера отработало заведение. Ожидал Home или «Смены». | Home, «Смены» и «Финансы» дали: 5 200 MDL выручки, 83 чека, 1 500 MDL ФОТ, 1 560 MDL закупок/расходов, предварительный результат 2 140 MDL. Ранее закрытая до текущего времени смена не попадала в coverage. | P1. Календарный генератор учитывал только уже завершённые интервалы графика и пропускал фактически закрытую запись. | Фактическая закрытая смена включается в месяц/неделю/Business Health. **PASS**. |
| 3 | Понять, почему прибыль хуже. Ожидал одинаковый ответ на Home, Finance, Reports и AI Doctor. | Цифры совпали, но расчёт до себестоимости и денежный результат раньше могли использовать неверный период и валюту. AI честно отказался придумывать причину без baseline/остатков. | P1. До начала учёта генерировались фиктивно «пропущенные» смены; часть formatters жила с RUB default. | Введена дата начала учёта venue, периоды и MDL унифицированы. **PASS**. |
| 4 | Увидеть, что требует внимания сейчас, и перейти к действию. Ожидал Home. | Красные/жёлтые сигналы ведут в Health, Warehouse, Employees, Payroll, Equipment. После закупки Home ошибочно продолжал показывать «позиции не сопоставлены». | P1. Склад успешно разрешал canonical key, но подтверждённый purchase document не сохранял фактически разрешённую связь. | Canonical key теперь записывается в строку документа только после успешного stock receipt; неоднозначные строки по-прежнему блокируются. **PASS** для нового документа. |
| 5 | Поставщик привёз товар — оформить закупку. Ожидал «Добавить покупку» в Warehouse/quick add. | Metro UAT, 12 бутылок × 120 MDL, оплата наличными. Созданы документ, связанный платёж 1 440 MDL, приход 6 л и moving-average cost. Ранее документ мог показать «сохранено», но canonical catalog фактически не сохранялся. | P1. Client cache обновлялся до захвата server base; three-way merge считал желаемое состояние неизменённым. | Порядок save исправлен; catalog server-authoritative, refresh сохраняет данные; purchase mapping сохраняется в документе. **PASS**. |
| 6 | Разбили бутылку — списать товар. Ожидал Warehouse → Списания и вход из закрытия смены. | Выбраны номенклатура, 1 бутылка, причина «Бой», стоимость 120 MDL; stock стал 5,5 л. Старого ручного поля суммы нет. | P1. Несколько surface использовали RUB независимо от venue. | Canonical write-off flow и shift link используют MDL и автоматическую стоимость. **PASS**. |
| 7 | После смены внести продажи, чтобы списался склад. Ожидал Warehouse → Продажи. | Создан SalesBatch: 2 × «Шот UAT», recipe snapshot 50 мл, списано 100 мл на 24 MDL; stock стал 5,4 л / 1 296 MDL. Mapping/status понятны. | P2. Review показывал внутреннее `ml`; zero-quantity CTA остаётся визуально доступен, хотя submit даёт понятную ошибку. | `ml/l/g/kg/pcs` переведены в owner-facing единицы в SalesBatch и assortment. Zero-quantity CTA оставлен как product question. **PASS**. |
| 8 | Провести слепую инвентаризацию. Ожидал Warehouse → Инвентаризации. | Создан draft, внесено 11 бутылок, review показал учёт 11 / факт 11 / расхождение 0 / итог 0 MDL; draft пережил закрытие и повторное открытие. Native confirm финализации блокирует только внешний browser controller. | Product flow PASS; automation infrastructure limitation. Server lifecycle отдельно покрыт idempotent finalize/adjustment tests. | Count/review/reopen проверены в UI; finalize contract, RBAC и одноразовая корректировка проходят integration suite. **PASS с ограничением автоматизации**. |
| 9 | Быстро понять, что заканчивается. Ожидал Warehouse → Остатки. | Видны стоимость, отрицательные остатки, структура и low-stock входы. Для жидкости owner-facing display остаётся «бут.»/«л», canonical `ml` скрыт. | P2. Две detail-поверхности выводили base unit напрямую. | Единицы переведены, упаковка и стоимость сохранены. **PASS**. |
| 10 | Понять, кому и сколько платить. Ожидал Team или Finance. | Зарплаты доступны из Finance («Зарплаты») и профиля сотрудника. Для Анны применена ставка за смену, закрытая смена дала 1 500 MDL ФОТ. | P2 discoverability, без domain rewrite. | Существующие entry points подтверждены; крупное объединение Team/Payroll не выполнялось. **PASS**. |
| 11 | Открыть сотрудника: роль, смены, доступы, оплату. Ожидал Team. | Анна Бармен находится в Team; профиль, роль, статус, смена и payroll rule доступны. HR role и access permissions остаются разными сущностями. | P2 product clarity. У правила можно вручную задать имя, противоречащее фактической формуле. | Риск зафиксирован, автоматическое переименование пользовательских правил не выполнялось. **PASS**. |
| 12 | Понять, какое оборудование требует обслуживания. Ожидал Equipment. | List/detail, состояние, ТО, история и health alerts доступны. Неисправность объясняется статусом/историей. | P2. Health считает строки каталога, Equipment summary — физические единицы; detail показывает сырой UUID. | Domain не менялся ночью; вопросы вынесены в продуктовый список. **PASS**, clarity debt остаётся. |
| 13 | Спросить AI Doctor о главной проблеме, прибыли, действиях, складе и персонале. | Свободного поля вопроса нет: можно только запустить общий диагноз. Диагноз использовал реальные данные, не придумал проблему и показал 25% confidence/недостаточность baseline. До исправления provider outage давал 503, а результат исчезал после venue switch/reload. | P1 persistence/provider fallback; P2 conversational/actionability. Generic optimistic merge сохранял `null`; provider exception обрывал canonical server analysis. | Добавлен deterministic fallback и authoritative last-write save диагноза. A→B→A и refresh сохраняют отдельные результаты. Свободные вопросы остаются product question. **PASS** по данным и persistence. |
| 14 | Изменить себя и заведение. Ожидал Profile/More. | Личные данные, venue data, currency, security, logout и venue switcher разведены. Аналитика не спрятана в настройках. | P1. После profile save cache мог показывать старое имя/валюту. | Cache синхронизирован с server response; tracking start сохраняется. **PASS**. |
| 15 | Переключить два заведения и не увидеть stale data. | A: 5 200 MDL и заполненный склад; B: пустые финансы, склад 0, нет сотрудников/правил; обратно A: прежние цифры, каталог, AI и MDL. | P1. AI snapshot раньше сохранялся как `null`; пустой B показывал 100% readiness и «3 из 3» незавершённых шагов. | Authoritative AI save; readiness без знаменателя показывает «—»; copy — «3 шага осталось». **PASS**. |
| 16 | Полностью закрыть смену. Ожидал wizard из Home/Shifts/quick add. | Пройдены продажи, расходы, касса, персонал, write-off entry и подтверждение. Итог: 5 200 MDL, 83 чека, 112 гостей, 1 сотрудник, 1 500 MDL ФОТ. | P1. Currency и coverage ранее расходились с Finance/Home. | Canonical write-off link, venue currency и фактическая закрытая смена унифицированы. **PASS**. |
| 17 | Refresh/relogin и продолжить работу. | Catalog, techcard, SalesBatch, stock, employee, purchase, draft inventory, active venue и AI diagnosis пережили refresh; новая вкладка восстановила A. | P1. Catalog и AI использовали неверную optimistic base semantics. | Оба save-path исправлены и проверены против D1/server-authoritative rows. **PASS**. |
| 18 | Первый пользователь без знания BarDoctor должен понимать пустые экраны. | B показывает пустые Home/Finance/Warehouse с CTA. Ранее Finance говорил «100%», а Home «3 из 3 шагов», хотя данных нет. | P1/P2. Нулевой знаменатель трактовался как 100%; copy звучал как завершённый прогресс. | «Готовность —», «Пока нет прошедших смен», «3 шага осталось». **PASS**. |

## Противоречивые данные

Исправлено:

- Business Health: Splash/Home/Health использовали разные состояния `null/loading/no snapshot`.
- Business Health: Health показывал `0/24`, Finance и Home — `1/1`.
- Home/Finance/Shifts: фактически закрытая текущая смена не входила в coverage.
- Период: новому заведению приписывались пропуски до начала использования BarDoctor.
- Валюта: MDL venue, но purchase/write-off/shift/menu/assortment показывали RUB.
- Catalog: UI говорил «сохранено», сервер оставлял старое состояние.
- Техкарта: overview считал её подтверждённой, карточка говорила «Нет техкарты».
- Multi-venue: AI result не переживал переключение, пустое venue показывало 100% readiness.
- Procurement: складской приход был связан, purchase document оставался «не сопоставлен».

Остаётся семантическое различие, которое не является арифметической ошибкой: Equipment показывает физические единицы, Health — количество записей каталога. UI должен явно подписать оба знаменателя.

## AI Doctor

Заданные владельцем вопросы: «Что главная проблема?», «Почему падает прибыль?», «Что сделать сегодня?», «Есть ли проблема со складом?», «На что обратить внимание по персоналу?».

- Свободно задать эти вопросы в текущем UI нельзя; запуск доступен только как общая диагностика.
- На имеющихся данных AI не придумал критическую проблему, честно указал отсутствие сопоставимого baseline и низкую достоверность.
- Home и AI используют один Business Health snapshot; после исправления результат server-authoritative и venue-scoped.
- Provider outage больше не убирает рассчитанные сервером факты: возвращается deterministic diagnosis с `provider.available=false`.
- Actionable route существует у подтверждённых рекомендаций и Data Quality, но cold-start ответ «действий нет» не даёт владельцу диалогового next step.

## Что владелец не смог понять без инструкции

- Почему «Сегодня» может быть 25 августа при календарной дате 26 августа: это operating date ночной смены, но UI не объясняет правило.
- Почему Data Quality, полнота AI и confidence имеют разные проценты и разные знаменатели.
- Почему Equipment сообщает 16 физических единиц, а Health — 11 записей каталога.
- Что означает сырой UUID в техническом паспорте оборудования.
- Почему название payroll rule может не совпадать с фактической формулой.
- Почему AI Doctor нельзя спросить обычной фразой, хотя продуктовая метафора это обещает.

## Лишние действия

| Workflow | Сейчас | Разумно | Ночной результат |
|---|---:|---:|---|
| Создать menu item и подтверждённую техкарту | 8–10 действий | 4–5 | Не упрощалось: нужен product redesign и сохранение review states. |
| Создать payroll rule и назначить сотруднику | около 7 | 4 | Не менялось: нельзя ночью объединять payroll domain. |
| Инвентаризация: открыть → count → save → review → confirm | 6 | 4 | Сохранена безопасная двухфазность; можно убрать один промежуточный save. |
| Добраться до склада из любого экрана | 3 (Ещё → Склад) | 1–2 | Quick actions покрывают закупку, но не весь склад; navigation question. |

## Error и empty states

- Проверены: нет диагноза, недостаточно данных, пустые Finance/Warehouse/Team, AI provider unavailable, missing sales mapping, zero quantity, failed catalog persistence, inventory draft/reopen, venue isolation.
- Ошибки показываются владельцу по-русски; server-side canonical lifecycle остаётся атомарным и idempotent.
- Network-fail контракты покрыты sync/fallback tests; отдельное отключение сети в browser UAT не выполнялось.

## Проверки

- `npm run build` — PASS.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm test` — PASS: 250 artifact/integration + 551 TypeScript unit tests.
- Targeted owner fixes — PASS.
- Ручной iPhone-width smoke — PASS: Home, Finance, Shifts, quick add, Warehouse, Sales, Assortment, techcard, Profile/More.
- Ручной desktop critical smoke — PASS.
- `npm run test:mobile-navigation` — BLOCKED до сценариев: отсутствует ожидаемый Playwright Chromium executable.
- `npm run test:procurement-browser` — BLOCKED до сценариев: отсутствует `@sparticuz/chromium` в доступном runtime.

## Severity и итог

- P0: 0 найдено / 0 осталось.
- P1: 15 найдено / 15 исправлено / 0 осталось.
- P2: 7 найдено / 3 исправлено / 4 product questions осталось.
- P3: 0.
- Business scenarios: 18 пройдено, 18 подтверждено; inventory finalize подтверждён UI до native confirm и integration lifecycle после него.

## Финальный статус

**NOT READY FOR PRODUCTION**

Причина: два обязательных standalone browser-runner не стартуют в текущем окружении из-за отсутствующих browser runtime dependencies. Известных P0/P1 product blockers нет; production не публиковался. Для утреннего READY нужно предоставить Chromium/runtime для этих двух команд, получить их PASS и только затем дать финальное подтверждение publish.

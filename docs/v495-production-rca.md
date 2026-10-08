# BARDOCTOR v495 — независимый production RCA

Дата: 2026-10-08 UTC. Production: Sites 495, commit `4921f368105e44321a020f406b9f58cb619172c9`, Worker `dbba131f-f90f-4583-89f2-aadac3068ba0`. URL: https://bardoctor-preview.v-dokhalov.chatgpt.site.

**Owner UAT остаётся FAIL.** Подготовленный кандидат не развёрнут; локальный QA и CI не подтверждают исправление на реальном production iPhone.

## Production-доказательства

Источник: Sites Worker logs, включая реальные авторизованные iPhone-запросы; безопасная копия — [v495-production-log-evidence.json](v495-production-log-evidence.json). Заголовки с credentials, email и содержимое business data в отчёт не включены. Это ограниченная выборка последних 100 событий, а не полный экспорт логов.

| UTC / endpoint | Request ID | Production-результат |
| --- | --- | --- |
| 15:56:23.248 `/api/business-health` | `6f53f97095dcc91cecf4ea114ec773d1` | `exceededCpu`, CPU 32500 ms, wall 36322 ms; `Worker exceeded CPU time limit`; авторизованный iPhone |
| 15:56:34.309 `/api/business-health` | `e5d3c67f5e6533b8fe2f3b71c5e6b378` | CPU 31252 ms, wall 35224 ms, `Network connection lost`; внутреннее `headers_ready:200` не доказывает доставку snapshot клиенту |
| 15:56:23.532 `/api/auth/bootstrap` | `8729218c3186b7be805315c09159f165` | `canceled`, CPU 42 ms, wall 29954 ms; авторизованный iPhone; доставленного HTTP-ответа нет |
| 15:56:25.188 `/api/users/me` | `eaf290435becc148bd10ac9de43e876f` | HTTP 200, CPU 34 ms, wall 3348 ms; сервер принимал сессию в том же временном окне |
| 15:56:53.887 `/employees?venue=1` | `08f48237ef1892dd1cad820f265d8a66` | документ `canceled`, wall 11475 ms; это не доказательство HTTP 401 Team API |

Анонимные 401/404 в более ранних пробах исключены из положительной валидации. Отсутствие ошибок в этих пробах не подтверждает owner-сценарий.

## A. Business Health

**Подтверждено production:** один из реальных запросов лишился ответа из-за принудительной остановки Worker по CPU. Другой дорогой запрос потерял соединение. Это объясняет отсутствие полученного snapshot и сообщение об отсутствии оценки в этих попытках. Ошибка CPU не является нормальным бизнес-результатом `score:null` и не может быть перехвачена JavaScript `catch` после остановки Worker.

**Проверено в точном source v495:** финансовая индексация предыдущего исправления уже присутствует. Начальная дата `0000-01-01` фильтрует имеющиеся записи, не перебирает миллионы календарных дней. Повторные рекурсивные проходы всех stock movements на каждый balance в Health Operations дают зависимость от произведения числа balances и movements.

**Подтверждено изолированным воспроизведением, но production-причина остаётся гипотезой:** на валидном наборе 1000 balances / 8000 movements исходный operations builder потреблял около 12.1 s CPU; после индексации — около 0.76 s. Для 500/5000: 4.79 s → 0.44 s. Источники укладываются в существующие ограничения 2 MB/store и 10000 rows. Дифференциальные сравнения сохраняют результат, включая scope, duplicate winner, anchors, warehouse semantics, UNKNOWN и known zero. Нельзя утверждать, что именно эти размеры или именно этот участок потребили production 32.5 s: полного source profile нет.

**D1 и таймауты:** завершённые D1 spans в доступной выборке успешны (Health 166–941 ms); ошибки D1 или query timeout не подтверждены. Нулевые stage timings не исключают CPU: часы Worker могут обновляться на I/O, поэтому нельзя использовать их для точного CPU attribution. Connection lost и отмены подтверждены; их инициатор — клиент, сеть или платформа — не установлен.

**Объём финансовой истории:** read-only Sites database viewer подтвердил DB/domain_data и финансовые источники. Небольшая ячейка `account_id:1 / bd_month_closings` полностью разобрана: один период `2026-07`, status `closed`, положительная revenue и числовой finalProfit. Поэтому отсутствие любого закрытого финансового периода не подтверждается. Это состояние на момент диагностики, не response body неудачного Health-запроса. Большие JSON ячеек обрезаются. Полное количество записей, байты и самая ранняя дата owner-истории через этот интерфейс не доступны. Read-only таблица venues подтверждает `venue 1 → data_account 1 / workspace 1`. Дополнительная последовательная пагинация domain_data остановилась на возвращённом offset 60: viewer отклонил единственную слишком большую строку (`A single D1 row is too large to display safely`); её key/account не доступны. Это ограничение diagnostic viewer, не production D1 query timeout. Неполный inventory не используется для вывода об отсутствии stock или других источников. Arbitrary SQL не предоставляется. Предыдущая QA-проба 5000 финансовых дней сама по себе не воспроизвела production CPU. Поэтому «большая финансовая история» не объявляется установленной причиной. Полные cost histories, recipe/stock attribution и повторные cost episode computations остаются другими возможными CPU источниками.

Минимальный repair: один scoped проход источников; движения сгруппированы по точному product key, anchors — по строгому ID; существующий proof resolver и scoring rules сохранены. Health route получает стандартный infrastructure boundary с request ID и `no-store` для обычного сбоя D1. Ограничения CPU не повышаются, отсутствующая оценка не заменяется выдуманным числом.

## B. Команда / восстановление доступа

**Подтверждено production:** bootstrap отменён через 29954 ms; рядом есть успешный авторизованный `/api/users/me`. Истечение, потеря или отзыв именно owner-сессии не доказаны. Полного ответа `/api/restaurants/me` или `/api/access` в выбранных событиях нет.

**Подтверждено точным source и воспроизведением QA:** текст «Не удалось восстановить доступ» выдаёт общий bootstrap/profile guard до модуля Team. Bootstrap timeout/error переводит его в recovery. Profile provider v495 делает единственный GET на mount, допускает гонку с bootstrap, проглатывает ошибку и не повторяет чтение после `bd:bootstrap-complete`. При transient profile failure подтверждённый bootstrap может закончиться `ready`, а provider остаётся без профиля. Reload повторяет эту последовательность. Это конкретный клиентский дефект; неудачный первый owner profile response остаётся гипотезой из-за отсутствия production-ответа.

Минимальный repair: bounded bootstrap покрывает fetch **и consumption JSON body**; временная ошибка сохраняет credentials, только подтверждённый 401/needsLogin очищает их. Повторная загрузка вызывает coalesced серверную проверку без перезагрузки документа. Profile читается после завершения bootstrap и повторяется после retry; 15 s timeout, error state и busy state явные. Provider начинает с `isReady:false` даже при cached profile: protected child lifecycle до завершения серверной проверки закрыт. До изменения cached + revoked-session QA подтвердил временный DOM commit Команды и ранние защищённые API-вызовы, которые сервер отклонил 401; видимый paint Команды и server authorization bypass не подтверждены. Этот дополнительный cached-path defect подтверждён source/QA, не отдельным production trace. Epoch/abort и проверки email/token/venue запрещают stale profile и bootstrap commits. Cached profile не позволяет обойти server authorization. Login/register и server auth model не меняются.

**Дополнительный source/QA дефект обработки ошибок:** при исключении `localStorage.setItem` после incarnation cache clear старый `rememberAccessContext` публиковал `ready` до завершения записи venue/permissions; catch мог сохранить это состояние. Реальные исходные функции воспроизвели ложное `ready` при принудительном storage failure. Готовность теперь публикуется после scoped storage commits, исключение в принадлежащем текущей попытке состоянии переводит bootstrap в retryable error. `pagehide` отменяет текущий bootstrap; его поздний body и finally не меняют следующий контекст. VM проверяет ошибки permissions и session-user metadata, восстановление после них и поздний body при уходе со страницы. Production storage failure или старый документ как причина owner-сбоя не подтверждены.

В observability добавлены фиксированные `/api/restaurants/me` и `/api/access`; payload, токены и business data не логируются. Это устраняет диагностический пробел, но не доказывает уже развёрнутое исправление.

## Безопасность диагностики

Production: только чтение логов, metadata и bounded database viewer. Не выполнялись owner bootstrap/profile/access вызовы для воспроизведения: их существующие handlers могут выполнять owner repair даже при GET. Не использовались прочитанные session tokens, synthetic identity или Sites bypass как app-session доказательство.

Все операции, регистрации, закрытие QA-периода, временные ошибки и retries выполняются в отдельной in-memory SQLite или disposable Miniflare D1 с `@isolated.test` accounts. Existing schema definitions инициализируют только disposable QA DB; production migrations не выполняются. Production business data, access и schema не менялись. Visual Wave 2 не запускалась.

## Валидация кандидата

- Дифференциальные stock datasets против точного v495: 80/80; дополнительные исследовательские mixed datasets: 200/200.
- Реальный authenticated Health handler: verified closed-period fixture плюс 1000 продуктов / 8000 движений / 1000 финансовых дней; snapshot с числовой оценкой, все stock facts, AVAILABLE known-zero counter, неизменные domain data; около 2.39 s local process CPU, gate 5 s.
- D1 failure negative control: infrastructure JSON 500 с request ID, `no-store`, без внутренних подробностей и business writes.
- VM-тесты фактически сгенерированных provider/bootstrap: bounded fetch/body timeout, сохранение сессии, retry coalescing, stale venue read, revoked profile response, восстановление после 503.
- Browser QA требует положительного Team ready состояния, повторного подтверждения сервером, числового Health snapshot и существующих Shifts данных. Используются Chromium и Linux WebKit 390/820/1280; это не физический iPhone.

Локальные build, artifact validation, typecheck, lint и `npm test` — PASS: 1746 unit, 468 artifact tests и остальные audit/regression/posttest checks. Lint: 0 ошибок, два существовавших ранее предупреждения. Native compiled Worker + D1: PASS, verified month close, Health 90/100, 1000 complete stock facts; 1484 ms в отдельном прогоне и 4538 ms при параллельном QA, gate 8 s. Все domain/account/session/access/audit projections неизменны, outbound 0.

Расширенный экспериментальный WebKit-прогон с последовательными hard navigations получил pageerrors для Health/reviews после успешных API200 и положительных UI assertions. Его failing evidence сохранён в `outputs/v495-rca/combined-webkit-1280-failure.json`; он не объявляется PASS или исправленным. Навигация до завершения JSON consumers остаётся гипотезой; CORS/auth failure не установлены. Browser gates разделены по сценарию: новый проверяет Team/profile retry/reload и настоящий snapshot; существующий owner UAT отдельно проверяет числовые Home/Health, AI Doctor, cost recovery и положительные Shifts данные. Оба сохраняют строгий `errors:[]`; подавления ошибок или новой environment exception нет.

CI проверяет точный pushed SHA через workflow [google-reviews-setup-v400](https://github.com/vdokhalov/BarDoctor-AI/actions/workflows/google-reviews-setup-v400.yml), ветка `fix/v495-production-rca`; окончательный run/status сопровождает handoff. Sites-кандидат сохраняется без deployment. Production acceptance остаётся открытой до отдельного разрешённого deployment и нового owner UAT; полноценное CPU attribution требует необрезанных размеров source histories или server-side profiling без business mutations.

В промежуточном CI `37813890218` / `30832f0` core и scroll jobs, новый Chromium/WebKit Team recovery и owner WebKit 390/820 прошли. Широкий owner WebKit 1280 остановился в `/reports`: venue key был `null`, browser errors отсутствовали, последних API ошибок не было; screenshot показывает загруженный отчёт. Точный механизм этого CI-сбоя не установлен: API может использовать сохранённый server session venue при пустом клиентском ключе. Инструментированный локальный повтор 1280 прошёл без потери ключа. Storage failure выше — отдельно воспроизведённый дефект, не доказанное объяснение CI. Owner gate теперь ждёт завершения bootstrap перед проверкой ключа и сохраняет auth state при failure; строгие assertions и `errors:[]` сохранены, исключения и автоматические retries не добавлены. Финальный CI выполняется заново после follow-up.

Legacy `bd_month_closings.status:closed` не доказывает canonical VERIFIED close eligibility для Health. Возможный missing input после устранения CPU failure остаётся непроверенным без успешного owner response body.

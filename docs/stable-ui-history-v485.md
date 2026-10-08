# BarDoctor: уточнённая граница исторического rollback

Владелец уточнил цель: интерфейс до очереди Phase 4B и семи вопросов Phase 4C. Поэтому UI v489 и кандидат `51132f45f95c53655eb81096f8e285869a5bd9bf` не подходят. Они не опубликованы в рамках этой работы; CI прежнего кандидата остановлен после изменения цели. Production остаётся v492; deployment нового кандидата требует отдельного подтверждения.

## Git: три разные границы

1. Очередь Business Health Phase 4B впервые добавлена в `a3a08dac3717429e9591e5ed7e88182397e48884` (2026-10-05 11:54:46 UTC). Предыдущая опубликованная baseline — v485, `dcc0541780db52d8c02b0c3a74f3ea0d31cbce24`. v486 с новым кодом была сохранена без deployment; опубликованная v487 уже включает очередь.
2. Семь управленческих вопросов Doctor впервые добавлены в `4fb15c895336a645edbf30a1547ba21c6445e57b` (`feat(doctor): add seven venue-scoped curated management answers`, 2026-10-05 16:34:27 UTC). Они входят в v488, до Visual Concept V1.2.
3. Первое внедрение именно Visual Concept V1.2 — `9f70d8460e92cba322598f56a81923abf3436bab` (2026-10-07 09:01:54 UTC). Его непосредственный Git-родитель — v489 `b7708cadb01ff8e8ee11c1bcfdab448c15068878`. Этот commit впервые добавляет `public/intelligence-v1.css`, `lib/bardoctor/client/intelligence-ui.tsx`, `scripts/patch-reference-slice-v1.mjs` и design-system документ, который прямо называет target «Visual Concept V1.2» и baseline v489.

## Sites: сохранённая версия не равна порядку публикации

Ниже — результаты native `get_deployment_status` для deployment, связанного с каждой saved version. Время — `updated_at` успешного завершения зарегистрированной попытки. API не предоставляет полную историю повторных публикаций одной версии; эти timestamps не доказывают отсутствие более ранней попытки.

| Sites | Commit | Подтверждённый publish, UTC | Содержимое интерфейса |
| --- | --- | --- | --- |
| v483 | `e48ac83476850bc33cc433a4ffe21804300da20a` | 2026-10-04 12:48:18 | До Phase 4A/B/C; ранняя альтернатива, теряющая полезные независимые исправления при полном откате |
| **v485** | **`dcc0541780db52d8c02b0c3a74f3ea0d31cbce24`** | **2026-10-05 10:32:37** | **Прежние Health и Doctor; нет очереди Phase 4B и семи вопросов. Сохранено исправление себестоимости Phase 4A** |
| v486 | `a3a08dac3717429e9591e5ed7e88182397e48884` | Не публиковалась в доступной записи | Новая очередь Phase 4B |
| v487 | `04ce772fd5b07e07943ead5870bd86804aba71e3` | 2026-10-05 14:48:20 | Очередь Phase 4B, ещё без семи вопросов |
| v488 | `57c605e2f7ad0c728d4b341266d5e5083328a64a` | 2026-10-05 18:28:45 | Очередь и семь вопросов; V1.2 отсутствует |
| v489 | `b7708cadb01ff8e8ee11c1bcfdab448c15068878` | 2026-10-07 12:32:16 | UI до V1.2, но после Phase 4B/C; независимые исправления приоритетов, stock context и UNKNOWN Finance |
| v490 | `17de9a7c4934ad92c1b7c7b0a14f173155539ed9` | 2026-10-07 11:24:43 | Первая saved version с V1.2 |
| v491 | `39d27f5fce9714c00cd41881595a980d09dabd64` | 2026-10-08 05:30:37 | Восстановление функциональности v489 с сохранённым V1 UI |
| v492 | `7d4eeb44ea9ac0419d55881e846268bc31da57ee` | 2026-10-08 08:28:45 | V1 UI, оптимизация canonical reads и уточнённый restricted-role gate |

v489 нельзя без оговорки называть последней production до начала V1.2: доступный publish timestamp позже v490. v488 — последняя подтверждённая публикация до первого V1.2 commit по доступным связанным deployment records. Для уточнённого владельцем интерфейса до Phase 4B/C верна **v485**, а не v488/v489.

## Почему текущий v489-кандидат отклонён

AST/хеши показывают, что Health (`c_e`) и Doctor (`Uce`) в v488 и v489 одинаковы; v489 меняет Home и исправляет контексты/финансовую достоверность, а не добавляет V1.2. Кандидат `51132f45…` возвращает эти функции v489 и удаляет V1.2, но сохраняет панель семи вопросов и очередь. Это корректный rollback только границы V1.2 и неверный rollback уточнённой границы Phase 4B/C.

Новый кандидат возвращает `bdHomeDaily`, `c_e`, `Uce` из v485; удаляет curated panel/suggestion/global return UI и priority queue entry points. Единственное добавление к старому Health render — условное сообщение проверки исправления по валидному venue-bound `checkedAction`. Оно сохраняет независимую обратную связь Day/Stock и не возвращает очередь. Finance UNKNOWN, Payroll initializer calls, Tasks/Stock/Day contexts, timeout/cancel/coalescing и весь backend v492 остаются.

## Проверка работы и её границы

Проверки запускают реальные текущие handlers с отдельной локальной SQLite, а не подменяют бизнес-ответы скриншотами. Контролируемые 503/таймауты используются только для negative controls. Legacy diagnosis проверяется через run → 503 → retry → HTTP 200 → cached reload → refresh → реальные report actions → reload/back. Health сверяется с canonical snapshot; проверяются score, зоны и их переходы, источник данных и исправление себестоимости. Смены/Склад сохраняют реальные editor/writer/verify workflows.

Полная browser parity использует исходный UI v485 против нового кандидата на одинаковых текущих API и изолированных данных при 390/820/1280 px. Inventory явно исключает 17 элементов добавленного позднее Phase 4 UI и возвращает legacy attention. Все остальные entry points и модули остаются в регрессии. Это не утверждение, что старый backend v485 полностью совместим с нынешней production DB: старый backend вообще не используется для deployment.

API, domain calculations, schema, migrations и bindings сравниваются byte-for-byte с v492. Ни business rows production, ни миграции не меняются. Owner UAT с реальными production records и физический iOS/PWA остаются отдельной проверкой; desktop WebKit не выдаётся за физическое устройство. Итоговые результаты CI, exact candidate SHA и saved Sites version передаются после завершения release checks. Публикация запрещена до отдельного подтверждения.

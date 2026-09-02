# BarDoctor — STEP 1.6 PRODUCTION DEPLOYMENT COMPATIBILITY

Дата проверки: 2026-09-02  
Scope: совместимость текущего release candidate с Sites version 400 при **нулевых production DB migrations**. Production schema не объявляется проверенной; P0-04 и P0-05 не закрываются этим документом.

## A. Source

Production version: **Sites 400**  
Production SHA: **`6cc90fc91e9d7df28947c1ddc920733d767e08b4`**  
RC SHA (последний code/evidence commit): **`5109d9c00ba815b40cd133d8787be8441b7676b4`**  
RC tree: GitHub PR #5, branch `hardening/step-1-4-p1-2026-09-02`; локальный tree и GitHub tree идентичны.  
App version/build: **`0.1.0` / build 167**  
Expected schema: **Drizzle journal `0024`** (`0021_release_schema_contract` — `0024_closed_mongu`).

Sites version 400 и его source SHA получены из Sites version metadata. Historical source восстановлен непосредственно на этом commit. В source v400 ledger заканчивается migration `0020`; файлы `0024_add_user_avatar.sql` и `0025_hybrid_invoice_matching_jobs.sql` присутствуют вне ledger и не доказывают состояние production DB.

## B. Deployment diff

Проверен diff `6cc90fc…` → `5109d9c…`. Ниже только deployment-compatibility surface.

| Class | Существенное изменение | Compatibility result |
|---|---|---|
| A. Frontend only | Новый startup/recovery UI, release metadata, reload/update handling, удаление browser bearer/localStorage auth | Само по себе schema-neutral |
| B. Backend behavior | Durable auth throttling, inactivity session policy, atomic generic-store writes, stricter validation | Требует новых DB objects |
| C. Auth/session | Cookie-only auth; legacy bearer больше не принимается; session exchange retired; `last_seen_at` читается/пишется | **FAIL без `0022` и `0024`** |
| D. API contracts | Mutating API требует client contract v1 | Старый v400 mutation получает fail-closed `426` до side effect |
| E. DB reads | Account/session reads включают `accounts.avatar_id` и `sessions.last_seen_at` | Объекты обязательны для authenticated bootstrap |
| F. DB writes | Auth buckets; session activity; CAS generic-store writes | **FAIL без `0022`/`0023`/`0024`** |
| G. Schema assumptions | Journal contract поднят с исторического `0020` до `0024` | Production application state не доказан |
| H. Migrations/runtime DDL | Request-path `ensureAuthSchema()` удалён; schema repair больше не выполняется приложением | `accounts.avatar_id` остаётся REQUIRED + UNKNOWN |
| I. Cache/PWA | Старые protected mutations блокируются contract gate | Data-safety PASS; требуется обновление клиента |
| J. External integrations | Invoice scan использует durable `invoice_recognition_jobs` | Этот path требует объект из `0021` |

### Data-write compatibility

| Path | New RC → v400 schema | Old v400 client → new RC |
|---|---|---|
| Purchases | Обычные reads проходят; invoice scan требует `invoice_recognition_jobs`; generic persisted writes зависят от `0023` | Mutation contract блокирует старый write с `426` |
| Write-offs | Representative read `200`; dedicated payload не вводит новых relational columns; доступ всё равно зависит от auth | Старый write блокируется `426` |
| Inventory | Не найден новый relational payload contract; authenticated path зависит от session schema | Старый write блокируется `426` |
| Tech cards | Generic-store write требует `domain_data.revision/mutation_id` | Старый `/api/store` write блокируется `426` |
| Sales | Dedicated mutation contract backward-readable; authenticated path зависит от session schema | Старый write блокируется `426` |
| Shifts | Dedicated mutation contract backward-readable; authenticated path зависит от session schema | Старый write блокируется `426` |
| Finance | Read `200` после diagnostic auth overlay; generic-store writes требуют `0023` | Старый `/api/store`/expenses write блокируется `426` |
| Employees | Read `200` после diagnostic auth overlay; generic-store writes требуют `0023` | Старый `/api/store` write блокируется `426` |
| Auth | Login/register/reset/bootstrap требуют `auth_rate_limits`; session insert/read требует `last_seen_at` | Legacy bearer ignored; cookie может быть использована только при наличии `0024` |
| Notifications | Новых notification schema objects в diff не найдено | Защищённый server endpoint не получает silent business mutation от stale client |

## C. DB assumptions

| Object | Required by RC | Known in production | Risk |
|---|---:|---|---|
| Baseline tables/columns from ledger `0000`–`0020` | Yes | Expected by exact v400 source; live state not verified | Historical confidence HIGH; P0-04 remains open |
| `accounts.avatar_id` | Yes, account selects/authenticated identity | **UNKNOWN**; v400 runtime could add it, but it was unledgered | Missing column can produce auth/account query `500` |
| `invoice_recognition_jobs` + PK | Yes for `/api/purchases/scan` | **UNKNOWN**; unledgered SQL existed in v400 source | Missing table breaks invoice scan with `500` |
| `invoice_recognition_jobs_updated_idx` | No for correctness; operationally expected | UNKNOWN | Performance/cleanup risk; table absence is the correctness blocker |
| `auth_rate_limits` | Yes for login/register/reset/bootstrap | Not present in reconstructed v400 schema | Immediate auth `500` on write |
| `auth_rate_limits_action_updated_idx` | No for basic correctness; expected with table | Not present in reconstructed v400 schema | Operational/performance risk |
| `domain_data.revision DEFAULT 1 NOT NULL` | Yes for CAS generic-store writes | Not present in reconstructed v400 schema | Write `500`; no partial successful mutation observed |
| `domain_data.mutation_id` | Yes for mutation/audit correlation | Not present in reconstructed v400 schema | Write/audit batch `500` |
| `sessions.last_seen_at` | Yes for session insert, select and activity touch | Not present in reconstructed v400 schema | Login and existing-session bootstrap `500` |

Новые migrations не добавляют новых critical FK. Critical existing account/workspace/venue membership relations относятся к baseline `0000`–`0020` и были воспроизведены. RC предполагает defaults `auth_rate_limits.request_count = 0`, `domain_data.revision = 1`, invoice job `status/created_at/updated_at`; отсутствие соответствующих migrations означает отсутствие самих defaults и объектов.

## D. Runtime DDL removal impact

В Sites v400 `lib/bardoctor/auth.ts` выполнял `PRAGMA table_info(accounts)` и request-path schema bootstrap `ensureAuthSchema()`. RC полностью удалил этот runtime DDL.

| Removed runtime operation | Исторический источник | Нужен RC | Classification | Вывод |
|---|---|---:|---|---|
| Add `accounts.password_hash` | Ledger `0008` | Yes | SAFE | В exact v400 historical ledger |
| Add `accounts.password_salt` | Ledger `0008` | Yes | SAFE | В exact v400 historical ledger |
| Add `accounts.password_iterations` | Ledger `0008` | Yes | SAFE | В exact v400 historical ledger |
| Add `accounts.owns_venue` | Ledger `0010` | Yes | SAFE | В exact v400 historical ledger |
| Add `accounts.account_kind` | Ledger `0014` | Yes | SAFE | В exact v400 historical ledger |
| Add `accounts.avatar_id` | Только unledgered `0024_add_user_avatar.sql` или runtime repair | Yes | **REQUIRED / UNKNOWN** | RC больше не может восстановить column; live production presence не доказано |
| `DROP INDEX IF EXISTS accounts_chatgpt_email_uq` | Runtime compatibility cleanup | Не schema-startup object | OPTIONAL | Не снимает блокеры обязательных columns/tables |
| `ensureAuthSchema()` bootstrap/caching | Request-path wrapper для операций выше | Нет, удалён | **REQUIRED / UNKNOWN impact** | Удаление безопасно только если все обязательные objects заранее существуют; это не доказано |

`CREATE TABLE` и `CREATE INDEX` для новых `0021`–`0024` request-path runtime repair в v400 не выполнялись. Следовательно, v400 не мог самостоятельно создать `auth_rate_limits`, `domain_data.revision/mutation_id` или `sessions.last_seen_at`.

Feature flag/fail-closed mitigation не делает zero-migration deployment приемлемым: отключение `0022`/`0024` либо ломает core login/session, либо отменяет security hardening; отключение `0023` выключает generic write surface, включая существенные рабочие модули. Это было бы серьёзным урезанием BarDoctor.

## E. Migration dependency map

| Migration | RC dependency | Production confidence | Status |
|---|---|---|---|
| `0000`–`0020` | Baseline app, venues, memberships, notifications, integrations | HIGH по exact v400 source; live ledger UNKNOWN | Historical baseline reconstructed |
| `0021_release_schema_contract` | `accounts.avatar_id` (broad account/auth reads); `invoice_recognition_jobs` (invoice scan) | LOW/UNKNOWN: похожие unledgered files были в v400, application не доказано | **REQUIRED object + UNKNOWN production state** |
| `0022_auth_rate_limits` | Login, register, reset-password, auth bootstrap | HIGH confidence absent from v400 source model; live state UNKNOWN | **REQUIRED; zero-migration login FAIL** |
| `0023_store_atomic_revision` | `/api/store/[key]` CAS write and audit atomicity | HIGH confidence absent from v400 source model; live state UNKNOWN | **REQUIRED; zero-migration write FAIL** |
| `0024_closed_mongu` | New session insert; existing session select/touch | HIGH confidence absent from v400 source model; live state UNKNOWN | **REQUIRED; zero-migration session FAIL** |

Ни одна migration не выполнялась в рамках STEP 1.6. Из-за P0-04 нельзя безопасно предположить, что `0021`–`0024` применены в production, и нельзя запускать `0021` вслепую: отдельные unledgered objects могли уже существовать.

## F. Auth/session compatibility

**FAIL**

- v400 уже устанавливал HttpOnly cookie `bd_server_session`; token hashing/cookie name совместимы.
- RC принимает только cookie, не принимает legacy bearer headers и возвращает `410` для retired `/api/auth/server-session` exchange.
- При наличии `sessions.last_seen_at` существующие sessions моложе 7 дней могут продолжить работу; более старые безопасно потребуют login.
- Без migrations этот безопасный путь недоступен: login/bootstrap падает на отсутствующем `auth_rate_limits`, а существующая cookie session — на отсутствующем `sessions.last_seen_at`.
- Следовательно, пользователю нельзя гарантировать ни сохранение авторизации, ни безопасный re-login; возможен server-error auth loop до schema correction.
- Logout в RC удаляет server session и cookie, но это не компенсирует невозможность login/bootstrap.

## G. PWA/backend compatibility

**PASS для stale-mutation data safety; FAIL overall из-за auth/schema dependency**

- Воспроизведён cached v400 request без `X-BarDoctor-Client-Contract` к protected mutation: `426 CLIENT_UPDATE_REQUIRED`, side effect не выполняется.
- Gate покрывает `/api/store`, purchases, inventory, write-offs, sales, shifts, expenses, equipment и nomenclature mutations.
- Поэтому старый client не может молча выполнить несовместимую business mutation против нового backend.
- Новый client содержит version/reload recovery. Старый client может потребовать ручное обновление/reload после `426`; это UX limitation, но не silent data corruption.
- Старые bearer headers игнорируются. v400 cookie остаётся единственным совместимым credential, однако без `0024` её обработка падает, как указано в разделе F.

## H. Zero-migration compatibility test

Historical schema: exact Sites v400 source `6cc90fc…`, migrations по его journal `0000`–`0020`, затем **максимально разрешающий** v400 superset: воспроизведены runtime auth repair (`avatar_id`, index cleanup) и unledgered invoice schema. Latest RC schema как база теста не использовалась.  
Confidence: **HIGH** для source reconstruction и доказательства отсутствия объектов `0022`–`0024` в v400 code path; **UNKNOWN** для фактического live production schema до P0-04.  
Result: **FAIL — ZERO_MIGRATION_INCOMPATIBLE**.

| Scenario | Result | Exact observation |
|---|---:|---|
| Root startup | PASS | HTTP 200 |
| Home shell | PASS | HTTP 200 |
| Health | PASS | HTTP 200 |
| Stale v400 mutation | PASS (fail-closed) | HTTP 426, `CLIENT_UPDATE_REQUIRED` |
| Login, no migrations | FAIL | HTTP 500, missing `auth_rate_limits` |
| Existing cookie session | FAIL | HTTP 500, missing `sessions.last_seen_at` |
| Nomenclature read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Suppliers read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Purchases read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Warehouse read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Finance read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Employees read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Write-off read | PASS after diagnostic-only auth overlay | HTTP 200 |
| Generic-store write | FAIL | HTTP 500, missing `domain_data.revision/mutation_id` |

Diagnostic overlays в тесте применялись только после фиксации каждого первоначального failure, чтобы обнаружить следующий обязательный dependency. Они не меняют zero-migration result и не обращались к production.

Startup compatibility: unauthenticated shell и health стартуют на v400 schema, но обязательный auth bootstrap/venue bootstrap не проходит. Поэтому application startup в пользовательском смысле не совместим без migrations.

## I. Regression

Tests: **1258/1258 PASS**  
Build: **PASS**  
Typecheck: **PASS**  
Lint: **PASS** (0 errors; 11 pre-existing warnings)  
Mobile: **PASS**  
Desktop: **PASS**  
Mobile/Desktop QA: **29/29 PASS** (iPhone 13, Pixel 7, desktop Chrome)  
Startup: **PASS** for current-schema recovery suite; zero-migration authenticated startup **FAIL** as detailed in H  
CI: **release-gate #25 GREEN** for RC `5109d9c…`.

## J. Production changes performed

**NONE**

Не выполнялись production deployment, migration, DDL, INSERT/UPDATE/DELETE, secret change или resource change. Production Sites version остаётся 400.

## K. Final verdict

**CANNOT PROVE SAFE WITHOUT PRODUCTION SCHEMA VERIFICATION**

## L. Exact blocker if unsafe

1. **Table `auth_rate_limits` — migration `0022_auth_rate_limits.sql`**  
   Routes: `/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`, `/api/auth/bootstrap`.  
   Failure: HTTP 500 before a safe login/re-login can complete.

2. **Column `sessions.last_seen_at` — migration `0024_closed_mongu.sql`**  
   Path: `issueSession()` insert and `sessionForRequest()` select/touch, including existing production cookie sessions.  
   Failure: HTTP 500; existing users cannot be guaranteed to remain authenticated.

3. **Columns `domain_data.revision` and `domain_data.mutation_id` — migration `0023_store_atomic_revision.sql`**  
   Route: `/api/store/[key]` PUT and its atomic audit batch.  
   Failure: HTTP 500 (`table domain_data has no column named revision` in the reconstructed v400 test); core generic writes cannot complete.

4. **Column `accounts.avatar_id` — migration `0021_release_schema_contract.sql` or removed v400 runtime DDL**  
   Paths: broad account selections/authenticated identity.  
   Production state: UNKNOWN because v400 could create it at request time, while it was not in the v400 migration ledger. After runtime DDL removal, RC cannot repair it.

5. **Table `invoice_recognition_jobs` — migration `0021_release_schema_contract.sql`**  
   Route: `/api/purchases/scan`.  
   Production state: UNKNOWN because an unledgered v400 SQL file existed; absence produces a route-level DB failure.

Exact release blocker is the unverified application state of required migrations `0021`–`0024`, with direct local failures for `0022`, `0023` and `0024`. Проверка live production schema/migration ledger (P0-04) обязательна до deployment или до разработки отдельного, idempotent и проверенного migration plan. P0-05 остаётся отдельно открытым и этим STEP не изменён.

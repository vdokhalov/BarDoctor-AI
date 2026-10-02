# BarDoctor — Independent Architectural GAP Audit after Phase 3A.1–3A.4

Дата: 2026-10-02. Production baseline: **Sites v474**, exact commit **`efdbae969272d72da6843a7cfbd193d872bfb0c4`**. Phase 3A.4 production smoke: **PASS по предоставленным данным**, повторный production smoke в этом аудите не выполнялся.

## 1. Executive Summary

**Phase 3A пока нельзя закрывать. Решение C: нужны несколько оставшихся remediation phases.** Foundation, Revenue, Captured Cost/Warehouse и Menu Ingestion уже образуют рабочий evidence graph. Основные оставшиеся проблемы — использование этих фактов агрегирующими потребителями, конкурирующие writers и происхождение закупочных/финансовых результатов. Это разрывы существующих связей, а не предложения новых функций.

Реестр содержит **18 уникальных GAP: P0 — 2; P1 — 11; P2 — 5; P3 — 0**. Один GAP может затрагивать несколько модулей; повторные упоминания в разделах не увеличивают счётчик. P0 обозначает воспроизводимый риск, а не утверждение о состоявшемся production-инциденте.

- **P0 G01:** Business Health/AI/recommendation-check читают домены без применения существующих source permissions. `analysis.run` или `tasks.view` не дают права на произвольные Finance/Payroll/Reviews данные, однако агрегирующий loader их читает.
- **P0 G02:** merge Google-отзывов использует индекс отфильтрованного массива как индекс полного массива. При смешанных manual/google записях обновление внешнего отзыва может перезаписать другую каноническую запись.
- **P1:** сводки теряют несколько смен одного дня, ФОТ из Operational Report и lifecycle расходов; AI принимает клиентские финансовые значения как авторитетные; Business Health выдаёт благополучные операционные показатели без чтения их canonical inputs. Дополнительно отсутствуют полноценные evidence-переходы от закупочной цены/оценки склада к закупке и от закрытого финансового результата к связанному набору входных фактов. Часть writers может потерять конкурентные canonical изменения.

**Рекомендуемый следующий подэтап:** **Phase 3A.5 — CANONICAL BOUNDARY & WRITER SAFETY**. Главная цель — обеспечить сохранность и корректные права доступа к уже существующей business truth. Он закрывает G01, G02, G09, G10, G11. Остальные P1 потребуют отдельных пакетов согласования потребителей и evidence происхождения результатов. Ни один пакет в этом аудите не начат.

### Метод и границы доказательства

Локальная рабочая копия имеет HEAD `b2498936899d74e9917345babd82450efe286409`; она **не использовалась как production baseline**. Exact production commit получен `git fetch origin <SHA>` и извлечён через `git archive` в `/tmp/bardoctor-gap-efdbae`, без переключения checkout. Все ссылки на source ниже закреплены на `efdbae…`, включая **фактически поставляемый frontend bundle** `public/assets/index-BQGspy0I.js`. Для Finance проверены завершающие переопределения функций, а не только более ранние legacy implementations внутри bundle.

Использованы статическое чтение source и вызовы существующих чистых функций на синтетических объектах в памяти. Не запускались production endpoints, migrations/backfill, deployment, build/publish или writers с базой данных. Application code не изменялся; создан только этот документ. Production rows, роли пользователей, фактическая полнота импортов и доступность конкретных внешних провайдеров не исследовались: их текущее состояние **UNKNOWN**. Source доказывает возможность конкретного поведения, но не частоту его возникновения у действующих клиентов.

`PROVEN` ниже означает подтверждённую source-связь и необходимые проверки, а не обязательное наличие всех данных у каждого заведения. `PARTIAL` означает существующий переход с неполным contract/coverage. `DISCONNECTED` — существующий источник не подключён к существующему потребителю. `DUPLICATED` — независимые пути могут менять одно значение business truth. `LEGACY` — ограниченный совместимый старый путь. `UNKNOWN` — source не доказывает заявляемую связь или operational completeness.

## 2. Current Proven Architecture

### Foundation

Business Facts — read-only projections, не дополнительная таблица business truth. Evidence Reference связывает namespace/venue, тип и stable record ID с revision/content hash. Resolver заново проверяет активные workspace/venue memberships, source permissions, существование и содержимое записи. Reference не является capability и не отменяет RBAC. Изменившийся контент не выдаётся за старую revision. Доступные bounded relations и честные `PARTIAL/UNKNOWN/UNAVAILABLE` — правильная архитектура. Источники: [S01], [S02], [S03].

### Revenue

`DAILY_REVENUE → FINANCE_REVENUE → CASH_SHIFT → SALE_EVENT` — **PROVEN**. Daily fact читает scoped canonical finance rows/events/documents, проверяет соответствие родителей и суммы, связывает content revision. Native event и Finance projection не являются двумя независимо редактируемыми источниками: generic mutation event-managed revenue запрещён. Closing shift не пересчитывает продажи. Operational Day умеет несколько successive cash shifts, `PROVISIONAL/FINAL`, payment breakdown и отдельную готовность operational data. Источники: [S04], [S05], [S06], [S07].

### Cost / Warehouse

`SALE_EVENT → CAPTURED_COST → MENU/RECIPE → INGREDIENT/NOMENCLATURE → WAREHOUSE_MOVEMENT` — **PROVEN** в границах Phase 3A.3. Captured line/ingredient cost фиксируется при posting; текущая рецептура или закупочная цена не переоценивает историю продажи. Original movement snapshots позволяют bounded evidence при отсутствии строки в активном movement store; конфликт не скрывается. Historical cost уже участвует в действующем Finance reconciliation, включая reversals и inventory adjustments. Источники: [S08], [S09], [S10], [S62].

### Menu / Ingestion

`MENU_ITEM → MENU_INGESTION_DRAFT → MANUAL/SCAN/IMPORT → REVIEW/VALIDATE/CONFIRM → CANONICAL MENU ITEM → RECIPE` — **PROVEN** в заявленных границах. Есть draft ID/revision, confirmation audit, validation/content binding, scoped source-file metadata и source permissions. Current menu/recipe — текущая definition; captured sale snapshot — историческое использование definition. Источники: [S11], [S12].

**Незакрытый вопрос находится дальше или сбоку этих графов:** кто использует доказанные факты, как фиксируется состав входов агрегата, как закупочная receipt evidence связывается с source document и кто может изменить те же stores альтернативным writer.

## 3. Domain Inventory

### Scope conventions

**V** = selected active venue → unique `venues.dataAccountId` → `domain_data(account_id, store_key)`. **W** = workspace и membership control plane. **A** = actor identity account. В authenticated domain context `account.id` — data owner selected venue, а `actorAccountId` — человек. Это принципиальное различие: account-scoped domain store часто уже является venue-scoped. [S13], [S14].

Все модули в таблицах существуют в exact source. Operational Day и Nomenclature — реальные domain models, даже когда не имеют отдельной самостоятельной таблицы/экрана. Team Employees не тождественны login accounts/memberships.

### Canonical stores, writers, readers и связи

| Модуль | Canonical source of truth | Существенные writers | Readers / derived read models | Boundary и связи |
|---|---|---|---|---|
| Home | Собственных финансовых facts нет: profile, Finance/report, Business Health и canonical Reviews | Home не пишет итоговую оценку; underlying domain writers | Shared Business Health snapshot/cache; Finance cards; Google-only home reviews | V; Finance, Health, Reviews, notification entry points. [S15], [S16], [S34], [S55] |
| Business Health | Входные domain stores; score — derived, не отдельная truth | Нет writer оценки: GET вычисляет snapshot | `buildBusinessIntelligenceFromVenueContext`, `buildBusinessHealthSnapshot`; Home/AI | V; фактически summary pipeline, не evidence facts pipeline. [S15]–[S18] |
| AI Doctor | Domain facts; diagnosis `bd_ai_diagnosis_v3…v9`, tasks/plans/decisions — отдельные outputs | Diagnosis handler, task/decision store writers; diagnosis также вызывает due GBP sync | Venue AI context, external diagnosis context, memory, deterministic intelligence, outcome checks | V; source permissions не прокидываются в loader; все доменные сводки. [S19], [S20], [S21], [S23] |
| Sales / POS | `bd_sales_events_v1`; для document/import flow — `bd_sales_documents` + `bd_sales_batches` | `/sales-events`, `/sales/confirm`, batch/import/post/reverse; Integration Hub delegation | Revenue/cost facts, Finance history; sale-event documents projection; assortment analytics читает только document representation | V + explicit event venue; Menu, mappings, stock, Finance, cash shifts. [S06], [S07], [S10], [S38] |
| Cash Shifts | Event-managed `bd_finance_revenue` rows, referenced `cashShiftId/revenueRowId` | Sales event lifecycle open/close; generic edits защищены | Shift UI, Daily Revenue, Operational Day, cash/payment totals | V; stable shift links, businessDate; Sales/Finance. [S04]–[S07] |
| Operational Day | Read model над revenue/events/documents + `bd_operational_reports_v1` | Day не пишется; `/shifts/close` пишет separate operational report и связанные данные | `operationalDay(s)`, shared Finance rows; Health loader эту модель не использует | V + businessDate; cash-shift finality и operations completeness независимы. [S05], [S24] |
| Finance | `bd_finance_revenue`, `bd_finance_expenses`, settings, month closings; canonical purchase/cost inputs | Event/document projection writers, expenses API/store, purchase payments, work-order expenses, month close/reopen | Effective layered monthly report, historical reconciliation; отдельная AI finance summary | V; Sales, Payroll, Purchases, Equipment, Warehouse. [S10], [S25]–[S27], [S55] |
| Warehouse | Movement ledger `bd_stock_movements`, assortment stock-balance projection, inventory/write-off docs/snapshots | Purchase lifecycle, sale post/reverse, inventory count, write-off, integration stock measurement/returns | Balances, current receipt valuation, procurement integrity, cost evidence | V + warehouse/product identity; stock cannot be changed через ordinary assortment PUT. [S08], [S26], [S28]–[S30] |
| Purchases | `bd_purchase_documents`; confirmed document + item/source line IDs | Scan creates draft/source files; confirm/update/cancel lifecycle; payment API; integration delegation | Inventory receipts, supplier totals, purchase/payment reports, AI procurement summary | V; Supplier, Nomenclature, files, stock, Finance. [S28], [S31], [S32] |
| Suppliers | `bd_suppliers`; supplier-product mappings в assortment | Supplier/reference store management, integration supplier writer; confirm требует existing active supplier | Purchases, mappings, supplier balance/turnover projections | V; supplier ID retained; aliases/names не canonical nomenclature identity. [S28], [S33], [S39] |
| Menu | `bd_assortment_v1.menuItems` | Generic guarded assortment metadata writer; ingestion confirm; product/integration paths | Sales routing, recipes, menu-origin evidence, assortment analytics | V + explicit identity validation; no independent menu-cost truth. [S11], [S26], [S38] |
| Recipes / Tech Cards | Current recipes/techCards в assortment; captured snapshots для past sale use | Assortment reconciliation, lifecycle/ingestion confirmation, integration recipe writer | Consumption resolver, cost capture, current menu-cost projections | V + menu/nomenclature stable links; current и historical roles различаются. [S08], [S26], [S38], [S39] |
| Nomenclature | Assortment stock product identity/base unit, normalized canonical product key | Product/reference lifecycle, confirm receipt matching, integration product writer | Recipe ingredients, receipt basis, balances, mapping/valuation | V + product/warehouse; supplier names и packaging hints не identities. [S29], [S33], [S39] |
| Menu ingestion | `bd_menu_ingestion_v1` drafts + source metadata/files + confirmation audit | Manual/scan/import, review/validate/confirm CAS lifecycle | Ingestion editor, menu-origin fact/resolver | V; confirmed outputs canonical assortment, не второй editable menu. [S11], [S12] |
| Payroll / Salaries | `bd_payroll_rules`, `bd_payroll_entries`; saved shift staffing/payrollBreakdown in Operational Report | Rules/entries store writers; shift report close; employee rule assignments | Salaries live accrual model, payments/bonuses/deductions, captured shift Finance FOT | V; Employee, Operational Day, Finance; current-rule и saved-breakdown semantics расходятся. [S24], [S25], [S56] |
| Team / Employees | `bd_employees`; photo records/storage | Guarded team store writer, photo routes, integration employee writer | Roster, shift staffing, payroll | V; employee IDs, но login/membership control отдельно W/A. [S25], [S39] |
| Equipment | `bd_equipment`, history, `bd_equipment_work_orders` | Equipment management, dedicated work-order writer; optional synced expense | Equipment UI/history; finance-linked costs; AI body operational equipment; Health не загружает failures | V; equipment/work-order → expense links. [S35], [S36] |
| Incidents / Tasks / Decisions | `bd_cases`, events/tasks/action plans/tasks/decisions | Guarded domain store paths, AI outputs / user decisions | Operations UI, AI memory, notifications; Health canonical cases не читает | V, actor permission; existing equipment/incident loops. [S19], [S25], [S46] |
| Reviews / Reputation | `bd_guest_reviews` canonical review layer | Manual/import/sync, owner reply/analysis annotations, sync triggered by diagnosis | Review layer summaries, Google-only Home, all-source AI/Health aggregates | V + source/external ID; provider location не сохранён на review. [S34], [S37], [S40]–[S42] |
| Google Business Profile | Review source connection, encrypted provider credentials/account/location; reviews в canonical review layer | OAuth/connect/select-location/sync/disconnect | Source status, Google fetch, Home reviews, external diagnosis reviews | Connection по V dataAccount; selected Google location mutable. [S40], [S41] |
| Integrations / 1C/POS contracts | Integration connection, mapping/entity link, sync run/item/ingress stores + resulting domain stores | Ingest/import/retry/local connector; domain writer или lifecycle delegation | Integration Hub, sync status, mappings; resulting business facts | V + dataAccount explicit SQL boundary; W/membership verified for service writer. [S39], [S43], [S44] |
| Notifications | Actor prefs/devices/history + jobs; underlying business facts остаются в domains | User preference API, trigger/scheduler/job dispatch | Notification UI; venue-labelled domain alerts | A для delivery; domain triggers V/membership/permissions. [S45], [S46] |
| Reports | Canonical underlying domain facts; `bd_month_closings` фиксирует saved month result | Client close wizard via guarded store; explicit reopen; inventory snapshot lifecycle | Monthly/open reports, closed snapshot, Finance reconciliation, Home/AI closed month | V/month; closed snapshot — frozen result, но input manifest отсутствует. [S10], [S27], [S55] |
| Calendar / Opportunities | `bd_opportunity_calendar_v1`; event IDs, user decisions, source URLs | Opportunities generate/edit/calendar save; scheduling delivery | Calendar, AI seasonality/events, reminder jobs | V для event facts, A для recipients; внешние sourceUrls не Resolver proof. [S47], [S48] |
| Competitors / Market | `bd_market_analysis_v1` confirmed candidates/context; legacy `accounts.competitorsJson` fallback | Market generation/edit/confirm; older competitor refresh | Market view; merged AI competitors list | V profile/dataAccount; name-based legacy dedup, no universal provider fact identity. [S20], [S49] |
| Multi-venue / workspace | `workspaces`, `venues`, workspace/venue memberships; unique venue data account | Workspace/venue/membership management; owner reconciliation | Authentication, source authorization, selectors, integrations | W/A control plane → V business namespace. [S13], [S14], [S50] |

### Identity, revision, Evidence support и объяснимость

`updatedAt`, audit ID, payload hash и content revision не считаются взаимозаменяемыми. Generic store CAS связывает JSON+updatedAt при записи; это не автоматически Evidence Reference каждого бизнес-факта.

| Модуль | Stable IDs | Revision/content identity | Evidence Adapter/Resolver support | Можно объяснить ключевую цифру/состояние? |
|---|---|---|---|---|
| Home / Business Health | Venue + derived snapshot ID | Snapshot identity включает generatedAt/calculationVersion/period, не input content hash | Собственного metric adapter нет; downstream Revenue facts существуют, но UI result не связывает refs | Частично формула/source block; нельзя resolver-доказать полный score/input set. G03/G04/G06 |
| AI Doctor | Diagnosis/task/decision IDs; metric IDs в outcome contract | Context/schema version и timestamps, не source input manifest | Recommendation target/baseline — metric metadata, не factRefs | Recommendation → metric частично; metric → fact отсутствует в общем случае. G01/G05 |
| Sales / Cash Shifts | Event, batch, revenue row, shift IDs | Scoped content revision in resolver; captured snapshots; CAS lifecycle | SALE_EVENT, CASH_SHIFT, FINANCE_REVENUE + DAILY_REVENUE | Да в proven native chain; imported/legacy source coverage честно bounded |
| Operational Day | Venue/date composite; operational report ID | Derived per-read; report write identity/idempotency | Daily revenue имеет scoped support; OPERATIONAL_REPORT только reserved kind | Revenue объясним; весь payroll/staffing/incident outcome ещё не общий evidence fact |
| Finance / Reports | Revenue/expense/closing IDs | Closed snapshot protected; generic store CAS; no closed-result input hash/manifest | Revenue да; expense, monthly result, taxes/utilities/payroll no general adapter | Revenue/captured COGS да; полный finalProfit/FOT/expense result — частично, G04/G07 |
| Warehouse | Movement/document/product/warehouse IDs | Sale movement/content binding да; balance projection no complete input revision | Movement supported в bounded cost graph; stock valuation/balance fact отсутствует | Sale consumption да; текущая valuation/quantity до acquisition/count/opening inputs — частично, G08 |
| Purchases / Suppliers | Document/item/supplier/external/idempotency IDs | Confirm lifecycle CAS/audit; files/recognition metadata, no purchase evidence revision | PURCHASE_DOCUMENT reserved, не dispatch adapter; supplier adapter нет | Приход→documentId существует; resolver transition до purchase/supplier/file отсутствует. G08 |
| Menu / Recipes / Nomenclature | Menu/recipe/ingredient/product stable IDs | Current content bound in menu/cost graph; past capture separately | MENU_ITEM, MENU_ORIGIN, draft/source relations; ingredient/nomenclature bounded cost nodes | Да в закрытых контурах; не обещана любая historical current-definition revision |
| Menu ingestion | Draft/item/source file IDs | Draft revision, validation hash, confirm audit/content binding | Да в Phase 3A.4 | Да в заявленном confirmation/source contract |
| Payroll / Team | Employee/rule/entry/report IDs | Saved breakdown vs live rules; store CAS not rule snapshot manifest | PAYROLL_ENTRY / OPERATIONAL_REPORT reserved only; employee adapter нет | Settlement записи видны; единая basis identity начисления отсутствует. G04/G14 |
| Equipment / Incidents / Tasks | Equipment/work-order/expense/case/task IDs | History/audit/store timestamps; no common source content binding | Специальных adapters нет | Cost relation частично, mutable с обеих сторон; failures counts Home не доказаны. G06/G10 |
| Reviews / GBP | Review ID, source, externalId; legacy missing-ID rows can get UUID on read | Dedup key/updatedAt/annotations; no immutable provider content revision/location binding | REVIEW reserved only | Текст/автор/source видны; canonical merge/aggregate/provider-origin нарушены G02/G11/G12 |
| Integrations / 1C/POS | Connection/run/item/entity link/external IDs | Ingress payload_hash, idempotency/run status; no unified evidence revision | INTEGRATION_EVENT reserved only | Technical import status да; run→resulting domain revision частично. G18 |
| Notifications | Device/job/history/dedupe IDs | Delivery lifecycle timestamps; underlying fact revision обычно не retained | Нет общего notification metric adapter | Почему отправлено частично по trigger/source ID; финансовые значения не являются отдельной canonical truth |
| Calendar / Market / Competitors | Event/candidate IDs/keys; legacy competitor name/source key | location signature/generatedAt/sourceUrls; no evidence content binding | Нет | Внешняя ссылка/confirmation объясняет намерение; authoritative external fact не доказан. G16 |
| Workspace / Membership | Relational primary IDs | Active memberships/status and permissions rechecked live | Evidence foundation uses authoritative scope/RBAC | Да для tenant authorization; не business numeric adapter |

Наличие entity type в `integrations/contracts.ts` подтверждает **контракт в source**, но не live capability каждого 1C/iiko/Poster/R-Keeper adapter. Конкретный connection/runtime capability без его конфигурации — `UNKNOWN`. Equipment, Payroll, Employees, Calendar, Competitors действительно существуют; вымышленных модулей в inventory нет.

## 4. Domain Connection Map

Каждая строка описывает отдельную стрелку. Классификация business write transition и evidence/read transition может различаться: отсутствие adapter не означает отсутствие бизнес-связи.

| Стрелка | Класс | Source evidence / граница |
|---|---|---|
| Membership → selected Venue → dataAccount | PROVEN | Active membership auth и unique dataAccount [S13], [S14] |
| Business Fact → Evidence Reference → live-authorized Resolver | PROVEN | Binding/dispatch/source authorization [S01]–[S03] |
| Daily Revenue → Finance Revenue | PROVEN | Scoped revision, consistency checks [S04] |
| Finance Revenue → Cash Shift → Sale Event | PROVEN | Stable parent IDs, event-managed protection [S06], [S07], [S26] |
| Sale Event → Captured Cost → recipe/ingredient snapshot | PROVEN | Snapshot hash/content and cost decomposition [S08], [S09] |
| Captured ingredient → Nomenclature → Warehouse movement | PROVEN | Scoped bounded cost nodes and origin/compensation movement [S09] |
| Menu Item → ingestion draft/source → confirmed item/recipe | PROVEN | Validation/revision and confirmation audit [S11], [S12] |
| Supplier → confirmed Purchase | PROVEN | Active supplierId mandatory, confirmed doc retained [S28] |
| Confirmed Purchase item → Nomenclature → receipt movement | PROVEN | Matching blocker, product/source line and document IDs [S28], [S29] |
| Receipt movement → Last Purchase Price basis | PROVEN | Deterministic latest confirmed receipt asOf/unit/currency [S30] |
| Last Purchase Price → resolver → Purchase/Supplier/source document | PARTIAL | SourceDocumentId/LineId есть, но cost movement node не создаёт acquisition relations; PURCHASE_DOCUMENT не dispatch supported [S03], [S09], [S30]. G08 |
| Purchase → stock balance projection | PROVEN | Quantity change + receipt and CAS stores [S28], [S29] |
| Stock valuation/balance → all contributing acquisitions/counts/opening | PARTIAL | Valuation DTO drops receipt identity; quantity projection no input manifest [S29], [S51]. G08 |
| Invoice recognition/matching → canonical confirmed purchase | PROVEN | Draft/source files retained; requiresReview blocks; stable line matching before confirm [S28], [S32] |
| Recognition source file → resolver-bound purchase provenance | PARTIAL | Business file IDs retained, no purchase/file evidence traversal [S03], [S31], [S32]. G08 |
| Purchase → payment → Finance expense | PROVEN | Linked payment lifecycle/stable IDs; generic purchase-linked expense edit blocked [S26], [S31] |
| Receipt basis → current recipe/menu analytics cost | PARTIAL | Overview passes movements [S61]; AI `summariseMenu` omits movements and invokes compatibility purchase path [S17], [S38]. G13 |
| Sale Event/captured history → effective Finance COGS | PROVEN | Server reconciliation + effective production bundle wrappers [S10], [S55] |
| Sale Event → existing item/menu sales analytics | DISCONNECTED | POS route persists embedded batch in event, not docs/batches; analytics consumes only docs/batches; projection exists but not passed [S07], [S38], [S52]. G13 |
| Document/import sale → Finance revenue & document/batch analytics | PROVEN | Legacy/document writer reused by integration; analytics direct inputs [S38], [S44] |
| Legacy/manual revenue → Daily Revenue source detail | LEGACY | Explicit manual summary/unverified, не forged sale linkage [S04], [S05] |
| Operational Day → multiple Cash Shifts / Sales / Finance | PROVEN | businessDate, source/finality/payment/consistency and cashShifts[] [S05] |
| Operational Report payroll → Finance effective monthly report | PROVEN | `/api/operational-days` возвращает report; shared `Ur()`/`bdOperationalRows` joins report один раз на день [S24], [S57], [S60] |
| Operational Report payroll → server AI/Health finance summary | DISCONNECTED | Loader reads raw bd_finance_revenue and row.payrollBreakdown, no report join [S17], [S24]. G04 |
| Multiple shifts/day → Health/AI demand daily | PARTIAL | Projection strips IDs/finality; byDate.set overwrites rather than sums [S17], [S18]. G03 |
| Expense lifecycle → Finance UI report | PROVEN | Effective report excludes voided/reversed entries [S55] |
| Expense lifecycle → AI/Health current financial result | PARTIAL | Filter excludes void/cancelled/draft, not voided/reversedAt [S17]. G04 |
| Finance report → protected closed-month snapshot | PROVEN | Explicit close/reopen and immutable closed-result guards [S27], [S55] |
| Closed-month result → source revisions/facts → Resolver | PARTIAL | Client scalar snapshot persists; writer only closing-store CAS; no input manifest/server verification [S27], [S55]. G07 |
| Current payroll rules → Salaries accrual | PROVEN | Live rule calculation [S56] |
| Salaries accrual ↔ saved shift payroll basis | PARTIAL | Current-rule recomputation and saved breakdown not tied by rule revision [S24], [S56]. G14 |
| Equipment work-order cost ↔ Finance expense | DUPLICATED | Optional syncExpense; independent generic finance edits, no equipment-linked guard [S26], [S35], [S36]. G10 |
| Canonical cases/equipment/open shifts → Home Health operations | DISCONNECTED | BH calls without operationalInput; counters sourced only body/calendar/equipment/cases [S15], [S18]. G06 |
| Provider Google review → canonical review stable identity | PARTIAL | IDs exist but external-index merge corrupts another row [S37]. G02 |
| Google selected location → per-review provider location | DISCONNECTED | Review sourceMetadata only provider; connection rebind does not partition prior reviews [S40], [S41]. G11 |
| Canonical Reviews → Google-only Home aggregate | PROVEN | Explicit source filter and shared canonical review summary [S34] |
| Canonical Reviews → all-source AI aggregate | PARTIAL | Raw helper converts null rating to 0; differs from canonical/Health [S20], [S34]. G12 |
| Review aggregate → Health/AI source evidence | PARTIAL | No REVIEW dispatch; numeric summary loses review revisions [S03], [S17], [S20]. G12/G05 |
| Health metric → evidence string → fact reference | PARTIAL | Evidence is explanation strings; snapshotId timestamp-based, no factRefs [S16], [S18]. G05/G07 |
| AI recommendation → outcome metric | PARTIAL | Stable metric metadata and real evaluator есть, но input provenance/source permission absent [S21], [S23]. G01/G05 |
| Canonical server data ↔ client AI finance body | DUPLICATED | Request recentDaily/monthToDate replaces stored values independently [S17], [S19]. G05 (duplicate input authority, не второй persisted ledger) |
| Guarded lifecycle writer ↔ direct integration/expense/review writer | PARTIAL | Same JSON stores, unconditional last writer can override earlier CAS commit [S22], [S25], [S31], [S39], [S42]. G09 |
| Ingress external ID/hash → sync result → domain write | PROVEN | Idempotent sync and entity mappings, domain scope checks [S39], [S43], [S44], [S58] |
| Integration run/item → exact resulting BusinessFact revision | PARTIAL | Execution identifiers/hash not result evidence binding; adapter reserved only [S03], [S43]. G18 |
| Competitor market result ↔ accounts.competitorsJson | LEGACY | Merge of canonical first + legacy by name/source; identity equivalence not guaranteed [S20], [S49]. G16 |
| Calendar/sourceURLs → AI external-context provenance | PARTIAL | Context/source links retained, no fact revision resolver [S47], [S48]. G16 |
| Business event → venue-scoped notifications → actor delivery | PROVEN | Membership/permissions per category; venue labels and dedupe [S45], [S46] |
| Supported contract entity → actual live provider completeness | UNKNOWN | Source describes capabilities; active connection/provider rows не проверялись [S43] |

Фактическая длинная цепь acquisition → product → receipt → price → recipe → captured sale → Finance существует. Она **не полностью disconnected**. Незавершены её acquisition evidence side и переход Finance/Operations facts → агрегирующие потребители. Нельзя объявлять повторным GAP уже доказанный Captured Cost.

## 5. Business Health Findings

### Откуда берутся ключевые метрики

| Метрика/состояние | Реальный source и calculation | Тип и evidence состояние |
|---|---|---|
| Закрытый revenue/finalProfit/margin/FOT, сравнение месяцев | `summariseClosedMonths` читает protected `bd_month_closings.snapshot.*`, выбирает latest/previous | Frozen canonical reported result → derived comparison; closing ID/input revisions теряются [S17], G07 |
| Текущие revenue/receipts/guests/averageReceipt | Raw finance rows; date/timezone selection; summary arithmetic | Derived; native origin proven separately, здесь refs не сохранены [S17], G03 |
| Текущие payroll/expenses/preliminary result | Raw row payrollBreakdown + payroll expenses + bonuses; revenue − expenses | Independent derived calculation; отдельный operational-report join отсутствует, lifecycle расходов отличается [S17], G04 |
| Demand: сопоставимые дни, traffic/check contribution | `recentDaily` → `normaliseDailyMetrics` → weekday baseline/aggregates | Derived, byDate loses multiple rows; no finality/business-day completeness [S18], G03 |
| Finance zone (weight 40) | Closed profit/margin, comparison и preliminary signals, threshold policy | Derived score, не дополнительная financial truth [S18]; input provenance G04/G07 |
| Demand zone (weight 20) | Revenue/check/guest changes относительно comparable baseline | Derived score; используется summary, не DAILY_REVENUE fact [S18], G03 |
| Operations zone (weight 25) | 90 minus penalties for unclosed shifts, stock anomalies, blockers, recurring equipment failures | Stock partly store-derived; остальные counts только `operationalInput`. На BH GET этот input отсутствует [S15], [S18], G06 |
| Guests zone (weight 15) | All-source review avg, negative share, topics count≥2 | Derived. BH без external diagnosis enrichment не получает те же topics, AI helper имеет иной null semantics [S17], [S20], G12 |
| Overall score/status | Weighted available components; requirement finance + enough components; severe issue caps | Derived policy correct as policy; неверный или непрочитанный input может влиять на итог [S18] |
| Data Quality / confidence / freshness | Availability and block freshness, fresh/aging/stale weighting; available sources separate from business score | Неполнота отделена от business status корректно. Store updatedAt не подтверждает freshness каждого source fact [S16]–[S18] |
| Priority action | Derived from deterministic issue/zone + predefined module target | Ссылка на модуль, не evidence reference конкретной исходной записи [S16] |

### Конкретные оставшиеся GAP

**G03:** Revenue fact понимает несколько cash shifts/day, но Health daily model не агрегирует их: `Map.set(date, row)` сохраняет только последний. Это влияет на MTD из normalized daily, baseline и demand; `currentFinancialPeriod` параллельно может содержать сумму всех raw rows. Уже в одном ответе два derived total могут расходиться. `recentDaily` отбрасывает row ID, source, currency/finality/consistency; название `comparableCompletedShiftWindows` не означает фильтрацию `FINAL`: фактически только date≤today. [S17], [S18].

**G04:** отделение operational report от Finance revenue было корректным изменением. Effective Finance frontend объединяет stores через `/api/operational-days` и shared `Ur()`/`bdOperationalRows`, но серверный AI/Health loader читает только raw revenue. Поэтому записанный ФОТ в `bd_operational_reports_v1` может стать нулём в Health preliminary result. Voided expense одновременно может остаться учитываемым в этой сводке. Finance UI применяет `bdMonthlyCurrencyPartitionV320`, тогда как summary суммирует raw amounts без эквивалентной currency partition: при сохранившихся foreign/unconverted rows возможен иной итог. Наличие таких production rows не установлено. Это существующие contract/missed-join разрывы, не требование нового Payroll module. [S17], [S55], [S57], [S60].

**G06:** source counters equipment/cases/unclosed shifts не загружаются BH endpoint. Отсутствующий `operationalInput` превращается в пустые массивы и далее 0, operations score=90, confidence=high и текст «не зафиксировано». Данные не были проверены, однако сформулирован вывод об отсутствии проблем. Существующий AI handler принимает эти же inputs из body — Home и AI способны оценить одинаковое заведение по разным данным. Это опаснее обычного честного UNKNOWN.

**Evidence traversal:** от отдельного revenue можно открыть proven Daily Revenue, но от Health metric нет scoped input manifest/factRefs. Число Health может быть вычислено из source, который Resolver вообще не поддерживает (monthly result, payroll/expenses, review aggregate), или быть incorrect projection уже supported facts. Strings в `component.evidence` — объяснение, не `EvidenceReference`.

**Period/stale/snapshot:** timezone используется для today в summary, но retained rows не несут весь OperationalDay contract. Snapshot имеет venue, period, generatedAt, calculationVersion; это current view identity, не historical replay guarantee и не hash состава входов. HTTP `private,no-store` и клиентский venue-keyed cache корректны. Snapshot freshness based on block timestamps не даёт доказательства, что неизменившийся закрытый месяц или provider review dataset свежи только потому, что обновился store. Историческое хранение Health snapshots никогда не требуется этим аудитом.

## 6. AI Doctor Findings

AI получает **производные summary**, а не полный набор canonical Business Facts/Evidence References: profile/location/schedule, performanceHistory, closed/current Finance, menu/recipe sample, purchases/stock summary, reviews/market/calendar, плюс memory и request body. Stable operational records внутри samples иногда есть; это не общий metric→fact contract. Server deterministic intelligence явно объявлен authoritative в prompt. [S17], [S19], [S20].

**G01 — права:** общий loader выбирает все domain stores по dataAccount, не применяя `canReadStore`. Endpoint `analysis.run` и outcome endpoint `tasks.view` проверяют feature permission, но не права исходных Finance/Payroll/Reviews stores. Значит ordinary store API и Evidence Resolver могут законно отказать тому же actor, а summary endpoint раскрыть denied numeric content. Это source-RBAC gap внутри правильного tenant namespace, не доказанный cross-tenant SQL leak.

**G05 — trusted input:** `request.finance.recentDaily` при непустом массиве заменяет stored rows; `monthToDate.revenue/payroll/expenses/result/...` overrides принимаются напрямую. Обычный diagnosis body может заменить факты сервера без revision/source selection/conflict status. Наличие требуемого profile не связывает эту financial body со scoped canonical inputs. Клиентские аналитические inputs могут быть допустимым контекстом, но здесь они приобретают статус authoritative deterministic numbers.

**Recommendation provenance:** есть реальные targetMetric/baselineMetric IDs, period, observedAt и outcome evaluator — не нулевая архитектура. Но `recommendation → metric` metadata не превращается в `metric → source fact revisions`; summary schema version не заменяет content identity. Recommendation может назвать цифру, ссылаться текстом на модуль или sourceURL, но общий resolver-валидируемый evidence путь для этой цифры не обеспечен. G05; для закрытого результата также G07.

**Возможные противоречия:** raw Finance current payroll vs shared Finance report; multiple-shift daily vs raw current-period sum; AI request overrides vs stored values; AI null-rating aggregate vs review/Health aggregate; legacy-only menu sales analytics vs native revenue/captured cost. Это G03/G04/G05/G12/G13, а не повод перепроектировать весь AI Doctor.

Отдельно: `loadDiagnosisExternalContext` вызывает due Google sync. Diagnosis — не строго read-only операция с точки зрения существующего product lifecycle: он может обновить reviews перед использованием. В этом аудите такой handler не вызывался. Повторять эту механику как GAP само по себе не нужно, но она расширяет обычный trigger G02/G09.

## 7. Purchase/Supplier/Warehouse Findings

**Purchase canonical — да.** Confirmed `bd_purchase_documents` имеет stable document/item IDs, selected venue, supplierId, document number/date, external source/idempotency, source files и payment links. Confirm требует active existing supplier, review/validation/matching, сохраняет mapped canonical nomenclature. Подтверждение не просто меняет цифру остатка: создаётся receipt movement с productKey, warehouse, quantity/base unit, cost/currency, sourceDocumentId/sourceLineId. Stores записываются guarded CAS batch; retries/idempotency существуют. [S28]–[S33].

**Last Purchase Price имеет источник в source.** `latest_confirmed_receipt` выбирается по effective date/asOf, stable ordering, unit/currency/active receipt. Backdated confirmation не обязана становиться «последней» ценой. Manual/reference catalogue price не используется как receipt costing truth. [S29], [S30], [S53].

**G08:** стоимость может вернуть document/line scalars, но acquisition graph не доведён до общего Evidence contract. `WAREHOUSE_MOVEMENT` cost node показывает receipt source IDs, но не resolve relation к PURCHASE_DOCUMENT, supplier и source file. PURCHASE_DOCUMENT kind в foundation зарезервирован и не supported dispatch. Current valuation DTO сохраняет quantity/status/value/currency, но не выбранную receipt identity. Aggregate balance quantity — projection; нет одного scoped balance fact, перечисляющего quantity contributors (receipt, consumption, count, adjustment, write-off, opening). Владелец может увидеть current value без возможности resolver-доказать acquisition basis и состав quantity. Наличие document ID — полезная частичная provenance, а не COMPLETE evidence.

**Invoice recognition/matching:** source files/R2 IDs сохраняются на draft, confirmed items сопоставляются с nomenclature, review-required блокирует confirmation. Бизнес-переход существует; полностью disconnected OCR→purchase не доказан. Недостаёт evidence identity/traversal существующего source→confirmed document/line. Аудит не требует хранения всех исходных OCR вариантов или точного исторического byte snapshot там, где это не обещалось.

**Parallel representations:** purchase source currency/original amount, accounting amount/FX, package quantity и base-unit price имеют разные смыслы и не автоматически дубликаты. Supplier-product alias/mapping — lookup, не второй товар. `lastPurchasePrice`/inventoryValue fields в balance — current receipt projection/compatibility metadata. Purchase payment — cash settlement, не повторный COGS факт. Generic confirmed purchase edits и linked payment edits защищены.

**G17:** AI procurement spend sample отдельно группируется по normalized display name, суммирует quantities разных packages и перезаписывает `lastPrice` при проходе newest-first документов; последнее посещение может быть старым документом. Это contextual price summary, а не `latest_confirmed_receipt`. Severity P2, поскольку source не использует этот summary для canonical posting/captured cost; но AI не должен путать его с last acquisition basis.

**G15:** confirmed purchases prepend movements и режут store до 20 000 строк. Если last valid receipt редкопокупаемого продукта выбывает, current resolver basis может перейти в UNKNOWN при существующем balance. Captured sale сохраняет originalMovements и не теряет уже доказанную cost identity автоматически. Долговечность current acquisition evidence требует retention contract; production достижения cap не установлено.

## 8. Operational Day/Shifts/Finance Findings

| Проверяемая семантика | Что уже есть | Оставшееся ограничение |
|---|---|---|
| businessDate/timezone/overnight | Event с cashShift наследует businessDate смены; standalone date вычисляется в venue timezone | Summary сохраняет date, но теряет explicit business-date/source/finality context. G03 |
| Несколько смен за business day | Successive shifts allowed; одновременно open cash shift scoped; OperationalDay cashShifts[] | Health daily map хранит одну строку на date. G03 |
| Open/provisional/final | OperationalDay различает revenue finality и operations completeness | Comparables не проверяют FINAL/COMPLETE; закрытая касса не доказывает заполненный ФОТ. G03/G06 |
| Cash vs external card | Sale payments и DailyRevenue payment facts есть | Это не доказательство эквайрингового settlement/bank arrival; такого promise source не содержит |
| Expenses вне Sales | Native canonical expense rows/API, currency/permission/month controls | Lifecycle/period totals в AI summary и effective Finance отличаются. G04; expense evidence no general adapter G07 |
| Corrections/reversals | Native event full reversal и captured-cost/movement compensation есть; Finance history учитывает active status | Summary расхода не соблюдает voided/reversedAt. G04. POS_API reversal deliberately unsupported, не missing native reversal |
| Opening/closing stock valuation | Inventory snapshots + valuation, Financial reconciliation distinguishes cost and revaluation | Quantity/acquisition evidence incomplete G08; не смешивать stock valuation с cash drawer |
| Opening/closing cash | Shift lifecycle / payment totals, без подтверждённого отдельного cash-ledger reconciliation contract | Нет основания назвать отсутствующий банковский/кассовый ledger новым обязательным feature GAP. Evidence bounded existing shift state |
| Finance entries non-sales | Payroll, expense, taxes/utilities settings/period computations, purchases/payment/equipment links | Full monthly result basis не resolver-bound; closed client snapshot inputs no content binding. G07/G10 |

**Что ещё нельзя полностью объяснить через Evidence Resolver:** payroll accrual/FOT input composition, period expenses и их effective lifecycle, taxes/utilities allocations, complete monthly finalProfit и закрытый report input set, stock value/quantity acquisition inputs, work-order expense consistency. Revenue и historical captured COGS при этом уже объяснимы; их не следует повторно включать как missing trace.

Closed month result защищён от редактирования без reopen, и frozen result не обязан автоматически пересчитываться при изменении current recipe/price. **G07 относится к первоначальному составу входов и проверяемости нового закрытия:** клиент рассчитывает snapshot, сервер проверяет permissions/venue/closing immutability и CAS этого store, но не связывает initial close с согласованными source revisions нескольких других stores. Устаревшая вкладка может закрыть месяц по более ранним accepted inputs. Это не требование backfill всех исторических closing snapshots. [S27], [S55].

## 9. Reviews/GBP Findings

Canonical review сохраняет review ID, source/external ID, local venue, author/text/rating/publishedAt, ingestion method/sourceMetadata, dedup key, annotations и timestamps. External identity используется при merge; fallback fingerprint для manual/import. Sync due interval/error retry/last sync state есть. Home Google-only average корректно строится из canonical reviews, не отдельный editable рейтинг. [S34], [S37], [S40].

**G02, P0:** `reviews.filter(review => review.externalId).map((review,index) => ...)` создаёт external map с index относительно filtered array. Обновление применяет index к full `reviews`. При `[manual(id=M), google(id=G,externalId=g1)]` external map записывает `google:g1→0`. Sync g1 обновляет manual M, сохраняя его ID, а прежний G остаётся. Это реальная canonical corruption/duplicate identity при обычном sync. Direct merge defect подтверждён на синтетических объектах; production sync не выполнялся.

**G11, P1:** Google connection имеет selected googleAccountId/locationId, но review sourceMetadata хранит только `{provider: google_business_profile}`. Location identity не включена в per-review origin/dedup binding. Select-location/reconnect обновляет connection и merges новые reviews в прежний dataset, не partition/reset и не сохраняет старую provider-location принадлежность. При rebind A→B можно получить рейтинг смеси нескольких provider locations в одном локальном venue. Это scope ambiguity external location, а не установленный SQL cross-tenant доступ. [S40], [S41].

**G12, P1:** diagnosis `trustedReviews` читает raw stored rows и использует `Number(null)=0`. Неоценённый canonical review становится 0 и, без explicit sentiment, negative. Набор rating5+null даёт AI average2.5 вместо canonical5. Обычный venue summary корректно исключает null. Кроме того, diagnosis topic count считает все topics, а consumer называет повторяющиеся темы complaints; BH без external enrichment не получает эквивалентные topics. Основное доказанное нарушение — null rating denominator/sentiment; нельзя называть любые positive topics жалобами без contract. [S20], [S34], [S17].

**Sync completeness:** Google fetch идёт страницами; local store отражает retained/imported records. Удалённые provider reviews не reconciled как tombstones; source не доказывает полного соответствия displayed local aggregate текущему общему provider rating. Это `UNKNOWN` dataset completeness, а не требование нового review-delete функционала. Source-local aggregate и external global aggregate не обязаны совпадать без одинакового scope.

REVIEW adapter пока reserved; source IDs/dedupKey не revision-bound proof. Это ограничивает provenance guest metrics/recommendations (G05/G12), но отсутствие adapter само по себе не превращает каждый review UI факт в отдельный P1.

## 10. Multi-Venue/Tenant Findings

Проверенный основной tenant path корректен: user session → validated selected `x-venue-id` → active workspace/venue memberships → selected venue dataAccount. `venues.dataAccountId` unique; business stores namespace `(account_id,store_key)`. Source Evidence context дополнительно rechecks workspace/venue/memberships и permissions. Integration connections/maps/ingress use venueId+dataAccountId и domain write checks; secondary `venue_data` account не превращается в человека, service writer ищет active human membership. [S02], [S13], [S14], [S44].

Не найдено доказательства, что обычный account.id domain query сам по себе читает соседнее заведение: в этих handlers account.id уже selected dataAccount. Workspace membership не равен разрешению смешивать business rows всех venues. Data namespace является основным boundary и для legacy rows без explicit venue; строго типизированные новые flows дополнительно используют venue IDs.

**Доказанный P0 G01 — permission boundary**, а не выдуманный cross-tenant SQL leak. Например manager с explicit deny finance.view/payroll.view/reports.view/inventory.view/reviews.view сохраняет analysis.run; dependency analysis.run даёт только analysis.view. Ordinary canReadStore законно отказывает, однако loader читает эти stores. `tasks.view` outcome API может вернуть closed/current numeric financial metric, если передан поддерживаемый baseline/target. [S21], [S23], [S25], [S50].

Reviews legacy canonicalizer может нормализовать explicit row venue в выбранную venue namespace; это не обнаруженный маршрут чужих данных между dataAccounts. Per-row corruption needs handling, но severity нельзя повышать до production cross-tenant breach без такого read path. Employee IDs должны оставаться employee domain identity, membership IDs — authorization identity; source не доказывает универсального employee↔actor identity relation, и это не обязательная новая функция.

Notifications preferences/devices/history correctly actor-scoped; domain trigger читает selected membership venue namespace, фильтрует category permissions, содержит venue prefix. Такое A/V разделение intentional. Owner reconciliation в auth может писать membership metadata для creator-owner; это существующая ownership policy/initialization, не основание утверждать, что read-only Evidence Resolver меняет business rows. [S13], [S45], [S46].

## 11. Duplicate Sources of Truth

| Business concept / representations | Классификация | Почему / GAP |
|---|---|---|
| Sale event vs event-managed Finance revenue | CANONICAL event + DERIVED protected projection | Generic update forbidden; posting lifecycle atomic. NOT A GAP |
| Imported sale doc/batch vs native event | CANONICAL для разных ingestion lifecycles; DERIVED unified readers required | Не две копии одной sale без доказанного same external ID. Native reader coverage missing G13 |
| Raw finance sum vs Health normalized daily | DERIVED vs DERIVED | Independent calculation bug, не persisted SOT duplication. G03/G04 |
| Server financial facts vs request finance overrides | CANONICAL vs DUPLICATE INPUT AUTHORITY | Both determine authoritative AI output without provenance/consistency contract. G05 |
| Captured cost vs latest receipt current recipe cost | CANONICAL historic capture vs DERIVED current estimate | Разные effective time/definition. NOT A GAP |
| Receipt basis vs balance.lastPurchasePrice/inventoryValue | CANONICAL receipt basis vs DERIVED/CACHE/LEGACY metadata | New cost resolver uses receipts; не самостоятельный manual price ledger. NOT A GAP |
| Manual/reference supplier/catalogue price vs receipt price | Reference metadata vs CANONICAL actual receipt basis | Explicitly excluded from captured cost. NOT A GAP |
| AI name-grouped lastPrice vs receipt latest price | DERIVED contextual aggregate vs CANONICAL basis | Label/selection/unit mismatch, not business writer. P2 G17 |
| Current recipes/tech cards vs sale snapshot | CANONICAL current definition vs CANONICAL historical usage | Snapshot сохраняет факт прошлого, не editable second current recipe. NOT A GAP |
| Menu ingestion draft vs confirmed Menu Item | Staging draft vs CANONICAL output | Revision/CAS/confirmation separation correct. NOT A GAP |
| Stock balances vs movement ledger/snapshots | DERIVED projection + CANONICAL movements/count facts | Naked balance edits blocked. Missing acquisition/quantity evidence G08, competing writers G09 |
| Live monthly report vs closed monthly snapshot | DERIVED open result vs CANONICAL frozen reported result | Historical freeze correct. New closing inputs not bound G07 |
| Payroll saved shift breakdown vs live salary rule recalculation | CANONICAL recorded breakdown vs DERIVED current-rule result | Business-period/accrual semantics insufficiently distinguished; no independent salary ledger proven. P2 G14 |
| Equipment workOrder.cost vs linked expense.amount | DUPLICATE SOURCE OF TRUTH | Optional synchronization + independent expense edit, no relation consistency contract. P1 G10 |
| Purchase document total vs payment expense | CANONICAL acquisition vs CANONICAL cash settlement | Это разные facts; закупка не сразу полная cash payment. NOT A GAP |
| Google-only Home rating vs all-source Health/reviews rating | DERIVED scopes | Different declared populations permissible. NOT A GAP; null handling G12 applies within same population |
| Canonical review vs duplicated retained external review after sync | DUPLICATED identity from corrupt writer | Not intentional projection. P0 G02 |
| Provider location A/B reviews in one local dataset | CANONICAL rows with missing source partition | Source identity conflict, не просто cache. P1 G11 |
| Business Health current snapshot vs local display cache | DERIVED + CACHE | Venue/email key and refresh; no independent business writer. NOT A GAP |
| Market analysis vs legacy competitorsJson | Current context + LEGACY input | Parallel identity/name merge P2 G16; no proof two ledgers change same confirmed provider fact |
| Notification copy/AI prose vs originating fact | DERIVED output | Не считать business ledger; trustworthy provenance unresolved for AI metrics G05 |

Критическое требование «две системы способны независимо менять одну truth» source подтверждает для equipment finance link; конкурирующие full-store writers дополнительно могут потерять единственную truth (G09). Для read-only projections/cache этот критерий не выполняется.

## 12. Write Path Findings

### Существенные writers

| Writer/path | Что и canonical store | Audit/evidence identity | Lifecycle, idempotency и CAS |
|---|---|---|---|
| Native `/api/sales-events` | Events, finance projection, stock movements/balances; embedded cost batch | Event/request IDs, audit, captured content evidence | Scoped posting/reversal/open/close; guarded multi-store CAS. Generic revenue edits protected [S07] |
| `/api/sales/confirm`, batch import/post/reverse | Document/batch sales and related stock/revenue | Stable doc/line/batch IDs, source metadata/audit/captures | Separate existing document lifecycle; integration delegates. Imported evidence bounded; native events must not be written again as docs [S38], [S44], [S52] |
| `/api/shifts/close` / Operational Report | Separate payroll/staffing/report, write-offs/incidents and permitted revenue summary | Report ID/idempotent receipts, source links | Existing canonical report lifecycle; not direct mutation of event-managed revenue [S24] |
| Generic `/api/store/[key]` | Team/rules/payroll/reference/menu/finance metadata, permitted manual facts, closings | Data mutation audit; store updatedAt; only selected audit rows retained per request | Permission checks, baseData merge, current-store CAS; direct stock movement/balance, confirmed purchase, event revenue, linked purchase-payment edits blocked; month locks/reopen [S26], [S27] |
| `/api/expenses` | Standalone finance expense | Stable supplied ID/idempotency key + audit | Permission/currency/month checks, but read-array→unconditional upsert; audit separate. G09 [S22] |
| Purchase scan/confirm/update/cancel | Draft and canonical purchase, receipts, assortment, mappings/supplier/expense links | Document/item/source file/idempotency/external IDs + audit | Confirm review/matching/supplier checks and guarded CAS batch/retries. Do not generalize all purchase actions as equally CAS-safe [S28], [S31], [S32] |
| `/api/purchases/payment` | Purchase payment state + linked Finance expense | Stable payment/idempotency IDs + audit | Month/permissions/link protections есть; selected implementation unconditional batch after read. G09 [S31] |
| Inventory count/write-off lifecycle | Adjustment/write-off docs, movements, balances, snapshots | Stable command/document/movement IDs, audit/source document links | Physical canonical operation, guarded post/cancel paths; current-count cost basis may UNKNOWN. No naked generic ledger PUT [S26], [S29] |
| Inventory product/reference routes | Assortment product metadata/identity, related definition repairs | Product IDs/audit | Some direct full-assortment batch writers lack store CAS and can overwrite concurrent projected stock. G09 [S59] |
| Menu ingestion Manual/Scan/Import confirm | Draft + current canonical menu/recipe | Draft revision/hash/confirm audit/item IDs/file IDs | Review/validate/version checks, idempotent confirmation, CAS [S11], [S12] |
| Equipment work orders | Order/history/equipment and optionally Finance expense | Stable order/equipment/expense link IDs; audit | Permissions/month checks; sync optional, unguarded batch reads, parallel finance edit. G09/G10 [S35], [S36] |
| Review manual/import/sync | Canonical reviews plus analysis/reply annotations | Review/external IDs, dedup key, source-event/audit | Existing dedup but external-index defect G02; no CAS on canonical array G09; location binding G11 [S37], [S40], [S42] |
| Diagnosis → review sync / AI outputs | Due review sync, diagnosis/task/decision outputs | Diagnosis/output IDs; review IDs depend on merge | AI does not rewrite sale facts; summary accepts unbound request authority G05 [S19], [S20] |
| Integration business writer | Product/recipe/stock count/returns/write-off/supplier/employee; purchase/sale delegated | External ID/hash/sync item/entity link + audit | Ingress idempotency/scope good; direct domain upserts no prior-read CAS G09, result revision evidence missing G18 [S39], [S43], [S44] |
| Market/Calendar writers | Context/candidates/events/decisions | Context signatures/event IDs/sourceURLs/updatedAt | Optional external facts no immutable provider proof; legacy identity G16 [S47]–[S49] |
| Notification preference/job/dispatch | Actor prefs/devices/jobs/history | Job/dedupe/provider delivery IDs | Own delivery lifecycle; not a second writer of underlying financial truth [S45], [S46] |
| Venue/workspace/membership/profile writers | Control plane, venue profile/account settings | Relational IDs/membership status | Active scope rechecked; ownership initialization metadata separate from business facts [S13], [S14] |

**G09:** protected canonical APIs alone are insufficient while the same JSON store can be saved by read-modify-write without comparing the read revision. `domain-writer` performs unconditional UPSERT; reviews/expenses/payment/work orders use variants of this pattern. Atomic `db.batch` ensures batch atomicity, **не** that its prior SELECT stayed current. Interleaving `read A → protected writer commits B → unguarded writer saves changed A` can erase accepted revenue/stock/expense/review modifications and their traceability. This is a demonstrated source-level race, not observed production data loss. Existing `store-cas.ts` already defines the guarded pattern; audit does not implement it. [S22], [S31], [S36], [S39], [S42], [S54].

Idempotency key answers «тот же command уже применён?»; CAS answers «входной state ещё тот же?». Stable IDs and duplicate suppression do not prevent concurrent full-store lost update. Audit trail separate from a successful business mutation also cannot substitute for atomic evidence revision.

**Writers that can produce unexplained/contradictory outputs:** fresh closed-month scalar snapshot without source manifest (G07); independent equipment/expense edits (G10); wrong-row review merge/location rebind (G02/G11); unguarded full-store write (G09); AI authoritative body override (G05, output inconsistency rather than canonical ledger mutation).

## 13. Read Model Findings

| Consumer / read model | Inputs / identity / staleness | Finding |
|---|---|---|
| Evidence facts/resolver | Per-read scoped records + content hash + live RBAC; bounded relations | Correct declared model; no hidden writes of business facts. NOT A GAP |
| OperationalDay | Scoped business date, revenue/events/docs/reports, statuses/consistency | Correct multi-shift/finality distinction; not connected to all summary consumers. G03/G04/G06 |
| Home Health current snapshot | Venue context → intelligence → snapshot; period/calculation version/generatedAt | Derived cache safe by scope; input fact refs/revision binding incomplete G05/G07; false operations G06 |
| Effective Finance monthly report | Shared finance/report rows + expenses/payroll + historical capture reconciliation; closed result frozen | Captured cost integration PROVEN; independent AI summary differs G04; initial close input set G07 |
| Reports closed month | Protected saved snapshot | Can explain saved reported value, cannot prove all source revisions/calculation inputs G07 |
| AI performance/current Finance | Raw revenue/expenses/payroll + body overrides; context timestamp/schema version | Multiple-shift and finality G03, missing FOT/lifecycle G04, trusted request G05 |
| Sales read-only event-document projection | Existing `salesEventDocuments` from event embedded batch | Good projection, no second write needed; assortment consumer omits it G13 |
| Assortment/menu analytics | Legacy docs+batches + financeRevenue + current menu/cost sources | Native sale coverage absent; AI menu cost omits stock movements, compatibility path used G13 |
| Warehouse current valuation | Stock balance + current latest confirmed receipt/asOf | Different from captured COGS correctly; DTO input identity missing G08, bounded retention G15 |
| AI procurement | Confirmed doc items, name-based spend/qty/lastPrice, stock samples | Contextual aggregates not canonical receipt basis G17; samples bounded intentionally |
| Salaries monthly model | Current employees/rules + staffing + entries | Current-rule recalculation vs saved breakdown not explicit basis contract G14 |
| Reviews/Home/Diagnosis | Canonical source-filtered summary vs raw diagnosis helper | Same population can disagree on null rating G12; location ambiguity G11 |
| Recommendation outcome | Supported metric ID + period/date/value from venue summary | Useful existing baseline metadata; source-RBAC G01 and metric→fact binding G05 |
| Notifications | Scheduled/derived trigger copy linked to domain source/job ID | Delivery projection, not business SOT; per-category permission filtering present |
| Market/Calendar context | Saved external summaries/sourceURLs/signatures/generation timestamps, legacy fallback | Honest unconfirmed context can remain; confirmed identity/provenance P2 G16 |
| Integration Hub read models | Runs/items/mappings/external hashes/status | Execution state not exact produced BusinessFact revision; P2 G18 |

Current caches, sampled read models и вычисляемый score не обязаны быть persistently revisioned ledgers. GAP возникает там, где они заявляют canonical число/состояние, но изменяют scope/finality/identity или не умеют объяснить состав authoritative input.

### Изолированная проверка source-поведений

Это synthetic memory probes существующих функций, без базы, network/business endpoints и application edits:

| Вход | Фактический результат exact-source function / source arithmetic | Вывод |
|---|---|---|
| Две daily строки на одну date: 100/1 receipt и 200/2 receipts | `normaliseDailyMetrics`: одна строка 200/2 вместо 300/3 | G03; порядок массива влияет на сохранённую смену |
| Revenue 100+200; operational report FOT90; expense30 status voided + reversedAt | Venue summary period: revenue300, payroll0, expenses30, result270 | G04; этот input должен исключить voided30 и включить recorded FOT90, preliminary result210 |
| Request finance recentDaily=9999 и monthToDate revenue9999/payroll888/result777 | Summary принимает request values | G05; нет canonical revision verification |
| Stored critical case + equipment repairCount3 + open revenue shift; BH build without operationalInput | operations counts relevant fields0, score90/confidence high | G06; stored operational signals не читаются |
| Manager retains analysis.run, explicit deny finance/payroll/reports/inventory/reviews read | `canReadStore` false для denied stores, feature permission true | G01; endpoint/loader source inspection доказывает обход read policy, не production request exploit |
| Canonical reviews `[manual M, google G/external g1]`, sync updated g1 | Existing merge overwrites M under M ID, retains old G | G02; real source function executed, isolated synthetic rows only |
| Ratings 5 и null | Venue summary avg5; diagnosis helper arithmetic Number(null)=0 → avg2.5 | G12; diagnosis handler/Google sync не вызывались |

Проверки не доказывают количество затронутых production records. Для G07/G09/G10/G11 статические write/read paths достаточны для архитектурного риска; production mutation/race/reconnect намеренно не выполнялись.

## 14. Gap Register P0–P3

Severity применяется к существующему business loop. Confidence относится к source proof, не к текущей распространённости в production.

| ID | Severity | GAP / affected modules | Concrete evidence / механизм | Влияние и критерий закрытия |
|---|---|---|---|---|
| G01 | **P0** | Source RBAC bypass: Health, AI, recommendation checks | Health only analysis.run [S15]; loader all stores no canReadStore [S17]; outcome only tasks.view [S21], financial metric IDs [S23]; source permissions [S25]/dependencies [S50] | Denied domain numeric data exposed within selected tenant. COMPLETE: each derived output respects source permissions/live scope; denied source cannot influence disclosed numeric results or enter prompt; source denial matches resolver/store policies |
| G02 | **P0** | Canonical review wrong-row merge | Filtered external map index applied to full array [S37]; ordinary sync persists merge [S40], [S42]; synthetic reproduction | Canonical content overwrites unrelated stable ID, duplicate external identity. COMPLETE: mixed manual/import/provider dataset preserves IDs and updates only matching source/location/external record; repeated sync idempotent; no silent rewrite of another record |
| G03 | **P1** | Canonical business-day / daily projection contract lost | Summary strips IDs/finality [S17]; byDate.set replaces shift [S18]; OperationalDay already aggregates [S05] | Wrong demand/MTD, open shift treated comparable. COMPLETE: all shifts included once; businessDate/timezone and PROVISIONAL/FINAL/consistency retained; known day totals match DailyRevenue and no draft/final confusion |
| G04 | **P1** | Finance current-period summary diverges from canonical Finance/report lifecycle | Raw revenue payrollBreakdown read without bd_operational_reports join; expense lifecycle filter [S17], separated canonical report [S24]; effective Finance [S55] | Wrong FOT/expense/preliminary result despite correct stored records. COMPLETE: server Finance/Health/AI use consistent canonical input precedence, period/currency/lifecycle, compare same-scope totals |
| G05 | **P1** | AI authoritative inputs and recommendation provenance unbound | Request finance overrides [S17], authoritative deterministic prompt [S19]; outcome metadata no factRefs [S23], timestamp snapshot ID [S16] | User/stale body can replace fact numbers; recommendation cannot establish metric→fact origin. COMPLETE: declared canonical vs contextual input policy enforced; derived input set/metric identity bound to scoped fact evidence; stale/conflicting inputs explicit |
| G06 | **P1** | Business Health operations not sourced from existing operational domains | BH no operationalInput [S15]; counters read body-only and default0; score90/high [S18] | False «no problems» without reading open shifts/cases/equipment. COMPLETE: operational counters use canonical scoped data or explicit UNKNOWN; Home/AI same input contract; score cannot assert absence from missing data |
| G07 | **P1** | Closed financial result lacks canonical input/evidence binding | Client monthly snapshot [S55]; server accepts new scalar close, CAS only closing-store and immutable/reopen guards [S27]; no result adapter [S03] | Validly frozen result may originate from stale/inconsistent multi-store inputs; finalProfit/FOT/expenses cannot be proven together. COMPLETE: new closed result binds accepted calculation/version/period/currency to coherent scoped revenue/cost/expense/payroll/snapshot inputs; changed inputs detected; historical legacy explicitly bounded |
| G08 | **P1** | Acquisition and stock valuation/quantity evidence gap | Receipt source IDs [S29], basis [S30]; movement node no purchase relations [S09]; PURCHASE_DOCUMENT reserved only [S03]; valuation DTO drops basis IDs [S51] | Existing procurement price/stock value cannot traverse to canonical supplier/document/line and relevant quantity contributors. COMPLETE: current basis and balanced quantity explanations bound to existing purchase/count/opening facts; receipt→purchase/line/supplier/source document resolves live-authorized; honest partial when unknown |
| G09 | **P1** | Concurrent business writers bypass canonical store CAS | Unconditional domain UPSERT [S39]; expenses [S22], payment [S31], reviews [S42], workorders [S36]; existing guarded alternative [S54] | Accepted mutations/evidence can be lost by stale full-store writes. COMPLETE: all writers of shared canonical stores check same read revision, atomic cross-store consistency, retry/idempotency semantics; conflicting write cannot silently erase accepted sibling fact |
| G10 | **P1** | Equipment maintenance cost has independent financial writers | Optional syncExpense/order.cost/linked amount [S35]; generic only purchase-linked expense protections [S26] | Same linked cost diverges between Equipment and Finance without reconciliation. COMPLETE: defined authoritative amount and relation lifecycle; updating either linked representation cannot silently contradict the other; estimate/actual distinction if applicable explicit |
| G11 | **P1** | GBP provider-location origin lost on retained reviews/rebind | Provider-only metadata [S40]; connection select-location updates and sync merges old dataset [S41] | Review aggregates combine location histories without source identity. COMPLETE: review external identity bound to provider account/location and venue; reconnect/rebind cannot silently relabel or combine incompatible source populations |
| G12 | **P1** | Review aggregate semantics differ across canonical/AI consumers | Diagnosis Number(null) and raw trustedReviews/aggregate [S20]; canonical summary [S34], Health summary [S17] | Null rating becomes0/negative; advice and guest health differ for same dataset. COMPLETE: shared source/denominator/null/sentiment/topic contract; same selected population produces same metric and explainable input set |
| G13 | **P1** | Native POS and current receipt facts omitted by existing assortment consumers | Event route not docs/batches writer [S07]; existing projection [S52]; analytics docs/batches-only [S38]; AI menu inputs no stockMovements [S17] | Native sales revenue/cost known, item sales analytics miss them; current menu cost compatibility path inconsistent. COMPLETE: all existing sale representations consumed once under defined coverage; native item metrics reconcile to scoped facts; receipt basis same across current-cost consumers; current vs captured explicitly separate |
| G14 | **P2** | Payroll recorded vs current-rule accrual basis unclear | Saved report payrollBreakdown [S24]; salaries current-rule calculations [S56] | Historical staffing salary can change with current rules while recorded Finance FOT fixed. COMPLETE: distinguish recorded accrual/current-rule recalculation and bind rule basis where promised; no presumed duplicate persisted ledger |
| G15 | **P2** | Acquisition evidence durability bounded by movement retention | Purchase confirm caps20k [S28]; basis searches receipts [S30], captured fallback [S09] | Rare old receipt can leave current basis UNKNOWN; production cap unknown. COMPLETE: documented retention/archival basis contract or preserved required evidence; no false price fallback; no mandatory backfill in this audit |
| G16 | **P2** | External market/calendar provenance and legacy competitor identity | Current+legacy merge [S20], mutable market signatures/sourceURLs [S49], calendar store/sourceURLs [S47], [S48] | Confirmed context can lack stable equivalent provider identity/revision; future AI links bounded. COMPLETE: source/scope/confirmed vs contextual contract explicit; legacy identity conflicts do not masquerade as one proven fact |
| G17 | **P2** | Procurement summary lastPrice/name/package identity mismatch | Newest-first purchase stream → name-group loop lastPrice overwrite [S17]; canonical basis [S30] | Context can imply latest price while reporting older/package-mixed value. COMPLETE: summary contract uses canonical product/unit/effective price basis or clearly labels its distinct sampled statistic |
| G18 | **P2** | Integration execution result not bound to resulting fact revision | Run/item/hash/entity-link contracts and idempotency [S43]; domain writer [S39], INTEGRATION_EVENT reserved [S03] | Can explain attempted import/external ID, cannot resolver-prove exact accepted domain revision from run. COMPLETE: existing run/item→result identity explicit and source-authorized; unsupported capability stays honest UNKNOWN |

**Totals: P0=2, P1=11, P2=5, P3=0.** P3 отсутствует: этот аудит не собирает UX-косметику или идеи оптимизации. G01/G02 source-proven + synthetic checks; остальные P1 source-proven, часть дополнительно synthetic checked. Нет доказанного чужого tenant SQL read; P0 не основан на таком предположении.

## 15. NOT A GAP

1. **Read-only Finance revenue projection от sale events.** Projection не второй independently editable ledger; generic edit блокируется.
2. **Current Health snapshot и venue-keyed UI cache.** Cache не меняет business truth; per-read score не обещает исторический replay. Отсутствие historical Health snapshot само по себе не GAP.
3. **Bounded evidence, pagination, honest PARTIAL/UNKNOWN.** Неизвестная историческая price/recipe/source identity не должна синтезироваться. G06 отличается именно ложным благополучным выводом вместо неизвестности.
4. **Captured historical cost vs current latest-receipt recipe estimate.** Разное время и назначение; исторические продажи не нужно переоценивать.
5. **Closed month freeze и explicit reopen.** Правильная report lifecycle; G07 относится к доказуемым входам первоначального закрытия, не к автоматическому пересчёту истории.
6. **Recipe/Menu current definition vs snapshot of its use.** Не две competing current definitions. Отсутствие любой старой recipe revision, не обещанной системой, не требует восстановления.
7. **Menu ingestion draft/review/validation vs canonical confirmation.** Staging не отдельное production меню. Нет требования хранить все OCR candidates.
8. **Supplier aliases, product mappings, package size и manual catalogue/reference price.** Разные сущности/metadata; receipt basis явно использует реальные receipt facts.
9. **Purchase amount vs purchase payment vs sales COGS.** Acquisition, cash settlement и captured consumption — разные business facts; двойной расход не следует предполагать из самого наличия записей.
10. **Payroll payment/deduction vs accrued FOT.** Settlement не автоматически expense accrual; используемая Finance precedence не GAP сама по себе.
11. **Google-only Home review aggregate vs all-source review aggregate.** Разные declared scopes могут давать разные оценки; ошибка G12 только там, где один и тот же selected dataset трактуется несовместимо.
12. **account.id/dataAccount namespace vs explicit venue field.** Selected authenticated account.id уже data owner venue. Отличающееся имя переменной не tenant leak. Actor-scoped notifications/memberships intentional.
13. **Intentional tenant isolation.** Workspace не обязан агрегировать все venue business rows; explicit venue switching не обходится reference ID.
14. **Intentional provisional revenue/open shifts.** Незакрытая смена имеет право показывать текущий итог; GAP — считать его completed comparable без finality.
15. **POS external card payment без bank settlement trace.** Source доказывает метод оплаты, не банковское поступление; новый settlement module не предлагается.
16. **Integration entity contracts и честно unsupported adapters.** Наличие 1C/POS types не обещает production-ready capability каждого источника. Reserved evidence kind также не работающий adapter.
17. **Legacy compatible fallback, явно не authoritative.** Legacy closed result/manual revenue/cost unknown не должны автоматически становиться mandatory backfill. GAP есть лишь при silently competing authority или misleading semantics.
18. **AI server policies/weights и Data Quality отдельно от Business Health.** Formula/threshold — product policy; сам по себе иной вес не архитектурный разрыв. Проверяются inputs, provenance и consistency, а не дизайн новой формулы.

## 16. Phase 3A Completion Decision

**C — нужны несколько оставшихся remediation phases.** Phase 3A.1–3A.4 остаются завершёнными в своих доказанных границах. Phase 3A в целом нельзя считать завершённой системой canonical/evidence contracts, пока существующие consumers обходят source permissions, writers могут повредить canonical identities и Financial/Health/AI агрегаты не согласованы с входными facts.

Одной purchase-evidence phase недостаточно: она не устранит wrong-row review writer, source-RBAC обход и false Health operations. Одной Health presentation phase недостаточно: правильный UI может отображать неправильный или неразрешённый canonical input. Поэтому нужна последовательность ограниченных remediation packages, а не расширение функциональности и не повторная реализация Revenue/Cost/Menu.

P0 G01/G02 и P1 writer safety G09/G10/G11 — обязательный data safety foundation до широкого использования агрегатов. P1 consumer consistency G03/G04/G05/G06/G12/G13 и result/acquisition evidence G07/G08 также должны быть закрыты либо иметь явные ограниченные `UNKNOWN/PARTIAL` contracts **до этапа, который обещает полноценный Business Health/AI результат по этим данным**. P2 можно вести отдельно без остановки доказанного sales loop.

## 17. Recommended Next Phase, only if justified

### Phase 3A.5 — CANONICAL BOUNDARY & WRITER SAFETY

**Одна главная цель:** обеспечить, что existing canonical business truth сохраняет свою identity/consistency и читается только с правами на её исходные домены.

**Доказанные GAP:** G01 source-RBAC обход, G02 wrong-row review merge, G09 competing writers/CAS bypass, G10 independent linked equipment cost writers, G11 provider-location identity continuity. Это уже существующие endpoints/records/lifecycles, а не новые функции.

**Modules:** authentication/source permission policy на агрегирующих readers; Health/AI/recommendation check; Review layer/GBP; integration direct writers; Expenses/Purchase Payments/Inventory reference writers; Equipment↔Finance. Затрагиваются только paths, которые читают denied source или изменяют shared canonical stores/linked identities.

**НЕ входит:** redesign Health/AI/UX; новые provider integrations, банковский settlement, новые reports; переопределение proven Revenue/Cost/Menu contracts; purchase provenance adapter и monthly-result fact целиком; migrations/backfill/production data repair без отдельного решения; массовая чистка старых reviews; deployment этого аудита.

**COMPLETE:**

1. Actor с explicit denied source read не получает его данные через Health/AI/outcome и не отправляет их AI; selected venue/workspace/membership policy одинакова с source resolver.
2. Mixed-source review sync сохраняет unrelated stable IDs, не создаёт duplicate provider identity при retry/update; location rebind имеет explicit source population identity и не выдаёт смесь за один источник.
3. Все выявленные writers shared canonical JSON stores используют совместимую revision/CAS и atomic lifecycle semantics; concurrent interleaving не теряет accepted sibling changes; idempotent retries не дублируют бизнес-факты.
4. Equipment→Finance linked maintenance amount имеет одну определённую authority и согласованный lifecycle; разрешённые edits не оставляют скрытого противоречия.
5. Есть focused verification denied-source/mixed-review/concurrent-write/rebind/linked-cost сценариев и unchanged proven-chain regressions. Объём исторически затронутых данных отдельно assessed read-only; никакой автоматический repair/backfill не является условием разрешения на мутацию.

### Остальные обязательные remediation scopes (номера заранее не назначаются)

| Scope | Главная цель / GAP | Modules | НЕ входит | COMPLETE |
|---|---|---|---|---|
| **CANONICAL CONSUMER CONSISTENCY & METRIC PROVENANCE** | Existing Home/Health/AI/Reports/assortment получают согласованные scoped business facts: G03/G04/G05/G06/G12/G13 | OperationalDay/Shifts/Finance/Payroll, native+document Sales analytics, Warehouse cost inputs, Reviews, Health, AI, outcomes | Новый AI/новые metrics/UX, rewrite proven capture graph, acquisition writer repair | Multi-shift/timezone/finality totals reconcile; report FOT + expense lifecycle same; missing ops UNKNOWN; native analytics coverage exact once; same-population review aggregate equal; contextual body cannot replace canonical authority silently; metric→source input refs/provenance explicit |
| **ACQUISITION & FINANCIAL RESULT EVIDENCE** | Resolve existing price/stock and closed report origin: G07/G08 | Purchases/Supplier/Nomenclature/files/receipts/counts/stock valuation; Finance/Payroll/Expenses/month close/Reports | New procurement/recognition features, reprice past sales, forced historical backfill, expand every reserved Evidence kind | Receipt/current basis→purchase/line/supplier/source evidence traversable; balance quantity contributors scoped/bounded; newly accepted closed result bound to coherent revisioned inputs/calculation/period/currency; legacy partial explicit |

Оба scope конкретны и могут быть уточнены после safety phase; это рекомендация дальнейшей работы, **не утверждённый plan deployment и не автоматически начатые 3A.6/3A.7**. P2 G14–G18 остаются bounded architectural debt; отдельно нужно не позволять их partial/contextual outputs выглядеть доказанными фактами.

## 18. Owner-language Summary

**1. Что уже связано?** Продажа связана с выручкой и кассовой сменой. Видно, по какой позиции/рецептуре рассчитана её сохранённая себестоимость и какие продукты списаны. Можно проверить происхождение подтверждённой позиции меню из ручного ввода, скана или импорта. Закупка действительно создаёт приход и цену продукта; это не просто набор независимых экранов.

**2. Где разные языки?** Финансовый экран знает ФОТ из отчёта дня, а сводка для AI может его не увидеть. Несколько смен одного дня превращаются в одну строку с потерей части выручки. Продажи POS входят в общую выручку, но не обязательно в аналитику отдельных блюд. AI и экран отзывов по-разному трактуют отзыв без оценки. Цена закупки имеет документ-источник, но общей доказуемой ссылки до него ещё нет.

**3. Самый опасный разрыв для будущего Business Health?** Система способна назвать операции благополучными, не прочитав реальные незакрытые смены, поломки и критические случаи. Одновременно её финансовая сводка может потерять ФОТ/смену. Красивый общий балл тогда создаст ложную уверенность.

**4. Самый опасный разрыв для AI Doctor?** Нет единого проверенного набора разрешённых фактов: серверную цифру может заменить body клиента, а source permissions не соблюдаются общим loader. Убедительный совет может исходить из противоречивой или недоступной пользователю цифры, происхождение которой не проверяется.

**5. Что привести в порядок до UX/Health/AI этапа?** Сначала безопасные права чтения и сохранение данных: wrong-row review merge, конкурентные writers, связанные расходы оборудования и источник Google-локации. Затем одинаковые расчёты дня/ФОТ/расходов/отзывов во всех потребителях, честная неизвестность отсутствующих операционных данных и доказуемые входы закупочной цены/закрытого финансового результата. Доказанные Revenue/Cost/Menu цепочки переделывать не требуется.

**6. Что оставить на потом?** Исторический replay Health, улучшения UI, дополнительные integrations и новые функции; P2 current-rule payroll пояснения, long-term receipt retention, внешняя provenance рынка/календаря, contextual procurement samples и integration-run evidence, пока их ограничения явно обозначены. Никакие production данные этим аудитом не исправлялись.

### Source evidence index — exact production commit only

Ссылки закреплены на `efdbae969272d72da6843a7cfbd193d872bfb0c4`. Диапазоны указывают проверяемые functions/guards; отрицательное утверждение об отсутствии dispatch/input проверено по целой соответствующей функции. Production bundle references важны для effective Finance/Payroll/Home behavior.

[S01]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/evidence-contracts.ts#L1-L170 "evidence-contracts.ts: kinds, scopes, statuses and evidence identity"
[S02]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/evidence-resolver.ts#L22-L85 "evidence-resolver.ts: adapters/source permissions and live context"
[S03]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/evidence-resolver.ts#L105-L170 "evidence-resolver.ts: closed supported dispatch"
[S04]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/daily-revenue.ts#L23-L100 "daily-revenue.ts: scoped source read/consistency/content revision"
[S05]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/operational-day.ts#L1-L79 "operational-day.ts: report fields, multi-shift/finality/consistency"
[S06]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/sales-events.ts#L89-L187 "sales-events.ts: businessDate, shift lifecycle, protected revenue and event projection"
[S07]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/sales-events/route.ts#L1-L102 "sales-events route: stores, commands, CAS and embedded batch"
[S08]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/cost-evidence.ts#L1-L135 "cost-evidence.ts: scoped snapshots and movement fallback"
[S09]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/cost-evidence.ts#L227-L284 "cost-evidence.ts: ingredient source IDs and bounded movement relations"
[S10]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/financial-reconciliation.ts#L91-L306 "financial-reconciliation.ts: captured history and effective report result"
[S11]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/menu-evidence.ts#L44-L195 "menu-evidence.ts: audit/source/revision origin graph"
[S12]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/menu/ingestion/route.ts#L1-L112 "menu ingestion route: review/validate/confirm CAS and revision"
[S13]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/auth.ts#L349-L461 "auth.ts: owner reconciliation and selected venue dataAccount/actor"
[S14]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/db/schema.ts#L40-L186 "schema.ts: venue/dataAccount/membership and domain_data namespaces"
[S15]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/business-health/route.ts#L13-L51 "Business Health: feature-only permission and no operationalInput"
[S16]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/business-health-snapshot.ts#L97-L275 "Health snapshot: timestamp identity, strings, freshness"
[S17]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/venue-ai-context.ts "venue-ai-context.ts: closedMonths280–409; revenue412–590; menu652–659; purchases692–780; loader1267–1298"
[S18]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/business-intelligence.ts "business-intelligence.ts: daily430–444; comparable690–714; scores881–1104; context1814–1877"
[S19]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/ai-handlers.ts#L1359-L1445 "diagnosis: body inputs, source loader, operationalInput and authoritative prompt"
[S20]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/diagnosis-context.ts#L81-L219 "diagnosis-context.ts: null conversion, raw reviews, topics, legacy competitors and due sync"
[S21]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/recommendations/check/route.ts#L16-L54 "recommendation check: tasks.view and context result"
[S22]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/expenses/route.ts#L82-L175 "expenses: idempotency, array read, unconditional upsert and audit"
[S23]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/recommendation-outcomes.ts "recommendation-outcomes.ts: financial metric IDs, snapshots and actualMetric evaluation"
[S24]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/operational-report.ts#L1-L61 "operational-report.ts: separated operational data/record identity"
[S25]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/data-trust.ts#L81-L190 "data-trust.ts: source store read/write permissions and canReadStore"
[S26]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/store/%5Bkey%5D/route.ts#L149-L491 "generic store: ledger/stock/revenue/purchase protection; no equipment expense guard"
[S27]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/store/%5Bkey%5D/route.ts#L426-L565 "generic store: close/reopen immutability and current-store CAS; no initial close input verification"
[S28]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/purchases/confirm/route.ts "purchase confirm: review193; supplier409–423; canonical475–545; movement cap534; CAS631/retry666"
[S29]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/inventory.ts#L3125-L3216 "inventory.ts: projected receipt prices, source document/line and latest basis"
[S30]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/cost-basis.ts#L1-L181 "cost-basis.ts: latest_confirmed_receipt, dates/units/currency and source IDs"
[S31]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/purchases/payment/route.ts#L78-L379 "purchase payment: linked identity, read-modify-write unconditional batch"
[S32]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/purchases/scan/route.ts#L1064-L1119 "purchase recognition: retained source files and normalized draft"
[S33]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/nomenclature-identity.ts#L1-L100 "nomenclature canonical identity and supplier source mappings"
[S34]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/review-model.ts#L347-L452 "review-model.ts: canonical aggregate and Google-only Home metrics"
[S35]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/equipment/work-orders/route.ts#L210-L338 "equipment work order cost and optional synced Finance expense"
[S36]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/equipment/work-orders/route.ts#L408-L469 "equipment unconditional multi-store save batch"
[S37]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/review-model.ts#L134-L321 "review identity/dedup; filtered external index275–277 and wrong full-array update"
[S38]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/assortment-analytics.ts "assortment-analytics.ts: receipt-vs-legacy cost371–431 and docs/batches sales708–758"
[S39]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/integrations/domain-writer.ts "integration domain-writer: unconditional upsert80–92; prior reads159; product303; stock409; recipe779; writeBatch1115"
[S40]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/review-sources.ts#L238-L305 "Google sync: venue lookup, provider-only sourceMetadata and merge"
[S41]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/review-sources.ts#L435-L564 "Google OAuth/selected location rebinding and immediate sync"
[S42]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/review-layer.ts#L63-L151 "review-layer: namespace, merge, unconditional save and separate audit"
[S43]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/integrations/contracts.ts "integration contracts: source types/entities/external metadata; execution evidence separate"
[S44]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/integration-hub/business-writer.ts#L69-L175 "integration lifecycle delegation and active service membership selection"
[S45]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/notifications/route.ts#L35-L75 "notification preferences/history use identity actor"
[S46]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/notification-triggers.ts#L83-L158 "notification domain sources: membership venue, permission categories, dedupe"
[S47]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/opportunity-calendar.ts#L394-L428 "calendar load/save namespace and mutable event context"
[S48]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/opportunities/route.ts "opportunity/calendar existing generate/edit workflow and source context"
[S49]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/market/route.ts "market analysis: namespace/save118, permissions265/284/406, signature/sourceURLs, profile legacy updates"
[S50]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/access-control.ts#L110-L276 "permission dependencies/defaults/explicit overrides; analysis.run does not imply source reads"
[S51]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/valuation.ts#L103-L223 "stock valuation basis and identity-dropping output DTO"
[S52]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/sales-batches/route.ts#L191-L255 "existing read-only native event-document/batch projection consumers"
[S53]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/manual-reference-price.ts#L1-L12 "manual reference price excluded from receipt costing"
[S54]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/store-cas.ts#L34-L119 "store CAS snapshot/predicate/batch/retry contract"
[S55]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/public/assets/index-BQGspy0I.js#L984-L1006 "production Finance base/close wizard; effective overrides1945–1955 bind captured history and preserve closed result; Home shared Health589–622"
[S56]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/public/assets/index-BQGspy0I.js#L1609-L1637 "production Salaries monthly audit/current-rule model; shift helper HAe2009 vs saved payrollBreakdown"
[S57]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/operational-days/route.ts#L1-L18 "OperationalDay endpoint: raw revenues plus separate report-derived days"
[S58]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/lib/bardoctor/integrations/sync-engine.ts#L633-L748 "sync engine: payload hash, same-payload idempotency, venue mismatch and changed external document conflicts"
[S59]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/inventory/products/route.ts "inventory product writer: unconditional upsert77, prior read158 and assortment write batches180/570/654/744"
[S60]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/public/assets/index-BQGspy0I.js#L322-L325 "bdOperationalRows: first-per-date report join; shared Ur hook625 fetches operational-days for Finance consumers"
[S61]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/app/api/assortment/overview/route.ts#L9-L75 "assortment overview inputs: stock movements included, native sale events absent"
[S62]: https://github.com/vdokhalov/BarDoctor-AI/blob/efdbae969272d72da6843a7cfbd193d872bfb0c4/public/assets/index-BQGspy0I.js#L1945-L1955 "effective Finance wrapper calls captured-history reconciliation; closing wrapper preserves stored result"

(function () {
  "use strict";

  var state = { section: "dashboard", query: "", status: "", page: 1, loading: false, sequence: 0 };
  var main = document.getElementById("admin-main");
  var title = document.getElementById("admin-title");
  var identity = document.getElementById("admin-identity");
  var detail = document.getElementById("admin-detail");
  var backdrop = document.getElementById("admin-backdrop");
  var detailTrigger = null;
  var detailHistoryClosing = false;
  var detailBodyOverflow = "";
  var labels = {
    dashboard: "Обзор", users: "Пользователи", venues: "Заведения", integrations: "Интеграции", reviews: "Отзывы гостей",
    ai: "AI-наблюдаемость", push: "Push-инфраструктура", system: "Состояние системы", audit: "Журнал администраторов"
  };
  var featureLabels = {
    ai_doctor: "AI Doctor", operations: "Операции", reviews: "Отзывы", ocr_sales: "OCR · продажи",
    ocr_inventory: "OCR · инвентаризация", ocr_purchases: "OCR · закупки", ocr_assortment: "OCR · ассортимент",
    calendar: "Календарь возможностей", market: "Рынок", supplier_alternatives: "Альтернативы поставщиков", other: "Другое"
  };
  var categoryLabels = { calendar: "Календарь", system: "Система", shift: "Смены", task: "Задачи", equipment: "Оборудование", incident: "Инциденты", finance: "Финансы", test: "Тест" };
  var roleLabels = { owner: "Владелец", manager: "Управляющий", shift_manager: "Менеджер смены", employee: "Сотрудник" };
  var statusLabels = {
    working: "Работает", connected: "Подключён", success: "Успешно", active: "Активно",
    attention: "Требует внимания", partial: "Частично", configured_unverified: "Настроен · не проверен",
    error: "Ошибка", offline: "Не в сети", failed: "Ошибка", expired: "Истекло",
    unknown: "Неизвестно", not_configured: "Не настроен", not_available: "Недоступно",
    not_connected: "Не подключено", syncing: "Синхронизация", queued: "В очереди",
    dispatching: "Передаётся", accepted: "Принято провайдером", scheduled: "Запланировано",
    no_subscription: "Нет подписки", cancelled: "Отменено", denied: "Отклонено",
    registered: "Зарегистрирован", configured: "Настроено", missing: "Отсутствует",
    pending_location: "Ожидает выбора профиля", url_linked: "Ссылка сохранена"
  };
  var entityLabels = {
    stock_product: "Номенклатура", supplier: "Поставщики", warehouse: "Склады",
    purchase: "Приходные накладные", purchase_invoice: "Приходные накладные",
    stock_balance: "Остатки", inventory_balance: "Остатки"
  };
  var targetLabels = { account: "Аккаунт", venue: "Заведение", integration: "Интеграция", platform_admin: "Администратор платформы" };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function sessionHeaders(extra) {
    return new Headers(extra || {});
  }

  async function api(section, options) {
    options = options || {};
    var params = options.params || {};
    var url = new URL("/api/admin/" + section, location.origin);
    Object.keys(params).forEach(function (key) {
      if (params[key] != null && params[key] !== "") url.searchParams.set(key, String(params[key]));
    });
    var response = await fetch(url.pathname + url.search, {
      method: options.method || "GET",
      headers: sessionHeaders(options.headers),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok) {
      var error = new Error(payload.error || "Не удалось загрузить данные");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function date(value, withTime) {
    if (!value) return "—";
    var parsed = new Date(value);
    if (!Number.isFinite(parsed.valueOf())) return "—";
    return new Intl.DateTimeFormat("ru-RU", withTime === false
      ? { day: "2-digit", month: "short", year: "numeric" }
      : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    ).format(parsed);
  }

  function number(value) {
    return typeof value === "number" && Number.isFinite(value)
      ? new Intl.NumberFormat("ru-RU").format(value)
      : "—";
  }

  function countPhrase(value, one, few, many) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    var absolute = Math.abs(value) % 100;
    var last = absolute % 10;
    var word = absolute > 10 && absolute < 20 ? many : last === 1 ? one : last > 1 && last < 5 ? few : many;
    return number(value) + " " + word;
  }

  function humanReason(value) {
    var labels = {
      "Initial verified platform-owner provisioning": "Первичная выдача доступа подтверждённому владельцу платформы",
      "Claimed by verified bootstrap identity": "Активация подтверждённой bootstrap-учётной записью"
    };
    return labels[value] || value || "—";
  }

  function duration(value) {
    if (typeof value !== "number") return "—";
    return value < 1000 ? value + " мс" : (value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " с";
  }

  function humanFeature(value) {
    return featureLabels[value] || String(value || "Другое").replace(/[._-]+/g, " ");
  }

  function humanCategory(value) { return categoryLabels[value] || value || "Другое"; }
  function humanRole(value) { return roleLabels[value] || value || "Не указана"; }
  function humanStatus(value) { return statusLabels[value] || value || "Неизвестно"; }
  function humanEntity(value) { return entityLabels[value] || String(value || "Данные").replace(/[._-]+/g, " "); }
  function humanTarget(value) { return targetLabels[value] || String(value || "Объект").replace(/[._-]+/g, " "); }
  function humanProvider(value) {
    var names = { "1c": "1С", one_c: "1С", local_connector: "Local Connector", api: "API" };
    return names[value] || value || "Источник не указан";
  }

  function humanPushError(value) {
    if (!value) return "—";
    var normalized = String(value).toLocaleLowerCase("en");
    if (normalized.includes("may not be scheduled so far in the future")) return "Уведомление запланировано слишком далеко в будущем.";
    return value;
  }

  function humanReviewEvent(value) {
    var names = {
      sync_completed: "Синхронизация завершена", sync_failed: "Ошибка синхронизации",
      import_completed: "Импорт завершён", import_partial: "Импорт завершён частично",
      import_failed: "Ошибка импорта", manual_created: "Отзыв добавлен вручную",
      manual_duplicate: "Повторный отзыв пропущен", oauth_connected: "Google подключён",
      disconnected: "Источник отключён"
    };
    return names[value] || String(value || "Событие").replace(/[._-]+/g, " ");
  }

  function status(value, customLabel) {
    return '<span class="admin-status ' + esc(value || "unknown") + '">' + esc(customLabel || humanStatus(value)) + "</span>";
  }

  function loading() {
    main.innerHTML = '<div class="admin-loading"><span></span><p>Загружаю подтверждённые сигналы платформы…</p></div>';
  }

  function errorState(error) {
    var denied = error && (error.status === 401 || error.status === 403);
    main.innerHTML = '<div class="admin-error"><span>' + (denied ? "🔒" : "⚠") + '</span><h3>'
      + (denied ? "Доступ запрещён" : "Данные не загрузились") + '</h3><p>'
      + esc(error && error.message || "Повторите попытку") + '</p><button type="button" data-retry>Повторить</button></div>';
    var retry = main.querySelector("[data-retry]");
    if (retry) retry.addEventListener("click", loadSection);
  }

  function empty(titleText, note) {
    return '<div class="admin-empty"><span>◇</span><h3>' + esc(titleText) + '</h3><p>' + esc(note) + "</p></div>";
  }

  function sectionHead(titleText, note, generated) {
    return '<div class="admin-section-head"><div><h2>' + esc(titleText) + '</h2><p>' + esc(note) + '</p></div>'
      + (generated ? '<span class="admin-generated">Обновлено ' + esc(date(generated)) + "</span>" : "") + "</div>";
  }

  function navButton(section, body, statusFilter) {
    return '<button type="button" class="admin-action-card" data-nav="' + esc(section) + '"'
      + (statusFilter ? ' data-nav-status="' + esc(statusFilter) + '"' : "") + ">" + body + '<span class="admin-action-arrow">→</span></button>';
  }

  function kpi(label, value, note, icon, unknown) {
    return '<article class="admin-kpi"><div class="admin-kpi-head"><span>' + esc(label) + '</span><span class="admin-kpi-icon">' + esc(icon) + '</span></div><strong'
      + (unknown ? ' class="admin-value-unknown"' : "") + ">" + esc(value) + "</strong><small>" + esc(note) + "</small></article>";
  }

  function healthRow(label, stateValue, evidence, action) {
    var body = '<strong>' + esc(label) + "</strong>" + status(stateValue) + "<small>" + esc(evidence) + "</small>";
    return action
      ? '<button type="button" class="admin-health-row actionable" data-nav="' + esc(action.section) + '" data-nav-status="' + esc(action.status || "") + '">' + body + '<b>→</b></button>'
      : '<div class="admin-health-row">' + body + "</div>";
  }

  function renderDashboard(data) {
    var integrationNote = countPhrase(data.integrations.attention, "требует внимания", "требуют внимания", "требуют внимания") + " · " + countPhrase(data.integrations.offline, "не в сети", "не в сети", "не в сети");
    var aiNote = data.ai.totalTokens == null
      ? "Токены неизвестны: данные провайдера отсутствуют"
      : number(data.ai.totalTokens) + " токенов · ошибок: " + number(data.ai.errors);
    main.innerHTML = sectionHead("Состояние платформы", "Каждая карточка ведёт к данным, на которых основан показатель", data.generatedAt)
      + '<div class="admin-kpis actionable-kpis">'
      + navButton("users", kpi("Пользователи", number(data.users.total), "Входили за 30 дней: " + number(data.users.signedInLast30Days), "◎"))
      + navButton("venues", kpi("Заведения", number(data.venues.total), "Активные заведения", "⌂"))
      + navButton("integrations", kpi("Интеграции", number(data.integrations.total), integrationNote, "⇄"), data.integrations.offline ? "offline" : data.integrations.attention ? "attention" : "")
      + navButton("ai", kpi("AI-запросы", number(data.ai.requests), aiNote, "✦"))
      + navButton("system", kpi("Система", data.system.issues ? countPhrase(data.system.issues, "проблема", "проблемы", "проблем") : "Данных недостаточно", "Покрытие: частичное", "◇", !data.system.issues))
      + "</div>"
      + '<div class="admin-grid"><section class="admin-card"><div class="admin-card-header"><div><h3>Операционное состояние</h3><p>Интеграции, AI и push</p></div></div><div class="admin-health-list">'
      + healthRow("Слой интеграций", data.integrations.offline ? "error" : data.integrations.attention ? "attention" : data.integrations.total ? "working" : "unknown", data.integrations.total ? countPhrase(data.integrations.total, "источник", "источника", "источников") : "Подключений нет", { section: "integrations" })
      + healthRow("AI-провайдер", data.ai.configured ? "configured_unverified" : "not_configured", aiNote, { section: "ai" })
      + healthRow("Push-провайдер", data.push.health, countPhrase(data.push.recentErrors, "ошибка", "ошибки", "ошибок") + " доставки за 30 дней", { section: "push", status: data.push.recentErrors ? "failed" : "" })
      + healthRow("Покрытие системы", "unknown", "Общее время доступности и единая агрегация ошибок пока не ведутся", { section: "system" })
      + '</div></section><section class="admin-card"><div class="admin-card-header"><div><h3>Границы достоверности</h3><p>Что система пока не знает</p></div></div><div class="admin-card-body"><div class="admin-honest">'
      + esc(data.users.note) + ". Точная стоимость AI не выводится без версии тарифа модели; наличие конфигурации провайдера не считается проверкой его доступности."
      + "</div></div></section></div>";
    bindNavigation(main);
  }

  function toolbar(section, statuses) {
    return '<div class="admin-toolbar"><label class="admin-search"><input type="search" data-search value="' + esc(state.query) + '" placeholder="Поиск…" aria-label="Поиск"></label>'
      + (statuses ? '<select data-status aria-label="Фильтр по статусу"><option value="">Все статусы</option>' + statuses.map(function (item) {
        return '<option value="' + esc(item.value) + '"' + (state.status === item.value ? " selected" : "") + ">" + esc(item.label) + "</option>";
      }).join("") + "</select>" : "") + '<span class="admin-generated">' + esc(labels[section]) + "</span></div>";
  }

  function bindToolbar() {
    var search = main.querySelector("[data-search]");
    var select = main.querySelector("[data-status]");
    if (search) search.addEventListener("input", function () {
      clearTimeout(bindToolbar.timer);
      bindToolbar.timer = setTimeout(function () { state.query = search.value.trim(); state.page = 1; loadSection(); }, 280);
    });
    if (select) select.addEventListener("change", function () { state.status = select.value; state.page = 1; loadSection(); });
  }

  function pagination(data) {
    if (!data || data.total <= data.limit) return "";
    return '<div class="admin-pagination"><span>' + number(data.total) + ' записей · страница ' + data.page + '</span><div><button data-page="prev"' + (data.page <= 1 ? " disabled" : "") + '>← Назад</button> <button data-page="next"' + (data.page * data.limit >= data.total ? " disabled" : "") + ">Далее →</button></div></div>";
  }

  function bindPagination() {
    main.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.page += button.dataset.page === "next" ? 1 : -1;
        state.page = Math.max(1, state.page);
        loadSection();
      });
    });
  }

  function renderUsers(data) {
    var rows = data.items.map(function (item) {
      return '<tr data-detail="user" data-id="' + item.id + '"><td data-label="Пользователь"><strong>' + esc(item.name) + '</strong><small>' + esc(item.email) + '</small></td><td data-label="Регистрация">'
        + esc(date(item.registeredAt, false)) + '</td><td data-label="Заведения" class="admin-num">' + number(item.venueCount) + '</td><td data-label="Сессия">'
        + status(item.activeSession ? "working" : "unknown", item.activeSession ? "Есть активная сессия" : "Нет активной сессии")
        + '</td><td data-label="Последний вход">' + esc(date(item.lastSignInAt)) + '</td><td data-label=""><span class="admin-row-arrow">›</span></td></tr>';
    }).join("");
    main.innerHTML = sectionHead("Пользователи", "Аккаунты BarDoctor без паролей, хешей и токенов")
      + toolbar("users")
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Пользователь</th><th>Регистрация</th><th>Заведения</th><th>Сессия</th><th>Последний вход</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" : empty("Пользователи не найдены", "Измените поисковый запрос"))
      + pagination(data.pagination);
    bindToolbar(); bindDetails(); bindPagination();
  }

  function renderVenues(data) {
    var rows = data.items.map(function (item) {
      var locationText = [item.city, item.region, item.country].filter(Boolean).join(" · ") || "Локация не заполнена";
      return '<tr data-detail="venue" data-id="' + item.id + '"><td data-label="Заведение"><strong>' + esc(item.name) + '</strong><small>' + esc(locationText) + '</small></td><td data-label="Владелец"><strong>'
        + esc(item.owner && item.owner.name || "—") + '</strong><small>' + esc(item.owner && item.owner.email || "Владелец не определён") + '</small></td><td data-label="Создано">'
        + esc(date(item.createdAt, false)) + '</td><td data-label="Пользователи" class="admin-num">' + number(item.memberCount) + '</td><td data-label="Интеграции">' + status(item.integrationStatus)
        + '</td><td data-label="Последнее изменение">' + esc(date(item.lastDataChangeAt)) + '</td><td data-label=""><span class="admin-row-arrow">›</span></td></tr>';
    }).join("");
    main.innerHTML = sectionHead("Заведения", "Диагностика платформы без изменения пользовательских данных")
      + toolbar("venues")
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Заведение</th><th>Владелец</th><th>Создано</th><th>Пользователи</th><th>Интеграции</th><th>Последнее изменение</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" : empty("Заведения не найдены", "Измените поисковый запрос"));
    bindToolbar(); bindDetails();
  }

  function renderIntegrations(data) {
    var rows = data.items.map(function (item) {
      var connector = item.agent
        ? '<strong>' + esc(item.agent.computer) + '</strong><small>Агент ' + esc(item.agent.version) + ' · 1С ' + esc(item.agent.platformVersion || "—") + '<br>' + esc([item.agent.configuration, item.agent.configurationVersion].filter(Boolean).join(" ") || "Конфигурация не определена") + "</small>"
        : '<span class="admin-connector-detail">Агент ещё не зарегистрирован</span>';
      var reason = item.lastError || (item.status === "attention" && !item.agent ? "Агент ещё не зарегистрирован" : "—");
      return '<tr data-detail="integration" data-id="' + esc(item.id) + '"><td data-label="Источник"><strong>' + esc(item.source) + '</strong><small>' + esc(item.venueName + " · " + humanProvider(item.provider)) + '</small></td><td data-label="Статус">'
        + status(item.status) + '</td><td data-label="Причина"><span class="admin-connector-detail">' + esc(reason) + '</span></td><td data-label="Local Connector / 1С">' + connector
        + '</td><td data-label="Heartbeat">' + esc(date(item.agent && item.agent.lastHeartbeatAt)) + '</td><td data-label="Последняя синхронизация">' + esc(date(item.lastSuccessAt))
        + '</td><td data-label="Очередь" class="admin-num">' + number(item.queueSize) + '</td><td data-label=""><span class="admin-row-arrow">›</span></td></tr>';
    }).join("");
    main.innerHTML = sectionHead("Интеграции", "Диагностика существующего Integration Layer и Local Connector")
      + '<div class="admin-metrics admin-metrics-compact">' + metric("Всего", data.summary.total) + metric("Работают", data.summary.working) + metric("Внимание", data.summary.attention) + metric("Не в сети", data.summary.offline) + "</div>"
      + toolbar("integrations", [{ value: "working", label: "Работают" }, { value: "attention", label: "Требуют внимания" }, { value: "offline", label: "Не в сети" }])
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Источник</th><th>Статус</th><th>Причина</th><th>Local Connector / 1С</th><th>Heartbeat</th><th>Последняя синхронизация</th><th>Очередь</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" : empty("Интеграций нет", "Подключения ещё не созданы или фильтр ничего не нашёл"));
    bindToolbar(); bindDetails();
  }

  function renderReviews(data) {
    var sourceNames = { google: "Google", yandex: "Яндекс Карты", "2gis": "2ГИС", tripadvisor: "TripAdvisor", survey: "Анкета", other: "Другой источник" };
    var rows = data.items.map(function (item) {
      var sources = Object.entries(item.sources || {}).map(function (entry) { return (sourceNames[entry[0]] || entry[0]) + ": " + number(entry[1]); }).join(" · ") || "Отзывов нет";
      var google = humanStatus(item.google.status) + (item.google.oauthConfigured ? " · OAuth настроен" : " · OAuth не настроен");
      var lastEvent = item.lastEvent
        ? '<strong>' + esc(humanReviewEvent(item.lastEvent.event)) + '</strong><small>' + esc(date(item.lastEvent.at)) + (item.lastEvent.detail ? " · " + esc(item.lastEvent.detail) : "") + '</small>'
        : "—";
      return '<tr><td data-label="Заведение"><strong>' + esc(item.venueName) + '</strong><small>Заведение №' + item.venueId + '</small></td><td data-label="Состояние">' + status(item.status)
        + '</td><td data-label="Отзывы" class="admin-num">' + number(item.total) + '</td><td data-label="Источники"><span class="admin-connector-detail">' + esc(sources)
        + '</span></td><td data-label="Google"><strong>' + esc(google) + '</strong><small>' + esc(item.google.locationName || "Профиль не выбран") + '</small></td><td data-label="Последние данные">'
        + esc(date(item.lastReceivedAt)) + '</td><td data-label="Последнее событие">' + lastEvent + '</td><td data-label="Ошибки" class="admin-num">' + number(item.failedEvents) + '</td></tr>';
    }).join("");
    main.innerHTML = sectionHead("Отзывы гостей", "Диагностика единого Review Layer без содержимого секретов")
      + '<div class="admin-metrics admin-metrics-compact">' + metric("Заведения", data.summary.venues) + metric("Отзывы", data.summary.reviews) + metric("Требуют внимания", data.summary.attention) + metric("Ошибки источников", data.summary.failedEvents) + "</div>"
      + toolbar("reviews", [{ value: "working", label: "Есть данные" }, { value: "attention", label: "Требуют внимания" }, { value: "unknown", label: "Нет подтверждённых данных" }])
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Заведение</th><th>Состояние</th><th>Отзывы</th><th>Источники</th><th>Google</th><th>Последние данные</th><th>Последнее событие</th><th>Ошибки</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : empty("Данных об отзывах нет", "Измените фильтр или дождитесь первого отзыва"));
    bindToolbar();
  }

  function metric(label, value, note) {
    var displayValue = typeof value === "string" ? value : number(value);
    return '<article class="admin-metric"><span>' + esc(label) + '</span><strong>' + esc(displayValue) + '</strong>' + (note ? '<small>' + esc(note) + '</small>' : "") + "</article>";
  }

  function renderAI(data) {
    var venueRows = data.byVenue.map(function (item) {
      return '<tr><td data-label="Заведение"><strong>' + esc(item.venueName) + '</strong><small>' + (item.venueId ? "Заведение №" + item.venueId : "Без данных о заведении") + '</small></td><td data-label="Запросы" class="admin-num">' + number(item.requests)
        + '</td><td data-label="Входные токены" class="admin-num">' + number(item.inputTokens) + '</td><td data-label="Выходные токены" class="admin-num">' + number(item.outputTokens)
        + '</td><td data-label="Ошибки" class="admin-num">' + number(item.errors) + '</td><td data-label="Средняя задержка">' + duration(item.averageLatencyMs) + "</td></tr>";
    }).join("");
    var features = data.byFeature.map(function (item) {
      return '<article class="admin-breakdown"><strong>' + esc(humanFeature(item.feature)) + '</strong><span>' + countPhrase(item.requests, "запрос", "запроса", "запросов") + '</span><small>'
        + (item.totalTokens == null ? "Токены не получены" : countPhrase(item.totalTokens, "токен", "токена", "токенов")) + " · " + countPhrase(item.errors, "ошибка", "ошибки", "ошибок") + "</small></article>";
    }).join("");
    main.innerHTML = sectionHead("AI-наблюдаемость", "Внутреннее потребление без содержимого пользовательских запросов")
      + '<div class="admin-provider"><div><h3>' + esc(data.provider.name) + '</h3><p>Модель: ' + esc(data.provider.model || "не зафиксирована") + ' · доступность провайдера не проверялась</p></div><div class="admin-provider-meta">' + status(data.provider.configured ? "configured_unverified" : "not_configured") + "</div></div>"
      + '<div class="admin-metrics">' + metric("Запросы", data.totals.requests) + metric("Токены", data.totals.totalTokens) + metric("Ошибки", data.totals.errors) + metric("Средняя задержка", duration(data.totals.averageLatencyMs)) + "</div>"
      + '<div class="admin-honest"><strong>Стоимость: ' + esc(data.totals.estimatedCost == null ? "Не рассчитано" : data.totals.estimatedCost) + ".</strong> " + esc(data.totals.estimatedCostReason) + "<br>" + esc(data.tracking.note) + "</div><br>"
      + toolbar("ai")
      + '<div class="admin-breakdowns">' + (features || '<div class="admin-honest">Разрез по функциям появится после реальных AI-вызовов.</div>') + "</div><br>"
      + (venueRows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Заведение</th><th>Запросы</th><th>Входные токены</th><th>Выходные токены</th><th>Ошибки</th><th>Средняя задержка</th></tr></thead><tbody>' + venueRows + "</tbody></table></div>" : empty("AI-вызовов за период нет", "Нули не подставляются вместо неизвестных данных провайдера"));
    bindToolbar();
  }

  function renderPush(data) {
    var errors = data.errorGroups.map(function (item) {
      return '<button type="button" class="admin-issue critical admin-error-group" data-push-events="' + esc(item.eventIds.join(",")) + '"><strong>' + esc(humanCategory(item.category)) + " · " + countPhrase(item.count, "ошибка", "ошибки", "ошибок") + '</strong><small>Причина: ' + esc(humanPushError(item.reason)) + '<br>Последняя ошибка: ' + esc(date(item.lastErrorAt)) + " · " + countPhrase(item.affectedAccounts, "аккаунт", "аккаунта", "аккаунтов") + '</small><b>Показать события →</b></button>';
    }).join("");
    var jobs = data.jobs.map(function (item) {
      return '<tr data-push-detail="job" data-id="' + esc(item.id) + '"><td data-label="Аккаунт"><strong>' + esc(item.account) + '</strong><small>Аккаунт №' + item.accountId + '</small></td><td data-label="Тип">' + esc(humanCategory(item.category)) + '</td><td data-label="Статус">' + status(item.status)
        + '</td><td data-label="Целевое время"><strong>' + esc(date(item.targetAt)) + '</strong><small>' + esc(item.timezone) + '</small></td><td data-label="Попытки">' + number(item.attempts)
        + '</td><td data-label="Детали"><span class="admin-connector-detail">' + esc(humanPushError(item.detail)) + "</span></td></tr>";
    }).join("");
    var deliveries = data.deliveries.map(function (item) {
      return '<tr data-delivery-id="' + item.id + '" data-push-detail="delivery" data-id="' + esc(item.id) + '"><td data-label="Аккаунт"><strong>' + esc(item.account) + '</strong><small>Аккаунт №' + item.accountId + '</small></td><td data-label="Категория">' + esc(humanCategory(item.category))
        + '</td><td data-label="Статус">' + status(item.status) + '</td><td data-label="Детали"><span class="admin-connector-detail">' + esc(humanPushError(item.detail)) + '</span></td><td data-label="Создано">' + esc(date(item.createdAt)) + "</td></tr>";
    }).join("");
    var warnings = (data.warnings || []).map(function (item) {
      return '<div class="admin-issue ' + esc(item.severity) + '"><strong>' + esc(item.code) + '</strong><small>' + esc(item.message) + '</small></div>';
    }).join("");
    var devices = (data.devices || []).map(function (item) {
      return '<tr><td data-label="Аккаунт"><strong>' + esc(item.account) + '</strong><small>Аккаунт №' + item.accountId + '</small></td><td data-label="Активно">' + status(item.active ? "working" : "inactive") + '</td><td data-label="Разрешение">' + esc(item.permission) + '</td><td data-label="Подписка">' + esc(item.subscriptionId) + '</td><td data-label="Последний контакт">' + esc(date(item.lastSeenAt)) + '</td></tr>';
    }).join("");
    var observation = data.observability || {};
    main.innerHTML = sectionHead("Push-инфраструктура", "Конфигурация и доставка показаны отдельно")
      + '<div class="admin-provider"><div><h3>' + esc(data.provider) + '</h3><p>ID приложения: ' + esc(humanStatus(data.credentials.appId)) + ' · REST API-ключ: ' + esc(humanStatus(data.credentials.restApiKey)) + '</p></div>' + status(data.health) + "</div>"
      + '<div class="admin-metrics admin-metrics-compact">' + metric("Принято", data.summary.accepted) + metric("Активные устройства", data.summary.activeDevices) + metric("Устаревшие подписки", data.summary.staleDevices) + metric("Ошибки", data.summary.failed) + metric("В очереди BarDoctor", data.summary.queuedJobs) + "</div>"
      + (warnings ? '<section class="admin-card"><div class="admin-card-header"><div><h3>Предупреждения здоровья</h3><p>Формируются по телеметрии, без тестовой отправки пользователю</p></div></div><div class="admin-card-body admin-issues">' + warnings + '</div></section><br>' : "")
      + '<div class="admin-honest"><strong>Последние этапы цепочки.</strong> Сгенерировано: ' + esc(date(observation.lastGeneratedAt)) + ' · попытка: ' + esc(date(observation.lastAttemptAt)) + ' · успех: ' + esc(date(observation.lastSuccessAt)) + ' · ошибка: ' + esc(date(observation.lastFailureAt)) + ' · подавлено: ' + esc(date(observation.lastSuppressedAt)) + '</div><br>'
      + toolbar("push", [
        { value: "failed", label: "Ошибки" }, { value: "scheduled", label: "Запланированные" },
        { value: "accepted", label: "Принятые" }, { value: "cancelled", label: "Отменённые" }
      ])
      + (errors ? '<section class="admin-card"><div class="admin-card-header"><div><h3>Сгруппированные ошибки</h3><p>Повторяющиеся ответы провайдера объединены</p></div></div><div class="admin-card-body admin-issues">' + errors + "</div></section><br>" : "")
      + (devices ? '<section class="admin-card admin-table-card"><div class="admin-card-header"><div><h3>Устройства и подписки</h3><p>Фактическое состояние SDK на последнем контакте</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Аккаунт</th><th>Активно</th><th>Разрешение</th><th>Подписка</th><th>Последний контакт</th></tr></thead><tbody>' + devices + "</tbody></table></div></section><br>" : "")
      + (jobs ? '<section class="admin-card admin-table-card"><div class="admin-card-header"><div><h3>Будущие задания BarDoctor</h3><p>Передаются OneSignal только внутри допустимого окна</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Аккаунт</th><th>Тип</th><th>Статус</th><th>Целевое время</th><th>Попытки</th><th>Детали</th></tr></thead><tbody>' + jobs + "</tbody></table></div></section><br>" : "")
      + (deliveries ? '<section class="admin-card admin-table-card"><div class="admin-card-header"><div><h3>События доставки</h3><p>«Принято провайдером» не означает подтверждённую доставку</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Аккаунт</th><th>Категория</th><th>Статус</th><th>Детали</th><th>Создано</th></tr></thead><tbody>' + deliveries + "</tbody></table></div></section>" : empty("Push-событий нет", "Состояние доставки остаётся неизвестным до первого реального результата"));
    bindToolbar();
    main.querySelectorAll("[data-push-events]").forEach(function (button) {
      button.addEventListener("click", function () {
        var ids = button.dataset.pushEvents.split(",");
        main.querySelectorAll("[data-delivery-id]").forEach(function (row) {
          row.hidden = ids.indexOf(row.dataset.deliveryId) === -1;
        });
        var target = main.querySelector("[data-delivery-id]:not([hidden])");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    main.querySelectorAll("[data-push-detail]").forEach(function (row) {
      row.addEventListener("click", function () {
        var collection = row.dataset.pushDetail === "job" ? data.jobs : data.deliveries;
        var item = collection.find(function (candidate) { return String(candidate.id) === String(row.dataset.id); });
        if (item) openPushDetail(item);
      });
    });
  }

  function openPushDetail(item) {
    var isJob = item.kind === "job";
    var stateLines = detailLine("Статус", humanStatus(item.status))
      + detailLine("Аккаунт", item.account + " · №" + item.accountId)
      + detailLine("Категория", humanCategory(item.category));
    if (isJob) {
      stateLines += detailLine("Исходное целевое время", date(item.targetAt))
        + detailLine("Часовой пояс", item.timezone)
        + detailLine("Попытки", number(item.attempts))
        + detailLine("Следующая попытка", date(item.nextAttemptAt));
    } else {
      stateLines += detailLine("Создано", date(item.createdAt));
    }
    var raw = item.detail
      ? detailSection("Технические детали провайдера", '<p class="admin-detail-note">Показаны отдельно от пользовательского объяснения; секреты маскируются на сервере.</p><pre class="admin-json-diff">' + esc(item.detail) + "</pre>")
      : "";
    detail.hidden = false;
    detail.setAttribute("aria-hidden", "false");
    detail.innerHTML = detailShell(isJob ? "Push-задание BarDoctor" : "Событие push-доставки", humanPushError(item.detail),
      detailSection("Состояние", '<div class="admin-detail-list">' + stateLines + "</div>") + raw);
    detail.querySelector("[data-detail-close]").addEventListener("click", closeDetail);
  }

  function renderSystem(data) {
    var components = data.components.map(function (item) { return healthRow(item.label, item.status, item.evidence, item.action); }).join("");
    var issues = data.issues.map(function (item) {
      var body = '<strong>' + esc(item.fact) + '</strong><small>' + esc(item.context) + "</small>" + (item.action ? "<b>Открыть причину →</b>" : "");
      return item.action
        ? '<button type="button" class="admin-issue ' + esc(item.severity) + ' actionable" data-nav="' + esc(item.action.section) + '" data-nav-status="' + esc(item.action.status || "") + '">' + body + "</button>"
        : '<div class="admin-issue ' + esc(item.severity) + '">' + body + "</div>";
    }).join("");
    main.innerHTML = sectionHead("Состояние системы", "Статусы основаны на проверяемых сигналах без вымышленного времени доступности")
      + '<div class="admin-grid"><section class="admin-card"><div class="admin-card-header"><div><h3>Компоненты</h3><p>Состояние и основание</p></div></div><div class="admin-health-list">' + components + '</div></section><section class="admin-card"><div class="admin-card-header"><div><h3>Требует внимания</h3><p>' + countPhrase(data.issues.length, "реальный сигнал", "реальных сигнала", "реальных сигналов") + '</p></div></div><div class="admin-card-body admin-issues">'
      + (issues || '<div class="admin-honest">В отслеживаемых подсистемах проблем нет. Общее время доступности приложения не измеряется.</div>') + "</div></section></div><br>"
      + '<section class="admin-card"><div class="admin-card-header"><div><h3>Связи разделов</h3><p>Номенклатура, склад, техкарты, меню и поставщики · только Internal Admin</p></div><button id="admin-run-relationship-integrity" class="admin-primary" type="button">Проверить связи</button></div><div id="admin-relationship-integrity" class="admin-card-body"><div class="admin-honest">Проверка запускается вручную и не изменяет пользовательские данные.</div></div></section><br>'
      + '<div class="admin-honest">' + esc(data.coverageNote) + "</div>";
    bindNavigation(main);
    bindRelationshipIntegrity();
  }

  function renderRelationshipIntegrity(data) {
    var root = document.getElementById("admin-relationship-integrity");
    if (!root) return;
    var summary = data.summary || {};
    var venues = (data.venues || []).map(function (item) {
      var findingCount = (item.findings || []).length;
      return '<div class="admin-health-row"><span class="admin-health-dot ' + (findingCount ? "attention" : "working") + '"></span><div><strong>'
        + esc(item.venue && item.venue.name) + '</strong><small>'
        + (findingCount ? countPhrase(findingCount, "тип проблемы", "типа проблемы", "типов проблем") + " · " + countPhrase(item.affectedRecords, "запись", "записи", "записей") : "Разрывов не обнаружено")
        + '</small></div><b>' + (findingCount ? esc(findingCount) : "✓") + "</b></div>";
    }).join("");
    root.innerHTML = '<div class="admin-breakdowns"><div class="admin-breakdown"><strong>Заведений проверено</strong><span>' + esc(number(summary.venuesChecked))
      + '</span></div><div class="admin-breakdown"><strong>С проблемами</strong><span>' + esc(number(summary.venuesWithFindings))
      + '</span></div><div class="admin-breakdown"><strong>Затронуто записей</strong><span>' + esc(number(summary.affectedRecords))
      + '</span></div></div><br><div class="admin-health-list">' + (venues || '<div class="admin-honest">Заведений для проверки нет.</div>')
      + '</div><p class="admin-integrity-note">Только чтение · изменений: ' + esc(number(data.writesPerformed)) + " · " + esc(date(data.generatedAt)) + "</p>";
  }

  function bindRelationshipIntegrity() {
    var button = document.getElementById("admin-run-relationship-integrity");
    if (!button) return;
    button.addEventListener("click", async function () {
      var root = document.getElementById("admin-relationship-integrity");
      button.disabled = true;
      button.textContent = "Проверяю…";
      root.innerHTML = '<div class="admin-honest">Выполняется read-only проверка связей по всем заведениям…</div>';
      try {
        renderRelationshipIntegrity(await api("relationship-integrity"));
      } catch (error) {
        root.innerHTML = '<div class="admin-honest">' + esc(error.message || "Проверка не выполнена") + "</div>";
      } finally {
        button.disabled = false;
        button.textContent = "Проверить связи";
      }
    });
  }

  function renderAudit(data) {
    var rows = data.items.map(function (item) {
      return '<tr data-detail="audit" data-id="' + item.id + '"><td data-label="Время">' + esc(date(item.createdAt)) + '</td><td data-label="Администратор"><strong>' + esc(item.admin.name) + '</strong><small>' + esc(item.admin.email)
        + '</small></td><td data-label="Действие"><strong>' + esc(item.displayAction || item.action) + '</strong><small>' + esc(humanReason(item.reason)) + '</small></td><td data-label="Цель">'
        + esc(humanTarget(item.target.type) + (item.target.id ? " №" + item.target.id : "")) + '</td><td data-label="Результат">' + status(item.result) + '</td><td data-label=""><span class="admin-row-arrow">›</span></td></tr>';
    }).join("");
    main.innerHTML = sectionHead("Журнал администраторов платформы", "Отдельная неизменяемая история, недоступная пользователям заведений") + toolbar("audit")
      + (rows ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Время</th><th>Администратор</th><th>Действие</th><th>Цель</th><th>Результат</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" : empty("Административных действий нет", "Просмотры без изменений не создают шум в журнале"));
    bindToolbar(); bindDetails();
  }

  function bindDetails() {
    main.querySelectorAll("[data-detail]").forEach(function (row) {
      row.addEventListener("click", function () { openDetail(row.dataset.detail, row.dataset.id); });
    });
  }

  async function openDetail(kind, id) {
    detailTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detail.hidden = false;
    detail.setAttribute("aria-hidden", "false");
    detailBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!(history.state && history.state.bdAdminDetail)) {
      history.pushState(Object.assign({}, history.state || {}, { bdAdminDetail: true }), "", location.href);
    }
    detail.innerHTML = '<section class="admin-detail-panel"><div class="admin-loading"><span></span><p>Загружаю read-only детали…</p></div></section>';
    try {
      var section = kind === "user" ? "users" : kind === "venue" ? "venues" : kind === "integration" ? "integrations" : "audit";
      var payload = await api(section, { params: { id: id } });
      detail.innerHTML = kind === "user" ? userDetail(payload.data)
        : kind === "venue" ? venueDetail(payload.data)
          : kind === "integration" ? integrationDetail(payload.data) : auditDetail(payload.data);
      detail.querySelector("[data-detail-close]").addEventListener("click", closeDetail);
      bindNavigation(detail);
      detail.querySelector("[data-detail-close]").focus({ preventScroll: true });
    } catch (error) {
      detail.innerHTML = '<section class="admin-detail-panel"><div class="admin-error"><h3>Детали не загрузились</h3><p>' + esc(error.message) + '</p><button data-detail-close>Закрыть</button></div></section>';
      detail.querySelector("[data-detail-close]").addEventListener("click", closeDetail);
    }
  }

  function closeDetail() {
    if (!detailHistoryClosing && history.state && history.state.bdAdminDetail) {
      history.back();
      return;
    }
    detail.hidden = true;
    detail.setAttribute("aria-hidden", "true");
    detail.innerHTML = "";
    document.body.style.overflow = detailBodyOverflow;
    if (detailTrigger && detailTrigger.isConnected) detailTrigger.focus({ preventScroll: true });
    detailTrigger = null;
    detailHistoryClosing = false;
  }

  function detailLine(label, value, action) {
    var content = '<span>' + esc(label) + "</span><strong>" + esc(value == null || value === "" ? "—" : value) + "</strong>";
    return action
      ? '<button type="button" class="admin-detail-line actionable" data-nav="' + esc(action.section) + '" data-nav-status="' + esc(action.status || "") + '">' + content + "<b>→</b></button>"
      : '<div class="admin-detail-line">' + content + "</div>";
  }

  function detailSection(label, body) {
    return '<section class="admin-detail-section"><h3>' + esc(label) + "</h3>" + body + "</section>";
  }

  function detailShell(titleText, note, body) {
    return '<section class="admin-detail-panel"><header class="admin-detail-header"><div><h2>' + esc(titleText) + '</h2><p>' + esc(note) + '</p></div><button class="admin-detail-close" data-detail-close aria-label="Закрыть">×</button></header><div class="admin-detail-body">' + body + "</div></section>";
  }

  function userDetail(data) {
    var venues = data.venues.map(function (item) { return detailLine(item.venueName, humanRole(item.role) + " · " + humanStatus(item.status)); }).join("") || detailLine("Заведения", "Нет");
    var integrations = data.integrations.map(function (item) { return detailLine(item.venueName + " · " + item.source, humanStatus(item.status), { section: "integrations", status: item.status }); }).join("") || detailLine("Интеграции", "Нет подключений");
    var ai = data.aiEvents.length
      ? detailLine("Вызовы с metadata", number(data.aiEvents.length), { section: "ai" })
      : detailLine("Использование AI", "Нет зафиксированных вызовов");
    return detailShell(data.name, "Пользователь №" + data.id + " · только чтение",
      detailSection("Аккаунт", '<div class="admin-detail-list">' + detailLine("Email", data.email) + detailLine("Телефон", data.phone) + detailLine("Регистрация", date(data.registeredAt)) + detailLine("Статус аккаунта", "Отдельная модель не ведётся") + detailLine("Подписка", data.subscription.reason) + "</div>")
      + detailSection("Заведения и роли", '<div class="admin-detail-list">' + venues + "</div>")
      + detailSection("Интеграции", '<div class="admin-detail-list">' + integrations + "</div>")
      + detailSection("AI", '<div class="admin-detail-list">' + ai + "</div>")
      + detailSection("Безопасность и сессии", '<div class="admin-detail-list">' + detailLine("Сессий всего", number(data.sessions.total)) + detailLine("Активных", number(data.sessions.active)) + detailLine("Последний вход", date(data.sessions.lastSignInAt)) + "</div>")
    );
  }

  function venueDetail(data) {
    var members = data.members.map(function (item) { return detailLine(item.name, humanRole(item.role) + " · " + humanStatus(item.status)); }).join("") || detailLine("Пользователи", "Нет");
    var integrations = data.integrations.map(function (item) { return detailLine(item.source, humanStatus(item.status) + (item.agent ? " · " + item.agent.computer : ""), { section: "integrations", status: item.status }); }).join("") || detailLine("Интеграции", "Нет подключений");
    var ai = data.ai.usage ? detailLine("AI-запросы", number(data.ai.usage.requests), { section: "ai" }) : detailLine("AI", "Нет зафиксированных вызовов");
    return detailShell(data.name, "Заведение №" + data.id + " · только чтение",
      detailSection("Общее", '<div class="admin-detail-list">' + detailLine("Локация", [data.city, data.region, data.country].filter(Boolean).join(" · ")) + detailLine("Владелец", data.owner && data.owner.name) + detailLine("Создано", date(data.createdAt)) + detailLine("Последнее изменение", date(data.lastDataChangeAt)) + "</div>")
      + detailSection("Пользователи", '<div class="admin-detail-list">' + members + "</div>")
      + detailSection("Интеграции", '<div class="admin-detail-list">' + integrations + "</div>")
      + detailSection("AI", '<div class="admin-detail-list">' + ai + detailLine("Стоимость", data.ai.costReason) + "</div>")
      + detailSection("Данные", '<div class="admin-detail-list">' + detailLine("Хранилища данных", number(data.dataState.storeCount)) + detailLine("Обновлено", date(data.dataState.lastStoreUpdateAt)) + detailLine("Полнота", "Internal Admin не измеряет") + "</div>")
    );
  }

  function integrationDetail(data) {
    var agent = data.agent
      ? detailLine("Компьютер", data.agent.computer) + detailLine("Версия агента", data.agent.version) + detailLine("Платформа 1С", data.agent.platformVersion) + detailLine("Конфигурация", [data.agent.configuration, data.agent.configurationVersion].filter(Boolean).join(" ")) + detailLine("Heartbeat", date(data.agent.lastHeartbeatAt)) + detailLine("Режим", data.agent.readOnly ? "Только чтение" : "Не подтверждён")
      : detailLine("Local Connector", "Агент ещё не зарегистрирован");
    var runs = data.syncHistory.map(function (run) {
      return detailLine(date(run.startedAt) + " · " + humanEntity(run.entityType), humanStatus(run.status) + " · получено " + number(run.received) + " · ошибок " + number(run.errors));
    }).join("") || detailLine("История", "Запусков синхронизации нет");
    return detailShell(data.source, data.venueName + " · " + humanProvider(data.provider),
      detailSection("Состояние", '<div class="admin-detail-list">' + detailLine("Статус", humanStatus(data.status)) + detailLine("Причина", data.lastError || (data.agent ? "—" : "Агент ещё не зарегистрирован")) + detailLine("Последний успех", date(data.lastSuccessAt)) + detailLine("Очередь", number(data.queueSize)) + "</div>")
      + detailSection("Local Connector / 1С", '<div class="admin-detail-list">' + agent + "</div>")
      + detailSection("История синхронизации", '<div class="admin-detail-list">' + runs + "</div>")
    );
  }

  function auditDetail(data) {
    return detailShell(data.displayAction || data.action, date(data.createdAt),
      detailSection("Событие", '<div class="admin-detail-list">' + detailLine("Администратор", data.admin.name + " · " + data.admin.email) + detailLine("Результат", humanStatus(data.result)) + detailLine("Цель", humanTarget(data.target.type) + (data.target.id ? " №" + data.target.id : "")) + detailLine("Причина", humanReason(data.reason)) + detailLine("Каноническое действие", data.action) + detailLine("ID запроса", data.requestId) + "</div>")
      + (data.before != null || data.after != null ? detailSection("Изменение", '<div class="admin-json-grid"><div><span>До</span><pre class="admin-json-diff">' + esc(JSON.stringify(data.before, null, 2) || "—") + '</pre></div><div><span>После</span><pre class="admin-json-diff">' + esc(JSON.stringify(data.after, null, 2) || "—") + "</pre></div></div>") : "")
    );
  }

  function navigate(section, statusFilter) {
    if (!labels[section]) return;
    state.section = section;
    state.query = "";
    state.status = statusFilter || "";
    state.page = 1;
    history.replaceState(null, "", "#" + section);
    closeDetail();
    closeMenu();
    loadSection();
  }

  function bindNavigation(root) {
    root.querySelectorAll("[data-nav]").forEach(function (button) {
      button.addEventListener("click", function () { navigate(button.dataset.nav, button.dataset.navStatus); });
    });
  }

  function closeMenu() {
    document.body.classList.remove("admin-menu-open");
    if (backdrop) backdrop.hidden = true;
  }

  async function loadSection() {
    var sequence = ++state.sequence;
    state.loading = true;
    loading();
    title.textContent = labels[state.section] || "Internal Admin";
    document.querySelectorAll("#admin-nav [data-section]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.section === state.section);
    });
    try {
      var payload = await api(state.section, { params: { q: state.query, status: state.status, page: state.page, limit: 50 } });
      if (sequence !== state.sequence) return;
      if (state.section === "dashboard") renderDashboard(payload.data);
      else if (state.section === "users") renderUsers(payload.data);
      else if (state.section === "venues") renderVenues(payload.data);
      else if (state.section === "integrations") renderIntegrations(payload.data);
      else if (state.section === "reviews") renderReviews(payload.data);
      else if (state.section === "ai") renderAI(payload.data);
      else if (state.section === "push") renderPush(payload.data);
      else if (state.section === "system") renderSystem(payload.data);
      else if (state.section === "audit") renderAudit(payload.data);
      main.focus();
    } catch (error) {
      if (sequence === state.sequence) errorState(error);
    } finally {
      if (sequence === state.sequence) state.loading = false;
    }
  }

  async function initializeIdentity() {
    try {
      var payload = await api("session");
      identity.innerHTML = '<span></span><strong>' + esc(payload.admin.name) + '</strong><small>platform.admin</small>';
      return true;
    } catch (error) {
      errorState(error);
      return false;
    }
  }

  document.getElementById("admin-nav").addEventListener("click", function (event) {
    var button = event.target.closest("[data-section]");
    if (button) navigate(button.dataset.section);
  });
  document.getElementById("admin-menu").addEventListener("click", function () {
    var open = !document.body.classList.contains("admin-menu-open");
    document.body.classList.toggle("admin-menu-open", open);
    if (backdrop) backdrop.hidden = !open;
  });
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  detail.addEventListener("click", function (event) { if (event.target === detail) closeDetail(); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeDetail(); closeMenu(); }
  });
  window.addEventListener("popstate", function () {
    if (!detail.hidden && !(history.state && history.state.bdAdminDetail)) {
      detailHistoryClosing = true;
      closeDetail();
      return;
    }
    var section = location.hash.slice(1);
    if (labels[section]) navigate(section);
  });

  var initial = location.hash.slice(1);
  if (labels[initial]) state.section = initial;
  initializeIdentity().then(function (ready) { if (ready) loadSection(); });
})();

(function integrationsV179() {
  "use strict";

  var ICON_ROOT = "/integration-icons/";
  var CONNECTOR_DOWNLOAD = "/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip";
  var loading = document.getElementById("loading");
  var authRequired = document.getElementById("auth-required");
  var loadError = document.getElementById("load-error");
  var loadErrorCopy = document.getElementById("load-error-copy");
  var message = document.getElementById("global-message");
  var hubForm = document.getElementById("hub-import-form");

  var state = {
    hub: null,
    reviews: null,
    auxiliaryErrors: {},
    view: "overview",
    connectionId: "",
    sequence: 0,
    controller: null,
    revealedToken: null,
    lastInspection: null,
    toastTimer: 0
  };

  var entityLabels = {
    product: "Номенклатура",
    supplier: "Поставщики",
    warehouse: "Склады",
    purchase_document: "Приходные накладные",
    stock_balance: "Остатки",
    sale: "Продажи",
    write_off: "Списания",
    return: "Возвраты",
    recipe: "Техкарты",
    employee: "Сотрудники"
  };
  var oneCCapabilities = ["product", "supplier", "warehouse", "purchase_document", "stock_balance"];
  var apiCapabilities = Object.keys(entityLabels);

  function node(tag, className, text) {
    var result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function icon(name, className) {
    var image = document.createElement("img");
    image.src = ICON_ROOT + name + ".svg";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    if (className) image.className = className;
    return image;
  }

  function button(text, className, handler, iconName) {
    var result = node("button", "button " + (className || ""));
    result.type = "button";
    if (iconName) result.appendChild(icon(iconName));
    result.appendChild(document.createTextNode(text));
    if (handler) result.addEventListener("click", handler);
    return result;
  }

  function linkButton(text, href, className, iconName) {
    var result = node("a", "button " + (className || ""));
    result.href = href;
    if (iconName === "download") result.download = String(href).split("/").pop() || "download";
    if (iconName) result.appendChild(icon(iconName));
    result.appendChild(document.createTextNode(text));
    return result;
  }

  function sessionHeaders(contentType) {
    var headers = {};
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (contentType !== false) headers["Content-Type"] = "application/json";
    if (email && token) {
      headers["X-Session-Email"] = email;
      headers["X-Session-Token"] = token;
      if (venueId) headers["X-Venue-Id"] = venueId;
    }
    return headers;
  }

  async function api(path, options, signal) {
    var settings = options || {};
    var isForm = settings.body instanceof FormData;
    var headers = Object.assign({}, sessionHeaders(!isForm), settings.headers || {});
    var response = await fetch(path, Object.assign({}, settings, {
      headers: headers,
      cache: "no-store",
      signal: signal || settings.signal
    }));
    var result;
    try {
      result = await response.json();
    } catch {
      result = { ok: false, error: "Сервер вернул неожиданный ответ." };
    }
    var failed = !response.ok || result.ok === false || result.success === false;
    if (failed) {
      var error = new Error(result.error || "Не удалось выполнить запрос.");
      error.status = response.status;
      error.code = result.code || "";
      throw error;
    }
    return result;
  }

  function currentVenueId() {
    return String(localStorage.getItem("bd_active_venue_id") || "");
  }

  function venueName() {
    var email = localStorage.getItem("bd_session") || "session";
    try {
      var context = JSON.parse(localStorage.getItem("bd_venue_context__" + email) || "null");
      var venues = context && Array.isArray(context.venues) ? context.venues : [];
      var active = venues.find(function (item) { return String(item.id) === currentVenueId(); });
      return active && active.name ? String(active.name) : "Текущее заведение";
    } catch {
      return "Текущее заведение";
    }
  }

  function readableDate(value) {
    if (!value) return "ещё не было";
    var date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "дата не определена";
    var now = new Date();
    var sameDay = date.toDateString() === now.toDateString();
    var yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    var day = sameDay ? "сегодня" : date.toDateString() === yesterday.toDateString() ? "вчера" : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    return day + ", " + date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  function number(value) {
    return Number(value || 0).toLocaleString("ru-RU");
  }

  function showMessage(text, isError) {
    window.clearTimeout(state.toastTimer);
    message.textContent = text;
    message.classList.remove("hidden", "error");
    if (isError) message.classList.add("error");
    message.setAttribute("role", isError ? "alert" : "status");
    state.toastTimer = window.setTimeout(function () { message.classList.add("hidden"); }, 6500);
  }

  function systemLogo(kind) {
    if (kind === "onec") return node("span", "system-logo onec", "1C");
    if (kind === "google" || kind === "google-maps") {
      var google = node("span", "system-logo " + kind);
      google.appendChild(icon(kind === "google-maps" ? "google-maps" : "google-g"));
      return google;
    }
    var result = node("span", "system-logo violet");
    result.appendChild(icon(kind === "file" ? "file-up" : kind === "api" ? "code-2" : "link-2"));
    return result;
  }

  function statusPill(status) {
    return node("span", "status-pill " + status.kind, status.label);
  }

  function localStatus(value) {
    if (value === "working") return { kind: "working", label: "Работает", reason: "Агент на связи, последняя синхронизация завершена." };
    if (value === "syncing") return { kind: "working", label: "Синхронизация", reason: "Local Connector сейчас передаёт данные." };
    if (value === "connected") return { kind: "waiting", label: "Подключён", reason: "Агент зарегистрирован. Первая успешная синхронизация ещё не подтверждена." };
    if (value === "awaiting_connection") return { kind: "waiting", label: "Ожидает подключения", reason: "Агент ещё не подключался. Установите Local Connector и вставьте ключ." };
    if (value === "attention") return { kind: "attention", label: "Требует внимания", reason: "Связь или последняя синхронизация требуют проверки." };
    if (value === "error") return { kind: "attention", label: "Ошибка", reason: "Нет подтверждённой связи с агентом или последняя синхронизация завершилась ошибкой." };
    if (value === "disabled") return { kind: "disabled", label: "Отключён", reason: "Синхронизация приостановлена или ключ доступа отозван." };
    return { kind: "waiting", label: "Ожидает подключения", reason: "Агент ещё не подключался. Установите Local Connector и вставьте ключ." };
  }

  function connectionPresentation(connection) {
    if (connection.adapterKey === "local-connector-v1") {
      var local = localStatus(connection.localStatus);
      var reason = connection.agent && connection.agent.lastError
        ? String(connection.agent.lastError)
        : connection.lastError ? String(connection.lastError) : local.reason;
      return Object.assign({}, local, {
        title: "1С:Предприятие",
        logo: "onec",
        reason: reason,
        lastContactAt: connection.agent && connection.agent.lastSeenAt
      });
    }
    if (connection.status === "paused" || connection.syncEnabled === false) {
      return { kind: "disabled", label: "Приостановлено", title: connection.displayName || "Собственная система / API", logo: "api", reason: "Получение данных приостановлено." };
    }
    if (connection.lastError) {
      return { kind: "attention", label: "Требует внимания", title: connection.displayName || "Собственная система / API", logo: "api", reason: String(connection.lastError) };
    }
    if (connection.lastSuccessAt) {
      return { kind: "working", label: "Работает", title: connection.displayName || "Собственная система / API", logo: "api", reason: "Данные успешно поступают в BarDoctor." };
    }
    if (connection.status === "connected") {
      return { kind: "waiting", label: "Ожидает данных", title: connection.displayName || "Собственная система / API", logo: "api", reason: "Подключение создано, но успешная передача ещё не зафиксирована." };
    }
    return { kind: "attention", label: "Требует настройки", title: connection.displayName || "Собственная система / API", logo: "api", reason: "Завершите настройку источника." };
  }

  function cardCopy(title, subtitle, status, reason, meta, capabilities) {
    var copy = node("div", "card-copy");
    copy.appendChild(node("h3", "", title));
    copy.appendChild(node("p", "venue-line", subtitle));
    var statusRow = node("div", "status-row");
    statusRow.appendChild(statusPill(status));
    copy.appendChild(statusRow);
    if (reason) copy.appendChild(node("p", "reason", reason));
    if (meta) copy.appendChild(node("p", "meta-line", meta));
    if (capabilities && capabilities.length) {
      var capabilityRoot = node("div", "capability-list");
      capabilities.slice(0, 5).forEach(function (item) { capabilityRoot.appendChild(node("span", "", entityLabels[item] || item)); });
      copy.appendChild(capabilityRoot);
    }
    return copy;
  }

  function accountingConnections() {
    return state.hub && Array.isArray(state.hub.connections)
      ? state.hub.connections.filter(function (item) { return item.adapterKey !== "universal-file-v1"; })
      : [];
  }

  function activeToken(connectionId) {
    return state.hub && Array.isArray(state.hub.tokens)
      ? state.hub.tokens.find(function (item) { return item.connectionId === connectionId && !item.revokedAt; }) || null
      : null;
  }

  function runsFor(connectionId) {
    return state.hub && Array.isArray(state.hub.runs)
      ? state.hub.runs.filter(function (item) { return item.connectionId === connectionId; })
      : [];
  }

  function mappingsFor(connectionId) {
    return state.hub && Array.isArray(state.hub.mappings)
      ? state.hub.mappings.filter(function (item) { return item.connectionId === connectionId; })
      : [];
  }

  function renderAccounting() {
    var root = document.getElementById("accounting-connections");
    root.textContent = "";
    var connections = accountingConnections();
    if (!connections.length) {
      var empty = node("div", "empty-connection");
      var copy = node("div");
      copy.appendChild(node("strong", "", "Системы пока не подключены"));
      copy.appendChild(node("p", "", "Выберите 1С или другой доступный способ передачи данных."));
      empty.append(copy, button("Подключить", "secondary small", function () { showView("catalog", "", true); }));
      root.appendChild(empty);
      return;
    }
    connections.forEach(function (connection) {
      var presentation = connectionPresentation(connection);
      var card = node("article", "integration-card");
      card.appendChild(systemLogo(presentation.logo));
      var meta = "Последняя успешная синхронизация: " + readableDate(connection.lastSuccessAt);
      if (connection.adapterKey === "local-connector-v1" && connection.agent && connection.agent.lastSeenAt) {
        meta += " · связь: " + readableDate(connection.agent.lastSeenAt);
      }
      card.appendChild(cardCopy(
        presentation.title,
        venueName() + (connection.displayName && connection.displayName !== presentation.title ? " · " + connection.displayName : ""),
        presentation,
        presentation.reason,
        meta,
        connection.capabilities || []
      ));
      var side = node("div", "card-side");
      side.appendChild(button(
        connection.adapterKey === "local-connector-v1" ? (connection.localStatus === "awaiting_connection" ? "Продолжить настройку" : "Открыть") : "Открыть",
        "secondary small",
        function () { showView(connection.adapterKey === "local-connector-v1" ? "onec" : "api", connection.id, true); }
      ));
      card.appendChild(side);
      root.appendChild(card);
    });
  }

  function googleBusinessPresentation() {
    var providers = state.reviews && state.reviews.data && Array.isArray(state.reviews.data.providers) ? state.reviews.data.providers : [];
    var provider = providers.find(function (item) { return item.id === "google"; }) || null;
    if (!provider) return { kind: "unknown", label: "Неизвестно", known: false, reason: "Состояние Google Business Profile не удалось проверить." };
    if (provider && provider.status === "connected") return { kind: "working", label: "Работает", known: true, provider: provider, reason: "Отзывы автоматически поступают в BarDoctor." };
    if (provider && provider.status === "pending_location") return { kind: "attention", label: "Нужно выбрать профиль", known: true, provider: provider, reason: "Google авторизован, но профиль заведения ещё не выбран." };
    if (provider && (provider.status === "error" || provider.status === "url_linked")) return { kind: "attention", label: "Требует настройки", known: true, provider: provider, reason: provider.lastSyncError || "Завершите подключение профиля Google." };
    if (provider && provider.configured) return { kind: "not-connected", label: "Не подключено", known: true, provider: provider, reason: "Подключите аккаунт Google и выберите профиль заведения." };
    return { kind: "unknown", label: "Автосинхронизация недоступна", known: false, provider: provider, reason: "Google OAuth пока не настроен; ручной ввод и импорт отзывов доступны." };
  }

  function renderReviewLayer() {
    var root = document.getElementById("review-layer-card");
    var status = googleBusinessPresentation();
    var summary = state.reviews && state.reviews.data && state.reviews.data.reviewLayer
      ? state.reviews.data.reviewLayer.summary || {}
      : {};
    root.textContent = "";
    root.removeAttribute("aria-busy");
    root.appendChild(systemLogo("reviews"));
    var sourceCounts = summary.sources || {};
    var methods = summary.methods || {};
    var googleLabel = status.kind === "working" ? "подключено" : status.kind === "attention" ? "требует настройки" : status.kind === "not-connected" ? "не подключено" : "автосинхронизация недоступна";
    var reason = "Источники: Google — " + googleLabel
      + " · ручные — " + number(methods.manual)
      + " · импорт — " + number(methods.file_import);
    var meta = typeof summary.total === "number"
      ? "Всего отзывов: " + number(summary.total) + " · последние данные: " + readableDate(summary.lastReceivedAt)
      : "Ручное добавление и импорт доступны независимо от Google.";
    var copy = cardCopy("Отзывы гостей", venueName(), status, reason, meta);
    var capabilities = node("div", "capability-list");
    capabilities.appendChild(node("span", "", "Google " + number(sourceCounts.google)));
    capabilities.appendChild(node("span", "", "Ручной ввод"));
    capabilities.appendChild(node("span", "", "CSV / Excel / JSON"));
    copy.appendChild(capabilities);
    root.appendChild(copy);
    var side = node("div", "card-side");
    side.appendChild(linkButton("Настроить источники", "/reviews#sources", "secondary small"));
    root.appendChild(side);
  }

  function latestFileRun() {
    if (!state.hub) return null;
    var fileIds = new Set((state.hub.connections || []).filter(function (item) { return item.adapterKey === "universal-file-v1"; }).map(function (item) { return item.id; }));
    return (state.hub.runs || []).find(function (item) { return item.trigger === "file" || fileIds.has(item.connectionId); }) || null;
  }

  function renderFileCard() {
    var root = document.getElementById("file-import-card");
    var run = latestFileRun();
    var status = run
      ? run.status === "success" ? { kind: "working", label: "Последний импорт успешен" }
        : run.status === "failed" || run.status === "partial" ? { kind: "attention", label: "Последний импорт требует проверки" }
          : { kind: "waiting", label: "Импорт выполняется" }
      : { kind: "not-connected", label: "Импортов ещё не было" };
    var reason = run
      ? "Получено: " + number(run.received) + " · создано: " + number(run.created) + " · обновлено: " + number(run.updated)
      : "Разовая загрузка данных из CSV, Excel, JSON или XML.";
    root.textContent = "";
    root.appendChild(systemLogo("file"));
    root.appendChild(cardCopy("Импорт данных", venueName(), status, reason, run ? "Завершено: " + readableDate(run.finishedAt || run.startedAt) : "Сначала BarDoctor проверит структуру файла."));
    var side = node("div", "card-side");
    side.appendChild(button("Импортировать", "secondary small", function () { showView("file", "", true); }));
    root.appendChild(side);
  }

  function renderSummary() {
    var statuses = accountingConnections().map(connectionPresentation);
    var googleBusiness = googleBusinessPresentation();
    if (googleBusiness.known) statuses.push(googleBusiness);
    var counts = { working: 0, attention: 0, waiting: 0, "not-connected": 0 };
    statuses.forEach(function (item) {
      var key = item.kind === "disabled" ? "attention" : item.kind;
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
    });
    document.getElementById("status-working").textContent = String(counts.working);
    document.getElementById("status-attention").textContent = String(counts.attention);
    document.getElementById("status-waiting").textContent = String(counts.waiting);
    document.getElementById("status-not-connected").textContent = String(counts["not-connected"]);
    document.getElementById("summary-note").textContent = statuses.length
      ? "Учтено источников: " + statuses.length + ". Неизвестные состояния не считаются нулём."
      : "Нет подключений с подтверждённым состоянием.";
  }

  function renderOverview() {
    renderAccounting();
    renderReviewLayer();
    renderFileCard();
    renderSummary();
  }

  function currentViewUrl(view, connectionId) {
    var url = new URL("/integrations", window.location.origin);
    var venueId = currentVenueId();
    if (venueId) url.searchParams.set("venue", venueId);
    if (view !== "overview") url.searchParams.set("flow", view);
    if (connectionId) url.searchParams.set("connection", connectionId);
    return url.pathname + url.search;
  }

  function parseView() {
    var url = new URL(window.location.href);
    var allowed = new Set(["catalog", "onec", "api", "file"]);
    var view = allowed.has(url.searchParams.get("flow")) ? url.searchParams.get("flow") : "overview";
    return { view: view, connectionId: url.searchParams.get("connection") || "" };
  }

  function showView(view, connectionId, push) {
    state.view = view || "overview";
    state.connectionId = connectionId || "";
    document.querySelectorAll("[data-integration-view]").forEach(function (section) {
      section.classList.toggle("hidden", section.dataset.integrationView !== state.view);
    });
    document.body.classList.toggle("integration-subview", state.view !== "overview");
    document.getElementById("page-title").textContent = state.view === "overview" ? "Интеграции" : state.view === "catalog" ? "Подключить систему" : state.view === "onec" ? "1С:Предприятие" : state.view === "api" ? "Подключение API" : "Импорт из файла";
    if (push) window.history.pushState({ integrationView: state.view }, "", currentViewUrl(state.view, state.connectionId));
    if (state.view === "onec") renderOneCDetail();
    if (state.view === "api") renderApiDetail();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function detailCard(title, description) {
    var card = node("section", "detail-card");
    var heading = node("div", "detail-card-heading");
    var copy = node("div");
    copy.appendChild(node("h3", "", title));
    if (description) copy.appendChild(node("p", "", description));
    heading.appendChild(copy);
    card.appendChild(heading);
    return card;
  }

  function capabilityOptions(keys, selected, name) {
    var root = node("div", "capability-options");
    var selectedSet = new Set(selected || keys);
    keys.forEach(function (key) {
      var label = node("label", "capability-option");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.name = name || "enabledEntities";
      input.value = key;
      input.checked = selectedSet.has(key);
      label.append(input, document.createTextNode(entityLabels[key]));
      root.appendChild(label);
    });
    return root;
  }

  function tokenReveal(connection, adapterKey) {
    var current = activeToken(connection.id);
    var box = node("div", "token-box");
    if (state.revealedToken && state.revealedToken.connectionId === connection.id) {
      box.appendChild(node("strong", "", "Скопируйте новый ключ сейчас"));
      box.appendChild(node("code", "", state.revealedToken.token));
      box.appendChild(button("Скопировать ключ", "secondary small", function () { copyToken(state.revealedToken.token); }, "key-round"));
      box.appendChild(node("p", "token-warning", "После закрытия этой страницы полный ключ больше не показывается."));
      return box;
    }
    if (current) {
      box.appendChild(node("strong", "", "Ключ подключения активен"));
      box.appendChild(node("code", "", current.prefix + "••••••••••••••••"));
      box.appendChild(node("p", "", "Последнее использование: " + readableDate(current.lastUsedAt)));
      var actions = node("div", "detail-actions");
      actions.appendChild(button("Выпустить новый ключ", "secondary small", function () {
        if (window.confirm("Все предыдущие ключи этого подключения сразу перестанут работать. Продолжить?")) changeConnection(connection, "rotate_token", adapterKey);
      }, "refresh-cw"));
      actions.appendChild(button("Отозвать ключ", "danger small", function () {
        if (window.confirm("Агент или API сразу потеряет доступ к BarDoctor. Отозвать ключ?")) changeConnection(connection, "revoke_token", adapterKey);
      }, "key-round"));
      box.appendChild(actions);
      return box;
    }
    box.appendChild(node("strong", "", "Активного ключа нет"));
    box.appendChild(node("p", "", "Выпустите новый ключ, когда будете готовы продолжить настройку."));
    box.appendChild(button("Выпустить ключ", "secondary small", function () { changeConnection(connection, "issue_token", adapterKey); }, "key-round"));
    return box;
  }

  async function copyToken(value) {
    try {
      await navigator.clipboard.writeText(value);
      showMessage("Ключ скопирован.", false);
    } catch {
      showMessage("Не удалось скопировать автоматически. Выделите ключ вручную.", true);
    }
  }

  async function createOneC(buttonNode) {
    buttonNode.disabled = true;
    buttonNode.textContent = "Создаю подключение…";
    try {
      var result = await api("/api/integration-hub/connections", {
        method: "POST",
        body: JSON.stringify({
          adapterKey: "local-connector-v1",
          provider: "1С",
          displayName: "1С · " + venueName(),
          enabledEntities: oneCCapabilities,
          syncMode: "local_agent",
          config: { enabledEntities: oneCCapabilities, initialSyncDays: 365, updatePolicy: "safe_upsert" }
        })
      });
      state.connectionId = result.connection.id;
      state.revealedToken = { connectionId: result.connection.id, token: result.token };
      await loadData(true);
      showView("onec", result.connection.id, false);
      showMessage("Подключение создано. Скопируйте ключ в Local Connector.", false);
    } catch (error) {
      showMessage(error.message || "Не удалось создать подключение 1С.", true);
      buttonNode.disabled = false;
      buttonNode.textContent = "Создать подключение";
    }
  }

  async function changeConnection(connection, action, adapterKey) {
    try {
      var result = await api("/api/integration-hub/connections", {
        method: "PUT",
        body: JSON.stringify({ connectionId: connection.id, action: action })
      });
      if (result.token) state.revealedToken = { connectionId: connection.id, token: result.token };
      if (action === "revoke_token") state.revealedToken = null;
      await loadData(true);
      showView(adapterKey === "local-connector-v1" ? "onec" : "api", connection.id, false);
      showMessage(action === "rotate_token" ? "Новый ключ выпущен, предыдущий отозван." : action === "revoke_token" ? "Ключ отозван." : action === "issue_token" ? "Новый ключ выпущен." : "Состояние подключения обновлено.", false);
    } catch (error) {
      showMessage(error.message || "Не удалось изменить подключение.", true);
    }
  }

  async function saveCapabilities(connection, form, adapterKey) {
    var values = Array.from(form.querySelectorAll('input[name="enabledEntities"]:checked')).map(function (item) { return item.value; });
    if (!values.length) {
      showMessage("Выберите хотя бы один тип данных.", true);
      return;
    }
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api("/api/integration-hub/connections", {
        method: "PUT",
        body: JSON.stringify({
          connectionId: connection.id,
          displayName: connection.displayName,
          enabledEntities: values,
          config: Object.assign({}, connection.config || {}, { enabledEntities: values })
        })
      });
      await loadData(true);
      showView(adapterKey === "local-connector-v1" ? "onec" : "api", connection.id, false);
      showMessage("Выбранные данные сохранены.", false);
    } catch (error) {
      showMessage(error.message || "Не удалось сохранить настройки.", true);
      submit.disabled = false;
    }
  }

  function setupStep(numberValue, title, description, done, action) {
    var item = node("li", "setup-step" + (done ? " done" : ""));
    var numberNode = node("span", "step-number", done ? undefined : String(numberValue));
    if (done) numberNode.appendChild(icon("circle-check"));
    item.appendChild(numberNode);
    var copy = node("div");
    copy.appendChild(node("h4", "", title));
    copy.appendChild(node("p", "", description));
    item.appendChild(copy);
    if (action) item.appendChild(action);
    return item;
  }

  function renderOneCDetail() {
    var root = document.getElementById("onec-detail");
    root.textContent = "";
    if (!state.hub) return;
    var localConnections = state.hub.connections.filter(function (item) { return item.adapterKey === "local-connector-v1"; });
    var connection = state.connectionId ? localConnections.find(function (item) { return item.id === state.connectionId; }) : localConnections[0];
    if (!connection && state.connectionId) {
      var missing = detailCard("Подключение недоступно", "Оно не найдено в выбранном заведении или у вас нет доступа.");
      missing.appendChild(button("Вернуться к интеграциям", "secondary", function () { showView("overview", "", true); }, "arrow-left"));
      root.appendChild(missing);
      return;
    }
    if (!connection) {
      var start = detailCard("Подготовьте подключение", "Поддержан профиль 1С:Общепит 2.0 на платформе 1С 8.2. База открывается только для чтения.");
      var facts = node("div", "detail-grid");
      [["Способ", "BarDoctor Local Connector for Windows"], ["Режим", "Только чтение"], ["Данные", "Товары, поставщики, склады, накладные и остатки"], ["Windows", "10/11 · Server 2012 R2 с ESU · Server 2016+"], ["Установка", "Без Python, npm и командной строки"]].forEach(function (item) {
        var stat = node("div", "detail-stat"); stat.append(node("span", "", item[0]), node("strong", "", item[1])); facts.appendChild(stat);
      });
      start.appendChild(facts);
      var create = button("Создать подключение", "primary", null, "link-2");
      create.addEventListener("click", function () { createOneC(create); });
      var actions = node("div", "detail-actions");
      actions.append(create, linkButton("Скачать Local Connector", CONNECTOR_DOWNLOAD, "secondary", "download"));
      start.appendChild(actions);
      root.appendChild(start);
      return;
    }
    state.connectionId = connection.id;
    var presentation = connectionPresentation(connection);
    var summary = detailCard("1С:Предприятие · " + venueName(), presentation.reason);
    summary.querySelector(".detail-card-heading").appendChild(statusPill(presentation));
    var summaryGrid = node("div", "detail-grid");
    var summaryValues = [
      ["Последняя связь", readableDate(connection.agent && connection.agent.lastSeenAt)],
      ["Последняя синхронизация", readableDate(connection.lastSuccessAt)],
      ["Компьютер", connection.agent && connection.agent.machineName || "ещё не определён"],
      ["Режим", connection.agent ? connection.agent.readOnly ? "только чтение" : "не подтверждён" : "ожидает проверки"]
    ];
    summaryValues.forEach(function (item) { var stat = node("div", "detail-stat"); stat.append(node("span", "", item[0]), node("strong", "", item[1])); summaryGrid.appendChild(stat); });
    summary.appendChild(summaryGrid);
    summary.appendChild(tokenReveal(connection, "local-connector-v1"));
    root.appendChild(summary);

    var stepsCard = detailCard("Настройка", "Выполняйте шаги на компьютере, где установлена рабочая база 1С.");
    var steps = node("ol", "setup-list");
    steps.appendChild(setupStep(1, "Скачать Local Connector", "Версия 1.1.0 включает проверку Windows Server 2012 R2.", false, linkButton("Скачать", CONNECTOR_DOWNLOAD, "secondary small", "download")));
    steps.appendChild(setupStep(2, "Проверить и установить", "Сначала запустите Check-BarDoctor-Compatibility.cmd, затем Install-BarDoctor-Local-Connector.cmd.", Boolean(connection.agent)));
    steps.appendChild(setupStep(3, "Подключить базу", connection.agent ? "База: " + (connection.agent.infobaseName || "определена агентом") : "Мастер найдёт файловые базы автоматически или попросит указать путь.", Boolean(connection.agent && connection.agent.infobaseName)));
    steps.appendChild(setupStep(4, "Проверить соединение", connection.agent ? "1С " + (connection.agent.platformVersion || "версия определяется") + " · " + (connection.agent.configurationName || "конфигурация определяется") : "После проверки здесь появятся версия платформы и конфигурация.", Boolean(connection.agent), button("Проверить", "secondary small", function () { loadData(true).then(function () { showView("onec", connection.id, false); }); }, "refresh-cw")));
    steps.appendChild(setupStep(5, "Выбрать данные", "Отметьте только те сущности, которые нужно синхронизировать.", Boolean(connection.capabilities && connection.capabilities.length)));
    var run = runsFor(connection.id)[0];
    steps.appendChild(setupStep(6, "Первая синхронизация", run ? "Последний запуск: " + readableDate(run.finishedAt || run.startedAt) + " · " + runStatusLabel(run.status) : "Откройте агент на компьютере и нажмите «Синхронизировать сейчас».", Boolean(run && run.status === "success")));
    stepsCard.appendChild(steps);
    root.appendChild(stepsCard);

    var capabilities = detailCard("Какие данные получать", "Изменение списка не затрагивает уже импортированные данные.");
    var form = node("form", "capability-form");
    form.appendChild(capabilityOptions(oneCCapabilities, connection.capabilities, "enabledEntities"));
    var save = button("Сохранить выбор", "primary", null);
    save.type = "submit";
    form.appendChild(save);
    form.addEventListener("submit", function (event) { event.preventDefault(); saveCapabilities(connection, form, "local-connector-v1"); });
    capabilities.appendChild(form);
    root.appendChild(capabilities);

    renderConnectionHistory(root, connection);
    renderTechnicalDetails(root, connection);
  }

  function runStatusLabel(value) {
    if (value === "success") return "успешно";
    if (value === "partial") return "нужна проверка";
    if (value === "failed") return "ошибка";
    if (value === "syncing") return "выполняется";
    return "ожидает";
  }

  function renderConnectionHistory(root, connection) {
    var mappings = mappingsFor(connection.id);
    if (mappings.length) {
      var mappingCard = detailCard("Нужно сопоставить", "BarDoctor не создаёт дубли по одному названию. Подтвердите соответствия перед повторной синхронизацией.");
      var mappingRoot = node("div", "mapping-list");
      mappings.forEach(function (mapping) { mappingRoot.appendChild(mappingRow(mapping)); });
      mappingCard.appendChild(mappingRoot);
      root.appendChild(mappingCard);
    }
    var runs = runsFor(connection.id).slice(0, 8);
    var history = detailCard("Последние синхронизации", "Полный технический журнал доступен операторам BarDoctor в Internal Admin.");
    if (!runs.length) history.appendChild(node("p", "reason", "Синхронизаций пока не было."));
    else {
      var runRoot = node("div", "run-list");
      runs.forEach(function (run) {
        var row = node("article", "run-row");
        var heading = node("div", "run-row-head");
        heading.append(node("strong", "", entityLabels[run.dataType] || "Данные"), node("span", "run-status " + run.status, runStatusLabel(run.status)));
        row.append(heading, node("p", "", readableDate(run.finishedAt || run.startedAt) + " · получено " + number(run.received) + " · создано " + number(run.created) + " · обновлено " + number(run.updated)));
        if (run.errors || run.mappingIssues) row.appendChild(button("Повторить после исправления", "secondary small", function () { retryRun(run, connection); }, "refresh-cw"));
        runRoot.appendChild(row);
      });
      history.appendChild(runRoot);
    }
    root.appendChild(history);
  }

  function renderTechnicalDetails(root, connection) {
    var card = detailCard("Техническая диагностика", "Эти сведения нужны только при обращении в поддержку.");
    var details = node("details", "diagnostic-details");
    details.appendChild(node("summary", "", "Показать технические сведения"));
    var copy = node("div", "diagnostic-copy");
    [
      "Connection ID: " + connection.id,
      "Канал: " + connection.channel,
      "Адаптер: " + connection.adapterKey,
      "Агент: " + (connection.agent ? connection.agent.version : "—"),
      "ОС: " + (connection.agent && connection.agent.operatingSystem || "—"),
      "1С: " + (connection.agent && connection.agent.platformVersion || "—"),
      "Конфигурация: " + (connection.agent && connection.agent.configurationName || "—") + " " + (connection.agent && connection.agent.configurationVersion || ""),
      "Очередь агента: " + number(connection.agent && connection.agent.metadata && connection.agent.metadata.queueDepth)
    ].forEach(function (text) { copy.appendChild(node("p", "", text)); });
    details.appendChild(copy);
    card.appendChild(details);
    var action = node("div", "detail-actions");
    action.appendChild(button(connection.status === "paused" ? "Возобновить" : "Приостановить", "secondary small", function () { changeConnection(connection, connection.status === "paused" ? "resume" : "pause", connection.adapterKey); }, connection.status === "paused" ? "play" : "pause"));
    card.appendChild(action);
    root.appendChild(card);
  }

  async function retryRun(run, connection) {
    try {
      var result = await api("/api/integration-hub/retry", { method: "POST", body: JSON.stringify({ runId: run.id }) });
      await loadData(true);
      showView(connection.adapterKey === "local-connector-v1" ? "onec" : "api", connection.id, false);
      showMessage("Повтор завершён: " + runStatusLabel(result.run.status) + ".", result.run.status === "failed");
    } catch (error) {
      showMessage(error.message || "Не удалось повторить синхронизацию.", true);
    }
  }

  function mappingRow(mapping) {
    var row = node("article", "mapping-row");
    row.appendChild(node("strong", "", mapping.externalName || "Без названия"));
    row.appendChild(node("p", "meta-line", (mapping.externalUnit ? mapping.externalUnit + " · " : "") + (mapping.reason || "Нужно выбрать соответствие")));
    var label = node("label", "", "Позиция BarDoctor");
    var select = document.createElement("select");
    var placeholder = node("option", "", "Выберите позицию");
    placeholder.value = "";
    select.appendChild(placeholder);
    var catalog = mapping.entityType === "menu_item" ? state.hub.candidateCatalogs.menuItems : state.hub.candidateCatalogs.stockProducts;
    (catalog || []).forEach(function (candidate) {
      var option = node("option", "", candidate.name + (candidate.packageSize ? " · " + candidate.packageSize : ""));
      option.value = candidate.id;
      option.selected = candidate.id === mapping.suggestedInternalId;
      select.appendChild(option);
    });
    label.appendChild(select);
    row.appendChild(label);
    var actions = node("div", "detail-actions");
    actions.appendChild(button("Подтвердить", "primary small", function () {
      if (!select.value) return showMessage("Сначала выберите позицию BarDoctor.", true);
      saveMapping(mapping, select.value, false);
    }));
    if (mapping.entityType === "stock_product") actions.appendChild(button("Создать новую позицию", "secondary small", function () {
      if (window.confirm("Создать новую складскую позицию «" + mapping.externalName + "» при повторной синхронизации?")) saveMapping(mapping, "", true);
    }));
    row.appendChild(actions);
    return row;
  }

  async function saveMapping(mapping, internalId, createNew) {
    try {
      await api("/api/integration-hub/mappings", { method: "PUT", body: JSON.stringify({ mappingId: mapping.id, internalId: internalId, createNew: createNew }) });
      await loadData(true);
      showView(state.view, state.connectionId, false);
      showMessage("Соответствие сохранено.", false);
    } catch (error) {
      showMessage(error.message || "Не удалось сохранить соответствие.", true);
    }
  }

  function renderApiDetail() {
    var root = document.getElementById("api-detail");
    root.textContent = "";
    if (!state.hub) return;
    var apiConnections = state.hub.connections.filter(function (item) { return item.adapterKey === "universal-api-v1"; });
    var connection = state.connectionId ? apiConnections.find(function (item) { return item.id === state.connectionId; }) : null;
    if (!connection && state.connectionId) {
      var missing = detailCard("Подключение не найдено", "Оно не относится к выбранному заведению или больше недоступно.");
      missing.appendChild(button("Вернуться к подключениям", "secondary", function () { showView("overview", "", true); }));
      root.appendChild(missing);
      return;
    }
    if (!connection) {
      var createCard = detailCard("Создать API-подключение", "Этот сценарий предназначен для разработчика вашей системы. Ключ показывается только один раз.");
      var form = node("form", "developer-form");
      var nameLabel = node("label", "", "Название системы");
      var nameInput = document.createElement("input");
      nameInput.type = "text"; nameInput.name = "displayName"; nameInput.required = true; nameInput.maxLength = 140; nameInput.placeholder = "Например: кассовая система";
      nameLabel.appendChild(nameInput);
      form.append(nameLabel, capabilityOptions(apiCapabilities, apiCapabilities, "enabledEntities"));
      var create = button("Создать подключение", "primary", null, "key-round"); create.type = "submit"; form.appendChild(create);
      form.addEventListener("submit", function (event) { event.preventDefault(); createApiConnection(form, create); });
      createCard.appendChild(form);
      root.appendChild(createCard);
      return;
    }
    state.connectionId = connection.id;
    var presentation = connectionPresentation(connection);
    var summary = detailCard(connection.displayName || "Собственная система / API", presentation.reason);
    summary.querySelector(".detail-card-heading").appendChild(statusPill(presentation));
    var endpoint = node("div", "endpoint-box");
    endpoint.append(node("strong", "", "Адрес приёма данных"), node("code", "", window.location.origin + "/api/integration/v1/ingest"));
    summary.append(endpoint, tokenReveal(connection, "universal-api-v1"));
    root.appendChild(summary);
    var capabilities = detailCard("Какие данные принимать", "Повторная доставка с тем же external ID не создаёт дубль.");
    var form = node("form", "capability-form");
    form.appendChild(capabilityOptions(apiCapabilities, connection.capabilities, "enabledEntities"));
    var save = button("Сохранить выбор", "primary", null); save.type = "submit"; form.appendChild(save);
    form.addEventListener("submit", function (event) { event.preventDefault(); saveCapabilities(connection, form, "universal-api-v1"); });
    capabilities.appendChild(form); root.appendChild(capabilities);
    renderConnectionHistory(root, connection);
    renderTechnicalDetails(root, connection);
  }

  async function createApiConnection(form, submit) {
    var enabled = Array.from(form.querySelectorAll('input[name="enabledEntities"]:checked')).map(function (item) { return item.value; });
    var displayName = form.querySelector('[name="displayName"]').value.trim();
    if (!displayName || !enabled.length) return showMessage("Укажите название и выберите данные.", true);
    submit.disabled = true;
    try {
      var result = await api("/api/integration-hub/connections", {
        method: "POST",
        body: JSON.stringify({ adapterKey: "universal-api-v1", provider: displayName, displayName: displayName, enabledEntities: enabled, syncMode: "webhook", config: { enabledEntities: enabled, syncMode: "webhook", updatePolicy: "review_documents" } })
      });
      state.connectionId = result.connection.id;
      state.revealedToken = { connectionId: result.connection.id, token: result.token };
      await loadData(true);
      showView("api", result.connection.id, false);
      showMessage("API-подключение создано. Скопируйте ключ сейчас.", false);
    } catch (error) {
      submit.disabled = false;
      showMessage(error.message || "Не удалось создать API-подключение.", true);
    }
  }

  function clearPreview() {
    state.lastInspection = null;
    document.getElementById("hub-field-mapping").classList.add("hidden");
    document.getElementById("hub-field-mapping-list").textContent = "";
    ["fieldMapping", "headerSignature", "fileKind", "connectionId"].forEach(function (name) { hubForm.querySelector('[name="' + name + '"]').value = ""; });
    updateImportProgress(1);
  }

  function updateImportProgress(step) {
    document.querySelectorAll(".flow-progress li").forEach(function (item, index) { item.classList.toggle("active", index <= step); });
  }

  function mappingValue() {
    var result = {};
    document.querySelectorAll("#hub-field-mapping-list select").forEach(function (select) { if (select.value) result[select.dataset.target] = select.value; });
    hubForm.querySelector('[name="fieldMapping"]').value = JSON.stringify(result);
    return result;
  }

  function renderFileInspection(result) {
    state.lastInspection = result;
    var inspection = result.inspection;
    var root = document.getElementById("hub-field-mapping-list");
    root.textContent = "";
    document.getElementById("hub-preview-summary").textContent = number(inspection.recordCount) + " записей · " + (result.fields.length ? number(inspection.headers.length) + " столбцов" : "готовый контракт") + (result.template ? " · шаблон восстановлен" : "");
    result.fields.forEach(function (field) {
      var label = node("label", "field-map-row", field.label + (field.required ? " *" : ""));
      var select = document.createElement("select"); select.dataset.target = field.target; select.required = field.required;
      var empty = node("option", "", field.required ? "Выберите столбец" : "Не импортировать"); empty.value = ""; select.appendChild(empty);
      inspection.headers.forEach(function (header) { var option = node("option", "", header); option.value = header; option.selected = inspection.suggestedMapping[field.target] === header; select.appendChild(option); });
      select.addEventListener("change", mappingValue); label.appendChild(select); root.appendChild(label);
    });
    hubForm.querySelector('[name="headerSignature"]').value = inspection.headerSignature;
    hubForm.querySelector('[name="fileKind"]').value = inspection.fileKind;
    hubForm.querySelector('[name="connectionId"]').value = result.connectionId;
    mappingValue();
    document.getElementById("hub-field-mapping").classList.remove("hidden");
    updateImportProgress(2);
  }

  async function previewFile(buttonNode) {
    var file = hubForm.querySelector('[name="file"]').files[0];
    if (!file) return showMessage("Сначала выберите файл.", true);
    buttonNode.disabled = true; buttonNode.textContent = "Проверяю…";
    try {
      var result = await api("/api/integration-hub/import/preview", { method: "POST", body: new FormData(hubForm) });
      renderFileInspection(result);
      showMessage("Структура проверена. Подтвердите сопоставление столбцов.", false);
    } catch (error) {
      showMessage(error.message || "Не удалось проверить структуру файла.", true);
    } finally {
      buttonNode.disabled = false; buttonNode.textContent = "Проверить структуру";
    }
  }

  async function importFile() {
    var submit = hubForm.querySelector('button[type="submit"]');
    var resultBox = document.getElementById("hub-import-result");
    submit.disabled = true; submit.textContent = "Импортирую…"; resultBox.classList.add("hidden");
    try {
      if (!state.lastInspection) await previewFile(document.getElementById("hub-preview-button"));
      if (!state.lastInspection) throw new Error("Сначала проверьте структуру файла.");
      var invalid = Array.from(document.querySelectorAll("#hub-field-mapping-list select[required]")).find(function (select) { return !select.value; });
      if (invalid) { invalid.focus(); throw new Error("Сопоставьте все обязательные столбцы."); }
      var mapping = mappingValue();
      if (hubForm.querySelector('[name="saveTemplate"]').checked && Object.keys(mapping).length) {
        await api("/api/integration-hub/templates", { method: "POST", body: JSON.stringify({ connectionId: hubForm.querySelector('[name="connectionId"]').value, entityType: hubForm.querySelector('[name="entityType"]').value, name: "Авто · " + hubForm.querySelector('[name="externalSystem"]').value, fileKind: hubForm.querySelector('[name="fileKind"]').value, headerSignature: hubForm.querySelector('[name="headerSignature"]').value, mapping: mapping }) });
      }
      var result = await api("/api/integration-hub/import", { method: "POST", body: new FormData(hubForm) });
      var run = result.run;
      resultBox.textContent = "Получено: " + number(run.received) + ". Создано: " + number(run.created) + ". Обновлено: " + number(run.updated) + ". Пропущено: " + number(run.skipped) + (run.errors.length ? ". Ошибок: " + number(run.errors.length) : "") + ".";
      resultBox.classList.remove("hidden", "error");
      if (run.status === "failed") resultBox.classList.add("error");
      updateImportProgress(3);
      await loadData(true);
    } catch (error) {
      resultBox.textContent = error.message || "Не удалось выполнить импорт.";
      resultBox.classList.remove("hidden"); resultBox.classList.add("error");
    } finally {
      submit.disabled = false; submit.textContent = "Импортировать";
    }
  }

  function download(name, value, mediaType) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([value], { type: mediaType }));
    link.download = name; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function templateFor(type, format) {
    if (format === "csv") {
      var rows = {
        purchase_document: "documentExternalId,documentNumber,date,supplierName,currency,documentTotal,productExternalId,productName,quantity,unit,unitPrice,lineTotal\nDOC-001,N-001,2026-08-13,Поставщик,MDL,180,PROD-001,Coca-Cola,10,шт.,18,180\n",
        product: "externalId,code,name,group,unit,active,sku\nPROD-001,001,Coca-Cola,Напитки,шт.,true,COLA05\n",
        supplier: "externalId,code,name,taxId,phone,email\nSUP-001,001,Поставщик,100200300,+37300000000,supplier@example.com\n",
        warehouse: "externalId,code,name,active\nWH-001,MAIN,Основной склад,true\n",
        stock_balance: "productExternalId,warehouseExternalId,quantity,unit,measuredAt\nPROD-001,WH-001,24,шт.,2026-08-13\n"
      };
      return { name: "bardoctor-" + type + "-template.csv", value: "\ufeff" + (rows[type] || "externalId,name,date,amount\nITEM-001,Пример,2026-08-13,100\n") };
    }
    return { name: "bardoctor-" + type + "-example.json", value: JSON.stringify({ entityType: type, externalSystem: "Укажите систему", records: [{ externalId: "ITEM-001", name: "Пример", externalUpdatedAt: new Date().toISOString() }] }, null, 2) };
  }

  async function ensureSession() {
    if (localStorage.getItem("bd_session") && localStorage.getItem("bd_session_token")) return;
    var result = await api("/api/auth/bootstrap", { method: "POST", body: "{}" });
    localStorage.setItem("bd_session", result.email);
    localStorage.setItem("bd_session_token", result.token);
    localStorage.setItem("bd_session_userid", String(result.userId));
  }

  async function loadData(preserveView) {
    var sequence = ++state.sequence;
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    var signal = state.controller.signal;
    var requestVenue = currentVenueId();
    if (!state.hub) loading.classList.remove("hidden");
    loadError.classList.add("hidden"); authRequired.classList.add("hidden");
    try {
      await ensureSession();
      var results = await Promise.allSettled([
        api("/api/integration-hub", { method: "GET" }, signal),
        api("/api/reviews/sources", { method: "GET" }, signal)
      ]);
      if (sequence !== state.sequence || requestVenue !== currentVenueId()) return;
      if (results[0].status === "rejected") throw results[0].reason;
      state.hub = results[0].value.data;
      state.reviews = results[1].status === "fulfilled" ? results[1].value : null;
      state.auxiliaryErrors = {
        reviews: results[1].status === "rejected" ? results[1].reason : null
      };
      renderOverview();
      loading.classList.add("hidden");
      var requested = preserveView ? { view: state.view, connectionId: state.connectionId } : parseView();
      showView(requested.view, requested.connectionId, false);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      loading.classList.add("hidden");
      if (error && error.status === 401) authRequired.classList.remove("hidden");
      else {
        loadErrorCopy.textContent = error && error.message ? error.message : "Повторите попытку.";
        loadError.classList.remove("hidden");
      }
    }
  }

  document.getElementById("retry-load").addEventListener("click", function () { loadData(true); });
  document.getElementById("open-catalog").addEventListener("click", function () { showView("catalog", "", true); });
  document.querySelectorAll("[data-system]").forEach(function (control) {
    control.addEventListener("click", function () {
      var system = control.dataset.system;
      if (system === "onec") {
        var connection = accountingConnections().find(function (item) { return item.adapterKey === "local-connector-v1"; });
        showView("onec", connection ? connection.id : "", true);
      } else if (system === "api") showView("api", "", true);
      else if (system === "file") showView("file", "", true);
    });
  });
  document.getElementById("integration-back").addEventListener("click", function (event) {
    if (state.view === "overview") return;
    event.preventDefault();
    if (window.history.length > 1) window.history.back();
    else showView("overview", "", true);
  });
  window.addEventListener("popstate", function () { var requested = parseView(); showView(requested.view, requested.connectionId, false); });
  window.addEventListener("bd:venue-will-change", function () { if (state.controller) state.controller.abort(); state.sequence += 1; });

  document.getElementById("hub-preview-button").addEventListener("click", function (event) { previewFile(event.currentTarget); });
  hubForm.querySelector('[name="file"]').addEventListener("change", function () { clearPreview(); updateImportProgress(1); });
  hubForm.querySelector('[name="entityType"]').addEventListener("change", clearPreview);
  hubForm.addEventListener("submit", function (event) { event.preventDefault(); importFile(); });
  document.querySelectorAll("[data-template]").forEach(function (control) {
    control.addEventListener("click", function () {
      var format = control.dataset.template;
      var template = templateFor(hubForm.querySelector('[name="entityType"]').value, format);
      download(template.name, template.value, format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8");
    });
  });

  loadData(false);
})();

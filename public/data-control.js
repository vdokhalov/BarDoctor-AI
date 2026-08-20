(function () {
  "use strict";

  var state = {
    activeTab: "overview",
    events: [],
    overview: null,
    filters: { modules: [], sources: [], actors: [] },
    page: { offset: 0, limit: 40, total: 0, hasMore: false, nextOffset: 0 },
    selectedModule: "",
    requestSequence: 0,
    controller: null,
    ready: false
  };

  function byId(id) { return document.getElementById(id); }
  function node(tag, className, text) {
    var value = document.createElement(tag);
    if (className) value.className = className;
    if (text != null) value.textContent = text;
    return value;
  }
  function clear(value) { while (value && value.firstChild) value.removeChild(value.firstChild); }
  function currentVenueId() { return localStorage.getItem("bd_active_venue_id") || "default"; }
  function contextKey() { return "bd_data_control_context_v171:" + currentVenueId(); }
  function sessionHeaders(extra) {
    var headers = new Headers(extra || {});
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (email) headers.set("X-Session-Email", email);
    if (token) headers.set("X-Session-Token", token);
    if (venueId) headers.set("X-Venue-Id", venueId);
    return headers;
  }
  async function api(url, options) {
    var response = await fetch(url, Object.assign({}, options || {}, {
      headers: sessionHeaders(options && options.headers),
      cache: "no-store"
    }));
    var result;
    try { result = await response.json(); }
    catch { result = { ok: false, error: "Сервер вернул некорректный ответ" }; }
    if (!response.ok || !result.ok) {
      var error = new Error(result.error || "Не удалось загрузить данные");
      error.status = response.status;
      error.code = result.code;
      throw error;
    }
    return result;
  }
  function storeGet(key) { return api("/api/store/" + encodeURIComponent(key)); }
  function storePut(key, data, reason) {
    return api("/api/store/" + encodeURIComponent(key), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: data, reason: reason })
    });
  }
  function showNotice(message, kind) {
    var notice = byId("trust-notice");
    notice.textContent = message;
    notice.className = "trust-notice" + (kind ? " " + kind : "");
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(function () { notice.classList.add("hidden"); }, 5200);
  }
  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value) || 0);
  }
  function formatTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  function formatDateTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
  }
  function dayKey(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
  }
  function dayTitle(value) {
    if (value === "unknown") return "Дата не определена";
    var current = new Date();
    var today = current.toISOString().slice(0, 10);
    var yesterday = new Date(current.getTime() - 86400000).toISOString().slice(0, 10);
    if (value === today) return "Сегодня";
    if (value === yesterday) return "Вчера";
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
      .format(new Date(value + "T12:00:00"));
  }
  function monthTitle(value) {
    if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return value || "Не указан";
    var label = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
      .format(new Date(value + "-01T12:00:00"));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  function actorOrSource(event) { return event.actorName || event.sourceLabel || "Источник не указан"; }
  function sourceClass(event) {
    return ["integration", "local_connector", "api"].includes(event.source)
      ? "integration"
      : event.source;
  }

  function staticEventMark(event) {
    var mark = node("span", "event-mark " + sourceClass(event));
    mark.setAttribute("aria-hidden", "true");
    return mark;
  }

  function compactEvent(event) {
    var button = node("button", "compact-event");
    button.type = "button";
    button.appendChild(staticEventMark(event));
    var copy = node("span", "compact-event-copy");
    copy.appendChild(node("small", "", formatTime(event.createdAt) + " · " + actorOrSource(event)));
    copy.appendChild(node("strong", "", event.title));
    copy.appendChild(node("span", "", event.summary));
    button.appendChild(copy);
    button.appendChild(node("span", "module-pill", event.module));
    button.addEventListener("click", function () { openEventDetail(event); });
    return button;
  }

  function renderStateCard(overview) {
    var card = byId("integrity-state");
    clear(card);
    var status = overview.state && overview.state.status || "unknown";
    card.className = "trust-card state-card " + status;
    card.appendChild(node("p", "state-kicker", "СОСТОЯНИЕ ДАННЫХ"));
    var main = node("div", "state-main");
    main.appendChild(node("span", "state-symbol"));
    var copy = node("div", "state-copy");
    copy.appendChild(node("h1", "", overview.state && overview.state.title || "Статус неизвестен"));
    copy.appendChild(node("p", "", overview.state && overview.state.description || "Данных для достоверной оценки пока недостаточно."));
    copy.appendChild(node(
      "span",
      "state-coverage",
      status === "attention" ? "Показаны зарегистрированные проблемы" : "Оценка основана только на доступных сигналах"
    ));
    main.appendChild(copy);
    card.appendChild(main);
  }

  function renderMetrics(overview) {
    var root = byId("activity-metrics");
    clear(root);
    (overview.metrics || []).forEach(function (metric) {
      var card = node("article", "metric-card" + (metric.available ? "" : " unavailable"));
      card.appendChild(node("b", "", metric.available ? formatNumber(metric.value) : "—"));
      card.appendChild(node("span", "", metric.label));
      card.appendChild(node("small", "", metric.available ? "за " + overview.periodDays + " дней" : "Недостаточно прав или данных"));
      root.appendChild(card);
    });
    if (!(overview.metrics || []).length) {
      root.appendChild(node("div", "empty-compact", "Показатели активности пока недоступны."));
    }
  }

  function renderIssues(overview) {
    var root = byId("integrity-issues");
    var badge = byId("issue-count");
    clear(root);
    var issues = overview.issues || [];
    byId("integrity-heading").textContent = issues.length ? "Требует внимания" : "Проверка проблем";
    badge.textContent = issues.length ? String(issues.length) : "";
    badge.classList.toggle("hidden", !issues.length);
    if (!issues.length) {
      var empty = node("div", "integrity-empty");
      empty.appendChild(node("span", "", "i"));
      var copy = node("div");
      copy.appendChild(node("strong", "", "Проверенных проблем нет"));
      copy.appendChild(node(
        "p",
        "",
        "Система не нашла зарегистрированных ошибок применения данных. Полный статус остаётся неизвестным, если отдельные виды проблем не журналируются."
      ));
      empty.appendChild(copy);
      root.appendChild(empty);
      return;
    }
    issues.forEach(function (issue) {
      var row = node("a", "issue-row " + (issue.severity || "warning"));
      row.href = issue.actionUrl || "#";
      row.appendChild(node("span", "issue-dot"));
      var copy = node("span", "issue-copy");
      copy.appendChild(node("strong", "", issue.fact));
      copy.appendChild(node("span", "", issue.context));
      copy.appendChild(node("p", "", issue.consequence));
      row.appendChild(copy);
      row.appendChild(node("b", "", "›"));
      root.appendChild(row);
    });
  }

  function renderRecent(overview) {
    var root = byId("recent-events");
    clear(root);
    var events = overview.recent || [];
    if (!events.length) {
      root.appendChild(node("div", "empty-compact", "Изменений в журнале пока нет."));
      return;
    }
    events.forEach(function (event) { root.appendChild(compactEvent(event)); });
  }

  function periodSummaryRow(period) {
    var row = node("div", "summary-period");
    row.appendChild(node("span", "period-symbol " + (period.status === "open" || period.status === "reopened" ? "open" : "")));
    var copy = node("div");
    copy.appendChild(node("strong", "", period.title || period.monthKey));
    var label = period.status === "closed"
      ? "Закрыт" + (period.closedAt ? " · " + formatDateTime(period.closedAt) : "")
      : period.status === "reopened" ? "Открыт повторно" : "Открыт · изменения разрешены";
    copy.appendChild(node("span", "", label));
    row.appendChild(copy);
    row.appendChild(node("b", "", "›"));
    return row;
  }

  function renderPeriodSummary(overview) {
    var root = byId("period-summary");
    clear(root);
    var periods = overview.periods;
    if (!periods || !periods.available) {
      root.appendChild(node("div", "empty-compact", "Состояние периодов скрыто согласно вашим правам."));
      return;
    }
    if (periods.current) root.appendChild(periodSummaryRow(periods.current));
    var latestClosed = (periods.history || []).find(function (period) { return period.status === "closed"; });
    if (latestClosed) root.appendChild(periodSummaryRow(latestClosed));
  }

  function renderCoverage(overview) {
    var root = byId("coverage-note");
    clear(root);
    root.appendChild(node("h3", "", "Что действительно проверяется"));
    root.appendChild(node(
      "p",
      "",
      "Показатели строятся только по зарегистрированным изменениям, результатам синхронизации и зафиксированным блокировкам периода. Неизвестные данные не заменяются нулями."
    ));
    var list = node("div", "coverage-list");
    list.appendChild(node("span", "", "История изменений"));
    list.appendChild(node("span", "", overview.coverage && overview.coverage.integrationRuns ? "Синхронизация отслеживается" : "Интеграции не подключены"));
    list.appendChild(node("span", "", "Блокировки периода · частичная история"));
    if (!(overview.coverage && overview.coverage.conflicts)) list.appendChild(node("span", "", "Конфликты · неполная история"));
    root.appendChild(list);
  }

  function renderOverview() {
    if (!state.overview) return;
    renderStateCard(state.overview);
    renderMetrics(state.overview);
    renderIssues(state.overview);
    renderRecent(state.overview);
    renderPeriodSummary(state.overview);
    renderCoverage(state.overview);
  }

  function journalEvent(event) {
    var button = node("button", "journal-event");
    button.type = "button";
    button.setAttribute("data-event-id", String(event.id));
    button.appendChild(node("time", "journal-time", formatTime(event.createdAt)));
    button.appendChild(staticEventMark(event));
    var copy = node("span", "journal-event-copy");
    copy.appendChild(node("small", "", actorOrSource(event)));
    copy.appendChild(node("strong", "", event.title));
    copy.appendChild(node("span", "", event.summary));
    button.appendChild(copy);
    button.appendChild(node("span", "module-pill", event.module));
    button.appendChild(node("span", "journal-chevron", "›"));
    button.addEventListener("click", function () { openEventDetail(event); });
    return button;
  }

  function renderJournal() {
    var root = byId("journal-list");
    clear(root);
    byId("journal-result-count").textContent = state.page.total
      ? formatNumber(state.page.total) + " событий"
      : "Событий нет";
    if (!state.events.length) {
      var empty = node("div", "journal-empty");
      empty.appendChild(node("strong", "", "За выбранный период изменений нет"));
      empty.appendChild(node("p", "", "Измените фильтры или период. BarDoctor не создаёт демонстрационные события вместо реальной истории."));
      root.appendChild(empty);
    } else {
      var groups = new Map();
      state.events.forEach(function (event) {
        var key = dayKey(event.createdAt);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(event);
      });
      groups.forEach(function (events, key) {
        var section = node("section", "journal-day");
        var heading = node("h2");
        heading.appendChild(node("strong", "", dayTitle(key)));
        heading.appendChild(node("span", "", String(events.length)));
        section.appendChild(heading);
        var list = node("div", "day-events");
        events.forEach(function (event) { list.appendChild(journalEvent(event)); });
        section.appendChild(list);
        root.appendChild(section);
      });
    }
    byId("load-more").classList.toggle("hidden", !state.page.hasMore);
    updateExportUrl();
    openRequestedEvent();
  }

  function fillSelect(select, options, placeholder) {
    var selected = select.value;
    clear(select);
    var first = node("option", "", placeholder);
    first.value = "";
    select.appendChild(first);
    options.forEach(function (item) {
      var option = node("option", "", item.label || item);
      option.value = item.key || item;
      select.appendChild(option);
    });
    select.value = selected;
  }

  function renderFilterOptions() {
    var chips = byId("module-chips");
    clear(chips);
    var all = node("button", "filter-chip" + (state.selectedModule ? "" : " active"), "Все");
    all.type = "button";
    all.addEventListener("click", function () { selectModule(""); });
    chips.appendChild(all);
    (state.filters.modules || []).forEach(function (module) {
      var button = node("button", "filter-chip" + (state.selectedModule === module.key ? " active" : ""), module.label);
      button.type = "button";
      button.addEventListener("click", function () { selectModule(module.key); });
      chips.appendChild(button);
    });
    fillSelect(byId("filter-source"), state.filters.sources || [], "Все источники");
    fillSelect(byId("filter-actor"), state.filters.actors || [], "Все пользователи");
    byId("actor-filter-wrap").classList.toggle("hidden", !(state.filters.actors || []).length);
  }

  function periodCard(period, options) {
    var card = node("article", "period-card");
    card.appendChild(node("span", "period-symbol " + (period.status === "open" || period.status === "reopened" ? "open" : "")));
    var copy = node("div", "period-card-copy");
    copy.appendChild(node("strong", "", period.title || period.monthKey));
    if (period.status === "closed") {
      copy.appendChild(node("span", "", period.closedAt ? "Закрыт " + formatDateTime(period.closedAt) : "Закрыт"));
      if (period.closedBy) copy.appendChild(node("p", "", "Закрыл: " + period.closedBy + (period.reason ? " · " + period.reason : "")));
    } else if (period.status === "reopened") {
      copy.appendChild(node("span", "", period.reopenedAt ? "Открыт повторно " + formatDateTime(period.reopenedAt) : "Открыт повторно"));
      if (period.reopenedBy) copy.appendChild(node("p", "", "Открыл: " + period.reopenedBy));
    } else {
      copy.appendChild(node("span", "", "Можно вносить изменения"));
    }
    card.appendChild(copy);
    card.appendChild(node("span", "period-status " + period.status, period.status === "closed" ? "Закрыт" : period.status === "reopened" ? "Открыт повторно" : "Открыт"));
    if (options && options.canReopen && period.status === "closed") {
      var actions = node("div", "period-card-actions");
      var reopen = node("button", "", "Открыть для исправлений");
      reopen.type = "button";
      reopen.addEventListener("click", function () { reopenPeriod(period); });
      actions.appendChild(reopen);
      card.appendChild(actions);
    }
    return card;
  }

  function renderPeriods() {
    var permission = byId("period-permission");
    var currentSection = byId("current-period-section");
    var closedSection = byId("closed-periods-section");
    var closeLink = byId("close-current-period");
    var periods = state.overview && state.overview.periods;
    if (!periods || !periods.available) {
      permission.textContent = "Состояние периодов недоступно: требуется право просмотра отчётов.";
      permission.classList.remove("hidden");
      currentSection.classList.add("hidden");
      closedSection.classList.add("hidden");
      closeLink.classList.add("hidden");
      return;
    }
    permission.classList.add("hidden");
    currentSection.classList.remove("hidden");
    closedSection.classList.remove("hidden");
    var current = byId("current-period");
    clear(current);
    if (periods.current) current.appendChild(periodCard(periods.current, periods));
    var list = byId("period-list");
    clear(list);
    if (!(periods.history || []).length) {
      list.appendChild(node("div", "journal-empty", "Закрытых периодов пока нет."));
    } else {
      periods.history.forEach(function (period) { list.appendChild(periodCard(period, periods)); });
    }
    closeLink.classList.toggle(
      "hidden",
      !periods.canClose || !periods.current || periods.current.status === "closed"
    );
  }

  function detailMeta(label, value, root) {
    root.appendChild(node("dt", "", label));
    root.appendChild(node("dd", "", value || "Не указано"));
  }

  function openEventDetail(event) {
    var shell = byId("event-detail");
    var content = byId("event-detail-content");
    clear(content);
    byId("event-detail-title").textContent = event.actionLabel || "Изменение данных";
    var hero = node("section", "detail-hero");
    hero.appendChild(node("small", "", event.module + " · " + event.actionLabel));
    hero.appendChild(node("strong", "", event.title));
    hero.appendChild(node("span", "", event.summary));
    content.appendChild(hero);

    var metadata = node("section", "detail-section");
    metadata.appendChild(node("h3", "", "КТО, КОГДА И ОТКУДА"));
    var list = node("dl", "detail-meta");
    detailMeta("Когда", formatDateTime(event.createdAt), list);
    detailMeta("Автор / источник", actorOrSource(event), list);
    detailMeta("Источник", event.sourceLabel, list);
    detailMeta("Объект", event.objectLabel, list);
    detailMeta("Модуль", event.module, list);
    if (event.monthKey) detailMeta("Период", monthTitle(event.monthKey), list);
    if (event.reason) detailMeta("Основание", event.reason, list);
    metadata.appendChild(list);
    content.appendChild(metadata);

    if ((event.diffs || []).length) {
      var diffSection = node("section", "detail-section");
      diffSection.appendChild(node("h3", "", "БЫЛО → СТАЛО"));
      var diffs = node("div", "diff-list");
      event.diffs.forEach(function (diff) {
        var row = node("div", "diff-row");
        row.appendChild(node("strong", "", diff.label));
        var values = node("div", "diff-values");
        values.appendChild(node("span", "", diff.before));
        values.appendChild(node("b", "", "→"));
        values.appendChild(node("span", "", diff.after));
        row.appendChild(values);
        diffs.appendChild(row);
      });
      diffSection.appendChild(diffs);
      content.appendChild(diffSection);
    }
    if (event.relatedUrl) {
      var link = node("a", "detail-link", "Открыть связанный объект");
      link.href = withReturnContext(event.relatedUrl);
      content.appendChild(link);
    }
    content.appendChild(node("div", "detail-technical", "Event ID: " + event.eventId));
    shell.classList.remove("hidden");
    document.body.classList.add("detail-open");
    var close = shell.querySelector("header button");
    if (close) close.focus();
    var url = new URL(window.location.href);
    url.searchParams.set("event", String(event.id));
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function closeEventDetail() {
    byId("event-detail").classList.add("hidden");
    document.body.classList.remove("detail-open");
    var url = new URL(window.location.href);
    url.searchParams.delete("event");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function openRequestedEvent() {
    var eventId = new URLSearchParams(window.location.search).get("event");
    if (!eventId || !byId("event-detail").classList.contains("hidden")) return;
    var event = state.events.find(function (item) { return String(item.id) === String(eventId); })
      || state.overview && (state.overview.recent || []).find(function (item) { return String(item.id) === String(eventId); });
    if (event) openEventDetail(event);
  }

  function withReturnContext(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return value;
      url.searchParams.set("returnTo", "/data-control?tab=journal");
      return url.pathname + url.search + url.hash;
    } catch {
      return value;
    }
  }

  async function reopenPeriod(period) {
    var reason = window.prompt("Укажите причину повторного открытия периода. Она будет сохранена в журнале.");
    if (reason == null) return;
    reason = reason.trim();
    if (!reason) {
      showNotice("Для повторного открытия нужна причина.", "error");
      return;
    }
    try {
      var result = await storeGet("bd_month_closings");
      var closings = Array.isArray(result.data) ? result.data : [];
      var now = new Date().toISOString();
      var actor = localStorage.getItem("bd_user_first_name") || localStorage.getItem("bd_session") || "Пользователь";
      var found = false;
      var next = closings.map(function (item) {
        if (!item || String(item.id || item.monthKey) !== String(period.id || period.monthKey)) return item;
        found = true;
        var history = Array.isArray(item.reopenHistory) ? item.reopenHistory.slice() : [];
        history.push({ at: now, by: actor, reason: reason });
        return Object.assign({}, item, {
          status: "reopened",
          reopenedAt: now,
          reopenedBy: actor,
          reopenReason: reason,
          reopenHistory: history,
          updatedAt: now
        });
      });
      if (!found) throw new Error("Запись закрытого периода не найдена");
      await storePut("bd_month_closings", next, "Период открыт повторно: " + reason);
      showNotice("Период открыт. История предыдущего закрытия сохранена.");
      await loadData(false);
    } catch (error) {
      showNotice(error.message || "Не удалось открыть период", "error");
    }
  }

  function queryParams(offset) {
    var params = new URLSearchParams();
    params.set("limit", String(state.page.limit || 40));
    params.set("offset", String(offset || 0));
    if (state.selectedModule) params.set("module", state.selectedModule);
    var search = byId("audit-search").value.trim();
    var from = byId("filter-from").value;
    var to = byId("filter-to").value;
    var source = byId("filter-source").value;
    var actor = byId("filter-actor").value;
    if (search) params.set("q", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (source) params.set("source", source);
    if (actor) params.set("actor", actor);
    return params;
  }

  function updateExportUrl() {
    var params = queryParams(0);
    params.delete("offset");
    params.delete("limit");
    params.set("format", "csv");
    byId("export-audit").href = "/api/audit?" + params.toString();
  }

  function activeFilterCount() {
    return [
      state.selectedModule,
      byId("filter-from").value,
      byId("filter-to").value,
      byId("filter-source").value,
      byId("filter-actor").value
    ].filter(Boolean).length;
  }

  function updateFilterCount() {
    var count = activeFilterCount();
    var badge = byId("active-filter-count");
    badge.textContent = String(count);
    badge.classList.toggle("hidden", !count);
  }

  async function loadData(append) {
    var sequence = ++state.requestSequence;
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    var offset = append ? state.page.nextOffset : 0;
    var errorBox = byId("journal-error");
    errorBox.classList.add("hidden");
    byId("refresh-journal").disabled = true;
    byId("load-more").disabled = true;
    try {
      var result = await api("/api/audit?" + queryParams(offset).toString(), {
        signal: state.controller.signal
      });
      if (sequence !== state.requestSequence) return;
      state.events = append ? state.events.concat(result.rows || []) : (result.rows || []);
      state.page = result.page || state.page;
      state.overview = result.overview || state.overview;
      state.filters = result.filters || state.filters;
      renderFilterOptions();
      renderOverview();
      renderJournal();
      renderPeriods();
      updateFilterCount();
      byId("trust-loading").classList.add("hidden");
      document.querySelector('[data-panel="' + state.activeTab + '"]').classList.remove("hidden");
      state.ready = true;
      restoreScroll();
    } catch (error) {
      if (error.name === "AbortError") return;
      state.ready = true;
      byId("trust-loading").classList.add("hidden");
      document.querySelector('[data-panel="' + state.activeTab + '"]').classList.remove("hidden");
      errorBox.classList.remove("hidden");
      clear(errorBox);
      var message = error.status === 401
        ? "Сессия завершена. Войдите в BarDoctor снова."
        : error.status === 403
          ? "У вас нет права просматривать журнал и контроль данных."
          : error.message || "Не удалось загрузить данные.";
      errorBox.appendChild(node("strong", "", message));
      var retry = node("button", "", error.status === 401 ? "Перейти ко входу" : "Повторить");
      retry.type = "button";
      retry.addEventListener("click", function () {
        if (error.status === 401) window.location.href = "/login";
        else loadData(false);
      });
      errorBox.appendChild(retry);
      if (state.activeTab !== "journal") activateTab("journal", true);
    } finally {
      if (sequence === state.requestSequence) {
        byId("refresh-journal").disabled = false;
        byId("load-more").disabled = false;
      }
    }
  }

  function selectModule(value) {
    state.selectedModule = value;
    renderFilterOptions();
    updateFilterCount();
    persistContext();
    loadData(false);
  }

  function activateTab(tab, replace) {
    if (!["overview", "journal", "periods"].includes(tab)) tab = "overview";
    state.activeTab = tab;
    document.querySelectorAll("[data-tab]").forEach(function (button) {
      var selected = button.dataset.tab === tab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.classList.toggle("hidden", panel.dataset.panel !== tab || !state.ready);
    });
    var url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    history[replace ? "replaceState" : "pushState"](null, "", url.pathname + url.search + url.hash);
    persistContext();
  }

  function persistContext() {
    try {
      sessionStorage.setItem(contextKey(), JSON.stringify({
        activeTab: state.activeTab,
        selectedModule: state.selectedModule,
        search: byId("audit-search").value,
        from: byId("filter-from").value,
        to: byId("filter-to").value,
        source: byId("filter-source").value,
        actor: byId("filter-actor").value,
        scrollY: Math.round(window.scrollY || 0),
        savedAt: Date.now()
      }));
    } catch {}
  }

  function restoreContext() {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(contextKey()) || "null"); } catch { saved = null; }
    var query = new URLSearchParams(window.location.search);
    state.activeTab = query.get("tab") || saved && saved.activeTab || "overview";
    state.selectedModule = query.get("module") || saved && saved.selectedModule || "";
    byId("audit-search").value = query.get("q") || saved && saved.search || "";
    byId("filter-from").value = query.get("from") || saved && saved.from || "";
    byId("filter-to").value = query.get("to") || saved && saved.to || "";
    byId("filter-source").dataset.restored = query.get("source") || saved && saved.source || "";
    byId("filter-actor").dataset.restored = query.get("actor") || saved && saved.actor || "";
    state.savedScroll = saved && Number.isFinite(saved.scrollY) ? saved.scrollY : 0;
    byId("clear-search").classList.toggle("hidden", !byId("audit-search").value);
  }

  function restoreSelectValues() {
    ["filter-source", "filter-actor"].forEach(function (id) {
      var select = byId(id);
      var restored = select.dataset.restored;
      if (restored && Array.from(select.options).some(function (option) { return option.value === restored; })) {
        select.value = restored;
      }
      delete select.dataset.restored;
    });
  }

  function restoreScroll() {
    if (!state.savedScroll) return;
    var value = state.savedScroll;
    state.savedScroll = 0;
    [0, 80, 180].forEach(function (delay) {
      window.setTimeout(function () { window.scrollTo(0, value); }, delay);
    });
  }

  function resetFilters() {
    state.selectedModule = "";
    byId("filter-from").value = "";
    byId("filter-to").value = "";
    byId("filter-source").value = "";
    byId("filter-actor").value = "";
    updateFilterCount();
    persistContext();
    loadData(false);
  }

  async function exportJournal(event) {
    event.preventDefault();
    var link = byId("export-audit");
    link.setAttribute("aria-busy", "true");
    try {
      var response = await fetch(link.href, { headers: sessionHeaders(), cache: "no-store" });
      if (!response.ok) {
        var payload = await response.json().catch(function () { return {}; });
        throw new Error(payload.error || "Не удалось экспортировать журнал");
      }
      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var download = document.createElement("a");
      download.href = url;
      download.download = "BarDoctor-audit-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 600);
      showNotice("Журнал экспортирован с учётом текущих фильтров.");
    } catch (error) {
      showNotice(error.message || "Не удалось экспортировать журнал", "error");
    } finally {
      link.removeAttribute("aria-busy");
    }
  }

  function bindEvents() {
    document.querySelectorAll("[data-tab]").forEach(function (button) {
      button.addEventListener("click", function () { activateTab(button.dataset.tab); });
    });
    byId("open-journal").addEventListener("click", function () { activateTab("journal"); });
    byId("open-periods").addEventListener("click", function () { activateTab("periods"); });
    byId("refresh-journal").addEventListener("click", function () { loadData(false); });
    byId("load-more").addEventListener("click", function () { loadData(true); });
    byId("toggle-filters").addEventListener("click", function () {
      var panel = byId("journal-filters");
      var open = panel.classList.toggle("hidden") === false;
      byId("toggle-filters").setAttribute("aria-expanded", open ? "true" : "false");
    });
    byId("reset-filters").addEventListener("click", resetFilters);
    ["filter-from", "filter-to", "filter-source", "filter-actor"].forEach(function (id) {
      byId(id).addEventListener("change", function () {
        updateFilterCount();
        persistContext();
        loadData(false);
      });
    });
    byId("audit-search").addEventListener("input", function () {
      byId("clear-search").classList.toggle("hidden", !this.value);
      window.clearTimeout(bindEvents.searchTimer);
      bindEvents.searchTimer = window.setTimeout(function () {
        persistContext();
        loadData(false);
      }, 320);
    });
    byId("clear-search").addEventListener("click", function () {
      byId("audit-search").value = "";
      byId("clear-search").classList.add("hidden");
      persistContext();
      loadData(false);
    });
    byId("export-audit").addEventListener("click", exportJournal);
    document.querySelectorAll("[data-close-detail]").forEach(function (button) {
      button.addEventListener("click", closeEventDetail);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !byId("event-detail").classList.contains("hidden")) closeEventDetail();
    });
    window.addEventListener("pagehide", persistContext);
    window.addEventListener("beforeunload", persistContext);
    window.addEventListener("scroll", function () {
      window.clearTimeout(bindEvents.scrollTimer);
      bindEvents.scrollTimer = window.setTimeout(persistContext, 120);
    }, { passive: true });
    window.addEventListener("storage", function (event) {
      if (event.key === "bd_active_venue_id" && event.newValue !== event.oldValue) {
        state.requestSequence += 1;
        if (state.controller) state.controller.abort();
        window.location.reload();
      }
    });
    window.addEventListener("popstate", function () {
      activateTab(new URLSearchParams(window.location.search).get("tab") || "overview", true);
    });
  }

  async function bootstrap() {
    restoreContext();
    bindEvents();
    activateTab(state.activeTab, true);
    await loadData(false);
    restoreSelectValues();
    if (byId("filter-source").value || byId("filter-actor").value) {
      updateFilterCount();
      await loadData(false);
    }
  }

  bootstrap();
})();

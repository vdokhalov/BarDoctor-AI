(function () {
  "use strict";

  var shared = window.bdOpportunityCalendarClientV327;
  var state = { restaurant: {}, calendar: null, notificationStatus: {}, filter: "all", refreshing: false, bootstrapping: true, offline: false, refreshFailed: false, horizonDays: 365 };
  var $ = function (selector) { return document.querySelector(selector); };

  function authHeaders(extra) {
    var headers = new Headers(extra || {});
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venueId = localStorage.getItem("bd_active_venue_id");
    if (email && token) {
      headers.set("X-Session-Email", email);
      headers.set("X-Session-Token", token);
      if (venueId) headers.set("X-Venue-Id", venueId);
    }
    return headers;
  }

  async function api(url, options, timeout) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeout || 35_000);
    try {
      var response = await fetch(url, Object.assign({}, options || {}, { headers: authHeaders(options && options.headers), signal: controller.signal }));
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok || body.ok === false) {
        var error = new Error(body.error || "Не удалось выполнить запрос");
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      if (error && error.name === "AbortError") throw new Error("Не удалось завершить актуализацию вовремя.");
      throw error;
    } finally { clearTimeout(timer); }
  }

  function element(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function parsedDate(value) {
    var result = new Date(String(value || "").slice(0, 10) + "T12:00:00Z");
    return Number.isNaN(result.getTime()) ? null : result;
  }
  function date(value, options) {
    var parsed = parsedDate(value);
    return parsed ? parsed.toLocaleDateString("ru-RU", Object.assign({ timeZone: "UTC" }, options || {})) : "—";
  }
  function updatedCopy(value) {
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "давно";
    var now = new Date();
    var sameDay = parsed.toLocaleDateString("ru-RU") === now.toLocaleDateString("ru-RU");
    return (sameDay ? "сегодня в " : parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " в ")
      + parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  function plural(value, one, few, many) {
    var mod10 = value % 10;
    var mod100 = value % 100;
    return value + " " + (mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many);
  }
  function categoryLabel(value) {
    return { holiday: "Праздники", sport: "Спорт", concert: "Концерты", festival: "Фестивали", city: "Городские события", seasonal: "Сезонные поводы", other: "События" }[value] || "События";
  }
  function showNotice(message, tone) {
    var notice = $("#notice");
    notice.textContent = message || "";
    notice.className = message ? "notice " + (tone || "") : "notice hidden";
  }

  function setStatus() {
    var status = $("#calendar-status");
    status.className = state.offline ? "offline" : state.refreshFailed ? "warning" : "";
    var copy = state.bootstrapping
      ? "Загружаю сохранённые данные…"
      : state.refreshing && state.calendar
        ? "Обновляю… · сохранённые события остаются доступны"
        : state.offline && state.calendar
          ? "Нет связи · показаны последние сохранённые данные"
          : state.refreshFailed && state.calendar
            ? "Не удалось актуализировать · показаны сохранённые данные"
            : state.calendar
              ? "Данные сохранены · обновлено " + updatedCopy(state.calendar.generatedAt)
              : "Сохранённых данных пока нет";
    status.querySelector("span").textContent = copy;
  }

  function calendarSummary() {
    return shared ? shared.summary(state.calendar) : { events: [], nearest: null, nearestDays: null, highCount: 0, periodDays: 0 };
  }
  function renderSummary() {
    var summary = calendarSummary();
    $("#summary-nearest-value").textContent = summary.nearestDays === null ? "—" : summary.nearestDays === 0 ? "Сегодня" : plural(summary.nearestDays, "день", "дня", "дней");
    $("#summary-nearest-title").textContent = summary.nearest ? summary.nearest.title : "Событий пока нет";
    $("#summary-high-value").textContent = plural(summary.highCount, "событие", "события", "событий");
    $("#summary-period-value").textContent = plural(summary.periodDays || state.horizonDays, "день", "дня", "дней");
    $("#summary-period-range").textContent = state.calendar
      ? date(state.calendar.windowStart, { month: "short", year: "numeric" }) + " — " + date(state.calendar.windowEnd, { month: "short", year: "numeric" }) : "—";
  }
  function visibleEvents() {
    var events = shared ? shared.activeEvents(state.calendar) : [];
    return events.filter(function (event) {
      if (state.filter === "all") return true;
      if (state.filter === "high") return Number(event.potentialScore || 0) >= 70;
      if (state.filter === "planned") return event.decision === "planned" || event.decision === "watching";
      return event.category === state.filter;
    });
  }

  function detailBlock(title, content) {
    var block = element("section", "detail-block");
    block.append(element("strong", "", title), content);
    return block;
  }
  function textList(values, className) {
    var list = element("ul", "detail-list " + (className || ""));
    (values || []).forEach(function (value) { list.appendChild(element("li", "", value)); });
    return list;
  }
  function renderScore(event) {
    var score = element("div", "event-score");
    var number = element("p");
    number.append(element("strong", "", event.potentialScore), element("span", "", "/100"));
    var track = element("div", "score-segments");
    for (var index = 0; index < 5; index += 1) {
      var segment = element("i");
      segment.classList.toggle("active", Number(event.potentialScore || 0) >= (index + 1) * 20 - 10);
      track.appendChild(segment);
    }
    score.append(number, track);
    return score;
  }
  function notificationCopy(event) {
    var plan = event.notificationPlan || {};
    if (plan.status === "scheduled") return "Уведомления запланированы: " + Number(plan.count || 0);
    if (plan.status === "queued") return "Уведомления сохранены и ожидают окна отправки";
    if (plan.status === "disabled") return "Уведомления календаря выключены в настройках";
    if (plan.status === "error") return plan.error || "Не удалось запланировать уведомления";
    return "Уведомления появятся после планирования события";
  }
  function sourceBlock(event) {
    var row = element("div", "source-row");
    var map = new Map(((state.calendar && state.calendar.sources) || []).map(function (source) { return [source.url, source]; }));
    (event.sourceUrls || []).forEach(function (url, index) {
      var source = map.get(url) || {};
      var link = element("a", "", source.title || "Источник " + (index + 1));
      link.href = url; link.target = "_blank"; link.rel = "noreferrer";
      row.appendChild(link);
    });
    return row;
  }
  function breakdownBlock(event) {
    var labels = [["Аудитория", "audienceFit", 30], ["График", "scheduleFit", 20], ["Близость", "proximity", 20], ["Потенциал", "commercialPotential", 20], ["Подготовка", "readiness", 10]];
    var block = element("div", "breakdown");
    labels.forEach(function (item) {
      var value = Number((event.scoreBreakdown || {})[item[1]] || 0);
      var row = element("div", "breakdown-row");
      var track = element("i");
      var fill = element("b");
      fill.style.width = Math.min(100, Math.round(value / item[2] * 100)) + "%";
      track.appendChild(fill);
      row.append(element("span", "", item[0]), track, element("strong", "", value + "/" + item[2]));
      block.appendChild(row);
    });
    return block;
  }
  function recommendationBlock(event) {
    var grid = element("div", "recommendation-grid");
    [["Формат", "format"], ["Предложение", "offer"], ["Продвижение", "promotion"], ["Операции", "operations"]].forEach(function (item) {
      var node = element("div");
      node.append(element("b", "", item[0]), element("span", "", (event.recommendation || {})[item[1]] || "—"));
      grid.appendChild(node);
    });
    return grid;
  }

  function cacheCurrent(result) {
    if (!shared || !state.calendar) return;
    shared.writeSnapshot(Object.assign({}, result || {}, { ok: true, restaurant: state.restaurant, calendar: state.calendar, notificationStatus: state.notificationStatus, horizonDays: state.horizonDays }));
  }
  async function setDecision(eventId, decision, controls) {
    controls.forEach(function (control) { control.disabled = true; });
    try {
      var result = await api("/api/opportunities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-decision", eventId: eventId, decision: decision }) }, 90_000);
      state.calendar = result.calendar; state.refreshFailed = false; cacheCurrent(result); render(); showNotice(result.message, "success");
    } catch (error) {
      showNotice(error.message || "Не удалось сохранить решение.", "warning");
      controls.forEach(function (control) { control.disabled = false; });
    }
  }
  async function deleteEvent(event, controls) {
    if (!window.confirm("Удалить событие «" + event.title + "» из календаря?")) return;
    controls.forEach(function (control) { control.disabled = true; });
    try {
      var result = await api("/api/opportunities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-event", eventId: event.id }) }, 90_000);
      state.calendar = result.calendar; cacheCurrent(result); render(); showNotice(result.message, "success");
    } catch (error) {
      showNotice(error.message || "Не удалось удалить событие.", "warning");
      controls.forEach(function (control) { control.disabled = false; });
    }
  }

  function renderEvent(event) {
    var card = element("article", "event-card " + event.category + " " + event.decision); card.id = event.id;
    var compact = element("div", "event-compact");
    var tile = element("time", "date-tile"); tile.dateTime = event.startDate;
    tile.append(element("span", "", date(event.startDate, { month: "short" }).replace(".", "")), element("strong", "", date(event.startDate, { day: "2-digit" })), element("small", "", date(event.startDate, { weekday: "short" }).replace(".", "")));
    var copy = element("div", "event-copy");
    copy.append(element("h3", "", event.title), element("p", "event-reason", event.summary || event.scoreReason));
    var category = element("span", "event-category " + event.category); category.append(element("i"), document.createTextNode(categoryLabel(event.category))); copy.appendChild(category);
    var score = renderScore(event);
    var contextual = element("button", "contextual-action " + (event.decision === "planned" ? "selected" : event.decision === "watching" ? "watching" : ""), event.decision === "planned" ? "Запланировано" : event.decision === "watching" ? "Следим" : "Запланировать"); contextual.type = "button";
    if (event.decision === "planned" || event.decision === "watching") contextual.setAttribute("aria-pressed", "true");
    compact.append(tile, copy, score, contextual);

    var details = element("details", "event-details"); details.appendChild(element("summary", "", "Подробнее"));
    var content = element("div", "details-content");
    content.append(
      detailBlock("Почему такая оценка", element("p", "", event.scoreReason || "—")),
      detailBlock("Факторы оценки", breakdownBlock(event)),
      detailBlock("Почему это полезно", textList(event.whyUseful)),
      detailBlock("Ожидаемый эффект", element("p", "", [(event.impact || {}).metric, (event.impact || {}).range, (event.impact || {}).basis].filter(Boolean).join(" · ") || "—")),
      detailBlock("Рекомендации", recommendationBlock(event))
    );
    if ((event.risks || []).length) content.appendChild(detailBlock("Риски", textList(event.risks, "risks")));
    content.append(
      detailBlock("Срок решения", element("p", "", event.recommendation && event.recommendation.decisionDeadline ? date(event.recommendation.decisionDeadline, { day: "numeric", month: "long", year: "numeric" }) : "Срок не задан")),
      detailBlock("Уведомления", element("p", "", notificationCopy(event))),
      detailBlock("Источники", sourceBlock(event))
    );
    var actions = element("div", "event-actions");
    var plan = element("button", event.decision === "planned" ? "selected" : "", "Запланировать");
    var watch = element("button", event.decision === "watching" ? "selected" : "", "Следить");
    var dismiss = element("button", "", "Не подходит");
    var remove = element("button", "danger", "Удалить");
    [plan, watch, dismiss, remove].forEach(function (button) { button.type = "button"; });
    var controls = [contextual, plan, watch, dismiss, remove];
    contextual.addEventListener("click", function () { if (event.decision !== "planned" && event.decision !== "watching") setDecision(event.id, "planned", controls); else details.open = true; });
    plan.addEventListener("click", function () { setDecision(event.id, "planned", controls); });
    watch.addEventListener("click", function () { setDecision(event.id, "watching", controls); });
    dismiss.addEventListener("click", function () { setDecision(event.id, "dismissed", controls); });
    remove.addEventListener("click", function () { deleteEvent(event, controls); });
    actions.append(plan, watch, dismiss, remove); details.append(content, actions); card.append(compact, details);
    return card;
  }

  function renderEvents() {
    var events = visibleEvents(); $("#visible-count").textContent = String(events.length);
    var list = $("#event-list"); clear(list);
    if (!events.length) { list.appendChild(element("p", "no-events", "По этому фильтру событий нет.")); return; }
    events.forEach(function (event) { list.appendChild(renderEvent(event)); });
  }
  function render() {
    setStatus();
    $("#loading").classList.toggle("hidden", !state.bootstrapping);
    $("#calendar-summary").classList.toggle("hidden", !state.calendar);
    $("#calendar-content").classList.toggle("hidden", !state.calendar);
    $("#empty-state").classList.toggle("hidden", Boolean(state.calendar) || state.bootstrapping || state.refreshing);
    if (state.calendar) { renderSummary(); renderEvents(); }
    var button = $("#refresh-calendar"); button.disabled = state.refreshing; button.querySelector("b").textContent = state.refreshing ? "Обновляю…" : "Обновить";
  }

  async function refreshCalendar(automatic) {
    if (state.refreshing) return;
    var lease = automatic && shared ? shared.acquireRefreshLease() : "manual";
    if (automatic && !lease) return;
    state.refreshing = true; state.refreshFailed = false; render();
    if (!automatic) showNotice("Проверяю новые события. Сохранённый календарь остаётся доступен.", "info");
    try {
      var result = await api("/api/opportunities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", automatic: Boolean(automatic), knownGeneratedAt: state.calendar && state.calendar.generatedAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Chisinau" }),
      }, 175_000);
      state.calendar = result.calendar || state.calendar; state.offline = false; state.refreshFailed = false; cacheCurrent(result);
      if (!automatic || result.partial) showNotice(result.warning || result.message, result.partial ? "info" : "success");
    } catch (error) {
      state.refreshFailed = Boolean(state.calendar);
      showNotice(state.calendar ? "Не удалось завершить актуализацию. Показаны последние сохранённые данные." : (error.message || "Не удалось собрать календарь."), "warning");
    } finally {
      state.refreshing = false; if (automatic && shared) shared.releaseRefreshLease(lease); render();
    }
  }

  function setupFilters() {
    var filters = $("#filters");
    $("#filter-toggle").addEventListener("click", function () { var open = filters.classList.toggle("open"); this.setAttribute("aria-expanded", String(open)); });
    filters.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-filter]"); if (!button) return;
      state.filter = button.dataset.filter || "all";
      filters.querySelectorAll("button[data-filter]").forEach(function (item) { var selected = item === button; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); });
      filters.classList.remove("open"); $("#filter-toggle").setAttribute("aria-expanded", "false"); renderEvents();
    });
  }
  function setupQuickAdd() {
    var trigger = $("#opportunity-quick-add"); var sheet = $("#opportunity-quick-sheet"); var backdrop = $("#opportunity-quick-backdrop");
    function toggle(open) { sheet.classList.toggle("hidden", !open); backdrop.classList.toggle("hidden", !open); sheet.setAttribute("aria-hidden", String(!open)); trigger.setAttribute("aria-expanded", String(open)); }
    trigger.addEventListener("click", function () { toggle(true); }); $("#opportunity-quick-close").addEventListener("click", function () { toggle(false); }); backdrop.addEventListener("click", function () { toggle(false); });
    sheet.addEventListener("click", function (event) { var button = event.target.closest("button[data-route]"); if (button) location.href = button.dataset.route; });
  }
  function applyResponse(result, offline) {
    state.restaurant = result.restaurant || state.restaurant || {}; state.calendar = result.calendar || null; state.notificationStatus = result.notificationStatus || {}; state.horizonDays = Number(result.horizonDays) || 365; state.offline = Boolean(offline); state.bootstrapping = false;
  }
  async function initialise() {
    setupFilters(); setupQuickAdd();
    $("#refresh-calendar").addEventListener("click", function () { refreshCalendar(false); }); $("#empty-refresh").addEventListener("click", function () { refreshCalendar(false); }); render();
    var cached = shared && shared.readSnapshot();
    if (cached && cached.calendar) {
      applyResponse(cached, false);
      render();
    }
    try {
      var result = await api("/api/opportunities", {}, 15_000); applyResponse(result, false); if (shared) shared.writeSnapshot(result); render();
      if (result.stale) setTimeout(function () { refreshCalendar(true); }, 300);
    } catch (error) {
      if (error.status === 401) { showNotice("Сначала войдите в BarDoctor.", "warning"); setTimeout(function () { location.href = "/"; }, 900); return; }
      if (cached && cached.calendar) { applyResponse(cached, true); render(); }
      else { state.bootstrapping = false; render(); showNotice(error.message || "Не удалось открыть календарь.", "warning"); }
    }
  }
  initialise();
})();

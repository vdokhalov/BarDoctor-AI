(function () {
  "use strict";

  var state = {
    restaurant: null,
    calendar: null,
    notificationStatus: null,
    filter: "all",
    refreshing: false,
    loadingStep: 0,
    horizonDays: 365,
  };
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
      var response = await fetch(url, Object.assign({}, options || {}, {
        headers: authHeaders(options && options.headers),
        signal: controller.signal,
      }));
      var body = await response.json().catch(function () { return {}; });
      if (!response.ok || body.ok === false) {
        var error = new Error(body.error || "Не удалось выполнить запрос");
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Поиск занял слишком много времени. Повторите обновление.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function date(value, options) {
    var parsed = new Date(String(value).slice(0, 10) + "T12:00:00Z");
    if (Number.isNaN(parsed.getTime())) return String(value || "");
    return parsed.toLocaleDateString("ru-RU", options || { day: "numeric", month: "long" });
  }

  function dateTime(value) {
    if (!value) return "";
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function daysUntil(value) {
    var target = new Date(String(value).slice(0, 10) + "T12:00:00Z").getTime();
    var today = new Date();
    var current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12);
    return Math.round((target - current) / 86_400_000);
  }

  function pluralEvents(value) {
    var mod10 = value % 10;
    var mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return value + " событие";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return value + " события";
    return value + " событий";
  }

  function categoryLabel(value) {
    return {
      holiday: "Праздник",
      sport: "Спорт",
      concert: "Концерт",
      festival: "Фестиваль",
      city: "Городское событие",
      seasonal: "Сезонный повод",
      other: "Событие",
    }[value] || "Событие";
  }

  function potentialLabel(value) {
    return value === "high" ? "Высокий" : value === "medium" ? "Средний" : "Низкий";
  }

  function confidenceLabel(value) {
    return value === "high" ? "Факты подтверждены" : value === "medium" ? "Средняя уверенность" : "Нужно перепроверить";
  }

  function calendarTypeLabel(value) {
    return {
      official: "Официальный календарь",
      local: "Локальная дата",
      commercial: "Коммерческий повод",
      discovered: "Подтверждённая афиша",
    }[value] || "Подтверждённое событие";
  }

  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Источник"; }
  }

  function sourceMap() {
    var result = new Map();
    ((state.calendar && state.calendar.sources) || []).forEach(function (source) {
      result.set(source.url, source);
    });
    return result;
  }

  function showNotice(message, tone) {
    var notice = $("#notice");
    if (!message) {
      notice.className = "notice hidden";
      notice.textContent = "";
      return;
    }
    notice.className = "notice " + (tone || "");
    notice.textContent = message;
  }

  function updateScanMeta() {
    var restaurant = state.restaurant || {};
    var calendar = state.calendar;
    var location = calendar && calendar.locationLabel
      ? calendar.locationLabel
      : [restaurant.address, restaurant.city, restaurant.region, restaurant.country].filter(Boolean).join(", ");
    $("#venue-name").textContent = restaurant.name || "Календарь возможностей";
    $("#scan-location").textContent = location || "Укажите город в профиле заведения";
    $("#scan-updated").textContent = calendar ? dateTime(calendar.generatedAt) : "ещё не было";
    $("#scan-period").textContent = calendar
      ? "до " + date(calendar.windowEnd, { day: "numeric", month: "short", year: "numeric" })
      : state.horizonDays + " дней";
    $("#events-window-label").textContent = "БЛИЖАЙШИЕ " + state.horizonDays + " ДНЕЙ";
    var loadingTitle = $("#loading-title");
    if (loadingTitle) loadingTitle.textContent = restaurant.city
      ? "Собираю календарь для города " + restaurant.city
      : "Собираю календарь для вашего города";
    var notification = state.notificationStatus || {};
    var scheduled = calendar && calendar.notificationSummary ? calendar.notificationSummary.scheduled : 0;
    var queued = calendar && calendar.notificationSummary ? Number(calendar.notificationSummary.queued || 0) : 0;
    var planned = scheduled + queued;
    $("#scan-push").textContent = !notification.enabled || !notification.calendarAlerts
      ? "выключены"
      : planned > 0
        ? planned + " запланировано"
        : "включены";
  }

  function visibleEvents() {
    var events = ((state.calendar && state.calendar.events) || []).filter(function (event) {
      if (event.decision === "dismissed") return false;
      if (state.filter === "all") return true;
      if (state.filter === "high") return event.potentialLabel === "high";
      if (state.filter === "planned") return event.decision === "planned";
      return event.category === state.filter;
    });
    return events.slice().sort(function (left, right) {
      return String(left.startDate || "").localeCompare(String(right.startDate || ""))
        || String(left.startTime || "").localeCompare(String(right.startTime || ""))
        || String(left.title || "").localeCompare(String(right.title || ""), "ru");
    });
  }

  function renderHero() {
    var events = ((state.calendar && state.calendar.events) || []).filter(function (event) {
      return event.decision !== "dismissed";
    });
    var high = events.filter(function (event) { return event.potentialLabel === "high"; }).length;
    $("#hero-high-count").textContent = state.calendar ? String(high) : "—";
    $("#hero-window").textContent = state.calendar
      ? pluralEvents(events.length) + " до " + date(state.calendar.windowEnd, { day: "numeric", month: "short", year: "numeric" })
      : "проверяю события";
  }

  function renderSpotlight() {
    var container = $("#spotlight");
    clear(container);
    var events = ((state.calendar && state.calendar.events) || [])
      .filter(function (event) { return event.decision !== "dismissed"; })
      .slice()
      .sort(function (left, right) {
        return right.potentialScore - left.potentialScore || left.startDate.localeCompare(right.startDate);
      });
    var event = events[0];
    if (!event) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");
    var kicker = element("div", "spotlight-kicker");
    kicker.appendChild(element("span", "", "ГЛАВНАЯ ВОЗМОЖНОСТЬ ПЕРИОДА"));
    kicker.appendChild(element("span", "spotlight-score", event.potentialScore + "/100 · " + potentialLabel(event.potentialLabel)));
    var main = element("div", "spotlight-main");
    var copy = element("div");
    copy.appendChild(element("h2", "", event.title));
    copy.appendChild(element("p", "", event.scoreReason));
    var link = element("a", "", "Открыть событие →");
    link.href = "#" + event.id;
    main.append(copy, link);
    var deadline = event.recommendation && event.recommendation.decisionDeadline;
    var deadlineRow = element("div", "spotlight-deadline");
    deadlineRow.appendChild(element("span", "", "◷"));
    deadlineRow.appendChild(element("span", "", deadline
      ? "Решение желательно принять до "
      : "До события "));
    deadlineRow.appendChild(element("b", "", deadline ? date(deadline) : Math.max(0, daysUntil(event.startDate)) + " дн."));
    container.append(kicker, main, deadlineRow);
  }

  function appendList(container, items, className) {
    if (!Array.isArray(items) || !items.length) return;
    var list = element("ul", "detail-list " + (className || ""));
    items.forEach(function (item) { list.appendChild(element("li", "", item)); });
    container.appendChild(list);
  }

  function detailBlock(title) {
    var block = element("section", "detail-block");
    block.appendChild(element("strong", "", title));
    return block;
  }

  function renderBreakdown(event) {
    var block = detailBlock("ПОЧЕМУ ИМЕННО ТАКАЯ ОЦЕНКА");
    block.appendChild(element("p", "", event.scoreReason));
    var breakdown = element("div", "breakdown");
    breakdown.style.marginTop = "13px";
    [
      ["Аудитория", "audienceFit", 30],
      ["График", "scheduleFit", 20],
      ["Близость", "proximity", 20],
      ["Коммерческий эффект", "commercialPotential", 20],
      ["Реальность подготовки", "readiness", 10],
    ].forEach(function (row) {
      var value = Number((event.scoreBreakdown || {})[row[1]] || 0);
      var line = element("div", "breakdown-row");
      line.appendChild(element("span", "", row[0]));
      var track = element("i");
      var fill = element("b");
      fill.style.width = Math.max(0, Math.min(100, value / row[2] * 100)) + "%";
      track.appendChild(fill);
      line.append(track, element("strong", "", value + "/" + row[2]));
      breakdown.appendChild(line);
    });
    block.appendChild(breakdown);
    return block;
  }

  function renderRecommendations(event) {
    var block = detailBlock("ЧТО КОНКРЕТНО ДЕЛАТЬ");
    var grid = element("div", "recommendation-grid");
    [
      ["Формат", event.recommendation.format],
      ["Предложение", event.recommendation.offer],
      ["Продвижение", event.recommendation.promotion],
      ["Операции", event.recommendation.operations],
    ].forEach(function (item) {
      var node = element("div");
      node.append(element("b", "", item[0]), element("span", "", item[1]));
      grid.appendChild(node);
    });
    block.appendChild(grid);
    return block;
  }

  function renderSources(event) {
    var block = detailBlock("ПОДТВЕРЖДАЮЩИЕ ИСТОЧНИКИ");
    var sources = sourceMap();
    var row = element("div", "source-row");
    (event.sourceUrls || []).forEach(function (url, index) {
      var source = sources.get(url) || {};
      var link = element("a", "", source.title || domain(url) || "Источник " + (index + 1));
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      row.appendChild(link);
    });
    block.appendChild(row);
    return block;
  }

  function notificationCopy(event) {
    var plan = event.notificationPlan || {};
    var queued = Number(plan.queuedCount || 0);
    if (plan.status === "scheduled" && plan.count > 0) {
      return {
        tone: "scheduled",
        text: "В OneSignal: " + plan.count
          + (queued > 0 ? " · ожидают 30-дневного окна: " + queued : "")
          + (plan.error ? " · часть будет повторена автоматически" : "")
          + " · ближайшее " + dateTime(plan.nextAt),
      };
    }
    if (plan.status === "queued" && queued > 0) {
      return {
        tone: "scheduled",
        text: "Напоминания сохранены: " + queued
          + ". OneSignal получит их автоматически за 30 дней до отправки · первое "
          + dateTime(plan.nextAt),
      };
    }
    if (plan.status === "disabled") return { tone: "", text: "Уведомления календаря выключены в настройках" };
    if (plan.status === "error") return { tone: "error", text: plan.error || "Не удалось запланировать напоминание" };
    if (event.decision === "dismissed") return { tone: "", text: "Напоминания для события отключены" };
    if (event.potentialLabel !== "high" && event.decision !== "planned") {
      return { tone: "", text: "Push появятся, если взять событие в работу" };
    }
    return { tone: "", text: "Ближайшая дата напоминания уже прошла" };
  }

  async function setDecision(eventId, decision, buttons) {
    buttons.forEach(function (button) { button.disabled = true; });
    try {
      var result = await api("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-decision", eventId: eventId, decision: decision }),
      }, 90_000);
      state.calendar = result.calendar;
      renderCalendar();
      showNotice(result.message, "success");
    } catch (error) {
      showNotice(error.message || "Не удалось сохранить решение.");
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }

  async function deleteEvent(event, buttons) {
    var approved = window.confirm("Удалить событие «" + event.title + "» из календаря? Все связанные напоминания будут отменены.");
    if (!approved) return;
    buttons.forEach(function (button) { button.disabled = true; });
    try {
      var result = await api("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-event", eventId: event.id }),
      }, 90_000);
      state.calendar = result.calendar;
      renderCalendar();
      showNotice(result.message, "success");
    } catch (error) {
      showNotice(error.message || "Не удалось удалить событие.");
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }

  function renderEvent(event) {
    var card = element("article", "event-card " + event.potentialLabel + " " + event.decision);
    card.id = event.id;
    var summary = element("div", "event-summary");
    var dateTile = element("div", "date-tile");
    dateTile.append(
      element("span", "", date(event.startDate, { weekday: "short" }).replace(".", "")),
      element("strong", "", date(event.startDate, { day: "numeric" })),
      element("small", "", date(event.startDate, { month: "short" }).replace(".", ""))
    );
    var title = element("div", "event-title");
    var category = element("p", "event-category " + event.category);
    category.append(element("i"), document.createTextNode(categoryLabel(event.category)));
    title.append(category, element("h3", "", event.title), element("p", "", event.summary));
    var meta = element("div", "event-meta");
    meta.appendChild(element("span", "", "⌖ " + event.location));
    if (event.startTime) meta.appendChild(element("span", "", "◷ " + event.startTime));
    meta.appendChild(element("span", "calendar-type-chip", calendarTypeLabel(event.calendarType)));
    if (event.activationDate && event.activationDate !== event.startDate) {
      meta.appendChild(element("span", "activation-chip", "Рекомендуемая смена: " + date(event.activationDate)));
    }
    if (event.relation && Number(event.relation.distanceKm) > 0) {
      meta.appendChild(element("span", "", "≈ " + Number(event.relation.distanceKm).toLocaleString("ru-RU") + " км"));
    }
    meta.appendChild(element("span", "", confidenceLabel(event.confidence)));
    if (event.decision === "planned") meta.appendChild(element("span", "planned-chip", "✓ В работе"));
    title.appendChild(meta);
    var score = element("div", "score-box " + event.potentialLabel);
    var ring = element("div", "score-ring");
    ring.style.setProperty("--score", String(event.potentialScore));
    ring.appendChild(element("strong", "", event.potentialScore));
    score.append(ring, element("small", "", potentialLabel(event.potentialLabel)));
    summary.append(dateTile, title, score);

    var value = element("div", "event-value");
    var impact = element("div", "value-item impact");
    var venueName = state.restaurant && state.restaurant.name ? state.restaurant.name : "ЗАВЕДЕНИЯ";
    impact.append(
      element("strong", "", "ПОЧЕМУ ДЛЯ «" + String(venueName).toLocaleUpperCase("ru") + "»"),
      element("p", "", event.relation && event.relation.reason ? event.relation.reason : event.scoreReason)
    );
    var action = element("div", "value-item action");
    var activationCopy = event.activationDate && event.activationDate !== event.startDate
      ? date(event.activationDate) + " · " + event.recommendation.format
      : event.recommendation.format;
    action.append(element("strong", "", "КОГДА И В КАКОМ ФОРМАТЕ"), element("p", "", activationCopy));
    value.append(impact, action);

    var details = element("details", "event-details");
    details.appendChild(element("summary", "", "Почему полезно и что делать"));
    var content = element("div", "details-content");
    var why = detailBlock("ПОЧЕМУ ЭТО МОЖЕТ СРАБОТАТЬ");
    appendList(why, event.whyUseful && event.whyUseful.length ? event.whyUseful : [event.audience]);
    var impactBlock = detailBlock("ОЦЕНКА ЭФФЕКТА — НЕ ОБЕЩАНИЕ");
    impactBlock.appendChild(element("p", "", event.impact.metric + " · " + event.impact.range));
    var impactBasis = element("p", "impact-basis", event.impact.basis);
    impactBlock.appendChild(impactBasis);
    content.append(why, renderRecommendations(event), renderBreakdown(event), impactBlock);
    if (event.risks && event.risks.length) {
      var risks = detailBlock("РИСКИ И ОГРАНИЧЕНИЯ");
      appendList(risks, event.risks, "risks");
      content.appendChild(risks);
    }
    content.appendChild(renderSources(event));
    details.appendChild(content);

    var actions = element("div", "event-actions");
    var plan = element("button", event.decision === "planned" ? "selected" : "primary", event.decision === "planned" ? "✓ Взято в работу" : "Берём в работу");
    var watch = element("button", event.decision === "watching" ? "selected" : "", "Наблюдать");
    var dismiss = element("button", "dismiss", "Не подходит");
    var remove = element("button", "delete-event", "Удалить событие");
    [plan, watch, dismiss, remove].forEach(function (button) { button.type = "button"; });
    var buttons = [plan, watch, dismiss, remove];
    plan.addEventListener("click", function () { setDecision(event.id, "planned", buttons); });
    watch.addEventListener("click", function () { setDecision(event.id, "watching", buttons); });
    dismiss.addEventListener("click", function () { setDecision(event.id, "dismissed", buttons); });
    remove.addEventListener("click", function () { deleteEvent(event, buttons); });
    actions.append(plan, watch, dismiss, remove);

    var notification = notificationCopy(event);
    var notificationLine = element("div", "notification-line " + notification.tone);
    notificationLine.append(element("i"), element("span", "", notification.text));
    card.append(summary, value, details, actions, notificationLine);
    return card;
  }

  function renderEvents() {
    var events = visibleEvents();
    $("#visible-count").textContent = pluralEvents(events.length);
    var list = $("#event-list");
    clear(list);
    if (!events.length) {
      list.appendChild(element("div", "no-events", "По этому фильтру событий нет. Попробуйте другой раздел или обновите календарь."));
      return;
    }
    events.forEach(function (event) { list.appendChild(renderEvent(event)); });

    var hash = "";
    try { hash = decodeURIComponent(location.hash.replace(/^#/, "")); } catch { hash = location.hash.replace(/^#/, ""); }
    if (hash) {
      var target = document.getElementById(hash);
      if (target) {
        var details = target.querySelector("details");
        if (details) details.open = true;
        setTimeout(function () { target.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
      }
    }
  }

  function renderCalendar() {
    updateScanMeta();
    renderHero();
    var hasCalendar = Boolean(state.calendar);
    $("#empty-state").classList.toggle("hidden", hasCalendar || state.refreshing);
    $("#calendar-content").classList.toggle("hidden", !hasCalendar);
    if (!hasCalendar) return;
    renderSpotlight();
    renderEvents();
  }

  function setRefreshing(value, background) {
    state.refreshing = value;
    var button = $("#refresh-calendar");
    button.disabled = value;
    button.querySelector("b").textContent = value ? "Ищу события…" : "Обновить возможности";
    $("#loading").classList.toggle("hidden", !value || Boolean(background));
    if (value && !background) {
      $("#empty-state").classList.add("hidden");
      $("#calendar-content").classList.add("hidden");
    }
  }

  async function refreshCalendar(automatic) {
    if (state.refreshing) return;
    var background = Boolean(state.calendar);
    setRefreshing(true, background);
    if (background) showNotice(automatic ? "Плановое обновление: проверяю новые события в фоне." : "Проверяю актуальные события и даты…", "info");
    var steps = Array.from(document.querySelectorAll(".loading-steps span"));
    state.loadingStep = 0;
    var stepTimer = setInterval(function () {
      state.loadingStep = Math.min(steps.length - 1, state.loadingStep + 1);
      steps.forEach(function (step, index) { step.classList.toggle("active", index === state.loadingStep); });
    }, 6_000);
    try {
      var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Chisinau";
      var result = await api("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh", timezone: timezone }),
      }, 175_000);
      state.calendar = result.calendar;
      showNotice(
        result.message + " Оценки привязаны к городу, формату и графику заведения.",
        result.partial ? "info" : "success"
      );
    } catch (error) {
      showNotice(error.message || "Не удалось обновить календарь.");
    } finally {
      clearInterval(stepTimer);
      steps.forEach(function (step, index) { step.classList.toggle("active", index === 0); });
      setRefreshing(false, false);
      renderCalendar();
    }
  }

  function setupFilters() {
    function selectFilter(activeButton) {
      document.querySelectorAll("#filters button[data-filter]").forEach(function (item) {
        var selected = item === activeButton;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
    }
    var initial = document.querySelector('#filters button[data-filter="' + state.filter + '"]') || document.querySelector("#filters button[data-filter]");
    if (initial) selectFilter(initial);
    $("#filters").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-filter]");
      if (!button) return;
      state.filter = button.dataset.filter || "all";
      selectFilter(button);
      renderEvents();
    });
  }

  function setupQuickAdd() {
    var trigger = $("#opportunity-quick-add");
    var sheet = $("#opportunity-quick-sheet");
    var backdrop = $("#opportunity-quick-backdrop");
    function toggle(open) {
      sheet.classList.toggle("hidden", !open);
      backdrop.classList.toggle("hidden", !open);
      sheet.setAttribute("aria-hidden", String(!open));
      trigger.setAttribute("aria-expanded", String(open));
    }
    trigger.addEventListener("click", function () { toggle(true); });
    $("#opportunity-quick-close").addEventListener("click", function () { toggle(false); });
    backdrop.addEventListener("click", function () { toggle(false); });
    sheet.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-route]");
      if (button) location.href = button.dataset.route;
    });
  }

  async function initialise() {
    setupFilters();
    setupQuickAdd();
    $("#refresh-calendar").addEventListener("click", function () { refreshCalendar(false); });
    $("#empty-refresh").addEventListener("click", function () { refreshCalendar(false); });
    try {
      var result = await api("/api/opportunities", {}, 40_000);
      state.restaurant = result.restaurant || {};
      state.calendar = result.calendar || null;
      state.notificationStatus = result.notificationStatus || {};
      state.horizonDays = Number(result.horizonDays) || 365;
      renderCalendar();
      var refreshKey = "bd_opportunities_auto_refresh_v"
        + (state.calendar && state.calendar.version ? state.calendar.version : "none")
        + "_"
        + (state.calendar && state.calendar.profileSignature ? state.calendar.profileSignature : "empty")
        + "_venue_"
        + (localStorage.getItem("bd_active_venue_id") || "none");
      if ((!state.calendar || result.stale) && sessionStorage.getItem(refreshKey) !== "1") {
        sessionStorage.setItem(refreshKey, "1");
        setTimeout(function () { refreshCalendar(true); }, 400);
      }
    } catch (error) {
      if (error.status === 401) {
        showNotice("Сначала войдите в BarDoctor.");
        setTimeout(function () { location.href = "/"; }, 900);
        return;
      }
      showNotice(error.message || "Не удалось открыть календарь.");
      renderCalendar();
    }
  }

  initialise();
})();

(function () {
  "use strict";

  var state = { restaurant: null, coordinates: null, analysis: null };
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

  async function api(url, options) {
    var response = await fetch(url, Object.assign({}, options || {}, {
      headers: authHeaders(options && options.headers),
    }));
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || body.ok === false) {
      var error = new Error(body.error || "Не удалось выполнить запрос");
      error.status = response.status;
      throw error;
    }
    return body;
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

  function dateTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("ru-RU", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function domain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "Источник"; }
  }

  function sectionHeading(icon, tone, kicker, title) {
    var heading = element("div", "section-heading");
    heading.appendChild(element("span", "section-icon " + tone, icon));
    var copy = element("div");
    copy.appendChild(element("p", "eyebrow", kicker));
    copy.appendChild(element("h2", "", title));
    heading.appendChild(copy);
    return heading;
  }

  function sourceMap(data) {
    var map = new Map();
    (data.sources || []).forEach(function (source) { map.set(source.url, source); });
    return map;
  }

  function appendInlineSources(container, urls, sources) {
    if (!Array.isArray(urls) || !urls.length) return;
    var row = element("div", "inline-sources");
    urls.forEach(function (url, index) {
      var source = sources.get(url);
      if (!source) return;
      var link = element("a", "", "Источник " + (index + 1));
      link.href = url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.title = source.title || domain(url);
      row.appendChild(link);
    });
    if (row.childNodes.length) container.appendChild(row);
  }

  function appendTextList(container, items, className) {
    if (!Array.isArray(items) || !items.length) return;
    var list = element("ul", className || "signal-list");
    items.forEach(function (item) { list.appendChild(element("li", "", item)); });
    container.appendChild(list);
  }

  function renderLocation(data, sources) {
    var card = $("#location-card"); clear(card);
    card.appendChild(sectionHeading("⌖", "blue", "ЛОКАЦИЯ И АУДИТОРИЯ", "Кто находится рядом и зачем приходит"));
    card.appendChild(element("span", "fact-label", "ФАКТЫ ИЗ ОТКРЫТЫХ ИСТОЧНИКОВ"));
    card.appendChild(element("p", "result-copy", data.location.summary));
    appendTextList(card, data.location.signals);
    appendInlineSources(card, data.location.sourceUrls, sources);
    if (data.audience && data.audience.summary) {
      var audienceTitle = element("h3", "", "Аудитория района");
      audienceTitle.style.margin = "24px 0 8px";
      audienceTitle.style.fontSize = "17px";
      card.appendChild(audienceTitle);
      card.appendChild(element("p", "result-copy", data.audience.summary));
      var grid = element("div", "audience-grid");
      (data.audience.segments || []).forEach(function (segment) {
        var item = element("div", "audience-item");
        item.appendChild(element("strong", "", segment.name));
        item.appendChild(element("p", "", segment.behaviour));
        item.appendChild(element("em", "", segment.need));
        grid.appendChild(item);
      });
      if (grid.childNodes.length) card.appendChild(grid);
      appendInlineSources(card, data.audience.sourceUrls, sources);
    }
  }

  function renderEconomy(data, sources) {
    var card = $("#economy-card"); clear(card);
    card.appendChild(sectionHeading("↗", "", "КОНТЕКСТ", "Экономика и позиционирование"));
    card.appendChild(element("p", "result-copy", data.economy.summary));
    appendTextList(card, data.economy.signals);
    appendInlineSources(card, data.economy.sourceUrls, sources);
    var position = element("div", "positioning-box");
    position.appendChild(element("strong", "", "ВЫВОД AI — ПОЗИЦИОНИРОВАНИЕ"));
    position.appendChild(element("p", "", data.positioning.summary));
    appendTextList(position, data.positioning.signals, "simple-list");
    appendInlineSources(position, data.positioning.sourceUrls, sources);
    card.appendChild(position);
  }

  function relationLabel(value) {
    return value === "direct" ? "ПРЯМОЙ" : value === "indirect" ? "КОСВЕННЫЙ" : "АЛЬТЕРНАТИВА";
  }

  async function setCompetitorConfirmed(competitor, confirmed) {
    var fallbackKey = String(competitor.name || "").trim().toLocaleLowerCase("ru")
      + "|" + String((competitor.sourceUrls || [])[0] || "");
    try {
      var result = await api("/api/market", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-competitor-confirmed",
          competitorKey: competitor.key || fallbackKey.slice(0, 400),
          confirmed: confirmed,
        }),
      });
      renderAnalysis(result.data);
      showNotice(
        confirmed
          ? competitor.name + " добавлен в подтверждённые конкуренты и будет учитываться AI."
          : competitor.name + " исключён из сравнения AI.",
        true,
      );
    } catch (error) {
      showNotice(error.message || "Не удалось изменить список конкурентов.");
    }
  }

  async function deleteCompetitor(competitor) {
    var approved = window.confirm("Удалить «" + competitor.name + "» из списка конкурентов? Он не вернётся после следующего обновления анализа.");
    if (!approved) return;
    var fallbackKey = String(competitor.name || "").trim().toLocaleLowerCase("ru")
      + "|" + String((competitor.sourceUrls || [])[0] || "");
    try {
      var result = await api("/api/market", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-competitor",
          competitorKey: competitor.key || fallbackKey.slice(0, 400),
        }),
      });
      renderAnalysis(result.data);
      showNotice(competitor.name + " удалён из списка конкурентов.", true);
    } catch (error) {
      showNotice(error.message || "Не удалось удалить конкурента.");
    }
  }

  function renderCompetitors(data, sources) {
    var card = $("#competitors-card"); clear(card);
    card.appendChild(sectionHeading("◎", "", "КОНКУРЕНТЫ РЯДОМ", "С кем сравнивает вас гость"));
    card.appendChild(element("p", "competitor-summary", data.competitorSummary));
    var list = element("div", "competitor-list");
    (data.competitors || []).forEach(function (competitor) {
      var item = element("article", "competitor-item" + (competitor.confirmed ? " confirmed" : ""));
      var head = element("div", "competitor-head");
      var title = element("div");
      title.appendChild(element("h3", "", competitor.name));
      title.appendChild(element("p", "", competitor.category));
      head.appendChild(title);
      head.appendChild(element("span", "relation-badge", relationLabel(competitor.relation)));
      item.appendChild(head);
      var meta = element("div", "competitor-meta");
      if (competitor.distance) meta.appendChild(element("span", "", "⌖ " + competitor.distance));
      if (competitor.rating) meta.appendChild(element("span", "", "★ " + competitor.rating));
      item.appendChild(meta);
      item.appendChild(element("p", "competitor-evidence", competitor.evidence));
      if ((competitor.strengths || []).length || (competitor.gaps || []).length) {
        var comparison = element("div", "strength-gap");
        if ((competitor.strengths || []).length) {
          var strong = element("div", "strength"); strong.appendChild(element("strong", "", "ПОДТВЕРЖДЁННЫЕ СИЛЬНЫЕ СТОРОНЫ"));
          strong.appendChild(element("p", "", competitor.strengths.join(" · "))); comparison.appendChild(strong);
        }
        if ((competitor.gaps || []).length) {
          var gap = element("div", "gap"); gap.appendChild(element("strong", "", "НАБЛЮДАЕМЫЕ ПРОБЕЛЫ"));
          gap.appendChild(element("p", "", competitor.gaps.join(" · "))); comparison.appendChild(gap);
        }
        item.appendChild(comparison);
      }
      appendInlineSources(item, competitor.sourceUrls, sources);
      var confirmation = element("div", "competitor-confirmation");
      var stateBadge = element(
        "span",
        competitor.confirmed ? "confirmation-state confirmed" : "confirmation-state",
        competitor.confirmed ? "✓ Подтверждён" : "Требует подтверждения"
      );
      var button = element(
        "button",
        competitor.confirmed ? "confirmation-button remove" : "confirmation-button",
        competitor.confirmed ? "Исключить" : "Подтвердить конкурента"
      );
      button.type = "button";
      button.addEventListener("click", function () {
        button.disabled = true;
        setCompetitorConfirmed(competitor, !competitor.confirmed).finally(function () {
          button.disabled = false;
        });
      });
      var deleteButton = element("button", "competitor-delete-button", "Удалить");
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", "Удалить конкурента " + competitor.name);
      deleteButton.addEventListener("click", function () {
        deleteButton.disabled = true;
        deleteCompetitor(competitor).finally(function () {
          deleteButton.disabled = false;
        });
      });
      confirmation.appendChild(stateBadge);
      var controls = element("div", "competitor-controls");
      controls.append(button, deleteButton);
      confirmation.appendChild(controls);
      item.appendChild(confirmation);
      list.appendChild(item);
    });
    if (!list.childNodes.length) list.appendChild(element("p", "competitor-summary", "Заведений-кандидатов пока не найдено."));
    card.appendChild(element("p", "competitor-confirmation-note", "В диагноз и рекомендации попадают только подтверждённые конкуренты. Удалённые заведения не возвращаются после обновления анализа."));
    card.appendChild(list);
  }

  function renderInsights(selector, data, type, sources) {
    var card = $(selector); clear(card);
    var isRisk = type === "risk";
    card.appendChild(sectionHeading(isRisk ? "!" : "↗", isRisk ? "orange" : "green", isRisk ? "ЧТО МОЖЕТ ПОМЕШАТЬ" : "ГДЕ МОЖНО ВЫРАСТИ", isRisk ? "Риски" : "Возможности"));
    var list = element("div", "insight-list");
    data.forEach(function (insight) {
      var item = element("div", "insight-item");
      item.appendChild(element("h3", "", insight.title));
      item.appendChild(element("p", "", insight.why));
      item.appendChild(element("em", "", isRisk ? "Как снизить риск: " + insight.mitigation : "Потенциал: " + insight.impact));
      appendInlineSources(item, insight.sourceUrls, sources);
      list.appendChild(item);
    });
    if (!list.childNodes.length) list.appendChild(element("p", "result-copy", "Недостаточно подтверждённых данных."));
    card.appendChild(list);
  }

  function renderDataGrid(selector, items, kind, sources) {
    var card = $(selector); clear(card);
    var marketing = kind === "marketing";
    card.appendChild(sectionHeading(marketing ? "◈" : "$", "blue", marketing ? "ЛОКАЛЬНОЕ ПРОДВИЖЕНИЕ" : "РЫНОЧНЫЕ ОРИЕНТИРЫ", marketing ? "Маркетинг" : "Ценообразование"));
    var grid = element("div", "data-grid");
    items.forEach(function (item) {
      var node = element("div", "data-item");
      node.appendChild(element("strong", "", marketing ? item.channel : item.item));
      node.appendChild(element("b", "", marketing ? item.idea : item.range));
      node.appendChild(element("p", "", marketing ? "KPI: " + item.kpi : item.logic));
      appendInlineSources(node, item.sourceUrls, sources);
      grid.appendChild(node);
    });
    if (!grid.childNodes.length) grid.appendChild(element("p", "result-copy", "Данных для подтверждённого ориентира пока недостаточно."));
    card.appendChild(grid);
  }

  function renderActions(data) {
    var card = $("#actions-card"); clear(card);
    card.appendChild(sectionHeading("✓", "", "ПЛАН ПО РЫНКУ", "Что сделать сейчас"));
    var list = element("div", "action-list");
    (data.actions || []).forEach(function (action) {
      var item = element("article", "action-item");
      var copy = element("div"); copy.appendChild(element("h3", "", action.title)); copy.appendChild(element("p", "", action.why));
      var time = element("div", "action-time");
      var priority = element("strong", "priority-" + action.priority, action.priority === "high" ? "Высокий" : action.priority === "low" ? "Низкий" : "Средний");
      time.appendChild(priority); time.appendChild(element("span", "", "~ " + action.days + " дн."));
      item.appendChild(copy); item.appendChild(time); list.appendChild(item);
    });
    card.appendChild(list);
  }

  function renderSources(data) {
    var card = $("#sources-card"); clear(card);
    card.appendChild(sectionHeading("↗", "blue", "ПРОВЕРЯЕМОСТЬ", "Источники анализа"));
    var list = element("div", "sources-list");
    (data.sources || []).forEach(function (source) {
      var link = element("a", "source-link"); link.href = source.url; link.target = "_blank"; link.rel = "noreferrer";
      link.appendChild(element("span", "", "↗"));
      var copy = element("div"); copy.appendChild(element("strong", "", source.title || domain(source.url))); copy.appendChild(element("small", "", domain(source.url)));
      link.appendChild(copy); list.appendChild(link);
    });
    if (!list.childNodes.length) list.appendChild(element("p", "result-copy", "OpenAI не вернул список публичных источников. Такие выводы следует считать гипотезами."));
    card.appendChild(list);
  }

  function renderAnalysis(data) {
    state.analysis = data;
    var sources = sourceMap(data);
    var competitors = Array.isArray(data.competitors) ? data.competitors : [];
    var confirmedCompetitors = competitors.filter(function (item) { return item.confirmed; });
    $("#result-location").textContent = data.locationLabel || "Локация заведения";
    $("#result-meta").textContent = "Обновлено: " + dateTime(data.generatedAt);
    $("#competitor-count").textContent = String(competitors.length);
    $("#confirmed-competitor-count").textContent = String(confirmedCompetitors.length);
    $("#source-count").textContent = String((data.sources || []).length);
    $("#analysis-date").textContent = "Последний анализ: " + dateTime(data.generatedAt);
    $("#run-label").textContent = "Обновить анализ";
    $("#market-focus").value = data.focus || "";
    renderLocation(data, sources);
    renderEconomy(data, sources);
    renderCompetitors(data, sources);
    renderInsights("#opportunities-card", data.opportunities || [], "opportunity", sources);
    renderInsights("#risks-card", data.risks || [], "risk", sources);
    renderDataGrid("#pricing-card", data.pricing || [], "pricing", sources);
    renderDataGrid("#marketing-card", data.marketing || [], "marketing", sources);
    renderActions(data);
    var assumptions = $("#assumptions-content"); clear(assumptions); appendTextList(assumptions, data.assumptions || [], "simple-list");
    renderSources(data);
    $("#empty-state").classList.add("hidden");
    $("#loading").classList.add("hidden");
    $("#market-results").classList.remove("hidden");
    if (window.location.hash === "#competitors-card" || window.location.hash === "#competitors") {
      window.requestAnimationFrame(function () {
        var target = $("#competitors-card");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function showNotice(message, success, html) {
    var notice = $("#notice");
    notice.className = "notice" + (success ? " success" : "");
    clear(notice);
    if (html) notice.innerHTML = html;
    else notice.textContent = message;
  }

  function hideNotice() { $("#notice").classList.add("hidden"); }

  async function load() {
    try {
      var result = await api("/api/market");
      state.restaurant = result.restaurant || {};
      $("#venue-name").textContent = state.restaurant.name || "Локальный рынок";
      var address = state.restaurant.address || [state.restaurant.city, state.restaurant.region, state.restaurant.country].filter(Boolean).join(", ");
      $("#market-address").value = address;
      if (result.analysis) renderAnalysis(result.analysis);
    } catch (error) {
      if (error.status === 401) {
        showNotice("", false, 'Сессия закончилась. <a href="/login">Войти в BarDoctor</a>');
      } else showNotice(error.message || "Не удалось загрузить анализ");
    }
  }

  function useLocation() {
    var button = $("#use-location");
    var status = $("#location-status");
    if (!navigator.geolocation) {
      status.textContent = "Этот браузер не поддерживает геолокацию. Укажите адрес вручную.";
      return;
    }
    button.disabled = true; status.textContent = "Определяю координаты…";
    navigator.geolocation.getCurrentPosition(function (position) {
      state.coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      button.disabled = false; button.classList.add("active"); button.textContent = "✓";
      status.textContent = "Геолокация получена. Координаты будут использованы только для этого анализа.";
    }, function () {
      button.disabled = false;
      status.textContent = "Не удалось получить геолокацию. Разрешите доступ в настройках браузера или укажите адрес вручную.";
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 });
  }

  async function runAnalysis() {
    var address = $("#market-address").value.trim();
    if (!address && !state.coordinates) {
      showNotice("Укажите адрес, город или нажмите кнопку геолокации.");
      $("#market-address").focus();
      return;
    }
    hideNotice();
    $("#run-analysis").disabled = true;
    $("#run-label").textContent = "Анализирую рынок…";
    $("#empty-state").classList.add("hidden");
    $("#market-results").classList.add("hidden");
    $("#loading").classList.remove("hidden");
    $("#loading").scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      var restaurant = state.restaurant || {};
      var body = {
        address: address,
        city: restaurant.city || "",
        region: restaurant.region || "",
        country: restaurant.country || "",
        focus: $("#market-focus").value.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      };
      if (state.coordinates) Object.assign(body, state.coordinates);
      var result = await api("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      renderAnalysis(result.data);
      showNotice("Анализ обновлён и сохранён для этого заведения.", true);
      $("#notice").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      $("#loading").classList.add("hidden");
      if (state.analysis) $("#market-results").classList.remove("hidden");
      else $("#empty-state").classList.remove("hidden");
      var message = error.message || "Не удалось провести анализ";
      if (/OpenAI.*не подключён|AI ещё не подключён|серверное подключение OpenAI/i.test(message)) {
        showNotice("", false, message);
      } else showNotice(message);
      $("#notice").scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      $("#run-analysis").disabled = false;
      $("#run-label").textContent = state.analysis ? "Обновить анализ" : "Провести анализ";
    }
  }

  function setQuickMenu(open) {
    var sheet = $("#market-quick-sheet");
    var backdrop = $("#market-quick-backdrop");
    var trigger = $("#market-quick-add");
    sheet.classList.toggle("hidden", !open);
    backdrop.classList.toggle("hidden", !open);
    sheet.setAttribute("aria-hidden", open ? "false" : "true");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  $("#use-location").addEventListener("click", useLocation);
  $("#run-analysis").addEventListener("click", runAnalysis);
  $("#market-quick-add").addEventListener("click", function () { setQuickMenu(true); });
  $("#market-quick-close").addEventListener("click", function () { setQuickMenu(false); });
  $("#market-quick-backdrop").addEventListener("click", function () { setQuickMenu(false); });
  document.querySelectorAll("#market-quick-sheet [data-route]").forEach(function (button) {
    button.addEventListener("click", function () {
      setQuickMenu(false);
      window.location.assign(button.getAttribute("data-route"));
    });
  });
  load();
})();

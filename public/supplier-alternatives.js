(function () {
  "use strict";

  var SEGMENTS = [];
  var currentData = null;
  var query = "";
  var $ = function (selector) { return document.querySelector(selector); };

  function headers(extra) {
    var result = new Headers(extra || {});
    var email = localStorage.getItem("bd_session");
    var token = localStorage.getItem("bd_session_token");
    var venue = localStorage.getItem("bd_active_venue_id");
    if (email && token) {
      result.set("X-Session-Email", email);
      result.set("X-Session-Token", token);
      if (venue) result.set("X-Venue-Id", venue);
    }
    return result;
  }

  async function api(method, body) {
    var response = await fetch("/api/supplier-alternatives", {
      method: method,
      headers: headers({ "Content-Type": "application/json" }),
      body: body ? JSON.stringify(body) : undefined,
    });
    var json = await response.json().catch(function () { return {}; });
    if (!response.ok || json.ok === false) throw new Error(json.error || "Не удалось выполнить запрос");
    return json;
  }

  function setStatus(message, isError) {
    var status = $("#status");
    status.textContent = message || "";
    status.setAttribute("role", isError ? "alert" : "status");
  }

  function money(value, currency) {
    return typeof value === "number" && value > 0
      ? value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " " + currency
      : "нет данных";
  }

  function addTerm(container, label, value) {
    var item = document.createElement("div");
    var small = document.createElement("small");
    var strong = document.createElement("b");
    small.textContent = label;
    strong.textContent = value;
    item.append(small, strong);
    container.appendChild(item);
  }

  function safePhone(value) {
    return String(value || "").replace(/[^+\d]/g, "");
  }

  function addContact(container, href, label, kind) {
    if (!href) return;
    var link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    link.className = "contact-link " + kind;
    if (href.indexOf("http") === 0) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    container.appendChild(link);
  }

  function metric(container, value, label) {
    var node = document.createElement("div");
    node.innerHTML = "<b></b><span></span>";
    node.querySelector("b").textContent = value;
    node.querySelector("span").textContent = label;
    container.appendChild(node);
  }

  function appendEmpty(root, title, copy) {
    var empty = document.createElement("div");
    empty.className = "empty";
    var heading = document.createElement("b");
    var text = document.createElement("span");
    heading.textContent = title;
    text.textContent = copy;
    empty.append(heading, text);
    root.appendChild(empty);
  }

  function renderDashboard(root, data, allVisible) {
    var scanned = (data.scannedSegments || []).length;
    var targets = Number(data.targetCount || 0);
    var covered = Number(data.coveredTargetCount || 0);
    var coverage = targets ? Math.round(covered / targets * 100) : 0;
    var totalSegments = Number(data.totalSegments || SEGMENTS.length || 0);
    var dashboard = document.createElement("section");
    dashboard.className = "coverage";
    dashboard.innerHTML = '<div class="coverage-head"><div><small>ОХВАТ ЗАКУПОЧНЫХ ПОЗИЦИЙ</small><h2></h2></div><b class="coverage-pct"></b></div><div class="progress"><i></i></div><div class="metrics"></div>';
    dashboard.querySelector("h2").textContent = covered + " из " + targets + " позиций имеют предложения";
    dashboard.querySelector(".coverage-pct").textContent = coverage + "%";
    dashboard.querySelector(".progress i").style.width = coverage + "%";
    var metrics = dashboard.querySelector(".metrics");
    metric(metrics, allVisible.length, "конкретных товаров");
    metric(metrics, new Set(allVisible.map(function (item) { return item.supplierName; })).size, "поставщиков");
    metric(metrics, scanned + " / " + totalSegments, "поисковых проходов");
    metric(metrics, allVisible.filter(function (item) { return item.decision === "checking"; }).length, "в проверке");
    root.appendChild(dashboard);

    if ((data.uncoveredTargets || []).length) {
      var missing = document.createElement("details");
      missing.className = "missing";
      missing.innerHTML = '<summary>По каким позициям предложений пока нет <b></b></summary><p></p>';
      missing.querySelector("b").textContent = Math.max(0, targets - covered);
      missing.querySelector("p").textContent = data.uncoveredTargets.join(" · ");
      root.appendChild(missing);
    }
  }

  function renderCard(item) {
    var card = document.createElement("article");
    card.className = "card" + (item.decision === "checking" ? " is-checking" : "");
    card.innerHTML = '<div class="head"><div><span class="match"></span><h2></h2><p></p></div><span class="saving"></span></div><div class="price-row"><div><small>Цена поставщика</small><strong class="candidate"></strong><span class="package"></span></div><div><small>Ваша текущая цена</small><strong class="current"></strong><span>при сопоставимой фасовке</span></div></div><div class="offer"></div><div class="terms"></div><section class="contacts"><small>Как связаться и заказать</small><div class="contact-actions"></div><p></p></section><p class="caveat"></p><div class="actions"></div>';
    card.querySelector(".match").textContent = "Для позиции: " + item.matchedTo;
    card.querySelector("h2").textContent = item.product;
    card.querySelector(".head p").textContent = item.supplierName;
    card.querySelector(".saving").textContent = item.decision === "checking"
      ? "В ПРОВЕРКЕ ✓"
      : (typeof item.savingPercent === "number" ? "выгода " + item.savingPercent + "%" : "публичная цена");
    card.querySelector(".candidate").textContent = money(item.candidatePrice, item.currency);
    card.querySelector(".package").textContent = [item.packageSize, item.unit].filter(Boolean).join(" · ");
    card.querySelector(".current").textContent = money(item.currentPrice, item.currency);
    card.querySelector(".offer").textContent = item.offer;

    var terms = card.querySelector(".terms");
    addTerm(terms, "Минимальный заказ", item.minimumOrder);
    addTerm(terms, "Доставка", item.delivery);
    addTerm(terms, "Проверено", item.verifiedAt);

    var contacts = card.querySelector(".contact-actions");
    addContact(contacts, item.phone ? "tel:" + safePhone(item.phone) : "", "Позвонить: " + item.phone, "phone");
    addContact(contacts, item.email ? "mailto:" + item.email : "", "Написать: " + item.email, "email");
    addContact(contacts, (item.sourceUrls || [])[0], "Открыть товар и заказать ↗", "order");
    card.querySelector(".contacts p").textContent = [item.sellerTypeEvidence, item.contactName, item.address].filter(Boolean).join(" · ") || "Проверенный продавец товара";
    card.querySelector(".caveat").textContent = (item.caveats || []).join(" · ") || "Перед заказом подтвердите наличие и условия.";

    var actions = card.querySelector(".actions");
    var check = document.createElement("button");
    check.type = "button";
    check.className = "check";
    check.setAttribute("aria-pressed", String(item.decision === "checking"));
    check.textContent = item.decision === "checking" ? "Убрать из проверки" : "Добавить в проверку";
    check.onclick = function () {
      change(
        { action: "decision", id: item.id, decision: item.decision === "checking" ? "new" : "checking" },
        item.decision === "checking" ? "Убрано из списка проверки" : "Добавлено в список проверки"
      );
    };
    actions.appendChild(check);

    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Не подходит";
    dismiss.onclick = function () { change({ action: "decision", id: item.id, decision: "dismissed" }, "Предложение скрыто"); };
    actions.appendChild(dismiss);

    var remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete";
    remove.textContent = "Удалить";
    remove.onclick = function () {
      if (confirm("Удалить это предложение? Оно не вернётся после следующего поиска.")) {
        change({ action: "delete", id: item.id }, "Предложение удалено");
      }
    };
    actions.appendChild(remove);
    return card;
  }

  function render(data) {
    currentData = data;
    var root = $("#results");
    root.innerHTML = "";
    if (!data) {
      appendEmpty(root, "Полный поиск ещё не запускался", "Запустите поиск: BarDoctor проверит только точные позиции активного меню и сохранит подтверждённые предложения с ценой и ссылкой на продавца.");
      return;
    }

    var alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
    var allVisible = alternatives.filter(function (item) { return item.decision !== "dismissed"; });
    renderDashboard(root, data, allVisible);

    var summary = document.createElement("p");
    summary.className = "summary";
    summary.textContent = data.summary || "";
    root.appendChild(summary);

    if (!allVisible.length) {
      var scanned = (data.scannedSegments || []).length;
      var totalSegments = Number(data.totalSegments || SEGMENTS.length || 0);
      var allHidden = alternatives.length > 0;
      appendEmpty(
        root,
        allHidden ? "Все найденные предложения скрыты" : "Подтверждённых предложений пока нет",
        allHidden
          ? "Запустите поиск повторно после обновления меню или условий закупки. Скрытые предложения не учитываются в охвате."
          : (scanned < totalSegments
            ? "Поиск выполнен не по всем группам. Запустите полный поиск, чтобы проверить оставшиеся позиции."
            : "Все позиции проверены, но публичных закупочных цен с точным совпадением товара пока не найдено. Список отсутствующих позиций показан выше.")
      );
      return;
    }

    var toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.innerHTML = '<input type="search" aria-label="Поиск по предложениям поставщиков" placeholder="Найти товар, позицию или поставщика"><span></span>';
    toolbar.querySelector("input").value = query;
    toolbar.querySelector("input").oninput = function () {
      query = this.value.toLocaleLowerCase("ru").trim();
      render(currentData);
    };
    root.appendChild(toolbar);

    var visible = allVisible.filter(function (item) {
      return !query || [item.product, item.matchedTo, item.supplierName].join(" ").toLocaleLowerCase("ru").indexOf(query) !== -1;
    });
    toolbar.querySelector("span").textContent = "Показано: " + visible.length;

    if (!visible.length) {
      appendEmpty(root, "Ничего не найдено", "Измените поисковый запрос: предложения остаются в списке и не удалены.");
      return;
    }

    var list = document.createElement("div");
    list.className = "list";
    visible.forEach(function (item) { list.appendChild(renderCard(item)); });
    root.appendChild(list);
  }

  function renderNoMenu() {
    currentData = null;
    var root = $("#results");
    root.innerHTML = "";
    appendEmpty(root, "Сначала добавьте товары в меню", "BarDoctor ищет поставщиков только для точных активных позиций. Добавьте названия напитков и продуктов, затем вернитесь к полному поиску.");
  }

  function configureRefreshButton() {
    var button = $("#refresh");
    button.disabled = false;
    if (!SEGMENTS.length) {
      button.dataset.action = "menu";
      button.textContent = "Открыть меню";
    } else {
      button.dataset.action = "search";
      button.textContent = "Запустить полный поиск";
    }
  }

  async function change(body, message) {
    try {
      render((await api("PATCH", body)).data);
      setStatus(message, false);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function load() {
    try {
      var response = await api("GET");
      SEGMENTS = (response.searchPlan || []).map(function (item) { return [item.id, item.label]; });
      if (response.restaurant && response.restaurant.name) $("#venue").textContent = response.restaurant.name;
      configureRefreshButton();
      if (!SEGMENTS.length) {
        renderNoMenu();
        setStatus("В активном меню нет распознанных закупочных позиций. Добавьте точные названия товаров, чтобы запустить поиск.", false);
      } else {
        render(response.data);
        setStatus("Готово к поиску: " + SEGMENTS.length + " групп.", false);
      }
    } catch (error) {
      configureRefreshButton();
      setStatus(error.message, true);
    }
  }

  $("#refresh").onclick = async function () {
    if (this.dataset.action === "menu" || !SEGMENTS.length) {
      location.href = "/catalog";
      return;
    }

    var button = this;
    var completed = 0;
    var errors = [];
    button.disabled = true;
    $("#results").setAttribute("aria-busy", "true");
    for (var index = 0; index < SEGMENTS.length; index += 1) {
      button.textContent = "Поиск " + (index + 1) + " из " + SEGMENTS.length;
      setStatus("Ищем: " + SEGMENTS[index][1] + "… Уже найдено: " + (currentData && currentData.alternatives ? currentData.alternatives.length : 0), false);
      try {
        var response = await api("POST", { segment: SEGMENTS[index][0], reset: index === 0 });
        completed += 1;
        render(response.data);
      } catch (error) {
        errors.push(SEGMENTS[index][1] + ": " + error.message);
      }
    }
    $("#results").removeAttribute("aria-busy");
    configureRefreshButton();
    var errorSummary = errors.length
      ? ". Ошибки: " + errors.slice(0, 3).join("; ") + (errors.length > 3 ? "; ещё " + (errors.length - 3) : "")
      : "";
    setStatus("Поиск завершён: " + completed + " из " + SEGMENTS.length + " проходов" + errorSummary + ".", errors.length > 0);
  };

  load();
})();

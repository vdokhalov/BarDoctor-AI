(function () {
  "use strict";

  var SHELL_VERSION = "v185";
  var HEADER_MARK = "canonical-v185";
  var CATEGORY_TITLES = {
    critical: "Критические события",
    incident: "Критические события",
    shifts: "Смены",
    shift: "Смены",
    tasks: "Поручения",
    task: "Поручения",
    finance: "Финансы",
    equipment: "Оборудование",
    calendar: "Календарь возможностей"
  };
  var ROOT_ROUTES = {
    "/home": "Главная",
    "/shifts": "Смены",
    "/finance": "Финансы",
    "/employees": "Команда",
    "/more": "Ещё"
  };
  var MODULE_ROUTES = {
    "/analysis": ["AI Доктор", "/home"],
    "/events": ["Журнал происшествий", "/home"],
    "/tasks": ["Поручения", "/employees"],
    "/equipment": ["Оборудование", "/more"],
    "/market": ["Локальный рынок", "/home"],
    "/opportunities": ["Календарь возможностей", "/home"],
    "/data-control": ["Контроль данных", "/more"],
    "/team-access": ["Роли и доступ", "/employees"],
    "/integrations": ["Интеграции", "/more"],
    "/profile": ["Профиль", "/more"],
    "/salaries": ["Зарплаты", "/finance"],
    "/payroll": ["Правила оплаты", "/salaries"],
    "/health": ["Диагностика заведения", "/home"],
    "/reviews": ["Отзывы гостей", "/more"],
    "/cases": ["Дела", "/home"],
    "/catalog": ["Ассортимент и техкарты", "/more"],
    "/suppliers": ["Поставщики и закупки", "/more"],
    "/nomenclature": ["Номенклатура", "/more"],
    "/warehouse": ["Склад", "/finance"],
    "/reports": ["Месячный отчёт", "/finance"],
    "/finance/settings": ["Настройки финансов", "/finance"],
    "/notifications": ["Уведомления", "/more"],
    "/settings": ["Настройки", "/more"],
    "/about": ["О BarDoctor", "/more"]
  };
  var DETAIL_ROUTES = [
    [/^\/events\/[^/]+$/, "Происшествие", "/events"],
    [/^\/cases\/add$/, "Новое дело", "/cases"],
    [/^\/cases\/[^/]+$/, "Дело", "/cases"],
    [/^\/equipment\/catalog$/, "Каталог оборудования", "/equipment"],
    [/^\/equipment\/analytics$/, "Аналитика оборудования", "/equipment"],
    [/^\/equipment\/[^/]+\/history\/new$/, "Запись обслуживания", null],
    [/^\/equipment\/[^/]+$/, "Оборудование", "/equipment"],
    [/^\/finance\/shift\/[^/]+\/payroll$/, "Расчёт смены", "/finance"],
    [/^\/employees\/[^/]+$/, "Сотрудник", "/employees"],
    [/^\/salaries\/[^/]+$/, "Зарплата сотрудника", "/salaries"],
    [/^\/smart$/, "Сообщить BarDoctor", "/home"],
    [/^\/add$/, "Добавить", "/home"],
    [/^\/sales-import$/, "Продажи и склад", "/warehouse"],
    [/^\/supplier-alternatives$/, "Новые поставщики", "/suppliers"],
    [/^\/venues\/new$/, "Новое заведение", "/more"]
  ];
  var TAB_SELECTORS = [
    ".bd-team-tabs-v163",
    ".bd-eq-tabs-v167",
    ".bd-assortment-tabs-v170",
    ".bd-proc-tabs-v168",
    ".bd-warehouse-tabs",
    ".trust-tabs"
  ].join(",");
  var LEGACY_HEADERS = [
    ".bd-home-header",
    ".bd-shifts-header",
    ".bd-finance-header-v160",
    ".bd-team-module-header-v163",
    ".bd-more-header-v166",
    ".bd-payroll-header-v164",
    ".bd-settings-header-v182",
    ".notification-header",
    ".integration-header",
    ".market-topbar",
    ".opportunity-topbar",
    ".trust-header",
    ".access-header",
    ".venue-topbar",
    "header.topbar",
    "header.top"
  ].join(",");
  var LEGACY_TITLE_ROWS = [
    ".bd-eq-titlebar-v167",
    ".bd-assortment-titlebar-v170",
    ".bd-proc-titlebar-v168"
  ].join(",");

  function currentUrl() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function startupPending() {
    if (document.documentElement.getAttribute("data-bd-startup-pending") === "v201") return true;
    return !!document.querySelector(
      "[data-bd-root-splash], [data-bd-health-startup-state=\"SPLASH_LOADING\"], [data-bd-health-entry]"
    );
  }

  function urlWithout(keys) {
    var url = new URL(window.location.href);
    keys.forEach(function (key) { url.searchParams.delete(key); });
    return url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") + url.hash;
  }

  function detailFromQuery(path) {
    var query = new URLSearchParams(window.location.search);
    if (path === "/notifications" && query.get("view") && query.get("view") !== "overview") {
      var view = query.get("view");
      var title = view === "category" ? (CATEGORY_TITLES[query.get("category")] || "Категория уведомлений")
        : view === "quiet" ? "Тихие часы"
          : view === "history" ? "История уведомлений"
            : view === "device" ? "Настройки устройства" : "Уведомления";
      return { variant: "detail", title: title, parent: urlWithout(["view", "category"]) };
    }
    if (path === "/data-control" && query.get("event")) {
      return { variant: "detail", title: "Событие журнала", parent: urlWithout(["event"]) };
    }
    if (path === "/integrations" && ((query.get("view") && query.get("view") !== "overview") || (query.get("flow") && query.get("flow") !== "overview"))) {
      var integrationFlow = query.get("flow") || query.get("view");
      var integrationTitle = integrationFlow === "catalog" ? "Подключить систему"
        : integrationFlow === "onec" ? "1С:Предприятие"
          : integrationFlow === "api" ? "Подключение API"
            : integrationFlow === "file" ? "Импорт из файла" : "Подключение";
      return { variant: "detail", title: integrationTitle, parent: urlWithout(["view", "connectionId", "sourceId", "flow", "connection"]) };
    }
    if (path === "/catalog" && query.get("itemId")) {
      return { variant: "detail", title: "Позиция меню", parent: urlWithout(["itemId"]) };
    }
    if (path === "/suppliers" && query.get("documentId")) {
      return { variant: "detail", title: "Закупочный документ", parent: urlWithout(["documentId", "edit", "returnTo"]) };
    }
    if (path === "/suppliers" && query.get("supplierId")) {
      return { variant: "detail", title: "Поставщик", parent: urlWithout(["supplierId", "edit"]) };
    }
    if (path === "/suppliers" && query.get("compareKey")) {
      return { variant: "detail", title: "Сравнение предложений", parent: urlWithout(["compareKey"]) };
    }
    if (path === "/finance" && ["closeShift", "addExpense", "repairEquipmentId"].some(function (key) { return query.has(key); })) {
      return { variant: "detail", title: query.has("addExpense") ? "Новый расход" : query.has("repairEquipmentId") ? "Расход на оборудование" : "Закрытие смены", parent: urlWithout(["closeShift", "addExpense", "repairEquipmentId"]) };
    }
    if (path === "/shifts" && query.has("closeShift")) return { variant: "detail", title: "Закрытие смены", parent: urlWithout(["closeShift"]) };
    if (path === "/warehouse" && query.has("add")) return { variant: "detail", title: "Операция склада", parent: urlWithout(["add"]) };
    if (path === "/tasks" && query.get("new") === "1") return { variant: "detail", title: "Новое поручение", parent: urlWithout(["new", "title", "responsible"]) };
    if (path === "/reports" && query.has("closeMonth")) return { variant: "detail", title: "Закрытие периода", parent: urlWithout(["closeMonth"]) };
    return null;
  }

  function resolveRoute() {
    var path = window.location.pathname;
    var queryDetail = detailFromQuery(path);
    if (queryDetail) return queryDetail;
    if (ROOT_ROUTES[path]) return { variant: "root", title: ROOT_ROUTES[path], parent: null };
    if (MODULE_ROUTES[path]) return { variant: "module", title: MODULE_ROUTES[path][0], parent: MODULE_ROUTES[path][1] };
    for (var index = 0; index < DETAIL_ROUTES.length; index += 1) {
      var rule = DETAIL_ROUTES[index];
      if (!rule[0].test(path)) continue;
      var parent = rule[2];
      if (!parent && /\/history\/new$/.test(path)) parent = path.replace(/\/history\/new$/, "");
      return { variant: "detail", title: rule[1], parent: parent };
    }
    return null;
  }

  function isPublicOrEmbedded() {
    if (new URLSearchParams(window.location.search).get("embedded") === "1") return true;
    return /^\/(?:admin|api|login|register|forgot-password|join|setup|terms|privacy|reset)(?:\/|$)/.test(window.location.pathname);
  }

  function backLabel(config) {
    return config && config.variant === "detail" ? "Назад" : "Вернуться назад";
  }

  function makeIconButton(original, staticAction) {
    var action = document.createElement("button");
    action.className = "bd-app-header-action";
    action.type = "button";
    var label = staticAction && staticAction.label || original && (original.getAttribute("aria-label") || original.getAttribute("title")) || "Действие";
    action.setAttribute("aria-label", label);
    action.title = label;
    if (staticAction && staticAction.icon === "bell") action.textContent = "♢";
    else if (original) action.innerHTML = original.innerHTML || "+";
    else action.textContent = "+";
    if (original) action.addEventListener("click", function () {
      if (original.matches(".bd-finance-quick-add-fab")) openProxyActionMenu(original);
      else original.click();
    });
    else if (staticAction && staticAction.href) action.addEventListener("click", function () {
      if (typeof window.bdNavigate === "function") window.bdNavigate(staticAction.href);
      else window.location.assign(staticAction.href);
    });
    return action;
  }

  function openProxyActionMenu(original) {
    var previous = document.querySelector("[data-bd-app-action-sheet]");
    if (previous) previous.remove();
    var source = original.closest("details") || original.parentElement;
    var sourceButtons = source ? Array.from(source.querySelectorAll('[role="menuitem"],.bd-finance-quick-add-menu button')) : [];
    if (!sourceButtons.length) { original.click(); return; }
    var shell = document.createElement("div");
    shell.className = "bd-app-action-sheet";
    shell.setAttribute("data-bd-app-action-sheet", "");
    var backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Закрыть быстрые действия");
    var panel = document.createElement("div");
    panel.className = "bd-app-action-sheet-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Быстрые финансовые действия");
    var title = document.createElement("strong");
    title.textContent = "Быстрые финансовые действия";
    panel.appendChild(title);
    sourceButtons.forEach(function (sourceButton) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = (sourceButton.textContent || "Действие").trim();
      button.addEventListener("click", function () { shell.remove(); sourceButton.click(); });
      panel.appendChild(button);
    });
    backdrop.addEventListener("click", function () { shell.remove(); });
    shell.appendChild(backdrop);
    shell.appendChild(panel);
    document.body.appendChild(shell);
    panel.querySelector("button")?.focus();
  }

  function explicitAction(config) {
    var path = window.location.pathname;
    if (path === "/opportunities" && config.variant === "module") return { href: "/notifications", label: "Настройки уведомлений", icon: "bell" };
    var selector = path === "/finance" ? ".bd-finance-quick-add-fab"
      : path === "/employees" ? ".bd-team-header-add-v163"
        : path === "/equipment" ? ".bd-eq-add-icon-v167" : "";
    return selector ? document.querySelector(selector) : null;
  }

  function genericAction() {
    var back = Array.from(document.querySelectorAll('button[aria-label^="Назад"],button[aria-label^="Закрыть"],a[data-bd-back]')).find(function (item) {
      return !item.closest("bd-app-header,dialog,[role=dialog]");
    });
    if (!back) return null;
    var row = back.parentElement;
    if (!row) return null;
    return Array.from(row.querySelectorAll("button,a[href],summary[role=button]")).find(function (item) {
      if (item === back || item.closest("[data-bd-venue-host]") || item.matches("[data-bd-back],.bd-venue-trigger")) return false;
      return Boolean(item.getAttribute("aria-label") || item.getAttribute("title"));
    }) || null;
  }

  function legacyTitleRow(back) {
    var current = back && back.parentElement;
    for (var depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      if (current.matches("main,body,#root")) break;
      if (current.querySelector("h1") && !current.querySelector("nav,[role=tablist]")) return current;
    }
    return null;
  }

  function markLegacyHeaders() {
    document.querySelectorAll(LEGACY_HEADERS).forEach(function (header) {
      if (!header.closest("dialog,[role=dialog]") && !header.matches("bd-app-header")) header.setAttribute("data-bd-legacy-header", "true");
    });
    document.querySelectorAll(LEGACY_TITLE_ROWS).forEach(function (row) { row.setAttribute("data-bd-legacy-header", "true"); });
    document.querySelectorAll(".bd-eq-header-v167,.bd-assortment-header-v170,.bd-proc-header-v168").forEach(function (header) { header.setAttribute("data-bd-header-tabs-host", "true"); });
    document.querySelectorAll('button[aria-label^="Назад"],button[aria-label^="Закрыть"],a[data-bd-back]').forEach(function (back) {
      if (back.closest("bd-app-header,dialog,[role=dialog]")) return;
      var row = legacyTitleRow(back);
      if (row) row.setAttribute("data-bd-legacy-header", "true");
    });
  }

  function decorateTabs() {
    document.querySelectorAll(TAB_SELECTORS).forEach(function (tabs) {
      if (tabs.closest("dialog,[role=dialog]") || tabs.closest("[data-bd-bottom-nav]")) return;
      tabs.setAttribute("data-bd-tabs", HEADER_MARK);
      if (!tabs.hasAttribute("role")) tabs.setAttribute("role", "tablist");
      tabs.querySelectorAll(":scope > button").forEach(function (button) {
        if (!button.hasAttribute("role")) button.setAttribute("role", "tab");
      });
    });
  }

  function moveVenueTrigger(header, config) {
    var host = header.querySelector("[data-bd-canonical-venue-host]");
    if (!host || config.variant === "detail") return;
    var triggers = Array.from(document.querySelectorAll("[data-bd-venue-trigger]")).filter(function (item) { return !item.closest(".bd-venue-sheet"); });
    var trigger = triggers.find(function (item) { return item.closest("bd-app-header"); }) || triggers[triggers.length - 1];
    if (!trigger) return;
    trigger.classList.add("bd-venue-trigger-inline");
    if (trigger.parentElement !== host) host.appendChild(trigger);
    triggers.forEach(function (item) { if (item !== trigger && !item.closest("bd-app-header")) item.remove(); });
  }

  function navigateBack(config) {
    var embeddedFrame = document.querySelector("main[data-bd-app-main] > iframe");
    var embeddedParent = null;
    if (embeddedFrame && config.parent) {
      try {
        var parentUrl = new URL(config.parent, window.location.href);
        if (parentUrl.pathname === window.location.pathname) {
          parentUrl.searchParams.set("embedded", "1");
          embeddedParent = parentUrl.pathname + parentUrl.search + parentUrl.hash;
        }
      } catch { embeddedParent = null; }
    }
    if (embeddedFrame && config.parent && typeof window.bdNavigate === "function") {
      window.bdNavigate(config.parent, { replace: true });
      return;
    }
    if (typeof window.bdNavigateBack === "function") {
      window.bdNavigateBack(config.parent || undefined);
      if (embeddedParent && embeddedFrame.contentWindow) {
        try {
          embeddedFrame.contentWindow.history.replaceState({ bdCanonicalBack: true }, "", embeddedParent);
          embeddedFrame.contentWindow.dispatchEvent(new embeddedFrame.contentWindow.PopStateEvent("popstate", { state: embeddedFrame.contentWindow.history.state }));
        } catch { /* The outer route remains authoritative. */ }
      }
      return;
    }
    var original = document.querySelector("[data-bd-back]");
    if (original) { original.click(); return; }
    if (window.history.length > 1) window.history.back();
    else if (config.parent) window.location.replace(config.parent);
  }

  class BdAppHeader extends HTMLElement {
    syncAction(config) {
      var trailing = this.querySelector(".bd-app-header-trailing");
      if (!trailing || trailing.querySelector(".bd-app-header-action")) return;
      var action = explicitAction(config);
      if (!action && config.variant === "detail") action = genericAction();
      if (action) trailing.appendChild(action.nodeType ? makeIconButton(action) : makeIconButton(null, action));
    }

    setConfig(config) {
      var signature = [currentUrl(), config.variant, config.title, config.parent || ""].join("|");
      if (this.dataset.signature === signature && this.querySelector(".bd-app-header-row")) {
        this.syncAction(config);
        return;
      }
      this.dataset.signature = signature;
      this.dataset.variant = config.variant;
      this.setAttribute("data-bd-header", HEADER_MARK);
      this.replaceChildren();

      var row = document.createElement("div");
      row.className = "bd-app-header-row";
      var leading = document.createElement("div");
      leading.className = "bd-app-header-leading";
      if (config.variant !== "root") {
        var back = document.createElement("button");
        back.type = "button";
        back.className = "bd-app-back";
        back.setAttribute("aria-label", backLabel(config));
        back.innerHTML = '<span aria-hidden="true">‹</span>';
        back.addEventListener("click", function () { navigateBack(config); });
        leading.appendChild(back);
      }
      if (config.variant === "module") {
        var mark = document.createElement("span");
        mark.className = "bd-app-module-mark";
        mark.setAttribute("aria-hidden", "true");
        var image = document.createElement("img");
        image.src = "/icons/bardoctor-mark-v159.svg";
        image.alt = "";
        mark.appendChild(image);
        leading.appendChild(mark);
      }
      var copy = document.createElement("div");
      copy.className = "bd-app-header-copy";
      if (config.variant !== "root") {
        var kicker = document.createElement("small");
        kicker.textContent = config.variant === "detail" ? "BARDOCTOR" : "МОДУЛЬ BARDOCTOR";
        copy.appendChild(kicker);
      }
      var title = document.createElement("h1");
      title.textContent = config.title;
      title.title = config.title;
      copy.appendChild(title);
      leading.appendChild(copy);
      row.appendChild(leading);

      var trailing = document.createElement("div");
      trailing.className = "bd-app-header-trailing";
      if (config.variant !== "detail") {
        var venue = document.createElement("div");
        venue.className = "bd-app-canonical-venue-host";
        venue.setAttribute("data-bd-canonical-venue-host", "");
        venue.setAttribute("data-bd-venue-host", "canonical-v185");
        trailing.appendChild(venue);
      }
      row.appendChild(trailing);
      this.appendChild(row);
      this.syncAction(config);
    }
  }

  if (!customElements.get("bd-app-header")) customElements.define("bd-app-header", BdAppHeader);

  var rendering = false;
  var scheduled = false;
  function renderShell() {
    scheduled = false;
    if (rendering) return;
    rendering = true;
    try {
      decorateTabs();
      if (isPublicOrEmbedded()) return;
      var config = resolveRoute();
      var existing = document.querySelector("body > bd-app-header");
      if (startupPending()) {
        if (existing) {
          existing.hidden = true;
          existing.setAttribute("data-bd-startup-suppressed", "v201");
        }
        document.documentElement.removeAttribute("data-bd-user-shell");
        document.documentElement.removeAttribute("data-bd-header-variant");
        return;
      }
      if (!config) { if (existing) existing.remove(); return; }
      document.documentElement.setAttribute("data-bd-user-shell", SHELL_VERSION);
      document.documentElement.setAttribute("data-bd-header-variant", config.variant);
      var header = existing || document.createElement("bd-app-header");
      if (!existing) document.body.insertBefore(header, document.body.firstChild);
      header.hidden = false;
      header.removeAttribute("data-bd-startup-suppressed");
      header.setConfig(config);
      moveVenueTrigger(header, config);
      markLegacyHeaders();
      decorateTabs();
    } finally {
      rendering = false;
    }
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(renderShell);
  }

  function renderForNavigation() {
    if (rendering) scheduleRender();
    else renderShell();
  }

  window.bdAppHeaderContract = {
    version: HEADER_MARK,
    resolve: resolveRoute,
    refresh: scheduleRender,
    variants: ["root", "module", "detail"]
  };
  window.bdUserRouteInventoryV185 = {
    root: Object.keys(ROOT_ROUTES),
    module: Object.keys(MODULE_ROUTES),
    detailPatterns: DETAIL_ROUTES.map(function (rule) { return String(rule[0]); })
  };
  document.addEventListener("DOMContentLoaded", scheduleRender, { once: true });
  window.addEventListener("popstate", renderForNavigation);
  window.addEventListener("bd:navigation-change", renderForNavigation);
  window.addEventListener("bd:startup-complete", renderForNavigation);
  window.addEventListener("bd:venue-changed", scheduleRender);
  new MutationObserver(scheduleRender).observe(document.documentElement, { childList: true, subtree: true });
  scheduleRender();
})();

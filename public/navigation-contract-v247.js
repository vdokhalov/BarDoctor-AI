(function () {
  "use strict";

  var VERSION = "navigation-contract-v247";
  var ROOT = {
    "/home": "Главная",
    "/shifts": "Смены",
    "/finance": "Финансы",
    "/employees": "Команда",
    "/more": "Ещё"
  };
  var ROUTES = {
    "/": { type: "public", title: "BarDoctor", parent: null, shell: "public", bottomNav: false },
    "/login": { type: "public", title: "Вход", parent: "/", shell: "public", bottomNav: false },
    "/register": { type: "create", title: "Регистрация", parent: "/login", shell: "public", bottomNav: false },
    "/terms": { type: "document", title: "Условия использования", parent: "/settings", shell: "public", bottomNav: false },
    "/privacy": { type: "document", title: "Политика конфиденциальности", parent: "/settings", shell: "public", bottomNav: false },
    "/setup": { type: "wizard", title: "Настройка заведения", parent: "/home", shell: "fullscreen", bottomNav: false },
    "/home": { type: "root", title: "Главная", parent: null },
    "/analysis": { type: "list", title: "AI Доктор", parent: "/home" },
    "/smart": { type: "create", title: "Сообщить BarDoctor", parent: "/home" },
    "/add": { type: "create", title: "Добавить", parent: "/home" },
    "/events": { type: "list", title: "Журнал происшествий", parent: "/home" },
    "/tasks": { type: "list", title: "Поручения", parent: "/employees" },
    "/equipment": { type: "list", title: "Оборудование", parent: "/more" },
    "/equipment/catalog": { type: "list", title: "Каталог оборудования", parent: "/equipment" },
    "/equipment/analytics": { type: "report", title: "Аналитика оборудования", parent: "/equipment" },
    "/finance": { type: "root", title: "Финансы", parent: null },
    "/market": { type: "module", title: "Локальный рынок", parent: "/home" },
    "/opportunities": { type: "list", title: "Календарь возможностей", parent: "/home" },
    "/data-control": { type: "list", title: "Контроль данных", parent: "/more" },
    "/team-access": { type: "settings", title: "Роли и доступ", parent: "/employees" },
    "/integrations": { type: "list", title: "Интеграции", parent: "/more" },
    "/profile": { type: "edit", title: "Профиль", parent: "/settings" },
    "/profile/personal": { type: "edit", title: "Личные данные", parent: "/profile", shell: "fullscreen", bottomNav: false },
    "/profile/venue": { type: "edit", title: "Данные заведения", parent: "/profile", shell: "fullscreen", bottomNav: false },
    "/profile/currency": { type: "edit", title: "Валюта учёта", parent: "/profile", shell: "fullscreen", bottomNav: false },
    "/more": { type: "root", title: "Ещё", parent: null },
    "/employees": { type: "root", title: "Команда", parent: null },
    "/salaries": { type: "list", title: "Зарплаты", parent: "/finance" },
    "/payroll": { type: "settings", title: "Правила оплаты", parent: "/salaries" },
    "/health": { type: "report", title: "Диагностика заведения", parent: "/home" },
    "/reviews": { type: "list", title: "Отзывы гостей", parent: "/more" },
    "/cases": { type: "list", title: "Дела", parent: "/home" },
    "/catalog": { type: "list", title: "Ассортимент и техкарты", parent: "/more" },
    "/suppliers": { type: "list", title: "Поставщики и закупки", parent: "/more" },
    "/nomenclature": { type: "list", title: "Номенклатура", parent: "/warehouse" },
    "/warehouse": { type: "module", title: "Склад", parent: "/more" },
    "/reports": { type: "report", title: "Месячный отчёт", parent: "/finance" },
    "/month-closing": { type: "redirect", title: "Закрытие месяца", parent: "/reports" },
    "/finance/settings": { type: "settings", title: "Настройки финансов", parent: "/finance" },
    "/notifications": { type: "list", title: "Уведомления", parent: "/more" },
    "/sales-import": { type: "wizard", title: "Импорт продаж", parent: "/warehouse", shell: "fullscreen", bottomNav: false },
    "/supplier-alternatives": { type: "list", title: "Новые поставщики", parent: "/suppliers" },
    "/venues/new": { type: "create", title: "Новое заведение", parent: "/more", shell: "fullscreen", bottomNav: false },
    "/settings": { type: "settings", title: "Настройки", parent: "/more" },
    "/about": { type: "document", title: "О BarDoctor", parent: "/more" },
    "/reset": { type: "redirect", title: "Сброс", parent: "/home", shell: "public", bottomNav: false },
    "/design-system": { type: "redirect", title: "Design system", parent: "/home", shell: "public", bottomNav: false },
    "/forgot-password": { type: "edit", title: "Восстановление доступа", parent: "/login", shell: "public", bottomNav: false },
    "/join": { type: "wizard", title: "Присоединение к заведению", parent: "/login", shell: "public", bottomNav: false },
    "/assortment": { type: "redirect", title: "Ассортимент", parent: "/catalog" },
    "/app.html": { type: "compatibility", title: "BarDoctor", parent: "/home", shell: "public", bottomNav: false },
    "/decisions": { type: "compatibility", title: "AI Доктор", parent: "/home", shell: "public", bottomNav: false },
    "/admin": { type: "admin-root", title: "Internal Admin", parent: "/home", shell: "admin", bottomNav: false }
  };
  var PATTERNS = [
    { pattern: /^\/events\/[^/]+$/, type: "detail", title: "Происшествие", parent: "/events" },
    { pattern: /^\/equipment\/[^/]+\/history\/new$/, type: "create", title: "Запись обслуживания", parent: function (path) { return path.replace(/\/history\/new$/, ""); } },
    { pattern: /^\/equipment\/[^/]+$/, type: "detail", title: "Оборудование", parent: "/equipment" },
    { pattern: /^\/finance\/shift\/[^/]+\/payroll$/, type: "sub-detail", title: "Расчёт смены", parent: "/finance" },
    { pattern: /^\/employees\/[^/]+\/edit$/, type: "edit", title: "Редактирование сотрудника", parent: function (path) { return path.replace(/\/edit$/, ""); } },
    { pattern: /^\/employees\/[^/]+$/, type: "detail", title: "Сотрудник", parent: "/employees" },
    { pattern: /^\/salaries\/[^/]+$/, type: "detail", title: "Зарплата сотрудника", parent: "/salaries" },
    { pattern: /^\/cases\/add$/, type: "create", title: "Новое дело", parent: "/cases" },
    { pattern: /^\/cases\/[^/]+$/, type: "detail", title: "Дело", parent: "/cases" }
  ];
  var AUTH_PATHS = new Set(["/", "/login", "/register", "/setup", "/reset", "/forgot-password", "/join"]);

  function asUrl(value) {
    try { return new URL(String(value == null ? window.location.href : value), window.location.href); }
    catch { return null; }
  }

  function clean(url, keys) {
    var next = new URL(url.href);
    keys.forEach(function (key) { next.searchParams.delete(key); });
    return next.pathname + (next.searchParams.toString() ? "?" + next.searchParams.toString() : "") + next.hash;
  }

  function queryScreen(url) {
    var path = url.pathname;
    var query = url.searchParams;
    if (path === "/warehouse" && (query.has("inventory") || query.get("add") === "inventory")) {
      return { type: "fullscreen", title: "Инвентаризация", parent: clean(url, ["inventory", "add"]), shell: "fullscreen-owned", bottomNav: false, headerMode: "owned" };
    }
    if (path === "/warehouse" && query.has("product")) return { type: "sheet", title: "Карточка товара", parent: clean(url, ["product"]), headerMode: "underlay" };
    if (path === "/catalog" && query.has("itemId")) return { type: "sheet", title: "Позиция меню", parent: clean(url, ["itemId"]), headerMode: "underlay" };
    if (path === "/notifications" && query.get("view") && query.get("view") !== "overview") {
      var categoryTitles = { critical: "Критические события", incident: "Критические события", shifts: "Смены", shift: "Смены", tasks: "Поручения", task: "Поручения", finance: "Финансы", equipment: "Оборудование", calendar: "Календарь возможностей" };
      var view = query.get("view");
      var title = view === "category" ? (categoryTitles[query.get("category")] || "Категория уведомлений") : view === "quiet" ? "Тихие часы" : view === "history" ? "История уведомлений" : view === "device" ? "Настройки устройства" : "Уведомления";
      return { type: "detail", title: title, parent: clean(url, ["view", "category"]) };
    }
    if (path === "/data-control" && query.has("event")) return { type: "detail", title: "Событие журнала", parent: clean(url, ["event"]) };
    if (path === "/integrations" && ((query.get("view") && query.get("view") !== "overview") || (query.get("flow") && query.get("flow") !== "overview"))) {
      var flow = query.get("flow") || query.get("view");
      var flowTitle = flow === "catalog" ? "Подключить систему" : flow === "onec" ? "1С:Предприятие" : flow === "api" ? "Подключение API" : flow === "file" ? "Импорт из файла" : "Подключение";
      return { type: "wizard", title: flowTitle, parent: clean(url, ["view", "connectionId", "sourceId", "flow", "connection"]) };
    }
    if (path === "/suppliers" && query.has("documentId")) {
      var purchaseParent = query.get("returnTo") === "finance" ? "/finance" : clean(url, ["documentId", "edit", "returnTo"]);
      return { type: query.get("edit") === "1" ? "edit" : "sheet", title: "Закупочный документ", parent: purchaseParent, headerMode: "underlay" };
    }
    if (path === "/suppliers" && query.has("supplierId")) return { type: "sheet", title: "Поставщик", parent: clean(url, ["supplierId", "edit"]), headerMode: "underlay" };
    if (path === "/suppliers" && query.has("compareKey")) return { type: "sheet", title: "Сравнение предложений", parent: clean(url, ["compareKey"]), headerMode: "underlay" };
    if (path === "/suppliers" && query.get("create") === "1") return { type: "create", title: "Новая покупка", parent: clean(url, ["create", "returnTo"]), headerMode: "underlay" };
    if (path === "/finance" && ["closeShift", "addExpense", "repairEquipmentId"].some(function (key) { return query.has(key); })) return { type: "create", title: query.has("addExpense") ? "Новый расход" : query.has("repairEquipmentId") ? "Расход на оборудование" : "Закрытие смены", parent: clean(url, ["closeShift", "addExpense", "repairEquipmentId"]), headerMode: "underlay" };
    if (path === "/shifts" && query.has("closeShift")) return { type: "create", title: "Закрытие смены", parent: clean(url, ["closeShift"]), headerMode: "underlay" };
    if (path === "/tasks" && query.get("new") === "1") return { type: "create", title: "Новое поручение", parent: clean(url, ["new", "title", "responsible"]), headerMode: "underlay" };
    if (path === "/reports" && query.has("closeMonth")) return { type: "wizard", title: "Закрытие периода", parent: clean(url, ["closeMonth"]), headerMode: "underlay" };
    return null;
  }

  function routeScreen(path) {
    if (ROOT[path]) return Object.assign({}, ROUTES[path], { type: "root", title: ROOT[path] });
    if (ROUTES[path]) return Object.assign({}, ROUTES[path]);
    for (var index = 0; index < PATTERNS.length; index += 1) {
      var rule = PATTERNS[index];
      if (!rule.pattern.test(path)) continue;
      return { type: rule.type, title: rule.title, parent: typeof rule.parent === "function" ? rule.parent(path) : rule.parent };
    }
    return null;
  }

  function resolve(value) {
    var url = asUrl(value);
    if (!url || url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
    var base = routeScreen(url.pathname);
    if (!base) return null;
    var query = queryScreen(url);
    var screen = Object.assign({}, base, query || {});
    screen.path = url.pathname;
    screen.url = url.pathname + url.search + url.hash;
    screen.parent = screen.parent || null;
    screen.shell = screen.shell || "standard";
    screen.bottomNav = screen.bottomNav !== false && !["fullscreen", "fullscreen-owned", "public", "admin"].includes(screen.shell);
    screen.headerMode = screen.headerMode || (screen.type === "root" ? "root" : "back");
    return screen;
  }

  function isSafeInternal(value) {
    var url = asUrl(value);
    if (!url || url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return false;
    var screen = resolve(url.href);
    return Boolean(screen && !AUTH_PATHS.has(url.pathname) && screen.type !== "redirect" && screen.type !== "compatibility");
  }

  window.bdNavigationContract = Object.freeze({
    version: VERSION,
    roots: Object.freeze(Object.keys(ROOT)),
    routes: Object.freeze(ROUTES),
    patterns: Object.freeze(PATTERNS.slice()),
    resolve: resolve,
    parent: function (value) { var screen = resolve(value); return screen && screen.parent ? screen.parent : "/home"; },
    isRegistered: function (value) { return Boolean(resolve(value)); },
    isSafeInternal: isSafeInternal,
    clean: function (value, keys) { var url = asUrl(value); return url ? clean(url, keys || []) : "/home"; }
  });
  document.documentElement.setAttribute("data-bd-navigation-contract", VERSION);
})();

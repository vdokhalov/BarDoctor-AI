(function () {
  "use strict";
  if (!["terminal.local", "127.0.0.1", "localhost"].includes(window.location.hostname)) return;
  var params = new URLSearchParams(window.location.search);
  var state = params.get("qaAssortment");
  if (!state) return;

  var email = "assortment-v170-qa@bardoctor.local";
  var requestedVenue = Number(params.get("venue"));
  var rememberedVenue = Number(localStorage.getItem("bd_active_venue_id"));
  var venueId = requestedVenue || rememberedVenue || (state === "venue-b" ? 502 : 501);
  var scope = "__" + email + "__venue_" + venueId;
  var permissions = [
    "inventory.view", "inventory.manage", "expenses.create", "finance.view",
    "finance.manage", "data.import", "integrations.manage", "settings.manage",
  ];
  if (state === "readonly") permissions = permissions.filter(function (permission) {
    return permission !== "inventory.manage";
  });
  var activeRole = state === "readonly" ? "manager" : "owner";
  var venueName = state === "long"
    ? "Кёльн · Центральная площадка с исключительно длинным названием"
    : venueId === 502 ? "Причал" : "Кёльн";
  var profile = {
    id: "primary",
    name: venueName,
    businessType: "Бар",
    city: "Бендеры",
    currency: venueId === 501 ? "PMR_RUB" : "MDL",
    areas: ["Бар", "Кухня", "Зал", "Администрация"],
  };
  var venueRows = [
    { id: 501, workspaceId: "qa-assortment-workspace", name: venueId === 501 ? venueName : "Кёльн", role: activeRole, isPrimary: true, status: "active", permissions: permissions },
    { id: 502, workspaceId: "qa-assortment-workspace", name: venueId === 502 ? venueName : "Причал", role: activeRole, isPrimary: false, status: "active", permissions: permissions },
  ];

  function menuItem(id, name, groupId, category, price, extra) {
    return Object.assign({
      id: id,
      name: name,
      groupId: groupId,
      subgroupId: groupId + "-main",
      department: groupId,
      category: category,
      type: "composite",
      portionSize: "1 порция",
      salePrice: price,
      currency: "RUB",
      active: true,
      plannedSales: 0,
      createdAt: "2026-05-01T10:00:00.000Z",
      updatedAt: "2026-08-10T10:00:00.000Z",
    }, extra || {});
  }

  function ingredient(id, name, quantity, unit, key) {
    return { id: id, name: name, quantity: quantity, unit: unit, purchaseProductKey: key || "" };
  }

  var groups = [
    { id: "bar", name: "Бар", legacyDepartment: "bar", sortOrder: 0 },
    { id: "kitchen", name: "Кухня", legacyDepartment: "kitchen", sortOrder: 1 },
    { id: "hookah", name: "Кальяны", legacyDepartment: "hookah", sortOrder: 2 },
  ];
  var subgroups = [
    { id: "bar-cocktails", groupId: "bar", name: "Коктейли", sortOrder: 0 },
    { id: "bar-signature", groupId: "bar", parentId: "bar-cocktails", name: "Авторские", sortOrder: 0 },
    { id: "bar-spirits", groupId: "bar", name: "Крепкий алкоголь", sortOrder: 1 },
    { id: "kitchen-main", groupId: "kitchen", name: "Основное меню", sortOrder: 0 },
    { id: "hookah-main", groupId: "hookah", name: "Кальяны", sortOrder: 0 },
  ];

  var items = state === "empty" ? [] : venueId === 502 ? [
    menuItem("item-lemonade", "Домашний лимонад", "bar", "Безалкогольные напитки", 320),
  ] : [
    menuItem("item-aperol", "Aperol Spritz", "bar", "Авторские", 650, { subgroupId: "bar-signature" }),
    menuItem("item-mojito", "Mojito", "bar", "Коктейли", 550, { subgroupId: "bar-cocktails" }),
    menuItem("item-whiskey", "Whiskey Cola", "bar", "Крепкий алкоголь", 480, { subgroupId: "bar-spirits" }),
    menuItem("item-caesar", "Caesar Salad", "kitchen", "Салаты", 590),
    menuItem("item-burger", state === "long" ? "Фирменный бургер BarDoctor с говядиной, карамелизированным луком и авторским соусом" : "Бургер BBQ", "kitchen", "Бургеры", state === "incomplete" ? "" : 690),
    menuItem("item-hookah", "Кальян классический", "hookah", "Кальяны", 900, { type: "service" }),
  ];
  var recipes = state === "empty" ? [] : venueId === 502 ? [
    { id: "recipe-lemonade", menuItemId: "item-lemonade", status: "confirmed", ingredients: [ingredient("ing-lemon", "Лимон", 80, "g", "product:lemon"), ingredient("ing-syrup", "Сироп", 30, "ml", "product:syrup")], updatedAt: "2026-08-09T10:00:00.000Z" },
  ] : [
    { id: "recipe-aperol", menuItemId: "item-aperol", status: "confirmed", ingredients: [ingredient("ing-aperol", "Aperol", 60, "ml", "product:aperol"), ingredient("ing-prosecco", "Prosecco", 90, "ml", "product:prosecco"), ingredient("ing-soda", "Soda", 30, "ml", "product:soda"), ingredient("ing-orange", "Orange", 30, "g", "product:orange")], updatedAt: "2026-08-09T10:00:00.000Z" },
    { id: "recipe-whiskey", menuItemId: "item-whiskey", status: "confirmed", ingredients: [ingredient("ing-whiskey", "Whiskey", 50, "ml", "product:whiskey"), ingredient("ing-cola", "Coca-Cola", 150, "ml", "product:cola"), ingredient("ing-ice", "Лёд", 200, "g", "product:ice")], updatedAt: "2026-08-09T10:00:00.000Z" },
    { id: "recipe-caesar", menuItemId: "item-caesar", status: state === "incomplete" ? "draft" : "confirmed", ingredients: [ingredient("ing-chicken", "Куриное филе", 140, "g", "product:chicken"), ingredient("ing-salad", "Салат романо", 80, "g", state === "incomplete" ? "" : "product:salad"), ingredient("ing-cheese", "Пармезан", 20, "g", "product:parmesan")], updatedAt: "2026-08-09T10:00:00.000Z" },
    { id: "recipe-burger", menuItemId: "item-burger", status: "draft", ingredients: [ingredient("ing-beef", "Говядина", 180, "g", "product:beef"), ingredient("ing-bun", "Булочка", 1, "pcs", "")], updatedAt: "2026-08-09T10:00:00.000Z" },
  ];

  var catalog = {
    version: 2,
    horizonDays: 7,
    groups: groups,
    subgroups: subgroups,
    menuItems: items,
    recipes: recipes,
    stockBalances: [
      { key: "product:aperol", quantity: 4000, unit: "ml", averageUnitCost: 0.81, currency: "RUB" },
      { key: "product:prosecco", quantity: 6500, unit: "ml", averageUnitCost: 0.67, currency: "RUB" },
      { key: "product:cola", name: "Coca-Cola 1,25 л", quantity: 8000, unit: "ml", packageSize: "1,25 л", averageUnitCost: 0.086, currency: "RUB" },
      { key: "product:chicken", quantity: 2400, unit: "g", averageUnitCost: 0.42, currency: "RUB" },
    ],
    internalItems: [],
    priceHistory: [
      { id: "sale-price-1", menuItemId: "item-aperol", oldPrice: 600, newPrice: 650, currency: "RUB", changedAt: "2026-07-02T10:00:00.000Z", source: "manual" },
    ],
    sources: state === "empty" ? [] : [
      { id: "source-1", name: "Основное меню", source: "pdf", pageCount: 4, status: "confirmed", importedAt: "2026-08-10T09:00:00.000Z", sourceUrl: "https://example.test/menu.pdf" },
    ],
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
  catalog.nomenclature = Array.from({ length: 125 }, function (_, index) {
    var target = index === 117;
    return {
      id: "qa-nom-" + index,
      productKey: "qa-product-" + index,
      venueId: venueId,
      name: target ? "Боржоми 1,25 л" : "QA ингредиент " + String(index).padStart(3, "0"),
      unit: "ml",
      packageSize: target ? "1,25 л" : "",
      active: true,
    };
  });

  var purchaseProducts = {
    "product:aperol": { name: "Aperol", supplier: "ВПРОК", unit: "ml", current: 0.81 },
    "product:prosecco": { name: "Prosecco", supplier: "ВПРОК", unit: "ml", current: 0.67 },
    "product:soda": { name: "Soda", supplier: "Шериф", unit: "ml", current: 0.15 },
    "product:orange": { name: "Апельсин", supplier: "Рынок", unit: "g", current: 0.067 },
    "product:whiskey": { name: "Whiskey", supplier: "ВПРОК", unit: "ml", current: 1.56 },
    "product:cola": { name: "Coca-Cola", supplier: "Шериф", unit: "ml", current: 0.086 },
    "product:ice": { name: "Лёд", supplier: "Внутреннее производство", unit: "g", current: 0.0025 },
    "product:chicken": { name: "Куриное филе", supplier: "Рынок", unit: "g", current: 0.42 },
    "product:salad": { name: "Салат романо", supplier: "Рынок", unit: "g", current: 0.25 },
    "product:parmesan": { name: "Пармезан", supplier: "ВПРОК", unit: "g", current: 0.9 },
    "product:beef": { name: "Говядина", supplier: "Рынок", unit: "g", current: 0.58 },
  };

  function purchaseDocument(id, date, priceFactor) {
    return {
      id: id,
      venueId: venueId,
      supplierId: "supplier-vprok",
      supplierName: "ВПРОК",
      date: date,
      status: "confirmed",
      syncStatus: "synced",
      total: 12400,
      currency: "RUB",
      confirmedAt: date + "T10:00:00.000Z",
      items: Object.keys(purchaseProducts).map(function (key, index) {
        var product = purchaseProducts[key];
        return { id: id + "-" + index, name: product.name, quantity: 1, unit: product.unit, unitPrice: product.current * priceFactor, lineTotal: product.current * priceFactor, purchaseProductKey: key, mappingStatus: "confirmed", normalizedBaseAmount: 1, normalizedBaseUnit: product.unit };
      }),
    };
  }

  var purchases = state === "empty" ? [] : [
    purchaseDocument("purchase-aug", "2026-08-08", 1),
    purchaseDocument("purchase-jul", "2026-07-08", 0.89),
    purchaseDocument("purchase-jun", "2026-06-08", 0.84),
  ];
  var sales = state === "empty" ? [] : [
    { id: "sales-1", venueId: venueId, date: "2026-08-05", status: "confirmed", items: [{ menuItemId: "item-aperol", name: "Aperol Spritz", quantity: 22, lineTotal: 14300 }, { menuItemId: "item-whiskey", name: "Whiskey Cola", quantity: 18, lineTotal: 8640 }, { menuItemId: "item-caesar", name: "Caesar Salad", quantity: 12, lineTotal: 7080 }] },
    { id: "sales-2", venueId: venueId, date: "2026-08-09", status: "confirmed", items: [{ menuItemId: "item-aperol", name: "Aperol Spritz", quantity: 16, lineTotal: 10400 }, { menuItemId: "item-whiskey", name: "Whiskey Cola", quantity: 12, lineTotal: 5760 }] },
    { id: "sales-3", venueId: venueId, date: "2026-08-12", status: "confirmed", items: [{ menuItemId: "item-aperol", name: "Aperol Spritz", quantity: 10, lineTotal: 6500 }] },
  ];
  var revenues = state === "empty" ? [] : [
    { id: "revenue-aug", venueId: venueId, date: "2026-08-05", amount: 52280, currency: "RUB", source: "sales" },
  ];

  function rowFor(item, status, recipeCost, costPercent, extra) {
    return Object.assign({
      id: item.id,
      name: item.name,
      groupId: item.groupId,
      groupName: groups.find(function (group) { return group.id === item.groupId; }).name,
      subgroupId: item.subgroupId,
      category: item.category,
      type: item.type,
      portionSize: item.portionSize,
      salePrice: Number(item.salePrice) || null,
      currency: "RUB",
      recipeId: recipes.find(function (recipe) { return recipe.menuItemId === item.id; }) && recipes.find(function (recipe) { return recipe.menuItemId === item.id; }).id || null,
      recipeStatus: status === "missing_recipe" ? "missing" : status === "review" ? "draft" : "confirmed",
      techCardStatus: status === "missing_recipe" ? "missing" : status === "review" ? "requires_review" : "approved",
      status: status,
      ingredientCount: 0,
      mappedIngredientCount: 0,
      pricedIngredientCount: 0,
      invalidUnitCount: 0,
      unmappedIngredientCount: status === "review" ? 1 : 0,
      missingPriceCount: 0,
      ingredientRows: [],
      recipeCost: recipeCost,
      costCurrency: recipeCost == null ? null : "RUB",
      costPercent: costPercent,
      unitGrossProfit: recipeCost == null || !Number(item.salePrice) ? null : Number(item.salePrice) - recipeCost,
      costChangePercent: null,
      costHistory: [],
      sales: null,
      plannedSales: 0,
      priceHistory: catalog.priceHistory.filter(function (entry) { return entry.menuItemId === item.id; }),
    }, extra || {});
  }

  function analyticsForVenue() {
    if (state === "empty") return {
      version: "assortment-analytics-v1", period: { key: "2026-08", previousKey: "2026-07", comparisonBasis: "same_elapsed_days" },
      summary: { menuItems: 0, readinessPercent: 0, readyRecipes: 0, attentionItems: 0 },
      readiness: { score: 0, formula: "Score появится после добавления ассортимента", mandatory: [], desirable: [], unavailable: ["Нет позиций меню"] },
      counts: { activeItems: 0, confirmedRecipes: 0, draftRecipes: 0, missingRecipes: 0, attentionItems: 0, unmappedIngredients: 0, invalidUnits: 0, missingPurchasePrices: 0, missingSalePrices: 0 },
      signals: [], costChanges: [], sections: [], menuItems: [], recipes: [], economics: { available: false, revenue: null, costOfGoods: null, costPercent: null, grossMargin: null, comparison: null, insufficientReason: "Добавьте меню и подтверждённые продажи" },
      needs: { horizonDays: 7, rows: [], issues: ["Нет позиций меню"], completeRows: 0, forecastStatus: "insufficient_data", formula: "Остатки + техкарты + продажи или план" }, sources: [], valuation: {}, aiContext: { confirmedMenuEconomics: [], signals: [] },
    };
    var rows;
    if (venueId === 502) {
      rows = [rowFor(items[0], "ready", 74, 23.1, { ingredientRows: [{ id: "ing-lemon", name: "Лимон", quantity: 80, unit: "g", complete: true, cost: 28, currency: "RUB" }, { id: "ing-syrup", name: "Сироп", quantity: 30, unit: "ml", complete: true, cost: 46, currency: "RUB" }] })];
    } else {
      rows = [
        rowFor(items[0], "ready", 142, 21.8, { ingredientRows: [{ id: "ing-aperol", name: "Aperol", quantity: 60, unit: "ml", complete: true, cost: 48.6, currency: "RUB" }, { id: "ing-prosecco", name: "Prosecco", quantity: 90, unit: "ml", complete: true, cost: 60.3, currency: "RUB" }, { id: "ing-soda", name: "Soda", quantity: 30, unit: "ml", complete: true, cost: 4.5, currency: "RUB" }, { id: "ing-orange", name: "Orange", quantity: 30, unit: "g", complete: true, cost: 2, currency: "RUB" }], costChangePercent: 12.3, costHistory: [{ date: "2026-06-08", cost: 126.4, currency: "RUB" }, { date: "2026-08-08", cost: 142, currency: "RUB" }], costChangeBasis: "Рост подтверждённой цены Aperol", sales: { quantity: 48, revenue: 31200, grossProfit: 24384 } }),
        rowFor(items[1], "missing_recipe", null, null),
        rowFor(items[2], "ready", 91.5, 19.1, { ingredientRows: [{ id: "ing-whiskey", name: "Whiskey", quantity: 50, unit: "ml", complete: true, cost: 78, currency: "RUB" }, { id: "ing-cola", name: "Coca-Cola", quantity: 150, unit: "ml", complete: true, cost: 12.9, currency: "RUB" }, { id: "ing-ice", name: "Лёд", quantity: 200, unit: "g", complete: true, cost: 0.5, currency: "RUB" }], costChangePercent: 8.7, costHistory: [{ date: "2026-06-08", cost: 84.2, currency: "RUB" }, { date: "2026-08-08", cost: 91.5, currency: "RUB" }], costChangeBasis: "Изменение подтверждённой закупочной цены Whiskey", sales: { quantity: 30, revenue: 14400, grossProfit: 11655 } }),
        rowFor(items[3], state === "incomplete" ? "review" : "ready", state === "incomplete" ? null : 168, state === "incomplete" ? null : 28.5, { costChangePercent: -3.4, ingredientRows: state === "incomplete" ? [{ id: "ing-salad", name: "Салат романо", quantity: 80, unit: "g", complete: false, reason: "mapping", cost: null, currency: "RUB" }] : [{ id: "ing-chicken", name: "Куриное филе", quantity: 140, unit: "g", complete: true, cost: 58.8, currency: "RUB" }, { id: "ing-salad", name: "Салат романо", quantity: 80, unit: "g", complete: true, cost: 20, currency: "RUB" }, { id: "ing-cheese", name: "Пармезан", quantity: 20, unit: "g", complete: true, cost: 18, currency: "RUB" }] }),
        rowFor(items[4], "review", null, null, { ingredientRows: [{ id: "ing-beef", name: "Говядина", quantity: 180, unit: "g", complete: true, cost: 104.4, currency: "RUB" }, { id:
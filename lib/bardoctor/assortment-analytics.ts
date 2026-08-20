import {
  inventoryPackageAmount,
  toInventoryBaseAmount,
} from "./inventory";
import {
  procurementPricePoints,
  type ProcurementPricePoint,
} from "./procurement-analytics";

type JsonRecord = Record<string, unknown>;
type BaseUnit = "ml" | "g" | "pcs";

export const ASSORTMENT_COST_CHANGE_THRESHOLD_PERCENT = 5;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nonNegative(value: unknown): number | null {
  const parsed = number(value);
  return parsed === null ? null : Math.max(0, parsed);
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizedName(value: unknown): string {
  return text(value, "", 300)
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

function isoDate(value: unknown): string {
  const candidate = text(value, "", 40);
  return /^\d{4}-\d{2}-\d{2}/.test(candidate) ? candidate.slice(0, 10) : "";
}

function latestStamp(value: JsonRecord): string {
  return text(value.updatedAt ?? value.confirmedAt ?? value.createdAt ?? value.date, "", 50);
}

function plural(value: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function monthKey(value: unknown): string {
  const candidate = text(value, "", 10);
  return /^\d{4}-\d{2}$/.test(candidate) ? candidate : "";
}

function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function previousMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodWindow(requested: string | undefined, now: Date) {
  const currentKey = now.toISOString().slice(0, 7);
  const key = monthKey(requested) || currentKey;
  const previousKey = previousMonth(key);
  const elapsedDays = key === currentKey
    ? Math.min(now.getUTCDate(), daysInMonth(key))
    : daysInMonth(key);
  const previousElapsedDays = Math.min(elapsedDays, daysInMonth(previousKey));
  return {
    key,
    previousKey,
    start: `${key}-01`,
    end: `${key}-${String(elapsedDays).padStart(2, "0")}`,
    previousStart: `${previousKey}-01`,
    previousEnd: `${previousKey}-${String(previousElapsedDays).padStart(2, "0")}`,
    elapsedDays,
    comparisonBasis: elapsedDays === previousElapsedDays
      ? "same_elapsed_days" as const
      : "not_comparable" as const,
  };
}

function inRange(value: unknown, start: string, end: string): boolean {
  const date = isoDate(value);
  return Boolean(date && date >= start && date <= end);
}

function deduplicated(values: unknown[], venueId?: number): JsonRecord[] {
  const byId = new Map<string, JsonRecord>();
  values.map(record).forEach((value, index) => {
    if (venueId && value.venueId != null && number(value.venueId) !== venueId) return;
    const id = text(value.id, `legacy-${index}`, 120);
    const existing = byId.get(id);
    if (!existing || latestStamp(value) >= latestStamp(existing)) byId.set(id, value);
  });
  return [...byId.values()];
}

function confirmedSales(values: unknown[], venueId?: number): JsonRecord[] {
  return deduplicated(values, venueId)
    .filter((value) => text(value.status) === "confirmed")
    .sort((left, right) => isoDate(right.date).localeCompare(isoDate(left.date)));
}

function groupName(item: JsonRecord, groups: JsonRecord[]): string {
  const explicit = groups.find((group) => text(group.id) === text(item.groupId));
  if (explicit) return text(explicit.name ?? explicit.label, "Другое", 120);
  const department = text(item.department, "other", 40);
  if (department === "bar") return "Бар";
  if (department === "kitchen") return "Кухня";
  if (department === "hookah") return "Кальяны";
  return text(item.category, "Другое", 120);
}

function pointKey(productKey: string, unit: string): string {
  return `${productKey}|${unit}`;
}

function latestPoints(points: ProcurementPricePoint[]) {
  const map = new Map<string, ProcurementPricePoint>();
  for (const point of points) {
    const key = pointKey(point.productKey, point.baseUnit);
    const existing = map.get(key);
    if (!existing || point.date > existing.date || (point.date === existing.date && point.id > existing.id)) {
      map.set(key, point);
    }
  }
  return map;
}

function pointHistory(points: ProcurementPricePoint[]) {
  const map = new Map<string, ProcurementPricePoint[]>();
  for (const point of points) {
    const key = pointKey(point.productKey, point.baseUnit);
    map.set(key, [...(map.get(key) ?? []), point]);
  }
  for (const values of map.values()) {
    values.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  }
  return map;
}

function balanceMap(value: JsonRecord) {
  const map = new Map<string, JsonRecord>();
  array(value.stockBalances).map(record).forEach((balance) => {
    const key = text(balance.key ?? balance.purchaseProductKey, "", 300);
    if (key) map.set(key, balance);
  });
  return map;
}

function ingredientCost(
  ingredient: JsonRecord,
  prices: Map<string, ProcurementPricePoint>,
  balances: Map<string, JsonRecord>,
) {
  const amount = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
  const productKey = text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 300);
  if (amount.unit === "unknown") {
    return { complete: false, reason: "unit", amount: amount.amount, unit: amount.unit, productKey };
  }
  if (!productKey) {
    return { complete: false, reason: "mapping", amount: amount.amount, unit: amount.unit, productKey };
  }
  const balance = balances.get(productKey);
  const balanceUnit = text(balance?.unit, "", 20);
  const averageUnitCost = nonNegative(balance?.averageUnitCost);
  const point = prices.get(pointKey(productKey, amount.unit));
  const useWeightedAverage = averageUnitCost !== null
    && averageUnitCost > 0
    && balanceUnit === amount.unit;
  const unitPrice = useWeightedAverage ? averageUnitCost : point?.normalizedUnitPrice ?? null;
  const currency = useWeightedAverage
    ? text(balance?.currency, point?.currency ?? "", 12).toUpperCase()
    : point?.currency ?? "";
  if (!(unitPrice != null && unitPrice > 0) || !currency) {
    return {
      complete: false,
      reason: "price",
      amount: amount.amount,
      unit: amount.unit,
      productKey,
      supplierName: point?.supplierName ?? null,
    };
  }
  return {
    complete: true,
    reason: null,
    amount: amount.amount,
    unit: amount.unit,
    productKey,
    unitPrice: rounded(unitPrice, 6),
    cost: rounded(amount.amount * unitPrice, 2),
    currency,
    source: useWeightedAverage ? "weighted_inventory_average" : "latest_confirmed_purchase",
    supplierName: point?.supplierName ?? null,
    priceDate: point?.date ?? null,
  };
}

function historicalRecipeCosts(
  ingredients: JsonRecord[],
  history: Map<string, ProcurementPricePoint[]>,
) {
  if (!ingredients.length) return [];
  const normalized = ingredients.map((ingredient) => {
    const amount = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
    return {
      amount: amount.amount,
      unit: amount.unit,
      productKey: text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 300),
    };
  });
  if (normalized.some((item) => item.unit === "unknown" || !item.productKey)) return [];
  const dates = [...new Set(normalized.flatMap((item) =>
    (history.get(pointKey(item.productKey, item.unit)) ?? []).map((point) => point.date)
  ))].sort();
  const result: Array<{ date: string; cost: number; currency: string }> = [];
  for (const date of dates) {
    const selected = normalized.map((item) => {
      const points = history.get(pointKey(item.productKey, item.unit)) ?? [];
      const candidates = points.filter((point) => point.date <= date);
      return { item, point: candidates[candidates.length - 1] };
    });
    if (selected.some((item) => !item.point)) continue;
    const currencies = new Set(selected.map((item) => item.point!.currency));
    if (currencies.size !== 1) continue;
    result.push({
      date,
      cost: rounded(selected.reduce(
        (sum, item) => sum + item.item.amount * item.point!.normalizedUnitPrice,
        0,
      ), 2),
      currency: selected[0].point!.currency,
    });
  }
  const currentCurrency = result.at(-1)?.currency;
  const comparable = currentCurrency
    ? result.filter((point) => point.currency === currentCurrency)
    : [];
  return comparable.filter((point, index) =>
    index === 0 || point.cost !== comparable[index - 1].cost
  );
}

function recipeCostDrivers(
  ingredients: JsonRecord[],
  history: Map<string, ProcurementPricePoint[]>,
  previousDate: string,
  currentDate: string,
  currency: string,
) {
  return ingredients.flatMap((ingredient) => {
    const amount = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
    const productKey = text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 300);
    if (amount.unit === "unknown" || !productKey) return [];
    const points = history.get(pointKey(productKey, amount.unit)) ?? [];
    const previous = points.filter((point) =>
      point.date <= previousDate && point.currency === currency
    ).at(-1);
    const current = points.filter((point) =>
      point.date <= currentDate && point.currency === currency
    ).at(-1);
    if (!previous || !current) return [];
    const delta = rounded(
      amount.amount * (current.normalizedUnitPrice - previous.normalizedUnitPrice),
      2,
    );
    if (Math.abs(delta) < 0.005) return [];
    return [{
      ingredientId: text(ingredient.id, "", 120) || null,
      name: text(ingredient.name, "Ингредиент", 180),
      productKey,
      amount: amount.amount,
      unit: amount.unit,
      previousUnitPrice: previous.normalizedUnitPrice,
      currentUnitPrice: current.normalizedUnitPrice,
      delta,
      currency,
      previousDocumentId: previous.documentId,
      currentDocumentId: current.documentId,
    }];
  }).sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}

function signedMoney(value: number, currency: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const amount = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 })
    .format(Math.abs(value));
  return `${sign}${amount} ${currency === "RUB" ? "₽" : currency}`;
}

function itemStatus(item: JsonRecord, recipe: JsonRecord | undefined, costComplete: boolean) {
  if (text(item.type) === "service") return nonNegative(item.salePrice) ? "ready" : "attention";
  if (!recipe) return "missing_recipe";
  if (text(recipe.status) !== "confirmed") return "review";
  return costComplete ? "ready" : "attention";
}

export function buildAssortmentAnalytics(input: {
  assortment: unknown;
  purchaseDocuments?: unknown[];
  salesDocuments?: unknown[];
  financeRevenue?: unknown[];
  period?: string;
  venueId?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const period = periodWindow(input.period, now);
  const assortment = record(input.assortment);
  const groups = array(assortment.groups).map(record);
  const menuItems = array(assortment.menuItems).map(record).filter((item) => item.active !== false);
  const recipes = array(assortment.recipes).map(record);
  const recipeByMenuId = new Map(recipes.map((recipe) => [text(recipe.menuItemId), recipe]));
  const balances = balanceMap(assortment);
  const pricePoints = procurementPricePoints(input.purchaseDocuments ?? [], {
    venueId: input.venueId,
    includePriceLists: false,
  });
  const currentPrices = latestPoints(pricePoints);
  const priceHistory = pointHistory(pricePoints);
  const sales = confirmedSales(input.salesDocuments ?? [], input.venueId);
  const currentSales = sales.filter((document) => inRange(document.date, period.start, period.end));
  const previousSales = sales.filter((document) =>
    inRange(document.date, period.previousStart, period.previousEnd)
  );
  const menuById = new Map(menuItems.map((item) => [text(item.id), item]));
  const menuByName = new Map(menuItems.map((item) => [normalizedName(item.name), item]));

  const salesMetrics = new Map<string, {
    quantity: number;
    revenue: number;
    revenueComplete: boolean;
    documents: Set<string>;
  }>();
  for (const document of currentSales) {
    for (const value of array(document.items)) {
      const line = record(value);
      const item = menuById.get(text(line.menuItemId)) ?? menuByName.get(normalizedName(line.name));
      if (!item) continue;
      const id = text(item.id);
      const metric = salesMetrics.get(id) ?? {
        quantity: 0,
        revenue: 0,
        revenueComplete: true,
        documents: new Set<string>(),
      };
      metric.quantity += nonNegative(line.quantity) ?? 0;
      const grossSales = nonNegative(line.grossSales);
      if (grossSales === null) metric.revenueComplete = false;
      else metric.revenue += grossSales;
      metric.documents.add(text(document.id));
      salesMetrics.set(id, metric);
    }
  }

  const itemAnalytics = menuItems.map((item) => {
    const id = text(item.id, crypto.randomUUID(), 120);
    const recipe = recipeByMenuId.get(id);
    const ingredients = array(recipe?.ingredients).map(record);
    const ingredientRows = ingredients.map((ingredient) => ({
      id: text(ingredient.id, crypto.randomUUID(), 120),
      name: text(ingredient.name, "Ингредиент", 180),
      quantity: nonNegative(ingredient.quantity),
      unit: text(ingredient.unit, "", 40),
      ...ingredientCost(ingredient, currentPrices, balances),
    }));
    const isService = text(item.type) === "service";
    const costComplete = !isService
      && text(recipe?.status) === "confirmed"
      && ingredientRows.length > 0
      && ingredientRows.every((ingredient) => ingredient.complete);
    const costCurrencies = new Set(
      ingredientRows.filter((ingredient) => ingredient.complete).map((ingredient) => ingredient.currency),
    );
    const costCurrency = costCurrencies.size === 1 ? [...costCurrencies][0] : null;
    const recipeCost = costComplete && costCurrency
      ? rounded(ingredientRows.reduce((sum, ingredient) => sum + (ingredient.cost ?? 0), 0), 2)
      : null;
    const salePrice = nonNegative(item.salePrice);
    const saleCurrency = text(item.currency, "RUB", 12).toUpperCase();
    const comparableCurrency = recipeCost !== null && costCurrency === saleCurrency;
    const costPercent = comparableCurrency && salePrice != null && salePrice > 0
      ? rounded(recipeCost / salePrice * 100, 1)
      : null;
    const unitGrossProfit = comparableCurrency && salePrice != null
      ? rounded(salePrice - recipeCost, 2)
      : null;
    const history = historicalRecipeCosts(ingredients, priceHistory);
    const currentHistory = history[history.length - 1];
    const previousHistory = history[history.length - 2];
    const costChangePercent = currentHistory && previousHistory && previousHistory.cost > 0
      ? rounded((currentHistory.cost / previousHistory.cost - 1) * 100, 1)
      : null;
    const costDrivers = currentHistory && previousHistory
      ? recipeCostDrivers(
          ingredients,
          priceHistory,
          previousHistory.date,
          currentHistory.date,
          currentHistory.currency,
        )
      : [];
    const metric = salesMetrics.get(id);
    const itemRevenue = metric?.revenueComplete ? rounded(metric.revenue, 2) : null;
    const soldCost = recipeCost !== null && metric
      ? rounded(recipeCost * metric.quantity, 2)
      : null;
    const grossProfit = itemRevenue !== null && soldCost !== null
      ? rounded(itemRevenue - soldCost, 2)
      : null;
    return {
      id,
      name: text(item.name, "Позиция", 240),
      groupId: text(item.groupId, "", 120) || null,
      groupName: groupName(item, groups),
      subgroupId: text(item.subgroupId, "", 120) || null,
      category: text(item.category, "Без подраздела", 120),
      type: text(item.type, "composite", 40),
      portionSize: text(item.portionSize, "", 80) || null,
      salePrice: salePrice && salePrice > 0 ? salePrice : null,
      currency: saleCurrency,
      recipeId: text(recipe?.id, "", 120) || null,
      recipeStatus: recipe ? text(recipe.status, "draft", 30) : "missing",
      status: itemStatus(item, recipe, costComplete),
      ingredientCount: ingredients.length,
      mappedIngredientCount: ingredients.filter((ingredient) =>
        Boolean(text(ingredient.purchaseProductKey ?? ingredient.productKey))
      ).length,
      pricedIngredientCount: ingredientRows.filter((ingredient) => ingredient.complete).length,
      invalidUnitCount: ingredientRows.filter((ingredient) => ingredient.reason === "unit").length,
      unmappedIngredientCount: ingredientRows.filter((ingredient) => ingredient.reason === "mapping").length,
      missingPriceCount: ingredientRows.filter((ingredient) => ingredient.reason === "price").length,
      ingredientRows,
      recipeCost,
      costCurrency,
      costPercent,
      unitGrossProfit,
      costChangePercent,
      costDrivers,
      costHistory: history.slice(-12),
      costChangeBasis: costDrivers.length
        ? `Основной вклад: ${costDrivers[0].name} (${signedMoney(costDrivers[0].delta, costDrivers[0].currency)} на порцию)`
        : history.length >= 2
          ? "Текущая техкарта × последние подтверждённые закупочные цены"
        : null,
      sales: metric
        ? {
            quantity: rounded(metric.quantity, 3),
            revenue: itemRevenue,
            revenueComplete: metric.revenueComplete,
            documentCount: metric.documents.size,
            grossProfit,
          }
        : null,
      plannedSales: nonNegative(item.plannedSales),
      priceHistory: array(assortment.priceHistory)
        .map(record)
        .filter((entry) => text(entry.menuItemId) === id)
        .sort((left, right) => latestStamp(right).localeCompare(latestStamp(left)))
        .slice(0, 20),
    };
  });

  const requiredChecks: Array<{ id: string; complete: boolean }> = [];
  for (const item of itemAnalytics) {
    requiredChecks.push({ id: `${item.id}:sale-price`, complete: item.salePrice !== null });
    if (item.type === "service") continue;
    requiredChecks.push({ id: `${item.id}:recipe`, complete: item.recipeStatus === "confirmed" });
    requiredChecks.push({ id: `${item.id}:units`, complete: item.ingredientCount > 0 && item.invalidUnitCount === 0 });
    requiredChecks.push({ id: `${item.id}:mapping`, complete: item.ingredientCount > 0 && item.unmappedIngredientCount === 0 });
    requiredChecks.push({ id: `${item.id}:prices`, complete: item.ingredientCount > 0 && item.missingPriceCount === 0 });
  }
  const completedChecks = requiredChecks.filter((check) => check.complete).length;
  const readinessPercent = requiredChecks.length
    ? Math.round(completedChecks / requiredChecks.length * 100)
    : 0;

  const missingRecipes = itemAnalytics.filter((item) => item.type !== "service" && item.recipeStatus === "missing");
  const draftRecipes = itemAnalytics.filter((item) => item.type !== "service" && item.recipeStatus === "draft");
  const unmappedItems = itemAnalytics.filter((item) => item.unmappedIngredientCount > 0);
  const invalidUnitItems = itemAnalytics.filter((item) => item.invalidUnitCount > 0);
  const missingPriceItems = itemAnalytics.filter((item) => item.missingPriceCount > 0);
  const unpricedItems = itemAnalytics.filter((item) => item.salePrice === null);
  const costChanges = itemAnalytics
    .filter((item) => item.costChangePercent !== null)
    .sort((left, right) => Math.abs(right.costChangePercent ?? 0) - Math.abs(left.costChangePercent ?? 0));
  const significantCostChanges = costChanges.filter((item) =>
    Math.abs(item.costChangePercent ?? 0) >= ASSORTMENT_COST_CHANGE_THRESHOLD_PERCENT
  );
  const attentionIds = new Set([
    ...missingRecipes,
    ...draftRecipes,
    ...unmappedItems,
    ...invalidUnitItems,
    ...missingPriceItems,
    ...unpricedItems,
    ...significantCostChanges,
  ].map((item) => item.id));

  const signals: Array<{
    id: string;
    type: string;
    tone: "red" | "orange";
    title: string;
    detail: string;
    tab: "menu" | "recipes" | "needs";
    filter: string;
    itemId: string | null;
  }> = [];
  if (missingRecipes.length) signals.push({
    id: "missing-recipes",
    type: "recipe_missing",
    tone: "red",
    title: `${missingRecipes.length} ${plural(missingRecipes.length, "позиция без техкарты", "позиции без техкарт", "позиций без техкарт")}`,
    detail: "Нельзя достоверно рассчитать себестоимость и потребность",
    tab: "recipes",
    filter: "missing",
    itemId: missingRecipes[0].id,
  });
  if (draftRecipes.length) signals.push({
    id: "draft-recipes",
    type: "recipe_review",
    tone: "orange",
    title: `${draftRecipes.length} ${plural(draftRecipes.length, "техкарта требует проверки", "техкарты требуют проверки", "техкарт требуют проверки")}`,
    detail: "Черновые рецептуры не участвуют в расчётах",
    tab: "recipes",
    filter: "review",
    itemId: draftRecipes[0].id,
  });
  if (unmappedItems.length) signals.push({
    id: "ingredient-mapping",
    type: "mapping",
    tone: "orange",
    title: `${unmappedItems.reduce((sum, item) => sum + item.unmappedIngredientCount, 0)} ингредиентов не связаны с закупками`,
    detail: "BarDoctor не может отслеживать их фактическую закупочную цену",
    tab: "recipes",
    filter: "review",
    itemId: unmappedItems[0].id,
  });
  if (missingPriceItems.length) signals.push({
    id: "ingredient-prices",
    type: "price_missing",
    tone: "orange",
    title: `${missingPriceItems.reduce((sum, item) => sum + item.missingPriceCount, 0)} ингредиентов без подтверждённой цены`,
    detail: "Себестоимость зависимых позиций пока неполна",
    tab: "recipes",
    filter: "review",
    itemId: missingPriceItems[0].id,
  });
  if (unpricedItems.length) signals.push({
    id: "sale-prices",
    type: "sale_price_missing",
    tone: "orange",
    title: `${unpricedItems.length} ${plural(unpricedItems.length, "позиция без актуальной цены", "позиции без актуальной цены", "позиций без актуальной цены")}`,
    detail: "Нельзя рассчитать валовую прибыль и Cost %",
    tab: "menu",
    filter: "attention",
    itemId: unpricedItems[0].id,
  });
  if (significantCostChanges.length) {
    const largest = significantCostChanges[0];
    signals.push({
      id: "cost-change",
      type: "cost_change",
      tone: (largest.costChangePercent ?? 0) > 0 ? "red" : "orange",
      title: `${significantCostChanges.length} ${plural(significantCostChanges.length, "позиция изменила себестоимость", "позиции изменили себестоимость", "позиций изменили себестоимость")}`,
      detail: largest.costDrivers.length
        ? `${largest.name}: ${(largest.costChangePercent ?? 0) > 0 ? "+" : ""}${largest.costChangePercent}%; основной вклад — ${largest.costDrivers[0].name}`
        : `${largest.name}: ${(largest.costChangePercent ?? 0) > 0 ? "+" : ""}${largest.costChangePercent}% по подтверждённым ценам`,
      tab: "menu",
      filter: "attention",
      itemId: largest.id,
    });
  }

  const sectionMap = new Map<string, {
    id: string;
    name: string;
    total: number;
    calculated: number;
    attention: number;
  }>();
  for (const item of itemAnalytics) {
    const key = item.groupId || normalizedName(item.groupName) || "other";
    const section = sectionMap.get(key) ?? {
      id: key,
      name: item.groupName,
      total: 0,
      calculated: 0,
      attention: 0,
    };
    section.total += 1;
    if (item.status === "ready") section.calculated += 1;
    else section.attention += 1;
    sectionMap.set(key, section);
  }

  const currentRevenueFromSales = rounded(currentSales.reduce(
    (sum, document) => sum + (nonNegative(document.totalRevenue) ?? 0),
    0,
  ), 2);
  const previousRevenueFromSales = rounded(previousSales.reduce(
    (sum, document) => sum + (nonNegative(document.totalRevenue) ?? 0),
    0,
  ), 2);
  const financeRows = deduplicated(input.financeRevenue ?? [], input.venueId);
  const currentFinanceRevenue = rounded(financeRows
    .filter((row) => inRange(row.date, period.start, period.end))
    .reduce((sum, row) => sum + (nonNegative(row.revenue ?? row.amount) ?? 0), 0), 2);
  const previousFinanceRevenue = rounded(financeRows
    .filter((row) => inRange(row.date, period.previousStart, period.previousEnd))
    .reduce((sum, row) => sum + (nonNegative(row.revenue ?? row.amount) ?? 0), 0), 2);
  const revenue = currentRevenueFromSales > 0 ? currentRevenueFromSales : currentFinanceRevenue;
  const previousRevenue = previousRevenueFromSales > 0 ? previousRevenueFromSales : previousFinanceRevenue;

  let salesCostComplete = currentSales.length > 0;
  let soldCost = 0;
  let unresolvedSalesLines = 0;
  for (const document of currentSales) {
    for (const value of array(document.items)) {
      const line = record(value);
      const item = menuById.get(text(line.menuItemId)) ?? menuByName.get(normalizedName(line.name));
      const analytics = item && itemAnalytics.find((candidate) => candidate.id === text(item.id));
      const quantity = nonNegative(line.quantity);
      if (!analytics || quantity === null || analytics.recipeCost === null) {
        salesCostComplete = false;
        unresolvedSalesLines += 1;
        continue;
      }
      soldCost += analytics.recipeCost * quantity;
    }
  }
  soldCost = rounded(soldCost, 2);
  const costOfGoods = salesCostComplete && currentSales.length ? soldCost : null;
  const grossMargin = costOfGoods !== null && revenue > 0 ? rounded(revenue - costOfGoods, 2) : null;
  const costPercent = costOfGoods !== null && revenue > 0 ? rounded(costOfGoods / revenue * 100, 1) : null;
  const comparableRevenueChange = period.comparisonBasis === "same_elapsed_days" && previousRevenue > 0
    ? rounded((revenue / previousRevenue - 1) * 100, 1)
    : null;

  const horizonDays = [7, 14, 30].includes(number(assortment.horizonDays) ?? 0)
    ? number(assortment.horizonDays)!
    : 7;
  const recentStart = new Date(now.getTime() - 27 * 86_400_000).toISOString().slice(0, 10);
  const recentSales = sales.filter((document) => inRange(document.date, recentStart, now.toISOString().slice(0, 10)));
  const recentByItem = new Map<string, { quantity: number; dates: Set<string> }>();
  for (const document of recentSales) {
    for (const value of array(document.items)) {
      const line = record(value);
      const item = menuById.get(text(line.menuItemId)) ?? menuByName.get(normalizedName(line.name));
      if (!item) continue;
      const id = text(item.id);
      const current = recentByItem.get(id) ?? { quantity: 0, dates: new Set<string>() };
      current.quantity += nonNegative(line.quantity) ?? 0;
      current.dates.add(isoDate(document.date));
      recentByItem.set(id, current);
    }
  }
  const required = new Map<string, {
    productKey: string;
    name: string;
    unit: BaseUnit;
    amount: number;
    basis: Set<string>;
  }>();
  const needIssues: string[] = [];
  for (const item of itemAnalytics.filter((candidate) => candidate.type !== "service")) {
    let projectedPortions: number | null = null;
    let basis = "";
    if (item.plannedSales != null && item.plannedSales > 0) {
      projectedPortions = item.plannedSales;
      basis = `План на ${horizonDays} дней`;
    } else {
      const recent = recentByItem.get(item.id);
      if (recent && recent.dates.size >= 3) {
        projectedPortions = rounded(recent.quantity / 28 * horizonDays, 2);
        basis = `Фактический средний темп за 28 дней`;
      }
    }
    if (projectedPortions === null) {
      needIssues.push(`${item.name}: нет плана и недостаточно истории продаж`);
      continue;
    }
    if (item.recipeStatus !== "confirmed") {
      needIssues.push(`${item.name}: техкарта не подтверждена`);
      continue;
    }
    for (const ingredient of item.ingredientRows) {
      if (ingredient.unit === "unknown" || !ingredient.productKey) {
        needIssues.push(`${item.name}: ${ingredient.name} не готов к расчёту`);
        continue;
      }
      const key = pointKey(ingredient.productKey, ingredient.unit);
      const current = required.get(key) ?? {
        productKey: ingredient.productKey,
        name: ingredient.name,
        unit: ingredient.unit as BaseUnit,
        amount: 0,
        basis: new Set<string>(),
      };
      current.amount += ingredient.amount * projectedPortions;
      current.basis.add(basis);
      required.set(key, current);
    }
  }

  const needs = [...required.values()].map((requirement) => {
    const balance = balances.get(requirement.productKey);
    const balanceUnit = text(balance?.unit, "", 20);
    const currentStock = balanceUnit === requirement.unit ? nonNegative(balance?.current) : null;
    const safety = balanceUnit === requirement.unit ? nonNegative(balance?.safety) ?? 0 : 0;
    const onOrder = balanceUnit === requirement.unit ? nonNegative(balance?.onOrder) ?? 0 : 0;
    const point = currentPrices.get(pointKey(requirement.productKey, requirement.unit));
    const packageValue = point
      ? inventoryPackageAmount(point.packageSize, point.baseUnit === "pcs" ? "шт." : point.baseUnit)
      : { amount: 0, unit: "unknown" as const };
    const packageAmount = packageValue.unit === requirement.unit ? packageValue.amount : 0;
    const shortage = currentStock === null
      ? null
      : Math.max(0, requirement.amount + safety - currentStock - onOrder);
    const packages = shortage !== null && packageAmount > 0 ? Math.ceil(shortage / packageAmount) : null;
    const recommendedAmount = packages !== null ? rounded(packages * packageAmount, 3) : null;
    const estimatedCost = packages !== null && point
      ? rounded(packages * packageAmount * point.normalizedUnitPrice, 2)
      : null;
    if (currentStock === null) needIssues.push(`${requirement.name}: нет сопоставимого остатка`);
    if (shortage != null && shortage > 0 && packageAmount <= 0) {
      needIssues.push(`${requirement.name}: не определена фасовка закупки`);
    }
    return {
      productKey: requirement.productKey,
      name: requirement.name,
      unit: requirement.unit,
      currentStock,
      safety,
      onOrder,
      projectedNeed: rounded(requirement.amount, 3),
      shortage: shortage === null ? null : rounded(shortage, 3),
      packageAmount,
      packages,
      recommendedAmount,
      estimatedCost,
      currency: point?.currency ?? null,
      supplierName: point?.supplierName ?? null,
      priceDate: point?.date ?? null,
      basis: [...requirement.basis],
      complete: currentStock !== null && (shortage === 0 || packageAmount > 0),
    };
  }).filter((need) => need.shortage === null || need.shortage > 0)
    .sort((left, right) => (right.shortage ?? Number.MAX_SAFE_INTEGER) - (left.shortage ?? Number.MAX_SAFE_INTEGER));

  return {
    version: "assortment-analytics-v1",
    period,
    summary: {
      menuItems: itemAnalytics.length,
      readinessPercent,
      readyRecipes: itemAnalytics.filter((item) => item.recipeStatus === "confirmed").length,
      attentionItems: attentionIds.size,
    },
    readiness: {
      score: readinessPercent,
      completedRequiredChecks: completedChecks,
      requiredChecks: requiredChecks.length,
      formula: "Выполненные обязательные проверки ÷ все применимые обязательные проверки",
      mandatory: [
        { id: "sale_price", label: "Актуальная цена продажи", complete: itemAnalytics.filter((item) => item.salePrice !== null).length, total: itemAnalytics.length },
        { id: "recipe", label: "Подтверждённая техкарта", complete: itemAnalytics.filter((item) => item.type === "service" || item.recipeStatus === "confirmed").length, total: itemAnalytics.length },
        { id: "units", label: "Нормализованные единицы", complete: itemAnalytics.filter((item) => item.type === "service" || (item.ingredientCount > 0 && item.invalidUnitCount === 0)).length, total: itemAnalytics.length },
        { id: "mapping", label: "Связь ингредиентов с закупками", complete: itemAnalytics.filter((item) => item.type === "service" || (item.ingredientCount > 0 && item.unmappedIngredientCount === 0)).length, total: itemAnalytics.length },
        { id: "purchase_price", label: "Подтверждённая стоимость ингредиентов", complete: itemAnalytics.filter((item) => item.type === "service" || (item.ingredientCount > 0 && item.missingPriceCount === 0)).length, total: itemAnalytics.length },
      ],
      desirable: [
        {
          id: "stock",
          label: "Проверенные остатки",
          complete: array(assortment.stockBalances).map(record).filter((balance) => Boolean(isoDate(balance.checkedAt))).length,
          total: array(assortment.stockBalances).length,
          affectsScore: false,
        },
        {
          id: "sales",
          label: "История продаж по позициям",
          complete: recentByItem.size,
          total: itemAnalytics.length,
          affectsScore: false,
        },
      ],
      unavailable: currentSales.length === 0
        ? ["Нет подтверждённых продаж за выбранный период"]
        : unresolvedSalesLines
          ? [`${unresolvedSalesLines} строк продаж нельзя связать с достоверной себестоимостью`]
          : [],
    },
    counts: {
      activeItems: itemAnalytics.length,
      confirmedRecipes: itemAnalytics.filter((item) => item.recipeStatus === "confirmed").length,
      draftRecipes: draftRecipes.length,
      missingRecipes: missingRecipes.length,
      attentionItems: attentionIds.size,
      unmappedIngredients: itemAnalytics.reduce((sum, item) => sum + item.unmappedIngredientCount, 0),
      invalidUnits: itemAnalytics.reduce((sum, item) => sum + item.invalidUnitCount, 0),
      missingPurchasePrices: itemAnalytics.reduce((sum, item) => sum + item.missingPriceCount, 0),
      missingSalePrices: unpricedItems.length,
    },
    signals: signals.slice(0, 8),
    costChanges: costChanges.slice(0, 20),
    sections: [...sectionMap.values()].sort((left, right) => right.total - left.total),
    menuItems: itemAnalytics,
    recipes: itemAnalytics.filter((item) => item.type !== "service"),
    economics: {
      available: revenue > 0,
      revenue: revenue > 0 ? revenue : null,
      revenueSource: currentRevenueFromSales > 0 ? "confirmed_sales_documents" : currentFinanceRevenue > 0 ? "finance_revenue" : null,
      costOfGoods,
      costPercent,
      grossMargin,
      unresolvedSalesLines,
      comparison: comparableRevenueChange !== null
        ? {
            previousPeriod: period.previousKey,
            previousRevenue,
            revenueChangePercent: comparableRevenueChange,
            basis: "Сопоставимые по числу дней периоды",
          }
        : null,
      insufficientReason: revenue <= 0
        ? "Нет подтверждённой выручки за период"
        : costOfGoods === null
          ? "Недостаточно item-level продаж или достоверной себестоимости для всех проданных позиций"
          : null,
    },
    needs: {
      horizonDays,
      rows: needs,
      issues: [...new Set(needIssues)].slice(0, 40),
      completeRows: needs.filter((need) => need.complete).length,
      forecastStatus: needs.length && needs.every((need) => need.complete)
        ? "ready"
        : "insufficient_data",
      formula: "Остаток + уже заказано сопоставляются с потребностью по подтверждённым техкартам и фактическому плану/истории продаж",
    },
    sources: array(assortment.sources).map(record).slice(0, 30),
    valuation: {
      currentCostRule: "Средневзвешенная стоимость существующего складского остатка; при её отсутствии — последняя подтверждённая закупочная цена",
      costChangeRule: "Текущая подтверждённая техкарта пересчитывается по хронологии подтверждённых закупочных цен",
      externalPricesUsed: false,
      unconfirmedOcrUsed: false,
    },
    aiContext: {
      confirmedMenuEconomics: itemAnalytics
        .filter((item) => item.recipeCost !== null && item.recipeStatus === "confirmed")
        .map((item) => ({
          id: item.id,
          name: item.name,
          salePrice: item.salePrice,
          currency: item.currency,
          recipeCost: item.recipeCost,
          costPercent: item.costPercent,
          costChangePercent: item.costChangePercent,
          costDrivers: item.costDrivers,
          sales: item.sales,
        })),
      signals,
      freshness: {
        assortmentUpdatedAt: text(assortment.updatedAt, "", 40) || null,
        latestConfirmedPurchaseAt: pricePoints[0]?.date ?? null,
        latestConfirmedSaleAt: sales[0] ? isoDate(sales[0].date) : null,
      },
      guardrails: [
        "Неподтверждённая техкарта не является фактом",
        "Неподтверждённый ingredient mapping не участвует в себестоимости",
        "Внешняя и розничная цена не является фактической закупочной ценой venue",
        "При неполных item-level продажах маржа не рассчитывается",
      ],
    },
  };
}

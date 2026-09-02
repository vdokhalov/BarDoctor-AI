import {
  inventoryPackageAmount,
  toInventoryBaseAmount,
} from "./inventory";
import {
  procurementPricePoints,
  type ProcurementPricePoint,
} from "./procurement-analytics";
import {
  canonicalTechCardForOwner,
  reconcileTechCards,
} from "./tech-card-reconciliation";
import {
  formatMenuSaleSize,
  menuSaleSizeUnitOptions,
  resolveMenuItemSaleSize,
  resolveReadyProductConsumption,
} from "./menu-sale-size";

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

function exactCostIdentity(value: unknown): string {
  const withoutPackage = normalizedName(value)
    .replace(/\s+\d+(?:\s+\d+)?\s+(?:л|l|мл|ml|кг|kg|г|g|шт|pcs)(?=\s|$)/g, " ")
    .replace(/^(?:вода минеральная|минеральная вода|вода)\s+/, "")
    .replace(/\s+(?:минеральная вода|минеральная|газированная вода|негазированная вода|газированная|негазированная|вода)$/g, "")
    .trim();
  if (["coca cola", "кока кола", "cola", "кола"].includes(withoutPackage)) return "cola";
  if (["sprite", "спрайт"].includes(withoutPackage)) return "sprite";
  return withoutPackage;
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

function productAliases(value: JsonRecord): JsonRecord[] {
  const aliases = [
    ...array(value.canonicalProductAliases),
    ...array(value.inventoryProductAliases),
  ].map(record);
  for (const product of [...array(value.nomenclature), ...array(value.stockBalances)].map(record)) {
    const canonical = text(product.productKey ?? product.key ?? product.id, "", 300);
    if (!canonical) continue;
    for (const identity of [product.id, product.nomenclatureItemId, product.key, product.productKey]) {
      const from = text(identity, "", 300);
      if (from && from !== canonical) aliases.push({ from, to: canonical });
    }
    for (const identity of [...array(product.externalProductKeys), ...array(product.mergedFromProductKeys)]) {
      const from = text(identity, "", 300);
      if (from && from !== canonical) aliases.push({ from, to: canonical });
    }
  }
  return aliases;
}

function productKeyResolver(value: JsonRecord) {
  const aliases = new Map(productAliases(value)
    .map((alias) => [text(alias.from, "", 300), text(alias.to, "", 300)] as const)
    .filter(([from, to]) => Boolean(from && to && from !== to)));
  return (initial: unknown): string => {
    let current = text(initial, "", 300);
    const seen = new Set<string>();
    while (aliases.has(current) && !seen.has(current)) {
      seen.add(current);
      current = aliases.get(current)!;
    }
    return current;
  };
}

function ingredientProductKey(ingredient: JsonRecord, resolveProductKey: (value: unknown) => string): string {
  return resolveProductKey(
    ingredient.purchaseProductKey
      ?? ingredient.productKey
      ?? ingredient.canonicalProductKey
      ?? ingredient.nomenclatureItemId,
  );
}

function balanceMap(value: JsonRecord, resolveProductKey: (value: unknown) => string) {
  const map = new Map<string, JsonRecord>();
  array(value.stockBalances).map(record).forEach((balance) => {
    const key = resolveProductKey(
      balance.productKey
        ?? balance.key
        ?? balance.purchaseProductKey
        ?? balance.nomenclatureItemId
        ?? balance.id,
    );
    if (key) map.set(key, balance);
  });
  return map;
}

function resolvedIngredientAmount(ingredient: JsonRecord): {
  amount: number;
  unit: ReturnType<typeof toInventoryBaseAmount>["unit"];
  reason: "unit" | "unit_resolution" | "packaging_resolution" | null;
} {
  const resolutionStatus = text(ingredient.resolutionStatus, "", 50);
  if (resolutionStatus === "linked_unit_review") {
    const fallback = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
    return { ...fallback, reason: "unit_resolution" };
  }
  if (resolutionStatus === "linked_packaging_review") {
    const fallback = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
    return { ...fallback, reason: "packaging_resolution" };
  }
  const normalizedAmount = nonNegative(ingredient.normalizedQuantity);
  const normalizedUnit = text(ingredient.normalizedUnit, "", 20);
  if (
    normalizedAmount !== null
    && ["g", "ml", "pcs"].includes(normalizedUnit)
    && ["exact_compatible", "packaging_compatible"].includes(text(ingredient.unitResolutionStatus))
  ) {
    return {
      amount: normalizedAmount,
      unit: normalizedUnit as ReturnType<typeof toInventoryBaseAmount>["unit"],
      reason: null,
    };
  }
  const fallback = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
  return { ...fallback, reason: fallback.unit === "unknown" ? "unit" : null };
}

function ingredientCost(
  ingredient: JsonRecord,
  history: Map<string, ProcurementPricePoint[]>,
  resolveProductKey: (value: unknown) => string,
  packageHint?: { amount: number; unit: BaseUnit; label: string } | null,
) {
  const resolvedAmount = resolvedIngredientAmount(ingredient);
  const fallbackAmount = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
  const packageHintResolvesPiece = resolvedAmount.reason === "packaging_resolution"
    && packageHint != null
    && fallbackAmount.unit === "pcs";
  const amountBeforePackageRepair = packageHintResolvesPiece
    ? { ...fallbackAmount, reason: null }
    : resolvedAmount;
  const packageHintRepairsLegacyDisplayUnit = packageHint != null
    && ["ml", "g"].includes(amountBeforePackageRepair.unit)
    && amountBeforePackageRepair.unit === packageHint.unit
    && Math.abs(amountBeforePackageRepair.amount * 1_000 - packageHint.amount) < 0.0001;
  const amount = packageHintRepairsLegacyDisplayUnit
    ? { amount: packageHint.amount, unit: packageHint.unit, reason: null }
    : amountBeforePackageRepair;
  const productKey = ingredientProductKey(ingredient, resolveProductKey);
  if (amount.reason) {
    return { complete: false, reason: amount.reason, amount: amount.amount, unit: amount.unit, productKey };
  }
  if (amount.unit === "unknown") {
    return { complete: false, reason: "unit", amount: amount.amount, unit: amount.unit, productKey };
  }
  if (!productKey) {
    return { complete: false, reason: "mapping", amount: amount.amount, unit: amount.unit, productKey };
  }
  const directCandidates = packageHint
    ? [...history.entries()]
      .filter(([key]) => key.startsWith(`${productKey}|`))
      .flatMap(([, points]) => points)
    : history.get(pointKey(productKey, amount.unit)) ?? [];
  const packageMatches = (candidate: ProcurementPricePoint) => {
    if (!packageHint) return true;
    const packageValue = inventoryPackageAmount(
      candidate.packageSize,
      candidate.baseUnit === "pcs" ? "шт." : candidate.baseUnit,
    );
    return packageValue.unit === packageHint.unit
      && Math.abs(packageValue.amount - packageHint.amount) < 0.0001;
  };
  const ingredientIdentity = exactCostIdentity(
    ingredient.matchedName ?? ingredient.canonicalName ?? ingredient.name,
  );
  const directExactPackageCandidates = directCandidates.filter(packageMatches);
  const identityCandidates = packageHint && directExactPackageCandidates.length === 0 && ingredientIdentity
    ? [...history.values()]
      .flat()
      .filter((candidate) => exactCostIdentity(candidate.productName) === ingredientIdentity)
    : [];
  const identityExactPackageCandidates = packageHint
    ? identityCandidates.filter(packageMatches)
    : identityCandidates;
  const exactPackageCandidates = directExactPackageCandidates.length > 0
    ? directExactPackageCandidates
    : identityExactPackageCandidates;
  const aggregateSource = directCandidates.length > 0 ? directCandidates : identityCandidates;
  const aggregatePackageCandidates = packageHint && exactPackageCandidates.length === 0
    && aggregateSource.length > 0
    && aggregateSource.every((candidate) => {
      if (candidate.baseUnit !== packageHint.unit || candidate.baseAmount < packageHint.amount) return false;
      const packages = candidate.baseAmount / packageHint.amount;
      return Math.abs(packages - Math.round(packages)) < 0.000001;
    })
    ? aggregateSource
    : [];
  const point = (exactPackageCandidates.length > 0
    ? exactPackageCandidates
    : aggregatePackageCandidates)
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
    .at(-1);
  const unitPrice = point?.baseUnit === amount.unit
    ? point.normalizedUnitPrice
    : point && amount.unit === "pcs" && packageHint
      ? point.normalizedUnitPrice * packageHint.amount
      : null;
  const currency = point?.currency ?? "";
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
    source: "latest_confirmed_purchase",
    supplierName: point?.supplierName ?? null,
    priceDate: point?.date ?? null,
    purchaseDate: point?.date ?? null,
    purchaseDocumentId: point?.documentId ?? null,
    purchaseDocumentNumber: point?.documentNumber ?? null,
    purchasePackageSize: point?.packageSize ?? null,
    packageLabel: packageHint?.label || null,
  };
}

function historicalRecipeCosts(
  ingredients: JsonRecord[],
  history: Map<string, ProcurementPricePoint[]>,
  resolveProductKey: (value: unknown) => string,
) {
  if (!ingredients.length) return [];
  const normalized = ingredients.map((ingredient) => {
    const amount = resolvedIngredientAmount(ingredient);
    return {
      amount: amount.amount,
      unit: amount.unit,
      reason: amount.reason,
      productKey: ingredientProductKey(ingredient, resolveProductKey),
    };
  });
  if (normalized.some((item) => item.unit === "unknown" || item.reason || !item.productKey)) return [];
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
  resolveProductKey: (value: unknown) => string,
) {
  return ingredients.flatMap((ingredient) => {
    const amount = resolvedIngredientAmount(ingredient);
    const productKey = ingredientProductKey(ingredient, resolveProductKey);
    if (amount.unit === "unknown" || amount.reason || !productKey) return [];
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

function itemStatus(
  item: JsonRecord,
  recipe: JsonRecord | undefined,
  costComplete: boolean,
  directReadyProduct = false,
) {
  if (text(item.type) === "service") return nonNegative(item.salePrice) ? "ready" : "attention";
  if (directReadyProduct) return costComplete ? "ready" : "attention";
  if (!recipe) return "missing_recipe";
  if (text(recipe.reviewStatus) !== "approved") return "review";
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
  const reconciliation = reconcileTechCards({
    assortment: input.assortment,
    purchaseDocuments: input.purchaseDocuments,
    venueId: input.venueId,
    now,
  });
  const assortment = record(reconciliation.assortment);
  const groups = array(assortment.groups).map(record);
  const menuItems = array(assortment.menuItems).map(record).filter((item) => item.active !== false);
  const recipes = array(assortment.recipes).map(record);
  const activeAiDraftCards = recipes.filter((recipe) =>
    recipe.currentDraft === true && text(recipe.reviewStatus) === "ai_draft"
  );
  const activeReviewCards = recipes.filter((recipe) =>
    recipe.currentDraft === true && text(recipe.reviewStatus) === "requires_review"
  );
  const recipeByMenuId = new Map(menuItems.map((item) => [
    text(item.id),
    canonicalTechCardForOwner(item.id, recipes),
  ]));
  const resolveProductKey = productKeyResolver(assortment);
  const aliases = productAliases(assortment);
  const balances = balanceMap(assortment, resolveProductKey);
  const pricePoints = procurementPricePoints(input.purchaseDocuments ?? [], {
    venueId: input.venueId,
    includePriceLists: false,
    includeUnmappedExact: true,
    productAliases: aliases,
    supplierProductMappings: assortment.supplierProductMappings,
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
    const directReadyProduct = resolveReadyProductConsumption(item, assortment);
    const resolvedSaleSize = resolveMenuItemSaleSize(item, assortment);
    const salePackageLabel = formatMenuSaleSize(resolvedSaleSize);
    const ownerCards = recipes.filter((candidate) =>
      text(candidate.menuItemId ?? candidate.ownerId, "", 120) === id
    );
    const pendingDraft = ownerCards.find((candidate) => candidate.currentDraft === true);
    const ingredients = recipe
      ? array(recipe.ingredients).map(record)
      : directReadyProduct
        ? [{
            id: `ready-product:${id}`,
            name: directReadyProduct.productName,
            quantity: directReadyProduct.quantityPerSale,
            unit: directReadyProduct.baseUnit,
            normalizedQuantity: directReadyProduct.quantityPerSale,
            normalizedUnit: directReadyProduct.baseUnit,
            unitResolutionStatus: "exact_compatible",
            purchaseProductKey: directReadyProduct.productKey,
            nomenclatureItemId: directReadyProduct.nomenclatureItemId,
          }]
        : [];
    const saleSize = record(resolvedSaleSize);
    const salePackageHint = ingredients.length === 1
      && nonNegative(saleSize.baseQuantity) != null
      && ["ml", "g", "pcs"].includes(text(saleSize.baseUnit, "", 20))
      ? {
          amount: nonNegative(saleSize.baseQuantity)!,
          unit: text(saleSize.baseUnit, "", 20) as BaseUnit,
          label: salePackageLabel,
        }
      : null;
    const ingredientRows = ingredients.map((ingredient) => ({
      id: text(ingredient.id, crypto.randomUUID(), 120),
      name: text(
        ingredient.matchedName ?? ingredient.canonicalName ?? ingredient.name,
        "Ингредиент",
        180,
      ),
      recipeName: text(ingredient.name, "Ингредиент", 180),
      quantity: nonNegative(ingredient.quantity),
      ...ingredientCost(ingredient, priceHistory, resolveProductKey, salePackageHint),
    }));
    const isService = text(item.type) === "service";
    const reviewStatus = recipe
      ? text(recipe.reviewStatus, "requires_review", 40)
      : directReadyProduct
        ? "approved"
        : "missing";
    const costComplete = !isService
      && reviewStatus === "approved"
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
    const history = historicalRecipeCosts(ingredients, priceHistory, resolveProductKey);
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
          resolveProductKey,
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
      saleSize: resolvedSaleSize,
      portionSize: formatMenuSaleSize(resolvedSaleSize) || null,
      salePrice: salePrice && salePrice > 0 ? salePrice : null,
      currency: saleCurrency,
      recipeId: text(recipe?.id, "", 120) || (directReadyProduct ? `ready-product:${id}` : null),
      recipeStatus: recipe ? text(recipe.status, "draft", 30) : directReadyProduct ? "confirmed" : "missing",
      techCardStatus: reviewStatus,
      techCardSource: recipe ? text(recipe.source, "manual", 30) : directReadyProduct ? "ready_product" : null,
      techCardVersion: recipe ? number(recipe.version) ?? 1 : directReadyProduct ? 1 : null,
      techCardUpdatedAt: recipe ? latestStamp(recipe) || null : null,
      ownerLinkStatus: recipe ? text(recipe.ownerLinkStatus, "linked", 40) : directReadyProduct ? "linked" : "missing",
      hasPendingDraft: Boolean(pendingDraft && pendingDraft.id !== recipe?.id),
      pendingDraftId: pendingDraft ? text(pendingDraft.id, "", 120) || null : null,
      pendingDraftStatus: pendingDraft ? text(pendingDraft.reviewStatus, "requires_review", 40) : null,
      status: itemStatus(item, recipe, costComplete, Boolean(directReadyProduct)),
      ingredientCount: ingredients.length,
      mappedIngredientCount: ingredients.filter((ingredient) =>
        Boolean(text(ingredient.purchaseProductKey ?? ingredient.productKey))
      ).length,
      pricedIngredientCount: ingredientRows.filter((ingredient) => ingredient.complete).length,
      invalidUnitCount: ingredientRows.filter((ingredient) => ingredient.reason === "unit").length,
      unitReviewCount: ingredientRows.filter((ingredient) => ingredient.reason === "unit_resolution").length,
      packagingReviewCount: ingredientRows.filter((ingredient) => ingredient.reason === "packaging_resolution").length,
      ambiguousEntityCount: ingredients.filter((ingredient) => text(ingredient.resolutionStatus) === "candidates_review").length,
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
    requiredChecks.push({ id: `${item.id}:recipe`, complete: item.techCardStatus === "approved" });
    requiredChecks.push({ id: `${item.id}:units`, complete: item.ingredientCount > 0 && item.invalidUnitCount === 0 });
    requiredChecks.push({ id: `${item.id}:mapping`, complete: item.ingredientCount > 0 && item.unmappedIngredientCount === 0 });
    requiredChecks.push({ id: `${item.id}:prices`, complete: item.ingredientCount > 0 && item.missingPriceCount === 0 });
  }
  const completedChecks = requiredChecks.filter((check) => check.complete).length;
  const readinessPercent = requiredChecks.length
    ? Math.round(completedChecks / requiredChecks.length * 100)
    : 0;

  const missingRecipes = itemAnalytics.filter((item) => item.type !== "service" && item.recipeStatus === "missing");
  const aiDraftRecipes = itemAnalytics.filter((item) => item.type !== "service" && item.techCardStatus === "ai_draft");
  const reviewRecipes = itemAnalytics.filter((item) => item.type !== "service" && item.techCardStatus === "requires_review");
  const draftRecipes = [...aiDraftRecipes, ...reviewRecipes];
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
  if (activeAiDraftCards.length) signals.push({
    id: "ai-draft-recipes",
    type: "recipe_ai_draft",
    tone: "orange",
    title: `${activeAiDraftCards.length} ${plural(activeAiDraftCards.length, "AI-черновик", "AI-черновика", "AI-черновиков")}`,
    detail: "AI-предложения существуют и привязаны к позициям, но ещё не утверждены",
    tab: "recipes",
    filter: "ai_draft",
    itemId: text(activeAiDraftCards[0].menuItemId, "", 120) || null,
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
    if (item.techCardStatus !== "approved") {
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
    saleSizeUnits: menuSaleSizeUnitOptions(),
    period,
    summary: {
      menuItems: itemAnalytics.length,
      readinessPercent,
      readyRecipes: itemAnalytics.filter((item) => item.techCardStatus === "approved").length,
      attentionItems: attentionIds.size,
    },
    readiness: {
      score: readinessPercent,
      completedRequiredChecks: completedChecks,
      requiredChecks: requiredChecks.length,
      formula: "Выполненные обязательные проверки ÷ все применимые обязательные проверки",
      mandatory: [
        { id: "sale_price", label: "Актуальная цена продажи", complete: itemAnalytics.filter((item) => item.salePrice !== null).length, total: itemAnalytics.length },
        { id: "recipe", label: "Подтверждённая техкарта", complete: itemAnalytics.filter((item) => item.type === "service" || item.techCardStatus === "approved").length, total: itemAnalytics.length },
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
      confirmedRecipes: itemAnalytics.filter((item) => item.techCardStatus === "approved").length,
      draftRecipes: draftRecipes.length,
      aiDraftRecipes: activeAiDraftCards.length,
      reviewRecipes: activeReviewCards.length,
      missingRecipes: missingRecipes.length,
      incompleteIngredientLinks: itemAnalytics.filter((item) => item.unmappedIngredientCount > 0).length,
      orphanRecipes: reconciliation.report.orphan,
      ambiguousRecipes: reconciliation.report.ambiguous,
      duplicateCandidates: reconciliation.report.duplicateCandidates,
      attentionItems: attentionIds.size,
      unmappedIngredients: itemAnalytics.reduce((sum, item) => sum + item.unmappedIngredientCount, 0),
      invalidUnits: itemAnalytics.reduce((sum, item) => sum + item.invalidUnitCount, 0),
      linkedUnitReviewIngredients: itemAnalytics.reduce((sum, item) => sum + item.unitReviewCount, 0),
      linkedPackagingReviewIngredients: itemAnalytics.reduce((sum, item) => sum + item.packagingReviewCount, 0),
      ambiguousEntityIngredients: itemAnalytics.reduce((sum, item) => sum + item.ambiguousEntityCount, 0),
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
      currentCostRule: "Последняя подтверждённая закупочная цена точной фасовки товара",
      costChangeRule: "Текущая подтверждённая техкарта пересчитывается по хронологии подтверждённых закупочных цен",
      externalPricesUsed: false,
      unconfirmedOcrUsed: false,
    },
    aiContext: {
      confirmedMenuEconomics: itemAnalytics
        .filter((item) => item.recipeCost !== null && item.techCardStatus === "approved")
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
    techCardReconciliation: reconciliation.report,
  };
}

import { classifyNomenclatureItemWithRules, defaultNomenclatureStructure } from "./nomenclature";
import { PURCHASE_STOCK_CATEGORIES } from "./purchases";

export const ASSORTMENT_STORE_KEY = "bd_assortment_v1";
export const STOCK_MOVEMENT_STORE_KEY = "bd_stock_movements";
export const SALES_DOCUMENT_STORE_KEY = "bd_sales_documents";

export type BaseInventoryUnit = "ml" | "g" | "pcs" | "unknown";

export type StockMovement = {
  id: string;
  type: "receipt" | "sale" | "inventory_adjustment" | "writeoff" | "return";
  date: string;
  productKey: string;
  productName: string;
  amount: number;
  unit: BaseInventoryUnit;
  costAmount?: number;
  currency?: string;
  sourceDocumentId: string;
  sourceLineId: string;
  menuItemId?: string;
  menuItemName?: string;
  createdAt: string;
  status?: "active" | "cancelled";
  reversedAt?: string;
  reversalReason?: string;
};

export type InventoryCountLine = {
  id: string;
  productKey: string;
  productName: string;
  unit: BaseInventoryUnit;
  packageSize?: string;
  packageAmount?: number;
  section?: string;
  expected: number;
  actual: number;
  difference: number;
  averageUnitCost: number;
  expectedValue: number;
  actualValue: number;
  differenceValue: number;
};

export type InventoryCountSummary = {
  countedLines: number;
  changedLines: number;
  expectedValue: number;
  actualValue: number;
  differenceValue: number;
  unresolvedLines: Array<{ id: string; name: string; reason: string }>;
};

export type InventoryUpdateSummary = {
  postedLines: number;
  movementCount: number;
  linkedIngredients: number;
  unresolvedLines: Array<{ id: string; name: string; reason: string }>;
  currencyConflicts: number;
};

export type InventoryMetadataRepairSummary = {
  repaired: number;
  removed: number;
};

export type InventoryProductUpdate = {
  productKey: string;
  name: string;
  unit: BaseInventoryUnit;
  packageSize: string;
};

export type InventoryProductUpdateResult =
  | {
    ok: true;
    assortment: JsonRecord;
    product: JsonRecord;
    linkedRecipes: number;
  }
  | {
    ok: false;
    code: "PRODUCT_NOT_FOUND" | "INVALID_PRODUCT" | "UNIT_CHANGE_LOCKED";
    error: string;
  };

export type PurchaseInventoryRevision =
  | {
    ok: true;
    assortment: JsonRecord;
    movements: StockMovement[];
    summary: InventoryUpdateSummary;
  }
  | {
    ok: false;
    code: "PURCHASE_HAS_LATER_SALES" | "PURCHASE_HAS_LATER_MOVEMENTS" | "PURCHASE_REVERSAL_INVALID" | "INVENTORY_REVIEW_REQUIRED";
    error: string;
    unresolvedLines?: InventoryUpdateSummary["unresolvedLines"];
  };

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizeInventoryText(value: unknown): string {
  return text(value)
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

export function inventoryProductKey(value: unknown): string {
  const item = record(value);
  const requested = text(item.purchaseProductKey ?? item.productKey, "", 300);
  if (requested) return requested;
  return `${normalizeInventoryText(item.name)}|${normalizeInventoryText(item.packageSize ?? item.unit)}`;
}

export function toInventoryBaseAmount(quantity: unknown, unit: unknown): {
  amount: number;
  unit: BaseInventoryUnit;
} {
  const value = Math.max(0, number(quantity));
  const normalized = normalizeInventoryText(unit);
  if (/^(л|l|литр)/.test(normalized)) return { amount: value * 1_000, unit: "ml" };
  if (/^(мл|ml|миллилитр)/.test(normalized)) return { amount: value, unit: "ml" };
  if (/^(кг|kg|килограмм)/.test(normalized)) return { amount: value * 1_000, unit: "g" };
  if (/^(г|гр|g|грамм)/.test(normalized)) return { amount: value, unit: "g" };
  if (/^(шт|pcs|piece|бут|бан|ед|уп|пач|короб)/.test(normalized)) {
    return { amount: value, unit: "pcs" };
  }
  return { amount: value, unit: "unknown" };
}

export function inventoryPackageAmount(packageSize: unknown, fallbackUnit: unknown): {
  amount: number;
  unit: BaseInventoryUnit;
} {
  const value = text(packageSize, "", 120).toLocaleLowerCase("ru").replace(/,/g, ".");
  const multiplied = value.match(
    /(\d+(?:\.\d+)?)\s*[xх×*]\s*(\d+(?:\.\d+)?)\s*(мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg|шт|pcs)/i,
  );
  if (multiplied) {
    const base = toInventoryBaseAmount(multiplied[2], multiplied[3]);
    return { amount: base.amount * number(multiplied[1]), unit: base.unit };
  }
  const direct = value.match(
    /(\d+(?:\.\d+)?)\s*(мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg|шт|pcs)/i,
  );
  if (direct) return toInventoryBaseAmount(direct[1], direct[2]);
  if (/^(шт|pcs|piece|бут|бан|ед|уп|пач|короб)/.test(normalizeInventoryText(packageSize))) {
    return { amount: 1, unit: "pcs" };
  }
  const fallback = toInventoryBaseAmount(1, fallbackUnit);
  return fallback.unit === "unknown" ? { amount: 0, unit: "unknown" } : fallback;
}

export function purchaseLineBaseAmount(value: unknown): {
  amount: number;
  unit: BaseInventoryUnit;
} {
  const item = record(value);
  const quantity = Math.max(0, number(item.quantity));
  const packageAmount = inventoryPackageAmount(item.packageSize, item.unit);
  return {
    amount: rounded(quantity * packageAmount.amount),
    unit: packageAmount.unit,
  };
}

function cloneRecord(value: unknown): JsonRecord {
  return { ...record(value) };
}

function assortmentParts(value: unknown) {
  const root = cloneRecord(value);
  return {
    root,
    balances: array(root.stockBalances).map(cloneRecord),
    recipes: array(root.recipes).map((value) => {
      const recipe = cloneRecord(value);
      recipe.ingredients = array(recipe.ingredients).map(cloneRecord);
      return recipe;
    }),
    menuItems: array(root.menuItems).map(cloneRecord),
  };
}

function baseUnit(value: unknown): BaseInventoryUnit {
  const requested = text(value, "", 20);
  return ["ml", "g", "pcs"].includes(requested)
    ? requested as BaseInventoryUnit
    : "unknown";
}

function baseUnitInputLabel(value: BaseInventoryUnit): string {
  if (value === "ml") return "мл";
  if (value === "g") return "г";
  if (value === "pcs") return "шт.";
  return "";
}

function recipeIngredientProductKey(value: unknown): string {
  const ingredient = record(value);
  const explicit = text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 300);
  if (explicit) return explicit;
  const name = text(ingredient.name, "", 240);
  const converted = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
  if (!name || converted.unit === "unknown") return "";
  return `manual:${normalizeInventoryText(name)}|${converted.unit}`;
}

function isGenericInventoryName(value: unknown): boolean {
  const normalized = normalizeInventoryText(value);
  return !normalized || normalized === "товар" || normalized === "позиция";
}

export function repairInventoryBalanceMetadata(input: {
  assortment: unknown;
  stockMovements?: unknown;
  now?: string;
}): {
  assortment: JsonRecord;
  summary: InventoryMetadataRepairSummary;
} {
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const candidates = new Map<string, Array<{
    name: string;
    unit: BaseInventoryUnit;
    recipeId: string;
  }>>();
  for (const recipe of parts.recipes) {
    const recipeId = text(recipe.id, "", 100);
    for (const value of array(recipe.ingredients)) {
      const ingredient = record(value);
      const key = recipeIngredientProductKey(ingredient);
      const name = text(ingredient.name, "", 240);
      const unit = toInventoryBaseAmount(ingredient.quantity, ingredient.unit).unit;
      if (!key || !name || unit === "unknown") continue;
      const values = candidates.get(key) ?? [];
      values.push({ name, unit, recipeId });
      candidates.set(key, values);
    }
  }
  const movementKeys = new Set(
    array(input.stockMovements)
      .map((value) => text(record(value).productKey, "", 300))
      .filter(Boolean),
  );
  let repaired = 0;
  let removed = 0;
  const balances: JsonRecord[] = [];
  for (const original of parts.balances) {
    const balance = cloneRecord(original);
    const key = text(balance.productKey ?? balance.key, "", 300);
    const matches = candidates.get(key) ?? [];
    const names = [...new Map(matches.map((match) => [
      normalizeInventoryText(match.name),
      match.name,
    ])).values()];
    const candidate = names.length === 1 ? matches[0] : undefined;
    const emptyOrphan = isGenericInventoryName(balance.name)
      && matches.length === 0
      && Math.abs(number(balance.current)) < 0.0001
      && Math.abs(number(balance.inventoryValue)) < 0.01
      && !text(balance.lastPurchaseAt ?? balance.lastDocumentId, "", 100)
      && !movementKeys.has(key);
    if (emptyOrphan) {
      removed += 1;
      continue;
    }
    let changed = false;
    if (candidate && isGenericInventoryName(balance.name)) {
      balance.name = candidate.name;
      changed = true;
    }
    if (key && !text(balance.key, "", 300)) {
      balance.key = key;
      changed = true;
    }
    if (key && !text(balance.productKey, "", 300)) {
      balance.productKey = key;
      changed = true;
    }
    if (candidate && baseUnit(balance.unit) === "unknown") {
      balance.unit = candidate.unit;
      changed = true;
    }
    if (candidate) {
      const linkedRecipeCount = new Set(matches.map((match) => match.recipeId).filter(Boolean)).size;
      if (number(balance.linkedRecipeCount) !== linkedRecipeCount) {
        balance.linkedRecipeCount = linkedRecipeCount;
        changed = true;
      }
      if (!text(balance.metadataSource, "", 40)) {
        balance.metadataSource = "recipe";
        changed = true;
      }
    }
    if (changed) {
      balance.updatedAt = now;
      repaired += 1;
    }
    balances.push(balance);
  }
  parts.root.stockBalances = balances;
  parts.root.recipes = parts.recipes;
  if (repaired || removed) parts.root.updatedAt = now;
  return { assortment: parts.root, summary: { repaired, removed } };
}

export function updateInventoryProductDefinition(input: {
  assortment: unknown;
  stockMovements?: unknown;
  update: InventoryProductUpdate;
  now?: string;
}): InventoryProductUpdateResult {
  const now = input.now ?? new Date().toISOString();
  const repaired = repairInventoryBalanceMetadata({
    assortment: input.assortment,
    stockMovements: input.stockMovements,
    now,
  });
  const parts = assortmentParts(repaired.assortment);
  const productKey = text(input.update.productKey, "", 300);
  const name = text(input.update.name, "", 240);
  const requestedUnit = baseUnit(input.update.unit);
  const packageSize = text(input.update.packageSize, "", 120);
  if (!productKey || !name || requestedUnit === "unknown" || !packageSize) {
    return {
      ok: false,
      code: "INVALID_PRODUCT",
      error: "Укажите название, складскую единицу и фасовку товара.",
    };
  }
  const balance = parts.balances.find((value) =>
    text(value.productKey ?? value.key, "", 300) === productKey
  );
  if (!balance) {
    return { ok: false, code: "PRODUCT_NOT_FOUND", error: "Складская позиция не найдена." };
  }
  const parsedPackage = inventoryPackageAmount(packageSize, baseUnitInputLabel(requestedUnit));
  if (parsedPackage.amount <= 0 || parsedPackage.unit !== requestedUnit) {
    return {
      ok: false,
      code: "INVALID_PRODUCT",
      error: requestedUnit === "ml"
        ? "Для жидкостей укажите фасовку в мл или литрах, например 0,5 л."
        : requestedUnit === "g"
          ? "Для весовых товаров укажите фасовку в граммах или килограммах, например 1 кг."
          : "Для штучных товаров укажите фасовку в штуках, например 1 шт.",
    };
  }
  const previousUnit = baseUnit(balance.unit);
  const hasMovement = array(input.stockMovements).some((value) =>
    text(record(value).productKey, "", 300) === productKey
  );
  if (
    previousUnit !== "unknown"
    && previousUnit !== requestedUnit
    && (Math.abs(number(balance.current)) > 0.0001 || hasMovement)
  ) {
    return {
      ok: false,
      code: "UNIT_CHANGE_LOCKED",
      error: "Единицу нельзя менять после движений товара. Создайте корректирующую инвентаризацию или исправьте исходную накладную.",
    };
  }

  let linkedRecipes = 0;
  for (const recipe of parts.recipes) {
    let linked = false;
    recipe.ingredients = array(recipe.ingredients).map((value) => {
      const ingredient = cloneRecord(value);
      if (recipeIngredientProductKey(ingredient) !== productKey) return ingredient;
      ingredient.purchaseProductKey = productKey;
      if (previousUnit !== requestedUnit) {
        ingredient.unit = baseUnitInputLabel(requestedUnit);
      }
      ingredient.updatedAt = now;
      linked = true;
      return ingredient;
    });
    if (linked) linkedRecipes += 1;
  }

  balance.key = productKey;
  balance.productKey = productKey;
  balance.name = name;
  balance.unit = requestedUnit;
  balance.packageSize = packageSize;
  balance.packageAmount = rounded(parsedPackage.amount);
  balance.linkedRecipeCount = linkedRecipes;
  balance.metadataSource = linkedRecipes ? "recipe" : text(balance.metadataSource, "manual", 40);
  balance.inventoryValue = rounded(
    Math.max(0, number(balance.current)) * Math.max(0, number(balance.averageUnitCost)),
    2,
  );
  balance.updatedAt = now;
  const nomenclature = array(parts.root.nomenclature).map(cloneRecord);
  const nomenclatureItem = nomenclature.find((value) =>
    text(value.key ?? value.productKey, "", 300) === productKey
  );
  if (nomenclatureItem) {
    Object.assign(nomenclatureItem, {
      name,
      unit: requestedUnit,
      packageSize,
      packageAmount: rounded(parsedPackage.amount),
      updatedAt: now,
    });
  } else {
    nomenclature.unshift({
      ...cloneRecord(balance),
      id: productKey,
      key: productKey,
      productKey,
      kind: "stock",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });
  }
  parts.root.stockBalances = parts.balances;
  parts.root.recipes = parts.recipes;
  parts.root.nomenclature = nomenclature;
  parts.root.updatedAt = now;
  return {
    ok: true,
    assortment: parts.root,
    product: cloneRecord(balance),
    linkedRecipes,
  };
}

function balanceIndex(balances: JsonRecord[]): Map<string, JsonRecord> {
  const result = new Map<string, JsonRecord>();
  for (const balance of balances) {
    const key = text(balance.key ?? balance.productKey, "", 300);
    if (key) result.set(key, balance);
  }
  return result;
}

function sourceLineId(item: JsonRecord, index: number): string {
  return text(item.id, `line-${index + 1}`, 100);
}

export function applyPurchaseToInventory(input: {
  assortment: unknown;
  document: unknown;
  now?: string;
}): {
  assortment: JsonRecord;
  movements: StockMovement[];
  summary: InventoryUpdateSummary;
} {
  const now = input.now ?? new Date().toISOString();
  const document = record(input.document);
  const documentId = text(document.id, crypto.randomUUID(), 100);
  const date = text(document.date, now.slice(0, 10), 10);
  const currency = text(document.currency, "", 12).toUpperCase();
  const parts = assortmentParts(input.assortment);
  if (!record(parts.root.nomenclatureStructure).version) {
    parts.root.nomenclatureStructure = defaultNomenclatureStructure();
  }
  const indexedBalances = balanceIndex(parts.balances);
  const movements: StockMovement[] = [];
  const unresolvedLines: InventoryUpdateSummary["unresolvedLines"] = [];
  const candidates = new Map<string, Set<string>>();
  let currencyConflicts = 0;
  const nomenclature = array(parts.root.nomenclature).map(cloneRecord);
  const nomenclatureByKey = new Map(
    nomenclature.map((item) => [text(item.key ?? item.productKey, "", 300), item]),
  );

  array(document.items).forEach((value, index) => {
    const item = record(value);
    const itemId = sourceLineId(item, index);
    const name = text(item.name, `Позиция ${index + 1}`);
    const received = purchaseLineBaseAmount(item);
    const productKey = inventoryProductKey(item);
    const category = text(item.category, "products", 80);
    const previousNomenclature = nomenclatureByKey.get(productKey);
    const automaticClassification = previousNomenclature?.sectionId
      ? {}
      : classifyNomenclatureItemWithRules(
        { name, category, kind: PURCHASE_STOCK_CATEGORIES.has(category) ? "stock" : "service" },
        parts.root.nomenclatureRules,
      );
    const nomenclatureItem: JsonRecord = {
      ...(previousNomenclature ?? {}),
      ...automaticClassification,
      id: text(previousNomenclature?.id, productKey, 300),
      key: productKey,
      productKey,
      name,
      category,
      kind: PURCHASE_STOCK_CATEGORIES.has(category) ? "stock" : "service",
      unit: received.unit,
      packageSize: text(item.packageSize ?? item.unit, "", 120),
      active: true,
      source: "purchase",
      lastPurchaseAt: date,
      updatedAt: now,
      classifiedAt: previousNomenclature?.classifiedAt ?? now,
      createdAt: text(previousNomenclature?.createdAt, now, 40),
    };
    if (nomenclatureByKey.has(productKey)) {
      Object.assign(nomenclatureByKey.get(productKey)!, nomenclatureItem);
    } else {
      nomenclature.unshift(nomenclatureItem);
      nomenclatureByKey.set(productKey, nomenclatureItem);
    }

    if (!PURCHASE_STOCK_CATEGORIES.has(category)) return;
    if (!productKey || received.amount <= 0 || received.unit === "unknown") {
      unresolvedLines.push({
        id: itemId,
        name,
        reason: "Не удалось определить количество или единицу складского учёта",
      });
      return;
    }

    const previous = indexedBalances.get(productKey) ?? {};
    const previousCurrent = number(previous.current);
    const previousAverageCost = Math.max(0, number(previous.averageUnitCost));
    const previousCurrency = text(previous.currency, currency, 12).toUpperCase();
    const lineCost = Math.max(0, number(item.lineTotal)
      || number(item.unitPrice) * Math.max(0, number(item.quantity)));
    const nextCurrent = rounded(previousCurrent + received.amount);
    const currencyConflict = Boolean(
      previousCurrent > 0
      && previousAverageCost > 0
      && previousCurrency
      && currency
      && previousCurrency !== currency
    );
    if (currencyConflict) currencyConflicts += 1;
    const nextAverageCost = currencyConflict
      ? previousAverageCost
      : nextCurrent > 0
        ? rounded((previousCurrent * previousAverageCost + lineCost) / nextCurrent, 6)
        : 0;
    const packageDetails = inventoryPackageAmount(item.packageSize, item.unit);
    const next: JsonRecord = {
      ...previous,
      key: productKey,
      productKey,
      name,
      category: text(item.category, text(previous.category, "other", 80), 80),
      packageSize: text(item.packageSize ?? item.unit, "", 120),
      unit: received.unit,
      current: nextCurrent,
      onOrder: Math.max(0, rounded(number(previous.onOrder) - received.amount)),
      packageAmount: packageDetails.amount,
      averageUnitCost: nextAverageCost,
      inventoryValue: rounded(Math.max(0, nextCurrent) * nextAverageCost, 2),
      currency: previousCurrency || currency,
      lastPurchasePrice: Math.max(0, number(item.unitPrice)
        || lineCost / Math.max(1, number(item.quantity))),
      lastPurchaseAt: date,
      lastDocumentId: documentId,
      checkedAt: now,
      updatedAt: now,
      costNeedsReview: currencyConflict || undefined,
    };
    if (!indexedBalances.has(productKey)) parts.balances.push(next);
    else Object.assign(previous, next);
    indexedBalances.set(productKey, next);

    const alias = normalizeInventoryText(name);
    if (alias) {
      const keys = candidates.get(alias) ?? new Set<string>();
      keys.add(productKey);
      candidates.set(alias, keys);
    }
    movements.push({
      id: crypto.randomUUID(),
      type: "receipt",
      date,
      productKey,
      productName: name,
      amount: received.amount,
      unit: received.unit,
      costAmount: lineCost || undefined,
      currency: currency || undefined,
      sourceDocumentId: documentId,
      sourceLineId: itemId,
      createdAt: now,
      status: "active",
    });
  });

  let linkedIngredients = 0;
  for (const recipe of parts.recipes) {
    const ingredients = array(recipe.ingredients).map((value) => {
      const ingredient = cloneRecord(value);
      if (text(ingredient.purchaseProductKey, "", 300)) return ingredient;
      const matches = candidates.get(normalizeInventoryText(ingredient.name));
      if (!matches || matches.size !== 1) return ingredient;
      ingredient.purchaseProductKey = [...matches][0];
      ingredient.updatedAt = now;
      linkedIngredients += 1;
      return ingredient;
    });
    recipe.ingredients = ingredients;
  }

  parts.root.stockBalances = parts.balances;
  parts.root.recipes = parts.recipes;
  parts.root.nomenclature = nomenclature;
  parts.root.updatedAt = now;
  return {
    assortment: parts.root,
    movements,
    summary: {
      postedLines: movements.length,
      movementCount: movements.length,
      linkedIngredients,
      unresolvedLines,
      currencyConflicts,
    },
  };
}

function movementRecord(value: unknown): StockMovement | null {
  const item = record(value);
  if (text(item.status, "active", 20) === "cancelled" || text(item.reversedAt, "", 40)) {
    return null;
  }
  const id = text(item.id, "", 100);
  const sourceDocumentId = text(item.sourceDocumentId, "", 100);
  const productKey = text(item.productKey, "", 300);
  if (!id || !sourceDocumentId || !productKey) return null;
  const requestedType = text(item.type, "receipt", 40);
  const type: StockMovement["type"] = [
    "receipt",
    "sale",
    "inventory_adjustment",
    "writeoff",
    "return",
  ].includes(requestedType)
    ? requestedType as StockMovement["type"]
    : "receipt";
  return {
    id,
    type,
    date: text(item.date, "", 10),
    productKey,
    productName: text(item.productName, "Товар"),
    amount: number(item.amount),
    unit: ["ml", "g", "pcs"].includes(text(item.unit))
      ? text(item.unit) as BaseInventoryUnit
      : "unknown",
    costAmount: number(item.costAmount) || undefined,
    currency: text(item.currency, "", 12) || undefined,
    sourceDocumentId,
    sourceLineId: text(item.sourceLineId, "line", 100),
    menuItemId: text(item.menuItemId, "", 100) || undefined,
    menuItemName: text(item.menuItemName, "", 240) || undefined,
    createdAt: text(item.createdAt, "", 40),
    status: "active",
  };
}

export function applyInventoryCount(input: {
  assortment: unknown;
  snapshot: unknown;
  now?: string;
}): {
  assortment: JsonRecord;
  movements: StockMovement[];
  items: InventoryCountLine[];
  sections: Record<string, number>;
  summary: InventoryCountSummary;
} {
  const now = input.now ?? new Date().toISOString();
  const snapshot = record(input.snapshot);
  const snapshotId = text(snapshot.id, crypto.randomUUID(), 100);
  const date = text(snapshot.date, now.slice(0, 10), 10);
  const parts = assortmentParts(input.assortment);
  const indexedBalances = balanceIndex(parts.balances);
  const movements: StockMovement[] = [];
  const items: InventoryCountLine[] = [];
  const unresolvedLines: InventoryCountSummary["unresolvedLines"] = [];
  const sections: Record<string, number> = {};

  array(snapshot.items).forEach((value, index) => {
    const requested = record(value);
    const lineId = sourceLineId(requested, index);
    const productKey = text(requested.productKey, "", 300);
    const balance = indexedBalances.get(productKey);
    const requestedName = text(requested.productName ?? requested.name, `Позиция ${index + 1}`);
    if (!productKey || !balance) {
      unresolvedLines.push({
        id: lineId,
        name: requestedName,
        reason: "Позиция не найдена в номенклатуре склада",
      });
      return;
    }
    const actual = number(requested.actual, Number.NaN);
    if (!Number.isFinite(actual) || actual < 0) {
      unresolvedLines.push({
        id: lineId,
        name: text(balance.name, requestedName),
        reason: "Укажите фактическое количество — ноль или больше",
      });
      return;
    }
    const unit = ["ml", "g", "pcs"].includes(text(balance.unit))
      ? text(balance.unit) as BaseInventoryUnit
      : "unknown";
    if (unit === "unknown") {
      unresolvedLines.push({
        id: lineId,
        name: text(balance.name, requestedName),
        reason: "Не определена единица складского учёта",
      });
      return;
    }
    const expected = rounded(number(balance.current));
    const nextActual = rounded(actual);
    const difference = rounded(nextActual - expected);
    const averageUnitCost = Math.max(0, number(balance.averageUnitCost));
    const expectedValue = rounded(Math.max(0, expected) * averageUnitCost, 2);
    const actualValue = rounded(nextActual * averageUnitCost, 2);
    const differenceValue = rounded(actualValue - expectedValue, 2);
    const section = text(
      requested.section,
      text(balance.section ?? balance.area, "Прочее", 80),
      80,
    );
    const productName = text(balance.name, requestedName);
    const countLine: InventoryCountLine = {
      id: lineId,
      productKey,
      productName,
      unit,
      packageSize: text(balance.packageSize, "", 120) || undefined,
      packageAmount: Math.max(0, number(balance.packageAmount)) || undefined,
      section,
      expected,
      actual: nextActual,
      difference,
      averageUnitCost,
      expectedValue,
      actualValue,
      differenceValue,
    };
    items.push(countLine);
    sections[section] = rounded((sections[section] ?? 0) + actualValue, 2);

    balance.current = nextActual;
    balance.inventoryValue = actualValue;
    balance.lastInventoryAt = date;
    balance.lastInventoryDocumentId = snapshotId;
    balance.checkedAt = now;
    balance.updatedAt = now;

    if (Math.abs(difference) > 0.0001) {
      movements.push({
        id: crypto.randomUUID(),
        type: "inventory_adjustment",
        date,
        productKey,
        productName,
        amount: difference,
        unit,
        costAmount: differenceValue,
        currency: text(balance.currency, "", 12) || undefined,
        sourceDocumentId: snapshotId,
        sourceLineId: lineId,
        createdAt: now,
      });
    }
  });

  parts.root.stockBalances = parts.balances;
  parts.root.updatedAt = now;
  const expectedValue = rounded(items.reduce((sum, item) => sum + item.expectedValue, 0), 2);
  const actualValue = rounded(items.reduce((sum, item) => sum + item.actualValue, 0), 2);
  return {
    assortment: parts.root,
    movements,
    items,
    sections,
    summary: {
      countedLines: items.length,
      changedLines: movements.length,
      expectedValue,
      actualValue,
      differenceValue: rounded(actualValue - expectedValue, 2),
      unresolvedLines,
    },
  };
}

function purchaseMaterialFromDocument(value: unknown): Array<{
  productKey: string;
  amount: number;
  unit: BaseInventoryUnit;
  costAmount: number;
}> {
  return array(record(value).items).filter((line) =>
    PURCHASE_STOCK_CATEGORIES.has(text(record(line).category, "products", 80))
  ).map((line) => {
    const item = record(line);
    const base = purchaseLineBaseAmount(item);
    return {
      productKey: inventoryProductKey(item),
      amount: rounded(base.amount),
      unit: base.unit,
      costAmount: rounded(
        Math.max(0, number(item.lineTotal) || number(item.unitPrice) * Math.max(0, number(item.quantity))),
        2,
      ),
    };
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function purchaseMaterialFromMovements(values: StockMovement[]): Array<{
  productKey: string;
  amount: number;
  unit: BaseInventoryUnit;
  costAmount: number;
}> {
  return values.map((movement) => ({
    productKey: movement.productKey,
    amount: rounded(movement.amount),
    unit: movement.unit,
    costAmount: rounded(Math.max(0, number(movement.costAmount)), 2),
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

export function revisePurchaseInInventory(input: {
  assortment: unknown;
  previousDocument: unknown;
  nextDocument: unknown;
  stockMovements: unknown[];
  now?: string;
  reversalReason?: string;
}): PurchaseInventoryRevision {
  const now = input.now ?? new Date().toISOString();
  const previous = record(input.previousDocument);
  const next = record(input.nextDocument);
  const previousId = text(previous.id, "", 100);
  const movementHistory = input.stockMovements.map(record).filter((movement) =>
    text(movement.status, "active", 20) === "cancelled" || Boolean(movement.reversedAt)
  );
  const allMovements = input.stockMovements
    .map(movementRecord)
    .filter((movement): movement is StockMovement => Boolean(movement));
  const previousReceipts = allMovements.filter((movement) =>
    movement.type === "receipt" && movement.sourceDocumentId === previousId
  );
  const previousMaterial = purchaseMaterialFromMovements(previousReceipts);
  const nextMaterial = purchaseMaterialFromDocument(next);
  const materialChanged = JSON.stringify(previousMaterial) !== JSON.stringify(nextMaterial);

  if (!materialChanged) {
    const nextItems = array(next.items).map(record);
    const nextByLine = new Map(nextItems.map((item, index) => [sourceLineId(item, index), item]));
    const nextDate = text(next.date, text(previous.date, "", 10), 10);
    const nextMovements = allMovements.map((movement) => {
      if (movement.type !== "receipt" || movement.sourceDocumentId !== previousId) return movement;
      const item = nextByLine.get(movement.sourceLineId);
      return {
        ...movement,
        date: nextDate || movement.date,
        productName: item ? text(item.name, movement.productName) : movement.productName,
        currency: text(next.currency, movement.currency ?? "", 12) || undefined,
      };
    });
    const parts = assortmentParts(input.assortment);
    for (const balance of parts.balances) {
      if (text(balance.lastDocumentId, "", 100) !== previousId) continue;
      const receipt = nextMovements.find((movement) =>
        movement.type === "receipt"
        && movement.sourceDocumentId === previousId
        && movement.productKey === text(balance.productKey ?? balance.key, "", 300)
      );
      if (!receipt) continue;
      const item = nextByLine.get(receipt.sourceLineId);
      balance.lastPurchaseAt = nextDate || receipt.date;
      if (item) {
        balance.name = text(item.name, text(balance.name, "Товар"));
        balance.lastPurchasePrice = Math.max(0, number(item.unitPrice));
      }
      balance.updatedAt = now;
    }
    parts.root.stockBalances = parts.balances;
    parts.root.recipes = parts.recipes;
    parts.root.updatedAt = now;
    return {
      ok: true,
      assortment: parts.root,
      movements: [...movementHistory, ...nextMovements].slice(0, 20_000) as StockMovement[],
      summary: {
        postedLines: previousReceipts.length,
        movementCount: previousReceipts.length,
        linkedIngredients: 0,
        unresolvedLines: [],
        currencyConflicts: 0,
      },
    };
  }

  const affectedKeys = new Set([
    ...previousMaterial.map((item) => item.productKey),
    ...nextMaterial.map((item) => item.productKey),
  ]);
  const receiptCreatedAt = previousReceipts
    .map((movement) => movement.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1) || text(previous.confirmedAt ?? previous.createdAt, "", 40);
  const previousDate = text(previous.date, "", 10);
  const laterMovement = allMovements.find((movement) =>
    affectedKeys.has(movement.productKey)
    && !(movement.type === "receipt" && movement.sourceDocumentId === previousId)
    && (
      receiptCreatedAt
        ? Boolean(movement.createdAt && movement.createdAt > receiptCreatedAt)
        : Boolean(previousDate && movement.date >= previousDate)
    )
  );
  if (laterMovement) {
    return {
      ok: false,
      code: laterMovement.type === "sale"
        ? "PURCHASE_HAS_LATER_SALES"
        : "PURCHASE_HAS_LATER_MOVEMENTS",
      error: laterMovement.type === "sale"
        ? "По товарам этой накладной уже прошли продажи. Создайте корректирующий документ, чтобы не исказить остатки и себестоимость."
        : "После этой накладной уже были другие складские движения. Используйте корректирующий документ, чтобы не исказить остатки и себестоимость.",
    };
  }

  const parts = assortmentParts(input.assortment);
  const indexedBalances = balanceIndex(parts.balances);
  for (const movement of previousReceipts) {
    const balance = indexedBalances.get(movement.productKey);
    if (!balance) {
      return {
        ok: false,
        code: "PURCHASE_REVERSAL_INVALID",
        error: `Не найден складской остаток для «${movement.productName}». Проверьте склад перед исправлением накладной.`,
      };
    }
    const current = number(balance.current);
    const currentValue = number(balance.inventoryValue, current * Math.max(0, number(balance.averageUnitCost)));
    const nextCurrent = rounded(current - movement.amount);
    const nextValue = rounded(currentValue - Math.max(0, number(movement.costAmount)), 2);
    if (nextCurrent < -0.001 || nextValue < -0.01) {
      return {
        ok: false,
        code: "PURCHASE_REVERSAL_INVALID",
        error: `Остаток «${movement.productName}» уже меньше исходного прихода. Используйте корректирующий документ.`,
      };
    }
    balance.current = Math.max(0, nextCurrent);
    balance.inventoryValue = Math.max(0, nextValue);
    balance.averageUnitCost = nextCurrent > 0 ? rounded(Math.max(0, nextValue) / nextCurrent, 6) : 0;
    balance.updatedAt = now;
  }
  parts.root.stockBalances = parts.balances;
  parts.root.recipes = parts.recipes;
  parts.root.updatedAt = now;

  const reapplied = applyPurchaseToInventory({ assortment: parts.root, document: next, now });
  if (reapplied.summary.unresolvedLines.length) {
    return {
      ok: false,
      code: "INVENTORY_REVIEW_REQUIRED",
      error: "Исправьте количество или фасовку перед повторным оприходованием.",
      unresolvedLines: reapplied.summary.unresolvedLines,
    };
  }
  const retained = allMovements.filter((movement) =>
    !(movement.type === "receipt" && movement.sourceDocumentId === previousId)
  );
  const cancelledPreviousReceipts = previousReceipts.map((movement) => ({
    ...movement,
    status: "cancelled" as const,
    reversedAt: now,
    reversalReason: input.reversalReason
      ?? "Закупочная накладная исправлена и проведена повторно",
  }));
  return {
    ok: true,
    assortment: reapplied.assortment,
    movements: [
      ...reapplied.movements,
      ...cancelledPreviousReceipts,
      ...movementHistory,
      ...retained,
    ].slice(0, 20_000) as StockMovement[],
    summary: reapplied.summary,
  };
}

export function removePurchaseFromInventory(input: {
  assortment: unknown;
  document: unknown;
  stockMovements: unknown[];
  now?: string;
}): PurchaseInventoryRevision {
  const document = record(input.document);
  const documentId = text(document.id, "", 100);
  const documentDate = text(document.date, "", 10);
  const movements = input.stockMovements
    .map(movementRecord)
    .filter((movement): movement is StockMovement => Boolean(movement));
  const receipts = movements.filter((movement) =>
    movement.type === "receipt" && movement.sourceDocumentId === documentId
  );
  const affectedKeys = new Set(receipts.map((movement) => movement.productKey));
  const receiptCreatedAt = receipts
    .map((movement) => movement.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";
  const laterMovement = movements.find((movement) =>
    affectedKeys.has(movement.productKey)
    && !(movement.type === "receipt" && movement.sourceDocumentId === documentId)
    && (
      receiptCreatedAt
        ? Boolean(movement.createdAt && movement.createdAt > receiptCreatedAt)
        : Boolean(documentDate && movement.date >= documentDate)
    )
  );
  if (laterMovement) {
    return {
      ok: false,
      code: "PURCHASE_HAS_LATER_MOVEMENTS",
      error: "После этой накладной уже были продажи, списания или инвентаризация. Чтобы не исказить остатки, используйте корректирующий документ.",
    };
  }

  const revised = revisePurchaseInInventory({
    assortment: input.assortment,
    previousDocument: document,
    nextDocument: { ...document, items: [] },
    stockMovements: input.stockMovements,
    now: input.now,
    reversalReason: "Проведение закупочной накладной отменено",
  });
  if (!revised.ok) return revised;
  return revised;
}

export function applySalesToInventory(input: {
  assortment: unknown;
  salesDocument: unknown;
  now?: string;
}): {
  assortment: JsonRecord;
  movements: StockMovement[];
  summary: InventoryUpdateSummary & { matchedSalesLines: number; soldPortions: number };
} {
  const now = input.now ?? new Date().toISOString();
  const salesDocument = record(input.salesDocument);
  const documentId = text(salesDocument.id, crypto.randomUUID(), 100);
  const date = text(salesDocument.date, now.slice(0, 10), 10);
  const parts = assortmentParts(input.assortment);
  const indexedBalances = balanceIndex(parts.balances);
  const menuById = new Map(parts.menuItems.map((item) => [text(item.id), item]));
  const menuByName = new Map<string, JsonRecord[]>();
  for (const item of parts.menuItems.filter((item) => item.active !== false)) {
    const key = normalizeInventoryText(item.name);
    const values = menuByName.get(key) ?? [];
    values.push(item);
    menuByName.set(key, values);
  }
  const recipeByMenuId = new Map(
    parts.recipes
      .filter((recipe) => text(recipe.status) === "confirmed")
      .map((recipe) => [text(recipe.menuItemId), recipe]),
  );
  const movements: StockMovement[] = [];
  const unresolvedLines: InventoryUpdateSummary["unresolvedLines"] = [];
  let matchedSalesLines = 0;
  let soldPortions = 0;

  array(salesDocument.items).forEach((value, index) => {
    const sale = record(value);
    const saleId = sourceLineId(sale, index);
    const saleName = text(sale.name, `Позиция ${index + 1}`);
    const quantity = Math.max(0, number(sale.quantity));
    const requestedMenuId = text(sale.menuItemId, "", 100);
    const namedMatches = menuByName.get(normalizeInventoryText(saleName)) ?? [];
    const menuItem = menuById.get(requestedMenuId) ?? (namedMatches.length === 1 ? namedMatches[0] : undefined);
    if (!menuItem || quantity <= 0) {
      unresolvedLines.push({ id: saleId, name: saleName, reason: "Позиция не сопоставлена с меню" });
      return;
    }
    const menuItemId = text(menuItem.id);
    const recipe = recipeByMenuId.get(menuItemId);
    if (!recipe) {
      unresolvedLines.push({ id: saleId, name: saleName, reason: "Нет подтверждённой техкарты" });
      return;
    }
    const ingredients = array(recipe.ingredients).map(record);
    if (!ingredients.length) {
      unresolvedLines.push({ id: saleId, name: saleName, reason: "В техкарте нет ингредиентов" });
      return;
    }

    const preparedIngredients: Array<{
      ingredient: JsonRecord;
      productKey: string;
      amount: number;
      unit: BaseInventoryUnit;
      balance: JsonRecord;
    }> = [];
    let invalidReason = "";
    for (const ingredient of ingredients) {
      const productKey = text(ingredient.purchaseProductKey, "", 300);
      const base = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
      if (!productKey) {
        invalidReason = `Ингредиент «${text(ingredient.name, "без названия") }» не связан со складом`;
        break;
      }
      if (base.amount <= 0 || base.unit === "unknown") {
        invalidReason = `Для ингредиента «${text(ingredient.name, "без названия") }» не задана складская единица`;
        break;
      }
      const amount = rounded(base.amount * quantity);
      const previous = indexedBalances.get(productKey) ?? {
        key: productKey,
        productKey,
        name: text(ingredient.name, "Ингредиент"),
        unit: base.unit,
        current: 0,
        averageUnitCost: 0,
      };
      const balanceUnit = text(previous.unit, base.unit, 20) as BaseInventoryUnit;
      if (balanceUnit !== base.unit && number(previous.current) !== 0) {
        invalidReason = `Единица ингредиента «${text(ingredient.name, "без названия") }» не совпадает со складом`;
        break;
      }
      preparedIngredients.push({ ingredient, productKey, amount, unit: base.unit, balance: previous });
    }
    if (invalidReason || preparedIngredients.length !== ingredients.length) {
      unresolvedLines.push({
        id: saleId,
        name: saleName,
        reason: invalidReason || "Не все ингредиенты техкарты готовы к складскому списанию",
      });
      return;
    }

    for (const prepared of preparedIngredients) {
      const { ingredient, productKey, amount, unit: baseUnit, balance: previous } = prepared;
      const nextCurrent = rounded(number(previous.current) - amount);
      const averageUnitCost = Math.max(0, number(previous.averageUnitCost));
      const next = {
        ...previous,
        current: nextCurrent,
        inventoryValue: rounded(Math.max(0, nextCurrent) * averageUnitCost, 2),
        lastSaleAt: date,
        updatedAt: now,
      };
      if (!indexedBalances.has(productKey)) parts.balances.push(next);
      else Object.assign(previous, next);
      indexedBalances.set(productKey, next);
      movements.push({
        id: crypto.randomUUID(),
        type: "sale",
        date,
        productKey,
        productName: text(ingredient.name, "Ингредиент"),
        amount: -amount,
        unit: baseUnit,
        costAmount: averageUnitCost > 0 ? rounded(amount * averageUnitCost, 2) : undefined,
        currency: text(previous.currency, "", 12) || undefined,
        sourceDocumentId: documentId,
        sourceLineId: saleId,
        menuItemId,
        menuItemName: text(menuItem.name, saleName),
        createdAt: now,
      });
    }
    matchedSalesLines += 1;
    soldPortions += quantity;
  });

  parts.root.stockBalances = parts.balances;
  parts.root.updatedAt = now;
  return {
    assortment: parts.root,
    movements,
    summary: {
      postedLines: matchedSalesLines,
      movementCount: movements.length,
      linkedIngredients: 0,
      unresolvedLines,
      currencyConflicts: 0,
      matchedSalesLines,
      soldPortions: rounded(soldPortions),
    },
  };
}

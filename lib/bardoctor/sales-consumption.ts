import {
  resolveInventoryProductKey,
  toInventoryBaseAmount,
  type BaseInventoryUnit,
  type StockMovement,
} from "./inventory";
import { canonicalTechCardForOwner } from "./tech-card-reconciliation";
import { resolveReadyProductConsumption } from "./menu-sale-size";

export const SALES_BATCH_STORE_KEY = "bd_sales_batches";
export const SALES_MAPPING_STORE_KEY = "bd_sales_mappings";
export const SALES_WAREHOUSE_ROUTE_STORE_KEY = "bd_sales_warehouse_routes";

export const SALES_SOURCES = [
  "MANUAL_GRID",
  "TEXT_IMPORT",
  "FILE_IMPORT",
  "IMAGE_IMPORT",
  "VOICE_IMPORT",
  "POS_API",
  "ONE_C",
  "LOCAL_CONNECTOR",
  "OTHER_API",
] as const;

export type SalesSource = (typeof SALES_SOURCES)[number];
export type SalesBatchStatus =
  | "DRAFT"
  | "READY"
  | "PARTIALLY_BLOCKED"
  | "POSTED"
  | "REVERSED"
  | "CANCELLED";
export type SalesMappingStatus =
  | "MATCHED"
  | "NEEDS_MAPPING"
  | "NO_RECIPE"
  | "INVALID_QUANTITY"
  | "UNIT_ERROR";
export type SalesLineProcessingStatus = "DRAFT" | "READY" | "BLOCKED" | "POSTED" | "REVERSED";
export type RecipeConsumptionMode = "DIRECT_INGREDIENTS" | "PREPARED_ITEM" | "READY_PRODUCT";

export type SaleLineModifier = {
  id: string;
  externalId?: string;
  name: string;
  quantity?: number;
  payload?: Record<string, unknown>;
};

export type RecipeIngredientSnapshot = {
  ingredientId: string;
  name: string;
  nomenclatureItemId: string;
  productKey: string;
  recipeQuantity: number;
  recipeUnit: string;
  baseQuantityPerPortion: number;
  baseQuantityTotal: number;
  baseUnit: BaseInventoryUnit;
  warehouseId: string;
  unitCost: number | null;
  totalCost: number | null;
  currency?: string;
  conversion: {
    inputQuantity: number;
    inputUnit: string;
    factor: number;
    outputUnit: BaseInventoryUnit;
    source: "recipe_normalized" | "canonical_unit_conversion";
  };
};

export type RecipeSnapshot = {
  recipeId: string;
  recipeVersion: number;
  capturedAt: string;
  consumptionMode: RecipeConsumptionMode;
  menuItem: { id: string; name: string; department?: string; category?: string };
  ingredients: RecipeIngredientSnapshot[];
};

export type SalesBatchLine = {
  id: string;
  salesBatchId: string;
  externalLineId?: string;
  rawName: string;
  menuItemId?: string;
  suggestedMenuItemId?: string;
  matchConfidence?: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
  quantity: number;
  unit: "PORTION";
  mappingStatus: SalesMappingStatus;
  recipeVersionId?: string;
  recipeSnapshot?: RecipeSnapshot;
  processingStatus: SalesLineProcessingStatus;
  errorCode?: string;
  errorMessage?: string;
  theoreticalCost: number | null;
  currency?: string;
  movementIds: string[];
  modifiers?: SaleLineModifier[];
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
};

export type SalesBatch = {
  id: string;
  venueId: number;
  shiftId?: string;
  businessDate: string;
  source: SalesSource;
  sourceReference?: string;
  externalBatchId?: string;
  status: SalesBatchStatus;
  createdBy: { accountId: number; name: string; role: string };
  createdAt: string;
  updatedAt: string;
  postedAt?: string;
  reversedAt?: string;
  cancelledAt?: string;
  notes?: string;
  lines: SalesBatchLine[];
  movementIds: string[];
  reversalMovementIds: string[];
  totalTheoreticalCost: number | null;
  costStatus: "FULL" | "PARTIAL" | "UNVALUED";
  readyLineCount: number;
  postedLineCount: number;
  blockedLineCount: number;
  unresolvedQuantity: number;
};

export type SalesNameMapping = {
  id: string;
  venueId: number;
  source: SalesSource;
  rawName: string;
  normalizedRawName: string;
  menuItemId: string;
  status: "ACTIVE" | "REVOKED";
  createdByAccountId: number;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type SalesWarehouseRoute = {
  id: string;
  venueId: number;
  department: string;
  salesLocation?: string;
  warehouseId: string;
  warehouseName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedSalesDraftLine = {
  id?: string;
  externalLineId?: string;
  rawName: string;
  menuItemId?: string;
  quantity: number;
  modifiers?: SaleLineModifier[];
};

export type NormalizedSalesDraft = {
  source: SalesSource;
  sourceReference?: string;
  externalBatchId?: string;
  businessDate?: string;
  shiftId?: string;
  notes?: string;
  lines: NormalizedSalesDraftLine[];
  warnings: string[];
};

export interface SalesSourceAdapter<TInput = unknown> {
  readonly source: SalesSource;
  parse(input: TInput): NormalizedSalesDraft;
}

export type SalesDataQualityIssue = {
  code: string;
  severity: "HIGH" | "MEDIUM";
  batchId: string;
  lineId?: string;
  label: string;
  quantity: number;
  impact: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function numeric(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
function money(value: number): number { return rounded(value, 2); }
function validBusinessDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeSalesName(value: unknown): string {
  return text(value, "", 300)
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function source(value: unknown): SalesSource {
  const candidate = text(value, "MANUAL_GRID", 40).toUpperCase();
  return (SALES_SOURCES as readonly string[]).includes(candidate)
    ? candidate as SalesSource
    : "OTHER_API";
}

function parseQuantity(value: unknown): number {
  const result = numeric(value, Number.NaN);
  return Number.isFinite(result) ? rounded(result) : Number.NaN;
}

function textLine(value: string, index: number): NormalizedSalesDraftLine | null {
  const line = value.trim();
  if (!line || /^(?:итого|всего|total|subtotal|сумма)(?:\s|:|$)/i.test(line)) return null;
  const leading = line.match(/^\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s+(.+?)\s*$/i);
  if (leading) return { id: `text:${index}`, rawName: leading[2].trim(), quantity: parseQuantity(leading[1]) };
  const trailing = line.match(/^\s*(.+?)\s*(?:[-—:;]|\s)\s*(\d+(?:[.,]\d+)?)\s*(?:x|х|шт\.?|порц(?:ий|ии|ия)?\.?)?\s*$/i);
  if (trailing) return { id: `text:${index}`, rawName: trailing[1].trim(), quantity: parseQuantity(trailing[2]) };
  return { id: `text:${index}`, rawName: line, quantity: Number.NaN };
}

export const textSalesAdapter: SalesSourceAdapter<{ text: string; businessDate?: string; shiftId?: string }> = {
  source: "TEXT_IMPORT",
  parse(input) {
    const lines = String(input.text ?? "").split(/\r?\n|,(?=\s*[\p{L}])/u)
      .map(textLine)
      .filter((line): line is NormalizedSalesDraftLine => Boolean(line));
    return {
      source: "TEXT_IMPORT",
      businessDate: input.businessDate,
      shiftId: input.shiftId,
      lines,
      warnings: lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)
        ? ["Для части строк не удалось определить количество."]
        : [],
    };
  },
};

export const manualSalesAdapter: SalesSourceAdapter<{
  lines: NormalizedSalesDraftLine[];
  businessDate?: string;
  shiftId?: string;
  notes?: string;
}> = {
  source: "MANUAL_GRID",
  parse(input) {
    return {
      source: "MANUAL_GRID",
      businessDate: input.businessDate,
      shiftId: input.shiftId,
      notes: input.notes,
      lines: array(input.lines).map((value, index) => {
        const item = record(value);
        return {
          id: text(item.id, `manual:${index}`, 120),
          rawName: text(item.rawName ?? item.name, `Позиция ${index + 1}`),
          menuItemId: text(item.menuItemId, "", 160) || undefined,
          quantity: parseQuantity(item.quantity),
          modifiers: Array.isArray(item.modifiers) ? item.modifiers as SaleLineModifier[] : undefined,
        };
      }).filter((line) => line.quantity !== 0),
      warnings: [],
    };
  },
};

export function tabularSalesAdapter(input: {
  rows: unknown[][];
  nameColumn: number;
  quantityColumn: number;
  headerRow?: number;
  businessDate?: string;
  sourceReference?: string;
}): NormalizedSalesDraft {
  const start = Math.max(0, (input.headerRow ?? -1) + 1);
  const lines = input.rows.slice(start, start + 5_000).flatMap((row, index) => {
    const rawName = text(row[input.nameColumn], "", 300);
    if (!rawName || /^(?:итого|всего|total|subtotal|сумма)(?:\s|:|$)/i.test(rawName)) return [];
    return [{
      id: `file:${index}`,
      externalLineId: `row:${start + index + 1}`,
      rawName,
      quantity: parseQuantity(row[input.quantityColumn]),
    }];
  });
  return {
    source: "FILE_IMPORT",
    sourceReference: input.sourceReference,
    businessDate: input.businessDate,
    lines,
    warnings: lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)
      ? ["Проверьте строки, где количество отсутствует или некорректно."]
      : [],
  };
}

function tokenSimilarity(left: string, right: string): number {
  const a = new Set(left.split(" ").filter(Boolean));
  const b = new Set(right.split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}

function activeMenu(assortment: JsonRecord, venueId: number): JsonRecord[] {
  return array(assortment.menuItems).map(record).filter((item) => {
    const itemVenueId = numeric(item.venueId);
    return item.active !== false && item.type !== "service" && (!itemVenueId || itemVenueId === venueId);
  });
}

function mappingsFor(values: unknown[], venueId: number, currentSource: SalesSource): SalesNameMapping[] {
  return values.map((value) => value as SalesNameMapping).filter((mapping) =>
    mapping && mapping.venueId === venueId && mapping.source === currentSource && mapping.status !== "REVOKED"
  );
}

function matchMenuItem(input: {
  rawName: string;
  requestedMenuItemId?: string;
  menu: JsonRecord[];
  mappings: SalesNameMapping[];
}): { menuItem?: JsonRecord; suggestedMenuItemId?: string; confidence?: SalesBatchLine["matchConfidence"] } {
  if (input.requestedMenuItemId) {
    const direct = input.menu.find((item) => text(item.id, "", 160) === input.requestedMenuItemId);
    if (direct) return { menuItem: direct, confidence: "EXACT" };
  }
  const normalized = normalizeSalesName(input.rawName);
  const persisted = input.mappings.find((mapping) => mapping.normalizedRawName === normalized);
  if (persisted) {
    const mapped = input.menu.find((item) => text(item.id, "", 160) === persisted.menuItemId);
    if (mapped) return { menuItem: mapped, confidence: "EXACT" };
  }
  const exact = input.menu.filter((item) => normalizeSalesName(item.name) === normalized);
  if (exact.length === 1) return { menuItem: exact[0], confidence: "EXACT" };
  const suggestions = input.menu.map((item) => ({ item, score: tokenSimilarity(normalized, normalizeSalesName(item.name)) }))
    .filter((candidate) => candidate.score >= 0.5)
    .sort((left, right) => right.score - left.score);
  if (!suggestions.length) return { confidence: "LOW" };
  const best = suggestions[0];
  return {
    suggestedMenuItemId: text(best.item.id, "", 160) || undefined,
    confidence: best.score >= 0.85 && (suggestions[1]?.score ?? 0) < best.score ? "HIGH" : "MEDIUM",
  };
}

function balanceKey(value: JsonRecord): string {
  return text(value.productKey ?? value.key ?? value.nomenclatureItemId, "", 320);
}

function venueBalances(assortment: JsonRecord, venueId: number): JsonRecord[] {
  return array(assortment.stockBalances).map(record).filter((balance) => {
    const rowVenueId = numeric(balance.venueId);
    return !rowVenueId || rowVenueId === venueId;
  });
}

function warehouseList(assortment: JsonRecord, warehouses: unknown[], venueId: number): JsonRecord[] {
  const explicit = warehouses.map(record).filter((warehouse) => {
    const rowVenueId = numeric(warehouse.venueId);
    return warehouse.active !== false && (!rowVenueId || rowVenueId === venueId);
  });
  if (explicit.length) return explicit;
  const fromAssortment = array(assortment.warehouses).map(record).filter((warehouse) => {
    const rowVenueId = numeric(warehouse.venueId);
    return warehouse.active !== false && (!rowVenueId || rowVenueId === venueId);
  });
  return fromAssortment;
}

function resolveWarehouse(input: {
  assortment: JsonRecord;
  warehouses: JsonRecord[];
  routes: SalesWarehouseRoute[];
  menuItem: JsonRecord;
  venueId: number;
}): { id?: string; name?: string; error?: string } {
  const department = normalizeSalesName(input.menuItem.department ?? input.menuItem.section ?? "other");
  const explicitId = text(input.menuItem.salesWarehouseId ?? input.menuItem.warehouseId, "", 160);
  const route = input.routes.find((candidate) => candidate.active !== false
    && candidate.venueId === input.venueId
    && normalizeSalesName(candidate.department) === department);
  const defaultId = text(
    input.assortment.defaultSalesWarehouseId ?? input.assortment.defaultWarehouseId,
    "",
    160,
  );
  const chosenId = explicitId || route?.warehouseId || defaultId;
  if (chosenId) {
    const warehouse = input.warehouses.find((candidate) =>
      text(candidate.id ?? candidate.externalId, "", 160) === chosenId
    );
    if (input.warehouses.length && !warehouse) return { error: "Настроенный склад больше не существует" };
    return { id: chosenId, name: text(warehouse?.name ?? route?.warehouseName, chosenId, 160) };
  }
  const markedDefault = input.warehouses.find((warehouse) => warehouse.isDefault === true || warehouse.default === true);
  if (markedDefault) return {
    id: text(markedDefault.id ?? markedDefault.externalId, "", 160),
    name: text(markedDefault.name, "Основной склад", 160),
  };
  if (input.warehouses.length === 1) return {
    id: text(input.warehouses[0].id ?? input.warehouses[0].externalId, "", 160),
    name: text(input.warehouses[0].name, "Основной склад", 160),
  };
  if (input.warehouses.length > 1) return { error: "Для отдела не указан склад расхода" };
  return { id: "__venue__", name: "Склад заведения" };
}

function ingredientBase(ingredient: JsonRecord): {
  amount: number;
  unit: BaseInventoryUnit;
  source: RecipeIngredientSnapshot["conversion"]["source"];
  factor: number;
} {
  const normalizedQuantity = numeric(ingredient.normalizedQuantity, Number.NaN);
  const normalizedUnit = text(ingredient.normalizedUnit, "", 20) as BaseInventoryUnit;
  if (
    Number.isFinite(normalizedQuantity)
    && normalizedQuantity > 0
    && ["ml", "g", "pcs"].includes(normalizedUnit)
    && ["exact_compatible", "packaging_compatible"].includes(text(ingredient.unitResolutionStatus, "", 50))
  ) {
    const inputQuantity = numeric(ingredient.quantity, 0);
    return {
      amount: normalizedQuantity,
      unit: normalizedUnit,
      source: "recipe_normalized",
      factor: inputQuantity > 0 ? normalizedQuantity / inputQuantity : 1,
    };
  }
  const converted = toInventoryBaseAmount(ingredient.quantity, ingredient.unit);
  return {
    ...converted,
    source: "canonical_unit_conversion",
    factor: numeric(ingredient.quantity) > 0 ? converted.amount / numeric(ingredient.quantity) : 1,
  };
}

function snapshotFor(input: {
  assortment: JsonRecord;
  menuItem: JsonRecord;
  quantity: number;
  venueId: number;
  routes: SalesWarehouseRoute[];
  warehouses: JsonRecord[];
  now: string;
}): { snapshot?: RecipeSnapshot; errorCode?: string; errorMessage?: string; cost: number | null; currency?: string } {
  const readyProduct = resolveReadyProductConsumption(input.menuItem, input.assortment);
  if (readyProduct) {
    const warehouse = resolveWarehouse({ ...input, menuItem: input.menuItem });
    if (!warehouse.id) {
      return {
        errorCode: "WAREHOUSE_MAPPING_REQUIRED",
        errorMessage: warehouse.error ?? "Не определён склад расхода",
        cost: null,
      };
    }
    const balance = venueBalances(input.assortment, input.venueId).find((candidate) =>
      balanceKey(candidate) === readyProduct.productKey
    );
    if (!balance) {
      return {
        errorCode: "INGREDIENT_NOMENCLATURE_REQUIRED",
        errorMessage: `Canonical позиция «${readyProduct.productName}» отсутствует на складе этого заведения`,
        cost: null,
      };
    }
    const balanceUnit = text(balance.unit, "unknown", 20) as BaseInventoryUnit;
    if (balanceUnit !== readyProduct.baseUnit) {
      return {
        errorCode: "UNIT_ERROR",
        errorMessage: `Фасовка «${readyProduct.productName}» несовместима со складской единицей`,
        cost: null,
      };
    }
    const warehouseBalances = record(balance.warehouseBalances);
    if (
      warehouse.id !== "__venue__"
      && Object.keys(warehouseBalances).length > 0
      && !(warehouse.id in warehouseBalances)
    ) {
      return {
        errorCode: "WAREHOUSE_MAPPING_REQUIRED",
        errorMessage: `Позиция «${readyProduct.productName}» не заведена на выбранном складе`,
        cost: null,
      };
    }
    const unitCost = balance.costNeedsReview === true || !(numeric(balance.averageUnitCost) > 0)
      ? null
      : rounded(numeric(balance.averageUnitCost), 6);
    const baseQuantityTotal = rounded(readyProduct.quantityPerSale * input.quantity);
    const currency = unitCost === null
      ? undefined
      : text(balance.currency, "", 12).toUpperCase() || undefined;
    const totalCost = unitCost === null ? null : money(unitCost * baseQuantityTotal);
    return {
      snapshot: {
        recipeId: `ready-product:${text(input.menuItem.id, "", 160)}`,
        recipeVersion: 1,
        capturedAt: input.now,
        consumptionMode: "READY_PRODUCT",
        menuItem: {
          id: text(input.menuItem.id, "", 160),
          name: text(input.menuItem.name, "Позиция меню"),
          department: text(input.menuItem.department, "", 100) || undefined,
          category: text(input.menuItem.category, "", 120) || undefined,
        },
        ingredients: [{
          ingredientId: `ready-product:${readyProduct.nomenclatureItemId}`,
          name: readyProduct.productName,
          nomenclatureItemId: readyProduct.nomenclatureItemId,
          productKey: readyProduct.productKey,
          recipeQuantity: readyProduct.quantityPerSale,
          recipeUnit: readyProduct.baseUnit,
          baseQuantityPerPortion: readyProduct.quantityPerSale,
          baseQuantityTotal,
          baseUnit: readyProduct.baseUnit,
          warehouseId: warehouse.id,
          unitCost,
          totalCost,
          currency,
          conversion: {
            inputQuantity: 1,
            inputUnit: "sale",
            factor: readyProduct.quantityPerSale,
            outputUnit: readyProduct.baseUnit,
            source: "canonical_unit_conversion",
          },
        }],
      },
      cost: totalCost,
      currency,
    };
  }
  const recipe = canonicalTechCardForOwner(input.menuItem.id, input.assortment.recipes);
  if (!recipe || text(recipe.status, "", 30) !== "confirmed" || text(recipe.reviewStatus, "", 40) !== "approved") {
    return { errorCode: "NO_RECIPE", errorMessage: "Нет подтверждённой canonical техкарты", cost: null };
  }
  const ingredients = array(recipe.ingredients).map(record);
  if (!ingredients.length) return { errorCode: "NO_RECIPE", errorMessage: "В техкарте нет ингредиентов", cost: null };
  const warehouse = resolveWarehouse({ ...input, menuItem: input.menuItem });
  if (!warehouse.id) return { errorCode: "WAREHOUSE_MAPPING_REQUIRED", errorMessage: warehouse.error ?? "Не определён склад расхода", cost: null };
  const balances = venueBalances(input.assortment, input.venueId);
  const byKey = new Map(balances.map((balance) => [balanceKey(balance), balance]));
  const snapshots: RecipeIngredientSnapshot[] = [];
  for (const [index, ingredient] of ingredients.entries()) {
    const requestedKey = text(ingredient.nomenclatureItemId ?? ingredient.purchaseProductKey ?? ingredient.productKey, "", 320);
    const productKey = resolveInventoryProductKey(input.assortment, requestedKey) || requestedKey;
    if (!productKey) {
      return { errorCode: "INGREDIENT_NOMENCLATURE_REQUIRED", errorMessage: `Ингредиент «${text(ingredient.name, `Ингредиент ${index + 1}`)}» не связан с canonical Номенклатурой`, cost: null };
    }
    const balance = byKey.get(productKey);
    if (!balance) {
      return { errorCode: "INGREDIENT_NOMENCLATURE_REQUIRED", errorMessage: `Canonical позиция «${text(ingredient.name, productKey)}» отсутствует на складе этого заведения`, cost: null };
    }
    const base = ingredientBase(ingredient);
    if (!(base.amount > 0) || base.unit === "unknown") {
      return { errorCode: "UNIT_ERROR", errorMessage: `Для ингредиента «${text(ingredient.name, "без названия") }» нет безопасного пересчёта единицы`, cost: null };
    }
    const balanceUnit = text(balance.unit, "unknown", 20) as BaseInventoryUnit;
    if (balanceUnit !== base.unit) {
      return { errorCode: "UNIT_ERROR", errorMessage: `Единица ингредиента «${text(ingredient.name, "без названия") }» не совпадает со складской`, cost: null };
    }
    const warehouseBalances = record(balance.warehouseBalances);
    if (warehouse.id !== "__venue__" && Object.keys(warehouseBalances).length > 0 && !(warehouse.id in warehouseBalances)) {
      return { errorCode: "WAREHOUSE_MAPPING_REQUIRED", errorMessage: `Позиция «${text(balance.name, productKey)}» не заведена на выбранном складе`, cost: null };
    }
    const unitCost = balance.costNeedsReview === true ? null : numeric(balance.averageUnitCost) > 0
      ? rounded(numeric(balance.averageUnitCost), 6)
      : null;
    const baseQuantityTotal = rounded(base.amount * input.quantity);
    snapshots.push({
      ingredientId: text(ingredient.id, `ingredient:${index}`, 160),
      name: text(ingredient.name, `Ингредиент ${index + 1}`),
      nomenclatureItemId: text(ingredient.nomenclatureItemId, productKey, 320),
      productKey,
      recipeQuantity: numeric(ingredient.quantity),
      recipeUnit: text(ingredient.unit, "", 40),
      baseQuantityPerPortion: rounded(base.amount),
      baseQuantityTotal,
      baseUnit: base.unit,
      warehouseId: warehouse.id,
      unitCost,
      totalCost: unitCost === null ? null : money(unitCost * baseQuantityTotal),
      currency: unitCost === null ? undefined : text(balance.currency, "", 12).toUpperCase() || undefined,
      conversion: {
        inputQuantity: numeric(ingredient.quantity),
        inputUnit: text(ingredient.unit, "", 40),
        factor: rounded(base.factor, 6),
        outputUnit: base.unit,
        source: base.source,
      },
    });
  }
  const currencies = [...new Set(snapshots.map((ingredient) => ingredient.currency).filter(Boolean))];
  const allValued = snapshots.every((ingredient) => ingredient.totalCost !== null);
  return {
    snapshot: {
      recipeId: text(recipe.id, "", 160),
      recipeVersion: Math.max(1, Math.round(numeric(recipe.version, 1))),
      capturedAt: input.now,
      consumptionMode: text(recipe.consumptionMode, "DIRECT_INGREDIENTS", 40) === "PREPARED_ITEM"
        ? "PREPARED_ITEM"
        : "DIRECT_INGREDIENTS",
      menuItem: {
        id: text(input.menuItem.id, "", 160),
        name: text(input.menuItem.name, "Позиция меню"),
        department: text(input.menuItem.department, "", 100) || undefined,
        category: text(input.menuItem.category, "", 120) || undefined,
      },
      ingredients: snapshots,
    },
    cost: allValued ? money(snapshots.reduce((sum, ingredient) => sum + (ingredient.totalCost ?? 0), 0)) : null,
    currency: currencies.length === 1 ? currencies[0] : undefined,
  };
}

function prepareLine(input: {
  line: NormalizedSalesDraftLine;
  batchId: string;
  assortment: JsonRecord;
  venueId: number;
  source: SalesSource;
  mappings: SalesNameMapping[];
  routes: SalesWarehouseRoute[];
  warehouses: JsonRecord[];
  now: string;
  existing?: SalesBatchLine;
}): SalesBatchLine {
  const existing = input.existing;
  if (existing?.processingStatus === "POSTED" || existing?.processingStatus === "REVERSED") return existing;
  const quantity = parseQuantity(input.line.quantity);
  const id = existing?.id ?? text(input.line.id, crypto.randomUUID(), 160);
  const base: SalesBatchLine = {
    id,
    salesBatchId: input.batchId,
    externalLineId: text(input.line.externalLineId, existing?.externalLineId ?? "", 180) || undefined,
    rawName: text(input.line.rawName, existing?.rawName ?? "Позиция продажи"),
    menuItemId: text(input.line.menuItemId, existing?.menuItemId ?? "", 160) || undefined,
    quantity,
    unit: "PORTION",
    mappingStatus: "NEEDS_MAPPING",
    processingStatus: "BLOCKED",
    theoreticalCost: null,
    movementIds: existing?.movementIds ?? [],
    modifiers: input.line.modifiers,
    createdAt: existing?.createdAt ?? input.now,
    updatedAt: input.now,
  };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ...base, mappingStatus: "INVALID_QUANTITY", errorCode: "INVALID_QUANTITY", errorMessage: "Количество должно быть больше нуля" };
  }
  const menu = activeMenu(input.assortment, input.venueId);
  const match = matchMenuItem({
    rawName: base.rawName,
    requestedMenuItemId: base.menuItemId,
    menu,
    mappings: input.mappings,
  });
  if (!match.menuItem) {
    return {
      ...base,
      suggestedMenuItemId: match.suggestedMenuItemId,
      matchConfidence: match.confidence,
      errorCode: "NEEDS_MAPPING",
      errorMessage: match.suggestedMenuItemId ? "Проверьте предложенное сопоставление" : "Сопоставьте строку с позицией меню",
    };
  }
  const prepared = snapshotFor({
    assortment: input.assortment,
    menuItem: match.menuItem,
    quantity,
    venueId: input.venueId,
    routes: input.routes,
    warehouses: input.warehouses,
    now: input.now,
  });
  if (!prepared.snapshot) {
    const mappingStatus: SalesMappingStatus = prepared.errorCode === "NO_RECIPE"
      ? "NO_RECIPE"
      : prepared.errorCode === "UNIT_ERROR"
        ? "UNIT_ERROR"
        : "MATCHED";
    return {
      ...base,
      menuItemId: text(match.menuItem.id, "", 160),
      matchConfidence: match.confidence,
      mappingStatus,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    };
  }
  return {
    ...base,
    menuItemId: text(match.menuItem.id, "", 160),
    matchConfidence: match.confidence,
    mappingStatus: "MATCHED",
    recipeVersionId: `${prepared.snapshot.recipeId}:v${prepared.snapshot.recipeVersion}`,
    recipeSnapshot: prepared.snapshot,
    processingStatus: "READY",
    errorCode: undefined,
    errorMessage: undefined,
    theoreticalCost: prepared.cost,
    currency: prepared.currency,
  };
}

function summarizeBatch(batch: SalesBatch): SalesBatch {
  const readyLineCount = batch.lines.filter((line) => line.processingStatus === "READY").length;
  const postedLineCount = batch.lines.filter((line) => line.processingStatus === "POSTED").length;
  const blockedLineCount = batch.lines.filter((line) => line.processingStatus === "BLOCKED").length;
  const unresolvedQuantity = rounded(batch.lines.filter((line) => line.processingStatus === "BLOCKED")
    .reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0), 0));
  const valued = batch.lines.filter((line) => line.theoreticalCost !== null);
  const eligible = batch.lines.filter((line) => ["READY", "POSTED", "REVERSED"].includes(line.processingStatus));
  const total = valued.length ? money(valued.reduce((sum, line) => sum + (line.theoreticalCost ?? 0), 0)) : null;
  const costStatus = !eligible.length || !valued.length ? "UNVALUED" : valued.length < eligible.length ? "PARTIAL" : "FULL";
  let status = batch.status;
  if (!["POSTED", "REVERSED", "CANCELLED"].includes(status)) {
    status = blockedLineCount || postedLineCount && postedLineCount < batch.lines.length
      ? "PARTIALLY_BLOCKED"
      : batch.lines.length && readyLineCount + postedLineCount === batch.lines.length
        ? "READY"
        : "DRAFT";
  }
  return {
    ...batch,
    status,
    readyLineCount,
    postedLineCount,
    blockedLineCount,
    unresolvedQuantity,
    totalTheoreticalCost: total,
    costStatus,
  };
}

export function salesBatches(values: unknown[], venueId: number): SalesBatch[] {
  return values.map((value) => value as SalesBatch).filter((batch) =>
    batch && typeof batch.id === "string" && batch.venueId === venueId && Array.isArray(batch.lines)
  ).map(summarizeBatch);
}

export function createOrUpdateSalesBatch(input: {
  batches: unknown[];
  draft: NormalizedSalesDraft;
  batchId?: string;
  assortment: unknown;
  mappings: unknown[];
  warehouseRoutes: unknown[];
  warehouses?: unknown[];
  venueId: number;
  actor: SalesBatch["createdBy"];
  now?: string;
}): { ok: true; batch: SalesBatch; batches: SalesBatch[] } | { ok: false; code: string; error: string } {
  const now = input.now ?? new Date().toISOString();
  const existingBatches = salesBatches(input.batches, input.venueId);
  const existing = input.batchId ? existingBatches.find((batch) => batch.id === input.batchId) : undefined;
  if (existing && ["POSTED", "REVERSED", "CANCELLED"].includes(existing.status)) {
    return { ok: false, code: "SALES_BATCH_READ_ONLY", error: "Проведённый, отменённый или сторнированный документ нельзя изменить" };
  }
  const businessDate = text(input.draft.businessDate, existing?.businessDate ?? now.slice(0, 10), 10);
  if (!validBusinessDate(businessDate)) return { ok: false, code: "INVALID_BUSINESS_DATE", error: "Укажите корректную дату продаж" };
  const currentSource = source(input.draft.source ?? existing?.source);
  const batchId = existing?.id ?? input.batchId ?? crypto.randomUUID();
  const assortment = record(input.assortment);
  const currentMappings = mappingsFor(input.mappings, input.venueId, currentSource);
  const routes = input.warehouseRoutes.map((value) => value as SalesWarehouseRoute).filter((route) => route.venueId === input.venueId && route.active !== false);
  const warehouses = warehouseList(assortment, input.warehouses ?? [], input.venueId);
  const existingById = new Map((existing?.lines ?? []).map((line) => [line.id, line]));
  const requestedLines = input.draft.lines.slice(0, 5_000);
  const lines = requestedLines.map((line) => prepareLine({
    line,
    batchId,
    assortment,
    venueId: input.venueId,
    source: currentSource,
    mappings: currentMappings,
    routes,
    warehouses,
    now,
    existing: existingById.get(text(line.id, "", 160)),
  }));
  for (const posted of existing?.lines.filter((line) => line.processingStatus === "POSTED") ?? []) {
    if (!lines.some((line) => line.id === posted.id)) lines.push(posted);
  }
  const base: SalesBatch = {
    id: batchId,
    venueId: input.venueId,
    shiftId: text(input.draft.shiftId, existing?.shiftId ?? "", 160) || undefined,
    businessDate,
    source: currentSource,
    sourceReference: text(input.draft.sourceReference, existing?.sourceReference ?? "", 240) || undefined,
    externalBatchId: text(input.draft.externalBatchId, existing?.externalBatchId ?? "", 180) || undefined,
    status: existing?.status ?? "DRAFT",
    createdBy: existing?.createdBy ?? input.actor,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    postedAt: existing?.postedAt,
    notes: text(input.draft.notes, existing?.notes ?? "", 1_000) || undefined,
    lines,
    movementIds: existing?.movementIds ?? [],
    reversalMovementIds: existing?.reversalMovementIds ?? [],
    totalTheoreticalCost: null,
    costStatus: "UNVALUED",
    readyLineCount: 0,
    postedLineCount: 0,
    blockedLineCount: 0,
    unresolvedQuantity: 0,
  };
  const batch = summarizeBatch(base);
  return { ok: true, batch, batches: [batch, ...existingBatches.filter((item) => item.id !== batch.id)] };
}

function movementIdentity(batchId: string, lineId: string, ingredientId: string): string {
  return `sale-consumption:${batchId}:${lineId}:${ingredientId}`;
}

function updateWarehouseBalance(balance: JsonRecord, warehouseId: string, amountDelta: number, costDelta: number | null, now: string) {
  const before = numeric(balance.current);
  balance.current = rounded(before + amountDelta);
  if (costDelta !== null) balance.inventoryValue = money(Math.max(0, numeric(balance.inventoryValue) + costDelta));
  else balance.costNeedsReview = true;
  const warehouseBalances = record(balance.warehouseBalances);
  if (warehouseId !== "__venue__" && Object.keys(warehouseBalances).length > 0) {
    const row = record(warehouseBalances[warehouseId]);
    row.current = rounded(numeric(row.current) + amountDelta);
    if (costDelta !== null) row.inventoryValue = money(Math.max(0, numeric(row.inventoryValue) + costDelta));
    row.updatedAt = now;
    warehouseBalances[warehouseId] = row;
    balance.warehouseBalances = warehouseBalances;
  }
  balance.updatedAt = now;
}

export function postSalesBatch(input: {
  batches: unknown[];
  batchId: string;
  assortment: unknown;
  mappings: unknown[];
  warehouseRoutes: unknown[];
  warehouses?: unknown[];
  stockMovements: unknown[];
  venueId: number;
  actor: SalesBatch["createdBy"];
  now?: string;
}):
  | { ok: true; idempotent: boolean; batch: SalesBatch; batches: SalesBatch[]; assortment: JsonRecord; stockMovements: StockMovement[]; postedNow: number }
  | { ok: false; code: string; error: string } {
  const now = input.now ?? new Date().toISOString();
  const batches = salesBatches(input.batches, input.venueId);
  const existing = batches.find((batch) => batch.id === input.batchId);
  if (!existing) return { ok: false, code: "SALES_BATCH_NOT_FOUND", error: "Документ продаж не найден" };
  if (existing.status === "REVERSED" || existing.status === "CANCELLED") return { ok: false, code: "SALES_BATCH_READ_ONLY", error: "Сторнированный или отменённый документ нельзя провести" };
  if (existing.status === "POSTED") return { ok: true, idempotent: true, batch: existing, batches, assortment: record(input.assortment), stockMovements: input.stockMovements as StockMovement[], postedNow: 0 };
  const refreshed = createOrUpdateSalesBatch({
    batches,
    draft: {
      source: existing.source,
      sourceReference: existing.sourceReference,
      externalBatchId: existing.externalBatchId,
      businessDate: existing.businessDate,
      shiftId: existing.shiftId,
      notes: existing.notes,
      lines: existing.lines.map((line) => ({
        id: line.id,
        externalLineId: line.externalLineId,
        rawName: line.rawName,
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        modifiers: line.modifiers,
      })),
      warnings: [],
    },
    batchId: existing.id,
    assortment: input.assortment,
    mappings: input.mappings,
    warehouseRoutes: input.warehouseRoutes,
    warehouses: input.warehouses,
    venueId: input.venueId,
    actor: input.actor,
    now,
  });
  if (!refreshed.ok) return refreshed;
  const batch = refreshed.batch;
  const ready = batch.lines.filter((line) => line.processingStatus === "READY" && line.recipeSnapshot);
  if (!ready.length) {
    return { ok: false, code: "SALES_BATCH_BLOCKED", error: batch.blockedLineCount ? "Нет строк, готовых к отражению на складе. Исправьте Data Quality ошибки." : "В документе нет продаж для проведения" };
  }
  const assortment = record(structuredClone(input.assortment));
  const balances = venueBalances(assortment, input.venueId);
  const byKey = new Map(balances.map((balance) => [balanceKey(balance), balance]));
  const currentMovements = input.stockMovements.map((value) => value as StockMovement);
  const newMovements: StockMovement[] = [];
  const postedLines = new Map<string, SalesBatchLine>();
  for (const line of ready) {
    const movementIds: string[] = [];
    for (const ingredient of line.recipeSnapshot!.ingredients) {
      const identity = movementIdentity(batch.id, line.id, ingredient.ingredientId);
      const duplicate = currentMovements.find((movement) => movement.idempotencyKey === identity);
      if (duplicate) {
        movementIds.push(duplicate.id);
        continue;
      }
      const balance = byKey.get(ingredient.productKey);
      if (!balance) return { ok: false, code: "INGREDIENT_NOMENCLATURE_REQUIRED", error: `Позиция «${ingredient.name}» больше не найдена на складе` };
      const movementId = crypto.randomUUID();
      const costAmount = ingredient.totalCost === null ? undefined : -ingredient.totalCost;
      updateWarehouseBalance(balance, ingredient.warehouseId, -ingredient.baseQuantityTotal, costAmount ?? null, now);
      const movement: StockMovement = {
        id: movementId,
        venueId: input.venueId,
        type: "sale_consumption",
        date: batch.businessDate,
        businessDate: batch.businessDate,
        productKey: ingredient.productKey,
        productName: ingredient.name,
        amount: -ingredient.baseQuantityTotal,
        unit: ingredient.baseUnit,
        costAmount,
        currency: ingredient.currency,
        warehouseId: ingredient.warehouseId,
        sourceDocumentId: batch.id,
        sourceLineId: line.id,
        salesBatchId: batch.id,
        salesBatchLineId: line.id,
        menuItemId: line.menuItemId,
        menuItemName: line.recipeSnapshot!.menuItem.name,
        recipeVersionId: line.recipeVersionId,
        recipeSnapshot: line.recipeSnapshot,
        actorAccountId: input.actor.accountId,
        source: batch.source,
        idempotencyKey: identity,
        createdAt: now,
        status: "active",
      };
      movementIds.push(movementId);
      newMovements.push(movement);
    }
    postedLines.set(line.id, { ...line, processingStatus: "POSTED", movementIds, postedAt: now, updatedAt: now });
  }
  const nextLines = batch.lines.map((line) => postedLines.get(line.id) ?? line);
  const next = summarizeBatch({
    ...batch,
    lines: nextLines,
    movementIds: [...new Set([...batch.movementIds, ...newMovements.map((movement) => movement.id)])],
    postedAt: batch.postedAt ?? now,
    updatedAt: now,
  });
  const completed: SalesBatch = {
    ...next,
    status: next.blockedLineCount || next.postedLineCount < next.lines.length ? "PARTIALLY_BLOCKED" : "POSTED",
  };
  assortment.stockBalances = balances;
  assortment.updatedAt = now;
  return {
    ok: true,
    idempotent: newMovements.length === 0,
    batch: completed,
    batches: [completed, ...batches.filter((item) => item.id !== completed.id)],
    assortment,
    stockMovements: [...newMovements, ...currentMovements].slice(0, 20_000),
    postedNow: postedLines.size,
  };
}

export function reverseSalesBatch(input: {
  batches: unknown[];
  batchId: string;
  assortment: unknown;
  stockMovements: unknown[];
  venueId: number;
  actor: SalesBatch["createdBy"];
  now?: string;
}):
  | { ok: true; idempotent: boolean; batch: SalesBatch; batches: SalesBatch[]; assortment: JsonRecord; stockMovements: StockMovement[] }
  | { ok: false; code: string; error: string } {
  const now = input.now ?? new Date().toISOString();
  const batches = salesBatches(input.batches, input.venueId);
  const batch = batches.find((item) => item.id === input.batchId);
  if (!batch) return { ok: false, code: "SALES_BATCH_NOT_FOUND", error: "Документ продаж не найден" };
  if (batch.status === "REVERSED") return { ok: true, idempotent: true, batch, batches, assortment: record(input.assortment), stockMovements: input.stockMovements as StockMovement[] };
  if (!batch.postedLineCount) return { ok: false, code: "SALES_BATCH_NOT_POSTED", error: "В документе нет проведённых строк" };
  const assortment = record(structuredClone(input.assortment));
  const balances = venueBalances(assortment, input.venueId);
  const byKey = new Map(balances.map((balance) => [balanceKey(balance), balance]));
  const currentMovements = input.stockMovements.map((value) => value as StockMovement);
  const originals = currentMovements.filter((movement) =>
    movement.venueId === input.venueId
    && movement.type === "sale_consumption"
    && movement.salesBatchId === batch.id
    && movement.status !== "cancelled"
  );
  const existingReversals = currentMovements.filter((movement) => movement.type === "sale_reversal" && movement.salesBatchId === batch.id);
  const reversedOriginalIds = new Set(existingReversals.map((movement) => movement.originalMovementId).filter(Boolean));
  const reversals: StockMovement[] = [];
  for (const original of originals) {
    if (reversedOriginalIds.has(original.id)) continue;
    const balance = byKey.get(original.productKey);
    if (!balance) return { ok: false, code: "INGREDIENT_NOMENCLATURE_REQUIRED", error: `Нельзя сторнировать: «${original.productName}» отсутствует в canonical Номенклатуре` };
    const amount = Math.abs(original.amount);
    const cost = original.costAmount == null ? null : Math.abs(original.costAmount);
    updateWarehouseBalance(balance, original.warehouseId ?? "__venue__", amount, cost, now);
    reversals.push({
      ...original,
      id: crypto.randomUUID(),
      type: "sale_reversal",
      amount,
      costAmount: cost ?? undefined,
      sourceLineId: `reversal:${original.sourceLineId}`,
      originalMovementId: original.id,
      reversalReason: "SalesBatch сторнирован",
      idempotencyKey: `sale-reversal:${original.id}`,
      actorAccountId: input.actor.accountId,
      createdAt: now,
    });
  }
  const reversed: SalesBatch = summarizeBatch({
    ...batch,
    status: "REVERSED",
    reversedAt: now,
    updatedAt: now,
    reversalMovementIds: [...new Set([...batch.reversalMovementIds, ...reversals.map((movement) => movement.id), ...existingReversals.map((movement) => movement.id)])],
    lines: batch.lines.map((line) => line.processingStatus === "POSTED"
      ? { ...line, processingStatus: "REVERSED", updatedAt: now }
      : line),
  });
  const finalBatch = { ...reversed, status: "REVERSED" as const };
  assortment.stockBalances = balances;
  assortment.updatedAt = now;
  return {
    ok: true,
    idempotent: reversals.length === 0,
    batch: finalBatch,
    batches: [finalBatch, ...batches.filter((item) => item.id !== batch.id)],
    assortment,
    stockMovements: [...reversals, ...currentMovements].slice(0, 20_000),
  };
}

export function cancelSalesDraft(input: { batches: unknown[]; batchId: string; venueId: number; now?: string }):
  | { ok: true; batch: SalesBatch; batches: SalesBatch[] }
  | { ok: false; code: string; error: string } {
  const batches = salesBatches(input.batches, input.venueId);
  const batch = batches.find((item) => item.id === input.batchId);
  if (!batch) return { ok: false, code: "SALES_BATCH_NOT_FOUND", error: "Документ продаж не найден" };
  if (batch.postedLineCount) return { ok: false, code: "SALES_BATCH_REVERSE_REQUIRED", error: "Проведённые продажи отменяются только через сторно" };
  if (batch.status === "CANCELLED") return { ok: true, batch, batches };
  const now = input.now ?? new Date().toISOString();
  const cancelled = { ...batch, status: "CANCELLED" as const, cancelledAt: now, updatedAt: now };
  return { ok: true, batch: cancelled, batches: [cancelled, ...batches.filter((item) => item.id !== batch.id)] };
}

export function upsertSalesMapping(input: {
  mappings: unknown[];
  venueId: number;
  source: SalesSource;
  rawName: string;
  menuItemId: string;
  actorAccountId: number;
  now?: string;
}): { mapping: SalesNameMapping; mappings: SalesNameMapping[]; before?: SalesNameMapping } {
  const now = input.now ?? new Date().toISOString();
  const values = input.mappings.map((value) => value as SalesNameMapping).filter(Boolean);
  const normalizedRawName = normalizeSalesName(input.rawName);
  const before = values.find((mapping) => mapping.venueId === input.venueId
    && mapping.source === input.source && mapping.normalizedRawName === normalizedRawName && mapping.status !== "REVOKED");
  const mapping: SalesNameMapping = {
    id: before?.id ?? crypto.randomUUID(),
    venueId: input.venueId,
    source: input.source,
    rawName: text(input.rawName, "", 300),
    normalizedRawName,
    menuItemId: text(input.menuItemId, "", 160),
    status: "ACTIVE",
    createdByAccountId: before?.createdByAccountId ?? input.actorAccountId,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  };
  return { mapping, before, mappings: [mapping, ...values.filter((item) => item.id !== mapping.id)] };
}

export function revokeSalesMapping(input: { mappings: unknown[]; venueId: number; id: string; now?: string }):
  | { ok: true; mapping: SalesNameMapping; mappings: SalesNameMapping[] }
  | { ok: false; code: string; error: string } {
  const values = input.mappings.map((value) => value as SalesNameMapping).filter(Boolean);
  const before = values.find((mapping) => mapping.id === input.id && mapping.venueId === input.venueId);
  if (!before) return { ok: false, code: "SALES_MAPPING_NOT_FOUND", error: "Сопоставление не найдено" };
  const now = input.now ?? new Date().toISOString();
  const mapping = { ...before, status: "REVOKED" as const, revokedAt: now, updatedAt: now };
  return { ok: true, mapping, mappings: values.map((item) => item.id === mapping.id ? mapping : item) };
}

export function salesDataQuality(batchesValue: unknown[], venueId: number): {
  issues: SalesDataQualityIssue[];
  affectedLineCount: number;
  affectedQuantity: number;
  partiallyPostedBatchCount: number;
} {
  const batches = salesBatches(batchesValue, venueId);
  const issues = batches.flatMap((batch) => batch.lines.flatMap((line): SalesDataQualityIssue[] => {
    if (line.processingStatus !== "BLOCKED") return [];
    const code = line.errorCode ?? "FAILED_CONSUMPTION_CALCULATION";
    return [{
      code,
      severity: ["NEEDS_MAPPING", "NO_RECIPE"].includes(code) ? "MEDIUM" : "HIGH",
      batchId: batch.id,
      lineId: line.id,
      label: `${line.rawName} · ${line.errorMessage ?? "не отражено на складе"}`,
      quantity: Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0,
      impact: `${line.quantity || 0} проданных порций не отражено на складе`,
    }];
  }));
  return {
    issues,
    affectedLineCount: issues.length,
    affectedQuantity: rounded(issues.reduce((sum, issue) => sum + issue.quantity, 0)),
    partiallyPostedBatchCount: batches.filter((batch) => batch.status === "PARTIALLY_BLOCKED" && batch.postedLineCount > 0).length,
  };
}

export function salesBatchKpis(batchesValue: unknown[], venueId: number) {
  const batches = salesBatches(batchesValue, venueId).filter((batch) => batch.status !== "CANCELLED");
  const lines = batches.flatMap((batch) => batch.lines);
  const loaded = lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? Math.max(0, line.quantity) : 0), 0);
  const reflected = lines.filter((line) => ["POSTED", "REVERSED"].includes(line.processingStatus))
    .reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
  return {
    loadedQuantity: rounded(loaded),
    reflectedQuantity: rounded(reflected),
    reflectedPercent: loaded > 0 ? rounded(reflected / loaded * 100, 1) : 0,
    needsMapping: lines.filter((line) => line.errorCode === "NEEDS_MAPPING").length,
    noRecipe: lines.filter((line) => line.errorCode === "NO_RECIPE").length,
    errors: lines.filter((line) => line.processingStatus === "BLOCKED" && !["NEEDS_MAPPING", "NO_RECIPE"].includes(line.errorCode ?? "")).length,
    theoreticalCost: money(batches.reduce((sum, batch) => sum + (batch.totalTheoreticalCost ?? 0), 0)),
    batches: batches.length,
  };
}

import { classifyNomenclatureItemWithRules, defaultNomenclatureStructure } from "./nomenclature";
import {
  auditCanonicalNomenclature,
  enrichCanonicalSupplierSummary,
  resolveCanonicalPurchaseItem,
  upsertSupplierProductMapping,
} from "./nomenclature-identity";
import { PURCHASE_STOCK_CATEGORIES } from "./purchases";
import { resolvePurchaseLineAccountingCost } from "./valuation";

export const ASSORTMENT_STORE_KEY = "bd_assortment_v1";
export const STOCK_MOVEMENT_STORE_KEY = "bd_stock_movements";
export const SALES_DOCUMENT_STORE_KEY = "bd_sales_documents";

export type BaseInventoryUnit = "ml" | "g" | "pcs" | "unknown";
export type InventoryDisplayUnit = "auto" | "ml" | "l" | "g" | "kg" | "pcs";

export type InventoryMeasurementDimension = "volume" | "mass" | "count";

export const INVENTORY_UNIT_DEFINITIONS = [
  { code: "ml", label: "мл", baseUnit: "ml", dimension: "volume", factor: 1 },
  { code: "l", label: "л", baseUnit: "ml", dimension: "volume", factor: 1_000 },
  { code: "g", label: "г", baseUnit: "g", dimension: "mass", factor: 1 },
  { code: "kg", label: "кг", baseUnit: "g", dimension: "mass", factor: 1_000 },
  { code: "pcs", label: "шт.", baseUnit: "pcs", dimension: "count", factor: 1 },
] as const satisfies ReadonlyArray<{
  code: Exclude<InventoryDisplayUnit, "auto">;
  label: string;
  baseUnit: Exclude<BaseInventoryUnit, "unknown">;
  dimension: InventoryMeasurementDimension;
  factor: number;
}>;

export type InventoryUnitCode = (typeof INVENTORY_UNIT_DEFINITIONS)[number]["code"];

export function inventoryUnitDefinition(value: unknown) {
  const normalized = normalizeInventoryText(value);
  const code: InventoryUnitCode | null = /^(?:мл|ml|миллилитр)/.test(normalized)
    ? "ml"
    : /^(?:л|l|литр)/.test(normalized)
      ? "l"
      : /^(?:кг|kg|килограмм)/.test(normalized)
        ? "kg"
        : /^(?:г|гр|g|грамм)/.test(normalized)
          ? "g"
          : /^(?:шт|pcs|piece|порц)/.test(normalized)
            ? "pcs"
            : null;
  return code
    ? INVENTORY_UNIT_DEFINITIONS.find((definition) => definition.code === code) ?? null
    : null;
}

export type StockMovement = {
  id: string;
  venueId?: number;
  type:
    | "receipt"
    | "sale"
    | "sale_consumption"
    | "sale_reversal"
    | "inventory_adjustment"
    | "writeoff"
    | "return";
  date: string;
  businessDate?: string;
  productKey: string;
  productName: string;
  amount: number;
  unit: BaseInventoryUnit;
  costAmount?: number;
  currency?: string;
  transactionCostAmount?: number;
  transactionCurrency?: string;
  exchangeRateToAccounting?: number;
  sourceDocumentId: string;
  sourceLineId: string;
  salesBatchId?: string;
  salesBatchLineId?: string;
  menuItemId?: string;
  menuItemName?: string;
  recipeVersionId?: string;
  recipeSnapshot?: unknown;
  warehouseId?: string;
  actorAccountId?: number;
  source?: string;
  idempotencyKey?: string;
  originalMovementId?: string;
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
  sourceMappingsUpserted?: number;
  canonicalItemsReused?: number;
  sourceMappingsNeedingReview?: number;
  valuationIssues?: Array<{
    id: string;
    name: string;
    reason: string;
    transactionCurrency?: string;
    accountingCurrency?: string;
  }>;
};

export type InventoryMetadataRepairSummary = {
  repaired: number;
  removed: number;
};

export type InventoryPurchaseAmountRepairSummary = {
  repairedMovements: number;
  restoredMovements: number;
  reconciledBalances: number;
  correctedProducts: number;
  correctedAmount: number;
  evidenceDocuments: number;
  evidenceMatches: number;
  linkedShadowBalances: number;
  diagnostics: Array<Record<string, unknown>>;
  changed: boolean;
};

export type InventoryDuplicateConsolidationSummary = {
  mergedBalances: number;
  mergedNomenclature: number;
  remappedMovements: number;
  remappedRecipes: number;
  skippedCurrencyConflicts: number;
  changed: boolean;
};

export type InventoryProductUpdate = {
  productKey: string;
  name: string;
  unit: BaseInventoryUnit;
  packageSize: string;
  displayUnit?: InventoryDisplayUnit;
  displayPackageSize?: string;
  purchaseMode?: "document" | "measure" | "package";
  purchasePackageSize?: string;
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

function inventoryIdentityName(value: unknown): string {
  const item = record(value);
  return normalizeInventoryText(item.name ?? item.productName);
}

export function inventoryProductIdentityName(value: unknown): string {
  const item = record(value);
  const rawName = text(item.name ?? item.productName, "", 240);
  if (!rawName) return "";
  const normalized = normalizeInventoryText(rawName);
  const tokens = normalized.split(" ").filter(Boolean);
  const waterDescriptors = new Set([
    "вода", "воды", "минеральная", "минеральный", "питьевая", "питьевой",
    "столовая", "столовый", "газированная", "газированный", "негазированная",
    "негазированный", "water", "mineral", "still", "sparkling",
  ]);
  const hasWaterDescriptor = tokens.some((token) => waterDescriptors.has(token));
  if (!hasWaterDescriptor) return normalized;
  const distinctive = tokens.filter((token) => !waterDescriptors.has(token));
  return distinctive.length ? distinctive.join(" ") : normalized;
}

function generatedInventoryProductKey(value: unknown): string {
  const item = record(value);
  const name = inventoryProductIdentityName(item);
  if (!name) return "";
  const unitText = normalizeInventoryText(item.unit);
  const packageText = normalizeInventoryText(item.packageSize);
  const service = text(item.kind, "", 20) === "service"
    || /(^| )усл(уга|уги|уг)?($| )/.test(unitText)
    || /(^| )усл(уга|уги|уг)?($| )/.test(packageText);
  if (service) return `service:${name}`;
  const packageDetails = inventoryPackageAmount(item.packageSize, item.unit);
  const unit = packageDetails.unit !== "unknown" ? packageDetails.unit : baseUnit(item.unit);
  return unit === "unknown" ? "" : `stock:${name}|${unit}`;
}

export function resolveInventoryProductKey(assortment: unknown, requestedValue: unknown): string {
  const root = record(assortment);
  const requested = text(requestedValue, "", 300);
  if (!requested) return "";
  const aliases = new Map(
    array(root.inventoryProductAliases)
      .map((value) => record(value))
      .map((value) => [text(value.from, "", 300), text(value.to, "", 300)] as const)
      .filter(([from, to]) => from && to),
  );
  let resolved = requested;
  const visited = new Set<string>();
  while (aliases.has(resolved) && !visited.has(resolved) && visited.size < 20) {
    visited.add(resolved);
    resolved = aliases.get(resolved) ?? resolved;
  }
  const balances = array(root.stockBalances).map(record);
  const direct = balances.find((value) => text(value.productKey ?? value.key, "", 300) === resolved);
  if (direct) return text(direct.productKey ?? direct.key, resolved, 300);
  const external = balances.find((value) =>
    array(value.externalProductKeys).some((key) => text(key, "", 300) === requested)
  );
  return external ? text(external.productKey ?? external.key, resolved, 300) : resolved;
}

function legacyGeneratedInventoryProductKey(value: unknown): string {
  const item = record(value);
  return `${inventoryIdentityName(item)}|${normalizeInventoryText(item.packageSize ?? item.unit)}`;
}

export function inventoryProductKey(value: unknown): string {
  const item = record(value);
  const requested = text(item.purchaseProductKey ?? item.productKey, "", 300);
  const generated = generatedInventoryProductKey(item);
  if (requested) {
    const name = inventoryIdentityName(item);
    const normalizedRequested = normalizeInventoryText(requested);
    const legacyGenerated = Boolean(
      name
      && requested.includes("|")
      && normalizedRequested.startsWith(`${name} `),
    );
    if (generated && (
      requested.startsWith("stock:")
      || requested.startsWith("service:")
      || legacyGenerated
    )) return generated;
    return requested;
  }
  if (generated) return generated;
  return legacyGeneratedInventoryProductKey(item);
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
  const quantityAmount = toInventoryBaseAmount(quantity, item.unit);
  const quantityMode = text(item.quantityMode, "", 20);
  // A dimensional quantity is already the total measured amount. Packaging is
  // metadata in this case and must never multiply liters/kilograms a second
  // time, even if an old imported line incorrectly says quantityMode=count.
  if (
    quantityMode === "measure"
    || quantityAmount.unit === "ml"
    || quantityAmount.unit === "g"
  ) {
    return {
      amount: rounded(quantityAmount.amount),
      unit: quantityAmount.unit,
    };
  }
  const packageAmount = inventoryPackageAmount(item.packageSize, item.unit);
  // Older manual-purchase forms could save the *total* amount both as the
  // quantity and as a synthetic package label (for example 10 + "10 л"),
  // while also marking the row as a count. Multiplying those fields produced
  // 100 l. A package above 5 l is not a credible retail bottle for distilled
  // spirits, and equality with the entered total is the legacy signature.
  // Beer kegs and other genuinely large containers are intentionally excluded.
  const itemName = normalizeInventoryText(item.name ?? item.productName);
  const isDistilledSpirit = /(?:^| )(?:коньяк|бренди|водка|виски|ром|джин|текила|ликер|ликёр|cognac|brandy|vodka|whisky|whiskey|rum|gin|tequila|liqueur)(?: |$)/i
    .test(itemName);
  const packageAsLiters = packageAmount.unit === "ml" ? packageAmount.amount / 1_000 : 0;
  if (
    isDistilledSpirit
    && quantity >= 5
    && packageAsLiters > 5
    && Math.abs(packageAsLiters - quantity) < 0.0001
  ) {
    return { amount: rounded(packageAmount.amount), unit: packageAmount.unit };
  }
  return {
    amount: rounded(quantity * packageAmount.amount),
    unit: packageAmount.unit,
  };
}

function packageOptionLabels(value: unknown): string[] {
  const item = record(value);
  const candidates = [
    ...(Array.isArray(item.packageOptions) ? item.packageOptions : []),
    item.packageSize,
  ];
  const byFingerprint = new Map<string, string>();
  for (const candidate of candidates) {
    const label = typeof candidate === "string"
      ? text(candidate, "", 120)
      : text(record(candidate).label ?? record(candidate).packageSize, "", 120);
    if (!label || normalizeInventoryText(label) === "несколько фасовок") continue;
    const parsed = inventoryPackageAmount(label, item.unit);
    const fingerprint = parsed.amount > 0 && parsed.unit !== "unknown"
      ? `${parsed.unit}:${rounded(parsed.amount)}`
      : normalizeInventoryText(label);
    if (fingerprint && !byFingerprint.has(fingerprint)) byFingerprint.set(fingerprint, label);
  }
  return [...byFingerprint.values()];
}

function latestRecord(values: JsonRecord[]): JsonRecord {
  return [...values].sort((left, right) =>
    text(right.updatedAt ?? right.checkedAt ?? right.lastPurchaseAt, "", 40)
      .localeCompare(text(left.updatedAt ?? left.checkedAt ?? left.lastPurchaseAt, "", 40))
  )[0] ?? {};
}

function classificationRecord(values: JsonRecord[]): JsonRecord | undefined {
  return values.find((value) => text(value.classificationStatus, "", 20) === "confirmed")
    ?? values.find((value) => text(value.classificationStatus, "", 20) === "auto");
}

function valueOfBalance(value: JsonRecord): number {
  if (value.inventoryValue != null && Number.isFinite(number(value.inventoryValue, Number.NaN))) {
    return number(value.inventoryValue);
  }
  return number(value.current) * Math.max(0, number(value.averageUnitCost));
}

function averageCostOfBalance(value: JsonRecord): number {
  const stored = Math.max(0, number(value.averageUnitCost));
  if (stored > 0) return stored;
  const current = number(value.current);
  const total = Math.max(0, valueOfBalance(value));
  return current > 0 && total > 0 ? total / current : 0;
}

function remappedProductKey(value: unknown, aliases: Map<string, string>): string {
  const item = record(value);
  const requested = text(item.purchaseProductKey ?? item.productKey ?? item.key, "", 300);
  return aliases.get(requested) ?? inventoryProductKey(item) ?? requested;
}

const INVENTORY_PRODUCT_TYPES = new Set([
  "вода", "водка", "коньяк", "бренди", "виски", "ром", "джин", "текила",
  "ликер", "ликёр", "вино", "шампанское", "пиво", "сидр", "сок", "сироп",
  "кола", "cola", "лимонад", "тоник", "кофе", "чай", "молоко", "сливки",
]);

const INVENTORY_VARIANT_MARKERS = new Set([
  "vs", "vsop", "xo", "xxo", "reserve", "reserva", "gold", "black", "red",
  "white", "rose", "brut", "dry", "citron", "lemon", "orange", "cherry",
  "vanilla", "honey", "apple", "pear", "peach", "coconut", "mint",
  "лимон", "апельсин", "вишня", "ваниль", "мед", "яблоко", "груша",
  "персик", "кокос", "мята", "сухое", "полусухое", "сладкое", "брют",
  "светлый", "светлое", "светлая", "светлые", "light",
  "темный", "тёмный", "темное", "тёмное", "темная", "тёмная", "dark",
]);

const INVENTORY_VARIANT_ALIASES = new Map<string, string>([
  ["светлый", "light"], ["светлое", "light"], ["светлая", "light"],
  ["светлые", "light"], ["light", "light"],
  ["темный", "dark"], ["тёмный", "dark"], ["темное", "dark"],
  ["тёмное", "dark"], ["темная", "dark"], ["тёмная", "dark"], ["dark", "dark"],
]);

const INVENTORY_IDENTITY_DESCRIPTORS = new Set([
  "вода", "воды", "минеральная", "минеральный", "питьевая", "питьевой",
  "столовая", "столовый", "газированная", "газированный", "негазированная",
  "негазированный", "water", "mineral", "still", "sparkling",
  "коньяк", "бренди", "cognac", "brandy", "напиток", "напитки", "drink",
  "бутылка", "бутылки", "бут", "банка", "банки", "упаковка", "уп", "пэт",
  "pet", "стекло", "glass",
]);

const INVENTORY_TRANSLITERATION: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "i", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function inventoryPhoneticToken(value: string): string {
  return [...value.toLocaleLowerCase("ru")]
    .map((letter) => INVENTORY_TRANSLITERATION[letter] ?? letter)
    .join("")
    .replace(/c(?=[aou])/g, "k")
    .replace(/shch/g, "sch")
    .replace(/(?:iy|yy|yi)$/g, "i")
    .replace(/yo/g, "e")
    .replace(/yu/g, "u")
    .replace(/ya/g, "a")
    .replace(/[^a-z0-9]+/g, "");
}

function inventoryTokenDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function inventoryTokenSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  return 1 - inventoryTokenDistance(left, right) / Math.max(left.length, right.length);
}

function inventoryNameTokens(value: unknown): string[] {
  const item = record(value);
  return normalizeInventoryText(item.name ?? item.productName)
    .split(" ")
    .filter((token) => token.length > 1 || /\d/.test(token));
}

function inventoryTypeToken(value: unknown): string {
  return inventoryNameTokens(value).find((token) => INVENTORY_PRODUCT_TYPES.has(token)) ?? "";
}

function hasExplicitInventoryVariant(value: unknown): boolean {
  const item = record(value);
  const rawName = text(item.name ?? item.productName, "", 240);
  const tokens = inventoryNameTokens(item);
  return /\d/.test(rawName)
    || /\b(?:мл|ml|л|l|литр|г|гр|g|кг|kg|шт|pcs)\b/i.test(rawName)
    || tokens.some((token) => INVENTORY_VARIANT_MARKERS.has(token));
}

function inventoryBalanceUnit(value: unknown): BaseInventoryUnit {
  const item = record(value);
  const packageUnit = inventoryPackageAmount(item.packageSize, item.unit).unit;
  return packageUnit !== "unknown" ? packageUnit : baseUnit(item.unit);
}

function inventoryExplicitNameAmount(value: unknown): { amount: number; unit: BaseInventoryUnit } | null {
  const item = record(value);
  const rawName = text(item.name ?? item.productName, "", 240);
  const match = rawName.toLocaleLowerCase("ru").replace(/,/g, ".").match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg)(?:\s|$)/i,
  );
  if (!match) return null;
  const parsed = toInventoryBaseAmount(match[1], match[2]);
  return parsed.unit === "unknown" ? null : parsed;
}

function inventoryIdentityTokens(value: unknown): string[] {
  const tokens = inventoryNameTokens(value)
    .filter((token) => !INVENTORY_IDENTITY_DESCRIPTORS.has(token))
    .filter((token) => !INVENTORY_PRODUCT_TYPES.has(token))
    .filter((token) => !/^\d+(?:[.,]\d+)?$/.test(token))
    .filter((token) => !/^(?:мл|ml|л|l|литр|литра|литров|г|гр|g|кг|kg|шт|pcs)$/.test(token))
    .map((token) => INVENTORY_VARIANT_ALIASES.get(token) ?? token)
    .map(inventoryPhoneticToken)
    .filter((token) => token.length >= 2);
  return [...new Set(tokens)].sort();
}

function inventoryIdentityType(value: unknown): string {
  const item = record(value);
  const direct = inventoryTypeToken(item);
  if (direct) return direct === "бренди" ? "коньяк" : direct;
  const classification = normalizeInventoryText([
    item.category,
    item.categoryName,
    item.subcategory,
    item.subCategory,
    item.subcategoryName,
    item.subCategoryName,
    item.path,
  ].filter(Boolean).join(" "));
  const token = classification.split(" ").find((candidate) => INVENTORY_PRODUCT_TYPES.has(candidate)) ?? "";
  return token === "бренди" ? "коньяк" : token;
}

function inventoryAutomaticIdentityScore(left: JsonRecord, right: JsonRecord): number {
  const leftIsEmpty = Math.abs(number(left.current)) < 0.0001 && Math.abs(valueOfBalance(left)) < 0.01;
  const rightIsEmpty = Math.abs(number(right.current)) < 0.0001 && Math.abs(valueOfBalance(right)) < 0.01;
  if (inventoryBalanceUnit(left) !== inventoryBalanceUnit(right) && !leftIsEmpty && !rightIsEmpty) return 0;
  const leftCurrency = text(left.currency, "", 12).toUpperCase();
  const rightCurrency = text(right.currency, "", 12).toUpperCase();
  if (leftCurrency && rightCurrency && leftCurrency !== rightCurrency) return 0;

  const leftType = inventoryIdentityType(left);
  const rightType = inventoryIdentityType(right);
  if (leftType && rightType && leftType !== rightType) return 0;

  const leftAmount = inventoryExplicitNameAmount(left);
  const rightAmount = inventoryExplicitNameAmount(right);
  const commonType = leftType || rightType;
  const genericWaterName = commonType === "вода" && [left, right].some((item) =>
    inventoryNameTokens(item).some((token) => INVENTORY_WATER_DESCRIPTORS.has(token))
  );
  if (leftAmount && rightAmount && (
    leftAmount.unit !== rightAmount.unit || Math.abs(leftAmount.amount - rightAmount.amount) > 0.001
  )) return 0;
  if (Boolean(leftAmount) !== Boolean(rightAmount)) {
    if (!genericWaterName) return 0;
  }
  const leftNumbers = normalizeInventoryText(record(left).name ?? record(left).productName)
    .match(/\d+(?:[.,]\d+)?/g) ?? [];
  const rightNumbers = normalizeInventoryText(record(right).name ?? record(right).productName)
    .match(/\d+(?:[.,]\d+)?/g) ?? [];
  if (leftNumbers.join(" ") !== rightNumbers.join(" ") && !genericWaterName) return 0;

  const leftVariants = inventoryNameTokens(left)
    .filter((token) => INVENTORY_VARIANT_MARKERS.has(token))
    .map((token) => INVENTORY_VARIANT_ALIASES.get(token) ?? token);
  const rightVariants = inventoryNameTokens(right)
    .filter((token) => INVENTORY_VARIANT_MARKERS.has(token))
    .map((token) => INVENTORY_VARIANT_ALIASES.get(token) ?? token);
  if (leftVariants.length || rightVariants.length) {
    if (leftVariants.join(" ") !== rightVariants.join(" ")) return 0;
  }

  const leftTokens = inventoryIdentityTokens(left);
  const rightTokens = inventoryIdentityTokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  if (leftTokens.join(" ") === rightTokens.join(" ")) return 1;

  const smaller = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const larger = smaller === leftTokens ? rightTokens : leftTokens;
  const matched = smaller.map((token) => Math.max(...larger.map((candidate) =>
    inventoryTokenSimilarity(token, candidate)
  )));
  const coverage = matched.reduce((sum, score) => sum + score, 0) / smaller.length;
  const unmatched = larger.filter((token) =>
    !smaller.some((candidate) => inventoryTokenSimilarity(token, candidate) >= 0.72)
  );
  const extraPenalty = unmatched.length / larger.length;
  if ((leftIsEmpty || rightIsEmpty) && smaller.length >= 2 && coverage >= 0.98 && unmatched.length <= 1) {
    return 0.93;
  }
  return coverage - extraPenalty * 0.35;
}

function inventoryAutomaticAnchor(value: JsonRecord, balances: JsonRecord[]): JsonRecord | undefined {
  const matches = balances
    .filter((candidate) => candidate !== value)
    .map((candidate) => ({ candidate, score: inventoryAutomaticIdentityScore(value, candidate) }))
    .filter(({ score }) => score >= 0.9);
  if (!matches.length) return undefined;
  return [value, ...matches.map(({ candidate }) => candidate)]
    .sort((left, right) => {
      const leftPreferred = Boolean(text(left.preferredDisplayName, "", 240));
      const rightPreferred = Boolean(text(right.preferredDisplayName, "", 240));
      if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;
      const leftGenericMaster = inventoryExplicitNameAmount(left) ? 1 : 0;
      const rightGenericMaster = inventoryExplicitNameAmount(right) ? 1 : 0;
      if (leftGenericMaster !== rightGenericMaster) return leftGenericMaster - rightGenericMaster;
      const leftCyrillic = /[а-яё]/i.test(text(left.name ?? left.productName, "", 240));
      const rightCyrillic = /[а-яё]/i.test(text(right.name ?? right.productName, "", 240));
      if (leftCyrillic !== rightCyrillic) return leftCyrillic ? -1 : 1;
      return Number(number(right.current) > 0) - Number(number(left.current) > 0)
        || inventoryIdentityTokens(left).length - inventoryIdentityTokens(right).length
        || text(left.name).length - text(right.name).length
        || text(left.name).localeCompare(text(right.name), "ru");
    })[0];
}

// Compatibility for already imported legacy connector labels. New products are
// matched by the generic identity engine above and do not require this table.
const INVENTORY_LEGACY_IMPORT_ALIAS_TOKENS = new Map<string, string | null>([
  ["nistru", "нистру"],
  ["conus", null],
  ["soprizmivyi", "сюрпризный"],
  ["sopriznivyi", "сюрпризный"],
  ["surpriznyi", "сюрпризный"],
  ["siurpriznyi", "сюрпризный"],
  ["coca", null],
  ["cola", "кола"],
]);

function inventoryImportedAliasTokens(value: unknown): string[] {
  const tokens = inventoryNameTokens(value);
  const mapsToSurprise = tokens.some((token) => INVENTORY_LEGACY_IMPORT_ALIAS_TOKENS.get(token) === "сюрпризный");
  return tokens.flatMap((token) => {
    if (mapsToSurprise && (token === "nistru" || token === "нистру")) return [];
    if (!INVENTORY_LEGACY_IMPORT_ALIAS_TOKENS.has(token)) return [token];
    const replacement = INVENTORY_LEGACY_IMPORT_ALIAS_TOKENS.get(token);
    return replacement ? [replacement] : [];
  });
}

function inventoryImportedDisplayName(value: unknown): string {
  const tokens = inventoryNameTokens(value);
  if (tokens.includes("coca") && tokens.includes("cola")) return "Кола";
  if (tokens.some((token) => INVENTORY_LEGACY_IMPORT_ALIAS_TOKENS.get(token) === "сюрпризный")) {
    return "Коньяк Сюрпризный";
  }
  if (tokens.includes("nistru")) return "Коньяк Нистру";
  return "";
}

function inventoryAliasProductKey(value: JsonRecord): string {
  if (hasExplicitInventoryVariant(value)) return "";
  const tokens = inventoryNameTokens(value);
  const aliasTokens = inventoryImportedAliasTokens(value);
  if (aliasTokens.join(" ") === tokens.join(" ") || aliasTokens.length < 1) return "";
  const type = inventoryTypeToken(value)
    || aliasTokens.find((token) => INVENTORY_PRODUCT_TYPES.has(token))
    || "";
  const unit = inventoryBalanceUnit(value);
  if (!type || unit === "unknown") return "";
  return `stock:${aliasTokens.join(" ")}|${unit}`;
}

function inventoryAliasAnchor(value: JsonRecord, balances: JsonRecord[]): JsonRecord | undefined {
  if (hasExplicitInventoryVariant(value)) return undefined;
  const tokens = inventoryNameTokens(value);
  const aliasTokens = inventoryImportedAliasTokens(value);
  const type = inventoryTypeToken(value);
  const unit = inventoryBalanceUnit(value);
  const hasKnownImportAlias = aliasTokens.join(" ") !== tokens.join(" ");
  if (!type || unit === "unknown" || !hasKnownImportAlias || aliasTokens.length < 2) return undefined;
  const currency = text(value.currency, "", 12).toUpperCase();
  return balances
    .filter((candidate) => candidate !== value)
    .filter((candidate) => {
      if (hasExplicitInventoryVariant(candidate)) return false;
      if (inventoryBalanceUnit(candidate) !== unit || inventoryTypeToken(candidate) !== type) return false;
      const candidateCurrency = text(candidate.currency, "", 12).toUpperCase();
      if (currency && candidateCurrency && currency !== candidateCurrency) return false;
      const candidateTokens = inventoryNameTokens(candidate);
      if (candidateTokens.length !== aliasTokens.length) return false;
      if (!candidateTokens.every((token, index) => token === aliasTokens[index])) return false;
      const hasDistinctiveBrand = candidateTokens.some((token) =>
        token !== type && token.length >= 4 && !INVENTORY_VARIANT_MARKERS.has(token)
      );
      if (!hasDistinctiveBrand) return false;
      return number(candidate.current) > 0 || number(value.current) === 0;
    })
    .sort((left, right) => {
      const stockLead = Number(number(right.current) > 0) - Number(number(left.current) > 0);
      return stockLead
        || inventoryNameTokens(left).length - inventoryNameTokens(right).length
        || text(left.name).length - text(right.name).length;
    })[0];
}

const INVENTORY_WATER_DESCRIPTORS = new Set([
  "вода", "воды", "минеральная", "минеральный", "питьевая", "питьевой",
  "столовая", "столовый", "газированная", "газированный", "негазированная",
  "негазированный", "water", "mineral", "still", "sparkling",
]);

function inventoryNameWithoutWaterPackage(value: unknown): string[] {
  return inventoryNameTokens(value).filter((token) =>
    !INVENTORY_WATER_DESCRIPTORS.has(token)
    && !/^\d+(?:[.,]\d+)?$/.test(token)
    && !/^(?:мл|ml|л|l|литр|литра|литров)$/.test(token)
  );
}

function inventoryWaterPackageAnchor(value: JsonRecord, balances: JsonRecord[]): JsonRecord | undefined {
  const rawName = text(value.name ?? value.productName, "", 240);
  if (!/\d/.test(rawName) || !/(?:^|\s)(?:мл|ml|л|l|литр)(?:\s|$)/i.test(rawName)) return undefined;
  const distinctive = inventoryNameWithoutWaterPackage(value);
  if (!distinctive.length) return undefined;
  const unit = inventoryBalanceUnit(value);
  const currency = text(value.currency, "", 12).toUpperCase();
  return balances.find((candidate) => {
    if (candidate === value || inventoryBalanceUnit(candidate) !== unit) return false;
    const candidateTokens = inventoryNameTokens(candidate);
    if (!candidateTokens.some((token) => INVENTORY_WATER_DESCRIPTORS.has(token))) return false;
    const candidateCurrency = text(candidate.currency, "", 12).toUpperCase();
    if (currency && candidateCurrency && currency !== candidateCurrency) return false;
    return inventoryNameWithoutWaterPackage(candidate).join(" ") === distinctive.join(" ");
  });
}

function inventoryMovementNameAnchor(
  value: JsonRecord,
  balances: JsonRecord[],
  movements: JsonRecord[],
): JsonRecord | undefined {
  if (Math.abs(number(value.current)) >= 0.0001 || Math.abs(valueOfBalance(value)) >= 0.01) {
    return undefined;
  }
  const requestedName = normalizeInventoryText(value.name ?? value.productName);
  if (!requestedName) return undefined;
  const targetKeys = new Set(movements
    .filter((movement) =>
      text(movement.status, "active", 20) !== "cancelled"
      && !text(movement.reversedAt, "", 40)
      && normalizeInventoryText(movement.productName) === requestedName
    )
    .map((movement) => text(movement.productKey, "", 300))
    .filter(Boolean));
  if (targetKeys.size !== 1) return undefined;
  const targetKey = [...targetKeys][0];
  return balances.find((candidate) =>
    text(candidate.productKey ?? candidate.key, "", 300) === targetKey
    && (Math.abs(number(candidate.current)) >= 0.0001 || Math.abs(valueOfBalance(candidate)) >= 0.01)
  );
}

function inventoryReceiptShadowAnchor(
  value: JsonRecord,
  balances: JsonRecord[],
): JsonRecord | undefined {
  const requestedKey = text(value.receiptShadowOfProductKey, "", 300);
  if (!requestedKey) return undefined;
  return balances.find((candidate) =>
    text(candidate.productKey ?? candidate.key, "", 300) === requestedKey
    && (Math.abs(number(candidate.current)) >= 0.0001 || Math.abs(valueOfBalance(candidate)) >= 0.01)
  );
}

/**
 * Collapses connector identities into one stock master per normalized product
 * name and base unit. Package metadata does not split an exact product name,
 * while an explicit net content in the product name remains part of identity.
 * Generic water descriptors are ignored so brand-equivalent labels consolidate.
 * The generic identity engine compares word order, Cyrillic/Latin spelling,
 * harmless descriptors, classification, units and meaningful variants. A
 * small compatibility table only migrates labels produced by old connectors.
 * A name confirmed in a manual or scanned purchase remains the visible label;
 * connector spellings are retained only as aliases. Volume, age, quality
 * grade and flavour remain real variants.
 * External IDs remain aliases for subsequent connector updates.
 */
export function consolidateInventoryDuplicates(input: {
  assortment: unknown;
  stockMovements?: unknown[];
  now?: string;
}): {
  assortment: JsonRecord;
  stockMovements: JsonRecord[];
  aliases: Record<string, string>;
  summary: InventoryDuplicateConsolidationSummary;
} {
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const sourceMovements = array(input.stockMovements).map(cloneRecord);
  const aliases = new Map<string, string>();
  const blockedCanonicalKeys = new Set<string>();
  const balanceGroups = new Map<string, JsonRecord[]>();
  for (const balance of parts.balances) {
    const originalKey = text(balance.productKey ?? balance.key, "", 300);
    const anchor = inventoryReceiptShadowAnchor(balance, parts.balances)
      ?? inventoryAutomaticAnchor(balance, parts.balances)
      ?? inventoryAliasAnchor(balance, parts.balances)
      ?? inventoryMovementNameAnchor(balance, parts.balances, sourceMovements)
      ?? inventoryWaterPackageAnchor(balance, parts.balances);
    const canonicalKey = inventoryAliasProductKey(balance)
      || generatedInventoryProductKey(anchor ?? balance)
      || inventoryProductKey(balance)
      || originalKey;
    const groupKey = canonicalKey || originalKey;
    const values = balanceGroups.get(groupKey) ?? [];
    values.push(balance);
    balanceGroups.set(groupKey, values);
  }

  let mergedBalances = 0;
  let skippedCurrencyConflicts = 0;
  const balances: JsonRecord[] = [];
  for (const [canonicalKey, values] of balanceGroups) {
    const currencies = new Set(values.map((value) => text(value.currency, "", 12).toUpperCase()).filter(Boolean));
    if (values.length > 1 && currencies.size > 1) {
      skippedCurrencyConflicts += values.length - 1;
      blockedCanonicalKeys.add(canonicalKey);
      for (const value of values) {
        const originalKey = text(value.productKey ?? value.key, "", 300);
        if (originalKey) aliases.delete(originalKey);
        balances.push(value);
      }
      continue;
    }
    for (const value of values) {
      const originalKey = text(value.productKey ?? value.key, "", 300);
      if (originalKey && canonicalKey && originalKey !== canonicalKey) aliases.set(originalKey, canonicalKey);
    }
    const latest = latestRecord(values);
    const valuedRecords = values.filter((value) =>
      Math.abs(number(value.current)) >= 0.0001 || Math.abs(valueOfBalance(value)) >= 0.01
    );
    const measurementSource = valuedRecords.length ? latestRecord(valuedRecords) : latest;
    const unit = baseUnit(measurementSource.unit) !== "unknown"
      ? baseUnit(measurementSource.unit)
      : inventoryPackageAmount(measurementSource.packageSize, measurementSource.unit).unit;
    const displayCandidate = values
      .map((value) => ({
        value,
        label: text(value.preferredDisplayName ?? value.name ?? value.productName, "", 240),
        preferred: Boolean(text(value.preferredDisplayName, "", 240)),
        preferredAt: text(value.preferredDisplayNameUpdatedAt, "", 40),
      }))
      .filter((candidate) => candidate.label)
      .sort((left, right) => {
        if (left.preferred !== right.preferred) return left.preferred ? -1 : 1;
        if (left.preferred && right.preferred) {
          const recentPreference = right.preferredAt.localeCompare(left.preferredAt);
          if (recentPreference) return recentPreference;
        }
        const leftCanonicalScript = inventoryImportedAliasTokens(left.value).join(" ")
          === inventoryNameTokens(left.value).join(" ");
        const rightCanonicalScript = inventoryImportedAliasTokens(right.value).join(" ")
          === inventoryNameTokens(right.value).join(" ");
        if (leftCanonicalScript !== rightCanonicalScript) return leftCanonicalScript ? -1 : 1;
        const leftMaster = generatedInventoryProductKey(left.value) === canonicalKey ? 0 : 1;
        const rightMaster = generatedInventoryProductKey(right.value) === canonicalKey ? 0 : 1;
        return leftMaster - rightMaster
          || inventoryNameTokens(left.value).length - inventoryNameTokens(right.value).length
          || left.label.length - right.label.length
          || left.label.localeCompare(right.label, "ru");
      })[0];
    const importedDisplayName = displayCandidate
      ? inventoryImportedDisplayName(displayCandidate.value)
      : "";
    const displayName = importedDisplayName
      || displayCandidate?.label
      || text(latest.name ?? latest.productName, "Товар", 240);
    const classification = classificationRecord(values);
    const compatiblePackageValues = values.filter((value) =>
      inventoryBalanceUnit(value) === unit || inventoryBalanceUnit(value) === "unknown"
    );
    const packageOptions = packageOptionLabels({
      ...measurementSource,
      packageOptions: compatiblePackageValues.flatMap(packageOptionLabels),
    });
    const current = rounded(values.reduce((sum, value) => sum + number(value.current), 0));
    const inventoryValue = rounded(values.reduce((sum, value) => sum + valueOfBalance(value), 0), 2);
    const singlePackage = packageOptions.length === 1
      ? inventoryPackageAmount(packageOptions[0], unit)
      : { amount: 0, unit };
    const merged: JsonRecord = {
      ...latest,
      ...(classification ?? {}),
      id: canonicalKey,
      key: canonicalKey,
      productKey: canonicalKey,
      name: displayName,
      preferredDisplayName: displayCandidate?.preferred ? displayName : undefined,
      preferredDisplayNameSource: displayCandidate?.preferred
        ? text(displayCandidate.value.preferredDisplayNameSource, "confirmed_purchase", 40)
        : undefined,
      preferredDisplayNameUpdatedAt: displayCandidate?.preferred
        ? displayCandidate.preferredAt || now
        : undefined,
      unit,
      current,
      onOrder: rounded(values.reduce((sum, value) => sum + Math.max(0, number(value.onOrder)), 0)),
      safety: Math.max(0, ...values.map((value) => number(value.safety))),
      inventoryValue,
      averageUnitCost: current > 0 ? rounded(inventoryValue / current, 6) : 0,
      packageOptions,
      packageSize: packageOptions.length > 1 ? "Несколько фасовок" : packageOptions[0] ?? text(measurementSource.packageSize),
      packageAmount: packageOptions.length > 1 ? 0 : singlePackage.amount,
      multiplePackageSizes: packageOptions.length > 1 || undefined,
      externalProductKeys: [...new Set(values.flatMap((value) => [
        ...array(value.externalProductKeys).map((key) => text(key, "", 300)),
        text(value.productKey ?? value.key, "", 300),
      ]).filter((key) => key && key !== canonicalKey))],
      mergedFromProductKeys: [...new Set(values.flatMap((value) => [
        ...array(value.mergedFromProductKeys).map((key) => text(key, "", 300)),
        text(value.productKey ?? value.key, "", 300),
      ]).filter(Boolean))],
      updatedAt: values.length > 1 ? now : text(latest.updatedAt, now, 40),
    };
    balances.push(merged);
    if (values.length > 1) mergedBalances += values.length - 1;
  }

  const balanceByKey = new Map(balances.map((balance) => [text(balance.productKey ?? balance.key, "", 300), balance]));
  const nomenclatureGroups = new Map<string, JsonRecord[]>();
  for (const raw of array(parts.root.nomenclature)) {
    const item = cloneRecord(raw);
    const originalKey = text(item.productKey ?? item.key, "", 300);
    const candidateKey = inventoryAliasProductKey(item)
      || remappedProductKey(item, aliases)
      || originalKey;
    const canonicalKey = blockedCanonicalKeys.has(candidateKey) && !aliases.has(originalKey)
      ? originalKey
      : candidateKey;
    if (originalKey && canonicalKey && originalKey !== canonicalKey) aliases.set(originalKey, canonicalKey);
    const values = nomenclatureGroups.get(canonicalKey) ?? [];
    values.push(item);
    nomenclatureGroups.set(canonicalKey, values);
  }
  for (const [key, balance] of balanceByKey) {
    if (!nomenclatureGroups.has(key)) nomenclatureGroups.set(key, [{ ...balance, kind: "stock" }]);
  }

  let mergedNomenclature = 0;
  const nomenclature: JsonRecord[] = [];
  for (const [canonicalKey, values] of nomenclatureGroups) {
    const latest = latestRecord(values);
    const classification = classificationRecord(values);
    const balance = balanceByKey.get(canonicalKey);
    const packageOptions = packageOptionLabels({
      ...latest,
      packageOptions: values.flatMap(packageOptionLabels),
    });
    nomenclature.push({
      ...latest,
      ...(classification ?? {}),
      ...(balance ?? {}),
      id: canonicalKey,
      key: canonicalKey,
      productKey: canonicalKey,
      packageOptions: balance?.packageOptions ?? packageOptions,
      updatedAt: values.length > 1 ? now : text(latest.updatedAt, now, 40),
    });
    if (values.length > 1) mergedNomenclature += values.length - 1;
  }

  let remappedRecipes = 0;
  for (const recipe of parts.recipes) {
    recipe.ingredients = array(recipe.ingredients).map((value) => {
      const ingredient = cloneRecord(value);
      const previous = text(ingredient.purchaseProductKey, "", 300);
      if (!previous) return ingredient;
      const candidate = remappedProductKey(ingredient, aliases);
      const next = blockedCanonicalKeys.has(candidate) && !aliases.has(previous)
        ? previous
        : candidate;
      if (next && next !== previous) {
        ingredient.purchaseProductKey = next;
        ingredient.updatedAt = now;
        remappedRecipes += 1;
      }
      return ingredient;
    });
  }

  let remappedMovements = 0;
  const stockMovements = sourceMovements.map((value) => {
    const movement = cloneRecord(value);
    const previous = text(movement.productKey, "", 300);
    const candidate = remappedProductKey({ ...movement, name: movement.productName }, aliases);
    const next = blockedCanonicalKeys.has(candidate) && !aliases.has(previous)
      ? previous
      : candidate;
    if (previous && next && previous !== next) {
      movement.productKey = next;
      movement.updatedAt = now;
      remappedMovements += 1;
    }
    return movement;
  });

  const existingAliases = array(parts.root.inventoryProductAliases).map(cloneRecord);
  const aliasRecords = [...aliases.entries()]
    .filter(([from, to]) => from && to && from !== to)
    .map(([from, to]) => ({ from, to, reason: "stock-master-identity-v214", updatedAt: now }));
  const aliasesByFrom = new Map(existingAliases.map((value) => [text(value.from, "", 300), value]));
  for (const value of aliasRecords) aliasesByFrom.set(String(value.from), value);
  parts.root.stockBalances = balances;
  parts.root.nomenclature = nomenclature;
  parts.root.recipes = parts.recipes;
  parts.root.inventoryProductAliases = [...aliasesByFrom.values()].slice(0, 5_000);
  const changed = mergedBalances > 0
    || mergedNomenclature > 0
    || remappedMovements > 0
    || remappedRecipes > 0
    || aliasRecords.length > 0;
  if (changed) parts.root.updatedAt = now;
  return {
    assortment: parts.root,
    stockMovements,
    aliases: Object.fromEntries(aliases),
    summary: {
      mergedBalances,
      mergedNomenclature,
      remappedMovements,
      remappedRecipes,
      skippedCurrencyConflicts,
      changed,
    },
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

export function normalizeInventoryDisplayUnit(
  value: unknown,
  base: BaseInventoryUnit,
): InventoryDisplayUnit | null {
  const requested = text(value, "auto", 20) as InventoryDisplayUnit;
  if (requested === "auto") return requested;
  if (base === "ml" && (requested === "ml" || requested === "l" || requested === "pcs")) return requested;
  if (base === "g" && (requested === "g" || requested === "kg" || requested === "pcs")) return requested;
  if (base === "pcs" && requested === "pcs") return requested;
  return null;
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

export function repairInventoryPurchaseAmounts(input: {
  assortment: unknown;
  purchaseDocuments: unknown[];
  stockMovements: unknown[];
  now?: string;
}): {
  assortment: JsonRecord;
  stockMovements: JsonRecord[];
  summary: InventoryPurchaseAmountRepairSummary;
} {
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const referencedDocumentIds = new Set(parts.balances
    .map((balance) => text(balance.lastDocumentId, "", 100))
    .filter(Boolean));
  const documents = new Map<string, JsonRecord>();
  const evidenceDocuments = new Map<string, JsonRecord>();
  for (const value of input.purchaseDocuments) {
    const document = record(value);
    const id = text(document.id, "", 100);
    const status = text(document.status, "", 20);
    if (!id || status === "cancelled") continue;
    const confirmed = status === "confirmed" || Boolean(text(document.confirmedAt, "", 40));
    if (confirmed) documents.set(id, document);
    // Legacy ledger migrations could demote an old confirmed document to
    // draft after losing its status field. It is still valid reconciliation
    // evidence when an existing posted balance points to this exact document.
    // This evidence-only map never restores missing receipts from drafts.
    if (confirmed || referencedDocumentIds.has(id)) evidenceDocuments.set(id, document);
  }
  const balances = new Map(parts.balances.map((balance) => [
    text(balance.productKey ?? balance.key, "", 300),
    balance,
  ]));
  const archivedProductKeys = new Set(array(parts.root.archivedInventoryProductKeys)
    .map((value) => text(value, "", 300))
    .filter(Boolean));
  const correctedProducts = new Set<string>();
  let repairedMovements = 0;
  let restoredMovements = 0;
  let reconciledBalances = 0;
  let correctedAmount = 0;
  let evidenceMatches = 0;
  let linkedShadowBalances = 0;
  const diagnostics: Array<Record<string, unknown>> = [];
  const claimedDocumentLines = new Set<string>();

  const purchaseLineValue = (item: JsonRecord): number => rounded(Math.max(
    0,
    number(item.lineTotal) || number(item.unitPrice) * Math.max(0, number(item.quantity)),
  ), 2);

  const packageEvidenceAmount = (
    item: JsonRecord,
    balance: JsonRecord,
    unit: BaseInventoryUnit,
  ): number => {
    const candidates = [
      item.packageSize,
      item.purchaseProductKey,
      item.productKey,
      ...array(item.packageOptions),
      balance.packageSize,
      ...array(balance.packageOptions),
      ...array(balance.externalProductKeys),
      ...array(balance.mergedFromProductKeys),
    ];
    const amounts = candidates
      .map((candidate) => text(candidate, "", 300)
        .replace(/(\d)\s+(\d+)\s*(мл|ml|л|l|г|g|кг|kg)/gi, "$1.$2 $3"))
      .filter((candidate) => /\d/.test(candidate))
      .map((candidate) => inventoryPackageAmount(candidate, unit))
      .filter((candidate) => candidate.unit === unit && candidate.amount > 0)
      // A purchase price for bottled/bar stock is a price per retail package.
      // Larger values are totals or synthetic legacy labels, not bottle sizes.
      .filter((candidate) => unit === "pcs" || candidate.amount <= 5_000)
      .map((candidate) => candidate.amount);
    return amounts.length ? Math.min(...amounts) : 0;
  };

  const reconciliationLineBaseAmount = (
    item: JsonRecord,
    balance: JsonRecord,
  ): { amount: number; unit: BaseInventoryUnit } => {
    const parsed = purchaseLineBaseAmount(item);
    const balanceUnit = baseUnit(balance.unit);
    const lineTotal = purchaseLineValue(item);
    const unitPrice = Math.max(0, number(item.unitPrice));
    if (!lineTotal || !unitPrice || balanceUnit === "unknown") return parsed;
    const pricedPackages = lineTotal / unitPrice;
    if (
      pricedPackages <= 0
      || Math.abs(pricedPackages - Math.round(pricedPackages)) > 0.01
    ) return parsed;
    // The broken legacy import stored the invoice line as pieces, while the
    // stock master retained the real bottle size (for example 0.5 l) in its
    // external product key. Derive the physical unit from the balance instead
    // of trusting that corrupted line unit. Financial equality proves the
    // number of purchased packages before any quantity is rewritten.
    const packageAmount = packageEvidenceAmount(item, balance, balanceUnit);
    if (!packageAmount) return parsed;
    const inferred = rounded(Math.round(pricedPackages) * packageAmount);
    if (inferred <= 0) return parsed;
    if (parsed.unit !== balanceUnit) return { amount: inferred, unit: balanceUnit };
    if (parsed.amount <= inferred) return parsed;
    const multiplier = parsed.amount / inferred;
    return multiplier >= 5
        && multiplier <= 1_000
        && Math.abs(multiplier - Math.round(multiplier)) < 0.0001
      ? { amount: inferred, unit: balanceUnit }
      : parsed;
  };

  const movementIdentityScore = (movement: JsonRecord, item: JsonRecord): number => {
    const expected = purchaseLineBaseAmount(item);
    if (expected.unit === "unknown" || text(movement.unit, expected.unit, 20) !== expected.unit) return 0;
    const productKey = resolveInventoryProductKey(parts.root, text(movement.productKey, "", 300));
    const requestedKey = resolveInventoryProductKey(parts.root, inventoryProductKey(item));
    if (productKey && requestedKey && productKey === requestedKey) return 1;
    return inventoryAutomaticIdentityScore(
      { ...item, unit: expected.unit },
      {
        ...movement,
        name: movement.productName,
        productName: movement.productName,
        unit: expected.unit,
      },
    );
  };

  const bestDocumentLine = (
    movement: JsonRecord,
    document: JsonRecord,
  ): { item: JsonRecord; key: string } | undefined => {
    const documentId = text(document.id, "", 100);
    const candidates = array(document.items)
      .map((value, index) => {
        const item = record(value);
        const lineId = sourceLineId(item, index);
        const key = `${documentId}:${lineId}`;
        return { item, key, score: movementIdentityScore(movement, item) };
      })
      .filter((candidate) => !claimedDocumentLines.has(candidate.key) && candidate.score >= 0.9)
      .sort((left, right) => right.score - left.score);
    if (!candidates.length) return undefined;
    if (candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < 0.01) return undefined;
    return candidates[0];
  };

  const reconcileReceiptAmount = (movement: JsonRecord, item: JsonRecord): void => {
    const previousAmount = number(movement.amount);
    const productKey = resolveInventoryProductKey(parts.root, text(movement.productKey, "", 300));
    if (!productKey || archivedProductKeys.has(productKey)) return;
    const balance = balances.get(productKey);
    if (!balance || balance.archived === true || balance.active === false) return;
    const expected = reconciliationLineBaseAmount(item, balance);
    if (
      expected.amount <= 0
      || expected.unit === "unknown"
      || (text(movement.unit, expected.unit, 20) !== expected.unit && previousAmount > 0)
      || Math.abs(previousAmount - expected.amount) < 0.0001
    ) return;
    const delta = rounded(expected.amount - previousAmount);
    movement.amount = expected.amount;
    movement.unit = expected.unit;
    movement.repairedAt = now;
    movement.repairReason = "Остаток пересчитан по подтверждённой строке накладной";
    balance.current = rounded(number(balance.current) + delta);
    const inventoryValue = valueOfBalance(balance);
    balance.inventoryValue = rounded(inventoryValue, 2);
    balance.averageUnitCost = number(balance.current) > 0
      ? rounded(inventoryValue / number(balance.current), 6)
      : 0;
    balance.updatedAt = now;
    balance.quantityRepairAt = now;
    repairedMovements += 1;
    correctedAmount += Math.abs(delta);
    correctedProducts.add(productKey);
  };

  const stockMovements = input.stockMovements.map((value) => {
    const movement = cloneRecord(value);
    if (
      text(movement.type, "", 30) !== "receipt"
      || text(movement.status, "active", 20) === "cancelled"
      || text(movement.reversedAt, "", 40)
    ) return movement;
    const document = evidenceDocuments.get(text(movement.sourceDocumentId, "", 100));
    if (document) {
      const items = array(document.items).map(record);
      const itemIndex = items.findIndex((line, index) =>
        sourceLineId(line, index) === text(movement.sourceLineId, "", 100)
      );
      if (itemIndex >= 0) {
        const item = items[itemIndex];
        claimedDocumentLines.add(`${text(document.id, "", 100)}:${sourceLineId(item, itemIndex)}`);
        reconcileReceiptAmount(movement, item);
        return movement;
      }
      const semantic = bestDocumentLine(movement, document);
      if (semantic) {
        movement.sourceLineId = semantic.key.slice(text(document.id, "", 100).length + 1);
        movement.repairedAt = now;
        movement.repairReason = "Восстановлена связь прихода с позицией накладной по товару";
        claimedDocumentLines.add(semantic.key);
        const repairCountBefore = repairedMovements;
        reconcileReceiptAmount(movement, semantic.item);
        if (repairedMovements === repairCountBefore) repairedMovements += 1;
        return movement;
      }
    }

    // Some old imports lost the document id entirely. Link only a unique
    // same-day, same-product confirmed line; ambiguity is left untouched.
    const sameDayMatches = [...documents.values()]
      .filter((candidateDocument) =>
        text(candidateDocument.date, "", 10) === text(movement.date, "", 10)
      )
      .map((candidateDocument) => ({
        document: candidateDocument,
        match: bestDocumentLine(movement, candidateDocument),
      }))
      .filter((candidate): candidate is { document: JsonRecord; match: { item: JsonRecord; key: string } } =>
        Boolean(candidate.match)
      );
    if (sameDayMatches.length === 1) {
      const matched = sameDayMatches[0];
      const documentId = text(matched.document.id, "", 100);
      movement.sourceDocumentId = documentId;
      movement.sourceLineId = matched.match.key.slice(documentId.length + 1);
      movement.repairedAt = now;
      movement.repairReason = "Восстановлена связь прихода с подтверждённой накладной";
      claimedDocumentLines.add(matched.match.key);
      const repairCountBefore = repairedMovements;
      reconcileReceiptAmount(movement, matched.match.item);
      if (repairedMovements === repairCountBefore) repairedMovements += 1;
    }
    return movement;
  });

  // Old stock masters were sometimes created before movement keys were
  // normalized. In that shape the confirmed purchase line, the visible
  // balance and the receipt all describe the same product, but the receipt
  // points to a different generated key. Reconcile the balance directly from
  // the exact last confirmed document and its retained external product key.
  // Financial equality is required as an additional guard, so a similarly
  // named product or a real opening balance cannot be rewritten accidentally.
  const balanceEvidenceKeys = (balance: JsonRecord): Set<string> => new Set([
    text(balance.productKey ?? balance.key, "", 300),
    ...array(balance.externalProductKeys).map((value) => text(value, "", 300)),
    ...array(balance.mergedFromProductKeys).map((value) => text(value, "", 300)),
  ].filter(Boolean));
  const itemEvidenceKeys = (item: JsonRecord): Set<string> => new Set([
    text(item.purchaseProductKey ?? item.productKey, "", 300),
    inventoryProductKey(item),
  ].filter(Boolean));
  const sharesEvidenceKey = (balance: JsonRecord, item: JsonRecord): boolean => {
    const balanceKeys = balanceEvidenceKeys(balance);
    return [...itemEvidenceKeys(item)].some((key) => balanceKeys.has(key));
  };
  const lineFinanciallyExplainsBalance = (balance: JsonRecord, item: JsonRecord): boolean => {
    const lineValue = purchaseLineValue(item);
    const inventoryValue = rounded(Math.max(0, valueOfBalance(balance)), 2);
    const valueTolerance = Math.max(0.01, inventoryValue * 0.005);
    if (lineValue <= 0 || Math.abs(inventoryValue - lineValue) > valueTolerance) return false;
    const lastPurchasePrice = Math.max(0, number(balance.lastPurchasePrice));
    const unitPrice = Math.max(0, number(item.unitPrice));
    const priceTolerance = Math.max(0.01, lastPurchasePrice * 0.005);
    return !lastPurchasePrice || !unitPrice || Math.abs(lastPurchasePrice - unitPrice) <= priceTolerance;
  };
  const lineNameExplainsBalance = (balance: JsonRecord, item: JsonRecord): boolean =>
    inventoryAutomaticIdentityScore(
      balance,
      { ...item, unit: purchaseLineBaseAmount(item).unit },
    ) >= 0.65;
  for (const balance of parts.balances) {
    if (balance.archived === true || balance.active === false) continue;
    const productKey = text(balance.productKey ?? balance.key, "", 300);
    const document = evidenceDocuments.get(text(balance.lastDocumentId, "", 100));
    if (!productKey || !document) continue;
    const documentItems = array(document.items)
      .map((value, index) => ({ item: record(value), lineId: sourceLineId(record(value), index) }))
      .filter(({ item }) => PURCHASE_STOCK_CATEGORIES.has(text(item.category, "products", 80)))
      .filter(({ item }) => {
        const expected = reconciliationLineBaseAmount(item, balance);
        return expected.amount > 0
          && expected.unit === baseUnit(balance.unit)
          && lineFinanciallyExplainsBalance(balance, item)
          && (sharesEvidenceKey(balance, item) || lineNameExplainsBalance(balance, item));
      });
    if (documentItems.length !== 1) continue;
    const matched = documentItems[0];
    evidenceMatches += 1;
    const expected = reconciliationLineBaseAmount(matched.item, balance);
    const current = rounded(number(balance.current));
    const ratio = expected.amount > 0 ? current / expected.amount : 0;
    const legacyMultiplier = ratio >= 5
      && ratio <= 1_000
      && Math.abs(ratio - Math.round(ratio)) < 0.0001;
    if (!legacyMultiplier || text(balance.lastInventoryDocumentId, "", 100)) continue;
    balance.current = expected.amount;
    const inventoryValue = rounded(Math.max(0, valueOfBalance(balance)), 2);
    balance.inventoryValue = inventoryValue;
    balance.averageUnitCost = expected.amount > 0
      ? rounded(inventoryValue / expected.amount, 6)
      : 0;
    balance.updatedAt = now;
    balance.quantityRepairAt = now;
    balance.quantityRepairReason = "Баланс восстановлен по точной строке последней подтверждённой накладной";
    for (const movement of stockMovements) {
      if (
        text(movement.type, "", 30) !== "receipt"
        || text(movement.status, "active", 20) === "cancelled"
        || text(movement.reversedAt, "", 40)
        || text(movement.sourceDocumentId, "", 100) !== text(document.id, "", 100)
      ) continue;
      const exactLine = text(movement.sourceLineId, "", 100) === matched.lineId;
      const sameProduct = resolveInventoryProductKey(parts.root, movement.productKey) === productKey;
      if (!exactLine && !sameProduct) continue;
      if (Math.abs(number(movement.amount) - expected.amount) < 0.0001 && movement.unit === expected.unit) continue;
      movement.amount = expected.amount;
      movement.unit = expected.unit;
      movement.sourceLineId = matched.lineId;
      movement.repairedAt = now;
      movement.repairReason = "Приход восстановлен по точной строке подтверждённой накладной";
      repairedMovements += 1;
    }
    reconciledBalances += 1;
    correctedAmount += Math.abs(current - expected.amount);
    correctedProducts.add(productKey);
  }

  // Some legacy cards lost or later replaced `lastDocumentId`, even though
  // the original confirmed invoice still uniquely explains their quantity
  // and value. The document-specific pass above cannot see that shape and a
  // previously repaired receipt is not enough to fix the stale materialized
  // balance. Search all confirmed evidence only when one line is an exact
  // financial and product match. This deliberately requires a unique result
  // so similarly named variants (for example two Nistru cognacs) are never
  // collapsed by name alone.
  for (const balance of parts.balances) {
    if (balance.archived === true || balance.active === false) continue;
    if (text(balance.lastInventoryDocumentId, "", 100)) continue;
    const productKey = text(balance.productKey ?? balance.key, "", 300);
    const balanceUnit = baseUnit(balance.unit);
    const current = rounded(number(balance.current));
    if (!productKey || balanceUnit === "unknown" || current <= 0) continue;
    const balanceCurrency = text(balance.currency, "", 12).toUpperCase();
    const candidates = [...evidenceDocuments.values()].flatMap((document) => {
      const documentCurrency = text(document.currency, "", 12).toUpperCase();
      if (balanceCurrency && documentCurrency && balanceCurrency !== documentCurrency) return [];
      const documentId = text(document.id, "", 100);
      return array(document.items).flatMap((value, index) => {
        const item = record(value);
        if (!PURCHASE_STOCK_CATEGORIES.has(text(item.category, "products", 80))) return [];
        const expected = reconciliationLineBaseAmount(item, balance);
        if (
          expected.amount <= 0
          || expected.unit !== balanceUnit
          || current <= expected.amount
          || !lineFinanciallyExplainsBalance(balance, item)
          || (!sharesEvidenceKey(balance, item) && !lineNameExplainsBalance(balance, item))
        ) return [];
        const ratio = current / expected.amount;
        const legacyMultiplier = ratio >= 5
          && ratio <= 1_000
          && Math.abs(ratio - Math.round(ratio)) < 0.0001;
        return legacyMultiplier
          ? [{ document, documentId, item, lineId: sourceLineId(item, index), expected }]
          : [];
      });
    });
    if (candidates.length !== 1) continue;
    const matched = candidates[0];
    balance.current = matched.expected.amount;
    const inventoryValue = rounded(Math.max(0, valueOfBalance(balance)), 2);
    balance.inventoryValue = inventoryValue;
    balance.averageUnitCost = matched.expected.amount > 0
      ? rounded(inventoryValue / matched.expected.amount, 6)
      : 0;
    balance.updatedAt = now;
    balance.quantityRepairAt = now;
    balance.quantityRepairReason = "Баланс восстановлен по уникальной финансовой строке подтверждённой накладной";
    balance.quantityRepairEvidenceDocumentId = matched.documentId;
    balance.quantityRepairEvidenceLineId = matched.lineId;
    for (const movement of stockMovements) {
      if (
        text(movement.type, "", 30) !== "receipt"
        || text(movement.status, "active", 20) === "cancelled"
        || text(movement.reversedAt, "", 40)
        || text(movement.sourceDocumentId, "", 100) !== matched.documentId
      ) continue;
      const exactLine = text(movement.sourceLineId, "", 100) === matched.lineId;
      const sameProduct = resolveInventoryProductKey(parts.root, movement.productKey) === productKey;
      if (!exactLine && (!sameProduct || movementIdentityScore(movement, matched.item) < 0.85)) continue;
      movement.sourceLineId = matched.lineId;
      if (
        Math.abs(number(movement.amount) - matched.expected.amount) < 0.0001
        && baseUnit(movement.unit) === matched.expected.unit
      ) continue;
      movement.amount = matched.expected.amount;
      movement.unit = matched.expected.unit;
      movement.repairedAt = now;
      movement.repairReason = "Приход восстановлен по уникальной финансовой строке подтверждённой накладной";
      repairedMovements += 1;
    }
    reconciledBalances += 1;
    evidenceMatches += 1;
    correctedAmount += Math.abs(current - matched.expected.amount);
    correctedProducts.add(productKey);
  }

  // A zero card can survive next to a stocked card when an old importer used
  // the package unit for one identity and pieces for another. Link the empty
  // shadow only when one confirmed line uniquely explains the stocked card by
  // document, quantity, value and price; the following duplicate pass then
  // collapses both identities without losing stock.
  for (const document of evidenceDocuments.values()) {
    const documentId = text(document.id, "", 100);
    array(document.items).forEach((value, itemIndex) => {
      const item = record(value);
      if (!PURCHASE_STOCK_CATEGORIES.has(text(item.category, "products", 80))) return;
      const expected = purchaseLineBaseAmount(item);
      const counted = toInventoryBaseAmount(item.quantity, item.unit);
      const movementTargets = new Set(stockMovements
        .filter((movement) =>
          text(movement.type, "", 30) === "receipt"
          && text(movement.status, "active", 20) !== "cancelled"
          && !text(movement.reversedAt, "", 40)
          && text(movement.sourceDocumentId, "", 100) === documentId
          && (
            text(movement.sourceLineId, "", 100) === sourceLineId(item, itemIndex)
            || movementIdentityScore(movement, item) >= 0.85
          )
        )
        .map((movement) => resolveInventoryProductKey(parts.root, movement.productKey))
        .filter(Boolean));
      const stocked = parts.balances.filter((balance) =>
        balance.archived !== true
        && balance.active !== false
        && (
          text(balance.lastDocumentId, "", 100) === documentId
          || movementTargets.has(text(balance.productKey ?? balance.key, "", 300))
        )
        && (
          (baseUnit(balance.unit) === expected.unit
            && Math.abs(number(balance.current) - expected.amount) < 0.0001)
          || (counted.unit === "pcs"
            && baseUnit(balance.unit) === counted.unit
            && Math.abs(number(balance.current) - counted.amount) < 0.0001)
        )
        && lineFinanciallyExplainsBalance(balance, item)
      );
      const empty = parts.balances.filter((balance) =>
        balance.archived !== true
        && balance.active !== false
        && Math.abs(number(balance.current)) < 0.0001
        && Math.abs(valueOfBalance(balance)) < 0.01
        && (
          sharesEvidenceKey(balance, item)
          || inventoryAutomaticIdentityScore(
            balance,
            { ...item, unit: baseUnit(balance.unit) },
          ) >= 0.8
        )
      );
      if (stocked.length !== 1 || empty.length !== 1 || stocked[0] === empty[0]) return;
      const targetKey = text(stocked[0].productKey ?? stocked[0].key, "", 300);
      if (!targetKey || text(empty[0].receiptShadowOfProductKey, "", 300) === targetKey) return;
      empty[0].receiptShadowOfProductKey = targetKey;
      empty[0].updatedAt = now;
      reconciledBalances += 1;
      linkedShadowBalances += 1;
      correctedProducts.add(targetKey);
    });
  }

  parts.root.stockBalances = parts.balances;
  let assortment = parts.root;
  const activeReceiptKeys = new Set(stockMovements
    .filter((movement) =>
      text(movement.type, "", 30) === "receipt"
      && text(movement.status, "active", 20) !== "cancelled"
      && !text(movement.reversedAt, "", 40)
    )
    .map((movement) => `${text(movement.sourceDocumentId, "", 100)}:${text(movement.sourceLineId, "", 100)}`));

  for (const document of documents.values()) {
    const documentId = text(document.id, "", 100);
    const documentItems: JsonRecord[] = array(document.items).map((value, index) => {
      const item = record(value);
      return { ...item, id: sourceLineId(item, index) };
    });
    const claimedFallbackMovements = new Set<string>();
    for (const item of documentItems) {
      const lineId = text(item.id, "", 100);
      const exactKey = `${documentId}:${lineId}`;
      if (activeReceiptKeys.has(exactKey)) continue;
      const requestedProductKey = resolveInventoryProductKey(assortment, inventoryProductKey(item));
      if (archivedProductKeys.has(requestedProductKey) || archivedProductKeys.has(inventoryProductKey(item))) continue;
      const fallback = stockMovements.find((movement) => {
        const movementId = text(movement.id, "", 100);
        if (claimedFallbackMovements.has(movementId)) return false;
        if (
          text(movement.type, "", 30) !== "receipt"
          || text(movement.status, "active", 20) === "cancelled"
          || text(movement.reversedAt, "", 40)
          || text(movement.sourceDocumentId, "", 100) !== documentId
        ) return false;
        return resolveInventoryProductKey(assortment, movement.productKey) === requestedProductKey;
      });
      if (!fallback) continue;
      fallback.sourceLineId = lineId;
      fallback.repairedAt = now;
      fallback.repairReason = "Восстановлена связь строки накладной с приходом";
      const repairCountBefore = repairedMovements;
      reconcileReceiptAmount(fallback, item);
      claimedFallbackMovements.add(text(fallback.id, "", 100));
      activeReceiptKeys.add(exactKey);
      if (repairedMovements === repairCountBefore) repairedMovements += 1;
      if (requestedProductKey) correctedProducts.add(requestedProductKey);
    }
    const missingItems = documentItems.filter((item) => {
      if (!PURCHASE_STOCK_CATEGORIES.has(text(item.category, "products", 80))) return false;
      const requestedProductKey = resolveInventoryProductKey(assortment, inventoryProductKey(item));
      if (archivedProductKeys.has(requestedProductKey) || archivedProductKeys.has(inventoryProductKey(item))) return false;
      return !activeReceiptKeys.has(`${documentId}:${text(item.id, "", 100)}`);
    });
    if (!missingItems.length) continue;
    const restored = applyPurchaseToInventory({
      assortment,
      document: { ...document, items: missingItems },
      now,
    });
    if (!restored.movements.length) continue;
    assortment = restored.assortment;
    for (const movement of restored.movements) {
      stockMovements.push(movement);
      activeReceiptKeys.add(`${movement.sourceDocumentId}:${movement.sourceLineId}`);
      restoredMovements += 1;
      correctedAmount += Math.abs(movement.amount);
      correctedProducts.add(movement.productKey);
    }
  }

  // A previous repair could already have corrected the receipt movement while
  // leaving the materialized balance untouched. In that state rerunning the
  // receipt repair is a no-op, so the inflated balance survives forever.
  // Reconcile only receipt-only products whose entire inventory value is
  // explained by those receipts. This proves that there is no valued opening
  // balance to preserve and avoids rewriting legitimate imported stock.
  const movementsByProduct = new Map<string, JsonRecord[]>();
  for (const movement of stockMovements) {
    if (
      text(movement.status, "active", 20) === "cancelled"
      || text(movement.reversedAt, "", 40)
    ) continue;
    const productKey = resolveInventoryProductKey(
      assortment,
      text(movement.productKey, "", 300),
    );
    if (!productKey) continue;
    const values = movementsByProduct.get(productKey) ?? [];
    values.push(movement);
    movementsByProduct.set(productKey, values);
  }
  for (const [productKey, balance] of balances) {
    if (balance.archived === true || balance.active === false) continue;
    if (text(balance.lastInventoryDocumentId, "", 100)) continue;
    const exactMovements = movementsByProduct.get(productKey) ?? [];
    const movementGroupScores = [...movementsByProduct.entries()]
        .map(([candidateKey, candidateMovements]) => {
          const representative = candidateMovements[0] ?? {};
          const score = inventoryAutomaticIdentityScore(
            balance,
            {
              ...representative,
              name: representative.productName,
              productName: representative.productName,
              unit: representative.unit,
            },
          );
          return { candidateKey, candidateMovements, score };
        });
    const semanticMovementGroups = exactMovements.length
      ? []
      : movementGroupScores
        .filter(({ candidateMovements, score }) =>
          score >= 0.9
          && candidateMovements.length > 0
          && candidateMovements.every((movement) =>
            text(movement.type, "", 30) === "receipt"
            && baseUnit(movement.unit) === baseUnit(balance.unit)
          )
        );
    const semanticMatch = semanticMovementGroups.length === 1
      ? semanticMovementGroups[0]
      : undefined;
    const movements = exactMovements.length
      ? exactMovements
      : semanticMatch?.candidateMovements ?? [];
    if (!movements.length || movements.some((movement) => text(movement.type, "", 30) !== "receipt")) {
      continue;
    }
    const balanceUnit = baseUnit(balance.unit);
    if (
      balanceUnit === "unknown"
      || movements.some((movement) => baseUnit(movement.unit) !== balanceUnit)
    ) continue;
    const linkedReceipts = movements.map((movement) => {
      const movementAmount = Math.max(0, number(movement.amount));
      const movementValue = rounded(Math.max(0, number(movement.costAmount)), 2);
      const movementEvidence = movementAmount > 0
        && movementValue > 0
        && Boolean(text(movement.sourceDocumentId, "", 100))
        && Boolean(text(movement.sourceLineId, "", 100));
      const document = evidenceDocuments.get(text(movement.sourceDocumentId, "", 100));
      if (document) {
        const items = array(document.items).map(record);
        const item = items.find((line, index) =>
          sourceLineId(line, index) === text(movement.sourceLineId, "", 100)
        );
        if (item) {
          const expected = reconciliationLineBaseAmount(item, balance);
          if (expected.amount > 0 && expected.unit === balanceUnit) {
            const lineValue = Math.max(0, number(item.lineTotal)
              || number(item.unitPrice) * Math.max(0, number(item.quantity)));
            return { movement, expected, lineValue, evidence: "document" as const };
          }
        }
      }
      // A previous repair may have fixed and financially verified the receipt
      // before a legacy merge removed the invoice from the current evidence
      // set. The receipt still carries the immutable document/line ids, its
      // physical amount and the posted invoice value. Keep that evidence
      // usable instead of leaving the materialized balance inflated forever.
      if (!movementEvidence || baseUnit(movement.unit) !== balanceUnit) return undefined;
      return {
        movement,
        expected: { amount: movementAmount, unit: balanceUnit },
        lineValue: movementValue,
        evidence: "posted-receipt" as const,
      };
    });
    if (linkedReceipts.some((value) => !value)) continue;
    const confirmedReceipts = linkedReceipts.filter((value): value is NonNullable<typeof value> => Boolean(value));
    const ledgerAmount = rounded(confirmedReceipts.reduce((sum, value) => sum + value.expected.amount, 0));
    const current = rounded(number(balance.current));
    if (ledgerAmount <= 0 || current <= ledgerAmount) continue;
    const receiptValue = rounded(
      confirmedReceipts.reduce((sum, value) => sum + value.lineValue, 0),
      2,
    );
    const inventoryValue = rounded(Math.max(0, valueOfBalance(balance)), 2);
    const valueTolerance = Math.max(0.01, inventoryValue * 0.005);
    const receiptValueExplainsBalance = receiptValue > 0
      && Math.abs(inventoryValue - receiptValue) <= valueTolerance;
    const purchaseOrigin = text(balance.source, "", 40) === "purchase";
    const ratio = current / ledgerAmount;
    const legacyMultiplier = ratio >= 5
      && ratio <= 1_000
      && Math.abs(ratio - Math.round(ratio)) < 0.0001;
    const lastDocumentId = text(balance.lastDocumentId, "", 100);
    const lastDocumentIsReceipt = Boolean(lastDocumentId)
      && movements.some((movement) => text(movement.sourceDocumentId, "", 100) === lastDocumentId);
    const diagnosticCandidate = (
      balanceUnit === "ml" && current >= 50_000
    ) || (
      current >= 5_000
      && ledgerAmount > 0
      && current > ledgerAmount
      && ratio >= 5
    );
    if (diagnosticCandidate && diagnostics.length < 20) {
      diagnostics.push({
        productKey,
        name: text(balance.name ?? balance.productName, "", 240),
        unit: balanceUnit,
        current,
        inventoryValue,
        source: text(balance.source, "", 40),
        lastDocumentId,
        lastInventoryDocumentId: text(balance.lastInventoryDocumentId, "", 100),
        movementMatch: exactMovements.length ? "exact-key" : semanticMatch ? "unique-name" : "none",
        movementProductKey: semanticMatch?.candidateKey ?? productKey,
        movementCount: movements.length,
        movementTypes: [...new Set(movements.map((movement) => text(movement.type, "", 30)))],
        movementUnits: [...new Set(movements.map((movement) => text(movement.unit, "", 20)))],
        movementAmounts: movements.map((movement) => number(movement.amount)),
        movementValues: movements.map((movement) => number(movement.costAmount)),
        ledgerAmount,
        receiptValue,
        ratio,
        legacyMultiplier,
        receiptValueExplainsBalance,
        purchaseOrigin,
        lastDocumentIsReceipt,
        nearestMovementGroups: movementGroupScores
          .sort((left, right) => right.score - left.score)
          .slice(0, 5)
          .map(({ candidateKey, candidateMovements, score }) => ({
            productKey: candidateKey,
            score: rounded(score, 4),
            names: [...new Set(candidateMovements.map((movement) =>
              text(movement.productName, "", 240)
            ))],
            types: [...new Set(candidateMovements.map((movement) =>
              text(movement.type, "", 30)
            ))],
            units: [...new Set(candidateMovements.map((movement) =>
              text(movement.unit, "", 20)
            ))],
            amounts: candidateMovements.map((movement) => number(movement.amount)),
            values: candidateMovements.map((movement) => number(movement.costAmount)),
          })),
      });
    }
    if (
      !legacyMultiplier
      || (!lastDocumentIsReceipt && !receiptValueExplainsBalance)
      || (!purchaseOrigin && !receiptValueExplainsBalance)
    ) continue;
    if (semanticMatch) {
      for (const movement of movements) {
        if (text(movement.productKey, "", 300) === productKey) continue;
        movement.productKey = productKey;
        movement.repairedAt = now;
        movement.repairReason = "Приход привязан к единственной совпадающей складской карточке";
        repairedMovements += 1;
      }
    }
    for (const value of confirmedReceipts) {
      if (Math.abs(number(value.movement.amount) - value.expected.amount) < 0.0001) continue;
      value.movement.amount = value.expected.amount;
      value.movement.unit = value.expected.unit;
      value.movement.repairedAt = now;
      value.movement.repairReason = "Приход сверен с подтверждённой строкой накладной";
      repairedMovements += 1;
    }
    balance.current = ledgerAmount;
    balance.inventoryValue = inventoryValue;
    balance.averageUnitCost = ledgerAmount > 0
      ? rounded(inventoryValue / ledgerAmount, 6)
      : 0;
    balance.updatedAt = now;
    balance.quantityRepairAt = now;
    balance.quantityRepairReason = lastDocumentIsReceipt
      ? "Баланс сверен с журналом подтверждённых приходов"
      : "Баланс восстановлен по финансово подтверждённому журналу приходов";
    reconciledBalances += 1;
    correctedAmount += Math.abs(current - ledgerAmount);
    correctedProducts.add(productKey);
  }

  if (repairedMovements || restoredMovements || reconciledBalances) record(assortment).updatedAt = now;
  return {
    assortment: record(assortment),
    stockMovements,
    summary: {
      repairedMovements,
      restoredMovements,
      reconciledBalances,
      correctedProducts: correctedProducts.size,
      correctedAmount: rounded(correctedAmount),
      evidenceDocuments: evidenceDocuments.size,
      evidenceMatches,
      linkedShadowBalances,
      diagnostics,
      changed: repairedMovements > 0 || restoredMovements > 0 || reconciledBalances > 0,
    },
  };
}

export function archiveInventoryProduct(input: {
  assortment: unknown;
  productKey: string;
  now?: string;
}): {
  ok: boolean;
  code?: "PRODUCT_NOT_FOUND" | "PRODUCT_HAS_STOCK" | "PRODUCT_IN_USE";
  error?: string;
  assortment: JsonRecord;
  product?: JsonRecord;
  linkedRecipes: number;
} {
  const now = input.now ?? new Date().toISOString();
  const parts = assortmentParts(input.assortment);
  const requestedKey = text(input.productKey, "", 300);
  const resolvedKey = resolveInventoryProductKey(parts.root, requestedKey);
  const balance = parts.balances.find((value) =>
    text(value.productKey ?? value.key, "", 300) === resolvedKey
  );
  const nomenclature = array(parts.root.nomenclature).map(cloneRecord);
  const item = nomenclature.find((value) =>
    text(value.productKey ?? value.key, "", 300) === resolvedKey
  );
  const product = balance ?? item;
  if (!product) {
    return {
      ok: false,
      code: "PRODUCT_NOT_FOUND",
      error: "Позиция не найдена",
      assortment: parts.root,
      linkedRecipes: 0,
    };
  }
  if (Math.abs(number(balance?.current)) >= 0.0001 || Math.abs(valueOfBalance(balance ?? {})) >= 0.01) {
    return {
      ok: false,
      code: "PRODUCT_HAS_STOCK",
      error: "Сначала обнулите остаток инвентаризацией",
      assortment: parts.root,
      product: cloneRecord(product),
      linkedRecipes: 0,
    };
  }
  const linkedRecipes = parts.recipes.filter((recipe) =>
    array(recipe.ingredients).some((value) => {
      const ingredient = record(value);
      const ingredientKey = text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 300);
      return ingredientKey && resolveInventoryProductKey(parts.root, ingredientKey) === resolvedKey;
    })
  ).length;
  if (linkedRecipes > 0) {
    return {
      ok: false,
      code: "PRODUCT_IN_USE",
      error: "Позиция используется в техкарте. Сначала замените ингредиент",
      assortment: parts.root,
      product: cloneRecord(product),
      linkedRecipes,
    };
  }
  const archived = {
    archived: true,
    active: false,
    archivedAt: now,
    updatedAt: now,
  };
  if (balance) Object.assign(balance, archived);
  if (item) Object.assign(item, archived);
  const tombstoneKeys = [
    requestedKey,
    resolvedKey,
    text(product.key, "", 300),
    text(product.productKey, "", 300),
    ...array(product.externalProductKeys).map((value) => text(value, "", 300)),
    ...array(product.mergedFromProductKeys).map((value) => text(value, "", 300)),
  ].filter(Boolean);
  parts.root.stockBalances = parts.balances;
  parts.root.nomenclature = nomenclature;
  parts.root.archivedInventoryProductKeys = [...new Set([
    ...array(parts.root.archivedInventoryProductKeys).map((value) => text(value, "", 300)),
    ...tombstoneKeys,
  ].filter(Boolean))].slice(-5_000);
  parts.root.updatedAt = now;
  return {
    ok: true,
    assortment: parts.root,
    product: cloneRecord(balance ?? item),
    linkedRecipes: 0,
  };
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
  const displayUnit = normalizeInventoryDisplayUnit(input.update.displayUnit, requestedUnit);
  const packageSize = text(input.update.packageSize, "", 120);
  if (!productKey || !name || requestedUnit === "unknown" || !packageSize || !displayUnit) {
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
  const keepsMultiplePackages = balance.multiplePackageSizes === true
    && packageSize === "Несколько фасовок";
  const parsedPackage = keepsMultiplePackages
    ? { amount: 0, unit: requestedUnit }
    : inventoryPackageAmount(packageSize, baseUnitInputLabel(requestedUnit));
  if (!keepsMultiplePackages && (parsedPackage.amount <= 0 || parsedPackage.unit !== requestedUnit)) {
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
  const usesPackageAsDisplayUnit = displayUnit === "pcs" && requestedUnit !== "pcs";
  const displayPackageSize = usesPackageAsDisplayUnit
    ? text(
      input.update.displayPackageSize,
      text(balance.displayPackageSize, keepsMultiplePackages ? "" : packageSize, 120),
      120,
    )
    : "";
  const parsedDisplayPackage = usesPackageAsDisplayUnit
    ? inventoryPackageAmount(displayPackageSize, baseUnitInputLabel(requestedUnit))
    : { amount: 0, unit: requestedUnit };
  if (
    usesPackageAsDisplayUnit
    && (!displayPackageSize || parsedDisplayPackage.amount <= 0 || parsedDisplayPackage.unit !== requestedUnit)
  ) {
    return {
      ok: false,
      code: "INVALID_PRODUCT",
      error: "Чтобы показывать остаток в штуках, выберите объём или вес одной бутылки, банки или упаковки.",
    };
  }
  const purchaseMode = ["document", "measure", "package"].includes(input.update.purchaseMode ?? "")
    ? input.update.purchaseMode as "document" | "measure" | "package"
    : "document";
  const usesPackageAsPurchaseUnit = purchaseMode === "package" && requestedUnit !== "pcs";
  const purchasePackageSize = usesPackageAsPurchaseUnit
    ? text(
      input.update.purchasePackageSize,
      text(
        balance.purchasePackageSize,
        displayPackageSize || (keepsMultiplePackages ? "" : packageSize),
        120,
      ),
      120,
    )
    : "";
  const parsedPurchasePackage = usesPackageAsPurchaseUnit
    ? inventoryPackageAmount(purchasePackageSize, baseUnitInputLabel(requestedUnit))
    : { amount: 0, unit: requestedUnit };
  if (
    usesPackageAsPurchaseUnit
    && (!purchasePackageSize || parsedPurchasePackage.amount <= 0 || parsedPurchasePackage.unit !== requestedUnit)
  ) {
    return {
      ok: false,
      code: "INVALID_PRODUCT",
      error: "Чтобы приходовать товар в бутылках или упаковках, укажите объём или вес одной единицы.",
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
  balance.preferredDisplayName = name;
  balance.preferredDisplayNameSource = "manual_edit";
  balance.preferredDisplayNameUpdatedAt = now;
  balance.unit = requestedUnit;
  balance.displayUnit = displayUnit;
  if (usesPackageAsDisplayUnit) {
    balance.displayPackageSize = displayPackageSize;
    balance.displayPackageAmount = rounded(parsedDisplayPackage.amount);
  } else {
    delete balance.displayPackageSize;
    delete balance.displayPackageAmount;
  }
  balance.purchaseMode = purchaseMode;
  if (usesPackageAsPurchaseUnit) {
    balance.purchasePackageSize = purchasePackageSize;
    balance.purchasePackageAmount = rounded(parsedPurchasePackage.amount);
  } else {
    delete balance.purchasePackageSize;
    delete balance.purchasePackageAmount;
  }
  balance.packageSize = packageSize;
  balance.packageAmount = rounded(parsedPackage.amount);
  balance.multiplePackageSizes = keepsMultiplePackages || undefined;
  if (!keepsMultiplePackages) balance.packageOptions = [packageSize];
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
      preferredDisplayName: name,
      preferredDisplayNameSource: "manual_edit",
      preferredDisplayNameUpdatedAt: now,
      unit: requestedUnit,
      displayUnit,
      ...(usesPackageAsDisplayUnit
        ? {
          displayPackageSize,
          displayPackageAmount: rounded(parsedDisplayPackage.amount),
        }
        : {}),
      purchaseMode,
      ...(usesPackageAsPurchaseUnit
        ? {
          purchasePackageSize,
          purchasePackageAmount: rounded(parsedPurchasePackage.amount),
        }
        : {}),
      packageSize,
      packageAmount: rounded(parsedPackage.amount),
      multiplePackageSizes: keepsMultiplePackages || undefined,
      ...(!keepsMultiplePackages ? { packageOptions: [packageSize] } : {}),
      updatedAt: now,
    });
    if (!usesPackageAsDisplayUnit) {
      delete nomenclatureItem.displayPackageSize;
      delete nomenclatureItem.displayPackageAmount;
    }
    if (!usesPackageAsPurchaseUnit) {
      delete nomenclatureItem.purchasePackageSize;
      delete nomenclatureItem.purchasePackageAmount;
    }
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

function incomingInventoryProductKey(
  assortment: JsonRecord,
  balances: JsonRecord[],
  item: JsonRecord,
): { key: string; requestedKey: string } {
  const requestedKey = inventoryProductKey(item);
  const resolvedKey = resolveInventoryProductKey(assortment, requestedKey);
  const direct = balances.find((balance) =>
    text(balance.productKey ?? balance.key, "", 300) === resolvedKey
  );
  if (direct) return { key: resolvedKey, requestedKey };
  const incoming = {
    ...item,
    unit: purchaseLineBaseAmount(item).unit,
    currency: text(item.currency, "", 12),
  };
  const match = balances
    .map((balance) => ({ balance, score: inventoryAutomaticIdentityScore(incoming, balance) }))
    .filter(({ score }) => score >= 0.9)
    .sort((left, right) =>
      right.score - left.score
      || Number(Boolean(text(right.balance.preferredDisplayName, "", 240)))
        - Number(Boolean(text(left.balance.preferredDisplayName, "", 240)))
      || Number(number(right.balance.current) > 0) - Number(number(left.balance.current) > 0)
      || text(left.balance.name).length - text(right.balance.name).length
    );
  const best = match[0];
  const second = match[1];
  // A high score is not sufficient when two canonical positions are nearly
  // indistinguishable.  Do not make an order-dependent stock merge.
  const unambiguous = best && (!second || best.score - second.score >= 0.08)
    ? best.balance
    : undefined;
  return {
    key: unambiguous
      ? text(unambiguous.productKey ?? unambiguous.key, requestedKey, 300)
      : requestedKey,
    requestedKey,
  };
}

function sourceLineId(item: JsonRecord, index: number): string {
  return text(item.id, `line-${index + 1}`, 100);
}

export function applyPurchaseToInventory(input: {
  assortment: unknown;
  document: unknown;
  accountingCurrency?: unknown;
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
  const accountingCurrency = text(input.accountingCurrency, currency, 12).toUpperCase();
  const sourceType = text(document.sourceType, "manual", 30);
  const userConfirmedNames = sourceType === "manual" || sourceType === "scan";
  const parts = assortmentParts(input.assortment);
  if (!record(parts.root.nomenclatureStructure).version) {
    parts.root.nomenclatureStructure = defaultNomenclatureStructure();
  }
  const indexedBalances = balanceIndex(parts.balances);
  const movements: StockMovement[] = [];
  const unresolvedLines: InventoryUpdateSummary["unresolvedLines"] = [];
  const valuationIssues: NonNullable<InventoryUpdateSummary["valuationIssues"]> = [];
  const candidates = new Map<string, Set<string>>();
  let currencyConflicts = 0;
  const nomenclature = array(parts.root.nomenclature).map(cloneRecord);
  const nomenclatureByKey = new Map(
    nomenclature.map((item) => [text(item.key ?? item.productKey, "", 300), item]),
  );
  const identityAliases = new Map(
    array(parts.root.inventoryProductAliases)
      .map((value) => cloneRecord(value))
      .map((value) => [text(value.from, "", 300), value] as const)
      .filter(([from]) => Boolean(from)),
  );
  let supplierProductMappings = array(parts.root.supplierProductMappings);
  let sourceMappingsUpserted = 0;
  let canonicalItemsReused = 0;
  let sourceMappingsNeedingReview = 0;

  array(document.items).forEach((value, index) => {
    const item = record(value);
    const itemId = sourceLineId(item, index);
    const sourceName = text(item.name, `Позиция ${index + 1}`);
    const received = purchaseLineBaseAmount(item);
    const canonicalResolution = resolveCanonicalPurchaseItem({
      assortment: { ...parts.root, supplierProductMappings },
      document,
      item: { ...item, unit: received.unit },
      canonicalItems: [...nomenclature, ...parts.balances],
      now,
    });
    const name = canonicalResolution.canonicalName || sourceName;
    if (canonicalResolution.status === "review") {
      sourceMappingsNeedingReview += 1;
      unresolvedLines.push({
        id: itemId,
        name,
        reason: "Неоднозначное сопоставление с номенклатурой — подтвердите каноническую позицию",
      });
      return;
    }
    const sourceRequestedKey = text(
      item.purchaseProductKey ?? item.productKey ?? item.canonicalProductKey,
      "",
      300,
    );
    const canonicalHint = ["stable_mapping", "explicit", "high_confidence"].includes(canonicalResolution.status)
      ? canonicalResolution.canonicalProductKey
      : sourceRequestedKey || canonicalResolution.canonicalProductKey;
    const identity = incomingInventoryProductKey(parts.root, parts.balances, {
      ...item,
      name,
      purchaseProductKey: canonicalHint,
      unit: received.unit,
      currency,
    });
    const productKey = identity.key;
    supplierProductMappings = upsertSupplierProductMapping(supplierProductMappings, {
      ...canonicalResolution.sourceMapping,
      canonicalProductKey: productKey,
    });
    sourceMappingsUpserted += 1;
    if (["stable_mapping", "explicit", "high_confidence"].includes(canonicalResolution.status)) {
      canonicalItemsReused += 1;
    }
    if (identity.requestedKey && identity.requestedKey !== productKey) {
      identityAliases.set(identity.requestedKey, {
        from: identity.requestedKey,
        to: productKey,
        reason: "automatic-stock-identity",
        updatedAt: now,
      });
    }
    const category = text(item.category, "products", 80);
    const previousNomenclature = nomenclatureByKey.get(productKey);
    const previousBalance = indexedBalances.get(productKey)
      ?? indexedBalances.get(legacyGeneratedInventoryProductKey(item));
    const previous = previousBalance ?? {};
    const incomingPackageSize = text(item.packageSize ?? item.unit, "", 120);
    const packageOptions = packageOptionLabels({
      unit: received.unit,
      packageOptions: [
        ...packageOptionLabels(previousNomenclature),
        ...packageOptionLabels(previous),
        incomingPackageSize,
      ],
    });
    const hasMultiplePackageSizes = packageOptions.length > 1;
    const displayedPackageSize = hasMultiplePackageSizes
      ? "Несколько фасовок"
      : packageOptions[0] ?? incomingPackageSize;
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
      packageSize: displayedPackageSize,
      packageOptions,
      multiplePackageSizes: hasMultiplePackageSizes || undefined,
      active: true,
      source: "purchase",
      preferredDisplayName: userConfirmedNames ? name : previousNomenclature?.preferredDisplayName,
      preferredDisplayNameSource: userConfirmedNames ? "confirmed_purchase" : previousNomenclature?.preferredDisplayNameSource,
      preferredDisplayNameUpdatedAt: userConfirmedNames ? now : previousNomenclature?.preferredDisplayNameUpdatedAt,
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

    const previousCurrent = number(previous.current);
    const previousInventoryValue = Math.max(0, valueOfBalance(previous));
    const previousAverageCost = averageCostOfBalance(previous);
    const previousCurrency = text(previous.currency, accountingCurrency || currency, 12).toUpperCase();
    const resolvedCost = resolvePurchaseLineAccountingCost({
      document,
      line: item,
      accountingCurrency: accountingCurrency || currency,
    });
    const lineCost = resolvedCost.known ? resolvedCost.amount : 0;
    const transactionLineCost = resolvedCost.transactionAmount;
    const nextCurrent = rounded(previousCurrent + received.amount);
    const existingCurrencyConflict = Boolean(
      previousCurrent > 0
      && previousAverageCost > 0
      && previousCurrency
      && accountingCurrency
      && previousCurrency !== accountingCurrency
    );
    const missingIncomingCost = !resolvedCost.known;
    const missingExistingCost = previousCurrent > 0
      && previousAverageCost <= 0
      && previousInventoryValue <= 0;
    const inheritedReview = previousCurrent > 0 && previous.costNeedsReview === true;
    const costNeedsReview = existingCurrencyConflict
      || missingIncomingCost
      || missingExistingCost
      || inheritedReview;
    if (existingCurrencyConflict || missingIncomingCost) currencyConflicts += 1;
    const nextAverageCost = costNeedsReview
      ? previousAverageCost
      : nextCurrent > 0
        ? rounded((previousCurrent * previousAverageCost + lineCost) / nextCurrent, 6)
        : 0;
    const costReviewReason = existingCurrencyConflict
      ? "currency_mismatch"
      : missingIncomingCost
        ? resolvedCost.reason ?? "missing_cost_basis"
        : missingExistingCost
          ? "missing_cost_basis"
        : inheritedReview
          ? text(previous.costReviewReason, "cost_basis_requires_review", 80)
          : "";
    if (existingCurrencyConflict || missingIncomingCost || missingExistingCost) {
      valuationIssues.push({
        id: itemId,
        name,
        reason: costReviewReason,
        transactionCurrency: currency || undefined,
        accountingCurrency: accountingCurrency || undefined,
      });
    }
    const packageDetails = inventoryPackageAmount(item.packageSize, item.unit);
    const next: JsonRecord = {
      ...previous,
      key: productKey,
      productKey,
      name,
      source: "purchase",
      preferredDisplayName: userConfirmedNames ? name : previous.preferredDisplayName,
      preferredDisplayNameSource: userConfirmedNames ? "confirmed_purchase" : previous.preferredDisplayNameSource,
      preferredDisplayNameUpdatedAt: userConfirmedNames ? now : previous.preferredDisplayNameUpdatedAt,
      category: text(item.category, text(previous.category, "other", 80), 80),
      packageSize: displayedPackageSize,
      packageOptions,
      multiplePackageSizes: hasMultiplePackageSizes || undefined,
      unit: received.unit,
      current: nextCurrent,
      onOrder: Math.max(0, rounded(number(previous.onOrder) - received.amount)),
      packageAmount: hasMultiplePackageSizes ? 0 : packageDetails.amount,
      averageUnitCost: nextAverageCost,
      inventoryValue: costNeedsReview
        ? rounded(previousInventoryValue, 2)
        : rounded(Math.max(0, nextCurrent) * nextAverageCost, 2),
      currency: costNeedsReview
        ? previousCurrency || accountingCurrency || currency
        : accountingCurrency || currency,
      accountingCurrency: accountingCurrency || undefined,
      valuationMethod: "moving_weighted_average",
      lastPurchasePrice: Math.max(0, number(item.unitPrice)
        || transactionLineCost / Math.max(1, number(item.quantity))),
      lastPurchaseAccountingCost: lineCost || undefined,
      lastTransactionCurrency: currency || undefined,
      lastPurchaseAt: date,
      lastDocumentId: documentId,
      checkedAt: now,
      updatedAt: now,
      costNeedsReview: costNeedsReview || undefined,
      costReviewReason: costNeedsReview ? costReviewReason : undefined,
    };
    if (!previousBalance) parts.balances.push(next);
    else Object.assign(previousBalance, next);
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
      currency: lineCost ? accountingCurrency || currency || undefined : undefined,
      transactionCostAmount: transactionLineCost || undefined,
      transactionCurrency: currency || undefined,
      exchangeRateToAccounting: resolvedCost.exchangeRate,
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
  parts.root.supplierProductMappings = supplierProductMappings;
  parts.root.inventoryProductAliases = [...identityAliases.values()].slice(0, 5_000);
  parts.root.updatedAt = now;
  parts.root = enrichCanonicalSupplierSummary(parts.root);
  parts.root.nomenclatureIdentityReport = auditCanonicalNomenclature({
    assortment: parts.root,
    venueId: number(document.venueId, 0) || undefined,
  });
  return {
    assortment: parts.root,
    movements,
    summary: {
      postedLines: movements.length,
      movementCount: movements.length,
      linkedIngredients,
      unresolvedLines,
      currencyConflicts,
      sourceMappingsUpserted,
      canonicalItemsReused,
      sourceMappingsNeedingReview,
      valuationIssues,
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
  const requestedProductKey = text(item.productKey, "", 300);
  const productKey = inventoryProductKey({
    ...item,
    productKey: requestedProductKey,
    name: item.productName,
  }) || requestedProductKey;
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
    transactionCostAmount: number(item.transactionCostAmount) || undefined,
    transactionCurrency: text(item.transactionCurrency, "", 12) || undefined,
    exchangeRateToAccounting: number(item.exchangeRateToAccounting) || undefined,
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
    const originalProductKey = text(requested.productKey, "", 300);
    const productKey = resolveInventoryProductKey(parts.root, originalProductKey);
    const balance = indexedBalances.get(productKey);
    const requestedName = text(requested.productName ?? requested.name, `Позиция ${index + 1}`);
    if (!originalProductKey || !productKey || !balance) {
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
    const averageUnitCost = averageCostOfBalance(balance);
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
  accountingCurrency?: unknown;
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

  const reapplied = applyPurchaseToInventory({
    assortment: parts.root,
    document: next,
    accountingCurrency: input.accountingCurrency,
    now,
  });
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
      const averageUnitCost = averageCostOfBalance(previous);
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

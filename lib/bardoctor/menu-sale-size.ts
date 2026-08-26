import {
  INVENTORY_UNIT_DEFINITIONS,
  inventoryPackageAmount,
  inventoryUnitDefinition,
  type BaseInventoryUnit,
  type InventoryUnitCode,
} from "./inventory";

export type MenuSaleSizeSource = "manual" | "packaging" | "legacy";

export type MenuSaleSize = {
  version: 1;
  quantity: number;
  unit: InventoryUnitCode;
  baseQuantity: number;
  baseUnit: Exclude<BaseInventoryUnit, "unknown">;
  source: Exclude<MenuSaleSizeSource, "legacy">;
  status: "confirmed";
  linkedNomenclatureItemId?: string;
  productKey?: string;
  packageLabel?: string;
};

export type LegacyMenuSaleSize = {
  version: 1;
  source: "legacy";
  status: "needs_review";
  legacyValue: string;
};

export type MenuSaleSizeResolution = MenuSaleSize | LegacyMenuSaleSize | null;

export type ReadyProductLink = {
  nomenclatureItemId?: string;
  productKey: string;
  packageLabel?: string;
  packagesPerSale: number;
};

export type ReadyProductConsumption = {
  nomenclatureItemId: string;
  productKey: string;
  productName: string;
  quantityPerSale: number;
  baseUnit: Exclude<BaseInventoryUnit, "unknown">;
  packageLabel?: string;
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

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function canonicalSize(
  quantityValue: unknown,
  unitValue: unknown,
  source: MenuSaleSize["source"] = "manual",
  metadata: Partial<MenuSaleSize> = {},
): MenuSaleSize | null {
  const quantity = numeric(quantityValue);
  const definition = inventoryUnitDefinition(unitValue);
  if (quantity === null || quantity <= 0 || !definition) return null;
  return {
    version: 1,
    quantity: rounded(quantity),
    unit: definition.code,
    baseQuantity: rounded(quantity * definition.factor),
    baseUnit: definition.baseUnit,
    source,
    status: "confirmed",
    ...(metadata.linkedNomenclatureItemId
      ? { linkedNomenclatureItemId: metadata.linkedNomenclatureItemId }
      : {}),
    ...(metadata.productKey ? { productKey: metadata.productKey } : {}),
    ...(metadata.packageLabel ? { packageLabel: metadata.packageLabel } : {}),
  };
}

export function menuSaleSizeUnitOptions() {
  return INVENTORY_UNIT_DEFINITIONS.map((definition) => ({ ...definition }));
}

export function normalizeManualMenuSaleSize(
  quantity: unknown,
  unit: unknown,
): MenuSaleSize | null {
  return canonicalSize(quantity, unit);
}

export function parseLegacyMenuSaleSize(value: unknown): MenuSaleSizeResolution {
  const legacyValue = text(value, "", 120);
  if (!legacyValue) return null;
  const normalized = legacyValue
    .toLocaleLowerCase("ru")
    .replace(/\u00a0/g, " ")
    .replace(/[.。]+$/g, "")
    .trim();
  const match = normalized.match(
    /^(\d+(?:[.,]\d+)?)\s*(мл|ml|миллилитр(?:а|ов)?|л|l|литр(?:а|ов)?|г|гр|g|грамм(?:а|ов)?|кг|kg|килограмм(?:а|ов)?|шт\.?|pcs|piece(?:s)?|порц(?:ия|ии|ий)?\.?)$/iu,
  );
  if (match) return canonicalSize(match[1], match[2]);
  return { version: 1, source: "legacy", status: "needs_review", legacyValue };
}

function productKey(value: JsonRecord): string {
  return text(value.productKey ?? value.key ?? value.id, "", 320);
}

function productId(value: JsonRecord): string {
  return text(value.id ?? value.nomenclatureItemId ?? value.productKey ?? value.key, "", 320);
}

function packageLabels(value: JsonRecord): string[] {
  const candidates = [
    ...array(value.packageOptions),
    value.packageSize,
    value.displayPackageSize,
    value.purchasePackageSize,
  ];
  const labels = new Map<string, string>();
  for (const candidate of candidates) {
    const source = record(candidate);
    const label = text(source.label ?? source.packageSize ?? candidate, "", 120);
    if (!label || /несколько\s+фасовок/i.test(label)) continue;
    const parsed = inventoryPackageAmount(label, value.unit ?? value.baseUnit);
    const key = parsed.amount > 0 && parsed.unit !== "unknown"
      ? `${parsed.unit}:${rounded(parsed.amount)}`
      : label.toLocaleLowerCase("ru");
    if (!labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()];
}

function assortmentProducts(assortment: unknown): JsonRecord[] {
  const root = record(assortment);
  const merged = [...array(root.nomenclature), ...array(root.stockBalances)].map(record);
  const byKey = new Map<string, JsonRecord>();
  for (const product of merged) {
    const key = productKey(product);
    if (!key) continue;
    byKey.set(key, { ...byKey.get(key), ...product });
  }
  return [...byKey.values()];
}

export function readyProductLink(value: unknown): ReadyProductLink | null {
  const item = record(value);
  const input = record(item.readyProduct ?? item.readyProductLink);
  const key = text(
    input.productKey
      ?? input.nomenclatureItemId
      ?? item.readyProductKey
      ?? item.nomenclatureItemId,
    "",
    320,
  );
  if (!key) return null;
  const packagesPerSale = numeric(input.packagesPerSale) ?? 1;
  if (!(packagesPerSale > 0)) return null;
  return {
    nomenclatureItemId: text(input.nomenclatureItemId, "", 320) || undefined,
    productKey: key,
    packageLabel: text(input.packageLabel, "", 120) || undefined,
    packagesPerSale: rounded(packagesPerSale),
  };
}

function linkedProduct(item: JsonRecord, assortment: unknown): {
  link: ReadyProductLink;
  product: JsonRecord;
  packageLabel?: string;
} | null {
  const link = readyProductLink(item);
  if (!link) return null;
  const product = assortmentProducts(assortment).find((candidate) =>
    productKey(candidate) === link.productKey || productId(candidate) === link.nomenclatureItemId
  );
  if (!product) return null;
  const options = packageLabels(product);
  const selected = link.packageLabel
    ? options.find((label) => label === link.packageLabel) ?? link.packageLabel
    : options.length === 1
      ? options[0]
      : undefined;
  return { link, product, packageLabel: selected };
}

export function resolveMenuItemSaleSize(
  value: unknown,
  assortment?: unknown,
): MenuSaleSizeResolution {
  const item = record(value);
  if (text(item.type, "composite", 30) === "service") return null;

  if (text(item.type, "composite", 30) === "ready" && assortment) {
    const linked = linkedProduct(item, assortment);
    if (linked?.packageLabel) {
      const parsed = parseLegacyMenuSaleSize(linked.packageLabel);
      if (parsed?.status === "confirmed") {
        return canonicalSize(
          parsed.quantity * linked.link.packagesPerSale,
          parsed.unit,
          "packaging",
          {
            linkedNomenclatureItemId: productId(linked.product),
            productKey: productKey(linked.product),
            packageLabel: linked.packageLabel,
          },
        );
      }
    }
  }

  const structured = record(item.saleSize);
  if (structured.status !== "needs_review") {
    const normalized = canonicalSize(
      structured.quantity,
      structured.unit,
      structured.source === "packaging" ? "packaging" : "manual",
      structured as Partial<MenuSaleSize>,
    );
    if (normalized) return normalized;
  }

  const legacy = text(
    structured.legacyValue ?? item.legacyPortionSize ?? item.portionSize ?? item.portion,
    "",
    120,
  );
  return parseLegacyMenuSaleSize(legacy);
}

export function resolveReadyProductConsumption(
  value: unknown,
  assortment: unknown,
): ReadyProductConsumption | null {
  const item = record(value);
  if (text(item.type, "", 30) !== "ready") return null;
  const linked = linkedProduct(item, assortment);
  if (!linked) return null;
  const unitDefinition = inventoryUnitDefinition(linked.product.unit ?? linked.product.baseUnit);
  const baseUnit = unitDefinition?.baseUnit
    ?? (text(linked.product.unit, "", 20) as BaseInventoryUnit);
  if (!(["ml", "g", "pcs"] as string[]).includes(baseUnit)) return null;

  let quantityPerSale = linked.link.packagesPerSale;
  if (linked.packageLabel && baseUnit !== "pcs") {
    const packaged = inventoryPackageAmount(linked.packageLabel, baseUnit);
    if (packaged.unit !== baseUnit || !(packaged.amount > 0)) return null;
    quantityPerSale = packaged.amount * linked.link.packagesPerSale;
  } else if (!linked.packageLabel) {
    const saleSize = resolveMenuItemSaleSize(item, assortment);
    if (!saleSize || saleSize.status !== "confirmed" || saleSize.baseUnit !== baseUnit) return null;
    quantityPerSale = saleSize.baseQuantity;
  }
  return {
    nomenclatureItemId: productId(linked.product),
    productKey: productKey(linked.product),
    productName: text(linked.product.name, text(item.name, "Готовый товар"), 240),
    quantityPerSale: rounded(quantityPerSale),
    baseUnit: baseUnit as Exclude<BaseInventoryUnit, "unknown">,
    packageLabel: linked.packageLabel,
  };
}

export function formatMenuSaleSize(value: MenuSaleSizeResolution): string {
  if (!value) return "";
  if (value.status === "needs_review") return value.legacyValue;
  const definition = INVENTORY_UNIT_DEFINITIONS.find((candidate) => candidate.code === value.unit);
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value.quantity)} ${definition?.label ?? value.unit}`;
}

export function menuItemSaleSizeLabel(value: unknown, assortment?: unknown): string {
  return formatMenuSaleSize(resolveMenuItemSaleSize(value, assortment));
}

export function normalizeMenuItemSaleSizeRecord(
  value: unknown,
  assortment?: unknown,
): JsonRecord {
  const item = { ...record(value) };
  if (text(item.type, "composite", 30) === "service") {
    delete item.saleSize;
    delete item.portionSize;
    delete item.legacyPortionSize;
    delete item.readyProduct;
    delete item.readyProductLink;
    return item;
  }
  const resolved = resolveMenuItemSaleSize(item, assortment);
  delete item.portionSize;
  if (!resolved) {
    delete item.saleSize;
    return item;
  }
  item.saleSize = resolved;
  if (resolved.status === "needs_review") item.legacyPortionSize = resolved.legacyValue;
  else delete item.legacyPortionSize;
  return item;
}

export function validateMenuItemSaleSize(value: unknown, assortment?: unknown): {
  ok: boolean;
  code?: "SALE_SIZE_REQUIRED" | "SALE_SIZE_NEEDS_REVIEW" | "READY_PRODUCT_MAPPING_INVALID";
  error?: string;
} {
  const item = record(value);
  if (text(item.type, "composite", 30) === "service") return { ok: true };
  const size = resolveMenuItemSaleSize(item, assortment);
  if (!size) return { ok: false, code: "SALE_SIZE_REQUIRED", error: "Укажите количество и единицу продажи." };
  if (size.status === "needs_review") {
    return {
      ok: false,
      code: "SALE_SIZE_NEEDS_REVIEW",
      error: `Проверьте прежнее значение «${size.legacyValue}» и выберите единицу.`,
    };
  }
  if (text(item.type, "", 30) === "ready" && readyProductLink(item) && assortment) {
    if (!resolveReadyProductConsumption(item, assortment)) {
      return {
        ok: false,
        code: "READY_PRODUCT_MAPPING_INVALID",
        error: "Выбранная фасовка несовместима со складской единицей готового товара.",
      };
    }
  }
  return { ok: true };
}

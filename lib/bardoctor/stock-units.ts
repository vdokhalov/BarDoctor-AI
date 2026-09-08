export type CanonicalStockUnit = "pcs" | "l" | "kg";
export type PhysicalUnit = CanonicalStockUnit | "ml" | "g";
export type UnitDimension = "COUNT" | "VOLUME" | "WEIGHT";

const definitions = {
  pcs: { dimension: "COUNT", canonicalUnit: "pcs", factor: 1 },
  l: { dimension: "VOLUME", canonicalUnit: "l", factor: 1 },
  ml: { dimension: "VOLUME", canonicalUnit: "l", factor: 0.001 },
  kg: { dimension: "WEIGHT", canonicalUnit: "kg", factor: 1 },
  g: { dimension: "WEIGHT", canonicalUnit: "kg", factor: 0.001 },
} as const;

export function physicalUnit(value: unknown): PhysicalUnit | null {
  const unit = String(value ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (["pcs", "piece", "pieces", "шт", "штука", "штуки", "штук"].includes(unit)) return "pcs";
  if (["l", "л", "литр", "литра", "литров"].includes(unit)) return "l";
  if (["ml", "мл", "миллилитр", "миллилитра", "миллилитров"].includes(unit)) return "ml";
  if (["kg", "кг", "килограмм", "килограмма", "килограммов"].includes(unit)) return "kg";
  if (["g", "г", "гр", "грамм", "грамма", "граммов"].includes(unit)) return "g";
  return null;
}

export function canonicalStockUnit(value: unknown): CanonicalStockUnit | null {
  const unit = physicalUnit(value);
  return unit ? definitions[unit].canonicalUnit : null;
}

function finite(value: unknown): number | null {
  if (value == null || typeof value === "string" && !value.trim() || typeof value === "boolean") return null;
  const result = Number(typeof value === "string" ? value.trim().replace(",", ".") : value);
  return Number.isFinite(result) ? result : null;
}

export function convertStockQuantity(quantity: unknown, from: unknown, to: unknown): number | null {
  const amount = finite(quantity);
  const source = physicalUnit(from);
  const target = physicalUnit(to);
  if (amount === null || !source || !target || definitions[source].dimension !== definitions[target].dimension) return null;
  const result = amount * definitions[source].factor / definitions[target].factor;
  return Number.isFinite(result) ? Math.round(result * 1e12) / 1e12 : null;
}

export type PurchasePackagingTemplate = {
  id: string;
  venueId: number;
  nomenclatureId: string;
  size: number;
  unit: PhysicalUnit;
  label?: string;
};

export type PurchaseConversionInput = {
  quantity: unknown;
  unit: unknown;
  stockUnit: unknown;
  price: unknown;
  totalCost?: unknown;
  packageContent?: { quantity: unknown; unit: unknown };
  templateId?: string;
  nomenclatureId?: string;
  venueId?: number;
};

export type PurchaseConversionSnapshot = {
  version: 4;
  input: {
    quantity: number;
    unit: string;
    price: number;
    packageContent?: { quantity: number; unit: PhysicalUnit };
  };
  canonicalQuantity: number;
  canonicalUnit: CanonicalStockUnit;
  conversionFactor: number;
  normalizedUnitCost: number;
  totalCost: number;
  provenance: { source: "direct" | "explicit_package" | "template_snapshot"; templateId?: string; venueId?: number; nomenclatureId?: string };
};

export type PurchaseConversionResult =
  | { ok: true; snapshot: PurchaseConversionSnapshot }
  | { ok: false; code: "PURCHASE_CONVERSION_NEEDS_REVIEW"; error: string };

/** No names, OCR guesses, current product packages or price ratios infer content. */
export function normalizePurchaseQuantity(
  input: PurchaseConversionInput,
  templates: readonly PurchasePackagingTemplate[] = [],
): PurchaseConversionResult {
  const fail = (error: string): PurchaseConversionResult => ({ ok: false, code: "PURCHASE_CONVERSION_NEEDS_REVIEW", error });
  const quantity = finite(input.quantity);
  const price = finite(input.price);
  const stockUnit = canonicalStockUnit(input.stockUnit);
  if (quantity === null || quantity <= 0 || price === null || price < 0 || !stockUnit) {
    return fail("Укажите количество больше нуля, цену и единицу складского учёта.");
  }
  let content = input.packageContent;
  let source: PurchaseConversionSnapshot["provenance"]["source"] = content ? "explicit_package" : "direct";
  if (input.templateId) {
    const matches = templates.filter((template) => template.id === input.templateId
      && template.venueId === input.venueId && template.nomenclatureId === input.nomenclatureId);
    if (!Number.isSafeInteger(input.venueId) || !(Number(input.venueId) > 0) || !input.nomenclatureId || matches.length !== 1 || content) {
      return fail("Выберите один шаблон упаковки этого товара и заведения либо введите содержимое вручную.");
    }
    content = { quantity: matches[0].size, unit: matches[0].unit };
    source = "template_snapshot";
  }
  const contentQuantity = content ? finite(content.quantity) : 1;
  const contentUnit = physicalUnit(content ? content.unit : input.unit);
  if (contentQuantity === null || contentQuantity <= 0 || !contentUnit) {
    return fail("Неизвестно содержимое упаковки. Укажите количество и физическую единицу внутри.");
  }
  const factor = convertStockQuantity(contentQuantity, contentUnit, stockUnit);
  if (factor === null || factor <= 0) return fail("Единица прихода несовместима со складской единицей товара.");
  const canonicalQuantity = Math.round(quantity * factor * 1e12) / 1e12;
  const computedTotal = quantity * price;
  const suppliedTotal = input.totalCost === undefined ? computedTotal : finite(input.totalCost);
  if (suppliedTotal === null || suppliedTotal < 0 || !Number.isFinite(computedTotal)
    || !Number.isFinite(canonicalQuantity) || canonicalQuantity <= 0
    || Math.abs(suppliedTotal - computedTotal) > Math.max(0.01, Math.abs(computedTotal) * 1e-8)) {
    return fail("Количество × цена должно совпадать с суммой строки; проверьте введённые значения.");
  }
  return { ok: true, snapshot: {
    version: 4,
    input: { quantity, unit: String(input.unit ?? ""), price,
      ...(content ? { packageContent: { quantity: contentQuantity, unit: contentUnit } } : {}) },
    canonicalQuantity, canonicalUnit: stockUnit, conversionFactor: factor,
    normalizedUnitCost: suppliedTotal / canonicalQuantity, totalCost: suppliedTotal,
    provenance: { source, ...(input.templateId ? { templateId: input.templateId } : {}),
      ...(input.venueId ? { venueId: input.venueId } : {}),
      ...(input.nomenclatureId ? { nomenclatureId: input.nomenclatureId } : {}) },
  } };
}

/** Verify persisted arithmetic using captured content only, never today's template. */
export function validatePurchaseConversionSnapshot(value: unknown): PurchaseConversionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as PurchaseConversionSnapshot;
  if (snapshot.version !== 4 || !snapshot.input || !snapshot.provenance) return null;
  if (!["direct", "explicit_package", "template_snapshot"].includes(snapshot.provenance.source)) return null;
  if (snapshot.provenance.source === "template_snapshot" && (!snapshot.input.packageContent
    || !snapshot.provenance.templateId || !snapshot.provenance.nomenclatureId
    || !Number.isSafeInteger(snapshot.provenance.venueId) || !(Number(snapshot.provenance.venueId) > 0))) return null;
  const checked = normalizePurchaseQuantity({ ...snapshot.input, stockUnit: snapshot.canonicalUnit,
    totalCost: snapshot.totalCost });
  if (!checked.ok) return null;
  for (const key of ["canonicalQuantity", "conversionFactor", "normalizedUnitCost", "totalCost"] as const) {
    if (typeof snapshot[key] !== "number" || !Number.isFinite(snapshot[key])
      || Math.abs(snapshot[key] - checked.snapshot[key]) > 1e-10 * Math.max(1, Math.abs(checked.snapshot[key]))) return null;
  }
  if (snapshot.canonicalUnit !== checked.snapshot.canonicalUnit) return null;
  return structuredClone(snapshot);
}

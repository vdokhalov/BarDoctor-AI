import { canonicalSupplierMappings } from "./nomenclature-identity";

export const INVOICE_MAPPING_STORE_KEY = "bd_invoice_supplier_mappings_v2";

export type InvoiceRecognitionMode = "legacy" | "shadow" | "primary";
export type RecognitionConfidence = "high" | "medium" | "low";

export type OcrBounds = { x: number; y: number; width: number; height: number };

export type OcrLine = {
  text: string;
  confidence: number | null;
  bounds?: OcrBounds;
  page?: number;
};

export type InvoiceOcrResult = {
  rawText: string;
  lines: OcrLine[];
  confidence: number | null;
  durationMs: number;
  engine?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SupplierItemMapping = {
  id: string;
  sourceItemKey?: string;
  venueId: number;
  supplierId: string;
  rawName: string;
  normalizedRawName: string;
  packageFingerprint?: string;
  purchaseUnit?: string;
  supplierArticle?: string;
  barcode?: string;
  nomenclatureId: string;
  confirmedByAccountId?: number;
  confirmations: number;
  createdAt: string;
  updatedAt: string;
};

export type NomenclatureCandidate = {
  id: string;
  key: string;
  name: string;
  unit: string;
  packageSize: string;
  aliases: string[];
  supplierArticles?: string[];
  barcodes?: string[];
};

export type NomenclatureCandidateReference = {
  id: string;
  key: string;
  name: string;
  score: number;
  unit?: string;
  packageSize?: string;
};

export type ParsedInvoiceLine = {
  id: string;
  rawName: string;
  normalizedRawName: string;
  name: string;
  quantity: number;
  unit: string;
  packageSize?: string;
  supplierArticle?: string;
  barcode?: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
  confidenceLevel: RecognitionConfidence;
  purchaseProductKey?: string;
  nomenclatureId?: string;
  nomenclatureName?: string;
  mappingSource?: "history" | "supplier_identifier" | "exact_alias" | "fuzzy" | "ai" | "manual";
  mappingCandidates?: NomenclatureCandidateReference[];
  matchReason?: string;
  alternateNomenclatureId?: string;
  requiresReview: boolean;
};

export type ParsedInvoiceDocument = {
  documentType: "receipt" | "invoice" | "price_list";
  supplierId?: string;
  supplierName: string;
  supplierType: "retail" | "wholesale";
  date?: string;
  documentNumber?: string;
  currency: string;
  paymentMethod: "cash" | "card" | "transfer" | "unknown";
  total: number;
  vat?: number;
  confidence: number;
  warnings: string[];
  items: ParsedInvoiceLine[];
};

export type InvoiceRecognitionMetrics = {
  pipeline: "invoice_recognition_v2";
  mode: InvoiceRecognitionMode;
  ocrDurationMs: number;
  ocrSuccess: boolean;
  ocrDetectedLinesCount: number;
  ocrDuplicateLinesCount: number;
  ocrConfidence: number | null;
  ocrEngine: string | null;
  parsedLinesCount: number;
  nomenclatureCandidatesCount: number;
  matchingDurationMs: number;
  historicalMappingsCount: number;
  exactCanonicalMatchesCount: number;
  exactMappingsCount: number;
  fuzzyMappingsCount: number;
  fuzzyHighMappingsCount: number;
  fuzzyMediumCandidatesCount: number;
  unresolvedCount: number;
  manualRequiredCount: number;
  aiFallbackLinesCount: number;
  aiRequestCount: number;
  aiTokenUsage: number | null;
  aiEstimatedInputTokens: number;
  aiEstimatedOutputTokens: number;
  aiEstimatedTokenUsage: number;
  aiHighCount: number;
  aiMediumCount: number;
  aiNoMatchCount: number;
  totalDurationMs: number;
};

export type InvoiceRecognitionGroundTruth = {
  supplierName?: string;
  documentNumber?: string;
  date?: string;
  currency?: string;
  total?: number;
  items: Array<{
    rawName: string;
    quantity?: number;
    unitPrice?: number;
    lineTotal?: number;
  }>;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 400): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function normalizeInvoiceNumericToken(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  const compact = value.trim().replace(/[\s\u00a0\u202f]+/g, "").replace(/[^0-9+.,-]/g, "");
  if (!compact) return "";
  return compact.includes(",") && compact.includes(".")
    ? compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "")
    : compact.replace(",", ".");
}

function numeric(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(normalizeInvoiceNumericToken(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function currency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function invoiceCommercialArithmeticIsValid(
  quantityValue: unknown,
  unitPriceValue: unknown,
  lineTotalValue: unknown,
): boolean {
  const quantity = numeric(quantityValue);
  const unitPrice = numeric(unitPriceValue);
  const lineTotal = numeric(lineTotalValue);
  if (quantity <= 0 || unitPrice <= 0 || lineTotal <= 0) return false;
  return Math.abs(currency(quantity * unitPrice) - currency(lineTotal)) <= 0.011;
}

export function invoiceRecognitionMode(environment: Record<string, unknown>): InvoiceRecognitionMode {
  const requested = text(environment.INVOICE_RECOGNITION_V2_MODE, "legacy", 20).toLocaleLowerCase("en-US");
  return requested === "primary" || requested === "shadow" ? requested : "legacy";
}

export function invoiceRecognitionRequestMode(input: {
  environment: Record<string, unknown>;
  role: string;
  requestedQaMode?: string | null;
}): {
  configuredMode: InvoiceRecognitionMode;
  activeMode: InvoiceRecognitionMode;
  qaMode: "shadow" | "ai-unavailable" | null;
  simulateAiUnavailable: boolean;
} {
  const configuredMode = invoiceRecognitionMode(input.environment);
  const qaMode = input.role === "owner" && configuredMode === "legacy"
    ? input.requestedQaMode === "shadow" || input.requestedQaMode === "ai-unavailable"
      ? input.requestedQaMode
      : null
    : null;
  return {
    configuredMode,
    activeMode: qaMode === "shadow" ? "shadow" : qaMode === "ai-unavailable" ? "primary" : configuredMode,
    qaMode,
    simulateAiUnavailable: qaMode === "ai-unavailable",
  };
}

export function normalizeInvoiceText(value: unknown): string {
  return text(value, "", 500)
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/(\d)[,.](\d)/g, "$1.$2")
    .replace(/(\d)\s*(?:миллилитров?|milliliters?|millilitres?|мл|ml)(?=\s|$|[.,;])/gi, "$1 ml ")
    .replace(/(\d)\s*(?:литров?|liters?|litres?|ltr|lt|л|l)(?=\s|$|[.,;])/gi, "$1 l ")
    .replace(/(\d)\s*(?:килограммов?|kilograms?|kgs?|кг|kg)(?=\s|$|[.,;])/gi, "$1 kg ")
    .replace(/(\d)\s*(?:граммов?|grams?|гр|г|g)(?=\s|$|[.,;])/gi, "$1 g ")
    .replace(/(\d)\s*(?:штук[аи]?|pieces?|pcs|шт)(?=\s|$|[.,;])/gi, "$1 pcs ")
    .replace(/\b(?:liters?|litres?|ltr|lt|л[.]?)\b/gi, " l ")
    .replace(/\b(?:milliliters?|millilitres?|ml|мл[.]?)\b/gi, " ml ")
    .replace(/\b(?:kilograms?|kgs?|кг[.]?)\b/gi, " kg ")
    .replace(/\b(?:grams?|гр?|г[.]?)\b/gi, " g ")
    .replace(/\b(?:pieces?|pcs|шт[.]?)\b/gi, " pcs ")
    .replace(/(?:пэт|pet)/gi, " pet ")
    .replace(/(?:бутылк[аи]?|бут[.]?|bottles?|btl)/gi, " bottle ")
    .replace(/(?:упаковк[аи]?|уп[.]?|packs?|pkg)/gi, " pack ")
    .replace(/(?:пачк[аи]?|пач[.]?)/gi, " pack ")
    .replace(/\.(?=\s|$)/g, " ")
    .replace(/[^a-zа-я0-9.]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameShadowCommercialLine(
  legacy: Record<string, unknown>,
  shadow: Record<string, unknown>,
): boolean {
  return Math.abs(numeric(legacy.quantity) - numeric(shadow.quantity)) <= 0.001
    && Math.abs(numeric(legacy.unitPrice) - numeric(shadow.unitPrice)) <= 0.01
    && Math.abs(numeric(legacy.lineTotal) - numeric(shadow.lineTotal)) <= 0.01;
}

/**
 * Shadow keeps the legacy document authoritative, but the review UI still needs
 * V2's canonical matching evidence. Only matching metadata is copied; supplier,
 * quantities, prices, totals and the displayed legacy names are never replaced.
 */
export function mergeShadowMappingMetadata(
  legacyValue: unknown,
  shadowDocument: ParsedInvoiceDocument,
): Record<string, unknown> {
  const legacy = record(legacyValue);
  const legacyItems = values(legacy.items).map(record);
  const shadowItems = shadowDocument.items.map((item) => record(item));
  const used = new Set<number>();
  const items = legacyItems.map((legacyItem, index) => {
    const legacyName = normalizeInvoiceText(legacyItem.rawName ?? legacyItem.name);
    let shadowIndex = shadowItems.findIndex((shadowItem, candidateIndex) => {
      if (used.has(candidateIndex)) return false;
      const names = [shadowItem.normalizedRawName, shadowItem.rawName, shadowItem.name]
        .map(normalizeInvoiceText)
        .filter(Boolean);
      return Boolean(legacyName) && names.includes(legacyName);
    });
    if (
      shadowIndex < 0
      && shadowItems[index]
      && !used.has(index)
      && sameShadowCommercialLine(legacyItem, shadowItems[index])
    ) {
      shadowIndex = index;
    }
    if (shadowIndex < 0) return legacyItem;
    used.add(shadowIndex);
    const shadow = shadowItems[shadowIndex];
    return {
      ...legacyItem,
      rawName: text(shadow.rawName ?? shadow.name, "", 300) || undefined,
      normalizedRawName: text(shadow.normalizedRawName, "", 500) || undefined,
      purchaseProductKey: text(shadow.purchaseProductKey, "", 300) || undefined,
      nomenclatureId: text(shadow.nomenclatureId, "", 300) || undefined,
      nomenclatureName: text(shadow.nomenclatureName, "", 300)
        || values(shadow.mappingCandidates).map(record).find((candidate) =>
          text(candidate.id, "", 300) === text(shadow.nomenclatureId, "", 300)
          || text(candidate.key, "", 300) === text(shadow.purchaseProductKey, "", 300)
        )?.name
        || undefined,
      mappingSource: shadow.mappingSource,
      confidenceLevel: shadow.confidenceLevel,
      mappingCandidates: values(shadow.mappingCandidates),
      requiresReview: shadow.requiresReview === true
        || shadow.mappingSource === "ai"
        || !invoiceCommercialArithmeticIsValid(legacyItem.quantity, legacyItem.unitPrice, legacyItem.lineTotal),
    };
  });
  return {
    ...legacy,
    supplierId: text(legacy.supplierId, "", 300) || shadowDocument.supplierId,
    items,
  };
}

function repairInvoicePackageMarker(value: string): string {
  return value.replace(
    /(^|\s)(л|l|п|p|pet)\s*[.:/-]?\s*!(?=\s|$)/giu,
    "$1$2.1",
  );
}

export function packageFingerprint(value: unknown): string {
  const source = repairInvoicePackageMarker(text(value, "", 500))
    .toLocaleLowerCase("ru-RU")
    .replace(/(\d),(\d)/g, "$1.$2");
  const normalized = normalizeInvoiceText(source);
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg|pcs)\b/)
    ?? source.match(/(?:^|\s)(ml|l|g|kg|мл|л|г|кг)\s*[.:/-]?\s*(\d+(?:\.\d+)?)(?=\s|$)/)
    ?? source.match(/(?:^|\s)(?:pet|p|п)\s*[.:/-]?\s*(\d+(?:\.\d+)?)(?=\s|$)/);
  if (!match) return "";
  const reversed = ["ml", "l", "g", "kg", "мл", "л", "г", "кг"].includes(match[1]);
  const rawUnit = reversed ? match[1] : (match[2] ?? "l");
  const unit = ({ мл: "ml", л: "l", г: "g", кг: "kg" } as Record<string, string>)[rawUnit] ?? rawUnit;
  const amount = numeric(reversed ? match[2] : match[1]);
  if (unit === "l") return `ml:${Math.round(amount * 1_000)}`;
  if (unit === "kg") return `g:${Math.round(amount * 1_000)}`;
  return `${unit}:${Math.round(amount * 1_000) / 1_000}`;
}

type InvoiceIdentity = {
  packageFingerprint: string;
  packageCount: number | null;
  packageType: string | null;
  baseUnit: string;
  variants: Set<string>;
};

const VARIANT_GROUPS = [
  ["gas", "still"],
  ["light", "dark"],
  ["dry", "semi_dry", "sweet", "semi_sweet"],
] as const;

function invoiceIdentity(value: unknown, unit?: unknown, packageSize?: unknown): InvoiceIdentity {
  const source = `${text(value)} ${text(packageSize)}`.toLocaleLowerCase("ru-RU").replace(/(\d),(\d)/g, "$1.$2");
  const normalized = normalizeInvoiceText(source);
  const multiplier = source.match(/(?:^|\s)(\d{1,3})\s*[x×*]\s*\d+(?:\.\d+)?\s*(?:мл|ml|л|l|кг|kg|г|g|шт|pcs)(?=\s|$)/i);
  const packageType = /(?:^|\s)(?:bottle|but|бутыл\p{L}*)(?:\s|$)/u.test(normalized) ? "bottle"
    : /(?:^|\s)(?:can|bank|банк\p{L}*)(?:\s|$)/u.test(normalized) ? "can"
    : /(?:^|\s)(?:box|короб\p{L}*)(?:\s|$)/u.test(normalized) ? "box"
    : /(?:^|\s)(?:pack|упаков\p{L}*|пачк\p{L}*)(?:\s|$)/u.test(normalized) ? "pack"
    : null;
  const variants = new Set<string>();
  if (/(?:^|\s)(?:негаз\p{L}*|still)(?:\s|$)/u.test(normalized)) variants.add("still");
  else if (/(?:^|\s)(?:газирован\p{L}*|газ|sparkling)(?:\s|$)/u.test(normalized)) variants.add("gas");
  if (/(?:^|\s)(?:темн\p{L}*|dark)(?:\s|$)/u.test(normalized)) variants.add("dark");
  else if (/(?:^|\s)(?:светл\p{L}*|light)(?:\s|$)/u.test(normalized)) variants.add("light");
  if (/(?:^|\s)(?:полусух\p{L}*|semi dry)(?:\s|$)/u.test(normalized)) variants.add("semi_dry");
  else if (/(?:^|\s)(?:полуслад\p{L}*|semi sweet)(?:\s|$)/u.test(normalized)) variants.add("semi_sweet");
  else if (/(?:^|\s)(?:сух\p{L}*|dry)(?:\s|$)/u.test(normalized)) variants.add("dry");
  else if (/(?:^|\s)(?:слад\p{L}*|sweet)(?:\s|$)/u.test(normalized)) variants.add("sweet");
  return {
    packageFingerprint: packageFingerprint(normalized),
    packageCount: multiplier ? numeric(multiplier[1]) : null,
    packageType,
    baseUnit: canonicalPurchaseUnit(unit),
    variants,
  };
}

export function invoiceIdentityConflicts(input: {
  rawName: unknown;
  unit?: unknown;
  packageSize?: unknown;
  supplierArticle?: unknown;
  barcode?: unknown;
}, candidate: NomenclatureCandidate): string[] {
  const source = invoiceIdentity(input.rawName, input.unit, input.packageSize);
  const target = invoiceIdentity(candidate.name, candidate.unit, candidate.packageSize);
  const conflicts: string[] = [];
  if (source.packageFingerprint && target.packageFingerprint && source.packageFingerprint !== target.packageFingerprint) {
    conflicts.push(source.packageFingerprint.startsWith("g:") || target.packageFingerprint.startsWith("g:") ? "weight" : "volume");
  }
  if (source.packageCount && target.packageCount && source.packageCount !== target.packageCount) conflicts.push("package_quantity");
  if (source.packageType && target.packageType && source.packageType !== target.packageType) conflicts.push("package_type");
  if (source.baseUnit && target.baseUnit && source.baseUnit !== target.baseUnit) {
    const countedPackage = (source.baseUnit === "pcs" || target.baseUnit === "pcs")
      && Boolean(source.packageFingerprint && target.packageFingerprint && source.packageFingerprint === target.packageFingerprint);
    if (!countedPackage) conflicts.push("unit");
  }
  for (const group of VARIANT_GROUPS) {
    const sourceVariant = group.find((variant) => source.variants.has(variant));
    const targetVariant = group.find((variant) => target.variants.has(variant));
    if (sourceVariant && targetVariant && sourceVariant !== targetVariant) conflicts.push("canonical_variant");
  }
  const article = text(input.supplierArticle, "", 160);
  if (article && candidate.supplierArticles?.length && !candidate.supplierArticles.includes(article)) conflicts.push("supplier_article");
  const barcode = text(input.barcode, "", 160);
  if (barcode && candidate.barcodes?.length && !candidate.barcodes.includes(barcode)) conflicts.push("barcode");
  return [...new Set(conflicts)];
}

export function hasStrongInvoiceIdentityEvidence(line: ParsedInvoiceLine, candidate: NomenclatureCandidate): boolean {
  const exactCanonicalName = normalizeInvoiceText(line.rawName) === normalizeInvoiceText(candidate.name);
  const source = invoiceIdentity(line.rawName, line.unit, line.packageSize);
  const target = invoiceIdentity(candidate.name, candidate.unit, candidate.packageSize);
  const packageEvidence = Boolean(source.packageFingerprint && target.packageFingerprint);
  const identifierEvidence = Boolean(
    (line.supplierArticle && candidate.supplierArticles?.includes(line.supplierArticle))
    || (line.barcode && candidate.barcodes?.includes(line.barcode))
  );
  const variantsComplete = VARIANT_GROUPS.every((group) => {
    const sourceVariant = group.find((variant) => source.variants.has(variant));
    const targetVariant = group.find((variant) => target.variants.has(variant));
    return !sourceVariant && !targetVariant || sourceVariant === targetVariant;
  });
  const packageShapeComplete = source.packageCount === target.packageCount
    && source.packageType === target.packageType;
  return identifierEvidence || (variantsComplete && packageShapeComplete && (exactCanonicalName || packageEvidence));
}

function bounded(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1_000) / 1_000));
}

function packageLabelFromFingerprint(fingerprint: string): string | undefined {
  const [unit, amountText] = fingerprint.split(":");
  const amount = numeric(amountText);
  if (!unit || amount <= 0) return undefined;
  if (unit === "ml" && amount % 1_000 === 0) return `${amount / 1_000} л`;
  if (unit === "g" && amount % 1_000 === 0) return `${amount / 1_000} кг`;
  if (unit === "ml") return `${amount} мл`;
  if (unit === "g") return `${amount} г`;
  if (unit === "pcs") return `${amount} шт.`;
  return undefined;
}

function canonicalPurchaseUnit(value: unknown): string {
  const normalized = text(value, "", 30).toLocaleLowerCase("ru-RU").replace(/[.\s]/g, "");
  if (["кг", "kg", "г", "гр", "g"].includes(normalized)) return "g";
  if (["л", "l", "lt", "мл", "ml"].includes(normalized)) return "ml";
  if (["шт", "pcs", "pc", "piece", "ед", "уп", "бут"].includes(normalized)) return "pcs";
  return normalizeInvoiceText(value);
}

/**
 * Legacy vision results sometimes used a dimensional unit for a package count
 * (for example quantity=12, unit="л", packageSize="0.5 л").  Treating that as
 * 12 measured litres loses the package constraint and doubles the receipt.
 * Conversely, older drafts also copied the total measured amount into the
 * package label (quantity=10 l, packageSize="10 l").  That label is metadata,
 * not ten ten-litre containers.
 */
export function normalizeInvoicePackageSemantics(input: {
  quantity: unknown;
  unit: unknown;
  packageSize?: unknown;
  preserveMeasuredUnit?: boolean;
}): { unit: string; packageSize?: string } {
  const unit = text(input.unit, "шт.", 20);
  const packageSize = text(input.packageSize, "", 80) || undefined;
  const packageIdentity = packageFingerprint(packageSize);
  const baseUnit = canonicalPurchaseUnit(unit);
  if (!packageSize || !packageIdentity || !["ml", "g"].includes(baseUnit)) {
    return { unit, packageSize };
  }
  const [packageUnit, packageAmountText] = packageIdentity.split(":");
  const packageAmount = numeric(packageAmountText);
  if (packageUnit !== baseUnit || packageAmount <= 0) return { unit, packageSize };

  const normalizedUnit = text(unit, "", 20).toLocaleLowerCase("ru-RU").replace(/[.\s]/g, "");
  const quantity = Math.max(0, numeric(input.quantity));
  const quantityBase = baseUnit === "ml"
    ? quantity * (["l", "lt", "л"].includes(normalizedUnit) ? 1_000 : 1)
    : quantity * (["kg", "кг"].includes(normalizedUnit) ? 1_000 : 1);
  const sameAsMeasuredTotal = quantityBase > 0
    && Math.abs(packageAmount - quantityBase) <= Math.max(0.001, quantityBase * 0.0001);
  if (sameAsMeasuredTotal) {
    return { unit, packageSize: baseUnit === "ml" ? "л" : "кг" };
  }
  if (!input.preserveMeasuredUnit && Number.isInteger(quantity) && quantity >= 1) {
    return { unit: "шт.", packageSize };
  }
  return { unit, packageSize };
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function phonetic(value: string): string {
  return [...value]
    .map((letter) => CYRILLIC_TO_LATIN[letter] ?? letter)
    .join("")
    .replace(/c(?=[aou])/g, "k")
    .replace(/q/g, "k");
}

export function confidenceLevel(score: number, margin = 1): RecognitionConfidence {
  if (score >= 0.88 && margin >= 0.1) return "high";
  if (score >= 0.66) return "medium";
  return "low";
}

function isoDate(value: string): string | undefined {
  const match = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
    ?? value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  let year: string;
  let month: string;
  let day: string;
  if (match) {
    year = match[1].length === 4 ? match[1] : match[3];
    month = match[2];
    day = match[1].length === 4 ? match[3] : match[1];
  } else {
    const monthNames: Record<string, string> = {
      января: "01", февраля: "02", марта: "03", апреля: "04", мая: "05", июня: "06",
      июля: "07", августа: "08", сентября: "09", октября: "10", ноября: "11", декабря: "12",
    };
    const words = value.toLocaleLowerCase("ru-RU").match(
      /\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(20\d{2})\b/,
    );
    if (!words) return undefined;
    day = words[1];
    month = monthNames[words[2]];
    year = words[3];
  }
  const result = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${result}T00:00:00Z`)) ? undefined : result;
}

function detectedCurrency(rawText: string): string {
  if (/\b(?:MDL|LEI|ЛЕЙ|ЛЕЕВ)\b/i.test(rawText)) return "MDL";
  if (/\b(?:EUR|EURO|ЕВРО|€)\b/i.test(rawText)) return "EUR";
  if (/\b(?:USD|US DOLLAR|ДОЛЛАР|\$)\b/i.test(rawText)) return "USD";
  if (/\b(?:UAH|ГРН|₴)\b/i.test(rawText)) return "UAH";
  if (/\b(?:RON)\b/i.test(rawText)) return "RON";
  return "RUB";
}

function isHeaderOrTotalLine(value: string): boolean {
  const normalized = normalizeInvoiceText(value);
  return /^(?:итого|всего|total|сумма|ндс|vat|скидка|discount|номер|накладная|invoice|дата)\b/.test(normalized);
}

export function parseInvoiceLine(value: unknown, index = 0): ParsedInvoiceLine | null {
  const raw = text(value, "", 500);
  if (!raw || isHeaderOrTotalLine(raw)) return null;
  const cleaned = repairInvoicePackageMarker(raw)
    .replace(/[|¦\[\]]/g, " ")
    .replace(/[₽€$]/g, " ")
    .replace(/^\s*\d{1,3}[.)]?\s+(?=\p{L})/u, "")
    .replace(/\s+/g, " ")
    .replace(/(?:^|\s)(кг|г|л|мл|шт|pcs)\s+\1\s+(?=\d)/i, " $1 ")
    .trim();
  const unitBeforeQuantity = cleaned.match(
    /^(.{2,}?)\s+(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)$/i,
  );
  const unitBeforeQuantityIsValid = Boolean(unitBeforeQuantity
    && invoiceCommercialArithmeticIsValid(unitBeforeQuantity[3], unitBeforeQuantity[4], unitBeforeQuantity[5]));
  const canonicalOrder = unitBeforeQuantityIsValid && unitBeforeQuantity
    ? `${unitBeforeQuantity[1]} ${unitBeforeQuantity[3]} ${unitBeforeQuantity[2]} ${unitBeforeQuantity[4]} ${unitBeforeQuantity[5]}`
    : cleaned;
  const match = canonicalOrder.match(
    /^(.{2,}?)\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)\s*(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)?\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)\s+(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)$/i,
  );
  if (!match) return null;
  const rawNameWithUnits = match[1].trim();
  const trailingUnit = rawNameWithUnits.match(/(?:^|\s)(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)\s*$/i)?.[1];
  const parsedUnit = match[3] ?? trailingUnit;
  const barcode = rawNameWithUnits.match(/\b\d{8,14}\b/)?.[0];
  const supplierArticle = rawNameWithUnits.match(/\b(?:арт(?:икул)?|article|sku|код)\s*[:#-]?\s*([a-zа-я0-9][a-zа-я0-9._/-]{2,39})\b/i)?.[1];
  const packageMatch = rawNameWithUnits.match(/(?:^|\s)\d+(?:[.,]\d+)?\s*(?:мл|ml|л|l|кг|kg|г|g)(?=\s|$)/i)
    ?? rawNameWithUnits.match(/(?:^|\s)(?:мл|ml|л|l|кг|kg|г|g)\s*[.,:/-]?\s*\d+(?:[.,]\d+)?(?=\s|$)/i)
    ?? ((canonicalPurchaseUnit(parsedUnit) === "ml")
      ? rawNameWithUnits.match(/(?:^|\s)(?:п|pet)\s*[.,:/-]?\s*\d+(?:[.,]\d+)?(?=\s|$)/i)
      : null);
  const rawName = rawNameWithUnits
    .replace(/(?:\s+(?:мл|ml|л|l|кг|kg|г|g|шт|pcs)[.!]*){1,2}$/i, "")
    .replace(/(?:^|\s)(?:л|l|п|p|pet)\s*[.:/-]\s*1(?=\s|$)/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const quantity = numeric(match[2]);
  const unitPrice = numeric(match[4]);
  const lineTotal = numeric(match[5]);
  if (!rawName || quantity <= 0 || (unitPrice <= 0 && lineTotal <= 0)) return null;
  const arithmetic = invoiceCommercialArithmeticIsValid(quantity, unitPrice, lineTotal);
  const score = arithmetic ? 0.9 : 0.72;
  const packageSemantics = normalizeInvoicePackageSemantics({
    quantity,
    unit: text(parsedUnit, "шт.", 20),
    packageSize: packageMatch ? packageLabelFromFingerprint(packageFingerprint(packageMatch[0])) : undefined,
    preserveMeasuredUnit: true,
  });
  return {
    id: `ocr-line-${index + 1}`,
    rawName,
    normalizedRawName: normalizeInvoiceText(rawName),
    name: rawName,
    quantity,
    unit: packageSemantics.unit,
    packageSize: packageSemantics.packageSize,
    supplierArticle,
    barcode,
    unitPrice: Math.round(unitPrice * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
    confidence: score,
    confidenceLevel: confidenceLevel(score),
    requiresReview: !arithmetic,
  };
}

/**
 * Adapts the already structured legacy recognition result to the Hybrid V2
 * matching contract. This is intentionally a matching-only bridge: it does
 * not reinterpret the image, call an OCR provider, or trust canonical IDs
 * proposed by the legacy vision prompt.
 */
export function parsedInvoiceDocumentFromLegacy(value: unknown): ParsedInvoiceDocument {
  const source = record(value);
  const documentConfidence = bounded(numeric(source.confidence ?? source.documentConfidence, 0.5));
  const items = values(source.items).slice(0, 1_000).map((itemValue, index): ParsedInvoiceLine | null => {
    const item = record(itemValue);
    const rawName = text(item.rawName ?? item.name, "", 300);
    const quantity = Math.max(0, numeric(item.quantity));
    const unitPrice = Math.max(0, numeric(item.unitPrice ?? item.price));
    const lineTotal = Math.max(0, numeric(item.lineTotal ?? item.total, quantity * unitPrice));
    if (!rawName || quantity <= 0 || (unitPrice <= 0 && lineTotal <= 0)) return null;
    const confidence = bounded(numeric(item.confidence, documentConfidence));
    const packageSemantics = normalizeInvoicePackageSemantics({
      quantity,
      unit: text(item.unit, "шт.", 20),
      packageSize: item.packageSize,
    });
    return {
      id: text(item.id, `legacy-line-${index + 1}`, 160),
      rawName,
      normalizedRawName: normalizeInvoiceText(rawName),
      name: rawName,
      quantity: Math.round(quantity * 1_000) / 1_000,
      unit: packageSemantics.unit,
      packageSize: packageSemantics.packageSize,
      supplierArticle: text(item.supplierArticle ?? item.article ?? item.sku, "", 80) || undefined,
      barcode: text(item.barcode, "", 80) || undefined,
      unitPrice: currency(unitPrice),
      lineTotal: currency(lineTotal),
      confidence,
      confidenceLevel: confidenceLevel(confidence),
      requiresReview: !invoiceCommercialArithmeticIsValid(quantity, unitPrice, lineTotal),
    };
  }).filter((item): item is ParsedInvoiceLine => Boolean(item));
  const itemTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const requestedTotal = Math.max(0, numeric(source.total));
  const type = text(source.documentType ?? source.type, "invoice", 30);
  const payment = text(source.paymentMethod, "unknown", 30);
  return {
    documentType: type === "receipt" || type === "price_list" ? type : "invoice",
    supplierName: text(source.supplierName ?? source.storeName ?? source.vendorName, "Новый поставщик", 180),
    supplierType: source.supplierType === "retail" || type === "receipt" ? "retail" : "wholesale",
    date: text(source.date, "", 40) || undefined,
    documentNumber: text(source.documentNumber ?? source.number, "", 100) || undefined,
    currency: text(source.currency, "RUB", 8).toUpperCase(),
    paymentMethod: payment === "cash" || payment === "card" || payment === "transfer" ? payment : "unknown",
    total: Math.round((requestedTotal || itemTotal) * 100) / 100,
    vat: numeric(source.vat) > 0 ? Math.round(numeric(source.vat) * 100) / 100 : undefined,
    confidence: documentConfidence,
    warnings: values(source.warnings).map((warning) => text(warning, "", 240)).filter(Boolean).slice(0, 12),
    items,
  };
}

function headerSupplier(lines: OcrLine[], rawText: string): string {
  const explicit = rawText.match(/^\s*(?:поставщик|supplier)\s*[:=-]\s*([^\r\n]{2,180})/im)?.[1]
    ?.replace(/[|¦]+$/g, "")
    .trim();
  if (explicit) return explicit;
  for (const line of lines.slice(0, 12)) {
    const current = text(line.text, "", 180);
    if (!current || current.length < 3 || /^\s*(?:инн|кпп|адрес|тел|дата|номер|накладная|invoice)\b/i.test(current)) continue;
    if (/\p{L}/u.test(current) && !/\d{4,}/.test(current)) return current;
  }
  return "Новый поставщик";
}

export function structuredRowsFromVerticalTable(rawText: string): string[] {
  const cells = rawText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const header = cells.findIndex((value, index) =>
    /^(?:№|no)$/i.test(value)
    && /^товар$/i.test(cells[index + 1] ?? "")
    && /^мест$/i.test(cells[index + 2] ?? "")
    && /^количество$/i.test(cells[index + 3] ?? "")
    && /^цена$/i.test(cells[index + 4] ?? "")
    && /^сумма$/i.test(cells[index + 5] ?? "")
  );
  if (header < 0) return [];
  const rows: string[] = [];
  for (let index = header + 6; index + 5 < cells.length;) {
    const rowNumber = cells[index].match(/^(\d{1,3})[.)]?$/)?.[1];
    if (!rowNumber || /^(?:итого|всего|total)\b/i.test(cells[index])) break;
    const [name, unit, quantityText, priceText, totalText] = cells.slice(index + 1, index + 6);
    const quantityMatch = quantityText?.match(/^(\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)\s*(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)?$/i);
    const unitMatch = unit?.match(/^(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)$/i);
    const priceMatch = priceText?.match(/^(?:\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)$/);
    const totalMatch = totalText?.match(/^(?:\d{1,3}(?:\s+\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)$/);
    const quantity = numeric(quantityMatch?.[1]);
    const price = numeric(priceMatch?.[0]);
    const total = numeric(totalMatch?.[0]);
    const arithmetic = invoiceCommercialArithmeticIsValid(quantity, price, total);
    if (!name || !/\p{L}/u.test(name) || !unitMatch || !quantityMatch || !priceMatch || !totalMatch || !arithmetic) break;
    rows.push(`${rowNumber} | ${name} | ${unit} | ${quantityText} | ${priceText} | ${totalText}`);
    index += 6;
  }
  return rows;
}

function parseRejectionReason(value: string): string | null {
  if (!value.trim()) return "empty";
  if (isHeaderOrTotalLine(value)) return "header_or_total";
  if (!/\p{L}/u.test(value)) return "no_product_text";
  return parseInvoiceLine(value) ? null : "column_pattern_not_parseable";
}

export function invoiceOcrStageTrace(ocr: InvoiceOcrResult) {
  const rawTextLines = ocr.rawText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const verticalRows = structuredRowsFromVerticalTable(ocr.rawText);
  const parsed = parseInvoiceOcr(ocr);
  return {
    engine: ocr.engine ?? null,
    rawTextLineCount: rawTextLines.length,
    overlayBlockCount: ocr.lines.length,
    rawTextLines: rawTextLines.map((value, index) => ({
      index,
      text: value,
      parsed: Boolean(parseInvoiceLine(value, index)),
      rejectedBecause: parseRejectionReason(value),
    })),
    overlayBlocks: ocr.lines.map((line, index) => ({
      index,
      page: line.page ?? null,
      text: line.text,
      confidence: line.confidence,
      bounds: line.bounds ?? null,
      parsed: Boolean(parseInvoiceLine(line.text, index)),
      rejectedBecause: parseRejectionReason(line.text),
    })),
    verticalRows: verticalRows.map((value, index) => ({
      index,
      text: value,
      parsed: Boolean(parseInvoiceLine(value, index)),
      rejectedBecause: parseRejectionReason(value),
    })),
    parsedItems: parsed.items.map((item) => ({
      id: item.id,
      rawName: item.rawName,
      normalizedRawName: item.normalizedRawName,
      quantity: item.quantity,
      unit: item.unit,
      packageSize: item.packageSize ?? null,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      requiresReview: item.requiresReview,
    })),
  };
}

export function parseInvoiceOcr(ocr: InvoiceOcrResult): ParsedInvoiceDocument {
  const rawText = text(ocr.rawText, "", 350_000);
  const lineIndex = new Map<string, OcrLine>();
  for (const line of ocr.lines) {
    const key = text(line.text, "", 500);
    if (key) lineIndex.set(key, line);
  }
  for (const value of rawText.split(/\r?\n/)) {
    const key = text(value, "", 500);
    if (key && !lineIndex.has(key)) lineIndex.set(key, { text: key, confidence: null });
  }
  for (const value of structuredRowsFromVerticalTable(rawText)) {
    if (!lineIndex.has(value)) lineIndex.set(value, { text: value, confidence: null });
  }
  const lines = [...lineIndex.values()];
  const parsedItems = lines
    .map((line, index) => {
      const parsed = parseInvoiceLine(line.text, index);
      if (!parsed || line.confidence == null) return parsed;
      const confidence = bounded(Math.min(parsed.confidence, line.confidence));
      return {
        ...parsed,
        confidence,
        confidenceLevel: confidenceLevel(confidence),
        requiresReview: parsed.requiresReview || line.confidence < 0.55,
      };
    })
    .filter((line): line is ParsedInvoiceLine => Boolean(line));
  const items = [...new Map(parsedItems.map((item) => [
    [item.normalizedRawName, item.quantity, item.unitPrice, item.lineTotal].join("|"),
    item,
  ])).values()];
  const date = isoDate(rawText);
  const documentNumber = rawText.match(/(?:накладн(?:ая|ой)?|invoice|№|номер)\s*(?:№|no\.?|number)?\s*[:#-]?\s*([a-zа-я0-9/-]{2,40})/i)?.[1];
  const totalMatches = [...rawText.matchAll(/(?:итого|всего|total|к\s*оплате)\s*[:=-]?\s*(\d[\d\s]*(?:[.,]\d{1,2})?)/gi)];
  const statedTotal = totalMatches.length ? numeric(totalMatches.at(-1)?.[1]) : 0;
  const lineTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.round((statedTotal || lineTotal) * 100) / 100;
  const warnings: string[] = [];
  if (!items.length) warnings.push("Позиции не удалось уверенно выделить — добавьте их вручную.");
  if (!date) warnings.push("Проверьте дату документа.");
  if (!total) warnings.push("Проверьте итоговую сумму.");
  const ocrConfidence = ocr.confidence ?? (items.length ? 0.72 : 0.25);
  return {
    documentType: /(?:накладн|invoice)/i.test(rawText) ? "invoice" : "receipt",
    supplierName: headerSupplier(lines, rawText),
    supplierType: /(?:накладн|invoice)/i.test(rawText) ? "wholesale" : "retail",
    date,
    documentNumber,
    currency: detectedCurrency(rawText),
    paymentMethod: "unknown",
    total,
    confidence: bounded((ocrConfidence + (items.length ? 0.8 : 0.2)) / 2),
    warnings,
    items,
  };
}

function keyOf(item: JsonRecord): string {
  return text(item.productKey ?? item.key ?? item.nomenclatureItemId ?? item.id, "", 300);
}

export function nomenclatureCandidates(assortment: unknown, venueId: number): NomenclatureCandidate[] {
  const root = record(assortment);
  const byKey = new Map<string, NomenclatureCandidate & { sourceRank: number }>();
  const sources = [
    ...values(root.stockBalances).map((value) => ({ source: record(value), sourceRank: 1 })),
    ...values(root.nomenclature).map((value) => ({ source: record(value), sourceRank: 2 })),
  ];
  for (const { source, sourceRank } of sources) {
    const itemVenueId = numeric(source.venueId, venueId);
    const status = text(source.status, "", 30).toLocaleLowerCase("en-US");
    if (itemVenueId !== venueId || source.deleted === true || source.active === false || ["archived", "deleted"].includes(status)) continue;
    if (["service", "non_stock", "non-stock"].includes(
      text(source.inventoryType ?? source.productType ?? source.type, "", 30).toLocaleLowerCase("en-US"),
    )) continue;
    const key = keyOf(source);
    if (!key || (byKey.get(key)?.sourceRank ?? 0) >= sourceRank) continue;
    const packageOptions = values(source.packageOptions ?? source.packaging ?? source.packages)
      .map((value) => typeof value === "string"
        ? text(value, "", 120)
        : text(record(value).label ?? record(value).name ?? record(value).packageSize, "", 120))
      .filter(Boolean);
    const aliases = [
      ...values(source.aliases).map((alias) => text(alias, "", 240)),
      text(source.preferredDisplayName, "", 240),
      ...packageOptions.map((option) => `${text(source.name ?? source.productName ?? source.canonicalName, "", 240)} ${option}`),
    ].filter(Boolean);
    const supplierArticles = [source.supplierSku, source.sku, source.article, source.externalId]
      .map((value) => text(value, "", 160)).filter(Boolean);
    const barcodes = [source.barcode, ...values(source.barcodes)]
      .map((value) => text(value, "", 160)).filter(Boolean);
    byKey.set(key, {
      id: text(source.id ?? source.nomenclatureItemId, key, 160),
      key,
      name: text(source.name ?? source.productName ?? source.canonicalName, "Без названия", 300),
      unit: text(source.baseUnit ?? source.unit, "", 40),
      packageSize: text(source.packageSize ?? source.displayPackageSize ?? source.purchasePackageSize, packageOptions[0] ?? "", 120),
      aliases: [...new Set(aliases)],
      supplierArticles: [...new Set(supplierArticles)],
      barcodes: [...new Set(barcodes)],
      sourceRank,
    });
  }
  for (const mapping of values(root.supplierProductMappings).map(record)) {
    const key = text(mapping.canonicalProductKey, "", 300);
    const candidate = byKey.get(key);
    if (!candidate) continue;
    const mappingVenueId = numeric(mapping.venueId, venueId);
    const status = text(mapping.status, "", 30).toLocaleLowerCase("en-US");
    const confidence = numeric(mapping.confidence, 0);
    if (mappingVenueId !== venueId || (status !== "confirmed" && !(status === "auto" && confidence >= 0.9))) continue;
    const alias = text(mapping.sourceName, "", 240);
    if (alias) candidate.aliases = [...new Set([...candidate.aliases, alias])];
  }
  return [...byKey.values()].map((candidate) => ({
    id: candidate.id,
    key: candidate.key,
    name: candidate.name,
    unit: candidate.unit,
    packageSize: candidate.packageSize,
    aliases: candidate.aliases,
    supplierArticles: candidate.supplierArticles,
    barcodes: candidate.barcodes,
  }));
}

export function canonicalInvoiceSupplierMappings(
  assortment: unknown,
  venueId: number,
): SupplierItemMapping[] {
  return canonicalSupplierMappings(assortment)
    .filter((mapping) =>
      (mapping.venueId === null || mapping.venueId === venueId)
      && Boolean(mapping.supplierId)
      && (mapping.status === "confirmed" || (mapping.status === "auto" && mapping.confidence >= 0.9))
    )
    .map((mapping) => ({
      id: mapping.id,
      sourceItemKey: mapping.sourceItemKey,
      venueId,
      supplierId: mapping.supplierId!,
      rawName: mapping.sourceName,
      normalizedRawName: normalizeInvoiceText(mapping.sourceName),
      packageFingerprint: packageFingerprint(mapping.packageSize) || undefined,
      purchaseUnit: mapping.purchaseUnit,
      supplierArticle: mapping.supplierSku ?? undefined,
      barcode: mapping.barcode ?? undefined,
      nomenclatureId: mapping.canonicalProductKey,
      confirmations: mapping.status === "confirmed" ? 1 : 0,
      createdAt: mapping.firstSeenAt,
      updatedAt: mapping.lastSeenAt,
    }));
}

function levenshtein(left: string, right: string): number {
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function tokenSimilarity(left: string, right: string): number {
  const a = new Set(left.split(" ").filter((token) => token.length > 1));
  const b = new Set(right.split(" ").filter((token) => token.length > 1));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

export function fuzzyNomenclatureScore(rawName: unknown, candidate: NomenclatureCandidate): number {
  const source = normalizeInvoiceText(rawName);
  const names = [candidate.name, ...candidate.aliases].map(normalizeInvoiceText).filter(Boolean);
  const lexicalCore = (value: string) => value
    .split(" ")
    .filter((token) => !["pet", "bottle", "pack"].includes(token))
    .join(" ");
  let score = 0;
  for (const name of names) {
    for (const [left, right] of [
      [source, name],
      [lexicalCore(source), lexicalCore(name)],
      [phonetic(lexicalCore(source)), phonetic(lexicalCore(name))],
    ]) {
      if (left === right) score = Math.max(score, 0.98);
      const containment = left.includes(right) || right.includes(left) ? 0.84 : 0;
      const tokenScore = tokenSimilarity(left, right) * 0.82;
      const editScore = 1 - levenshtein(left, right) / Math.max(left.length, right.length, 1);
      score = Math.max(score, containment, tokenScore, editScore * 0.76);
    }
  }
  const sourcePackage = packageFingerprint(source);
  const candidatePackage = packageFingerprint(`${candidate.packageSize} ${candidate.name}`);
  if (sourcePackage && candidatePackage) {
    if (sourcePackage === candidatePackage) score += 0.12;
    else score = Math.min(score - 0.28, 0.59);
  }
  return bounded(score);
}

function exactCandidates(line: ParsedInvoiceLine, candidates: NomenclatureCandidate[]): NomenclatureCandidate[] {
  const source = normalizeInvoiceText(line.rawName);
  const sourceWithPackage = normalizeInvoiceText(`${line.rawName} ${line.packageSize ?? ""}`);
  return candidates.filter((candidate) => {
    if (invoiceIdentityConflicts(line, candidate).length) return false;
    return [candidate.name, ...candidate.aliases].some((name) => {
      const normalized = normalizeInvoiceText(name);
      return normalized === source || normalized === sourceWithPackage;
    });
  });
}

function supplierHistoryNameMatches(mapping: SupplierItemMapping, line: ParsedInvoiceLine): boolean {
  const mappingName = normalizeInvoiceText(mapping.rawName || mapping.normalizedRawName);
  const lineName = normalizeInvoiceText(line.rawName || line.normalizedRawName);
  if (!mappingName || !lineName) return false;
  if (mappingName === lineName) return true;
  if (!mappingName.startsWith(`${lineName} `)) return false;
  const legacyCommercialSuffix = mappingName.slice(lineName.length).trim();
  return /^(?:kg|кг|g|г|ml|мл|l|л|pcs|шт)\s+\d+(?:\.\d+)?$/.test(legacyCommercialSuffix);
}

export function matchInvoiceLine(input: {
  line: ParsedInvoiceLine;
  supplierId?: string;
  venueId: number;
  mappings: SupplierItemMapping[];
  nomenclature: NomenclatureCandidate[];
}): ParsedInvoiceLine {
  const linePackage = packageFingerprint(`${input.line.rawName} ${input.line.packageSize ?? ""}`);
  const compatiblePurchaseUnit = (mapping: SupplierItemMapping) => {
    if (!mapping.purchaseUnit || !input.line.unit) return true;
    const mappingUnit = canonicalPurchaseUnit(mapping.purchaseUnit);
    const lineUnit = canonicalPurchaseUnit(input.line.unit);
    if (mappingUnit === lineUnit) return true;
    return Boolean(linePackage)
      && ((lineUnit === "pcs" && ["ml", "g"].includes(mappingUnit))
        || (mappingUnit === "pcs" && ["ml", "g"].includes(lineUnit)));
  };
  const compatibleMapping = (mapping: SupplierItemMapping) =>
    mapping.venueId === input.venueId
    && mapping.supplierId === input.supplierId
    && compatiblePurchaseUnit(mapping)
    && (!mapping.packageFingerprint || !linePackage || mapping.packageFingerprint === linePackage);
  const historyByIdentifier = input.supplierId ? input.mappings.find((mapping) =>
    compatibleMapping(mapping)
    && (
      Boolean(input.line.supplierArticle && mapping.supplierArticle === input.line.supplierArticle)
      || Boolean(input.line.barcode && mapping.barcode === input.line.barcode)
    )
  ) : undefined;
  const history = historyByIdentifier ?? (input.supplierId ? input.mappings.find((mapping) =>
    compatibleMapping(mapping) && supplierHistoryNameMatches(mapping, input.line)
  ) : undefined);
  if (history) {
    const candidate = input.nomenclature.find((item) => item.id === history.nomenclatureId || item.key === history.nomenclatureId);
    const arithmeticValid = invoiceCommercialArithmeticIsValid(
      input.line.quantity,
      input.line.unitPrice,
      input.line.lineTotal,
    );
    if (candidate && invoiceIdentityConflicts(input.line, candidate).length === 0) return {
      ...input.line,
      nomenclatureName: candidate.name,
      purchaseProductKey: candidate.key,
      nomenclatureId: candidate.id,
      mappingSource: "history",
      confidence: arithmeticValid ? 1 : input.line.confidence,
      confidenceLevel: arithmeticValid ? "high" : input.line.confidenceLevel,
      requiresReview: !arithmeticValid,
    };
  }
  const identifierMatches = input.nomenclature.filter((candidate) =>
    Boolean(input.line.supplierArticle && candidate.supplierArticles?.includes(input.line.supplierArticle))
    || Boolean(input.line.barcode && candidate.barcodes?.includes(input.line.barcode))
  ).filter((candidate) => invoiceIdentityConflicts(input.line, candidate).length === 0);
  if (identifierMatches.length === 1) {
    const candidate = identifierMatches[0];
    const arithmeticValid = invoiceCommercialArithmeticIsValid(
      input.line.quantity,
      input.line.unitPrice,
      input.line.lineTotal,
    );
    return {
      ...input.line,
      nomenclatureName: candidate.name,
      purchaseProductKey: candidate.key,
      nomenclatureId: candidate.id,
      mappingSource: "supplier_identifier",
      mappingCandidates: [{
        id: candidate.id,
        key: candidate.key,
        name: candidate.name,
        score: 1,
        unit: candidate.unit,
        packageSize: candidate.packageSize,
      }],
      confidence: arithmeticValid ? 1 : input.line.confidence,
      confidenceLevel: arithmeticValid ? "high" : input.line.confidenceLevel,
      requiresReview: !arithmeticValid,
    };
  }
  const exact = exactCandidates(input.line, input.nomenclature);
  if (exact.length === 1 && input.line.confidence >= 0.55) {
    const candidate = exact[0];
    const strongIdentity = hasStrongInvoiceIdentityEvidence(input.line, candidate);
    const arithmeticValid = invoiceCommercialArithmeticIsValid(
      input.line.quantity,
      input.line.unitPrice,
      input.line.lineTotal,
    );
    return {
      ...input.line,
      nomenclatureName: candidate.name,
      purchaseProductKey: candidate.key,
      nomenclatureId: candidate.id,
      mappingSource: "exact_alias",
      mappingCandidates: [{
        id: candidate.id,
        key: candidate.key,
        name: candidate.name,
        score: 1,
        unit: candidate.unit,
        packageSize: candidate.packageSize,
      }],
      confidence: bounded((input.line.confidence + 1) / 2),
      confidenceLevel: strongIdentity && arithmeticValid ? "high" : "medium",
      requiresReview: !strongIdentity || !arithmeticValid,
    };
  }
  const ranked = input.nomenclature
    .filter((candidate) => invoiceIdentityConflicts(input.line, candidate).length === 0)
    .map((candidate) => ({ candidate, score: fuzzyNomenclatureScore(input.line.rawName, candidate) }))
    .filter((entry) => entry.score >= 0.35)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name, "ru"))
    .slice(0, 5);
  const best = ranked[0];
  const margin = best ? best.score - (ranked[1]?.score ?? 0) : 0;
  const level = confidenceLevel(best?.score ?? 0, margin);
  const candidates = ranked.map(({ candidate, score }) => ({
    id: candidate.id,
    key: candidate.key,
    name: candidate.name,
    score,
    unit: candidate.unit,
    packageSize: candidate.packageSize,
  }));
  if (best && level === "high" && input.line.confidence >= 0.55 && hasStrongInvoiceIdentityEvidence(input.line, best.candidate)) {
    const arithmeticValid = invoiceCommercialArithmeticIsValid(
      input.line.quantity,
      input.line.unitPrice,
      input.line.lineTotal,
    );
    return {
      ...input.line,
      nomenclatureName: best.candidate.name,
      purchaseProductKey: best.candidate.key,
      nomenclatureId: best.candidate.id,
      mappingSource: best.score >= 0.97 ? "exact_alias" : "fuzzy",
      mappingCandidates: candidates,
      confidence: bounded((input.line.confidence + best.score) / 2),
      confidenceLevel: arithmeticValid ? "high" : input.line.confidenceLevel,
      requiresReview: !arithmeticValid,
    };
  }
  return {
    ...input.line,
    mappingCandidates: candidates,
    confidence: bounded((input.line.confidence + (best?.score ?? 0)) / 2),
    confidenceLevel: level,
    requiresReview: true,
  };
}

export function applyDeterministicMappings(input: {
  document: ParsedInvoiceDocument;
  supplierId?: string;
  venueId: number;
  mappings: SupplierItemMapping[];
  nomenclature: NomenclatureCandidate[];
}): ParsedInvoiceDocument {
  return {
    ...input.document,
    supplierId: input.supplierId,
    items: input.document.items.map((line) => matchInvoiceLine({ ...input, line })),
  };
}

export function upsertConfirmedSupplierMappings(input: {
  current: SupplierItemMapping[];
  venueId: number;
  supplierId: string;
  actorAccountId?: number;
  items: unknown[];
  now?: string;
}): SupplierItemMapping[] {
  const now = input.now ?? new Date().toISOString();
  const mappings = input.current.filter((mapping) => mapping.venueId !== input.venueId || Boolean(mapping.supplierId));
  for (const value of input.items) {
    const item = record(value);
    const rawName = text(item.rawName, "", 300);
    const normalizedRawName = normalizeInvoiceText(item.normalizedRawName ?? rawName);
    const nomenclatureId = text(item.nomenclatureId ?? item.purchaseProductKey ?? item.canonicalProductKey, "", 300);
    if (!rawName || !normalizedRawName || !nomenclatureId) continue;
    const fingerprint = packageFingerprint(`${rawName} ${text(item.packageSize)}`);
    const purchaseUnit = canonicalPurchaseUnit(item.unit);
    const supplierArticle = text(item.supplierArticle, "", 160);
    const barcode = text(item.barcode, "", 160);
    const sameSupplierIdentity = (mapping: SupplierItemMapping) =>
      mapping.venueId === input.venueId
      && mapping.supplierId === input.supplierId
      && (
        Boolean(supplierArticle && mapping.supplierArticle === supplierArticle)
        || Boolean(barcode && mapping.barcode === barcode)
        || (mapping.normalizedRawName === normalizedRawName && (mapping.packageFingerprint ?? "") === fingerprint)
      );
    const existing = mappings.find((mapping) =>
      sameSupplierIdentity(mapping)
    );
    if (existing) {
      existing.rawName = rawName;
      existing.nomenclatureId = nomenclatureId;
      existing.purchaseUnit = purchaseUnit || existing.purchaseUnit;
      existing.supplierArticle = supplierArticle || existing.supplierArticle;
      existing.barcode = barcode || existing.barcode;
      existing.confirmations += 1;
      existing.confirmedByAccountId = input.actorAccountId;
      existing.updatedAt = now;
    } else {
      const replacement = {
        id: crypto.randomUUID(),
        venueId: input.venueId,
        supplierId: input.supplierId,
        rawName,
        normalizedRawName,
        packageFingerprint: fingerprint || undefined,
        purchaseUnit: purchaseUnit || undefined,
        supplierArticle: supplierArticle || undefined,
        barcode: barcode || undefined,
        nomenclatureId,
        confirmedByAccountId: input.actorAccountId,
        confirmations: 1,
        createdAt: now,
        updatedAt: now,
      } satisfies SupplierItemMapping;
      for (let index = mappings.length - 1; index >= 0; index -= 1) {
        if (sameSupplierIdentity(mappings[index])) mappings.splice(index, 1);
      }
      mappings.push(replacement);
    }
    const authoritative = existing ?? mappings.at(-1);
    if (authoritative) {
      for (let index = mappings.length - 1; index >= 0; index -= 1) {
        if (mappings[index] !== authoritative && sameSupplierIdentity(mappings[index])) mappings.splice(index, 1);
      }
    }
  }
  return mappings.slice(-10_000);
}

export function recognitionMetrics(input: {
  mode: InvoiceRecognitionMode;
  ocr: InvoiceOcrResult | null;
  document: ParsedInvoiceDocument;
  aiFallbackLinesCount?: number;
  aiRequestCount?: number;
  aiEstimatedInputTokens?: number;
  aiEstimatedOutputTokens?: number;
  aiEstimatedTokenUsage?: number;
  nomenclatureCandidatesCount?: number;
  matchingDurationMs?: number;
  startedAt: number;
}): InvoiceRecognitionMetrics {
  const normalizedOcrLines = (input.ocr?.lines ?? [])
    .map((line) => normalizeInvoiceText(line.text))
    .filter(Boolean);
  return {
    pipeline: "invoice_recognition_v2",
    mode: input.mode,
    ocrDurationMs: input.ocr?.durationMs ?? 0,
    ocrSuccess: Boolean(input.ocr?.rawText || input.ocr?.lines.length),
    ocrDetectedLinesCount: input.ocr?.lines.length ?? 0,
    ocrDuplicateLinesCount: normalizedOcrLines.length - new Set(normalizedOcrLines).size,
    ocrConfidence: input.ocr?.confidence ?? null,
    ocrEngine: input.ocr?.engine ?? null,
    parsedLinesCount: input.document.items.length,
    nomenclatureCandidatesCount: input.nomenclatureCandidatesCount ?? 0,
    matchingDurationMs: input.matchingDurationMs ?? 0,
    historicalMappingsCount: input.document.items.filter((item) => item.mappingSource === "history").length,
    exactCanonicalMatchesCount: input.document.items.filter((item) => item.mappingSource === "exact_alias").length,
    exactMappingsCount: input.document.items.filter((item) => ["history", "supplier_identifier", "exact_alias"].includes(item.mappingSource ?? "")).length,
    fuzzyMappingsCount: input.document.items.filter((item) => item.mappingSource === "fuzzy").length,
    fuzzyHighMappingsCount: input.document.items.filter((item) => item.mappingSource === "fuzzy" && !item.requiresReview).length,
    fuzzyMediumCandidatesCount: input.document.items.filter((item) => !item.mappingSource && item.confidenceLevel === "medium" && Boolean(item.mappingCandidates?.length)).length,
    unresolvedCount: input.document.items.filter((item) => item.requiresReview).length,
    manualRequiredCount: input.document.items.filter((item) => item.requiresReview).length,
    aiFallbackLinesCount: input.aiFallbackLinesCount ?? 0,
    aiRequestCount: input.aiRequestCount ?? 0,
    aiTokenUsage: null,
    aiEstimatedInputTokens: input.aiEstimatedInputTokens ?? 0,
    aiEstimatedOutputTokens: input.aiEstimatedOutputTokens ?? 0,
    aiEstimatedTokenUsage: input.aiEstimatedTokenUsage ?? 0,
    aiHighCount: input.document.items.filter((item) => item.mappingSource === "ai" && item.confidenceLevel === "high").length,
    aiMediumCount: input.document.items.filter((item) => item.mappingSource === "ai" && item.confidenceLevel === "medium").length,
    aiNoMatchCount: input.document.items.filter((item) => item.requiresReview && !item.nomenclatureId).length,
    totalDurationMs: Math.max(0, Date.now() - input.startedAt),
  };
}

export function compareRecognitionResults(legacy: unknown, v2: ParsedInvoiceDocument) {
  const left = record(legacy);
  const legacyItems = values(left.items).map(record);
  const normalizedLegacy = legacyItems.map((item) => ({
    name: normalizeInvoiceText(item.rawName ?? item.name),
    quantity: numeric(item.quantity),
    unitPrice: numeric(item.unitPrice ?? item.price),
    lineTotal: numeric(item.lineTotal ?? item.total),
    nomenclatureId: text(item.nomenclatureId ?? item.purchaseProductKey),
  }));
  const pairs = v2.items.map((item) => {
    const name = normalizeInvoiceText(item.rawName ?? item.name);
    const match = normalizedLegacy.find((candidate) => candidate.name === name)
      ?? normalizedLegacy.find((candidate) => fuzzyTextAgreement(candidate.name, name) >= 0.75);
    return { item, match };
  });
  const comparable = pairs.filter((pair) => Boolean(pair.match));
  const numericMatches = (
    selector: (item: ParsedInvoiceLine) => number,
    legacySelector: (item: (typeof normalizedLegacy)[number]) => number,
  ) => comparable.filter(({ item, match }) =>
    Math.abs(selector(item) - legacySelector(match!)) <= 0.01
  ).length;
  return {
    supplierMatch: normalizeInvoiceText(left.supplierName) === normalizeInvoiceText(v2.supplierName),
    documentNumberMatch: text(left.documentNumber) === text(v2.documentNumber),
    dateMatch: text(left.date) === text(v2.date),
    currencyMatch: text(left.currency, "RUB") === v2.currency,
    lineCountDelta: v2.items.length - legacyItems.length,
    totalDelta: Math.round((v2.total - numeric(left.total)) * 100) / 100,
    comparableLines: comparable.length,
    nameMatches: comparable.filter(({ item, match }) =>
      normalizeInvoiceText(item.rawName ?? item.name) === match?.name
    ).length,
    quantityMatches: numericMatches((item) => item.quantity, (item) => item.quantity),
    unitPriceMatches: numericMatches((item) => item.unitPrice, (item) => item.unitPrice),
    lineTotalMatches: numericMatches((item) => item.lineTotal, (item) => item.lineTotal),
    nomenclatureMatches: comparable.filter(({ item, match }) =>
      !match?.nomenclatureId || match.nomenclatureId === (item.nomenclatureId ?? item.purchaseProductKey)
    ).length,
    mappedLines: v2.items.filter((item) => Boolean(item.purchaseProductKey)).length,
    manualRequired: v2.items.filter((item) => item.requiresReview).length,
  };
}

function fuzzyTextAgreement(left: string, right: string): number {
  if (!left || !right) return 0;
  return Math.max(...[[left, right], [phonetic(left), phonetic(right)]].map(([a, b]) =>
    Math.max(
      tokenSimilarity(a, b),
      1 - levenshtein(a, b) / Math.max(a.length, b.length, 1),
    )
  ));
}

export function recognitionQualityAgainstGroundTruth(
  document: ParsedInvoiceDocument,
  expected: InvoiceRecognitionGroundTruth,
) {
  const matches = expected.items.map((expectedLine) => {
    const expectedName = normalizeInvoiceText(expectedLine.rawName);
    const ranked = document.items
      .map((actual) => ({
        actual,
        score: fuzzyTextAgreement(expectedName, normalizeInvoiceText(actual.rawName ?? actual.name)),
      }))
      .sort((left, right) => right.score - left.score);
    return ranked[0] && ranked[0].score >= 0.7 ? { expected: expectedLine, actual: ranked[0].actual } : null;
  });
  const paired = matches.filter((match): match is NonNullable<typeof match> => Boolean(match));
  const accuracy = (
    selector: (value: InvoiceRecognitionGroundTruth["items"][number]) => number | undefined,
    actualSelector: (value: ParsedInvoiceLine) => number,
  ) => {
    const comparable = paired.filter(({ expected: value }) => selector(value) != null);
    if (!comparable.length) return null;
    return comparable.filter(({ expected: value, actual }) =>
      Math.abs((selector(value) ?? 0) - actualSelector(actual)) <= 0.01
    ).length / comparable.length;
  };
  return {
    supplierMatch: expected.supplierName
      ? fuzzyTextAgreement(normalizeInvoiceText(expected.supplierName), normalizeInvoiceText(document.supplierName)) >= 0.8
      : null,
    documentNumberMatch: expected.documentNumber ? expected.documentNumber === document.documentNumber : null,
    dateMatch: expected.date ? expected.date === document.date : null,
    currencyMatch: expected.currency ? expected.currency === document.currency : null,
    documentTotalMatch: expected.total != null ? Math.abs(expected.total - document.total) <= 0.01 : null,
    expectedLines: expected.items.length,
    detectedLines: document.items.length,
    matchedLines: paired.length,
    lineRecall: expected.items.length ? paired.length / expected.items.length : 1,
    quantityAccuracy: accuracy((value) => value.quantity, (value) => value.quantity),
    unitPriceAccuracy: accuracy((value) => value.unitPrice, (value) => value.unitPrice),
    lineTotalAccuracy: accuracy((value) => value.lineTotal, (value) => value.lineTotal),
    resolvedWithoutAiRate: document.items.length
      ? document.items.filter((item) => !item.requiresReview && item.mappingSource !== "ai").length / document.items.length
      : 0,
    requiresReviewRate: document.items.length
      ? document.items.filter((item) => item.requiresReview).length / document.items.length
      : 1,
  };
}

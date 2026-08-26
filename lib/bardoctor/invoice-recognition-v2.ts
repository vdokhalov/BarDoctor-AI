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
  venueId: number;
  supplierId: string;
  rawName: string;
  normalizedRawName: string;
  packageFingerprint?: string;
  purchaseUnit?: string;
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
};

export type ParsedInvoiceLine = {
  id: string;
  rawName: string;
  normalizedRawName: string;
  name: string;
  quantity: number;
  unit: string;
  packageSize?: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
  confidenceLevel: RecognitionConfidence;
  purchaseProductKey?: string;
  nomenclatureId?: string;
  mappingSource?: "history" | "exact_alias" | "fuzzy" | "ai" | "manual";
  mappingCandidates?: Array<{ id: string; key: string; name: string; score: number }>;
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
  aiEstimatedTokenUsage: number;
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

function numeric(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return fallback;
  const compact = value.trim().replace(/\s+/g, "");
  if (!compact) return fallback;
  const normalized = compact.includes(",") && compact.includes(".")
    ? compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "")
    : compact.replace(",", ".");
  const parsed = Number(normalized.replace(/[^0-9+.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
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
      mappingSource: shadow.mappingSource,
      confidenceLevel: shadow.confidenceLevel,
      mappingCandidates: values(shadow.mappingCandidates),
      requiresReview: shadow.requiresReview === true || shadow.mappingSource === "ai",
    };
  });
  return {
    ...legacy,
    supplierId: text(legacy.supplierId, "", 300) || shadowDocument.supplierId,
    items,
  };
}

export function packageFingerprint(value: unknown): string {
  const normalized = normalizeInvoiceText(value);
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg|pcs)\b/);
  if (!match) return "";
  const amount = numeric(match[1]);
  if (match[2] === "l") return `ml:${Math.round(amount * 1_000)}`;
  if (match[2] === "kg") return `g:${Math.round(amount * 1_000)}`;
  return `${match[2]}:${Math.round(amount * 1_000) / 1_000}`;
}

function bounded(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1_000) / 1_000));
}

function canonicalPurchaseUnit(value: unknown): string {
  const normalized = text(value, "", 30).toLocaleLowerCase("ru-RU").replace(/[.\s]/g, "");
  if (["кг", "kg", "г", "гр", "g"].includes(normalized)) return "g";
  if (["л", "l", "lt", "мл", "ml"].includes(normalized)) return "ml";
  if (["шт", "pcs", "pc", "piece", "ед", "уп", "бут"].includes(normalized)) return "pcs";
  return normalizeInvoiceText(value);
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
  const cleaned = raw
    .replace(/[|¦\[\]]/g, " ")
    .replace(/[₽€$]/g, " ")
    .replace(/^\s*\d{1,3}[.)]?\s+(?=\p{L})/u, "")
    .replace(/\s+/g, " ")
    .replace(/(?:^|\s)(кг|г|л|мл|шт|pcs)\s+\1\s+(?=\d)/i, " $1 ")
    .trim();
  const match = cleaned.match(
    /^(.{2,}?)\s+(\d+(?:[.,]\d+)?)\s*(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)?\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/i,
  );
  if (!match) return null;
  const rawNameWithUnits = match[1].trim();
  const packageMatch = rawNameWithUnits.match(/\b\d+(?:[.,]\d+)?\s*(?:мл|ml|л|l|кг|kg|г|g)\b/i);
  const rawName = rawNameWithUnits
    .replace(/(?:\s+(?:мл|ml|л|l|кг|kg|г|g|шт|pcs)[.!]*){1,2}$/i, "")
    .trim();
  const quantity = numeric(match[2]);
  const unitPrice = numeric(match[4]);
  const lineTotal = numeric(match[5]);
  if (!rawName || quantity <= 0 || (unitPrice <= 0 && lineTotal <= 0)) return null;
  const arithmetic = Math.abs(quantity * unitPrice - lineTotal) <= Math.max(0.05, lineTotal * 0.025);
  const score = arithmetic ? 0.9 : 0.72;
  return {
    id: `ocr-line-${index + 1}`,
    rawName,
    normalizedRawName: normalizeInvoiceText(rawName),
    name: rawName,
    quantity,
    unit: text(match[3], "шт.", 20),
    packageSize: packageMatch?.[0],
    unitPrice: Math.round(unitPrice * 100) / 100,
    lineTotal: Math.round(lineTotal * 100) / 100,
    confidence: score,
    confidenceLevel: confidenceLevel(score),
    requiresReview: !arithmetic,
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

function structuredRowsFromVerticalTable(rawText: string): string[] {
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
    const quantityMatch = quantityText?.match(/^(\d+(?:[.,]\d+)?)\s*(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)?$/i);
    const unitMatch = unit?.match(/^(шт\.?|pcs|ед\.?|уп\.?|бут\.?|л|мл|кг|г)$/i);
    const priceMatch = priceText?.match(/^\d+(?:[.,]\d+)?$/);
    const totalMatch = totalText?.match(/^\d+(?:[.,]\d+)?$/);
    const quantity = numeric(quantityMatch?.[1]);
    const price = numeric(priceMatch?.[0]);
    const total = numeric(totalMatch?.[0]);
    const arithmetic = quantity > 0 && price > 0 && total > 0
      && Math.abs(quantity * price - total) <= Math.max(0.05, total * 0.025);
    if (!name || !/\p{L}/u.test(name) || !unitMatch || !quantityMatch || !priceMatch || !totalMatch || !arithmetic) break;
    rows.push(`${rowNumber} | ${name} | ${unit} | ${quantityText} | ${priceText} | ${totalText}`);
    index += 6;
  }
  return rows;
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
    byKey.set(key, {
      id: text(source.id ?? source.nomenclatureItemId, key, 160),
      key,
      name: text(source.name ?? source.productName ?? source.canonicalName, "Без названия", 300),
      unit: text(source.baseUnit ?? source.unit, "", 40),
      packageSize: text(source.packageSize ?? source.displayPackageSize ?? source.purchasePackageSize, packageOptions[0] ?? "", 120),
      aliases: [...new Set(aliases)],
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
      venueId,
      supplierId: mapping.supplierId!,
      rawName: mapping.sourceName,
      normalizedRawName: normalizeInvoiceText(mapping.sourceName),
      packageFingerprint: packageFingerprint(mapping.packageSize) || undefined,
      purchaseUnit: mapping.purchaseUnit,
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
  const sourcePackage = packageFingerprint(sourceWithPackage);
  return candidates.filter((candidate) => {
    const candidatePackage = packageFingerprint(`${candidate.name} ${candidate.packageSize}`);
    if (sourcePackage && candidatePackage && sourcePackage !== candidatePackage) return false;
    return [candidate.name, ...candidate.aliases].some((name) => {
      const normalized = normalizeInvoiceText(name);
      return normalized === source || normalized === sourceWithPackage;
    });
  });
}

export function matchInvoiceLine(input: {
  line: ParsedInvoiceLine;
  supplierId?: string;
  venueId: number;
  mappings: SupplierItemMapping[];
  nomenclature: NomenclatureCandidate[];
}): ParsedInvoiceLine {
  const linePackage = packageFingerprint(`${input.line.rawName} ${input.line.packageSize ?? ""}`);
  const history = input.supplierId ? input.mappings.find((mapping) =>
    mapping.venueId === input.venueId
    && mapping.supplierId === input.supplierId
    && mapping.normalizedRawName === input.line.normalizedRawName
    && (!mapping.purchaseUnit || !input.line.unit || mapping.purchaseUnit === canonicalPurchaseUnit(input.line.unit))
    && (!mapping.packageFingerprint || !linePackage || mapping.packageFingerprint === linePackage)
  ) : undefined;
  if (history) {
    const candidate = input.nomenclature.find((item) => item.id === history.nomenclatureId || item.key === history.nomenclatureId);
    if (candidate) return {
      ...input.line,
      name: candidate.name,
      purchaseProductKey: candidate.key,
      nomenclatureId: candidate.id,
      mappingSource: "history",
      confidence: 1,
      confidenceLevel: "high",
      requiresReview: false,
    };
  }
  const exact = exactCandidates(input.line, input.nomenclature);
  if (exact.length === 1 && input.line.confidence >= 0.55) {
    const candidate = exact[0];
    return {
      ...input.line,
      name: candidate.name,
      purchaseProductKey: candidate.key,
      nomenclatureId: candidate.id,
      mappingSource: "exact_alias",
      mappingCandidates: [{ id: candidate.id, key: candidate.key, name: candidate.name, score: 1 }],
      confidence: bounded((input.line.confidence + 1) / 2),
      confidenceLevel: "high",
      requiresReview: false,
    };
  }
  const ranked = input.nomenclature
    .map((candidate) => ({ candidate, score: fuzzyNomenclatureScore(input.line.rawName, candidate) }))
    .filter((entry) => entry.score >= 0.35)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name, "ru"))
    .slice(0, 5);
  const best = ranked[0];
  const margin = best ? best.score - (ranked[1]?.score ?? 0) : 0;
  const level = confidenceLevel(best?.score ?? 0, margin);
  const candidates = ranked.map(({ candidate, score }) => ({ id: candidate.id, key: candidate.key, name: candidate.name, score }));
  if (best && level === "high" && input.line.confidence >= 0.55) return {
    ...input.line,
    name: best.candidate.name,
    purchaseProductKey: best.candidate.key,
    nomenclatureId: best.candidate.id,
    mappingSource: best.score >= 0.97 ? "exact_alias" : "fuzzy",
    mappingCandidates: candidates,
    confidence: bounded((input.line.confidence + best.score) / 2),
    confidenceLevel: "high",
    requiresReview: false,
  };
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
    const existing = mappings.find((mapping) =>
      mapping.venueId === input.venueId
      && mapping.supplierId === input.supplierId
      && mapping.normalizedRawName === normalizedRawName
      && (mapping.packageFingerprint ?? "") === fingerprint
    );
    if (existing) {
      existing.rawName = rawName;
      existing.nomenclatureId = nomenclatureId;
      existing.purchaseUnit = purchaseUnit || existing.purchaseUnit;
      existing.confirmations += 1;
      existing.confirmedByAccountId = input.actorAccountId;
      existing.updatedAt = now;
    } else {
      mappings.push({
        id: crypto.randomUUID(),
        venueId: input.venueId,
        supplierId: input.supplierId,
        rawName,
        normalizedRawName,
        packageFingerprint: fingerprint || undefined,
        purchaseUnit: purchaseUnit || undefined,
        nomenclatureId,
        confirmedByAccountId: input.actorAccountId,
        confirmations: 1,
        createdAt: now,
        updatedAt: now,
      });
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
    exactMappingsCount: input.document.items.filter((item) => item.mappingSource === "history" || item.mappingSource === "exact_alias").length,
    fuzzyMappingsCount: input.document.items.filter((item) => item.mappingSource === "fuzzy").length,
    fuzzyHighMappingsCount: input.document.items.filter((item) => item.mappingSource === "fuzzy" && !item.requiresReview).length,
    fuzzyMediumCandidatesCount: input.document.items.filter((item) => !item.mappingSource && item.confidenceLevel === "medium" && Boolean(item.mappingCandidates?.length)).length,
    unresolvedCount: input.document.items.filter((item) => item.requiresReview).length,
    manualRequiredCount: input.document.items.filter((item) => item.requiresReview).length,
    aiFallbackLinesCount: input.aiFallbackLinesCount ?? 0,
    aiRequestCount: input.aiRequestCount ?? 0,
    aiTokenUsage: null,
    aiEstimatedTokenUsage: input.aiEstimatedTokenUsage ?? 0,
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

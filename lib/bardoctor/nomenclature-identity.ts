/**
 * Canonical nomenclature identity contract.
 *
 * One venue product is represented by one canonical nomenclature row. Supplier
 * names, SKUs, invoice descriptions and packages are evidence attached to that
 * row; they are never independent recipe or stock identities by themselves.
 */

export type JsonRecord = Record<string, unknown>;

export type SupplierProductMapping = JsonRecord & {
  id: string;
  venueId: number | null;
  supplierId: string | null;
  supplierName: string;
  sourceItemKey: string;
  sourceName: string;
  normalizedSourceName: string;
  supplierSku: string | null;
  barcode: string | null;
  purchaseUnit: string;
  packageSize: string;
  canonicalProductKey: string;
  status: "confirmed" | "auto" | "review" | "orphan";
  confidence: number;
  firstSeenAt: string;
  lastSeenAt: string;
  purchaseDocumentIds: string[];
  purchaseLineIds: string[];
  lastPrice: number | null;
  currency: string | null;
};

export type CanonicalIdentitySuggestion = {
  productKey: string;
  name: string;
  score: number;
  reason: string;
  archived?: boolean;
};

export type CanonicalResolution = {
  canonicalProductKey: string;
  canonicalName: string;
  status: "stable_mapping" | "explicit" | "high_confidence" | "review" | "new";
  confidence: number;
  suggestions: CanonicalIdentitySuggestion[];
  sourceMapping: SupplierProductMapping;
};

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

function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeCanonicalText(value: unknown): string {
  return text(value)
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9%]+/gi, " ")
    .trim();
}

function tokens(value: unknown): string[] {
  return normalizeCanonicalText(value).split(" ").filter(Boolean);
}

function sourceNameWithoutSupplier(nameValue: unknown, supplierNameValue: unknown): string {
  const name = text(nameValue, "", 240);
  const supplier = normalizeCanonicalText(supplierNameValue);
  if (!name || !supplier) return name;
  const rawTokens = tokens(name);
  const supplierTokens = tokens(supplier);
  if (!supplierTokens.length || rawTokens.length <= supplierTokens.length) return name;
  const tail = rawTokens.slice(-supplierTokens.length).join(" ");
  if (tail !== supplierTokens.join(" ")) return name;
  const kept = rawTokens.slice(0, -supplierTokens.length);
  return kept.join(" ").replace(/(^|\s)\S/g, (value) => value.toLocaleUpperCase("ru"));
}

export function canonicalPurchaseName(nameValue: unknown, supplierNameValue?: unknown): string {
  return sourceNameWithoutSupplier(nameValue, supplierNameValue) || text(nameValue, "Товар", 240);
}

function meaningfulAttributes(value: unknown): string[] {
  const normalized = normalizeCanonicalText(value);
  const values = [
    ...(normalized.match(/\d+(?:[.,]\d+)?\s*%/g) ?? []),
    ...(normalized.match(/\d+(?:[.,]\d+)?\s*(?:мл|ml|л|l|г|гр|g|кг|kg)\b/g) ?? []),
  ];
  return [...new Set(values.map((item) => item.replace(/\s+/g, "")))].sort();
}

function identityTokens(value: unknown): string[] {
  return [...new Set(tokens(value).filter((token) => !/^(сыр|cheese)$/.test(token)))].sort();
}

function unit(value: JsonRecord): string {
  const current = text(value.baseUnit ?? value.unit, "unknown", 20).toLocaleLowerCase("ru");
  if (["ml", "мл", "l", "л"].includes(current)) return "ml";
  if (["g", "г", "kg", "кг"].includes(current)) return "g";
  if (["pcs", "шт", "шт.", "piece"].includes(current)) return "pcs";
  const packageSize = normalizeCanonicalText(value.packageSize);
  if (/\b(?:мл|ml|л|l)\b/.test(packageSize)) return "ml";
  if (/\b(?:г|гр|g|кг|kg)\b/.test(packageSize)) return "g";
  if (/\b(?:шт|pcs|уп|пач|короб)\b/.test(packageSize)) return "pcs";
  return current;
}

function lexicalScore(leftValue: unknown, rightValue: unknown): number {
  const left = identityTokens(leftValue);
  const right = identityTokens(rightValue);
  if (!left.length || !right.length) return 0;
  if (left.join(" ") === right.join(" ")) return 1;
  const intersection = left.filter((token) => right.includes(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function variantsCompatible(left: unknown, right: unknown): boolean {
  const leftAttributes = meaningfulAttributes(left);
  const rightAttributes = meaningfulAttributes(right);
  if (!leftAttributes.length && !rightAttributes.length) return true;
  return leftAttributes.join("|") === rightAttributes.join("|");
}

function belongsToVenue(value: JsonRecord, venueId: number | null): boolean {
  const candidateVenueId = numeric(value.venueId);
  return venueId === null || candidateVenueId === null || candidateVenueId === venueId;
}

function sourceMappingKey(input: {
  venueId: number | null;
  supplierId: string | null;
  supplierName: string;
  supplierSku: string | null;
  barcode: string | null;
  sourceName: string;
  purchaseUnit: string;
}): string {
  const venue = input.venueId ?? "account";
  const supplier = input.supplierId || normalizeCanonicalText(input.supplierName) || "unknown";
  const itemIdentity = input.supplierSku
    ? `sku:${normalizeCanonicalText(input.supplierSku)}`
    : input.barcode
      ? `barcode:${normalizeCanonicalText(input.barcode)}`
      : `name:${normalizeCanonicalText(input.sourceName)}|${input.purchaseUnit}`;
  return `${venue}:${supplier}:${itemIdentity}`;
}

export function canonicalSupplierMappings(assortment: unknown): SupplierProductMapping[] {
  return array(record(assortment).supplierProductMappings)
    .map(record)
    .flatMap((value) => {
      const id = text(value.id, "", 500);
      const canonicalProductKey = text(value.canonicalProductKey, "", 300);
      const sourceItemKey = text(value.sourceItemKey, id, 500);
      if (!id || !canonicalProductKey || !sourceItemKey) return [];
      return [{
        ...value,
        id,
        venueId: numeric(value.venueId),
        supplierId: text(value.supplierId, "", 160) || null,
        supplierName: text(value.supplierName, "Поставщик", 180),
        sourceItemKey,
        sourceName: text(value.sourceName, "Товар", 240),
        normalizedSourceName: text(value.normalizedSourceName, normalizeCanonicalText(value.sourceName), 300),
        supplierSku: text(value.supplierSku, "", 160) || null,
        barcode: text(value.barcode, "", 160) || null,
        purchaseUnit: text(value.purchaseUnit, "unknown", 30),
        packageSize: text(value.packageSize, "", 120),
        canonicalProductKey,
        status: ["confirmed", "auto", "review", "orphan"].includes(text(value.status))
          ? text(value.status) as SupplierProductMapping["status"]
          : "review",
        confidence: Math.max(0, Math.min(1, numeric(value.confidence) ?? 0)),
        firstSeenAt: text(value.firstSeenAt, "", 50),
        lastSeenAt: text(value.lastSeenAt, "", 50),
        purchaseDocumentIds: array(value.purchaseDocumentIds).map((item) => text(item, "", 120)).filter(Boolean),
        purchaseLineIds: array(value.purchaseLineIds).map((item) => text(item, "", 120)).filter(Boolean),
        lastPrice: numeric(value.lastPrice),
        currency: text(value.currency, "", 12) || null,
      } satisfies SupplierProductMapping];
    });
}

export function resolveCanonicalPurchaseItem(input: {
  assortment: unknown;
  document: unknown;
  item: unknown;
  canonicalItems: unknown[];
  now?: string;
}): CanonicalResolution {
  const assortment = record(input.assortment);
  const document = record(input.document);
  const item = record(input.item);
  const now = input.now ?? new Date().toISOString();
  const venueId = numeric(document.venueId ?? item.venueId);
  const supplierId = text(document.supplierId ?? item.supplierId, "", 160) || null;
  const supplierName = text(document.supplierName ?? item.supplierName, "Поставщик", 180);
  const sourceName = text(item.name ?? item.productName, "Товар", 240);
  const canonicalName = canonicalPurchaseName(sourceName, supplierName);
  const supplierSku = text(item.supplierSku ?? item.sku ?? item.externalId, "", 160) || null;
  const barcode = text(item.barcode, "", 160) || null;
  const purchaseUnit = unit(item);
  const sourceItemKey = sourceMappingKey({
    venueId,
    supplierId,
    supplierName,
    supplierSku,
    barcode,
    sourceName,
    purchaseUnit,
  });
  const documentId = text(document.id, "", 120);
  const lineId = text(item.id, "", 120);
  const mappings = canonicalSupplierMappings(assortment);
  const stable = mappings.find((mapping) =>
    mapping.sourceItemKey === sourceItemKey
    && (venueId === null || mapping.venueId === null || mapping.venueId === venueId)
  );
  // The same canonical identity is normally present in both nomenclature and
  // stockBalances.  Rank identities, not storage representations; otherwise
  // the best and second suggestion can be the same product and every valid
  // match becomes artificially ambiguous.
  const candidateIdentities = new Map<string, JsonRecord>();
  for (const candidate of input.canonicalItems.map(record)
    .filter((value) => value.active !== false && text(value.status) !== "archived")
    .filter((value) => belongsToVenue(value, venueId))) {
    const key = text(candidate.productKey ?? candidate.key, "", 300);
    if (key && !candidateIdentities.has(key)) candidateIdentities.set(key, candidate);
  }
  const candidates = [...candidateIdentities.values()];
  const candidateByKey = new Map(candidates.map((candidate) => [
    text(candidate.productKey ?? candidate.key, "", 300),
    candidate,
  ]));
  const requestedKey = text(item.purchaseProductKey ?? item.canonicalProductKey, "", 300);

  let status: CanonicalResolution["status"] = "new";
  let confidence = 0;
  let canonicalProductKey = "";
  let visibleName = canonicalName;
  let suggestions: CanonicalIdentitySuggestion[] = [];

  if (stable && candidateByKey.has(stable.canonicalProductKey)) {
    status = "stable_mapping";
    confidence = 1;
    canonicalProductKey = stable.canonicalProductKey;
    visibleName = text(candidateByKey.get(canonicalProductKey)?.name, canonicalName, 240);
  } else if (requestedKey && candidateByKey.has(requestedKey)) {
    status = "explicit";
    confidence = 1;
    canonicalProductKey = requestedKey;
    visibleName = text(candidateByKey.get(canonicalProductKey)?.name, canonicalName, 240);
  } else {
    suggestions = candidates.map((candidate) => {
      const candidateName = text(candidate.name ?? candidate.productName, "", 240);
      const sameUnit = unit(candidate) === purchaseUnit;
      const lexical = lexicalScore(canonicalName, candidateName);
      const compatible = variantsCompatible(canonicalName, candidateName);
      const score = Math.round(Math.max(0, Math.min(1, lexical + (sameUnit ? 0.08 : -0.25) + (compatible ? 0 : -0.5))) * 100);
      return {
        productKey: text(candidate.productKey ?? candidate.key, "", 300),
        name: candidateName,
        score,
        reason: !compatible ? "разные значимые характеристики" : sameUnit ? "совпадают товар и базовая единица" : "похожее название, но другая единица",
      };
    }).filter((candidate) => candidate.productKey && candidate.score >= 45)
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"))
      .slice(0, 5);
    const best = suggestions[0];
    const second = suggestions[1];
    if (best && best.score >= 90 && (!second || best.score - second.score >= 8)) {
      status = "high_confidence";
      confidence = best.score / 100;
      canonicalProductKey = best.productKey;
      visibleName = best.name;
    } else if (best && best.score >= 62) {
      status = "review";
      confidence = best.score / 100;
    }
  }

  if (!canonicalProductKey) {
    const identity = identityTokens(canonicalName).join(" ") || normalizeCanonicalText(canonicalName);
    canonicalProductKey = `stock:${identity}|${purchaseUnit}`;
  }
  const existingMapping = stable;
  const mappingStatus: SupplierProductMapping["status"] = status === "review"
    ? "review"
    : status === "new"
      ? "auto"
      : status === "explicit" || status === "stable_mapping"
        ? "confirmed"
        : "auto";
  const sourceMapping: SupplierProductMapping = {
    ...(existingMapping ?? {}),
    id: existingMapping?.id ?? `supplier-item:${sourceItemKey}`,
    venueId,
    supplierId,
    supplierName,
    sourceItemKey,
    sourceName,
    normalizedSourceName: normalizeCanonicalText(sourceName),
    supplierSku,
    barcode,
    purchaseUnit,
    packageSize: text(item.packageSize ?? item.unit, "", 120),
    canonicalProductKey,
    status: mappingStatus,
    confidence,
    firstSeenAt: existingMapping?.firstSeenAt || now,
    lastSeenAt: now,
    purchaseDocumentIds: [...new Set([...(existingMapping?.purchaseDocumentIds ?? []), documentId].filter(Boolean))],
    purchaseLineIds: [...new Set([...(existingMapping?.purchaseLineIds ?? []), lineId].filter(Boolean))],
    lastPrice: numeric(item.unitPrice ?? item.lineTotal),
    currency: text(document.currency, "", 12).toUpperCase() || null,
  };
  return {
    canonicalProductKey,
    canonicalName: visibleName,
    status,
    confidence,
    suggestions,
    sourceMapping,
  };
}

export function upsertSupplierProductMapping(
  mappingsValue: unknown,
  mapping: SupplierProductMapping,
): SupplierProductMapping[] {
  // A source item is an identity boundary.  Older imports could leave more
  // than one row for the same sourceItemKey; replacing only the first row
  // kept a stale mapping alive and made the result order-dependent.
  const mappings = canonicalSupplierMappings({ supplierProductMappings: mappingsValue })
    .filter((value) => value.sourceItemKey !== mapping.sourceItemKey);
  return [mapping, ...mappings].slice(0, 10_000);
}

export function supplierEvidenceForCanonical(assortment: unknown, productKey: string): {
  supplierNames: string[];
  aliases: string[];
  sourceCount: number;
} {
  const mappings = canonicalSupplierMappings(assortment)
    .filter((mapping) => mapping.canonicalProductKey === productKey && mapping.status !== "orphan");
  return {
    supplierNames: [...new Set(mappings.map((mapping) => mapping.supplierName).filter(Boolean))],
    aliases: [...new Set(mappings.map((mapping) => mapping.sourceName).filter(Boolean))],
    sourceCount: mappings.length,
  };
}

export function enrichCanonicalSupplierSummary(assortmentValue: unknown): JsonRecord {
  const assortment = { ...record(assortmentValue) };
  const mappings = canonicalSupplierMappings(assortment);
  const byKey = new Map<string, SupplierProductMapping[]>();
  for (const mapping of mappings) {
    const values = byKey.get(mapping.canonicalProductKey) ?? [];
    values.push(mapping);
    byKey.set(mapping.canonicalProductKey, values);
  }
  assortment.nomenclature = array(assortment.nomenclature).map((value) => {
    const item = { ...record(value) };
    const key = text(item.productKey ?? item.key, "", 300);
    const sources = byKey.get(key) ?? [];
    const supplierNames = [...new Set(sources.map((source) => source.supplierName).filter(Boolean))];
    return {
      ...item,
      supplierCount: supplierNames.length,
      supplierNames,
      supplierSourceCount: sources.length,
    };
  });
  assortment.supplierProductMappings = mappings;
  return assortment;
}

export type CanonicalDuplicateCandidate = {
  classification: "safe_merge" | "variant" | "source_masquerading" | "ambiguous";
  primaryProductKey: string;
  secondaryProductKeys: string[];
  names: string[];
  reason: string;
};

export function auditCanonicalNomenclature(input: {
  assortment: unknown;
  purchaseDocuments?: unknown[];
  venueId?: number;
}): JsonRecord {
  const assortment = record(input.assortme
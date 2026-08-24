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
  const assortment = record(input.assortment);
  const venueId = input.venueId ?? null;
  const items = array(assortment.nomenclature).map(record).filter((item) => belongsToVenue(item, venueId));
  const mappings = canonicalSupplierMappings(assortment).filter((mapping) =>
    venueId === null || mapping.venueId === null || mapping.venueId === venueId
  );
  const groups = new Map<string, JsonRecord[]>();
  for (const item of items) {
    const key = `${identityTokens(item.name).join(" ")}|${unit(item)}`;
    const values = groups.get(key) ?? [];
    values.push(item);
    groups.set(key, values);
  }
  const candidates: CanonicalDuplicateCandidate[] = [];
  for (const values of groups.values()) {
    if (values.length < 2) continue;
    const names = values.map((item) => text(item.name, "Товар", 240));
    const keys = values.map((item) => text(item.productKey ?? item.key, "", 300)).filter(Boolean);
    const compatible = values.every((item) => variantsCompatible(values[0].name, item.name));
    candidates.push({
      classification: compatible ? "safe_merge" : "variant",
      primaryProductKey: keys[0],
      secondaryProductKeys: keys.slice(1),
      names,
      reason: compatible
        ? "совпадают нормализованная товарная сущность и базовая единица"
        : "названия похожи, но различаются значимые характеристики",
    });
  }
  for (const item of items) {
    const key = text(item.productKey ?? item.key, "", 300);
    const supplier = mappings.find((mapping) =>
      mapping.canonicalProductKey !== key
      && normalizeCanonicalText(item.name).endsWith(normalizeCanonicalText(mapping.supplierName))
      && lexicalScore(
        canonicalPurchaseName(item.name, mapping.supplierName),
        canonicalPurchaseName(mapping.sourceName, mapping.supplierName),
      ) >= 0.9
    );
    if (!supplier) continue;
    candidates.push({
      classification: "source_masquerading",
      primaryProductKey: supplier.canonicalProductKey,
      secondaryProductKeys: [key],
      names: [text(item.name), supplier.sourceName],
      reason: "supplier/source representation попало в canonical list",
    });
  }
  const referencedKeys = new Set(items.map((item) => text(item.productKey ?? item.key, "", 300)).filter(Boolean));
  const orphanMappings = mappings.filter((mapping) => !referencedKeys.has(mapping.canonicalProductKey));
  const supplierKeyCounts = new Map<string, number>();
  for (const mapping of mappings) supplierKeyCounts.set(mapping.sourceItemKey, (supplierKeyCounts.get(mapping.sourceItemKey) ?? 0) + 1);
  const duplicateSupplierMappings = [...supplierKeyCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  const safeMergeCandidates = candidates.filter((candidate) => candidate.classification === "safe_merge");
  const ambiguousCandidates = candidates.filter((candidate) => candidate.classification === "ambiguous" || candidate.classification === "variant");
  const affectedKeys = new Set(candidates.flatMap((candidate) => [candidate.primaryProductKey, ...candidate.secondaryProductKeys]));
  const recipes = array(assortment.recipes).map(record);
  const affectedTechCardLinks = recipes.reduce((total, recipe) => total + array(recipe.ingredients).map(record)
    .filter((ingredient) => affectedKeys.has(text(ingredient.purchaseProductKey, "", 300))).length, 0);
  const packagingDuplicationCases = items.filter((item) => array(item.packageOptions).length > 1 && item.multiplePackageSizes !== true).length;
  return {
    version: "canonical-supplier-v260",
    venueId,
    contract: "one_real_venue_product_one_canonical_item",
    totalCanonicalItems: items.length,
    supplierSourceItems: mappings.length,
    suspectedCanonicalDuplicates: candidates.length,
    safeMergeCandidates: safeMergeCandidates.length,
    ambiguousCandidates: ambiguousCandidates.length,
    sourceRowsMasqueradingAsProducts: candidates.filter((candidate) => candidate.classification === "source_masquerading").length,
    orphanSupplierItems: orphanMappings.length,
    supplierItemsWithoutCanonicalMapping: orphanMappings.length,
    duplicateSupplierMappings,
    packagingDuplicationCases,
    affectedStockPositions: array(assortment.stockBalances).map(record)
      .filter((balance) => affectedKeys.has(text(balance.productKey ?? balance.key, "", 300))).length,
    affectedTechCardLinks,
    candidates,
  };
}

export function manualCanonicalDuplicateSuggestions(input: {
  assortment: unknown;
  name: string;
  unit: string;
  venueId?: number;
}): CanonicalIdentitySuggestion[] {
  const venueId = input.venueId ?? null;
  return array(record(input.assortment).nomenclature).map(record)
    .filter((item) => belongsToVenue(item, venueId) && item.active !== false)
    .map((item) => {
      const name = text(item.name, "Товар", 240);
      const compatible = variantsCompatible(input.name, name);
      const score = Math.round(Math.max(0, Math.min(1,
        lexicalScore(input.name, name) + (unit(item) === input.unit ? 0.08 : -0.25) + (compatible ? 0 : -0.5),
      )) * 100);
      return {
        productKey: text(item.productKey ?? item.key, "", 300),
        name,
        score,
        reason: compatible ? "похожая canonical-позиция" : "похожее название, но другая характеристика",
      };
    })
    .filter((candidate) => candidate.productKey && candidate.score >= 62)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"))
    .slice(0, 5);
}

function clone(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function stockValue(value: JsonRecord): number {
  const explicit = numeric(value.inventoryValue);
  if (explicit !== null) return Math.max(0, explicit);
  return Math.max(0, numeric(value.current) ?? 0) * Math.max(0, numeric(value.averageUnitCost) ?? 0);
}

/**
 * Explicit preview/non-production reconciliation. It is intentionally not
 * called from normal production writes: a mass canonical merge requires a
 * separate approval and a reviewed report.
 */
export function reconcileCanonicalNomenclaturePreview(input: {
  assortment: unknown;
  stockMovements?: unknown[];
  purchaseDocuments?: unknown[];
  venueId?: number;
  now?: string;
}): {
  assortment: JsonRecord;
  stockMovements: JsonRecord[];
  purchaseDocuments: JsonRecord[];
  report: JsonRecord;
} {
  const now = input.now ?? new Date().toISOString();
  const assortment = clone(input.assortment) as JsonRecord;
  const stockMovements = clone(input.stockMovements ?? []) as JsonRecord[];
  const purchaseDocuments = clone(input.purchaseDocuments ?? []) as JsonRecord[];
  const initialAudit = auditCanonicalNomenclature({
    assortment,
    purchaseDocuments,
    venueId: input.venueId,
  });
  const safeCandidates = array(initialAudit.candidates).map(record)
    .filter((candidate) => candidate.classification === "safe_merge");
  const nomenclature = array(assortment.nomenclature).map(record);
  const balances = array(assortment.stockBalances).map(record);
  const recipes = array(assortment.recipes).map(record);
  let mappings = canonicalSupplierMappings(assortment);
  const aliases = array(assortment.canonicalProductAliases).map(record);
  const supersessions = array(assortment.canonicalSupersessions).map(record);
  const invariants: JsonRecord[] = [];
  let mergedCanonicalItems = 0;
  let remappedMovements = 0;
  let remappedTechCardLinks = 0;
  let skippedConflicts = 0;

  for (const candidate of safeCandidates) {
    const keys = [
      text(candidate.primaryProductKey, "", 300),
      ...array(candidate.secondaryProductKeys).map((value) => text(value, "", 300)),
    ].filter(Boolean);
    const rows = nomenclature.filter((item) => keys.includes(text(item.productKey ?? item.key, "", 300)));
    if (rows.length < 2) continue;
    const rowVenues = new Set(rows.map((row) => numeric(row.venueId)).filter((value) => value !== null));
    if (rowVenues.size > 1 || (input.venueId && [...rowVenues].some((value) => value !== input.venueId))) {
      skippedConflicts += 1;
      continue;
    }
    const relatedBalances = balances.filter((balance) => keys.includes(text(balance.productKey ?? balance.key, "", 300)));
    const currencies = new Set(relatedBalances.map((balance) => text(balance.currency, "", 12).toUpperCase()).filter(Boolean));
    const units = new Set(relatedBalances.map(unit).filter((value) => value !== "unknown"));
    if (currencies.size > 1 || units.size > 1) {
      skippedConflicts += 1;
      continue;
    }
    const requestedPrimaryKey = text(candidate.primaryProductKey, "", 300);
    const primary = rows.find((row) =>
      text(row.productKey ?? row.key, "", 300) === requestedPrimaryKey
    ) ?? [...rows].sort((left, right) => {
      const leftKey = text(left.productKey ?? left.key, "", 300);
      const rightKey = text(right.productKey ?? right.key, "", 300);
      const leftBalance = relatedBalances.find((balance) => text(balance.productKey ?? balance.key, "", 300) === leftKey);
      const rightBalance = relatedBalances.find((balance) => text(balance.productKey ?? balance.key, "", 300) === rightKey);
      return Number(Boolean(right.preferredDisplayName)) - Number(Boolean(left.preferredDisplayName))
        || (numeric(rightBalance?.current) ?? 0) - (numeric(leftBalance?.current) ?? 0)
        || text(left.name).localeCompare(text(right.name), "ru");
    })[0];
    const primaryKey = text(primary.productKey ?? primary.key, "", 300);
    const secondaryKeys = keys.filter((key) => key !== primaryKey);
    const beforeQuantity = relatedBalances.reduce((sum, balance) => sum + (numeric(balance.current) ?? 0), 0);
    const beforeValuation = relatedBalances.reduce((sum, balance) => sum + stockValue(balance), 0);

    const primaryIndex = nomenclature.findIndex((item) => text(item.productKey ?? item.key, "", 300) === primaryKey);
    nomenclature[primaryIndex] = {
      ...primary,
      mergedFromCanonicalKeys: [...new Set([
        ...array(primary.mergedFromCanonicalKeys).map((value) => text(value, "", 300)),
        ...secondaryKeys,
      ].filter(Boolean))],
      supplierProductIdentityVersion: "v260",
      updatedAt: now,
    };
    for (let index = nomenclature.length - 1; index >= 0; index -= 1) {
      const key = text(nomenclature[index].productKey ?? nomenclature[index].key, "", 300);
      if (secondaryKeys.includes(key)) nomenclature.splice(index, 1);
    }

    if (relatedBalances.length) {
      const primaryBalanceIndex = balances.findIndex((balance) => text(balance.productKey ?? balance.key, "", 300) === primaryKey);
      const base = primaryBalanceIndex >= 0 ? balances[primaryBalanceIndex] : relatedBalances[0];
      const mergedBalance = {
        ...base,
        id: primaryKey,
        key: primaryKey,
        productKey: primaryKey,
        name: text(primary.name, text(base.name, "Товар", 240), 240),
        current: beforeQuantity,
        inventoryValue: beforeValuation,
        averageUnitCost: beforeQuantity > 0 ? beforeValuation / beforeQuantity : 0,
        mergedFromProductKeys: [...new Set([
          ...array(base.mergedFromProductKeys).map((value) => text(value, "", 300)),
          ...secondaryKeys,
        ].filter(Boolean))],
        updatedAt: now,
      };
      for (let index = balances.length - 1; index >= 0; index -= 1) {
        const key = text(balances[index].productKey ?? balances[index].key, "", 300);
        if (keys.includes(key)) balances.splice(index, 1);
      }
      balances.unshift(mergedBalance);
    }

    mappings = mappings.map((mapping) => secondaryKeys.includes(mapping.canonicalProductKey)
      ? { ...mapping, canonicalProductKey: primaryKey, updatedAt: now }
      : mapping);
    for (const recipe of recipes) {
      recipe.ingredients = array(recipe.ingredients).map((value) => {
        const ingredient = { ...record(value) };
        const previous = text(ingredient.purchaseProductKey, "", 300);
        if (!secondaryKeys.includes(previous)) return ingredient;
        remappedTechCardLinks += 1;
        return {
          ...ingredient,
          purchaseProductKey: primaryKey,
          canonicalProductKey: primaryKey,
          previousCanonicalProductKey: previous,
          updatedAt: now,
        };
      });
    }
    for (const movement of stockMovements) {
      const previous = text(movement.productKey, "", 300);
      if (!secondaryKeys.includes(previous)) continue;
      movement.originalProductKey = movement.originalProductKey ?? previous;
      movement.productKey = primaryKey;
      movement.updatedAt = now;
      remappedMovements += 1;
    }
    for (const secondaryKey of secondaryKeys) {
      if (!aliases.some((alias) => text(alias.from, "", 300) === secondaryKey)) {
        aliases.push({ from: secondaryKey, to: primaryKey, reason: "canonical-merge-v260", createdAt: now });
      }
      if (!supersessions.some((entry) => text(entry.secondaryProductKey, "", 300) === secondaryKey)) {
        supersessions.push({
          id: `canonical-supersession:${secondaryKey}`,
          venueId: input.venueId ?? numeric(primary.venueId),
          primaryProductKey: primaryKey,
          secondaryProductKey: secondaryKey,
          secondaryName: text(rows.find((row) => text(row.productKey ?? row.key, "", 300) === secondaryKey)?.name, "", 240),
          reason: "safe_canonical_identity_merge",
          createdAt: now,
        });
      }
    }
    const afterBalance = balances.find((balance) => text(balance.productKey ?? balance.key, "", 300) === primaryKey);
    invariants.push({
      primaryProductKey: primaryKey,
      secondaryProductKeys: secondaryKeys,
      quantityBefore: beforeQuantity,
      quantityAfter: numeric(afterBalance?.current) ?? 0,
      valuationBefore: beforeValuation,
      valuationAfter: stockValue(afterBalance ?? {}),
      quantityPreserved: Math.abs(beforeQuantity - (numeric(afterBalance?.current) ?? 0)) < 0.000001,
      valuationPreserved: Math.abs(beforeValuation - stockValue(afterBalance ?? {})) < 0.005,
    });
    mergedCanonicalItems += secondaryKeys.length;
  }

  assortment.nomenclature = nomenclature;
  assortment.stockBalances = balances;
  assortment.recipes = recipes;
  assortment.supplierProductMappings = mappings;
  assortment.canonicalProductAliases = aliases;
  assortment.canonicalSupersessions = supersessions;
  assortment.updatedAt = mergedCanonicalItems ? now : assortment.updatedAt;
  const enriched = enrichCanonicalSupplierSummary(assortment);
  const finalAudit = auditCanonicalNomenclature({
    assortment: enriched,
    purchaseDocuments,
    venueId: input.venueId,
  });
  enriched.nomenclatureIdentityReport = finalAudit;
  return {
    assortment: enriched,
    stockMovements,
    purchaseDocuments,
    report: {
      version: "canonical-reconciliation-v260",
      changed: mergedCanonicalItems > 0,
      mergedCanonicalItems,
      remappedMovements,
      remappedTechCardLinks,
      skippedConflicts,
      historicalPurchaseDocumentsRewritten: 0,
      historicalInventorySnapshotsRewritten: 0,
      invariants,
      before: initialAudit,
      after: finalAudit,
    },
  };
}

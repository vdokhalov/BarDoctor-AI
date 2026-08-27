import type { PurchaseDocument, PurchaseItem } from "./purchases";
import {
  fuzzyNomenclatureScore,
  normalizeInvoiceText,
  packageFingerprint,
  parsedInvoiceDocumentFromLegacy,
  upsertConfirmedSupplierMappings,
  type NomenclatureCandidate,
  type ParsedInvoiceDocument,
  type ParsedInvoiceLine,
  type SupplierItemMapping,
} from "./invoice-recognition-v2";

function sourceIds(document: PurchaseDocument): string[] {
  return [...new Set([
    ...(Array.isArray(document.sourceFileIds) ? document.sourceFileIds : []),
    document.sourceFileId ?? "",
  ].filter(Boolean))];
}

function targetKey(item: PurchaseItem, candidates: NomenclatureCandidate[] = []): string {
  const references = [item.nomenclatureId, item.purchaseProductKey]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  for (const reference of references) {
    const candidate = candidates.find((value) => value.id === reference || value.key === reference);
    if (candidate) return candidate.key;
  }
  return references[0] ?? "";
}

export function selectProductionHybridDocuments(
  documents: PurchaseDocument[],
  venueId: number,
): { selected: PurchaseDocument[]; invoice394Included: boolean; invoice394Reason: string | null } {
  const eligible = documents.filter((document) =>
    Number(document.venueId ?? venueId) === venueId
    && document.status !== "draft"
    && document.status !== "cancelled"
    && sourceIds(document).length > 0
    && document.items.length > 0
    && document.items.some((item) => Boolean(targetKey(item)))
  );
  const invoice394 = eligible.find((document) => String(document.documentNumber ?? "") === "394");
  const selected: PurchaseDocument[] = [];
  const add = (document: PurchaseDocument | undefined) => {
    if (document && !selected.some((item) => item.id === document.id)) selected.push(document);
  };
  add(invoice394);

  const remaining = eligible.filter((document) => document.id !== invoice394?.id);
  add([...remaining].sort((left, right) => left.items.length - right.items.length)[0]);
  const medium = [...remaining]
    .filter((document) => !selected.some((item) => item.supplierId === document.supplierId))
    .sort((left, right) => Math.abs(left.items.length - 10) - Math.abs(right.items.length - 10))[0];
  add(medium);
  const large = [...remaining]
    .filter((document) => !selected.some((item) => item.supplierId === document.supplierId))
    .sort((left, right) => right.items.length - left.items.length)[0];
  add(large);

  for (const document of [...remaining].sort((left, right) => right.items.length - left.items.length)) {
    if (selected.length >= 3) break;
    add(document);
  }
  return {
    selected: selected.slice(0, 3),
    invoice394Included: Boolean(invoice394 && selected.some((document) => document.id === invoice394.id)),
    invoice394Reason: invoice394 ? null : "not_found_in_authoritative_koln_history",
  };
}

export function storedPurchaseAsParsed(document: PurchaseDocument): ParsedInvoiceDocument {
  return parsedInvoiceDocumentFromLegacy(document);
}

export function canonicalGroundTruthPurchase(input: {
  document: PurchaseDocument;
  supplierId: string;
  mappings: SupplierItemMapping[];
  candidates: NomenclatureCandidate[];
}): PurchaseDocument {
  return {
    ...input.document,
    items: input.document.items.map((item) => {
      const normalizedName = item.normalizedRawName ?? normalizeInvoiceText(item.rawName ?? item.name);
      const sourcePackage = packageFingerprint(item.packageSize ?? item.unit);
      const matchingKeys = new Set(input.mappings
        .filter((mapping) => {
          if (mapping.supplierId !== input.supplierId || mapping.normalizedRawName !== normalizedName) return false;
          const mappingPackage = mapping.packageFingerprint ?? packageFingerprint(mapping.purchaseUnit);
          return !sourcePackage || !mappingPackage || sourcePackage === mappingPackage;
        })
        .map((mapping) => {
          const candidate = input.candidates.find((value) =>
            value.id === mapping.nomenclatureId || value.key === mapping.nomenclatureId
          );
          return candidate?.key ?? "";
        })
        .filter(Boolean));
      if (matchingKeys.size !== 1) return item;
      const canonicalKey = [...matchingKeys][0];
      const candidate = input.candidates.find((value) => value.key === canonicalKey);
      if (!candidate) return item;
      return { ...item, nomenclatureId: candidate.id, purchaseProductKey: candidate.key };
    }),
  };
}

function candidateKey(line: ParsedInvoiceLine, candidates: NomenclatureCandidate[]): string {
  for (const reference of [line.nomenclatureId, line.purchaseProductKey]) {
    if (!reference) continue;
    const candidate = candidates.find((value) => value.id === reference || value.key === reference);
    if (candidate) return candidate.key;
  }
  return line.purchaseProductKey ?? line.nomenclatureId ?? "";
}

function nameScore(actual: ParsedInvoiceLine, expected: PurchaseItem): number {
  const name = expected.rawName ?? expected.name;
  if (normalizeInvoiceText(actual.rawName) === normalizeInvoiceText(name)) return 1;
  return fuzzyNomenclatureScore(actual.rawName, {
    id: "expected",
    key: "expected",
    name,
    unit: expected.unit,
    packageSize: expected.packageSize ?? "",
    aliases: [],
  });
}

export function productionMatchingQuality(input: {
  document: ParsedInvoiceDocument;
  expected: PurchaseDocument;
  candidates: NomenclatureCandidate[];
}) {
  const unused = new Set(input.expected.items.map((_, index) => index));
  let correct = 0;
  let incorrect = 0;
  let criticalHighFalsePositives = 0;
  let unpairedActual = 0;
  let packageConflicts = 0;
  let pairedLines = 0;
  let quantityCorrect = 0;
  let unitCorrect = 0;
  let packageCorrect = 0;
  let unitPriceCorrect = 0;
  let lineTotalCorrect = 0;
  for (const line of input.document.items) {
    const ranked = [...unused]
      .map((index) => ({ index, score: nameScore(line, input.expected.items[index]) }))
      .sort((left, right) => right.score - left.score);
    const pair = ranked[0]?.score >= 0.65 ? ranked[0] : null;
    if (!pair) {
      unpairedActual += 1;
      continue;
    }
    unused.delete(pair.index);
    const expected = input.expected.items[pair.index];
    pairedLines += 1;
    if (Math.abs(line.quantity - expected.quantity) <= 0.001) quantityCorrect += 1;
    if (normalizeInvoiceText(line.unit) === normalizeInvoiceText(expected.unit)) unitCorrect += 1;
    const actualPackage = packageFingerprint(line.packageSize ?? line.unit);
    const expectedPackage = packageFingerprint(expected.packageSize ?? expected.unit);
    if (actualPackage === expectedPackage) packageCorrect += 1;
    if (Math.abs(line.unitPrice - expected.unitPrice) <= 0.01) unitPriceCorrect += 1;
    if (Math.abs(line.lineTotal - expected.lineTotal) <= 0.01) lineTotalCorrect += 1;
    const expectedKey = targetKey(expected, input.candidates);
    const actualKey = candidateKey(line, input.candidates);
    if (!expectedKey || !actualKey) {
      unpairedActual += 1;
      continue;
    }
    const sourcePackage = packageFingerprint(`${line.rawName} ${line.packageSize ?? ""}`);
    const selected = input.candidates.find((candidate) => candidate.key === actualKey || candidate.id === line.nomenclatureId);
    const selectedPackage = packageFingerprint(`${selected?.name ?? ""} ${selected?.packageSize ?? ""}`);
    if (sourcePackage && selectedPackage && sourcePackage !== selectedPackage) packageConflicts += 1;
    if (actualKey === expectedKey) correct += 1;
    else {
      incorrect += 1;
      if (!line.requiresReview && line.confidenceLevel === "high") criticalHighFalsePositives += 1;
    }
  }
  return {
    correct,
    incorrect,
    criticalHighFalsePositives,
    unknownNeedsDecision: Math.max(unpairedActual, unused.size),
    packageConflicts,
    accepts: input.document.items.filter((line) => !line.requiresReview && Boolean(candidateKey(line, input.candidates))).length,
    manualConfirmation: input.document.items.filter((line) => line.requiresReview && Boolean(candidateKey(line, input.candidates))).length,
    manualSearch: input.document.items.filter((line) => line.requiresReview && !candidateKey(line, input.candidates)).length,
    commercialFields: {
      pairedLines,
      quantityCorrect,
      unitCorrect,
      packageCorrect,
      unitPriceCorrect,
      lineTotalCorrect,
    },
  };
}

export function confirmedMemoryFromReviewedGroundTruth(input: {
  current?: SupplierItemMapping[];
  venueId: number;
  supplierId: string;
  actorAccountId: number;
  recognized: ParsedInvoiceDocument;
  groundTruth: PurchaseDocument;
  candidates: NomenclatureCandidate[];
  now?: string;
}): SupplierItemMapping[] {
  const unused = new Set(input.groundTruth.items.map((_, index) => index));
  const items = input.recognized.items.flatMap((line) => {
    const pair = [...unused]
      .map((index) => ({ index, score: nameScore(line, input.groundTruth.items[index]) }))
      .sort((left, right) => right.score - left.score)[0];
    if (!pair || pair.score < 0.65) return [];
    unused.delete(pair.index);
    const canonicalKey = targetKey(input.groundTruth.items[pair.index], input.candidates);
    if (!canonicalKey) return [];
    return [{
      rawName: line.rawName,
      normalizedRawName: line.normalizedRawName,
      nomenclatureId: canonicalKey,
      supplierArticle: line.supplierArticle,
      barcode: line.barcode,
      packageSize: line.packageSize,
      unit: line.unit,
    }];
  });
  return upsertConfirmedSupplierMappings({
    current: input.current ?? [],
    venueId: input.venueId,
    supplierId: input.supplierId,
    actorAccountId: input.actorAccountId,
    now: input.now,
    items,
  });
}

export function confirmedMemoryFromPurchase(input: {
  current?: SupplierItemMapping[];
  venueId: number;
  supplierId: string;
  actorAccountId: number;
  document: PurchaseDocument;
  candidates?: NomenclatureCandidate[];
  now?: string;
}): SupplierItemMapping[] {
  return upsertConfirmedSupplierMappings({
    current: input.current ?? [],
    venueId: input.venueId,
    supplierId: input.supplierId,
    actorAccountId: input.actorAccountId,
    now: input.now,
    items: input.document.items.map((item) => ({
      rawName: item.rawName ?? item.name,
      normalizedRawName: item.normalizedRawName ?? normalizeInvoiceText(item.rawName ?? item.name),
      nomenclatureId: targetKey(item, input.candidates),
      packageSize: item.packageSize,
      unit: item.unit,
    })),
  });
}

export function productionSourceFileIds(document: PurchaseDocument): string[] {
  return sourceIds(document);
}

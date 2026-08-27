import { performance } from "node:perf_hooks";
import {
  runInvoiceAIBulkMatching,
  type InvoiceAIMatchingProvider,
} from "../lib/bardoctor/invoice-ai-matching";
import {
  applyDeterministicMappings,
  normalizeInvoiceText,
  recognitionMetrics,
  upsertConfirmedSupplierMappings,
  type NomenclatureCandidate,
  type ParsedInvoiceDocument,
} from "../lib/bardoctor/invoice-recognition-v2";

const totalLines = 500;
const resourceStarted = process.resourceUsage();
const seenBatchIds = new Set<string>();
let duplicateBatchCalls = 0;
const nomenclature: NomenclatureCandidate[] = Array.from({ length: 1_200 }, (_, index) => ({
  id: `product-${index}`,
  key: `stock:product-${index}|pcs`,
  name: `Товар ${index}`,
  unit: "pcs",
  packageSize: "1 шт.",
  aliases: [],
}));

const sourceItems = Array.from({ length: totalLines }, (_, index) => ({
  id: `line-${index}`,
  rawName: `SUP-${index} Товар ${index}`,
  normalizedRawName: normalizeInvoiceText(`SUP-${index} Товар ${index}`),
  name: `SUP-${index} Товар ${index}`,
  quantity: 1,
  unit: "шт.",
  packageSize: "1 шт.",
  unitPrice: 10,
  lineTotal: 10,
  confidence: 0.94,
  confidenceLevel: "high" as const,
  requiresReview: index >= 200,
  ...(index < 120 ? {
    mappingSource: "exact_alias" as const,
    nomenclatureId: `product-${index}`,
    purchaseProductKey: `stock:product-${index}|pcs`,
    nomenclatureName: `Товар ${index}`,
  } : index < 200 ? {
    mappingSource: "fuzzy" as const,
    nomenclatureId: `product-${index}`,
    purchaseProductKey: `stock:product-${index}|pcs`,
    nomenclatureName: `Товар ${index}`,
  } : {
    confidenceLevel: "medium" as const,
    mappingCandidates: [{
      id: `product-${index}`,
      key: `stock:product-${index}|pcs`,
      name: `Товар ${index}`,
      score: 0.74,
      unit: "pcs",
      packageSize: "1 шт.",
    }],
  }),
}));

const document: ParsedInvoiceDocument = {
  documentType: "invoice",
  supplierId: "supplier-first",
  supplierName: "Новый поставщик",
  supplierType: "wholesale",
  currency: "RUB",
  paymentMethod: "unknown",
  total: 5_000,
  confidence: 0.94,
  warnings: [],
  items: sourceItems,
};

const provider: InvoiceAIMatchingProvider = {
  async match(batch) {
    if (seenBatchIds.has(batch.batchId)) duplicateBatchCalls += 1;
    seenBatchIds.add(batch.batchId);
    return {
      lines: batch.lines.map((line) => {
        const index = Number(line.lineId.split("-").at(-1));
        const confidence = index < 440 ? 0.94 : index < 480 ? 0.76 : 0;
        const selected = confidence ? line.candidates[0]?.id ?? null : null;
        return {
          lineId: line.lineId,
          nomenclatureId: selected,
          confidence,
          reason: selected ? "alias_or_abbreviation" : "no_match",
          alternateNomenclatureId: null,
          unresolved: confidence < 0.88,
        };
      }),
    };
  },
};

const firstStarted = performance.now();
const first = await runInvoiceAIBulkMatching({ document, jobId: "simulation-first", provider });
const firstDurationMs = Math.round((performance.now() - firstStarted) * 10) / 10;
const firstMetrics = recognitionMetrics({
  mode: "primary",
  ocr: null,
  document: first.document,
  aiFallbackLinesCount: first.sentLines,
  aiRequestCount: first.requestCount,
  aiEstimatedInputTokens: first.estimatedInputTokens,
  aiEstimatedOutputTokens: first.estimatedOutputTokens,
  aiEstimatedTokenUsage: first.estimatedInputTokens + first.estimatedOutputTokens,
  nomenclatureCandidatesCount: nomenclature.length,
  matchingDurationMs: firstDurationMs,
  startedAt: Date.now(),
});

const confirmedItems = first.document.items.map((line, index) => line.nomenclatureId ? line : ({
  ...line,
  nomenclatureId: `product-${index}`,
  purchaseProductKey: `stock:product-${index}|pcs`,
  mappingSource: "manual" as const,
  confidence: 1,
  confidenceLevel: "high" as const,
  requiresReview: false,
}));
const learned = upsertConfirmedSupplierMappings({
  current: [],
  venueId: 10,
  supplierId: "supplier-first",
  actorAccountId: 7,
  items: confirmedItems,
  now: "2026-08-26T15:00:00.000Z",
});

const repeatSource: ParsedInvoiceDocument = {
  ...document,
  items: sourceItems.map((line) => ({
    ...line,
    mappingSource: undefined,
    nomenclatureId: undefined,
    purchaseProductKey: undefined,
    nomenclatureName: undefined,
    mappingCandidates: undefined,
    requiresReview: false,
  })),
};
const repeatStarted = performance.now();
const repeatDeterministic = applyDeterministicMappings({
  document: repeatSource,
  supplierId: "supplier-first",
  venueId: 10,
  mappings: learned,
  nomenclature,
});
const repeat = await runInvoiceAIBulkMatching({
  document: repeatDeterministic,
  jobId: "simulation-repeat",
  provider,
});
const repeatDurationMs = Math.round((performance.now() - repeatStarted) * 10) / 10;
const resourceFinished = process.resourceUsage();
const resultLineIds = first.document.items.map((line) => line.id);

console.log(JSON.stringify({
  firstInvoice: {
    totalLines,
    historicalMappingHits: 0,
    deterministicResolved: 200,
    exactResolved: 120,
    fuzzyResolved: 80,
    sentToAI: first.sentLines,
    aiHigh: first.highCount,
    aiMedium: first.mediumCount,
    aiNoMatch: first.noMatchCount,
    manualSearchRequired: first.noMatchCount,
    aiRequests: first.requestCount,
    estimatedInputTokens: first.estimatedInputTokens,
    estimatedOutputTokens: first.estimatedOutputTokens,
    estimatedTotalTokens: firstMetrics.aiEstimatedTokenUsage,
    processingDurationMs: firstDurationMs,
  },
  repeatInvoice: {
    totalLines,
    historicalMappingHits: repeat.document.items.filter((line) => line.mappingSource === "history").length,
    sentToAI: repeat.sentLines,
    aiRequests: repeat.requestCount,
    estimatedTotalTokens: repeat.estimatedInputTokens + repeat.estimatedOutputTokens,
    manualSearchRequired: repeat.document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
    processingDurationMs: repeatDurationMs,
  },
  integrity: {
    outputLines: resultLineIds.length,
    uniqueLineIds: new Set(resultLineIds).size,
    duplicateBatchCalls,
    uniqueBatches: seenBatchIds.size,
  },
  resources: {
    maxRssMiB: Math.round(resourceFinished.maxRSS / 1024 * 10) / 10,
    userCpuMs: Math.round((resourceFinished.userCPUTime - resourceStarted.userCPUTime) / 100) / 10,
    systemCpuMs: Math.round((resourceFinished.systemCPUTime - resourceStarted.systemCPUTime) / 100) / 10,
    heapUsedMiB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
  },
}, null, 2));

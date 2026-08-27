import { performance } from "node:perf_hooks";
import {
  runInvoiceAIBulkMatching,
  type InvoiceAIMatchingProvider,
} from "../lib/bardoctor/invoice-ai-matching";
import {
  applyDeterministicMappings,
  upsertConfirmedSupplierMappings,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../lib/bardoctor/invoice-recognition-v2";
import {
  changedInvoice394Document,
  INVOICE_394_SUPPLIER_ID,
  INVOICE_394_VENUE_ID,
  invoice394Document,
  invoice394GroundTruth,
  representativeNomenclature,
} from "../lib/bardoctor/invoice-394-representative-fixture";

const provider: InvoiceAIMatchingProvider = {
  async match(batch) {
    return {
      lines: batch.lines.map((line) => {
        const [best, second] = line.candidates;
        const margin = (best?.score ?? 0) - (second?.score ?? 0);
        const high = Boolean(best && best.score >= 0.82 && margin >= 0.1);
        const medium = Boolean(best && best.score >= 0.64 && margin >= 0.08);
        return {
          lineId: line.lineId,
          nomenclatureId: high || medium ? best?.id ?? null : null,
          confidence: high ? 0.93 : medium ? 0.76 : 0,
          reason: high || medium ? "alias_or_abbreviation" : "no_match",
          alternateNomenclatureId: medium ? second?.id ?? null : null,
          unresolved: !high,
        };
      }),
    };
  },
};

function deterministic(document: ParsedInvoiceDocument, mappings: SupplierItemMapping[] = []) {
  return applyDeterministicMappings({
    document,
    supplierId: INVOICE_394_SUPPLIER_ID,
    venueId: INVOICE_394_VENUE_ID,
    mappings,
    nomenclature: representativeNomenclature(),
  });
}

function quality(document: ParsedInvoiceDocument) {
  let correct = 0;
  let incorrect = 0;
  for (const line of document.items) {
    if (!line.nomenclatureId) continue;
    if (invoice394GroundTruth.get(line.id) === line.nomenclatureId) correct += 1;
    else incorrect += 1;
  }
  return {
    correct,
    incorrect,
    falsePositiveRate: correct + incorrect ? incorrect / (correct + incorrect) : 0,
    manualConfirmation: document.items.filter((line) => line.requiresReview && Boolean(line.nomenclatureId)).length,
    manualSearch: document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
  };
}

const firstStart = performance.now();
const firstDeterministicStart = performance.now();
const firstDeterministic = deterministic(invoice394Document());
const firstDeterministicMs = performance.now() - firstDeterministicStart;
const firstAiStart = performance.now();
const first = await runInvoiceAIBulkMatching({ document: firstDeterministic, jobId: "qa-394-first", provider });
const firstAiMs = performance.now() - firstAiStart;
const firstTotalMs = performance.now() - firstStart;

const confirmed = first.document.items.map((line) => {
  const targetId = invoice394GroundTruth.get(line.id)!;
  const target = representativeNomenclature().find((candidate) => candidate.id === targetId)!;
  return {
    ...line,
    nomenclatureId: target.id,
    purchaseProductKey: target.key,
    mappingSource: line.nomenclatureId === target.id ? line.mappingSource : "manual" as const,
    confidence: 1,
    confidenceLevel: "high" as const,
    requiresReview: false,
  };
});
const stored = upsertConfirmedSupplierMappings({
  current: [], venueId: INVOICE_394_VENUE_ID, supplierId: INVOICE_394_SUPPLIER_ID,
  actorAccountId: 7, items: confirmed, now: "2026-08-27T10:00:00.000Z",
});
const persistedJson = JSON.stringify(stored);
const restored = JSON.parse(persistedJson) as SupplierItemMapping[];

const repeatStart = performance.now();
const repeatDeterministic = deterministic(invoice394Document(), restored);
const repeat = await runInvoiceAIBulkMatching({ document: repeatDeterministic, jobId: "qa-394-repeat", provider });
const repeatTotalMs = performance.now() - repeatStart;

const changeStart = performance.now();
const changeDeterministic = deterministic(changedInvoice394Document(), restored);
const change = await runInvoiceAIBulkMatching({ document: changeDeterministic, jobId: "qa-394-change", provider });
const changeTotalMs = performance.now() - changeStart;

const unavailableDeterministic = deterministic(invoice394Document());
const unavailable = await runInvoiceAIBulkMatching({
  document: unavailableDeterministic,
  jobId: "qa-394-unavailable",
  provider: {
    async match() {
      throw Object.assign(new Error("unavailable"), { status: 429, code: "insufficient_quota" });
    },
  },
});

const foreignVenue = applyDeterministicMappings({
  document: invoice394Document(),
  supplierId: INVOICE_394_SUPPLIER_ID,
  venueId: INVOICE_394_VENUE_ID + 1,
  mappings: restored,
  nomenclature: representativeNomenclature(),
});

console.log(JSON.stringify({
  dataset: {
    invoiceLines: 15,
    canonicalPositions: representativeNomenclature().length,
    hiddenGroundTruthTargets: invoice394GroundTruth.size,
  },
  firstInvoice: {
    totalLines: first.document.items.length,
    historical: first.document.items.filter((line) => line.mappingSource === "history").length,
    exact: first.document.items.filter((line) => ["supplier_identifier", "exact_alias"].includes(line.mappingSource ?? "")).length,
    fuzzy: first.document.items.filter((line) => line.mappingSource === "fuzzy").length,
    sentToAI: first.sentLines,
    aiHigh: first.highCount,
    aiMedium: first.mediumCount,
    aiLowOrNoMatch: first.noMatchCount,
    ...quality(first.document),
    aiRequests: first.requestCount,
    estimatedInputTokens: first.estimatedInputTokens,
    estimatedOutputTokens: first.estimatedOutputTokens,
    estimatedCostUsd: null,
    deterministicLatencyMs: Math.round(firstDeterministicMs * 100) / 100,
    aiLatencyMs: Math.round(firstAiMs * 100) / 100,
    totalLatencyMs: Math.round(firstTotalMs * 100) / 100,
  },
  repeatInvoice: {
    historicalHits: repeat.document.items.filter((line) => line.mappingSource === "history").length,
    exactOrFuzzyRemaining: repeat.document.items.filter((line) => ["supplier_identifier", "exact_alias", "fuzzy"].includes(line.mappingSource ?? "")).length,
    aiLines: repeat.sentLines,
    aiRequests: repeat.requestCount,
    tokens: repeat.estimatedInputTokens + repeat.estimatedOutputTokens,
    ...quality(repeat.document),
    totalLatencyMs: Math.round(repeatTotalMs * 100) / 100,
  },
  changedInvoice: {
    historicalHits: change.document.items.filter((line) => line.mappingSource === "history").length,
    aiLines: change.sentLines,
    aiRequests: change.requestCount,
    manualConfirmation: change.document.items.filter((line) => line.requiresReview && Boolean(line.nomenclatureId)).length,
    manualSearch: change.document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
    totalLatencyMs: Math.round(changeTotalMs * 100) / 100,
  },
  resilience: {
    aiUnavailable: unavailable.unavailable,
    deterministicResultsPreserved: unavailable.document.items.filter((line) => !line.requiresReview).length
      === unavailableDeterministic.items.filter((line) => !line.requiresReview).length,
    providerErrors: unavailable.providerErrors,
    foreignVenueHistoricalHits: foreignVenue.items.filter((line) => line.mappingSource === "history").length,
  },
}, null, 2));

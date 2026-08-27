import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { createOpenAIInvoiceMatchingProvider } from "../../../../lib/bardoctor/invoice-ai-openai-provider";
import { runInvoiceAIBulkMatching } from "../../../../lib/bardoctor/invoice-ai-matching";
import {
  changedInvoice394Document,
  INVOICE_394_SUPPLIER_ID,
  INVOICE_394_VENUE_ID,
  invoice394Document,
  invoice394GroundTruth,
  representativeNomenclature,
} from "../../../../lib/bardoctor/invoice-394-representative-fixture";
import {
  applyDeterministicMappings,
  upsertConfirmedSupplierMappings,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../../../../lib/bardoctor/invoice-recognition-v2";

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

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (account.role !== "owner") {
    return Response.json({ ok: false, code: "ACCESS_DENIED", error: "QA-проверка доступна только владельцу" }, { status: 403 });
  }
  if (new URL(request.url).searchParams.get("dataset") !== "invoice-394") {
    return Response.json({ ok: false, code: "QA_DATASET_REQUIRED", error: "Укажите isolated QA dataset" }, { status: 400 });
  }

  const runId = crypto.randomUUID();
  const provider = createOpenAIInvoiceMatchingProvider({
    accountId: account.id,
    actorAccountId: account.actorAccountId,
    venueId: account.venueId,
    jobId: `representative-394-${runId}`,
  });
  const firstStart = performance.now();
  const deterministicStart = performance.now();
  const firstDeterministic = deterministic(invoice394Document());
  const deterministicLatencyMs = performance.now() - deterministicStart;
  const aiStart = performance.now();
  const first = await runInvoiceAIBulkMatching({ document: firstDeterministic, jobId: `${runId}-first`, provider });
  const aiLatencyMs = performance.now() - aiStart;
  const firstTotalLatencyMs = performance.now() - firstStart;

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
  const saved = upsertConfirmedSupplierMappings({
    current: [],
    venueId: INVOICE_394_VENUE_ID,
    supplierId: INVOICE_394_SUPPLIER_ID,
    actorAccountId: account.actorAccountId,
    items: confirmed,
  });
  // This endpoint never writes production business data. Serializing and restoring the
  // exact domain_data payload proves the process-cache boundary safely.
  const restored = JSON.parse(JSON.stringify(saved)) as SupplierItemMapping[];
  const repeatStart = performance.now();
  const repeatDeterministic = deterministic(invoice394Document(), restored);
  const repeat = await runInvoiceAIBulkMatching({ document: repeatDeterministic, jobId: `${runId}-repeat`, provider });
  const repeatLatencyMs = performance.now() - repeatStart;

  const changeStart = performance.now();
  const changeDeterministic = deterministic(changedInvoice394Document(), restored);
  const changed = await runInvoiceAIBulkMatching({ document: changeDeterministic, jobId: `${runId}-changed`, provider });
  const changedLatencyMs = performance.now() - changeStart;

  const result = {
    ok: true,
    isolated: true,
    businessDataWritten: false,
    observabilityWritten: true,
    dataset: { invoiceLines: 15, canonicalPositions: representativeNomenclature().length, groundTruthTargets: 15 },
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
      deterministicLatencyMs: Math.round(deterministicLatencyMs),
      aiLatencyMs: Math.round(aiLatencyMs),
      totalLatencyMs: Math.round(firstTotalLatencyMs),
    },
    repeatInvoice: {
      historicalHits: repeat.document.items.filter((line) => line.mappingSource === "history").length,
      exactOrFuzzyRemaining: repeat.document.items.filter((line) => ["supplier_identifier", "exact_alias", "fuzzy"].includes(line.mappingSource ?? "")).length,
      aiLines: repeat.sentLines,
      aiRequests: repeat.requestCount,
      tokens: repeat.estimatedInputTokens + repeat.estimatedOutputTokens,
      ...quality(repeat.document),
      latencyMs: Math.round(repeatLatencyMs),
    },
    changedInvoice: {
      historicalHits: changed.document.items.filter((line) => line.mappingSource === "history").length,
      aiLines: changed.sentLines,
      aiRequests: changed.requestCount,
      manualConfirmation: changed.document.items.filter((line) => line.requiresReview && Boolean(line.nomenclatureId)).length,
      manualSearch: changed.document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
      latencyMs: Math.round(changedLatencyMs),
    },
  };
  console.info("INVOICE_MATCHING_REPRESENTATIVE_QA", {
    actorAccountId: account.actorAccountId,
    venueId: account.venueId,
    runId,
    firstInvoice: result.firstInvoice,
    repeatInvoice: result.repeatInvoice,
    changedInvoice: result.changedInvoice,
  });
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

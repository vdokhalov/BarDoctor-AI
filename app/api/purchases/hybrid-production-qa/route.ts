import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { createOpenAIInvoiceMatchingProvider } from "../../../../lib/bardoctor/invoice-ai-openai-provider";
import { runInvoiceAIBulkMatching } from "../../../../lib/bardoctor/invoice-ai-matching";
import { configuredInvoiceOcr } from "../../../../lib/bardoctor/invoice-ocr";
import {
  canonicalGroundTruthPurchase,
  confirmedMemoryFromPurchase,
  productionMatchingQuality,
  productionSourceFileIds,
  selectProductionHybridDocuments,
  storedPurchaseAsParsed,
} from "../../../../lib/bardoctor/invoice-production-validation";
import {
  applyDeterministicMappings,
  canonicalInvoiceSupplierMappings,
  invoiceRecognitionMode,
  nomenclatureCandidates,
  normalizeInvoiceText,
  parseInvoiceOcr,
  recognitionQualityAgainstGroundTruth,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../../../../lib/bardoctor/invoice-recognition-v2";
import type { PurchaseDocument } from "../../../../lib/bardoctor/purchases";

type StoreRow = { store_key: string; data_json: string };
type UsageRow = {
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  status: string;
  error_code: string | null;
};
type JsonRecord = Record<string, unknown>;

const VENUE_ID = 1;
const DATA_ACCOUNT_ID = 1;
const REQUIRED_INTENT = "validate-koln-hybrid-v2-read-only";
const STORE_KEYS = ["bd_assortment_v1", "bd_purchase_documents", "bd_suppliers", "bd_invoice_supplier_mappings_v2"];

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function parse(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try { return JSON.parse(value) as unknown; } catch { return fallback; }
}

function environment(): Record<string, unknown> {
  return env as unknown as Record<string, unknown>;
}

function supplierIdFor(document: PurchaseDocument, suppliers: JsonRecord[]): string | undefined {
  if (document.supplierId) return document.supplierId;
  const name = normalizeInvoiceText(document.supplierName);
  return String(suppliers.find((supplier) => normalizeInvoiceText(supplier.name) === name)?.id ?? "") || undefined;
}

function assortmentWithoutSupplierMappings(assortment: unknown, supplierId: string): JsonRecord {
  const root = structuredClone(record(assortment));
  root.supplierProductMappings = array(root.supplierProductMappings).filter((value) =>
    String(record(value).supplierId ?? "") !== supplierId
  );
  return root;
}

async function stores(): Promise<Map<string, string>> {
  const placeholders = STORE_KEYS.map(() => "?").join(",");
  const result = await getD1().prepare(`
    SELECT store_key, data_json FROM domain_data
    WHERE account_id = ? AND store_key IN (${placeholders})
  `).bind(DATA_ACCOUNT_ID, ...STORE_KEYS).all<StoreRow>();
  return new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
}

async function sourceOcr(document: PurchaseDocument) {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  const ids = productionSourceFileIds(document);
  if (!bucket || !ids.length) return { ocr: null, source: "stored_structured_source" as const, error: "source_unavailable" };
  const documents = [] as Array<{ bytes: Uint8Array; filename: string; mimeType: string }>;
  for (const [index, id] of ids.entries()) {
    const object = await bucket.get(`purchases/${DATA_ACCOUNT_ID}/${id}`);
    if (!object) return { ocr: null, source: "stored_structured_source" as const, error: "source_file_missing" };
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    documents.push({
      bytes: new Uint8Array(await object.arrayBuffer()),
      filename: document.sourceFileNames?.[index] ?? document.sourceFileName ?? `invoice-${index + 1}.jpg`,
      mimeType: headers.get("content-type") ?? document.sourceFileTypes?.[index] ?? document.sourceFileType ?? "image/jpeg",
    });
  }
  try {
    return {
      ocr: await configuredInvoiceOcr({ documents, environment: environment() }),
      source: "production_original" as const,
      error: null,
    };
  } catch (error) {
    return {
      ocr: null,
      source: "stored_structured_source" as const,
      error: error instanceof Error ? error.name : "ocr_unavailable",
    };
  }
}

function expected(document: PurchaseDocument) {
  return {
    supplierName: document.supplierName,
    documentNumber: document.documentNumber,
    date: document.date,
    currency: document.currency,
    total: document.total,
    items: document.items.map((item) => ({
      rawName: item.rawName ?? item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };
}

async function usage(jobId: string) {
  const result = await getD1().prepare(`
    SELECT model, input_tokens, output_tokens, total_tokens, latency_ms, status, error_code
    FROM ai_usage_events
    WHERE account_id = ? AND venue_id = ? AND feature LIKE ?
    ORDER BY id
  `).bind(DATA_ACCOUNT_ID, VENUE_ID, `invoice_matching.${jobId}.%`).all<UsageRow>();
  const rows = result.results ?? [];
  return {
    model: rows.find((row) => row.model)?.model ?? null,
    requests: rows.length,
    inputTokens: rows.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
    totalTokens: rows.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0),
    providerLatencyMs: rows.reduce((sum, row) => sum + Number(row.latency_ms ?? 0), 0),
    errors: [...new Set(rows.map((row) => row.error_code).filter(Boolean))],
  };
}

async function validateDocument(input: {
  document: PurchaseDocument;
  assortment: unknown;
  suppliers: JsonRecord[];
  standaloneMappings: SupplierItemMapping[];
  actorAccountId: number;
  runId: string;
}) {
  const startedAt = Date.now();
  const supplierId = supplierIdFor(input.document, input.suppliers);
  if (!supplierId) throw new Error("SUPPLIER_ID_REQUIRED");
  const firstAssortment = assortmentWithoutSupplierMappings(input.assortment, supplierId);
  const candidates = nomenclatureCandidates(firstAssortment, VENUE_ID);
  const canonicalGroundTruth = canonicalGroundTruthPurchase({
    document: input.document,
    supplierId,
    mappings: canonicalInvoiceSupplierMappings(input.assortment, VENUE_ID),
    candidates,
  });
  const firstMappings = [
    ...canonicalInvoiceSupplierMappings(firstAssortment, VENUE_ID),
    ...input.standaloneMappings.filter((mapping) => mapping.venueId === VENUE_ID && mapping.supplierId !== supplierId),
  ];
  const ocrResult = await sourceOcr(input.document);
  const stored = storedPurchaseAsParsed(input.document);
  const parsed = ocrResult.ocr ? parseInvoiceOcr(ocrResult.ocr) : stored;
  const matchingInput: ParsedInvoiceDocument = parsed.items.length ? parsed : stored;
  const parser = recognitionQualityAgainstGroundTruth(parsed, expected(input.document));

  const deterministicStartedAt = Date.now();
  const deterministic = applyDeterministicMappings({
    document: matchingInput,
    supplierId,
    venueId: VENUE_ID,
    mappings: firstMappings,
    nomenclature: candidates,
  });
  const deterministicLatencyMs = Date.now() - deterministicStartedAt;
  const firstJobId = `prodv2-${input.runId}-${input.document.id.slice(0, 6)}-f`;
  const aiStartedAt = Date.now();
  const first = await runInvoiceAIBulkMatching({
    document: deterministic,
    jobId: firstJobId,
    provider: createOpenAIInvoiceMatchingProvider({
      accountId: DATA_ACCOUNT_ID,
      actorAccountId: input.actorAccountId,
      venueId: VENUE_ID,
      jobId: firstJobId,
    }),
  });
  const aiLatencyMs = Date.now() - aiStartedAt;
  const firstUsage = await usage(firstJobId);
  const firstQuality = productionMatchingQuality({ document: first.document, expected: canonicalGroundTruth, candidates });
  const firstTotalLatencyMs = Date.now() - startedAt;

  const confirmed = confirmedMemoryFromPurchase({
    venueId: VENUE_ID,
    supplierId,
    actorAccountId: input.actorAccountId,
    document: canonicalGroundTruth,
    candidates,
  });
  const restored = JSON.parse(JSON.stringify(confirmed)) as SupplierItemMapping[];
  const repeatDeterministic = applyDeterministicMappings({
    document: matchingInput,
    supplierId,
    venueId: VENUE_ID,
    mappings: [...firstMappings, ...restored],
    nomenclature: candidates,
  });
  const repeatJobId = `prodv2-${input.runId}-${input.document.id.slice(0, 6)}-r`;
  const repeatStartedAt = Date.now();
  const repeat = await runInvoiceAIBulkMatching({
    document: repeatDeterministic,
    jobId: repeatJobId,
    provider: createOpenAIInvoiceMatchingProvider({
      accountId: DATA_ACCOUNT_ID,
      actorAccountId: input.actorAccountId,
      venueId: VENUE_ID,
      jobId: repeatJobId,
    }),
  });
  const repeatLatencyMs = Date.now() - repeatStartedAt;
  const repeatUsage = await usage(repeatJobId);
  const repeatQuality = productionMatchingQuality({ document: repeat.document, expected: canonicalGroundTruth, candidates });
  const historical = (document: ParsedInvoiceDocument) => document.items.filter((line) => line.mappingSource === "history").length;
  const exact = (document: ParsedInvoiceDocument) => document.items.filter((line) => ["supplier_identifier", "exact_alias"].includes(line.mappingSource ?? "")).length;
  const fuzzy = (document: ParsedInvoiceDocument) => document.items.filter((line) => line.mappingSource === "fuzzy").length;

  const result = {
    correlationId: firstJobId,
    supplier: input.document.supplierName,
    documentNumber: input.document.documentNumber ?? null,
    storedLines: input.document.items.length,
    source: ocrResult.source,
    ocrError: ocrResult.error,
    ocr: ocrResult.ocr ? {
      engine: ocrResult.ocr.engine ?? null,
      durationMs: ocrResult.ocr.durationMs,
      confidence: ocrResult.ocr.confidence,
      detectedLines: ocrResult.ocr.lines.length,
      duplicateLines: ocrResult.ocr.lines.length - new Set(ocrResult.ocr.lines.map((line) => normalizeInvoiceText(line.text))).size,
    } : null,
    parser,
    firstArrival: {
      totalLines: first.document.items.length,
      historical: historical(first.document),
      exact: exact(first.document),
      fuzzy: fuzzy(first.document),
      sentToAI: first.sentLines,
      aiHigh: first.highCount,
      aiMedium: first.mediumCount,
      aiLowOrNoMatch: first.noMatchCount,
      ...firstQuality,
      batchCount: first.requestCount,
      aiRequests: first.requestCount,
      estimatedInputTokens: first.estimatedInputTokens,
      estimatedOutputTokens: first.estimatedOutputTokens,
      actualUsage: firstUsage,
      deterministicLatencyMs,
      aiLatencyMs,
      totalLatencyMs: firstTotalLatencyMs,
    },
    repeatArrival: {
      historicalHits: historical(repeat.document),
      exact: exact(repeat.document),
      fuzzy: fuzzy(repeat.document),
      aiLines: repeat.sentLines,
      batchCount: repeat.requestCount,
      aiRequests: repeat.requestCount,
      estimatedInputTokens: repeat.estimatedInputTokens,
      estimatedOutputTokens: repeat.estimatedOutputTokens,
      actualUsage: repeatUsage,
      latencyMs: repeatLatencyMs,
      ...repeatQuality,
    },
  };
  console.info("INVOICE_HYBRID_PRODUCTION_QA_TRACE", JSON.stringify({
    correlationId: firstJobId,
    venueId: VENUE_ID,
    supplierId,
    lineCount: result.firstArrival.totalLines,
    deterministic: { historical: result.firstArrival.historical, exact: result.firstArrival.exact, fuzzy: result.firstArrival.fuzzy },
    ai: { batches: first.requestCount, requests: first.requestCount, usage: firstUsage },
    result: firstQuality,
    durationMs: result.firstArrival.totalLatencyMs,
  }));
  return result;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  const url = new URL(request.url);
  if (account.role !== "owner" || account.id !== DATA_ACCOUNT_ID || account.venueId !== VENUE_ID) {
    return Response.json({ ok: false, code: "AUTHORITATIVE_KOLN_OWNER_REQUIRED" }, { status: 403 });
  }
  if (url.searchParams.get("intent") !== REQUIRED_INTENT) {
    return Response.json({ ok: false, code: "CONTROLLED_VALIDATION_INTENT_REQUIRED" }, { status: 400 });
  }
  const configuredMode = invoiceRecognitionMode(environment());
  if (configuredMode !== "legacy") {
    return Response.json({ ok: false, code: "LEGACY_PRIMARY_REQUIRED", configuredMode }, { status: 409 });
  }

  const rows = await stores();
  const assortment = parse(rows.get("bd_assortment_v1"), {});
  const purchases = array(parse(rows.get("bd_purchase_documents"), [])) as PurchaseDocument[];
  const suppliers = array(parse(rows.get("bd_suppliers"), [])).map(record);
  const standaloneMappings = array(parse(rows.get("bd_invoice_supplier_mappings_v2"), [])) as SupplierItemMapping[];
  const candidates = nomenclatureCandidates(assortment, VENUE_ID);
  const selection = selectProductionHybridDocuments(purchases, VENUE_ID);
  if (candidates.length === 0 || selection.selected.length < 3) {
    return Response.json({
      ok: false,
      code: "PRODUCTION_VALIDATION_DATA_INCOMPLETE",
      context: { candidates: candidates.length, purchases: purchases.length, suppliers: suppliers.length, eligibleDocuments: selection.selected.length },
    }, { status: 409 });
  }

  const runId = crypto.randomUUID().slice(0, 8);
  const results = [];
  for (const document of selection.selected) {
    results.push(await validateDocument({
      document,
      assortment,
      suppliers,
      standaloneMappings,
      actorAccountId: account.actorAccountId,
      runId,
    }));
  }
  const root = record(assortment);
  const mappings = canonicalInvoiceSupplierMappings(assortment, VENUE_ID);
  const canonicalPositions = array(root.nomenclature).filter((value) =>
    Number(record(value).venueId ?? VENUE_ID) === VENUE_ID
  ).length;
  return Response.json({
    ok: true,
    runId,
    readOnlyBusinessData: true,
    writes: { purchases: 0, stockMovements: 0, expenses: 0, supplierDebt: 0, supplierMappings: 0, observabilityOnly: true },
    productionContext: {
      venue: "Кёльн",
      venueId: VENUE_ID,
      dataAccountId: DATA_ACCOUNT_ID,
      canonicalSource: "bd_assortment_v1",
      canonicalPositions,
      accountNomenclatureRows: array(root.nomenclature).length,
      searchableCandidates: candidates.length,
      suppliers: suppliers.length,
      purchases: purchases.length,
      supplierMappings: mappings.length + standaloneMappings.filter((mapping) => mapping.venueId === VENUE_ID).length,
      configuredMode,
    },
    invoice394Included: selection.invoice394Included,
    invoice394Reason: selection.invoice394Reason,
    invoices: results,
    learningPersistence: "in_memory_serialization_only_pending_controlled_confirmation",
    postingInvoked: false,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

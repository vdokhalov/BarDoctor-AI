import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import { buildAssortmentMigrationPreview } from "../../../../lib/bardoctor/assortment-migration-preview";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { createOpenAIInvoiceMatchingProvider } from "../../../../lib/bardoctor/invoice-ai-openai-provider";
import { runInvoiceAIBulkMatching } from "../../../../lib/bardoctor/invoice-ai-matching";
import { configuredStableInvoiceOcr } from "../../../../lib/bardoctor/invoice-ocr-stability";
import { buildKolnAssortmentReconciliation } from "../../../../lib/bardoctor/koln-assortment-migration";
import {
  canonicalGroundTruthPurchase,
  confirmedMemoryFromReviewedGroundTruth,
  productionMatchingQuality,
  productionMatchingTrace,
  productionSourceFileIds,
  selectProductionHybridDocuments,
  storedPurchaseAsParsed,
} from "../../../../lib/bardoctor/invoice-production-validation";
import {
  applyDeterministicMappings,
  canonicalInvoiceSupplierMappings,
  invoiceRecognitionMode,
  invoiceOcrStageTrace,
  invoiceIdentityConflicts,
  matchInvoiceLine,
  nomenclatureCandidates,
  normalizeInvoiceText,
  recognitionQualityAgainstGroundTruth,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../../../../lib/bardoctor/invoice-recognition-v2";
import { BARDOCTOR_SOURCE_COMMIT } from "../../../../lib/bardoctor/source-commit";
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
const PRODUCTION_VERSION = 319;
const STORE_KEYS = [
  "bd_assortment_v1", "bd_purchase_documents", "bd_suppliers", "bd_invoice_supplier_mappings_v2", "bd_stock_movements",
];

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

async function canonicalMigrationDelta(input: {
  assortment: unknown;
  purchases: unknown[];
  suppliers: unknown[];
  stockMovements: unknown[];
}) {
  const operation = await getD1().prepare(`
    SELECT operation_id, export_id, created_at, plan_json
    FROM venue_migration_operations
    WHERE venue_id = ? AND data_account_id = ? AND status = 'migrated'
    ORDER BY cutover_at DESC LIMIT 1
  `).bind(VENUE_ID, DATA_ACCOUNT_ID).first<{
    operation_id: string; export_id: string; created_at: string; plan_json: string;
  }>();
  if (!operation) return { available: false, reason: "migration_operation_not_found" };
  const migrationExport = await getD1().prepare(`
    SELECT payload_json FROM venue_migration_exports WHERE export_id = ? LIMIT 1
  `).bind(operation.export_id).first<{ payload_json: string }>();
  const payload = record(parse(migrationExport?.payload_json, {}));
  const affectedStores = record(payload.affectedStores);
  const beforeAssortment = record(record(affectedStores.bd_assortment_v1).data);
  const preview = buildAssortmentMigrationPreview({
    venueId: VENUE_ID,
    purchases: input.purchases,
    suppliers: input.suppliers,
    stockMovements: input.stockMovements,
    serverAssortmentExists: true,
    sourceStorePresence: { purchases: true, suppliers: true, stockMovements: true, assortment: true },
  });
  const expected = buildKolnAssortmentReconciliation({
    venueId: VENUE_ID,
    existingAssortment: beforeAssortment,
    preview,
    operationId: operation.operation_id,
    now: operation.created_at,
  });
  const keyOf = (value: unknown) => String(record(value).productKey ?? record(value).key ?? "");
  const currentRows = array(record(input.assortment).nomenclature);
  const expectedRows = array(record(expected.assortment).nomenclature);
  const currentKeys = new Set(currentRows.map(keyOf).filter(Boolean));
  const aliases = new Map(array(record(input.assortment).inventoryProductAliases).map((value) => {
    const alias = record(value);
    return [String(alias.from ?? ""), String(alias.to ?? "")] as const;
  }));
  const missing = expectedRows.filter((value) => !currentKeys.has(keyOf(value))).map((value) => {
    const item = record(value);
    const key = keyOf(item);
    const aliasTarget = aliases.get(key) || null;
    const normalizedName = normalizeInvoiceText(item.name);
    const sameIdentity = currentRows.find((current) => {
      const candidate = record(current);
      return normalizeInvoiceText(candidate.name) === normalizedName
        && String(candidate.unit ?? candidate.baseUnit ?? "") === String(item.unit ?? item.baseUnit ?? "");
    });
    return {
      key,
      name: item.name ?? null,
      unit: item.unit ?? item.baseUnit ?? null,
      active: item.active !== false && item.status !== "archived",
      aliasTarget,
      sameIdentityTarget: sameIdentity ? keyOf(sameIdentity) : null,
      classification: aliasTarget || sameIdentity ? "duplicate_or_consolidated" : "missing_without_alias",
    };
  });
  const plan = record(parse(operation.plan_json, {}));
  return {
    available: true,
    operationId: operation.operation_id,
    reported: record(plan.reconciliation),
    beforePositions: array(beforeAssortment.nomenclature).length,
    reconstructedExpectedPositions: expectedRows.length,
    currentPositions: currentRows.length,
    missingCount: missing.length,
    missing,
  };
}

async function sourceOcr(document: PurchaseDocument) {
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  const ids = productionSourceFileIds(document);
  if (!bucket || !ids.length) return {
    ocr: null, parsed: null, attempts: [], selectedAttempt: null,
    source: "stored_structured_source" as const, error: "source_unavailable",
  };
  const documents = [] as Array<{ bytes: Uint8Array; filename: string; mimeType: string }>;
  for (const [index, id] of ids.entries()) {
    const object = await bucket.get(`purchases/${DATA_ACCOUNT_ID}/${id}`);
    if (!object) return {
      ocr: null, parsed: null, attempts: [], selectedAttempt: null,
      source: "stored_structured_source" as const, error: "source_file_missing",
    };
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
      ...await configuredStableInvoiceOcr({ documents, environment: environment() }),
      source: "production_original" as const,
      error: null,
    };
  } catch (error) {
    return {
      ocr: null,
      parsed: null,
      attempts: [],
      selectedAttempt: null,
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
    statuses: [...new Set(rows.map((row) => row.status).filter(Boolean))],
    errors: [...new Set(rows.map((row) => row.error_code).filter(Boolean))],
    providerStatus: rows.some((row) => row.error_code)
      ? "fallback_unavailable"
      : rows.length ? "available" : "not_used",
  };
}

function historicalMappingTrace(input: {
  line: ParsedInvoiceDocument["items"][number];
  supplierId: string;
  mappings: SupplierItemMapping[];
  candidates: ReturnType<typeof nomenclatureCandidates>;
}) {
  const identityMappings = input.mappings.filter((mapping) =>
    mapping.venueId === VENUE_ID
    && mapping.supplierId === input.supplierId
    && (
      mapping.normalizedRawName === input.line.normalizedRawName
      || Boolean(input.line.supplierArticle && mapping.supplierArticle === input.line.supplierArticle)
      || Boolean(input.line.barcode && mapping.barcode === input.line.barcode)
    )
  );
  if (!identityMappings.length) return {
    found: false,
    mappingKey: null,
    compatible: null,
    reason: "persisted_mapping_not_found",
  };
  const checked = identityMappings.map((mapping) => {
    const rematched = matchInvoiceLine({
      line: {
        ...input.line,
        purchaseProductKey: undefined,
        nomenclatureId: undefined,
        nomenclatureName: undefined,
        mappingSource: undefined,
      },
      supplierId: input.supplierId,
      venueId: VENUE_ID,
      mappings: [mapping],
      nomenclature: input.candidates,
    });
    const candidate = input.candidates.find((value) =>
      value.id === mapping.nomenclatureId || value.key === mapping.nomenclatureId
    );
    const conflicts = candidate ? invoiceIdentityConflicts(input.line, candidate) : ["canonical_target_missing"];
    return {
      mapping,
      compatible: rematched.mappingSource === "history",
      conflicts,
    };
  });
  const selected = checked.find((value) => value.compatible) ?? checked[0];
  return {
    found: true,
    mappingKey: selected.mapping.sourceItemKey ?? selected.mapping.id,
    compatible: selected.compatible,
    canonicalTarget: selected.mapping.nomenclatureId,
    reason: selected.compatible
      ? "compatible_identity"
      : selected.conflicts.length ? `identity_conflict:${selected.conflicts.join(",")}` : "mapping_identity_incompatible",
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
  const parsed = ocrResult.parsed ?? stored;
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

  const confirmed = confirmedMemoryFromReviewedGroundTruth({
    venueId: VENUE_ID,
    supplierId,
    actorAccountId: input.actorAccountId,
    recognized: first.document,
    groundTruth: canonicalGroundTruth,
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
      stabilityAttempts: ocrResult.attempts,
      selectedAttempt: ocrResult.selectedAttempt,
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
      lineTrace: productionMatchingTrace({ document: first.document, expected: canonicalGroundTruth, candidates }),
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
      lineTrace: productionMatchingTrace({ document: repeat.document, expected: canonicalGroundTruth, candidates }),
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
    repeat: {
      historical: result.repeatArrival.historicalHits,
      exact: result.repeatArrival.exact,
      fuzzy: result.repeatArrival.fuzzy,
      aiLines: result.repeatArrival.aiLines,
      requests: result.repeatArrival.aiRequests,
      usage: repeatUsage,
      result: repeatQuality,
      durationMs: result.repeatArrival.latencyMs,
    },
    durationMs: result.firstArrival.totalLatencyMs,
  }));
  return result;
}

async function validatePersistedDocument(input: {
  document: PurchaseDocument;
  assortment: unknown;
  suppliers: JsonRecord[];
  standaloneMappings: SupplierItemMapping[];
  actorAccountId: number;
  runId: string;
}) {
  const supplierId = supplierIdFor(input.document, input.suppliers);
  if (!supplierId) throw new Error("SUPPLIER_ID_REQUIRED");
  const candidates = nomenclatureCandidates(input.assortment, VENUE_ID);
  const ocrResult = await sourceOcr(input.document);
  const stored = storedPurchaseAsParsed(input.document);
  const parsed = ocrResult.parsed ?? stored;
  const deterministic = applyDeterministicMappings({
    document: parsed.items.length ? parsed : stored,
    supplierId,
    venueId: VENUE_ID,
    mappings: [
      ...canonicalInvoiceSupplierMappings(input.assortment, VENUE_ID),
      ...input.standaloneMappings.filter((mapping) => mapping.venueId === VENUE_ID),
    ],
    nomenclature: candidates,
  });
  const jobId = `prodpersist-${input.runId}-${input.document.id.slice(0, 6)}`;
  const result = await runInvoiceAIBulkMatching({
    document: deterministic,
    jobId,
    provider: createOpenAIInvoiceMatchingProvider({
      accountId: DATA_ACCOUNT_ID,
      actorAccountId: input.actorAccountId,
      venueId: VENUE_ID,
      jobId,
    }),
  });
  const actualUsage = await usage(jobId);
  const persistedMappings = [
    ...canonicalInvoiceSupplierMappings(input.assortment, VENUE_ID),
    ...input.standaloneMappings.filter((mapping) => mapping.venueId === VENUE_ID),
  ];
  const lineTrace = productionMatchingTrace({
    document: result.document,
    expected: canonicalGroundTruthPurchase({
      document: input.document,
      supplierId,
      mappings: canonicalInvoiceSupplierMappings(input.assortment, VENUE_ID),
      candidates,
    }),
    candidates,
  }).map((trace) => {
    const line = result.document.items.find((value) => value.id === trace.lineId);
    return {
      ...trace,
      historicalMapping: line ? historicalMappingTrace({ line, supplierId, mappings: persistedMappings, candidates }) : null,
    };
  });
  return {
    correlationId: jobId,
    supplier: input.document.supplierName,
    supplierId,
    documentNumber: input.document.documentNumber ?? null,
    totalLines: result.document.items.length,
    historicalHits: result.document.items.filter((line) => line.mappingSource === "history").length,
    exact: result.document.items.filter((line) => ["supplier_identifier", "exact_alias"].includes(line.mappingSource ?? "")).length,
    fuzzy: result.document.items.filter((line) => line.mappingSource === "fuzzy").length,
    aiLines: result.sentLines,
    aiRequests: result.requestCount,
    estimatedInputTokens: result.estimatedInputTokens,
    estimatedOutputTokens: result.estimatedOutputTokens,
    actualUsage,
    manualConfirmation: result.document.items.filter((line) => line.requiresReview && Boolean(line.nomenclatureId)).length,
    manualSearch: result.document.items.filter((line) => line.requiresReview && !line.nomenclatureId).length,
    ocr: {
      selectedAttempt: ocrResult.selectedAttempt,
      attempts: ocrResult.attempts,
    },
    lineTrace,
  };
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
  const stockMovements = array(parse(rows.get("bd_stock_movements"), []));
  const standaloneMappings = array(parse(rows.get("bd_invoice_supplier_mappings_v2"), [])) as SupplierItemMapping[];
  const candidates = nomenclatureCandidates(assortment, VENUE_ID);
  const selection = selectProductionHybridDocuments(purchases, VENUE_ID);
  if (url.searchParams.get("stage") === "surface") {
    const root = record(assortment);
    const mappings = canonicalInvoiceSupplierMappings(assortment, VENUE_ID);
    return Response.json({
      ok: true,
      stage: "surface",
      productionContext: {
        venue: "Кёльн",
        venueId: account.venueId,
        dataAccountId: account.id,
        canonicalSource: "bd_assortment_v1",
        canonicalPositions: array(root.nomenclature).filter((value) =>
          Number(record(value).venueId ?? VENUE_ID) === account.venueId
        ).length,
        searchableCandidates: candidates.length,
        suppliers: suppliers.length,
        purchases: purchases.length,
        supplierMappings: mappings.length + standaloneMappings.filter((mapping) => mapping.venueId === account.venueId).length,
        configuredMode,
        v2Primary: false,
        productionVersion: PRODUCTION_VERSION,
        sourceCommit: BARDOCTOR_SOURCE_COMMIT,
      },
      documents: selection.selected.map((document) => ({
        id: document.id,
        supplierId: supplierIdFor(document, suppliers) ?? null,
        supplier: document.supplierName,
        documentNumber: document.documentNumber ?? null,
        date: document.date ?? null,
        lineCount: document.items.length,
        sourceFiles: productionSourceFileIds(document).length,
      })),
      safety: {
        shadowOnly: true,
        postingAvailable: false,
        featureFlagMutationAvailable: false,
        businessWrites: ["supplier_mapping_explicit_confirmation_only"],
      },
      writes: { purchases: 0, stockMovements: 0, expenses: 0, supplierDebt: 0, supplierMappings: 0 },
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (candidates.length === 0 || selection.selected.length < 3) {
    return Response.json({
      ok: false,
      code: "PRODUCTION_VALIDATION_DATA_INCOMPLETE",
      context: { candidates: candidates.length, purchases: purchases.length, suppliers: suppliers.length, eligibleDocuments: selection.selected.length },
    }, { status: 409 });
  }

  const runId = crypto.randomUUID().slice(0, 8);
  if (url.searchParams.get("stage") === "canonical_delta") {
    return Response.json({
      ok: true,
      runId,
      stage: "canonical_delta",
      readOnlyBusinessData: true,
      delta: await canonicalMigrationDelta({ assortment, purchases, suppliers, stockMovements }),
      writes: { purchases: 0, stockMovements: 0, expenses: 0, supplierDebt: 0, supplierMappings: 0 },
      configuredMode,
      postingInvoked: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const requestedDocument = normalizeInvoiceText(url.searchParams.get("document") ?? "");
  const selectedDocuments = requestedDocument
    ? selection.selected.filter((document) =>
      normalizeInvoiceText(document.id) === requestedDocument
      || normalizeInvoiceText(document.supplierName) === requestedDocument
      || normalizeInvoiceText(document.documentNumber) === requestedDocument
    )
    : selection.selected;
  if (!selectedDocuments.length) {
    return Response.json({ ok: false, code: "PRODUCTION_DOCUMENT_NOT_FOUND" }, { status: 404 });
  }
  if (url.searchParams.get("stage") === "ocr_parser") {
    const diagnostics = [];
    for (const document of selectedDocuments) {
      const ocrResult = await sourceOcr(document);
      const stored = storedPurchaseAsParsed(document);
      const parsedDocument = ocrResult.parsed ?? stored;
      diagnostics.push({
        documentId: document.id,
        supplier: document.supplierName,
        documentNumber: document.documentNumber ?? null,
        storedLines: document.items.length,
        source: ocrResult.source,
        ocrError: ocrResult.error,
        selectedAttempt: ocrResult.selectedAttempt,
        attempts: ocrResult.attempts,
        parser: recognitionQualityAgainstGroundTruth(parsedDocument, expected(document)),
        commercialFields: productionMatchingQuality({ document: parsedDocument, expected: document, candidates }).commercialFields,
        trace: ocrResult.ocr ? invoiceOcrStageTrace(ocrResult.ocr) : null,
      });
    }
    return Response.json({
      ok: true,
      runId,
      stage: "ocr_parser",
      readOnlyBusinessData: true,
      writes: { purchases: 0, stockMovements: 0, expenses: 0, supplierDebt: 0, supplierMappings: 0 },
      diagnostics,
      configuredMode,
      postingInvoked: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (url.searchParams.get("stage") === "persisted_learning") {
    const learning = [];
    for (const document of selectedDocuments) {
      learning.push(await validatePersistedDocument({
        document,
        assortment,
        suppliers,
        standaloneMappings,
        actorAccountId: account.actorAccountId,
        runId,
      }));
    }
    return Response.json({
      ok: true,
      runId,
      stage: "persisted_learning",
      independentRequest: true,
      persistentSources: ["bd_assortment_v1.supplierProductMappings", "bd_invoice_supplier_mappings_v2"],
      mappingStoreUpdatedAt: record(assortment).updatedAt ?? null,
      supplierMappings: canonicalInvoiceSupplierMappings(assortment, VENUE_ID).length
        + standaloneMappings.filter((mapping) => mapping.venueId === VENUE_ID).length,
      writes: { purchases: 0, stockMovements: 0, expenses: 0, supplierDebt: 0, supplierMappings: 0 },
      learning,
      configuredMode,
      postingInvoked: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const results = [];
  for (const document of selectedDocuments) {
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

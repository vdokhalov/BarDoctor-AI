import * as XLSX from "xlsx";
import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import {
  AIServiceError,
  aiText,
  parseAIJson,
  type AIContent,
} from "../../../../lib/bardoctor/ai-provider";
import { openAIFileText } from "../../../../lib/bardoctor/openai";
import {
  normalizePurchaseDocument,
  PURCHASE_DOCUMENT_SYSTEM_PROMPT,
  purchaseDocumentPrompt,
  SUPPLIER_STORE_KEY,
} from "../../../../lib/bardoctor/purchases";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
} from "../../../../lib/bardoctor/venue-ai-context";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import {
  configuredInvoiceOcr,
  InvoiceOcrError,
} from "../../../../lib/bardoctor/invoice-ocr";
import {
  applyDeterministicMappings,
  canonicalInvoiceSupplierMappings,
  compareRecognitionResults,
  confidenceLevel,
  INVOICE_MAPPING_STORE_KEY,
  invoiceRecognitionRequestMode,
  nomenclatureCandidates,
  parseInvoiceOcr,
  recognitionMetrics,
  type InvoiceOcrResult,
  type ParsedInvoiceDocument,
  type SupplierItemMapping,
} from "../../../../lib/bardoctor/invoice-recognition-v2";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_COUNT = 12;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";
const SHEET_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type SourceDocument = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

type StoredSourceDocument = {
  id: string;
  document: SourceDocument;
};

type StoreRow = { store_key: string; data_json: string };

function arrayJson(value: string | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function objectJson(value: string | undefined): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

function isUploadFile(value: FormDataEntryValue | null): value is File & UploadFile {
  return Boolean(
    value
    && typeof value === "object"
    && "arrayBuffer" in value
    && typeof value.arrayBuffer === "function",
  );
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function safeFileName(value: string): string {
  const clean = value.replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim();
  return (clean || "document").slice(0, 180);
}

function inferredMimeType(filename: string): string {
  if (/\.pdf$/i.test(filename)) return PDF_TYPE;
  if (/\.csv$/i.test(filename)) return "text/csv";
  if (/\.tsv$/i.test(filename)) return "text/tab-separated-values";
  if (/\.xlsx$/i.test(filename)) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (/\.xls$/i.test(filename)) return "application/vnd.ms-excel";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  if (/\.(jpe?g)$/i.test(filename)) return "image/jpeg";
  return "application/octet-stream";
}

function validSourceFileId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function storedDocuments(
  value: unknown,
  accountId: number,
  bucket: R2Bucket,
): Promise<{ documents: StoredSourceDocument[]; hint: string; source: "camera" | "gallery" }> {
  const body = record(value);
  const ids = Array.isArray(body.sourceFileIds)
    ? body.sourceFileIds.map((id) => String(id))
    : [];
  if (
    !ids.length
    || ids.length > MAX_IMAGE_COUNT
    || new Set(ids).size !== ids.length
    || ids.some((id) => !validSourceFileId(id))
  ) {
    throw new AIServiceError(
      `Нужно передать от 1 до ${MAX_IMAGE_COUNT} корректных фотографий документа.`,
      400,
    );
  }
  const result: StoredSourceDocument[] = [];
  for (const id of ids) {
    const stored = await bucket.get(`purchases/${accountId}/${id}`);
    if (!stored) {
      throw new AIServiceError(
        "Одна из фотографий документа не найдена. Загрузите документ ещё раз.",
        404,
      );
    }
    const headers = new Headers();
    stored.writeHttpMetadata(headers);
    let filename = "purchase-document.jpg";
    try {
      filename = safeFileName(
        stored.customMetadata?.originalName
          ? decodeURIComponent(stored.customMetadata.originalName)
          : filename,
      );
    } catch {
      filename = "purchase-document.jpg";
    }
    const bytes = new Uint8Array(await stored.arrayBuffer());
    const mimeType = headers.get("content-type") || inferredMimeType(filename);
    if (!bytes.length || bytes.byteLength > MAX_FILE_BYTES || !IMAGE_TYPES.has(mimeType)) {
      throw new AIServiceError(
        "Одна из загруженных фотографий повреждена или имеет неподдерживаемый формат.",
        415,
      );
    }
    result.push({ id, document: { bytes, filename, mimeType } });
  }
  const totalBytes = result.reduce((sum, item) => sum + item.document.bytes.byteLength, 0);
  if (totalBytes > MAX_UPLOAD_BYTES) {
    throw new AIServiceError("Набор фотографий документа превышает лимит 16 МБ.", 413);
  }
  return {
    documents: result,
    hint: typeof body.hint === "string" ? body.hint.slice(0, 40) : "auto",
    source: body.source === "camera" ? "camera" : "gallery",
  };
}

function spreadsheetText(bytes: Uint8Array): string {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch {
    throw new AIServiceError("Не удалось открыть таблицу. Проверьте файл Excel или CSV.", 422);
  }

  const blocks: string[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, 8)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }).slice(0, 700);
    blocks.push(
      `Лист: ${sheetName}\n${rows
        .map((row) => row.slice(0, 30).map((cell) => String(cell ?? "").trim()).join("\t"))
        .join("\n")}`,
    );
  }
  return blocks.join("\n\n").slice(0, 350_000);
}

async function recogniseSingleDocument(input: {
  accountId: number;
  jobId: string;
  bytes: Uint8Array;
  mimeType: string;
  filename: string;
  hint: string;
  contextHint: string;
}): Promise<unknown> {
  const prompt = `${purchaseDocumentPrompt(input.hint)}

Контекст BarDoctor (только для сопоставления известных товаров и поставщиков; документ является главным источником):
${input.contextHint}`;
  let raw: string;

  if (IMAGE_TYPES.has(input.mimeType)) {
    raw = await aiText({
      accountId: input.accountId,
      observability: { feature: "ocr_purchases." + input.jobId },
      system: PURCHASE_DOCUMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mimeType,
                data: base64(input.bytes),
              },
            },
          ],
        },
      ],
      maxTokens: 7_500,
    });
  } else if (input.mimeType === PDF_TYPE) {
    raw = await openAIFileText({
      accountId: input.accountId,
      observability: { feature: "ocr_purchases." + input.jobId },
      system: PURCHASE_DOCUMENT_SYSTEM_PROMPT,
      prompt,
      filename: input.filename,
      mimeType: input.mimeType,
      dataBase64: base64(input.bytes),
      maxTokens: 10_000,
      detail: "high",
    });
  } else if (SHEET_TYPES.has(input.mimeType) || /\.(csv|tsv|xls|xlsx)$/i.test(input.filename)) {
    const extracted = spreadsheetText(input.bytes);
    raw = await aiText({
      accountId: input.accountId,
      observability: { feature: "ocr_purchases." + input.jobId },
      system: PURCHASE_DOCUMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nИзвлечённая таблица:\n${extracted}`,
        },
      ],
      maxTokens: 10_000,
    });
  } else {
    throw new AIServiceError(
      "Поддерживаются фото, PDF, Excel и CSV. Фото HEIC сначала будет преобразовано приложением в JPEG.",
      415,
    );
  }

  return parseAIJson<unknown>(raw);
}

async function recogniseDocument(input: {
  accountId: number;
  jobId: string;
  documents: SourceDocument[];
  hint: string;
  contextHint: string;
}): Promise<unknown> {
  if (input.documents.length === 1) {
    const document = input.documents[0];
    return recogniseSingleDocument({
      accountId: input.accountId,
      jobId: input.jobId,
      bytes: document.bytes,
      mimeType: document.mimeType,
      filename: document.filename,
      hint: input.hint,
      contextHint: input.contextHint,
    });
  }
  const prompt = `${purchaseDocumentPrompt(input.hint)}

Передано ${input.documents.length} фотографий одного документа в порядке страниц.
Собери их в один чек, накладную или прайс. Не дублируй строки, которые повторяются
на соседних снимках, и проверь итог по всем страницам.

Контекст BarDoctor (только для сопоставления известных товаров и поставщиков; документ является главным источником):
${input.contextHint}`;
  const content: AIContent = [
    { type: "text", text: prompt },
    ...input.documents.map((document) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: document.mimeType,
        data: base64(document.bytes),
      },
    })),
  ];
  const raw = await aiText({
    accountId: input.accountId,
    observability: { feature: "ocr_purchases." + input.jobId },
    system: PURCHASE_DOCUMENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    maxTokens: 12_000,
  });
  return parseAIJson<unknown>(raw);
}

function environment(): Record<string, unknown> {
  return env as unknown as Record<string, unknown>;
}

async function recognitionStores(accountId: number): Promise<{
  assortment: unknown;
  suppliers: Record<string, unknown>[];
  mappings: SupplierItemMapping[];
}> {
  const result = await getD1().prepare(`
    SELECT store_key, data_json
    FROM domain_data
    WHERE account_id = ? AND store_key IN (?, ?, ?)
  `).bind(accountId, ASSORTMENT_STORE_KEY, SUPPLIER_STORE_KEY, INVOICE_MAPPING_STORE_KEY).all<StoreRow>();
  const stores = new Map((result.results ?? []).map((row) => [row.store_key, row.data_json]));
  return {
    assortment: objectJson(stores.get(ASSORTMENT_STORE_KEY)),
    suppliers: arrayJson(stores.get(SUPPLIER_STORE_KEY)).map(record),
    mappings: arrayJson(stores.get(INVOICE_MAPPING_STORE_KEY)) as SupplierItemMapping[],
  };
}

function resolveSupplier(document: ParsedInvoiceDocument, suppliers: Record<string, unknown>[]) {
  const normalize = (value: unknown) => String(value ?? "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/^(?:ооо|оао|зао|ип|srl|s\\.r\\.l\\.)\s+/i, "")
    .replace(/[«»"'.,]/g, "")
    .replace(/\s+/g, " ");
  const normalized = normalize(document.supplierName);
  const supplier = suppliers.find((item) =>
    normalize(item.name) === normalized
  );
  return supplier ? String(supplier.id ?? "") || undefined : undefined;
}

function spreadsheetOcr(document: SourceDocument): InvoiceOcrResult {
  const startedAt = Date.now();
  const rawText = spreadsheetText(document.bytes);
  return {
    rawText,
    lines: rawText.split(/\r?\n/).map((line) => ({ text: line, confidence: 1 })),
    confidence: 1,
    durationMs: Date.now() - startedAt,
    engine: "deterministic_spreadsheet",
  };
}

async function aiResolveUnresolved(input: {
  accountId: number;
  actorAccountId: number;
  venueId: number;
  jobId: string;
  document: ParsedInvoiceDocument;
}): Promise<{
  document: ParsedInvoiceDocument;
  aiFallbackLinesCount: number;
  aiRequestCount: number;
  aiEstimatedTokenUsage: number;
  unavailable: boolean;
}> {
  const unresolved = input.document.items.filter((item) => item.requiresReview);
  if (!unresolved.length) {
    return {
      document: input.document,
      aiFallbackLinesCount: 0,
      aiRequestCount: 0,
      aiEstimatedTokenUsage: 0,
      unavailable: false,
    };
  }
  const payload = unresolved.map((item) => ({
    lineId: item.id,
    rawName: item.rawName,
    quantity: item.quantity,
    unit: item.unit,
    packageSize: item.packageSize,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    candidates: item.mappingCandidates,
  }));
  try {
    const raw = await aiText({
      accountId: input.accountId,
      observability: {
        actorAccountId: input.actorAccountId,
        venueId: input.venueId,
        feature: "invoice_recognition_v2." + input.jobId,
      },
      system: `Ты проверяешь только неоднозначные строки уже прочитанной накладной. Не создавай номенклатуру. Выбирай nomenclatureId только из переданных candidates. Если уверенности нет, оставь null. Верни только JSON.`,
      messages: [{
        role: "user",
        content: `Необработанные строки:\n${JSON.stringify(payload)}\n\nВерни {"lines":[{"lineId":"...","nomenclatureId":"id из candidates или null","confidence":0.0}]}.`,
      }],
      maxTokens: Math.min(2_500, 300 + unresolved.length * 120),
    });
    const parsed = record(parseAIJson<unknown>(raw));
    const suggestions = Array.isArray(parsed.lines) ? parsed.lines.map(record) : [];
    const byId = new Map(suggestions.map((suggestion) => [String(suggestion.lineId ?? ""), suggestion]));
    const items = input.document.items.map((item) => {
      if (!item.requiresReview) return item;
      const suggestion = byId.get(item.id);
      const nomenclatureId = String(suggestion?.nomenclatureId ?? "");
      const selected = item.mappingCandidates?.find((candidate) => candidate.id === nomenclatureId || candidate.key === nomenclatureId);
      const score = Math.max(0, Math.min(1, Number(suggestion?.confidence) || 0));
      if (!selected || confidenceLevel(score) === "low") return item;
      return {
        ...item,
        name: selected.name,
        nomenclatureId: selected.id,
        purchaseProductKey: selected.key,
        mappingSource: "ai" as const,
        confidence: score,
        confidenceLevel: confidenceLevel(score),
        requiresReview: confidenceLevel(score) !== "high",
      };
    });
    return {
      document: { ...input.document, items },
      aiFallbackLinesCount: unresolved.length,
      aiRequestCount: 1,
      aiEstimatedTokenUsage: Math.ceil((JSON.stringify(payload).length + raw.length) / 4),
      unavailable: false,
    };
  } catch (error) {
    console.warn("INVOICE_RECOGNITION_V2_AI_FALLBACK_UNAVAILABLE", {
      accountId: input.accountId,
      unresolvedLines: unresolved.length,
      code: error instanceof AIServiceError ? error.code : "provider_unavailable",
    });
    return {
      document: {
        ...input.document,
        warnings: [
          ...input.document.warnings,
          "Автоматическое распознавание части документа временно недоступно. Уже распознанные данные сохранены — проверьте оставшиеся позиции вручную.",
        ],
      },
      aiFallbackLinesCount: unresolved.length,
      aiRequestCount: 1,
      aiEstimatedTokenUsage: Math.ceil(JSON.stringify(payload).length / 4),
      unavailable: true,
    };
  }
}

async function recogniseDocumentV2(input: {
  accountId: number;
  actorAccountId: number;
  venueId: number;
  jobId: string;
  documents: SourceDocument[];
  mode: "primary" | "shadow";
  simulateAiUnavailable?: boolean;
}): Promise<{
  document: ParsedInvoiceDocument;
  metrics: ReturnType<typeof recognitionMetrics>;
  aiUnavailable: boolean;
  issues: Array<"OCR_FAILED" | "PARSER_FAILED" | "AI_FALLBACK_UNAVAILABLE" | "VALIDATION_REQUIRED">;
}> {
  const startedAt = Date.now();
  const stores = await recognitionStores(input.accountId);
  let ocr: InvoiceOcrResult | null = null;
  let ocrFailure = false;
  const issues: Array<"OCR_FAILED" | "PARSER_FAILED" | "AI_FALLBACK_UNAVAILABLE" | "VALIDATION_REQUIRED"> = [];
  try {
    if (input.documents.length === 1 && SHEET_TYPES.has(input.documents[0].mimeType)) {
      ocr = spreadsheetOcr(input.documents[0]);
    } else {
      ocr = await configuredInvoiceOcr({ documents: input.documents, environment: environment() });
    }
  } catch (error) {
    ocrFailure = true;
    issues.push("OCR_FAILED");
    console.warn("INVOICE_RECOGNITION_V2_OCR_UNAVAILABLE", {
      jobId: input.jobId,
      accountId: input.accountId,
      venueId: input.venueId,
      fileCount: input.documents.length,
      code: error instanceof InvoiceOcrError ? error.code : "OCR_PROVIDER_UNAVAILABLE",
    });
  }
  let parsed: ParsedInvoiceDocument;
  try {
    parsed = ocr ? parseInvoiceOcr(ocr) : {
      documentType: "invoice" as const,
      supplierName: "Новый поставщик",
      supplierType: "wholesale" as const,
      currency: "RUB",
      paymentMethod: "unknown" as const,
      total: 0,
      confidence: 0,
      warnings: ["Документ распознан частично. Повторите фото или продолжите заполнение вручную."],
      items: [],
    };
  } catch (error) {
    issues.push("PARSER_FAILED");
    console.warn("INVOICE_RECOGNITION_V2_PARSER_FAILED", {
      jobId: input.jobId,
      accountId: input.accountId,
      venueId: input.venueId,
      code: error instanceof Error ? error.name : "parser_failed",
    });
    parsed = {
    documentType: "invoice" as const,
    supplierName: "Новый поставщик",
    supplierType: "wholesale" as const,
    currency: "RUB",
    paymentMethod: "unknown" as const,
    total: 0,
    confidence: 0,
    warnings: ["Документ распознан частично. Повторите фото или продолжите заполнение вручную."],
    items: [],
    };
  }
  const supplierId = resolveSupplier(parsed, stores.suppliers);
  const candidates = nomenclatureCandidates(stores.assortment, input.venueId);
  const matchingStartedAt = Date.now();
  let mapped = applyDeterministicMappings({
    document: parsed,
    supplierId,
    venueId: input.venueId,
    mappings: [...canonicalInvoiceSupplierMappings(stores.assortment, input.venueId), ...stores.mappings],
    nomenclature: candidates,
  });
  const matchingDurationMs = Date.now() - matchingStartedAt;
  const fallbackEnabled = String(environment().INVOICE_RECOGNITION_V2_AI_FALLBACK ?? "on").toLocaleLowerCase("en-US") !== "off";
  const unresolvedCount = mapped.items.filter((item) => item.requiresReview).length;
  const simulatedUnavailable = input.simulateAiUnavailable && unresolvedCount > 0;
  if (simulatedUnavailable) {
    console.warn("INVOICE_RECOGNITION_V2_AI_FALLBACK_UNAVAILABLE", {
      jobId: input.jobId,
      accountId: input.accountId,
      venueId: input.venueId,
      unresolvedLines: unresolvedCount,
      code: "qa_simulation",
    });
  }
  const ai = simulatedUnavailable
    ? {
      document: {
        ...mapped,
        warnings: [
          ...mapped.warnings,
          "Автоматическое распознавание части документа временно недоступно. Уже распознанные данные сохранены — проверьте оставшиеся позиции вручную.",
        ],
      },
      aiFallbackLinesCount: unresolvedCount,
      aiRequestCount: 0,
      aiEstimatedTokenUsage: 0,
      unavailable: true,
    }
    : fallbackEnabled && !ocrFailure
    ? await aiResolveUnresolved({
      accountId: input.accountId,
      actorAccountId: input.actorAccountId,
      venueId: input.venueId,
      jobId: input.jobId,
      document: mapped,
    })
    : {
      document: mapped,
      aiFallbackLinesCount: 0,
      aiRequestCount: 0,
      aiEstimatedTokenUsage: 0,
      unavailable: false,
    };
  if (ai.unavailable) issues.push("AI_FALLBACK_UNAVAILABLE");
  mapped = ai.document;
  const resolvedCount = mapped.items.filter((item) => !item.requiresReview).length;
  const manualCount = mapped.items.length - resolvedCount;
  if (manualCount > 0 || !mapped.items.length) issues.push("VALIDATION_REQUIRED");
  if (mapped.items.length) {
    mapped.warnings = [
      `Распознано ${resolvedCount} из ${mapped.items.length} строк.${manualCount ? ` ${manualCount} поз. требуют проверки.` : " Все позиции сопоставлены."}`,
      ...mapped.warnings,
    ];
  }
  const metrics = recognitionMetrics({
    mode: input.mode,
    ocr,
    document: mapped,
    aiFallbackLinesCount: ai.aiFallbackLinesCount,
    aiRequestCount: ai.aiRequestCount,
    aiEstimatedTokenUsage: ai.aiEstimatedTokenUsage ?? 0,
    nomenclatureCandidatesCount: candidates.length,
    matchingDurationMs,
    startedAt,
  });
  console.info("INVOICE_RECOGNITION_V2_COMPLETED", {
    jobId: input.jobId,
    accountId: input.accountId,
    venueId: input.venueId,
    ...metrics,
  });
  return { document: mapped, metrics, aiUnavailable: ai.unavailable, issues: [...new Set(issues)] };
}

function purchaseBucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права добавлять закупочные документы" },
      { status: 403 },
    );
  }

  let documents: SourceDocument[] = [];
  let staged: StoredSourceDocument[] | null = null;
  let hint = "auto";
  let source: "camera" | "gallery" | "upload" = "upload";
  const id = crypto.randomUUID();

  try {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > 50_000) {
        throw new AIServiceError("Запрос распознавания слишком большой.", 413);
      }
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new AIServiceError("Не удалось прочитать список фотографий документа.", 400);
      }
      const bucket = purchaseBucket();
      if (!bucket) {
        throw new AIServiceError("Хранилище оригиналов документов временно недоступно.", 503);
      }
      const loaded = await storedDocuments(body, account.id, bucket);
      staged = loaded.documents;
      documents = staged.map((item) => item.document);
      hint = loaded.hint;
      source = loaded.source;
    } else {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new AIServiceError("Не удалось прочитать загруженный файл.", 400);
      }
      const multiple = form.getAll("files").filter(isUploadFile);
      const legacy = form.get("file");
      const files = multiple.length
        ? multiple
        : isUploadFile(legacy)
          ? [legacy]
          : [];
      if (!files.length) {
        throw new AIServiceError("Выберите документ или фотографию.", 400);
      }
      if (files.length > MAX_IMAGE_COUNT) {
        throw new AIServiceError(
          `За один раз можно выбрать не больше ${MAX_IMAGE_COUNT} фото.`,
          413,
        );
      }
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (
        files.some((file) => file.size <= 0 || file.size > MAX_FILE_BYTES)
        || totalBytes > MAX_UPLOAD_BYTES
      ) {
        throw new AIServiceError(
          "Каждый файл должен быть не больше 12 МБ, весь набор — не больше 16 МБ.",
          413,
        );
      }
      documents = await Promise.all(files.map(async (file): Promise<SourceDocument> => {
        const filename = safeFileName(file.name);
        return {
          bytes: new Uint8Array(await file.arrayBuffer()),
          filename,
          mimeType: file.type || inferredMimeType(filename),
        };
      }));
      if (
        documents.length > 1
        && documents.some((document) => !IMAGE_TYPES.has(document.mimeType))
      ) {
        throw new AIServiceError(
          "Несколько файлов можно загрузить только как фотографии. PDF и таблицы загружайте по одному.",
          415,
        );
      }
      hint = typeof form.get("hint") === "string"
        ? String(form.get("hint")).slice(0, 40)
        : "auto";
      source = form.get("source") === "camera"
        ? "camera"
        : form.get("source") === "gallery"
          ? "gallery"
          : "upload";
    }

    const modeSelection = invoiceRecognitionRequestMode({
      environment: environment(),
      role: account.role,
      requestedQaMode: new URL(request.url).searchParams.get("qa"),
    });
    const mode = modeSelection.activeMode;
    console.info("INVOICE_RECOGNITION_STARTED", {
      jobId: id,
      actorAccountId: account.actorAccountId,
      venueId: account.venueId,
      configuredMode: modeSelection.configuredMode,
      activeMode: mode,
      qaMode: modeSelection.qaMode,
      source,
      fileCount: documents.length,
    });
    let recognised: unknown;
    let recognition: Record<string, unknown> | undefined;
    if (mode === "legacy") {
      const venueContext = await loadVenueAIContext(account, "purchase");
      recognised = await recogniseDocument({
        accountId: account.id,
        jobId: id,
        documents,
        hint,
        contextHint: JSON.stringify(venueAIContextForPrompt(venueContext)),
      });
    } else if (mode === "primary") {
      const v2 = await recogniseDocumentV2({
        accountId: account.id,
        actorAccountId: account.actorAccountId,
        venueId: account.venueId,
        jobId: id,
        documents,
        mode,
        simulateAiUnavailable: modeSelection.simulateAiUnavailable,
      });
      recognised = v2.document;
      recognition = {
        jobId: id,
        version: 2,
        mode,
        configuredMode: modeSelection.configuredMode,
        qaMode: modeSelection.qaMode,
        activePipeline: "v2_primary",
        metrics: v2.metrics,
        aiUnavailable: v2.aiUnavailable,
        issues: v2.issues,
        manualContinuation: true,
      };
    } else {
      const venueContext = await loadVenueAIContext(account, "purchase");
      const [legacyResult, v2Result] = await Promise.allSettled([
        recogniseDocument({
          accountId: account.id,
          jobId: id,
          documents,
          hint,
          contextHint: JSON.stringify(venueAIContextForPrompt(venueContext)),
        }),
        recogniseDocumentV2({
          accountId: account.id,
          actorAccountId: account.actorAccountId,
          venueId: account.venueId,
          jobId: id,
          documents,
          mode,
          simulateAiUnavailable: modeSelection.simulateAiUnavailable,
        }),
      ]);
      if (v2Result.status === "rejected") throw v2Result.reason;
      const v2 = v2Result.value;
      const legacy = legacyResult.status === "fulfilled" ? legacyResult.value : null;
      recognised = legacy ?? {
        ...v2.document,
        warnings: [
          ...v2.document.warnings,
          "Сравнение с прежним способом временно недоступно. Черновик V2 сохранён для ручной проверки.",
        ],
      };
      recognition = {
        jobId: id,
        version: 2,
        mode,
        configuredMode: modeSelection.configuredMode,
        qaMode: modeSelection.qaMode,
        activePipeline: legacy ? "legacy_authoritative_v2_shadow" : "v2_shadow_fallback",
        legacyAvailable: Boolean(legacy),
        metrics: v2.metrics,
        comparison: legacy ? compareRecognitionResults(legacy, v2.document) : null,
        shadowResult: v2.document,
        issues: v2.issues,
        manualContinuation: true,
      };
      console.info("INVOICE_RECOGNITION_V2_SHADOW_COMPARISON", {
        jobId: id,
        accountId: account.id,
        venueId: account.venueId,
        comparison: recognition.comparison,
      });
    }
    const bucket = purchaseBucket();
    if (!bucket) {
      throw new AIServiceError("Хранилище оригиналов документов временно недоступно.", 503);
    }
    const stored = staged ?? documents.map((document) => ({
      document,
      id: crypto.randomUUID(),
    }));
    const storedIds: string[] = [];
    if (!staged) {
      try {
        for (const { document, id: sourceId } of stored) {
          await bucket.put(`purchases/${account.id}/${sourceId}`, document.bytes, {
            httpMetadata: { contentType: document.mimeType },
            customMetadata: {
              originalName: encodeURIComponent(document.filename),
              uploadedAt: new Date().toISOString(),
            },
          });
          storedIds.push(sourceId);
        }
      } catch (error) {
        await Promise.all(storedIds.map((sourceId) =>
          bucket.delete(`purchases/${account.id}/${sourceId}`)
        ));
        throw error;
      }
    }
    const first = stored[0];
    const sourceFileIds = stored.map((item) => item.id);
    const sourceFileNames = stored.map((item) => item.document.filename);
    const sourceFileTypes = stored.map((item) => item.document.mimeType);
    const draft = normalizePurchaseDocument({
      ...(recognised && typeof recognised === "object" ? recognised : {}),
      id,
      sourceFileId: first.id,
      sourceFileIds,
      sourceFileName: stored.length > 1
        ? `Документ · ${stored.length} фото`
        : first.document.filename,
      sourceFileNames,
      sourceFileType: first.document.mimeType,
      sourceFileTypes,
      pageCount: stored.length,
      sourceUrl: `/api/purchases/files/${first.id}`,
      source,
      status: "draft",
    }, id);
    return Response.json({ ok: true, draft, recognition }, {
      headers: { "X-Invoice-Recognition-Job-Id": id },
    });
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8).toUpperCase();
    const serviceError = error instanceof AIServiceError
      ? error
      : new AIServiceError("Не удалось распознать закупочный документ.", 502);
    console.error("PURCHASE_SCAN_FAILED", {
      jobId: id,
      errorId,
      accountId: account.id,
      venueId: account.venueId,
      code: serviceError.code,
      message: serviceError.message,
      fileCount: documents.length,
      mimeTypes: documents.map((document) => document.mimeType),
    });
    return Response.json(
      {
        ok: false,
        success: false,
        jobId: id,
        code: serviceError.code,
        error: `${serviceError.message} Код ошибки: ${errorId}.`,
        errorId,
      },
      {
        status: serviceError.status,
        headers: { "X-Invoice-Recognition-Job-Id": id },
      },
    );
  }
}

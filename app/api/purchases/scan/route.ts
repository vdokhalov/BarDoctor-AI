import * as XLSX from "xlsx";
import { env } from "cloudflare:workers";
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
} from "../../../../lib/bardoctor/purchases";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
} from "../../../../lib/bardoctor/venue-ai-context";

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
      observability: { feature: "ocr_purchases" },
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
      observability: { feature: "ocr_purchases" },
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
      observability: { feature: "ocr_purchases" },
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
  documents: SourceDocument[];
  hint: string;
  contextHint: string;
}): Promise<unknown> {
  if (input.documents.length === 1) {
    const document = input.documents[0];
    return recogniseSingleDocument({
      accountId: input.accountId,
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
    observability: { feature: "ocr_purchases" },
    system: PURCHASE_DOCUMENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    maxTokens: 12_000,
  });
  return parseAIJson<unknown>(raw);
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

    const venueContext = await loadVenueAIContext(account, "purchase");
    const recognised = await recogniseDocument({
      accountId: account.id,
      documents,
      hint,
      contextHint: JSON.stringify(venueAIContextForPrompt(venueContext)),
    });
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
    return Response.json({ ok: true, draft });
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8).toUpperCase();
    const serviceError = error instanceof AIServiceError
      ? error
      : new AIServiceError("Не удалось распознать закупочный документ.", 502);
    console.error("PURCHASE_SCAN_FAILED", {
      errorId,
      accountId: account.id,
      code: serviceError.code,
      message: serviceError.message,
      fileCount: documents.length,
      mimeTypes: documents.map((document) => document.mimeType),
    });
    return Response.json(
      {
        ok: false,
        success: false,
        code: serviceError.code,
        error: `${serviceError.message} Код ошибки: ${errorId}.`,
        errorId,
      },
      { status: serviceError.status },
    );
  }
}

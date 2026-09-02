import * as XLSX from "xlsx";
import { assertSpreadsheetInput } from "../../../../lib/bardoctor/spreadsheet-safety";
import { env } from "cloudflare:workers";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import {
  AIServiceError,
  aiErrorResponse,
  aiText,
  parseAIJson,
  type AIContent,
} from "../../../../lib/bardoctor/ai-provider";
import {
  openAIFileText,
  retrieveOpenAIText,
  startOpenAIText,
  type OpenAIBackgroundResult,
} from "../../../../lib/bardoctor/openai";
import {
  MENU_IMPORT_SYSTEM_PROMPT,
  MENU_IMPORT_RESPONSE_SCHEMA,
  mergeMenuImportParts,
  menuImportPrompt,
  normalizeMenuImport,
} from "../../../../lib/bardoctor/catalog";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
} from "../../../../lib/bardoctor/venue-ai-context";
import { readJsonRequest } from "../../../../lib/bardoctor/http";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_COUNT = 12;
const MAX_HTML_CHARS = 350_000;
const RECOGNITION_JOB_TTL_MS = 9 * 60 * 1_000;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";
const SHEET_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const HTML_TYPES = new Set(["text/html", "application/xhtml+xml", "text/plain"]);

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
  source: "camera" | "gallery" | "upload" | "url";
  originalUrl?: string;
};

type StoredSourceDocument = {
  id: string;
  document: SourceDocument;
};

type RecognitionOptions = {
  partial?: boolean;
  pageStart?: number;
  pageTotal?: number;
  contextHint?: string;
  actorAccountId?: number | null;
  venueId?: number | null;
};

type RecognitionJob = {
  version: 1;
  responseId: string;
  createdAt: string;
  expiresAt: string;
};

function pageNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.round(value as number)) : fallback;
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
  return (clean || "menu").slice(0, 180);
}

function validSourceFileId(value: string): boolean {
  return /^[a-zA-Z0-9-]{20,80}$/.test(value);
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
  if (/\.(html?|xhtml)$/i.test(filename)) return "text/html";
  return "application/octet-stream";
}

function normalizedUploadMimeType(
  bytes: Uint8Array,
  declaredType: string,
  filename: string,
): string {
  const declared = declaredType.split(";")[0]?.trim().toLocaleLowerCase("en") || "";
  if (declared === "image/jpg" || declared === "image/pjpeg") return "image/jpeg";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x47
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return declared || inferredMimeType(filename);
}

function spreadsheetText(bytes: Uint8Array): string {
  let workbook: XLSX.WorkBook;
  try {
    assertSpreadsheetInput(bytes, MAX_FILE_BYTES);
    workbook = XLSX.read(bytes, { type: "array", cellDates: true, sheetRows: 901 });
  } catch {
    throw new AIServiceError("Не удалось открыть таблицу меню.", 422);
  }
  const blocks: string[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, 8)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }).slice(0, 900);
    blocks.push(
      `Лист: ${sheetName}\n${rows
        .map((row) => row.slice(0, 30).map((cell) => String(cell ?? "").trim()).join("\t"))
        .join("\n")}`,
    );
  }
  return blocks.join("\n\n").slice(0, MAX_HTML_CHARS);
}

function readableWebText(bytes: Uint8Array): string {
  const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/?(?:br|p|div|li|tr|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_HTML_CHARS);
}

function checkedRemoteUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AIServiceError("Укажите полную ссылку на меню.", 400);
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new AIServiceError("Поддерживаются только обычные ссылки http или https.", 400);
  }
  const host = url.hostname.toLocaleLowerCase("en");
  if (
    host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host.endsWith(".internal")
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    || host.includes(":")
  ) {
    throw new AIServiceError("Эту ссылку нельзя загрузить. Используйте публичную страницу меню.", 400);
  }
  return url;
}

async function remoteDocument(value: string): Promise<SourceDocument> {
  let url = checkedRemoteUrl(value);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        headers: {
          Accept: "text/html,application/pdf,image/*,text/csv,application/vnd.ms-excel,*/*;q=.5",
          "User-Agent": "BarDoctor-MenuImporter/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AIServiceError("Не удалось открыть ссылку. Проверьте, доступна ли она без входа.", 422);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) {
        throw new AIServiceError("Страница меню перенаправляет слишком много раз.", 422);
      }
      url = checkedRemoteUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      throw new AIServiceError(`Страница меню вернула ошибку ${response.status}.`, 422);
    }
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_FILE_BYTES) {
      throw new AIServiceError("Файл по ссылке больше 12 МБ.", 413);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.byteLength > MAX_FILE_BYTES) {
      throw new AIServiceError("Страница пуста или превышает лимит 12 МБ.", 413);
    }
    const filename = safeFileName(
      decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "menu.html"),
    );
    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim()
      || inferredMimeType(filename);
    return {
      bytes,
      filename,
      mimeType,
      source: "url",
      originalUrl: url.toString(),
    };
  }
  throw new AIServiceError("Не удалось открыть ссылку на меню.", 422);
}

async function uploadedDocuments(request: Request): Promise<SourceDocument[]> {
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
    throw new AIServiceError("Выберите фотографию или файл меню.", 400);
  }
  if (files.length > MAX_IMAGE_COUNT) {
    throw new AIServiceError(`За один раз можно выбрать не больше ${MAX_IMAGE_COUNT} фото.`, 413);
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
  const source = form.get("source") === "camera"
    ? "camera"
    : form.get("source") === "gallery"
      ? "gallery"
      : "upload";
  const documents = await Promise.all(files.map(async (file): Promise<SourceDocument> => {
    const filename = safeFileName(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    return {
      bytes,
      filename,
      mimeType: normalizedUploadMimeType(bytes, file.type, filename),
      source,
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
  return documents;
}

function catalogBucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

function recognitionJobKey(accountId: number, jobId: string): string {
  return `catalog/${accountId}/jobs/${jobId}.json`;
}

function validRecognitionJobId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function saveRecognitionJob(
  bucket: R2Bucket,
  accountId: number,
  result: Extract<OpenAIBackgroundResult, { status: "queued" | "in_progress" }>,
): Promise<string> {
  const jobId = crypto.randomUUID();
  const now = new Date();
  const job: RecognitionJob = {
    version: 1,
    responseId: result.responseId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + RECOGNITION_JOB_TTL_MS).toISOString(),
  };
  await bucket.put(
    recognitionJobKey(accountId, jobId),
    JSON.stringify(job),
    { httpMetadata: { contentType: "application/json; charset=utf-8" } },
  );
  return jobId;
}

async function readRecognitionJob(
  bucket: R2Bucket,
  accountId: number,
  value: unknown,
): Promise<{ id: string; job: RecognitionJob }> {
  if (!validRecognitionJobId(value)) {
    throw new AIServiceError("Некорректный идентификатор распознавания.", 400);
  }
  const id = value;
  const object = await bucket.get(recognitionJobKey(accountId, id));
  if (!object) {
    throw new AIServiceError(
      "Сессия распознавания истекла. Загрузите страницы меню ещё раз.",
      404,
      "AI_JOB_NOT_FOUND",
    );
  }
  let job: RecognitionJob;
  try {
    job = JSON.parse(await object.text()) as RecognitionJob;
  } catch {
    await bucket.delete(recognitionJobKey(accountId, id));
    throw new AIServiceError("Сессия распознавания повреждена.", 500);
  }
  if (
    job.version !== 1
    || typeof job.responseId !== "string"
    || !Number.isFinite(Date.parse(job.expiresAt))
    || Date.parse(job.expiresAt) <= Date.now()
  ) {
    await bucket.delete(recognitionJobKey(accountId, id));
    throw new AIServiceError(
      "Сессия распознавания истекла. Загрузите страницы меню ещё раз.",
      410,
      "AI_JOB_EXPIRED",
    );
  }
  return { id, job };
}

async function pollRecognitionJob(
  bucket: R2Bucket,
  accountId: number,
  actorAccountId: number | null,
  venueId: number | null,
  value: unknown,
): Promise<Response> {
  const { id, job } = await readRecognitionJob(bucket, accountId, value);
  const result = await retrieveOpenAIText(accountId, job.responseId, {
    actorAccountId,
    venueId,
    feature: "ocr_assortment",
  });
  if (result.status === "queued" || result.status === "in_progress") {
    return Response.json(
      { ok: true, jobId: id, status: result.status },
      { status: 202 },
    );
  }
  await bucket.delete(recognitionJobKey(accountId, id));
  if ("error" in result) throw result.error;
  return Response.json({
    ok: true,
    status: result.status,
    part: parseAIJson<unknown>(result.text),
  });
}

async function storedDocuments(
  value: unknown,
  accountId: number,
  bucket: R2Bucket,
): Promise<StoredSourceDocument[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AIServiceError("Не удалось собрать загруженные страницы меню.", 400);
  }
  const body = value as Record<string, unknown>;
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
      `Нужно передать от 1 до ${MAX_IMAGE_COUNT} корректных страниц меню.`,
      400,
    );
  }
  const source = body.source === "camera" ? "camera" : "gallery";
  const documents: StoredSourceDocument[] = [];
  for (const id of ids) {
    const stored = await bucket.get(`catalog/${accountId}/${id}`);
    if (!stored) {
      throw new AIServiceError("Одна из страниц меню не найдена. Загрузите меню ещё раз.", 404);
    }
    const headers = new Headers();
    stored.writeHttpMetadata(headers);
    let filename = "menu-page.jpg";
    try {
      filename = safeFileName(
        stored.customMetadata?.originalName
          ? decodeURIComponent(stored.customMetadata.originalName)
          : filename,
      );
    } catch {
      filename = "menu-page.jpg";
    }
    const bytes = new Uint8Array(await stored.arrayBuffer());
    const mimeType = normalizedUploadMimeType(
      bytes,
      headers.get("content-type") || "",
      filename,
    );
    if (!bytes.length || bytes.byteLength > MAX_FILE_BYTES || !IMAGE_TYPES.has(mimeType)) {
      throw new AIServiceError(
        "Одна из загруженных страниц повреждена или имеет неподдерживаемый формат.",
        415,
      );
    }
    documents.push({
      id,
      document: {
        bytes,
        filename,
        mimeType,
        source,
      },
    });
  }
  return documents;
}

function recognitionPrompt(input: SourceDocument, options: RecognitionOptions): string {
  const source = input.source === "url"
    ? `публичная ссылка ${input.originalUrl}`
    : input.filename;
  const contextHint = options.contextHint
    ? `\n\nКонтекст существующего каталога BarDoctor (только для сопоставления структуры; данные документа всегда важнее):\n${options.contextHint}`
    : "";
  if (!options.partial) return `${menuImportPrompt(source)}${contextHint}`;
  const pageStart = pageNumber(options.pageStart, 1);
  const pageTotal = Math.max(pageStart, pageNumber(options.pageTotal, pageStart));
  return `${menuImportPrompt(source)}

Это часть многостраничного меню: начиная со страницы ${pageStart} из ${pageTotal}.
Извлеки только позиции, которые видны в переданных страницах. Не повторяй позиции,
дублирующиеся на соседних снимках этой части.${contextHint}`;
}

async function recogniseSingleMenu(
  input: SourceDocument,
  accountId: number,
  options: RecognitionOptions = {},
): Promise<unknown> {
  const prompt = recognitionPrompt(input, options);
  let raw: string;
  if (IMAGE_TYPES.has(input.mimeType)) {
    raw = await aiText({
      accountId,
      observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
      system: MENU_IMPORT_SYSTEM_PROMPT,
      messages: [{
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
      }],
      maxTokens: options.partial ? 7_000 : 12_000,
      imageDetail: "high",
      reasoningEffort: options.partial ? "low" : undefined,
      timeoutMs: options.partial ? 72_000 : undefined,
      responseSchema: {
        name: "menu_import",
        description: "Позиции меню и черновики техкарт, извлечённые из источника.",
        schema: MENU_IMPORT_RESPONSE_SCHEMA,
      },
    });
  } else if (input.mimeType === PDF_TYPE) {
    raw = await openAIFileText({
      accountId,
      observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
      system: MENU_IMPORT_SYSTEM_PROMPT,
      prompt,
      filename: input.filename,
      mimeType: input.mimeType,
      dataBase64: base64(input.bytes),
      maxTokens: 16_000,
      detail: "high",
      responseSchema: {
        name: "menu_import",
        description: "Позиции меню и черновики техкарт, извлечённые из источника.",
        schema: MENU_IMPORT_RESPONSE_SCHEMA,
      },
    });
  } else if (
    SHEET_TYPES.has(input.mimeType)
    || /\.(csv|tsv|xls|xlsx)$/i.test(input.filename)
  ) {
    raw = await aiText({
      accountId,
      observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
      system: MENU_IMPORT_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `${prompt}\n\nИзвлечённая таблица:\n${spreadsheetText(input.bytes)}`,
      }],
      maxTokens: 16_000,
      responseSchema: {
        name: "menu_import",
        description: "Позиции меню и черновики техкарт, извлечённые из источника.",
        schema: MENU_IMPORT_RESPONSE_SCHEMA,
      },
    });
  } else if (
    HTML_TYPES.has(input.mimeType)
    || /\.(html?|xhtml|txt)$/i.test(input.filename)
  ) {
    const pageText = readableWebText(input.bytes);
    if (pageText.length < 20) {
      throw new AIServiceError("На странице не найден читаемый текст меню.", 422);
    }
    raw = await aiText({
      accountId,
      observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
      system: MENU_IMPORT_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `${prompt}\n\nТекст страницы:\n${pageText}`,
      }],
      maxTokens: 16_000,
      responseSchema: {
        name: "menu_import",
        description: "Позиции меню и черновики техкарт, извлечённые из источника.",
        schema: MENU_IMPORT_RESPONSE_SCHEMA,
      },
    });
  } else if (input.mimeType.startsWith("image/")) {
    throw new AIServiceError(
      "Этот формат фото не поддерживается. Используйте JPG, PNG, WEBP или GIF.",
      415,
    );
  } else {
    throw new AIServiceError(
      "Поддерживаются фото, PDF, Excel, CSV и публичные страницы меню.",
      415,
    );
  }
  return parseAIJson<unknown>(raw);
}

async function recogniseMenu(
  inputs: SourceDocument[],
  accountId: number,
  options: RecognitionOptions = {},
): Promise<unknown> {
  if (inputs.length === 1) return recogniseSingleMenu(inputs[0], accountId, options);
  const pageStart = pageNumber(options.pageStart, 1);
  const pageTotal = Math.max(inputs.length, pageNumber(options.pageTotal, inputs.length));
  const pageEnd = Math.min(pageTotal, pageStart + inputs.length - 1);
  const prompt = `${menuImportPrompt(`${inputs.length} фотографий одного меню`)}

Фотографии переданы в порядке страниц. Прочитай их как единое меню, сохрани порядок
категорий и не дублируй позицию, если она повторяется на соседних снимках.${
  options.partial
    ? ` Это страницы ${pageStart}–${pageEnd} из ${pageTotal}; извлеки только видимые на них позиции.`
    : ""
}${options.contextHint
  ? `\n\nКонтекст существующего каталога BarDoctor (только для сопоставления структуры; данные документа всегда важнее):\n${options.contextHint}`
  : ""}`;
  const content: AIContent = [
    { type: "text", text: prompt },
    ...inputs.map((input) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: input.mimeType,
        data: base64(input.bytes),
      },
    })),
  ];
  const raw = await aiText({
    accountId,
    observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
    system: MENU_IMPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    maxTokens: options.partial ? 8_000 : 16_000,
    imageDetail: "high",
    reasoningEffort: options.partial ? "low" : undefined,
    timeoutMs: options.partial ? 72_000 : undefined,
    responseSchema: {
      name: "menu_import",
      description: "Позиции меню и черновики техкарт, извлечённые из источника.",
      schema: MENU_IMPORT_RESPONSE_SCHEMA,
    },
  });
  return parseAIJson<unknown>(raw);
}

async function startMenuRecognition(
  inputs: SourceDocument[],
  accountId: number,
  options: RecognitionOptions,
): Promise<OpenAIBackgroundResult> {
  if (
    inputs.length !== 1
    || inputs.some((input) => !IMAGE_TYPES.has(input.mimeType))
  ) {
    throw new AIServiceError(
      "Фоновое распознавание запускается отдельно для каждой страницы меню.",
      400,
    );
  }
  const input = inputs[0];
  const content: AIContent = [
    { type: "text", text: recognitionPrompt(input, options) },
    {
      type: "image",
      source: {
        type: "base64",
        media_type: input.mimeType,
        data: base64(input.bytes),
      },
    },
  ];
  return startOpenAIText({
    accountId,
    observability: { actorAccountId: options.actorAccountId, venueId: options.venueId, feature: "ocr_assortment" },
    system: MENU_IMPORT_SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    maxTokens: 16_000,
    imageDetail: "high",
    reasoningEffort: "none",
    responseSchema: {
      name: "menu_import",
      description: "Позиции меню и черновики техкарт, извлечённые с одной страницы.",
      schema: MENU_IMPORT_RESPONSE_SCHEMA,
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права импортировать меню" },
      { status: 403 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const bucket = catalogBucket();
    let alreadyStored: StoredSourceDocument[] | null = null;
    let documents: SourceDocument[];
    let jsonBody: Record<string, unknown> | null = null;
    if (contentType.includes("application/json")) {
      const parsed = await readJsonRequest<Record<string, unknown>>(request, {
        maxBytes: 2 * 1024 * 1024,
      });
      if (!parsed.ok) return parsed.response;
      jsonBody = parsed.data;
      if (jsonBody?.action === "poll-recognition") {
        if (!bucket) {
          throw new AIServiceError("Хранилище распознавания временно недоступно.", 503);
        }
        return await pollRecognitionJob(
          bucket,
          account.id,
          account.actorAccountId,
          account.venueId,
          jsonBody.jobId,
        );
      }
      if (
        jsonBody
        && Array.isArray(jsonBody.sourceFileIds)
      ) {
        if (!bucket) {
          throw new AIServiceError("Хранилище оригиналов меню временно недоступно.", 503);
        }
        alreadyStored = await storedDocuments(jsonBody, account.id, bucket);
        documents = alreadyStored.map((item) => item.document);
      } else {
        const url = jsonBody && "url" in jsonBody
          ? String(jsonBody.url ?? "")
          : "";
        documents = [await remoteDocument(url)];
      }
    } else {
      documents = await uploadedDocuments(request);
    }
    const action = jsonBody?.action;
    const partial = action === "recognise-batch";
    if (partial && documents.length !== 1) {
      throw new AIServiceError(
        "Каждая страница меню должна распознаваться отдельным заданием.",
        400,
      );
    }
    if (
      action === "merge-batches"
      && (
        !Array.isArray(jsonBody?.parts)
        || jsonBody.parts.length === 0
        || jsonBody.parts.length > MAX_IMAGE_COUNT
      )
    ) {
      throw new AIServiceError("Не удалось собрать части распознанного меню.", 400);
    }
    const catalogContext = await loadVenueAIContext(account, "catalog", jsonBody ?? {});
    const recognitionOptions = {
      partial,
      actorAccountId: account.actorAccountId,
      venueId: account.venueId,
      pageStart: Number(jsonBody?.pageStart),
      pageTotal: Number(jsonBody?.pageTotal),
      contextHint: JSON.stringify(venueAIContextForPrompt(catalogContext)),
    };
    let recognised: unknown;
    if (action === "merge-batches") {
      recognised = mergeMenuImportParts(jsonBody?.parts);
    } else if (partial) {
      if (!bucket) {
        throw new AIServiceError("Хранилище распознавания временно недоступно.", 503);
      }
      const result = await startMenuRecognition(documents, account.id, recognitionOptions);
      if (result.status === "queued" || result.status === "in_progress") {
        const jobId = await saveRecognitionJob(bucket, account.id, result);
        return Response.json(
          { ok: true, jobId, status: result.status },
          { status: 202 },
        );
      }
      if ("error" in result) throw result.error;
      recognised = parseAIJson<unknown>(result.text);
    } else {
      recognised = await recogniseMenu(documents, account.id, recognitionOptions);
    }
    if (!bucket) {
      throw new AIServiceError("Хранилище оригиналов меню временно недоступно.", 503);
    }
    const id = crypto.randomUUID();
    const stored = alreadyStored ?? documents.map((document, index) => ({
      document,
      id: index === 0 ? id : crypto.randomUUID(),
    }));
    const storedIds: string[] = [];
    if (!alreadyStored) {
      try {
        for (const { document, id: sourceId } of stored) {
          await bucket.put(`catalog/${account.id}/${sourceId}`, document.bytes, {
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
          bucket.delete(`catalog/${account.id}/${sourceId}`)
        ));
        throw error;
      }
    }
    const first = stored[0];
    const sourceFileIds = stored.map((item) => item.id);
    const sourceFileNames = stored.map((item) => item.document.filename);
    const sourceFileTypes = stored.map((item) => item.document.mimeType);
    const draft = normalizeMenuImport(recognised, {
      id,
      source: first.document.source,
      sourceFileId: first.id,
      sourceFileIds,
      sourceFileName: stored.length > 1
        ? `Меню · ${stored.length} фото`
        : first.document.filename,
      sourceFileNames,
      sourceFileType: first.document.mimeType,
      sourceFileTypes,
      pageCount: stored.length,
      sourceUrl: first.document.originalUrl || `/api/catalog/files/${first.id}`,
    });
    if (partial) {
      return Response.json({ ok: true, part: draft });
    }
    return Response.json({ ok: true, draft });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

import * as XLSX from "xlsx";
import { assertSpreadsheetInput } from "../../../../lib/bardoctor/spreadsheet-safety";
import { env } from "cloudflare:workers";
import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { AIServiceError, aiText, parseAIJson } from "../../../../lib/bardoctor/ai-provider";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../../lib/bardoctor/inventory";
import { openAIFileText } from "../../../../lib/bardoctor/openai";
import {
  normalizeSalesDocument,
  SALES_REPORT_SYSTEM_PROMPT,
  salesReportPrompt,
} from "../../../../lib/bardoctor/sales";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
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

function isUploadFile(value: FormDataEntryValue | null): value is File & UploadFile {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function safeFileName(value: string): string {
  return (value.replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim() || "sales-report").slice(0, 180);
}

function inferredMimeType(filename: string): string {
  if (/\.pdf$/i.test(filename)) return PDF_TYPE;
  if (/\.csv$/i.test(filename)) return "text/csv";
  if (/\.tsv$/i.test(filename)) return "text/tab-separated-values";
  if (/\.xlsx$/i.test(filename)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (/\.xls$/i.test(filename)) return "application/vnd.ms-excel";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  if (/\.(jpe?g)$/i.test(filename)) return "image/jpeg";
  return "application/octet-stream";
}

function spreadsheetText(bytes: Uint8Array): string {
  let workbook: XLSX.WorkBook;
  try {
    assertSpreadsheetInput(bytes, MAX_FILE_BYTES);
    workbook = XLSX.read(bytes, { type: "array", cellDates: true, sheetRows: 2_001 });
  } catch {
    throw new AIServiceError("Не удалось открыть отчёт. Проверьте файл Excel или CSV.", 422);
  }
  return workbook.SheetNames.slice(0, 10).map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }).slice(0, 2_000);
    return `Лист: ${sheetName}\n${rows.map((row) =>
      row.slice(0, 40).map((cell) => String(cell ?? "").trim()).join("\t")
    ).join("\n")}`;
  }).join("\n\n").slice(0, 500_000);
}

async function activeMenuNames(accountId: number): Promise<string[]> {
  const row = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
  `).bind(accountId, ASSORTMENT_STORE_KEY).first<{ data_json: string }>();
  if (!row) return [];
  try {
    const assortment = record(JSON.parse(row.data_json) as unknown);
    return (Array.isArray(assortment.menuItems) ? assortment.menuItems : [])
      .map(record)
      .filter((item) => item.active !== false && item.type !== "service")
      .map((item) => String(item.name ?? "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function bucket(): R2Bucket | null {
  return (env as unknown as { BUCKET?: R2Bucket }).BUCKET ?? null;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "sales.create")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права импортировать продажи" },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Не удалось прочитать файл отчёта" }, { status: 400 });
  }
  const file = form.get("file");
  if (!isUploadFile(file)) {
    return Response.json({ ok: false, error: "Выберите отчёт о продажах" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return Response.json({ ok: false, error: "Файл должен быть не больше 12 МБ" }, { status: 413 });
  }

  const filename = safeFileName(file.name);
  const mimeType = file.type || inferredMimeType(filename);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const menuNames = await activeMenuNames(account.id);
  const prompt = salesReportPrompt(menuNames);
  const sourceId = crypto.randomUUID();

  try {
    let raw: string;
    if (IMAGE_TYPES.has(mimeType)) {
      raw = await aiText({
        accountId: account.id,
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_sales" },
        system: SALES_REPORT_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64(bytes) } },
          ],
        }],
        maxTokens: 12_000,
      });
    } else if (mimeType === PDF_TYPE) {
      raw = await openAIFileText({
        accountId: account.id,
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_sales" },
        system: SALES_REPORT_SYSTEM_PROMPT,
        prompt,
        filename,
        mimeType,
        dataBase64: base64(bytes),
        maxTokens: 14_000,
        detail: "high",
      });
    } else if (SHEET_TYPES.has(mimeType) || /\.(csv|tsv|xls|xlsx)$/i.test(filename)) {
      raw = await aiText({
        accountId: account.id,
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_sales" },
        system: SALES_REPORT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${prompt}\n\nИзвлечённая таблица:\n${spreadsheetText(bytes)}` }],
        maxTokens: 14_000,
      });
    } else {
      throw new AIServiceError("Поддерживаются фото, PDF, Excel и CSV.", 415);
    }

    const storage = bucket();
    if (!storage) throw new AIServiceError("Хранилище отчётов временно недоступно.", 503);
    await storage.put(`sales/${account.id}/${sourceId}`, bytes, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { originalName: encodeURIComponent(filename), uploadedAt: new Date().toISOString() },
    });
    const draft = normalizeSalesDocument({
      ...record(parseAIJson<unknown>(raw)),
      id: sourceId,
      sourceFileId: sourceId,
      sourceFileName: filename,
      sourceFileType: mimeType,
      sourceUrl: `/api/sales/files/${sourceId}`,
      status: "draft",
    }, sourceId);
    return Response.json({ ok: true, draft });
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8).toUpperCase();
    const serviceError = error instanceof AIServiceError
      ? error
      : new AIServiceError("Не удалось распознать отчёт о продажах.", 502);
    console.error("SALES_SCAN_FAILED", {
      errorId,
      accountId: account.id,
      code: serviceError.code,
      message: serviceError.message,
      mimeType,
    });
    return Response.json({
      ok: false,
      code: serviceError.code,
      error: `${serviceError.message} Код ошибки: ${errorId}.`,
      errorId,
    }, { status: serviceError.status });
  }
}

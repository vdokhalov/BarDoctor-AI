import * as XLSX from "xlsx";
import { assertSpreadsheetInput } from "../../../../lib/bardoctor/spreadsheet-safety";
import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { AIServiceError, aiText, parseAIJson } from "../../../../lib/bardoctor/ai-provider";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  ASSORTMENT_STORE_KEY,
  normalizeInventoryText,
  toInventoryBaseAmount,
} from "../../../../lib/bardoctor/inventory";
import { openAIFileText } from "../../../../lib/bardoctor/openai";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_TYPE = "application/pdf";
const SHEET_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SYSTEM_PROMPT = `Ты распознаёшь инвентаризационную ведомость заведения.
Верни только JSON без markdown:
{"date":"YYYY-MM-DD или пусто","items":[{"name":"название как в документе","quantity":0,"unit":"шт/уп/бут/мл/л/г/кг"}],"warnings":[]}
Правила:
- извлекай только реально видимые строки и числа, ничего не придумывай;
- quantity — фактическое количество по ведомости, не расчётный остаток;
- не объединяй разные фасовки;
- если число или единица не читаются, не угадывай: добавь предупреждение;
- итоги в деньгах не являются количеством товара.`;

type UploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type JsonRecord = Record<string, unknown>;

function isUploadFile(value: FormDataEntryValue | null): value is File & UploadFile {
  return Boolean(value && typeof value === "object" && "arrayBuffer" in value);
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, fallback = "", max = 240): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "string"
    ? Number(value.replace(/\s/g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
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
    throw new AIServiceError("Не удалось открыть ведомость. Проверьте файл Excel или CSV.", 422);
  }
  return workbook.SheetNames.slice(0, 8).map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }).slice(0, 2_000);
    return `Лист: ${sheetName}\n${rows.map((row) =>
      row.slice(0, 30).map((cell) => String(cell ?? "").trim()).join("\t")
    ).join("\n")}`;
  }).join("\n\n").slice(0, 450_000);
}

function tokenScore(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 1));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length > 1));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const containment = shared / Math.min(leftTokens.size, rightTokens.size);
  return Math.max(shared / union, containment * 0.9);
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "inventory.manage")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Нет права сканировать инвентаризацию" },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Не удалось прочитать файл" }, { status: 400 });
  }
  const file = form.get("file");
  if (!isUploadFile(file)) {
    return Response.json({ ok: false, error: "Выберите фото или файл ведомости" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return Response.json({ ok: false, error: "Файл должен быть не больше 12 МБ" }, { status: 413 });
  }

  const row = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
  `).bind(account.id, ASSORTMENT_STORE_KEY).first<{ data_json: string }>();
  let assortment: JsonRecord = {};
  try {
    assortment = record(row?.data_json ? JSON.parse(row.data_json) as unknown : {});
  } catch {
    assortment = {};
  }
  const balances = (Array.isArray(assortment.stockBalances) ? assortment.stockBalances : [])
    .map(record)
    .filter((balance) => text(balance.productKey ?? balance.key, "", 300));
  if (!balances.length) {
    return Response.json({
      ok: false,
      code: "EMPTY_WAREHOUSE",
      error: "На складе пока нет номенклатуры. Сначала подтвердите приходную накладную.",
    }, { status: 422 });
  }

  const filename = (file.name.replace(/[^\p{L}\p{N}._ -]+/gu, "_").trim() || "inventory").slice(0, 180);
  const mimeType = file.type || inferredMimeType(filename);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const names = balances.slice(0, 2_000).map((balance) =>
    `${text(balance.name, "Товар")} [${text(balance.packageSize, "без фасовки")}]`
  );
  const prompt = `Распознай фактические остатки из ведомости. Список складских позиций BarDoctor дан только для сопоставления; не добавляй его строки, если их нет в документе.\n\nНоменклатура:\n${names.join("\n")}`;

  try {
    let raw: string;
    if (IMAGE_TYPES.has(mimeType)) {
      raw = await aiText({
        accountId: account.id,
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_inventory" },
        system: SYSTEM_PROMPT,
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
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_inventory" },
        system: SYSTEM_PROMPT,
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
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "ocr_inventory" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `${prompt}\n\nИзвлечённая таблица:\n${spreadsheetText(bytes)}` }],
        maxTokens: 14_000,
      });
    } else {
      throw new AIServiceError("Поддерживаются фото, PDF, Excel и CSV.", 415);
    }

    const parsed = record(parseAIJson<unknown>(raw));
    const extracted = (Array.isArray(parsed.items) ? parsed.items : []).map(record).slice(0, 2_000);
    const candidates = balances.map((balance) => ({
      balance,
      key: text(balance.productKey ?? balance.key, "", 300),
      normalized: normalizeInventoryText(`${text(balance.name)} ${text(balance.packageSize)}`),
      nameOnly: normalizeInventoryText(balance.name),
    }));
    const mapped: JsonRecord[] = [];
    const unresolved: JsonRecord[] = [];

    extracted.forEach((item, index) => {
      const name = text(item.name, `Позиция ${index + 1}`);
      const normalized = normalizeInventoryText(name);
      const ranked = candidates.map((candidate) => ({
        ...candidate,
        score: Math.max(tokenScore(normalized, candidate.normalized), tokenScore(normalized, candidate.nameOnly)),
      })).sort((left, right) => right.score - left.score);
      const best = ranked[0];
      const second = ranked[1];
      if (!best || best.score < 0.58 || (second && best.score < 0.86 && best.score - second.score < 0.12)) {
        unresolved.push({
          id: `scan-${index + 1}`,
          name,
          quantity: Math.max(0, number(item.quantity)),
          unit: text(item.unit, ""),
          reason: "Не удалось однозначно сопоставить со складом",
          candidates: ranked.slice(0, 3).filter((candidate) => candidate.score >= 0.4).map((candidate) => ({
            productKey: candidate.key,
            name: text(candidate.balance.name, "Товар"),
            packageSize: text(candidate.balance.packageSize, ""),
          })),
        });
        return;
      }
      const quantity = Math.max(0, number(item.quantity));
      const requestedUnit = normalizeInventoryText(item.unit);
      const balanceUnit = text(best.balance.unit, "unknown", 20);
      const packageAmount = Math.max(0, number(best.balance.packageAmount));
      const packageLike = !requestedUnit || /^(шт|уп|бут|бан|пач|короб|ед|pcs)/.test(requestedUnit);
      const converted = packageLike && packageAmount > 0
        ? { amount: quantity * packageAmount, unit: balanceUnit }
        : toInventoryBaseAmount(quantity, requestedUnit);
      if (converted.unit !== balanceUnit || converted.amount < 0) {
        unresolved.push({
          id: `scan-${index + 1}`,
          name,
          quantity,
          unit: text(item.unit, ""),
          reason: "Единица в ведомости не совпадает со складской единицей",
          candidates: [{
            productKey: best.key,
            name: text(best.balance.name, "Товар"),
            packageSize: text(best.balance.packageSize, ""),
          }],
        });
        return;
      }
      mapped.push({
        id: `scan-${index + 1}`,
        productKey: best.key,
        productName: text(best.balance.name, name),
        actual: Math.round(converted.amount * 1_000) / 1_000,
        scannedName: name,
        mappingConfidence: Math.round(best.score * 100),
      });
    });

    return Response.json({
      ok: true,
      draft: {
        id: crypto.randomUUID(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(text(parsed.date, "", 10))
          ? text(parsed.date, "", 10)
          : new Date().toISOString().slice(0, 10),
        source: "scan",
        sourceFileName: filename,
        items: mapped,
        unresolved,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 50) : [],
      },
    });
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8).toUpperCase();
    const serviceError = error instanceof AIServiceError
      ? error
      : new AIServiceError("Не удалось распознать инвентаризационную ведомость.", 502);
    console.error("INVENTORY_SCAN_FAILED", {
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

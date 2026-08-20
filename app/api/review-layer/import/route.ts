import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import type { FieldMapping } from "../../../../lib/bardoctor/integrations/contracts";
import { mapReviewFile } from "../../../../lib/bardoctor/review-import";
import {
  logReviewLayerEvent,
  upsertAccountReviews,
} from "../../../../lib/bardoctor/review-layer";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls", "json"]);

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function mapping(value: FormDataEntryValue | null): FieldMapping {
  if (typeof value !== "string" || !value.trim()) throw new Error("Сопоставьте столбцы файла");
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Некорректная схема сопоставления");
  }
  return parsed as FieldMapping;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "reviews.manage") || !hasPermission(account, "data.import")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав для импорта отзывов" },
      { status: 403 },
    ));
  }
  let form: FormData;
  try { form = await request.formData(); } catch {
    return noStore(Response.json({ ok: false, error: "Не удалось прочитать файл" }, { status: 400 }));
  }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    return noStore(Response.json({ ok: false, error: "Выберите файл" }, { status: 400 }));
  }
  if (file.size > MAX_FILE_BYTES) {
    return noStore(Response.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 413 }));
  }
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en") ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return noStore(Response.json({ ok: false, error: "Поддерживаются CSV, XLSX, XLS и JSON" }, { status: 400 }));
  }
  const defaultSource = typeof form.get("source") === "string"
    ? String(form.get("source")).trim().slice(0, 80) || "other"
    : "other";
  try {
    const mapped = await mapReviewFile({
      fileName: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      fieldMapping: mapping(form.get("fieldMapping")),
      defaultSource,
    });
    const result = await upsertAccountReviews(
      account,
      mapped.records,
      "file_import",
      `Импорт отзывов из ${file.name}`,
      defaultSource,
    );
    await logReviewLayerEvent(
      account.id,
      defaultSource,
      result.invalid ? "import_partial" : "import_completed",
      `Получено: ${mapped.records.length}; создано: ${result.created}; обновлено: ${result.updated}; пропущено: ${result.skipped}; ошибок: ${result.invalid}`,
    );
    return noStore(Response.json({ ok: true, result, warnings: mapped.warnings }, { status: 201 }));
  } catch (error) {
    await logReviewLayerEvent(
      account.id,
      defaultSource,
      "import_failed",
      error instanceof Error ? error.message : "Импорт не выполнен",
    );
    return noStore(Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Импорт не выполнен",
    }, { status: 422 }));
  }
}

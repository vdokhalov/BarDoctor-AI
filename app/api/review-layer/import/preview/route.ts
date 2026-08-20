import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import { inspectReviewFile, REVIEW_IMPORT_FIELDS } from "../../../../../lib/bardoctor/review-import";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls", "json"]);

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
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
  try {
    const inspection = await inspectReviewFile({
      fileName: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return noStore(Response.json({
      ok: true,
      inspection,
      fields: REVIEW_IMPORT_FIELDS.map(({ target, label, required }) => ({ target, label, required })),
    }));
  } catch (error) {
    return noStore(Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Предпросмотр не готов",
    }, { status: 422 }));
  }
}

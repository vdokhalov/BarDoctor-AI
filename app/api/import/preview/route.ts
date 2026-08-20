import * as XLSX from "xlsx";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_ROWS = 2_000;

function safeFileName(value: string | null): string {
  const decoded = value ? decodeURIComponent(value) : "import.xlsx";
  return decoded.replace(/[\\/\0]/g, "").slice(0, 180) || "import.xlsx";
}

function normalizeCell(value: unknown): string | number | boolean | null {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "data.import")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Импорт данных вам не разрешён" },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES) {
    return Response.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 413 });
  }

  const fileName = safeFileName(request.headers.get("x-file-name"));
  if (!/\.(csv|xlsx|xls)$/i.test(fileName)) {
    return Response.json(
      { ok: false, error: "Поддерживаются файлы CSV, XLSX и XLS" },
      { status: 400 },
    );
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) {
    return Response.json({ ok: false, error: "Файл пуст" }, { status: 400 });
  }
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return Response.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 413 });
  }

  try {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("В книге нет листов");
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: null,
      raw: false,
    });
    const rows = rawRows.slice(0, MAX_ROWS).map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), normalizeCell(value)])),
    );
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

    return Response.json({
      ok: true,
      fileName,
      sheetName,
      columns,
      rows,
      totalRows: rawRows.length,
      truncated: rawRows.length > MAX_ROWS,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? `Не удалось прочитать файл: ${error.message}` : "Не удалось прочитать файл",
      },
      { status: 400 },
    );
  }
}

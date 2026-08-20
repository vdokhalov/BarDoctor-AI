import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  INTEGRATION_ENTITY_TYPES,
  type FieldMapping,
  type IntegrationEntityType,
} from "../../../../lib/bardoctor/integrations/contracts";
import { sourceTypeFor } from "../../../../lib/bardoctor/integrations/configuration";
import { ensureFileConnection } from "../../../../lib/bardoctor/integrations/repository";
import { runIntegrationSync } from "../../../../lib/bardoctor/integrations/sync-engine";
import { UniversalFileAdapter } from "../../../../lib/bardoctor/integrations/universal-file-adapter";
import { integrationBusinessWriter } from "../business-writer";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["csv", "xlsx", "xls", "json", "xml"]);

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function cleanText(value: FormDataEntryValue | null, fallback = "", max = 120): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function requestedType(value: string): IntegrationEntityType | undefined {
  return INTEGRATION_ENTITY_TYPES.includes(value as IntegrationEntityType)
    ? value as IntegrationEntityType
    : undefined;
}

function fieldMapping(value: FormDataEntryValue | null): FieldMapping | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as FieldMapping
      : undefined;
  } catch {
    throw new Error("Некорректная схема сопоставления столбцов");
  }
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage") || !hasPermission(account, "data.import")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "У вас нет права импортировать данные" },
      { status: 403 },
    ));
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES + 100_000) {
    return noStore(Response.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 413 }));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return noStore(Response.json({ ok: false, error: "Не удалось прочитать форму импорта" }, { status: 400 }));
  }
  const file = form.get("file");
  if (!(file instanceof File) || !file.name || file.size === 0) {
    return noStore(Response.json({ ok: false, error: "Выберите непустой файл" }, { status: 400 }));
  }
  if (file.size > MAX_FILE_BYTES) {
    return noStore(Response.json({ ok: false, error: "Файл больше 6 МБ" }, { status: 413 }));
  }
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en") ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return noStore(Response.json(
      { ok: false, error: "Поддерживаются CSV, XLSX, XLS, JSON и XML" },
      { status: 400 },
    ));
  }
  const externalSystem = cleanText(form.get("externalSystem"), "Импорт файла");
  const entityType = requestedType(cleanText(form.get("entityType")));
  try {
    const adapter = new UniversalFileAdapter();
    const normalized = await adapter.normalize({
      fileName: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      entityType,
      fieldMapping: fieldMapping(form.get("fieldMapping")),
    }, {
      venueId: account.venueId,
      externalSystem,
      sourceType: sourceTypeFor("universal-file-v1", externalSystem),
      now: new Date().toISOString(),
    });
    const connection = await ensureFileConnection(account, normalized.records[0]?.externalSystem || externalSystem);
    const run = await runIntegrationSync({
      account,
      connectionId: connection.id,
      trigger: "file",
      dataType: normalized.entityType,
      sourceName: file.name,
      records: normalized.records,
      writer: integrationBusinessWriter(request, account),
    });
    return noStore(Response.json({ ok: true, run, warnings: normalized.warnings }, { status: 201 }));
  } catch (error) {
    return noStore(Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Импорт не выполнен",
    }, { status: 422 }));
  }
}

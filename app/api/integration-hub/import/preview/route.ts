import { hasPermission } from "../../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../../lib/bardoctor/auth";
import {
  INTEGRATION_ENTITY_TYPES,
  type IntegrationEntityType,
} from "../../../../../lib/bardoctor/integrations/contracts";
import {
  fieldMappingTemplate,
  parseFieldMappingTemplate,
} from "../../../../../lib/bardoctor/integrations/field-mapping-repository";
import { FIELD_DEFINITIONS } from "../../../../../lib/bardoctor/integrations/field-mapping";
import { ensureFileConnection } from "../../../../../lib/bardoctor/integrations/repository";
import { inspectUniversalFile } from "../../../../../lib/bardoctor/integrations/universal-file-adapter";

const MAX_FILE_BYTES = 6 * 1024 * 1024;

function text(value: FormDataEntryValue | null, fallback = "", max = 140): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function response(value: unknown, status = 200): Response {
  const result = Response.json(value, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage") || !hasPermission(account, "data.import")) {
    return response({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав для импорта" }, 403);
  }
  let form: FormData;
  try { form = await request.formData(); } catch {
    return response({ ok: false, error: "Не удалось прочитать файл" }, 400);
  }
  const file = form.get("file");
  const entityType = text(form.get("entityType")) as IntegrationEntityType;
  const externalSystem = text(form.get("externalSystem"), "Импорт файла");
  if (!(file instanceof File) || !file.size) return response({ ok: false, error: "Выберите файл" }, 400);
  if (file.size > MAX_FILE_BYTES) return response({ ok: false, error: "Файл больше 6 МБ" }, 413);
  if (!INTEGRATION_ENTITY_TYPES.includes(entityType)) {
    return response({ ok: false, error: "Выберите тип данных" }, 400);
  }
  try {
    const inspection = await inspectUniversalFile({
      fileName: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      entityType,
    });
    const connection = await ensureFileConnection(account, externalSystem);
    const saved = await fieldMappingTemplate({
      tenant: account,
      connectionId: connection.id,
      entityType,
      headerSignature: inspection.headerSignature,
    });
    const savedValues = saved ? parseFieldMappingTemplate(saved) : null;
    const mapping = savedValues?.mapping ?? inspection.suggestedMapping;
    const required = new Set(FIELD_DEFINITIONS[entityType].filter((item) => item.required).map((item) => item.target));
    const nestedContract = inspection.fileKind !== "spreadsheet" && inspection.sample.some((item) =>
      Array.isArray(item.items) || Array.isArray(item.ingredients)
    );
    return response({
      ok: true,
      inspection: { ...inspection, suggestedMapping: mapping },
      connectionId: connection.id,
      template: saved ? { id: saved.id, name: saved.name, restored: true } : null,
      fields: (nestedContract ? [] : FIELD_DEFINITIONS[entityType]).map((item) => ({
        target: item.target,
        label: item.label,
        required: required.has(item.target),
      })),
    });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Предпросмотр не готов" }, 422);
  }
}

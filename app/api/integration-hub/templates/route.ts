import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  INTEGRATION_ENTITY_TYPES,
  type FieldMapping,
  type IntegrationEntityType,
} from "../../../../lib/bardoctor/integrations/contracts";
import {
  disableFieldMappingTemplate,
  listFieldMappingTemplates,
  saveFieldMappingTemplate,
} from "../../../../lib/bardoctor/integrations/field-mapping-repository";
import { connectionForTenant } from "../../../../lib/bardoctor/integrations/repository";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, max = 180): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function response(value: unknown, status = 200): Response {
  const result = Response.json(value, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) return response({ ok: false, error: "Недостаточно прав" }, 403);
  return response({ ok: true, templates: await listFieldMappingTemplates(account) });
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) return response({ ok: false, error: "Недостаточно прав" }, 403);
  let value: JsonRecord;
  try { value = record(await request.json()); } catch { return response({ ok: false, error: "Некорректный шаблон" }, 400); }
  const connectionId = text(value.connectionId);
  const entityType = text(value.entityType) as IntegrationEntityType;
  if (!INTEGRATION_ENTITY_TYPES.includes(entityType) || !await connectionForTenant(account, connectionId)) {
    return response({ ok: false, error: "Подключение или тип данных не найден" }, 404);
  }
  const mapping = record(value.mapping) as FieldMapping;
  const saved = await saveFieldMappingTemplate({
    tenant: account,
    connectionId,
    entityType,
    name: text(value.name, 140) || "Шаблон импорта",
    fileKind: text(value.fileKind, 30),
    headerSignature: text(value.headerSignature, 100),
    mapping,
    defaults: record(value.defaults),
  });
  return response({ ok: true, template: saved }, 201);
}

export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) return response({ ok: false, error: "Недостаточно прав" }, 403);
  const templateId = text(new URL(request.url).searchParams.get("templateId"));
  const saved = templateId && await disableFieldMappingTemplate({ tenant: account, templateId });
  return response({ ok: Boolean(saved) }, saved ? 200 : 404);
}

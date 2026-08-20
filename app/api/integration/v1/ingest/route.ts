import { serviceIntegrationBusinessWriter } from "../../../integration-hub/business-writer";
import {
  INTEGRATION_ENTITY_TYPES,
  type IntegrationEntityType,
  type PullCursor,
} from "../../../../../lib/bardoctor/integrations/contracts";
import {
  authorizeIngressRequest,
  claimIngressDelivery,
  finishIngressDelivery,
  integrationPayloadHash,
} from "../../../../../lib/bardoctor/integrations/ingress-auth";
import { runIntegrationSync } from "../../../../../lib/bardoctor/integrations/sync-engine";
import {
  LocalConnectorAdapter,
  UniversalApiAdapter,
} from "../../../../../lib/bardoctor/integrations/universal-api-adapter";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_RECORDS = 2_000;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, max = 180): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(value: string): unknown {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function response(value: unknown, status = 200): Response {
  const result = Response.json(value, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function parseCursor(value: unknown): PullCursor | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const cursor = Object.fromEntries(Object.entries(value as JsonRecord)
    .filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item))
    .slice(0, 100)) as PullCursor;
  return Object.keys(cursor).length ? cursor : undefined;
}

export async function POST(request: Request): Promise<Response> {
  const authorization = await authorizeIngressRequest(request);
  if (!authorization) {
    return response({ ok: false, code: "INVALID_INTEGRATION_TOKEN", error: "Недействительный или приостановленный ключ интеграции" }, 401);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return response({ ok: false, error: "Пакет больше 2 МБ" }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return response({ ok: false, error: "Пакет больше 2 МБ" }, 413);
  }
  const parsed = json(raw);
  const message = record(parsed);
  const entityType = text(message.entityType) as IntegrationEntityType;
  const deliveryId = text(message.deliveryId);
  const records = Array.isArray(message.records) ? message.records : [];
  if (message.protocolVersion !== "1.0" || !deliveryId || !INTEGRATION_ENTITY_TYPES.includes(entityType)) {
    return response({ ok: false, code: "CONTRACT_INVALID", error: "Нужны protocolVersion=1.0, deliveryId и поддерживаемый entityType" }, 400);
  }
  if (!records.length || records.length > MAX_RECORDS) {
    return response({ ok: false, code: "RECORD_COUNT_INVALID", error: `В пакете должно быть от 1 до ${MAX_RECORDS} записей` }, 400);
  }
  if (!authorization.scopes.includes(entityType)) {
    return response({ ok: false, code: "SCOPE_DENIED", error: "Ключ не разрешает этот тип данных" }, 403);
  }
  const local = authorization.connection.adapter_key === "local-connector-v1";
  if (local && text(message.connectionId) !== authorization.connection.id) {
    return response({ ok: false, code: "CONNECTION_MISMATCH", error: "Пакет Local Connector относится к другому подключению" }, 403);
  }
  if (!local && authorization.connection.adapter_key !== "universal-api-v1") {
    return response({ ok: false, code: "ADAPTER_MISMATCH", error: "Этот ключ не предназначен для Universal API" }, 403);
  }
  let config: JsonRecord = {};
  try { config = record(JSON.parse(authorization.connection.config_json)); } catch { config = {}; }
  const organization = text(message.externalOrganizationId);
  const externalVenue = text(message.externalVenueId);
  if (text(config.externalOrganizationId) && organization !== text(config.externalOrganizationId)) {
    return response({ ok: false, code: "ORGANIZATION_MISMATCH", error: "Пакет относится к другой внешней организации" }, 403);
  }
  if (text(config.externalVenueId) && externalVenue !== text(config.externalVenueId)) {
    return response({ ok: false, code: "EXTERNAL_VENUE_MISMATCH", error: "Пакет относится к другому внешнему заведению" }, 403);
  }
  const allowedWarehouses = new Set(Array.isArray(config.warehouseIds) ? config.warehouseIds.map(String) : []);
  if (allowedWarehouses.size) {
    const invalidWarehouse = records.find((value) => {
      const warehouse = text(record(value).warehouseExternalId);
      return warehouse && !allowedWarehouses.has(warehouse);
    });
    if (invalidWarehouse) {
      return response({ ok: false, code: "WAREHOUSE_SCOPE_DENIED", error: "Пакет содержит склад вне настроенного подключения" }, 403);
    }
  }
  const allowedRegisters = new Set(Array.isArray(config.registerIds) ? config.registerIds.map(String) : []);
  if (allowedRegisters.size && entityType === "sale") {
    const invalidRegister = records.find((value) => {
      const item = record(value);
      const register = text(item.registerExternalId ?? item.registerId);
      return register && !allowedRegisters.has(register);
    });
    if (invalidRegister) {
      return response({ ok: false, code: "REGISTER_SCOPE_DENIED", error: "Пакет содержит кассу вне настроенного подключения" }, 403);
    }
  }
  const payloadHash = await integrationPayloadHash(raw);
  let claim;
  try {
    claim = await claimIngressDelivery({ authorization, deliveryId, payloadHash });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Не удалось зарегистрировать пакет" }, 409);
  }
  if (claim.state === "duplicate") {
    return response({ ok: true, duplicate: true, deliveryId, runId: claim.runId });
  }
  if (claim.state === "busy") {
    const busy = response({ ok: false, code: "DELIVERY_IN_PROGRESS", error: "Этот пакет уже обрабатывается" }, 409);
    busy.headers.set("Retry-After", "15");
    return busy;
  }
  if (claim.state === "conflict") {
    return response({ ok: false, code: "DELIVERY_ID_CONFLICT", error: "deliveryId уже использован для другого содержимого" }, 409);
  }

  const cursor = parseCursor(message.cursor);
  const adapter = local ? new LocalConnectorAdapter() : new UniversalApiAdapter();
  let service: Awaited<ReturnType<typeof serviceIntegrationBusinessWriter>> | null = null;
  try {
    const normalized = await adapter.normalize({ json: records, entityType }, {
      venueId: authorization.tenant.venueId,
      externalSystem: authorization.connection.display_name,
      sourceType: local ? "local_connector" : authorization.connection.source_type,
      now: new Date().toISOString(),
    });
    service = await serviceIntegrationBusinessWriter({
      account: authorization.account,
      venueId: authorization.tenant.venueId,
      requestUrl: request.url,
    });
    const run = await runIntegrationSync({
      account: service.account,
      connectionId: authorization.connection.id,
      trigger: local ? "local_agent" : authorization.connection.channel === "webhook" ? "webhook" : "polling",
      dataType: entityType,
      sourceName: local ? `Local Connector · ${deliveryId}` : `Universal API · ${deliveryId}`,
      records: normalized.records,
      writer: service.writer,
    });
    const success = run.status === "success" || run.status === "partial";
    await finishIngressDelivery({
      authorization,
      deliveryId,
      status: success ? "success" : "failed",
      runId: run.runId,
      cursor,
      error: success ? undefined : run.errors[0]?.message || "Пакет не проведён",
      lease: claim.lease,
    });
    return response({ ok: true, duplicate: false, deliveryId, run, warnings: normalized.warnings }, 202);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Пакет не обработан";
    await finishIngressDelivery({ authorization, deliveryId, status: "failed", cursor, error: messageText, lease: claim.lease });
    return response({ ok: false, code: "INGEST_FAILED", error: messageText }, 422);
  } finally {
    await service?.close();
  }
}

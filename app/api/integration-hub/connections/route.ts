import { getD1 } from "../../../../db";
import { hasPermission } from "../../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { integrationAdapterDescriptors } from "../../../../lib/bardoctor/integrations/adapter-registry";
import {
  type IntegrationChannel,
  type IntegrationEntityType,
} from "../../../../lib/bardoctor/integrations/contracts";
import {
  issueIngressToken,
  revokeIngressTokens,
} from "../../../../lib/bardoctor/integrations/ingress-auth";
import {
  connectionForTenant,
  ensureConfiguredConnection,
  setConnectionState,
  updateConnectionConfiguration,
} from "../../../../lib/bardoctor/integrations/repository";
import {
  LocalConnectorAdapter,
  UniversalApiAdapter,
} from "../../../../lib/bardoctor/integrations/universal-api-adapter";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = "", max = 180): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function entities(value: unknown, allowed: readonly IntegrationEntityType[]): IntegrationEntityType[] {
  const allowedSet = new Set(allowed);
  const requested = Array.isArray(value)
    ? value.filter((item): item is IntegrationEntityType =>
      typeof item === "string" && allowedSet.has(item as IntegrationEntityType))
    : [];
  return [...new Set(requested.length ? requested : allowed)];
}

async function body(request: Request): Promise<JsonRecord> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 50_000) throw new Error("REQUEST_TOO_LARGE");
  return record(JSON.parse(raw));
}

function response(value: unknown, status = 200): Response {
  const result = Response.json(value, { status });
  result.headers.set("Cache-Control", "no-store");
  return result;
}

function adapterFor(key: string) {
  if (key === "universal-api-v1") return new UniversalApiAdapter();
  if (key === "local-connector-v1") return new LocalConnectorAdapter();
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) {
    return response({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" }, 403);
  }
  let value: JsonRecord;
  try { value = await body(request); } catch {
    return response({ ok: false, error: "Некорректные настройки подключения" }, 400);
  }
  const adapterKey = text(value.adapterKey);
  const descriptor = integrationAdapterDescriptors().find((item) => item.key === adapterKey);
  const adapter = adapterFor(adapterKey);
  if (!descriptor || descriptor.availability !== "ready" || !adapter) {
    return response({
      ok: false,
      code: "ADAPTER_NOT_IMPLEMENTED",
      error: "Для этой системы ещё нет рабочего адаптера. Используйте Universal API, Local Connector или файл.",
    }, 422);
  }
  const capabilities = entities(value.enabledEntities, descriptor.capabilities);
  const provider = text(value.provider, adapterKey === "local-connector-v1" ? "1С" : "Universal API");
  const channel: IntegrationChannel = adapterKey === "local-connector-v1"
    ? "local_agent"
    : value.syncMode === "webhook" ? "webhook" : "rest";
  try {
    const health = await adapter.healthCheck();
    if (!health.ok) throw new Error(health.message || "ADAPTER_HEALTH_CHECK_FAILED");
    const created = await ensureConfiguredConnection({
      tenant: account,
      provider,
      adapterKey,
      channel,
      displayName: text(value.displayName, provider, 140),
      sourceKey: text(value.sourceKey) || undefined,
      capabilities,
      config: {
        ...record(value.config),
        enabledEntities: capabilities,
        syncMode: adapterKey === "local-connector-v1" ? "local_agent" : value.syncMode,
        updatePolicy: adapterKey === "local-connector-v1" ? "safe_upsert" : record(value.config).updatePolicy,
        autoCreateProducts: adapterKey === "local-connector-v1",
        initialSyncDays: adapterKey === "local-connector-v1"
          ? Number(record(value.config).initialSyncDays || 365)
          : undefined,
      },
      status: adapterKey === "local-connector-v1" ? "requires_setup" : "connected",
      syncEnabled: true,
    });
    if (adapterKey === "local-connector-v1") {
      // A Local Connector has one active bootstrap key. Re-running creation
      // for the same source is therefore a safe rotation, never a second key.
      await revokeIngressTokens({ tenant: account, connectionId: created.connection.id });
    }
    const issued = await issueIngressToken({
      tenant: account,
      connectionId: created.connection.id,
      label: text(value.tokenLabel, "Основной ключ", 140),
      scopes: capabilities,
      kind: adapterKey === "local-connector-v1" ? "local" : "live",
    });
    return response({
      ok: true,
      connection: created.connection,
      token: issued.token,
      tokenMetadata: issued.metadata,
      warning: "Скопируйте ключ сейчас: после закрытия он больше не показывается.",
    }, created.created ? 201 : 200);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Подключение не создано" }, 422);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) {
    return response({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" }, 403);
  }
  let value: JsonRecord;
  try { value = await body(request); } catch {
    return response({ ok: false, error: "Некорректный запрос" }, 400);
  }
  const connectionId = text(value.connectionId);
  const connection = connectionId ? await connectionForTenant(account, connectionId) : null;
  if (!connection) return response({ ok: false, error: "Подключение не найдено" }, 404);
  const descriptor = integrationAdapterDescriptors().find((item) => item.key === connection.adapter_key);
  if (!descriptor || descriptor.availability !== "ready") {
    return response({ ok: false, code: "ADAPTER_NOT_IMPLEMENTED", error: "Адаптер ещё не реализован" }, 422);
  }
  const action = text(value.action, "update", 30);
  if (action === "pause" || action === "resume") {
    await setConnectionState({
      tenant: account,
      connectionId,
      status: action === "pause" ? "paused" : "connected",
      syncEnabled: action === "resume",
    });
    return response({ ok: true, status: action === "pause" ? "paused" : "connected" });
  }
  if (action === "rotate_token") {
    await revokeIngressTokens({ tenant: account, connectionId });
    const capabilities = entities(JSON.parse(connection.capabilities_json), descriptor.capabilities);
    const issued = await issueIngressToken({
      tenant: account,
      connectionId,
      label: text(value.tokenLabel, "Обновлённый ключ", 140),
      scopes: capabilities,
      kind: connection.adapter_key === "local-connector-v1" ? "local" : "live",
    });
    await setConnectionState({
      tenant: account,
      connectionId,
      status: connection.adapter_key === "local-connector-v1" ? "requires_setup" : "connected",
      syncEnabled: true,
    });
    return response({ ok: true, token: issued.token, tokenMetadata: issued.metadata });
  }
  if (action === "revoke_token") {
    const revoked = await revokeIngressTokens({ tenant: account, connectionId });
    await setConnectionState({
      tenant: account,
      connectionId,
      status: "requires_setup",
      syncEnabled: false,
    });
    return response({ ok: true, revoked });
  }
  if (action === "issue_token") {
    await revokeIngressTokens({ tenant: account, connectionId });
    const capabilities = entities(JSON.parse(connection.capabilities_json), descriptor.capabilities);
    const issued = await issueIngressToken({
      tenant: account,
      connectionId,
      label: text(value.tokenLabel, "Новый ключ", 140),
      scopes: capabilities,
      kind: connection.adapter_key === "local-connector-v1" ? "local" : "live",
    });
    await setConnectionState({
      tenant: account,
      connectionId,
      status: connection.adapter_key === "local-connector-v1" ? "requires_setup" : "connected",
      syncEnabled: true,
    });
    return response({ ok: true, token: issued.token, tokenMetadata: issued.metadata });
  }
  const capabilities = entities(value.enabledEntities, descriptor.capabilities);
  const updated = await updateConnectionConfiguration({
    tenant: account,
    connectionId,
    displayName: text(value.displayName, connection.display_name, 140),
    capabilities,
    config: {
      ...record(value.config),
      enabledEntities: capabilities,
      updatePolicy: connection.adapter_key === "local-connector-v1" ? "safe_upsert" : record(value.config).updatePolicy,
      autoCreateProducts: connection.adapter_key === "local-connector-v1",
    },
    status: connection.status === "paused"
      ? "paused"
      : connection.adapter_key === "local-connector-v1" && connection.status === "requires_setup"
        ? "requires_setup"
        : "connected",
    syncEnabled: connection.status !== "paused",
  });
  return response({ ok: true, connection: updated });
}

export async function DELETE(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return response(await unauthorized().json(), 401);
  if (!hasPermission(account, "integrations.manage")) {
    return response({ ok: false, code: "ACCESS_DENIED", error: "Недостаточно прав" }, 403);
  }
  const url = new URL(request.url);
  const connectionId = text(url.searchParams.get("connectionId"));
  const connection = connectionId ? await connectionForTenant(account, connectionId) : null;
  if (!connection) return response({ ok: false, error: "Подключение не найдено" }, 404);
  await getD1().prepare(`
    DELETE FROM integration_connections
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(connectionId, account.venueId, account.id).run();
  return response({ ok: true });
}

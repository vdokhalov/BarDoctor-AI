import {
  authorizeIngressRequest,
} from "../../../../../lib/bardoctor/integrations/ingress-auth";
import {
  normalizeLocalConnectorHeartbeat,
  saveLocalConnectorHeartbeat,
} from "../../../../../lib/bardoctor/integrations/local-connector";
import { setConnectionState } from "../../../../../lib/bardoctor/integrations/repository";

const MAX_BODY_BYTES = 50_000;

function response(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const authorization = await authorizeIngressRequest(request);
  if (!authorization) {
    return response({ ok: false, code: "INVALID_INTEGRATION_TOKEN", error: "Ключ подключения недействителен или отозван" }, 401);
  }
  if (authorization.connection.adapter_key !== "local-connector-v1") {
    return response({ ok: false, code: "ADAPTER_MISMATCH", error: "Этот ключ не относится к Local Connector" }, 403);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return response({ ok: false, code: "REQUEST_TOO_LARGE", error: "Диагностический пакет слишком большой" }, 413);
  }
  let value: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    value = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return response({ ok: false, code: "CONTRACT_INVALID", error: "Некорректные данные Local Connector" }, 400);
  }
  if (value.connectionId !== authorization.connection.id) {
    return response({ ok: false, code: "CONNECTION_MISMATCH", error: "Ключ относится к другому подключению" }, 403);
  }
  try {
    const heartbeat = normalizeLocalConnectorHeartbeat(value);
    const agent = await saveLocalConnectorHeartbeat({
      tenant: authorization.tenant,
      connectionId: authorization.connection.id,
      heartbeat,
    });
    await setConnectionState({
      tenant: authorization.tenant,
      connectionId: authorization.connection.id,
      status: heartbeat.status === "error" ? "error" : "connected",
      syncEnabled: true,
      error: heartbeat.lastError,
    });
    let venueName = "Заведение";
    try {
      const restaurant = authorization.account.restaurantJson
        ? JSON.parse(authorization.account.restaurantJson) as { name?: unknown }
        : null;
      if (typeof restaurant?.name === "string" && restaurant.name.trim()) venueName = restaurant.name.trim().slice(0, 160);
    } catch { venueName = "Заведение"; }
    return response({
      ok: true,
      serverTime: new Date().toISOString(),
      venue: { id: authorization.tenant.venueId, name: venueName },
      source: {
        id: authorization.connection.id,
        name: authorization.connection.display_name,
      },
      agent: {
        status: agent.status,
        lastSeenAt: agent.last_seen_at,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "HEARTBEAT_INVALID";
    const messages: Record<string, string> = {
      MACHINE_ID_INVALID: "Local Connector не смог определить этот компьютер",
      MACHINE_NAME_REQUIRED: "Local Connector не передал имя компьютера",
      AGENT_VERSION_INVALID: "Не удалось определить версию Local Connector",
      ADAPTER_NOT_SUPPORTED: "Эта версия адаптера 1С не поддерживается",
      READ_ONLY_REQUIRED: "BarDoctor принимает от Local Connector только режим чтения",
    };
    return response({ ok: false, code, error: messages[code] || "Не удалось сохранить состояние Local Connector" }, 422);
  }
}

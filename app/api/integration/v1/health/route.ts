import { INTEGRATION_ENTITY_TYPES } from "../../../../../lib/bardoctor/integrations/contracts";
import { authorizeIngressRequest } from "../../../../../lib/bardoctor/integrations/ingress-auth";

export async function GET(request: Request): Promise<Response> {
  const authorization = await authorizeIngressRequest(request);
  if (!authorization) {
    return Response.json({ ok: false, code: "INVALID_INTEGRATION_TOKEN" }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let venueName = "Заведение";
  try {
    const restaurant = authorization.account.restaurantJson
      ? JSON.parse(authorization.account.restaurantJson) as { name?: unknown }
      : null;
    if (typeof restaurant?.name === "string" && restaurant.name.trim()) venueName = restaurant.name.trim().slice(0, 160);
  } catch { venueName = "Заведение"; }
  let cursor: unknown = null;
  try { cursor = authorization.connection.cursor_json ? JSON.parse(authorization.connection.cursor_json) : null; } catch { cursor = null; }
  return Response.json({
    ok: true,
    protocolVersion: "1.0",
    connectionId: authorization.connection.id,
    adapterKey: authorization.connection.adapter_key,
    status: authorization.connection.status,
    venue: { id: authorization.tenant.venueId, name: venueName },
    source: { id: authorization.connection.id, name: authorization.connection.display_name },
    readOnlyRequired: authorization.connection.adapter_key === "local-connector-v1",
    cursor,
    serverTime: new Date().toISOString(),
    connector: {
      latestVersion: "1.1.0",
      downloadUrl: "/downloads/BarDoctor-Local-Connector-Windows-v1.1.0.zip",
    },
    capabilities: INTEGRATION_ENTITY_TYPES.map((entityType) => ({
      entityType,
      supported: authorization.scopes.includes(entityType),
    })),
    limits: { maxRecordsPerDelivery: 2_000, maxBodyBytes: 2 * 1024 * 1024 },
  }, { headers: { "Cache-Control": "no-store" } });
}

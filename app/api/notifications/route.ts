import { authenticateIdentityRequest, unauthorized } from "../../../lib/bardoctor/auth";
import {
  getNotificationPreferences,
  notificationHistoryForAccount,
  oneSignalAccountConfig,
  oneSignalConfig,
  oneSignalExternalId,
  saveNotificationPreferences,
  type NotificationPreferencesInput,
} from "../../../lib/bardoctor/notifications";
import {
  NOTIFICATION_CATEGORY_CATALOG,
  NOTIFICATION_QUIET_POLICY,
} from "../../../lib/bardoctor/notification-catalog";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

async function requestBody(request: Request): Promise<NotificationPreferencesInput> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 12_000) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("INVALID_PAYLOAD");
  }
  return parsed as NotificationPreferencesInput;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return noStore(unauthorized());

  const config = oneSignalConfig();
  const [preferences, history, accountConfig] = await Promise.all([
    getNotificationPreferences(account.id),
    notificationHistoryForAccount(account.id),
    oneSignalAccountConfig(account.id),
  ]);

  return noStore(Response.json({
    ok: true,
    appId: config.appId,
    clientConfigured: config.clientConfigured,
    serverConfigured: accountConfig.serverConfigured,
    externalId: oneSignalExternalId(account.id),
    scopes: {
      device: "device",
      preferences: "account",
      history: "account",
    },
    categories: NOTIFICATION_CATEGORY_CATALOG,
    quietPolicy: NOTIFICATION_QUIET_POLICY,
    preferences,
    history,
  }));
}

export async function PUT(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return noStore(unauthorized());

  try {
    const preferences = await saveNotificationPreferences(account.id, await requestBody(request));
    return noStore(Response.json({
      ok: true,
      preferences,
      message: "Настройки уведомлений сохранены.",
    }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return noStore(Response.json(
      { ok: false, error: code === "PAYLOAD_TOO_LARGE" ? "Слишком большой запрос." : "Некорректные настройки." },
      { status: code === "PAYLOAD_TOO_LARGE" ? 413 : 400 },
    ));
  }
}

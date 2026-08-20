import { authenticateIdentityRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import {
  getNotificationPreferences,
  markNotificationTest,
  NotificationError,
  sendPushToAccount,
} from "../../../../lib/bardoctor/notifications";

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return noStore(unauthorized());

  try {
    const preferences = await getNotificationPreferences(account.id);
    if (!preferences.enabled) {
      throw new NotificationError(
        "Сначала включите уведомления на этом устройстве.",
        409,
        "NOTIFICATIONS_DISABLED",
      );
    }

    const sentAt = new Date().toISOString();
    const result = await sendPushToAccount(account.id, new URL(request.url).origin, {
      category: "test",
      dedupeKey: `test:${sentAt}`,
      title: "BarDoctor на связи",
      message: "Push-уведомления работают. Теперь важные события не потеряются.",
      targetUrl: "/notifications",
    });
    await markNotificationTest(account.id);

    return noStore(Response.json({
      ok: true,
      message: "Тестовое уведомление отправлено.",
      messageId: result.messageId,
      sentAt,
    }));
  } catch (error) {
    if (error instanceof NotificationError) {
      return noStore(Response.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status },
      ));
    }
    return noStore(Response.json(
      { ok: false, error: "Не удалось отправить тестовое уведомление." },
      { status: 500 },
    ));
  }
}

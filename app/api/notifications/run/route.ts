import {
  notificationTriggersAreDue,
  runNotificationTriggers,
} from "../../../../lib/bardoctor/notification-triggers";
import { oneSignalConfig } from "../../../../lib/bardoctor/notifications";
import { runtimeEnv } from "../../../../lib/bardoctor/runtime-env";

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function authorized(request: Request): boolean {
  const secret = runtimeEnv("NOTIFICATION_CRON_SECRET");
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(secret && header && safeEqual(secret, header));
}

function responseHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

async function run(request: Request, includeSummary: boolean): Promise<Response> {
  if (!oneSignalConfig().clientConfigured) {
    return Response.json(
      { ok: false, error: "OneSignal ещё не подключён" },
      { status: 503, headers: responseHeaders() },
    );
  }

  const origin = runtimeEnv("BARDOCTOR_PUBLIC_ORIGIN") || new URL(request.url).origin;
  const summary = await runNotificationTriggers(origin);
  const ok = summary.failed === 0;
  return Response.json({
    ok,
    ran: true,
    ...(includeSummary ? { summary } : {}),
    checkedAt: new Date().toISOString(),
  }, {
    status: ok ? 200 : 502,
    headers: responseHeaders(),
  });
}

export function GET(): Response {
  return Response.json(
    { ok: false, code: "METHOD_NOT_ALLOWED", error: "Используйте авторизованный POST" },
    { status: 405, headers: { ...responseHeaders(), Allow: "POST" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json(
      { ok: false, error: "Недоступно" },
      { status: 401, headers: responseHeaders() },
    );
  }
  // Replays inside the durable account run interval become a no-op. Delivery
  // rows also enforce account + dedupe-key uniqueness for concurrent overlap.
  if (!(await notificationTriggersAreDue())) {
    return Response.json(
      { ok: true, ran: false, reason: "not_due" },
      { headers: responseHeaders() },
    );
  }
  return run(request, true);
}

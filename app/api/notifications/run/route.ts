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
  const query = new URL(request.url).searchParams.get("token") ?? "";
  const supplied = header || query;
  return Boolean(secret && supplied && safeEqual(secret, supplied));
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

export async function GET(request: Request): Promise<Response> {
  if (authorized(request)) return run(request, true);

  // This public, read-like tick cannot choose recipients or message content.
  // D1 state limits it to one effective evaluation per account per hour.
  if (!(await notificationTriggersAreDue())) {
    return Response.json(
      { ok: true, ran: false, reason: "not_due" },
      { headers: responseHeaders() },
    );
  }
  return run(request, false);
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return Response.json(
      { ok: false, error: "Недоступно" },
      { status: 401, headers: responseHeaders() },
    );
  }
  return run(request, true);
}

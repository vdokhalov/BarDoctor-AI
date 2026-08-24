import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  notificationDeliveries,
  notificationDevices,
  notificationJobs,
  notificationPreferences,
  type NotificationPreference,
} from "../../db/schema";
import { getIntegrationValue } from "./integration-secrets";
import type {
  NotificationDeviceTelemetryInput,
  NotificationPreferencesInput,
  PushMessage,
} from "./notification-types";
import { runtimeEnv } from "./runtime-env";
import { notificationProviderIdempotencyKey } from "./notification-idempotency";

export type {
  NotificationCategory,
  NotificationPreferencesInput,
  PushMessage,
} from "./notification-types";

const DEFAULT_PREFERENCES = {
  enabled: false,
  shiftAlerts: true,
  taskAlerts: true,
  equipmentAlerts: true,
  incidentAlerts: true,
  calendarAlerts: true,
  financeAlerts: true,
  quietStart: "23:00",
  quietEnd: "08:00",
  timezone: "Europe/Chisinau",
} as const;

export class NotificationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "NOTIFICATION_ERROR",
  ) {
    super(message);
  }
}

export function oneSignalExternalId(accountId: number): string {
  return `bardoctor-account-${accountId}`;
}

export function oneSignalConfig() {
  const appId = runtimeEnv("ONESIGNAL_APP_ID");
  const restApiKey = runtimeEnv("ONESIGNAL_REST_API_KEY");
  return {
    appId,
    restApiKey,
    clientConfigured: Boolean(appId),
    serverConfigured: Boolean(appId && restApiKey),
  };
}

export async function oneSignalAccountConfig(accountId: number) {
  const appId = runtimeEnv("ONESIGNAL_APP_ID");
  const restApiKey = await getIntegrationValue(accountId, "ONESIGNAL_REST_API_KEY");
  return {
    appId,
    restApiKey,
    clientConfigured: Boolean(appId),
    serverConfigured: Boolean(appId && restApiKey),
  };
}

function validTime(value: unknown, fallback: string): string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : fallback;
}

function validTimezone(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim().slice(0, 80) : "";
  if (!candidate) return DEFAULT_PREFERENCES.timezone;
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_PREFERENCES.timezone;
  }
}

export function preferencePayload(row: NotificationPreference | null) {
  return {
    enabled: row?.enabled ?? DEFAULT_PREFERENCES.enabled,
    shiftAlerts: row?.shiftAlerts ?? DEFAULT_PREFERENCES.shiftAlerts,
    taskAlerts: row?.taskAlerts ?? DEFAULT_PREFERENCES.taskAlerts,
    equipmentAlerts: row?.equipmentAlerts ?? DEFAULT_PREFERENCES.equipmentAlerts,
    incidentAlerts: row?.incidentAlerts ?? DEFAULT_PREFERENCES.incidentAlerts,
    calendarAlerts: row?.calendarAlerts ?? DEFAULT_PREFERENCES.calendarAlerts,
    financeAlerts: row?.financeAlerts ?? DEFAULT_PREFERENCES.financeAlerts,
    quietStart: row?.quietStart ?? DEFAULT_PREFERENCES.quietStart,
    quietEnd: row?.quietEnd ?? DEFAULT_PREFERENCES.quietEnd,
    timezone: row?.timezone ?? DEFAULT_PREFERENCES.timezone,
    lastTestAt: row?.lastTestAt ?? null,
    lastRunAt: row?.lastRunAt ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function getNotificationPreferences(accountId: number) {
  const [row] = await getDb()
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.accountId, accountId))
    .limit(1);
  return preferencePayload(row ?? null);
}

export async function saveNotificationPreferences(
  accountId: number,
  input: NotificationPreferencesInput,
) {
  const current = await getNotificationPreferences(accountId);
  const updatedAt = new Date().toISOString();
  const next = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    shiftAlerts: typeof input.shiftAlerts === "boolean" ? input.shiftAlerts : current.shiftAlerts,
    taskAlerts: typeof input.taskAlerts === "boolean" ? input.taskAlerts : current.taskAlerts,
    equipmentAlerts: typeof input.equipmentAlerts === "boolean" ? input.equipmentAlerts : current.equipmentAlerts,
    incidentAlerts: typeof input.incidentAlerts === "boolean" ? input.incidentAlerts : current.incidentAlerts,
    calendarAlerts: typeof input.calendarAlerts === "boolean" ? input.calendarAlerts : current.calendarAlerts,
    financeAlerts: typeof input.financeAlerts === "boolean" ? input.financeAlerts : current.financeAlerts,
    quietStart: validTime(input.quietStart, current.quietStart),
    quietEnd: validTime(input.quietEnd, current.quietEnd),
    timezone: validTimezone(input.timezone ?? current.timezone),
    updatedAt,
  };

  await getDb()
    .insert(notificationPreferences)
    .values({ accountId, ...next })
    .onConflictDoUpdate({
      target: notificationPreferences.accountId,
      set: next,
    });

  return getNotificationPreferences(accountId);
}

export async function saveNotificationDeviceTelemetry(
  accountId: number,
  input: NotificationDeviceTelemetryInput | undefined,
) {
  if (!input) return null;
  const deviceKey = typeof input.deviceKey === "string" && /^[a-zA-Z0-9:_-]{8,160}$/.test(input.deviceKey)
    ? input.deviceKey
    : null;
  if (!deviceKey) throw new NotificationError("Некорректный идентификатор устройства.", 400, "INVALID_DEVICE_KEY");
  const permission = ["default", "granted", "denied"].includes(String(input.permission))
    ? String(input.permission)
    : "default";
  const subscriptionId = typeof input.subscriptionId === "string"
    ? input.subscriptionId.trim().slice(0, 240) || null
    : null;
  const now = new Date().toISOString();
  const next = {
    subscriptionId,
    permission,
    optedIn: input.optedIn === true,
    active: input.active === true && input.optedIn === true && permission === "granted" && Boolean(subscriptionId),
    lastSeenAt: now,
    updatedAt: now,
  };
  await getDb().insert(notificationDevices).values({ accountId, deviceKey, ...next })
    .onConflictDoUpdate({
      target: [notificationDevices.accountId, notificationDevices.deviceKey],
      set: next,
    });
  return { deviceKey, ...next };
}

export async function markNotificationTest(accountId: number) {
  const current = await getNotificationPreferences(accountId);
  const lastTestAt = new Date().toISOString();
  const updatedAt = lastTestAt;
  await getDb()
    .insert(notificationPreferences)
    .values({ accountId, ...current, lastTestAt, updatedAt })
    .onConflictDoUpdate({
      target: notificationPreferences.accountId,
      set: { lastTestAt, updatedAt },
    });
}

export async function recentNotificationDeliveries(accountId: number, limit = 8) {
  const rows = await getDb()
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.accountId, accountId))
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(Math.max(1, Math.min(20, limit)));
  return rows.map((row) => userNotificationHistoryEntry({
    category: row.category,
    title: row.title,
    message: row.message,
    targetUrl: row.targetUrl,
    status: row.status,
    eventAt: row.createdAt,
    scheduledFor: null,
    durable: false,
  }));
}

type UserHistoryInput = {
  category: string;
  title: string;
  message: string;
  targetUrl: string;
  status: string;
  eventAt: string;
  scheduledFor: string | null;
  durable: boolean;
};

function userHistoryStatus(status: string, durable: boolean) {
  if (status === "accepted") return {
    status: "accepted",
    label: "Передано сервису",
    description: "Сервис принял уведомление. Доставка на устройство отдельно не подтверждена.",
    tone: "info",
  } as const;
  if (status === "scheduled") return {
    status: "scheduled",
    label: "Запланировано",
    description: "Сервис принял время отправки. Доставка на устройство пока не подтверждена.",
    tone: "info",
  } as const;
  if (status === "queued") return {
    status: "queued",
    label: "Ожидает отправки",
    description: "BarDoctor передаст уведомление сервису ближе к целевому времени.",
    tone: "waiting",
  } as const;
  if (status === "dispatching") return {
    status: "dispatching",
    label: "Отправляется",
    description: "BarDoctor сейчас передаёт уведомление сервису доставки.",
    tone: "waiting",
  } as const;
  if (status === "cancelled") return {
    status: "cancelled",
    label: "Отменено",
    description: "Исходное событие изменилось, поэтому уведомление больше не требуется.",
    tone: "muted",
  } as const;
  if (status === "no_subscription") return {
    status: "not_delivered",
    label: "Не доставлено",
    description: "На момент отправки у аккаунта не было связанного устройства.",
    tone: "error",
  } as const;
  if (status === "expired") return {
    status: "not_delivered",
    label: "Не отправлено",
    description: "Целевое время прошло до передачи уведомления.",
    tone: "error",
  } as const;
  if (status === "failed") return {
    status: "not_delivered",
    label: "Не доставлено",
    description: durable
      ? "Передача временно не удалась. Очередь BarDoctor повторит попытку автоматически."
      : "Сервис не принял уведомление. Повторите проверку устройства позже.",
    tone: "error",
  } as const;
  return {
    status: "unknown",
    label: "Состояние неизвестно",
    description: "Подтверждённого состояния доставки пока нет.",
    tone: "muted",
  } as const;
}

function userSafeTargetUrl(value: string): string | null {
  try {
    const parsed = new URL(value || "/home", "https://bardoctor.local");
    if (parsed.origin !== "https://bardoctor.local") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function userNotificationHistoryEntry(input: UserHistoryInput) {
  return {
    category: input.category,
    title: input.title,
    message: input.message,
    targetUrl: userSafeTargetUrl(input.targetUrl),
    ...userHistoryStatus(input.status, input.durable),
    eventAt: input.eventAt,
    scheduledFor: input.scheduledFor,
  };
}

/**
 * Account-level user history. Provider IDs, raw responses, retry leases and
 * internal job IDs deliberately stay out of this projection. The same data
 * remains available to the protected Internal Admin diagnostics.
 */
export async function notificationHistoryForAccount(accountId: number, limit = 40) {
  const boundedLimit = Math.max(1, Math.min(80, limit));
  const [deliveries, jobs] = await Promise.all([
    getDb()
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.accountId, accountId))
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(boundedLimit),
    getDb()
      .select()
      .from(notificationJobs)
      .where(eq(notificationJobs.accountId, accountId))
      .orderBy(desc(notificationJobs.updatedAt))
      .limit(boundedLimit),
  ]);

  const byDedupe = new Map<string, ReturnType<typeof userNotificationHistoryEntry>>();
  const activityAt = new Map<string, string>();

  for (const delivery of deliveries) {
    const job = jobs.find((candidate) => candidate.dedupeKey === delivery.dedupeKey);
    const entry = userNotificationHistoryEntry({
      category: delivery.category,
      title: delivery.title,
      message: delivery.message,
      targetUrl: delivery.targetUrl,
      status: delivery.status,
      eventAt: delivery.createdAt,
      scheduledFor: job?.targetAt ?? null,
      durable: Boolean(job),
    });
    byDedupe.set(delivery.dedupeKey, entry);
    activityAt.set(delivery.dedupeKey, delivery.createdAt);
  }

  for (const job of jobs) {
    const currentAt = activityAt.get(job.dedupeKey) ?? "";
    const shouldUseJob = !byDedupe.has(job.dedupeKey)
      || job.updatedAt > currentAt
      || !["accepted", "scheduled"].includes(job.status);
    if (!shouldUseJob) continue;
    byDedupe.set(job.dedupeKey, userNotificationHistoryEntry({
      category: job.category,
      title: job.title,
      message: job.message,
      targetUrl: job.targetUrl,
      status: job.status,
      eventAt: job.updatedAt,
      scheduledFor: job.targetAt,
      durable: true,
    }));
    activityAt.set(job.dedupeKey, job.updatedAt);
  }

  return [...byDedupe.entries()]
    .sort((left, right) => (activityAt.get(right[0]) ?? "").localeCompare(activityAt.get(left[0]) ?? ""))
    .slice(0, boundedLimit)
    .map(([, entry]) => entry);
}

async function providerError(response: Response): Promise<string> {
  const raw = (await response.text()).slice(0, 1_200);
  if (!raw) return `OneSignal вернул HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(raw) as { errors?: unknown; error?: unknown };
    const detail = parsed.errors ?? parsed.error;
    return typeof detail === "string" ? detail : JSON.stringify(detail ?? parsed);
  } catch {
    return raw;
  }
}

function collapseId(push: PushMessage): string {
  let hash = 2_166_136_261;
  for (const character of push.dedupeKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `bardoctor-${push.category}-${(hash >>> 0).toString(36)}`;
}

export async function sendPushToAccount(
  accountId: number,
  origin: string,
  push: PushMessage,
) {
  const [previous] = await getDb()
    .select({ status: notificationDeliveries.status, providerMessageId: notificationDeliveries.providerMessageId })
    .from(notificationDeliveries)
    .where(and(
      eq(notificationDeliveries.accountId, accountId),
      eq(notificationDeliveries.dedupeKey, push.dedupeKey),
    ))
    .limit(1);
  if (previous?.status === "accepted" || previous?.status === "scheduled") {
    return {
      messageId: previous.providerMessageId ?? "already-sent",
      duplicate: true,
      scheduled: previous.status === "scheduled",
      sendAfter: push.sendAfter ?? null,
    };
  }

  const config = await oneSignalAccountConfig(accountId);
  if (!config.appId || !config.restApiKey) {
    throw new NotificationError(
      "OneSignal ещё не подключён к BarDoctor.",
      503,
      "ONESIGNAL_NOT_CONFIGURED",
    );
  }

  const targetUrl = new URL(push.targetUrl || "/home", origin).toString();
  const providerIdempotencyKey = await notificationProviderIdempotencyKey(accountId, push.dedupeKey);
  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Authorization": `Key ${config.restApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: config.appId,
      target_channel: "push",
      include_aliases: {
        external_id: [oneSignalExternalId(accountId)],
      },
      headings: { en: push.title, ru: push.title },
      contents: { en: push.message, ru: push.message },
      url: targetUrl,
      chrome_web_icon: new URL("/icons/bardoctor-v159-192.png", origin).toString(),
      collapse_id: collapseId(push),
      name: `BarDoctor · ${push.category} · ${push.dedupeKey}`.slice(0, 128),
      idempotency_key: providerIdempotencyKey,
      ...(push.sendAfter ? { send_after: push.sendAfter } : {}),
      data: {
        category: push.category,
        dedupeKey: push.dedupeKey,
        targetUrl: push.targetUrl || "/home",
      },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const detail = await providerError(response);
    await getDb()
      .insert(notificationDeliveries)
      .values({
        accountId,
        category: push.category,
        dedupeKey: push.dedupeKey,
        title: push.title,
        message: push.message,
        targetUrl: push.targetUrl || "/home",
        status: "failed",
        detail,
      })
      .onConflictDoUpdate({
        target: [notificationDeliveries.accountId, notificationDeliveries.dedupeKey],
        set: { status: "failed", detail, createdAt: new Date().toISOString() },
      });
    throw new NotificationError(
      push.sendAfter
        ? "OneSignal временно не принял ближайшее напоминание. BarDoctor повторит попытку автоматически."
        : "OneSignal не принял уведомление. Проверьте ключи и подписку устройства.",
      502,
      "ONESIGNAL_SEND_FAILED",
    );
  }

  const result = (await response.json()) as { id?: string; errors?: unknown };
  if (!result.id) {
    const detail = "У аккаунта пока нет активной push-подписки устройства.";
    await getDb()
      .insert(notificationDeliveries)
      .values({
        accountId,
        category: push.category,
        dedupeKey: push.dedupeKey,
        title: push.title,
        message: push.message,
        targetUrl: push.targetUrl || "/home",
        status: "no_subscription",
        detail,
      })
      .onConflictDoUpdate({
        target: [notificationDeliveries.accountId, notificationDeliveries.dedupeKey],
        set: { status: "no_subscription", detail, createdAt: new Date().toISOString() },
      });
    throw new NotificationError(detail, 409, "NO_PUSH_SUBSCRIPTION");
  }

  const deliveryStatus = push.sendAfter ? "scheduled" : "accepted";
  const deliveryDetail = push.sendAfter ? `Запланировано на ${push.sendAfter}` : null;
  await getDb()
    .insert(notificationDeliveries)
    .values({
      accountId,
      category: push.category,
      dedupeKey: push.dedupeKey,
      title: push.title,
      message: push.message,
      targetUrl: push.targetUrl || "/home",
      status: deliveryStatus,
      providerMessageId: result.id,
      detail: deliveryDetail,
    })
    .onConflictDoUpdate({
      target: [notificationDeliveries.accountId, notificationDeliveries.dedupeKey],
      set: {
        status: deliveryStatus,
        providerMessageId: result.id,
        detail: deliveryDetail,
        createdAt: new Date().toISOString(),
      },
    });

  return {
    messageId: result.id,
    duplicate: false,
    scheduled: Boolean(push.sendAfter),
    sendAfter: push.sendAfter ?? null,
  };
}

export async function cancelScheduledPush(
  accountId: number,
  providerMessageId: string,
  dedupeKey: string,
): Promise<boolean> {
  const config = await oneSignalAccountConfig(accountId);
  if (!config.appId || !config.restApiKey || !providerMessageId) return false;

  let response: Response;
  try {
    response = await fetch(
      `https://api.onesignal.com/notifications/${encodeURIComponent(providerMessageId)}?app_id=${encodeURIComponent(config.appId)}`,
      {
        method: "DELETE",
        headers: { "Authorization": `Key ${config.restApiKey}` },
        signal: AbortSignal.timeout(12_000),
      },
    );
  } catch {
    return false;
  }

  const cancelled = response.ok;
  const status = cancelled ? "cancelled" : response.status === 400 || response.status === 404
    ? "expired"
    : "scheduled";
  const detail = cancelled
    ? "Отменено после изменения календаря возможностей."
    : status === "expired"
      ? "Сообщение уже отправлено или больше недоступно для отмены."
      : `Не удалось отменить запланированное сообщение: HTTP ${response.status}`;

  await getDb()
    .update(notificationDeliveries)
    .set({ status, detail, createdAt: new Date().toISOString() })
    .where(and(
      eq(notificationDeliveries.accountId, accountId),
      eq(notificationDeliveries.dedupeKey, dedupeKey),
    ));
  return cancelled;
}

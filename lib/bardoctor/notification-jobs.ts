import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import { notificationJobEvents, notificationJobs } from "../../db/schema";
import {
  oneSignalCanScheduleAt,
  oneSignalScheduleHorizonMs,
  ONESIGNAL_MIN_SCHEDULE_LEAD_MS,
  ONESIGNAL_SCHEDULE_SAFETY_MS,
} from "./notification-schedule-window";
import { sendPushToAccount } from "./notifications";
import { notificationRetryAt } from "./notification-retry";
import type { NotificationCategory } from "./notification-types";

export type NotificationJobStatus = "queued" | "dispatching" | "scheduled" | "accepted" | "failed" | "cancelled" | "expired";
export type NotificationJobRow = {
  id: number; account_id: number; venue_id: number | null; source_type: string; source_id: string | null;
  category: NotificationCategory; dedupe_key: string; title: string; message: string; target_url: string;
  target_at: string; timezone: string; status: NotificationJobStatus; provider_message_id: string | null;
  attempt_count: number; next_attempt_at: string | null; leased_at: string | null; last_error: string | null;
  created_at: string; updated_at: string;
};

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : "Неизвестная ошибка доставки").slice(0, 1_000)
    .replace(/(authorization|bearer|api[_ -]?key|token|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[secret removed]");
}

async function transition(jobId: number, fromStatus: string | null, toStatus: NotificationJobStatus, detail?: string | null) {
  await getDb().insert(notificationJobEvents).values({
    jobId, fromStatus, toStatus, detail: detail?.slice(0, 1_000) || null,
  });
}

function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date()); return true; }
  catch { return false; }
}

export async function enqueueNotificationJob(input: {
  accountId: number; venueId?: number | null; sourceType: string; sourceId?: string | null;
  category: NotificationCategory; dedupeKey: string; title: string; message: string;
  targetUrl: string; targetAt: string; timezone: string;
}): Promise<{ id: number; status: NotificationJobStatus; created: boolean }> {
  if (!Number.isFinite(Date.parse(input.targetAt)) || !validTimezone(input.timezone)) throw new Error("INVALID_NOTIFICATION_JOB_TIME");
  const existing = await getD1().prepare(`SELECT id, status FROM notification_jobs WHERE account_id = ? AND dedupe_key = ? LIMIT 1`)
    .bind(input.accountId, input.dedupeKey).first<{ id: number; status: NotificationJobStatus }>();
  const now = new Date().toISOString();
  const row = await getD1().prepare(`
    INSERT INTO notification_jobs (
      account_id, venue_id, source_type, source_id, category, dedupe_key, title, message,
      target_url, target_at, timezone, status, next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
    ON CONFLICT(account_id, dedupe_key) DO UPDATE SET
      venue_id=excluded.venue_id, source_type=excluded.source_type, source_id=excluded.source_id,
      category=excluded.category, title=excluded.title, message=excluded.message,
      target_url=excluded.target_url, target_at=excluded.target_at, timezone=excluded.timezone,
      status=CASE WHEN notification_jobs.status IN ('scheduled','accepted') THEN notification_jobs.status ELSE 'queued' END,
      next_attempt_at=CASE WHEN notification_jobs.status IN ('scheduled','accepted') THEN notification_jobs.next_attempt_at ELSE excluded.next_attempt_at END,
      last_error=CASE WHEN notification_jobs.status IN ('scheduled','accepted') THEN notification_jobs.last_error ELSE NULL END,
      updated_at=excluded.updated_at
    RETURNING id, status
  `).bind(
    input.accountId, input.venueId ?? null, input.sourceType.slice(0, 60), input.sourceId?.slice(0, 180) || null,
    input.category, input.dedupeKey.slice(0, 220), input.title.slice(0, 180), input.message.slice(0, 500),
    input.targetUrl.slice(0, 500), input.targetAt, input.timezone.slice(0, 80), now, now, now,
  ).first<{ id: number; status: NotificationJobStatus }>();
  if (!row) throw new Error("NOTIFICATION_JOB_NOT_PERSISTED");
  if (!existing) await transition(row.id, null, "queued", `Целевое время: ${input.targetAt}`);
  else if (existing.status !== row.status) await transition(row.id, existing.status, row.status, "Задание актуализировано");
  return { ...row, created: !existing };
}

export async function cancelNotificationJobsForSource(accountId: number, sourceType: string, sourceId: string, detail = "Источник уведомления изменён или удалён"): Promise<number> {
  const rows = await getD1().prepare(`
    SELECT id, status FROM notification_jobs WHERE account_id=? AND source_type=? AND source_id=?
      AND status NOT IN ('cancelled','expired')
  `).bind(accountId, sourceType, sourceId).all<{ id: number; status: NotificationJobStatus }>();
  let count = 0;
  for (const row of rows.results ?? []) {
    const changed = await getD1().prepare(`UPDATE notification_jobs SET status='cancelled', last_error=NULL, leased_at=NULL, updated_at=? WHERE id=? AND status=?`)
      .bind(new Date().toISOString(), row.id, row.status).run();
    if ((changed.meta.changes ?? 0) !== 1) continue;
    count += 1; await transition(row.id, row.status, "cancelled", detail);
  }
  return count;
}

export async function notificationJobsForSource(accountId: number, sourceType: string, sourceId: string): Promise<NotificationJobRow[]> {
  const rows = await getD1().prepare(`SELECT * FROM notification_jobs WHERE account_id=? AND source_type=? AND source_id=? ORDER BY target_at`)
    .bind(accountId, sourceType, sourceId).all<NotificationJobRow>();
  return rows.results ?? [];
}

export async function dispatchNotificationJobs(input: {
  origin: string; accountId?: number; sourceId?: string; now?: Date; limit?: number;
}): Promise<{ checked: number; scheduled: number; duplicates: number; failed: number; expired: number }> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const staleLease = new Date(nowMs - 15 * 60_000).toISOString();
  const maxTarget = new Date(nowMs + oneSignalScheduleHorizonMs() - ONESIGNAL_SCHEDULE_SAFETY_MS).toISOString();
  const minTarget = new Date(nowMs + ONESIGNAL_MIN_SCHEDULE_LEAD_MS).toISOString();
  const rows = await getD1().prepare(`
    SELECT * FROM notification_jobs
    WHERE (status IN ('queued','failed') OR (status='dispatching' AND leased_at < ?))
      AND target_at > ? AND target_at <= ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
      AND (? IS NULL OR account_id=?) AND (? IS NULL OR source_id=?)
    ORDER BY target_at,id LIMIT ?
  `).bind(staleLease, minTarget, maxTarget, nowIso, input.accountId ?? null, input.accountId ?? null,
    input.sourceId ?? null, input.sourceId ?? null, Math.max(1, Math.min(100, input.limit ?? 50))).all<NotificationJobRow>();
  const summary = { checked: 0, scheduled: 0, duplicates: 0, failed: 0, expired: 0 };
  for (const job of rows.results ?? []) {
    if (!oneSignalCanScheduleAt(job.target_at, nowMs)) continue;
    const claim = await getD1().prepare(`
      UPDATE notification_jobs SET status='dispatching', leased_at=?, attempt_count=attempt_count+1, updated_at=?
      WHERE id=? AND (status IN ('queued','failed') OR (status='dispatching' AND leased_at < ?))
    `).bind(nowIso, nowIso, job.id, staleLease).run();
    if ((claim.meta.changes ?? 0) !== 1) continue;
    summary.checked += 1; await transition(job.id, job.status, "dispatching", `Попытка ${job.attempt_count + 1}`);
    try {
      const result = await sendPushToAccount(job.account_id, input.origin, {
        category: job.category, dedupeKey: job.dedupe_key, title: job.title, message: job.message,
        targetUrl: job.target_url, sendAfter: job.target_at,
      });
      const nextStatus: NotificationJobStatus = result.scheduled ? "scheduled" : "accepted";
      const changed = await getDb().update(notificationJobs).set({
        status: nextStatus, providerMessageId: result.messageId, nextAttemptAt: null,
        leasedAt: null, lastError: null, updatedAt: new Date().toISOString(),
      }).where(and(eq(notificationJobs.id, job.id), eq(notificationJobs.status, "dispatching"))).returning({ id: notificationJobs.id });
      if (changed.length) await transition(job.id, "dispatching", nextStatus, result.duplicate ? "Provider delivery уже существовала" : "Передано OneSignal");
      if (result.duplicate) summary.duplicates += 1; else summary.scheduled += 1;
    } catch (error) {
      const detail = safeError(error);
      const changed = await getDb().update(notificationJobs).set({
        status: "failed", nextAttemptAt: notificationRetryAt(job.attempt_count + 1, nowMs),
        leasedAt: null, lastError: detail, updatedAt: new Date().toISOString(),
      }).where(and(eq(notificationJobs.id, job.id), eq(notificationJobs.status, "dispatching"))).returning({ id: notificationJobs.id });
      if (changed.length) await transition(job.id, "dispatching", "failed", detail);
      summary.failed += 1;
    }
  }
  const expired = await getD1().prepare(`SELECT id,status FROM notification_jobs WHERE status IN ('queued','failed','dispatching') AND target_at <= ? AND (? IS NULL OR account_id=?)`)
    .bind(nowIso, input.accountId ?? null, input.accountId ?? null).all<{ id: number; status: NotificationJobStatus }>();
  for (const row of expired.results ?? []) {
    const changed = await getDb().update(notificationJobs).set({ status: "expired", leasedAt: null, lastError: "Целевое время прошло до передачи провайдеру", updatedAt: nowIso })
      .where(and(eq(notificationJobs.id, row.id), eq(notificationJobs.status, row.status))).returning({ id: notificationJobs.id });
    if (changed.length) { await transition(row.id, row.status, "expired", "Целевое время прошло до передачи провайдеру"); summary.expired += 1; }
  }
  return summary;
}

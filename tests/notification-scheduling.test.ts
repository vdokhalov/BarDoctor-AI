import assert from "node:assert/strict";
import test from "node:test";
import {
  ONESIGNAL_DOCUMENTED_SCHEDULE_HORIZON_DAYS,
  ONESIGNAL_SCHEDULE_SAFETY_MS,
  oneSignalScheduleWindow,
} from "../lib/bardoctor/notification-schedule-window";
import { notificationRetryAt } from "../lib/bardoctor/notification-retry";
import { zonedDateTimeToUtc } from "../lib/bardoctor/notification-time";
import { notificationProviderIdempotencyKey } from "../lib/bardoctor/notification-idempotency";

test("future push is handed to OneSignal only inside the documented scheduling window", () => {
  const now = Date.parse("2026-08-13T10:00:00.000Z");
  const boundary = now + ONESIGNAL_DOCUMENTED_SCHEDULE_HORIZON_DAYS * 86_400_000 - ONESIGNAL_SCHEDULE_SAFETY_MS;
  assert.equal(oneSignalScheduleWindow(new Date(boundary).toISOString(), now), "within");
  assert.equal(oneSignalScheduleWindow(new Date(boundary + 1).toISOString(), now), "too_far");
  assert.equal(oneSignalScheduleWindow(new Date(now + 20 * 60_000).toISOString(), now), "too_soon");
  assert.equal(oneSignalScheduleWindow("not-a-date", now), "invalid");
});

test("venue-local calendar time retains timezone and daylight-saving offset", () => {
  assert.equal(zonedDateTimeToUtc("2026-01-15", "09:00", "Europe/Chisinau"), "2026-01-15T07:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-07-15", "09:00", "Europe/Chisinau"), "2026-07-15T06:00:00.000Z");
  assert.throws(() => zonedDateTimeToUtc("2026-07-15", "25:00", "Europe/Chisinau"), /INVALID_NOTIFICATION_TIME/);
});

test("provider idempotency key is stable across retry and restart inputs", async () => {
  const first = await notificationProviderIdempotencyKey(42, "opportunity:fixture:decision:2026-09-01");
  const retry = await notificationProviderIdempotencyKey(42, "opportunity:fixture:decision:2026-09-01");
  const otherVenueAccount = await notificationProviderIdempotencyKey(43, "opportunity:fixture:decision:2026-09-01");
  assert.equal(first, retry);
  assert.notEqual(first, otherVenueAccount);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("notification retry uses bounded exponential backoff", () => {
  const now = Date.parse("2026-08-13T10:00:00.000Z");
  assert.equal(notificationRetryAt(1, now), "2026-08-13T10:15:00.000Z");
  assert.equal(notificationRetryAt(2, now), "2026-08-13T10:30:00.000Z");
  assert.equal(notificationRetryAt(99, now), "2026-08-13T16:00:00.000Z");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  notificationRunIsDue,
  PUBLIC_NOTIFICATION_RUN_INTERVAL_MS,
} from "../lib/bardoctor/notification-run-schedule";

const now = new Date("2026-07-23T10:00:00.000Z");

test("public notification tick is due when an enabled account was never checked", () => {
  assert.equal(notificationRunIsDue([null], now), true);
});

test("public notification tick is skipped inside the server interval", () => {
  assert.equal(
    notificationRunIsDue(["2026-07-23T09:30:00.000Z"], now),
    false,
  );
});

test("public notification tick becomes due after the server interval", () => {
  const lastRun = new Date(now.getTime() - PUBLIC_NOTIFICATION_RUN_INTERVAL_MS).toISOString();
  assert.equal(notificationRunIsDue([lastRun], now), true);
});

test("public notification tick stays idle without enabled accounts", () => {
  assert.equal(notificationRunIsDue([], now), false);
});

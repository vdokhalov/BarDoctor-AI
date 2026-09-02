import assert from "node:assert/strict";
import test from "node:test";
import {
  notificationRunIsDue,
  PUBLIC_NOTIFICATION_RUN_INTERVAL_MS,
} from "../lib/bardoctor/notification-run-schedule";

const now = new Date("2026-07-23T10:00:00.000Z");

test("scheduler notification run is due when an enabled account was never checked", () => {
  assert.equal(notificationRunIsDue([null], now), true);
});

test("scheduler notification replay is skipped inside the server interval", () => {
  assert.equal(
    notificationRunIsDue(["2026-07-23T09:30:00.000Z"], now),
    false,
  );
});

test("scheduler notification run becomes due after the server interval", () => {
  const lastRun = new Date(now.getTime() - PUBLIC_NOTIFICATION_RUN_INTERVAL_MS).toISOString();
  assert.equal(notificationRunIsDue([lastRun], now), true);
});

test("scheduler notification run stays idle without enabled accounts", () => {
  assert.equal(notificationRunIsDue([], now), false);
});

test("notification runner is POST-only and never accepts a query-string token", async () => {
  const route = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/api/notifications/run/route.ts", import.meta.url), "utf8")
  );
  assert.match(route, /export function GET\(\): Response/);
  assert.match(route, /status:\s*405/);
  assert.match(route, /Allow:\s*"POST"/);
  assert.match(route, /request\.headers\.get\("authorization"\)/);
  assert.doesNotMatch(route, /searchParams\.get\("token"\)/);
  assert.match(route, /notificationTriggersAreDue\(\)/);
});

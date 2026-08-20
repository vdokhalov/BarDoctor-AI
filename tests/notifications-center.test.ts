import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GET as getNotifications } from "../app/notifications/route";
import {
  NOTIFICATION_CATEGORY_CATALOG,
  NOTIFICATION_QUIET_POLICY,
  notificationCategoryDefinition,
} from "../lib/bardoctor/notification-catalog";

const count = (value: string, pattern: RegExp): number =>
  (value.match(pattern) || []).length;

test("direct Notifications enters the canonical SPA shell", async () => {
  const response = getNotifications(new Request("https://bardoctor.test/notifications"));
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(count(html, /data-bd-bottom-nav=/g), 0);
  assert.equal(count(html, /id="bd-canonical-bottom-nav"/g), 0);
  assert.match(html, /<div id="root">[\s\S]*data-bd-static-startup="v201"/);
  assert.match(html, /app-shell-v185\.js/);
  assert.doesNotMatch(html, /push-bottom-nav/);
});

test("embedded Notifications delegates navigation to the parent shell", async () => {
  const response = getNotifications(
    new Request("https://bardoctor.test/notifications?embedded=1&venue=14"),
  );
  const html = await response.text();

  assert.equal(count(html, /data-bd-bottom-nav=/g), 0);
  assert.equal(count(html, /id="bd-canonical-bottom-nav"/g), 0);
  assert.match(html, /data-bd-navigation-owner="parent-shell"/);
  assert.match(html, /data-bd-embedded="true"/);
});

test("embedded Notifications renders same-path detail routes inside the live iframe", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );

  assert.match(bundle, /s==="\/notifications"&&h\.pathname===s/);
  assert.match(bundle, /r\.history\.replaceState\(\{bdNotificationView:!0\}/);
  assert.match(bundle, /r\.dispatchEvent\(new r\.PopStateEvent\("popstate"/);
  assert.match(bundle, /window\.history\.replaceState\(window\.history\.state,"",v\)/);
  assert.match(bundle, /j&&!g\.searchParams\.has\("venue"\)&&g\.searchParams\.set\("venue",j\)/);
});

test("notification center is compact and does not expose provider setup", async () => {
  const response = getNotifications(
    new Request("https://bardoctor.test/notifications?embedded=1&venue=14"),
  );
  const html = await response.text();

  assert.match(html, /НА ЭТОМ УСТРОЙСТВЕ/);
  assert.match(html, /ЧТО ПРИСЫЛАТЬ/);
  assert.match(html, /КОГДА ПРИСЫЛАТЬ/);
  assert.match(html, /История уведомлений/);
  assert.doesNotMatch(html, /Важное придёт само|Установка → Разрешение → Связь/);
  assert.doesNotMatch(html, /App API Key|Keys &amp; IDs|dashboard\.onesignal\.com/);
  assert.doesNotMatch(html, /Сохранить настройки/);
  assert.doesNotMatch(html, /type="checkbox"[^>]*critical|critical[^>]*type="checkbox"/i);
});

test("catalog exposes only notification rules supported by the evaluator", () => {
  assert.deepEqual(
    NOTIFICATION_CATEGORY_CATALOG.map((category) => category.id),
    ["incident", "shift", "task", "finance", "equipment", "calendar"],
  );
  assert.equal(notificationCategoryDefinition("finance")?.preferenceKey, "financeAlerts");
  assert.equal(notificationCategoryDefinition("unknown"), null);
  assert.equal(NOTIFICATION_QUIET_POLICY.criticalBypassesQuietHours, true);
  assert.equal(NOTIFICATION_QUIET_POLICY.configurable, false);
});

test("client autosaves preferences with rollback and renders a user-safe history", async () => {
  const client = await readFile(new URL("../public/notifications.js", import.meta.url), "utf8");
  const api = await readFile(new URL("../app/api/notifications/route.ts", import.meta.url), "utf8");
  const notificationService = await readFile(
    new URL("../lib/bardoctor/notifications.ts", import.meta.url),
    "utf8",
  );

  assert.match(client, /async function saveCategoryPreference/);
  assert.match(client, /patch\[category\.preferenceKey\] = next/);
  assert.match(client, /nodes\.categoryToggle\.checked = previous/);
  assert.match(client, /async function saveQuietHours/);
  assert.match(client, /nodes\.quietStart\.value = previousStart/);
  assert.match(client, /Системные настройки отсюда открыть нельзя/);
  assert.match(client, /var supported = "serviceWorker" in navigator/);
  assert.doesNotMatch(client, /item\.detail|providerMessageId|dedupeKey|lease|backoff/i);

  assert.match(api, /notificationHistoryForAccount/);
  assert.match(api, /preferences: "account"/);
  assert.match(api, /history: "account"/);
  assert.doesNotMatch(api, /provider:\s*"onesignal"/);
  const statusStart = notificationService.indexOf("function userHistoryStatus");
  const historyStart = notificationService.indexOf("function userNotificationHistoryEntry");
  const historyEnd = notificationService.indexOf("/**", historyStart);
  const statusProjection = notificationService.slice(statusStart, historyStart);
  const userHistoryProjection = notificationService.slice(historyStart, historyEnd);
  assert.ok(statusStart >= 0 && historyStart > statusStart && historyEnd > historyStart);
  assert.match(statusProjection, /Передано сервису/);
  assert.doesNotMatch(userHistoryProjection, /providerMessageId|detail:|dedupeKey|lastError|leasedAt/);
});

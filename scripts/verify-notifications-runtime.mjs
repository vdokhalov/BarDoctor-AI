import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = 5194;
const origin = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "Notifications-QA-2468";
let serverOutput = "";

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  detached: true,
  env: {
    ...process.env,
    ONESIGNAL_APP_ID: "runtime-public-app",
    NOTIFICATION_CRON_SECRET: "runtime-notification-cron-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-14_000); });
server.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-14_000); });

function stopServer() {
  if (!server.pid) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
}
process.once("exit", stopServer);
process.once("SIGINT", () => { stopServer(); process.exit(130); });

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${origin}/api/healthz`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Runtime server did not start.\n${serverOutput}`);
}

async function localDatabase() {
  const directory = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  let databases = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  if (databases.length === 0) {
    await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "schema-probe@example.test", password }),
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 200));
    databases = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  }
  assert.equal(databases.length, 1);
  const database = new DatabaseSync(path.join(directory, databases[0]));
  if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'").get()) {
    const migrations = (await readdir(path.join(process.cwd(), "drizzle")))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name))
      .sort();
    database.exec("PRAGMA foreign_keys = ON");
    for (const migration of migrations) {
      database.exec((await readFile(path.join(process.cwd(), "drizzle", migration), "utf8")).replaceAll("--> statement-breakpoint", ""));
    }
  }
  return database;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

function headers(session, venueId, extra = {}) {
  return {
    "Content-Type": "application/json",
    Cookie: session.cookie,
    "X-Venue-Id": String(venueId),
    ...extra,
  };
}

async function register(label) {
  const result = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": `198.51.100.${label === "owner" ? 31 : 32}` },
    body: JSON.stringify({
      email: `notifications-${label}-${runId}@example.test`,
      password,
      firstName: label,
      registrationMode: "owner",
    }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  const cookie = result.response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "registration must issue a server session cookie");
  return { ...result.body, cookie };
}

let database;
try {
  await waitForServer();
  database = await localDatabase();

  const sideEffectGet = await request(
    "/api/notifications/run?token=runtime-notification-cron-secret",
  );
  assert.equal(sideEffectGet.response.status, 405, JSON.stringify(sideEffectGet.body));
  assert.equal(sideEffectGet.response.headers.get("allow"), "POST");
  const queryTokenPost = await request(
    "/api/notifications/run?token=runtime-notification-cron-secret",
    { method: "POST" },
  );
  assert.equal(queryTokenPost.response.status, 401, JSON.stringify(queryTokenPost.body));
  const authorizedIdlePost = await request("/api/notifications/run", {
    method: "POST",
    headers: { Authorization: "Bearer runtime-notification-cron-secret" },
  });
  assert.equal(authorizedIdlePost.response.status, 200, JSON.stringify(authorizedIdlePost.body));
  assert.equal(authorizedIdlePost.body.ran, false);

  const unauthenticated = await request("/api/notifications");
  assert.equal(unauthenticated.response.status, 401);

  const owner = await register("owner");
  const venueA = owner.activeVenueId;
  const createdVenue = await request("/api/venues", {
    method: "POST",
    headers: headers(owner, venueA),
    body: JSON.stringify({
      name: "Notifications Runtime B",
      businessType: "Бар",
      country: "MD",
      city: "Кишинёв",
      currency: "MDL",
    }),
  });
  assert.equal(createdVenue.response.status, 201, JSON.stringify(createdVenue.body));
  const venueB = createdVenue.body.activeVenueId;

  const initial = await request("/api/notifications", { headers: headers(owner, venueA) });
  assert.equal(initial.response.status, 200, JSON.stringify(initial.body));
  assert.equal(initial.body.categories.length, 6);
  assert.deepEqual(initial.body.scopes, { device: "device", preferences: "account", history: "account" });
  assert.equal(initial.body.quietPolicy.configurable, false);

  const saved = await request("/api/notifications", {
    method: "PUT",
    headers: headers(owner, venueA),
    body: JSON.stringify({
      financeAlerts: false,
      quietStart: "22:30",
      quietEnd: "07:15",
      timezone: "Europe/Chisinau",
    }),
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.preferences.financeAlerts, false);

  const reloadedThroughVenueB = await request("/api/notifications", { headers: headers(owner, venueB) });
  assert.equal(reloadedThroughVenueB.response.status, 200, JSON.stringify(reloadedThroughVenueB.body));
  assert.equal(reloadedThroughVenueB.body.preferences.financeAlerts, false);
  assert.equal(reloadedThroughVenueB.body.preferences.quietStart, "22:30");

  const malformed = await request("/api/notifications", {
    method: "PUT",
    headers: headers(owner, venueA),
    body: "[]",
  });
  assert.equal(malformed.response.status, 400);
  const afterMalformed = await request("/api/notifications", { headers: headers(owner, venueA) });
  assert.equal(afterMalformed.body.preferences.quietStart, "22:30");

  const now = new Date().toISOString();
  const targetAt = new Date(Date.now() + 45 * 86_400_000).toISOString();
  database.prepare(`
    INSERT INTO notification_deliveries (
      account_id, category, dedupe_key, title, message, target_url, status,
      provider_message_id, detail, created_at
    ) VALUES (?, 'finance', ?, 'Финансовое отклонение', 'Проверьте показатели смены', '/finance',
      'accepted', 'provider-secret-id', '{"provider":"raw-secret"}', ?)
  `).run(owner.userId, `runtime-accepted-${runId}`, now);
  database.prepare(`
    INSERT INTO notification_deliveries (
      account_id, category, dedupe_key, title, message, target_url, status,
      provider_message_id, detail, created_at
    ) VALUES (?, 'equipment', ?, 'Неисправность', 'Холодильник требует проверки', '/equipment',
      'failed', NULL, 'Schedule Notifications may not be scheduled so far in the future', ?)
  `).run(owner.userId, `runtime-failed-${runId}`, now);
  database.prepare(`
    INSERT INTO notification_jobs (
      account_id, venue_id, source_type, source_id, category, dedupe_key, title,
      message, target_url, target_at, timezone, status, next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, 'opportunity_calendar', ?, 'calendar', ?, 'Будущее событие',
      'Подготовьтесь к событию', '/opportunities', ?, 'Europe/Chisinau', 'queued', ?, ?, ?)
  `).run(owner.userId, venueA, `source-${runId}`, `runtime-queued-${runId}`, targetAt, now, now, now);

  const history = await request("/api/notifications", { headers: headers(owner, venueA) });
  assert.equal(history.response.status, 200, JSON.stringify(history.body));
  const serialized = JSON.stringify(history.body.history);
  assert.equal(serialized.includes("provider-secret-id"), false);
  assert.equal(serialized.includes("raw-secret"), false);
  assert.equal(serialized.includes("Schedule Notifications"), false);
  assert.equal(serialized.includes("runtime-accepted"), false);
  assert.equal(serialized.includes("Передано сервису"), true);
  assert.equal(serialized.includes("Доставлено"), false);
  assert.equal(serialized.includes("Ожидает отправки"), true);
  assert.equal(serialized.includes(targetAt), true);

  const outsider = await register("outsider");
  await request("/api/notifications", {
    method: "PUT",
    headers: headers(outsider, outsider.activeVenueId),
    body: JSON.stringify({ financeAlerts: true, quietStart: "01:00", quietEnd: "02:00" }),
  });
  const spoofedVenue = await request("/api/notifications", {
    headers: headers(owner, outsider.activeVenueId),
  });
  assert.equal(spoofedVenue.response.status, 200);
  assert.equal(spoofedVenue.body.preferences.quietStart, "22:30");
  assert.equal(JSON.stringify(spoofedVenue.body).includes("01:00"), false);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    preferences: { autosaveReload: true, accountScopeAcrossVenues: true, malformedRollback: true },
    history: { acceptedIsNotDelivered: true, providerDetailsHidden: true, futureJobVisible: true },
    security: { unauthenticatedStatus: unauthenticated.response.status, foreignVenueHeaderCannotSelectAnotherAccount: true },
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${serverOutput}\n`);
  throw error;
} finally {
  database?.close();
  stopServer();
}

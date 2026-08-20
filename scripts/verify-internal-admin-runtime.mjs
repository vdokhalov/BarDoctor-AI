import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const port = 5192;
const origin = `http://127.0.0.1:${port}`;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = "Admin-QA-2468";
const adminIdentity = `admin-runtime-${runId}@example.test`;
const adminIdentityHash = createHash("sha256").update(adminIdentity).digest("hex");
const openAISecret = `sk-runtime-${runId}`;
const pushSecret = `push-runtime-${runId}`;
let serverOutput = "";

const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), detached: true,
  env: {
    ...process.env,
    BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256: adminIdentityHash,
    OPENAI_API_KEY: openAISecret,
    OPENAI_MODEL: "gpt-runtime-admin",
    ONESIGNAL_APP_ID: "onesignal-runtime-app",
    ONESIGNAL_REST_API_KEY: pushSecret,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-16_000); });
server.stderr.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-16_000); });
function stopServer() { if (server.pid) { try { process.kill(-server.pid, "SIGTERM"); } catch {} } }
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
      body: JSON.stringify({ email: "schema-probe@example.test", password: "Schema-Probe-2468" }),
    }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 200));
    databases = (await readdir(directory)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  }
  assert.equal(databases.length, 1);
  const database = new DatabaseSync(path.join(directory, databases[0]));
  const migrations = (await readdir(path.join(process.cwd(), "drizzle"))).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  database.exec("PRAGMA foreign_keys = ON");
  if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'").get()) {
    for (const migration of migrations) database.exec((await readFile(path.join(process.cwd(), "drizzle", migration), "utf8")).replaceAll("--> statement-breakpoint", ""));
  } else if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_admins'").get()) {
    database.exec((await readFile(path.join(process.cwd(), "drizzle/0017_dazzling_korvac.sql"), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  if (!database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_usage_events'").get()) {
    database.exec((await readFile(path.join(process.cwd(), "drizzle/0018_gigantic_arachne.sql"), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

function authHeaders(session, extra = {}) {
  return {
    "Content-Type": "application/json",
    "X-Session-Email": session.email,
    "X-Session-Token": session.token,
    ...extra,
  };
}

function responseCookie(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "auth response must set the server-visible session cookie");
  assert.match(value, /HttpOnly/i);
  assert.match(value, /SameSite=Strict/i);
  return value.split(";", 1)[0];
}

async function register(email, firstName, identity) {
  const result = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(identity ? { "oai-authenticated-user-email": identity } : {}) },
    body: JSON.stringify({ email, password, firstName, registrationMode: "owner" }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  return { ...result.body, cookie: responseCookie(result.response) };
}

async function createInvite(owner, role) {
  const result = await request("/api/access", {
    method: "POST",
    headers: { ...authHeaders(owner), "X-Venue-Id": String(owner.activeVenueId) },
    body: JSON.stringify({ role }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  return result.body.invite.code;
}

async function join(email, firstName, code) {
  const result = await request("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, registrationMode: "join", invitationCode: code }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  return { ...result.body, cookie: responseCookie(result.response) };
}

async function login(email) {
  const result = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return { ...result.body, cookie: responseCookie(result.response) };
}

async function adminGet(session, section, query = "", extra = {}) {
  return request(`/api/admin/${section}${query}`, { headers: authHeaders(session, extra) });
}

let database;
try {
  await waitForServer();
  database = await localDatabase();
  database.prepare(`
    DELETE FROM platform_admin_rate_limits WHERE account_id IN (
      SELECT account_id FROM platform_admins WHERE provisioned_by = 'verified_identity_bootstrap'
      AND account_id IN (SELECT id FROM accounts WHERE app_email LIKE 'admin-runtime-%@example.test')
    )
  `).run();
  database.prepare(`DELETE FROM platform_admin_audit WHERE admin_account_id IN (SELECT id FROM accounts WHERE app_email LIKE 'admin-runtime-%@example.test')`).run();
  database.prepare(`DELETE FROM platform_admins WHERE provisioned_by = 'verified_identity_bootstrap' AND account_id IN (SELECT id FROM accounts WHERE app_email LIKE 'admin-runtime-%@example.test')`).run();

  const registeredAdmin = await register(adminIdentity, "Platform Admin", adminIdentity);
  const sessionBridge = await request("/api/auth/bootstrap", {
    method: "POST",
    headers: authHeaders(registeredAdmin),
  });
  assert.equal(sessionBridge.response.status, 200, JSON.stringify(sessionBridge.body));
  const admin = { ...registeredAdmin, cookie: responseCookie(sessionBridge.response) };
  const owner = await register(`owner-runtime-${runId}@example.test`, "Owner");
  const manager = await join(`manager-runtime-${runId}@example.test`, "Manager", await createInvite(owner, "manager"));
  const employee = await join(`employee-runtime-${runId}@example.test`, "Employee", await createInvite(owner, "shift_manager"));

  const bootstrapPage = await request("/admin", { headers: { Cookie: admin.cookie } });
  assert.equal(bootstrapPage.response.status, 200);
  assert.match(bootstrapPage.body, /Активировать Internal Admin/);
  for (const protectedLabel of ["Обзор", "Пользователи", "Заведения", "Интеграции", "AI-наблюдаемость", "Push-инфраструктура", "Состояние системы", "Журнал администраторов"]) {
    assert.equal(bootstrapPage.body.includes(protectedLabel), false, protectedLabel);
  }
  const preClaimData = await request("/api/admin/dashboard", { headers: { Cookie: admin.cookie } });
  assert.equal(preClaimData.response.status, 403);

  const deniedRoles = [owner, manager, employee];
  for (const account of deniedRoles) {
    const denied = await adminGet(account, "dashboard", "?venue_id=1&user_id=1", {
      "X-Platform-Permission": "platform.admin",
      "X-Platform-Admin": "true",
    });
    assert.equal(denied.response.status, 403, JSON.stringify(denied.body));
    const deniedRoute = await request("/admin?user_id=1&venue_id=1", { headers: { Cookie: account.cookie } });
    assert.equal(deniedRoute.response.status, 404);
    assert.equal(deniedRoute.body.includes("Активировать Internal Admin"), false);
  }
  const unauthenticated = await request("/api/admin/dashboard");
  assert.equal(unauthenticated.response.status, 403);
  const unauthenticatedPage = await request("/admin");
  assert.equal(unauthenticatedPage.response.status, 404);
  assert.equal(unauthenticatedPage.body.includes("Активировать Internal Admin"), false);

  const spoofedClaim = await request(`/api/admin/claim?user_id=${admin.userId}&email=${encodeURIComponent(adminIdentity)}`, {
    method: "POST",
    headers: {
      Cookie: owner.cookie,
      Origin: origin,
      "X-Admin-Intent": "claim-platform-admin",
      "X-Platform-Permission": "platform.admin",
      "oai-authenticated-user-email": adminIdentity,
    },
  });
  assert.equal(spoofedClaim.response.status, 403, JSON.stringify(spoofedClaim.body));

  const mismatchedIdentityClaim = await request("/api/admin/claim", {
    method: "POST",
    headers: {
      Cookie: admin.cookie,
      Origin: origin,
      "X-Admin-Intent": "claim-platform-admin",
      "oai-authenticated-user-email": owner.email,
    },
  });
  assert.equal(mismatchedIdentityClaim.response.status, 403, JSON.stringify(mismatchedIdentityClaim.body));

  const claim = await request("/api/admin/claim", {
    method: "POST",
    headers: {
      Cookie: admin.cookie,
      "Origin": origin,
      "X-Admin-Intent": "claim-platform-admin",
    },
  });
  assert.equal(claim.response.status, 201, JSON.stringify(claim.body));

  const repeatedClaim = await request("/api/admin/claim", {
    method: "POST",
    headers: { Cookie: admin.cookie, Origin: origin, "X-Admin-Intent": "claim-platform-admin" },
  });
  assert.equal(repeatedClaim.response.status, 200, JSON.stringify(repeatedClaim.body));
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admins WHERE account_id = ?").get(admin.userId).count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admin_audit WHERE admin_account_id = ? AND action = 'platform_admin.grant'").get(admin.userId).count, 1);

  const activatedPage = await request("/admin", { headers: { Cookie: admin.cookie } });
  assert.equal(activatedPage.response.status, 200);
  assert.match(activatedPage.body, /Internal Admin v2/);
  assert.match(activatedPage.body, /Обзор/);
  assert.equal(activatedPage.body.includes("Активировать Internal Admin"), false);

  const adminId = admin.userId;
  const venueId = admin.activeVenueId;
  const profile = await request("/api/restaurants", {
    method: "POST", headers: { ...authHeaders(admin), "X-Venue-Id": String(venueId) },
    body: JSON.stringify({ name: `Admin Runtime Venue ${runId}`, city: "Бендеры", country: "MD", businessType: "Бар", currency: "MDL" }),
  });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));

  const connectionId = `admin-runtime-connection-${runId}`;
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, source_key, source_type,
      display_name, channel, status, sync_enabled, capabilities_json, config_json,
      created_by_account_id, created_at, updated_at, last_sync_at, last_success_at
    ) VALUES (?, ?, ?, '1c', 'local-connector-v1', 'runtime', 'local_connector',
      '1С Runtime', 'agent', 'connected', 1, '[]', '{}', ?, ?, ?, ?, ?)
  `).run(connectionId, venueId, adminId, adminId, now, now, now, now);
  database.prepare(`
    INSERT INTO integration_connector_agents (
      id, venue_id, data_account_id, connection_id, machine_id_hash, machine_name,
      agent_version, platform_version, configuration_name, configuration_version,
      read_only, status, imported_count, last_seen_at, last_sync_at
    ) VALUES (?, ?, ?, ?, ?, 'BAR-RUNTIME-PC', '1.0.0', '8.2.19.130',
      '1С:Общепит', '2.0.65.14', 1, 'working', 612, ?, ?)
  `).run(`agent-${runId}`, venueId, adminId, connectionId, "a".repeat(64), now, now);
  database.prepare(`
    INSERT INTO integration_sync_runs (
      id, venue_id, data_account_id, connection_id, trigger, data_type, status,
      received_count, created_count, updated_count, finished_at
    ) VALUES (?, ?, ?, ?, 'manual', 'stock_product', 'success', 612, 600, 12, ?)
  `).run(`run-${runId}`, venueId, adminId, connectionId, now);
  database.prepare(`
    INSERT INTO ai_usage_limits (account_id, used_requests, request_limit, period_key, updated_at)
    VALUES (?, 17, 250, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET used_requests=17, request_limit=250, period_key=excluded.period_key, updated_at=excluded.updated_at
  `).run(adminId, now.slice(0, 7), now);
  database.prepare(`
    INSERT INTO ai_usage_events (
      account_id, actor_account_id, venue_id, request_id, provider, model, feature,
      input_tokens, output_tokens, total_tokens, status, latency_ms, error_code, created_at
    ) VALUES
      (?, ?, ?, ?, 'openai', 'gpt-runtime-admin', 'ai_doctor', 100, 40, 140, 'success', 820, NULL, ?),
      (?, ?, ?, ?, 'openai', 'gpt-runtime-admin', 'reviews', 80, 36, 116, 'error', 1250, 'runtime_error', ?)
  `).run(
    adminId, adminId, venueId, `ai-runtime-success-${runId}`, now,
    adminId, adminId, venueId, `ai-runtime-error-${runId}`, now,
  );
  database.prepare(`
    INSERT INTO notification_deliveries (account_id, category, dedupe_key, title, message, status, detail, created_at)
    VALUES (?, 'system', ?, 'Runtime accepted', 'Accepted', 'accepted', NULL, ?),
           (?, 'calendar', ?, 'Runtime failed', 'Failed', 'failed', 'Schedule Notifications may not be scheduled so far in the future.', ?),
           (?, 'calendar', ?, 'Runtime failed again', 'Failed', 'failed', 'Schedule Notifications may not be scheduled so far in the future.', ?)
  `).run(
    adminId, `admin-runtime-ok-${runId}`, now,
    adminId, `admin-runtime-fail-a-${runId}`, now,
    adminId, `admin-runtime-fail-b-${runId}`, now,
  );
  const futureTarget = new Date(Date.parse(now) + 90 * 86_400_000).toISOString();
  database.prepare(`
    INSERT INTO notification_jobs (
      account_id, venue_id, source_type, source_id, category, dedupe_key, title, message,
      target_url, target_at, timezone, status, next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, 'opportunity', ?, 'calendar', ?, 'Future runtime', 'Future message',
      '/opportunities', ?, 'Europe/Chisinau', 'queued', ?, ?, ?)
  `).run(adminId, venueId, `future-${runId}`, `future-runtime-${runId}`, futureTarget, now, now, now);

  database.prepare("UPDATE venue_memberships SET role = 'shift_manager' WHERE account_id = ? AND venue_id = ?").run(adminId, venueId);
  const independent = await adminGet(admin, "session");
  assert.equal(independent.response.status, 200, JSON.stringify(independent.body));
  assert.deepEqual(independent.body.admin.permissions, ["platform.admin"]);

  const sections = {};
  for (const section of ["dashboard", "users", "venues", "integrations", "ai", "push", "system", "audit"]) {
    sections[section] = await adminGet(admin, section);
    assert.equal(sections[section].response.status, 200, `${section}: ${JSON.stringify(sections[section].body)}`);
  }
  assert.equal(sections.users.body.data.items.some((item) => item.email === adminIdentity), true);
  assert.equal(sections.venues.body.data.items.some((item) => item.name.includes("Admin Runtime Venue")), true);
  const connector = sections.integrations.body.data.items.find((item) => item.id === connectionId);
  assert.equal(connector.status, "working");
  assert.equal(connector.agent.computer, "BAR-RUNTIME-PC");
  assert.equal(connector.agent.readOnly, true);
  assert.equal(sections.ai.body.data.totals.requests >= 2, true);
  assert.equal(sections.ai.body.data.totals.totalTokens >= 256, true);
  assert.equal(sections.ai.body.data.byVenue.some((item) => item.venueId === venueId && item.requests >= 2), true);
  assert.equal(sections.ai.body.data.byFeature.some((item) => item.feature === "ai_doctor"), true);
  assert.equal(sections.ai.body.data.totals.estimatedCost, null);
  assert.equal(sections.push.body.data.configured, true);
  assert.equal(sections.push.body.data.summary.failed >= 2, true);
  assert.equal(sections.push.body.data.summary.queuedJobs >= 1, true);
  assert.equal(sections.push.body.data.errorGroups.some((item) => item.category === "calendar" && item.count >= 2), true);
  assert.equal(sections.push.body.data.jobs.some((item) => item.sourceId === `future-${runId}` && item.status === "queued"), true);
  assert.equal(sections.system.body.data.coverage, "partial");
  assert.notEqual(sections.system.body.data.components.find((item) => item.key === "ai").status, "working");
  assert.equal(sections.audit.body.data.items.some((item) => item.action === "platform_admin.grant"), true);

  const userDetail = await adminGet(admin, "users", `?id=${owner.userId}`);
  const venueDetail = await adminGet(admin, "venues", `?id=${venueId}`);
  const integrationDetail = await adminGet(admin, "integrations", `?id=${encodeURIComponent(connectionId)}`);
  const auditEventId = sections.audit.body.data.items.find((item) => item.action === "platform_admin.grant").id;
  const auditDetail = await adminGet(admin, "audit", `?id=${auditEventId}`);
  assert.equal(userDetail.response.status, 200);
  assert.equal(venueDetail.response.status, 200);
  assert.equal(integrationDetail.response.status, 200);
  assert.equal(integrationDetail.body.data.syncHistory.some((item) => item.received === 612), true);
  assert.equal(auditDetail.response.status, 200);
  assert.equal(auditDetail.body.data.displayAction, "Выдан доступ администратора платформы");
  assert.equal(Object.hasOwn(userDetail.body.data, "passwordHash"), false);

  const noSessionAdmin = await request("/api/admin/dashboard", { headers: { "oai-authenticated-user-email": adminIdentity } });
  assert.equal(noSessionAdmin.response.status, 200);
  const adminPage = await request("/admin", { headers: { "oai-authenticated-user-email": adminIdentity } });
  const deniedPage = await request("/admin", { headers: { "oai-authenticated-user-email": `owner-runtime-${runId}@example.test` } });
  assert.equal(adminPage.response.status, 200);
  assert.equal(deniedPage.response.status, 404);

  const immutable = await request("/api/admin/audit", { method: "DELETE", headers: authHeaders(admin) });
  assert.equal([404, 405].includes(immutable.response.status), true);

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: { ...authHeaders(admin), Cookie: admin.cookie },
  });
  assert.equal(logout.response.status, 200);
  assert.match(logout.response.headers.get("set-cookie") || "", /Max-Age=0/i);
  const revokedPage = await request("/admin", { headers: { Cookie: admin.cookie } });
  assert.equal(revokedPage.response.status, 404);
  const signedInAgain = await login(adminIdentity);
  const persistentAdminPage = await request("/admin", { headers: { Cookie: signedInAgain.cookie } });
  assert.equal(persistentAdminPage.response.status, 200);
  assert.match(persistentAdminPage.body, /Обзор/);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admins WHERE account_id = ?").get(admin.userId).count, 1);

  const serialized = JSON.stringify(sections);
  for (const forbidden of [openAISecret, pushSecret, "password_hash", "password_salt", "token_hash", "encrypted_value"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  console.log(JSON.stringify({
    ok: true,
    access: { bootstrap: 200, platformAdmin: 200, owner: 403, manager: 403, employee: 403, directRoute: 404 },
    data: { users: true, venues: true, integrations: connector.status, aiEvents: true, tokenUsage: true, pushAggregation: true, futureJobQueued: true, systemCoverage: "partial" },
    security: { headerTamperingDenied: true, secretsAbsent: true, auditImmutable: true, venueRoleIndependent: true, claimIdempotent: true, persistsAfterLogin: true },
  }, null, 2));
} finally {
  if (database) database.close();
  stopServer();
}

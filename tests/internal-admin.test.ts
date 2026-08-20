import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path: string) => readFile(new URL(path, root), "utf8");

async function migratedDatabase(): Promise<DatabaseSync> {
  const database = new DatabaseSync(":memory:");
  const directory = new URL("../drizzle/", import.meta.url);
  const migrations = (await readdir(directory)).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
  for (const migration of migrations) {
    database.exec((await readFile(new URL(migration, directory), "utf8")).replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("Internal Admin uses an additive platform permission boundary independent from venue roles", async () => {
  const [schema, migration, venueAccess, platformAccess] = await Promise.all([
    source("db/schema.ts"),
    source("drizzle/0017_dazzling_korvac.sql"),
    source("lib/bardoctor/access-control.ts"),
    source("lib/bardoctor/platform-admin.ts"),
  ]);
  assert.match(schema, /platformAdmins = sqliteTable\(/);
  assert.match(schema, /permissionsJson: text\("permissions_json"\).*platform\.admin/s);
  assert.match(migration, /CREATE TABLE `platform_admins`/);
  assert.match(migration, /CREATE TABLE `platform_admin_audit`/);
  assert.match(migration, /CREATE TABLE `platform_admin_rate_limits`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `accounts`/);
  assert.doesNotMatch(venueAccess, /platform\.admin/);
  assert.match(platformAccess, /PLATFORM_ADMIN_PERMISSION = "platform\.admin"/);
  assert.match(platformAccess, /eq\(platformAdmins\.status, "active"\)/);
  assert.match(platformAccess, /runtimeEnv\("BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256"\)/);
  assert.doesNotMatch(platformAccess, /if\s*\([^)]*email\s*===\s*["'][^"']+@/i);

  const database = await migratedDatabase();
  const owner = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES ('owner@test', 'owner@test', 'Owner') RETURNING id
  `).get() as { id: number };
  const operator = database.prepare(`
    INSERT INTO accounts (chatgpt_email, app_email, first_name) VALUES ('operator@test', 'operator@test', 'Operator') RETURNING id
  `).get() as { id: number };
  const workspace = database.prepare(`INSERT INTO workspaces (name, created_by_account_id) VALUES ('Test', ?) RETURNING id`).get(owner.id) as { id: number };
  const venue = database.prepare(`INSERT INTO venues (workspace_id, data_account_id, created_by_account_id) VALUES (?, ?, ?) RETURNING id`).get(workspace.id, owner.id, owner.id) as { id: number };
  database.prepare(`INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'owner')`).run(venue.id, owner.id);
  database.prepare(`INSERT INTO venue_memberships (venue_id, account_id, role) VALUES (?, ?, 'shift_manager')`).run(venue.id, operator.id);
  database.prepare(`INSERT INTO platform_admins (account_id, permissions_json) VALUES (?, '["platform.admin"]')`).run(operator.id);

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admins WHERE account_id = ?").get(owner.id)?.count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM platform_admins WHERE account_id = ?").get(operator.id)?.count, 1);
  assert.equal(database.prepare("SELECT role FROM venue_memberships WHERE account_id = ?").get(operator.id)?.role, "shift_manager");
  database.close();
});

test("admin routes authorize on the backend and expose no venue navigation or mutation surface", async () => {
  const [page, endpoint, claim, client, css, bootstrapClient, bridgeClient, data, auth, serverSession, integrationsClient] = await Promise.all([
    source("app/admin/route.ts"),
    source("app/api/admin/[section]/route.ts"),
    source("app/api/admin/claim/route.ts"),
    source("public/admin-v175.js"),
    source("public/admin-v175.css"),
    source("public/admin-bootstrap-v176.js"),
    source("public/admin-session-bridge-v176.js"),
    source("lib/bardoctor/internal-admin-data.ts"),
    source("lib/bardoctor/auth.ts"),
    source("app/api/auth/server-session/route.ts"),
    source("public/integrations.js"),
  ]);
  assert.match(page, /internalAdminRouteState\(request\)/);
  assert.match(page, /status: 404/);
  assert.match(page, /Content-Security-Policy/);
  assert.match(page, /Internal Admin v2/);
  assert.match(page, /Обзор/);
  assert.match(page, /Пользователи/);
  assert.match(page, /Заведения/);
  assert.match(page, /Интеграции/);
  assert.match(page, /AI/);
  assert.match(page, /Push/);
  assert.match(page, /Система/);
  assert.match(page, /Журнал/);
  assert.doesNotMatch(page, /Главная\s*\/\s*Смены|mobile-bottom-nav|bottom-navigation/);
  assert.match(endpoint, /authenticatePlatformAdmin\(request\)/);
  assert.match(endpoint, /if \(!platformAdmin\) return adminForbidden\(\)/);
  assert.doesNotMatch(endpoint, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(claim, /claimInitialPlatformAdmin\(request\)/);
  assert.match(page, /admin-bootstrap-v176\.js/);
  assert.match(page, /admin-session-bridge-v176\.js/);
  assert.match(client, /function esc\(value\)/);
  assert.match(client, /credentials: "same-origin"/);
  assert.match(client, /data-label=/);
  assert.match(client, /sequence !== state\.sequence/);
  assert.match(client, /errorGroups/);
  assert.match(css, /\.admin-table thead\{display:none\}/);
  assert.match(css, /overflow-x:hidden/);
  assert.match(css, /\.admin-table td:before\{content:attr\(data-label\)/);
  assert.doesNotMatch(client, /renderActivation|data-admin-bootstrap/);
  assert.match(bootstrapClient, /\/api\/admin\/claim/);
  assert.doesNotMatch(bootstrapClient, /dashboard|users|venues|integrations|\/api\/admin\/session/i);
  assert.match(bridgeClient, /\/api\/auth\/server-session/);
  assert.doesNotMatch(bridgeClient, /\/api\/admin\/claim|BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256/);
  assert.match(auth, /bd_server_session/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.match(auth, /A partial header pair is invalid and must never fall back to the cookie/);
  assert.match(serverSession, /synchronizeServerSession\(request\)/);
  assert.match(serverSession, /sessionResponse\(/);
  assert.match(data, /ai_usage_events/);
  assert.match(data, /totalTokens/);
  assert.match(data, /estimatedCost: null/);
  assert.match(data, /coverage: "partial"/);
  assert.doesNotMatch(data, /password_hash|password_salt|token_hash|encrypted_value/);
  assert.doesNotMatch(client, /OPENAI_API_KEY|ONESIGNAL_REST_API_KEY|BARDOCTOR_SECRETS_KEY/);
  assert.doesNotMatch(integrationsClient, /В этом месяце использовано|Осталось:|data\.aiUsage/);
});

test("Internal Admin v2 observability and durable push scheduling are additive", async () => {
  const [schema, migration, aiUsage, jobs, worker] = await Promise.all([
    source("db/schema.ts"),
    source("drizzle/0018_gigantic_arachne.sql"),
    source("lib/bardoctor/ai-usage.ts"),
    source("lib/bardoctor/notification-jobs.ts"),
    source("worker/index.ts"),
  ]);
  assert.match(schema, /aiUsageEvents = sqliteTable/);
  assert.match(schema, /notificationJobs = sqliteTable/);
  assert.match(schema, /notificationJobEvents = sqliteTable/);
  assert.match(migration, /CREATE TABLE `ai_usage_events`/);
  assert.match(migration, /CREATE TABLE `notification_jobs`/);
  assert.match(migration, /CREATE TABLE `notification_job_events`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `/);
  assert.match(aiUsage, /prompt and response bodies are never stored/);
  assert.match(jobs, /idempotency|dedupe_key|ON CONFLICT\(account_id, dedupe_key\)/i);
  assert.match(jobs, /status='dispatching'/);
  assert.match(worker, /runNotificationTriggers/);
  assert.match(worker, /async scheduled/);
});

test("admin audit is separate and sensitive bootstrap is CSRF- and rate-limit guarded", async () => {
  const [platformAccess, schema, venueAudit] = await Promise.all([
    source("lib/bardoctor/platform-admin.ts"),
    source("db/schema.ts"),
    source("lib/bardoctor/data-trust.ts"),
  ]);
  assert.match(platformAccess, /sameOrigin\(request\)/);
  assert.match(platformAccess, /x-admin-intent/);
  assert.match(platformAccess, /consumeSensitiveAction/);
  assert.match(platformAccess, /platform_admin_rate_limits/);
  assert.match(platformAccess, /recordPlatformAdminAudit/);
  assert.match(platformAccess, /isPlatformAdminBootstrapAccount\(request, account\)/);
  assert.match(platformAccess, /onConflictDoNothing\(\{ target: platformAdmins\.accountId \}\)/);
  assert.match(schema, /platformAdminAudit = sqliteTable\(\s*"platform_admin_audit"/s);
  assert.doesNotMatch(venueAudit, /platform_admin_audit/);
});

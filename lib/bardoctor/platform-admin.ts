import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "../../db";
import {
  accounts,
  platformAdminAudit,
  platformAdmins,
  type Account,
  type PlatformAdmin,
} from "../../db/schema";
import {
  authenticateIdentityRequest,
  getChatGPTEmail,
  normalizeEmail,
} from "./auth";
import { runtimeEnv } from "./runtime-env";

export const PLATFORM_ADMIN_PERMISSION = "platform.admin" as const;

export type AuthenticatedPlatformAdmin = {
  account: Account;
  admin: PlatformAdmin;
  permissions: string[];
};

function permissions(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function hasPlatformAdminPermission(row: PlatformAdmin): boolean {
  return row.status === "active" && permissions(row.permissionsJson).includes(PLATFORM_ADMIN_PERMISSION);
}

async function adminForAccount(account: Account): Promise<AuthenticatedPlatformAdmin | null> {
  const [admin] = await getDb()
    .select()
    .from(platformAdmins)
    .where(and(eq(platformAdmins.accountId, account.id), eq(platformAdmins.status, "active")))
    .limit(1);
  if (!admin || !hasPlatformAdminPermission(admin)) return null;
  return { account, admin, permissions: permissions(admin.permissionsJson) };
}

async function adminForChatGPTIdentity(request: Request): Promise<AuthenticatedPlatformAdmin | null> {
  const identity = getChatGPTEmail(request);
  if (!identity) return null;
  const [row] = await getDb()
    .select({ account: accounts, admin: platformAdmins })
    .from(platformAdmins)
    .innerJoin(accounts, eq(platformAdmins.accountId, accounts.id))
    .where(and(
      eq(platformAdmins.status, "active"),
      eq(accounts.accountKind, "user"),
      eq(accounts.chatgptEmail, normalizeEmail(identity)),
    ))
    .limit(1);
  if (!row || !hasPlatformAdminPermission(row.admin)) return null;
  return { account: row.account, admin: row.admin, permissions: permissions(row.admin.permissionsJson) };
}

export async function authenticatePlatformAdmin(
  request: Request,
): Promise<AuthenticatedPlatformAdmin | null> {
  const sessionAccount = await authenticateIdentityRequest(request);
  if (sessionAccount) {
    const sessionAdmin = await adminForAccount(sessionAccount);
    if (sessionAdmin) return sessionAdmin;
  }
  return adminForChatGPTIdentity(request);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function isPlatformAdminBootstrapAccount(
  request: Request,
  account: Account,
): Promise<boolean> {
  const expectedHash = runtimeEnv("BARDOCTOR_PLATFORM_ADMIN_IDENTITY_SHA256")?.toLowerCase();
  if (!expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const forwardedIdentity = getChatGPTEmail(request);
  // When the trusted dispatch identity is present it must agree with the
  // authenticated BarDoctor account. A client-supplied mismatch can only deny.
  if (
    forwardedIdentity
    && normalizeEmail(forwardedIdentity) !== normalizeEmail(account.chatgptEmail)
  ) return false;
  return constantTimeEqual(
    await sha256Hex(normalizeEmail(account.chatgptEmail)),
    expectedHash,
  );
}

export async function internalAdminRouteState(
  request: Request,
): Promise<"admin" | "bootstrap" | "denied"> {
  if (await authenticatePlatformAdmin(request)) return "admin";
  const account = await authenticateIdentityRequest(request);
  if (!account) return "denied";
  return await isPlatformAdminBootstrapAccount(request, account) ? "bootstrap" : "denied";
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function consumeSensitiveAction(
  accountId: number,
  action: string,
  limit = 5,
  windowMs = 15 * 60 * 1_000,
): Promise<boolean> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff = new Date(now.valueOf() - windowMs).toISOString();
  const key = `${action}:${accountId}`;
  const row = await getD1().prepare(`
    INSERT INTO platform_admin_rate_limits (
      key, account_id, action, window_started_at, request_count, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      window_started_at = CASE
        WHEN platform_admin_rate_limits.window_started_at < ? THEN excluded.window_started_at
        ELSE platform_admin_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN platform_admin_rate_limits.window_started_at < ? THEN 1
        ELSE platform_admin_rate_limits.request_count + 1
      END,
      updated_at = excluded.updated_at
    RETURNING request_count
  `).bind(key, accountId, action, nowIso, nowIso, cutoff, cutoff)
    .first<{ request_count: number }>();
  return Boolean(row && row.request_count <= limit);
}

export async function recordPlatformAdminAudit(input: {
  adminAccountId: number;
  action: string;
  targetType: string;
  targetId?: string | number | null;
  before?: unknown;
  after?: unknown;
  result: "success" | "denied" | "failed";
  reason?: string | null;
  requestId?: string;
}): Promise<void> {
  await getDb().insert(platformAdminAudit).values({
    adminAccountId: input.adminAccountId,
    action: input.action.slice(0, 120),
    targetType: input.targetType.slice(0, 80),
    targetId: input.targetId == null ? null : String(input.targetId).slice(0, 160),
    beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === undefined ? null : JSON.stringify(input.after),
    result: input.result,
    reason: input.reason?.slice(0, 500) || null,
    requestId: input.requestId ?? crypto.randomUUID(),
  });
}

export async function claimInitialPlatformAdmin(request: Request): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  const account = await authenticateIdentityRequest(request);
  if (!account) return { ok: false, status: 401, error: "Необходим вход в BarDoctor" };
  if (!sameOrigin(request) || request.headers.get("x-admin-intent") !== "claim-platform-admin") {
    return { ok: false, status: 403, error: "Запрос активации отклонён" };
  }
  if (!await consumeSensitiveAction(account.id, "platform-admin-claim")) {
    return { ok: false, status: 429, error: "Слишком много попыток. Повторите позже" };
  }
  if (!await isPlatformAdminBootstrapAccount(request, account)) {
    return { ok: false, status: 403, error: "Эта учётная запись не назначена оператором платформы" };
  }

  const existing = await adminForAccount(account);
  if (existing) return { ok: true, status: 200 };
  const count = await getD1().prepare(`
    SELECT COUNT(*) AS count FROM platform_admins WHERE status = 'active'
  `).first<{ count: number }>();
  if ((count?.count ?? 0) > 0) {
    return { ok: false, status: 409, error: "Первичная активация уже завершена" };
  }

  const now = new Date().toISOString();
  const inserted = await getDb().insert(platformAdmins).values({
    accountId: account.id,
    permissionsJson: JSON.stringify([PLATFORM_ADMIN_PERMISSION]),
    status: "active",
    provisionedBy: "verified_identity_bootstrap",
    mfaRequired: false,
    updatedAt: now,
  }).onConflictDoNothing({ target: platformAdmins.accountId }).returning({
    accountId: platformAdmins.accountId,
  });
  if (!inserted.length) {
    return await adminForAccount(account)
      ? { ok: true, status: 200 }
      : { ok: false, status: 409, error: "Первичная активация уже завершена" };
  }
  await recordPlatformAdminAudit({
    adminAccountId: account.id,
    action: "platform_admin.grant",
    targetType: "account",
    targetId: account.id,
    after: { permissions: [PLATFORM_ADMIN_PERMISSION], status: "active" },
    result: "success",
    reason: "Initial verified platform-owner provisioning",
  });
  return { ok: true, status: 201 };
}

export function adminForbidden(): Response {
  return Response.json(
    { ok: false, code: "PLATFORM_ADMIN_REQUIRED", error: "Доступ запрещён" },
    { status: 403, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

export function adminJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

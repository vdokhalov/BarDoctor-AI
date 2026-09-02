import { getD1 } from "../../db";
import { normalizeAccountEmail } from "./account-identity";
import { progressiveBackoffSeconds } from "./auth-rate-limit-policy";

export type AuthRateLimitAction =
  | "login"
  | "register"
  | "invitation"
  | "password-reset"
  | "auth-bootstrap"
  | "session-exchange";

type LimitPolicy = {
  attempts: number;
  sourceAttempts: number;
  windowMs: number;
};

const POLICIES: Record<AuthRateLimitAction, LimitPolicy> = {
  login: { attempts: 8, sourceAttempts: 40, windowMs: 15 * 60_000 },
  register: { attempts: 5, sourceAttempts: 20, windowMs: 30 * 60_000 },
  invitation: { attempts: 5, sourceAttempts: 20, windowMs: 30 * 60_000 },
  "password-reset": { attempts: 5, sourceAttempts: 20, windowMs: 30 * 60_000 },
  "auth-bootstrap": { attempts: 8, sourceAttempts: 30, windowMs: 15 * 60_000 },
  "session-exchange": { attempts: 8, sourceAttempts: 30, windowMs: 15 * 60_000 },
};

type BucketScope = "identity" | "source" | "combined";

export type AuthRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function sourceForRequest(request: Request): string {
  // Cloudflare overwrites cf-connecting-ip. Do not trust a client-controlled
  // X-Forwarded-For chain as an independent security identity.
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "source-unavailable";
}

function normalizedIdentity(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? normalizeAccountEmail(trimmed) : trimmed.toLowerCase();
}

async function bucketKey(
  action: AuthRateLimitAction,
  scope: BucketScope,
  value: string,
): Promise<string> {
  return `${action}:${scope}:${await fingerprint(`${action}\u0000${scope}\u0000${value}`)}`;
}

async function consumeBucket(input: {
  action: AuthRateLimitAction;
  scope: BucketScope;
  value: string;
  limit: number;
  windowMs: number;
  now: Date;
}): Promise<AuthRateLimitResult> {
  const nowIso = input.now.toISOString();
  const cutoff = new Date(input.now.valueOf() - input.windowMs).toISOString();
  const key = await bucketKey(input.action, input.scope, input.value);
  const row = await getD1().prepare(`
    INSERT INTO auth_rate_limits (
      key, action, scope, window_started_at, request_count, updated_at
    ) VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      window_started_at = CASE
        WHEN auth_rate_limits.window_started_at < ? THEN excluded.window_started_at
        ELSE auth_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN auth_rate_limits.window_started_at < ? THEN 1
        ELSE auth_rate_limits.request_count + 1
      END,
      updated_at = excluded.updated_at
    RETURNING request_count, window_started_at
  `).bind(
    key,
    input.action,
    input.scope,
    nowIso,
    nowIso,
    cutoff,
    cutoff,
  ).first<{ request_count: number; window_started_at: string }>();

  if (!row) throw new Error("AUTH_RATE_LIMIT_WRITE_FAILED");
  const overLimitBy = row.request_count - input.limit;
  const windowSeconds = Math.max(1, Math.ceil(input.windowMs / 1_000));
  return {
    allowed: overLimitBy <= 0,
    retryAfterSeconds: progressiveBackoffSeconds(overLimitBy, windowSeconds),
  };
}

export async function consumeAuthRateLimit(
  request: Request,
  action: AuthRateLimitAction,
  identifier: string,
  now = new Date(),
): Promise<AuthRateLimitResult> {
  const policy = POLICIES[action];
  const identity = normalizedIdentity(identifier || "anonymous");
  const source = sourceForRequest(request);
  const buckets = await Promise.all([
    consumeBucket({ action, scope: "identity", value: identity, limit: policy.attempts, windowMs: policy.windowMs, now }),
    consumeBucket({ action, scope: "source", value: source, limit: policy.sourceAttempts, windowMs: policy.windowMs, now }),
    consumeBucket({ action, scope: "combined", value: `${identity}\u0000${source}`, limit: policy.attempts, windowMs: policy.windowMs, now }),
  ]);
  return {
    allowed: buckets.every((bucket) => bucket.allowed),
    retryAfterSeconds: Math.max(...buckets.map((bucket) => bucket.retryAfterSeconds)),
  };
}

export async function clearSuccessfulAuthLimit(
  request: Request,
  action: AuthRateLimitAction,
  identifier: string,
): Promise<void> {
  const identity = normalizedIdentity(identifier || "anonymous");
  const source = sourceForRequest(request);
  const keys = await Promise.all([
    bucketKey(action, "identity", identity),
    bucketKey(action, "combined", `${identity}\u0000${source}`),
  ]);
  await getD1().prepare(`DELETE FROM auth_rate_limits WHERE key IN (?, ?)`).bind(...keys).run();
}

export function authRateLimitedResponse(result: AuthRateLimitResult): Response {
  return Response.json(
    {
      ok: false,
      code: "AUTH_RATE_LIMITED",
      error: "Слишком много попыток. Подождите и повторите позже.",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, result.retryAfterSeconds)),
      },
    },
  );
}

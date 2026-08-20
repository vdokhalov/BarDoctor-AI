import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { accounts, domainData, type Account } from "../../db/schema";
import { getChatGPTEmail, normalizeEmail } from "./auth";
import { ALLOWED_STORE_KEYS, LEGACY_REPLIT_ORIGIN } from "./constants";
import { runtimeEnv } from "./runtime-env";
import { canImportLegacyAccount } from "./account-identity";

type LegacyAuthResult = {
  ok: true;
  email: string;
  userId: number;
  token: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string | null;
};

type LegacyUser = {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  phone?: string | null;
  role?: string;
};

type JsonRecord = Record<string, unknown>;

type LegacyJsonResult = {
  status: number;
  data: unknown;
};

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" ? (value as JsonRecord) : null;
}

function legacyOrigin(): string {
  const configured = runtimeEnv("LEGACY_REPLIT_ORIGIN");
  if (!configured) return LEGACY_REPLIT_ORIGIN;
  try {
    const url = new URL(configured);
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol === "https:"
      && (hostname.endsWith(".replit.dev") || hostname.endsWith(".replit.app"))
    ) {
      return url.origin;
    }
  } catch {
    // Ignore an invalid override and retain the last known safe Replit origin.
  }
  return LEGACY_REPLIT_ORIGIN;
}

async function legacyJson(
  path: string,
  init: RequestInit = {},
): Promise<LegacyJsonResult> {
  const response = await fetch(`${legacyOrigin()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function wakeLegacyApp(): Promise<void> {
  try {
    const response = await fetch(`${legacyOrigin()}/`, {
      cache: "no-store",
      redirect: "follow",
      headers: { accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(30_000),
    });
    await response.body?.cancel().catch(() => undefined);
  } catch {
    // A failed wake request is handled by the following authenticated retry.
  }
}

function legacyAuthHeaders(email: string, token: string): HeadersInit {
  return {
    "X-Session-Email": normalizeEmail(email),
    "X-Session-Token": token,
  };
}

export async function authenticateLegacyPassword(
  email: string,
  password: string,
): Promise<LegacyAuthResult | { ok: false; error: string; status: number }> {
  const request = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  } satisfies RequestInit;

  let result: LegacyJsonResult;
  try {
    result = await legacyJson("/api/auth/login", request);
    const firstPayload = asRecord(result.data);
    const looksOffline = !firstPayload || result.status === 404 || result.status >= 500;
    if (looksOffline) {
      await wakeLegacyApp();
      result = await legacyJson("/api/auth/login", request);
    }
  } catch {
    return {
      ok: false,
      error: "Резерв Replit сейчас не запущен или его временная ссылка изменилась",
      status: 502,
    };
  }

  const data = asRecord(result.data);
  if (result.status >= 200 && result.status < 300 && data?.ok === true) {
    return data as LegacyAuthResult;
  }

  return {
    ok: false,
    error:
      typeof data?.error === "string"
        ? data.error
        : "Резерв Replit сейчас не запущен или его временная ссылка изменилась",
    status: result.status || 502,
  };
}

async function optionalLegacyJson(
  path: string,
  headers: HeadersInit,
): Promise<JsonRecord | null> {
  try {
    const result = await legacyJson(path, { headers });
    return result.status >= 200 && result.status < 300 ? asRecord(result.data) : null;
  } catch {
    return null;
  }
}

export async function importLegacyAccount(input: {
  request: Request;
  email: string;
  token: string;
  loginProfile?: Partial<LegacyAuthResult>;
}): Promise<Account> {
  const appEmail = normalizeEmail(input.email);
  const chatgptEmail = getChatGPTEmail(input.request);
  if (!chatgptEmail || !canImportLegacyAccount(chatgptEmail, appEmail)) {
    throw new Error("LEGACY_IDENTITY_MISMATCH");
  }
  const headers = legacyAuthHeaders(appEmail, input.token);

  const userResult = await legacyJson("/api/users/me", { headers });
  const userPayload = asRecord(userResult.data);
  if (userResult.status !== 200 || userPayload?.ok !== true || !userPayload.user) {
    throw new Error("LEGACY_AUTH_INVALID");
  }

  const [restaurantResult, storeResult, competitorsResult, reviewSourcesResult] =
    await Promise.all([
      optionalLegacyJson("/api/restaurants/me", headers),
      optionalLegacyJson("/api/store", headers),
      optionalLegacyJson("/api/competitors/me", headers),
      optionalLegacyJson("/api/reviews/sources", headers),
    ]);

  const legacyUser = userPayload.user as LegacyUser;
  const now = new Date().toISOString();
  const userValues = {
    chatgptEmail,
    appEmail,
    firstName: legacyUser.firstName ?? input.loginProfile?.firstName ?? "",
    lastName: legacyUser.lastName ?? input.loginProfile?.lastName ?? null,
    phone: legacyUser.phone ?? input.loginProfile?.phone ?? null,
    role: legacyUser.role ?? input.loginProfile?.role ?? "owner",
    restaurantJson: restaurantResult?.restaurant
      ? JSON.stringify(restaurantResult.restaurant)
      : null,
    competitorsJson: competitorsResult?.ok === true ? JSON.stringify(competitorsResult) : null,
    reviewSourcesJson: reviewSourcesResult?.success === true
      ? JSON.stringify(reviewSourcesResult)
      : null,
    migrationStatus: "imported",
    importedAt: now,
    updatedAt: now,
  };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.appEmail, appEmail))
    .limit(1);

  let account: Account;
  if (existing) {
    await db.update(accounts).set(userValues).where(eq(accounts.id, existing.id));
    account = { ...existing, ...userValues };
  } else {
    const [inserted] = await db.insert(accounts).values(userValues).returning();
    account = inserted;
  }

  const entries = storeResult?.ok === true && storeResult.entries
    ? (storeResult.entries as Record<string, { data: unknown; updatedAt?: string }>)
    : {};

  let importedDomains = 0;
  for (const storeKey of ALLOWED_STORE_KEYS) {
    const entry = entries[storeKey];
    if (!entry) continue;
    await db
      .insert(domainData)
      .values({
        accountId: account.id,
        storeKey,
        dataJson: JSON.stringify(entry.data ?? null),
        updatedAt: entry.updatedAt ?? now,
      })
      .onConflictDoUpdate({
        target: [domainData.accountId, domainData.storeKey],
        set: {
          dataJson: JSON.stringify(entry.data ?? null),
          updatedAt: entry.updatedAt ?? now,
        },
      });
    importedDomains += 1;
  }

  const summary = {
    source: "Replit backup",
    importedAt: now,
    importedDomains,
    restaurant: Boolean(restaurantResult?.restaurant),
    competitors: competitorsResult?.ok === true,
    reviewSources: reviewSourcesResult?.success === true,
  };
  await db
    .update(accounts)
    .set({ migrationSummaryJson: JSON.stringify(summary), updatedAt: now })
    .where(eq(accounts.id, account.id));

  return { ...account, migrationSummaryJson: JSON.stringify(summary) };
}

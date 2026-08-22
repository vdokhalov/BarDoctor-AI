import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import { integrationSecrets, platformSecrets } from "../../db/schema";
import { runtimeEnv } from "./runtime-env";

export const INTEGRATION_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_BASE_URL",
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ONESIGNAL_REST_API_KEY",
] as const;

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export const PLATFORM_INTEGRATION_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "ONESIGNAL_REST_API_KEY",
] as const satisfies readonly IntegrationKey[];

export type PlatformIntegrationKey = (typeof PLATFORM_INTEGRATION_KEYS)[number];
export type IntegrationStatus = "environment" | "platform_store" | "secure_store" | "missing";

export class IntegrationSecretError extends Error {
  constructor(
    message: string,
    readonly status = 503,
  ) {
    super(message);
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function encryptionKey(): Promise<CryptoKey> {
  const master = runtimeEnv("BARDOCTOR_SECRETS_KEY");
  if (!master) {
    throw new IntegrationSecretError(
      "Защищённое хранилище интеграций ещё не подготовлено.",
    );
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(master));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function additionalData(accountId: number, key: IntegrationKey): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`bardoctor:${accountId}:${key}:v1`);
}

function platformAdditionalData(key: PlatformIntegrationKey): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`bardoctor:platform:${key}:v1`);
}

export function isPlatformIntegrationKey(key: IntegrationKey): key is PlatformIntegrationKey {
  return (PLATFORM_INTEGRATION_KEYS as readonly IntegrationKey[]).includes(key);
}

async function encryptValue(
  accountId: number,
  key: IntegrationKey,
  value: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(accountId, key) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptValue(
  accountId: number,
  key: IntegrationKey,
  value: string,
): Promise<string> {
  const [version, iv, payload] = value.split(".");
  if (version !== "v1" || !iv || !payload) {
    throw new IntegrationSecretError("Сохранённая настройка интеграции повреждена.", 500);
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(iv),
        additionalData: additionalData(accountId, key),
      },
      await encryptionKey(),
      base64UrlToBytes(payload),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new IntegrationSecretError(
      "Не удалось расшифровать настройки. Сохраните ключи интеграций заново.",
      500,
    );
  }
}

async function encryptPlatformValue(
  key: PlatformIntegrationKey,
  value: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: platformAdditionalData(key) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptPlatformValue(
  key: PlatformIntegrationKey,
  value: string,
): Promise<string> {
  const [version, iv, payload] = value.split(".");
  if (version !== "v1" || !iv || !payload) {
    throw new IntegrationSecretError("Сохранённая серверная настройка повреждена.", 500);
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(iv),
        additionalData: platformAdditionalData(key),
      },
      await encryptionKey(),
      base64UrlToBytes(payload),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new IntegrationSecretError(
      "Не удалось расшифровать серверные настройки BarDoctor.",
      500,
    );
  }
}

async function migrateLegacyPlatformValue(
  key: PlatformIntegrationKey,
): Promise<string | null> {
  const [legacy] = await getDb()
    .select({
      accountId: integrationSecrets.accountId,
      encryptedValue: integrationSecrets.encryptedValue,
    })
    .from(integrationSecrets)
    .where(eq(integrationSecrets.key, key))
    .orderBy(desc(integrationSecrets.updatedAt), desc(integrationSecrets.id))
    .limit(1);
  if (!legacy) return null;

  const value = await decryptValue(legacy.accountId, key, legacy.encryptedValue);
  const encryptedValue = await encryptPlatformValue(key, value);
  const now = new Date().toISOString();
  await getDb()
    .insert(platformSecrets)
    .values({
      key,
      encryptedValue,
      sourceAccountId: legacy.accountId,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: platformSecrets.key });

  const [stored] = await getDb()
    .select({ encryptedValue: platformSecrets.encryptedValue })
    .from(platformSecrets)
    .where(eq(platformSecrets.key, key))
    .limit(1);
  return stored ? decryptPlatformValue(key, stored.encryptedValue) : value;
}

export async function getPlatformIntegrationValue(
  key: PlatformIntegrationKey,
): Promise<string | null> {
  const environmentValue = runtimeEnv(key);
  if (environmentValue) return environmentValue;

  const [stored] = await getDb()
    .select({ encryptedValue: platformSecrets.encryptedValue })
    .from(platformSecrets)
    .where(eq(platformSecrets.key, key))
    .limit(1);
  if (stored) return decryptPlatformValue(key, stored.encryptedValue);

  return migrateLegacyPlatformValue(key);
}

export async function getIntegrationValue(
  accountId: number,
  key: IntegrationKey,
): Promise<string | null> {
  if (isPlatformIntegrationKey(key)) return getPlatformIntegrationValue(key);

  const environmentValue = runtimeEnv(key);
  if (environmentValue) return environmentValue;

  const [row] = await getDb()
    .select({ encryptedValue: integrationSecrets.encryptedValue })
    .from(integrationSecrets)
    .where(and(eq(integrationSecrets.accountId, accountId), eq(integrationSecrets.key, key)))
    .limit(1);
  return row ? decryptValue(accountId, key, row.encryptedValue) : null;
}

export async function saveIntegrationValue(
  accountId: number,
  key: IntegrationKey,
  value: string,
): Promise<void> {
  if (isPlatformIntegrationKey(key)) {
    throw new IntegrationSecretError(
      "Эта интеграция настраивается централизованно BarDoctor.",
      403,
    );
  }
  const normalized = value.trim();
  if (!normalized) throw new IntegrationSecretError("Пустое значение нельзя сохранить.", 400);
  const encryptedValue = await encryptValue(accountId, key, normalized);
  const now = new Date().toISOString();
  await getDb()
    .insert(integrationSecrets)
    .values({ accountId, key, encryptedValue, updatedAt: now })
    .onConflictDoUpdate({
      target: [integrationSecrets.accountId, integrationSecrets.key],
      set: { encryptedValue, updatedAt: now },
    });
}

export async function deleteIntegrationValues(
  accountId: number,
  keys: IntegrationKey[],
): Promise<void> {
  if (keys.length === 0) return;
  await getDb()
    .delete(integrationSecrets)
    .where(
      and(
        eq(integrationSecrets.accountId, accountId),
        inArray(integrationSecrets.key, keys),
      ),
    );
}

export async function integrationStatus(
  accountId: number,
  keys: IntegrationKey[],
): Promise<Record<IntegrationKey, IntegrationStatus>> {
  const accountKeys = keys.filter((key) => !isPlatformIntegrationKey(key));
  const rows = accountKeys.length
    ? await getDb()
        .select({ key: integrationSecrets.key })
        .from(integrationSecrets)
        .where(
          and(
            eq(integrationSecrets.accountId, accountId),
            inArray(integrationSecrets.key, accountKeys),
          ),
        )
    : [];
  const stored = new Set(rows.map((row) => row.key));
  const platformStatus = new Map<PlatformIntegrationKey, IntegrationStatus>(
    await Promise.all(
      PLATFORM_INTEGRATION_KEYS.map(async (key): Promise<[PlatformIntegrationKey, IntegrationStatus]> => [
        key,
        runtimeEnv(key)
          ? "environment" as const
          : await getPlatformIntegrationValue(key)
            ? "platform_store" as const
            : "missing" as const,
      ]),
    ),
  );
  return Object.fromEntries(
    INTEGRATION_KEYS.map((key) => [
      key,
      isPlatformIntegrationKey(key)
        ? platformStatus.get(key) ?? "missing"
        : runtimeEnv(key)
          ? "environment"
          : stored.has(key)
            ? "secure_store"
            : "missing",
    ]),
  ) as Record<IntegrationKey, IntegrationStatus>;
}

export async function integrationEncryptionKey(): Promise<CryptoKey> {
  return encryptionKey();
}

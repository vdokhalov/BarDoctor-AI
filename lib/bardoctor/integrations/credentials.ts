import { getD1 } from "../../../db";
import { IntegrationSecretError, integrationEncryptionKey } from "../integration-secrets";
import type { TenantContext } from "./repository";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function aad(tenant: Pick<TenantContext, "id" | "venueId">, connectionId: string, key: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `bardoctor:connector:${tenant.venueId}:${tenant.id}:${connectionId}:${key}:v1`,
  );
}

async function encrypt(
  tenant: Pick<TenantContext, "id" | "venueId">,
  connectionId: string,
  key: string,
  value: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(tenant, connectionId, key) },
    await integrationEncryptionKey(),
    new TextEncoder().encode(value),
  );
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decrypt(
  tenant: Pick<TenantContext, "id" | "venueId">,
  connectionId: string,
  key: string,
  value: string,
): Promise<string> {
  const [version, iv, payload] = value.split(".");
  if (version !== "v1" || !iv || !payload) throw new IntegrationSecretError("Credential повреждён.", 500);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(iv), additionalData: aad(tenant, connectionId, key) },
      await integrationEncryptionKey(),
      fromBase64Url(payload),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new IntegrationSecretError("Не удалось расшифровать credential подключения.", 500);
  }
}

/** Server-only credential write. Plaintext is never returned by hub APIs. */
export async function rotateConnectorCredential(input: {
  tenant: TenantContext;
  connectionId: string;
  key: string;
  value: string;
}): Promise<void> {
  const key = input.key.trim().slice(0, 100);
  const value = input.value.trim();
  if (!key || value.length < 16 || value.length > 16_000) {
    throw new IntegrationSecretError("Некорректный credential подключения.", 400);
  }
  const encryptedValue = await encrypt(input.tenant, input.connectionId, key, value);
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_credentials (
      id, venue_id, data_account_id, connection_id, key, encrypted_value,
      rotated_at, revoked_at, created_at, updated_at
    )
    SELECT ?, ?, ?, id, ?, ?, ?, NULL, ?, ?
    FROM integration_connections
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
    ON CONFLICT(venue_id, data_account_id, connection_id, key)
    DO UPDATE SET encrypted_value = excluded.encrypted_value,
      rotated_at = excluded.rotated_at, revoked_at = NULL, updated_at = excluded.updated_at
  `).bind(
    crypto.randomUUID(),
    input.tenant.venueId,
    input.tenant.id,
    key,
    encryptedValue,
    now,
    now,
    now,
    input.connectionId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
}

export async function connectorCredential(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  key: string;
}): Promise<string | null> {
  const row = await getD1().prepare(`
    SELECT encrypted_value FROM integration_credentials
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ? AND key = ?
      AND revoked_at IS NULL
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.key,
  ).first<{ encrypted_value: string }>();
  return row ? decrypt(input.tenant, input.connectionId, input.key, row.encrypted_value) : null;
}

export async function revokeConnectorCredentials(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_credentials SET revoked_at = ?, updated_at = ?
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
  `).bind(now, now, input.tenant.venueId, input.tenant.id, input.connectionId).run();
}


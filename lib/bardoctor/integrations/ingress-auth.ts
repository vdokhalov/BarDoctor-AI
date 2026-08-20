import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../db";
import { accounts, type Account } from "../../../db/schema";
import type { IntegrationEntityType, PullCursor } from "./contracts";
import {
  connectionForTenant,
  type IntegrationConnectionRow,
  type TenantContext,
} from "./repository";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function integrationPayloadHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function randomToken(prefix: "live" | "local"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const secret = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `bd_${prefix}_${secret}`;
}

export type IngressTokenMetadata = {
  id: string;
  connection_id: string;
  label: string;
  token_prefix: string;
  scopes_json: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export async function issueIngressToken(input: {
  tenant: TenantContext;
  connectionId: string;
  label: string;
  scopes: readonly IntegrationEntityType[];
  kind: "live" | "local";
  expiresAt?: string;
}): Promise<{ token: string; metadata: IngressTokenMetadata }> {
  const connection = await connectionForTenant(input.tenant, input.connectionId);
  if (!connection) throw new Error("INTEGRATION_CONNECTION_NOT_FOUND");
  const token = randomToken(input.kind);
  const tokenHash = await integrationPayloadHash(token);
  const tokenPrefix = token.slice(0, 15);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_ingress_tokens (
      id, venue_id, data_account_id, connection_id, label, token_prefix,
      token_hash, scopes_json, expires_at, created_by_account_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.label.trim().slice(0, 140) || "Ключ интеграции",
    tokenPrefix,
    tokenHash,
    JSON.stringify([...new Set(input.scopes)]),
    input.expiresAt ?? null,
    input.tenant.actorAccountId,
    now,
    now,
  ).run();
  const metadata = await getD1().prepare(`
    SELECT id, connection_id, label, token_prefix, scopes_json, last_used_at,
      expires_at, revoked_at, created_at
    FROM integration_ingress_tokens
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(id, input.tenant.venueId, input.tenant.id).first<IngressTokenMetadata>();
  if (!metadata) throw new Error("INTEGRATION_TOKEN_CREATE_FAILED");
  return { token, metadata };
}

export async function listIngressTokens(
  tenant: Pick<TenantContext, "id" | "venueId">,
): Promise<IngressTokenMetadata[]> {
  const result = await getD1().prepare(`
    SELECT id, connection_id, label, token_prefix, scopes_json, last_used_at,
      expires_at, revoked_at, created_at
    FROM integration_ingress_tokens
    WHERE venue_id = ? AND data_account_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(tenant.venueId, tenant.id).all<IngressTokenMetadata>();
  return result.results ?? [];
}

export async function revokeIngressTokens(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  tokenId?: string;
}): Promise<number> {
  const now = new Date().toISOString();
  const result = input.tokenId
    ? await getD1().prepare(`
        UPDATE integration_ingress_tokens SET revoked_at = ?, updated_at = ?
        WHERE id = ? AND connection_id = ? AND venue_id = ? AND data_account_id = ?
      `).bind(
        now,
        now,
        input.tokenId,
        input.connectionId,
        input.tenant.venueId,
        input.tenant.id,
      ).run()
    : await getD1().prepare(`
        UPDATE integration_ingress_tokens SET revoked_at = ?, updated_at = ?
        WHERE connection_id = ? AND venue_id = ? AND data_account_id = ?
          AND revoked_at IS NULL
      `).bind(
        now,
        now,
        input.connectionId,
        input.tenant.venueId,
        input.tenant.id,
      ).run();
  return Number(result.meta.changes ?? 0);
}

type IngressTokenRow = {
  id: string;
  venue_id: number;
  data_account_id: number;
  connection_id: string;
  scopes_json: string;
  expires_at: string | null;
  adapter_key: string;
  status: string;
  sync_enabled: number;
};

export type IngressAuthorization = {
  tokenId: string;
  tenant: Pick<TenantContext, "id" | "venueId">;
  account: Account;
  connection: IntegrationConnectionRow;
  scopes: IntegrationEntityType[];
};

function bearerToken(request: Request): string {
  const value = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match?.[1]?.slice(0, 300) ?? "";
}

export async function authorizeIngressRequest(request: Request): Promise<IngressAuthorization | null> {
  const token = bearerToken(request);
  if (!/^bd_(?:live|local)_[A-Za-z0-9_-]{30,}$/.test(token)) return null;
  const tokenHash = await integrationPayloadHash(token);
  const now = new Date().toISOString();
  const row = await getD1().prepare(`
    SELECT token.id, token.venue_id, token.data_account_id, token.connection_id,
      token.scopes_json, token.expires_at, connection.adapter_key,
      connection.status, connection.sync_enabled
    FROM integration_ingress_tokens token
    INNER JOIN integration_connections connection
      ON connection.id = token.connection_id
      AND connection.venue_id = token.venue_id
      AND connection.data_account_id = token.data_account_id
    WHERE token.token_hash = ? AND token.revoked_at IS NULL
      AND (token.expires_at IS NULL OR token.expires_at > ?)
      AND connection.status IN ('requires_setup', 'connected', 'error') AND connection.sync_enabled = 1
    LIMIT 1
  `).bind(tokenHash, now).first<IngressTokenRow>();
  if (!row) return null;
  const [account] = await getDb().select().from(accounts).where(eq(accounts.id, row.data_account_id)).limit(1);
  if (!account) return null;
  const tenant = { id: row.data_account_id, venueId: row.venue_id };
  const connection = await connectionForTenant(tenant, row.connection_id);
  if (!connection) return null;
  await getD1().prepare(`
    UPDATE integration_ingress_tokens SET last_used_at = ?, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(now, now, row.id, row.venue_id, row.data_account_id).run();
  let scopes: IntegrationEntityType[] = [];
  try {
    const parsed = JSON.parse(row.scopes_json) as unknown;
    scopes = Array.isArray(parsed) ? parsed as IntegrationEntityType[] : [];
  } catch {
    scopes = [];
  }
  return { tokenId: row.id, tenant, account, connection, scopes };
}

export type DeliveryClaim =
  | { state: "claimed"; lease: string }
  | { state: "duplicate"; runId: string | null }
  | { state: "busy" }
  | { state: "conflict" };

type DeliveryRow = {
  payload_hash: string;
  status: string;
  run_id: string | null;
  attempt_count: number;
  updated_at: string;
};

export async function claimIngressDelivery(input: {
  authorization: IngressAuthorization;
  deliveryId: string;
  payloadHash: string;
}): Promise<DeliveryClaim> {
  const tenant = input.authorization.tenant;
  const connectionId = input.authorization.connection.id;
  const deliveryId = input.deliveryId.trim().slice(0, 180);
  if (!deliveryId) throw new Error("DELIVERY_ID_REQUIRED");
  const database = getD1();
  const existing = await database.prepare(`
    SELECT payload_hash, status, run_id, attempt_count, updated_at FROM integration_ingress_deliveries
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ? AND delivery_id = ?
    LIMIT 1
  `).bind(tenant.venueId, tenant.id, connectionId, deliveryId).first<DeliveryRow>();
  if (existing) {
    if (existing.payload_hash !== input.payloadHash) return { state: "conflict" };
    if (existing.status === "success") return { state: "duplicate", runId: existing.run_id };
    if (existing.status === "processing") {
      const leaseAge = Date.now() - new Date(existing.updated_at).valueOf();
      if (Number.isFinite(leaseAge) && leaseAge < 10 * 60 * 1_000) return { state: "busy" };
    }
    const now = new Date().toISOString();
    const reclaimed = await database.prepare(`
      UPDATE integration_ingress_deliveries
      SET status = 'processing', attempt_count = attempt_count + 1,
        error = NULL, completed_at = NULL, updated_at = ?
      WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
        AND delivery_id = ? AND payload_hash = ? AND updated_at = ?
    `).bind(
      now,
      tenant.venueId,
      tenant.id,
      connectionId,
      deliveryId,
      input.payloadHash,
      existing.updated_at,
    ).run();
    return Number(reclaimed.meta.changes ?? 0) === 1 ? { state: "claimed", lease: now } : { state: "busy" };
  }
  const now = new Date().toISOString();
  const inserted = await database.prepare(`
    INSERT OR IGNORE INTO integration_ingress_deliveries (
      id, venue_id, data_account_id, connection_id, delivery_id,
      payload_hash, status, received_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'processing', ?, ?)
  `).bind(
    crypto.randomUUID(),
    tenant.venueId,
    tenant.id,
    connectionId,
    deliveryId,
    input.payloadHash,
    now,
    now,
  ).run();
  return Number(inserted.meta.changes ?? 0) === 1
    ? { state: "claimed", lease: now }
    : claimIngressDelivery(input);
}

export async function finishIngressDelivery(input: {
  authorization: IngressAuthorization;
  deliveryId: string;
  status: "success" | "failed";
  runId?: string;
  cursor?: PullCursor;
  error?: string;
  lease: string;
}): Promise<void> {
  const tenant = input.authorization.tenant;
  const now = new Date().toISOString();
  const database = getD1();
  const completed = await database.prepare(`
      UPDATE integration_ingress_deliveries
      SET status = ?, run_id = ?, cursor_json = ?, error = ?, completed_at = ?, updated_at = ?
      WHERE venue_id = ? AND data_account_id = ? AND connection_id = ? AND delivery_id = ?
        AND status = 'processing' AND updated_at = ?
    `).bind(
      input.status,
      input.runId ?? null,
      input.cursor ? JSON.stringify(input.cursor).slice(0, 20_000) : null,
      input.error?.slice(0, 1_000) ?? null,
      now,
      now,
      tenant.venueId,
      tenant.id,
      input.authorization.connection.id,
      input.deliveryId.trim().slice(0, 180),
      input.lease,
    ).run();
  if (Number(completed.meta.changes ?? 0) !== 1) return;
  await database.prepare(`
      UPDATE integration_connections
      SET cursor_json = CASE WHEN ? = 'success' AND ? IS NOT NULL THEN ? ELSE cursor_json END,
        last_error = CASE WHEN ? = 'failed' THEN ? ELSE NULL END,
        updated_at = ?
      WHERE id = ? AND venue_id = ? AND data_account_id = ?
    `).bind(
      input.status,
      input.cursor ? 1 : null,
      input.cursor ? JSON.stringify(input.cursor).slice(0, 20_000) : null,
      input.status,
      input.error?.slice(0, 1_000) ?? null,
      now,
      input.authorization.connection.id,
      tenant.venueId,
      tenant.id,
    ).run();
}

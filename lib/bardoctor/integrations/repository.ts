import { getD1 } from "../../../db";
import type { AuthenticatedAccount } from "../access-control";
import {
  INTEGRATION_ENTITY_TYPES,
  type IntegrationChannel,
  type IntegrationConnectionStatus,
  type IntegrationEntityType,
  type IntegrationSourceType,
  type MappingStatus,
  type PullCursor,
  type SyncStatus,
} from "./contracts";
import {
  connectionSourceKey,
  normalizeConnectionConfig,
  sourceTypeFor,
} from "./configuration";

export type TenantContext = Pick<AuthenticatedAccount, "id" | "venueId" | "actorAccountId">;

export type IntegrationConnectionRow = {
  id: string;
  venue_id: number;
  data_account_id: number;
  provider: string;
  adapter_key: string;
  source_key: string;
  source_type: IntegrationSourceType;
  display_name: string;
  channel: string;
  status: string;
  sync_enabled: number;
  capabilities_json: string;
  config_json: string;
  cursor_json: string | null;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationMappingRow = {
  id: string;
  connection_id: string;
  entity_type: string;
  external_id: string;
  external_name: string;
  external_unit: string | null;
  internal_id: string | null;
  internal_name: string | null;
  status: MappingStatus;
  confidence: number;
  reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationEntityLinkRow = {
  id: string;
  external_id: string;
  internal_id: string;
  payload_hash: string;
  external_updated_at: string | null;
  sync_status: string;
  last_sync_run_id: string | null;
};

export type IntegrationSyncRunRow = {
  id: string;
  connection_id: string;
  trigger: string;
  data_type: string;
  status: SyncStatus;
  source_name: string | null;
  received_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  mapping_issue_count: number;
  errors_json: string;
  retry_of_run_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationSyncItemRow = {
  id: string;
  connection_id: string;
  run_id: string;
  entity_type: IntegrationEntityType;
  external_id: string;
  internal_id: string | null;
  status: string;
  payload_hash: string;
  payload_json: string;
  error_code: string | null;
  error_message: string | null;
  mapping_id: string | null;
  created_at: string;
  updated_at: string;
};

function providerKey(value: string): string {
  const result = value.trim().toLocaleLowerCase("ru").replace(/\s+/g, " ").slice(0, 80);
  return result || "file_import";
}

function providerLabel(value: string): string {
  const result = value.trim().slice(0, 100);
  return result || "Файл без указанной системы";
}

/** Every query in this repository binds both venue and data owner. */
export async function ensureFileConnection(
  tenant: TenantContext,
  externalSystem: string,
): Promise<IntegrationConnectionRow> {
  const database = getD1();
  const provider = providerKey(externalSystem);
  const sourceKey = connectionSourceKey({
    adapterKey: "universal-file-v1",
    provider,
    channel: "file",
  });
  const found = await database.prepare(`
    SELECT * FROM integration_connections
    WHERE venue_id = ? AND data_account_id = ? AND adapter_key = ? AND source_key = ?
    LIMIT 1
  `).bind(tenant.venueId, tenant.id, "universal-file-v1", sourceKey).first<IntegrationConnectionRow>();
  if (found) return found;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const config = normalizeConnectionConfig({}, INTEGRATION_ENTITY_TYPES);
  await database.prepare(`
    INSERT OR IGNORE INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, source_key, source_type,
      display_name, channel, status, sync_enabled, capabilities_json, config_json,
      created_by_account_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'file', 'connected', 1, ?, ?, ?, ?, ?)
  `).bind(
    id,
    tenant.venueId,
    tenant.id,
    provider,
    "universal-file-v1",
    sourceKey,
    sourceTypeFor("universal-file-v1", provider),
    `Импорт файла · ${providerLabel(externalSystem)}`,
    JSON.stringify(INTEGRATION_ENTITY_TYPES),
    JSON.stringify(config),
    tenant.actorAccountId,
    now,
    now,
  ).run();
  const created = await database.prepare(`
    SELECT * FROM integration_connections
    WHERE venue_id = ? AND data_account_id = ? AND adapter_key = ? AND source_key = ?
    LIMIT 1
  `).bind(tenant.venueId, tenant.id, "universal-file-v1", sourceKey).first<IntegrationConnectionRow>();
  if (!created) throw new Error("INTEGRATION_CONNECTION_CREATE_FAILED");
  return created;
}

export async function connectionForTenant(
  tenant: Pick<TenantContext, "id" | "venueId">,
  connectionId: string,
): Promise<IntegrationConnectionRow | null> {
  return getD1().prepare(`
    SELECT * FROM integration_connections
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
    LIMIT 1
  `).bind(connectionId, tenant.venueId, tenant.id).first<IntegrationConnectionRow>();
}

export async function listConnections(
  tenant: Pick<TenantContext, "id" | "venueId">,
): Promise<IntegrationConnectionRow[]> {
  const result = await getD1().prepare(`
    SELECT * FROM integration_connections
    WHERE venue_id = ? AND data_account_id = ?
    ORDER BY COALESCE(last_success_at, created_at) DESC
    LIMIT 50
  `).bind(tenant.venueId, tenant.id).all<IntegrationConnectionRow>();
  return result.results ?? [];
}

export async function ensureConfiguredConnection(input: {
  tenant: TenantContext;
  provider: string;
  adapterKey: string;
  channel: IntegrationChannel;
  displayName: string;
  sourceKey?: string;
  sourceType?: IntegrationSourceType;
  capabilities: readonly IntegrationEntityType[];
  config?: unknown;
  status?: IntegrationConnectionStatus;
  syncEnabled?: boolean;
}): Promise<{ connection: IntegrationConnectionRow; created: boolean }> {
  const database = getD1();
  const provider = providerKey(input.provider);
  const config = normalizeConnectionConfig(input.config, input.capabilities);
  const sourceKey = connectionSourceKey({
    adapterKey: input.adapterKey,
    provider,
    channel: input.channel,
    sourceKey: input.sourceKey,
    config,
  });
  const existing = await database.prepare(`
    SELECT * FROM integration_connections
    WHERE venue_id = ? AND data_account_id = ? AND adapter_key = ? AND source_key = ?
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.adapterKey,
    sourceKey,
  ).first<IntegrationConnectionRow>();
  const id = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  await database.prepare(`
    INSERT INTO integration_connections (
      id, venue_id, data_account_id, provider, adapter_key, source_key, source_type,
      display_name, channel, status, sync_enabled, capabilities_json, config_json,
      created_by_account_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(venue_id, data_account_id, adapter_key, source_key)
    DO UPDATE SET provider = excluded.provider,
      source_type = excluded.source_type,
      display_name = excluded.display_name,
      channel = excluded.channel,
      status = excluded.status,
      sync_enabled = excluded.sync_enabled,
      capabilities_json = excluded.capabilities_json,
      config_json = excluded.config_json,
      last_error = NULL,
      updated_at = excluded.updated_at
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    provider,
    input.adapterKey,
    sourceKey,
    input.sourceType ?? sourceTypeFor(input.adapterKey, provider),
    input.displayName.trim().slice(0, 140) || providerLabel(input.provider),
    input.channel,
    input.status ?? "requires_setup",
    input.syncEnabled === true ? 1 : 0,
    JSON.stringify([...new Set(input.capabilities)]),
    JSON.stringify(config),
    input.tenant.actorAccountId,
    existing?.created_at ?? now,
    now,
  ).run();
  const connection = await database.prepare(`
    SELECT * FROM integration_connections
    WHERE venue_id = ? AND data_account_id = ? AND adapter_key = ? AND source_key = ?
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.adapterKey,
    sourceKey,
  ).first<IntegrationConnectionRow>();
  if (!connection) throw new Error("INTEGRATION_CONNECTION_CREATE_FAILED");
  return { connection, created: !existing };
}

export async function updateConnectionConfiguration(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  displayName?: string;
  config: unknown;
  capabilities: readonly IntegrationEntityType[];
  status?: IntegrationConnectionStatus;
  syncEnabled?: boolean;
}): Promise<IntegrationConnectionRow | null> {
  const config = normalizeConnectionConfig(input.config, input.capabilities);
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_connections
    SET display_name = COALESCE(?, display_name), config_json = ?, capabilities_json = ?,
      status = COALESCE(?, status), sync_enabled = COALESCE(?, sync_enabled),
      last_error = CASE WHEN ? IN ('connected', 'paused', 'requires_setup') THEN NULL ELSE last_error END,
      updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(
    input.displayName?.trim().slice(0, 140) || null,
    JSON.stringify(config),
    JSON.stringify([...new Set(input.capabilities)]),
    input.status ?? null,
    input.syncEnabled === undefined ? null : input.syncEnabled ? 1 : 0,
    input.status ?? null,
    now,
    input.connectionId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
  return connectionForTenant(input.tenant, input.connectionId);
}

export async function updateConnectionCursor(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  cursor?: PullCursor;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_connections SET cursor_json = ?, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(
    input.cursor ? JSON.stringify(input.cursor).slice(0, 20_000) : null,
    now,
    input.connectionId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
}

export async function setConnectionState(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  status: IntegrationConnectionStatus;
  syncEnabled: boolean;
  error?: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await getD1().prepare(`
    UPDATE integration_connections
    SET status = ?, sync_enabled = ?, last_error = ?, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(
    input.status,
    input.syncEnabled ? 1 : 0,
    input.error?.slice(0, 1_000) ?? null,
    now,
    input.connectionId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
  return Number(result.meta.changes ?? 0) === 1;
}

export async function createSyncRun(input: {
  tenant: TenantContext;
  connectionId: string;
  trigger: string;
  dataType: IntegrationEntityType;
  sourceName?: string;
  receivedCount: number;
  retryOfRunId?: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_sync_runs (
      id, venue_id, data_account_id, connection_id, trigger, data_type,
      status, source_name, received_count, retry_of_run_id,
      started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'syncing', ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.trigger,
    input.dataType,
    input.sourceName ?? null,
    input.receivedCount,
    input.retryOfRunId ?? null,
    now,
    now,
    now,
  ).run();
  return id;
}

export async function finishSyncRun(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  runId: string;
  status: SyncStatus;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; code: string; message: string }>;
  mappingIssues: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const lastError = input.errors[0]?.message ?? null;
  const database = getD1();
  await database.batch([
    database.prepare(`
      UPDATE integration_sync_runs
      SET status = ?, created_count = ?, updated_count = ?, skipped_count = ?,
          error_count = ?, mapping_issue_count = ?, errors_json = ?,
          finished_at = ?, updated_at = ?
      WHERE id = ? AND connection_id = ? AND venue_id = ? AND data_account_id = ?
    `).bind(
      input.status,
      input.created,
      input.updated,
      input.skipped,
      input.errors.length,
      input.mappingIssues,
      JSON.stringify(input.errors.slice(0, 100)),
      now,
      now,
      input.runId,
      input.connectionId,
      input.tenant.venueId,
      input.tenant.id,
    ),
    database.prepare(`
      UPDATE integration_connections
      SET last_sync_at = ?,
          last_success_at = CASE WHEN ? IN ('success', 'partial') THEN ? ELSE last_success_at END,
          last_error = ?,
          status = CASE WHEN ? IN ('success', 'partial') THEN 'connected' ELSE 'error' END,
          updated_at = ?
      WHERE id = ? AND venue_id = ? AND data_account_id = ?
    `).bind(
      now,
      input.status,
      now,
      lastError,
      input.status,
      now,
      input.connectionId,
      input.tenant.venueId,
      input.tenant.id,
    ),
  ]);
}

export async function listSyncRuns(
  tenant: Pick<TenantContext, "id" | "venueId">,
): Promise<IntegrationSyncRunRow[]> {
  const result = await getD1().prepare(`
    SELECT id, connection_id, trigger, data_type, status, source_name,
      received_count, created_count, updated_count, skipped_count,
      error_count, mapping_issue_count, errors_json, retry_of_run_id,
      started_at, finished_at, created_at, updated_at
    FROM integration_sync_runs
    WHERE venue_id = ? AND data_account_id = ?
    ORDER BY created_at DESC
    LIMIT 40
  `).bind(tenant.venueId, tenant.id).all<IntegrationSyncRunRow>();
  return result.results ?? [];
}

export async function createSyncItem(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  runId: string;
  entityType: IntegrationEntityType;
  externalId: string;
  internalId?: string;
  status: string;
  payloadHash: string;
  payloadJson: string;
  errorCode?: string;
  errorMessage?: string;
  mappingId?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_sync_items (
      id, venue_id, data_account_id, connection_id, run_id, entity_type,
      external_id, internal_id, status, payload_hash, payload_json,
      error_code, error_message, mapping_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.runId,
    input.entityType,
    input.externalId,
    input.internalId ?? null,
    input.status,
    input.payloadHash,
    input.payloadJson,
    input.errorCode ?? null,
    input.errorMessage ?? null,
    input.mappingId ?? null,
    now,
    now,
  ).run();
}

export async function retryableItems(
  tenant: Pick<TenantContext, "id" | "venueId">,
  runId: string,
): Promise<IntegrationSyncItemRow[]> {
  const result = await getD1().prepare(`
    SELECT item.* FROM integration_sync_items item
    INNER JOIN integration_sync_runs run ON run.id = item.run_id
    WHERE item.run_id = ?
      AND item.venue_id = ? AND item.data_account_id = ?
      AND run.venue_id = ? AND run.data_account_id = ?
      AND item.status IN ('mapping_required', 'failed')
    ORDER BY item.created_at
    LIMIT 2000
  `).bind(runId, tenant.venueId, tenant.id, tenant.venueId, tenant.id).all<IntegrationSyncItemRow>();
  return result.results ?? [];
}

export async function entityLink(
  tenant: Pick<TenantContext, "id" | "venueId">,
  connectionId: string,
  entityType: IntegrationEntityType,
  externalId: string,
): Promise<IntegrationEntityLinkRow | null> {
  return getD1().prepare(`
    SELECT id, external_id, internal_id, payload_hash, external_updated_at, sync_status,
      last_sync_run_id
    FROM integration_entity_links
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
      AND entity_type = ? AND external_id = ?
    LIMIT 1
  `).bind(
    tenant.venueId,
    tenant.id,
    connectionId,
    entityType,
    externalId,
  ).first<IntegrationEntityLinkRow>();
}

export async function claimEntityLink(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: IntegrationEntityType;
  externalId: string;
  internalId: string;
  payloadHash: string;
  externalUpdatedAt?: string;
  runId: string;
  allowPayloadUpdate?: boolean;
}): Promise<{ claimed: boolean; link: IntegrationEntityLinkRow }> {
  const database = getD1();
  const now = new Date().toISOString();
  const inserted = await database.prepare(`
    INSERT OR IGNORE INTO integration_entity_links (
      id, venue_id, data_account_id, connection_id, entity_type, external_id,
      internal_id, payload_hash, external_updated_at, sync_status,
      last_sync_run_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'syncing', ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
    input.internalId,
    input.payloadHash,
    input.externalUpdatedAt ?? null,
    input.runId,
    now,
    now,
  ).run();
  if (Number(inserted.meta.changes ?? 0) === 0) {
    if (input.allowPayloadUpdate) {
      await database.prepare(`
        UPDATE integration_entity_links
        SET payload_hash = ?, external_updated_at = ?, sync_status = 'syncing',
          last_sync_run_id = ?, updated_at = ?
        WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
          AND entity_type = ? AND external_id = ? AND internal_id = ?
          AND sync_status <> 'syncing'
          AND (? IS NULL OR external_updated_at IS NULL OR external_updated_at <= ?)
      `).bind(
        input.payloadHash,
        input.externalUpdatedAt ?? null,
        input.runId,
        now,
        input.tenant.venueId,
        input.tenant.id,
        input.connectionId,
        input.entityType,
        input.externalId,
        input.internalId,
        input.externalUpdatedAt ?? null,
        input.externalUpdatedAt ?? null,
      ).run();
    } else {
      await database.prepare(`
        UPDATE integration_entity_links
        SET sync_status = 'syncing', last_sync_run_id = ?, updated_at = ?
        WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
          AND entity_type = ? AND external_id = ? AND payload_hash = ?
          AND sync_status = 'failed'
      `).bind(
        input.runId,
        now,
        input.tenant.venueId,
        input.tenant.id,
        input.connectionId,
        input.entityType,
        input.externalId,
        input.payloadHash,
      ).run();
    }
  }
  const link = await entityLink(
    input.tenant,
    input.connectionId,
    input.entityType,
    input.externalId,
  );
  if (!link) throw new Error("INTEGRATION_IDEMPOTENCY_CLAIM_FAILED");
  return {
    claimed: link.payload_hash === input.payloadHash
      && link.sync_status === "syncing"
      && link.internal_id === input.internalId,
    link,
  };
}

export async function updateEntityLinkStatus(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: IntegrationEntityType;
  externalId: string;
  payloadHash: string;
  internalId: string;
  syncStatus: string;
  runId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_entity_links
    SET internal_id = ?, sync_status = ?, last_sync_run_id = ?, updated_at = ?
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
      AND entity_type = ? AND external_id = ? AND payload_hash = ?
  `).bind(
    input.internalId,
    input.syncStatus,
    input.runId,
    now,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
    input.payloadHash,
  ).run();
}

/**
 * A safe-upsert may fail after claiming a changed payload. The previously
 * imported business object is still valid, so restore its successful hash;
 * the next connector run can then retry the changed object as an update.
 */
export async function restoreEntityLinkAfterFailedUpdate(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: IntegrationEntityType;
  externalId: string;
  claimedPayloadHash: string;
  previousPayloadHash: string;
  previousExternalUpdatedAt?: string | null;
  previousRunId?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_entity_links
    SET payload_hash = ?, external_updated_at = ?, sync_status = 'success',
      last_sync_run_id = ?, updated_at = ?
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
      AND entity_type = ? AND external_id = ? AND payload_hash = ?
      AND sync_status = 'syncing'
  `).bind(
    input.previousPayloadHash,
    input.previousExternalUpdatedAt ?? null,
    input.previousRunId ?? null,
    now,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
    input.claimedPayloadHash,
  ).run();
}

export async function saveEntityLink(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: IntegrationEntityType;
  externalId: string;
  internalId: string;
  payloadHash: string;
  externalUpdatedAt?: string;
  syncStatus: string;
  runId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_entity_links (
      id, venue_id, data_account_id, connection_id, entity_type, external_id,
      internal_id, payload_hash, external_updated_at, sync_status,
      last_sync_run_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(venue_id, data_account_id, connection_id, entity_type, external_id)
    DO UPDATE SET internal_id = excluded.internal_id, payload_hash = excluded.payload_hash,
      external_updated_at = excluded.external_updated_at, sync_status = excluded.sync_status,
      last_sync_run_id = excluded.last_sync_run_id, updated_at = excluded.updated_at
  `).bind(
    crypto.randomUUID(),
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
    input.internalId,
    input.payloadHash,
    input.externalUpdatedAt ?? null,
    input.syncStatus,
    input.runId,
    now,
    now,
  ).run();
}

export async function mappingForExternal(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: string;
  externalId: string;
}): Promise<IntegrationMappingRow | null> {
  return getD1().prepare(`
    SELECT id, connection_id, entity_type, external_id, external_name,
      external_unit, internal_id, internal_name, status, confidence, reason,
      confirmed_at, created_at, updated_at
    FROM integration_mappings
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
      AND entity_type = ? AND external_id = ?
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
  ).first<IntegrationMappingRow>();
}

export async function mappingById(
  tenant: Pick<TenantContext, "id" | "venueId">,
  mappingId: string,
): Promise<IntegrationMappingRow | null> {
  return getD1().prepare(`
    SELECT id, connection_id, entity_type, external_id, external_name,
      external_unit, internal_id, internal_name, status, confidence, reason,
      confirmed_at, created_at, updated_at
    FROM integration_mappings
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
    LIMIT 1
  `).bind(mappingId, tenant.venueId, tenant.id).first<IntegrationMappingRow>();
}

export async function saveMappingProposal(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: string;
  externalId: string;
  externalName: string;
  externalUnit?: string;
  internalId?: string;
  internalName?: string;
  status: Exclude<MappingStatus, "conflict">;
  confidence: number;
  reason: string;
  externalPayload?: unknown;
}): Promise<IntegrationMappingRow> {
  const existing = await mappingForExternal(input);
  if (existing?.status === "confirmed") return existing;
  const id = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_mappings (
      id, venue_id, data_account_id, connection_id, entity_type, external_id,
      external_name, external_unit, internal_id, internal_name, status,
      confidence, reason, external_payload_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(venue_id, data_account_id, connection_id, entity_type, external_id)
    DO UPDATE SET external_name = excluded.external_name,
      external_unit = excluded.external_unit, internal_id = excluded.internal_id,
      internal_name = excluded.internal_name, status = excluded.status,
      confidence = excluded.confidence, reason = excluded.reason,
      external_payload_json = excluded.external_payload_json, updated_at = excluded.updated_at
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.externalId,
    input.externalName.slice(0, 240),
    input.externalUnit?.slice(0, 80) ?? null,
    input.internalId ?? null,
    input.internalName?.slice(0, 240) ?? null,
    input.status,
    Math.max(0, Math.min(100, Math.round(input.confidence))),
    input.reason.slice(0, 500),
    input.externalPayload === undefined ? null : JSON.stringify(input.externalPayload).slice(0, 20_000),
    existing?.created_at ?? now,
    now,
  ).run();
  const result = await mappingForExternal(input);
  if (!result) throw new Error("INTEGRATION_MAPPING_SAVE_FAILED");
  return result;
}

export async function confirmMapping(input: {
  tenant: TenantContext;
  mappingId: string;
  internalId: string;
  internalName: string;
  createNew?: boolean;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await getD1().prepare(`
    UPDATE integration_mappings
    SET internal_id = ?, internal_name = ?, status = 'confirmed', confidence = 100,
      reason = ?, confirmed_by_account_id = ?,
      confirmed_at = ?, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(
    input.internalId.slice(0, 300),
    input.internalName.slice(0, 240),
    input.createNew
      ? "Подтверждено пользователем: создать складскую позицию"
      : "Подтверждено пользователем",
    input.tenant.actorAccountId,
    now,
    now,
    input.mappingId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
  return Number(result.meta.changes ?? 0) === 1;
}

export async function markMappingConflict(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  mappingId: string;
  reason: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getD1().prepare(`
    UPDATE integration_mappings
    SET status = 'conflict', reason = ?, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(
    input.reason.slice(0, 500),
    now,
    input.mappingId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
}

export async function listMappings(
  tenant: Pick<TenantContext, "id" | "venueId">,
  statuses: MappingStatus[] = ["suggested", "unresolved", "conflict"],
): Promise<IntegrationMappingRow[]> {
  if (!statuses.length) return [];
  const placeholders = statuses.map(() => "?").join(",");
  const result = await getD1().prepare(`
    SELECT id, connection_id, entity_type, external_id, external_name,
      external_unit, internal_id, internal_name, status, confidence, reason,
      confirmed_at, created_at, updated_at
    FROM integration_mappings
    WHERE venue_id = ? AND data_account_id = ? AND status IN (${placeholders})
    ORDER BY CASE status WHEN 'conflict' THEN 0 WHEN 'unresolved' THEN 1 ELSE 2 END,
      updated_at DESC
    LIMIT 200
  `).bind(tenant.venueId, tenant.id, ...statuses).all<IntegrationMappingRow>();
  return result.results ?? [];
}

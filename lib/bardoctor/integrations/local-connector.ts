import type { TenantContext } from "./repository";

type JsonRecord = Record<string, unknown>;

export const LOCAL_CONNECTOR_VERSION = "1.1.0";
export const LOCAL_CONNECTOR_ADAPTER = "onec-common-catering-v1";

export type LocalConnectorAgentStatus =
  | "connected"
  | "syncing"
  | "working"
  | "attention"
  | "error"
  | "paused";

export type LocalConnectorDisplayStatus =
  | "awaiting_connection"
  | "connected"
  | "syncing"
  | "working"
  | "attention"
  | "error"
  | "disabled";

export type LocalConnectorAgentRow = {
  id: string;
  connection_id: string;
  machine_id_hash: string;
  machine_name: string;
  agent_version: string;
  operating_system: string | null;
  adapter_key: string;
  platform_version: string | null;
  configuration_name: string | null;
  configuration_version: string | null;
  infobase_name: string | null;
  read_only: number;
  status: LocalConnectorAgentStatus;
  auto_sync: number;
  interval_minutes: number;
  last_entity_type: string | null;
  imported_count: number;
  last_seen_at: string;
  last_sync_at: string | null;
  last_error: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type LocalConnectorHeartbeat = {
  machineIdHash: string;
  machineName: string;
  agentVersion: string;
  operatingSystem?: string;
  adapterKey: string;
  platformVersion?: string;
  configurationName?: string;
  configurationVersion?: string;
  infobaseName?: string;
  readOnly: true;
  status: LocalConnectorAgentStatus;
  autoSync: boolean;
  intervalMinutes: number;
  lastEntityType?: string;
  importedCount: number;
  lastSyncAt?: string;
  lastError?: string;
  metadata: JsonRecord;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalText(value: unknown, max: number): string | undefined {
  return text(value, max) || undefined;
}

function iso(value: unknown): string | undefined {
  const result = text(value, 40);
  return result && Number.isFinite(new Date(result).valueOf()) ? new Date(result).toISOString() : undefined;
}

function safeMetadata(value: unknown): JsonRecord {
  const input = record(value);
  return Object.fromEntries(Object.entries(input)
    .filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item))
    .slice(0, 30));
}

export function normalizeLocalConnectorHeartbeat(value: unknown): LocalConnectorHeartbeat {
  const input = record(value);
  const machineIdHash = text(input.machineIdHash, 80).toLocaleLowerCase("en");
  if (!/^[a-f0-9]{64}$/.test(machineIdHash)) throw new Error("MACHINE_ID_INVALID");
  const machineName = text(input.machineName, 120);
  if (!machineName) throw new Error("MACHINE_NAME_REQUIRED");
  const agentVersion = text(input.agentVersion, 40);
  if (!/^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i.test(agentVersion)) {
    throw new Error("AGENT_VERSION_INVALID");
  }
  const adapterKey = text(input.adapterKey, 80);
  if (adapterKey !== LOCAL_CONNECTOR_ADAPTER) throw new Error("ADAPTER_NOT_SUPPORTED");
  if (input.readOnly !== true) throw new Error("READ_ONLY_REQUIRED");
  const allowed = new Set<LocalConnectorAgentStatus>([
    "connected", "syncing", "working", "attention", "error", "paused",
  ]);
  const requestedStatus = text(input.status, 30) as LocalConnectorAgentStatus;
  const status = allowed.has(requestedStatus) ? requestedStatus : "connected";
  const interval = Number(input.intervalMinutes);
  const importedCount = Number(input.importedCount);
  return {
    machineIdHash,
    machineName,
    agentVersion,
    operatingSystem: optionalText(input.operatingSystem, 160),
    adapterKey,
    platformVersion: optionalText(input.platformVersion, 80),
    configurationName: optionalText(input.configurationName, 160),
    configurationVersion: optionalText(input.configurationVersion, 80),
    infobaseName: optionalText(input.infobaseName, 160),
    readOnly: true,
    status,
    autoSync: input.autoSync === true,
    intervalMinutes: Number.isFinite(interval) ? Math.max(15, Math.min(1440, Math.round(interval))) : 60,
    lastEntityType: optionalText(input.lastEntityType, 80),
    importedCount: Number.isFinite(importedCount) ? Math.max(0, Math.min(2_000_000_000, Math.round(importedCount))) : 0,
    lastSyncAt: iso(input.lastSyncAt),
    lastError: optionalText(input.lastError, 1_000),
    metadata: safeMetadata(input.metadata),
  };
}

export async function saveLocalConnectorHeartbeat(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  heartbeat: LocalConnectorHeartbeat;
}): Promise<LocalConnectorAgentRow> {
  const { getD1 } = await import("../../../db");
  const database = getD1();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const value = input.heartbeat;
  await database.prepare(`
    INSERT INTO integration_connector_agents (
      id, venue_id, data_account_id, connection_id, machine_id_hash,
      machine_name, agent_version, operating_system, adapter_key,
      platform_version, configuration_name, configuration_version, infobase_name,
      read_only, status, auto_sync, interval_minutes, last_entity_type,
      imported_count, last_seen_at, last_sync_at, last_error, metadata_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(venue_id, data_account_id, connection_id, machine_id_hash)
    DO UPDATE SET machine_name = excluded.machine_name,
      agent_version = excluded.agent_version,
      operating_system = excluded.operating_system,
      adapter_key = excluded.adapter_key,
      platform_version = excluded.platform_version,
      configuration_name = excluded.configuration_name,
      configuration_version = excluded.configuration_version,
      infobase_name = excluded.infobase_name,
      read_only = 1,
      status = excluded.status,
      auto_sync = excluded.auto_sync,
      interval_minutes = excluded.interval_minutes,
      last_entity_type = excluded.last_entity_type,
      imported_count = excluded.imported_count,
      last_seen_at = excluded.last_seen_at,
      last_sync_at = COALESCE(excluded.last_sync_at, integration_connector_agents.last_sync_at),
      last_error = excluded.last_error,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    value.machineIdHash,
    value.machineName,
    value.agentVersion,
    value.operatingSystem ?? null,
    value.adapterKey,
    value.platformVersion ?? null,
    value.configurationName ?? null,
    value.configurationVersion ?? null,
    value.infobaseName ?? null,
    value.status,
    value.autoSync ? 1 : 0,
    value.intervalMinutes,
    value.lastEntityType ?? null,
    value.importedCount,
    now,
    value.lastSyncAt ?? null,
    value.lastError ?? null,
    JSON.stringify(value.metadata).slice(0, 4_000),
    now,
    now,
  ).run();
  const saved = await database.prepare(`
    SELECT * FROM integration_connector_agents
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ? AND machine_id_hash = ?
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    value.machineIdHash,
  ).first<LocalConnectorAgentRow>();
  if (!saved) throw new Error("AGENT_HEARTBEAT_SAVE_FAILED");
  return saved;
}

export async function listLocalConnectorAgents(
  tenant: Pick<TenantContext, "id" | "venueId">,
): Promise<LocalConnectorAgentRow[]> {
  const { getD1 } = await import("../../../db");
  const result = await getD1().prepare(`
    SELECT * FROM integration_connector_agents
    WHERE venue_id = ? AND data_account_id = ?
    ORDER BY last_seen_at DESC
    LIMIT 50
  `).bind(tenant.venueId, tenant.id).all<LocalConnectorAgentRow>();
  return result.results ?? [];
}

export function deriveLocalConnectorStatus(input: {
  connection: { status: string; syncEnabled: boolean };
  agent?: Pick<LocalConnectorAgentRow, "status" | "last_seen_at" | "last_error"> | null;
  latestRun?: { status: string } | null;
  now?: number;
}): LocalConnectorDisplayStatus {
  if (input.connection.status === "paused" || !input.connection.syncEnabled) return "disabled";
  if (input.connection.status === "requires_setup") return "awaiting_connection";
  if (!input.agent) return "awaiting_connection";
  const seen = new Date(input.agent.last_seen_at).valueOf();
  const age = (input.now ?? Date.now()) - seen;
  if (!Number.isFinite(seen) || age > 24 * 60 * 60 * 1_000) return "error";
  if (age > 10 * 60 * 1_000) return "attention";
  if (input.agent.status === "syncing" || input.latestRun?.status === "syncing") return "syncing";
  if (input.agent.status === "error" || input.latestRun?.status === "failed") return "error";
  if (input.agent.status === "attention" || input.latestRun?.status === "partial") return "attention";
  if (input.agent.status === "working" || input.latestRun?.status === "success") return "working";
  return "connected";
}

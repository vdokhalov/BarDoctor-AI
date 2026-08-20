import {
  INTEGRATION_ENTITY_TYPES,
  INTEGRATION_SOURCE_TYPES,
  type IntegrationConnectionConfig,
  type IntegrationEntityType,
  type IntegrationSourceType,
} from "./contracts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems = 100): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item, 180)).filter(Boolean))].slice(0, maxItems);
}

function entityList(value: unknown): IntegrationEntityType[] {
  const allowed = new Set<string>(INTEGRATION_ENTITY_TYPES);
  return stringList(value, INTEGRATION_ENTITY_TYPES.length)
    .filter((item): item is IntegrationEntityType => allowed.has(item));
}

export function normalizeConnectionConfig(
  value: unknown,
  fallbackEntities: readonly IntegrationEntityType[] = INTEGRATION_ENTITY_TYPES,
): IntegrationConnectionConfig {
  const input = record(value);
  const enabledEntities = entityList(input.enabledEntities);
  const mode = text(input.syncMode, 30);
  const polling = Number(input.pollingMinutes);
  const priority = Number(input.sourcePriority);
  const initialSyncDays = Number(input.initialSyncDays);
  return {
    externalOrganizationId: text(input.externalOrganizationId) || undefined,
    externalVenueId: text(input.externalVenueId) || undefined,
    warehouseIds: stringList(input.warehouseIds),
    registerIds: stringList(input.registerIds),
    enabledEntities: enabledEntities.length ? enabledEntities : [...fallbackEntities],
    syncMode: mode === "webhook" || mode === "polling" || mode === "local_agent"
      ? mode
      : "manual",
    pollingMinutes: Number.isFinite(polling)
      ? Math.max(5, Math.min(24 * 60, Math.round(polling)))
      : undefined,
    updatePolicy: input.updatePolicy === "safe_upsert" ? "safe_upsert" : "review_documents",
    autoCreateProducts: input.autoCreateProducts === true,
    initialSyncDays: Number.isFinite(initialSyncDays)
      ? Math.max(1, Math.min(3650, Math.round(initialSyncDays)))
      : undefined,
    sourcePriority: Number.isFinite(priority)
      ? Math.max(-100, Math.min(100, Math.round(priority)))
      : undefined,
  };
}

export function sourceTypeFor(
  adapterKey: string,
  provider: string,
): IntegrationSourceType {
  const providerName = provider.trim().toLocaleLowerCase("ru");
  const known = providerName.replace(/[^a-zа-яё0-9]+/gi, "");
  if (known === "1c" || known === "1с") return "1c";
  if (known === "iiko") return "iiko";
  if (known === "poster") return "poster";
  if (known === "rkeeper") return "rkeeper";
  if (adapterKey === "universal-file-v1") return "file_import";
  if (adapterKey === "local-connector-v1") return "local_connector";
  return "api";
}

export function normalizeSourceType(
  value: unknown,
  fallback: IntegrationSourceType,
): IntegrationSourceType {
  return typeof value === "string" && INTEGRATION_SOURCE_TYPES.includes(value as IntegrationSourceType)
    ? value as IntegrationSourceType
    : fallback;
}

export function connectionSourceKey(input: {
  adapterKey: string;
  provider: string;
  channel: string;
  sourceKey?: unknown;
  config?: unknown;
}): string {
  const requested = text(input.sourceKey, 180).toLocaleLowerCase("en")
    .replace(/[^a-z0-9а-яё._:-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  if (requested) return requested;
  const config = normalizeConnectionConfig(input.config);
  const identity = [
    input.provider,
    config.externalOrganizationId,
    config.externalVenueId,
    input.channel,
  ].filter(Boolean).join(":").toLocaleLowerCase("en")
    .replace(/[^a-z0-9а-яё._:-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return (identity || `${input.adapterKey}:${input.channel}`).slice(0, 180);
}

import { getD1 } from "../../../db";
import type { FieldMapping, IntegrationEntityType } from "./contracts";
import type { TenantContext } from "./repository";

export type FieldMappingTemplateRow = {
  id: string;
  connection_id: string;
  entity_type: IntegrationEntityType;
  name: string;
  file_kind: string;
  header_signature: string;
  mapping_json: string;
  defaults_json: string;
  active: number;
  created_at: string;
  updated_at: string;
};

export async function fieldMappingTemplate(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  connectionId: string;
  entityType: IntegrationEntityType;
  headerSignature: string;
}): Promise<FieldMappingTemplateRow | null> {
  return getD1().prepare(`
    SELECT id, connection_id, entity_type, name, file_kind, header_signature,
      mapping_json, defaults_json, active, created_at, updated_at
    FROM integration_field_mapping_templates
    WHERE venue_id = ? AND data_account_id = ? AND connection_id = ?
      AND entity_type = ? AND header_signature = ? AND active = 1
    LIMIT 1
  `).bind(
    input.tenant.venueId,
    input.tenant.id,
    input.connectionId,
    input.entityType,
    input.headerSignature,
  ).first<FieldMappingTemplateRow>();
}

export async function listFieldMappingTemplates(
  tenant: Pick<TenantContext, "id" | "venueId">,
): Promise<FieldMappingTemplateRow[]> {
  const result = await getD1().prepare(`
    SELECT id, connection_id, entity_type, name, file_kind, header_signature,
      mapping_json, defaults_json, active, created_at, updated_at
    FROM integration_field_mapping_templates
    WHERE venue_id = ? AND data_account_id = ? AND active = 1
    ORDER BY updated_at DESC
    LIMIT 200
  `).bind(tenant.venueId, tenant.id).all<FieldMappingTemplateRow>();
  return result.results ?? [];
}

export async function saveFieldMappingTemplate(input: {
  tenant: TenantContext;
  connectionId: string;
  entityType: IntegrationEntityType;
  name: string;
  fileKind: string;
  headerSignature: string;
  mapping: FieldMapping;
  defaults?: Record<string, unknown>;
}): Promise<FieldMappingTemplateRow> {
  const existing = await fieldMappingTemplate(input);
  const id = existing?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  await getD1().prepare(`
    INSERT INTO integration_field_mapping_templates (
      id, venue_id, data_account_id, connection_id, entity_type, name,
      file_kind, header_signature, mapping_json, defaults_json, active,
      created_by_account_id, created_at, updated_at
    )
    SELECT ?, ?, ?, id, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?
    FROM integration_connections
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
    ON CONFLICT(venue_id, data_account_id, connection_id, entity_type, header_signature)
    DO UPDATE SET name = excluded.name, file_kind = excluded.file_kind,
      mapping_json = excluded.mapping_json, defaults_json = excluded.defaults_json,
      active = 1, updated_at = excluded.updated_at
  `).bind(
    id,
    input.tenant.venueId,
    input.tenant.id,
    input.entityType,
    input.name.trim().slice(0, 140) || "Шаблон импорта",
    input.fileKind.trim().slice(0, 30),
    input.headerSignature.trim().slice(0, 100),
    JSON.stringify(input.mapping).slice(0, 40_000),
    JSON.stringify(input.defaults ?? {}).slice(0, 20_000),
    input.tenant.actorAccountId,
    existing?.created_at ?? now,
    now,
    input.connectionId,
    input.tenant.venueId,
    input.tenant.id,
  ).run();
  const saved = await fieldMappingTemplate(input);
  if (!saved) throw new Error("FIELD_MAPPING_TEMPLATE_SAVE_FAILED");
  return saved;
}

export async function disableFieldMappingTemplate(input: {
  tenant: Pick<TenantContext, "id" | "venueId">;
  templateId: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await getD1().prepare(`
    UPDATE integration_field_mapping_templates SET active = 0, updated_at = ?
    WHERE id = ? AND venue_id = ? AND data_account_id = ?
  `).bind(now, input.templateId, input.tenant.venueId, input.tenant.id).run();
  return Number(result.meta.changes ?? 0) === 1;
}

export function parseFieldMappingTemplate(row: FieldMappingTemplateRow): {
  mapping: FieldMapping;
  defaults: Record<string, unknown>;
} {
  try {
    const mapping = JSON.parse(row.mapping_json) as unknown;
    const defaults = JSON.parse(row.defaults_json) as unknown;
    return {
      mapping: mapping && typeof mapping === "object" && !Array.isArray(mapping)
        ? mapping as FieldMapping
        : {},
      defaults: defaults && typeof defaults === "object" && !Array.isArray(defaults)
        ? defaults as Record<string, unknown>
        : {},
    };
  } catch {
    return { mapping: {}, defaults: {} };
  }
}

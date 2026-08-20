import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { ASSORTMENT_STORE_KEY } from "../../../lib/bardoctor/inventory";
import { integrationAdapterDescriptors } from "../../../lib/bardoctor/integrations/adapter-registry";
import { listFieldMappingTemplates } from "../../../lib/bardoctor/integrations/field-mapping-repository";
import { listIngressTokens } from "../../../lib/bardoctor/integrations/ingress-auth";
import {
  deriveLocalConnectorStatus,
  listLocalConnectorAgents,
} from "../../../lib/bardoctor/integrations/local-connector";
import { candidatesFromAssortment } from "../../../lib/bardoctor/integrations/mapping";
import {
  listConnections,
  listMappings,
  listSyncRuns,
} from "../../../lib/bardoctor/integrations/repository";

function parse(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return fallback;
  }
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

type DeliveryOverview = {
  run_id: string | null;
  delivery_id: string;
  status: string;
  attempt_count: number;
  cursor_json: string | null;
  error: string | null;
  received_at: string;
  completed_at: string | null;
};

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "integrations.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Интеграции доступны только владельцу" },
      { status: 403 },
    ));
  }

  const [connections, runs, mappings, assortmentRow, tokens, templates, agents, deliveryRows] = await Promise.all([
    listConnections(account),
    listSyncRuns(account),
    listMappings(account),
    getD1().prepare(`
      SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
    `).bind(account.id, ASSORTMENT_STORE_KEY).first<{ data_json: string }>(),
    listIngressTokens(account),
    listFieldMappingTemplates(account),
    listLocalConnectorAgents(account),
    getD1().prepare(`
      SELECT run_id, delivery_id, status, attempt_count, cursor_json, error,
        received_at, completed_at
      FROM integration_ingress_deliveries
      WHERE venue_id = ? AND data_account_id = ?
      ORDER BY received_at DESC
      LIMIT 100
    `).bind(account.venueId, account.id).all<DeliveryOverview>(),
  ]);
  const assortment = parse(assortmentRow?.data_json, {});
  const stockCandidates = candidatesFromAssortment(assortment, "stock_product");
  const menuCandidates = candidatesFromAssortment(assortment, "menu_item");
  const latestAgent = new Map<string, (typeof agents)[number]>();
  for (const agent of agents) if (!latestAgent.has(agent.connection_id)) latestAgent.set(agent.connection_id, agent);
  const latestRun = new Map<string, (typeof runs)[number]>();
  for (const run of runs) if (!latestRun.has(run.connection_id)) latestRun.set(run.connection_id, run);
  const deliveryByRun = new Map<string, DeliveryOverview>();
  for (const delivery of deliveryRows.results ?? []) {
    if (delivery.run_id && !deliveryByRun.has(delivery.run_id)) deliveryByRun.set(delivery.run_id, delivery);
  }
  return noStore(Response.json({
    ok: true,
    data: {
      adapters: integrationAdapterDescriptors(),
      connections: connections.map((item) => {
        const agent = latestAgent.get(item.id) ?? null;
        const run = latestRun.get(item.id) ?? null;
        return ({
        id: item.id,
        provider: item.provider,
        adapterKey: item.adapter_key,
        sourceKey: item.source_key,
        sourceType: item.source_type,
        displayName: item.display_name,
        channel: item.channel,
        status: item.status,
        syncEnabled: Boolean(item.sync_enabled),
        capabilities: parse(item.capabilities_json, []),
        config: parse(item.config_json, {}),
        cursor: parse(item.cursor_json, null),
        lastSyncAt: item.last_sync_at,
        lastSuccessAt: item.last_success_at,
        lastError: item.last_error,
        localStatus: item.adapter_key === "local-connector-v1"
          ? deriveLocalConnectorStatus({
              connection: { status: item.status, syncEnabled: Boolean(item.sync_enabled) },
              agent,
              latestRun: run,
            })
          : null,
        agent: agent ? {
          machineName: agent.machine_name,
          version: agent.agent_version,
          operatingSystem: agent.operating_system,
          adapterKey: agent.adapter_key,
          platformVersion: agent.platform_version,
          configurationName: agent.configuration_name,
          configurationVersion: agent.configuration_version,
          infobaseName: agent.infobase_name,
          readOnly: Boolean(agent.read_only),
          status: agent.status,
          autoSync: Boolean(agent.auto_sync),
          intervalMinutes: agent.interval_minutes,
          lastEntityType: agent.last_entity_type,
          importedCount: agent.imported_count,
          lastSeenAt: agent.last_seen_at,
          lastSyncAt: agent.last_sync_at,
          lastError: agent.last_error,
          metadata: parse(agent.metadata_json, {}),
        } : null,
      }); }),
      runs: runs.map((item) => {
        const delivery = deliveryByRun.get(item.id);
        return ({
        id: item.id,
        connectionId: item.connection_id,
        trigger: item.trigger,
        dataType: item.data_type,
        status: item.status,
        sourceName: item.source_name,
        received: item.received_count,
        created: item.created_count,
        updated: item.updated_count,
        skipped: item.skipped_count,
        errors: item.error_count,
        mappingIssues: item.mapping_issue_count,
        errorDetails: parse(item.errors_json, []),
        retryOfRunId: item.retry_of_run_id,
        startedAt: item.started_at,
        finishedAt: item.finished_at,
        delivery: delivery ? {
          id: delivery.delivery_id,
          status: delivery.status,
          attempts: delivery.attempt_count,
          cursor: parse(delivery.cursor_json, null),
          error: delivery.error,
          receivedAt: delivery.received_at,
          completedAt: delivery.completed_at,
        } : null,
      }); }),
      mappings: mappings.map((item) => ({
        id: item.id,
        connectionId: item.connection_id,
        entityType: item.entity_type,
        externalId: item.external_id,
        externalName: item.external_name,
        externalUnit: item.external_unit,
        suggestedInternalId: item.internal_id,
        suggestedInternalName: item.internal_name,
        status: item.status,
        confidence: item.confidence,
        reason: item.reason,
      })),
      candidateCatalogs: {
        stockProducts: stockCandidates.slice(0, 1_500),
        menuItems: menuCandidates.slice(0, 1_500),
      },
      tokens: tokens.map((item) => ({
        id: item.id,
        connectionId: item.connection_id,
        label: item.label,
        prefix: item.token_prefix,
        scopes: parse(item.scopes_json, []),
        lastUsedAt: item.last_used_at,
        expiresAt: item.expires_at,
        revokedAt: item.revoked_at,
        createdAt: item.created_at,
      })),
      templates: templates.map((item) => ({
        id: item.id,
        connectionId: item.connection_id,
        entityType: item.entity_type,
        name: item.name,
        fileKind: item.file_kind,
        headerSignature: item.header_signature,
        updatedAt: item.updated_at,
      })),
    },
  }));
}

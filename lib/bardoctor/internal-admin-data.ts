import { getD1 } from "../../db";
import { getPlatformIntegrationValue } from "./integration-secrets";
import {
  deriveLocalConnectorStatus,
  type LocalConnectorAgentStatus,
} from "./integrations/local-connector";
import { runtimeEnv } from "./runtime-env";
import { isGoogleOAuthConfigured } from "./google";

type QueryOptions = { q?: string; page?: number; limit?: number; status?: string };

const ADMIN_ACTION_LABELS: Record<string, string> = {
  "platform_admin.grant": "Выдан доступ администратора платформы",
  "platform_admin.claim": "Активирован Internal Admin",
  "platform_admin.claim_denied": "Отклонена активация Internal Admin",
};

function adminActionLabel(action: string): string {
  return ADMIN_ACTION_LABELS[action] ?? action.replace(/[._-]+/g, " ").replace(/^./, (character) => character.toLocaleUpperCase("ru"));
}

type Profile = {
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
};

type IntegrationRow = {
  id: string;
  venue_id: number;
  data_account_id: number;
  display_name: string;
  provider: string;
  adapter_key: string;
  source_type: string;
  channel: string;
  status: string;
  sync_enabled: number;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
  restaurant_json: string | null;
};

type AgentRow = {
  connection_id: string;
  machine_name: string;
  agent_version: string;
  operating_system: string | null;
  platform_version: string | null;
  configuration_name: string | null;
  configuration_version: string | null;
  infobase_name: string | null;
  read_only: number;
  status: LocalConnectorAgentStatus;
  imported_count: number;
  last_seen_at: string;
  last_sync_at: string | null;
  last_error: string | null;
};

type RunRow = {
  connection_id: string;
  status: string;
  received_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function profile(value: string | null | undefined): Profile {
  const data = parseJson<Record<string, unknown>>(value, {});
  const text = (key: string): string | null => {
    const candidate = data[key];
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  };
  return {
    name: text("name") ?? "Новое заведение",
    city: text("city"),
    region: text("region"),
    country: text("country"),
  };
}

function safeLimit(value?: number): number {
  return Math.max(1, Math.min(100, Number.isFinite(value) ? Math.floor(value as number) : 50));
}

function safePage(value?: number): number {
  return Math.max(1, Number.isFinite(value) ? Math.floor(value as number) : 1);
}

function redactText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .slice(0, 1_000)
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, "[secret removed]")
    .replace(/(authorization|bearer|api[_ -]?key|token|password|пароль)\s*[:=]\s*[^\s,;]+/gi, "$1=[secret removed]");
}

function fullName(row: { first_name?: string | null; last_name?: string | null; app_email?: string }): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || row.app_email || "Пользователь";
}

function integrationOperationalStatus(localStatus: string | null, rawStatus: string): "working" | "attention" | "offline" {
  const status = localStatus ?? rawStatus;
  if (["working", "connected", "syncing", "success"].includes(status)) return "working";
  if (["error", "offline", "failed"].includes(status)) return "offline";
  return "attention";
}

export async function internalAdminIntegrations(options: QueryOptions = {}) {
  const query = options.q?.trim().toLocaleLowerCase("ru") ?? "";
  const rows = await getD1().prepare(`
    SELECT c.id, c.venue_id, c.data_account_id, c.display_name, c.provider,
      c.adapter_key, c.source_type, c.channel, c.status, c.sync_enabled,
      c.last_sync_at, c.last_success_at, c.last_error, c.created_at,
      a.restaurant_json
    FROM integration_connections c
    INNER JOIN accounts a ON a.id = c.data_account_id
    ORDER BY c.updated_at DESC
    LIMIT 500
  `).all<IntegrationRow>();
  const agents = await getD1().prepare(`
    SELECT connection_id, machine_name, agent_version, operating_system,
      platform_version, configuration_name, configuration_version, infobase_name,
      read_only, status, imported_count, last_seen_at, last_sync_at, last_error
    FROM integration_connector_agents
    ORDER BY last_seen_at DESC
    LIMIT 1000
  `).all<AgentRow>();
  const runs = await getD1().prepare(`
    SELECT connection_id, status, received_count, created_count, updated_count,
      skipped_count, error_count, started_at, finished_at, created_at
    FROM integration_sync_runs
    ORDER BY created_at DESC
    LIMIT 2000
  `).all<RunRow>();
  const queues = await getD1().prepare(`
    SELECT connection_id, COUNT(*) AS queue_size
    FROM integration_ingress_deliveries
    WHERE status = 'processing'
    GROUP BY connection_id
  `).all<{ connection_id: string; queue_size: number }>();
  const failures = await getD1().prepare(`
    SELECT connection_id,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
      SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) AS partial_runs
    FROM integration_sync_runs
    WHERE created_at >= datetime('now', '-30 days')
    GROUP BY connection_id
  `).all<{ connection_id: string; failed_runs: number; partial_runs: number }>();

  const agentByConnection = new Map<string, AgentRow>();
  for (const item of agents.results ?? []) if (!agentByConnection.has(item.connection_id)) agentByConnection.set(item.connection_id, item);
  const runByConnection = new Map<string, RunRow>();
  for (const item of runs.results ?? []) if (!runByConnection.has(item.connection_id)) runByConnection.set(item.connection_id, item);
  const queueByConnection = new Map((queues.results ?? []).map((item) => [item.connection_id, item.queue_size]));
  const failureByConnection = new Map((failures.results ?? []).map((item) => [item.connection_id, item]));

  const items = (rows.results ?? []).map((row) => {
    const venue = profile(row.restaurant_json);
    const agent = agentByConnection.get(row.id) ?? null;
    const latestRun = runByConnection.get(row.id) ?? null;
    const localStatus = row.adapter_key === "local-connector-v1"
      ? deriveLocalConnectorStatus({
          connection: { status: row.status, syncEnabled: Boolean(row.sync_enabled) },
          agent: agent ? {
            status: agent.status,
            last_seen_at: agent.last_seen_at,
            last_error: agent.last_error,
          } : null,
          latestRun,
        })
      : null;
    const recent = failureByConnection.get(row.id);
    return {
      id: row.id,
      venueId: row.venue_id,
      venueName: venue.name,
      source: row.display_name,
      provider: row.provider,
      adapterKey: row.adapter_key,
      sourceType: row.source_type,
      channel: row.channel,
      status: integrationOperationalStatus(localStatus, row.status),
      sourceStatus: row.status,
      localStatus,
      syncEnabled: Boolean(row.sync_enabled),
      lastSyncAt: row.last_sync_at,
      lastSuccessAt: row.last_success_at,
      lastError: redactText(row.last_error ?? agent?.last_error),
      queueSize: queueByConnection.get(row.id) ?? 0,
      failedRuns: recent?.failed_runs ?? 0,
      partialRuns: recent?.partial_runs ?? 0,
      latestRun: latestRun ? {
        status: latestRun.status,
        received: latestRun.received_count,
        created: latestRun.created_count,
        updated: latestRun.updated_count,
        skipped: latestRun.skipped_count,
        errors: latestRun.error_count,
        startedAt: latestRun.started_at ?? latestRun.created_at,
        finishedAt: latestRun.finished_at,
      } : null,
      agent: agent ? {
        computer: agent.machine_name,
        version: agent.agent_version,
        operatingSystem: agent.operating_system,
        platformVersion: agent.platform_version,
        configuration: agent.configuration_name,
        configurationVersion: agent.configuration_version,
        infobase: agent.infobase_name,
        readOnly: Boolean(agent.read_only),
        status: agent.status,
        importedCount: agent.imported_count,
        lastHeartbeatAt: agent.last_seen_at,
        lastSyncAt: agent.last_sync_at,
      } : null,
    };
  }).filter((item) => !query || [item.venueName, item.source, item.provider, item.agent?.computer]
    .filter(Boolean).some((value) => String(value).toLocaleLowerCase("ru").includes(query)))
    .filter((item) => !options.status || item.status === options.status);

  return {
    items,
    summary: {
      total: items.length,
      working: items.filter((item) => item.status === "working").length,
      attention: items.filter((item) => item.status === "attention").length,
      offline: items.filter((item) => item.status === "offline").length,
    },
  };
}

export async function internalAdminIntegrationDetail(id: string) {
  const integrations = await internalAdminIntegrations();
  const integration = integrations.items.find((item) => item.id === id);
  if (!integration) return null;
  const runs = await getD1().prepare(`
    SELECT id, status, data_type, received_count, created_count, updated_count,
      skipped_count, error_count, errors_json, started_at, finished_at, created_at
    FROM integration_sync_runs WHERE connection_id=? ORDER BY created_at DESC LIMIT 50
  `).bind(id).all<{
    id: string; status: string; data_type: string; received_count: number; created_count: number;
    updated_count: number; skipped_count: number; error_count: number; errors_json: string;
    started_at: string | null; finished_at: string | null; created_at: string;
  }>();
  return {
    ...integration,
    syncHistory: (runs.results ?? []).map((run) => ({
      id: run.id, status: run.status, entityType: run.data_type, received: run.received_count,
      created: run.created_count, updated: run.updated_count, skipped: run.skipped_count,
      errors: run.error_count,
      error: redactText(parseJson<Array<{ message?: string }>>(run.errors_json, [])[0]?.message),
      startedAt: run.started_at ?? run.created_at, finishedAt: run.finished_at,
    })),
  };
}

export async function internalAdminReviews(options: QueryOptions = {}) {
  const rows = await getD1().prepare(`
    SELECT v.id AS venue_id, v.data_account_id, a.restaurant_json,
      d.data_json, d.updated_at AS reviews_updated_at,
      g.status AS google_status, g.location_name, g.last_synced_at,
      g.last_sync_error, g.updated_at AS google_updated_at
    FROM venues v
    INNER JOIN accounts a ON a.id = v.data_account_id
    LEFT JOIN domain_data d ON d.account_id = v.data_account_id AND d.store_key = 'bd_guest_reviews'
    LEFT JOIN google_connections g ON g.account_id = v.data_account_id
    WHERE v.status = 'active'
    ORDER BY COALESCE(d.updated_at, g.updated_at, v.updated_at) DESC
    LIMIT 500
  `).all<{
    venue_id: number; data_account_id: number; restaurant_json: string | null;
    data_json: string | null; reviews_updated_at: string | null; google_status: string | null;
    location_name: string | null; last_synced_at: string | null; last_sync_error: string | null;
    google_updated_at: string | null;
  }>();
  const events = await getD1().prepare(`
    SELECT account_id, source, event, detail, created_at
    FROM review_source_events
    ORDER BY created_at DESC
    LIMIT 2000
  `).all<{ account_id:number; source:string; event:string; detail:string|null; created_at:string }>();
  const eventByAccount = new Map<number, typeof events.results>();
  for (const event of events.results ?? []) {
    eventByAccount.set(event.account_id, [...(eventByAccount.get(event.account_id) ?? []), event]);
  }
  const oauthConfigured = new Map<number, boolean>();
  await Promise.all((rows.results ?? []).map(async (row) => {
    try { oauthConfigured.set(row.data_account_id, await isGoogleOAuthConfigured(row.data_account_id)); }
    catch { oauthConfigured.set(row.data_account_id, false); }
  }));
  const query = options.q?.trim().toLocaleLowerCase("ru") ?? "";
  const items = (rows.results ?? []).map((row) => {
    const stored = parseJson<unknown[]>(row.data_json, []);
    const reviews = Array.isArray(stored) ? stored.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
    const sources: Record<string, number> = {};
    const methods = { sync: 0, manual: 0, fileImport: 0 };
    let lastReceivedAt: string | null = null;
    let lastImportAt: string | null = null;
    for (const review of reviews) {
      const source = typeof review.source === "string" && review.source.trim() ? review.source.trim() : "other";
      sources[source] = (sources[source] ?? 0) + 1;
      const method = typeof review.ingestionMethod === "string" ? review.ingestionMethod : review.syncedAt ? "sync" : review.importedAt ? "file_import" : "manual";
      if (method === "sync") methods.sync += 1;
      else if (method === "file_import") methods.fileImport += 1;
      else methods.manual += 1;
      const received = [review.syncedAt, review.importedAt, review.createdAt, review.updatedAt]
        .find((value): value is string => typeof value === "string" && Boolean(value));
      if (received && (!lastReceivedAt || received > lastReceivedAt)) lastReceivedAt = received;
      if (typeof review.importedAt === "string" && (!lastImportAt || review.importedAt > lastImportAt)) lastImportAt = review.importedAt;
    }
    const sourceEvents = eventByAccount.get(row.data_account_id) ?? [];
    const failed = sourceEvents.filter((event) => ["sync_failed", "import_failed", "import_partial"].includes(event.event));
    const lastEvent = sourceEvents[0] ?? null;
    const status = failed.length || row.google_status === "error"
      ? "attention"
      : reviews.length || row.google_status === "connected"
        ? "working"
        : "unknown";
    return {
      venueId: row.venue_id,
      venueName: profile(row.restaurant_json).name,
      status,
      total: reviews.length,
      sources,
      methods,
      lastReceivedAt,
      lastImportAt,
      updatedAt: row.reviews_updated_at,
      google: {
        status: row.google_status ?? "not_connected",
        oauthConfigured: oauthConfigured.get(row.data_account_id) ?? false,
        locationName: row.location_name,
        lastSyncedAt: row.last_synced_at,
        lastError: redactText(row.last_sync_error),
      },
      failedEvents: failed.length,
      lastEvent: lastEvent ? {
        source: lastEvent.source,
        event: lastEvent.event,
        detail: redactText(lastEvent.detail),
        at: lastEvent.created_at,
      } : null,
    };
  }).filter((item) => !query || [item.venueName, ...Object.keys(item.sources), item.google.locationName]
    .filter(Boolean).some((value) => String(value).toLocaleLowerCase("ru").includes(query)))
    .filter((item) => !options.status || item.status === options.status);
  return {
    items,
    summary: {
      venues: items.length,
      reviews: items.reduce((sum, item) => sum + item.total, 0),
      working: items.filter((item) => item.status === "working").length,
      attention: items.filter((item) => item.status === "attention").length,
      unknown: items.filter((item) => item.status === "unknown").length,
      failedEvents: items.reduce((sum, item) => sum + item.failedEvents, 0),
    },
  };
}

export async function internalAdminUsers(options: QueryOptions = {}) {
  const q = options.q?.trim() ?? "";
  const page = safePage(options.page);
  const limit = safeLimit(options.limit);
  const offset = (page - 1) * limit;
  const like = `%${q}%`;
  const where = q
    ? "AND (a.app_email LIKE ? OR a.first_name LIKE ? OR COALESCE(a.last_name, '') LIKE ?)"
    : "";
  const binds = q ? [like, like, like] : [];
  const total = await getD1().prepare(`
    SELECT COUNT(*) AS count FROM accounts a
    WHERE a.account_kind = 'user' ${where}
  `).bind(...binds).first<{ count: number }>();
  const rows = await getD1().prepare(`
    SELECT a.id, a.app_email, a.first_name, a.last_name, a.created_at,
      COUNT(DISTINCT CASE WHEN vm.status = 'active' THEN vm.venue_id END) AS venue_count,
      MAX(s.created_at) AS last_sign_in_at,
      SUM(CASE WHEN s.expires_at > datetime('now') THEN 1 ELSE 0 END) AS active_sessions
    FROM accounts a
    LEFT JOIN venue_memberships vm ON vm.account_id = a.id
    LEFT JOIN sessions s ON s.account_id = a.id
    WHERE a.account_kind = 'user' ${where}
    GROUP BY a.id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, limit, offset).all<{
    id: number; app_email: string; first_name: string; last_name: string | null;
    created_at: string; venue_count: number; last_sign_in_at: string | null; active_sessions: number;
  }>();
  return {
    items: (rows.results ?? []).map((row) => ({
      id: row.id,
      name: fullName(row),
      email: row.app_email,
      registeredAt: row.created_at,
      venueCount: row.venue_count,
      activeSession: row.active_sessions > 0,
      lastSignInAt: row.last_sign_in_at,
      accountStatus: null,
      accountStatusReason: "Отдельная модель блокировки аккаунта пока не ведётся",
    })),
    pagination: { page, limit, total: total?.count ?? 0 },
    filters: { query: q },
  };
}

export async function internalAdminUserDetail(id: number) {
  const account = await getD1().prepare(`
    SELECT id, app_email, first_name, last_name, phone, created_at, updated_at
    FROM accounts WHERE id = ? AND account_kind = 'user' LIMIT 1
  `).bind(id).first<{
    id: number; app_email: string; first_name: string; last_name: string | null;
    phone: string | null; created_at: string; updated_at: string;
  }>();
  if (!account) return null;
  const memberships = await getD1().prepare(`
    SELECT vm.id, vm.venue_id, vm.role, vm.status, vm.joined_at, da.restaurant_json,
      v.data_account_id
    FROM venue_memberships vm
    INNER JOIN venues v ON v.id = vm.venue_id
    INNER JOIN accounts da ON da.id = v.data_account_id
    WHERE vm.account_id = ?
    ORDER BY vm.joined_at DESC
  `).bind(id).all<{
    id: number; venue_id: number; role: string; status: string; joined_at: string;
    restaurant_json: string | null; data_account_id: number;
  }>();
  const venueItems = (memberships.results ?? []).map((row) => ({
    membershipId: row.id,
    venueId: row.venue_id,
    venueName: profile(row.restaurant_json).name,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    dataAccountId: row.data_account_id,
  }));
  const usage = await getD1().prepare(`
    SELECT u.account_id, u.used_requests, u.request_limit, u.period_key, u.updated_at,
      v.id AS venue_id, a.restaurant_json
    FROM ai_usage_limits u
    INNER JOIN venues v ON v.data_account_id = u.account_id
    INNER JOIN accounts a ON a.id = v.data_account_id
    WHERE v.id IN (SELECT venue_id FROM venue_memberships WHERE account_id = ?)
    ORDER BY u.period_key DESC
  `).bind(id).all<{
    account_id: number; used_requests: number; request_limit: number; period_key: string;
    updated_at: string; venue_id: number; restaurant_json: string | null;
  }>();
  const integrations = await internalAdminIntegrations();
  const venueIds = new Set(venueItems.map((item) => item.venueId));
  const security = await getD1().prepare(`
    SELECT id, action, target_type, target_id, result, reason, created_at
    FROM platform_admin_audit
    WHERE admin_account_id = ? OR (target_type = 'account' AND target_id = ?)
    ORDER BY created_at DESC LIMIT 30
  `).bind(id, String(id)).all<{
    id: number; action: string; target_type: string; target_id: string | null;
    result: string; reason: string | null; created_at: string;
  }>();
  const sessions = await getD1().prepare(`
    SELECT COUNT(*) AS total, SUM(CASE WHEN expires_at > datetime('now') THEN 1 ELSE 0 END) AS active,
      MAX(created_at) AS last_sign_in_at, MAX(expires_at) AS latest_expiry_at
    FROM sessions WHERE account_id=?
  `).bind(id).first<{ total: number; active: number; last_sign_in_at: string | null; latest_expiry_at: string | null }>();
  const aiEvents = await getD1().prepare(`
    SELECT venue_id, feature, model, status, input_tokens, output_tokens, total_tokens, latency_ms, created_at
    FROM ai_usage_events WHERE actor_account_id=? ORDER BY created_at DESC LIMIT 100
  `).bind(id).all<{
    venue_id: number | null; feature: string; model: string; status: string; input_tokens: number | null;
    output_tokens: number | null; total_tokens: number | null; latency_ms: number | null; created_at: string;
  }>();
  return {
    id: account.id,
    name: fullName(account),
    email: account.app_email,
    phone: account.phone,
    registeredAt: account.created_at,
    updatedAt: account.updated_at,
    accountStatus: null,
    subscription: { available: false, reason: "Модель подписки пока не подключена к Internal Admin" },
    venues: venueItems,
    integrations: integrations.items.filter((item) => venueIds.has(item.venueId)),
    aiUsage: (usage.results ?? []).map((row) => ({
      venueId: row.venue_id,
      venueName: profile(row.restaurant_json).name,
      period: row.period_key,
      requests: row.used_requests,
      internalQuota: row.request_limit,
      updatedAt: row.updated_at,
    })),
    aiEvents: aiEvents.results ?? [],
    sessions: {
      total: sessions?.total ?? 0, active: sessions?.active ?? 0,
      lastSignInAt: sessions?.last_sign_in_at ?? null, latestExpiryAt: sessions?.latest_expiry_at ?? null,
    },
    securityEvents: (security.results ?? []).map((item) => ({ ...item, displayAction: adminActionLabel(item.action) })),
  };
}

export async function internalAdminVenues(options: QueryOptions = {}) {
  const q = options.q?.trim().toLocaleLowerCase("ru") ?? "";
  const rows = await getD1().prepare(`
    SELECT v.id, v.status, v.created_at, v.updated_at, v.data_account_id,
      da.restaurant_json,
      COUNT(DISTINCT CASE WHEN vm.status = 'active' THEN vm.account_id END) AS member_count,
      MAX(al.created_at) AS last_data_change_at
    FROM venues v
    INNER JOIN accounts da ON da.id = v.data_account_id
    LEFT JOIN venue_memberships vm ON vm.venue_id = v.id
    LEFT JOIN audit_log al ON al.account_id = v.data_account_id
    GROUP BY v.id
    ORDER BY v.created_at DESC
    LIMIT 1000
  `).all<{
    id: number; status: string; created_at: string; updated_at: string; data_account_id: number;
    restaurant_json: string | null; member_count: number; last_data_change_at: string | null;
  }>();
  const owners = await getD1().prepare(`
    SELECT vm.venue_id, a.id AS account_id, a.app_email, a.first_name, a.last_name
    FROM venue_memberships vm
    INNER JOIN accounts a ON a.id = vm.account_id
    WHERE vm.role = 'owner' AND vm.status = 'active'
    ORDER BY vm.joined_at
  `).all<{
    venue_id: number; account_id: number; app_email: string; first_name: string; last_name: string | null;
  }>();
  const ownerByVenue = new Map<number, (typeof owners.results)[number]>();
  for (const item of owners.results ?? []) if (!ownerByVenue.has(item.venue_id)) ownerByVenue.set(item.venue_id, item);
  const integration = await internalAdminIntegrations();
  const integrationByVenue = new Map<number, typeof integration.items>();
  for (const item of integration.items) {
    const list = integrationByVenue.get(item.venueId) ?? [];
    list.push(item);
    integrationByVenue.set(item.venueId, list);
  }
  const items = (rows.results ?? []).map((row) => {
    const venue = profile(row.restaurant_json);
    const owner = ownerByVenue.get(row.id);
    const sources = integrationByVenue.get(row.id) ?? [];
    const integrationStatus = sources.some((item) => item.status === "offline")
      ? "offline"
      : sources.some((item) => item.status === "attention")
        ? "attention"
        : sources.length ? "working" : "not_connected";
    return {
      id: row.id,
      name: venue.name,
      city: venue.city,
      region: venue.region,
      country: venue.country,
      owner: owner ? { id: owner.account_id, name: fullName(owner), email: owner.app_email } : null,
      status: row.status,
      createdAt: row.created_at,
      memberCount: row.member_count,
      lastDataChangeAt: row.last_data_change_at,
      integrationStatus,
      integrationCount: sources.length,
    };
  }).filter((item) => !q || [item.name, item.city, item.region, item.owner?.name, item.owner?.email]
    .filter(Boolean).some((value) => String(value).toLocaleLowerCase("ru").includes(q)));
  return { items, total: items.length };
}

export async function internalAdminVenueDetail(id: number) {
  const venues = await internalAdminVenues();
  const venue = venues.items.find((item) => item.id === id);
  if (!venue) return null;
  const members = await getD1().prepare(`
    SELECT a.id, a.app_email, a.first_name, a.last_name, vm.role, vm.status, vm.joined_at
    FROM venue_memberships vm
    INNER JOIN accounts a ON a.id = vm.account_id
    WHERE vm.venue_id = ? ORDER BY vm.joined_at
  `).bind(id).all<{
    id: number; app_email: string; first_name: string; last_name: string | null;
    role: string; status: string; joined_at: string;
  }>();
  const stores = await getD1().prepare(`
    SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at
    FROM domain_data
    WHERE account_id = (SELECT data_account_id FROM venues WHERE id = ?)
  `).bind(id).first<{ count: number; updated_at: string | null }>();
  const [integrations, ai] = await Promise.all([internalAdminIntegrations(), internalAdminAI()]);
  return {
    ...venue,
    members: (members.results ?? []).map((row) => ({
      id: row.id,
      name: fullName(row),
      email: row.app_email,
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
    })),
    integrations: integrations.items.filter((item) => item.venueId === id),
    ai: {
      usage: ai.byVenue.find((item) => item.venueId === id) ?? null,
      cost: null,
      costReason: ai.totals.estimatedCostReason,
    },
    dataState: {
      storeCount: stores?.count ?? 0,
      lastStoreUpdateAt: stores?.updated_at ?? null,
      completenessTracked: false,
    },
  };
}

export async function internalAdminAI(options: QueryOptions = {}) {
  const periodStart = `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`;
  const rows = await getD1().prepare(`
    SELECT e.id,e.account_id,e.actor_account_id,e.venue_id,e.provider,e.model,e.feature,
      e.input_tokens,e.output_tokens,e.total_tokens,e.status,e.latency_ms,e.error_code,e.created_at,
      a.restaurant_json
    FROM ai_usage_events e LEFT JOIN venues v ON v.id=e.venue_id LEFT JOIN accounts a ON a.id=v.data_account_id
    WHERE e.created_at>=? ORDER BY e.created_at DESC LIMIT 5000
  `).bind(periodStart).all<{
    id: number; account_id: number; actor_account_id: number | null; venue_id: number | null;
    provider: string; model: string; feature: string; input_tokens: number | null; output_tokens: number | null;
    total_tokens: number | null; status: string; latency_ms: number | null; error_code: string | null;
    created_at: string; restaurant_json: string | null;
  }>();
  const limits = await getD1().prepare(`
    SELECT u.account_id,u.used_requests,u.request_limit,u.period_key,u.updated_at,v.id AS venue_id,a.restaurant_json
    FROM ai_usage_limits u LEFT JOIN venues v ON v.data_account_id=u.account_id LEFT JOIN accounts a ON a.id=u.account_id
    ORDER BY u.updated_at DESC LIMIT 1000
  `).all<{ account_id:number;used_requests:number;request_limit:number;period_key:string;updated_at:string;venue_id:number|null;restaurant_json:string|null }>();
  let apiConfigured = false;
  let model: string | null = null;
  try {
    [apiConfigured, model] = await Promise.all([
      getPlatformIntegrationValue("OPENAI_API_KEY").then(Boolean),
      getPlatformIntegrationValue("OPENAI_MODEL"),
    ]);
  } catch {
    apiConfigured = false;
    model = null;
  }
  const q = options.q?.trim().toLocaleLowerCase("ru") ?? "";
  const events = (rows.results ?? []).filter((row) => !q || [profile(row.restaurant_json).name,row.feature,row.model,row.provider]
    .some((value) => value.toLocaleLowerCase("ru").includes(q)));
  const tokenKnown = (row: (typeof events)[number]) => row.total_tokens !== null || row.input_tokens !== null || row.output_tokens !== null;
  const aggregate = <T,>(values: typeof events, key: (row: (typeof events)[number]) => T) => {
    const groups = new Map<T, typeof events>();
    for (const row of values) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
    return [...groups.entries()].map(([group, list]) => {
      const tokenRows = list.filter(tokenKnown);
      const latencyRows = list.filter((row) => row.latency_ms !== null);
      return {
        group, requests: list.length,
        inputTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.input_tokens??0),0) : null,
        outputTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.output_tokens??0),0) : null,
        totalTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.total_tokens??((row.input_tokens??0)+(row.output_tokens??0))),0) : null,
        errors: list.filter((row)=>row.status==="error").length,
        averageLatencyMs: latencyRows.length ? Math.round(latencyRows.reduce((sum,row)=>sum+(row.latency_ms??0),0)/latencyRows.length) : null,
        lastRequestAt: list[0]?.created_at ?? null,
      };
    });
  };
  const byVenue = aggregate(events,(row)=>row.venue_id??0).map((item)=>({
    ...item, venueId:item.group||null,
    venueName:item.group ? profile(events.find((row)=>(row.venue_id??0)===item.group)?.restaurant_json).name : "Без venue metadata",
  })).sort((a,b)=>b.requests-a.requests);
  const byFeature = aggregate(events,(row)=>row.feature).map((item)=>({...item,feature:item.group})).sort((a,b)=>b.requests-a.requests);
  const byModel = aggregate(events,(row)=>`${row.provider}|${row.model}`).map((item)=>{
    const [providerName,modelName]=String(item.group).split("|"); return {...item,provider:providerName,model:modelName};
  }).sort((a,b)=>b.requests-a.requests);
  const tokenRows = events.filter(tokenKnown);
  const latencyRows = events.filter((row)=>row.latency_ms!==null);
  return {
    provider: {
      name: "OpenAI",
      configured: apiConfigured,
      model,
      liveHealthChecked: false,
    },
    totals: {
      requests: events.length,
      inputTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.input_tokens??0),0) : null,
      outputTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.output_tokens??0),0) : null,
      totalTokens: tokenRows.length ? tokenRows.reduce((sum,row)=>sum+(row.total_tokens??((row.input_tokens??0)+(row.output_tokens??0))),0) : null,
      errors: events.filter((row)=>row.status==="error").length,
      averageLatencyMs: latencyRows.length ? Math.round(latencyRows.reduce((sum,row)=>sum+(row.latency_ms??0),0)/latencyRows.length) : null,
      venues: new Set(events.map((row)=>row.venue_id).filter(Boolean)).size,
      estimatedCost: null,
      estimatedCostReason: "Не рассчитано: версия тарифа провайдера на момент вызова не фиксируется",
    },
    tracking: {
      requests: true,
      tokens: true,
      cost: false,
      startedAt: events.length ? events[events.length-1].created_at : null,
      note: "Токены сохраняются только когда провайдер возвращает usage; содержимое запросов и ответов не сохраняется",
    },
    period: { key: periodStart.slice(0,7), startedAt: periodStart },
    byVenue, byFeature, byModel,
    technicalLimits: (limits.results??[]).map((row)=>({
      accountId:row.account_id,venueId:row.venue_id,venueName:profile(row.restaurant_json).name,
      period:row.period_key,usedRequests:row.used_requests,requestLimit:row.request_limit,updatedAt:row.updated_at,
    })),
    recent: events.slice(0,100).map((row)=>({
      id:row.id,venueId:row.venue_id,venueName:row.venue_id ? profile(row.restaurant_json).name : "Без venue metadata",actorAccountId:row.actor_account_id,
      feature:row.feature,provider:row.provider,model:row.model,inputTokens:row.input_tokens,outputTokens:row.output_tokens,
      totalTokens:row.total_tokens,status:row.status,latencyMs:row.latency_ms,errorCode:row.error_code,createdAt:row.created_at,
    })),
  };
}

export async function internalAdminPush(options: QueryOptions = {}) {
  const appId = runtimeEnv("ONESIGNAL_APP_ID");
  let serverConfigured = false;
  try {
    serverConfigured = Boolean(appId && await getPlatformIntegrationValue("ONESIGNAL_REST_API_KEY"));
  } catch {
    serverConfigured = false;
  }
  const deliveries = await getD1().prepare(`
    SELECT d.id, d.account_id, d.category, d.status, d.detail, d.created_at,
      a.app_email, a.first_name, a.last_name
    FROM notification_deliveries d
    INNER JOIN accounts a ON a.id = d.account_id
    WHERE d.created_at >= datetime('now','-30 days')
    ORDER BY d.created_at DESC LIMIT 500
  `).all<{
    id: number; account_id: number; category: string; status: string; detail: string | null;
    created_at: string; app_email: string; first_name: string; last_name: string | null;
  }>();
  const allDeliveries = (deliveries.results ?? []).map((row) => ({
    id: row.id,
    kind: "delivery" as const,
    accountId: row.account_id,
    account: fullName(row),
    category: row.category,
    status: row.status,
    detail: redactText(row.detail),
    createdAt: row.created_at,
  }));
  const jobs = await getD1().prepare(`
    SELECT j.id,j.account_id,j.venue_id,j.source_type,j.source_id,j.category,j.status,j.target_at,j.timezone,
      j.attempt_count,j.next_attempt_at,j.last_error,j.created_at,j.updated_at,a.app_email,a.first_name,a.last_name
    FROM notification_jobs j INNER JOIN accounts a ON a.id=j.account_id ORDER BY j.updated_at DESC LIMIT 500
  `).all<{
    id:number;account_id:number;venue_id:number|null;source_type:string;source_id:string|null;category:string;status:string;
    target_at:string;timezone:string;attempt_count:number;next_attempt_at:string|null;last_error:string|null;
    created_at:string;updated_at:string;app_email:string;first_name:string;last_name:string|null;
  }>();
  const jobItems=(jobs.results??[]).map((row)=>({
    id:row.id,kind:"job" as const,accountId:row.account_id,account:fullName(row),venueId:row.venue_id,
    sourceType:row.source_type,sourceId:row.source_id,category:row.category,status:row.status,targetAt:row.target_at,
    timezone:row.timezone,attempts:row.attempt_count,nextAttemptAt:row.next_attempt_at,detail:redactText(row.last_error),
    createdAt:row.created_at,updatedAt:row.updated_at,
  }));
  const devices = await getD1().prepare(`
    SELECT d.account_id,d.device_key,d.subscription_id,d.permission,d.opted_in,d.active,d.last_seen_at,d.updated_at,
      a.app_email,a.first_name,a.last_name
    FROM notification_devices d INNER JOIN accounts a ON a.id=d.account_id
    ORDER BY d.last_seen_at DESC LIMIT 1000
  `).all<{
    account_id:number;device_key:string;subscription_id:string|null;permission:string;opted_in:number;active:number;
    last_seen_at:string;updated_at:string;app_email:string;first_name:string;last_name:string|null;
  }>();
  const deviceItems=(devices.results??[]).map((row)=>({
    accountId:row.account_id,account:fullName(row),deviceKey:row.device_key,subscriptionId:row.subscription_id ? "present" : "missing",
    permission:row.permission,optedIn:Boolean(row.opted_in),active:Boolean(row.active),lastSeenAt:row.last_seen_at,updatedAt:row.updated_at,
  }));
  const q=options.q?.trim().toLocaleLowerCase("ru")??"";
  const matches=(item:{account:string;category:string;status:string;detail:string|null})=>(!options.status||item.status===options.status)
    &&(!q||[item.account,item.category,item.status,item.detail].filter(Boolean).some((value)=>String(value).toLocaleLowerCase("ru").includes(q)));
  const items=allDeliveries.filter(matches);
  const accepted=allDeliveries.filter((item)=>item.status==="accepted").length;
  const scheduled=allDeliveries.filter((item)=>item.status==="scheduled").length;
  const failedItems=allDeliveries.filter((item)=>item.status==="failed");
  const failed=failedItems.length;
  const groups=new Map<string,typeof failedItems>();
  for(const item of failedItems){const key=`${item.category}|${item.detail??"Неизвестная ошибка провайдера"}`;groups.set(key,[...(groups.get(key)??[]),item]);}
  const failedJobs = jobItems.filter((item)=>item.status==="failed").length;
  const activeDevices=deviceItems.filter((item)=>item.active);
  const staleCutoff=Date.now()-7*86_400_000;
  const staleDevices=deviceItems.filter((item)=>item.active && Date.parse(item.lastSeenAt)<staleCutoff);
  const successful=allDeliveries.filter((item)=>item.status==="accepted"||item.status==="scheduled");
  const recentSuccessful=successful.filter((item)=>Date.parse(item.createdAt)>=staleCutoff);
  const enabledWithoutRecentSuccess=activeDevices.length>0 && recentSuccessful.length===0;
  const health = !serverConfigured
    ? "not_configured"
    : allDeliveries.length === 0 && jobItems.length === 0
      ? "unknown"
      : enabledWithoutRecentSuccess || (failed > 0 || failedJobs > 0) && accepted + scheduled === 0
        ? "error"
        : failed > 0 || failedJobs > 0 || staleDevices.length > 0 ? "attention" : "working";
  return {
    provider: "OneSignal",
    configured: serverConfigured,
    clientConfigured: Boolean(appId),
    credentials: {
      appId: appId ? "configured" : "missing",
      restApiKey: serverConfigured ? "configured" : "missing",
    },
    health,
    summary: {
      recent: allDeliveries.length,
      accepted,
      scheduled,
      failed,
      noSubscription: allDeliveries.filter((item) => item.status === "no_subscription").length,
      queuedJobs: jobItems.filter((item)=>item.status==="queued").length,
      failedJobs,
      activeDevices:activeDevices.length,
      staleDevices:staleDevices.length,
    },
    observability: {
      lastGeneratedAt:jobItems.map((item)=>item.createdAt).sort().at(-1)??null,
      lastAttemptAt:jobItems.filter((item)=>item.attempts>0).map((item)=>item.updatedAt).sort().at(-1)??null,
      lastSuccessAt:successful.map((item)=>item.createdAt).sort().at(-1)??null,
      lastFailureAt:[...failedItems.map((item)=>item.createdAt),...jobItems.filter((item)=>item.status==="failed").map((item)=>item.updatedAt)].sort().at(-1)??null,
      lastSuppressedAt:jobItems.filter((item)=>["cancelled","expired"].includes(item.status)).map((item)=>item.updatedAt).sort().at(-1)??null,
    },
    warnings: [
      ...(enabledWithoutRecentSuccess ? [{code:"NO_RECENT_SUCCESS",severity:"error",message:"Есть активные push-устройства, но за 7 дней нет ни одной успешной передачи провайдеру."}] : []),
      ...(staleDevices.length ? [{code:"STALE_SUBSCRIPTIONS",severity:"attention",message:`${staleDevices.length} активных подписок не подтверждали состояние более 7 дней.`}] : []),
    ],
    errorGroups:[...groups.entries()].map(([key,values])=>({
      key,category:values[0].category,count:values.length,reason:values[0].detail??"Неизвестная ошибка провайдера",
      lastErrorAt:values[0].createdAt,affectedAccounts:new Set(values.map((item)=>item.accountId)).size,eventIds:values.map((item)=>item.id),
    })).sort((a,b)=>b.count-a.count),
    deliveries: items,
    jobs:jobItems.filter(matches),
    devices:deviceItems,
    testNotificationAvailable: false,
    testNotificationReason: "Internal Admin не отправляет уведомление на устройство пользователя без явного выбора получателя",
  };
}

export async function internalAdminSystem() {
  let database: "working" | "error" = "working";
  try {
    await getD1().prepare("SELECT 1 AS ok").first();
  } catch {
    database = "error";
  }
  const [integrations, ai, push, staleProcessing, notificationQueue] = await Promise.all([
    internalAdminIntegrations(),
    internalAdminAI(),
    internalAdminPush(),
    getD1().prepare(`
      SELECT COUNT(*) AS count FROM integration_ingress_deliveries
      WHERE status = 'processing' AND updated_at < datetime('now', '-15 minutes')
    `).first<{ count: number }>(),
    getD1().prepare(`
      SELECT
        SUM(CASE WHEN status='dispatching' AND leased_at < datetime('now','-15 minutes') THEN 1 ELSE 0 END) AS stale,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS queued
      FROM notification_jobs
    `).first<{ stale: number; failed: number; queued: number }>(),
  ]);
  const issues: Array<{source:string;severity:"warning"|"critical";fact:string;context:string;action?:{section:string;status?:string}}> = [];
  if (database === "error") issues.push({
    source: "database", severity: "critical", fact: "Нет соединения с базой данных", context: "Защищённый API не смог выполнить контрольный запрос D1",
  });
  if (integrations.summary.offline) issues.push({
    source: "integrations", severity: "critical", fact: `Интеграции не в сети: ${integrations.summary.offline}`, context: "По соединению, последнему сигналу агента и последнему запуску", action:{section:"integrations",status:"offline"},
  });
  if (integrations.summary.attention) issues.push({
    source: "integrations", severity: "warning", fact: `Интеграции требуют внимания: ${integrations.summary.attention}`, context: "Незавершённая настройка, частичные запуски или устаревший сигнал агента", action:{section:"integrations",status:"attention"},
  });
  if ((staleProcessing?.count ?? 0) > 0) issues.push({
    source: "sync", severity: "critical", fact: `Зависшие элементы очереди: ${staleProcessing?.count}`, context: "Состояние обработки не обновлялось более 15 минут", action:{section:"integrations",status:"attention"},
  });
  if (push.health === "error" || push.health === "attention") issues.push({
    source: "push", severity: push.health === "error" ? "critical" : "warning", fact: `Ошибки push-доставки или заданий: ${push.summary.failed + push.summary.failedJobs}`, context: "По сохранённым результатам OneSignal и очереди BarDoctor; это не означает отказ всей инфраструктуры", action:{section:"push",status:"failed"},
  });
  if ((notificationQueue?.stale ?? 0) > 0) issues.push({
    source: "push", severity: "critical", fact: `Push-задания, зависшие при передаче: ${notificationQueue?.stale}`, context: "Аренда задания в состоянии передачи не обновлялась более 15 минут", action:{section:"push",status:"failed"},
  });
  if (!ai.provider.configured) issues.push({
    source: "ai", severity: "warning", fact: "AI-провайдер не настроен", context: "На сервере нет доступного ключа OpenAI", action:{section:"ai"},
  });
  return {
    coverage: "partial",
    coverageNote: "Общее время доступности и единая агрегация ошибок пока не сохраняются; показаны только проверяемые сигналы",
    components: [
      { key:"api",label:"API / сервер",status:"working",evidence:"Этот защищённый API успешно выполнил запрос" },
      { key:"database",label:"База данных",status:database,evidence:"Контрольный запрос D1" },
      { key:"integrations",label:"Слой интеграций",status:integrations.summary.offline?"error":integrations.summary.attention?"attention":integrations.summary.total?"working":"unknown",evidence:"Соединения, сигналы агентов и запуски синхронизации",action:{section:"integrations"} },
      { key:"background",label:"Фоновые задачи / синхронизация",status:(staleProcessing?.count??0)>0||(notificationQueue?.stale??0)>0?"error":(notificationQueue?.failed??0)>0?"attention":integrations.summary.total||((notificationQueue?.queued??0)>0)?"configured_unverified":"unknown",evidence:"Входящая очередь, долговечные push-задания и аренды; наличие очереди не подтверждает работу планировщика",action:{section:(notificationQueue?.failed??0)>0?"push":"integrations"} },
      { key:"ai",label:"AI-провайдер",status:ai.provider.configured?"configured_unverified":"not_configured",evidence:"Наличие конфигурации без проверки доступности провайдера",action:{section:"ai"} },
      { key:"push",label:"Push-провайдер",status:push.health,evidence:"Конфигурация и сохранённые результаты доставки",action:{section:"push"} },
      { key:"mfa",label:"Двухфакторная защита администраторов",status:"not_available",evidence:"Текущая архитектура входа и сессий не поддерживает проверенный второй фактор, подключение устройства и восстановление доступа" },
    ],
    issues,
    recentCriticalErrors: issues.filter((item) => item.severity === "critical"),
  };
}

export async function internalAdminDashboard() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000).toISOString();
  const [users, signedIn, venueCount, integrations, ai, push, system] = await Promise.all([
    getD1().prepare("SELECT COUNT(*) AS count FROM accounts WHERE account_kind = 'user'").first<{ count: number }>(),
    getD1().prepare("SELECT COUNT(DISTINCT account_id) AS count FROM sessions WHERE created_at >= ?").bind(thirtyDaysAgo).first<{ count: number }>(),
    getD1().prepare("SELECT COUNT(*) AS count FROM venues WHERE status = 'active'").first<{ count: number }>(),
    internalAdminIntegrations(),
    internalAdminAI(),
    internalAdminPush(),
    internalAdminSystem(),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    users: {
      total: users?.count ?? 0,
      active: null,
      signedInLast30Days: signedIn?.count ?? 0,
      note: "Полная активность аккаунта не фиксируется; показаны входы за последние 30 дней",
    },
    venues: { total: venueCount?.count ?? 0 },
    integrations: integrations.summary,
    ai: {
      period: ai.period.key,
      requests: ai.totals.requests,
      inputTokens: ai.totals.inputTokens,
      outputTokens: ai.totals.outputTokens,
      totalTokens: ai.totals.totalTokens,
      errors: ai.totals.errors,
      averageLatencyMs: ai.totals.averageLatencyMs,
      venues: ai.totals.venues,
      cost: ai.totals.estimatedCost,
      costReason: ai.totals.estimatedCostReason,
      configured: ai.provider.configured,
    },
    push: { configured: push.configured, health: push.health, recentErrors: push.summary.failed },
    system: {
      status: system.issues.some((item) => item.severity === "critical") ? "attention" : system.coverage === "partial" ? "unknown" : "working",
      issues: system.issues.length,
      coverage: system.coverage,
    },
  };
}

export async function internalAdminAudit(options: QueryOptions = {}) {
  const q = options.q?.trim() ?? "";
  const like = `%${q}%`;
  const rows = await getD1().prepare(`
    SELECT pa.id, pa.admin_account_id, pa.action, pa.target_type, pa.target_id,
      pa.before_json, pa.after_json, pa.result, pa.reason, pa.request_id, pa.created_at,
      a.app_email, a.first_name, a.last_name
    FROM platform_admin_audit pa
    INNER JOIN accounts a ON a.id = pa.admin_account_id
    WHERE (? = '' OR pa.action LIKE ? OR pa.target_type LIKE ? OR COALESCE(pa.target_id, '') LIKE ?)
    ORDER BY pa.created_at DESC
    LIMIT 250
  `).bind(q, like, like, like).all<{
    id: number; admin_account_id: number; action: string; target_type: string;
    target_id: string | null; before_json: string | null; after_json: string | null;
    result: string; reason: string | null; request_id: string; created_at: string;
    app_email: string; first_name: string; last_name: string | null;
  }>();
  return {
    immutable: true,
    items: (rows.results ?? []).map((row) => ({
      id: row.id,
      admin: { id: row.admin_account_id, name: fullName(row), email: row.app_email },
      action: row.action,
      displayAction: adminActionLabel(row.action),
      target: { type: row.target_type, id: row.target_id },
      before: parseJson<unknown>(row.before_json, null),
      after: parseJson<unknown>(row.after_json, null),
      result: row.result,
      reason: row.reason,
      requestId: row.request_id,
      createdAt: row.created_at,
    })),
  };
}

export async function internalAdminAuditDetail(id: number) {
  const audit = await internalAdminAudit();
  return audit.items.find((item) => item.id === id) ?? null;
}

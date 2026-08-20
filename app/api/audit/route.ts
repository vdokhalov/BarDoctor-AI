import { getD1 } from "../../../db";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import {
  availableModule,
  moduleKeys,
  presentAuditEvent,
  sourceFromAudit,
  type AuditSourceKind,
  type PresentedAuditEvent,
} from "../../../lib/bardoctor/audit-presentation";

type AuditDatabaseRow = {
  id: number;
  storeKey: string;
  action: string;
  entityId: string | null;
  entityLabel: string | null;
  monthKey: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  changedFieldsJson: string | null;
  actorName: string;
  actorRole: string;
  reason: string | null;
  createdAt: string;
};

type IntegrationIssueRow = {
  id: string;
  connectionId: string;
  sourceName: string | null;
  dataType: string;
  status: string;
  receivedCount: number;
  errorCount: number;
  mappingIssueCount: number;
  errorsJson: string;
  finishedAt: string | null;
  createdAt: string;
};

type PeriodRecord = Record<string, unknown> & {
  id?: unknown;
  monthKey?: unknown;
  status?: unknown;
  closedAt?: unknown;
  closedBy?: unknown;
  reopenedAt?: unknown;
  reopenedBy?: unknown;
  reason?: unknown;
};

type QueryDefinition = {
  where: string;
  bindings: unknown[];
};

const AUDIT_SELECT = `
  SELECT id,
    store_key AS storeKey,
    action,
    entity_id AS entityId,
    entity_label AS entityLabel,
    month_key AS monthKey,
    before_json AS beforeJson,
    after_json AS afterJson,
    changed_fields_json AS changedFieldsJson,
    actor_name AS actorName,
    actor_role AS actorRole,
    reason,
    created_at AS createdAt
  FROM audit_log
`;

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function boundedInteger(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function likeValue(value: string): string {
  return `%${value.replace(/[\\%_]/g, (symbol) => `\\${symbol}`)}%`;
}

function isoDay(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function sourceSql(source: string): string | null {
  const integration = `(COALESCE(after_json, '') LIKE '%"source":"integration"%' OR COALESCE(before_json, '') LIKE '%"source":"integration"%' OR COALESCE(after_json, '') LIKE '%"externalSystem"%' OR COALESCE(before_json, '') LIKE '%"externalSystem"%' OR COALESCE(reason, '') LIKE '%синхронизир%' COLLATE NOCASE)`;
  const oneC = `(COALESCE(after_json, '') LIKE '%1C%' COLLATE NOCASE OR COALESCE(after_json, '') LIKE '%1С%' COLLATE NOCASE OR COALESCE(before_json, '') LIKE '%1C%' COLLATE NOCASE OR COALESCE(before_json, '') LIKE '%1С%' COLLATE NOCASE OR COALESCE(reason, '') LIKE '%Local Connector%' COLLATE NOCASE OR COALESCE(reason, '') LIKE '%1С%' COLLATE NOCASE)`;
  const imported = `(COALESCE(after_json, '') LIKE '%"source":"import"%' OR COALESCE(before_json, '') LIKE '%"source":"import"%' OR COALESCE(reason, '') LIKE '%импорт%' COLLATE NOCASE)`;
  const ai = `(COALESCE(after_json, '') LIKE '%"source":"ai%' OR COALESCE(before_json, '') LIKE '%"source":"ai%' OR COALESCE(reason, '') LIKE '%AI%' COLLATE NOCASE)`;
  const system = `(actor_role = 'system' OR COALESCE(actor_name, '') LIKE '%систем%' COLLATE NOCASE)`;
  if (source === "local_connector") return `${integration} AND ${oneC}`;
  if (source === "integration") return `${integration} AND NOT ${oneC}`;
  if (source === "api") return `${integration} AND (COALESCE(reason, '') LIKE '%API%' COLLATE NOCASE OR COALESCE(after_json, '') LIKE '%"sourceType":"api%')`;
  if (source === "import") return imported;
  if (source === "ai_assisted") return ai;
  if (source === "system") return system;
  if (source === "user") return `NOT ${integration} AND NOT ${imported} AND NOT ${ai} AND NOT ${system}`;
  return null;
}

function queryDefinition(accountId: number, url: URL): QueryDefinition {
  const clauses = ["account_id = ?"];
  const bindings: unknown[] = [accountId];
  const moduleFilter = url.searchParams.get("module")?.trim() ?? "";
  const storeKey = url.searchParams.get("storeKey")?.trim() ?? "";
  const source = url.searchParams.get("source")?.trim() ?? "";
  const actor = url.searchParams.get("actor")?.trim() ?? "";
  const query = url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const monthKey = url.searchParams.get("monthKey")?.trim() ?? "";
  const from = isoDay(url.searchParams.get("from"));
  const to = isoDay(url.searchParams.get("to"));

  if (storeKey) {
    clauses.push("store_key = ?");
    bindings.push(storeKey);
  } else if (moduleFilter && moduleFilter !== "all") {
    const keys = moduleKeys(moduleFilter);
    if (keys.length) {
      clauses.push(`store_key IN (${keys.map(() => "?").join(", ")})`);
      bindings.push(...keys);
    } else {
      clauses.push("1 = 0");
    }
  }
  if (source && source !== "all") {
    const expression = sourceSql(source);
    if (expression) clauses.push(expression);
  }
  if (actor) {
    clauses.push("actor_name = ?");
    bindings.push(actor);
  }
  if (query) {
    const value = likeValue(query);
    clauses.push("(actor_name LIKE ? ESCAPE '\\' COLLATE NOCASE OR entity_label LIKE ? ESCAPE '\\' COLLATE NOCASE OR reason LIKE ? ESCAPE '\\' COLLATE NOCASE)");
    bindings.push(value, value, value);
  }
  if (/^\d{4}-\d{2}$/.test(monthKey)) {
    clauses.push("(month_key = ? OR created_at LIKE ?)");
    bindings.push(monthKey, `${monthKey}%`);
  }
  if (from) {
    clauses.push("created_at >= ?");
    bindings.push(`${from}T00:00:00.000Z`);
  }
  if (to) {
    clauses.push("created_at <= ?");
    bindings.push(`${to}T23:59:59.999Z`);
  }
  return { where: clauses.join(" AND "), bindings };
}

async function auditPage(
  accountId: number,
  url: URL,
  limit: number,
  offset: number,
): Promise<{ rows: AuditDatabaseRow[]; total: number }> {
  const query = queryDefinition(accountId, url);
  const database = getD1();
  const [result, count] = await Promise.all([
    database.prepare(`${AUDIT_SELECT} WHERE ${query.where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .bind(...query.bindings, limit, offset)
      .all<AuditDatabaseRow>(),
    database.prepare(`SELECT COUNT(*) AS total FROM audit_log WHERE ${query.where}`)
      .bind(...query.bindings)
      .first<{ total: number }>(),
  ]);
  return { rows: result.results ?? [], total: Number(count?.total ?? 0) };
}

async function allAuditRows(accountId: number, url: URL, maximum = 50_000): Promise<AuditDatabaseRow[]> {
  const query = queryDefinition(accountId, url);
  const result = await getD1().prepare(`${AUDIT_SELECT} WHERE ${query.where} ORDER BY created_at DESC, id DESC LIMIT ?`)
    .bind(...query.bindings, maximum)
    .all<AuditDatabaseRow>();
  return result.results ?? [];
}

function parseArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function periodTitle(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
    .format(new Date(`${monthKey}-01T12:00:00Z`))
    .replace(/^./u, (character) => character.toUpperCase());
}

async function periods(account: {
  id: number;
  role: string;
  permissions: Parameters<typeof hasPermission>[0]["permissions"];
}): Promise<{
  available: boolean;
  current: Record<string, unknown> | null;
  history: Record<string, unknown>[];
  canClose: boolean;
  canReopen: boolean;
}> {
  if (!hasPermission(account, "reports.view")) {
    return { available: false, current: null, history: [], canClose: false, canReopen: false };
  }
  const row = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = 'bd_month_closings' LIMIT 1
  `).bind(account.id).first<{ data_json: string }>();
  const closings = parseArray(row?.data_json).filter((value): value is PeriodRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value));
  const audit = await getD1().prepare(`${AUDIT_SELECT} WHERE account_id = ? AND store_key = 'bd_month_closings' ORDER BY created_at DESC, id DESC LIMIT 500`)
    .bind(account.id)
    .all<AuditDatabaseRow>();
  const auditRows = audit.results ?? [];
  const month = currentMonthKey();
  const ordered = [...closings]
    .filter((item) => /^\d{4}-\d{2}$/.test(text(item.monthKey)))
    .sort((left, right) => text(right.monthKey).localeCompare(text(left.monthKey)));

  function actorFor(item: PeriodRecord, status: "closed" | "reopened"): string | null {
    const direct = status === "closed" ? text(item.closedBy) : text(item.reopenedBy);
    if (direct) return direct;
    const monthKey = text(item.monthKey);
    const target = status === "closed" ? text(item.closedAt) : text(item.reopenedAt);
    const match = auditRows.find((event) => {
      if (event.monthKey && event.monthKey !== monthKey) return false;
      if (target && event.createdAt.slice(0, 16) !== target.slice(0, 16)) return false;
      const json = `${event.afterJson ?? ""} ${event.reason ?? ""}`;
      return status === "closed" ? /closed|закрыт/iu.test(json) : /reopened|открыт повторно/iu.test(json);
    });
    return match?.actorName ?? null;
  }

  const history = ordered.map((item) => {
    const monthKey = text(item.monthKey);
    const status = text(item.status, "closed") === "closed" ? "closed" : "reopened";
    return {
      id: text(item.id, monthKey),
      monthKey,
      title: periodTitle(monthKey),
      status,
      closedAt: text(item.closedAt) || null,
      closedBy: actorFor(item, "closed"),
      reopenedAt: text(item.reopenedAt) || null,
      reopenedBy: actorFor(item, "reopened"),
      reason: text(item.reason) || null,
    };
  });
  const currentRecord = history.find((item) => item.monthKey === month);
  const current = currentRecord?.status === "closed"
    ? currentRecord
    : {
      id: currentRecord?.id ?? month,
      monthKey: month,
      title: periodTitle(month),
      status: "open",
      closedAt: null,
      closedBy: null,
      reopenedAt: currentRecord?.reopenedAt ?? null,
      reopenedBy: currentRecord?.reopenedBy ?? null,
      reason: null,
    };
  return {
    available: true,
    current,
    history: history.filter((item) => item.monthKey !== month),
    canClose: hasPermission(account, "month.close"),
    canReopen: hasPermission(account, "month.reopen"),
  };
}

function integrationIssueMessage(row: IntegrationIssueRow): string {
  if (row.mappingIssueCount > 0) return `${row.mappingIssueCount} объектов требуют сопоставления и не применены автоматически.`;
  if (row.errorCount > 0) return `${row.errorCount} объектов не удалось применить к данным BarDoctor.`;
  return "Синхронизация завершилась с ошибкой; часть данных могла не обновиться.";
}

function firstIntegrationError(row: IntegrationIssueRow): string | null {
  const values = parseArray(row.errorsJson);
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 240);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const item = value as Record<string, unknown>;
      const message = text(item.message) || text(item.error);
      if (message) return message.slice(0, 240);
    }
  }
  return null;
}

async function integrityIssues(accountId: number, venueId: number, account: Parameters<typeof presentAuditEvent>[1]) {
  const [runs, blocked] = await Promise.all([
    getD1().prepare(`
      WITH ranked AS (
        SELECT id, connection_id AS connectionId, source_name AS sourceName,
          data_type AS dataType, status, received_count AS receivedCount,
          error_count AS errorCount, mapping_issue_count AS mappingIssueCount,
          errors_json AS errorsJson, finished_at AS finishedAt, created_at AS createdAt,
          ROW_NUMBER() OVER (PARTITION BY connection_id, data_type ORDER BY created_at DESC, id DESC) AS rank
        FROM integration_sync_runs
        WHERE venue_id = ? AND data_account_id = ?
      )
      SELECT id, connectionId, sourceName, dataType, status, receivedCount,
        errorCount, mappingIssueCount, errorsJson, finishedAt, createdAt
      FROM ranked
      WHERE rank = 1 AND (status IN ('failed', 'partial') OR errorCount > 0 OR mappingIssueCount > 0)
      ORDER BY createdAt DESC
      LIMIT 8
    `).bind(venueId, accountId).all<IntegrationIssueRow>(),
    getD1().prepare(`${AUDIT_SELECT} WHERE account_id = ? AND action IN ('blocked', 'conflict') AND created_at >= datetime('now', '-30 days') ORDER BY created_at DESC, id DESC LIMIT 8`)
      .bind(accountId)
      .all<AuditDatabaseRow>(),
  ]);
  const integration = (runs.results ?? []).map((run) => ({
    id: `sync:${run.id}`,
    kind: "integration" as const,
    severity: run.status === "failed" ? "error" as const : "warning" as const,
    fact: run.status === "failed" ? "Синхронизация не применена" : "Синхронизация применена частично",
    context: `${run.sourceName || "Интеграция"} · ${run.dataType}`,
    consequence: integrationIssueMessage(run),
    detail: firstIntegrationError(run),
    actionLabel: "Открыть интеграцию",
    actionUrl: `/integrations?run=${encodeURIComponent(run.id)}`,
    createdAt: run.finishedAt || run.createdAt,
    technicalId: run.id,
  }));
  const blockedEvents = (blocked.results ?? []).map((row) => {
    const event = presentAuditEvent(row, account);
    const conflict = row.action === "conflict";
    return {
      id: `audit:${row.id}`,
      kind: conflict ? "conflict" as const : "blocked_change" as const,
      severity: "warning" as const,
      fact: conflict ? "Обнаружен конфликт параллельных изменений" : "Изменение закрытого периода заблокировано",
      context: `${event.module} · ${event.objectLabel}`,
      consequence: conflict
        ? "BarDoctor объединил изменения, но результат рекомендуется проверить."
        : "Данные не изменены; закрытый период остался защищён.",
      detail: event.reason,
      actionLabel: "Посмотреть событие",
      actionUrl: `/data-control?tab=journal&event=${row.id}`,
      createdAt: row.createdAt,
      technicalId: event.eventId,
    };
  });
  return [...integration, ...blockedEvents]
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, 8);
}

async function overview(account: NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [activity, recent, issueRows, periodState, connectionCount] = await Promise.all([
    getD1().prepare(`${AUDIT_SELECT} WHERE account_id = ? AND created_at >= ? ORDER BY created_at DESC, id DESC LIMIT 10000`)
      .bind(account.id, since)
      .all<AuditDatabaseRow>(),
    getD1().prepare(`${AUDIT_SELECT} WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`)
      .bind(account.id)
      .all<AuditDatabaseRow>(),
    integrityIssues(account.id, account.venueId, account),
    periods(account),
    getD1().prepare(`SELECT COUNT(*) AS total FROM integration_connections WHERE venue_id = ? AND data_account_id = ?`)
      .bind(account.venueId, account.id)
      .first<{ total: number }>(),
  ]);
  const activityRows = activity.results ?? [];
  const actualChanges = activityRows.filter((row) => ["create", "update", "delete"].includes(row.action));
  const userNames = new Set(actualChanges
    .filter((row) => sourceFromAudit(row).kind === "user")
    .map((row) => row.actorName)
    .filter(Boolean));
  const peopleVisible = hasPermission(account, "team.view") || hasPermission(account, "access.manage");
  const status = issueRows.length ? "attention" : "unknown";
  return {
    state: {
      status,
      title: issueRows.length ? "Требует внимания" : "Статус частично известен",
      description: issueRows.length
        ? `${issueRows.length} ${issueRows.length === 1 ? "проблема влияет" : "проблемы влияют"} на целостность или применение данных.`
        : "Среди доступных сигналов проблем нет. Конфликты и заблокированные попытки исторически фиксировались не во всех потоках, поэтому полный статус неизвестен.",
      coverage: issueRows.length ? "tracked_issue" : "partial",
    },
    periodDays: 30,
    metrics: [
      { key: "changes", label: "Изменения", value: actualChanges.length, available: true },
      { key: "users", label: "Пользователи", value: peopleVisible ? userNames.size : null, available: peopleVisible },
    ],
    issues: issueRows,
    recent: (recent.results ?? []).map((row) => presentAuditEvent(row, account)),
    periods: periodState,
    coverage: {
      audit: true,
      integrationRuns: Number(connectionCount?.total ?? 0) > 0,
      blockedAttempts: "partial",
      conflicts: false,
    },
  };
}

async function filterOptions(accountId: number, account: Parameters<typeof presentAuditEvent>[1]) {
  const result = await getD1().prepare(`${AUDIT_SELECT} WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 5000`)
    .bind(accountId)
    .all<AuditDatabaseRow>();
  const modules = new Map<string, string>();
  const sources = new Map<AuditSourceKind, string>();
  const actors = new Set<string>();
  for (const row of result.results ?? []) {
    const presentedModule = availableModule(row.storeKey);
    modules.set(presentedModule.key, presentedModule.label);
    const source = sourceFromAudit(row);
    sources.set(source.kind, source.label);
    if (source.kind === "user") actors.add(row.actorName);
  }
  const peopleVisible = hasPermission(account, "team.view") || hasPermission(account, "access.manage");
  const moduleOrder = [
    "finance", "shifts", "purchases", "warehouse", "team", "assortment", "equipment",
    "periods", "integrations", "operations", "analysis", "reviews", "calendar", "settings", "other",
  ];
  return {
    modules: [...modules].map(([key, label]) => ({ key, label })).sort((left, right) => {
      const leftIndex = moduleOrder.indexOf(left.key);
      const rightIndex = moduleOrder.indexOf(right.key);
      return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex)
        || left.label.localeCompare(right.label, "ru");
    }),
    sources: [...sources].map(([key, label]) => ({ key, label })).sort((left, right) => left.label.localeCompare(right.label, "ru")),
    actors: peopleVisible ? [...actors].sort((left, right) => left.localeCompare(right, "ru")) : [],
  };
}

function csvCell(value: unknown): string {
  let textValue = String(value ?? "");
  if (/^[=+\-@]/.test(textValue)) textValue = `'${textValue}`;
  return `"${textValue.replace(/"/g, '""')}"`;
}

function eventsCsv(events: PresentedAuditEvent[]): string {
  const rows = [["Дата", "Источник / пользователь", "Действие", "Объект", "Было → стало", "Модуль", "Event ID"]];
  for (const event of events) {
    rows.push([
      event.createdAt,
      event.actorName || event.sourceLabel,
      event.actionLabel,
      event.objectLabel,
      event.summary,
      event.module,
      event.eventId,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "audit.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Журнал изменений доступен владельцу и уполномоченному управляющему" },
      { status: 403 },
    ));
  }

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "csv") {
    const rows = await allAuditRows(account.id, url);
    const csv = eventsCsv(rows.map((row) => presentAuditEvent(row, account)));
    const response = new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="BarDoctor-audit-${currentMonthKey()}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
    return noStore(response);
  }

  const limit = boundedInteger(url.searchParams.get("limit"), 40, 1, 100);
  const offset = boundedInteger(url.searchParams.get("offset"), 0, 0, 1_000_000);
  const [page, overviewState, options] = await Promise.all([
    auditPage(account.id, url, limit, offset),
    overview(account),
    filterOptions(account.id, account),
  ]);
  const events = page.rows.map((row) => presentAuditEvent(row, account));
  return noStore(Response.json({
    ok: true,
    venueId: account.venueId,
    rows: events,
    page: {
      offset,
      limit,
      total: page.total,
      hasMore: offset + events.length < page.total,
      nextOffset: offset + events.length,
    },
    overview: overviewState,
    filters: options,
  }));
}

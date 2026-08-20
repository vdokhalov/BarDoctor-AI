import type { AuthenticatedAccount, PermissionKey } from "./access-control";
import { hasPermission } from "./access-control";

export type AuditSourceKind =
  | "user"
  | "import"
  | "system"
  | "integration"
  | "local_connector"
  | "api"
  | "ai_assisted";

export type AuditRowLike = {
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

export type AuditDiff = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type PresentedAuditEvent = {
  id: number;
  eventId: string;
  createdAt: string;
  monthKey: string | null;
  action: string;
  actionLabel: string;
  title: string;
  objectLabel: string;
  module: string;
  moduleKey: string;
  source: AuditSourceKind;
  sourceLabel: string;
  actorName: string | null;
  reason: string | null;
  summary: string;
  diffs: AuditDiff[];
  relatedUrl: string | null;
  detailAvailable: boolean;
  integritySignal: boolean;
};

type ModuleConfig = {
  key: string;
  label: string;
  object: string;
  route: string | null;
  viewPermission?: PermissionKey;
};

const STORE_MODULES: Record<string, ModuleConfig> = {
  bd_finance_revenue: { key: "finance", label: "Финансы", object: "выручку смены", route: "/shifts", viewPermission: "shifts.view" },
  bd_finance_expenses: { key: "finance", label: "Финансы", object: "расход", route: "/finance", viewPermission: "finance.view" },
  bd_finance_gap_reasons: { key: "shifts", label: "Смены", object: "пояснение к смене", route: "/shifts", viewPermission: "shifts.view" },
  bd_finance_settings: { key: "finance", label: "Финансы", object: "финансовую настройку", route: "/finance/settings", viewPermission: "finance.view" },
  bd_payroll_entries: { key: "team", label: "Команда", object: "операцию по зарплате", route: "/salaries", viewPermission: "payroll.view" },
  bd_payroll_rules: { key: "team", label: "Команда", object: "правило зарплаты", route: "/salaries", viewPermission: "payroll.view" },
  bd_inventory_snapshots: { key: "warehouse", label: "Склад", object: "остатки", route: "/warehouse", viewPermission: "inventory.view" },
  bd_stock_movements: { key: "warehouse", label: "Склад", object: "движение товара", route: "/warehouse", viewPermission: "inventory.view" },
  bd_warehouses: { key: "warehouse", label: "Склад", object: "склад", route: "/warehouse", viewPermission: "inventory.view" },
  bd_suppliers: { key: "purchases", label: "Закупки", object: "поставщика", route: "/suppliers", viewPermission: "inventory.view" },
  bd_purchase_documents: { key: "purchases", label: "Закупки", object: "закупку", route: "/suppliers", viewPermission: "inventory.view" },
  bd_sales_documents: { key: "shifts", label: "Смены", object: "отчёт продаж", route: "/shifts", viewPermission: "shifts.view" },
  bd_assortment_v1: { key: "assortment", label: "Ассортимент", object: "позицию ассортимента", route: "/catalog", viewPermission: "inventory.view" },
  bd_employees: { key: "team", label: "Команда", object: "сотрудника", route: "/employees", viewPermission: "team.view" },
  bd_employees_v1: { key: "team", label: "Команда", object: "сотрудника", route: "/employees", viewPermission: "team.view" },
  access_control: { key: "team", label: "Команда", object: "доступ", route: "/team-access", viewPermission: "team.view" },
  bd_access_roles: { key: "team", label: "Команда", object: "роль", route: "/team-access", viewPermission: "team.view" },
  bd_equipment: { key: "equipment", label: "Оборудование", object: "оборудование", route: "/equipment", viewPermission: "equipment.view" },
  bd_equipment_history: { key: "equipment", label: "Оборудование", object: "запись обслуживания", route: "/equipment", viewPermission: "equipment.view" },
  bd_equipment_work_orders: { key: "equipment", label: "Оборудование", object: "работу по оборудованию", route: "/equipment", viewPermission: "equipment.view" },
  bd_month_closings: { key: "periods", label: "Периоды", object: "финансовый период", route: "/reports", viewPermission: "reports.view" },
  bd_cases: { key: "operations", label: "Операции", object: "происшествие", route: "/cases", viewPermission: "incidents.view" },
  bd_events: { key: "operations", label: "Операции", object: "событие", route: "/events", viewPermission: "tasks.view" },
  bd_tasks: { key: "operations", label: "Операции", object: "поручение", route: "/tasks", viewPermission: "tasks.view" },
  bd_action_plans: { key: "operations", label: "Операции", object: "план действий", route: "/tasks", viewPermission: "tasks.view" },
  bd_action_tasks: { key: "operations", label: "Операции", object: "поручение", route: "/tasks", viewPermission: "tasks.view" },
  bd_decisions: { key: "operations", label: "Операции", object: "решение", route: "/analysis", viewPermission: "analysis.view" },
  bd_import_history: { key: "integrations", label: "Интеграции", object: "импорт", route: "/integrations", viewPermission: "audit.view" },
  restaurant_profile: { key: "settings", label: "Заведение", object: "профиль заведения", route: "/settings", viewPermission: "settings.manage" },
  bd_guest_reviews: { key: "reviews", label: "Отзывы", object: "отзыв", route: "/reviews", viewPermission: "reviews.view" },
  bd_opportunity_calendar_v1: { key: "calendar", label: "Календарь", object: "событие календаря", route: "/opportunities", viewPermission: "calendar.view" },
};

const FIELD_LABELS: Record<string, string> = {
  amount: "Сумма",
  total: "Итого",
  revenue: "Выручка",
  price: "Цена",
  unitPrice: "Закупочная цена",
  lineTotal: "Сумма позиции",
  finalProfit: "Финальная прибыль",
  cost: "Стоимость",
  name: "Название",
  title: "Название",
  description: "Описание",
  category: "Категория",
  area: "Раздел",
  department: "Отдел",
  status: "Статус",
  role: "Роль",
  date: "Дата",
  monthKey: "Период",
  quantity: "Количество",
  current: "Количество",
  unit: "Единица",
  supplierName: "Поставщик",
  warehouseName: "Склад",
  active: "Активность",
  phone: "Телефон",
  email: "Email",
  reason: "Причина",
  confirmationStatus: "Подтверждение",
};

const HIDDEN_FIELDS = new Set([
  "id",
  "internalId",
  "externalId",
  "venueId",
  "accountId",
  "createdAt",
  "updatedAt",
  "createdByAccountId",
  "sourcePriority",
  "source",
  "sourceType",
  "externalSystem",
  "externalUpdatedAt",
  "syncStatus",
  "payloadHash",
  "token",
  "password",
]);

const STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  inactive: "Неактивен",
  enabled: "Включён",
  disabled: "Отключён",
  open: "Открыт",
  closed: "Закрыт",
  reopened: "Открыт повторно",
  confirmed: "Подтверждено",
  pending: "Ожидает",
  rejected: "Отклонено",
  success: "Выполнено",
  failed: "Ошибка",
  owner: "Владелец",
  manager: "Управляющий",
  shift_manager: "Менеджер",
};

function parse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(record).filter((item) => Object.keys(item).length > 0);
  const item = record(value);
  return Object.keys(item).length ? [item] : [];
}

function metadataValue(
  values: Record<string, unknown>[],
  key: string,
): unknown {
  return values.find((value) => value[key] != null)?.[key];
}

function safeLabel(value: string | null | undefined, fallback: string): string {
  const text = String(value ?? "")
    .replace(/\b(?:undefined|null)\b/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 180);
}

function moduleFor(storeKey: string): ModuleConfig {
  if (storeKey.startsWith("bd_ai_diagnosis_")) {
    return { key: "analysis", label: "Аналитика", object: "результат анализа", route: "/analysis", viewPermission: "analysis.view" };
  }
  return STORE_MODULES[storeKey] ?? {
    key: "other",
    label: "Другое",
    object: "запись",
    route: null,
  };
}

export function moduleKeys(moduleKey: string): string[] {
  const keys = Object.entries(STORE_MODULES)
    .filter(([, config]) => config.key === moduleKey)
    .map(([key]) => key);
  if (moduleKey === "analysis") keys.push(
    "bd_ai_diagnosis_v3",
    "bd_ai_diagnosis_v4",
    "bd_ai_diagnosis_v5",
    "bd_ai_diagnosis_v6",
    "bd_ai_diagnosis_v7",
    "bd_ai_diagnosis_v8",
    "bd_ai_diagnosis_v9",
  );
  return keys;
}

export function sourceFromAudit(row: AuditRowLike): { kind: AuditSourceKind; label: string } {
  const before = records(parse(row.beforeJson));
  const after = records(parse(row.afterJson));
  const values = [...after, ...before];
  const source = String(metadataValue(values, "source") ?? "").toLocaleLowerCase("ru");
  const sourceType = String(metadataValue(values, "sourceType") ?? "").toLocaleLowerCase("ru");
  const rawExternalSystem = metadataValue(values, "externalSystem");
  const externalSystem = safeLabel(
    String(rawExternalSystem ?? ""),
    "Integration Layer",
  );
  const reason = String(row.reason ?? "").toLocaleLowerCase("ru");
  const actor = `${row.actorName} ${row.actorRole}`.toLocaleLowerCase("ru");
  const isOneC = /(?:^|\W)(?:1c|1с)(?:\W|$)/iu.test(externalSystem)
    || /local[_ -]?connector|onec/u.test(sourceType)
    || /local connector|1с/u.test(reason);

  if (source.includes("integration") || sourceType.includes("integration") || rawExternalSystem) {
    if (isOneC) return { kind: "local_connector", label: externalSystem || "Local Connector / 1С" };
    if (sourceType.includes("api") || reason.includes("api")) return { kind: "api", label: externalSystem || "API integration" };
    return { kind: "integration", label: externalSystem || "Integration Layer" };
  }
  if (source.includes("import") || sourceType.includes("file") || /импорт|загружен.*файл/u.test(reason)) {
    return { kind: "import", label: "Импорт" };
  }
  if (source.includes("ai") || /ai[- ]assisted|подтвержден.*ai|из ai/u.test(reason)) {
    return { kind: "ai_assisted", label: "AI после подтверждения" };
  }
  if (source.includes("system") || /систем/u.test(actor) || row.actorRole === "system") {
    return { kind: "system", label: "Система" };
  }
  return { kind: "user", label: "Пользователь" };
}

function payloadLabel(row: AuditRowLike): string | null {
  for (const value of [parse(row.afterJson), parse(row.beforeJson)]) {
    const items = records(value);
    if (items.length !== 1) continue;
    const item = items[0];
    const label = item.title ?? item.name ?? item.label ?? item.number ?? item.description;
    if (label != null && String(label).trim()) return String(label);
  }
  return null;
}

function isMoneyField(field: string): boolean {
  return /amount|price|revenue|cost|total|profit|payroll|tax|expense|purchase|salary|sum/i.test(field);
}

function isDateField(field: string): boolean {
  return /(?:^date$|Date$|At$|monthKey$)/.test(field);
}

function valueLabel(value: unknown, field: string): string {
  if (value == null || value === "") return "Не задано";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") {
    if (isMoneyField(field)) {
      return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value) + " ₽";
    }
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
  }
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? "позиция" : "позиций"}`;
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    const named = item.name ?? item.title ?? item.label ?? item.number;
    return named == null ? "Изменено" : safeLabel(String(named), "Изменено");
  }
  const text = String(value).trim();
  if (!text) return "Не задано";
  const status = STATUS_LABELS[text.toLocaleLowerCase("ru")];
  if (status) return status;
  if (isDateField(field)) {
    const parsed = new Date(text.length === 10 ? `${text}T12:00:00` : text);
    if (!Number.isNaN(parsed.valueOf())) {
      if (field === "monthKey" || /^\d{4}-\d{2}$/.test(text)) {
        return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
          .format(new Date(`${text.slice(0, 7)}-01T12:00:00`));
      }
      return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
    }
  }
  return safeLabel(text, "Изменено");
}

function diffsFor(row: AuditRowLike, valuesAllowed: boolean): AuditDiff[] {
  if (!valuesAllowed) return [];
  const beforeValue = parse(row.beforeJson);
  const afterValue = parse(row.afterJson);
  const before = record(beforeValue);
  const after = record(afterValue);
  const changed = parse(row.changedFieldsJson);
  let fields = Array.isArray(changed) ? changed.map(String) : [];
  if (!fields.length) fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields
    .filter((field) => !HIDDEN_FIELDS.has(field) && !/json|metadata|secret|hash/i.test(field))
    .filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
    .slice(0, 12)
    .map((field) => ({
      field,
      label: FIELD_LABELS[field] ?? safeLabel(field, "Значение"),
      before: valueLabel(before[field], field),
      after: valueLabel(after[field], field),
    }));
}

function actionLabel(action: string, source: AuditSourceKind): string {
  if (action === "blocked") return "Заблокировано";
  if (action === "conflict") return "Обнаружен конфликт";
  if (action === "create") return ["import", "integration", "local_connector", "api"].includes(source) ? "Импортировано" : "Создано";
  if (action === "delete") return "Удалено";
  if (["integration", "local_connector", "api"].includes(source)) return "Обновлено интеграцией";
  return "Изменено";
}

function eventTitle(
  action: string,
  source: AuditSourceKind,
  object: string,
  objectLabel: string,
): string {
  if (action === "blocked") return `Заблокировано изменение: ${objectLabel}`;
  if (action === "conflict") return `Конфликт параллельных изменений: ${objectLabel}`;
  if (source === "import") return `Импортировано: ${objectLabel}`;
  if (["integration", "local_connector", "api"].includes(source) && action === "create") return `Импортировано через интеграцию: ${objectLabel}`;
  if (["integration", "local_connector", "api"].includes(source)) return `Обновлено через интеграцию: ${objectLabel}`;
  if (action === "create") return `Создано: ${objectLabel}`;
  if (action === "delete") return `Удалено: ${objectLabel}`;
  return `Изменено: ${objectLabel || object}`;
}

function relatedUrl(config: ModuleConfig, entityId: string | null): string | null {
  if (!config.route) return null;
  if (!entityId) return config.route;
  const id = encodeURIComponent(entityId);
  if (config.key === "assortment") return `${config.route}?itemId=${id}`;
  if (config.key === "purchases" && config.object === "закупку") return `${config.route}?documentId=${id}`;
  if (config.key === "equipment") return `/equipment/${id}`;
  if (config.key === "team" && config.route === "/employees") return `/employees/${id}`;
  return config.route;
}

export function presentAuditEvent(
  row: AuditRowLike,
  account: Pick<AuthenticatedAccount, "role" | "permissions">,
): PresentedAuditEvent {
  const config = moduleFor(row.storeKey);
  const source = sourceFromAudit(row);
  const valuesAllowed = !config.viewPermission || hasPermission(account, config.viewPermission);
  const peopleAllowed = hasPermission(account, "team.view") || hasPermission(account, "access.manage");
  const diffs = row.action === "update" ? diffsFor(row, valuesAllowed) : [];
  const periodLabel = config.key === "periods" && row.monthKey && /^\d{4}-\d{2}$/.test(row.monthKey)
    ? new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
      .format(new Date(`${row.monthKey}-01T12:00:00Z`))
      .replace(/^./u, (character) => character.toUpperCase())
    : null;
  const objectLabel = safeLabel(row.entityLabel ?? periodLabel ?? payloadLabel(row), config.object);
  const summary = row.action === "create"
    ? ["import", "integration", "local_connector", "api"].includes(source.kind) ? "Импортировано" : "Создано"
    : row.action === "delete"
      ? "Удалено"
      : row.action === "blocked"
        ? "Изменение не применено"
        : row.action === "conflict"
          ? "Применено безопасное объединение"
          : diffs.length
            ? `${diffs[0].before} → ${diffs[0].after}`
            : valuesAllowed
              ? "Изменено"
              : "Значения скрыты согласно правам";
  const routeAllowed = valuesAllowed ? relatedUrl(config, row.entityId) : null;
  const actorName = source.kind === "user"
    ? peopleAllowed ? safeLabel(row.actorName, "Пользователь") : "Пользователь"
    : null;
  return {
    id: row.id,
    eventId: `AUD-${row.id}`,
    createdAt: row.createdAt,
    monthKey: row.monthKey,
    action: row.action,
    actionLabel: actionLabel(row.action, source.kind),
    title: eventTitle(row.action, source.kind, config.object, objectLabel),
    objectLabel,
    module: config.label,
    moduleKey: config.key,
    source: source.kind,
    sourceLabel: source.label,
    actorName,
    reason: valuesAllowed && row.reason ? safeLabel(row.reason, "") : null,
    summary,
    diffs,
    relatedUrl: routeAllowed,
    detailAvailable: true,
    integritySignal: row.action === "blocked" || row.action === "conflict",
  };
}

export function availableModule(storeKey: string): { key: string; label: string } {
  const config = moduleFor(storeKey);
  return { key: config.key, label: config.label };
}

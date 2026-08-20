import type { Account, VenueMembership } from "../../db/schema";

export const ACCESS_ROLES = ["owner", "manager", "shift_manager"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

export const PERMISSION_KEYS = [
  "home.view",
  "shifts.view",
  "shifts.manage",
  "shifts.delete",
  "expenses.create",
  "finance.view",
  "finance.manage",
  "finance.export",
  "team.view",
  "team.manage",
  "payroll.view",
  "payroll.manage",
  "payroll.approve",
  "inventory.view",
  "inventory.manage",
  "tasks.view",
  "tasks.manage",
  "incidents.view",
  "incidents.manage",
  "equipment.view",
  "equipment.manage",
  "analysis.view",
  "analysis.run",
  "calendar.view",
  "calendar.manage",
  "reviews.view",
  "reviews.manage",
  "reports.view",
  "month.close",
  "month.reopen",
  "audit.view",
  "data.import",
  "settings.manage",
  "access.manage",
  "integrations.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionOverrides = {
  allow: PermissionKey[];
  deny: PermissionKey[];
};

export type PermissionDefinition = {
  key: PermissionKey;
  group: string;
  label: string;
  description: string;
  ownerOnly?: boolean;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: "home.view", group: "Основное", label: "Главная", description: "Видеть рабочую главную и предупреждения." },
  { key: "shifts.view", group: "Смены", label: "Просмотр смен", description: "Видеть смены, выручку, чеки и гостей." },
  { key: "shifts.manage", group: "Смены", label: "Закрытие и правка смен", description: "Создавать и редактировать смены и списания." },
  { key: "shifts.delete", group: "Смены", label: "Удаление смен", description: "Удалять ранее сохранённые смены." },
  { key: "expenses.create", group: "Финансы", label: "Добавление расходов", description: "Фиксировать новый расход без доступа ко всему финансовому разделу." },
  { key: "finance.view", group: "Финансы", label: "Просмотр финансов", description: "Видеть расходы, прибыль, налоги и финансовые настройки." },
  { key: "finance.manage", group: "Финансы", label: "Изменение финансов", description: "Редактировать и удалять финансовые операции." },
  { key: "finance.export", group: "Финансы", label: "Экспорт данных", description: "Скачивать финансовые отчёты и резервные копии." },
  { key: "team.view", group: "Команда", label: "Просмотр команды", description: "Видеть сотрудников и рабочую информацию." },
  { key: "team.manage", group: "Команда", label: "Управление командой", description: "Добавлять и редактировать сотрудников." },
  { key: "payroll.view", group: "Зарплаты", label: "Просмотр зарплат", description: "Видеть начисления, удержания и суммы к выплате." },
  { key: "payroll.manage", group: "Зарплаты", label: "Изменение зарплат", description: "Добавлять и редактировать начисления и удержания." },
  { key: "payroll.approve", group: "Зарплаты", label: "Подтверждение удержаний", description: "Подтверждать штрафы, заказы и другие удержания." },
  { key: "inventory.view", group: "Склад", label: "Просмотр остатков", description: "Видеть инвентаризации и остатки." },
  { key: "inventory.manage", group: "Склад", label: "Проведение инвентаризации", description: "Вводить и исправлять остатки." },
  { key: "tasks.view", group: "Операции", label: "Просмотр поручений", description: "Видеть поручения и историю их выполнения." },
  { key: "tasks.manage", group: "Операции", label: "Работа с поручениями", description: "Создавать, назначать и закрывать поручения." },
  { key: "incidents.view", group: "Операции", label: "Просмотр происшествий", description: "Видеть происшествия и служебные записи." },
  { key: "incidents.manage", group: "Операции", label: "Фиксация происшествий", description: "Создавать и обновлять происшествия." },
  { key: "equipment.view", group: "Оборудование", label: "Просмотр оборудования", description: "Видеть карточки, поломки и обслуживание." },
  { key: "equipment.manage", group: "Оборудование", label: "Управление оборудованием", description: "Добавлять оборудование, ремонты и обслуживание." },
  { key: "analysis.view", group: "Аналитика", label: "Просмотр аналитики", description: "Видеть индекс состояния и рекомендации." },
  { key: "analysis.run", group: "Аналитика", label: "Запуск AI-анализа", description: "Запускать новые анализы и обновления рынка." },
  { key: "calendar.view", group: "Календарь", label: "Просмотр календаря", description: "Видеть праздники, события и возможности." },
  { key: "calendar.manage", group: "Календарь", label: "Управление календарём", description: "Обновлять события и настраивать напоминания." },
  { key: "reviews.view", group: "Отзывы", label: "Просмотр отзывов", description: "Видеть отзывы гостей и сводную аналитику." },
  { key: "reviews.manage", group: "Отзывы", label: "Работа с отзывами", description: "Обновлять источники и обрабатывать отзывы." },
  { key: "reports.view", group: "Отчёты", label: "Просмотр отчётов", description: "Видеть месячные и управленческие отчёты." },
  { key: "month.close", group: "Закрытие месяца", label: "Закрытие месяца", description: "Подтверждать закрытие финансового периода." },
  { key: "month.reopen", group: "Закрытие месяца", label: "Повторное открытие", description: "Разблокировать ранее закрытый месяц." },
  { key: "audit.view", group: "Контроль", label: "Журнал изменений", description: "Видеть автора, время и содержание изменений." },
  { key: "data.import", group: "Контроль", label: "Импорт данных", description: "Загружать CSV и Excel в заведение." },
  { key: "settings.manage", group: "Настройки", label: "Настройки заведения", description: "Менять профиль, график и параметры заведения." },
  { key: "access.manage", group: "Доступ", label: "Управление доступом", description: "Приглашать сотрудников, менять роли, права и отключать доступ.", ownerOnly: true },
  { key: "integrations.manage", group: "Настройки", label: "Интеграции", description: "Менять внешние подключения и ключи.", ownerOnly: true },
];

const ALL_PERMISSIONS = new Set<PermissionKey>(PERMISSION_KEYS);
const OWNER_ONLY_PERMISSIONS = new Set<PermissionKey>(
  PERMISSION_DEFINITIONS.filter((item) => item.ownerOnly).map((item) => item.key),
);

const PERMISSION_DEPENDENCIES: Partial<Record<PermissionKey, PermissionKey>> = {
  "shifts.manage": "shifts.view",
  "shifts.delete": "shifts.manage",
  "finance.manage": "finance.view",
  "finance.export": "finance.view",
  "team.manage": "team.view",
  "payroll.manage": "payroll.view",
  "payroll.approve": "payroll.view",
  "inventory.manage": "inventory.view",
  "tasks.manage": "tasks.view",
  "incidents.manage": "incidents.view",
  "equipment.manage": "equipment.view",
  "analysis.run": "analysis.view",
  "calendar.manage": "calendar.view",
  "reviews.manage": "reviews.view",
  "month.close": "reports.view",
  "month.reopen": "reports.view",
};

const ROLE_DEFAULTS: Record<Exclude<AccessRole, "owner">, PermissionKey[]> = {
  manager: [
    "home.view",
    "shifts.view",
    "shifts.manage",
    "expenses.create",
    "finance.view",
    "finance.manage",
    "team.view",
    "team.manage",
    "payroll.view",
    "payroll.manage",
    "payroll.approve",
    "inventory.view",
    "inventory.manage",
    "tasks.view",
    "tasks.manage",
    "incidents.view",
    "incidents.manage",
    "equipment.view",
    "equipment.manage",
    "analysis.view",
    "analysis.run",
    "calendar.view",
    "calendar.manage",
    "reviews.view",
    "reviews.manage",
    "reports.view",
    "month.close",
    "audit.view",
    "data.import",
    "settings.manage",
  ],
  shift_manager: [
    "home.view",
    "shifts.view",
    "shifts.manage",
    "expenses.create",
    "team.view",
    "inventory.view",
    "inventory.manage",
    "tasks.view",
    "tasks.manage",
    "incidents.view",
    "incidents.manage",
    "equipment.view",
    "equipment.manage",
    "analysis.view",
    "calendar.view",
    "reviews.view",
  ],
};

export type AuthenticatedAccount = Account & {
  actorAccountId: number;
  venueId: number;
  membershipId: number;
  permissions: PermissionKey[];
};

export function isAccessRole(value: unknown): value is AccessRole {
  return ACCESS_ROLES.includes(value as AccessRole);
}

function uniquePermissions(values: unknown): PermissionKey[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(
    (value): value is PermissionKey =>
      typeof value === "string" && ALL_PERMISSIONS.has(value as PermissionKey),
  ))];
}

export function parsePermissionOverrides(value: string | null | undefined): PermissionOverrides {
  if (!value) return { allow: [], deny: [] };
  try {
    const parsed = JSON.parse(value) as { allow?: unknown; deny?: unknown };
    return {
      allow: uniquePermissions(parsed.allow),
      deny: uniquePermissions(parsed.deny),
    };
  } catch {
    return { allow: [], deny: [] };
  }
}

export function sanitizePermissionOverrides(
  role: AccessRole,
  value: unknown,
): PermissionOverrides {
  if (role === "owner") return { allow: [], deny: [] };
  const parsed = value && typeof value === "object"
    ? value as { allow?: unknown; deny?: unknown }
    : {};
  const allow = uniquePermissions(parsed.allow).filter((key) => !OWNER_ONLY_PERMISSIONS.has(key));
  const deny = uniquePermissions(parsed.deny);
  const allowSet = new Set(allow);
  return {
    allow,
    deny: deny.filter((key) => !allowSet.has(key)),
  };
}

export function serializePermissionOverrides(
  role: AccessRole,
  value: unknown,
): string | null {
  if (role === "owner") return null;
  const sanitized = sanitizePermissionOverrides(role, value);
  return sanitized.allow.length || sanitized.deny.length
    ? JSON.stringify(sanitized)
    : null;
}

export function permissionsFor(
  role: AccessRole,
  permissionsJson?: string | null,
): PermissionKey[] {
  if (role === "owner") return [...PERMISSION_KEYS];
  const permissions = new Set<PermissionKey>(ROLE_DEFAULTS[role]);
  const overrides = parsePermissionOverrides(permissionsJson);
  for (const key of overrides.allow) {
    if (!OWNER_ONLY_PERMISSIONS.has(key)) permissions.add(key);
  }
  for (const key of overrides.deny) permissions.delete(key);
  for (const [permission, dependency] of Object.entries(PERMISSION_DEPENDENCIES) as [
    PermissionKey,
    PermissionKey,
  ][]) {
    if (permissions.has(permission) && !permissions.has(dependency)) {
      permissions.delete(permission);
    }
  }
  return [...permissions];
}

export function defaultPermissionsFor(role: AccessRole): PermissionKey[] {
  return permissionsFor(role);
}

export function hasPermission(
  account: Pick<AuthenticatedAccount, "role" | "permissions">,
  permission: PermissionKey,
): boolean {
  return account.role === "owner" || account.permissions.includes(permission);
}

export function roleRank(role: AccessRole): number {
  return role === "owner" ? 3 : role === "manager" ? 2 : 1;
}

export function canManageTarget(
  actor: Pick<AuthenticatedAccount, "role" | "permissions" | "membershipId">,
  target: Pick<VenueMembership, "id" | "role">,
): boolean {
  if (!isAccessRole(target.role)) return false;
  if (actor.role === "owner") return target.role !== "owner" && actor.membershipId !== target.id;
  return hasPermission(actor, "access.manage")
    && target.role === "shift_manager"
    && actor.membershipId !== target.id;
}

export function permissionPayload(role: AccessRole, permissionsJson?: string | null) {
  return {
    role,
    permissions: permissionsFor(role, permissionsJson),
    overrides: parsePermissionOverrides(permissionsJson),
  };
}

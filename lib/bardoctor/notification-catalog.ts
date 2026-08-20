import type { NotificationCategory } from "./notification-types";

export type UserNotificationCategory = Exclude<NotificationCategory, "test">;
export type NotificationPreferenceKey =
  | "shiftAlerts"
  | "taskAlerts"
  | "equipmentAlerts"
  | "incidentAlerts"
  | "calendarAlerts"
  | "financeAlerts";

export type NotificationCategoryDefinition = {
  id: UserNotificationCategory;
  preferenceKey: NotificationPreferenceKey;
  title: string;
  description: string;
  icon: string;
  tone: "critical" | "violet" | "blue" | "green" | "amber";
  rules: ReadonlyArray<{
    title: string;
    description: string;
    urgent?: boolean;
  }>;
};

/**
 * User-facing catalogue for the rules that are actually evaluated in
 * notification-rules.ts. It intentionally describes existing behavior and
 * does not create a second preference model.
 */
export const NOTIFICATION_CATEGORY_CATALOG = [
  {
    id: "incident",
    preferenceKey: "incidentAlerts",
    title: "Критические события",
    description: "Серьёзные происшествия и критические отклонения",
    icon: "triangle-alert",
    tone: "critical",
    rules: [
      {
        title: "Критическое происшествие",
        description: "Приходит сразу, даже во время тихих часов.",
        urgent: true,
      },
      {
        title: "Серьёзное происшествие",
        description: "Приходит после тихих часов, если проблема остаётся открытой.",
      },
    ],
  },
  {
    id: "shift",
    preferenceKey: "shiftAlerts",
    title: "Смены",
    description: "Незакрытые смены и отсутствующие отчёты",
    icon: "clipboard-list",
    tone: "violet",
    rules: [
      {
        title: "Не закрыта смена",
        description: "По графику была смена, но отчёт или объяснение не внесены.",
      },
    ],
  },
  {
    id: "task",
    preferenceKey: "taskAlerts",
    title: "Поручения",
    description: "Сроки, просрочки и важные изменения",
    icon: "circle-check",
    tone: "blue",
    rules: [
      {
        title: "Срок завтра",
        description: "Напоминание за один день до срока поручения.",
      },
      {
        title: "Срок сегодня",
        description: "Напоминание в день выполнения поручения.",
      },
      {
        title: "Поручение просрочено",
        description: "Одно уведомление, когда срок уже прошёл.",
      },
    ],
  },
  {
    id: "finance",
    preferenceKey: "financeAlerts",
    title: "Финансы",
    description: "Существенные отклонения и закрытие периода",
    icon: "circle-dollar-sign",
    tone: "green",
    rules: [
      {
        title: "Существенное падение показателей",
        description: "Выручка или средний чек заметно ниже сопоставимых смен.",
      },
      {
        title: "Закрытие месяца",
        description: "Напоминания, если предыдущий месяц ещё не закрыт.",
      },
    ],
  },
  {
    id: "equipment",
    preferenceKey: "equipmentAlerts",
    title: "Оборудование",
    description: "ТО, неисправности и сроки обслуживания",
    icon: "monitor-cog",
    tone: "amber",
    rules: [
      {
        title: "Плановое обслуживание",
        description: "За 7 дней, за день, в дату ТО и после просрочки.",
      },
      {
        title: "Неисправность",
        description: "Приходит при зарегистрированной поломке или необходимости ТО.",
      },
      {
        title: "Критическая поломка",
        description: "Важное оборудование сообщает о поломке сразу, даже ночью.",
        urgent: true,
      },
    ],
  },
  {
    id: "calendar",
    preferenceKey: "calendarAlerts",
    title: "Календарь возможностей",
    description: "События и активности, к которым пора готовиться",
    icon: "clock-3",
    tone: "blue",
    rules: [
      {
        title: "Ближайшая возможность",
        description: "Запланированное или важное событие в ближайшие 7 дней.",
      },
      {
        title: "Календарное напоминание",
        description: "Отправляется в выбранное время из очереди BarDoctor.",
      },
    ],
  },
] as const satisfies readonly NotificationCategoryDefinition[];

export const NOTIFICATION_QUIET_POLICY = {
  criticalBypassesQuietHours: true,
  configurable: false,
  categories: ["incident", "equipment"] as const,
};

export function notificationCategoryDefinition(value: string) {
  return NOTIFICATION_CATEGORY_CATALOG.find((category) => category.id === value) ?? null;
}

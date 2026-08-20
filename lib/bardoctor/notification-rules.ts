import type { NotificationCategory, PushMessage } from "./notification-types";

type JsonRecord = Record<string, unknown>;

export type NotificationRulePreferences = {
  shiftAlerts: boolean;
  taskAlerts: boolean;
  equipmentAlerts: boolean;
  incidentAlerts: boolean;
  calendarAlerts: boolean;
  financeAlerts: boolean;
  quietStart: string;
  quietEnd: string;
  timezone: string;
};

export type NotificationRuleInput = {
  restaurant: unknown;
  stores: ReadonlyMap<string, unknown>;
  preferences: NotificationRulePreferences;
  now?: Date;
};

const OPPORTUNITY_CALENDAR_KEY = "bd_opportunity_calendar_v1";
const CLOSED_STATUSES = new Set([
  "done",
  "completed",
  "resolved",
  "closed",
  "cancelled",
  "canceled",
  "decommissioned",
  "replaced",
]);
const EQUIPMENT_ALERT_STATUSES = new Set(["broken", "needs_maintenance"]);

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function array(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter(Boolean) as JsonRecord[] : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown): number | null {
  const candidate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(candidate) ? candidate : null;
}

function rowId(value: JsonRecord, index: number): string {
  return text(value.id ?? value.entryId ?? value.date, `row-${index}`).slice(0, 120);
}

function dateKey(value: unknown): string | null {
  const candidate = text(value);
  const match = candidate.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function dateParts(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const key = `${values.year}-${values.month}-${values.day}`;
  return {
    dateKey: key,
    monthKey: key.slice(0, 7),
    hourMinute: `${values.hour}:${values.minute}`,
    day: Number(values.day),
  };
}

function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(left: string, right: string): number {
  return Math.round(
    (new Date(`${left}T12:00:00Z`).getTime() - new Date(`${right}T12:00:00Z`).getTime())
      / 86_400_000,
  );
}

function mondayBasedDay(key: string): number {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function jsDay(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

function previousMonth(key: string): string {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function isQuiet(hourMinute: string, start: string, end: string): boolean {
  if (start === end) return false;
  if (start < end) return hourMinute >= start && hourMinute < end;
  return hourMinute >= start || hourMinute < end;
}

function categoryEnabled(
  preferences: NotificationRulePreferences,
  category: NotificationCategory,
): boolean {
  if (category === "shift") return preferences.shiftAlerts;
  if (category === "task") return preferences.taskAlerts;
  if (category === "equipment") return preferences.equipmentAlerts;
  if (category === "incident") return preferences.incidentAlerts;
  if (category === "calendar") return preferences.calendarAlerts;
  if (category === "finance") return preferences.financeAlerts;
  return true;
}

function scheduledWorkingDay(restaurant: JsonRecord, key: string): boolean {
  const workingDays = record(restaurant.workingDays);
  if (!workingDays) return true;
  const usesMondayKeys = Object.prototype.hasOwnProperty.call(workingDays, "7");
  const day = usesMondayKeys ? mondayBasedDay(key) : jsDay(key);
  return workingDays[String(day)] !== false;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ru-RU");
}

function taskMessages(
  stores: ReadonlyMap<string, unknown>,
  today: string,
): PushMessage[] {
  const grouped = new Map<"tomorrow" | "today" | "overdue", Array<{
    item: JsonRecord;
    id: string;
    due: string;
  }>>();
  grouped.set("tomorrow", []);
  grouped.set("today", []);
  grouped.set("overdue", []);

  const seenTaskKeys = new Set<string>();
  const taskRows = [
    ...array(stores.get("bd_tasks")).map((item, index) => ({ item, index, storeKey: "bd_tasks" })),
    ...array(stores.get("bd_action_tasks")).map((item, index) => ({
      item,
      index,
      storeKey: "bd_action_tasks",
    })),
  ];

  taskRows.forEach(({ item, index, storeKey }) => {
    const due = dateKey(item.dueDate ?? item.deadline ?? item.estimatedTime);
    const status = text(item.status ?? (item.tab === "done" ? "completed" : "")).toLowerCase();
    const approvalStatus = text(item.approvalStatus).toLowerCase();
    if (
      !due
      || item.hidden === true
      || approvalStatus === "pending"
      || approvalStatus === "deleted"
      || status === "proposed"
      || CLOSED_STATUSES.has(status)
    ) return;
    const planId = text(item.sourcePlanId ?? item.planId);
    const recommendationId = text(item.recommendationId);
    const taskKey = planId && recommendationId
      ? `plan:${planId}:${recommendationId}`
      : text(item.actionTaskId)
        ? `action:${text(item.actionTaskId)}`
        : `${storeKey}:${rowId(item, index)}`;
    if (seenTaskKeys.has(taskKey)) return;
    seenTaskKeys.add(taskKey);
    const difference = daysBetween(due, today);
    const stage = difference === 1
      ? "tomorrow"
      : difference === 0
        ? "today"
        : difference < 0
          ? "overdue"
          : null;
    if (!stage) return;
    grouped.get(stage)?.push({ item, id: rowId(item, index), due });
  });

  const copy = {
    tomorrow: {
      title: "Срок поручения завтра",
      multiTitle: "Завтра истекают поручения",
      fallback: "Проверьте ответственного и готовность.",
    },
    today: {
      title: "Срок поручения сегодня",
      multiTitle: "Сегодня истекают поручения",
      fallback: "Проверьте статус выполнения.",
    },
    overdue: {
      title: "Поручение просрочено",
      multiTitle: "Есть просроченные поручения",
      fallback: "Откройте поручения и обновите статус.",
    },
  } as const;

  const result: PushMessage[] = [];
  for (const stage of ["tomorrow", "today", "overdue"] as const) {
    const rows = grouped.get(stage) ?? [];
    if (!rows.length) continue;
    const signature = rows.map((row) => `${row.id}:${row.due}`).sort().join("|");
    if (rows.length === 1) {
      const row = rows[0];
      const responsible = text(row.item.responsible ?? row.item.responsibleRole);
      const title = text(row.item.title ?? row.item.description, copy[stage].fallback);
      result.push({
        category: "task",
        dedupeKey: `${stage}-task:${signature}`,
        title: copy[stage].title,
        message: responsible ? `${title} · Ответственный: ${responsible}` : title,
        targetUrl: "/tasks",
      });
    } else {
      result.push({
        category: "task",
        dedupeKey: `${stage}-tasks:${signature}`,
        title: copy[stage].multiTitle,
        message: `${rows.length} поручения требуют контроля. Ближайшее: ${text(rows[0].item.title, copy[stage].fallback)}`,
        targetUrl: "/tasks",
      });
    }
  }
  return result;
}

function equipmentMessages(
  stores: ReadonlyMap<string, unknown>,
  today: string,
): PushMessage[] {
  const messages: PushMessage[] = [];
  array(stores.get("bd_equipment")).forEach((item, index) => {
    if (item.archived === true) return;
    const status = text(item.status).toLowerCase();
    if (CLOSED_STATUSES.has(status)) return;
    const equipmentId = rowId(item, index);
    const name = text(item.name ?? item.title, "Оборудование");
    const criticality = text(item.criticality).toLowerCase();

    if (EQUIPMENT_ALERT_STATUSES.has(status)) {
      const statusDate = dateKey(item.updatedAt ?? item.createdAt) ?? "current";
      messages.push({
        category: "equipment",
        dedupeKey: `equipment-status:${equipmentId}:${status}:${statusDate}`,
        title: status === "broken" ? "Оборудование неисправно" : "Требуется обслуживание",
        message: name,
        targetUrl: `/equipment/${encodeURIComponent(equipmentId)}`,
        urgent: status === "broken" && (criticality === "critical" || criticality === "high"),
      });
    }

    const maintenance = dateKey(item.nextMaintenance);
    if (!maintenance) return;
    const difference = daysBetween(maintenance, today);
    const stage = difference === 7
      ? "week"
      : difference === 1
        ? "tomorrow"
        : difference === 0
          ? "today"
          : difference < 0
            ? "overdue"
            : null;
    if (!stage) return;
    const titles = {
      week: "Обслуживание через 7 дней",
      tomorrow: "Обслуживание завтра",
      today: "Сегодня плановое обслуживание",
      overdue: "Обслуживание просрочено",
    } as const;
    messages.push({
      category: "equipment",
      dedupeKey: `equipment-maintenance:${equipmentId}:${maintenance}:${stage}`,
      title: titles[stage],
      message: `${name} · плановая дата ${maintenance}`,
      targetUrl: `/equipment/${encodeURIComponent(equipmentId)}`,
    });
  });
  return messages;
}

function incidentMessages(stores: ReadonlyMap<string, unknown>): PushMessage[] {
  const messages: PushMessage[] = [];
  array(stores.get("bd_cases")).forEach((item, index) => {
    const status = text(item.status, "open").toLowerCase();
    const priority = text(item.priority).toLowerCase();
    if (CLOSED_STATUSES.has(status) || (priority !== "critical" && priority !== "high")) return;
    const incidentId = rowId(item, index);
    const title = text(item.title ?? item.summary, "Открыто серьёзное происшествие");
    const description = text(item.description ?? item.businessImpact ?? item.category);
    messages.push({
      category: "incident",
      dedupeKey: `incident:${incidentId}:${priority}`,
      title: priority === "critical" ? "Критическое происшествие" : "Серьёзное происшествие",
      message: description ? `${title} · ${description}`.slice(0, 220) : title,
      targetUrl: `/cases/${encodeURIComponent(incidentId)}`,
      urgent: priority === "critical",
    });
  });
  return messages;
}

function calendarMessages(
  stores: ReadonlyMap<string, unknown>,
  today: string,
): PushMessage[] {
  const messages: PushMessage[] = [];
  const calendarLimit = addDays(today, 7);
  const opportunityCalendar = record(stores.get(OPPORTUNITY_CALENDAR_KEY));
  array(opportunityCalendar?.events).forEach((item, index) => {
    const eventDate = dateKey(item.startDate);
    const decision = text(item.decision, "watching").toLowerCase();
    const score = number(item.potentialScore) ?? 0;
    const plan = record(item.notificationPlan);
    if (plan?.status === "scheduled" || decision === "dismissed") return;
    if (decision !== "planned" && score < 75) return;
    if (!eventDate || eventDate < today || eventDate > calendarLimit) return;
    const daysLeft = daysBetween(eventDate, today);
    messages.push({
      category: "calendar",
      dedupeKey: `opportunity-fallback:${rowId(item, index)}:${eventDate}:${daysLeft}`,
      title: daysLeft === 0 ? "Возможность сегодня" : `До события ${daysLeft} дн.`,
      message: `${text(item.title, "Откройте календарь возможностей")} · потенциал ${Math.max(0, Math.min(100, Math.round(score)))}/100`,
      targetUrl: item.id ? `/opportunities#${encodeURIComponent(String(item.id))}` : "/opportunities",
    });
  });
  return messages;
}

function financeDeviationMessage(
  stores: ReadonlyMap<string, unknown>,
  today: string,
): PushMessage | null {
  const latestAllowed = addDays(today, -1);
  const oldestAllowed = addDays(today, -10);
  const revenue = array(stores.get("bd_finance_revenue"))
    .map((item) => ({
      item,
      date: dateKey(item.date),
      revenue: number(item.revenue),
      receipts: number(item.receipts),
    }))
    .filter((row): row is {
      item: JsonRecord;
      date: string;
      revenue: number;
      receipts: number | null;
    } => Boolean(row.date && row.date <= latestAllowed && row.revenue !== null && row.revenue > 0))
    .sort((left, right) => right.date.localeCompare(left.date));
  const latest = revenue[0];
  if (!latest || latest.date < oldestAllowed) return null;

  const comparable = revenue
    .slice(1)
    .filter((row) => mondayBasedDay(row.date) === mondayBasedDay(latest.date))
    .slice(0, 8);
  if (comparable.length < 3) return null;

  const revenueBaseline = median(comparable.map((row) => row.revenue));
  const revenueDrop = revenueBaseline && latest.revenue < revenueBaseline
    ? (revenueBaseline - latest.revenue) / revenueBaseline
    : 0;

  const latestAverage = latest.receipts && latest.receipts > 0
    ? latest.revenue / latest.receipts
    : null;
  const comparableAverages = comparable
    .filter((row) => row.receipts && row.receipts > 0)
    .map((row) => row.revenue / (row.receipts as number));
  const averageBaseline = median(comparableAverages);
  const averageDrop = latestAverage && averageBaseline && latestAverage < averageBaseline
    ? (averageBaseline - latestAverage) / averageBaseline
    : 0;

  if (revenueDrop < 0.3 && averageDrop < 0.2) return null;
  const parts: string[] = [];
  if (revenueDrop >= 0.3 && revenueBaseline) {
    parts.push(
      `выручка ниже на ${Math.round(revenueDrop * 100)}% (${formatNumber(latest.revenue)} против медианы ${formatNumber(revenueBaseline)})`,
    );
  }
  if (averageDrop >= 0.2 && latestAverage && averageBaseline) {
    parts.push(
      `средний чек ниже на ${Math.round(averageDrop * 100)}% (${formatNumber(latestAverage)} против ${formatNumber(averageBaseline)})`,
    );
  }
  return {
    category: "finance",
    dedupeKey: `finance-deviation:${latest.date}:${parts.map((part) => part.slice(0, 12)).join("-")}`,
    title: "Отклонение по последней смене",
    message: `${latest.date}: ${parts.join("; ")}. Сравнение с ${comparable.length} такими же днями недели.`,
    targetUrl: `/finance?date=${latest.date}`,
  };
}

function monthClosingMessage(
  stores: ReadonlyMap<string, unknown>,
  today: string,
  day: number,
): PushMessage | null {
  const month = previousMonth(today);
  const closed = array(stores.get("bd_month_closings"))
    .some((item) => text(item.monthKey) === month && text(item.status).toLowerCase() === "closed");
  if (closed) return null;

  const stage = day <= 2 ? "start" : day <= 4 ? "followup" : "overdue";
  const copy = {
    start: {
      title: "Пора закрыть прошлый месяц",
      message: `Проверьте смены, расходы, остатки и ФОТ за ${month}.`,
    },
    followup: {
      title: "Прошлый месяц ещё не закрыт",
      message: `Финальный результат за ${month} пока не зафиксирован.`,
    },
    overdue: {
      title: "Закрытие месяца просрочено",
      message: `${month} остаётся открытым. Цифры могут продолжать меняться.`,
    },
  } as const;
  return {
    category: "finance",
    dedupeKey: `month-not-closed:${month}:${stage}`,
    title: copy[stage].title,
    message: copy[stage].message,
    targetUrl: `/month-closing?month=${month}`,
  };
}

export function evaluateNotificationRules(input: NotificationRuleInput): PushMessage[] {
  const restaurant = record(input.restaurant);
  if (!restaurant) return [];
  const now = dateParts(input.preferences.timezone, input.now ?? new Date());
  const messages: PushMessage[] = [];
  const add = (message: PushMessage | null) => {
    if (message && categoryEnabled(input.preferences, message.category)) messages.push(message);
  };

  const yesterday = addDays(now.dateKey, -1);
  const revenue = array(input.stores.get("bd_finance_revenue"));
  const gapReasons = array(input.stores.get("bd_finance_gap_reasons"));
  const hasShift = revenue.some((item) => dateKey(item.date) === yesterday);
  const hasReason = gapReasons.some(
    (item) => dateKey(item.date) === yesterday && item.resolved !== false,
  );
  if (scheduledWorkingDay(restaurant, yesterday) && !hasShift && !hasReason) {
    add({
      category: "shift",
      dedupeKey: `missing-shift:${yesterday}`,
      title: "Не закрыта смена",
      message: `По графику была смена ${yesterday}, но отчёта или объяснения пока нет.`,
      targetUrl: "/shifts?closeShift=1",
    });
  }

  taskMessages(input.stores, now.dateKey).forEach(add);
  equipmentMessages(input.stores, now.dateKey).forEach(add);
  incidentMessages(input.stores).forEach(add);
  calendarMessages(input.stores, now.dateKey).forEach(add);
  add(financeDeviationMessage(input.stores, now.dateKey));
  add(monthClosingMessage(input.stores, now.dateKey, now.day));

  const quiet = isQuiet(now.hourMinute, input.preferences.quietStart, input.preferences.quietEnd);
  return messages
    .filter((message) => !quiet || message.urgent === true)
    .slice(0, 20);
}

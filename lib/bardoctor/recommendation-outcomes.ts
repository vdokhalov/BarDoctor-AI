import type { VenueAIContext } from "./venue-ai-context";

type JsonRecord = Record<string, unknown>;

export const RECOMMENDATION_METRIC_IDS = [
  "closed_month_revenue",
  "closed_month_final_profit",
  "closed_month_profit_margin_percent",
  "closed_month_payroll",
  "closed_month_payroll_share_percent",
  "closed_month_cost_of_goods",
  "closed_month_cost_of_goods_share_percent",
  "closed_month_other_expenses",
  "closed_month_other_expenses_share_percent",
  "closed_month_writeoffs",
  "closed_month_writeoffs_share_percent",
  "closed_month_shift_coverage_percent",
  "current_period_revenue",
  "current_period_receipts",
  "current_period_guests",
  "current_period_average_receipt",
  "current_period_expenses",
  "review_average_rating",
  "review_negative_count",
  "recipe_coverage_percent",
  "menu_active_items",
  "confirmed_purchase_documents",
  "inventory_snapshots",
  "low_stock_items",
  "active_employees",
] as const;

export type RecommendationMetricId = (typeof RECOMMENDATION_METRIC_IDS)[number];
export type RecommendationDirection = "increase" | "decrease" | "maintain";
export type RecommendationOutcomeStatus =
  | "pending"
  | "helped"
  | "not_helped"
  | "insufficient_data";

export type RecommendationMetricSnapshot = {
  metricId: RecommendationMetricId;
  label: string;
  value: number;
  unit: "currency" | "percent" | "count" | "rating";
  periodKey: string | null;
  periodLabel: string;
  observedAt: string | null;
  source: string;
};

export type RecommendationOutcome = {
  recommendationId: string;
  taskId: string | null;
  status: RecommendationOutcomeStatus;
  checkedAt: string;
  summary: string;
  baselineMetric: RecommendationMetricSnapshot | null;
  targetMetric: {
    metricId: RecommendationMetricId | null;
    label: string;
    value: number | null;
    unit: string;
    direction: RecommendationDirection;
  } | null;
  actualMetric: RecommendationMetricSnapshot | null;
  delta: number | null;
  nextCheckAfter: string | null;
};

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value: unknown): string | null {
  const match = text(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function iso(value: unknown): string | null {
  const parsed = Date.parse(text(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function blockUpdatedAt(context: VenueAIContext, id: string): string | null {
  return context.blocks.find((item) => item.id === id)?.updatedAt ?? null;
}

function metric(input: Omit<RecommendationMetricSnapshot, "value"> & { value: unknown }) {
  const value = number(input.value);
  return value === null ? null : { ...input, value };
}

export function isRecommendationMetricId(value: unknown): value is RecommendationMetricId {
  return typeof value === "string"
    && (RECOMMENDATION_METRIC_IDS as readonly string[]).includes(value);
}

export function recommendationMetricSnapshot(
  metricId: RecommendationMetricId,
  context: VenueAIContext,
): RecommendationMetricSnapshot | null {
  const history = record(context.promptData.performanceHistory);
  const closed = record(history.latestClosedMonth);
  const period = record(history.period);
  const feedback = record(context.promptData.guestFeedback);
  const menu = record(context.promptData.menuAndRecipes);
  const inventory = record(context.promptData.purchasesAndInventory);
  const team = record(context.promptData.team);
  const closedPeriodKey = text(closed.monthKey) || null;
  const closedPeriodLabel = text(closed.periodLabel, closedPeriodKey ?? "Закрытый месяц");
  const closedObservedAt = iso(closed.closedAt) ?? blockUpdatedAt(context, "performanceHistory");
  const currentPeriodKey = context.generatedAt.slice(0, 7);
  const currentPeriodLabel = "Текущий учётный период";
  const currentObservedAt = blockUpdatedAt(context, "performanceHistory");

  const closedMetric = (
    label: string,
    key: string,
    unit: RecommendationMetricSnapshot["unit"],
  ) => metric({
    metricId,
    label,
    value: closed[key],
    unit,
    periodKey: closedPeriodKey,
    periodLabel: closedPeriodLabel,
    observedAt: closedObservedAt,
    source: "Закрытый месячный отчёт",
  });
  const currentMetric = (
    label: string,
    key: string,
    unit: RecommendationMetricSnapshot["unit"],
  ) => metric({
    metricId,
    label,
    value: period[key],
    unit,
    periodKey: currentPeriodKey,
    periodLabel: currentPeriodLabel,
    observedAt: currentObservedAt,
    source: "Учёт смен и финансов",
  });

  switch (metricId) {
    case "closed_month_revenue": return closedMetric("Выручка", "revenue", "currency");
    case "closed_month_final_profit": return closedMetric("Чистая прибыль", "finalProfit", "currency");
    case "closed_month_profit_margin_percent": return closedMetric("Рентабельность", "profitMarginPercent", "percent");
    case "closed_month_payroll": return closedMetric("ФОТ", "payroll", "currency");
    case "closed_month_payroll_share_percent": return closedMetric("Доля ФОТ в выручке", "payrollSharePercent", "percent");
    case "closed_month_cost_of_goods": return closedMetric("Себестоимость проданного", "costOfGoods", "currency");
    case "closed_month_cost_of_goods_share_percent": return closedMetric("Доля себестоимости в выручке", "costOfGoodsSharePercent", "percent");
    case "closed_month_other_expenses": return closedMetric("Остальные расходы", "otherExpenses", "currency");
    case "closed_month_other_expenses_share_percent": return closedMetric("Доля остальных расходов", "otherExpensesSharePercent", "percent");
    case "closed_month_writeoffs": return closedMetric("Списания", "writeoffs", "currency");
    case "closed_month_writeoffs_share_percent": return closedMetric("Доля списаний в выручке", "writeoffsSharePercent", "percent");
    case "closed_month_shift_coverage_percent": return closedMetric("Полнота закрытия смен", "coveragePercent", "percent");
    case "current_period_revenue": return currentMetric("Выручка", "revenue", "currency");
    case "current_period_receipts": return currentMetric("Количество чеков", "receipts", "count");
    case "current_period_guests": return currentMetric("Количество гостей", "guests", "count");
    case "current_period_average_receipt": return currentMetric("Средний чек", "averageReceipt", "currency");
    case "current_period_expenses": return currentMetric("Расходы", "expenses", "currency");
    case "review_average_rating":
      return metric({
        metricId,
        label: "Средняя оценка гостей",
        value: feedback.averageRating,
        unit: "rating",
        periodKey: currentPeriodKey,
        periodLabel: "Отзывы на дату проверки",
        observedAt: blockUpdatedAt(context, "guestFeedback"),
        source: "Отзывы гостей",
      });
    case "review_negative_count":
      return metric({
        metricId,
        label: "Негативные отзывы",
        value: feedback.negative,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Отзывы на дату проверки",
        observedAt: blockUpdatedAt(context, "guestFeedback"),
        source: "Отзывы гостей",
      });
    case "recipe_coverage_percent":
      return metric({
        metricId,
        label: "Покрытие меню техкартами",
        value: menu.recipeCoveragePercent,
        unit: "percent",
        periodKey: currentPeriodKey,
        periodLabel: "Каталог на дату проверки",
        observedAt: blockUpdatedAt(context, "menuAndRecipes"),
        source: "Меню и техкарты",
      });
    case "menu_active_items":
      return metric({
        metricId,
        label: "Активные позиции меню",
        value: menu.activeItems,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Каталог на дату проверки",
        observedAt: blockUpdatedAt(context, "menuAndRecipes"),
        source: "Меню и техкарты",
      });
    case "confirmed_purchase_documents":
      return metric({
        metricId,
        label: "Подтверждённые закупки",
        value: inventory.confirmedDocuments,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Закупки на дату проверки",
        observedAt: blockUpdatedAt(context, "purchasesAndInventory"),
        source: "Закупки",
      });
    case "inventory_snapshots":
      return metric({
        metricId,
        label: "Проведённые инвентаризации",
        value: inventory.inventorySnapshots,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Склад на дату проверки",
        observedAt: blockUpdatedAt(context, "purchasesAndInventory"),
        source: "Склад и инвентаризации",
      });
    case "low_stock_items":
      return metric({
        metricId,
        label: "Позиций ниже минимального остатка",
        value: Array.isArray(inventory.lowStock) ? inventory.lowStock.length : null,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Склад на дату проверки",
        observedAt: blockUpdatedAt(context, "purchasesAndInventory"),
        source: "Складские остатки",
      });
    case "active_employees":
      return metric({
        metricId,
        label: "Активные сотрудники",
        value: team.active,
        unit: "count",
        periodKey: currentPeriodKey,
        periodLabel: "Команда на дату проверки",
        observedAt: blockUpdatedAt(context, "team"),
        source: "Сотрудники",
      });
  }
}

function nextDay(now: Date): string {
  const result = new Date(now);
  result.setUTCDate(result.getUTCDate() + 1);
  return result.toISOString();
}

function insufficient(
  input: JsonRecord,
  now: Date,
  summary: string,
  baselineMetric: RecommendationMetricSnapshot | null,
  targetMetric: RecommendationOutcome["targetMetric"],
  actualMetric: RecommendationMetricSnapshot | null = null,
): RecommendationOutcome {
  return {
    recommendationId: text(input.recommendationId, "recommendation"),
    taskId: text(input.id) || null,
    status: "insufficient_data",
    checkedAt: now.toISOString(),
    summary,
    baselineMetric,
    targetMetric,
    actualMetric,
    delta: baselineMetric && actualMetric ? rounded(actualMetric.value - baselineMetric.value) : null,
    nextCheckAfter: nextDay(now),
  };
}

function targetFrom(input: JsonRecord): RecommendationOutcome["targetMetric"] {
  const raw = record(input.targetMetric);
  const metricId = isRecommendationMetricId(raw.metricId)
    ? raw.metricId
    : isRecommendationMetricId(record(input.baselineMetric).metricId)
      ? record(input.baselineMetric).metricId as RecommendationMetricId
      : null;
  const direction = raw.direction === "decrease" || raw.direction === "maintain"
    ? raw.direction
    : "increase";
  return {
    metricId,
    label: text(raw.label, text(input.successCriterion, "Целевой показатель")),
    value: number(raw.value),
    unit: text(raw.unit, text(record(input.baselineMetric).unit)),
    direction,
  };
}

export function evaluateRecommendationOutcome(
  rawInput: unknown,
  context: VenueAIContext,
  now = new Date(),
): RecommendationOutcome {
  const input = record(rawInput);
  const targetMetric = targetFrom(input);
  const rawBaseline = record(input.baselineMetric);
  const metricId = targetMetric?.metricId
    ?? (isRecommendationMetricId(rawBaseline.metricId) ? rawBaseline.metricId : null);
  const baselineMetric = metricId && number(rawBaseline.value) !== null
    ? {
        metricId,
        label: text(rawBaseline.label, "Исходный показатель"),
        value: number(rawBaseline.value)!,
        unit: (text(rawBaseline.unit, "count") as RecommendationMetricSnapshot["unit"]),
        periodKey: text(rawBaseline.periodKey) || null,
        periodLabel: text(rawBaseline.periodLabel, "Исходный период"),
        observedAt: iso(rawBaseline.observedAt),
        source: text(rawBaseline.source, "Данные BarDoctor"),
      }
    : null;
  const verificationDate = dateOnly(input.verificationDate ?? input.deadline);
  const today = now.toISOString().slice(0, 10);
  const taskStatus = text(input.status);

  if (taskStatus && taskStatus !== "completed") {
    return {
      recommendationId: text(input.recommendationId, "recommendation"),
      taskId: text(input.id) || null,
      status: "pending",
      checkedAt: now.toISOString(),
      summary: "Контроль результата начнётся после выполнения поручения.",
      baselineMetric,
      targetMetric,
      actualMetric: null,
      delta: null,
      nextCheckAfter: verificationDate ? `${verificationDate}T00:00:00.000Z` : nextDay(now),
    };
  }

  if (verificationDate && verificationDate > today) {
    return {
      recommendationId: text(input.recommendationId, "recommendation"),
      taskId: text(input.id) || null,
      status: "pending",
      checkedAt: now.toISOString(),
      summary: `Проверка запланирована на ${verificationDate}.`,
      baselineMetric,
      targetMetric,
      actualMetric: null,
      delta: null,
      nextCheckAfter: `${verificationDate}T00:00:00.000Z`,
    };
  }
  if (!metricId || !baselineMetric) {
    return insufficient(
      input,
      now,
      "Пока недостаточно данных: рекомендация не содержит числовой исходной точки, которую BarDoctor может проверить автоматически.",
      baselineMetric,
      targetMetric,
    );
  }

  const actualMetric = recommendationMetricSnapshot(metricId, context);
  if (!actualMetric) {
    return insufficient(
      input,
      now,
      "Пока недостаточно данных: фактическое значение контрольного показателя ещё не появилось в учёте.",
      baselineMetric,
      targetMetric,
    );
  }

  if (metricId.startsWith("closed_month_")
    && baselineMetric.periodKey
    && actualMetric.periodKey
    && actualMetric.periodKey <= baselineMetric.periodKey) {
    return insufficient(
      input,
      now,
      `Пока недостаточно данных: после ${baselineMetric.periodLabel} ещё нет нового закрытого месяца.`,
      baselineMetric,
      targetMetric,
      actualMetric,
    );
  }
  if (!metricId.startsWith("closed_month_")
    && baselineMetric.observedAt
    && actualMetric.observedAt
    && Date.parse(actualMetric.observedAt) <= Date.parse(baselineMetric.observedAt)) {
    return insufficient(
      input,
      now,
      "Пока недостаточно данных: контрольный показатель не обновлялся после выдачи рекомендации.",
      baselineMetric,
      targetMetric,
      actualMetric,
    );
  }

  const direction = targetMetric?.direction ?? "increase";
  const targetValue = targetMetric?.value;
  const tolerance = Math.max(0.01, Math.abs(targetValue ?? baselineMetric.value) * 0.01);
  const reached = targetValue !== null && targetValue !== undefined
    ? direction === "decrease"
      ? actualMetric.value <= targetValue
      : direction === "maintain"
        ? Math.abs(actualMetric.value - targetValue) <= tolerance
        : actualMetric.value >= targetValue
    : direction === "decrease"
      ? actualMetric.value < baselineMetric.value
      : direction === "maintain"
        ? Math.abs(actualMetric.value - baselineMetric.value) <= tolerance
        : actualMetric.value > baselineMetric.value;
  const status: RecommendationOutcomeStatus = reached ? "helped" : "not_helped";
  const delta = rounded(actualMetric.value - baselineMetric.value);
  const targetText = targetValue === null || targetValue === undefined
    ? "динамику относительно исходной точки"
    : `цель ${targetValue}`;

  return {
    recommendationId: text(input.recommendationId, "recommendation"),
    taskId: text(input.id) || null,
    status,
    checkedAt: now.toISOString(),
    summary: reached
      ? `Помогло: контрольный показатель достиг цели (${baselineMetric.value} → ${actualMetric.value}; ${targetText}).`
      : `Не помогло: контрольный показатель не достиг цели (${baselineMetric.value} → ${actualMetric.value}; ${targetText}).`,
    baselineMetric,
    targetMetric,
    actualMetric,
    delta,
    nextCheckAfter: null,
  };
}

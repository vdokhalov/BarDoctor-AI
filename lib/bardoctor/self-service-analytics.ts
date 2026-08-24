type JsonRecord = Record<string, unknown>;

export type SelfServiceAnalyticsInput = {
  targetDate: string | null;
  baselineDates: string[];
  daily?: unknown[];
  hourly?: unknown[];
  sales?: unknown[];
  menu?: unknown[];
  operationalSignals?: unknown[];
  currency?: string | null;
};

export type AnalyticsAvailability = "available" | "unavailable";

export type HourlyDeviation = {
  hour: number;
  periodLabel: string;
  checks: number;
  baselineChecks: number;
  changePercent: number;
  absoluteChange: number;
  estimatedRevenueContribution: number | null;
  baselineSampleSize: number;
};

export type SalesContributor = {
  key: string;
  label: string;
  changePerCheck: number;
  targetRevenuePerCheck: number;
  baselineRevenuePerCheck: number;
  shareChangePoints: number;
};

export type SelfServiceAnalytics = {
  version: "self-service-analytics-v1";
  currency: string;
  traffic: {
    status: AnalyticsAvailability;
    topWindows: HourlyDeviation[];
    limitation: string | null;
  };
  averageCheck: {
    status: AnalyticsAvailability;
    topCategories: SalesContributor[];
    topItems: SalesContributor[];
    limitation: string | null;
  };
  operationalCorrelations: Array<{
    id: string;
    title: string;
    detail: string;
    status: "hypothesis";
  }>;
};

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", limit = 300): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function dateOnly(value: unknown): string | null {
  const match = text(value, "", 50).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function hourOf(value: unknown): number | null {
  const direct = number(value);
  if (direct !== null && direct >= 0 && direct <= 23) return Math.floor(direct);
  const source = text(value, "", 80);
  const time = source.match(/(?:T|^)(\d{1,2}):\d{2}/)?.[1];
  const parsed = time === undefined ? null : Number(time);
  return parsed !== null && parsed >= 0 && parsed <= 23 ? parsed : null;
}

function periodLabel(hour: number): string {
  const next = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00–${String(next).padStart(2, "0")}:00`;
}

type HourRow = { date: string; hour: number; checks: number; revenue: number; averageCheck: number | null };

function appendHourlyRows(target: HourRow[], rawRows: unknown[], inheritedDate: string | null = null): void {
  for (const raw of rawRows) {
    const item = record(raw);
    const date = dateOnly(item.date ?? item.operatingDate ?? item.timestamp ?? item.startedAt) ?? inheritedDate;
    const hour = hourOf(item.hour ?? item.startTime ?? item.time ?? item.timestamp ?? item.startedAt);
    if (!date || hour === null) continue;
    const checks = number(item.checks ?? item.receipts ?? item.count) ?? 0;
    const revenue = number(item.revenue ?? item.amount ?? item.grossSales) ?? 0;
    const averageCheck = number(item.averageCheck ?? item.avgReceipt)
      ?? (checks > 0 ? revenue / checks : null);
    target.push({ date, hour, checks, revenue, averageCheck });
  }
}

function hourlyRows(input: SelfServiceAnalyticsInput): HourRow[] {
  const result: HourRow[] = [];
  appendHourlyRows(result, input.hourly ?? []);
  for (const raw of input.daily ?? []) {
    const item = record(raw);
    const date = dateOnly(item.date ?? item.operatingDate);
    appendHourlyRows(result, list(item.hourly ?? item.hours ?? item.byHour), date);
    const checksByHour = record(item.checksByHour);
    const revenueByHour = record(item.revenueByHour);
    for (const [hour, checks] of Object.entries(checksByHour)) {
      const parsedHour = hourOf(hour);
      if (!date || parsedHour === null) continue;
      result.push({
        date,
        hour: parsedHour,
        checks: number(checks) ?? 0,
        revenue: number(revenueByHour[hour]) ?? 0,
        averageCheck: null,
      });
    }
  }
  const aggregated = new Map<string, HourRow>();
  for (const row of result) {
    const key = `${row.date}:${row.hour}`;
    const existing = aggregated.get(key) ?? { date: row.date, hour: row.hour, checks: 0, revenue: 0, averageCheck: null };
    existing.checks += row.checks;
    existing.revenue += row.revenue;
    existing.averageCheck = existing.checks > 0 ? existing.revenue / existing.checks : row.averageCheck;
    aggregated.set(key, existing);
  }
  return [...aggregated.values()];
}

function trafficAnalysis(input: SelfServiceAnalyticsInput): SelfServiceAnalytics["traffic"] {
  if (!input.targetDate) return {
    status: "unavailable",
    topWindows: [],
    limitation: "Почасовой разбор недоступен: сопоставимая смена не определена.",
  };
  const rows = hourlyRows(input);
  const target = rows.filter((row) => row.date === input.targetDate);
  if (!target.length) return {
    status: "unavailable",
    topWindows: [],
    limitation: "Почасовой разбор недоступен: касса не передаёт время чеков.",
  };
  const baselineDateSet = new Set(input.baselineDates);
  const windows: HourlyDeviation[] = [];
  for (const current of target) {
    const comparable = rows.filter((row) => baselineDateSet.has(row.date) && row.hour === current.hour);
    const baselineChecks = median(comparable.map((row) => row.checks));
    if (baselineChecks === null || baselineChecks <= 0) continue;
    const baselineAverage = median(comparable.map((row) => row.averageCheck).filter((value): value is number => value !== null));
    const absoluteChange = rounded(current.checks - baselineChecks, 1);
    windows.push({
      hour: current.hour,
      periodLabel: periodLabel(current.hour),
      checks: rounded(current.checks, 1),
      baselineChecks: rounded(baselineChecks, 1),
      changePercent: rounded(absoluteChange / baselineChecks * 100, 1),
      absoluteChange,
      estimatedRevenueContribution: baselineAverage === null ? null : rounded(absoluteChange * baselineAverage, 2),
      baselineSampleSize: comparable.length,
    });
  }
  if (!windows.length) return {
    status: "unavailable",
    topWindows: [],
    limitation: "Почасовой разбор недоступен: для этих часов ещё нет сопоставимых смен.",
  };
  return {
    status: "available",
    topWindows: windows
      .filter((item) => item.changePercent < 0)
      .sort((left, right) => left.changePercent - right.changePercent || left.absoluteChange - right.absoluteChange)
      .slice(0, 3),
    limitation: null,
  };
}

type SaleLine = { date: string; name: string; category: string; revenue: number };

function saleLines(input: SelfServiceAnalyticsInput): SaleLine[] {
  const menuById = new Map<string, JsonRecord>();
  const menuByName = new Map<string, JsonRecord>();
  for (const raw of input.menu ?? []) {
    const item = record(raw);
    const id = text(item.id ?? item.menuItemId).toLocaleLowerCase("ru");
    const name = text(item.name).toLocaleLowerCase("ru");
    if (id) menuById.set(id, item);
    if (name) menuByName.set(name, item);
  }
  const result: SaleLine[] = [];
  for (const raw of input.sales ?? []) {
    const document = record(raw);
    if (document.status && !["confirmed", "posted", "closed", "success"].includes(text(document.status))) continue;
    const date = dateOnly(document.date ?? document.operatingDate ?? document.closedAt);
    if (!date) continue;
    for (const rawLine of list(document.items ?? document.lines ?? document.sales)) {
      const line = record(rawLine);
      const name = text(line.name ?? line.productName ?? line.menuItem, "Позиция");
      const menuItem = menuById.get(text(line.menuItemId ?? line.productId).toLocaleLowerCase("ru"))
        ?? menuByName.get(name.toLocaleLowerCase("ru"));
      const category = text(line.category ?? line.categoryName ?? menuItem?.category, "Без категории");
      const revenue = number(line.grossSales ?? line.revenue ?? line.lineTotal ?? line.total);
      if (revenue === null) continue;
      result.push({ date, name, category, revenue });
    }
  }
  return result;
}

function averageCheckAnalysis(input: SelfServiceAnalyticsInput): SelfServiceAnalytics["averageCheck"] {
  if (!input.targetDate) return {
    status: "unavailable",
    topCategories: [],
    topItems: [],
    limitation: "Разложение среднего чека недоступно: сопоставимая смена не определена.",
  };
  const lines = saleLines(input);
  const targetLines = lines.filter((line) => line.date === input.targetDate);
  const baselineSet = new Set(input.baselineDates);
  const baselineLines = lines.filter((line) => baselineSet.has(line.date));
  if (!targetLines.length || !baselineLines.length) return {
    status: "unavailable",
    topCategories: [],
    topItems: [],
    limitation: "Данных по продажам отдельных позиций недостаточно для разложения среднего чека.",
  };
  const dailyByDate = new Map((input.daily ?? []).map((raw) => {
    const item = record(raw);
    return [dateOnly(item.date ?? item.operatingDate) ?? "", number(item.checks ?? item.receipts) ?? 0] as const;
  }));
  const checksBySalesDate = new Map<string, number>();
  for (const raw of input.sales ?? []) {
    const item = record(raw);
    const date = dateOnly(item.date ?? item.operatingDate ?? item.closedAt);
    if (!date) continue;
    checksBySalesDate.set(date, (checksBySalesDate.get(date) ?? 0) + (number(item.checks ?? item.receipts) ?? 0));
  }
  const checksFor = (date: string) => dailyByDate.get(date) || checksBySalesDate.get(date) || 0;
  const targetChecks = checksFor(input.targetDate);
  if (targetChecks <= 0 || input.baselineDates.every((date) => checksFor(date) <= 0)) return {
    status: "unavailable",
    topCategories: [],
    topItems: [],
    limitation: "Данных по количеству чеков недостаточно для расчёта вклада категорий и позиций.",
  };
  const build = (selector: (line: SaleLine) => string): SalesContributor[] => {
    const labels = new Set(lines.map(selector));
    const targetTotalRevenue = targetLines.reduce((sum, line) => sum + line.revenue, 0);
    const baselineTotalPerCheck = median(input.baselineDates.map((date) => {
      const checks = checksFor(date);
      if (checks <= 0) return Number.NaN;
      return baselineLines.filter((line) => line.date === date).reduce((sum, line) => sum + line.revenue, 0) / checks;
    }).filter(Number.isFinite)) ?? 0;
    return [...labels].map((label) => {
      const targetRevenue = targetLines.filter((line) => selector(line) === label).reduce((sum, line) => sum + line.revenue, 0);
      const targetRevenuePerCheck = targetRevenue / targetChecks;
      const baselineRevenuePerCheck = median(input.baselineDates.map((date) => {
        const checks = checksFor(date);
        if (checks <= 0) return Number.NaN;
        return baselineLines.filter((line) => line.date === date && selector(line) === label)
          .reduce((sum, line) => sum + line.revenue, 0) / checks;
      }).filter(Number.isFinite)) ?? 0;
      const targetShare = targetTotalRevenue > 0 ? targetRevenue / targetTotalRevenue * 100 : 0;
      const baselineShare = baselineTotalPerCheck > 0 ? baselineRevenuePerCheck / baselineTotalPerCheck * 100 : 0;
      return {
        key: label.toLocaleLowerCase("ru"),
        label,
        changePerCheck: rounded(targetRevenuePerCheck - baselineRevenuePerCheck, 2),
        targetRevenuePerCheck: rounded(targetRevenuePerCheck, 2),
        baselineRevenuePerCheck: rounded(baselineRevenuePerCheck, 2),
        shareChangePoints: rounded(targetShare - baselineShare, 1),
      };
    }).filter((item) => item.changePerCheck < 0)
      .sort((left, right) => left.changePerCheck - right.changePerCheck)
      .slice(0, 3);
  };
  return {
    status: "available",
    topCategories: build((line) => line.category),
    topItems: build((line) => line.name),
    limitation: null,
  };
}

function operationalCorrelations(
  input: SelfServiceAnalyticsInput,
  traffic: SelfServiceAnalytics["traffic"],
): SelfServiceAnalytics["operationalCorrelations"] {
  const worst = traffic.topWindows[0];
  if (!input.targetDate || !worst) return [];
  return (input.operationalSignals ?? []).map(record).filter((item) => {
    const timestamp = text(item.timestamp ?? item.occurredAt ?? item.createdAt ?? item.updatedAt, "", 80);
    return dateOnly(timestamp) === input.targetDate && hourOf(timestamp) === worst.hour;
  }).slice(0, 3).map((item, index) => ({
    id: text(item.id, `operational-correlation-${index + 1}`),
    title: text(item.title ?? item.name, "Операционный сигнал"),
    detail: `По времени совпадает с отклонением ${worst.periodLabel}. Это корреляция, а не доказанная причина.`,
    status: "hypothesis" as const,
  }));
}

export function buildSelfServiceAnalytics(input: SelfServiceAnalyticsInput): SelfServiceAnalytics {
  const traffic = trafficAnalysis(input);
  const averageCheck = averageCheckAnalysis(input);
  return {
    version: "self-service-analytics-v1",
    currency: text(input.currency, "MDL", 12).toUpperCase(),
    traffic,
    averageCheck,
    operationalCorrelations: operationalCorrelations(input, traffic),
  };
}

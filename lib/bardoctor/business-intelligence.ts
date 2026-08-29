import { buildSelfServiceAnalytics, type SelfServiceAnalytics } from "./self-service-analytics";

type JsonRecord = Record<string, unknown>;

export type IntelligencePhase = "before_shift" | "during_shift" | "after_shift";
export type ConfidenceLevel = "high" | "medium" | "low";
export type BusinessHealthStatus = "healthy" | "attention" | "critical" | "insufficient_data";

export type DailyBusinessMetric = {
  date: string;
  revenue: number;
  checks: number | null;
  guests: number | null;
  averageCheck: number | null;
};

export type ComparableBaseline = {
  targetDate: string;
  weekday: number;
  sampleSize: number;
  method: "median_same_weekday";
  confidence: ConfidenceLevel;
  revenue: number | null;
  checks: number | null;
  guests: number | null;
  averageCheck: number | null;
  dates: string[];
};

export type BusinessHealthComponent = {
  id: "finance" | "demand" | "operations" | "guests";
  label: string;
  score: number | null;
  weight: number;
  confidence: ConfidenceLevel;
  evidence: string[];
  gaps: string[];
};

export type StructuredHypothesis = {
  id: string;
  statement: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  missingEvidence: string[];
  confidence: ConfidenceLevel;
  confidencePercent: number;
  causalStatus: "hypothesis" | "supported" | "not_supported";
  verificationPlan: {
    metric: string;
    baseline: string;
    timeframe: string;
    successCriterion: string;
  };
};

export type ManagementBriefing = {
  version: "management-briefing-v2";
  analysisPeriod: MetricPeriod;
  updatedAt: string;
  diagnosis: {
    title: string;
    summary: string;
    severity: "critical" | "high" | "medium" | "stable";
    periodLabel: string;
    baseline: string;
    /** Compatibility fields for the v253 rendered client. */
    fact: string;
    metrics: Array<{ label: string; value: string }>;
    confidencePercent: number;
    confidenceLabel: "Достоверность диагноза";
  } | null;
  confidence: {
    label: "Достоверность диагноза";
    percent: number;
    level: ConfidenceLevel;
    snapshotGeneratedAt: string;
  };
  keyDrivers: Array<{
    id: "revenue" | "traffic" | "average_check";
    metric: string;
    value: string;
    contribution: string | null;
    explanation: string;
  }>;
  findings: Array<{
    id: string;
    title: string;
    detail: string;
    contribution: string | null;
    status: "finding" | "limitation" | "hypothesis";
  }>;
  todayActions: Array<{
    recommendationId: string;
    issueKey: string;
    title: string;
    reason: string;
    ctaLabel: string;
    deadlineLabel: "Срок действия";
    deadline: string;
    metricToCheck: string;
    targetOrVerification: string;
    priority: "critical" | "high" | "medium" | "low";
    responsibleRole: string;
    fact: string;
    factPeriod: string;
    action: string;
    successCriterion: string;
    verificationPlanId: string;
  }>;
  externalContext: Array<{
    id: string;
    title: string;
    relevance: string;
    factOrHypothesis: "fact" | "hypothesis";
    evidence: string;
    whatToWatch: string;
  }>;
  afterShiftChecks: Array<{
    id: string;
    metric: string;
    baseline: string;
    expectedComparison: string;
  }>;
  externalContextState: {
    status: "relevant" | "checked_none" | "unavailable" | "insufficient";
    message: string;
  };
  verificationPlan: {
    id: string;
    status: "scheduled" | "completed";
    targetDate: string | null;
    createdAt: string;
    reused: boolean;
    checks: string[];
    result: {
      summary: string;
      confirmed: string[];
      notConfirmed: string[];
      actionOutcome: string;
    } | null;
  };
  operationalProblems: JsonRecord[];
  businessHealthSummary: {
    score: number | null;
    label: string;
    drivers: string[];
  };
  dataQualitySummary: {
    percent: number;
    label: "Полнота данных";
    gaps: number;
  };
  /** Compatibility aliases for pre-v254 consumers. */
  actions: JsonRecord[];
  context: Array<{
    id: string;
    title: string;
    status: "fact" | "hypothesis";
    reason: string;
    verification: string;
  }>;
};

export type AIDoctorIntelligence = {
  version: "ai-doctor-intelligence-v3";
  generatedAt: string;
  phase: IntelligencePhase;
  trafficMetric: {
    source: "guest_count" | "checks_proxy" | "unavailable";
    label: string;
    limitation: string | null;
  };
  demand: {
    target: DailyBusinessMetric | null;
    baseline: ComparableBaseline | null;
    revenueChangePercent: number | null;
    trafficChangePercent: number | null;
    averageCheckChangePercent: number | null;
    explanation: string;
    materialDeviation: boolean;
    period: MetricPeriod;
    decomposition: {
      checksEffect: number | null;
      averageCheckEffect: number | null;
      totalModelledChange: number | null;
      dominantFactor: "checks" | "average_check" | "balanced" | "unavailable";
      explanation: string;
    };
  };
  livePeriod: LivePeriodAnalysis;
  businessHealth: {
    score: number | null;
    label: "healthy" | "attention" | "critical" | "insufficient_data";
    confidencePercent: number;
    confidence: ConfidenceLevel;
    components: BusinessHealthComponent[];
    lowersScore: string[];
    supportsScore: string[];
    adjustments: string[];
    methodology: string;
    explanation: string;
  };
  dataQuality: {
    percent: number;
    confidence: ConfidenceLevel;
    gapsByScope: Record<string, string[]>;
    explanation: string;
  };
  externalContext: Array<{
    id: string;
    title: string;
    date: string | null;
    relevanceScore: number;
    relevance: "high" | "medium" | "low";
    venueDistanceKm: number | null;
    nearestCompetitor: string | null;
    competitorDistanceKm: number | null;
    scheduleOverlap: boolean | null;
    reason: string;
    source: "external_data";
  }>;
  hypotheses: StructuredHypothesis[];
  prioritySignals: JsonRecord[];
  periods: {
    currentFinance: MetricPeriod | null;
    closedFinance: MetricPeriod | null;
    demand: MetricPeriod;
  };
  selfServiceAnalytics: SelfServiceAnalytics;
  briefing: ManagementBriefing;
  abstained: boolean;
  abstentionReason: string | null;
};

export type MetricPeriod = {
  id: "current_finance" | "closed_finance" | "comparable_shift";
  label: string;
  startDate: string | null;
  endDate: string | null;
  comparisonBaseline: string;
  freshness: string;
  status: "open" | "closed" | "snapshot";
};

export type LivePeriodAnalysis = {
  method: "current_mtd_vs_previous_mtd" | "recent_completed_shifts" | "latest_shift_vs_same_weekday" | "insufficient";
  direction: "better" | "weaker" | "stable" | "insufficient";
  headline: string;
  periodLabel: string;
  comparisonLabel: string;
  preliminary: true;
  comparison: {
    method: LivePeriodAnalysis["method"];
    currentRange: { startDate: string | null; endDate: string | null };
    comparisonRange: { startDate: string | null; endDate: string | null } | null;
    sampleSize: { current: number; comparison: number };
    availability: "available" | "unavailable";
    reasonUnavailable: string | null;
  };
  current: {
    startDate: string | null;
    endDate: string | null;
    revenue: number | null;
    checks: number | null;
    averageCheck: number | null;
    preliminaryResult: number | null;
    currency: string;
    sampleSize: number;
  };
  baseline: {
    startDate: string;
    endDate: string;
    revenue: number;
    checks: number | null;
    averageCheck: number | null;
    sampleSize: number;
  } | null;
  changes: {
    revenuePercent: number | null;
    checksPercent: number | null;
    averageCheckPercent: number | null;
  };
  financeSummary: string;
  demandSummary: string;
  factors: string[];
};

export type BusinessIntelligenceInput = {
  venueId?: string | number | null;
  now?: Date;
  phase?: IntelligencePhase;
  profile?: JsonRecord;
  daily?: unknown[];
  hourly?: unknown[];
  sales?: unknown[];
  menu?: unknown[];
  operationalSignals?: unknown[];
  currency?: string | null;
  externalProvider?: {
    attempted?: boolean;
    ok?: boolean;
    coverage?: "sufficient" | "insufficient";
  };
  previousVerificationPlans?: unknown[];
  latestClosedMonth?: JsonRecord | null;
  previousClosedMonth?: JsonRecord | null;
  closedMonthComparison?: JsonRecord | null;
  currentFinancialPeriod?: JsonRecord | null;
  operations?: {
    unclosedShifts?: number;
    stockAnomalies?: number;
    criticalBlockers?: number;
    recurringEquipmentFailures?: number;
  };
  reviews?: {
    total?: number;
    averageRating?: number | null;
    negative?: number;
    recurringComplaints?: number;
  };
  dataBlocks?: Array<{
    id: string;
    label: string;
    available: boolean;
    freshness?: string;
    detail?: string;
  }>;
  events?: unknown[];
  competitors?: unknown[];
  previousHypotheses?: unknown[];
};

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", limit = 500): string {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, limit)
    : fallback;
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function businessHealthStatusForScore(score: number | null): BusinessHealthStatus {
  if (score === null) return "insufficient_data";
  if (score < 45) return "critical";
  if (score <= 70) return "attention";
  return "healthy";
}

function rounded(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function validDate(value: unknown): string | null {
  const candidate = text(value, "", 32).match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
  if (!candidate) return null;
  const parsed = Date.parse(`${candidate}T12:00:00.000Z`);
  return Number.isFinite(parsed) ? candidate : null;
}

function weekday(value: string): number {
  return new Date(`${value}T12:00:00.000Z`).getUTCDay();
}

function median(values: Array<number | null>): number | null {
  const sorted = values.filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : rounded((sorted[middle - 1]! + sorted[middle]!) / 2, 2);
}

function percentChange(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return rounded((current - baseline) / Math.abs(baseline) * 100);
}

function confidenceForSample(sampleSize: number): ConfidenceLevel {
  return sampleSize >= 5 ? "high" : sampleSize >= 3 ? "medium" : "low";
}

function humanDate(value: string | null): string {
  if (!value) return "дата не определена";
  const parsed = Date.parse(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(parsed));
}

function comparableShiftLabel(baseline: ComparableBaseline | null): string {
  if (!baseline) return "Сопоставимая норма ещё не сформирована";
  const weekdayLabels = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const weekdayPlural = ["воскресений", "понедельников", "вторников", "сред", "четвергов", "пятниц", "суббот"];
  const noun = baseline.sampleSize === 1 ? weekdayLabels[baseline.weekday] : weekdayPlural[baseline.weekday];
  return baseline.sampleSize === 1
    ? `Предыдущая сопоставимая смена · ${noun}`
    : `${baseline.sampleSize} предыдущих сопоставимых ${noun}`;
}

function currencyLabel(value: string): string {
  const code = text(value, "MDL", 12).toUpperCase();
  return ({ MDL: "лей", PMR_RUB: "руб. ПМР", RUB: "₽", EUR: "€", USD: "$", UAH: "₴", RON: "lei" } as Record<string, string>)[code] ?? code;
}

function money(value: number | null, currency: string, approximate = false): string | null {
  if (value === null) return null;
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Math.abs(value));
  return `${approximate ? "оценочно " : ""}${value < 0 ? "−" : "+"}${formatted} ${currencyLabel(currency)}`;
}

export function normaliseDailyMetrics(value: unknown[]): DailyBusinessMetric[] {
  const byDate = new Map<string, DailyBusinessMetric>();
  for (const raw of value) {
    const item = record(raw);
    const date = validDate(item.date ?? item.operatingDate);
    if (!date) continue;
    const revenue = numeric(item.revenue ?? item.amount) ?? 0;
    const checks = numeric(item.checks ?? item.receipts);
    const guests = numeric(item.guests ?? item.guestCount);
    const explicitAverage = numeric(item.averageCheck ?? item.avgReceipt);
    const averageCheck = explicitAverage
      ?? (checks !== null && checks > 0 ? rounded(revenue / checks, 2) : null);
    byDate.set(date, { date, revenue, checks, guests, averageCheck });
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function comparableWeekdayBaseline(
  rows: DailyBusinessMetric[],
  targetDate: string,
  maximumSample = 8,
): ComparableBaseline | null {
  const targetWeekday = weekday(targetDate);
  const comparable = rows
    .filter((row) => row.date < targetDate && weekday(row.date) === targetWeekday)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, maximumSample);
  if (!comparable.length) return null;
  return {
    targetDate,
    weekday: targetWeekday,
    sampleSize: comparable.length,
    method: "median_same_weekday",
    confidence: confidenceForSample(comparable.length),
    revenue: median(comparable.map((row) => row.revenue)),
    checks: median(comparable.map((row) => row.checks)),
    guests: median(comparable.map((row) => row.guests)),
    averageCheck: median(comparable.map((row) => row.averageCheck)),
    dates: comparable.map((row) => row.date),
  };
}

function phaseFor(profile: JsonRecord, now: Date): IntelligencePhase {
  const start = text(profile.openTime, "22:00", 5);
  const end = text(profile.closeTime, "06:00", 5);
  const timezone = text(profile.timezone, "Europe/Chisinau", 80);
  let minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    if (Number.isFinite(hour) && Number.isFinite(minute)) minutes = hour * 60 + minute;
  } catch {
    // UTC fallback is deterministic when a legacy profile has an invalid zone.
  }
  const parse = (value: string) => {
    const [hours, minute] = value.split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minute) ? hours * 60 + minute : null;
  };
  const open = parse(start);
  const close = parse(end);
  if (open === null || close === null) return "before_shift";
  const active = open <= close
    ? minutes >= open && minutes <= close
    : minutes >= open || minutes <= close;
  if (active) return "during_shift";
  const hoursAfterClose = close <= minutes ? (minutes - close) / 60 : (minutes + 1_440 - close) / 60;
  return hoursAfterClose <= 8 ? "after_shift" : "before_shift";
}

function zonedDateKey(value: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid legacy timezones fall back to UTC deterministically.
  }
  return value.toISOString().slice(0, 10);
}

function trafficSource(target: DailyBusinessMetric | null, baseline: ComparableBaseline | null) {
  if ((target?.guests ?? 0) > 0 && (baseline?.guests ?? 0) > 0) return {
    source: "guest_count" as const,
    label: "Количество гостей",
    limitation: null,
  };
  if ((target?.checks ?? 0) > 0 || (baseline?.checks ?? 0) > 0) return {
    source: "checks_proxy" as const,
    label: "Количество чеков",
    limitation: "Точных данных по количеству гостей нет, поэтому для оценки динамики трафика используется количество чеков.",
  };
  return {
    source: "unavailable" as const,
    label: "Трафик не измеряется",
    limitation: "Нет ни количества гостей, ни количества чеков для оценки трафика.",
  };
}

function demandExplanation(input: {
  source: "guest_count" | "checks_proxy" | "unavailable";
  traffic: number | null;
  average: number | null;
  revenue: number | null;
  sampl-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Invalid legacy timezones fall back to UTC deterministically.
  }
  return value.toISOString().slice(0, 10);
}

function trafficSource(target: DailyBusinessMetric | null, baseline: ComparableBaseline | null) {
  if ((target?.guests ?? 0) > 0 && (baseline?.guests ?? 0) > 0) return {
    source: "guest_count" as const,
    label: "Количество гостей",
    limitation: null,
  };
  if ((target?.checks ?? 0) > 0 || (baseline?.checks ?? 0) > 0) return {
    source: "checks_proxy" as const,
    label: "Количество чеков",
    limitation: "Точных данных по количеству гостей нет, поэтому для оценки динамики трафика используется количество чеков.",
  };
  return {
    source: "unavailable" as const,
    label: "Трафик не измеряется",
    limitation: "Нет ни количества гостей, ни количества чеков для оценки трафика.",
  };
}

function demandExplanation(input: {
  source: "guest_count" | "checks_proxy" | "unavailable";
  traffic: number | null;
  average: number | null;
  revenue: number | null;
  sampleSize: number;
}): string {
  if (input.sampleSize < 3) return "Сопоставимых смен пока меньше трёх: отклонение показано как слабый сигнал, а не как доказанная тенденция.";
  if (input.source === "unavailable") return "Трафик нельзя разложить: отсутствуют и гости, и чеки.";
  const trafficDown = input.traffic !== null && input.traffic <= -10;
  const trafficUp = input.traffic !== null && input.traffic >= 10;
  const averageDown = input.average !== null && input.average <= -8;
  const averageUp = input.average !== null && input.average >= 8;
  if (trafficDown && averageDown) return "Результат снижают два фактора одновременно: трафик и средний чек ниже сопоставимой нормы.";
  if (trafficDown && averageUp) return "Средний чек частично компенсирует снижение трафика; основной фактор результата — меньше гостей или чеков.";
  if (!trafficDown && !trafficUp && averageDown) return "Трафик близок к норме, поэтому снижение выручки связано прежде всего со средним чеком.";
  if (trafficUp && averageDown) return "Трафик вырос, но эффект сдерживает снижение среднего чека.";
  if (trafficUp && averageUp) return "Трафик и средний чек одновременно поддерживают результат.";
  if (input.revenue !== null && Math.abs(input.revenue) < 8) return "Выручка, трафик и средний чек находятся в пределах обычного разброса сопоставимых смен.";
  return "Отклонение пока нельзя надёжно отнести к одному фактору; нужна следующая сопоставимая смена.";
}

function demandDecomposition(target: DailyBusinessMetric | null, baseline: ComparableBaseline | null) {
  const targetChecks = target?.checks ?? null;
  const baselineChecks = baseline?.checks ?? null;
  const targetAverage = target?.averageCheck ?? null;
  const baselineAverage = baseline?.averageCheck ?? null;
  if ([targetChecks, baselineChecks, targetAverage, baselineAverage].some((value) => value === null)) {
    return {
      checksEffect: null,
      averageCheckEffect: null,
      totalModelledChange: null,
      dominantFactor: "unavailable" as const,
      explanation: "Разложение выручки на чеки и средний чек недоступно: не хватает одной из исходных метрик.",
    };
  }
  const checksEffect = rounded((targetChecks! - baselineChecks!) * baselineAverage!, 2);
  const averageCheckEffect = rounded(targetChecks! * (targetAverage! - baselineAverage!), 2);
  const totalModelledChange = rounded(checksEffect + averageCheckEffect, 2);
  const magnitude = Math.abs(checksEffect) + Math.abs(averageCheckEffect);
  const balance = magnitude ? Math.abs(Math.abs(checksEffect) - Math.abs(averageCheckEffect)) / magnitude : 0;
  const dominantFactor = balance < 0.15
    ? "balanced" as const
    : Math.abs(checksEffect) > Math.abs(averageCheckEffect)
      ? "checks" as const
      : "average_check" as const;
  const explanation = dominantFactor === "checks"
    ? `Больший вклад даёт количество чеков: ${checksEffect >= 0 ? "+" : ""}${checksEffect}; вклад среднего чека ${averageCheckEffect >= 0 ? "+" : ""}${averageCheckEffect}.`
    : dominantFactor === "average_check"
      ? `Больший вклад даёт средний чек: ${averageCheckEffect >= 0 ? "+" : ""}${averageCheckEffect}; вклад количества чеков ${checksEffect >= 0 ? "+" : ""}${checksEffect}.`
      : `Вклад количества чеков (${checksEffect >= 0 ? "+" : ""}${checksEffect}) и среднего чека (${averageCheckEffect >= 0 ? "+" : ""}${averageCheckEffect}) сопоставим.`;
  return { checksEffect, averageCheckEffect, totalModelledChange, dominantFactor, explanation };
}

function monthBounds(monthKey: string): { startDate: string | null; endDate: string | null } {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return { startDate: null, endDate: null };
  const [year, month] = monthKey.split("-").map(Number);
  const end = new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
  return { startDate: `${monthKey}-01`, endDate: end };
}

function financePeriods(current: JsonRecord, closed: JsonRecord, generatedAt: Date, today: string) {
  const currentMonthKey = text(current.monthKey, today.slice(0, 7), 7);
  const currentBounds = monthBounds(currentMonthKey);
  const closedMonthKey = text(closed.monthKey, "", 7);
  const closedBounds = monthBounds(closedMonthKey);
  const currentRevenue = numeric(current.revenue);
  const currentExpenses = numeric(current.expenses);
  const currentResult = numeric(current.result)
    ?? (currentRevenue !== null && currentExpenses !== null ? rounded(currentRevenue - currentExpenses, 2) : null);
  const currentPeriod: MetricPeriod | null = currentRevenue !== null || currentExpenses !== null
    ? {
        id: "current_finance",
        label: text(current.periodLabel, `Текущий месяц ${currentMonthKey}`, 120),
        startDate: validDate(current.startDate) ?? currentBounds.startDate,
        endDate: validDate(current.endDate) ?? today,
        comparisonBaseline: "Текущий незакрытый период; итог предварительный",
        freshness: text(current.updatedAt, generatedAt.toISOString(), 80),
        status: "open",
      }
    : null;
  const closedPeriod: MetricPeriod | null = closedMonthKey
    ? {
        id: "closed_finance",
        label: text(closed.periodLabel, closedMonthKey, 120),
        startDate: closedBounds.startDate,
        endDate: closedBounds.endDate,
        comparisonBaseline: "Предыдущий закрытый месяц этого заведения",
        freshness: text(closed.closedAt, generatedAt.toISOString(), 80),
        status: "closed",
      }
    : null;
  return { currentPeriod, closedPeriod, currentResult, currentRevenue, currentExpenses };
}

function previousMonthKey(monthKey: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

function dateForMonthDay(monthKey: string, day: number): string | null {
  const bounds = monthBounds(monthKey);
  if (!bounds.endDate) return null;
  const maximumDay = Number(bounds.endDate.slice(-2));
  return `${monthKey}-${String(Math.min(Math.max(1, day), maximumDay)).padStart(2, "0")}`;
}

function monthName(dateKey: string, standalone = false): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return "текущий период";
  if (standalone) {
    const value = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(date);
    return value.charAt(0).toLocaleUpperCase("ru") + value.slice(1);
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })
    .format(date)
    .replace(/^\d+\s*/, "");
}

function aggregatePeriod(rows: DailyBusinessMetric[], startDate: string, endDate: string) {
  const periodRows = rows.filter((row) => row.date >= startDate && row.date <= endDate);
  const revenue = rounded(periodRows.reduce((sum, row) => sum + row.revenue, 0), 2);
  const checksValues = periodRows.map((row) => row.checks).filter((value): value is number => value !== null);
  const checks = checksValues.length ? rounded(checksValues.reduce((sum, value) => sum + value, 0), 2) : null;
  return {
    rows: periodRows,
    revenue,
    checks,
    averageCheck: checks !== null && checks > 0 ? rounded(revenue / checks, 2) : null,
  };
}

function aggregateRows(rows: DailyBusinessMetric[]) {
  const revenue = rounded(rows.reduce((sum, row) => sum + row.revenue, 0), 2);
  const checksValues = rows.map((row) => row.checks).filter((value): value is number => value !== null);
  const checks = checksValues.length ? rounded(checksValues.reduce((sum, value) => sum + value, 0), 2) : null;
  return {
    revenue,
    checks,
    averageCheck: checks !== null && checks > 0 ? rounded(revenue / checks, 2) : null,
  };
}

function utcWeekday(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00.000Z`).getUTCDay();
}

function comparableCompletedShiftWindows(rows: DailyBusinessMetric[], today: string) {
  const available = rows.filter((row) => row.date <= today).sort((left, right) => right.date.localeCompare(left.date));
  const current: DailyBusinessMetric[] = [];
  const comparison: DailyBusinessMetric[] = [];
  const used = new Set<string>();
  for (const candidate of available) {
    if (current.length >= 6) break;
    const baseline = available.find((row) =>
      row.date < candidate.date
      && !used.has(row.date)
      && utcWeekday(row.date) === utcWeekday(candidate.date)
    );
    if (!baseline) continue;
    current.push(candidate);
    comparison.push(baseline);
    used.add(candidate.date);
    used.add(baseline.date);
  }
  if (current.length < 2 || comparison.length < 2) return null;
  return {
    current,
    comparison,
    currentAggregate: aggregateRows(current),
    comparisonAggregate: aggregateRows(comparison),
  };
}

function liveDirection(change: number | null): LivePeriodAnalysis["direction"] {
  if (change === null) return "insufficient";
  if (change >= 5) return "better";
  if (change <= -5) return "weaker";
  return "stable";
}

function liveHeadline(direction: LivePeriodAnalysis["direction"], periodEnd: string): string {
  const month = monthName(periodEnd, true);
  if (direction === "better") return `${month} идёт лучше сопоставимого периода`;
  if (direction === "weaker") return `${month} идёт слабее сопоставимого периода`;
  if (direction === "stable") return "Результат близок к обычному уровню";
  return "Недостаточно сопоставимых данных для динамики";
}

function periodCaption(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return "Текущий период · предварительно";
  const startDay = Number(startDate.slice(-2));
  const endDay = Number(endDate.slice(-2));
  return `Данные по ${startDay}–${endDay} ${monthName(endDate)} · предварительно`;
}

/**
 * Deterministic live comparison for an open management period.
 * Priority: equal-elapsed month-to-date, then the existing same-weekday shift
 * baseline. It never compares a partial month with a complete month.
 */
export function buildLivePeriodAnalysis(input: {
  daily: DailyBusinessMetric[];
  current: ReturnType<typeof financePeriods>;
  demand: AIDoctorIntelligence["demand"];
  currency: string;
  today: string;
}): LivePeriodAnalysis {
  const currentPeriod = input.current.currentPeriod;
  const currentEnd = currentPeriod?.endDate ?? input.today;
  const currentMonth = currentEnd.slice(0, 7);
  const currentStart = currentPeriod?.startDate ?? (/^\d{4}-\d{2}$/.test(currentMonth) ? `${currentMonth}-01` : null);
  const day = Number(currentEnd.slice(-2));
  const previousMonth = previousMonthKey(currentMonth);
  const baselineStart = previousMonth ? `${previousMonth}-01` : null;
  const baselineEnd = previousMonth ? dateForMonthDay(previousMonth, day) : null;
  const currentAggregate = currentStart ? aggregatePeriod(input.daily, currentStart, currentEnd) : null;
  const baselineAggregate = baselineStart && baselineEnd ? aggregatePeriod(input.daily, baselineStart, baselineEnd) : null;
  const hasMtdComparison = Boolean(
    currentAggregate
    && baselineAggregate
    && currentAggregate.rows.length >= 2
    && baselineAggregate.rows.length >= 2
    && baselineAggregate.revenue > 0,
  );

  let method: LivePeriodAnalysis["method"] = "insufficient";
  let comparisonLabel = "Сопоставимая история пока не сформирована";
  let baseline: LivePeriodAnalysis["baseline"] = null;
  let currentSampleSize = currentAggregate?.rows.length ?? 0;
  let comparisonSampleSize = 0;
  let comparisonRange: { startDate: string | null; endDate: string | null } | null = null;
  let revenuePercent: number | null = null;
  let checksPercent: number | null = null;
  let averageCheckPercent: number | null = null;

  if (hasMtdComparison && currentAggregate && baselineAggregate && baselineStart && baselineEnd) {
    method = "current_mtd_vs_previous_mtd";
    revenuePercent = percentChange(currentAggregate.revenue, baselineAggregate.revenue);
    checksPercent = percentChange(currentAggregate.checks, baselineAggregate.checks);
    averageCheckPercent = percentChange(currentAggregate.averageCheck, baselineAggregate.averageCheck);
    comparisonLabel = `Сравнение: 1–${Number(baselineEnd.slice(-2))} ${monthName(baselineEnd)}`;
    baseline = {
      startDate: baselineStart,
      endDate: baselineEnd,
      revenue: baselineAggregate.revenue,
      checks: baselineAggregate.checks,
      averageCheck: baselineAggregate.averageCheck,
      sampleSize: baselineAggregate.rows.length,
    };
    comparisonSampleSize = baselineAggregate.rows.length;
    comparisonRange = { startDate: baselineStart, endDate: baselineEnd };
  } else if (comparableCompletedShiftWindows(input.daily, input.today)) {
    const windows = comparableCompletedShiftWindows(input.daily, input.today)!;
    method = "recent_completed_shifts";
    revenuePercent = percentChange(windows.currentAggregate.revenue, windows.comparisonAggregate.revenue);
    checksPercent = percentChange(windows.currentAggregate.checks, windows.comparisonAggregate.checks);
    averageCheckPercent = percentChange(windows.currentAggregate.averageCheck, windows.comparisonAggregate.averageCheck);
    const comparisonDates = windows.comparison.map((row) => row.date).sort();
    comparisonLabel = `${windows.current.length} завершённых смен vs ${windows.comparison.length} предыдущих тех же дней недели`;
    currentSampleSize = windows.current.length;
    comparisonSampleSize = windows.comparison.length;
    comparisonRange = { startDate: comparisonDates[0] ?? null, endDate: comparisonDates.at(-1) ?? null };
    baseline = {
      startDate: comparisonDates[0]!,
      endDate: comparisonDates.at(-1)!,
      revenue: windows.comparisonAggregate.revenue,
      checks: windows.comparisonAggregate.checks,
      averageCheck: windows.comparisonAggregate.averageCheck,
      sampleSize: windows.comparison.length,
    };
  } else if (input.demand.target && input.demand.baseline && input.demand.baseline.sampleSize >= 2) {
    method = "latest_shift_vs_same_weekday";
    revenuePercent = input.demand.revenueChangePercent;
    checksPercent = input.demand.trafficChangePercent;
    averageCheckPercent = input.demand.averageCheckChangePercent;
    comparisonLabel = input.demand.period.comparisonBaseline;
    currentSampleSize = 1;
    comparisonSampleSize = input.demand.baseline.sampleSize;
    comparisonRange = {
      startDate: input.demand.baseline.dates.slice().sort()[0] ?? null,
      endDate: input.demand.baseline.dates.slice().sort().at(-1) ?? null,
    };
  }

  const direction = liveDirection(revenuePercent);
  const preliminaryResult = input.current.currentResult;
  const currentRevenue = input.current.currentRevenue ?? currentAggregate?.revenue ?? null;
  const currentChecks = currentAggregate?.checks ?? null;
  const currentAverage = currentAggregate?.averageCheck ?? null;
  const moneyResult = money(preliminaryResult, input.currency);
  const financeSummary = direction === "better"
    ? "Текущий период пока идёт сильнее сопоставимого."
    : direction === "weaker"
      ? "Текущий период пока идёт слабее сопоставимого."
      : direction === "stable"
        ? "Финансовая динамика близка к сопоставимому уровню."
        : "Текущий денежный результат доступен, но сопоставимой истории для динамики пока недостаточно.";
  const factors = [
    moneyResult ? `Предварительный денежный результат: ${moneyResult}` : null,
    revenuePercent !== null ? `Выручка: ${signedPercent(revenuePercent)} к сопоставимому периоду` : null,
    checksPercent !== null ? `Чеки: ${signedPercent(checksPercent)}` : null,
    averageCheckPercent !== null ? `Средний чек: ${signedPercent(averageCheckPercent)}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    method,
    direction,
    headline: liveHeadline(direction, currentEnd),
    periodLabel: periodCaption(currentStart, currentEnd),
    comparisonLabel,
    preliminary: true,
    comparison: {
      method,
      currentRange: { startDate: currentStart, endDate: currentEnd },
      comparisonRange,
      sampleSize: { current: currentSampleSize, comparison: comparisonSampleSize },
      availability: method === "insufficient" ? "unavailable" : "available",
      reasonUnavailable: method === "insufficient" ? "Недостаточно завершённых сопоставимых смен" : null,
    },
    current: {
      startDate: currentStart,
      endDate: currentEnd,
      revenue: currentRevenue,
      checks: currentChecks,
      averageCheck: currentAverage,
      preliminaryResult,
      currency: input.currency,
      sampleSize: currentAggregate?.rows.length ?? 0,
    },
    baseline,
    changes: { revenuePercent, checksPercent, averageCheckPercent },
    financeSummary,
    demandSummary: input.demand.explanation,
    factors,
  };
}

function financeComponent(
  latest: JsonRecord,
  previous: JsonRecord,
  comparison: JsonRecord,
  current: ReturnType<typeof financePeriods>,
): BusinessHealthComponent {
  const revenue = numeric(latest.revenue);
  const profit = numeric(latest.finalProfit);
  const margin = numeric(latest.profitMarginPercent)
    ?? (revenue !== null && revenue > 0 && profit !== null ? rounded(profit / revenue * 100) : null);
  const evidence: string[] = [];
  const gaps: string[] = [];
  if (profit === null || revenue === null || revenue <= 0) {
    return { id: "finance", label: "Финансы", score: null, weight: 40, confidence: "low", evidence, gaps: ["Нет закрытого финансового периода с выручкой и чистой прибылью"] };
  }
  const closedLabel = current.closedPeriod?.label ?? "Закрытый финансовый период";
  evidence.push(`${closedLabel}: чистая прибыль ${rounded(profit, 2)} при выручке ${rounded(revenue, 2)}`);
  if (margin !== null) evidence.push(`Рентабельность ${rounded(margin)}%`);
  let score = margin === null
    ? profit < 0 ? 30 : 68
    : margin < -10 ? 15
      : margin < 0 ? 35
        : margin < 5 ? 62
          : margin < 15 ? 78
            : 90;
  const previousProfit = numeric(previous.finalProfit);
  const profitDelta = numeric(comparison.profitDelta)
    ?? (previousProfit !== null ? profit - previousProfit : null);
  if (profitDelta !== null) {
    evidence.push(`Изменение прибыли к предыдущему закрытому периоду: ${profitDelta >= 0 ? "+" : ""}${rounded(profitDelta, 2)}`);
    score += profitDelta > 0 ? 6 : profitDelta < 0 ? -8 : 0;
  } else {
    gaps.push("Закрытая помесячная динамика пока недоступна; текущий период сравнивается отдельно по live-данным");
  }
  if (current.currentPeriod && current.currentResult !== null) {
    evidence.push(`${current.currentPeriod.label}: предварительный денежный результат ${current.currentResult >= 0 ? "+" : ""}${current.currentResult}`);
    const currentMargin = current.currentRevenue !== null && current.currentRevenue > 0
      ? current.currentResult / current.currentRevenue * 100
      : null;
    if (currentMargin !== null) {
      score += Math.max(-18, Math.min(8, currentMargin * 0.45));
    }
    gaps.push("Текущий месяц ещё не закрыт; его денежный результат не равен финальной прибыли");
  }
  return {
    id: "finance",
    label: "Финансы",
    score: clamp(score),
    weight: 40,
    confidence: gaps.length ? "medium" : "high",
    evidence,
    gaps,
  };
}

function demandComponent(input: {
  target: DailyBusinessMetric | null;
  baseline: ComparableBaseline | null;
  trafficChange: number | null;
  averageChange: number | null;
  revenueChange: number | null;
  source: "guest_count" | "checks_proxy" | "unavailable";
}): BusinessHealthComponent {
  const evidence: string[] = [];
  const gaps: string[] = [];
  if (!input.target || !input.baseline || input.baseline.sampleSize < 2) {
    return { id: "demand", label: "Спрос", score: null, weight: 20, confidence: "low", evidence, gaps: ["Недостаточно сопоставимых смен одного дня недели"] };
  }
  if (input.revenueChange !== null) evidence.push(`Выручка к медиане сопоставимых смен: ${input.revenueChange >= 0 ? "+" : ""}${input.revenueChange}%`);
  if (input.trafficChange !== null) evidence.push(`${input.source === "guest_count" ? "Гости" : "Чеки"}: ${input.trafficChange >= 0 ? "+" : ""}${input.trafficChange}%`);
  if (input.averageChange !== null) evidence.push(`Средний чек: ${input.averageChange >= 0 ? "+" : ""}${input.averageChange}%`);
  if (input.source === "checks_proxy") gaps.push("Количество чеков используется как доступная оценка трафика");
  let score = 70;
  if (input.trafficChange !== null) score += Math.max(-30, Math.min(20, input.trafficChange * 0.65));
  if (input.averageChange !== null) score += Math.max(-20, Math.min(15, input.averageChange * 0.4));
  if (input.revenueChange !== null && input.trafficChange === null) score += Math.max(-30, Math.min(20, input.revenueChange * 0.55));
  return {
    id: "demand",
    label: "Спрос",
    score: clamp(score),
    weight: 20,
    confidence: input.baseline.confidence,
    evidence,
    gaps,
  };
}

function operationsComponent(value: NonNullable<BusinessIntelligenceInput["operations"]>): BusinessHealthComponent {
  const unclosed = Math.max(0, Math.round(value.unclosedShifts ?? 0));
  const stock = Math.max(0, Math.round(value.stockAnomalies ?? 0));
  const blockers = Math.max(0, Math.round(value.criticalBlockers ?? 0));
  const equipment = Math.max(0, Math.round(value.recurringEquipmentFailures ?? 0));
  const evidence = [
    unclosed ? `Незакрытые смены: ${unclosed}` : "Незакрытых смен не зафиксировано",
    stock ? `Аномалии остатков: ${stock}` : "Критичных аномалий остатков не зафиксировано",
    blockers ? `Критические операционные блокеры: ${blockers}` : "Критических блокеров не зафиксировано",
    equipment ? `Повторяющиеся сбои оборудования: ${equipment}` : "Повторяющихся сбоев оборудования не зафиксировано",
  ];
  const score = 90 - Math.min(30, unclosed * 5) - Math.min(20, stock * 7) - Math.min(60, blockers * 30) - Math.min(25, equipment * 8);
  return { id: "operations", label: "Операции", score: clamp(score), weight: 25, confidence: "high", evidence, gaps: [] };
}

function guestsComponent(value: NonNullable<BusinessIntelligenceInput["reviews"]>): BusinessHealthComponent {
  const total = Math.max(0, Math.round(value.total ?? 0));
  if (!total) return { id: "guests", label: "Гости", score: null, weight: 15, confidence: "low", evidence: [], gaps: ["Нет отзывов; финансовая оценка от этого не ухудшается"] };
  const rating = numeric(value.averageRating);
  const negative = Math.max(0, Math.round(value.negative ?? 0));
  const recurring = Math.max(0, Math.round(value.recurringComplaints ?? 0));
  const negativeShare = total > 0 ? negative / total : 0;
  const score = (rating !== null ? rating / 5 * 85 : 70) - negativeShare * 25 - Math.min(20, recurring * 5);
  return {
    id: "guests",
    label: "Гости",
    score: clamp(score),
    weight: 15,
    confidence: total >= 12 ? "high" : total >= 4 ? "medium" : "low",
    evidence: [
      rating !== null ? `Средняя оценка ${rounded(rating)}/5` : `Отзывы: ${total}`,
      `Негативные отзывы: ${negative} из ${total}`,
      recurring ? `Повторяющиеся темы жалоб: ${recurring}` : "Повторяющихся тем жалоб не зафиксировано",
    ],
    gaps: [],
  };
}

function healthFromComponents(
  components: BusinessHealthComponent[],
  context?: {
    revenueChangePercent: number | null;
    trafficChangePercent: number | null;
    currentFinancialResult: number | null;
  },
) {
  const available = components.filter((component) => component.score !== null);
  const financeScore = components.find((component) => component.id === "finance")?.score ?? null;
  const financeAvailable = financeScore !== null;
  const weight = available.reduce((sum, component) => sum + component.weight, 0);
  const rawScore = financeAvailable && available.length >= 2 && weight > 0
    ? clamp(available.reduce((sum, component) => sum + (component.score ?? 0) * component.weight, 0) / weight)
    : null;
  let score = rawScore;
  const adjustments: string[] = [];
  const demandScore = components.find((component) => component.id === "demand")?.score ?? null;
  const operationsScore = components.find((component) => component.id === "operations")?.score ?? null;
  const applyCap = (maximum: number, reason: string) => {
    if (score !== null && score > maximum) {
      score = maximum;
      adjustments.push(reason);
    }
  };
  if (financeScore !== null && financeScore < 35) {
    applyCap(44, "Серьёзный убыток закрытого периода ограничивает итоговую оценку");
  }
  if (demandScore !== null && demandScore <= 45 && (context?.revenueChangePercent ?? 0) <= -30) {
    applyCap(54, "Сильная просадка спроса и сопоставимой выручки имеет business-wide эффект");
  }
  if (demandScore !== null && demandScore < 55 && (context?.currentFinancialResult ?? 0) < 0) {
    applyCap(52, "Просадка спроса совпала с отрицательным предварительным результатом текущего периода");
  }
  if (operationsScore !== null && operationsScore < 40) {
    applyCap(49, "Критические операционные блокеры ограничивают способность заведения работать");
  }
  const confidencePercent = clamp(available.reduce((sum, component) => {
    const confidence = component.confidence === "high" ? 100 : component.confidence === "medium" ? 72 : 42;
    return sum + confidence * component.weight;
  }, 0) / Math.max(1, components.reduce((sum, component) => sum + component.weight, 0)));
  const sorted = available.slice().sort((left, right) => (left.score ?? 100) - (right.score ?? 100));
  const lowersScore = sorted.filter((component) => (component.score ?? 100) < 60)
    .slice(0, 3)
    .map((component) => `${component.label}: ${component.score}/100 — ${component.evidence[0] ?? "есть отрицательное отклонение"}`);
  const supportsScore = sorted.slice().reverse().filter((component) => (component.score ?? 0) >= 70)
    .slice(0, 3)
    .map((component) => `${component.label}: ${component.score}/100 — ${component.evidence[0] ?? "показатель поддерживает оценку"}`);
  return {
    score,
    // A confirmed severe loss is business-wide and cannot be averaged away by
    // clean operational or review data. Data quality remains a separate axis.
    label: financeScore !== null && financeScore < 35
      ? "critical" as const
      : businessHealthStatusForScore(score),
    confidencePercent,
    confidence: confidencePercent >= 80 ? "high" as const : confidencePercent >= 55 ? "medium" as const : "low" as const,
    components,
    lowersScore,
    supportsScore,
    adjustments,
    methodology: "Взвешенная оценка фактических направлений с caps для подтверждённых business-wide отклонений. Confidence считается отдельно и не повышает score.",
    explanation: score === null
      ? "Business Health не рассчитан: нужен закрытый финансовый период и минимум ещё одно фактическое направление. Data Quality показан отдельно."
      : lowersScore.length || adjustments.length
        ? `Главное давление на Business Health: ${lowersScore[0] ?? adjustments[0]}. ${adjustments[0] ? `Ограничение оценки: ${adjustments[0]}. ` : ""}Достоверность оценки ${confidencePercent}%.`
        : `Критичных отклонений по доступным бизнес-показателям не обнаружено. Достоверность оценки ${confidencePercent}%.`,
  };
}

function dataQuality(blocks: NonNullable<BusinessIntelligenceInput["dataBlocks"]>) {
  const scopes: Record<string, string[]> = {};
  const weights: Record<string, number> = {
    performanceHistory: 20,
    salesAndCost: 15,
    purchasesAndInventory: 10,
    team: 10,
    guestFeedback: 10,
    seasonalityAndEvents: 10,
    market: 10,
    menuAndRecipes: 10,
    schedule: 5,
  };
  let availableWeight = 0;
  let totalWeight = 0;
  for (const block of blocks) {
    const weight = weights[block.id] ?? 5;
    totalWeight += weight;
    const freshFactor = block.freshness === "stale" ? 0.35 : block.freshness === "aging" ? 0.7 : 1;
    if (block.available) availableWeight += weight * freshFactor;
    else (scopes[block.id] ??= []).push(block.detail || `${block.label}: данных нет`);
  }
  const percent = totalWeight ? clamp(availableWeight / totalWeight * 100) : 0;
  return {
    percent,
    confidence: percent >= 80 ? "high" as const : percent >= 55 ? "medium" as const : "low" as const,
    gapsByScope: scopes,
    explanation: `Data Quality ${percent}% влияет на достоверность только связанных выводов и не повышает Business Health.`,
  };
}

function radians(value: number): number {
  return value * Math.PI / 180;
}

function distanceKm(left: JsonRecord, right: JsonRecord): number | null {
  const leftLat = numeric(left.lat ?? left.latitude);
  const leftLng = numeric(left.lng ?? left.longitude);
  const rightLat = numeric(right.lat ?? right.latitude);
  const rightLng = numeric(right.lng ?? right.longitude);
  if ([leftLat, leftLng, rightLat, rightLng].some((value) => value === null)) return null;
  const deltaLat = radians(rightLat! - leftLat!);
  const deltaLng = radians(rightLng! - leftLng!);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(leftLat!)) * Math.cos(radians(rightLat!)) * Math.sin(deltaLng / 2) ** 2;
  return rounded(6_371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)), 1);
}

function timeOverlap(event: JsonRecord, profile: JsonRecord): boolean | null {
  const eventStart = text(event.startTime, "", 5);
  const eventEnd = text(event.endTime, "", 5);
  const venueStart = text(profile.openTime, "", 5);
  const venueEnd = text(profile.closeTime, "", 5);
  if (![eventStart, eventEnd, venueStart, venueEnd].every((value) => /^\d{2}:\d{2}$/.test(value))) return null;
  const value = (source: string) => Number(source.slice(0, 2)) * 60 + Number(source.slice(3));
  const spans = (start: string, end: string) => {
    const left = value(start);
    const right = value(end);
    return right >= left ? [[left, right]] : [[left, 1_440], [0, right]];
  };
  return spans(eventStart, eventEnd).some(([eventLeft, eventRight]) =>
    spans(venueStart, venueEnd).some(([venueLeft, venueRight]) => Math.max(eventLeft!, venueLeft!) <= Math.min(eventRight!, venueRight!))
  );
}

function externalContext(input: BusinessIntelligenceInput) {
  const profile = input.profile ?? {};
  const competitors = list(input.competitors).map(record);
  return list(input.events).map((value, index) => {
    const event = record(value);
    const relation = record(event.relation);
    const explicitVenueDistance = numeric(relation.distanceKm ?? event.distanceKm);
    const venueDistance = explicitVenueDistance ?? distanceKm(profile, event);
    let nearest: { name: string; distance: number } | null = null;
    for (const competitor of competitors) {
      const eventDistance = numeric(competitor.eventDistanceKm) ?? distanceKm(competitor, event);
      if (eventDistance === null) continue;
      if (!nearest || eventDistance < nearest.distance) nearest = {
        name: text(competitor.name, "Конкурент", 120),
        distance: eventDistance,
      };
    }
    const overlap = timeOverlap(event, profile);
    let score = 20;
    if (venueDistance !== null) score += venueDistance <= 1 ? 35 : venueDistance <= 5 ? 20 : venueDistance <= 15 ? 8 : -8;
    if (nearest) score += nearest.distance <= 1 ? 30 : nearest.distance <= 5 ? 15 : 3;
    if (overlap === true) score += 15;
    if (overlap === false) score -= 10;
    const potential = numeric(event.potentialScore);
    if (potential !== null) score += Math.max(0, Math.min(10, (potential - 50) / 5));
    score = clamp(score);
    return {
      id: text(event.id, `external-event-${index + 1}`, 140),
      title: text(event.title, "Внешнее событие", 180),
      date: validDate(event.startDate ?? event.date ?? event.eventDate),
      relevanceScore: score,
      relevance: score >= 70 ? "high" as const : score >= 45 ? "medium" as const : "low" as const,
      venueDistanceKm: venueDistance,
      nearestCompetitor: nearest?.name ?? null,
      competitorDistanceKm: nearest?.distance ?? null,
      scheduleOverlap: overlap,
      reason: nearest && nearest.distance <= 1 && (venueDistance === null || venueDistance > nearest.distance + 1)
        ? `Событие ближе к конкуренту «${nearest.name}»; это повышает риск перераспределения трафика, но не доказывает причинность.`
        : venueDistance !== null
          ? `Расстояние до заведения ${venueDistance} км; влияние проверяется по фактической смене.`
          : "Географическая точность ограничена; событие учитывается как контекст, а не как доказанная причина.",
      source: "external_data" as const,
    };
  }).sort((left, right) => right.relevanceScore - left.relevanceScore);
}

function hypothesisForExternalRisk(input: {
  context: ReturnType<typeof externalContext>[number];
  demand: AIDoctorIntelligence["demand"];
  phase: IntelligencePhase;
  previous: JsonRecord | null;
}): StructuredHypothesis {
  const evidenceFor = [input.context.reason];
  if ((input.demand.trafficChangePercent ?? 0) <= -10) evidenceFor.push(`Трафик ниже сопоставимой нормы на ${Math.abs(input.demand.trafficChangePercent!)}%`);
  if ((input.demand.averageCheckChangePercent ?? 0) <= -8) evidenceFor.push(`Средний чек ниже сопоставимой нормы на ${Math.abs(input.demand.averageCheckChangePercent!)}%`);
  const evidenceAgainst: string[] = [];
  if ((input.demand.trafficChangePercent ?? 0) >= 0) evidenceAgainst.push("Трафик не ниже сопоставимой нормы");
  if ((input.demand.revenueChangePercent ?? 0) >= 0) evidenceAgainst.push("Выручка не ниже сопоставимой нормы");
  const missingEvidence = [
    "Нет прямого источника, показывающего выбор гостями конкретного конкурента",
    ...(input.context.venueDistanceKm === null ? ["Нет точной геопозиции заведения относительно события"] : []),
  ];
  let confidencePercent = 35 + Math.min(25, evidenceFor.length * 10) - evidenceAgainst.length * 15;
  if (input.phase === "after_shift" && evidenceAgainst.length) confidencePercent -= 15;
  const previousConfidence = numeric(input.previous?.confidencePercent);
  if (previousConfidence !== null) confidencePercent = rounded((confidencePercent + previousConfidence) / 2);
  confidencePercent = clamp(confidencePercent);
  return {
    id: `hypothesis:external-traffic:${input.context.id}`,
    statement: `Событие «${input.context.title}» может перераспределить часть трафика в пользу ближайшего конкурента.`,
    evidenceFor,
    evidenceAgainst,
    missingEvidence,
    confidence: confidencePercent >= 75 ? "high" : confidencePercent >= 50 ? "medium" : "low",
    confidencePercent,
    causalStatus: input.phase === "after_shift" && evidenceAgainst.length
      ? "not_supported"
      : confidencePercent >= 75 ? "supported" : "hypothesis",
    verificationPlan: {
      metric: input.demand.target?.guests ? "Количество гостей" : "Количество чеков + средний чек + выручка",
      baseline: input.demand.baseline
        ? `Медиана ${input.demand.baseline.sampleSize} сопоставимых смен того же дня недели`
        : "Сформировать сопоставимую норму минимум из трёх смен",
      timeframe: input.phase === "after_shift" ? "После закрытия текущей смены" : "Сразу после закрытия ближайшей рабочей смены",
      successCriterion: "После смены система сравнит фактический результат с сопоставимой нормой; отклонение не менее 10% обновит достоверность гипотезы.",
    },
  };
}

function evidence(id: string, source: string, label: string, fact: string) {
  return { id, source, label, fact };
}

function prioritySignals(input: {
  health: ReturnType<typeof healthFromComponents>;
  demand: AIDoctorIntelligence["demand"];
  traffic: ReturnType<typeof trafficSource>;
  operations: NonNullable<BusinessIntelligenceInput["operations"]>;
  hypotheses: StructuredHypothesis[];
  phase: IntelligencePhase;
}) {
  const result: JsonRecord[] = [];
  const finance = input.health.components.find((component) => component.id === "finance");
  if (finance && finance.score !== null && finance.score < 55) {
    result.push({
      signalClass: "problem",
      title: "Остановить ухудшение финансового результата",
      issueKey: "profit",
      fact: finance.evidence.join(" · "),
      hypothesis: "Финансовый результат подтверждён закрытым периодом; вклад отдельных причин оценивается только по сопоставимой динамике.",
      consequence: "Системный убыток или низкая рентабельность влияет на весь бизнес, поэтому имеет высокий управленческий приоритет.",
      action: "Разобрать изменение выручки, ФОТ, себестоимости и остальных расходов относительно предыдущего закрытого периода.",
      responsibleRole: "управляющий",
      deadline: "До следующего управленческого планирования",
      successCriterion: "Зафиксирован главный подтверждённый драйвер результата и контрольная метрика следующего закрытого периода.",
      financialImpact: "high",
      demandImpact: "medium",
      businessWideImpact: true,
      urgency: "high",
      evidence: [evidence("intelligence:business-health:finance", "finance", "Business Health · Финансы", finance.evidence.join(" · "))],
    });
  }
  const trafficDown = (input.demand.trafficChangePercent ?? 0) <= -10;
  const averageDown = (input.demand.averageCheckChangePercent ?? 0) <= -8;
  if (input.demand.materialDeviation && (trafficDown || averageDown)) {
    const metricFact = [
      input.demand.revenueChangePercent !== null ? `выручка ${input.demand.revenueChangePercent >= 0 ? "+" : ""}${input.demand.revenueChangePercent}%` : null,
      input.demand.trafficChangePercent !== null ? `${input.traffic.source === "guest_count" ? "гости" : "чеки"} ${input.demand.trafficChangePercent >= 0 ? "+" : ""}${input.demand.trafficChangePercent}%` : null,
      input.demand.averageCheckChangePercent !== null ? `средний чек ${input.demand.averageCheckChangePercent >= 0 ? "+" : ""}${input.demand.averageCheckChangePercent}%` : null,
    ].filter(Boolean).join(" · ");
    result.push({
      signalClass: "problem",
      title: trafficDown && averageDown ? "Восстановить трафик и средний чек" : trafficDown ? "Восстановить трафик сопоставимых смен" : "Восстановить средний чек",
      issueKey: trafficDown && averageDown ? "demand-and-average-check" : trafficDown ? "traffic" : "average-check",
      fact: `${metricFact}. ${input.demand.decomposition.explanation}`,
      factPeriod: `${input.demand.period.label}; ${input.demand.period.comparisonBaseline}`,
      hypothesis: trafficDown && averageDown
        ? "Падение результата подтверждается двумя независимыми коммерческими факторами."
        : "Подтверждён один основной фактор результата; причина его изменения требует проверки.",
      consequence: "Снижение спроса или структуры покупки напрямую давит на выручку.",
      action: trafficDown
        ? "До открытия выбрать один канал привлечения и конкретное предложение смены; количество чеков и средний чек система проверит отдельно."
        : "До открытия выбрать одно предложение для роста среднего чека; исходные показатели система уже зафиксировала.",
      responsibleRole: "управляющий",
      deadline: input.phase === "before_shift" ? "До открытия ближайшей смены" : "До следующей сопоставимой смены",
      successCriterion: "После смены количество чеков, средний чек и выручка автоматически сравнены с той же сопоставимой нормой.",
      financialImpact: "high",
      demandImpact: "high",
      guestImpact: trafficDown ? "high" : "medium",
      businessWideImpact: true,
      urgency: input.phase === "before_shift" ? "high" : "medium",
      evidence: [evidence("intelligence:demand:decomposition", "finance", "Декомпозиция спроса", input.demand.explanation)],
    });
  }
  const blockerCount = Math.max(0, input.operations.criticalBlockers ?? 0);
  const equipmentCount = Math.max(0, input.operations.recurringEquipmentFailures ?? 0);
  if (blockerCount || equipmentCount) {
    result.push({
      signalClass: "problem",
      title: blockerCount ? "Устранить критический операционный блокер" : "Устранить повторяющиеся сбои оборудования",
      issueKey: blockerCount ? "operational-blocker" : "equipment-recurring",
      fact: blockerCount ? `Критические блокеры: ${blockerCount}` : `Повторяющиеся сбои оборудования: ${equipmentCount}`,
      consequence: blockerCount ? "Блокер может остановить работу или создать риск безопасности." : "Сбой влияет на смену, но не автоматически важнее системного финансового отклонения.",
      action: blockerCount ? "Зафиксировать безопасное состояние и владельца устранения до открытия." : "Провести диагностику причины и контрольный тест до смены.",
      responsibleRole: "Не назначен",
      deadline: "До следующей смены",
      successCriterion: "Причина устранена, оборудование прошло контрольный тест, новый сигнал не появился.",
      operationalImpact: blockerCount ? "critical" : "medium",
      businessWideImpact: Boolean(blockerCount),
      provenFinancialImpact: false,
      urgency: blockerCount ? "critical" : "high",
      evidence: [evidence("intelligence:operations", "operations", "Операционный контур", blockerCount ? `Критические блокеры: ${blockerCount}` : `Повторяющиеся сбои: ${equipmentCount}`)],
    });
  }
  const stockCount = Math.max(0, Math.round(input.operations.stockAnomalies ?? 0));
  if (stockCount) {
    result.push({
      signalClass: "problem",
      title: `Проверить ${stockCount} ${stockCount === 1 ? "аномалию" : stockCount < 5 ? "аномалии" : "аномалий"} остатков`,
      issueKey: "stock",
      fact: `Обнаружено аномалий остатков: ${stockCount}`,
      consequence: "Аномалии остатков сейчас снижают операционное состояние.",
      action: "Открыть остатки, проверить проблемные позиции и подтвердить корректные значения.",
      responsibleRole: "управляющий",
      deadline: "До следующей инвентаризации",
      successCriterion: "Проблемные остатки проверены; подтверждённые расхождения исправлены или объяснены.",
      operationalImpact: stockCount >= 3 ? "high" : "medium",
      businessWideImpact: false,
      urgency: stockCount >= 3 ? "high" : "medium",
      evidence: [evidence("intelligence:operations:stock", "warehouse", "Аномалии остатков", `Обнаружено: ${stockCount}`)],
    });
  }
  const unclosedCount = Math.max(0, Math.round(input.operations.unclosedShifts ?? 0));
  if (unclosedCount) {
    result.push({
      signalClass: "problem",
      title: unclosedCount === 1 ? "Проверить незакрытую смену" : `Проверить ${unclosedCount} незакрытые смены`,
      issueKey: "unclosed-shifts",
      fact: `Смен без закрытого отчёта: ${unclosedCount}`,
      consequence: "Незакрытые смены снижают операционную оценку и полноту сопоставимого анализа.",
      action: "Проверить фактически проведённые смены и закрыть отчёты либо зафиксировать объяснение пропуска.",
      responsibleRole: "администратор",
      deadline: "До следующего управленческого анализа",
      successCriterion: "Все проведённые смены закрыты или имеют зафиксированное объяснение.",
      operationalImpact: unclosedCount >= 4 ? "high" : "medium",
      businessWideImpact: false,
      urgency: unclosedCount >= 4 ? "high" : "medium",
      evidence: [evidence("intelligence:operations:unclosed", "shifts", "Незакрытые смены", `Без отчёта: ${unclosedCount}`)],
    });
  }
  const external = input.hypotheses.find((hypothesis) => hypothesis.causalStatus !== "not_supported");
  if (external && input.phase === "before_shift" && trafficDown) {
    result.push({
      signalClass: "problem",
      title: "Подготовить смену к риску перераспределения трафика",
      issueKey: "external-traffic-risk",
      fact: external.evidenceFor.join(" · "),
      hypothesis: external.statement,
      hypothesisData: external,
      consequence: "Внешний контекст может усилить слабую динамику сопоставимых смен, но причинность ещё не доказана.",
      action: "До открытия утвердить предложение смены и канал коммуникации; исходные показатели уже зафиксированы системой.",
      responsibleRole: "управляющий",
      deadline: "До открытия ближайшей смены",
      successCriterion: external.verificationPlan.successCriterion,
      timeSensitive: true,
      confidenceLevel: external.confidence,
      evidence: [evidence("intelligence:external-risk", "calendar", "External context", external.evidenceFor.join(" · "))],
    });
  }
  return result;
}

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function contributionText(value: number | null, currency: string): string | null {
  return money(value, currency, true);
}

function managementBriefing(input: {
  now: Date;
  demand: AIDoctorIntelligence["demand"];
  traffic: ReturnType<typeof trafficSource>;
  health: ReturnType<typeof healthFromComponents>;
  quality: ReturnType<typeof dataQuality>;
  signals: JsonRecord[];
  hypotheses: StructuredHypothesis[];
  external: ReturnType<typeof externalContext>;
  analytics: SelfServiceAnalytics;
  currency: string;
  phase: IntelligencePhase;
  venueId: string;
  externalProvider: BusinessIntelligenceInput["externalProvider"];
  previousVerificationPlans: unknown[];
}): ManagementBriefing {
  const primary = input.signals[0] ?? null;
  const issueKey = text(primary?.issueKey);
  const commercialDiagnosis = ["traffic", "average-check", "demand-and-average-check", "revenue"].includes(issueKey);
  const revenueChange = input.demand.revenueChangePercent;
  const trafficChange = input.demand.trafficChangePercent;
  const averageChange = input.demand.averageCheckChangePercent;
  const keyDrivers: ManagementBriefing["keyDrivers"] = [];
  if (revenueChange !== null) keyDrivers.push({
    id: "revenue",
    metric: "Выручка",
    value: signedPercent(revenueChange),
    contribution: null,
    explanation: "Итоговое отклонение от сопоставимой нормы смен того же дня недели.",
  });
  if (trafficChange !== null) keyDrivers.push({
    id: "traffic",
    metric: input.traffic.source === "guest_count" ? "Гости" : "Чеки",
    value: signedPercent(trafficChange),
    contribution: contributionText(input.demand.decomposition.checksEffect, input.currency),
    explanation: input.traffic.source === "guest_count"
      ? "Изменение фактического гостевого потока."
      : "Количество чеков используется как доступная оценка трафика.",
  });
  if (averageChange !== null) keyDrivers.push({
    id: "average_check",
    metric: "Средний чек",
    value: signedPercent(averageChange),
    contribution: contributionText(input.demand.decomposition.averageCheckEffect, input.currency),
    explanation: "Показывает вклад структуры и суммы покупки в результат смены.",
  });

  const findings: ManagementBriefing["findings"] = [];
  const worstWindow = input.analytics.traffic.topWindows[0];
  if (worstWindow) {
    findings.push({
      id: "traffic-window",
      title: `Основной провал чеков: ${worstWindow.periodLabel}`,
      detail: `Чеков на ${Math.abs(worstWindow.changePercent)}% меньше сопоставимой нормы (${worstWindow.checks} против ${worstWindow.baselineChecks}).`,
      contribution: money(worstWindow.estimatedRevenueContribution, input.currency, true),
      status: "finding",
    });
  } else if ((trafficChange ?? 0) <= -10) {
    findings.push({
      id: "traffic-window-limitation",
      title: "Проблемный час определить нельзя",
      detail: input.analytics.traffic.limitation ?? "Касса не передаёт данные по времени чеков.",
      contribution: null,
      status: "limitation",
    });
  }
  const categoryContributors = input.analytics.averageCheck.topCategories;
  const itemContributors = input.analytics.averageCheck.topItems;
  if (categoryContributors.length || itemContributors.length) {
    const categories = categoryContributors.map((item) => item.label).join(", ");
    const items = itemContributors.map((item) => item.label).join(", ");
    const strongest = categoryContributors[0] ?? itemContributors[0]!;
    findings.push({
      id: "average-check-contributors",
      title: categories ? `Средний чек сильнее всего снизили: ${categories}` : `Главный вклад дали позиции: ${items}`,
      detail: [categories && `Категории: ${categories}`, items && `Позиции: ${items}`].filter(Boolean).join(". "),
      contribution: money(strongest.changePerCheck, input.currency, false),
      status: "finding",
    });
  } else if ((averageChange ?? 0) <= -8) {
    findings.push({
      id: "average-check-limitation",
      title: "Вклад позиций определить нельзя",
      detail: input.analytics.averageCheck.limitation ?? "Данных по отдельным позициям недостаточно для разложения среднего чека.",
      contribution: null,
      status: "limitation",
    });
  }
  for (const correlation of input.analytics.operationalCorrelations) {
    findings.push({
      id: correlation.id,
      title: correlation.title,
      detail: correlation.detail,
      contribution: null,
      status: "hypothesis",
    });
  }

  const surfacedHypotheses = input.hypotheses.filter((item) => {
    const context = input.external.find((candidate) => `hypothesis:external-traffic:${candidate.id}` === item.id);
    const commercialWeakness = (trafficChange ?? 0) <= -10 || (revenueChange ?? 0) <= -10;
    return context?.relevance === "high" && commercialWeakness && item.causalStatus !== "not_supported";
  }).slice(0, 1);
  const externalBriefing = surfacedHypotheses.map((item) => ({
    id: item.id,
    title: item.statement,
    relevance: "Релевантно текущей смене при подтверждённой слабой динамике трафика",
    factOrHypothesis: "hypothesis" as const,
    evidence: item.evidenceFor.join(" · "),
    whatToWatch: item.verificationPlan.successCriterion,
  }));

  const todayActions: ManagementBriefing["todayActions"] = [];
  const addAction = (value: Omit<ManagementBriefing["todayActions"][number], "priority" | "responsibleRole" | "fact" | "factPeriod">) => {
    todayActions.push({
      ...value,
      priority: text(primary?.priority) === "critical" ? "critical" : "high",
      responsibleRole: text(primary?.responsibleRole, "управляющий"),
      fact: text(primary?.fact, input.demand.explanation),
      factPeriod: `${input.demand.period.label}; ${input.demand.period.comparisonBaseline}`,
    });
  };
  if (commercialDiagnosis || (input.demand.materialDeviation && ((trafficChange ?? 0) <= -10 || (averageChange ?? 0) <= -8))) {
    if ((trafficChange ?? 0) <= -10 && worstWindow) addAction({
      recommendationId: "ai:briefing:traffic-today",
      issueKey: "traffic",
      title: `Перенастроить смену на слабое окно ${worstWindow.periodLabel}`,
      reason: `В ${worstWindow.periodLabel} чеков на ${Math.abs(worstWindow.changePercent)}% меньше сопоставимой нормы${worstWindow.estimatedRevenueContribution === null ? "." : `; оценочный вклад ${money(worstWindow.estimatedRevenueContribution, input.currency, true)}.`}`,
      ctaLabel: "Подготовить действие",
      deadlineLabel: "Срок действия",
      deadline: "Сегодня, до открытия или в начале текущей смены",
      metricToCheck: `Чеки и выручка в ${worstWindow.periodLabel}`,
      targetOrVerification: `После смены AI сам сравнит это окно с ${input.demand.period.comparisonBaseline.toLocaleLowerCase("ru")}.`,
      action: `Утвердить конкретное предложение для гостей на ${worstWindow.periodLabel} и назначить команде фокус на его продажу в этом окне.`,
      successCriterion: `Предложение и роль команды на ${worstWindow.periodLabel} зафиксированы до начала окна; результат проверен по чекам и выручке.`,
      verificationPlanId: "",
    });
    const leadingCategory = categoryContributors[0];
    if ((averageChange ?? 0) <= -8 && leadingCategory) addAction({
      recommendationId: "ai:briefing:average-check-today",
      issueKey: "average-check",
      title: `Вернуть категорию «${leadingCategory.label}» в фокус продажи`,
      reason: `Категория даёт на ${money(Math.abs(leadingCategory.changePerCheck), input.currency, false)?.replace(/^\+/, "")} меньше на чек относительно сопоставимой нормы.`,
      ctaLabel: "Подготовить действие",
      deadlineLabel: "Срок действия",
      deadline: "Сегодня, до завершения текущей смены",
      metricToCheck: `Продажи категории «${leadingCategory.label}» и средний чек`,
      targetOrVerification: "После смены AI сам проверит вклад категории и изменение среднего чека.",
      action: `Проверить наличие и видимость категории «${leadingCategory.label}», затем дать команде конкретный сценарий предложения гостю.`,
      successCriterion: `Категория «${leadingCategory.label}» доступна гостям, команда получила сценарий предложения, результат зафиксирован в продажах.`,
      verificationPlanId: "",
    });
    if (externalBriefing.length) addAction({
      recommendationId: "ai:briefing:external-context-today",
      issueKey: "external-traffic-risk",
      title: `Утвердить решение по внешнему фактору: ${externalBriefing[0]!.title}`,
      reason: "Есть релевантный внешний фактор и одновременно подтверждена слабая динамика спроса; причинность пока не доказана.",
      ctaLabel: "Проверить контекст",
      deadlineLabel: "Срок действия",
      deadline: "Сегодня, до открытия ближайшей смены",
      metricToCheck: "Чеки, средний чек и выручка после смены",
      targetOrVerification: externalBriefing[0]!.whatToWatch,
      action: "Принять решение: адаптировать предложение и коммуникацию смены под внешний фактор либо сознательно оставить текущий план без изменений.",
      successCriterion: externalBriefing[0]!.whatToWatch,
      verificationPlanId: "",
    });
  } else if (primary) {
    addAction({
      recommendationId: text(primary.recommendationId, `ai:briefing:${issueKey || "primary"}`),
      issueKey: issueKey || "primary",
      title: text(primary.title, "Выполнить главное действие текущего дня"),
      reason: text(primary.consequence, text(primary.fact, "Действие следует из главного диагноза.")),
      ctaLabel: issueKey === "profit" ? "Разобрать результат" : "Открыть действие",
      deadlineLabel: "Срок действия",
      deadline: "Сегодня, в текущем управленческом цикле",
      metricToCheck: text(primary.successCriterion, "Контрольный показатель главного диагноза"),
      targetOrVerification: text(primary.successCriterion, "Зафиксировать результат и сравнить его с исходным фактом."),
      action: text(primary.action, text(primary.title)),
      successCriterion: text(primary.successCriterion, "Результат зафиксирован и проверен."),
      verificationPlanId: "",
    });
  }

  const afterShiftChecks: ManagementBriefing["afterShiftChecks"] = [];
  if (trafficChange !== null) afterShiftChecks.push({
    id: "traffic-after-shift",
    metric: input.traffic.source === "guest_count" ? "Гости за смену и по часам" : "Чеки за смену и по часам",
    baseline: input.demand.period.comparisonBaseline,
    expectedComparison: "Я сравню фактический результат с сопоставимой нормой и отмечу самое слабое часовое окно.",
  });
  if (averageChange !== null) afterShiftChecks.push({
    id: "average-check-after-shift",
    metric: "Средний чек",
    baseline: input.demand.period.comparisonBaseline,
    expectedComparison: "Я проверю фактический средний чек и изменение структуры продаж по категориям и позициям.",
  });
  if (revenueChange !== null) afterShiftChecks.push({
    id: "revenue-after-shift",
    metric: "Выручка смены",
    baseline: input.demand.period.comparisonBaseline,
    expectedComparison: "Я сопоставлю выручку с аналогичными сменами, не смешивая её с итогом текущего месяца.",
  });
  if (externalBriefing.length) afterShiftChecks.push({
    id: "external-context-after-shift",
    metric: "Подтверждение внешнего риска",
    baseline: "Гипотеза до смены",
    expectedComparison: externalBriefing[0]!.whatToWatch,
  });

  const provider = input.externalProvider;
  const externalContextState: ManagementBriefing["externalContextState"] = externalBriefing.length
    ? { status: "relevant", message: "Найден релевантный внешний фактор; его влияние остаётся гипотезой до проверки по факту смены." }
    : provider?.attempted !== true || provider.ok !== true
      ? { status: "unavailable", message: "Внешний контекст сейчас недоступен." }
      : provider.coverage !== "sufficient"
        ? { status: "insufficient", message: "Недостаточно внешних данных для уверенного вывода." }
        : { status: "checked_none", message: "Проверка внешних источников завершена: значимых факторов для этой смены не найдено." };

  const targetDate = input.demand.target?.date ?? null;
  const verificationPlanId = `ai-doctor:${input.venueId || "venue"}:${targetDate ?? "no-shift"}`;
  const previousPlan = input.previousVerificationPlans.map(record).find((item) => text(item.id) === verificationPlanId);
  for (const action of todayActions) action.verificationPlanId = verificationPlanId;
  const completed = input.phase === "after_shift" && Boolean(targetDate);
  const confirmed = [
    revenueChange !== null ? `Выручка: ${signedPercent(revenueChange)} к сопоставимой норме.` : "",
    trafficChange !== null ? `${input.traffic.source === "guest_count" ? "Гости" : "Чеки"}: ${signedPercent(trafficChange)}.` : "",
    averageChange !== null ? `Средний чек: ${signedPercent(averageChange)}.` : "",
  ].filter(Boolean);
  const verificationPlan: ManagementBriefing["verificationPlan"] = {
    id: verificationPlanId,
    status: completed ? "completed" : "scheduled",
    targetDate,
    createdAt: text(previousPlan?.createdAt, input.now.toISOString()),
    reused: Boolean(previousPlan) || input.previousVerificationPlans.some((item) => text(record(item).verificationPlanId) === verificationPlanId),
    checks: afterShiftChecks.map((item) => item.metric),
    result: completed ? {
      summary: "Проверка после смены выполнена по фактическим данным BarDoctor.",
      confirmed,
      notConfirmed: input.analytics.operationalCorrelations.length
        ? ["Совпадение операционных сигналов по времени не доказывает причинную связь."]
        : [],
      actionOutcome: "Эффект конкретных действий оценивается только для задач с зафиксированным выполнением; без отметки о выполнении AI не приписывает им результат.",
    } : null,
  };

  const healthLabel = input.health.score === null
    ? "недостаточно данных"
    : input.health.label === "critical" ? "критическое состояние"
      : input.health.label === "attention" ? "требует внимания"
        : "стабильно";
  const gapCount = Object.values(input.quality.gapsByScope).reduce((sum, gaps) => sum + gaps.length, 0);
  const severity: NonNullable<ManagementBriefing["diagnosis"]>["severity"] = !primary
    ? "stable"
    : text(primary.priority) === "critical" ? "critical"
      : text(primary.priority) === "high" ? "high" : "medium";
  const compatibilityContext = externalBriefing.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.factOrHypothesis,
    reason: item.evidence,
    verification: item.whatToWatch,
  }));
  return {
    version: "management-briefing-v2",
    analysisPeriod: input.demand.period,
    updatedAt: input.now.toISOString(),
    diagnosis: primary ? {
      title: text(primary.title, "Требуется управленческое действие", 180),
      summary: commercialDiagnosis ? `${input.demand.explanation} ${input.demand.decomposition.explanation}` : text(primary.fact, input.demand.explanation, 700),
      severity,
      periodLabel: input.demand.period.label,
      baseline: input.demand.period.comparisonBaseline,
      fact: commercialDiagnosis ? `${input.demand.explanation} ${input.demand.decomposition.explanation}` : text(primary.fact, input.demand.explanation, 700),
      metrics: keyDrivers.map((driver) => ({ label: driver.metric, value: driver.value })).slice(0, 3),
      confidencePercent: input.health.confidencePercent,
      confidenceLabel: "Достоверность диагноза",
    } : null,
    confidence: {
      label: "Достоверность диагноза",
      percent: input.health.confidencePercent,
      level: input.health.confidence,
      snapshotGeneratedAt: input.now.toISOString(),
    },
    keyDrivers: keyDrivers.slice(0, 3),
    findings: findings.slice(0, 6),
    todayActions: todayActions.slice(0, 3),
    externalContext: externalBriefing,
    afterShiftChecks: afterShiftChecks.slice(0, 4),
    externalContextState,
    verificationPlan,
    operationalProblems: [],
    businessHealthSummary: {
      score: input.health.score,
      label: healthLabel,
      drivers: [...input.health.lowersScore, ...input.health.adjustments].slice(0, 4),
    },
    dataQualitySummary: { percent: input.quality.percent, label: "Полнота данных", gaps: gapCount },
    actions: input.signals.slice(0, 3),
    context: compatibilityContext,
  };
}

export function buildBusinessIntelligence(input: BusinessIntelligenceInput): AIDoctorIntelligence {
  const now = input.now ?? new Date();
  const profile = input.profile ?? {};
  const phase = input.phase ?? phaseFor(profile, now);
  const daily = normaliseDailyMetrics(input.daily ?? []);
  const timezone = text(profile.timezone, "Europe/Chisinau", 80);
  const today = zonedDateKey(now, timezone);
  const target = daily.filter((row) => row.date <= today).at(-1) ?? null;
  const baseline = target ? comparableWeekdayBaseline(daily, target.date) : null;
  const traffic = trafficSource(target, baseline);
  const currentTraffic = traffic.source === "guest_count" ? target?.guests ?? null : target?.checks ?? null;
  const baselineTraffic = traffic.source === "guest_count" ? baseline?.guests ?? null : baseline?.checks ?? null;
  const trafficChangePercent = percentChange(currentTraffic, baselineTraffic);
  const averageCheckChangePercent = percentChange(target?.averageCheck ?? null, baseline?.averageCheck ?? null);
  const revenueChangePercent = percentChange(target?.revenue ?? null, baseline?.revenue ?? null);
  const decomposition = demandDecomposition(target, baseline);
  const demandPeriod: MetricPeriod = {
    id: "comparable_shift",
    label: target ? `Смена ${humanDate(target.date)}` : "Сопоставимая смена не выбрана",
    startDate: target?.date ?? null,
    endDate: target?.date ?? null,
    comparisonBaseline: comparableShiftLabel(baseline),
    freshness: target?.date ?? now.toISOString(),
    status: "snapshot",
  };
  const explanation = demandExplanation({
    source: traffic.source,
    traffic: trafficChangePercent,
    average: averageCheckChangePercent,
    revenue: revenueChangePercent,
    sampleSize: baseline?.sampleSize ?? 0,
  });
  const materialDeviation = (baseline?.sampleSize ?? 0) >= 3
    && [trafficChangePercent, averageCheckChangePercent, revenueChangePercent]
      .some((value) => value !== null && Math.abs(value) >= 10);
  const demand: AIDoctorIntelligence["demand"] = {
    target,
    baseline,
    revenueChangePercent,
    trafficChangePercent,
    averageCheckChangePercent,
    explanation,
    materialDeviation,
    period: demandPeriod,
    decomposition,
  };
  const currency = text(input.currency ?? profile.accountingCurrency ?? profile.currency, "MDL", 12).toUpperCase();
  const analytics = buildSelfServiceAnalytics({
    targetDate: target?.date ?? null,
    baselineDates: baseline?.dates ?? [],
    daily: input.daily,
    hourly: input.hourly,
    sales: input.sales,
    menu: input.menu,
    operationalSignals: input.operationalSignals,
    currency,
  });
  const operations = input.operations ?? {};
  const periodContext = financePeriods(input.currentFinancialPeriod ?? {}, input.latestClosedMonth ?? {}, now, today);
  const components = [
    financeComponent(input.latestClosedMonth ?? {}, input.previousCl
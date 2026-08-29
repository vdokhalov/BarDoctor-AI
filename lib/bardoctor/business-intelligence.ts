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
    const parts = new Intl.DateTimeFormat("en
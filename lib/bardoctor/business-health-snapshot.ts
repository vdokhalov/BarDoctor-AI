import type {
  AIDoctorIntelligence,
  BusinessHealthComponent,
  BusinessHealthStatus,
  LivePeriodAnalysis,
  MetricPeriod,
} from "./business-intelligence";
import { businessHealthStatusForScore } from "./business-intelligence";
import type { VenueAIContext } from "./venue-ai-context";

export const BUSINESS_HEALTH_CALCULATION_VERSION = "business-health-engine-v4" as const;

export type BusinessHealthFactorAvailability = "measured" | "unavailable";

export type BusinessHealthSnapshot = {
  snapshotId: string;
  venueId: string;
  dataAccountId: string;
  score: number | null;
  status: AIDoctorIntelligence["businessHealth"]["label"];
  statusLabel: "Хорошее состояние" | "Требует внимания" | "Критично" | "Недостаточно данных";
  confidence: number;
  confidenceLevel: AIDoctorIntelligence["businessHealth"]["confidence"];
  primaryFactor: {
    id: BusinessHealthComponent["id"];
    label: string;
    score: number;
    evidence: string | null;
  } | null;
  factorScores: Array<{
    id: BusinessHealthComponent["id"];
    label: string;
    score: number | null;
    availability: BusinessHealthFactorAvailability;
    weight: number;
    confidence: BusinessHealthComponent["confidence"];
  }>;
  zones: Array<{
    id: BusinessHealthComponent["id"];
    label: string;
    score: number | null;
    availability: BusinessHealthFactorAvailability;
    status: BusinessHealthStatus;
    statusLabel: "Хорошо" | "Требует внимания" | "Критично" | "Недостаточно данных";
    evidence: string[];
    gaps: string[];
    interpretation: string;
    factors: string[];
  }>;
  priorityAction: {
    recommendationId: string;
    issueKey: string;
    title: string;
    reason: string;
    ctaLabel: string;
    action: string;
    successCriterion: string;
    expectedScore: number | null;
    target: {
      path: string;
      label: string;
    } | null;
  } | null;
  trend: {
    periodDays: 7;
    baselineDate: string;
    baselineScore: number;
    delta: number;
  } | null;
  generatedAt: string;
  period: MetricPeriod;
  periods: AIDoctorIntelligence["periods"];
  livePeriod: LivePeriodAnalysis;
  calculationVersion: typeof BUSINESS_HEALTH_CALCULATION_VERSION;
  dataFreshness: {
    fresh: number;
    aging: number;
    stale: number;
    missing: number;
    oldestUpdatedAt: string | null;
    latestUpdatedAt: string | null;
  };
  dataQualityPercent: number;
  dataQuality: {
    percent: number;
    level: AIDoctorIntelligence["dataQuality"]["confidence"];
    label: "Качество данных: высокое" | "Качество данных: среднее" | "Качество данных: низкое";
    status: BusinessHealthStatus;
    statusLabel: "Хорошо" | "Требует внимания" | "Критично" | "Недостаточно данных";
    gaps: string[];
  };
  historyWarning: string | null;
  explanation: string;
  source: "server_business_intelligence";
};

export function businessHealthSnapshotIdentity(input: {
  venueId: string | number;
  generatedAt: string;
  calculationVersion: string;
  period: Pick<MetricPeriod, "id" | "startDate" | "endDate">;
}): string {
  return [
    "business-health-snapshot",
    String(input.venueId),
    input.calculationVersion,
    input.period.id,
    input.period.startDate ?? "none",
    input.period.endDate ?? "none",
    input.generatedAt,
  ].map(encodeURIComponent).join(":");
}

export function isBusinessHealthSnapshotNewer(
  candidate: Pick<BusinessHealthSnapshot, "snapshotId" | "generatedAt">,
  current: Pick<BusinessHealthSnapshot, "snapshotId" | "generatedAt"> | null,
): boolean {
  if (!current) return true;
  if (candidate.snapshotId === current.snapshotId) return false;
  const candidateTime = Date.parse(candidate.generatedAt);
  const currentTime = Date.parse(current.generatedAt);
  if (!Number.isFinite(candidateTime)) return false;
  if (!Number.isFinite(currentTime)) return true;
  return candidateTime > currentTime;
}

function statusLabel(
  status: AIDoctorIntelligence["businessHealth"]["label"],
): BusinessHealthSnapshot["statusLabel"] {
  if (status === "healthy") return "Хорошее состояние";
  if (status === "attention") return "Требует внимания";
  if (status === "critical") return "Критично";
  return "Недостаточно данных";
}

export function businessHealthActionTarget(issueKey: string): NonNullable<BusinessHealthSnapshot["priorityAction"]>["target"] {
  if (issueKey === "profit") return { path: "/finance", label: "Посмотреть финансы" };
  if (["traffic", "average-check", "demand-and-average-check", "revenue"].includes(issueKey)) {
    return { path: "/reports", label: "Посмотреть динамику" };
  }
  if (issueKey === "stock") return { path: "/warehouse", label: "Проверить остатки" };
  if (["unclosed-shift", "unclosed-shifts"].includes(issueKey)) return { path: "/shifts", label: "Проверить смены" };
  if (["operational-blocker", "equipment-recurring"].includes(issueKey)) return { path: "/equipment", label: "Проверить оборудование" };
  if (issueKey === "external-traffic-risk") return { path: "/opportunities", label: "Проверить контекст" };
  if (["data-quality", "recipes", "ingredient-mapping", "purchase-prices"].includes(issueKey)) {
    return { path: "/data-control", label: "Проверить данные" };
  }
  if (["guest-experience", "reviews"].includes(issueKey)) return { path: "/reviews", label: "Проверить отзывы" };
  return null;
}

function operationalInterpretation(component: BusinessHealthComponent): string {
  const issue = component.evidence.find((item) => /:\s*[1-9]\d*/.test(item));
  const status = businessHealthStatusForScore(component.score);
  if (issue && status !== "healthy") return `Операционная зона требует внимания: ${issue.charAt(0).toLocaleLowerCase("ru")}${issue.slice(1)}.`;
  if (issue) return `Есть операционный сигнал: ${issue.charAt(0).toLocaleLowerCase("ru")}${issue.slice(1)}.`;
  return "Критичных операционных отклонений не обнаружено.";
}

function zoneInterpretation(component: BusinessHealthComponent, intelligence: AIDoctorIntelligence): { interpretation: string; factors: string[] } {
  if (component.id === "finance") {
    return {
      interpretation: intelligence.livePeriod.financeSummary,
      factors: intelligence.livePeriod.factors.slice(0, 2),
    };
  }
  if (component.id === "demand") {
    return {
      interpretation: intelligence.livePeriod.demandSummary,
      factors: intelligence.livePeriod.factors.filter((item) => /Чеки|Средний чек|Выручка/.test(item)).slice(0, 2),
    };
  }
  if (component.id === "operations") {
    return {
      interpretation: operationalInterpretation(component),
      factors: component.evidence.filter((item) => /:\s*[1-9]\d*/.test(item)).slice(0, 2),
    };
  }
  return {
    interpretation: component.score === null
      ? "Отзывов пока недостаточно для отдельного вывода."
      : component.evidence[0] ?? "Гостевой опыт оценивается по доступным отзывам.",
    factors: component.evidence.slice(0, 2),
  };
}

function historyWarning(intelligence: AIDoctorIntelligence): string | null {
  const dates = [
    intelligence.demand.target?.date,
    ...(intelligence.demand.baseline?.dates ?? []),
  ].filter((value): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}/.test(value)));
  if (dates.length < 2) return "История за 30 дней ещё не накоплена";
  const sorted = dates.slice().sort();
  const start = Date.parse(`${sorted[0]}T12:00:00.000Z`);
  const end = Date.parse(`${sorted.at(-1)}T12:00:00.000Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end - start >= 30 * 86_400_000
    ? null
    : "История за 30 дней ещё не накоплена";
}

function primaryFactor(components: BusinessHealthComponent[]): BusinessHealthSnapshot["primaryFactor"] {
  const primary = components
    .filter((component): component is BusinessHealthComponent & { score: number } => component.score !== null)
    .sort((left, right) => left.score - right.score)[0];
  return primary
    ? {
        id: primary.id,
        label: primary.label,
        score: primary.score,
        evidence: primary.evidence[0] ?? null,
      }
    : null;
}

function dataQualityLabel(
  confidence: AIDoctorIntelligence["dataQuality"]["confidence"],
): BusinessHealthSnapshot["dataQuality"]["label"] {
  if (confidence === "high") return "Качество данных: высокое";
  if (confidence === "medium") return "Качество данных: среднее";
  return "Качество данных: низкое";
}

function zoneStatusLabel(status: BusinessHealthStatus): BusinessHealthSnapshot["zones"][number]["statusLabel"] {
  if (status === "healthy") return "Хорошо";
  if (status === "attention") return "Требует внимания";
  if (status === "critical") return "Критично";
  return "Недостаточно данных";
}

export function buildBusinessHealthSnapshot(input: {
  venueId: string | number;
  dataAccountId?: string | number;
  intelligence: AIDoctorIntelligence;
  context: Pick<VenueAIContext, "blocks">;
}): BusinessHealthSnapshot {
  const updatedAt = input.context.blocks
    .map((block) => block.updatedAt)
    .filter((value): value is string => Boolean(value && Number.isFinite(Date.parse(value))))
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  const freshness = { fresh: 0, aging: 0, stale: 0, missing: 0 };
  for (const block of input.context.blocks) freshness[block.freshness] += 1;
  const health = input.intelligence.businessHealth;
  const period = input.intelligence.periods.currentFinance ?? input.intelligence.periods.demand;
  const venueId = String(input.venueId);
  const generatedAt = input.intelligence.generatedAt;
  const primaryAction = input.intelligence.briefing.todayActions.find((action) => businessHealthActionTarget(action.issueKey))
    ?? input.intelligence.briefing.todayActions[0]
    ?? null;
  const dataQualityGaps = Object.values(input.intelligence.dataQuality.gapsByScope).flat();
  return {
    snapshotId: businessHealthSnapshotIdentity({
      venueId,
      generatedAt,
      calculationVersion: BUSINESS_HEALTH_CALCULATION_VERSION,
      period,
    }),
    venueId,
    dataAccountId: String(input.dataAccountId ?? input.venueId),
    score: health.score,
    status: health.label,
    statusLabel: statusLabel(health.label),
    confidence: health.confidencePercent,
    confidenceLevel: health.confidence,
    primaryFactor: primaryFactor(health.components),
    factorScores: health.components.map((component) => ({
      id: component.id,
      label: component.label,
      score: component.score,
      availability: component.score === null ? "unavailable" : "measured",
      weight: component.weight,
      confidence: component.confidence,
    })),
    zones: health.components.map((component) => {
      const status = businessHealthStatusForScore(component.score);
      const interpretation = zoneInterpretation(component, input.intelligence);
      return {
        id: component.id,
        label: component.label,
        score: component.score,
        availability: component.score === null ? "unavailable" : "measured",
        status,
        statusLabel: zoneStatusLabel(status),
        evidence: component.evidence,
        gaps: component.gaps,
        ...interpretation,
      };
    }),
    priorityAction: primaryAction
      ? {
          recommendationId: primaryAction.recommendationId,
          issueKey: primaryAction.issueKey,
          title: primaryAction.title,
          reason: primaryAction.reason,
          ctaLabel: primaryAction.ctaLabel,
          action: primaryAction.action,
          successCriterion: primaryAction.successCriterion,
          expectedScore: null,
          target: businessHealthActionTarget(primaryAction.issueKey),
        }
      : null,
    // Health history is not persisted yet. Keeping trend explicitly null prevents
    // the client from manufacturing a delta from local or incomparable data.
    trend: null,
    generatedAt,
    period,
    periods: input.intelligence.periods,
    livePeriod: input.intelligence.livePeriod,
    calculationVersion: BUSINESS_HEALTH_CALCULATION_VERSION,
    dataFreshness: {
      ...freshness,
      oldestUpdatedAt: updatedAt[0] ?? null,
      latestUpdatedAt: updatedAt.at(-1) ?? null,
    },
    dataQualityPercent: input.intelligence.dataQuality.percent,
    dataQuality: {
      percent: input.intelligence.dataQuality.percent,
      level: input.intelligence.dataQuality.confidence,
      label: dataQualityLabel(input.intelligence.dataQuality.confidence),
      status: businessHealthStatusForScore(input.intelligence.dataQuality.percent),
      statusLabel: zoneStatusLabel(businessHealthStatusForScore(input.intelligence.dataQuality.percent)),
      gaps: dataQualityGaps,
    },
    historyWarning: historyWarning(input.intelligence),
    explanation: health.explanation,
    source: "server_business_intelligence",
  };
}

export function businessHealthSnapshotCacheKey(input: {
  accountContext: string;
  venueId: string | number;
  calculationVersion: string;
  period: Pick<MetricPeriod, "id" | "startDate" | "endDate">;
}): string {
  return [
    "business-health",
    input.accountContext,
    String(input.venueId),
    input.calculationVersion,
    input.period.id,
    input.period.startDate ?? "none",
    input.period.endDate ?? "none",
  ].map(encodeURIComponent).join(":");
}

import type {
  AIDoctorIntelligence,
  BusinessHealthComponent,
  MetricPeriod,
} from "./business-intelligence";
import type { VenueAIContext } from "./venue-ai-context";

export const BUSINESS_HEALTH_CALCULATION_VERSION = "business-health-engine-v3" as const;

export type BusinessHealthSnapshot = {
  venueId: string;
  score: number | null;
  status: AIDoctorIntelligence["businessHealth"]["label"];
  statusLabel: "Стабильно" | "Требует внимания" | "Критично" | "Недостаточно данных";
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
    weight: number;
    confidence: BusinessHealthComponent["confidence"];
  }>;
  generatedAt: string;
  period: MetricPeriod;
  periods: AIDoctorIntelligence["periods"];
  calculationVersion: typeof BUSINESS_HEALTH_CALCULATION_VERSION;
  dataFreshness: {
    fresh: number;
    aging: number;
    stale: number;
    missing: number;
    oldestUpdatedAt: string | null;
  };
  dataQualityPercent: number;
  historyWarning: string | null;
  explanation: string;
  source: "server_business_intelligence";
};

function statusLabel(
  status: AIDoctorIntelligence["businessHealth"]["label"],
): BusinessHealthSnapshot["statusLabel"] {
  if (status === "healthy") return "Стабильно";
  if (status === "attention") return "Требует внимания";
  if (status === "critical") return "Критично";
  return "Недостаточно данных";
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

export function buildBusinessHealthSnapshot(input: {
  venueId: string | number;
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
  return {
    venueId: String(input.venueId),
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
      weight: component.weight,
      confidence: component.confidence,
    })),
    generatedAt: input.intelligence.generatedAt,
    period: input.intelligence.periods.demand,
    periods: input.intelligence.periods,
    calculationVersion: BUSINESS_HEALTH_CALCULATION_VERSION,
    dataFreshness: {
      ...freshness,
      oldestUpdatedAt: updatedAt[0] ?? null,
    },
    dataQualityPercent: input.intelligence.dataQuality.percent,
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

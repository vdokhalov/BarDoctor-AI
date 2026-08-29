import { authenticateRequest, unauthorized } from "./auth";
import {
  hasPermission,
  type AuthenticatedAccount,
  type PermissionKey,
} from "./access-control";
import {
  AIServiceError,
  aiErrorResponse,
  aiText,
  parseAIJson,
  type AIContent,
} from "./ai-provider";
import {
  loadDiagnosisExternalContext,
  type DiagnosisExternalContext,
} from "./diagnosis-context";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
  type VenueAIContext,
} from "./venue-ai-context";
import {
  RECOMMENDATION_METRIC_IDS,
  isRecommendationMetricId,
  recommendationMetricSnapshot,
  type RecommendationDirection,
  type RecommendationMetricId,
} from "./recommendation-outcomes";
import {
  buildAIDoctorAttention,
  loadAIDoctorMemory,
  type AIDoctorMemory,
} from "./ai-doctor-attention";
import {
  buildBusinessIntelligenceFromVenueContext,
  type AIDoctorIntelligence,
} from "./business-intelligence";
import { buildBusinessHealthSnapshot } from "./business-health-snapshot";

type JsonRecord = Record<string, unknown>;

const PRIORITIES = new Set(["critical", "high", "medium", "low"]);
const COST_TIERS = new Set(["low", "medium", "high"]);
const AREA_STATUSES = new Set(["risk", "opportunity", "stable", "no_data"]);
const RECOMMENDATION_CONFIDENCE = new Set(["high", "medium", "low"]);
const REVIEW_TOPICS = new Set([
  "staff", "kitchen", "bar", "music", "hookah",
  "cleanliness", "wait_time", "price", "atmosphere", "other",
]);
const SENTIMENTS = new Set(["positive", "neutral", "negative"]);

// Provider-level contract. The server still normalises every field and ignores
// identifiers that are not present in the trusted evidence catalogue.
const DIAGNOSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "financialAssessment", "topPriority", "topThree", "analysis", "areas", "actions"],
  properties: {
    summary: { type: "string" },
    financialAssessment: {
      type: "object", additionalProperties: false,
      required: ["periodKey", "evaluation", "comparison", "keyDrivers", "managementConclusion"],
      properties: {
        periodKey: { type: "string" }, evaluation: { type: "string" }, comparison: { type: "string" },
        managementConclusion: { type: "string" },
        keyDrivers: { type: "array", items: {
          type: "object", additionalProperties: false,
          required: ["label", "fact", "implication", "evidenceIds"],
          properties: { label: { type: "string" }, fact: { type: "string" }, implication: { type: "string" }, evidenceIds: { type: "array", items: { type: "string" } } },
        } },
      },
    },
    topPriority: {
      type: "object", additionalProperties: false, required: ["title", "category", "urgency"],
      properties: { title: { type: "string" }, category: { type: "string" }, urgency: { type: "string", enum: ["critical", "high", "medium", "low"] } },
    },
    topThree: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["text", "category"],
      properties: { text: { type: "string" }, category: { type: "string" } },
    } },
    analysis: {
      type: "object", additionalProperties: false, required: ["what", "why", "how", "impact", "patterns"],
      properties: { what: { type: "string" }, why: { type: "string" }, how: { type: "string" }, impact: { type: "string" }, patterns: { type: "string" } },
    },
    areas: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["id", "status", "fact", "hypothesis", "consequence", "action", "verification", "evidenceIds"],
      properties: {
        id: { type: "string" }, status: { type: "string", enum: ["risk", "opportunity", "stable", "no_data"] },
        fact: { type: "string" }, hypothesis: { type: "string" }, consequence: { type: "string" }, action: { type: "string" }, verification: { type: "string" },
        evidenceIds: { type: "array", items: { type: "string" } },
      },
    } },
    actions: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["recommendationId", "signalClass", "title", "priority", "fact", "factPeriod", "hypothesis", "hypothesisConfidence", "confidenceReason", "consequence", "action", "steps", "responsibleRole", "deadline", "verificationDate", "baselineMetric", "targetMetric", "successCriterion", "expectedEffect", "impact", "estimatedTime", "costTier", "expectedResult", "basisSummary", "evidenceIds", "equipmentName"],
      properties: {
        recommendationId: { type: "string" }, signalClass: { type: "string", enum: ["problem", "opportunity", "data_quality"] }, title: { type: "string" },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] }, fact: { type: "string" }, factPeriod: { type: "string" }, hypothesis: { type: "string" },
        hypothesisConfidence: { type: "string", enum: ["high", "medium", "low"] }, confidenceReason: { type: "string" }, consequence: { type: "string" }, action: { type: "string" },
        steps: { type: "array", items: { type: "string" } }, responsibleRole: { type: "string" }, deadline: { type: "string" }, verificationDate: { type: "string" },
        baselineMetric: { type: "object", additionalProperties: false, required: ["metricId", "label", "value", "unit"], properties: {
          metricId: { type: ["string", "null"] }, label: { type: "string" }, value: { type: ["number", "null"] }, unit: { type: "string" },
        } },
        targetMetric: { type: "object", additionalProperties: false, required: ["metricId", "label", "value", "unit", "direction"], properties: {
          metricId: { type: ["string", "null"] }, label: { type: "string" }, value: { type: ["number", "null"] }, unit: { type: "string" }, direction: { type: "string", enum: ["increase", "decrease", "maintain"] },
        } },
        successCriterion: { type: "string" }, expectedEffect: { type: "string" }, impact: { type: "string" }, estimatedTime: { type: "string" },
        costTier: { type: "string", enum: ["low", "medium", "high"] }, expectedResult: { type: "string" }, basisSummary: { type: "string" },
        evidenceIds: { type: "array", items: { type: "string" } }, equipmentName: { type: "string" },
      },
    } },
  },
} as const;

type RecommendationEvidence = {
  id: string;
  source:
    | "profile"
    | "finance"
    | "operations"
    | "staff"
    | "equipment"
    | "review"
    | "competitor"
    | "health"
    | "menu"
    | "procurement"
    | "inventory"
    | "calendar";
  label: string;
  fact: string;
  observedAt?: string;
  sourceUrl?: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textArray(value: unknown, limit = 20): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, limit)
    : [];
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown): string | null {
  const parsed = number(value);
  return parsed === null ? null : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(parsed);
}

function evidenceFact(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ").slice(0, 700);
}

function evidenceEntityId(value: unknown, fallback: string): string {
  return text(value, fallback)
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9:_-]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;
}

function buildEvidenceCatalog(
  body: JsonRecord,
  external: DiagnosisExternalContext,
  venueContext?: VenueAIContext,
): RecommendationEvidence[] {
  const evidence: RecommendationEvidence[] = [];
  const push = (item: RecommendationEvidence) => {
    if (!item.fact.trim() || evidence.some((existing) => existing.id === item.id)) return;
    evidence.push(item);
  };

  const profile = asRecord(body.profile) ?? {};
  push({
    id: "profile:venue",
    source: "profile",
    label: "Профиль заведения",
    fact: evidenceFact([
      text(profile.name, "Заведение"),
      text(profile.businessType),
      text(profile.city),
      text(profile.venueFormat),
      text(profile.openTime) && text(profile.closeTime)
        ? `график ${text(profile.openTime)}–${text(profile.closeTime)}`
        : null,
    ]),
  });

  const contextSource: Record<string, RecommendationEvidence["source"]> = {
    location: "profile",
    format: "profile",
    pricePosition: "menu",
    schedule: "profile",
    performanceHistory: "finance",
    menuAndRecipes: "menu",
    salesAndCost: "finance",
    purchasesAndInventory: "procurement",
    team: "staff",
    guestFeedback: "review",
    seasonalityAndEvents: "calendar",
    market: "competitor",
  };
  for (const item of venueContext?.blocks ?? []) {
    push({
      id: `context:${item.id}`,
      source: contextSource[item.id] ?? "operations",
      label: item.label,
      fact: item.detail,
      observedAt: item.updatedAt ?? undefined,
    });
  }

  const performanceHistory = asRecord(venueContext?.promptData.performanceHistory) ?? {};
  const latestClosedMonth = asRecord(performanceHistory.latestClosedMonth);
  const closedMonthComparison = asRecord(performanceHistory.closedMonthComparison);
  if (latestClosedMonth && formatNumber(latestClosedMonth.finalProfit)) {
    const period = text(
      latestClosedMonth.periodLabel,
      text(latestClosedMonth.monthKey, "Последний закрытый месяц"),
    );
    push({
      id: "finance:closed-month-result",
      source: "finance",
      label: `Финансовый итог: ${period}`,
      fact: evidenceFact([
        formatNumber(latestClosedMonth.revenue) ? `выручка ${formatNumber(latestClosedMonth.revenue)}` : null,
        `чистая прибыль ${formatNumber(latestClosedMonth.finalProfit)}`,
        formatNumber(latestClosedMonth.profitMarginPercent)
          ? `рентабельность ${formatNumber(latestClosedMonth.profitMarginPercent)}%`
          : null,
        formatNumber(latestClosedMonth.coveragePercent)
          ? `полнота смен ${formatNumber(latestClosedMonth.coveragePercent)}%`
          : null,
      ]),
      observedAt: text(latestClosedMonth.closedAt) || undefined,
    });
    const financialComponents = [
      ["cost-of-goods", "Себестоимость проданного", "costOfGoods", "costOfGoodsSharePercent"],
      ["payroll", "ФОТ", "payroll", "payrollSharePercent"],
      ["other-expenses", "Остальные расходы", "otherExpenses", "otherExpensesSharePercent"],
      ["writeoffs", "Списания", "writeoffs", "writeoffsSharePercent"],
      ["taxes", "Налоги", "taxes", ""],
      ["utilities", "Коммунальные услуги", "utilities", ""],
    ] as const;
    for (const [id, label, amountKey, shareKey] of financialComponents) {
      if (!formatNumber(latestClosedMonth[amountKey])) continue;
      push({
        id: `finance:closed-month-${id}`,
        source: "finance",
        label: `${label}: ${period}`,
        fact: evidenceFact([
          `${label} ${formatNumber(latestClosedMonth[amountKey])}`,
          shareKey && formatNumber(latestClosedMonth[shareKey])
            ? `${formatNumber(latestClosedMonth[shareKey])}% от выручки`
            : null,
        ]),
        observedAt: text(latestClosedMonth.closedAt) || undefined,
      });
    }
    if (closedMonthComparison) {
      push({
        id: "finance:closed-month-comparison",
        source: "finance",
        label: "Сравнение закрытых месяцев",
        fact: evidenceFact([
          text(closedMonthComparison.basis, "Собственная история заведения"),
          text(closedMonthComparison.previousPeriodLabel)
            ? `сравнение с ${text(closedMonthComparison.previousPeriodLabel)}`
            : null,
          formatNumber(closedMonthComparison.revenueChangePercent)
            ? `выручка ${number(closedMonthComparison.revenueChangePercent)! > 0 ? "+" : ""}${formatNumber(closedMonthComparison.revenueChangePercent)}%`
            : null,
          formatNumber(closedMonthComparison.profitDelta)
            ? `изменение прибыли ${number(closedMonthComparison.profitDelta)! > 0 ? "+" : ""}${formatNumber(closedMonthComparison.profitDelta)}`
            : null,
          formatNumber(closedMonthComparison.marginDeltaPoints)
            ? `маржа ${number(closedMonthComparison.marginDeltaPoints)! > 0 ? "+" : ""}${formatNumber(closedMonthComparison.marginDeltaPoints)} п.п.`
            : null,
        ]),
      });
    }
  }

  const finance = asRecord(body.finance) ?? {};
  const month = asRecord(finance.monthToDate);
  if (month) {
    push({
      id: "finance:month-to-date",
      source: "finance",
      label: "Финансы текущего периода",
      fact: evidenceFact([
        formatNumber(month.revenue) ? `выручка ${formatNumber(month.revenue)}` : null,
        formatNumber(month.expenses) ? `расходы ${formatNumber(month.expenses)}` : null,
        formatNumber(month.receipts) ? `чеки ${formatNumber(month.receipts)}` : null,
        formatNumber(month.avgReceipt) ? `средний чек ${formatNumber(month.avgReceipt)}` : null,
      ]),
    });
  }
  const labor = asRecord(finance.laborCost);
  if (labor) {
    push({
      id: "finance:labor",
      source: "finance",
      label: "ФОТ",
      fact: evidenceFact([
        formatNumber(labor.total) ? `ФОТ ${formatNumber(labor.total)}` : null,
        formatNumber(labor.percent) ? `доля ${formatNumber(labor.percent)}%` : null,
      ]),
    });
  }
  const staffing = asRecord(finance.staffingEfficiency);
  if (staffing) {
    push({
      id: "staff:efficiency",
      source: "staff",
      label: "Эффективность команды",
      fact: JSON.stringify(staffing).slice(0, 600),
    });
  }

  const calendar = asRecord(body.operatingCalendar) ?? {};
  const gapDates = textArray(calendar.unexplainedRevenueGapDates, 20);
  if (gapDates.length) {
    push({
      id: "operations:missing-shifts",
      source: "operations",
      label: "Незаполненные смены",
      fact: `${gapDates.length} смен без отчёта: ${gapDates.slice(0, 8).join(", ")}`,
    });
  }
  if (formatNumber(calendar.coveragePercent)) {
    push({
      id: "operations:coverage",
      source: "operations",
      label: "Полнота смен",
      fact: `Заполнено ${formatNumber(calendar.coveragePercent)}% завершённых смен`,
    });
  }

  (Array.isArray(body.events) ? body.events : []).slice(0, 25).forEach((value, index) => {
    const item = asRecord(value);
    if (!item || !text(item.title)) return;
    push({
      id: `event:${evidenceEntityId(item.id, `row-${index + 1}`)}`,
      source: "operations",
      label: `Событие: ${text(item.title).slice(0, 120)}`,
      fact: evidenceFact([text(item.category), text(item.priority), text(item.status), text(item.description), text(item.eventDate)]),
      observedAt: text(item.eventDate) || undefined,
    });
  });

  (Array.isArray(body.cases) ? body.cases : []).slice(0, 20).forEach((value, index) => {
    const item = asRecord(value);
    if (!item || !text(item.title)) return;
    push({
      id: `case:${evidenceEntityId(item.id, `row-${index + 1}`)}`,
      source: "operations",
      label: `Дело: ${text(item.title).slice(0, 120)}`,
      fact: evidenceFact([text(item.type), text(item.priority), text(item.status), text(item.dueDate)]),
      observedAt: text(item.dueDate) || undefined,
    });
  });

  (Array.isArray(body.equipment) ? body.equipment : []).slice(0, 25).forEach((value, 
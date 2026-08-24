import { and, eq, inArray } from "drizzle-orm";
import { domainData, type Account } from "../../db/schema";
import type { VenueAIContext } from "./venue-ai-context";

type JsonRecord = Record<string, unknown>;

export type AIDoctorSignalClass = "problem" | "opportunity" | "data_quality";
export type AIDoctorLifecycle =
  | "new"
  | "accepted"
  | "in_progress"
  | "verify_result"
  | "reopened"
  | "closed"
  | "rejected"
  | "overdue";

export type AIDoctorPriorityBreakdown = {
  impact: number;
  urgency: number;
  confirmation: number;
  scale: number;
  actionability: number;
  recurrence: number;
};

export type AIDoctorMemory = {
  tasks: JsonRecord[];
  actionTasks: JsonRecord[];
  decisions: JsonRecord[];
};

export type AIDoctorAttention = {
  version: "ai-doctor-attention-v1";
  updatedAt: string;
  diagnosticSentence: string;
  counts: {
    requiresAttention: number;
    critical: number;
    important: number;
    stable: number;
    moreSignals: number;
  };
  priorities: JsonRecord[];
  inProgress: JsonRecord[];
  activeProblems: JsonRecord[];
  timeBuckets: {
    today: JsonRecord[];
    overdue: JsonRecord[];
    upcoming: JsonRecord[];
    backlog: JsonRecord[];
  };
  opportunities: JsonRecord[];
  dataQuality: {
    reliabilityPercent: number;
    items: JsonRecord[];
  };
  history: JsonRecord[];
};

const SIGNAL_CLASSES = new Set<AIDoctorSignalClass>(["problem", "opportunity", "data_quality"]);
const ACTIVE_LIFECYCLES = new Set<AIDoctorLifecycle>([
  "accepted",
  "in_progress",
  "verify_result",
  "overdue",
]);

function record(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", limit = 700): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, maximum: number): number {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

function dateOnly(value: unknown): string | null {
  const match = text(value, "", 80).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

type AIDoctorTimeBucket = "today" | "overdue" | "upcoming" | "backlog";

function timeBucketFor(value: unknown, now: Date): AIDoctorTimeBucket {
  const item = record(value);
  if (text(item.lifecycle) === "overdue") return "overdue";
  const today = now.toISOString().slice(0, 10);
  const dueDate = dateOnly(item.taskDeadlineDate ?? item.canonicalDeadlineDate ?? item.deadlineDate);
  if (dueDate) {
    if (dueDate < today) return "overdue";
    if (dueDate === today) return "today";
    return "upcoming";
  }
  const deadline = [item.taskDeadline, item.recommendationDeadline, item.deadline]
    .map((part) => text(part).toLocaleLowerCase("ru"))
    .filter(Boolean)
    .join(" ");
  if (/просроч/.test(deadline)) return "overdue";
  if (/немедлен|сейчас|сегодня|до открытия|до (ближайшей|следующей) смен|текущ(ей|ую) смен/.test(deadline)) return "today";
  if (/завтра|в течение [1-7] (д|сут)|недел/.test(deadline)) return "upcoming";
  return "backlog";
}

function sourceOf(value: unknown): string {
  return text(record(value).source, "operations", 60);
}

function evidenceOf(value: unknown): JsonRecord[] {
  const item = record(value);
  const raw = array(item.evidence).length ? array(item.evidence) : array(item.dataSources);
  const seen = new Set<string>();
  return raw.map(record).filter((entry, index) => {
    const id = text(entry.id, `source:${index + 1}`, 160);
    if (seen.has(id)) return false;
    seen.add(id);
    entry.id = id;
    return Boolean(text(entry.label) || text(entry.fact) || text(entry.source));
  });
}

function searchable(value: unknown): string {
  const item = record(value);
  return [
    item.title,
    item.fact,
    item.hypothesis,
    item.consequence,
    item.action,
    item.expectedEffect,
    item.impact,
    item.basisSummary,
    ...evidenceOf(item).flatMap((entry) => [entry.label, entry.fact, entry.source]),
  ].map((part) => text(part).toLocaleLowerCase("ru")).filter(Boolean).join(" ");
}

function slug(value: string): string {
  return value
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "signal";
}

export function aiDoctorIssueKey(value: unknown): string {
  const item = record(value);
  const structured = text(item.issueKey, "", 80);
  if ([
    "profit", "revenue", "traffic", "average-check", "demand-and-average-check",
    "external-traffic-risk", "operational-blocker", "equipment-recurring",
  ].includes(structured)) return structured;
  const haystack = searchable(value);
  if (/кондиц|климат|жар[аыеу]|вентиляц|температур/.test(haystack)) return "climate";
  if (/караоке|микрофон|звук|акустик|аудио|колонк/.test(haystack)) return "audio";
  if (/незакрыт.{0,12}смен|смен.{0,12}(без отч[её]та|не заполн)|missing[- _]?shift|полнот.{0,10}смен/.test(haystack)) return "unclosed-shifts";
  if (/техкарт|рецепт.{0,12}(нет|отсутств|не заполн)|recipe/.test(haystack)) return "recipes";
  if (/ingredient.{0,16}mapping|ингредиент.{0,22}(закуп|связ)|сопостав.{0,18}ингредиент/.test(haystack)) return "ingredient-mapping";
  if (/закупочн.{0,10}цен|purchase.{0,8}price/.test(haystack)) return "purchase-prices";
  if (/пожар|электр|замыкан|безопасност/.test(haystack)) return "safety";
  if (/праздник|празднич|событи|календар|calendar|event|план.{0,16}смен.{0,20}запас|смен.{0,20}запас.{0,20}дат/.test(haystack)) return "local-demand-event";
  if (/выруч|revenue/.test(haystack)) return "revenue";
  if (/прибыл|марж|profit/.test(haystack)) return "profit";
  if (/фот|payroll|персонал|команд/.test(haystack)) return "team";
  if (/жалоб|отзыв|гост|репутац/.test(haystack)) return "guest-experience";
  if (/остат|дефицит|stock|склад/.test(haystack)) return "stock";
  if (/оборуд|ремонт|неисправ|broken/.test(haystack)) return `equipment-${slug(text(record(value).equipmentName, text(record(value).title, "equipment")))}`;
  return slug(text(record(value).title, text(record(value).action, "signal")));
}

/** Stable identity for a real problem, independent of changing recommendation wording. */
export function aiDoctorProblemFingerprint(value: unknown, venueId?: string | number | null): string {
  const item = record(value);
  const evidence = evidenceOf(item);
  const entity = text(
    item.affectedEntity ?? item.entityId ?? item.equipmentName ?? item.zone ?? item.area,
    evidence.map((entry) => text(entry.entityId ?? entry.equipmentName ?? entry.zone)).find(Boolean) ?? "",
    120,
  );
  return [text(venueId, "venue"), aiDoctorIssueKey(item), entity ? slug(entity) : "all"]
    .join(":")
    .slice(0, 220);
}

export function classifyAIDoctorSignal(value: unknown): AIDoctorSignalClass {
  const item = record(value);
  const requested = text(item.signalClass) as AIDoctorSignalClass;
  const haystack = searchable(item);
  const issue = aiDoctorIssueKey(item);
  // Deterministic business rules take precedence over a model-provided class.
  // This prevents missing data from leaking into the manager's business TOP-3
  // and keeps critical operating/safety risks visible even after a bad label.
  if (hasCriticalOverride(item)) return "problem";
  if (issue === "unclosed-shifts") return hasMaterialDataRisk(item) ? "problem" : "data_quality";
  if (/нет данных|качество данных|непол[нм]|coverage|давно не (было )?sync|синхронизац.{0,12}(нет|давно)|нет техкарт|без техкарт|не сопостав|ingredient.{0,16}mapping|нет закупочн.{0,8}цен|отсутств.{0,12}(отч[её]т|интеграц)|меню.{0,16}(не загруж|отсутств)|отзыв.{0,18}(не добав|отсутств)|нет отзыв|сотрудник.{0,20}(не добав|отсутств)|нет сотрудник|добавить сотрудник|нет подтвержд.{0,16}закуп|перв.{0,12}инвентаризац/.test(haystack)) {
    return "data_quality";
  }
  const explicitProblem = /падени|снижени|рост расходов|жалоб|неисправ|дефицит|сбой|риск|просроч|убыт|аномал|проблем|не заполн/.test(haystack);
  if (explicitProblem) return "problem";
  if (/возможност|потенциал|рост средн|увеличить средн|оптимизир.{0,12}закуп|сезонност|стабильн.{0,18}(продаж|посещ)|ниже обычн/.test(haystack)) {
    return "opportunity";
  }
  if (SIGNAL_CLASSES.has(requested)) return requested;
  return "problem";
}

function hasMaterialDataRisk(value: unknown): boolean {
  const haystack = searchable(value);
  return /касс.{0,18}(расхожд|не сход)|налог|штраф|нарушен.{0,16}(уч[её]т|отч[её]тност)|блокир.{0,20}(расч[её]т|выплат|закрыт)|невозможно.{0,24}(рассчит|выплат)|потер[яи].{0,10}данн/.test(haystack);
}

function canonicalTitle(issueKey: string, fallback: string): string {
  if (issueKey === "climate") return "Восстановить климат в основном зале";
  if (issueKey === "audio") return "Проверить караоке и микрофоны";
  if (issueKey === "unclosed-shifts") return "Закрыть незакрытые смены";
  if (issueKey === "recipes") return "Заполнить недостающие техкарты";
  if (issueKey === "ingredient-mapping") return "Связать ингредиенты с закупками";
  return fallback;
}

function impactAreas(haystack: string, signalClass: AIDoctorSignalClass): string[] {
  const result = new Set<string>();
  if (/выруч|прибыл|марж|расход|фот|деньг|финанс/.test(haystack)) result.add("Финансы");
  if (/гост|жалоб|отзыв|климат|жар|звук|караоке/.test(haystack)) result.add("Гости");
  if (/жалоб|отзыв|репутац|рейтинг/.test(haystack)) result.add("Репутация");
  if (/операц|оборуд|ремонт|смен|откры|склад|закуп|климат|звук/.test(haystack)) result.add("Операции");
  if (/команд|персонал|сотруд|администратор|управляющ/.test(haystack)) result.add("Команда");
  if (signalClass === "data_quality" || /данн|техкарт|mapping|синхрон/.test(haystack)) result.add("Данные");
  if (!result.size) result.add(signalClass === "opportunity" ? "Финансы" : "Операции");
  return [...result];
}

function hasCriticalOverride(value: unknown): boolean {
  const haystack = searchable(value);
  return /пожар|задымлен|коротк.{0,8}замыкан|утечк.{0,8}газ|угроз.{0,10}жизн|риск безопасности|не(возможно| может).{0,22}(открыть|работать)|остановк.{0,12}(работ|завед)|потер[яи].{0,8}данн|массов.{0,10}жалоб|критическ.{0,15}(сбой|аномал|неисправ)/.test(haystack);
}

function urgencyScore(value: unknown, now: Date): number {
  const item = record(value);
  const haystack = searchable(item);
  const deadline = `${text(item.deadline)} ${text(item.verificationDate)}`.trim().toLocaleLowerCase("ru");
  const dueDate = dateOnly(item.verificationDate) ?? dateOnly(item.deadline);
  const today = now.toISOString().slice(0, 10);
  if (hasCriticalOverride(item)) return 20;
  if ((dueDate && dueDate <= today) || /немедлен|сейчас|до открытия|до (ближайшей|следующей) смен|сегодня|просроч/.test(`${deadline} ${haystack}`)) return 18;
  if (dueDate) {
    const days = Math.ceil((Date.parse(`${dueDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86_400_000);
    if (days <= 3) return 14;
    if (days <= 7) return 8;
    if (days >= 30) return 4;
  }
  if (/завтра|в течение [1-3] (д|сут)|нескольк.{0,8}дн/.test(deadline)) return 14;
  if (/недел|7 дн/.test(deadline)) return 8;
  if (/месяц|долгоср/.test(deadline)) return 4;
  return 10;
}

function impactScore(value: unknown, signalClass: AIDoctorSignalClass): number {
  const item = record(value);
  const haystack = searchable(value);
  if (hasCriticalOverride(value)) return 30;
  if (item.businessWideImpact === true && (item.financialImpact === "high" || item.demandImpact === "high")) return 30;
  if (item.financialImpact === "high" || item.demandImpact === "high") return 28;
  if (item.operationalImpact === "critical") return 27;
  if (item.guestImpact === "high" && item.businessWideImpact === true) return 26;
  if (item.provenFinancialImpact === false && /оборуд|климат|микрофон|караоке/.test(haystack)) return 18;
  if (/падени.{0,12}выруч|убыт|отрицательн.{0,16}(результат|прибыл)|спрос|трафик|средн.{0,8}чек/.test(haystack)) return 27;
  if (/жалоб|неисправ|климат|жар|гост|репутац|дефицит/.test(haystack)) return 21;
  if (/марж|расход|выруч|прибыл|персонал|операц|смен/.test(haystack)) return 22;
  if (signalClass === "data_quality") return 13;
  if (signalClass === "opportunity") return 17;
  return 18;
}

function confirmationScore(value: unknown): number {
  const evidence = evidenceOf(value);
  const sources = new Set(evidence.map(sourceOf));
  const haystack = searchable(value);
  if (sources.has("review") && sources.has("equipment")) return 20;
  if (evidence.length >= 4 || sources.size >= 3) return 20;
  if (evidence.length >= 2 || sources.size >= 2) return 16;
  if (evidence.length === 1) return 11;
  return /подтвержд|зафиксирован|факт/.test(haystack) ? 8 : 4;
}

function scaleScore(value: unknown): number {
  const item = record(value);
  const evidence = evidenceOf(value);
  const haystack = searchable(value);
  if (item.businessWideImpact === true) return 10;
  if (/массов|системн|тенденц|продолжа|повтор/.test(haystack) || evidence.length >= 4) return 10;
  if (/нескольк|[2-9] жалоб|[2-9] смен/.test(haystack) || evidence.length >= 2) return 7;
  return 4;
}

function actionabilityScore(value: unknown): number {
  const item = record(value);
  let score = 2;
  if (text(item.action) || text(item.title)) score += 2;
  if (text(item.responsibleRole) || text(item.responsible)) score += 2;
  if (text(item.deadline) || text(item.verificationDate)) score += 2;
  if (text(item.successCriterion) || text(item.expectedResult) || text(item.resolutionCheck)) score += 2;
  return clamp(score, 10);
}

function relatedTaskCount(value: unknown, tasks: JsonRecord[]): number {
  const fingerprint = aiDoctorProblemFingerprint(value);
  return tasks.filter((task) => aiDoctorProblemFingerprint(task) === fingerprint).length;
}

function score(value: unknown, signalClass: AIDoctorSignalClass, tasks: JsonRecord[], now: Date) {
  const recurrenceCount = relatedTaskCount(value, tasks);
  const breakdown: AIDoctorPriorityBreakdown = {
    impact: clamp(impactScore(value, signalClass), 30),
    urgency: clamp(urgencyScore(value, now), 20),
    confirmation: clamp(confirmationScore(value), 20),
    scale: clamp(scaleScore(value), 10),
    actionability: clamp(actionabilityScore(value), 10),
    recurrence: recurrenceCount > 1 ? 10 : recurrenceCount === 1 ? 6 : 0,
  };
  const criticalOverride = hasCriticalOverride(value);
  const total = criticalOverride
    ? 100
    : Object.values(breakdown).reduce((sum, part) => sum + part, 0);
  return { breakdown, total, criticalOverride };
}

function confidence(value: unknown): { score: number; level: "high" | "medium" | "low"; reason: string } {
  const evidence = evidenceOf(value);
  const sources = new Set(evidence.map(sourceOf));
  const complementaryOperationalEvidence = sources.has("review") && sources.has("equipment");
  const scoreValue = evidence.length >= 4 || sources.size >= 3
    ? 92
    : complementaryOperationalEvidence
      ? 90
      : sources.size >= 2
        ? 84
        : evidence.length >= 2
          ? 70
      : evidence.length === 1
          ? 55
          : 30;
  return {
    score: scoreValue,
    level: scoreValue >= 80 ? "high" : scoreValue >= 50 ? "medium" : "low",
    reason: sources.size >= 2
      ? `Вывод подтверждают ${sources.size} независимых источника данных.`
      : evidence.length
        ? `Вывод опирается на ${evidence.length} ${evidence.length === 1 ? "источник" : "связанных факта"}.`
      : "Сигнал пока основан на гипотезе и требует подтверждения.",
  };
}

function recommendationId(signalClass: AIDoctorSignalClass, issueKey: string): string {
  if (signalClass === "opportunity") return `ai:opportunity:${issueKey}`;
  if (signalClass === "data_quality") return `ai:data:${issueKey}`;
  return `ai:${issueKey}`;
}

function priorityLabel(total: number, criticalOverride: boolean): "critical" | "high" | "medium" | "low" {
  if (criticalOverride) return "critical";
  if (total >= 68) return "high";
  if (total >= 45) return "medium";
  return "low";
}

function riskLabel(total: number, criticalOverride: boolean): string {
  if (criticalOverride) return "критический";
  if (total >= 68) return "высокий";
  if (total >= 45) return "средний";
  return "низкий";
}

function lifecycleForTask(task: JsonRecord | undefined, now: Date): AIDoctorLifecycle {
  if (!task) return "new";
  const approval = text(task.approvalStatus);
  const status = text(task.status, "not_started");
  const canonicalState = text(task.canonicalState);
  if (
    task.hidden === true
    || task.stale === true
    || task.superseded === true
    || Boolean(text(task.supersededBy))
    || ["deleted", "superseded"].includes(approval)
    || ["cancelled", "superseded", "stale", "resolved", "closed"].includes(status)
    || ["superseded", "resolved", "closed"].includes(canonicalState)
  ) return status === "resolved" || status === "closed" || canonicalState === "resolved" || canonicalState === "closed"
    ? "closed"
    : "rejected";
  const outcome = text(record(task.actualResult).status, text(task.outcomeStatus));
  if (status === "completed") {
    if (outcome === "helped") return "closed";
    return "verify_result";
  }
  const due = dateOnly(task.deadline ?? task.verificationDate);
  if (approval === "approved" && due && due < now.toISOString().slice(0, 10)) return "overdue";
  if (approval === "approved" && status === "in_progress") return "in_progress";
  if (approval === "approved") return "accepted";
  return "new";
}

function newestTaskFor(value: unknown, tasks: JsonRecord[]): JsonRecord | undefined {
  const item = record(value);
  const id = text(item.recommendationId);
  const fingerprint = aiDoctorProblemFingerprint(item);
  return tasks
    .filter((task) => text(task.recommendationId) === id || aiDoctorProblemFingerprint(task) === fingerprint)
    .sort((left, right) => text(right.updatedAt, text(right.createdAt)).localeCompare(text(left.updatedAt, text(left.createdAt))))[0];
}

function mergeGroup(values: JsonRecord[], signalClass: AIDoctorSignalClass, tasks: JsonRecord[], now: Date): JsonRecord {
  const ranked = values
    .map((value) => ({ value, score: score(value, signalClass, tasks, now).total }))
    .sort((left, right) => right.score - left.score);
  const base = { ...ranked[0]!.value };
  const issueKey = aiDoctorIssueKey(base);
  const evidenceMap = new Map<string, JsonRecord>();
  for (const value of values) {
    for (const item of evidenceOf(value)) evidenceMap.set(text(item.id), item);
  }
  const evidence = [...evidenceMap.values()];
  base.evidence = evidence;
  base.dataSources = evidence.map((entry) => ({
    id: entry.id,
    source: entry.source,
    label: entry.label,
    fact: entry.fact ?? null,
    observedAt: entry.observedAt ?? null,
    sourceUrl: entry.sourceUrl ?? null,
  }));
  base.signalClass = signalClass;
  base.issueKey = issueKey;
  base.problemFingerprint = aiDoctorProblemFingerprint(base);
  base.recommendationId = recommendationId(signalClass, issueKey);
  const countedQualityTitle = signalClass === "data_quality"
    ? values.map((value) => text(value.title, "", 140)).find((title) => /^\d+\s/.test(title))
    : "";
  base.title = signalClass === "data_quality"
    ? countedQualityTitle || text(base.title, "Улучшить качество данных", 140)
    : canonicalTitle(issueKey, text(base.title, "Проверить управленческий сигнал", 140));
  base.signalCount = Math.max(values.length, evidence.length, 1);
  const scored = score(base, signalClass, tasks, now);
  const confirmed = confidence(base);
  base.priorityScore = scored.total;
  base.priorityBreakdown = scored.breakdown;
  base.criticalOverride = scored.criticalOverride;
  base.priority = priorityLabel(scored.total, scored.criticalOverride);
  base.confidenceScore = confirmed.score;
  base.confidenceLevel = confirmed.level;
  base.confidenceReason = text(base.confidenceReason, confirmed.reason, 300);
  base.confirmationLevel = confirmed.level === "high" ? "подтверждено" : confirmed.level === "medium" ? "вероятно" : "возможная гипотеза";
  const haystack = searchable(base);
  base.impactAreas = impactAreas(haystack, signalClass);
  base.riskWithoutAction = riskLabel(scored.total, scored.criticalOverride);
  base.whyImportant = text(
    base.consequence,
    text(base.expectedEffect, evidence[0] ? `Влияние проверяется по факту: ${text(evidence[0].fact, text(evidence[0].label))}` : "Влияние пока не доказано; это гипотеза для проверки."),
    300,
  );
  base.whyNow = text(base.deadline)
    ? `Рекомендованный срок: ${humanizeValue(base.deadline)}.`
    : scored.breakdown.urgency >= 18
      ? "Проверить до ближайшей смены."
      : "Проверить в текущем рабочем цикле.";
  base.resolutionCheck = text(base.successCriterion, text(base.expectedResult, "Результат подтверждён в данных BarDoctor."), 300);
  base.financialEffect = "Финансовый эффект пока нельзя надёжно оценить.";
  base.fact = humanizeValue(text(base.fact, text(base.basisSummary, "Сигнал требует проверки"), 600));
  base.factPeriod = humanizeValue(text(base.factPeriod));
  base.recommendationDeadline = humanizeValue(text(base.deadline, text(base.estimatedTime)));
  base.deadline = text(base.recommendationDeadline, "Без срока");
  base.estimatedTime = base.recommendationDeadline;
  base.lifecycle = "new";
  return base;
}

function deriveOperationalCandidates(
  operationalInput: unknown,
  evidenceCatalog: unknown[],
  candidates: JsonRecord[],
  context: VenueAIContext,
): JsonRecord[] {
  const result = [...candidates];
  const body = record(operationalInput);
  const calendar = record(body.operatingCalendar);
  const gapDates = array(calendar.unexplainedRevenueGapDates).map((value) => text(value)).filter(Boolean);
  const hasPerformanceHistory = context.blocks.some((block) => block.id === "performanceHistory" && block.available);
  if (gapDates.length && !result.some((item) => aiDoctorIssueKey(item) === "unclosed-shifts")) {
    const evidence = evidenceCatalog.map(record).filter((entry) => ["operations:missing-shifts", "operations:coverage"].includes(text(entry.id)));
    result.push({
      title: hasPerformanceHistory ? "Закрыть незакрытые смены" : "Заполнить первые сменные отчёты",
      signalClass: "data_quality",
      priority: "high",
      fact: hasPerformanceHistory
        ? `${gapDates.length} ${gapDates.length === 1 ? "смена без отчёта" : "смены без отчёта"}: ${gapDates.slice(0, 4).map(humanizeValue).join(", ")}`
        : "История фактических смен ещё не сформирована.",
      hypothesis: hasPerformanceHistory
        ? "Незаполненные отчёты делают сравнение рабочих дней неполным."
        : "Заведение только начинает накапливать операционные данные.",
      consequence: hasPerformanceHistory
        ? "Пока отчёты не заполнены, AI не может достоверно сравнивать выручку и расходы по рабочим дням."
        : "После первых закрытых смен AI сможет сформировать исходную точку для сравнения.",
      action: hasPerformanceHistory ? "Заполнить отсутствующие сменные отчёты." : "Закрыть первую фактическую смену с отчётом.",
      steps: hasPerformanceHistory
        ? ["Проверить список смен без отчёта", "Внести отчёты или объяснение пропуска", "Обновить анализ"]
        : ["Провести первую фактическую смену", "Заполнить выручку и расходы", "Закрыть смену и обновить анализ"],
      responsibleRole: "администратор",
      deadline: hasPerformanceHistory ? "До завтра, 07:00" : "После первой фактической смены",
      successCriterion: hasPerformanceHistory
        ? "Все фактически проведённые смены закрыты или имеют зафиксированное объяснение."
        : "Первая фактическая смена закрыта с заполненным отчётом.",
      expectedResult: hasPerformanceHistory ? "Полнота смен восстановлена." : "Сформирована первая точка операционной истории.",
      evidence,
    });
  }

  const evidence = evidenceCatalog.map(record);
  const derivedIssues = [
    { key: "climate", title: "Восстановить климат в основном зале", owner: "технический специалист", check: "Оборудование работает, новых жалоб на климат нет." },
    { key: "audio", title: "Проверить караоке и микрофоны", owner: "технический специалист", check: "Звук и микрофоны проверены перед сменой, новых жалоб нет." },
  ];
  for (const definition of derivedIssues) {
    if (result.some((item) => aiDoctorIssueKey(item) === definition.key)) continue;
    const related = evidence.filter((entry) => aiDoctorIssueKey({ title: entry.label, fact: entry.fact }) === definition.key);
    const sources = new Set(related.map(sourceOf));
    if (!related.length || (!sources.has("review") && !sources.has("equipment"))) continue;
    result.push({
      title: definition.title,
      signalClass: "problem",
      fact: related.map((entry) => text(entry.fact, text(entry.label))).filter(Boolean).slice(0, 3).join(" · "),
      hypothesis: sources.has("review") && sources.has("equipment")
        ? "Гостевой сигнал совпадает с зарегистрированным состоянием оборудования."
        : "Сигнал требует проверки на месте.",
      consequence: definition.key === "climate"
        ? "Проблема влияет на гостевой опыт ближайших смен."
        : "Проблема может ухудшать гостевой опыт и программу смены.",
      action: definition.title,
      responsibleRole: definition.owner,
      deadline: "Сегодня, до следующей смены",
      successCriterion: definition.check,
      expectedResult: definition.check,
      evidence: related,
    });
  }
  return result;
}

function dataQualityCandidates(context: VenueAIContext, candidates: JsonRecord[]): JsonRecord[] {
  const result = [...candidates.filter((item) => classifyAIDoctorSignal(item) === "data_quality")];
  const menu = record(context.promptData.menuAndRecipes);
  const qualityCounts = record(menu.qualityCounts);
  const activeItems = number(menu.activeItems) ?? 0;
  const confirmedRecipes = number(menu.confirmedRecipes) ?? 0;
  const missingRecipes = number(qualityCounts.missingRecipes) ?? Math.max(0, activeItems - confirmedRecipes);
  const unmappedIngredients = number(qualityCounts.unmappedIngredients) ?? 0;
  const linkedUnitReviewIngredients = number(qualityCounts.linkedUnitReviewIngredients) ?? 0;
  const linkedPackagingReviewIngredients = number(qualityCounts.linkedPackagingReviewIngredients) ?? 0;
  const ambiguousEntityIngredients = number(qualityCounts.ambiguousEntityIngredients) ?? 0;
  const missingPurchasePrices = number(qualityCounts.missingPurchasePrices) ?? 0;
  const add = (key: string, count: number, title: string, impact: string) => {
    if (count <= 0 || result.some((item) => aiDoctorIssueKey(item) === key)) return;
    result.push({
      signalClass: "data_quality",
      title,
      fact: title,
      consequence: impact,
      action: "Улучшить данные",
      responsibleRole: "управляющий",
      deadline: "В течение недели",
      successCriterion: "Пробел устранён, достоверность анализа обновлена.",
      qualityImpact: impact,
    });
  };
  add("recipes", missingRecipes, `${missingRecipes} ${missingRecipes === 1 ? "позиция без техкарты" : "позиций без техкарт"}`, "Без техкарт AI не может надёжно оценить себестоимость меню.");
  add("ingredient-mapping", unmappedIngredients, `${unmappedIngredients} ${unmappedIngredients === 1 ? "ингредиент не связан" : "ингредиентов не связаны"} с закупками`, "Связь ingredient → purchase нужна для достоверной себестоимости.");
  add("ingredient-unit-review", linkedUnitReviewIngredients, `${linkedUnitReviewIngredients} ${linkedUnitReviewIngredients === 1 ? "связанная позиция требует" : "связанных позиций требуют"} уточнения нормы`, "Товар найден, но себестоимость нельзя рассчитать до подтверждения единицы или количества.");
  add("ingredient-packaging-review", linkedPackagingReviewIngredients, `${linkedPackagingReviewIngredients} ${linkedPackagingReviewIngredients === 1 ? "связанная позиция требует" : "связанных позиций требуют"} выбора фасовки`, "Товар найден, но для пересчёта нормы нужно выбрать подтверждённую фасовку.");
  add("ingredient-candidates", ambiguousEntityIngredients, `${ambiguousEntityIngredients} ${ambiguousEntityIngredients === 1 ? "ингредиент имеет несколько кандидатов" : "ингредиентов имеют несколько кандидатов"}`, "Нужно подтвердить конкретную номенклатурную позицию без автоматического угадывания.");
  add("purchase-prices", missingPurchasePrices, `${missingPurchasePrices} ${missingPurchasePrices === 1 ? "ингредиент без закупочной цены" : "ингредиентов без закупочных цен"}`, "Без подтверждённых цен финансовый эффект рекомендаций нельзя считать надёжно.");

  for (const block of context.blocks) {
    if (block.available && block.freshness !== "stale") continue;
    const assortmentGapAlreadyExplained = result.some((item) =>
      ["recipes", "ingredient-mapping", "purchase-prices"].includes(aiDoctorIssueKey(item))
    );
    if (block.available && assortmentGapAlreadyExplained && ["menuAndRecipes", "salesAndCost"].includes(block.id)) continue;
    result.push({
      signalClass: "data_quality",
      title: block.available ? `${block.label}: данные давно не обновлялись` : block.detail,
      fact: block.detail,
      consequence: `Пробел снижает достоверность выводов по разделу «${block.label}».`,
      action: block.missingAction ?? `Обновить данные: ${block.label}`,
      responsibleRole: "управляющий",
      deadline: "В течение недели",
      successCriterion: `${block.label}: данные доступны и актуальны.`,
    });
  }
  return result;
}

function dataReliabilityPercent(context: VenueAIContext): number {
  if (!context.blocks.length) return 0;
  const menu = record(context.promptData.menuAndRecipes);
  const activeItems = number(menu.activeItems) ?? 0;
  const confirmedRecipes = number(menu.confirmedRecipes) ?? 0;
  const explicitRecipeCoverage = number(menu.recipeCoveragePercent);
  const recipeCoverage = explicitRecipeCoverage !== null
    ? Math.max(0, Math.min(100, explicitRecipeCoverage)) / 100
    : activeItems > 0
      ? Math.max(0, Math.min(1, confirmedRecipes / activeItems))
      : 0;
  const salesAndCost = record(context.promptData.salesAndCost);

  const total = context.blocks.reduce((sum, block) => {
    if (!block.available) return sum;
    let value = block.freshness === "fresh"
      ? 1
      : block.freshness === "aging"
        ? 0.7
        : 0.35;
    if (block.id === "menuAndRecipes") value *= 0.55 + recipeCoverage * 0.45;
    if (block.id === "salesAndCost" && salesAndCost.costDataAvailable === false) value *= 0.65;
    return sum + value;
  }, 0);
  return Math.max(0, Math.min(100, Math.round(total / context.blocks.length * 100)));
}

function taskAsRecommendation(task: JsonRecord): JsonRecord {
  return {
    ...task,
    signalClass: classifyAIDoctorSignal(task),
    recommendationId: text(task.recommendationId, recommendationId("problem", aiDoctorIssueKey(task))),
    title: canonicalTitle(aiDoctorIssueKey(task), text(task.title, "Рекомендация AI Doctor")),
    responsibleRole: text(task.responsibleRole, text(task.responsible, "Не назначен")),
    successCriterion: text(task.successCriterion, text(task.expectedResult, "Проверить результат в BarDoctor")),
    evidence: evidenceOf(task),
  };
}

function humanDate(value: unknown): string {
  const source = text(value);
  const parsed = Date.parse(source);
  if (!Number.isFinite(parsed)) return humanizeValue(source);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(parsed));
}

export function humanizeValue(value: unknown): string {
  const source = text(value);
  if (!source) return "";
  const exactIso = source.match(/^\d{4}-\d{2}-\d{2}(?:T[^ ]+)?$/);
  if (exactIso && Number.isFinite(Date.parse(source))) {
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(source));
  }
  return source
    .replace(/(\d+(?:[.,]\d+)?)\s+monetary units?/gi, (_match, amount: string) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(Number(amount.replace(",", ".")))} ₽`)
    .replace(/coveragePercent\s*=\s*(\d+(?:[.,]\d+)?)/gi, "Заполнено только $1% смен")
    .replace(/\bcomplaint\b/gi, "жалоба")
    .replace(/\bcritical\b/gi, "критический приоритет")
    .replace(/\bhigh\b/gi, "высокий приоритет")
    .replace(/\bmedium\b/gi, "средний приоритет")
    .replace(/\blow\b/gi, "низкий приоритет")
    .replace(/\bin_progress\b/gi, "в работе")
    .replace(/\bopen\b/gi, "открыто")
    .replace(/\bclosed\b/gi, "закрыто")
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, (match) => humanDate(match));
}

function diagnosticSentence(priorities: JsonRecord[], opportunities: JsonRecord[]): string {
  if (priorities.length) {
    const first = priorities[0]!;
    const areas = array(first.impactAreas).map((item) => text(item)).filter(Boolean);
    const focus = areas.includes("Гости") ? "гостевой опыт" : areas.includes("Финансы") ? "финансовый результат" : "операционная работа";
    return `Главный риск сейчас — ${focus}. ${text(first.whyImportant, text(first.consequence, "Нужно проверить ближайшее действие."), 180)}`;
  }
  if (opportunities.length) return `Критичных проблем не обнаружено. Главная возможность сейчас — ${text(opportunities[0]!.title).toLocaleLowerCase("ru")}.`;
  return "Критичных отклонений не обнаружено. Продолжайте следить за ключевыми показателями.";
}

function historyFrom(tasks: JsonRecord[], now: Date): JsonRecord[] {
  return tasks
    .filter((task) => task.aiGenerated === true || Boolean(text(task.recommendationId)))
    .sort((left, right) => text(right.updatedAt, text(right.createdAt)).localeCompare(text(left.updatedAt, text(left.createdAt))))
    .slice(0, 20)
    .map((task) => {
      const lifecycle = lifecycleForTask(task, now);
      const outcome = record(task.actualResult);
      return {
        recommendationId: text(task.recommendationId, text(task.id)),
        title: text(task.title, "Рекомендация AI Doctor"),
        lifecycle,
        decidedAt: humanDate(task.updatedAt ?? task.createdAt),
        responsible: text(task.responsible, text(task.responsibleRole, "Не назначен")),
        outcomeStatus: text(outcome.status, text(task.outcomeStatus, "pending")),
        outcomeSummary: humanizeValue(text(outcome.summary)),
      };
    });
}

function uniqueProblems(items: JsonRecord[]): JsonRecord[] {
  const byFingerprint = new Map<string, JsonRecord>();
  for (const item of items) {
    const fingerprint = text(item.problemFingerprint, aiDoctorProblemFingerprint(item));
    const existing = byFingerprint.get(fingerprint);
    if (!existing || text(item.updatedAt, text(item.createdAt)) > text(existing.updatedAt, text(existing.createdAt))) {
      byFingerprint.set(fingerprint, item);
    }
  }
  return [...byFingerprint.values()];
}

function operationalProblemRow(item: JsonRecord): JsonRecord {
  const lifecycle = text(item.lifecycle, "new");
  return {
    canonicalProblemId: text(item.problemFingerprint, aiDoctorProblemFingerprint(item)),
    recommendationId: text(item.recommendationId),
    issueKey: text(item.issueKey, aiDoctorIssueKey(item)),
    title: humanizeValue(text(item.title, "Операционная проблема")),
    status: lifecycle,
    signalCount: Math.max(1, Math.round(number(item.signalCount) ?? number(item.historyCount) ?? 1)),
    taskStatus: text(item.linkedTaskId) ? (lifecycle === "overdue" ? "Просрочено" : "Задача создана") : "Задача не создана",
    responsible: humanizeValue(text(item.responsibleRole, "Не назначен")),
    timeBucket: text(item.timeBucket, "backlog"),
    deadlineSources: array(item.deadlineSources).map(record),
    nextCheck: humanizeValue(text(item.resolutionCheck, text(item.successCriterion, "Назначить следующую проверку"))),
    priority: text(item.priority, "medium"),
    fact: humanizeValue(text(item.fact)),
  };
}

export function buildAIDoctorAttention(input: {
  candidates: unknown[];
  context: VenueAIContext;
  memory?: AIDoctorMemory;
  operationalInput?: unknown;
  evidenceCatalog?: unknown[];
  areas?: unknown[];
  dataReliabilityPercent?: number;
  now?: Date;
}): AIDoctorAttention {
  const now = input.now ?? new Date();
  const memory = input.memory ?? { tasks: [], actionTasks: [], decisions: [] };
  const rawTasks = [...memory.tasks, ...memory.actionTasks].map(record);
  const taskByIdentity = new Map<string, JsonRecord>();
  for (const task of rawTasks) {
    const identity = text(task.recommendationId) || text(task.id) || `task:${taskByIdentity.size + 1}`;
    const existing = taskByIdentity.get(identity);
    if (!existing || text(task.updatedAt, text(task.createdAt)) > text(existing.updatedAt, text(existing.createdAt))) {
      taskByIdentity.set(identity, task);
    }
  }
  const tasks = [...taskByIdentity.values()];
  const baseCandidates = deriveOperationalCandidates(
    input.operationalInput,
    input.evidenceCatalog ?? [],
    input.candidates.map(record),
    input.context,
  );
  for (const value of input.areas ?? []) {
    const area = record(value);
    if (area.status !== "risk" && area.status !== "opportunity") continue;
    baseCandidates.push({
      title: text(area.action, text(area.label, "Управленческий сигнал")),
      signalClass: area.status === "opportunity" ? "opportunity" : "problem",
      fact: area.fact,
      hypothesis: area.hypothesis,
      consequence: area.consequence,
      action: area.action,
      successCriterion: area.verification,
      responsibleRole: "управляющий",
      deadline: area.status === "risk" ? "В течение 2 дней" : "В течение недели",
      evidence: area.evidence,
    });
  }

  const groups = new Map<string, JsonRecord[]>();
  for (const candidate of baseCandidates) {
    if (!text(candidate.title) && !text(candidate.action)) continue;
    const signalClass = classifyAIDoctorSignal(candidate);
    if (signalClass === "data_quality") continue;
    const key = `${signalClass}:${aiDoctorProblemFingerprint(candidate)}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const merged = [...groups.entries()].map(([key, values]) => mergeGroup(
    values,
    key.startsWith("opportunity:") ? "opportunity" : "problem",
    tasks,
    now,
  ));

  const actionable: JsonRecord[] = [];
  const inProgress: JsonRecord[] = [];
  const opportunities: JsonRecord[] = [];
  const matchedTaskIds = new Set<string>();
  for (const candidate of merged) {
    const task = newestTaskFor(candidate, tasks);
    if (task) {
      const fingerprint = aiDoctorProblemFingerprint(candidate);
      for (const related of tasks) {
        if (
          text(related.recommendationId) === text(candidate.recommendationId)
          || aiDoctorProblemFingerprint(related) === fingerprint
        ) {
          if (text(related.id)) matchedTaskIds.add(text(related.id));
        }
      }
    }
    let lifecycle = lifecycleForTask(task, now);
    const taskOutcome = text(record(task?.actualResult).status, text(task?.outcomeStatus));
    const taskUpdatedAt = Date.parse(text(task?.updatedAt, text(task?.createdAt)));
    const newestEvidenceAt = Math.max(
      ...evidenceOf(candidate)
        .map((entry) => Date.parse(text(entry.observedAt)))
        .filter(Number.isFinite),
      Number.NEGATIVE_INFINITY,
    );
    const hasNewEvidence = Number.isFinite(taskUpdatedAt)
      && Number.isFinite(newestEvidenceAt)
      && newestEvidenceAt > taskUpdatedAt;
    if (task && text(task.status) === "completed" && taskOutcome === "helped" && hasNewEvidence) {
      lifecycle = "reopened";
      candidate.resultMessage = "После закрытия появилась новая фактическая точка: проблема открыта повторно.";
    } else if (task && text(task.status) === "completed" && taskOutcome === "not_helped" && hasNewEvidence) {
      lifecycle = "reopened";
      candidate.resultMessage = "Предыдущее действие не помогло, а новое измерение подтверждает проблему. Нужна другая гипотеза.";
    } else if (task && text(task.status) === "completed" && taskOutcome === "not_helped") {
      lifecycle = "verify_result";
      candidate.resultMessage = "Действие не помогло; повтор той же рекомендации подавлен до появления нового факта.";
    }
    candidate.lifecycle = lifecycle;
    candidate.linkedTaskId = text(task?.id) || null;
    candidate.responsibleRole = text(task?.responsible, text(candidate.responsibleRole, "управляющий"));
    candidate.recommendationDeadline = humanizeValue(text(candidate.recommendationDeadline, text(candidate.deadline)));
    candidate.taskDeadline = task ? humanizeValue(task.deadline) : "";
    candidate.verificationDeadline = humanizeValue(task?.verificationDate ?? candidate.verificationDate);
    candidate.taskDeadlineDate = dateOnly(task?.deadline);
    candidate.verificationDeadlineDate = dateOnly(task?.verificationDate ?? candidate.verificationDate);
    candidate.canonicalDeadlineDate = candidate.taskDeadlineDate ?? candidate.verificationDeadlineDate ?? dateOnly(candidate.deadline);
    candidate.deadlineDate = candidate.canonicalDeadlineDate;
    candidate.deadline = text(candidate.taskDeadline, text(candidate.recommendationDeadline, "Без срока"));
    candidate.deadlineSources = [
      text(candidate.recommendationDeadline) ? { kind: "recommendation", label: "Рекомендованный срок", value: candidate.recommendationDeadline } : null,
      text(candidate.taskDeadline) ? { kind: "task", label: "Срок задачи", value: candidate.taskDeadline } : null,
      text(candidate.verificationDeadline) ? { kind: "verification", label: "Дата проверки результата", value: candidate.verificationDeadline } : null,
    ].filter(Boolean);
    candidate.whyNow = text(candidate.taskDeadline)
      ? `Срок задачи: ${candidate.taskDeadline}.`
      : text(candidate.recommendationDeadline)
        ? `Рекомендованный срок: ${candidate.recommendationDeadline}.`
        : "Срок не назначен; задача остаётся в backlog.";
    candidate.timeBucket = timeBucketFor(candidate, now);
    if (candidate.signalClass === "opportunity") {
      if (!ACTIVE_LIFECYCLES.has(lifecycle)) opportunities.push(candidate);
      else inProgress.push(candidate);
      continue;
    }
    if (lifecycle === "accepted" || lifecycle === "in_progress" || lifecycle === "verify_result") inProgress.push(candidate);
    else if (lifecycle !== "rejected" && lifecycle !== "closed") actionable.push(candidate);
  }

  const unmatchedActiveGroups = new Map<string, JsonRecord[]>();
  for (const task of tasks) {
    if (text(task.id) && matchedTaskIds.has(text(task.id))) continue;
    if (!ACTIVE_LIFECYCLES.has(lifecycleForTask(task, now))) continue;
    const key = aiDoctorProblemFingerprint(task);
    unmatchedActiveGroups.set(key, [...(unmatchedActiveGroups.get(key) ?? []), task]);
  }
  for (const groupedTasks of unmatchedActiveGroups.values()) {
    const task = groupedTasks
      .slice()
      .sort((left, right) => text(right.updatedAt, text(right.createdAt)).localeCompare(text(left.updatedAt, text(left.createdAt))))[0]!;
    const lifecycle = lifecycleForTask(task, now);
    const candidate = mergeGroup(groupedTasks.map(taskAsRecommendation), "problem", tasks, now);
    candidate.lifecycle = lifecycle;
    candidate.linkedTaskId = text(task.id) || null;
    candidate.linkedTaskIds = groupedTasks.map((item) => text(item.id)).filter(Boolean);
    candidate.historyCount = groupedTasks.length;
    candidate.recommendationDeadline = humanizeValue(candidate.recommendationDeadline ?? candidate.deadline);
    candidate.taskDeadline = humanizeValue(task.deadline);
    candidate.verificationDeadline = humanizeValue(task.verificationDate);
    candidate.taskDeadlineDate = dateOnly(task.deadline);
    candidate.verificationDeadlineDate = dateOnly(task.verificationDate);
    candidate.canonicalDeadlineDate = candidate.taskDeadlineDate ?? candidate.verificationDeadlineDate;
    candidate.deadlineDate = candidate.canonicalDeadlineDate;
    candidate.deadline = text(candidate.taskDeadline, text(candidate.recommendationDeadline, "Без срока"));
    candidate.deadlineSources = [
      text(candidate.recommendationDeadline) ? { kind: "recommendation", label: "Рекомендованный срок", value: candidate.recommendationDeadline } : null,
      text(candidate.taskDeadline) ? { kind: "task", label: "Срок задачи", value: candidate.taskDeadline } : null,
      text(candidate.verificationDeadline) ? { kind: "verification", label: "Дата проверки результата", value: candidate.verificationDeadline } : null,
    ].filter(Boolean);
    candidate.whyNow = text(candidate.taskDeadline)
      ? `Срок задачи: ${candidate.taskDeadline}.`
      : text(candidate.recommendationDeadline)
        ? `Рекомендованный срок: ${candidate.recommendationDeadline}.`
        : "Срок не назначен; задача остаётся в backlog.";
    candidate.timeBucket = timeBucketFor(candidate, now);
    if (lifecycle === "overdue" || (lifecycle === "verify_result" && text(record(task.actualResult).status) === "not_helped")) {
      if (lifecycle === "overdue") candidate.resultMessage = "Срок прошёл, а результат ещё не подтверждён.";
      actionable.push(candidate);
    } else {
      inProgress.push(candidate);
    }
  }

  // A single local event can arrive both as a risk and as an opportunity from
  // different diagnosis layers. Keep the risk in the manager's priorities and
  // suppress its duplicate opportunity instead of asking for the same plan twice.
  const actionableIssueKeys = new Set(actionable.map((item) => aiDoctorIssueKey(item)));
  for (let index = opportunities.length - 1; index >= 0; index -= 1) {
    if (actionableIssueKeys.has(aiDoctorIssueKey(opportunities[index]))) opportunities.splice(index, 1);
  }

  actionable.sort((left, right) => {
    const override = Number(right.criticalOverride === true) - Number(left.criticalOverride === true);
    if (override) return override;
    return (number(right.priorityScore) ?? 0) - (number(left.priorityScore) ?? 0);
  });
  opportunities.sort((left, right) => (number(right.priorityScore) ?? 0) - (number(left.priorityScore) ?? 0));
  inProgress.sort((left, right) => text(left.deadlineDate, "9999-12-31").localeCompare(text(right.deadlineDate, "9999-12-31")));

  const rawDataQuality = dataQualityCandidates(input.context, baseCandidates);
  const qualityGroups = new Map<string, JsonRecord[]>();
  for (const candidate of rawDataQuality) {
    const key = `data_quality:${aiDoctorIssueKey(candidate)}`;
    qualityGroups.set(key, [...(qualityGroups.get(key) ?? []), candidate]);
  }
  const dataQuality = [...qualityGroups.values()]
    .map((values) => mergeGroup(values, "data_quality", tasks, now))
    .sort((left, right) => (number(right.priorityScore) ?? 0) - (number(left.priorityScore) ?? 0))
    .slice(0, 8);

  const activeProblemCandidates = uniqueProblems([...actionable, ...inProgress])
    .filter((item) => classifyAIDoctorSignal(item) === "problem")
    .filter((item) => item.stale !== true && item.superseded !== true && !text(item.supersededBy));
  const timeBuckets = {
    today: activeProblemCandidates.filter((item) => text(item.timeBucket) === "today"),
    overdue: activeProblemCandidates.filter((item) => text(item.timeBucket) === "overdue"),
    upcoming: activeProblemCandidates.filter((item) => text(item.timeBucket) === "upcoming"),
    backlog: activeProblemCandidates.filter((item) => text(item.timeBucket) === "backlog"),
  };
  const priorities = actionable.filter((item) => text(item.timeBucket) === "today").slice(0, 3);
  const businessIssueKeys = new Set(["profit", "revenue", "traffic", "average-check", "demand-and-average-check", "external-traffic-risk"]);
  const activeProblems = activeProblemCandidates
    .filter((item) => !businessIssueKeys.has(aiDoctorIssueKey(item)))
    .map(operationalProblemRow)
    .slice(0, 12);
  const critical = actionable.filter((item) => item.criticalOverride === true).length;
  const important = actionable.filter((item) => (number(item.priorityScore) ?? 0) >= 45 && item.criticalOverride !== true).length;
  const stable = (input.areas ?? [])
    .map(record)
    .filter((area) => area.status === "stable").length;
  const reliabilityPercent = Number.isFinite(input.dataReliabilityPercent)
    ? Math.max(0, Math.min(100, Math.round(input.dataReliabilityPercent!)))
    : dataReliabilityPercent(input.context);

  return {
    version: "ai-doctor-attention-v1",
    updatedAt: now.toISOString(),
    diagnosticSentence: diagnosticSentence(priorities, opportunities),
    counts: {
      requiresAttention: actionable.length,
      critical,
      important,
      stable,
      moreSignals: Math.max(0, actionable.length - priorities.length),
    },
    priorities,
    inProgress: inProgress.slice(0, 12),
    activeProblems,
    timeBuckets: {
      today: timeBuckets.today.slice(0, 12),
      overdue: timeBuckets.overdue.slice(0, 12),
      upcoming: timeBuckets.upcoming.slice(0, 12),
      backlog: timeBuckets.backlog.slice(0, 12),
    },
    opportunities: opportunities.slice(0, 8),
    dataQuality: {
      reliabilityPercent,
      items: dataQuality,
    },
    history: historyFrom(tasks, now),
  };
}

function parsedArray(value: string): JsonRecord[] {
  try {
    return array(JSON.parse(value) as unknown).map(record);
  } catch {
    return [];
  }
}

export async function loadAIDoctorMemory(account: Account): Promise<AIDoctorMemory> {
  const { getDb } = await import("../../db");
  const keys = ["bd_tasks", "bd_action_tasks", "bd_decisions"];
  const rows = await getDb()
    .select({ storeKey: domainData.storeKey, dataJson: domainData.dataJson })
    .from(domainData)
    .where(and(
      eq(domainData.accountId, account.id),
      inArray(domainData.storeKey, keys),
    ));
  const byKey = new Map(rows.map((row) => [row.storeKey, parsedArray(row.dataJson)]));
  return {
    tasks: byKey.get("bd_tasks") ?? [],
    actionTasks: byKey.get("bd_action_tasks") ?? [],
    decisions: byKey.get("bd_decisions") ?? [],
  };
}

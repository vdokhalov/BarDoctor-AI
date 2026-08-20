import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { domainData } from "../../db/schema";
import {
  cancelScheduledPush,
  getNotificationPreferences,
  oneSignalAccountConfig,
} from "./notifications";
import {
  cancelNotificationJobsForSource,
  dispatchNotificationJobs,
  enqueueNotificationJob,
  notificationJobsForSource,
} from "./notification-jobs";
import {
  OPPORTUNITY_CALENDAR_VERSION,
  OPPORTUNITY_SEARCH_RADIUS_KM,
  opportunityVenueProfileSignature,
  type OpportunityVenueContext,
} from "./opportunity-baseline";
import { discoveredOpportunityIsRelevant } from "./opportunity-relevance";
import { zonedDateTimeToUtc } from "./notification-time";
import { resolveOpportunitySourceUrls } from "./opportunity-sources";

export const OPPORTUNITY_CALENDAR_KEY = "bd_opportunity_calendar_v1";

type JsonRecord = Record<string, unknown>;

export type OpportunitySource = {
  url: string;
  title?: string;
};

export type ScheduledOpportunityMessage = {
  kind: "decision" | "prepare" | "final";
  sendAt: string;
  dedupeKey: string;
  providerMessageId: string;
};

export type OpportunityEvent = {
  id: string;
  title: string;
  category: string;
  calendarType: "official" | "local" | "commercial" | "discovered";
  origin: "baseline" | "web";
  startDate: string;
  endDate: string | null;
  activationDate: string;
  startTime: string | null;
  location: string;
  locality: string;
  relation: {
    mode: "local_demand" | "venue_activation" | "regional_interest";
    distanceKm: number | null;
    reason: string;
  };
  audience: string;
  summary: string;
  potentialScore: number;
  potentialLabel: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  scoreReason: string;
  scoreBreakdown: {
    audienceFit: number;
    scheduleFit: number;
    proximity: number;
    commercialPotential: number;
    readiness: number;
  };
  whyUseful: string[];
  impact: {
    level: "high" | "medium" | "low";
    metric: string;
    range: string;
    basis: string;
  };
  recommendation: {
    format: string;
    offer: string;
    promotion: string;
    operations: string;
    decisionDeadline: string | null;
    leadDays: number;
  };
  risks: string[];
  sourceUrls: string[];
  decision: "watching" | "planned" | "dismissed";
  decisionUpdatedAt: string | null;
  notificationPlan: {
    status: "scheduled" | "queued" | "disabled" | "not_needed" | "error";
    count: number;
    queuedCount?: number;
    nextAt: string | null;
    signature: string;
    messages: ScheduledOpportunityMessage[];
    error?: string;
  };
};

export type OpportunityCalendar = {
  version: typeof OPPORTUNITY_CALENDAR_VERSION;
  venueName: string;
  locationLabel: string;
  profileSignature: string;
  searchRadiusKm: number;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  model: string;
  summary: string;
  events: OpportunityEvent[];
  deletedEventIds?: string[];
  sources: OpportunitySource[];
  notificationSummary?: {
    scheduled: number;
    queued?: number;
    nextAt: string | null;
    enabled: boolean;
  };
};

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown, fallback = "", limit = 1_500): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function numeric(value: unknown, fallback = 0): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function nullableNumeric(value: unknown): number | null {
  const result = typeof value === "number" ? value : typeof value === "string" && value.trim()
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(result) ? result : null;
}

function bounded(value: unknown, minimum: number, maximum: number, fallback = minimum): number {
  return Math.max(minimum, Math.min(maximum, Math.round(numeric(value, fallback))));
}

function list(value: unknown, limit = 8, itemLimit = 420): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, itemLimit))
        .slice(0, limit)
    : [];
}

function validDate(value: unknown): string | null {
  const candidate = text(value, "", 24).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  if (!candidate) return null;
  const parsed = new Date(`${candidate}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

function validTime(value: unknown): string | null {
  const candidate = text(value, "", 12);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : null;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function eventId(date: string, title: string): string {
  return `opp_${date.replace(/-/g, "")}_${hash(`${date}|${title.toLocaleLowerCase("ru")}`)}`;
}

function dateDistance(left: string, right: string): number {
  return Math.round(Math.abs(
    new Date(`${left}T12:00:00Z`).getTime() - new Date(`${right}T12:00:00Z`).getTime(),
  ) / 86_400_000);
}

function potentialLabel(score: number): "high" | "medium" | "low" {
  return score >= 75 ? "high" : score >= 55 ? "medium" : "low";
}

function confidence(value: unknown): "high" | "medium" | "low" {
  const candidate = text(value).toLowerCase();
  return candidate === "high" || candidate === "medium" || candidate === "low"
    ? candidate
    : "medium";
}

function scheduleSignature(event: Pick<OpportunityEvent,
  "id" | "startDate" | "activationDate" | "decision" | "potentialScore" | "recommendation"
>): string {
  return [
    event.id,
    event.startDate,
    event.activationDate,
    event.decision,
    event.potentialScore,
    event.recommendation.decisionDeadline ?? "",
    event.recommendation.leadDays,
  ].join("|");
}

function emptyNotificationPlan(signature: string): OpportunityEvent["notificationPlan"] {
  return {
    status: "not_needed",
    count: 0,
    queuedCount: 0,
    nextAt: null,
    signature,
    messages: [],
  };
}

export function normaliseOpportunityCalendar(input: {
  raw: unknown;
  sources: OpportunitySource[];
  previous: OpportunityCalendar | null;
  venueName: string;
  locationLabel: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  model: string;
  venueContext: OpportunityVenueContext;
}): OpportunityCalendar {
  const raw = record(input.raw) ?? {};
  const previousById = new Map((input.previous?.events ?? []).map((event) => [event.id, event]));
  const previousByDateTitle = new Map(
    (input.previous?.events ?? []).map((event) => [
      `${event.startDate}|${event.title.toLocaleLowerCase("ru")}`,
      event,
    ]),
  );
  const categories = new Set(["holiday", "sport", "concert", "festival", "city", "seasonal", "other"]);
  const localities = new Set(["local", "regional", "national", "online"]);
  const calendarTypes = new Set(["official", "local", "commercial", "discovered"]);
  const relationModes = new Set(["local_demand", "venue_activation", "regional_interest"]);
  const seen = new Set<string>();
  const deletedEventIds = new Set(input.previous?.deletedEventIds ?? []);

  const events = (Array.isArray(raw.events) ? raw.events : [])
    .map(record)
    .filter((event): event is JsonRecord => Boolean(event))
    .map((event) => {
      const title = text(event.title, "", 180);
      const startDate = validDate(event.startDate);
      if (!title || !startDate || startDate < input.windowStart || startDate > input.windowEnd) return null;
      const id = eventId(startDate, title);
      if (deletedEventIds.has(id)) return null;
      if (seen.has(id)) return null;
      seen.add(id);
      const urls = resolveOpportunitySourceUrls(event.sourceUrls, input.sources);
      if (!urls.length) return null;

      const category = categories.has(text(event.category)) ? text(event.category) : "other";
      const origin = text(event.origin) === "baseline" ? "baseline" : "web";
      const location = text(event.location, input.locationLabel, 240);
      const relationRaw = record(event.relation) ?? {};
      let relationMode = relationModes.has(text(relationRaw.mode))
        ? text(relationRaw.mode)
        : origin === "baseline"
          ? "venue_activation"
          : "regional_interest";
      const distanceKmRaw = nullableNumeric(relationRaw.distanceKm);
      const distanceKm = distanceKmRaw === null ? null : Math.max(0, Math.round(distanceKmRaw * 10) / 10);
      if (origin === "web" && !discoveredOpportunityIsRelevant({
        category,
        location,
        city: input.venueContext.city,
        relationMode,
        distanceKm,
      })) return null;
      if (origin === "baseline" && relationMode === "regional_interest") relationMode = "venue_activation";

      const impactRaw = record(event.impact) ?? {};
      const recommendationRaw = record(event.recommendation) ?? {};
      const breakdownRaw = record(event.scoreBreakdown) ?? {};
      const scoreBreakdown = {
        audienceFit: bounded(breakdownRaw.audienceFit, 0, 30, 0),
        scheduleFit: bounded(breakdownRaw.scheduleFit, 0, 20, 0),
        proximity: bounded(breakdownRaw.proximity, 0, 20, 0),
        commercialPotential: bounded(breakdownRaw.commercialPotential, 0, 20, 0),
        readiness: bounded(breakdownRaw.readiness, 0, 10, 0),
      };
      if (origin === "web" && relationMode === "local_demand" && distanceKm !== null) {
        if (distanceKm > 20) scoreBreakdown.proximity = Math.min(scoreBreakdown.proximity, 8);
        else if (distanceKm > 10) scoreBreakdown.proximity = Math.min(scoreBreakdown.proximity, 14);
      }
      const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
      const endDate = validDate(event.endDate);
      const requestedActivation = validDate(event.activationDate);
      const activationDate = requestedActivation && dateDistance(requestedActivation, startDate) <= 7
        ? requestedActivation
        : startDate;
      const previous = previousById.get(id)
        ?? previousByDateTitle.get(`${startDate}|${title.toLocaleLowerCase("ru")}`);
      const decision = previous?.decision ?? "watching";
      const recommendation = {
        format: text(recommendationRaw.format, "Определить формат после проверки спроса.", 700),
        offer: text(recommendationRaw.offer, "Собрать понятное предложение без лишней скидки.", 700),
        promotion: text(recommendationRaw.promotion, "Анонсировать событие в основных каналах заведения.", 700),
        operations: text(recommendationRaw.operations, "Проверить команду, запасы и технические требования.", 700),
        decisionDeadline: validDate(recommendationRaw.decisionDeadline),
        leadDays: bounded(recommendationRaw.leadDays, 1, 60, 14),
      };

      const normalised: OpportunityEvent = {
        id,
        title,
        category,
        calendarType: calendarTypes.has(text(event.calendarType))
          ? text(event.calendarType) as OpportunityEvent["calendarType"]
          : origin === "baseline" ? "official" : "discovered",
        origin,
        startDate,
        endDate: endDate && endDate >= startDate ? endDate : null,
        activationDate,
        startTime: validTime(event.startTime),
        location,
        locality: localities.has(text(event.locality)) ? text(event.locality) : "local",
        relation: {
          mode: relationMode as OpportunityEvent["relation"]["mode"],
          distanceKm,
          reason: text(
            relationRaw.reason,
            relationMode === "venue_activation"
              ? "Повод можно реализовать внутри заведения; его эффект нужно проверить по фактической смене."
              : "Событие находится в локальной зоне заведения.",
            700,
          ),
        },
        audience: text(event.audience, "Потенциальная аудитория требует проверки.", 500),
        summary: text(event.summary, "Подтверждённое событие в зоне интереса заведения.", 900),
        potentialScore: score,
        potentialLabel: potentialLabel(score),
        confidence: confidence(event.confidence),
        scoreReason: text(event.scoreReason, "Оценка основана на соответствии формату, дате и локации.", 900),
        scoreBreakdown,
        whyUseful: list(event.whyUseful, 6),
        impact: {
          level: potentialLabel(bounded(impactRaw.score, 0, 100, score)),
          metric: text(impactRaw.metric, "Поток гостей и выручка смены", 180),
          range: text(impactRaw.range, "Без точного диапазона до проверки спроса", 180),
          basis: text(impactRaw.basis, "Оценка-гипотеза; подтвердите результат фактическими данными смены.", 700),
        },
        recommendation,
        risks: list(event.risks, 5),
        sourceUrls: urls,
        decision,
        decisionUpdatedAt: previous?.decisionUpdatedAt ?? null,
        notificationPlan: emptyNotificationPlan(""),
      };
      normalised.notificationPlan = emptyNotificationPlan(scheduleSignature(normalised));
      return normalised;
    })
    .filter((event): event is OpportunityEvent => Boolean(event))
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || right.potentialScore - left.potentialScore)
    .slice(0, 24);

  return {
    version: OPPORTUNITY_CALENDAR_VERSION,
    venueName: input.venueName,
    locationLabel: input.locationLabel,
    profileSignature: opportunityVenueProfileSignature(input.venueContext),
    searchRadiusKm: OPPORTUNITY_SEARCH_RADIUS_KM,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    generatedAt: input.generatedAt,
    model: input.model,
    summary: text(raw.summary, events.length
      ? "BarDoctor нашёл подтверждённые поводы и оценил их применимость для заведения."
      : "Подтверждённых событий в выбранном периоде пока не найдено.", 1_000),
    events,
    deletedEventIds: [...deletedEventIds].slice(-200),
    sources: input.sources,
  };
}

export async function loadOpportunityCalendar(accountId: number): Promise<OpportunityCalendar | null> {
  const [row] = await getDb()
    .select({ dataJson: domainData.dataJson })
    .from(domainData)
    .where(and(
      eq(domainData.accountId, accountId),
      eq(domainData.storeKey, OPPORTUNITY_CALENDAR_KEY),
    ))
    .limit(1);
  if (!row) return null;
  try {
    return JSON.parse(row.dataJson) as OpportunityCalendar;
  } catch {
    return null;
  }
}

export async function saveOpportunityCalendar(
  accountId: number,
  calendar: OpportunityCalendar,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await getDb()
    .insert(domainData)
    .values({
      accountId,
      storeKey: OPPORTUNITY_CALENDAR_KEY,
      dataJson: JSON.stringify(calendar),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [domainData.accountId, domainData.storeKey],
      set: { dataJson: JSON.stringify(calendar), updatedAt },
    });
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function notificationCandidates(event: OpportunityEvent): Array<{
  kind: ScheduledOpportunityMessage["kind"];
  date: string;
}> {
  if (event.decision === "dismissed") return [];
  const deadline = event.recommendation.decisionDeadline
    ?? addDays(event.activationDate, -event.recommendation.leadDays);
  if (event.decision === "planned") {
    return [
      { kind: "decision", date: deadline },
      { kind: "prepare", date: addDays(event.activationDate, -7) },
      { kind: "final", date: addDays(event.activationDate, -2) },
    ];
  }
  return event.potentialScore >= 75 ? [{ kind: "decision", date: deadline }] : [];
}

function scheduledAt(date: string, timezone: string): string {
  return zonedDateTimeToUtc(date, "09:00", timezone);
}

function notificationTitle(kind: ScheduledOpportunityMessage["kind"]): string {
  if (kind === "decision") return "Возможность: пора принять решение";
  if (kind === "prepare") return "Проверьте подготовку к событию";
  return "Событие уже близко";
}

function notificationMessage(event: OpportunityEvent, kind: ScheduledOpportunityMessage["kind"]): string {
  if (kind === "decision") {
    return `${event.title} · потенциал ${event.potentialScore}/100. ${event.recommendation.format}`.slice(0, 360);
  }
  if (kind === "prepare") {
    return `${event.title}: ${event.recommendation.operations}`.slice(0, 360);
  }
  return `${event.title} через два дня. Проверьте команду, анонс и готовность предложения.`.slice(0, 360);
}

function sameSignature(left: OpportunityEvent, right: OpportunityEvent): boolean {
  return scheduleSignature(left) === scheduleSignature(right);
}

async function cancelEventMessages(accountId: number, event: OpportunityEvent): Promise<void> {
  for (const message of event.notificationPlan?.messages ?? []) {
    await cancelScheduledPush(accountId, message.providerMessageId, message.dedupeKey);
  }
}

export async function reconcileOpportunityNotifications(input: {
  accountId: number;
  venueId?: number | null;
  origin: string;
  previous: OpportunityCalendar | null;
  next: OpportunityCalendar;
}): Promise<OpportunityCalendar> {
  const preferences = await getNotificationPreferences(input.accountId);
  const config = await oneSignalAccountConfig(input.accountId);
  const enabled = Boolean(preferences.enabled && preferences.calendarAlerts && config.serverConfigured);
  const now = Date.now();

  for (const previousEvent of input.previous?.events ?? []) {
    const nextEvent = input.next.events.find((event) => event.id === previousEvent.id);
    const canReuse = Boolean(enabled && nextEvent && sameSignature(previousEvent, nextEvent));
    if (!canReuse) {
      await cancelEventMessages(input.accountId, previousEvent);
      await cancelNotificationJobsForSource(input.accountId, "opportunity", previousEvent.id);
    }
  }

  for (const event of input.next.events) {
    const signature = scheduleSignature(event);
    if (!enabled) {
      await cancelNotificationJobsForSource(input.accountId, "opportunity", event.id, "Календарные уведомления отключены");
      event.notificationPlan = {
        status: "disabled",
        count: 0,
        queuedCount: 0,
        nextAt: null,
        signature,
        messages: [],
      };
      continue;
    }

    const uniqueDates = new Set<string>();
    const candidates = notificationCandidates(event)
      .map((candidate) => ({ ...candidate, sendAt: scheduledAt(candidate.date, preferences.timezone) }))
      .filter((candidate) => {
        if (uniqueDates.has(candidate.sendAt)) return false;
        uniqueDates.add(candidate.sendAt);
        const timestamp = new Date(candidate.sendAt).getTime();
        return timestamp > now + 30 * 60 * 1000
          && candidate.date < event.activationDate;
      })
      .slice(0, 3);

    if (!candidates.length) {
      await cancelNotificationJobsForSource(input.accountId, "opportunity", event.id, "Для события больше не требуется напоминание");
      event.notificationPlan = emptyNotificationPlan(signature);
      continue;
    }

    const candidateRows = candidates.map((candidate) => ({
      ...candidate,
      dedupeKey: `opportunity:${event.id}:${candidate.kind}:${candidate.sendAt.slice(0, 10)}`,
    }));
    for (const candidate of candidateRows) {
      await enqueueNotificationJob({
        accountId: input.accountId,
        venueId: input.venueId,
        sourceType: "opportunity",
        sourceId: event.id,
        category: "calendar",
        dedupeKey: candidate.dedupeKey,
        title: notificationTitle(candidate.kind),
        message: notificationMessage(event, candidate.kind),
        targetUrl: `/opportunities#${encodeURIComponent(event.id)}`,
        targetAt: candidate.sendAt,
        timezone: preferences.timezone,
      });
    }
    await dispatchNotificationJobs({ origin: input.origin, accountId: input.accountId, sourceId: event.id, now: new Date(now) });
    const jobs = await notificationJobsForSource(input.accountId, "opportunity", event.id);
    const candidateByKey = new Map(candidateRows.map((candidate) => [candidate.dedupeKey, candidate]));
    const activeJobs = jobs.filter((job) => candidateByKey.has(job.dedupe_key) && job.status !== "cancelled");
    const messages: ScheduledOpportunityMessage[] = activeJobs
      .filter((job) => (job.status === "scheduled" || job.status === "accepted") && Boolean(job.provider_message_id))
      .map((job) => ({
        kind: candidateByKey.get(job.dedupe_key)?.kind ?? "decision",
        sendAt: job.target_at,
        dedupeKey: job.dedupe_key,
        providerMessageId: job.provider_message_id as string,
      }));
    const queuedJobs = activeJobs.filter((job) => ["queued", "dispatching", "failed"].includes(job.status));
    const lastError = queuedJobs.find((job) => job.last_error)?.last_error ?? "";

    const nextAt = activeJobs.map((job) => job.target_at).sort()[0] ?? null;
    event.notificationPlan = messages.length
      ? {
          status: "scheduled",
          count: messages.length,
          queuedCount: queuedJobs.length,
          nextAt,
          signature,
          messages,
          ...(lastError ? { error: lastError } : {}),
        }
      : lastError
        ? {
            status: "error",
            count: 0,
            queuedCount: queuedJobs.length,
            nextAt,
            signature,
            messages: [],
            error: lastError,
          }
      : queuedJobs.length
        ? {
            status: "queued",
            count: 0,
            queuedCount: queuedJobs.length,
            nextAt,
            signature,
            messages: [],
          }
      : {
          status: "error",
          count: 0,
          queuedCount: 0,
          nextAt: null,
          signature,
          messages: [],
          error: lastError || "OneSignal временно не принял ближайшее напоминание. BarDoctor повторит попытку автоматически.",
        };
  }

  const scheduled = input.next.events.reduce((total, event) => total + event.notificationPlan.count, 0);
  const queued = input.next.events.reduce((total, event) => total + (event.notificationPlan.queuedCount ?? 0), 0);
  const nextAt = input.next.events
    .map((event) => event.notificationPlan.nextAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  input.next.notificationSummary = { scheduled, queued, nextAt, enabled };
  return input.next;
}

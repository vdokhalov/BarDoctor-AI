import {holidaySyncStatus,syncHolidayAccount} from '../../../lib/bardoctor/holiday-auto-sync';
import {opportunityEvidence} from '../../../lib/bardoctor/opportunity-evidence';
import {loadOpportunityEvidenceDays} from '../../../lib/bardoctor/opportunity-evidence-storage';
import type {AuthenticatedAccount} from '../../../lib/bardoctor/auth';
import {accountingCurrencyFromRestaurantJson} from '../../../lib/bardoctor/currency';
import { holidayCountry, loadFreeHolidays, freeHolidayRaw } from "../../../lib/bardoctor/free-holiday-calendar";
import { getD1 } from "../../../db";
import { readStoreSnapshots, withStoreCasRetries } from "../../../lib/bardoctor/store-cas";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import {
  AIServiceError,
  aiErrorResponse,
} from "../../../lib/bardoctor/ai-provider";
import {
  loadOpportunityCalendar,
  normaliseOpportunityCalendar,
  reconcileOpportunityNotifications,
  saveOpportunityCalendar,
  type OpportunityCalendar,
  type OpportunitySource,
} from "../../../lib/bardoctor/opportunity-calendar";
import { opportunityCalendarNeedsPersistence } from "../../../lib/bardoctor/opportunity-calendar-state";
import {
  OPPORTUNITY_CALENDAR_VERSION,
  OPPORTUNITY_HORIZON_DAYS,
  OPPORTUNITY_SEARCH_RADIUS_KM,
  buildOpportunityBaseline,
  opportunityVenueProfileSignature,
  type OpportunityVenueContext,
} from "../../../lib/bardoctor/opportunity-baseline";
import {
  getNotificationPreferences,
  oneSignalAccountConfig,
} from "../../../lib/bardoctor/notifications";

type JsonRecord = Record<string, unknown>;

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

function numeric(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function venueContext(restaurant: JsonRecord, venueName: string): OpportunityVenueContext {
  return {
    venueName,
    businessType: text(restaurant.businessType, "", 180),
    venueFormat: text(restaurant.venueFormat, "", 240),
    city: text(restaurant.city, "", 120),
    region: text(restaurant.region, "", 120),
    country: text(restaurant.country, "", 120),
    openTime: text(restaurant.openTime, "", 20),
    closeTime: text(restaurant.closeTime, "", 20),
    workingDays: record(restaurant.workingDays),
  };
}

function locationLabel(restaurant: JsonRecord): string {
  return [
    text(restaurant.address, "", 240),
    text(restaurant.city, "", 120),
    text(restaurant.region, "", 120),
    text(restaurant.country, "", 120),
  ].filter(Boolean).join(", ");
}

function uniqueSources(sources: OpportunitySource[]): OpportunitySource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  }).slice(0, 40);
}

function baselineCalendar(input: {
  context: OpportunityVenueContext;
  label: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  previous: OpportunityCalendar | null;
}): OpportunityCalendar {
  const baseline = buildOpportunityBaseline({
    context: input.context,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
  });
  return normaliseOpportunityCalendar({
    raw: { ...baseline.raw, events: baseline.raw.events.filter(event => event.calendarType !== "local" && event.category !== "city") },
    sources: baseline.sources,
    previous: input.previous,
    venueName: input.context.venueName,
    locationLabel: input.label,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    generatedAt: input.generatedAt,
    model: "calendar-core-v3",
    venueContext: input.context,
  });
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

async function requestRecord(request: Request, maximumBytes: number): Promise<JsonRecord> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maximumBytes) {
    throw new AIServiceError("Слишком большой запрос.", 413);
  }
  const body = record(JSON.parse(raw));
  if (!body) throw new AIServiceError("Некорректный запрос.", 400);
  return body;
}

async function publicCalendar(calendar: OpportunityCalendar | null, account:AuthenticatedAccount, context:OpportunityVenueContext) {
  const missing=calendar?.events.some(event=>event.assessmentAvailable===false);
  const days=missing?await loadOpportunityEvidenceDays(account):null;
  let profile:JsonRecord={};try{profile=JSON.parse(account.restaurantJson||'{}')}catch{}
  const withEvidence=calendar?{...calendar,events:calendar.events.map(event=>event.assessmentAvailable===false?{...event,evidenceAssessment:opportunityEvidence({date:event.startDate,context,timezone:typeof profile.timezone==='string'?profile.timezone:undefined,currency:accountingCurrencyFromRestaurantJson(account.restaurantJson),venueId:account.venueId,asOf:new Date().toISOString(),days})}:event)}:null;
  return withEvidence ? { ...withEvidence, events: withEvidence.events.map(event => ({ ...event, notificationPlan: { ...event.notificationPlan, messages: event.notificationPlan.messages.map(({ recipientAccountId: _recipient, ...message }) => message) } })) } : null;
}

function opportunityCalendarIsStale(
  calendar: OpportunityCalendar | null,
  storedMatchesProfile: boolean,
  today: string,
  now = Date.now(),
): boolean {
  const age = calendar ? now - new Date(calendar.generatedAt).getTime() : Number.POSITIVE_INFINITY;
  return !calendar || !storedMatchesProfile || calendar.model.startsWith("calendar-core-")
    || !Number.isFinite(age) || age > 7 * 86_400_000
    || calendar.windowEnd < today;
}

async function getOnce(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "calendar.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Календарь возможностей вам недоступен" },
      { status: 403 },
    ));
  }
  const casSnapshots = await readStoreSnapshots(getD1(), account.id, ["bd_opportunity_calendar_v1"]);
  const restaurant = account.restaurantJson
    ? record(JSON.parse(account.restaurantJson)) ?? {}
    : {};
  const venueName = text(restaurant.name);
  const label = locationLabel(restaurant);
  const context = venueContext(restaurant, venueName);
  const [storedCalendar, preferences, oneSignal] = await Promise.all([
    loadOpportunityCalendar(account.id),
    getNotificationPreferences(account.actorAccountId),
    oneSignalAccountConfig(account.actorAccountId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const windowEnd = addDays(today, OPPORTUNITY_HORIZON_DAYS);
  const expectedSignature = opportunityVenueProfileSignature(context);
  const storedMatchesProfile = Boolean(
    storedCalendar
    && storedCalendar.version === OPPORTUNITY_CALENDAR_VERSION
    && storedCalendar.profileSignature === expectedSignature,
  );
  const calendar = venueName && label && storedMatchesProfile
    ? storedCalendar
    : venueName && label
      ? baselineCalendar({
          context,
          label,
          windowStart: today,
          windowEnd,
          generatedAt: new Date().toISOString(),
          previous: storedCalendar,
        })
      : null;
  // Keep the read path fast: notification reconciliation performs writes and
  // provider work and belongs to refresh/decision mutations below. A newly
  // built canonical baseline is persisted immediately before it is returned.
  if (calendar && opportunityCalendarNeedsPersistence(storedCalendar, calendar)) {
    await saveOpportunityCalendar(account.id, calendar, casSnapshots);
  }
  const stale = opportunityCalendarIsStale(calendar, storedMatchesProfile, today);
  return noStore(Response.json({
    ok: true,
    restaurant,
    calendar: await publicCalendar(calendar,account,context),
    stale,
    sync: {...await holidaySyncStatus(account.id,context.country),allowed:hasPermission(account,"calendar.manage")},
    refreshIntervalDays: 7,
    horizonDays: OPPORTUNITY_HORIZON_DAYS,
    searchRadiusKm: OPPORTUNITY_SEARCH_RADIUS_KM,
    notificationStatus: {
      enabled: preferences.enabled,
      calendarAlerts: preferences.calendarAlerts,
      serverConfigured: oneSignal.serverConfigured,
    },
  }));
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "calendar.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Обновлять календарь вам не разрешено" },
      { status: 403 },
    ));
  }
  const casSnapshots = await readStoreSnapshots(getD1(), account.id, ["bd_opportunity_calendar_v1"]);
  try {
    const body = await requestRecord(request, 8_000);
    if (body.action !== "refresh") throw new AIServiceError("Неизвестное действие.", 400);
    const restaurant = account.restaurantJson
      ? record(JSON.parse(account.restaurantJson)) ?? {}
      : {};
    const venueName = text(restaurant.name);
    if (!venueName) throw new AIServiceError("Сначала заполните профиль заведения.", 400);

    const context = venueContext(restaurant, venueName);
    const label = locationLabel(restaurant);
    if (!label) {
      throw new AIServiceError("В профиле заведения не указан город или адрес.", 400);
    }

    const previous = await loadOpportunityCalendar(account.id);
    const expectedSignature = opportunityVenueProfileSignature(context);
    const previousMatchesProfile = Boolean(
      previous
      && previous.version === OPPORTUNITY_CALENDAR_VERSION
      && previous.profileSignature === expectedSignature,
    );
    const automatic = body.automatic === true;
    if (automatic) {
      const outcome=await syncHolidayAccount(account.id);
      return noStore(Response.json({ok:true,calendar:await publicCalendar(await loadOpportunityCalendar(account.id),account,context),sync:{...await holidaySyncStatus(account.id,context.country),allowed:true},syncOutcome:outcome.status,partial:outcome.status==='failed',warning:outcome.status==='failed'?'Источник недоступен. Показан сохранённый календарь.':undefined}));
    }
    const knownGeneratedAt = text(body.knownGeneratedAt, "", 80);
    const today = new Date().toISOString().slice(0, 10);
    if (automatic && previous && (
      (knownGeneratedAt && previous.generatedAt !== knownGeneratedAt)
      || !opportunityCalendarIsStale(previous, previousMatchesProfile, today)
    )) {
      return noStore(Response.json({
        ok: true,
        calendar: await publicCalendar(previous,account,context),
        skipped: true,
        message: "Календарь уже актуален.",
      }));
    }

    const windowEnd = addDays(today, OPPORTUNITY_HORIZON_DAYS);
    const country = holidayCountry(context.country);
    if (!country) throw new AIServiceError("Для этой страны бесплатный справочник пока не подключён. Сохранённый календарь не изменён.", 400);
    const data = await loadFreeHolidays(country,today,windowEnd);
    const seed = freeHolidayRaw(context,today,windowEnd,data,country);
    const generatedAt = new Date().toISOString();
    let calendar = normaliseOpportunityCalendar({raw:seed.raw,sources:seed.sources,previous,venueName,locationLabel:label,windowStart:today,windowEnd,generatedAt,model:data.model,venueContext:context});
    // Keep saved event decisions and assessments; do not re-date old local listings.
    if (previousMatchesProfile && previous) {
      calendar.sources = uniqueSources([...calendar.sources,...previous.sources]);
      calendar.events = calendar.events.map(event => {
        const old=previous.events.find(item=>item.id===event.id);
        return old ? {...event,potentialScore:old.potentialScore,potentialLabel:old.potentialLabel,scoreBreakdown:old.scoreBreakdown,scoreReason:old.scoreReason,impact:old.impact,assessmentAvailable:old.assessmentAvailable,decision:old.decision,decisionUpdatedAt:old.decisionUpdatedAt} : event;
      });
      for(const old of previous.events) if(!calendar.events.some(event=>event.id===old.id)) calendar.events.push(old);
    }
    calendar = await reconcileOpportunityNotifications({
      accountId: account.id,
      venueId: account.venueId,
      origin: new URL(request.url).origin,
      previous,
      next: calendar,
    });
    await saveOpportunityCalendar(account.id, calendar, casSnapshots);
    return noStore(Response.json({ok:true,calendar:await publicCalendar(calendar,account,context),partial:Boolean(data.warning),warning:data.warning,
      message:data.warning?data.warning:"Даты обновлены из бесплатного справочника. Местная афиша не обновлялась."}));
  } catch (error) {
    return noStore(aiErrorResponse(error));
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "calendar.manage")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Изменять календарь вам не разрешено" },
      { status: 403 },
    ));
  }
  const casSnapshots = await readStoreSnapshots(getD1(), account.id, ["bd_opportunity_calendar_v1"]);
  try {
    const body = await requestRecord(request, 4_000);
    if (!["set-decision", "delete-event"].includes(text(body.action))) {
      throw new AIServiceError("Неизвестное действие.", 400);
    }
    const eventId = text(body.eventId, "", 180);
    const decision = text(body.decision);
    if (!eventId || (body.action === "set-decision" && !["watching", "planned", "dismissed"].includes(decision))) {
      throw new AIServiceError("Некорректное решение по событию.", 400);
    }
    const stored = await loadOpportunityCalendar(account.id);
    const restaurant = account.restaurantJson
      ? record(JSON.parse(account.restaurantJson)) ?? {}
      : {};
    const venueName = text(restaurant.name);
    const context = venueContext(restaurant, venueName);
    const label = locationLabel(restaurant);
    if (!venueName || !label) throw new AIServiceError("Сначала заполните профиль заведения.", 400);
    const current = stored
      && stored.version === OPPORTUNITY_CALENDAR_VERSION
      && stored.profileSignature === opportunityVenueProfileSignature(context)
      ? stored
      : baselineCalendar({
          context,
          label,
          windowStart: new Date().toISOString().slice(0, 10),
          windowEnd: addDays(new Date().toISOString().slice(0, 10), OPPORTUNITY_HORIZON_DAYS),
          generatedAt: new Date().toISOString(),
          previous: stored,
        });
    const next = JSON.parse(JSON.stringify(current)) as OpportunityCalendar;
    const event = next.events.find((item) => item.id === eventId);
    if (!event) throw new AIServiceError("Событие не найдено.", 404);
    if (body.action === "delete-event") {
      next.events = next.events.filter((item) => item.id !== eventId);
      next.deletedEventIds = [...new Set([...(next.deletedEventIds ?? []), eventId])].slice(-200);
      const calendar = await reconcileOpportunityNotifications({
        accountId: account.id,
        venueId: account.venueId,
        origin: new URL(request.url).origin,
        previous: stored,
        next,
      });
      await saveOpportunityCalendar(account.id, calendar, casSnapshots);
      return noStore(Response.json({
        ok: true,
        calendar: await publicCalendar(calendar,account,context),
        message: "Событие удалено из календаря, связанные напоминания отменены.",
      }));
    }
    event.decision = decision as "watching" | "planned" | "dismissed";
    event.decisionUpdatedAt = new Date().toISOString();
    const calendar = await reconcileOpportunityNotifications({
      accountId: account.id,
      venueId: account.venueId,
      origin: new URL(request.url).origin,
      previous: stored,
      next,
    });
    await saveOpportunityCalendar(account.id, calendar, casSnapshots);
    return noStore(Response.json({
      ok: true,
      calendar: await publicCalendar(calendar,account,context),
      message: decision === "planned"
        ? "Событие взято в работу. BarDoctor сохранил план напоминаний."
        : decision === "dismissed"
          ? "Событие скрыто, его напоминания отменены."
          : "Событие оставлено под наблюдением.",
    }));
  } catch (error) {
    return noStore(aiErrorResponse(error));
  }
}

export async function GET(request: Request): Promise<Response> { return withStoreCasRetries(request, getOnce, 1); }

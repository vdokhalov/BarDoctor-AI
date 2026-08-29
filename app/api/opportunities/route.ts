import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import {
  AIServiceError,
  aiErrorResponse,
  parseAIJson,
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
  opportunityBaselineHasCountryCalendar,
  opportunityVenueProfileSignature,
  type OpportunityVenueContext,
} from "../../../lib/bardoctor/opportunity-baseline";
import {
  getNotificationPreferences,
  oneSignalAccountConfig,
} from "../../../lib/bardoctor/notifications";
import { openAIWebSearch } from "../../../lib/bardoctor/openai";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
} from "../../../lib/bardoctor/venue-ai-context";

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

function mergedRawCalendar(baseline: ReturnType<typeof buildOpportunityBaseline>, discovered: unknown): JsonRecord {
  const raw = record(discovered) ?? {};
  const webEvents = (Array.isArray(raw.events) ? raw.events : [])
    .map(record)
    .filter((event): event is JsonRecord => Boolean(event))
    .map((event) => {
      const requestedType = text(event.calendarType);
      const locality = text(event.locality);
      const category = text(event.category);
      const calendarType = ["official", "local", "discovered"].includes(requestedType)
        ? requestedType
        : category === "holiday" && locality === "national"
          ? "official"
          : (category === "holiday" || category === "city") && ["local", "regional"].includes(locality)
            ? "local"
            : "discovered";
      return { ...event, origin: "web", calendarType };
    });
  return {
    summary: text(
      raw.summary,
      baseline.raw.summary,
      1_000,
    ),
    events: [...baseline.raw.events, ...webEvents],
  };
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
    raw: baseline.raw,
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

function countryCode(country: string): string | undefined {
  const normalised = country.trim().toLocaleLowerCase("ru");
  const map: Record<string, string> = {
    md: "MD",
    moldova: "MD",
    молдова: "MD",
    молдавия: "MD",
    ro: "RO",
    romania: "RO",
    румыния: "RO",
    ua: "UA",
    ukraine: "UA",
    украина: "UA",
    de: "DE",
    germany: "DE",
    германия: "DE",
    ru: "RU",
    russia: "RU",
    россия: "RU",
  };
  return /^[a-z]{2}$/i.test(country.trim()) ? country.trim().toUpperCase() : map[normalised];
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

function publicCalendar(calendar: OpportunityCalendar | null) {
  return calendar;
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

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "calendar.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Календарь возможностей вам недоступен" },
      { status: 403 },
    ));
  }
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
    await saveOpportunityCalendar(account.id, calendar);
  }
  const stale = opportunityCalendarIsStale(calendar, storedMatchesProfile, today);
  return noStore(Response.json({
    ok: true,
    restaurant,
    calendar: publicCalendar(calendar),
    stale,
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
    const knownGeneratedAt = text(body.knownGeneratedAt, "", 80);
    const today = new Date().toISOString().slice(0, 10);
    if (automatic && previous && (
      (knownGeneratedAt && previous.generatedAt !== knownGeneratedAt)
      || !opportunityCalendarIsStale(previous, previousMatchesProfile, today)
    )) {
      return noStore(Response.json({
        ok: true,
        calendar: publicCalendar(previous),
        skipped: true,
        message: "Календарь уже актуален.",
      }));
    }

    const windowEnd = addDays(today, OPPORTUNITY_HORIZON_DAYS);
    const baseline = buildOpportunityBaseline({ context, windowStart: today, windowEnd });
    const hasCountryCalendar = opportunityBaselineHasCountryCalendar(context);
    const unifiedContext = await loadVenueAIContext(account, "opportunities", body);
    const internal = venueAIContextForPrompt(unifiedContext);
    const system = `Ты — BarDoctor Opportunity Intelligence, аналитик возможностей для баров, ресторанов, клубов и караоке. Используй веб-поиск и только актуальные публичные источники. Пиши по-русски, конкретно и без рекламных фраз.

Задача — собрать полноценный календарь подтверждённых возможностей на ближайшие ${OPPORTUNITY_HORIZON_DAYS} дней для конкретного заведения. Код BarDoctor передаёт ниже только базовые даты. Не считай этот список полным и не повторяй лишь точные совпадения по названию и дате.

Обязательные уровни проверки для любого указанного региона:
1. официальный календарь страны: государственные праздники и фактические длинные выходные;
2. календарь субъекта/области/республики: региональные праздники и дополнительные выходные;
3. точный город: День города, официальная муниципальная афиша и крупные городские события;
4. актуальная локальная афиша: концерты, фестивали, домашние спортивные матчи и иные события с уже подтверждённой датой.
Если регион в профиле не заполнен, сначала установи его по городу через официальный источник. Для каждого найденного календарного уровня добавь подтверждённые даты из заданного периода, даже если их коммерческий потенциал низкий. Не выдумывай даты ради заполнения.

Жёсткий географический фильтр:
- local_demand допустим только в точном городе заведения или не дальше ${OPPORTUNITY_SEARCH_RADIUS_KM} км; укажи distanceKm, а если расстояние не подтверждено — null;
- события в других городах и районах не считать источником гостей без прямого доказательства перемещения аудитории;
- regional_interest — информационный шум, такие события не возвращай;
- venue_activation допустим для официального национального/регионального праздника, национальной трансляции, спортивного финала или сезонной даты, которые реально можно учесть либо активировать внутри заведения;
- фестиваль, концерт или городской марафон далеко от заведения нельзя превращать в «after-party» только ради заполнения списка;
- любая удалённая точка не относится автоматически к заведению в городе «${context.city || "не указан"}».

Жёсткий фильтр формата:
- используй только реально указанные в профиле свойства заведения;
- не выдумывай террасу, винную карту, кухню, экран, сцену или тематическую специализацию;
- винный фестиваль не подходит ночному клубу/караоке автоматически;
- учитывай точные рабочие дни и часы; если событие приходится на закрытый день, предложи activationDate ближайшей реальной смены либо снизь scheduleFit;
- рекомендация должна называть конкретное заведение и объяснять, почему повод подходит именно ему.

Правила достоверности:
- не выдумывай события, даты, артистов, команды, площадки, расстояния или прогнозы;
- каждое событие должно иметь минимум один URL из веб-поиска, который подтверждает название и дату;
- не включай событие, если дата не подтверждена;
- отделяй факт от гипотезы для заведения;
- не обещай рост выручки без внутренних данных или подтверждённого основания;
- если точный процент нельзя обосновать, поле impact.range должно прямо говорить, что диапазон пока не рассчитан;
- учитывай формат, график, город, район и доступные показатели самого заведения;
- рекомендации должны говорить, что именно делать: формат, предложение, продвижение, операционная подготовка и крайняя дата решения;
- учитывай права на публичную трансляцию, безопасность, логистику и конкуренцию как риски, когда это уместно;
- не дублируй одно и то же событие под разными названиями;
- для официальных дат полнота важнее высокой оценки; для афиш лучше вернуть 0–8 сильных локальных событий, чем заполнить список нерелевантными фестивалями.

Оценка potentialScore — сумма пяти факторов строго от 0 до 100:
audienceFit 0–30, scheduleFit 0–20, proximity 0–20, commercialPotential 0–20, readiness 0–10.
75–100 = высокий потенциал, 55–74 = средний, ниже 55 = низкий.

Верни ТОЛЬКО валидный JSON без markdown по схеме:
{"summary":"...","events":[{"title":"...","category":"holiday|sport|concert|festival|city|seasonal|other","calendarType":"official|local|discovered","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD или null","activationDate":"YYYY-MM-DD — рекомендуемая смена заведения","startTime":"HH:MM или null","location":"точная площадка и город","locality":"local|regional|national|online","relation":{"mode":"local_demand|venue_activation|regional_interest","distanceKm":12.5,"reason":"почему это относится именно к указанному заведению"},"audience":"...","summary":"подтверждённый факт о событии","confidence":"high|medium|low","scoreReason":"почему такая оценка именно для этого заведения и графика","scoreBreakdown":{"audienceFit":25,"scheduleFit":18,"proximity":18,"commercialPotential":15,"readiness":6},"whyUseful":["..."],"impact":{"score":82,"level":"high|medium|low","metric":"что может измениться","range":"обоснованный диапазон или честно без диапазона","basis":"на чём основана оценка"},"recommendation":{"format":"...","offer":"...","promotion":"...","operations":"...","decisionDeadline":"YYYY-MM-DD","leadDays":14},"risks":["..."],"sourceUrls":["https://..."]}]}`;

    const prompt = `Сегодня ${today}. Найди и оцени возможности на период ${today}–${windowEnd}.

Профиль заведения:
${JSON.stringify({
  name: venueName,
  businessType: context.businessType,
  venueFormat: context.venueFormat,
  seats: numeric(restaurant.seats),
  employees: numeric(restaurant.employees),
  openTime: context.openTime,
  closeTime: context.closeTime,
  workingDays: context.workingDays,
  city: context.city,
  region: context.region,
  country: context.country,
  location: label,
  latitude: numeric(restaurant.lat),
  longitude: numeric(restaurant.lng),
})}

Внутренний контекст BarDoctor:
${JSON.stringify(internal)}

Базовые даты, которые уже добавлены BarDoctor. Не повторяй только эти точные пары названия и даты:
${JSON.stringify(baseline.raw.events.map((event) => ({
  title: event.title,
  date: event.startDate,
  recommendedShift: event.activationDate,
})))}

Приоритетные локальные источники и рамки поиска:
${baseline.searchHints.map((hint) => `- ${hint}`).join("\n")}

Наличие полного встроенного календаря страны: ${hasCountryCalendar ? "да" : "нет — обязательно найди официальный календарь страны через веб-поиск"}.

Верни все недостающие подтверждённые официальные и региональные даты из периода и от 0 до 8 сильных локальных событий. Общий максимум — 16 событий. Сначала точный город, затем ближайшая зона до ${OPPORTUNITY_SEARCH_RADIUS_KM} км, затем только действительно активируемые внутри заведения национальные поводы.`;

    const generatedAt = new Date().toISOString();
    let discovered: unknown = { summary: baseline.raw.summary, events: [] };
    let webSources: OpportunitySource[] = [];
    let model = "calendar-core-v2";
    let searchWarning = "";
    try {
      const web = await openAIWebSearch({
        accountId: account.id,
        observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "calendar" },
        system,
        prompt,
        maxTokens: 7_000,
        location: {
          country: countryCode(context.country),
          city: context.city || undefined,
          region: context.region || undefined,
          timezone: text(body.timezone, "Europe/Chisinau", 80),
        },
      });
      discovered = parseAIJson<unknown>(web.text);
      webSources = web.sources.map((source) => ({ url: source.url, title: source.title }));
      const discoveredRecord = record(discovered);
      const discoveredEvents = Array.isArray(discoveredRecord?.events) ? discoveredRecord.events : [];
      if (discoveredEvents.length > 0 && webSources.length === 0) {
        throw new AIServiceError(
          "Веб-поиск нашёл события, но не вернул подтверждающие источники. BarDoctor сохранил базовый календарь и повторит поиск позже.",
          502,
        );
      }
      model = web.model;
    } catch (error) {
      searchWarning = error instanceof Error
        ? error.message
        : "Локальные афиши временно не удалось проверить.";
    }
    const sources = uniqueSources([...baseline.sources, ...webSources]);
    let calendar = normaliseOpportunityCalendar({
      raw: mergedRawCalendar(baseline, discovered),
      sources,
      previous,
      venueName,
      locationLabel: label,
      windowStart: today,
      windowEnd,
      generatedAt,
      model,
      venueContext: context,
    });
    calendar = await reconcileOpportunityNotifications({
      accountId: account.id,
      venueId: account.venueId,
      origin: new URL(request.url).origin,
      previous,
      next: calendar,
    });
    await saveOpportunityCalendar(account.id, calendar);
    const baselineCount = calendar.events.filter((event) => event.origin === "baseline").length;
    const localCount = calendar.events.filter((event) => event.origin === "web").length;
    return noStore(Response.json({
      ok: true,
      calendar: publicCalendar(calendar),
      partial: Boolean(searchWarning),
      warning: searchWarning || null,
      message: searchWarning
        ? `Календарные даты обновлены: ${baselineCount}. Локальные афиши временно не удалось проверить.`
        : `Календарь обновлён: ${baselineCount} обязательных дат и ${localCount} подтверждённых локальных событий.`,
    }));
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
      await saveOpportunityCalendar(account.id, calendar);
      return noStore(Response.json({
        ok: true,
        calendar: publicCalendar(calendar),
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
    await saveOpportunityCalendar(account.id, calendar);
    return noStore(Response.json({
      ok: true,
      calendar: publicCalendar(calendar),
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

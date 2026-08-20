import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accounts, domainData } from "../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import {
  AIServiceError,
  aiErrorResponse,
  parseAIJson,
} from "../../../lib/bardoctor/ai-provider";
import {
  openAIWebSearch,
  type OpenAIWebSource,
} from "../../../lib/bardoctor/openai";
import {
  loadVenueAIContext,
  venueAIContextForPrompt,
} from "../../../lib/bardoctor/venue-ai-context";

type JsonRecord = Record<string, unknown>;

const MARKET_KEY = "bd_market_analysis_v1";
const PRIORITIES = new Set(["high", "medium", "low"]);
const RELATIONS = new Set(["direct", "indirect", "alternative"]);

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown, fallback = "", limit = 2_000): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function number(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function textList(value: unknown, limit = 8): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 420))
        .slice(0, limit)
    : [];
}

function sourceUrls(value: unknown, allowed: Set<string>): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item, index, items) => allowed.has(item) && items.indexOf(item) === index)
        .slice(0, 5)
    : [];
}

function countryCode(country: string): string | undefined {
  const normalised = country.trim().toLocaleLowerCase("ru");
  const map: Record<string, string> = {
    md: "MD",
    moldova: "MD",
    молдова: "MD",
    молдавия: "MD",
    ru: "RU",
    russia: "RU",
    россия: "RU",
    ua: "UA",
    ukraine: "UA",
    украина: "UA",
    ro: "RO",
    romania: "RO",
    румыния: "RO",
    de: "DE",
    germany: "DE",
    германия: "DE",
  };
  return /^[a-z]{2}$/i.test(country.trim()) ? country.trim().toUpperCase() : map[normalised];
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

async function cachedAnalysis(accountId: number): Promise<unknown> {
  const [row] = await getDb()
    .select()
    .from(domainData)
    .where(and(eq(domainData.accountId, accountId), eq(domainData.storeKey, MARKET_KEY)))
    .limit(1);
  return row ? JSON.parse(row.dataJson) : null;
}

function competitorKey(value: JsonRecord): string {
  const existing = text(value.key, "", 400);
  if (existing) return existing;
  const name = text(value.name, "", 160).toLocaleLowerCase("ru");
  const source = textList(value.sourceUrls, 1)[0] ?? "";
  return `${name}|${source}`.slice(0, 400);
}

function competitorNameKey(value: JsonRecord): string {
  return text(value.name, "", 160).toLocaleLowerCase("ru");
}

async function saveAnalysis(accountId: number, analysis: JsonRecord): Promise<void> {
  const updatedAt = new Date().toISOString();
  await getDb()
    .insert(domainData)
    .values({
      accountId,
      storeKey: MARKET_KEY,
      dataJson: JSON.stringify(analysis),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [domainData.accountId, domainData.storeKey],
      set: { dataJson: JSON.stringify(analysis), updatedAt },
    });
}

function normaliseMarketResult(
  raw: unknown,
  sources: OpenAIWebSource[],
): JsonRecord {
  const result = record(raw) ?? {};
  const allowedSources = new Set(sources.map((source) => source.url));
  const sourced = (value: unknown) => sourceUrls(value, allowedSources);
  const objectSection = (value: unknown, fallback: string) => {
    const item = record(value) ?? {};
    return {
      summary: text(item.summary, fallback),
      signals: textList(item.signals, 8),
      sourceUrls: sourced(item.sourceUrls),
    };
  };

  const audienceRaw = record(result.audience) ?? {};
  const audienceSegments = (Array.isArray(audienceRaw.segments) ? audienceRaw.segments : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && text(item.name)))
    .slice(0, 6)
    .map((item) => ({
      name: text(item.name, "Сегмент"),
      behaviour: text(item.behaviour, "Поведение требует проверки", 600),
      need: text(item.need, "Потребность требует проверки", 400),
    }));

  const competitors = (Array.isArray(result.competitors) ? result.competitors : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && text(item.name)))
    .slice(0, 12)
    .map((item) => ({
      key: competitorKey(item),
      name: text(item.name, "Без названия", 160),
      category: text(item.category, "Заведение", 100),
      relation: RELATIONS.has(text(item.relation)) ? text(item.relation) : "alternative",
      distance: text(item.distance, "Расстояние не подтверждено", 100),
      rating: text(item.rating, "", 40),
      evidence: text(item.evidence, "Публичных данных недостаточно", 700),
      strengths: textList(item.strengths, 5),
      gaps: textList(item.gaps, 5),
      sourceUrls: sourced(item.sourceUrls),
      confirmed: false,
    }));

  const listSection = (value: unknown, kind: "opportunity" | "risk") =>
    (Array.isArray(value) ? value : [])
      .map(record)
      .filter((item): item is JsonRecord => Boolean(item && text(item.title)))
      .slice(0, 8)
      .map((item) => ({
        title: text(item.title, "Вывод", 180),
        why: text(item.why, "Требует проверки по данным заведения", 650),
        ...(kind === "opportunity"
          ? { impact: text(item.impact, "Потенциальный эффект требует проверки", 350) }
          : { mitigation: text(item.mitigation, "Сначала проверить факт и назначить ответственного", 500) }),
        sourceUrls: sourced(item.sourceUrls),
      }));

  const pricing = (Array.isArray(result.pricing) ? result.pricing : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && text(item.item)))
    .slice(0, 10)
    .map((item) => ({
      item: text(item.item, "Позиция", 160),
      range: text(item.range, "Нет подтверждённого диапазона", 120),
      logic: text(item.logic, "Сверьте с фактической себестоимостью", 500),
      sourceUrls: sourced(item.sourceUrls),
    }));

  const marketing = (Array.isArray(result.marketing) ? result.marketing : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && text(item.idea)))
    .slice(0, 8)
    .map((item) => ({
      channel: text(item.channel, "Локальный канал", 120),
      idea: text(item.idea, "Проверить локальную гипотезу", 500),
      kpi: text(item.kpi, "Задать измеримый KPI", 240),
      sourceUrls: sourced(item.sourceUrls),
    }));

  const actions = (Array.isArray(result.actions) ? result.actions : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && text(item.title)))
    .slice(0, 8)
    .map((item) => ({
      title: text(item.title, "Проверить гипотезу", 180),
      priority: PRIORITIES.has(text(item.priority)) ? text(item.priority) : "medium",
      days: Math.max(1, Math.min(90, Math.round(number(item.days) ?? 7))),
      why: text(item.why, "Связано с локальным рынком заведения", 500),
    }));

  return {
    location: objectSection(
      result.location,
      "Местоположение определено по профилю заведения; локальные особенности требуют проверки.",
    ),
    audience: {
      summary: text(
        audienceRaw.summary,
        "Аудитория района требует уточнения по фактическим данным гостей.",
      ),
      segments: audienceSegments,
      sourceUrls: sourced(audienceRaw.sourceUrls),
    },
    economy: objectSection(
      result.economy,
      "Экономический контекст сформирован по доступным открытым источникам.",
    ),
    positioning: objectSection(
      result.positioning,
      "Позиционирование следует подтвердить отзывами и поведением гостей.",
    ),
    competitorSummary: text(
      result.competitorSummary,
      competitors.length ? "Найдены заведения для сравнения." : "Подтверждённых конкурентов пока не найдено.",
      1_000,
    ),
    competitors,
    opportunities: listSection(result.opportunities, "opportunity"),
    risks: listSection(result.risks, "risk"),
    pricing,
    marketing,
    actions,
    assumptions: textList(result.assumptions, 12),
  };
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "analysis.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Аналитика рынка вам недоступна" },
      { status: 403 },
    ));
  }
  return noStore(Response.json({
    ok: true,
    restaurant: account.restaurantJson ? JSON.parse(account.restaurantJson) : null,
    analysis: await cachedAnalysis(account.id),
  }));
}

export async function PATCH(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "analysis.run")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Изменять анализ рынка вам не разрешено" },
      { status: 403 },
    ));
  }
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 5_000) {
      throw new AIServiceError("Слишком большой запрос.", 413);
    }
    const body = record(JSON.parse(rawBody)) ?? {};
    if (!["set-competitor-confirmed", "delete-competitor"].includes(text(body.action))) {
      throw new AIServiceError("Неизвестное действие.", 400);
    }
    const key = text(body.competitorKey, "", 400);
    if (!key) {
      throw new AIServiceError("Не указан конкурент.", 400);
    }
    const current = record(await cachedAnalysis(account.id));
    if (!current) throw new AIServiceError("Сначала проведите анализ рынка.", 404);
    const competitors = Array.isArray(current.competitors) ? current.competitors : [];
    if (body.action === "delete-competitor") {
      const removed = competitors.map(record).find((item) => item && competitorKey(item) === key);
      if (!removed) throw new AIServiceError("Конкурент не найден в последнем анализе.", 404);
      current.competitors = competitors.filter((value) => {
        const item = record(value);
        return !item || competitorKey(item) !== key;
      });
      current.deletedCompetitorKeys = [
        ...new Set([...textList(current.deletedCompetitorKeys, 100), key]),
      ].slice(-100);
      current.deletedCompetitorNames = [
        ...new Set([
          ...textList(current.deletedCompetitorNames, 100),
          competitorNameKey(removed),
        ]),
      ].slice(-100);
      await saveAnalysis(account.id, current);
      return noStore(Response.json({ ok: true, data: current }));
    }
    if (typeof body.confirmed !== "boolean") {
      throw new AIServiceError("Не указан статус подтверждения.", 400);
    }
    let found = false;
    current.competitors = competitors.map((value) => {
      const item = record(value);
      if (!item || competitorKey(item) !== key) return value;
      found = true;
      return {
        ...item,
        key,
        confirmed: body.confirmed,
        confirmedAt: body.confirmed ? new Date().toISOString() : null,
      };
    });
    if (!found) throw new AIServiceError("Конкурент не найден в последнем анализе.", 404);
    await saveAnalysis(account.id, current);
    return noStore(Response.json({ ok: true, data: current }));
  } catch (error) {
    return noStore(aiErrorResponse(error));
  }
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "analysis.run")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Запускать анализ рынка вам не разрешено" },
      { status: 403 },
    ));
  }
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 30_000) {
      throw new AIServiceError("Слишком большой запрос.", 413);
    }
    const body = record(JSON.parse(rawBody)) ?? {};
    const restaurant = account.restaurantJson
      ? record(JSON.parse(account.restaurantJson)) ?? {}
      : {};
    if (!text(restaurant.name)) {
      throw new AIServiceError("Сначала заполните профиль заведения.", 400);
    }
    const venueContext = await loadVenueAIContext(account, "market", body);

    const address = text(body.address, text(restaurant.address), 240);
    const city = text(body.city, text(restaurant.city), 120);
    const region = text(body.region, text(restaurant.region), 120);
    const country = text(body.country, text(restaurant.country), 120);
    const latitude = number(body.latitude) ?? number(restaurant.lat);
    const longitude = number(body.longitude) ?? number(restaurant.lng);
    const focus = text(body.focus, "", 500);
    if (!address && !city && !region && !country && (latitude === null || longitude === null)) {
      throw new AIServiceError(
        "Не хватает местоположения. Укажите город или разрешите геолокацию.",
        400,
      );
    }

    const locationLabel = [address, city, region, country].filter(Boolean).join(", ");
    const system = `Ты — BarDoctor Market Intelligence, аналитик рынка заведений общепита и ночной индустрии. Используй веб-поиск и только актуальные публичные источники. Пиши по-русски, конкретно и без рекламных формулировок.

Правила достоверности:
- не выдумывай названия, рейтинги, цены, расстояния, аудиторию или экономические показатели;
- каждого названного конкурента подтверждай открытым источником;
- не приписывай конкурентам недостатки без публичного подтверждения;
- отделяй наблюдаемый факт от аналитической гипотезы;
- если данных нет, прямо напиши об этом;
- рекомендации должны учитывать формат, график и реальную локацию заведения;
- цены указывай в валюте найденного источника и не конвертируй без основания.

Верни ТОЛЬКО валидный JSON без markdown по схеме:
{"location":{"summary":"...","signals":["..."],"sourceUrls":["https://..."]},"audience":{"summary":"...","segments":[{"name":"...","behaviour":"...","need":"..."}],"sourceUrls":["https://..."]},"economy":{"summary":"...","signals":["..."],"sourceUrls":["https://..."]},"positioning":{"summary":"...","signals":["..."],"sourceUrls":["https://..."]},"competitorSummary":"...","competitors":[{"name":"...","category":"...","relation":"direct|indirect|alternative","distance":"... или не подтверждено","rating":"... или пусто","evidence":"что подтверждено","strengths":["..."],"gaps":["только подтвержденное"],"sourceUrls":["https://..."]}],"opportunities":[{"title":"...","why":"...","impact":"...","sourceUrls":["https://..."]}],"risks":[{"title":"...","why":"...","mitigation":"...","sourceUrls":["https://..."]}],"pricing":[{"item":"...","range":"...","logic":"...","sourceUrls":["https://..."]}],"marketing":[{"channel":"...","idea":"...","kpi":"...","sourceUrls":["https://..."]}],"actions":[{"title":"...","priority":"high|medium|low","days":7,"why":"..."}],"assumptions":["что не подтверждено или требует внутренних данных"]}`;

    const prompt = `Проведи локальный рыночный анализ для заведения.

Профиль:
${JSON.stringify({
  name: text(restaurant.name),
  businessType: text(restaurant.businessType),
  venueFormat: text(restaurant.venueFormat),
  seats: number(restaurant.seats),
  employees: number(restaurant.employees),
  openTime: text(restaurant.openTime),
  closeTime: text(restaurant.closeTime),
  workingDays: record(restaurant.workingDays),
  location: locationLabel,
  latitude,
  longitude,
  focus: focus || "Полный анализ без дополнительного фокуса",
})}

Релевантный внутренний контекст BarDoctor:
${JSON.stringify(venueAIContextForPrompt(venueContext))}

Найди реальные ближайшие заведения сходного и альтернативного формата, особенности района, подтверждённые сигналы аудитории и экономики. На основе этого сформируй возможности, риски, ориентиры цен, локальный маркетинг и 5–7 действий. Данные собственного заведения не выдавай за публичные факты.`;

    const web = await openAIWebSearch({
      accountId: account.id,
      observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "market" },
      system,
      prompt,
      maxTokens: 7_500,
      location: {
        country: countryCode(country),
        city: city || undefined,
        region: region || undefined,
        timezone: text(body.timezone, "", 80) || undefined,
      },
    });
    const previousAnalysis = record(await cachedAnalysis(account.id));
    const deletedCompetitorKeys = new Set(textList(previousAnalysis?.deletedCompetitorKeys, 100));
    const deletedCompetitorNames = new Set(textList(previousAnalysis?.deletedCompetitorNames, 100));
    const previousConfirmed = new Map<string, JsonRecord>();
    const previousConfirmedByName = new Map<string, JsonRecord>();
    for (const value of Array.isArray(previousAnalysis?.competitors) ? previousAnalysis.competitors : []) {
      const item = record(value);
      if (item?.confirmed === true) {
        previousConfirmed.set(competitorKey(item), item);
        previousConfirmedByName.set(competitorNameKey(item), item);
      }
    }
    const analysis = normaliseMarketResult(parseAIJson<unknown>(web.text), web.sources);
    const nextCompetitors = Array.isArray(analysis.competitors) ? analysis.competitors : [];
    analysis.competitors = nextCompetitors.filter((value) => {
      const item = record(value) ?? {};
      return !deletedCompetitorKeys.has(competitorKey(item))
        && !deletedCompetitorNames.has(competitorNameKey(item));
    }).map((value) => {
      const item = record(value) ?? {};
      const previous = previousConfirmed.get(competitorKey(item))
        ?? previousConfirmedByName.get(competitorNameKey(item));
      return {
        ...item,
        confirmed: Boolean(previous),
        confirmedAt: previous ? text(previous.confirmedAt, new Date().toISOString(), 40) : null,
      };
    });
    const generatedAt = new Date().toISOString();
    const payload = {
      version: 1,
      venueName: text(restaurant.name),
      locationLabel: locationLabel || [latitude, longitude].filter((item) => item !== null).join(", "),
      latitude,
      longitude,
      focus,
      generatedAt,
      model: web.model,
      ...analysis,
      sources: web.sources,
      deletedCompetitorKeys: [...deletedCompetitorKeys],
      deletedCompetitorNames: [...deletedCompetitorNames],
    };

    await saveAnalysis(account.id, payload);

    if (address || latitude !== null || longitude !== null) {
      const nextRestaurant = {
        ...restaurant,
        ...(address ? { address } : {}),
        ...(latitude !== null ? { lat: latitude } : {}),
        ...(longitude !== null ? { lng: longitude } : {}),
      };
      await getDb()
        .update(accounts)
        .set({ restaurantJson: JSON.stringify(nextRestaurant), updatedAt: generatedAt })
        .where(eq(accounts.id, account.id));
    }

    return noStore(Response.json({ ok: true, data: payload }));
  } catch (error) {
    return noStore(aiErrorResponse(error));
  }
}

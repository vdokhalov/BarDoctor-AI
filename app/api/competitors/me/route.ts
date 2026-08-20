import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { domainData } from "../../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../../lib/bardoctor/auth";
import { hasPermission } from "../../../../lib/bardoctor/access-control";

type JsonRecord = Record<string, unknown>;

const MARKET_KEY = "bd_market_analysis_v1";
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1_000;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const match = typeof value === "string"
    ? value.replace(",", ".").match(/-?[0-9]+(?:\.[0-9]+)?/)
    : null;
  const parsed = typeof value === "string" ? Number(match?.[0]) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceMeters(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const source = text(value).toLocaleLowerCase("ru").replace(",", ".");
  const match = source.match(/([0-9]+(?:\.[0-9]+)?)\s*(км|km|м|m)(?![a-zа-я])/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount)
    ? Math.max(0, Math.round(amount * (match[2] === "км" || match[2] === "km" ? 1_000 : 1)))
    : null;
}

function parseJson(value: string | null): JsonRecord | null {
  if (!value) return null;
  try {
    return record(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
}

function normaliseCompetitor(value: unknown, source: "market" | "places"): JsonRecord | null {
  const item = record(value);
  const name = text(item?.name);
  if (!item || !name) return null;
  const rating = finiteNumber(item.rating);
  return {
    placeId: text(item.placeId) || text(item.key) || `${source}:${name.toLocaleLowerCase("ru")}`,
    name: name.slice(0, 160),
    distanceMeters: distanceMeters(item.distanceMeters ?? item.distance),
    rating,
    reviewCount: finiteNumber(item.reviewCount),
    category: text(item.category) || "Заведение",
    priceLevel: finiteNumber(item.priceLevel),
    businessStatus: text(item.businessStatus) || null,
    openingHours: Array.isArray(item.openingHours) ? item.openingHours : null,
    confirmed: item.confirmed === true,
    evidence: text(item.evidence) || null,
    relation: text(item.relation) || null,
    sourceUrls: Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
      : [],
    source,
  };
}

function marketCompetitors(value: JsonRecord | null): JsonRecord[] {
  return (Array.isArray(value?.competitors) ? value.competitors : [])
    .map((item) => normaliseCompetitor(item, "market"))
    .filter((item): item is JsonRecord => Boolean(item));
}

function placesCompetitors(value: JsonRecord | null): JsonRecord[] {
  return (Array.isArray(value?.competitors) ? value.competitors : [])
    .map((item) => normaliseCompetitor(item, "places"))
    .filter((item): item is JsonRecord => Boolean(item));
}

function mergedCompetitors(market: JsonRecord[], places: JsonRecord[]): JsonRecord[] {
  const merged = new Map<string, JsonRecord>();
  for (const item of [...market, ...places]) {
    const key = text(item.name).toLocaleLowerCase("ru");
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, item);
      continue;
    }
    merged.set(key, {
      ...item,
      ...previous,
      confirmed: previous.confirmed === true || item.confirmed === true,
      rating: previous.rating ?? item.rating ?? null,
      reviewCount: previous.reviewCount ?? item.reviewCount ?? null,
      distanceMeters: previous.distanceMeters ?? item.distanceMeters ?? null,
      sourceUrls: [
        ...(Array.isArray(previous.sourceUrls) ? previous.sourceUrls : []),
        ...(Array.isArray(item.sourceUrls) ? item.sourceUrls : []),
      ].filter((url, index, all) => typeof url === "string" && all.indexOf(url) === index),
    });
  }
  return [...merged.values()]
    .sort((left, right) => Number(right.confirmed === true) - Number(left.confirmed === true));
}

function benchmark(competitors: JsonRecord[]): JsonRecord | null {
  if (!competitors.length) return null;
  const ratings = competitors
    .map((item) => finiteNumber(item.rating))
    .filter((item): item is number => item !== null);
  const counts = competitors
    .map((item) => finiteNumber(item.reviewCount))
    .filter((item): item is number => item !== null);
  const prices = competitors
    .map((item) => finiteNumber(item.priceLevel))
    .filter((item): item is number => item !== null);
  const average = (values: number[]) => values.length
    ? values.reduce((sum, item) => sum + item, 0) / values.length
    : null;
  const averageRating = average(ratings);
  const averageCount = average(counts);
  const averagePrice = average(prices);
  return {
    competitorCount: competitors.length,
    avgRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
    avgReviewCount: averageCount === null ? null : Math.round(averageCount),
    avgPriceLevel: averagePrice === null ? null : Math.round(averagePrice * 10) / 10,
    competitionDensity: competitors.length >= 10 ? "высокая" : competitors.length >= 4 ? "средняя" : "низкая",
  };
}

function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "analysis.view")) {
    return noStore(Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Данные конкурентов вам недоступны" },
      { status: 403 },
    ));
  }

  const [marketRow] = await getDb()
    .select({ dataJson: domainData.dataJson, updatedAt: domainData.updatedAt })
    .from(domainData)
    .where(and(eq(domainData.accountId, account.id), eq(domainData.storeKey, MARKET_KEY)))
    .limit(1);
  const market = parseJson(marketRow?.dataJson ?? null);
  const places = parseJson(account.competitorsJson);
  const competitors = mergedCompetitors(marketCompetitors(market), placesCompetitors(places));
  const refreshedAt = text(market?.generatedAt)
    || text(places?.refreshedAt)
    || marketRow?.updatedAt
    || null;
  const refreshedTime = refreshedAt ? new Date(refreshedAt).getTime() : Number.NaN;
  const confirmedCount = competitors.filter((item) => item.confirmed === true).length;

  return noStore(Response.json({
    ok: true,
    competitors,
    benchmark: benchmark(competitors),
    confirmedCount,
    candidateCount: Math.max(0, competitors.length - confirmedCount),
    refreshedAt,
    stale: !competitors.length || !Number.isFinite(refreshedTime) || Date.now() - refreshedTime > STALE_AFTER_MS,
    hasMarketAnalysis: Boolean(market),
  }));
}

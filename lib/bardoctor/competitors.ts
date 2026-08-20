import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { accounts } from "../../db/schema";
import { authenticateRequest, unauthorized } from "./auth";
import { hasPermission } from "./access-control";
import { getIntegrationValue } from "./integration-secrets";
import { readJsonRequest } from "./http";

type JsonRecord = Record<string, unknown>;
type GeoPoint = { lat: number; lng: number };
type Competitor = {
  placeId: string;
  name: string;
  distanceMeters: number | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  priceLevel: number | null;
  businessStatus: string | null;
  openingHours: string[] | null;
  lat: number | null;
  lng: number | null;
};

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const REFRESH_INTERVAL_MS = 21 * 24 * 60 * 60 * 1_000;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function value(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function placesKey(accountId: number): Promise<string | null> {
  return getIntegrationValue(accountId, "GOOGLE_PLACES_API_KEY");
}

async function geocode(query: string, apiKey: string): Promise<GeoPoint | null> {
  const response = await fetch(`${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
  const data = await response.json() as {
    status?: string;
    results?: Array<{ geometry?: { location?: GeoPoint } }>;
  };
  return data.status === "OK" ? data.results?.[0]?.geometry?.location ?? null : null;
}

function distanceMeters(origin: GeoPoint, destination: GeoPoint): number {
  const radius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const latitude1 = toRadians(origin.lat);
  const latitude2 = toRadians(destination.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2);
  return Math.round(2 * radius * Math.asin(Math.sqrt(haversine)));
}

function placeTypes(businessType: string): string[] {
  const types: Record<string, string[]> = {
    bar: ["bar", "night_club"],
    restaurant: ["restaurant"],
    cafe: ["cafe"],
    pub: ["bar", "pub"],
    club: ["night_club"],
  };
  return types[businessType.toLowerCase()] ?? ["bar", "restaurant", "cafe", "night_club"];
}

async function nearby(origin: GeoPoint, businessType: string, apiKey: string): Promise<Competitor[]> {
  const response = await fetch(NEARBY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id", "places.displayName", "places.rating", "places.userRatingCount",
        "places.priceLevel", "places.businessStatus", "places.types", "places.location",
        "places.regularOpeningHours.weekdayDescriptions",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: placeTypes(businessType),
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: { center: { latitude: origin.lat, longitude: origin.lng }, radius: 3_000 },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Places API HTTP ${response.status}`);
  const data = await response.json() as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string;
      businessStatus?: string;
      types?: string[];
      location?: { latitude?: number; longitude?: number };
      regularOpeningHours?: { weekdayDescriptions?: string[] };
    }>;
  };
  const priceMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return (data.places ?? []).map((place) => {
    const point = typeof place.location?.latitude === "number" && typeof place.location.longitude === "number"
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null;
    return {
      placeId: place.id ?? crypto.randomUUID(),
      name: place.displayName?.text ?? "Без названия",
      distanceMeters: point ? distanceMeters(origin, point) : null,
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      category: place.types?.[0] ?? null,
      priceLevel: place.priceLevel ? priceMap[place.priceLevel] ?? null : null,
      businessStatus: place.businessStatus ?? null,
      openingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    };
  });
}

function average(numbers: number[]): number | null {
  return numbers.length ? numbers.reduce((total, number) => total + number, 0) / numbers.length : null;
}

function benchmark(competitors: Competitor[]) {
  if (!competitors.length) return null;
  const ratings = competitors.map((item) => item.rating).filter((item): item is number => item !== null);
  const counts = competitors.map((item) => item.reviewCount).filter((item): item is number => item !== null);
  const prices = competitors.map((item) => item.priceLevel).filter((item): item is number => item !== null);
  const rating = average(ratings);
  const count = average(counts);
  const price = average(prices);
  return {
    competitorCount: competitors.length,
    avgRating: rating === null ? null : Math.round(rating * 10) / 10,
    avgReviewCount: count === null ? null : Math.round(count),
    avgPriceLevel: price === null ? null : Math.round(price * 10) / 10,
    competitionDensity: competitors.length >= 10 ? "высокая" : competitors.length >= 4 ? "средняя" : "низкая",
  };
}

export async function refreshCompetitors(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (!hasPermission(account, "analysis.run")) {
    return Response.json(
      { ok: false, code: "ACCESS_DENIED", error: "Обновлять конкурентов вам не разрешено" },
      { status: 403 },
    );
  }
  try {
    const parsed = await readJsonRequest<{ force?: unknown }>(request, { maxBytes: 32 * 1024 });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const force = body.force === true;
    const cached = account.competitorsJson ? asRecord(JSON.parse(account.competitorsJson)) : null;
    const refreshedAt = value(cached?.refreshedAt);
    if (!force && refreshedAt && Date.now() - new Date(refreshedAt).getTime() < REFRESH_INTERVAL_MS) {
      return Response.json({ ...cached, skipped: true });
    }

    const apiKey = await placesKey(account.id);
    if (!apiKey) {
      return Response.json(
        {
          ok: false,
          error: "Поиск через Google Places не настроен. Откройте «Рынок рядом» на главной и обновите AI-анализ конкурентов.",
        },
        { status: 503 },
      );
    }
    const restaurant = account.restaurantJson ? asRecord(JSON.parse(account.restaurantJson)) : null;
    if (!restaurant) return Response.json({ ok: false, error: "Сначала заполните профиль заведения" }, { status: 400 });

    let origin = typeof restaurant.lat === "number" && typeof restaurant.lng === "number"
      ? { lat: restaurant.lat, lng: restaurant.lng }
      : null;
    if (!origin) {
      const address = [restaurant.city, restaurant.region, restaurant.country].map(value).filter(Boolean).join(", ");
      if (!address) return Response.json({ ok: false, error: "Укажите город в профиле заведения" }, { status: 400 });
      origin = await geocode(address, apiKey);
      if (!origin) return Response.json({ ok: false, error: "Не удалось определить местоположение заведения" }, { status: 422 });
      restaurant.lat = origin.lat;
      restaurant.lng = origin.lng;
      await getDb().update(accounts).set({ restaurantJson: JSON.stringify(restaurant) }).where(eq(accounts.id, account.id));
    }

    const ownName = value(restaurant.name).toLocaleLowerCase("ru");
    const competitors = (await nearby(origin, value(restaurant.businessType), apiKey))
      .filter((item) => !ownName || item.name.toLocaleLowerCase("ru") !== ownName);
    const timestamp = new Date().toISOString();
    const payload = {
      ok: true,
      skipped: false,
      competitors: competitors.map((item) => ({
        name: item.name,
        distanceMeters: item.distanceMeters,
        rating: item.rating,
        reviewCount: item.reviewCount,
        category: item.category,
        priceLevel: item.priceLevel,
        businessStatus: item.businessStatus,
        openingHours: item.openingHours,
      })),
      benchmark: benchmark(competitors),
      refreshedAt: timestamp,
      stale: false,
    };
    await getDb()
      .update(accounts)
      .set({ competitorsJson: JSON.stringify(payload), updatedAt: timestamp })
      .where(eq(accounts.id, account.id));
    return Response.json(payload);
  } catch {
    return Response.json({ ok: false, error: "Не удалось обновить список конкурентов" }, { status: 502 });
  }
}

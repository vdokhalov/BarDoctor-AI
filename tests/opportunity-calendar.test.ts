import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpportunityBaseline,
  type OpportunityVenueContext,
} from "../lib/bardoctor/opportunity-baseline";
import { resolveOpportunitySourceUrls } from "../lib/bardoctor/opportunity-sources";
import { discoveredOpportunityIsRelevant } from "../lib/bardoctor/opportunity-relevance";
import { oneSignalCanScheduleAt } from "../lib/bardoctor/notification-schedule-window";

const koeln: OpportunityVenueContext = {
  venueName: "Кёльн",
  businessType: "Ночной клуб",
  venueFormat: "Клуб и караоке",
  city: "Бендеры",
  region: "Приднестровье",
  country: "Молдова",
  openTime: "22:00",
  closeTime: "06:00",
  workingDays: {
    0: false,
    1: false,
    2: false,
    3: false,
    4: true,
    5: true,
    6: true,
  },
};

const ufaVenue: OpportunityVenueContext = {
  venueName: "Тест Уфа",
  businessType: "Ночной клуб",
  venueFormat: "Клуб и караоке",
  city: "Уфа",
  region: "",
  country: "Россия",
  openTime: "22:00",
  closeTime: "06:00",
  workingDays: {
    0: false,
    1: false,
    2: false,
    3: false,
    4: true,
    5: true,
    6: true,
  },
};

test("baseline calendar contains national, Bender, and nightlife dates for Koeln", () => {
  const seed = buildOpportunityBaseline({
    context: koeln,
    windowStart: "2026-07-22",
    windowEnd: "2027-01-18",
  });
  const byTitle = new Map(seed.raw.events.map((event) => [String(event.title), event]));

  for (const title of [
    "День независимости Республики Молдова",
    "День языка «Limba noastră»",
    "День Республики",
    "День города Бендеры",
    "Хэллоуин",
    "Международный день студентов",
    "Новогодняя ночь",
    "Новый год",
    "Православное Рождество",
  ]) {
    assert.ok(byTitle.has(title), `missing ${title}`);
  }

  assert.equal(byTitle.get("Хэллоуин")?.startDate, "2026-10-31");
  assert.equal(byTitle.get("Хэллоуин")?.activationDate, "2026-10-31");
  assert.equal(byTitle.get("День города Бендеры")?.activationDate, "2026-10-09");
  assert.match(String((byTitle.get("День города Бендеры")?.relation as Record<string, unknown>)?.reason), /Бендер/);
});

test("Ufa receives Russian, Bashkortostan, city, and nightlife calendar layers", () => {
  const seed = buildOpportunityBaseline({
    context: ufaVenue,
    windowStart: "2026-07-26",
    windowEnd: "2027-07-26",
  });
  const byTitle = new Map(seed.raw.events.map((event) => [String(event.title), event]));

  for (const title of [
    "День Республики Башкортостан",
    "Хэллоуин",
    "День народного единства",
    "Международный день студентов",
    "Новогодняя ночь",
    "Новогодние каникулы",
    "День защитника Отечества",
    "Международный женский день",
    "Праздник Весны и Труда",
    "День Победы",
    "День России",
    "День города Уфы",
  ]) {
    assert.ok(byTitle.has(title), `missing ${title}`);
  }

  assert.equal(byTitle.get("День Республики Башкортостан")?.locality, "regional");
  assert.equal(byTitle.get("День города Уфы")?.location, "Уфа");
  assert.match(
    seed.searchHints.join("\n"),
    /Администрации Уфы[\s\S]*Башкортостан/,
  );
});

test("an arbitrary location gets country, region, city, and local-event search instructions", () => {
  const seed = buildOpportunityBaseline({
    context: {
      ...ufaVenue,
      venueName: "Тест Буэнос-Айрес",
      city: "Буэнос-Айрес",
      region: "",
      country: "Аргентина",
    },
    windowStart: "2026-07-26",
    windowEnd: "2027-07-26",
  });
  const hints = seed.searchHints.join("\n");
  assert.match(hints, /административный регион.*Буэнос-Айрес/i);
  assert.match(hints, /официальный календарь страны.*Аргентина/i);
  assert.match(hints, /праздники региона/i);
  assert.match(hints, /афиши точного города.*Буэнос-Айрес/i);
});

test("web events keep a cited source when query parameters differ", () => {
  const sourceUrl = "https://example.com/events/ufa-show";
  assert.deepEqual(
    resolveOpportunitySourceUrls(
      [`${sourceUrl}?utm_source=search`],
      [{ url: sourceUrl }],
    ),
    [sourceUrl],
  );
});

test("remote noise is rejected while Bender catchment and in-venue sport remain", () => {
  assert.equal(discoveredOpportunityIsRelevant({
    category: "sport",
    location: "Кишинёв",
    city: "Бендеры",
    relationMode: "local_demand",
    distanceKm: 65,
  }), false);
  assert.equal(discoveredOpportunityIsRelevant({
    category: "festival",
    location: "Тараклия",
    city: "Бендеры",
    relationMode: "regional_interest",
    distanceKm: 140,
  }), false);
  assert.equal(discoveredOpportunityIsRelevant({
    category: "festival",
    location: "Криулянский район",
    city: "Бендеры",
    relationMode: "venue_activation",
    distanceKm: 85,
  }), false);
  assert.equal(discoveredOpportunityIsRelevant({
    category: "concert",
    location: "Бендерская крепость, Бендеры",
    city: "Бендеры",
    relationMode: "local_demand",
    distanceKm: 3,
  }), true);
  assert.equal(discoveredOpportunityIsRelevant({
    category: "sport",
    location: "Трансляция внутри заведения",
    city: "Бендеры",
    relationMode: "venue_activation",
    distanceKm: null,
  }), true);
});

test("unknown-distance local event must name the venue city", () => {
  assert.equal(discoveredOpportunityIsRelevant({
    category: "concert",
    location: "центр города Бендеры",
    city: "Бендеры",
    relationMode: "local_demand",
    distanceKm: null,
  }), true);
  assert.equal(discoveredOpportunityIsRelevant({
    category: "concert",
    location: "Кишинёв",
    city: "Бендеры",
    relationMode: "local_demand",
    distanceKm: null,
  }), false);
});

test("OneSignal receives only reminders inside its 30-day scheduling window", () => {
  const now = Date.parse("2026-07-22T12:00:00.000Z");
  assert.equal(oneSignalCanScheduleAt("2026-08-20T09:00:00.000Z", now), true);
  assert.equal(oneSignalCanScheduleAt("2026-08-22T09:00:00.000Z", now), false);
  assert.equal(oneSignalCanScheduleAt("2026-10-17T09:00:00.000Z", now), false);
  assert.equal(oneSignalCanScheduleAt("2026-07-22T12:20:00.000Z", now), false);
});

export const OPPORTUNITY_HORIZON_DAYS = 365;
export const OPPORTUNITY_CALENDAR_VERSION = 3 as const;
export const OPPORTUNITY_SEARCH_RADIUS_KM = 35;

type JsonRecord = Record<string, unknown>;

export type OpportunityVenueContext = {
  venueName: string;
  businessType: string;
  venueFormat: string;
  city: string;
  region: string;
  country: string;
  openTime: string;
  closeTime: string;
  workingDays: JsonRecord | null;
};

export type BaselineOpportunitySource = {
  url: string;
  title: string;
};

export type BaselineOpportunitySeed = {
  raw: {
    summary: string;
    events: JsonRecord[];
  };
  sources: BaselineOpportunitySource[];
  searchHints: string[];
};

const MOLDOVA_LABOUR_CODE = "https://www.legis.md/cautare/getResults?doc_id=113032&lang=ro";
const BENDER_CITY_DAY = "https://bendery.gospmr.org/3633-8-oktyabrya-benderchane-otmetyat-den-goroda.html";
const REPUBLIC_DAY = "https://bendery.gospmr.org/8282-2-sentyabrya-den-respubliki.html";
const RUSSIA_HOLIDAYS = "https://xn--80akibcicpdbetz7e2g.xn--p1ai/questions/view/249110";
const BASHKORTOSTAN_CALENDAR = "https://mintrud.bashkortostan.ru/activity/54534/";
const UFA_CITY_DAY = "https://www.gorodufa.ru/about/info/news/08062026-sportivnye-meropriyatiya-v-ufe-12-iyunya-/";
const HALLOWEEN = "https://www.timeanddate.com/holidays/common/halloween";
const NEW_YEAR_EVE = "https://www.timeanddate.com/holidays/common/new-year-eve";
const STUDENTS_DAY = "https://www.iesalc.unesco.org/en/articles/students-day-2025-young-voices-planet";

const SOURCE_TITLES: Record<string, string> = {
  [MOLDOVA_LABOUR_CODE]: "Трудовой кодекс Республики Молдова — праздничные дни",
  [BENDER_CITY_DAY]: "Государственная администрация Бендер — День города",
  [REPUBLIC_DAY]: "Государственная администрация Бендер — 2 сентября",
  [RUSSIA_HOLIDAYS]: "Онлайнинспекция.рф — нерабочие праздничные дни России",
  [BASHKORTOSTAN_CALENDAR]: "Минтруд Башкортостана — производственный календарь",
  [UFA_CITY_DAY]: "Администрация Уфы — День города",
  [HALLOWEEN]: "Halloween — ежегодно 31 октября",
  [NEW_YEAR_EVE]: "Канун Нового года — ежегодно 31 декабря",
  [STUDENTS_DAY]: "UNESCO IESALC — Международный день студентов",
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();
}

function containsAny(value: string, needles: string[]): boolean {
  const candidate = fold(value);
  return needles.some((needle) => candidate.includes(fold(needle)));
}

function isMoldova(context: OpportunityVenueContext): boolean {
  return containsAny(context.country, ["молдова", "молдавия", "moldova", "md"]);
}

function isRussia(context: OpportunityVenueContext): boolean {
  return containsAny(context.country, ["россия", "российская федерация", "russia", "ru"]);
}

function isBender(context: OpportunityVenueContext): boolean {
  return containsAny([context.city, context.region].join(" "), [
    "бендер",
    "bender",
    "tighina",
    "тигина",
  ]);
}

function isTransnistria(context: OpportunityVenueContext): boolean {
  return isBender(context) || containsAny(
    [context.city, context.region, context.country].join(" "),
    ["приднестр", "transnistr", "пмр", "pmr", "тираспол", "tiraspol"],
  );
}

function isUfa(context: OpportunityVenueContext): boolean {
  return containsAny([context.city, context.region].join(" "), ["уфа", "ufa"]);
}

function isBashkortostan(context: OpportunityVenueContext): boolean {
  return isUfa(context) || containsAny(
    [context.city, context.region].join(" "),
    ["башкортостан", "башкирия", "bashkortostan", "bashkir"],
  );
}

function isNightVenue(context: OpportunityVenueContext): boolean {
  return containsAny(
    [context.businessType, context.venueFormat].join(" "),
    ["ночн", "night", "клуб", "club", "караоке", "karaoke", "бар", "bar", "дискотек", "disco"],
  );
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mondayBasedDay(value: string): number {
  return (new Date(`${value}T12:00:00Z`).getUTCDay() + 6) % 7;
}

function scheduleConfigured(context: OpportunityVenueContext): boolean {
  return Boolean(context.workingDays && Object.values(context.workingDays).some((value) => typeof value === "boolean"));
}

function isOpen(context: OpportunityVenueContext, value: string): boolean {
  if (!scheduleConfigured(context)) return true;
  return context.workingDays?.[String(mondayBasedDay(value))] === true;
}

function nearestOpenDate(context: OpportunityVenueContext, value: string, forceDate = false): {
  activationDate: string;
  distance: number;
  configured: boolean;
} {
  if (forceDate || !scheduleConfigured(context)) {
    return { activationDate: value, distance: 0, configured: scheduleConfigured(context) };
  }
  const offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6];
  const offset = offsets.find((candidate) => isOpen(context, addDays(value, candidate))) ?? 0;
  return {
    activationDate: addDays(value, offset),
    distance: Math.abs(offset),
    configured: true,
  };
}

function weekday(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("ru-RU", { weekday: "long" });
}

function scheduleFit(input: { configured: boolean; distance: number }, forceDate = false): number {
  if (forceDate) return 20;
  if (!input.configured) return 10;
  if (input.distance === 0) return 20;
  if (input.distance <= 1) return 16;
  if (input.distance <= 3) return 12;
  return 7;
}

function scheduleReason(
  context: OpportunityVenueContext,
  eventDate: string,
  activation: ReturnType<typeof nearestOpenDate>,
  forceDate = false,
): string {
  if (!activation.configured) {
    return "Точный график заведения не учтён: заполните рабочие дни, чтобы BarDoctor выбрал смену точнее.";
  }
  const hours = context.openTime && context.closeTime
    ? ` (${context.openTime}–${context.closeTime})`
    : "";
  if (forceDate || activation.activationDate === eventDate) {
    return `Дата приходится на ${weekday(eventDate)} — по профилю это рабочая смена${hours}.`;
  }
  return `В саму дату заведение по профилю закрыто; ближайшая рабочая смена — ${activation.activationDate}, ${weekday(activation.activationDate)}${hours}.`;
}

function orthodoxEaster(year: number): string {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return addDays(dateKey(year, month, day), 13);
}

type BaselineEventInput = {
  title: string;
  category: "holiday" | "seasonal" | "city";
  calendarType: "official" | "local" | "commercial";
  date: string;
  endDate?: string | null;
  location: string;
  locality: "local" | "regional" | "national";
  audience: string;
  fact: string;
  relationMode: "local_demand" | "venue_activation";
  relationReason: string;
  audienceFit: number;
  proximity: number;
  commercialPotential: number;
  readiness: number;
  format: string;
  offer: string;
  promotion: string;
  operations: string;
  leadDays: number;
  metric: string;
  risks: string[];
  sourceUrl: string;
  forceDate?: boolean;
};

function baselineEvent(
  context: OpportunityVenueContext,
  input: BaselineEventInput,
): JsonRecord {
  const activation = nearestOpenDate(context, input.date, input.forceDate);
  const schedule = scheduleFit(activation, input.forceDate);
  const dateReason = scheduleReason(context, input.date, activation, input.forceDate);
  const score = input.audienceFit + schedule + input.proximity + input.commercialPotential + input.readiness;
  return {
    title: input.title,
    category: input.category,
    calendarType: input.calendarType,
    origin: "baseline",
    startDate: input.date,
    endDate: input.endDate ?? null,
    activationDate: activation.activationDate,
    startTime: null,
    location: input.location,
    locality: input.locality,
    audience: input.audience,
    summary: input.fact,
    confidence: "high",
    relation: {
      mode: input.relationMode,
      distanceKm: input.relationMode === "local_demand" ? 0 : null,
      reason: input.relationReason,
    },
    scoreReason: `${input.relationReason} ${dateReason}`,
    scoreBreakdown: {
      audienceFit: input.audienceFit,
      scheduleFit: schedule,
      proximity: input.proximity,
      commercialPotential: input.commercialPotential,
      readiness: input.readiness,
    },
    potentialScore: score,
    whyUseful: [input.relationReason, dateReason],
    impact: {
      score,
      level: score >= 75 ? "high" : score >= 55 ? "medium" : "low",
      metric: input.metric,
      range: "без диапазона: у заведения пока нет истории по этой дате",
      basis: "Это оценка пригодности даты, а не обещание роста. После события BarDoctor сравнит фактическую смену с обычными сменами того же дня недели.",
    },
    recommendation: {
      format: input.format,
      offer: input.offer,
      promotion: input.promotion,
      operations: input.operations,
      decisionDeadline: addDays(activation.activationDate, -input.leadDays),
      leadDays: input.leadDays,
    },
    risks: input.risks,
    sourceUrls: [input.sourceUrl],
  };
}

function inWindow(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function mdHoliday(
  context: OpportunityVenueContext,
  input: Omit<BaselineEventInput, "category" | "calendarType" | "location" | "locality" | "relationMode" | "sourceUrl">,
): JsonRecord {
  return baselineEvent(context, {
    ...input,
    category: "holiday",
    calendarType: "official",
    location: "Республика Молдова",
    locality: "national",
    relationMode: "venue_activation",
    sourceUrl: MOLDOVA_LABOUR_CODE,
  });
}

function officialHolidayCopy(context: OpportunityVenueContext, title: string): string {
  const venue = context.venueName || "заведения";
  if (isBender(context) && ["День независимости Республики Молдова", "День языка «Limba noastră»"].includes(title)) {
    return `Это официальная дата страны из профиля. Для аудитории «${venue}» в Бендерах её влияние нельзя считать локальным автоматически — спрос нужно проверять по броням и фактической смене.`;
  }
  return `Это официальный нерабочий день страны из профиля: он может менять привычный график гостей «${venue}», но сам по себе не гарантирует спрос.`;
}

function recurringYears(start: string, end: string): number[] {
  const first = Number(start.slice(0, 4));
  const last = Number(end.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function moldovaHolidayEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  if (!isMoldova(context)) return [];
  const night = isNightVenue(context);
  const eventInputs = recurringYears(start, end).flatMap((year) => {
    const easter = orthodoxEaster(year);
    const fixed = [
      [1, 1, "Новый год", 25, 16, 18, 8, "Новогодняя ночь или after-party по отдельному сценарию", true],
      [1, 7, "Православное Рождество", 18, 13, 12, 8, "Рождественский вечер в спокойном формате", false],
      [1, 8, "Второй день православного Рождества", 13, 11, 8, 8, "Продолжение праздничного уик-энда без отдельной большой кампании", false],
      [3, 8, "Международный женский день", 28, 18, 19, 8, "Праздничная программа и раннее бронирование столов", false],
      [5, 1, "Праздник труда", 16, 13, 11, 8, "Дополнительная программа только при подтверждённых бронях", false],
      [5, 9, "День Победы и День Европы", 12, 12, 8, 8, "Нейтральная вечерняя программа без спорной символики", false],
      [6, 1, "Международный день защиты детей", night ? 4 : 18, 11, night ? 3 : 12, 7, night ? "Для ночного формата отдельная программа не нужна" : "Семейный дневной формат", false],
      [8, 27, "День независимости Республики Молдова", isBender(context) ? 10 : 22, 14, isBender(context) ? 7 : 15, 8, "Проверить брони; запускать программу только при реальном спросе", false],
      [8, 31, "День языка «Limba noastră»", isBender(context) ? 7 : 17, 12, isBender(context) ? 5 : 10, 8, "Культурный повод без автоматической клубной кампании", false],
      [12, 25, "Рождество по новому стилю", 16, 13, 11, 8, "Рождественский вечер или праздничный уик-энд", false],
    ] as const;
    const variable = [
      [easter, "Пасха", 10, 10, 5, 7, "Отдельная ночная кампания обычно не требуется"],
      [addDays(easter, 1), "Второй день Пасхи", 10, 10, 5, 7, "Учитывать выходной при планировании смены"],
      [addDays(easter, 8), "Пасха усопших", 3, 8, 2, 6, "Информационная дата; промокампания для ночного формата не нужна"],
    ] as const;
    return [
      ...fixed.map(([month, day, title, audienceFit, proximity, commercialPotential, readiness, format, forceDate]) => ({
        title,
        date: dateKey(year, month, day),
        audienceFit,
        proximity,
        commercialPotential,
        readiness,
        format,
        forceDate,
      })),
      ...variable.map(([date, title, audienceFit, proximity, commercialPotential, readiness, format]) => ({
        title,
        date,
        audienceFit,
        proximity,
        commercialPotential,
        readiness,
        format,
        forceDate: false,
      })),
    ];
  });

  return eventInputs
    .filter((item) => inWindow(item.date, start, end))
    .map((item) => mdHoliday(context, {
      title: item.title,
      date: item.date,
      audience: "Гости заведения и жители, чей обычный график меняется из-за официального выходного.",
      fact: `${item.title} входит в календарь праздничных нерабочих дней Республики Молдова.`,
      relationReason: officialHolidayCopy(context, item.title),
      audienceFit: item.audienceFit,
      proximity: item.proximity,
      commercialPotential: item.commercialPotential,
      readiness: item.readiness,
      format: item.format,
      offer: "Не давать скидку автоматически: сначала проверить брони и сравнить спрос с обычной сменой.",
      promotion: "Если дата взята в работу — один понятный анонс с программой и временем начала.",
      operations: "Сверить график команды, транспорт после закрытия и необходимый запас по фактическим броням.",
      leadDays: item.title === "Новый год" ? 45 : 14,
      metric: "загрузка смены рядом с официальным выходным",
      risks: ["Официальный выходной не равен гарантированному спросу у конкретного заведения."],
      forceDate: item.forceDate,
    }));
}

function russianHolidayEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  if (!isRussia(context)) return [];
  const night = isNightVenue(context);
  const eventInputs = recurringYears(start, end).flatMap((year) => [
    {
      title: "Новогодние каникулы",
      date: dateKey(year, 1, 1),
      endDate: dateKey(year, 1, 8),
      audienceFit: 25,
      proximity: 18,
      commercialPotential: night ? 17 : 13,
      readiness: 8,
      format: night
        ? "Новогодние клубные смены по отдельному графику и подтверждённым броням"
        : "Праздничный график по подтверждённому спросу",
      forceDate: true,
    },
    {
      title: "День защитника Отечества",
      date: dateKey(year, 2, 23),
      endDate: null,
      audienceFit: night ? 22 : 18,
      proximity: 18,
      commercialPotential: night ? 15 : 11,
      readiness: 8,
      format: "Тематическая смена или предложение для компаний без общей скидки",
      forceDate: false,
    },
    {
      title: "Международный женский день",
      date: dateKey(year, 3, 8),
      endDate: null,
      audienceFit: 28,
      proximity: 18,
      commercialPotential: 19,
      readiness: 8,
      format: "Праздничная программа и раннее бронирование столов",
      forceDate: false,
    },
    {
      title: "Праздник Весны и Труда",
      date: dateKey(year, 5, 1),
      endDate: null,
      audienceFit: 15,
      proximity: 16,
      commercialPotential: 10,
      readiness: 8,
      format: "Дополнительная программа только при подтверждённых бронях",
      forceDate: false,
    },
    {
      title: "День Победы",
      date: dateKey(year, 5, 9),
      endDate: null,
      audienceFit: 14,
      proximity: 16,
      commercialPotential: 8,
      readiness: 8,
      format: "Учитывать городской трафик; не превращать памятную дату в агрессивную промокампанию",
      forceDate: false,
    },
    {
      title: "День России",
      date: dateKey(year, 6, 12),
      endDate: null,
      audienceFit: 19,
      proximity: 17,
      commercialPotential: 12,
      readiness: 8,
      format: "Проверить городскую программу и спрос на ближайшую рабочую смену",
      forceDate: false,
    },
    {
      title: "День народного единства",
      date: dateKey(year, 11, 4),
      endDate: null,
      audienceFit: 18,
      proximity: 17,
      commercialPotential: 12,
      readiness: 8,
      format: "Учитывать официальный выходной; отдельную программу запускать только по спросу",
      forceDate: false,
    },
  ]);

  return eventInputs
    .filter((item) => inWindow(item.date, start, end))
    .map((item) => baselineEvent(context, {
      title: item.title,
      category: "holiday",
      calendarType: "official",
      date: item.date,
      endDate: item.endDate,
      location: "Российская Федерация",
      locality: "national",
      audience: "Гости заведения и жители, чей график меняется из-за официального нерабочего дня.",
      fact: `${item.title} входит в перечень нерабочих праздничных дней Российской Федерации.`,
      relationMode: "venue_activation",
      relationReason: `Это официальный календарный слой страны из профиля «${context.venueName}». Дата влияет на график и поведение гостей, но сама по себе не гарантирует спрос.`,
      audienceFit: item.audienceFit,
      proximity: item.proximity,
      commercialPotential: item.commercialPotential,
      readiness: item.readiness,
      format: item.format,
      offer: "Не давать скидку автоматически: сначала проверить брони и сравнить спрос с обычной сменой.",
      promotion: "Если дата взята в работу — один конкретный анонс с программой, временем и условиями брони.",
      operations: "Сверить график команды, оплату работы в праздник, транспорт и запас по фактическим броням.",
      leadDays: item.title === "Новогодние каникулы" ? 45 : 14,
      metric: "загрузка и выручка смены рядом с официальным выходным",
      risks: ["Официальный выходной не равен гарантированному спросу у конкретного заведения."],
      sourceUrl: RUSSIA_HOLIDAYS,
      forceDate: item.forceDate,
    }));
}

function countryHolidayEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  return [
    ...moldovaHolidayEvents(context, start, end),
    ...russianHolidayEvents(context, start, end),
  ];
}

function localBenderEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  if (!isBender(context)) return [];
  const night = isNightVenue(context);
  return recurringYears(start, end).flatMap((year) => {
    const candidates = [
      baselineEvent(context, {
        title: "День Республики",
        category: "holiday",
        calendarType: "local",
        date: dateKey(year, 9, 2),
        location: "Бендеры и Приднестровье",
        locality: "local",
        audience: "Жители Бендер и ближайших городов, для которых 2 сентября — локальная праздничная дата.",
        fact: "2 сентября в Бендерах традиционно проходит городская программа ко Дню Республики.",
        relationMode: "local_demand",
        relationReason: `Дата отмечается непосредственно в Бендерах, поэтому относится к локальной аудитории «${context.venueName}», а не к туристическому потоку из другого города.`,
        audienceFit: night ? 24 : 20,
        proximity: 20,
        commercialPotential: night ? 16 : 12,
        readiness: 8,
        format: night ? "Праздничная клубная смена в ближайшую рабочую ночь" : "Локальное праздничное предложение в ближайшую рабочую смену",
        offer: "Бронь столов и понятная программа без искусственной скидки на всё меню.",
        promotion: "Геотаргет только на Бендеры и ближайшую зону; анонс за 10–14 дней.",
        operations: "Проверить усиление входа, охрану, транспорт после закрытия и запас ходовых позиций.",
        leadDays: 18,
        metric: "локальные брони и загрузка ближайшей смены",
        risks: ["Если дата не совпадает с рабочим днём, перенос программы нужно явно объяснить в анонсе."],
        sourceUrl: REPUBLIC_DAY,
      }),
      baselineEvent(context, {
        title: "День города Бендеры",
        category: "city",
        calendarType: "local",
        date: dateKey(year, 10, 8),
        location: "Бендеры",
        locality: "local",
        audience: "Жители Бендер и гости городских мероприятий.",
        fact: "Бендеры отмечают День города 8 октября; городская администрация публикует отдельную программу мероприятий.",
        relationMode: "local_demand",
        relationReason: `Это событие происходит в Бендерах, где находится «${context.venueName}». Оно имеет прямую локальную связь, в отличие от фестивалей в Кишинёве, Тараклии или Криулянском районе.`,
        audienceFit: night ? 28 : 24,
        proximity: 20,
        commercialPotential: night ? 18 : 14,
        readiness: 8,
        format: night ? "Продолжение Дня города после 22:00: DJ/караоке и бронирование столов" : "Спецпредложение после городской программы",
        offer: "Пакет на стол или депозит с фиксированным составом; без обещаний скидки всем гостям.",
        promotion: "Привязать анонс к Бендерам и ближайшей рабочей смене, а не к абстрактному фестивалю.",
        operations: "Проверить время окончания городских мероприятий, входной поток, охрану и поздний транспорт.",
        leadDays: 30,
        metric: "поздние брони и входной поток после городской программы",
        risks: ["Городскую программу и возможный перенос по погоде нужно перепроверить перед запуском рекламы."],
        sourceUrl: BENDER_CITY_DAY,
      }),
    ];
    return candidates.filter((event) => inWindow(String(event.startDate), start, end));
  });
}

function localUfaEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  if (!isBashkortostan(context)) return [];
  const night = isNightVenue(context);
  return recurringYears(start, end).flatMap((year) => {
    const candidates = [
      baselineEvent(context, {
        title: "День Республики Башкортостан",
        category: "holiday",
        calendarType: "local",
        date: dateKey(year, 10, 11),
        location: "Республика Башкортостан",
        locality: "regional",
        audience: "Жители Уфы и Республики Башкортостан, для которых 11 октября является региональным праздником.",
        fact: "11 октября отмечается День Республики Башкортостан.",
        relationMode: "venue_activation",
        relationReason: `«${context.venueName}» находится в Уфе, столице Башкортостана, поэтому региональный праздник относится к его прямой аудитории.`,
        audienceFit: night ? 24 : 20,
        proximity: 20,
        commercialPotential: night ? 16 : 12,
        readiness: 8,
        format: night
          ? "Региональная праздничная смена в ближайшую рабочую ночь"
          : "Локальная праздничная программа в ближайшую рабочую смену",
        offer: "Бронь столов или пакет на компанию без автоматической скидки на всё меню.",
        promotion: "Геотаргет на Уфу; анонсировать только конкретную программу и условия брони.",
        operations: "Проверить городской трафик, график команды, безопасность и запас по подтверждённым броням.",
        leadDays: 21,
        metric: "локальные брони и загрузка смены в День Республики",
        risks: ["Формат празднования и перенос выходного нужно перепроверять по календарю текущего года."],
        sourceUrl: BASHKORTOSTAN_CALENDAR,
      }),
      ...(isUfa(context) ? [
        baselineEvent(context, {
          title: "День города Уфы",
          category: "city",
          calendarType: "local",
          date: dateKey(year, 6, 12),
          location: "Уфа",
          locality: "local",
          audience: "Жители Уфы и гости городской праздничной программы.",
          fact: "День города Уфы отмечается 12 июня вместе с Днём России.",
          relationMode: "local_demand",
          relationReason: `Событие проходит непосредственно в Уфе, где находится «${context.venueName}», и может менять вечерний поток гостей.`,
          audienceFit: night ? 27 : 23,
          proximity: 20,
          commercialPotential: night ? 17 : 13,
          readiness: 8,
          format: night
            ? "Продолжение Дня города в ближайшую рабочую ночь"
            : "Предложение, привязанное ко времени окончания городской программы",
          offer: "Предварительная бронь или депозит на стол с прозрачным составом.",
          promotion: "Привязать анонс к официальной программе Уфы и реальной рабочей смене.",
          operations: "Проверить время окончания городских площадок, транспорт, охрану и входной поток.",
          leadDays: 30,
          metric: "входной поток и брони после городской программы",
          risks: ["Ежегодную программу и площадки нужно подтверждать перед рекламой."],
          sourceUrl: UFA_CITY_DAY,
        }),
      ] : []),
    ];
    return candidates.filter((event) => inWindow(String(event.startDate), start, end));
  });
}

function commercialEvents(
  context: OpportunityVenueContext,
  start: string,
  end: string,
): JsonRecord[] {
  const night = isNightVenue(context);
  const city = context.city || "город заведения";
  return recurringYears(start, end).flatMap((year) => {
    const candidates: JsonRecord[] = [
      baselineEvent(context, {
        title: "Хэллоуин",
        category: "seasonal",
        calendarType: "commercial",
        date: dateKey(year, 10, 31),
        location: `${city} · программа внутри заведения`,
        locality: "local",
        audience: "Гости, которым подходят костюмированные вечеринки и ночная программа.",
        fact: "Хэллоуин ежегодно отмечается 31 октября и широко используется как повод для костюмированных вечеринок.",
        relationMode: "venue_activation",
        relationReason: night
          ? `Это не удалённый фестиваль: формат можно полностью реализовать внутри «${context.venueName}» и измерить по броням, входам и среднему чеку.`
          : `Формат можно провести внутри «${context.venueName}», но соответствие аудитории нужно подтвердить до запуска.`,
        audienceFit: night ? 30 : 16,
        proximity: 20,
        commercialPotential: night ? 20 : 11,
        readiness: 8,
        format: night ? "Костюмированная клубная ночь с конкурсом образов и тематическим караоке-блоком" : "Ограниченная тематическая программа без полной смены концепции",
        offer: "Депозит на стол или бонус за костюм вместо общей скидки.",
        promotion: "Тизер за 30 дней, полная программа за 14 дней, напоминание за 48 часов.",
        operations: "Свет, декор, сценарий ведущего/DJ, фотозона, контроль реквизита и запас ходовых позиций.",
        leadDays: 45,
        metric: "брони столов, входной поток и средний чек тематической смены",
        risks: ["Не закупать дорогой декор до первых подтверждённых броней."],
        sourceUrl: HALLOWEEN,
      }),
      baselineEvent(context, {
        title: "Новогодняя ночь",
        category: "holiday",
        calendarType: "commercial",
        date: dateKey(year, 12, 31),
        location: `${city} · программа внутри заведения`,
        locality: "local",
        audience: "Гости, планирующие встречу Нового года вне дома.",
        fact: "Канун Нового года приходится на 31 декабря и является самостоятельным поводом для праздничной программы.",
        relationMode: "venue_activation",
        relationReason: `Новогодняя ночь создаётся внутри «${context.venueName}» и напрямую связана с продажей мест, программой, командой и запасами заведения.`,
        audienceFit: 30,
        proximity: 20,
        commercialPotential: 20,
        readiness: 8,
        format: night ? "Новогодняя клубная ночь по предварительной брони" : "Новогодняя программа по предварительной брони",
        offer: "Фиксированный пакет/депозит на стол с прозрачным составом и предоплатой.",
        promotion: "Открыть раннюю бронь за 60–75 дней; повышать цену по мере заполнения, если это разрешает политика заведения.",
        operations: "Утвердить программу, лимит гостей, схему посадки, охрану, транспорт команды и закупки по предоплатам.",
        leadDays: 75,
        metric: "продажа мест, предоплаты и итоговая прибыль новогодней смены",
        risks: ["Не подтверждать дорогую программу без минимального объёма предоплат.", "Отдельно проверить режим работы и требования безопасности."],
        sourceUrl: NEW_YEAR_EVE,
        forceDate: true,
      }),
    ];
    if (night) {
      candidates.push(baselineEvent(context, {
        title: "Международный день студентов",
        category: "seasonal",
        calendarType: "commercial",
        date: dateKey(year, 11, 17),
        location: `${city} · программа внутри заведения`,
        locality: "local",
        audience: "Совершеннолетние студенты и молодая аудитория заведения.",
        fact: "Международный день студентов отмечается 17 ноября.",
        relationMode: "venue_activation",
        relationReason: `Для ночного формата «${context.venueName}» это проверяемый повод для молодой аудитории; удалённое городское событие для него не требуется.`,
        audienceFit: 25,
        proximity: 20,
        commercialPotential: 15,
        readiness: 9,
        format: "Студенческая ночь в ближайшую рабочую смену с проверкой возраста на входе",
        offer: "Ограниченный пакет по студенческому документу без демпинга основного прайса.",
        promotion: "Таргет на совершеннолетнюю аудиторию Бендер и партнёрства с локальными студенческими сообществами.",
        operations: "Проверка возраста, усиление входа и контроль ответственного сервиса.",
        leadDays: 21,
        metric: "входы и брони молодой совершеннолетней аудитории",
        risks: ["Коммуникация должна быть ориентирована только на совершеннолетних гостей."],
        sourceUrl: STUDENTS_DAY,
      }));
    }
    return candidates.filter((event) => inWindow(String(event.startDate), start, end));
  });
}

function uniqueSources(events: JsonRecord[]): BaselineOpportunitySource[] {
  const urls = new Set<string>();
  for (const event of events) {
    for (const url of Array.isArray(event.sourceUrls) ? event.sourceUrls : []) {
      if (typeof url === "string") urls.add(url);
    }
  }
  return [...urls].map((url) => ({ url, title: SOURCE_TITLES[url] ?? new URL(url).hostname }));
}

export function buildOpportunityBaseline(input: {
  context: OpportunityVenueContext;
  windowStart: string;
  windowEnd: string;
}): BaselineOpportunitySeed {
  const { context, windowStart, windowEnd } = input;
  const events = [
    ...countryHolidayEvents(context, windowStart, windowEnd),
    ...localBenderEvents(context, windowStart, windowEnd),
    ...localUfaEvents(context, windowStart, windowEnd),
    ...commercialEvents(context, windowStart, windowEnd),
  ].sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)));
  const searchHints = isBender(context)
    ? [
        "https://bendery.gospmr.org/anons-afisha.html — официальная афиша Бендер",
        "https://pridnestrovie-tourism.com/doings/ — календарь событий Приднестровья",
        "https://biletpmr.com/leisures — локальные билеты и развлекательные события",
        "Проверять также Тирасполь только как ближайшую зону; Кишинёв и остальные районы не считать источником гостей без отдельного доказательства.",
      ]
    : isUfa(context)
      ? [
          "https://gorodufa.ru/about/info/news/ — официальный сайт Администрации Уфы: новости, анонсы и городские мероприятия",
          "https://mintrud.bashkortostan.ru/activity/54534/ — официальный календарь Башкортостана",
          "Сначала проверять Уфу и Республику Башкортостан; события других городов не считать локальным спросом без подтверждённой дистанции.",
          "Отдельно проверить афиши Уфа-Арены, городских концертных площадок, театров и домашние матчи команд Уфы.",
        ]
      : [
          `Сначала установить административный регион города «${context.city || "город не заполнен"}» по официальному источнику.`,
          `Проверить официальный календарь страны «${context.country || "страна не заполнена"}», затем праздники региона «${context.region || "определить по городу"}», затем День города и муниципальную афишу.`,
          `Искать афиши точного города «${context.city || "город не заполнен"}»: концерты, спорт, фестивали и крупные городские события.`,
          `Не расширять локальный спрос дальше ${OPPORTUNITY_SEARCH_RADIUS_KM} км без подтверждённого расстояния.`,
        ];

  return {
    raw: {
      summary: `Добавлен базовый слой из ${events.length} подтверждённых дат. Веб-поиск обязан проверить недостающие праздники страны, региона и города, а затем локальные афиши.`,
      events,
    },
    sources: uniqueSources(events),
    searchHints,
  };
}

export function opportunityVenueProfileSignature(context: OpportunityVenueContext): string {
  return fold([
    context.venueName,
    context.businessType,
    context.venueFormat,
    context.city,
    context.region,
    context.country,
    context.openTime,
    context.closeTime,
    JSON.stringify(context.workingDays ?? {}),
  ].join("|"));
}

export function isBenderOpportunityContext(context: OpportunityVenueContext): boolean {
  return isBender(context) || isTransnistria(context);
}

export function opportunityBaselineHasCountryCalendar(context: OpportunityVenueContext): boolean {
  return isMoldova(context) || isRussia(context);
}

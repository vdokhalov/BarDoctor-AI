export const REVIEW_SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  yandex: "Яндекс Карты",
  "2gis": "2ГИС",
  tripadvisor: "TripAdvisor",
  survey: "Анкета BarDoctor",
  other: "Другой источник",
};

export type ReviewIngestionMethod = "sync" | "manual" | "file_import";
export type JsonRecord = Record<string, unknown>;

export type CanonicalReview = JsonRecord & {
  id: string;
  venueId: number;
  source: string;
  externalId?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  rating: number | null;
  text: string;
  date: string;
  publishedAt: string;
  importedAt?: string;
  syncedAt?: string;
  ingestionMethod: ReviewIngestionMethod;
  sourceMetadata?: JsonRecord;
  deduplicationKey: string;
  aiStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedReview = JsonRecord & {
  venueId: number;
  source: string;
  externalId?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  rating: number | null;
  text: string;
  date: string;
  publishedAt: string;
  importedAt?: string;
  syncedAt?: string;
  ingestionMethod: ReviewIngestionMethod;
  sourceMetadata?: JsonRecord;
  deduplicationKey: string;
  aiStatus: string;
};

export function reviewRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function reviewText(value: unknown, fallback = "", max = 10_000): string {
  if (value == null) return fallback;
  const result = String(value).trim();
  return result ? result.slice(0, max) : fallback;
}

export function reviewOptionalText(value: unknown, max = 500): string | undefined {
  const result = reviewText(value, "", max);
  return result || undefined;
}

export function reviewSourceId(value: unknown, fallback = "other"): string {
  const normalized = reviewText(value, fallback, 80)
    .toLocaleLowerCase("ru")
    .replace(/[\s.]+/g, "_")
    .replace(/[^a-zа-яё0-9_-]+/gi, "")
    .replace(/^_+|_+$/g, "");
  const aliases: Record<string, string> = {
    google_business: "google",
    google_business_profile: "google",
    google_maps: "google",
    яндекс: "yandex",
    яндекс_карты: "yandex",
    two_gis: "2gis",
    gis2: "2gis",
    trip_advisor: "tripadvisor",
    ручной: "other",
  };
  return aliases[normalized] ?? (normalized || fallback);
}

function reviewRating(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return Math.round(parsed * 10) / 10;
}

function reviewPublishedAt(value: unknown, fallback: string): string {
  const candidate = reviewText(value, "", 80);
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return `${candidate}T12:00:00.000Z`;
  const dotted = candidate.match(/^(\d{1,2})([./-])(\d{1,2})\2(\d{2,4})$/);
  if (dotted) {
    const year = dotted[4]!.length === 2 ? `20${dotted[4]}` : dotted[4];
    const first = Number(dotted[1]);
    const second = Number(dotted[3]);
    // SheetJS emits parsed spreadsheet dates with the US-style slash format.
    // Dotted and dashed human-entered dates keep the common day-first format.
    const slashMonthFirst = dotted[2] === "/" && first <= 12;
    const month = slashMonthFirst ? first : second > 12 && first <= 12 ? first : second;
    const day = slashMonthFirst ? second : second > 12 && first <= 12 ? second : first;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00.000Z`;
    }
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.valueOf()) ? fallback : parsed.toISOString();
}

function normalizedText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru").replace(/\s+/g, " ").trim();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function reviewDeduplicationKey(input: {
  source: string;
  externalId?: string;
  authorName?: string;
  rating?: number | null;
  text: string;
  publishedAt: string;
}): string {
  const source = reviewSourceId(input.source);
  const externalId = reviewOptionalText(input.externalId, 240);
  if (externalId) return `${source}:external:${externalId}`;
  const fingerprint = [
    source,
    input.publishedAt.slice(0, 10),
    normalizedText(input.authorName ?? ""),
    input.rating == null ? "" : String(input.rating),
    normalizedText(input.text),
  ].join("|");
  return `${source}:content:${stableHash(fingerprint)}`;
}

function safeMetadata(value: unknown): JsonRecord | undefined {
  const source = reviewRecord(value);
  const result: JsonRecord = {};
  for (const [key, raw] of Object.entries(source).slice(0, 40)) {
    if (/token|secret|password|authorization|cookie|api.?key/i.test(key)) continue;
    if (raw == null || typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      result[key.slice(0, 100)] = typeof raw === "string" ? raw.slice(0, 1_000) : raw;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function inferredMethod(value: JsonRecord): ReviewIngestionMethod {
  const explicit = reviewText(value.ingestionMethod ?? value.ingestion_method).toLocaleLowerCase("en");
  if (explicit === "sync" || explicit === "manual" || explicit === "file_import") return explicit;
  if (value.syncedAt || value.synced_at) return "sync";
  if (value.importedAt || value.imported_at) return "file_import";
  return "manual";
}

export function cleanReviewInput(
  value: unknown,
  tenant: { venueId: number },
  method: ReviewIngestionMethod,
  now: string,
  fallbackSource = "other",
): NormalizedReview | null {
  const input = reviewRecord(value);
  const body = reviewText(input.text ?? input.reviewText ?? input.review ?? input.comment, "", 20_000);
  if (!body) return null;
  const source = reviewSourceId(input.source ?? input.provider, fallbackSource);
  const dateValue = reviewPublishedAt(
    input.publishedAt ?? input.published_date ?? input.date ?? input.reviewDate,
    now,
  );
  const authorName = reviewOptionalText(input.authorName ?? input.author ?? input.displayName ?? input.display_name, 300);
  const externalId = reviewOptionalText(input.externalId ?? input.external_id ?? input.reviewId ?? input.review_id, 240);
  const normalizedRating = reviewRating(input.rating ?? input.score ?? input.stars);
  const result: NormalizedReview = {
    venueId: tenant.venueId,
    source,
    rating: normalizedRating,
    text: body,
    date: dateValue.slice(0, 10),
    publishedAt: dateValue,
    ingestionMethod: method,
    deduplicationKey: reviewDeduplicationKey({ source, externalId, authorName, rating: normalizedRating, text: body, publishedAt: dateValue }),
    aiStatus: reviewText(input.aiStatus, "pending", 40),
  };
  if (externalId) result.externalId = externalId;
  if (authorName) result.authorName = authorName;
  const authorAvatarUrl = reviewOptionalText(input.authorAvatarUrl, 1_500);
  if (authorAvatarUrl) result.authorAvatarUrl = authorAvatarUrl;
  const ownerReply = reviewOptionalText(input.ownerReply, 10_000);
  if (ownerReply) result.ownerReply = ownerReply;
  const metadata = safeMetadata(input.sourceMetadata ?? input.source_metadata);
  if (metadata) result.sourceMetadata = metadata;
  if (method === "sync") result.syncedAt = now;
  if (method === "file_import") result.importedAt = now;
  return result;
}

export function canonicalizeStoredReview(
  value: unknown,
  venueId: number,
  fallbackNow = new Date().toISOString(),
): CanonicalReview | null {
  const input = reviewRecord(value);
  const method = inferredMethod(input);
  const normalized = cleanReviewInput(input, { venueId }, method, fallbackNow);
  if (!normalized) return null;
  if (method === "sync") normalized.syncedAt = reviewOptionalText(input.syncedAt ?? input.synced_at, 80) ?? normalized.syncedAt;
  if (method === "file_import") normalized.importedAt = reviewOptionalText(input.importedAt ?? input.imported_at, 80) ?? normalized.importedAt;
  const createdAt = reviewOptionalText(input.createdAt ?? input.created_at, 80) ?? fallbackNow;
  const updatedAt = reviewOptionalText(input.updatedAt ?? input.updated_at, 80) ?? createdAt;
  return {
    ...input,
    ...normalized,
    id: reviewOptionalText(input.id, 240) ?? crypto.randomUUID(),
    createdAt,
    updatedAt,
  } as CanonicalReview;
}

export function sortReviews(values: CanonicalReview[]): CanonicalReview[] {
  return [...values].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || right.createdAt.localeCompare(left.createdAt));
}

export function meaningfulReviewSignature(value: CanonicalReview): string {
  return JSON.stringify({
    source: value.source,
    externalId: value.externalId ?? null,
    authorName: value.authorName ?? null,
    authorAvatarUrl: value.authorAvatarUrl ?? null,
    rating: value.rating,
    text: value.text,
    publishedAt: value.publishedAt,
    ownerReply: value.ownerReply ?? null,
    sourceMetadata: value.sourceMetadata ?? null,
  });
}

export type ReviewMergeChange = {
  action: "create" | "update";
  before?: CanonicalReview;
  after: CanonicalReview;
};

export function mergeReviewRecords(
  existing: CanonicalReview[],
  incoming: unknown[],
  options: {
    venueId: number;
    method: ReviewIngestionMethod;
    now: string;
    fallbackSource?: string;
    maxRecords?: number;
    idFactory?: () => string;
  },
) {
  const reviews = [...existing];
  const byDedup = new Map(reviews.map((review, index) => [review.deduplicationKey, index]));
  const byExternal = new Map(reviews.filter((review) => review.externalId).map((review, index) => [`${review.source}:${review.externalId}`, index]));
  const changes: ReviewMergeChange[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());

  for (const raw of incoming.slice(0, options.maxRecords ?? 2_000)) {
    const normalized = cleanReviewInput(raw, options, options.method, options.now, options.fallbackSource);
    if (!normalized) {
      invalid += 1;
      continue;
    }
    const externalKey = normalized.externalId ? `${normalized.source}:${normalized.externalId}` : null;
    const existingIndex = externalKey && byExternal.has(externalKey)
      ? byExternal.get(externalKey)!
      : byDedup.get(normalized.deduplicationKey) ?? -1;
    if (existingIndex >= 0) {
      const before = reviews[existingIndex]!;
      const candidate: CanonicalReview = {
        ...before,
        ...normalized,
        id: before.id,
        createdAt: before.createdAt,
        updatedAt: options.now,
        sourceMetadata: normalized.sourceMetadata
          ? { ...reviewRecord(before.sourceMetadata), ...normalized.sourceMetadata }
          : before.sourceMetadata,
      };
      if (meaningfulReviewSignature(before) !== meaningfulReviewSignature(candidate)) {
        candidate.aiStatus = "pending";
        delete candidate.sentiment;
        delete candidate.topics;
        delete candidate.aiSummary;
        updated += 1;
        changes.push({ action: "update", before, after: candidate });
      } else {
        candidate.aiStatus = before.aiStatus;
        skipped += 1;
      }
      reviews[existingIndex] = candidate;
      byDedup.delete(before.deduplicationKey);
      byDedup.set(candidate.deduplicationKey, existingIndex);
      if (externalKey) byExternal.set(externalKey, existingIndex);
      continue;
    }
    const createdReview: CanonicalReview = {
      ...normalized,
      id: idFactory(),
      aiStatus: "pending",
      createdAt: options.now,
      updatedAt: options.now,
    };
    const index = reviews.length;
    reviews.push(createdReview);
    byDedup.set(createdReview.deduplicationKey, index);
    if (externalKey) byExternal.set(externalKey, index);
    created += 1;
    changes.push({ action: "create", after: createdReview });
  }
  return { reviews: sortReviews(reviews), created, updated, skipped, invalid, changes };
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100;
}

function topicSummary(reviews: CanonicalReview[]) {
  const topics = new Map<string, { topic: string; count: number; positive: number; negative: number }>();
  for (const review of reviews) {
    const sentiment = reviewText(review.sentiment).toLocaleLowerCase("en");
    const reviewTopics = Array.isArray(review.topics) ? review.topics : [];
    for (const rawTopic of reviewTopics) {
      const topic = reviewText(rawTopic, "", 80);
      if (!topic) continue;
      const item = topics.get(topic) ?? { topic, count: 0, positive: 0, negative: 0 };
      item.count += 1;
      if (sentiment === "positive") item.positive += 1;
      if (sentiment === "negative") item.negative += 1;
      topics.set(topic, item);
    }
  }
  return [...topics.values()].sort((left, right) => right.count - left.count || left.topic.localeCompare(right.topic));
}

export function reviewLayerSummary(reviews: CanonicalReview[], now = new Date()) {
  const ratings = reviews.map((review) => review.rating).filter((value): value is number => value !== null);
  const analyzed = reviews.filter((review) => review.aiStatus === "done" && review.sentiment);
  const methods: Record<ReviewIngestionMethod, number> = { sync: 0, manual: 0, file_import: 0 };
  const sources: Record<string, number> = {};
  for (const review of reviews) {
    methods[review.ingestionMethod] += 1;
    sources[review.source] = (sources[review.source] ?? 0) + 1;
  }
  const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1_000);
  const currentRatings = reviews.filter((review) => new Date(review.publishedAt) >= currentStart && review.rating !== null).map((review) => review.rating as number);
  const previousRatings = reviews.filter((review) => {
    const date = new Date(review.publishedAt);
    return date >= previousStart && date < currentStart && review.rating !== null;
  }).map((review) => review.rating as number);
  const currentAverage = average(currentRatings);
  const previousAverage = average(previousRatings);
  const topicItems = topicSummary(analyzed);
  return {
    total: reviews.length,
    rated: ratings.length,
    averageRating: average(ratings),
    analyzed: analyzed.length,
    pendingAnalysis: reviews.filter((review) => review.aiStatus === "pending" || review.aiStatus === "analyzing").length,
    failedAnalysis: reviews.filter((review) => review.aiStatus === "failed").length,
    confidence: analyzed.length >= 10 ? "high" : analyzed.length >= 3 ? "medium" : "low",
    confidenceReason: analyzed.length >= 3 ? `Вывод основан на ${analyzed.length} проанализированных отзывах.` : "Для устойчивых выводов нужно не менее трёх проанализированных отзывов.",
    sentiment: {
      positive: analyzed.filter((review) => review.sentiment === "positive").length,
      neutral: analyzed.filter((review) => review.sentiment === "neutral").length,
      negative: analyzed.filter((review) => review.sentiment === "negative").length,
    },
    trend: {
      available: currentRatings.length >= 2 && previousRatings.length >= 2,
      currentAverage,
      previousAverage,
      delta: currentRatings.length >= 2 && previousRatings.length >= 2 && currentAverage !== null && previousAverage !== null ? Math.round((currentAverage - previousAverage) * 100) / 100 : null,
      currentCount: currentRatings.length,
      previousCount: previousRatings.length,
      reason: currentRatings.length >= 2 && previousRatings.length >= 2 ? null : "Недостаточно оценок в текущем или предыдущем 30-дневном периоде.",
    },
    topics: topicItems.slice(0, 10),
    complaints: topicItems.filter((item) => item.negative > 0).sort((left, right) => right.negative - left.negative).slice(0, 5),
    compliments: topicItems.filter((item) => item.positive > 0).sort((left, right) => right.positive - left.positive).slice(0, 5),
    sources,
    methods,
    lastReceivedAt: reviews.reduce<string | null>((latest, review) => {
      const candidate = review.syncedAt ?? review.importedAt ?? review.createdAt;
      return !latest || candidate > latest ? candidate : latest;
    }, null),
    lastPublishedAt: reviews[0]?.publishedAt ?? null,
  };
}

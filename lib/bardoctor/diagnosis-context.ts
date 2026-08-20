import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { domainData, type Account } from "../../db/schema";
import { syncGoogleReviewsIfDue } from "./review-sources";

type JsonRecord = Record<string, unknown>;

export type TrustedReview = {
  id: string;
  source: string;
  date: string;
  rating: number | null;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
  summary: string | null;
};

export type ConfirmedCompetitor = {
  key: string;
  name: string;
  category: string;
  relation: string;
  distance: string | null;
  rating: string | number | null;
  evidence: string;
  strengths: string[];
  gaps: string[];
  sourceUrls: string[];
};

export type DiagnosisExternalContext = {
  reviews: {
    total: number;
    averageRating: number | null;
    positive: number;
    neutral: number;
    negative: number;
    commonTopics: Array<{ topic: string; count: number }>;
    recent: TrustedReview[];
    lastUpdatedAt: string | null;
  };
  confirmedCompetitors: ConfirmedCompetitor[];
  reviewSync: {
    attempted: boolean;
    ok: boolean;
    added?: number;
  };
};

const REVIEW_KEY = "bd_guest_reviews";
const MARKET_KEY = "bd_market_analysis_v1";

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function string(value: unknown, fallback = "", limit = 1_000): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function strings(value: unknown, limit = 8): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 300))
        .slice(0, limit)
    : [];
}

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sentiment(value: unknown, rating: number | null): "positive" | "neutral" | "negative" {
  if (value === "positive" || value === "neutral" || value === "negative") return value;
  if (rating !== null && rating <= 2) return "negative";
  if (rating !== null && rating >= 4) return "positive";
  return "neutral";
}

function competitorKey(value: JsonRecord): string {
  const existing = string(value.key, "", 300);
  if (existing) return existing;
  const name = string(value.name, "", 160).toLocaleLowerCase("ru");
  const source = strings(value.sourceUrls, 1)[0] ?? "";
  return `${name}|${source}`.slice(0, 400);
}

async function stored(accountId: number, storeKey: string): Promise<{ data: unknown; updatedAt: string } | null> {
  const [row] = await getDb()
    .select({ dataJson: domainData.dataJson, updatedAt: domainData.updatedAt })
    .from(domainData)
    .where(and(eq(domainData.accountId, accountId), eq(domainData.storeKey, storeKey)))
    .limit(1);
  if (!row) return null;
  try {
    return { data: JSON.parse(row.dataJson) as unknown, updatedAt: row.updatedAt };
  } catch {
    return null;
  }
}

function trustedReviews(value: unknown): TrustedReview[] {
  return (Array.isArray(value) ? value : [])
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => {
      const rating = number(item.rating);
      return {
        id: string(item.id, crypto.randomUUID(), 160),
        source: string(item.source, "manual", 40),
        date: string(item.date, "", 32),
        rating,
        text: string(item.text, "Без текстового комментария", 1_200),
        sentiment: sentiment(item.sentiment, rating),
        topics: strings(item.topics, 8),
        summary: string(item.aiSummary, "", 500) || null,
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));
}

function confirmedCompetitors(value: unknown): ConfirmedCompetitor[] {
  const root = record(value);
  const competitors = Array.isArray(root?.competitors) ? root.competitors : [];
  return competitors
    .map(record)
    .filter((item): item is JsonRecord => Boolean(item && item.confirmed === true && string(item.name)))
    .map((item) => ({
      key: competitorKey(item),
      name: string(item.name, "Без названия", 160),
      category: string(item.category, "Заведение", 120),
      relation: string(item.relation, "alternative", 40),
      distance: string(item.distance, "", 100) || null,
      rating: number(item.rating) ?? (string(item.rating, "", 40) || null),
      evidence: string(item.evidence, "Подтверждено владельцем заведения", 800),
      strengths: strings(item.strengths, 6),
      gaps: strings(item.gaps, 6),
      sourceUrls: strings(item.sourceUrls, 6).filter((url) => /^https?:\/\//i.test(url)),
    }));
}

function legacyConfirmedCompetitors(value: string | null): ConfirmedCompetitor[] {
  if (!value) return [];
  try {
    return confirmedCompetitors(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}

function uniqueCompetitors(items: ConfirmedCompetitor[]): ConfirmedCompetitor[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.trim().toLocaleLowerCase("ru");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

export async function loadDiagnosisExternalContext(account: Account): Promise<DiagnosisExternalContext> {
  const sync = await syncGoogleReviewsIfDue(account.id).catch(() => ({ attempted: true, ok: false }));
  const syncAdded = "added" in sync ? sync.added : undefined;
  const [reviewStore, marketStore] = await Promise.all([
    stored(account.id, REVIEW_KEY),
    stored(account.id, MARKET_KEY),
  ]);
  const reviews = trustedReviews(reviewStore?.data);
  const ratings = reviews.map((review) => review.rating).filter((rating): rating is number => rating !== null);
  const topicCounts = new Map<string, number>();
  for (const review of reviews) {
    for (const topic of review.topics) topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }

  return {
    reviews: {
      total: reviews.length,
      averageRating: ratings.length
        ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 10) / 10
        : null,
      positive: reviews.filter((review) => review.sentiment === "positive").length,
      neutral: reviews.filter((review) => review.sentiment === "neutral").length,
      negative: reviews.filter((review) => review.sentiment === "negative").length,
      commonTopics: [...topicCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([topic, count]) => ({ topic, count })),
      recent: reviews.slice(0, 20),
      lastUpdatedAt: reviewStore?.updatedAt ?? null,
    },
    confirmedCompetitors: uniqueCompetitors([
      ...confirmedCompetitors(marketStore?.data),
      ...legacyConfirmedCompetitors(account.competitorsJson),
    ]),
    reviewSync: {
      attempted: sync.attempted,
      ok: sync.ok,
      ...(typeof syncAdded === "number" ? { added: syncAdded } : {}),
    },
  };
}

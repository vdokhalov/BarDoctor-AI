type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const round = (value: number) => Math.round(value * 100) / 100;

/** Rating knowledge is independent of analysis. Zero is not a review rating. */
export function reviewMetricRating(value: unknown): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const number = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) && number >= 1 && number <= 5 ? number : null;
}

/** Callers select the population first (including Google location binding).
 * Analysis-based sentiment/complaints use analyzed reviews as denominator.
 * Ratings use rated reviews, with two-decimal rounding in every consumer. */
export function aggregateReviews(values: unknown[], window?: { start?: string; end?: string }) {
  const reviews = values.map(row).filter(review => {
    const date = String(review.publishedAt ?? review.date ?? "");
    const within = (bound: string, start: boolean) => { const comparable = /^\d{4}-\d{2}-\d{2}$/.test(bound) ? date.slice(0, 10) : date; return start ? comparable >= bound : comparable <= bound; };
    return (!window?.start || within(window.start, true)) && (!window?.end || within(window.end, false));
  });
  const ratings = reviews.map(review => reviewMetricRating(review.rating)).filter((rating): rating is number => rating != null);
  const analyzed = reviews.filter(review => review.aiStatus === "done" && ["positive", "neutral", "negative"].includes(String(review.sentiment)));
  const sentiment = { positive: 0, neutral: 0, negative: 0 };
  const topics = new Map<string, { topic: string; count: number; positive: number; negative: number }>();
  for (const review of analyzed) {
    sentiment[review.sentiment as keyof typeof sentiment]++;
    for (const topic of new Set((Array.isArray(review.topics) ? review.topics : []).filter(value => typeof value === "string").map(value => String(value).trim()).filter(Boolean))) {
      const item = topics.get(topic) ?? { topic, count: 0, positive: 0, negative: 0 };
      item.count++;
      if (review.sentiment === "positive") item.positive++;
      if (review.sentiment === "negative") item.negative++;
      topics.set(topic, item);
    }
  }
  const sorted = [...topics.values()].sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
  const complaints = sorted.filter(topic => topic.negative > 0).sort((a, b) => b.negative - a.negative || a.topic.localeCompare(b.topic));
  return {
    contractVersion: "review-aggregate-v1", total: reviews.length, rated: ratings.length,
    averageRating: ratings.length ? round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) : null,
    analyzed: analyzed.length, pendingAnalysis: reviews.filter(review => ["pending", "analyzing"].includes(String(review.aiStatus))).length,
    failedAnalysis: reviews.filter(review => review.aiStatus === "failed").length,
    sentiment, negativeDenominator: analyzed.length, negativeShare: analyzed.length ? round(sentiment.negative / analyzed.length * 100) / 100 : null,
    topics: sorted, complaints, compliments: sorted.filter(topic => topic.positive > 0).sort((a, b) => b.positive - a.positive || a.topic.localeCompare(b.topic)),
    recurringComplaints: complaints.filter(topic => topic.negative >= 2),
    inputIds: reviews.map(review => String(review.id ?? review.deduplicationKey ?? "")).sort(),
  };
}

/** Calendar windows use one boundary convention, with no shared boundary day. */
export function reviewMetricBuckets(values: unknown[], now = new Date(), days = 30) {
  const date = (milliseconds: number) => new Date(milliseconds).toISOString().slice(0, 10);
  const start = now.getTime() - days * 86400000;
  return { current: aggregateReviews(values, { start: date(start), end: date(now.getTime()) }),
    previous: aggregateReviews(values, { start: date(start - days * 86400000), end: date(start - 86400000) }) };
}

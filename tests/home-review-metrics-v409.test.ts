import assert from "node:assert/strict";
import test from "node:test";
import { homeReviewMetrics, mergeReviewRecords } from "../lib/bardoctor/review-model";

test("the existing 105-review Google dataset shape remains compatible and idempotent", () => {
  const incoming = Array.from({ length: 105 }, (_, index) => ({
    source: "google",
    externalId: `google-${index + 1}`,
    authorName: `Guest ${index + 1}`,
    rating: index < 7 ? 2 : 5,
    text: index < 7 ? `Slow service ${index + 1}` : `Great visit ${index + 1}`,
    publishedAt: `2026-08-${String(index % 28 + 1).padStart(2, "0")}`,
    ownerReply: index < 3 ? undefined : "Спасибо за отзыв!",
    aiStatus: "done",
    sentiment: index < 7 ? "negative" : "positive",
    topics: index < 7 ? ["wait_time"] : ["atmosphere"],
  }));
  const first = mergeReviewRecords([], incoming, {
    venueId: 42,
    method: "sync",
    now: "2026-09-03T12:00:00.000Z",
    idFactory: (() => { let id = 0; return () => `review-${++id}`; })(),
  });
  assert.equal(first.created, 105);
  assert.equal(first.reviews.length, 105);

  const repeated = mergeReviewRecords(first.reviews, incoming, {
    venueId: 42,
    method: "sync",
    now: "2026-09-03T13:00:00.000Z",
  });
  assert.equal(repeated.created, 0);
  assert.equal(repeated.updated, 0);
  assert.equal(repeated.skipped, 105);
  assert.equal(repeated.reviews.length, 105);

  const analyzed = first.reviews.map((review) => {
    const index = Number(String(review.externalId).replace("google-", ""));
    return {
      ...review,
      aiStatus: "done",
      sentiment: index <= 7 ? "negative" : "positive",
      topics: index <= 7 ? ["wait_time"] : ["atmosphere"],
    };
  });
  const metrics = homeReviewMetrics(analyzed, new Date("2026-09-03T12:00:00.000Z"));
  assert.equal(metrics.total, 105);
  assert.equal(metrics.needsAttention, 3);
  assert.equal(metrics.unanswered, 3);
  assert.ok(metrics.averageRating !== null);
  assert.equal(metrics.complaints[0]?.topic, "wait_time");
});

test("Home review metrics isolate Google and treat low-rating unanswered reviews as actionable", () => {
  const merged = mergeReviewRecords([], [
    { source: "google", externalId: "g-1", rating: 3, text: "Долго ждали", publishedAt: "2026-09-02" },
    { source: "google", externalId: "g-2", rating: 2, text: "Ответили", ownerReply: "Спасибо", publishedAt: "2026-09-01" },
    { source: "yandex", externalId: "y-1", rating: 1, text: "Другой источник", publishedAt: "2026-09-03" },
  ], { venueId: 1, method: "sync", now: "2026-09-03T12:00:00.000Z" });
  const metrics = homeReviewMetrics(merged.reviews, new Date("2026-09-03T12:00:00.000Z"));
  assert.equal(metrics.total, 2);
  assert.equal(metrics.needsAttention, 1);
  assert.equal(metrics.unanswered, 1);
  assert.equal(metrics.new7d, 2);
  assert.equal(metrics.new30d, 2);
});

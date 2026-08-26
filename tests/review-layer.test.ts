import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeStoredReview,
  mergeReviewRecords,
  reviewDeduplicationKey,
  reviewLayerSummary,
} from "../lib/bardoctor/review-model";
import { inspectReviewFile, mapReviewFile } from "../lib/bardoctor/review-import";

test("legacy reviews are normalized without changing their stable id or AI metadata", () => {
  const review = canonicalizeStoredReview({
    id: "legacy-1",
    source: "google",
    externalId: "g-42",
    authorName: "Анна",
    rating: 4,
    text: "Хороший бар",
    date: "2026-08-01",
    syncedAt: "2026-08-02T10:00:00.000Z",
    aiStatus: "done",
    sentiment: "positive",
    topics: ["bar"],
    customLegacyField: "preserved",
  }, 7, "2026-08-13T10:00:00.000Z");
  assert.ok(review);
  assert.equal(review.id, "legacy-1");
  assert.equal(review.venueId, 7);
  assert.equal(review.syncedAt, "2026-08-02T10:00:00.000Z");
  assert.equal(review.sentiment, "positive");
  assert.equal(review.customLegacyField, "preserved");
});

test("deduplication is source-aware and prefers stable external ids", () => {
  const base = { externalId: "42", authorName: "Гость", rating: 5, text: "Отлично", publishedAt: "2026-08-13T12:00:00.000Z" };
  assert.equal(reviewDeduplicationKey({ ...base, source: "google" }), "google:external:42");
  assert.equal(reviewDeduplicationKey({ ...base, source: "yandex" }), "yandex:external:42");
  assert.notEqual(
    reviewDeduplicationKey({ ...base, source: "google", externalId: undefined }),
    reviewDeduplicationKey({ ...base, source: "yandex", externalId: undefined }),
  );
  assert.equal(
    reviewDeduplicationKey({ ...base, source: "google", externalId: undefined }),
    reviewDeduplicationKey({ ...base, source: "Google Business Profile", externalId: undefined }),
  );
});

test("repeated sync is idempotent and an external update changes the existing review", () => {
  const first = mergeReviewRecords([], [{
    source: "google", externalId: "google-1", authorName: "Гость", rating: 4,
    text: "Всё хорошо", publishedAt: "2026-08-10",
  }], {
    venueId: 11,
    method: "sync",
    now: "2026-08-11T10:00:00.000Z",
    idFactory: () => "review-stable",
  });
  assert.equal(first.created, 1);
  assert.equal(first.reviews.length, 1);

  const repeated = mergeReviewRecords(first.reviews, [{
    source: "google", externalId: "google-1", authorName: "Гость", rating: 4,
    text: "Всё хорошо", publishedAt: "2026-08-10",
  }], { venueId: 11, method: "sync", now: "2026-08-12T10:00:00.000Z" });
  assert.equal(repeated.created, 0);
  assert.equal(repeated.updated, 0);
  assert.equal(repeated.skipped, 1);
  assert.equal(repeated.reviews[0]?.id, "review-stable");

  const changed = mergeReviewRecords(repeated.reviews, [{
    source: "google", externalId: "google-1", authorName: "Гость", rating: 2,
    text: "Стало долго", publishedAt: "2026-08-10",
  }], { venueId: 11, method: "sync", now: "2026-08-13T10:00:00.000Z" });
  assert.equal(changed.created, 0);
  assert.equal(changed.updated, 1);
  assert.equal(changed.reviews.length, 1);
  assert.equal(changed.reviews[0]?.id, "review-stable");
  assert.equal(changed.reviews[0]?.rating, 2);
  assert.equal(changed.reviews[0]?.aiStatus, "pending");
});

test("the same external id from different sources remains isolated", () => {
  const result = mergeReviewRecords([], [
    { source: "google", externalId: "42", text: "Google review", rating: 5, publishedAt: "2026-08-13" },
    { source: "yandex", externalId: "42", text: "Yandex review", rating: 4, publishedAt: "2026-08-13" },
  ], {
    venueId: 3,
    method: "file_import",
    now: "2026-08-13T10:00:00.000Z",
    idFactory: (() => { let id = 0; return () => `review-${++id}`; })(),
  });
  assert.equal(result.created, 2);
  assert.equal(result.reviews.length, 2);
});

test("repeating the same file import skips the existing review instead of duplicating it", () => {
  const record = {
    source: "survey",
    externalId: "import-42",
    authorName: "Гость",
    rating: 4,
    text: "Понравилась кухня",
    publishedAt: "2026-08-12",
  };
  const first = mergeReviewRecords([], [record], {
    venueId: 8,
    method: "file_import",
    now: "2026-08-12T12:00:00.000Z",
    idFactory: () => "review-import-42",
  });
  const repeated = mergeReviewRecords(first.reviews, [record], {
    venueId: 8,
    method: "file_import",
    now: "2026-08-13T12:00:00.000Z",
  });
  assert.equal(repeated.created, 0);
  assert.equal(repeated.updated, 0);
  assert.equal(repeated.skipped, 1);
  assert.equal(repeated.reviews.length, 1);
  assert.equal(repeated.reviews[0]?.id, "review-import-42");
});

test("malformed review records are rejected without creating placeholder data", () => {
  const result = mergeReviewRecords([], [{ source: "other", rating: 5, publishedAt: "2026-08-13" }], {
    venueId: 2,
    method: "manual",
    now: "2026-08-13T12:00:00.000Z",
  });
  assert.equal(result.invalid, 1);
  assert.equal(result.created, 0);
  assert.equal(result.reviews.length, 0);
});

test("review summary is honest when there is not enough data for trends", () => {
  const review = canonicalizeStoredReview({
    id: "review-1", source: "other", rating: 5, text: "Спасибо", date: "2026-08-13",
    aiStatus: "done", sentiment: "positive", topics: ["staff"],
  }, 1, "2026-08-13T12:00:00.000Z");
  assert.ok(review);
  const summary = reviewLayerSummary([review], new Date("2026-08-13T12:00:00.000Z"));
  assert.equal(summary.total, 1);
  assert.equal(summary.averageRating, 5);
  assert.equal(summary.confidence, "low");
  assert.equal(summary.trend.available, false);
  assert.match(summary.trend.reason ?? "", /Недостаточно/);
});

test("review importer reuses the universal CSV reader and maps review fields", async () => {
  const bytes = new TextEncoder().encode("ID,Автор,Оценка,Дата,Отзыв\nA-1,Анна,5,2026-08-13,Очень понравилось\n");
  const inspection = await inspectReviewFile({ fileName: "reviews.csv", mediaType: "text/csv", bytes });
  assert.equal(inspection.recordCount, 1);
  assert.equal(inspection.suggestedMapping.text, "Отзыв");
  assert.equal(inspection.suggestedMapping.externalId, "ID");
  const mapped = await mapReviewFile({
    fileName: "reviews.csv",
    mediaType: "text/csv",
    bytes,
    fieldMapping: inspection.suggestedMapping,
    defaultSource: "yandex",
  });
  assert.deepEqual(mapped.records[0], {
    source: "yandex",
    text: "Очень понравилось",
    rating: "5",
    publishedAt: "2026-08-13",
    authorName: "Анна",
    externalId: "A-1",
  });
  const normalized = canonicalizeStoredReview(mapped.records[0], 4, "2026-08-13T18:00:00.000Z");
  assert.equal(normalized?.publishedAt, "2026-08-13T12:00:00.000Z");
  const ambiguousSpreadsheetDate = canonicalizeStoredReview({
    source: "survey",
    text: "Дата из CSV",
    date: "8/12/26",
  }, 4, "2026-08-13T18:00:00.000Z");
  assert.equal(ambiguousSpreadsheetDate?.publishedAt, "2026-08-12T12:00:00.000Z");
});

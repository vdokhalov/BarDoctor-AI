import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeStoredReview, homeReviewMetrics, mergeReviewRecords, reviewDeduplicationKey } from "../lib/bardoctor/review-model";

const now = "2026-10-02T12:00:00.000Z";
const options = { venueId: 7, method: "sync" as const, now };
const manual = (id: string) => canonicalizeStoredReview({ id, source: "other", text: id, rating: 4, publishedAt: "2026-10-01", createdAt: now }, 7, now)!;
const google = (id: string, externalId: string, metadata?: Record<string, unknown>) => canonicalizeStoredReview({ id, source: "google", externalId, text: id, rating: 5, publishedAt: "2026-10-01", sourceMetadata: metadata, createdAt: now }, 7, now)!;
function permutations<T>(items: T[]): T[][] {
  return items.length ? items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map(rest => [item, ...rest])) : [[]];
}

test("G02: all mixed manual/google permutations update only the correct stable external identity", () => {
  const rows = [manual("manual-1"), google("google-1", "external-1"), manual("manual-2"), google("google-2", "external-2")];
  for (const ordering of permutations(rows)) {
    for (const incoming of permutations([rows[1], rows[3]])) {
      const changed = mergeReviewRecords(ordering, incoming.map(row => ({ ...row, text: `changed-${row.id}` })), options);
      assert.equal(changed.created, 0);
      assert.equal(changed.updated, 2);
      assert.equal(changed.reviews.length, 4);
      for (const original of rows) {
        const actual = changed.reviews.find(row => row.id === original.id)!;
        assert.ok(actual);
        assert.equal(actual.text, original.source === "google" ? `changed-${original.id}` : original.text);
        assert.equal(actual.externalId, original.externalId);
        assert.equal(actual.createdAt, original.createdAt);
      }
    }
  }
});

test("G02: unchanged resync preserves canonical contents and analysis, repeat and duplicate incoming IDs never add a review", () => {
  const rows = [manual("manual"), { ...google("google", "external"), aiStatus: "done", sentiment: "positive", topics: ["bar"] }];
  const resync = mergeReviewRecords(rows, [rows[1], rows[1]], { ...options, now: "2026-10-03T12:00:00.000Z" });
  assert.equal(resync.created, 0); assert.equal(resync.updated, 0); assert.equal(resync.skipped, 2);
  assert.deepEqual(resync.reviews.find(row => row.id === "google"), rows[1]);
  assert.deepEqual(resync.reviews.find(row => row.id === "manual"), rows[0]);
  const updated = mergeReviewRecords(rows, [{ ...rows[1], text: "Changed by provider" }], options);
  assert.equal(updated.updated, 1); assert.equal(updated.created, 0);
  assert.equal(updated.reviews.find(row => row.id === "google")!.sentiment, undefined);
  const again = mergeReviewRecords(updated.reviews, [{ ...rows[1], text: "Changed by provider" }], options);
  assert.equal(again.updated, 0); assert.equal(again.created, 0);
  assert.deepEqual(again.reviews, updated.reviews);
});

test("G02: duplicate external identities already in canonical state fail closed without choosing or deleting a row", () => {
  const rows = [google("one", "duplicate"), manual("manual"), google("two", "duplicate")];
  const result = mergeReviewRecords(rows, [{ ...rows[0], text: "New provider content" }], options);
  assert.equal(result.invalid, 1); assert.equal(result.updated, 0); assert.equal(result.created, 0);
  for (const row of rows) assert.deepEqual(result.reviews.find(item => item.id === row.id), row);
});

test("G11: provider account/location is part of external identity, location A survives a B sync unchanged", () => {
  const a = { provider: "google_business_profile", googleAccountId: "account", googleLocationId: "location-A" };
  const b = { ...a, googleLocationId: "location-B" };
  const original = google("from-A", "shared-provider-id", a);
  assert.notEqual(reviewDeduplicationKey(original), reviewDeduplicationKey({ ...original, sourceMetadata: b }));
  const result = mergeReviewRecords([original, manual("manual")], [{ ...original, sourceMetadata: b, text: "At B", rating: 2 }], { ...options, idFactory: () => "from-B" });
  assert.equal(result.created, 1); assert.equal(result.updated, 0);
  assert.deepEqual(result.reviews.find(row => row.id === "from-A"), original);
  const atB = result.reviews.find(row => row.id === "from-B")!;
  assert.equal(atB.sourceMetadata?.googleLocationId, "location-B");
  const repeat = mergeReviewRecords(result.reviews, [atB], options);
  assert.equal(repeat.created, 0); assert.equal(repeat.updated, 0);
  assert.equal(repeat.reviews.length, 3);
  const home = homeReviewMetrics(result.reviews, new Date(now), b);
  assert.equal(home.total, 1); assert.equal(home.averageRating, 2);
});

test("G11: legacy unbound external identity is not silently relabelled to the newly selected location", () => {
  const legacy = google("legacy-A-or-unknown", "legacy-id");
  const incoming = { ...legacy, sourceMetadata: { provider: "google_business_profile", googleAccountId: "account", googleLocationId: "B" } };
  const result = mergeReviewRecords([legacy], [incoming], options);
  assert.equal(result.invalid, 1); assert.equal(result.created, 0); assert.equal(result.updated, 0);
  assert.deepEqual(result.reviews[0], legacy);
});

test("G02: conflicting duplicate Google input IDs are rejected regardless of input ordering", () => {
  const original = google("stable", "external");
  const incoming = [{ ...original, text: "Version A" }, { ...original, text: "Version B" }];
  for (const ordering of permutations(incoming)) {
    const result = mergeReviewRecords([original, manual("manual")], ordering, options);
    assert.equal(result.invalid, 2); assert.equal(result.updated, 0); assert.equal(result.created, 0);
    assert.deepEqual(result.reviews.find(review => review.id === "stable"), original);
  }
});

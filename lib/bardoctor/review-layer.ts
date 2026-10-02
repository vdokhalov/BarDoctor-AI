import { readStoreSnapshots, runStoreCasBatch, type StoreSnapshot } from "./store-cas";
import { desc, eq } from "drizzle-orm";
import { getDb, getD1 } from "../../db";
import { reviewSourceEvents, type Account } from "../../db/schema";
import type { AuthenticatedAccount } from "./access-control";
import {
  REVIEW_SOURCE_LABELS,
  canonicalizeStoredReview,
  mergeReviewRecords,
  reviewLayerSummary,
  reviewOptionalText,
  reviewRecord,
  reviewSourceId,
  reviewText,
  sortReviews,
  type CanonicalReview,
  type ReviewIngestionMethod,
} from "./review-model";

export {
  REVIEW_SOURCE_LABELS,
  canonicalizeStoredReview,
  reviewDeduplicationKey,
  reviewLayerSummary,
  type CanonicalReview,
  type JsonRecord,
  type ReviewIngestionMethod,
} from "./review-model";

export const REVIEW_STORE_KEY = "bd_guest_reviews";
export const REVIEW_IMPORT_MAX_RECORDS = 2_000;

export type ReviewTenant = {
  accountId: number;
  venueId: number;
  actorAccountId?: number | null;
  actorName: string;
  actorRole: string;
};

export type ReviewUpsertResult = {
  reviews: CanonicalReview[];
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  changedIds: string[];
  updatedAt: string;
};

export async function logReviewLayerEvent(accountId: number, source: string, event: string, detail?: string): Promise<void> {
  try {
    await getDb().insert(reviewSourceEvents).values({
      accountId,
      source: reviewSourceId(source),
      event: reviewText(event, "event", 120),
      detail: reviewOptionalText(detail, 2_000) ?? null,
    });
  } catch {
    // Diagnostic history is secondary and must not invalidate an accepted review.
  }
}

async function storedReviews(accountId: number, venueId: number, forWrite = false): Promise<{ reviews: CanonicalReview[]; updatedAt: string | null; snapshots: StoreSnapshot[] }> {
  const snapshots = await readStoreSnapshots(getD1(), accountId, [REVIEW_STORE_KEY]);
  const stored = snapshots[0];
  if (!stored?.dataJson) return { reviews: [], updatedAt: null, snapshots };
  try {
    const parsed = JSON.parse(stored.dataJson) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Invalid review store");
    const reviews = parsed.map(item => canonicalizeStoredReview(item, venueId, stored.updatedAt ?? undefined));
    if (forWrite && reviews.some(item => !item)) throw new Error("Invalid review record");
    return { reviews: sortReviews(reviews.filter((item): item is CanonicalReview => Boolean(item))), updatedAt: stored.updatedAt, snapshots };
  } catch {
    if (forWrite) throw new Error("REVIEW_STORE_NEEDS_REVIEW: existing review data cannot be safely rewritten");
    return { reviews: [], updatedAt: stored.updatedAt, snapshots };
  }
}

function reviewStoreWrite(accountId: number, reviews: CanonicalReview[], now: string): D1PreparedStatement {
  return getD1().prepare(`INSERT INTO domain_data (account_id, store_key, data_json, updated_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(account_id, store_key)
    DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`)
    .bind(accountId, REVIEW_STORE_KEY, JSON.stringify(reviews), now);
}

function actorFromAccount(account: AuthenticatedAccount): ReviewTenant {
  return {
    accountId: account.id,
    venueId: account.venueId,
    actorAccountId: account.actorAccountId,
    actorName: [account.firstName, account.lastName].filter(Boolean).join(" ") || account.appEmail,
    actorRole: account.role,
  };
}

export function reviewTenant(account: AuthenticatedAccount): ReviewTenant {
  return actorFromAccount(account);
}

export async function upsertReviewRecords(input: {
  tenant: ReviewTenant;
  records: unknown[];
  method: ReviewIngestionMethod;
  fallbackSource?: string;
  reason: string;
}): Promise<ReviewUpsertResult> {
  const now = new Date().toISOString();
  const stored = await storedReviews(input.tenant.accountId, input.tenant.venueId, true);
  const merged = mergeReviewRecords(stored.reviews, input.records, {
    venueId: input.tenant.venueId,
    method: input.method,
    now,
    fallbackSource: input.fallbackSource,
    maxRecords: REVIEW_IMPORT_MAX_RECORDS,
  });
  const sorted = merged.reviews;
  // An ambiguous legacy/provider identity must not be guessed or partly synced.
  if (input.method === "sync" && merged.invalid) throw new Error("GOOGLE_REVIEW_SOURCE_NEEDS_REVIEW");
  if (merged.changes.length) {
    const only = merged.changes.length === 1 ? merged.changes[0]! : null;
    await runStoreCasBatch(getD1(), input.tenant.accountId, stored.snapshots, [
      reviewStoreWrite(input.tenant.accountId, sorted, now),
      getD1().prepare(`INSERT INTO audit_log (account_id, store_key, action, entity_id, entity_label,
        before_json, after_json, changed_fields_json, actor_name, actor_role, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(input.tenant.accountId, REVIEW_STORE_KEY, only?.action ?? "update",
          only?.after.id ?? `review-batch-${now}`,
          only ? `Отзыв · ${REVIEW_SOURCE_LABELS[only.after.source] ?? only.after.source}` : `Отзывы · ${merged.changes.length} изменений`,
          only?.before ? JSON.stringify(only.before) : null,
          JSON.stringify(only?.after ?? { created: merged.created, updated: merged.updated, source: input.fallbackSource ?? "mixed" }),
          JSON.stringify(only?.action === "create" ? ["source", "rating", "text", "publishedAt"] : ["authorName", "rating", "text", "publishedAt", "sourceMetadata"]),
          input.tenant.actorName, input.tenant.actorRole, input.reason.slice(0, 500), now),
    ], now);
  }

  return {
    reviews: sorted,
    created: merged.created,
    updated: merged.updated,
    skipped: merged.skipped,
    invalid: merged.invalid,
    changedIds: merged.changes.map((change) => change.after.id),
    updatedAt: merged.changes.length ? now : stored.updatedAt ?? now,
  };
}

export async function upsertAccountReviews(
  account: AuthenticatedAccount,
  records: unknown[],
  method: ReviewIngestionMethod,
  reason: string,
  fallbackSource = "other",
): Promise<ReviewUpsertResult> {
  return upsertReviewRecords({ tenant: actorFromAccount(account), records, method, reason, fallbackSource });
}

export async function loadReviewLayer(account: AuthenticatedAccount) {
  const stored = await storedReviews(account.id, account.venueId);
  const events = await getDb()
    .select()
    .from(reviewSourceEvents)
    .where(eq(reviewSourceEvents.accountId, account.id))
    .orderBy(desc(reviewSourceEvents.createdAt))
    .limit(50);
  const { reviewsForCurrentGoogleLocation } = await import("./review-sources");
  const currentReviews = await reviewsForCurrentGoogleLocation(account.id, stored.reviews);
  return {
    reviews: stored.reviews,
    summary: reviewLayerSummary(currentReviews as CanonicalReview[]),
    updatedAt: stored.updatedAt,
    sourceEvents: events.map((event) => ({
      id: event.id,
      source: event.source,
      event: event.event,
      detail: event.detail,
      at: event.createdAt,
    })),
  };
}

export async function applyReviewAnalysis(
  account: AuthenticatedAccount,
  updates: unknown[],
): Promise<{ updated: number; data: Awaited<ReturnType<typeof loadReviewLayer>> }> {
  const now = new Date().toISOString();
  const stored = await storedReviews(account.id, account.venueId, true);
  const byId = new Map(stored.reviews.map((review) => [review.id, review]));
  let updated = 0;
  for (const raw of updates.slice(0, 25)) {
    const value = reviewRecord(raw);
    const id = reviewText(value.id, "", 240);
    const review = byId.get(id);
    if (!review) continue;
    const sentiment = reviewText(value.sentiment).toLocaleLowerCase("en");
    const topics = Array.isArray(value.topics)
      ? value.topics.map((topic) => reviewText(topic, "", 80)).filter(Boolean).slice(0, 20)
      : [];
    if (!["positive", "neutral", "negative"].includes(sentiment)) {
      review.aiStatus = "failed";
    } else {
      review.aiStatus = "done";
      review.sentiment = sentiment;
      review.topics = topics;
      review.aiSummary = reviewOptionalText(value.summary ?? value.aiSummary, 2_000);
    }
    review.updatedAt = now;
    updated += 1;
  }
  if (updated) {
    await runStoreCasBatch(getD1(), account.id, stored.snapshots, [
      reviewStoreWrite(account.id, sortReviews(stored.reviews), now),
    ], now);
  }
  return { updated, data: await loadReviewLayer(account) };
}

export function accountReviewTenant(account: Account, venueId: number): ReviewTenant {
  return {
    accountId: account.id,
    venueId,
    actorAccountId: null,
    actorName: "Integration Layer",
    actorRole: "integration",
  };
}

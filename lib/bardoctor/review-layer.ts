import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { auditLog, domainData, reviewSourceEvents, type Account } from "../../db/schema";
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

async function storedReviews(accountId: number, venueId: number): Promise<{ reviews: CanonicalReview[]; updatedAt: string | null }> {
  const [stored] = await getDb()
    .select({ dataJson: domainData.dataJson, updatedAt: domainData.updatedAt })
    .from(domainData)
    .where(and(eq(domainData.accountId, accountId), eq(domainData.storeKey, REVIEW_STORE_KEY)))
    .limit(1);
  if (!stored) return { reviews: [], updatedAt: null };
  try {
    const parsed = JSON.parse(stored.dataJson) as unknown;
    const reviews = Array.isArray(parsed)
      ? parsed.map((item) => canonicalizeStoredReview(item, venueId, stored.updatedAt))
        .filter((item): item is CanonicalReview => Boolean(item))
      : [];
    return { reviews: sortReviews(reviews), updatedAt: stored.updatedAt };
  } catch {
    return { reviews: [], updatedAt: stored.updatedAt };
  }
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
  const stored = await storedReviews(input.tenant.accountId, input.tenant.venueId);
  const merged = mergeReviewRecords(stored.reviews, input.records, {
    venueId: input.tenant.venueId,
    method: input.method,
    now,
    fallbackSource: input.fallbackSource,
    maxRecords: REVIEW_IMPORT_MAX_RECORDS,
  });
  const sorted = merged.reviews;
  await getDb()
    .insert(domainData)
    .values({ accountId: input.tenant.accountId, storeKey: REVIEW_STORE_KEY, dataJson: JSON.stringify(sorted), updatedAt: now })
    .onConflictDoUpdate({
      target: [domainData.accountId, domainData.storeKey],
      set: { dataJson: JSON.stringify(sorted), updatedAt: now },
    });

  if (merged.changes.length) {
    const only = merged.changes.length === 1 ? merged.changes[0]! : null;
    await getDb().insert(auditLog).values({
      accountId: input.tenant.accountId,
      storeKey: REVIEW_STORE_KEY,
      action: only?.action ?? "update",
      entityId: only?.after.id ?? `review-batch-${now}`,
      entityLabel: only
        ? `Отзыв · ${REVIEW_SOURCE_LABELS[only.after.source] ?? only.after.source}`
        : `Отзывы · ${merged.changes.length} изменений`,
      beforeJson: only?.before ? JSON.stringify(only.before) : null,
      afterJson: only
        ? JSON.stringify(only.after)
        : JSON.stringify({ created: merged.created, updated: merged.updated, source: input.fallbackSource ?? "mixed" }),
      changedFieldsJson: JSON.stringify(only?.action === "create"
        ? ["source", "rating", "text", "publishedAt"]
        : ["authorName", "rating", "text", "publishedAt", "sourceMetadata"]),
      actorName: input.tenant.actorName,
      actorRole: input.tenant.actorRole,
      reason: input.reason.slice(0, 500),
      createdAt: now,
    });
  }

  return {
    reviews: sorted,
    created: merged.created,
    updated: merged.updated,
    skipped: merged.skipped,
    invalid: merged.invalid,
    changedIds: merged.changes.map((change) => change.after.id),
    updatedAt: now,
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
  return {
    reviews: stored.reviews,
    summary: reviewLayerSummary(stored.reviews),
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
  const stored = await storedReviews(account.id, account.venueId);
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
    await getDb()
      .insert(domainData)
      .values({ accountId: account.id, storeKey: REVIEW_STORE_KEY, dataJson: JSON.stringify(sortReviews(stored.reviews)), updatedAt: now })
      .onConflictDoUpdate({
        target: [domainData.accountId, domainData.storeKey],
        set: { dataJson: JSON.stringify(sortReviews(stored.reviews)), updatedAt: now },
      });
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

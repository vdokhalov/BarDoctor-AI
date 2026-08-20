import { and, eq, lt, ne, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { aiUsageEvents, aiUsageLimits } from "../../db/schema";
import { runtimeEnv } from "./runtime-env";

export const DEFAULT_OPENAI_REQUEST_LIMIT = 250;

export type AIUsage = {
  used: number;
  limit: number;
  remaining: number;
  periodKey: string;
  resetsAt: string;
};

export type AIObservabilityContext = {
  actorAccountId?: number | null;
  venueId?: number | null;
  feature?: string;
};

export type AIProviderUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
};

function optionalInteger(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function featureLabel(value: string | null | undefined): string {
  return (value?.trim().toLocaleLowerCase("en").replace(/[^a-z0-9._-]+/g, "_") || "other").slice(0, 80);
}

/** Best-effort metadata only: prompt and response bodies are never stored. */
export async function recordAIUsageEvent(input: {
  accountId: number;
  context?: AIObservabilityContext;
  requestId?: string;
  provider: string;
  model: string;
  status: "success" | "error" | "queued" | "in_progress";
  latencyMs?: number | null;
  usage?: AIProviderUsage | null;
  errorCode?: string | null;
}): Promise<void> {
  try {
    const inputTokens = optionalInteger(input.usage?.inputTokens);
    const outputTokens = optionalInteger(input.usage?.outputTokens);
    const totalTokens = optionalInteger(input.usage?.totalTokens)
      ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
    const values = {
      accountId: input.accountId,
      actorAccountId: optionalInteger(input.context?.actorAccountId),
      venueId: optionalInteger(input.context?.venueId),
      requestId: input.requestId ?? crypto.randomUUID(),
      provider: input.provider.slice(0, 40),
      model: input.model.slice(0, 120),
      feature: featureLabel(input.context?.feature),
      inputTokens,
      outputTokens,
      totalTokens,
      status: input.status,
      latencyMs: optionalInteger(input.latencyMs),
      errorCode: input.errorCode?.slice(0, 120) || null,
    };
    await getDb().insert(aiUsageEvents).values(values).onConflictDoUpdate({
      target: aiUsageEvents.requestId,
      set: {
        actorAccountId: values.actorAccountId,
        venueId: values.venueId,
        model: values.model,
        feature: values.feature,
        inputTokens,
        outputTokens,
        totalTokens,
        status: values.status,
        latencyMs: values.latencyMs,
        errorCode: values.errorCode,
      },
    });
  } catch (error) {
    console.warn("AI observability event was not persisted", error instanceof Error ? error.message : "unknown");
  }
}

function currentPeriodKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextPeriodStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function includedRequestLimit(): number {
  const configured = Number(runtimeEnv("AI_MONTHLY_REQUEST_LIMIT"));
  return Number.isFinite(configured) && configured >= 1
    ? Math.min(10_000, Math.floor(configured))
    : DEFAULT_OPENAI_REQUEST_LIMIT;
}

async function ensureUsageRow(accountId: number): Promise<void> {
  const periodKey = currentPeriodKey();
  const requestLimit = includedRequestLimit();
  await getDb()
    .insert(aiUsageLimits)
    .values({
      accountId,
      usedRequests: 0,
      requestLimit,
      periodKey,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing({ target: aiUsageLimits.accountId });

  await getDb()
    .update(aiUsageLimits)
    .set({
      usedRequests: 0,
      requestLimit,
      periodKey,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(aiUsageLimits.accountId, accountId), ne(aiUsageLimits.periodKey, periodKey)));

  await getDb()
    .update(aiUsageLimits)
    .set({ requestLimit, updatedAt: new Date().toISOString() })
    .where(and(
      eq(aiUsageLimits.accountId, accountId),
      eq(aiUsageLimits.periodKey, periodKey),
      ne(aiUsageLimits.requestLimit, requestLimit),
    ));
}

function usage(row: { usedRequests: number; requestLimit: number; periodKey: string }): AIUsage {
  const used = Math.max(0, row.usedRequests);
  const limit = Math.max(0, row.requestLimit);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    periodKey: row.periodKey,
    resetsAt: nextPeriodStart(),
  };
}

export async function getOpenAIUsage(accountId: number): Promise<AIUsage> {
  await ensureUsageRow(accountId);
  const [row] = await getDb()
    .select({
      usedRequests: aiUsageLimits.usedRequests,
      requestLimit: aiUsageLimits.requestLimit,
      periodKey: aiUsageLimits.periodKey,
    })
    .from(aiUsageLimits)
    .where(eq(aiUsageLimits.accountId, accountId))
    .limit(1);

  return usage(row ?? {
    usedRequests: 0,
    requestLimit: includedRequestLimit(),
    periodKey: currentPeriodKey(),
  });
}

export async function reserveOpenAIRequest(accountId: number): Promise<AIUsage | null> {
  await ensureUsageRow(accountId);
  const [row] = await getDb()
    .update(aiUsageLimits)
    .set({
      usedRequests: sql<number>`${aiUsageLimits.usedRequests} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(aiUsageLimits.accountId, accountId),
        lt(aiUsageLimits.usedRequests, aiUsageLimits.requestLimit),
      ),
    )
    .returning({
      usedRequests: aiUsageLimits.usedRequests,
      requestLimit: aiUsageLimits.requestLimit,
      periodKey: aiUsageLimits.periodKey,
    });

  return row ? usage(row) : null;
}

import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRecommendationOutcome } from "../lib/bardoctor/recommendation-outcomes";
import type { VenueAIContext } from "../lib/bardoctor/venue-ai-context";

function context(monthKey: string, finalProfit: number): VenueAIContext {
  return {
    version: "venue-ai-context-v1",
    purpose: "diagnosis",
    generatedAt: `${monthKey}-28T12:00:00.000Z`,
    accountingCurrency: "RUB",
    blocks: [{
      id: "performanceHistory",
      label: "История показателей",
      available: true,
      freshness: "fresh",
      updatedAt: `${monthKey}-28T10:00:00.000Z`,
      detail: "Закрытый месяц",
      missingAction: null,
      data: {},
    }],
    promptData: {
      performanceHistory: {
        latestClosedMonth: {
          monthKey,
          periodLabel: monthKey,
          closedAt: `${monthKey}-28T10:00:00.000Z`,
          finalProfit,
        },
      },
    },
  };
}

const recommendation = {
  id: "task-1",
  recommendationId: "profit-control",
  verificationDate: "2026-08-20",
  baselineMetric: {
    metricId: "closed_month_final_profit",
    label: "Чистая прибыль",
    value: 100,
    unit: "currency",
    periodKey: "2026-07",
    periodLabel: "июль 2026",
    observedAt: "2026-07-31T22:00:00.000Z",
    source: "Закрытый месячный отчёт",
  },
  targetMetric: {
    metricId: "closed_month_final_profit",
    label: "Чистая прибыль не ниже 120",
    value: 120,
    unit: "currency",
    direction: "increase",
  },
};

test("marks a recommendation as helped when a new comparable period reaches target", () => {
  const result = evaluateRecommendationOutcome(
    recommendation,
    context("2026-08", 135),
    new Date("2026-08-30T12:00:00.000Z"),
  );

  assert.equal(result.status, "helped");
  assert.equal(result.actualMetric?.value, 135);
  assert.equal(result.delta, 35);
  assert.match(result.summary, /Помогло/);
});

test("marks a recommendation as not helped when the comparable period misses target", () => {
  const result = evaluateRecommendationOutcome(
    recommendation,
    context("2026-08", 110),
    new Date("2026-08-30T12:00:00.000Z"),
  );

  assert.equal(result.status, "not_helped");
  assert.equal(result.actualMetric?.value, 110);
  assert.match(result.summary, /Не помогло/);
});

test("waits for a new closed month instead of comparing the baseline with itself", () => {
  const result = evaluateRecommendationOutcome(
    recommendation,
    context("2026-07", 100),
    new Date("2026-08-30T12:00:00.000Z"),
  );

  assert.equal(result.status, "insufficient_data");
  assert.match(result.summary, /нет нового закрытого месяца/);
  assert.ok(result.nextCheckAfter);
});

test("reports insufficient data when the recommendation has no machine-checkable baseline", () => {
  const result = evaluateRecommendationOutcome(
    {
      recommendationId: "manual-check",
      verificationDate: "2026-08-20",
      targetMetric: { label: "Проверить качество", value: null },
    },
    context("2026-08", 135),
    new Date("2026-08-30T12:00:00.000Z"),
  );

  assert.equal(result.status, "insufficient_data");
  assert.match(result.summary, /не содержит числовой исходной точки/);
});

test("does not evaluate a recommendation before its existing task is completed", () => {
  const result = evaluateRecommendationOutcome(
    { ...recommendation, status: "in_progress" },
    context("2026-08", 135),
    new Date("2026-08-30T12:00:00.000Z"),
  );

  assert.equal(result.status, "pending");
  assert.match(result.summary, /после выполнения поручения/);
});

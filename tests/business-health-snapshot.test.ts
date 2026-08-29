import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBusinessHealthSnapshot,
  businessHealthSnapshotIdentity,
  businessHealthSnapshotCacheKey,
  BUSINESS_HEALTH_CALCULATION_VERSION,
  isBusinessHealthSnapshotNewer,
} from "../lib/bardoctor/business-health-snapshot";
import {
  buildBusinessIntelligence,
  businessHealthStatusForScore,
  type AIDoctorIntelligence,
} from "../lib/bardoctor/business-intelligence";

function intelligence(input: {
  score: number;
  confidence: number;
  finance: number;
  demand: number;
}): AIDoctorIntelligence {
  const base = buildBusinessIntelligence({
    venueId: "venue-a",
    now: new Date("2026-08-25T18:41:00.000Z"),
    daily: [],
    latestClosedMonth: {},
    operations: {},
    reviews: {},
    dataBlocks: [],
  });
  return {
    ...base,
    generatedAt: "2026-08-25T18:41:00.000Z",
    businessHealth: {
      ...base.businessHealth,
      score: input.score,
      label: "attention",
      confidencePercent: input.confidence,
      confidence: "medium",
      components: [
        { id: "finance", label: "Финансы", score: input.finance, weight: 40, confidence: "medium", evidence: ["Финансовый результат"], gaps: [] },
        { id: "demand", label: "Спрос", score: input.demand, weight: 20, confidence: "medium", evidence: ["Выручка к медиане"], gaps: [] },
        { id: "operations", label: "Операции", score: 80, weight: 25, confidence: "high", evidence: ["Смены закрыты"], gaps: [] },
      ],
      lowersScore: [],
      supportsScore: [],
      adjustments: [],
      methodology: "canonical",
      explanation: "Canonical server diagnosis",
    },
    dataQuality: { ...base.dataQuality, percent: 68, confidence: "medium" },
  };
}

const context = {
  blocks: [
    { id: "performanceHistory", label: "История", available: true, freshness: "fresh" as const, updatedAt: "2026-08-25T18:40:00.000Z", detail: "Есть", missingAction: null, data: {} },
    { id: "market", label: "Рынок", available: false, freshness: "missing" as const, updatedAt: null, detail: "Нет", missingAction: "Добавить", data: {} },
  ],
};

test("one canonical snapshot carries the same score and primary factor to Home and Health detail", () => {
  const snapshot = buildBusinessHealthSnapshot({
    venueId: 3280,
    intelligence: intelligence({ score: 58, confidence: 77, finance: 41, demand: 63 }),
    context,
  });
  const home = snapshot;
  const detail = snapshot;

  assert.equal(home.score, 58);
  assert.equal(detail.score, home.score);
  assert.deepEqual(home.primaryFactor, detail.primaryFactor);
  assert.equal(snapshot.primaryFactor?.id, "finance");
  assert.equal(snapshot.primaryFactor?.score, 41);
  assert.equal(snapshot.statusLabel, "Требует внимания");
  assert.equal(snapshot.calculationVersion, BUSINESS_HEALTH_CALCULATION_VERSION);
  assert.equal(snapshot.source, "server_business_intelligence");
  assert.match(snapshot.snapshotId, /^business-health-snapshot:/);
  assert.equal(snapshot.trend, null, "a seven-day trend is never fabricated without persisted Health history");
  assert.equal(snapshot.zones.find((zone) => zone.id === "finance")?.score, 41);
  assert.equal(snapshot.zones.find((zone) => zone.id === "finance")?.status, "critical");
  assert.equal(snapshot.dataQuality.status, "attention");
  assert.equal(snapshot.dataQuality.label, "Качество данных: среднее");
});

test("canonical Health severity keeps the 70-point boundary visible as attention", () => {
  assert.equal(businessHealthStatusForScore(null), "insufficient_data");
  assert.equal(businessHealthStatusForScore(44), "critical");
  assert.equal(businessHealthStatusForScore(45), "attention");
  assert.equal(businessHealthStatusForScore(70), "attention");
  assert.equal(businessHealthStatusForScore(71), "healthy");
});

test("the highest canonical briefing action becomes the only snapshot priority without a fake effect", () => {
  const source = intelligence({ score: 58, confidence: 77, finance: 41, demand: 63 });
  source.briefing.todayActions = [{
    recommendationId: "close-shift-2026-08-23",
    issueKey: "unclosed-shift",
    title: "Закройте смену от 23 августа",
    reason: "Это улучшит операционное состояние.",
    ctaLabel: "Исправить",
    deadlineLabel: "Срок действия",
    deadline: "Сегодня",
    metricToCheck: "Закрытие смены",
    targetOrVerification: "Смена закрыта",
    priority: "critical",
    responsibleRole: "Управляющий",
    fact: "Смена не закрыта",
    factPeriod: "23 августа",
    action: "Закрыть смену",
    successCriterion: "Смена закрыта",
    verificationPlanId: "verify-close-shift",
  }];

  const snapshot = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: source, context });
  assert.deepEqual(snapshot.priorityAction, {
    recommendationId: "close-shift-2026-08-23",
    issueKey: "unclosed-shift",
    title: "Закройте смену от 23 августа",
    reason: "Это улучшит операционное состояние.",
    ctaLabel: "Исправить",
    action: "Закрыть смену",
    successCriterion: "Смена закрыта",
    expectedScore: null,
    target: { path: "/shifts", label: "Проверить смены" },
  });
});

test("operations warning explains its canonical stock factor and deep-links to the workflow", () => {
  const source = buildBusinessIntelligence({
    venueId: "venue-a",
    now: new Date("2026-08-28T18:00:00.000Z"),
    profile: { timezone: "Europe/Chisinau" },
    daily: [
      { date: "2026-07-01", revenue: 100, receipts: 10 },
      { date: "2026-07-02", revenue: 100, receipts: 10 },
      { date: "2026-08-01", revenue: 120, receipts: 11 },
      { date: "2026-08-02", revenue: 120, receipts: 11 },
    ],
    latestClosedMonth: { monthKey: "2026-07", revenue: 10_000, finalProfit: 1_000 },
    operations: { stockAnomalies: 6 },
    dataBlocks: [],
  });
  const snapshot = buildBusinessHealthSnapshot({ venueId: "venue-a", intelligence: source, context });
  const operations = snapshot.zones.find((zone) => zone.id === "operations");

  assert.equal(operations?.score, 70);
  assert.equal(operations?.status, "attention");
  assert.match(operations?.interpretation ?? "", /аномалии остатков: 6/i);
  assert.equal(snapshot.priorityAction?.issueKey, "stock");
  assert.deepEqual(snapshot.priorityAction?.target, { path: "/warehouse", label: "Проверить остатки" });
});

test("healthy Health without an actionable diagnosis stays positive without inventing a CTA", () => {
  const source = intelligence({ score: 83, confidence: 88, finance: 86, demand: 94 });
  source.businessHealth.label = "healthy";
  source.briefing.todayActions = [];
  source.prioritySignals = [];

  const snapshot = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: source, context });

  assert.equal(snapshot.status, "healthy");
  assert.equal(snapshot.statusLabel, "Хорошее состояние");
  assert.equal(snapshot.priorityAction, null);
});

test("an unmapped diagnosis never creates a dead generic deep link", () => {
  const source = intelligence({ score: 62, confidence: 77, finance: 65, demand: 63 });
  source.briefing.todayActions = [{
    recommendationId: "unknown-action",
    issueKey: "unknown-workflow",
    title: "Проверьте нестандартный фактор",
    reason: "Нужно уточнение.",
    ctaLabel: "Открыть раздел",
    deadlineLabel: "Срок действия",
    deadline: "Сегодня",
    metricToCheck: "Фактор",
    targetOrVerification: "Проверено",
    priority: "medium",
    responsibleRole: "Управляющий",
    fact: "Есть фактор",
    factPeriod: "Сейчас",
    action: "Проверить",
    successCriterion: "Проверено",
    verificationPlanId: "verify-unknown",
  }];

  const snapshot = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: source, context });

  assert.equal(snapshot.priorityAction?.target, null);
});

test("missing guest data remains unavailable and cannot become a zero-score primary factor", () => {
  const source = intelligence({ score: 64, confidence: 68, finance: 72, demand: 65 });
  source.businessHealth.components.push({
    id: "guests",
    label: "Гости",
    score: null,
    weight: 15,
    confidence: "low",
    evidence: [],
    gaps: ["Нет отзывов"],
  });
  const snapshot = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: source, context });
  const guests = snapshot.factorScores.find((factor) => factor.id === "guests");

  assert.equal(guests?.score, null);
  assert.equal(guests?.availability, "unavailable");
  assert.notEqual(snapshot.primaryFactor?.id, "guests");
  assert.equal(snapshot.score, 64);
});

test("an explicitly measured guest score of zero remains a real zero", () => {
  const source = intelligence({ score: 54, confidence: 68, finance: 72, demand: 65 });
  source.businessHealth.components.push({
    id: "guests",
    label: "Гости",
    score: 0,
    weight: 15,
    confidence: "medium",
    evidence: ["Измеренный гостевой показатель"],
    gaps: [],
  });
  const snapshot = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: source, context });
  const guests = snapshot.factorScores.find((factor) => factor.id === "guests");

  assert.equal(guests?.score, 0);
  assert.equal(guests?.availability, "measured");
  assert.equal(snapshot.primaryFactor?.id, "guests");
  assert.equal(snapshot.primaryFactor?.score, 0);
});

test("snapshot identity is stable and an older response cannot replace a newer snapshot", () => {
  const newer = buildBusinessHealthSnapshot({
    venueId: 3280,
    intelligence: intelligence({ score: 64, confidence: 68, finance: 65, demand: 58 }),
    context,
  });
  const olderIntelligence = intelligence({ score: 58, confidence: 77, finance: 41, demand: 63 });
  olderIntelligence.generatedAt = "2026-08-24T18:41:00.000Z";
  const older = buildBusinessHealthSnapshot({ venueId: 3280, intelligence: olderIntelligence, context });

  assert.equal(
    newer.snapshotId,
    businessHealthSnapshotIdentity({
      venueId: newer.venueId,
      generatedAt: newer.generatedAt,
      calculationVersion: newer.calculationVersion,
      period: newer.period,
    }),
  );
  assert.equal(isBusinessHealthSnapshotNewer(older, newer), false);
  assert.equal(isBusinessHealthSnapshotNewer(newer, older), true);
  assert.equal(isBusinessHealthSnapshotNewer(newer, newer), false);
});

test("venue, calculation version and reporting period isolate cache identities", () => {
  const base = {
    accountContext: "manager@example.test",
    calculationVersion: BUSINESS_HEALTH_CALCULATION_VERSION,
    period: { id: "comparable_shift" as const, startDate: "2026-08-22", endDate: "2026-08-22" },
  };
  const venueA = businessHealthSnapshotCacheKey({ ...base, venueId: "3280" });
  const venueB = businessHealthSnapshotCacheKey({ ...base, venueId: "2088" });
  const nextPeriod = businessHealthSnapshotCacheKey({
    ...base,
    venueId: "3280",
    period: { ...base.period, startDate: "2026-08-29", endDate: "2026-08-29" },
  });
  const nextVersion = businessHealthSnapshotCacheKey({
    ...base,
    venueId: "3280",
    calculationVersion: "business-health-engine-v5",
  });

  assert.notEqual(venueA, venueB);
  assert.notEqual(venueA, nextPeriod);
  assert.notEqual(venueA, nextVersion);
});

test("snapshot exposes one venue and data-account context plus real source freshness", () => {
  const snapshot = buildBusinessHealthSnapshot({
    venueId: 3280,
    dataAccountId: 8,
    intelligence: intelligence({ score: 83, confidence: 68, finance: 86, demand: 94 }),
    context,
  });

  assert.equal(snapshot.venueId, "3280");
  assert.equal(snapshot.dataAccountId, "8");
  assert.equal(snapshot.dataFreshness.latestUpdatedAt, "2026-08-25T18:40:00.000Z");
  assert.notEqual(snapshot.generatedAt, snapshot.dataFreshness.latestUpdatedAt);
});

test("a refreshed snapshot changes every consumer through one replacement value", () => {
  const first = buildBusinessHealthSnapshot({
    venueId: 3280,
    intelligence: intelligence({ score: 58, confidence: 77, finance: 41, demand: 63 }),
    context,
  });
  const refreshed = buildBusinessHealthSnapshot({
    venueId: 3280,
    intelligence: intelligence({ score: 54, confidence: 68, finance: 60, demand: 41 }),
    context,
  });

  assert.equal(first.primaryFactor?.id, "finance");
  assert.equal(refreshed.primaryFactor?.id, "demand");
  assert.equal(refreshed.score, 54);
  assert.equal(refreshed.confidence, 68);
  assert.notEqual(first, refreshed);
});

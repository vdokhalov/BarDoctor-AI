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
    dataQuality: { ...base.dataQuality, percent: 68 },
  };
}

const context = {
  blocks: [
    { id: "performanceHistory", label: "История", available: true, freshness: "fresh" as const, updatedAt: "2026-08-25T18:40:00.000Z", detail: "Есть", missingAction: null, data: {} },
    { id: "market", label: "Рынок", available: false, freshness: "missing" as const, updatedAt: null, detail: "Нет", missingAction: "Добавить", data: {} },
  ],
};

test("one canonical snapshot carries the same score, confidence and primary factor to every consumer", () => {
  const snapshot = buildBusinessHealthSnapshot({
    venueId: 3280,
    intelligence: intelligence({ score: 58, confidence: 77, finance: 41, demand: 63 }),
    context,
  });
  const splash = snapshot;
  const home = snapshot;
  const aiDoctor = snapshot;

  assert.equal(splash.score, 58);
  assert.equal(home.score, splash.score);
  assert.equal(aiDoctor.confidence, splash.confidence);
  assert.deepEqual(home.primaryFactor, splash.primaryFactor);
  assert.equal(snapshot.primaryFactor?.id, "finance");
  assert.equal(snapshot.primaryFactor?.score, 41);
  assert.equal(snapshot.statusLabel, "Требует внимания");
  assert.equal(snapshot.calculationVersion, BUSINESS_HEALTH_CALCULATION_VERSION);
  assert.equal(snapshot.source, "server_business_intelligence");
  assert.match(snapshot.snapshotId, /^business-health-snapshot:/);
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
    calculationVersion: "business-health-engine-v4",
  });

  assert.notEqual(venueA, venueB);
  assert.notEqual(venueA, nextPeriod);
  assert.notEqual(venueA, nextVersion);
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

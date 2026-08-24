import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessIntelligence, type BusinessIntelligenceInput } from "../lib/bardoctor/business-intelligence";

const dates = ["2026-07-18", "2026-07-25", "2026-08-01", "2026-08-08", "2026-08-15"];

function input(patch: BusinessIntelligenceInput = {}): BusinessIntelligenceInput {
  const daily = dates.map((date) => ({ date, revenue: 10_000, receipts: 100, avgReceipt: 100 }));
  daily.push({ date: "2026-08-22", revenue: 5_390, receipts: 67, avgReceipt: 80.45 });
  return {
    venueId: "venue-self-service",
    now: new Date("2026-08-22T12:00:00.000Z"),
    phase: "before_shift",
    profile: { openTime: "22:00", closeTime: "06:00", accountingCurrency: "RUB" },
    currency: "RUB",
    daily,
    operations: {},
    reviews: {},
    dataBlocks: [{ id: "performanceHistory", label: "История", available: true, freshness: "fresh" }],
    ...patch,
  };
}

function hourly() {
  return [
    ...dates.flatMap((date) => [
      { date, hour: 23, checks: 20, revenue: 2_000 },
      { date, hour: 0, checks: 30, revenue: 3_000 },
      { date, hour: 1, checks: 25, revenue: 2_500 },
    ]),
    { date: "2026-08-22", hour: 23, checks: 18, revenue: 1_440 },
    { date: "2026-08-22", hour: 0, checks: 17, revenue: 1_360 },
    { date: "2026-08-22", hour: 1, checks: 24, revenue: 1_920 },
  ];
}

function sales() {
  const baseline = dates.map((date) => ({
    id: `sales-${date}`,
    date,
    status: "confirmed",
    checks: 100,
    items: [
      { name: "Стейк", category: "Горячие блюда", grossSales: 4_000 },
      { name: "Коктейль", category: "Коктейли", grossSales: 3_000 },
      { name: "Вода", category: "Безалкогольные", grossSales: 3_000 },
    ],
  }));
  return [...baseline, {
    id: "sales-target",
    date: "2026-08-22",
    status: "confirmed",
    checks: 67,
    items: [
      { name: "Стейк", category: "Горячие блюда", grossSales: 1_340 },
      { name: "Коктейль", category: "Коктейли", grossSales: 2_010 },
      { name: "Вода", category: "Безалкогольные", grossSales: 2_040 },
    ],
  }];
}

test("hour-level data returns the problem hour instead of delegating the analysis", () => {
  const result = buildBusinessIntelligence(input({ hourly: hourly() }));
  assert.equal(result.selfServiceAnalytics.traffic.topWindows[0]?.periodLabel, "00:00–01:00");
  assert.match(result.briefing.findings[0]?.title ?? "", /00:00–01:00/);
  assert.ok(result.briefing.todayActions.every((item) => !/найти период|разобрать трафик/i.test(item.title + item.action)));
});

test("category and item data returns contributors instead of delegating item analysis", () => {
  const result = buildBusinessIntelligence(input({ hourly: hourly(), sales: sales() }));
  assert.equal(result.selfServiceAnalytics.averageCheck.topCategories[0]?.label, "Горячие блюда");
  assert.equal(result.selfServiceAnalytics.averageCheck.topItems[0]?.label, "Стейк");
  assert.ok(result.briefing.todayActions.every((item) => !/найти позиции|разобрать категории|проанализировать продажи/i.test(item.title + item.action)));
});

test("missing hour-level data states the limitation", () => {
  const result = buildBusinessIntelligence(input({ sales: sales() }));
  assert.equal(result.selfServiceAnalytics.traffic.status, "unavailable");
  assert.match(result.selfServiceAnalytics.traffic.limitation ?? "", /время чеков/i);
  assert.ok(result.briefing.findings.some((item) => item.id === "traffic-window-limitation"));
});

test("missing item-level data states the limitation", () => {
  const result = buildBusinessIntelligence(input({ hourly: hourly() }));
  assert.equal(result.selfServiceAnalytics.averageCheck.status, "unavailable");
  assert.match(result.selfServiceAnalytics.averageCheck.limitation ?? "", /отдельных позиций/i);
  assert.ok(result.briefing.findings.some((item) => item.id === "average-check-limitation"));
});

test("today actions contain human actions only when source data are available", () => {
  const result = buildBusinessIntelligence(input({ hourly: hourly(), sales: sales() }));
  assert.ok(result.briefing.todayActions.length >= 2);
  assert.ok(result.briefing.todayActions.every((item) => !/найти|проанализировать|сравнить показатели|проверить обычный уровень/i.test(item.title)));
  assert.ok(result.briefing.todayActions.every((item) => /утвердить|проверить наличие|дать команде|назначить/i.test(item.action)));
});

test("post-shift verification plan is stable and reused", () => {
  const first = buildBusinessIntelligence(input({ hourly: hourly(), sales: sales() }));
  const completed = buildBusinessIntelligence(input({
    phase: "after_shift",
    hourly: hourly(),
    sales: sales(),
    previousVerificationPlans: [first.briefing.verificationPlan],
  }));
  assert.equal(completed.briefing.verificationPlan.id, first.briefing.verificationPlan.id);
  assert.equal(completed.briefing.verificationPlan.reused, true);
  assert.equal(completed.briefing.verificationPlan.status, "completed");
  assert.ok(completed.briefing.verificationPlan.result?.confirmed.length);
});

test("failed external provider never claims that no external factors exist", () => {
  const result = buildBusinessIntelligence(input({ externalProvider: { attempted: true, ok: false, coverage: "insufficient" } }));
  assert.equal(result.briefing.externalContextState.status, "unavailable");
  assert.doesNotMatch(result.briefing.externalContextState.message, /не найдено|не обнаружено/i);
});

test("successful provider with sufficient coverage may report no significant factors", () => {
  const result = buildBusinessIntelligence(input({ externalProvider: { attempted: true, ok: true, coverage: "sufficient" } }));
  assert.equal(result.briefing.externalContextState.status, "checked_none");
  assert.match(result.briefing.externalContextState.message, /не найдено/i);
});

test("briefing uses human dates and contains no raw actual or baseline labels", () => {
  const result = buildBusinessIntelligence(input({ hourly: hourly(), sales: sales() }));
  const serialized = [
    result.briefing.diagnosis?.summary,
    ...result.briefing.keyDrivers.flatMap((item) => [item.metric, item.value, item.contribution, item.explanation]),
    ...result.briefing.findings.flatMap((item) => [item.title, item.detail, item.contribution]),
    ...result.briefing.todayActions.flatMap((item) => [item.title, item.reason, item.action, item.targetOrVerification]),
    ...result.briefing.afterShiftChecks.flatMap((item) => [item.metric, item.baseline, item.expectedComparison]),
    result.briefing.externalContextState.message,
  ].filter(Boolean).join(" ");
  assert.match(result.briefing.analysisPeriod.label, /22 августа/);
  assert.match(result.briefing.analysisPeriod.comparisonBaseline, /сопоставимых суббот/);
  assert.doesNotMatch(serialized, /actual|baseline/i);
  assert.doesNotMatch(result.briefing.diagnosis?.periodLabel ?? "", /^\d{4}-\d{2}-\d{2}/);
});

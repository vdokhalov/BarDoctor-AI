import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVenueAIContextFromSources,
  type StoredVenueValue,
} from "../lib/bardoctor/venue-ai-context";

function stored(data: unknown, updatedAt = "2026-08-01T10:00:00.000Z"): StoredVenueValue {
  return { data, updatedAt };
}

test("diagnosis context covers every requested management direction without sending the full menu", () => {
  const menuItems = Array.from({ length: 40 }, (_, index) => ({
    id: `menu-${index + 1}`,
    name: `Позиция ${index + 1}`,
    department: index % 2 ? "bar" : "kitchen",
    category: index % 2 ? "Коктейли" : "Закуски",
    salePrice: 100 + index * 10,
    plannedSales: 40 - index,
    type: "composite",
    active: true,
  }));
  const stores = new Map<string, StoredVenueValue>([
    ["bd_assortment_v1", stored({
      menuItems,
      recipes: menuItems.slice(0, 20).map((item) => ({
        menuItemId: item.id,
        status: "confirmed",
        ingredients: [{ name: "Ингредиент", quantity: 1, unit: "шт." }],
      })),
      groups: [{ id: "bar" }, { id: "kitchen" }],
      subgroups: [{ id: "cocktails" }, { id: "snacks" }],
      stockBalances: [{ name: "Лайм", current: 2, safety: 5, unit: "шт." }],
    })],
    ["bd_purchase_documents", stored([{
      id: "purchase-1",
      status: "confirmed",
      date: "2026-07-30",
      supplierName: "Поставщик",
      expenseCategory: "products",
      total: 1_500,
      items: [{ name: "Лайм", quantity: 10, unitPrice: 20, lineTotal: 200 }],
    }])],
    ["bd_inventory_snapshots", stored([{ date: "2026-07-31", totals: { bar: 12_000 } }])],
    ["bd_suppliers", stored([{ id: "supplier-1", name: "Поставщик" }])],
    ["bd_employees", stored([{ id: "employee-1", status: "active", position: "Бармен", department: "Бар" }])],
    ["bd_guest_reviews", stored([{ id: "review-1", date: "2026-07-29", rating: 4, sentiment: "positive" }])],
    ["bd_opportunity_calendar_v1", stored({
      generatedAt: "2026-08-01T09:00:00.000Z",
      events: [{ title: "День города", startDate: "2026-08-15", potentialScore: 80, decision: "watching" }],
    })],
    ["bd_market_analysis_v1", stored({
      competitors: [{ name: "Бастион", confirmed: true, category: "Бар" }],
    })],
    ["bd_month_closings", stored([
      {
        monthKey: "2026-07",
        status: "closed",
        closedAt: "2026-08-01T11:00:00.000Z",
        snapshot: {
          revenue: 200_000,
          finalProfit: 20_982,
          payroll: 50_000,
          costOfGoods: 70_000,
          otherExpenses: 25_000,
          writeoffs: 3_000,
          taxes: 10_000,
          utilities: 7_000,
          purchases: 60_000,
          coveragePercent: 100,
          accountedShifts: 12,
          expectedShifts: 12,
          sections: [{ section: "Бар", cost: 45_000 }, { section: "Кухня", cost: 25_000 }],
        },
      },
      {
        monthKey: "2026-06",
        status: "closed",
        closedAt: "2026-07-01T11:00:00.000Z",
        snapshot: {
          revenue: 180_000,
          finalProfit: 15_000,
          payroll: 48_000,
          costOfGoods: 65_000,
          otherExpenses: 24_000,
          writeoffs: 4_000,
          taxes: 9_000,
          utilities: 7_000,
          coveragePercent: 100,
        },
      },
    ])],
  ]);

  const context = buildVenueAIContextFromSources("diagnosis", {
    accountProfile: {
      name: "Кёльн",
      country: "Молдова",
      region: "Приднестровье",
      city: "Бендеры",
      district: "Центр",
      businessType: "Бар",
      venueFormat: "Караоке-клуб",
      concept: "Ночной развлекательный комплекс",
      priceSegment: "средний",
      openTime: "22:00",
      closeTime: "06:00",
      workingDays: { friday: true, saturday: true, sunday: true },
    },
    accountUpdatedAt: "2026-07-28T10:00:00.000Z",
    request: {
      finance: {
        tracked: true,
        recentDaily: [
          { date: "2026-07-31", revenue: 20_000, receipts: 50, guests: 70 },
          { date: "2026-07-25", revenue: 18_000, receipts: 45, guests: 62 },
          { date: "2026-07-24", revenue: 17_000, receipts: 42, guests: 60 },
          { date: "2026-07-18", revenue: 15_000, receipts: 40, guests: 55 },
        ],
      },
      employees: { total: 1, active: 1 },
    },
    stores,
    external: {
      reviews: { total: 1, averageRating: 4, positive: 1, neutral: 0, negative: 0 },
      confirmedCompetitors: [{ name: "Бастион", category: "Бар", relation: "direct" }],
    },
    now: new Date("2026-08-01T12:00:00.000Z"),
  });

  assert.equal(context.version, "venue-ai-context-v1");
  assert.deepEqual(context.blocks.map((item) => item.id), [
    "location",
    "format",
    "pricePosition",
    "schedule",
    "performanceHistory",
    "menuAndRecipes",
    "salesAndCost",
    "purchasesAndInventory",
    "team",
    "guestFeedback",
    "seasonalityAndEvents",
    "market",
  ]);
  const menu = context.promptData.menuAndRecipes;
  assert.equal(menu.fullMenuSentToAI, false);
  assert.equal((menu.sample as unknown[]).length, 15);
  assert.equal(menu.items, 40);
  assert.equal(menu.recipeCoveragePercent, 50);
  assert.equal(context.blocks.every((item) => item.freshness !== "missing"), true);
  const performance = context.promptData.performanceHistory;
  assert.equal((performance.latestClosedMonth as Record<string, unknown>).monthKey, "2026-07");
  assert.equal((performance.latestClosedMonth as Record<string, unknown>).finalProfit, 20_982);
  assert.equal((performance.latestClosedMonth as Record<string, unknown>).profitMarginPercent, 10.5);
  assert.equal((performance.closedMonthComparison as Record<string, unknown>).profitDelta, 5_982);
  assert.equal((performance.closedMonthComparison as Record<string, unknown>).basis, "Собственная история заведения");
  assert.equal((context.promptData.salesAndCost.closedMonthProfitability as Record<string, unknown>).costOfGoods, 70_000);
});

test("each AI purpose receives only its relevant slice", () => {
  const context = buildVenueAIContextFromSources("incident", {
    accountProfile: { name: "Кёльн", businessType: "Бар", openTime: "22:00", closeTime: "06:00" },
    request: { employees: { total: 2, active: 2 } },
    now: new Date("2026-08-01T12:00:00.000Z"),
  });

  assert.deepEqual(context.blocks.map((item) => item.id), [
    "format",
    "schedule",
    "performanceHistory",
    "purchasesAndInventory",
    "team",
  ]);
  assert.equal("menuAndRecipes" in context.promptData, false);
  assert.equal("guestFeedback" in context.promptData, false);
});

test("every financial mutation reaches AI input and the restored closed snapshot returns to 640 MDL", () => {
  const baseline = {
    revenue: 1_000,
    purchases: 200,
    purchasePayments: 120,
    legacyPurchaseExpenses: 15,
    closingInventory: 160,
    writeoffs: 10,
    payroll: 200,
    otherExpenses: 30,
    taxes: 50,
    utilities: 40,
    supplierReturn: 0,
  };
  const build = (patch: Partial<typeof baseline> = {}) => {
    const state = { ...baseline, ...patch };
    const costOfGoods = state.purchases - state.closingInventory - state.writeoffs;
    const netOtherExpenses = state.otherExpenses - state.supplierReturn;
    const finalProfit = state.revenue
      - costOfGoods
      - state.writeoffs
      - state.payroll
      - netOtherExpenses
      - state.taxes
      - state.utilities;
    const context = buildVenueAIContextFromSources(
    "diagnosis",
    {
      accountProfile: {
        name: "RC Finance",
        businessType: "Бар",
        openTime: "22:00",
        closeTime: "06:00",
      },
      stores: new Map<string, StoredVenueValue>([
        ["bd_finance_revenue", stored([
          { date: "2026-06-30", revenue: state.revenue, receipts: 20, guests: 25 },
        ], "2026-08-11T10:00:00.000Z")],
        ["bd_finance_expenses", stored([
          { date: "2026-06-30", category: "products", amount: state.purchasePayments },
          { date: "2026-06-30", category: "writeoff", amount: state.writeoffs },
          { date: "2026-06-30", category: "other", amount: state.otherExpenses },
        ], "2026-08-11T10:00:00.000Z")],
        ["bd_month_closings", stored([{
          monthKey: "2026-06",
          status: "closed",
          closedAt: "2026-08-11T10:05:00.000Z",
          snapshot: {
            revenue: state.revenue,
            finalProfit,
            payroll: state.payroll,
            costOfGoods,
            otherExpenses: netOtherExpenses,
            writeoffs: state.writeoffs,
            taxes: state.taxes,
            utilities: state.utilities,
            purchases: state.purchases,
            purchasePayments: state.purchasePayments,
            legacyPurchaseExpenses: state.legacyPurchaseExpenses,
            openingInventory: 0,
            closingInventory: state.closingInventory,
            coveragePercent: 100,
          },
        }], "2026-08-11T10:05:00.000Z")],
      ]),
      now: new Date("2026-08-11T12:00:00.000Z"),
    },
  );
    return { context, state, costOfGoods, netOtherExpenses, finalProfit };
  };

  const mutations: Array<[string, Partial<typeof baseline>, number]> = [
    ["закупочная цена", { purchases: 220 }, 620],
    ["количество закупки", { purchases: 220, closingInventory: 180 }, 640],
    ["продажа и складское списание", { revenue: 1_100, closingInventory: 140 }, 720],
    ["возврат поставщику", { closingInventory: 140, supplierReturn: 20 }, 640],
    ["списание", { closingInventory: 150, writeoffs: 20 }, 630],
    ["фактическая инвентаризация", { closingInventory: 180 }, 660],
    ["ФОТ", { payroll: 220 }, 620],
    ["оплата поставщику", { purchasePayments: 140 }, 640],
    ["аванс или выплата", {}, 640],
    ["налог", { taxes: 60 }, 630],
    ["коммунальный расход", { utilities: 50 }, 630],
    ["прочий расход", { otherExpenses: 40 }, 630],
  ];

  for (const [label, patch, expectedProfit] of mutations) {
    const { context, state, costOfGoods, netOtherExpenses, finalProfit } = build(patch);
    const performance = context.promptData.performanceHistory.latestClosedMonth as Record<string, unknown>;
    const salesAndCost = context.promptData.salesAndCost.closedMonthProfitability as Record<string, unknown>;
    assert.equal(finalProfit, expectedProfit, label);
    assert.equal(performance.revenue, state.revenue, label);
    assert.equal(performance.finalProfit, expectedProfit, label);
    assert.equal(performance.costOfGoods, costOfGoods, label);
    assert.equal(performance.payroll, state.payroll, label);
    assert.equal(performance.otherExpenses, netOtherExpenses, label);
    assert.equal(performance.writeoffs, state.writeoffs, label);
    assert.equal(performance.taxes, state.taxes, label);
    assert.equal(performance.utilities, state.utilities, label);
    assert.equal(performance.purchasesCash, state.purchasePayments, label);
    assert.equal(performance.supplierPayments, state.purchasePayments, label);
    assert.equal(performance.legacyPurchaseExpenses, state.legacyPurchaseExpenses, label);
    assert.equal(performance.closingInventory, state.closingInventory, label);
    assert.equal(salesAndCost.revenue, state.revenue, label);
    assert.equal(salesAndCost.finalProfit, expectedProfit, label);
    assert.equal(salesAndCost.costOfGoods, costOfGoods, label);
  }

  const restored = build().context;
  assert.equal(
    (restored.promptData.performanceHistory.latestClosedMonth as Record<string, unknown>).revenue,
    1_000,
  );
  assert.equal(
    (restored.promptData.salesAndCost.closedMonthProfitability as Record<string, unknown>).finalProfit,
    640,
  );
});

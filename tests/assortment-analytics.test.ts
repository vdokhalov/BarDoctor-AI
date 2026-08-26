import assert from "node:assert/strict";
import test from "node:test";
import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";

function purchase(overrides: Record<string, unknown> = {}) {
  return {
    id: "purchase-1",
    venueId: 1,
    status: "confirmed",
    documentType: "invoice",
    supplierId: "supplier-1",
    supplierName: "Поставщик",
    date: "2026-08-04",
    currency: "RUB",
    confirmedAt: "2026-08-04T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Виски 1 л",
      quantity: 1,
      unit: "шт.",
      packageSize: "1 л",
      lineTotal: 1_000,
      unitPrice: 1_000,
      purchaseProductKey: "product:whisky",
    }],
    ...overrides,
  };
}

function assortment(overrides: Record<string, unknown> = {}) {
  return {
    horizonDays: 7,
    groups: [{ id: "bar", name: "Бар", legacyDepartment: "bar" }],
    menuItems: [{
      id: "whisky-cola",
      groupId: "bar",
      department: "bar",
      category: "Коктейли",
      name: "Виски-кола",
      type: "composite",
      salePrice: 300,
      currency: "RUB",
      plannedSales: 10,
      active: true,
    }],
    recipes: [{
      id: "recipe-1",
      menuItemId: "whisky-cola",
      status: "confirmed",
      ingredients: [{
        id: "ingredient-1",
        name: "Виски",
        quantity: 50,
        unit: "мл",
        purchaseProductKey: "product:whisky",
      }],
    }],
    stockBalances: [{
      key: "product:whisky",
      current: 2_000,
      unit: "ml",
      averageUnitCost: 0.9,
      currency: "RUB",
      checkedAt: "2026-08-01",
    }],
    ...overrides,
  };
}

test("readiness is transparent and optional stock/sales do not change its denominator", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [purchase()],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.readiness.requiredChecks, 5);
  assert.equal(analytics.readiness.completedRequiredChecks, 5);
  assert.equal(analytics.summary.readinessPercent, 100);
  assert.equal(analytics.readiness.desirable[0].affectsScore, false);
  assert.match(analytics.readiness.formula, /обязательные проверки/i);
});

test("current recipe cost preserves weighted inventory valuation before latest purchase fallback", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment(),
    purchaseDocuments: [purchase()],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];

  assert.equal(item.recipeCost, 45);
  assert.equal(item.costPercent, 15);
  assert.equal(item.unitGrossProfit, 255);
  assert.equal(item.ingredientRows[0].source, "weighted_inventory_average");
  assert.match(analytics.valuation.currentCostRule, /Средневзвешенная/);
});

test("ready product economics use canonical packaging without conflating sale size with a recipe", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "cola-125",
        groupId: "bar",
        department: "bar",
        category: "Безалкогольные напитки",
        name: "Кола 1,25 л",
        type: "ready",
        salePrice: 90,
        currency: "RUB",
        plannedSales: 4,
        active: true,
        readyProduct: {
          nomenclatureItemId: "product:cola-125",
          productKey: "product:cola-125",
          packageLabel: "1,25 л",
          packagesPerSale: 1,
        },
      }],
      recipes: [],
      nomenclature: [{
        id: "product:cola-125",
        productKey: "product:cola-125",
        name: "Coca-Cola 1,25 л",
        unit: "pcs",
        packageSize: "1,25 л",
      }],
      stockBalances: [{
        id: "product:cola-125",
        key: "product:cola-125",
        productKey: "product:cola-125",
        name: "Coca-Cola 1,25 л",
        current: 12,
        unit: "pcs",
        packageSize: "1,25 л",
        averageUnitCost: 40,
        currency: "RUB",
      }],
    }),
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];
  assert.equal(item.portionSize, "1,25 л");
  assert.equal(item.recipeStatus, "confirmed");
  assert.equal(item.techCardSource, "ready_product");
  assert.equal(item.recipeCost, 40);
  assert.equal(item.status, "ready");
  assert.deepEqual(analytics.saleSizeUnits.map((unit) => unit.code), ["ml", "l", "g", "kg", "pcs"]);
});

test("draft OCR and unmapped items never become factual ingredient prices", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [
      purchase({ status: "draft", items: [{
        id: "draft-line",
        name: "Виски 1 л",
        quantity: 1,
        unit: "шт.",
        packageSize: "1 л",
        lineTotal: 500,
        purchaseProductKey: "product:whisky",
      }] }),
      purchase({ id: "unmapped", items: [{
        id: "unmapped-line",
        name: "Виски 1 л",
        quantity: 1,
        unit: "шт.",
        packageSize: "1 л",
        lineTotal: 600,
      }] }),
    ],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].recipeCost, null);
  assert.equal(analytics.counts.missingPurchasePrices, 1);
  assert.equal(analytics.aiContext.confirmedMenuEconomics.length, 0);
});

test("cost change is derived from distinct confirmed purchase history without duplicate inflation", () => {
  const duplicatedLatest = purchase({
    id: "purchase-2",
    date: "2026-08-10",
    updatedAt: "2026-08-10T14:00:00.000Z",
    items: [{
      id: "line-2",
      name: "Виски 1 л",
      quantity: 1,
      unit: "шт.",
      packageSize: "1 л",
      lineTotal: 1_200,
      purchaseProductKey: "product:whisky",
    }],
  });
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [
      purchase(),
      duplicatedLatest,
      { ...duplicatedLatest, updatedAt: "2026-08-10T12:00:00.000Z" },
    ],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].costHistory.length, 2);
  assert.equal(analytics.menuItems[0].costChangePercent, 20);
  assert.equal(analytics.menuItems[0].costDrivers[0].name, "Виски");
  assert.equal(analytics.menuItems[0].costDrivers[0].delta, 10);
  assert.match(analytics.menuItems[0].costChangeBasis ?? "", /Виски/);
  assert.equal(analytics.costChanges.length, 1);
});

test("cost history never reports a percentage across different currencies", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [
      purchase(),
      purchase({
        id: "purchase-usd",
        date: "2026-08-10",
        currency: "USD",
        items: [{
          id: "line-usd",
          name: "Виски 1 л",
          quantity: 1,
          unit: "шт.",
          packageSize: "1 л",
          lineTotal: 20,
          purchaseProductKey: "product:whisky",
        }],
      }),
    ],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].costHistory.length, 1);
  assert.equal(analytics.menuItems[0].costChangePercent, null);
  assert.equal(analytics.costChanges.length, 0);
});

test("menu economics stay insufficient when one sold item has no trustworthy cost", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [],
    salesDocuments: [{
      id: "sales-1",
      venueId: 1,
      status: "confirmed",
      date: "2026-08-08",
      totalRevenue: 600,
      items: [{ id: "sale-line", menuItemId: "whisky-cola", name: "Виски-кола", quantity: 2, grossSales: 600 }],
    }],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.economics.revenue, 600);
  assert.equal(analytics.economics.costOfGoods, null);
  assert.equal(analytics.economics.grossMargin, null);
  assert.match(analytics.economics.insufficientReason ?? "", /Недостаточно/);
});

test("service items without factual cost never become zero-cost or 100% margin", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "service-fee",
        groupId: "bar",
        department: "bar",
        category: "Сервис",
        name: "Сервисный сбор",
        type: "service",
        salePrice: 100,
        currency: "RUB",
        active: true,
      }],
      recipes: [],
      stockBalances: [],
    }),
    salesDocuments: [{
      id: "sales-service",
      venueId: 1,
      status: "confirmed",
      date: "2026-08-08",
      totalRevenue: 100,
      items: [{
        id: "sale-service-line",
        menuItemId: "service-fee",
        name: "Сервисный сбор",
        quantity: 1,
        grossSales: 100,
      }],
    }],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].status, "ready");
  assert.equal(analytics.menuItems[0].recipeCost, null);
  assert.equal(analytics.menuItems[0].costPercent, null);
  assert.equal(analytics.menuItems[0].unitGrossProfit, null);
  assert.equal(analytics.economics.costOfGoods, null);
  assert.equal(analytics.economics.grossMargin, null);
});

test("purchase need uses confirmed recipe, explicit plan, normalized stock and supplier package", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      stockBalances: [{
        key: "product:whisky",
        current: 200,
        safety: 100,
        onOrder: 0,
        unit: "ml",
        averageUnitCost: 1,
        currency: "RUB",
      }],
    }),
    purchaseDocuments: [purchase()],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const need = analytics.needs.rows[0];

  assert.equal(need.projectedNeed, 500);
  assert.equal(need.shortage, 400);
  assert.equal(need.packageAmount, 1_000);
  assert.equal(need.recommendedAmount, 1_000);
  assert.equal(need.estimatedCost, 1_000);
});

test("venue A documents never affect venue B assortment analytics", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({ stockBalances: [] }),
    purchaseDocuments: [purchase({ venueId: 1 })],
    venueId: 2,
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].recipeCost, null);
  assert.equal(analytics.aiContext.freshness.latestConfirmedPurchaseAt, null);
});

test("current partial month compares only equal elapsed days", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment(),
    purchaseDocuments: [purchase()],
    salesDocuments: [
      { id: "aug", status: "confirmed", date: "2026-08-10", totalRevenue: 1_000, items: [] },
      { id: "jul-in-range", status: "confirmed", date: "2026-07-10", totalRevenue: 800, items: [] },
      { id: "jul-outside", status: "confirmed", date: "2026-07-20", totalRevenue: 4_000, items: [] },
    ],
    period: "2026-08",
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.period.previousEnd, "2026-07-12");
  assert.equal(analytics.economics.comparison?.previousRevenue, 800);
  assert.equal(analytics.economics.comparison?.revenueChangePercent, 25);
});

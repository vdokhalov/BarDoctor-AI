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
      venueId: 1,
      consumptionMode: "RECIPE",
      salePrice: 300,
      currency: "RUB",
      plannedSales: 10,
      active: true,
    }],
    recipes: [{
      id: "recipe-1",
      menuItemId: "whisky-cola",
      ownerId: "whisky-cola",
      venueId: 1,
      status: "confirmed",
      reviewStatus: "approved",
      lifecycleStatus: "current",
      current: true,
      ingredients: [{
        id: "ingredient-1",
        name: "Виски",
        quantity: 50,
        unit: "мл",
        nomenclatureItemId: "nom-whisky",
        purchaseProductKey: "product:whisky",
        venueId: 1,
      }],
    }],
    nomenclature: [{
      id: "nom-whisky",
      productKey: "product:whisky",
      name: "Виски 1 л",
      unit: "ml",
      venueId: 1,
      active: true,
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

  assert.equal(analytics.readiness.requiredChecks, 6);
  assert.equal(analytics.readiness.completedRequiredChecks, 6);
  assert.equal(analytics.summary.readinessPercent, 100);
  assert.equal(analytics.readiness.desirable[0].affectsScore, false);
  assert.match(analytics.readiness.formula, /обязательные проверки/i);
});

test("current recipe cost uses the latest confirmed purchase instead of the inventory average", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment(),
    purchaseDocuments: [purchase()],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];

  assert.equal(item.recipeCost, 50);
  assert.equal(item.costPercent, 16.7);
  assert.equal(item.unitGrossProfit, 250);
  assert.equal(item.ingredientRows[0].source, "latest_confirmed_purchase");
  assert.match(analytics.valuation.currentCostRule, /Последняя подтверждённая/);
});

test("legacy direct-plus-recipe NEEDS_REVIEW does not project an arbitrary recipe cost", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "whisky-cola",
        groupId: "bar",
        department: "bar",
        category: "Коктейли",
        name: "Виски-кола",
        type: "ready",
        venueId: 1,
        readyProduct: {
          nomenclatureItemId: "nom-whisky",
          productKey: "product:whisky",
          packagesPerSale: 1,
        },
        salePrice: 300,
        currency: "RUB",
        active: true,
      }],
    }),
    purchaseDocuments: [purchase()],
    venueId: 1,
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];

  assert.equal(item.consumptionMode, "NEEDS_REVIEW");
  assert.equal(item.consumptionStatus, "NEEDS_REVIEW");
  assert.equal(item.consumptionSource, null);
  assert.deepEqual(item.ingredientRows, []);
  assert.equal(item.recipeCost, null);
  assert.equal(item.recipeCostStatus, "UNKNOWN");
  assert.equal(item.costCurrency, null);
  assert.equal(item.costPercent, null);
  assert.equal(item.unitGrossProfit, null);
  assert.deepEqual(item.costHistory, []);
  assert.deepEqual(item.costDrivers, []);
  assert.equal(item.costChangeBasis, null);
  assert.equal(
    analytics.aiContext.confirmedMenuEconomics.some((candidate) => candidate.id === "whisky-cola"),
    false,
  );
});

test("legacy NONE-plus-recipe NEEDS_REVIEW also keeps current cost unknown", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "whisky-cola",
        groupId: "bar",
        department: "bar",
        category: "Услуги",
        name: "Дегустация",
        type: "service",
        venueId: 1,
        salePrice: 300,
        currency: "RUB",
        active: true,
      }],
    }),
    purchaseDocuments: [purchase()],
    venueId: 1,
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];

  assert.equal(item.consumptionMode, "NEEDS_REVIEW");
  assert.equal(item.consumptionStatus, "NEEDS_REVIEW");
  assert.deepEqual(item.ingredientRows, []);
  assert.equal(item.recipeCost, null);
  assert.equal(item.recipeCostStatus, "UNKNOWN");
  assert.equal(item.costCurrency, null);
  assert.equal(item.costPercent, null);
  assert.equal(item.unitGrossProfit, null);
});

test("linked nomenclature name is shown but a balance average is not used as a purchase price", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "espresso",
        groupId: "bar",
        department: "bar",
        category: "Кофе",
        name: "Эспрессо",
        type: "composite",
        salePrice: 25,
        currency: "PMR_RUB",
        active: true,
      }],
      recipes: [{
        id: "espresso-recipe",
        menuItemId: "espresso",
        status: "confirmed",
        reviewStatus: "approved",
        source: "manual",
        ingredients: [{
          id: "coffee",
          name: "Эспрессо",
          matchedName: "Кофе зерновой",
          quantity: 0.01,
          unit: "кг",
          purchaseProductKey: "product:coffee-beans",
        }],
      }],
      stockBalances: [{
        id: "balance:coffee",
        productKey: "product:coffee-beans",
        name: "Кофе зерновой",
        current: 3_000,
        unit: "g",
        averageUnitCost: 0.34,
        currency: "PMR_RUB",
      }],
    }),
    venueId: 1,
    now: new Date("2026-08-31T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];
  assert.equal(item.ingredientRows[0].name, "Кофе зерновой");
  assert.equal(item.ingredientRows[0].recipeName, "Эспрессо");
  assert.equal(item.ingredientRows[0].source, undefined);
  assert.equal(item.ingredientRows[0].reason, "price");
  assert.equal(item.recipeCost, null);
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
        venueId: 1,
        consumptionMode: "DIRECT_ITEM",
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
    purchaseDocuments: [{
      id: "purchase-cola-125",
      status: "confirmed",
      documentType: "invoice",
      supplierName: "Поставщик",
      date: "2026-08-10",
      currency: "RUB",
      items: [{
        id: "line-cola-125",
        name: "Coca-Cola 1,25 л",
        purchaseProductKey: "product:cola-125",
        quantity: 10,
        unit: "шт.",
        packageSize: "1,25 л",
        lineTotal: 400,
      }],
    }],
    now: new Date("2026-08-12T12:00:00.000Z"),
  });
  const item = analytics.menuItems[0];
  assert.equal(item.portionSize, "1,25 л");
  assert.equal(item.recipeStatus, "not_applicable");
  assert.equal(item.recipeId, null);
  assert.equal(item.techCardSource, null);
  assert.equal(item.consumptionMode, "DIRECT_ITEM");
  assert.equal(item.recipeCost, 40);
  assert.equal(item.status, "ready");
  assert.deepEqual(analytics.saleSizeUnits.map((unit) => unit.code), ["ml", "l", "g", "kg", "pcs"]);
});

test("Köln 1.25 L cola and sprite recover bottle cost from aggregate litre receipts", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [
        {
          id: "sprite-125",
          groupId: "bar",
          department: "bar",
          category: "Безалкогольные напитки",
          name: "Спрайт 1,25л.",
          type: "composite",
          salePrice: 95,
          currency: "PMR_RUB",
          active: true,
          saleSize: { version: 1, quantity: 1.25, unit: "l", baseQuantity: 1250, baseUnit: "ml", status: "confirmed" },
        },
        {
          id: "sprite-05",
          groupId: "bar",
          department: "bar",
          category: "Безалкогольные напитки",
          name: "Спрайт 0,5л.",
          type: "composite",
          salePrice: 45,
          currency: "PMR_RUB",
          active: true,
          saleSize: { version: 1, quantity: 0.5, unit: "l", baseQuantity: 500, baseUnit: "ml", status: "confirmed" },
        },
        {
          id: "cola-125",
          groupId: "bar",
          department: "bar",
          category: "Безалкогольные напитки",
          name: "Кола 1,25л.",
          type: "composite",
          salePrice: 95,
          currency: "PMR_RUB",
          active: true,
          saleSize: { version: 1, quantity: 1.25, unit: "l", baseQuantity: 1250, baseUnit: "ml", status: "confirmed" },
        },
      ],
      recipes: [
        {
          id: "sprite-125-v3",
          menuItemId: "sprite-125",
          status: "confirmed",
          reviewStatus: "approved",
          ingredients: [{
            id: "sprite-125-line",
            name: "Спрайт",
            matchedName: "Спрайт",
            quantity: 1.25,
            unit: "мл",
            normalizedQuantity: 1250,
            normalizedUnit: "ml",
            unitResolutionStatus: "packaging_compatible",
            purchaseProductKey: "stock:спрайт|ml",
          }],
        },
        {
          id: "sprite-05-v3",
          menuItemId: "sprite-05",
          status: "confirmed",
          reviewStatus: "approved",
          ingredients: [{
            id: "sprite-05-line",
            name: "Спрайт",
            matchedName: "Спрайт",
            quantity: 1,
            unit: "шт.",
            normalizedQuantity: 500,
            normalizedUnit: "ml",
            unitResolutionStatus: "packaging_compatible",
            purchaseProductKey: "stock:спрайт|ml",
          }],
        },
        {
          id: "cola-125-v1",
          menuItemId: "cola-125",
          status: "confirmed",
          reviewStatus: "approved",
          ingredients: [{
            id: "cola-125-line",
            name: "Кола",
            matchedName: "Кола",
            quantity: 1.25,
            unit: "мл",
            normalizedQuantity: 1250,
            normalizedUnit: "ml",
            unitResolutionStatus: "packaging_compatible",
            purchaseProductKey: "stock:кола|ml",
          }],
        },
      ],
      nomenclature: [
        { id: "stock:спрайт|ml", productKey: "stock:спрайт|ml", name: "Спрайт", unit: "ml", packageSize: "Несколько фасовок" },
        { id: "stock:кола|ml", productKey: "stock:кола|ml", name: "Кола", unit: "ml", packageSize: "Несколько фасовок" },
      ],
      stockBalances: [],
    }),
    purchaseDocuments: [
      {
        id: "sheriff-372",
        venueId: 1,
        status: "confirmed",
        documentType: "invoice",
        documentNumber: "372",
        supplierName: "Шериф",
        date: "2026-08-01",
        currency: "PMR_RUB",
        items: [
          { id: "sprite-372", name: "Спрайт", purchaseProductKey: "stock:спрайт|ml", quantity: 1.25, unit: "л", lineTotal: 26.5 },
          { id: "cola-372", name: "Кола", purchaseProductKey: "stock:кола|ml", quantity: 15, unit: "л", lineTotal: 324 },
        ],
      },
      {
        id: "vprok-379",
        venueId: 1,
        status: "confirmed",
        documentType: "invoice",
        documentNumber: "379",
        supplierName: "Впрок",
        date: "2026-08-07",
        currency: "PMR_RUB",
        items: [{
          id: "cola-379",
          name: "Кола",
          purchaseProductKey: "stock:кола|ml",
          quantity: 75,
          unit: "л",
          packageSize: "75 л",
          lineTotal: 1780.2,
        }],
      },
      {
        id: "sheriff-391",
        venueId: 1,
        status: "confirmed",
        documentType: "invoice",
        documentNumber: "391",
        supplierName: "Шериф",
        date: "2026-08-22",
        currency: "PMR_RUB",
        items: [{
          id: "sprite-391",
          name: "Спрайт",
          purchaseProductKey: "stock:спрайт|ml",
          quantity: 7.5,
          unit: "л",
          packageSize: "л",
          lineTotal: 153,
        }],
      },
    ],
    venueId: 1,
    now: new Date("2026-09-01T16:30:00.000Z"),
  });

  const sprite125 = analytics.menuItems.find((item) => item.id === "sprite-125")!;
  const sprite05 = analytics.menuItems.find((item) => item.id === "sprite-05")!;
  const cola125 = analytics.menuItems.find((item) => item.id === "cola-125")!;
  assert.equal(sprite125.recipeCost, 25.5, JSON.stringify(sprite125.ingredientRows));
  assert.equal(sprite125.ingredientRows[0].purchaseDocumentNumber, "391");
  assert.equal(sprite125.ingredientRows[0].packageLabel, "1,25 л");
  assert.equal(cola125.recipeCost, 29.67, JSON.stringify(cola125.ingredientRows));
  assert.equal(cola125.ingredientRows[0].purchaseDocumentNumber, "379");
  assert.equal(cola125.ingredientRows[0].packageLabel, "1,25 л");
  assert.equal(sprite05.recipeCost, null);
  assert.equal(sprite05.ingredientRows[0].complete, false);
});

test("Köln Borjomi uses the latest exact 0.5 L receipt after legacy product keys were merged", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "f57b808a-2abc-4332-b0b0-0a39b110d410",
        groupId: "bar",
        department: "bar",
        category: "Безалкогольные напитки",
        name: "Боржоми",
        type: "ready",
        portionSize: "0,5 л",
        salePrice: 69,
        currency: "RUB",
        active: true,
      }],
      recipes: [{
        id: "borjomi-v3",
        menuItemId: "f57b808a-2abc-4332-b0b0-0a39b110d410",
        status: "confirmed",
        reviewStatus: "approved",
        source: "ai",
        version: 3,
        ingredients: [{
          id: "borjomi-line",
          name: "Боржоми",
          matchedName: "Вода Боржоми",
          quantity: 1,
          unit: "шт.",
          packageSize: "1 шт.",
          resolutionStatus: "linked_packaging_review",
          purchaseProductKey: "stock:боржоми|pcs",
          nomenclatureItemId: "stock:боржоми|ml",
        }],
      }],
      nomenclature: [{
        id: "stock:боржоми|ml",
        productKey: "stock:боржоми|ml",
        name: "Вода Боржоми",
        unit: "ml",
        packageSize: "Несколько фасовок",
        packageOptions: ["0,5 л", "л"],
        externalProductKeys: [
          "вода боржоми|л",
          "боржоми 0 5 л|0 5 л",
          "stock:боржоми 0 5 л|ml",
        ],
        mergedFromProductKeys: [
          "вода боржоми|л",
          "боржоми 0 5 л|0 5 л",
          "stock:боржоми 0 5 л|ml",
        ],
      }],
      stockBalances: [{
        key: "stock:боржоми|ml",
        productKey: "stock:боржоми|ml",
        name: "Вода Боржоми",
        unit: "ml",
        current: 8_500,
        averageUnitCost: 0.104,
        currency: "RUB",
        externalProductKeys: ["вода боржоми|л", "боржоми 0 5 л|0 5 л"],
      }],
      inventoryProductAliases: [{ from: "stock:боржоми 0 5 л|ml", to: "stock:боржоми|ml" }],
    }),
    purchaseDocuments: [
      {
        id: "3b4c80ac-70b9-49af-b277-45eee0173e67",
        venueId: 1,
        status: "confirmed",
        documentType: "invoice",
        documentNumber: "372",
        supplierName: "Шериф",
        date: "2026-08-01",
        currency: "RUB",
        items: [{
          id: "4a25213f-4cc4-445e-8d78-e69318779c91",
          purchaseProductKey: "вода боржоми|л",
          name: "Вода Боржоми",
          quantity: 2.5,
          unit: "л",
          unitPrice: 104,
          lineTotal: 260,
        }],
      },
      {
        id: "eee36fe1-b2a6-4b8d-b2ba-4f49dbf37585",
        venueId: 1,
        status: "confirmed",
        documentType: "invoice",
        documentNumber: "379",
        supplierName: "Впрок",
        date: "2026-08-07",
        currency: "RUB",
        items: [{
          id: "d7381076-ca85-4ec3-9d2d-57f45985ae5f",
          name: "Боржоми 0.5 л",
          quantity: 12,
          unit: "шт.",
          unitPrice: 24.65,
          lineTotal: 295.8,
        }],
      },
    ],
    venueId: 1,
    now: new Date("2026-09-01T13:30:00.000Z"),
  });

  const item = analytics.menuItems[0];
  assert.equal(item.recipeCost, 24.65, JSON.stringify(item.ingredientRows));
  assert.equal(item.ingredientRows[0].source, "latest_confirmed_purchase");
  assert.equal(item.ingredientRows[0].supplierName, "Впрок");
  assert.equal(item.ingredientRows[0].purchaseDocumentNumber, "379");
  assert.equal(item.ingredientRows[0].purchasePackageSize, "Боржоми 0.5 л");
  assert.equal(item.ingredientRows[0].purchaseDate, "2026-08-07");
});

test("Sprite 0.5 stays unpriced when the only receipt is the different 1.25 L package", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "sprite-05",
        groupId: "bar",
        department: "bar",
        category: "Безалкогольные напитки",
        name: "Спрайт 0,5 л",
        type: "ready",
        portionSize: "0,5 л",
        salePrice: 55,
        currency: "RUB",
        active: true,
      }],
      recipes: [{
        id: "sprite-05-v3",
        menuItemId: "sprite-05",
        status: "confirmed",
        reviewStatus: "approved",
        ingredients: [{
          id: "sprite-line",
          name: "Спрайт",
          quantity: 1,
          unit: "шт.",
          normalizedQuantity: 500,
          normalizedUnit: "ml",
          unitResolutionStatus: "packaging_compatible",
          purchaseProductKey: "stock:спрайт|ml",
        }],
      }],
      nomenclature: [{
        id: "stock:спрайт|ml",
        productKey: "stock:спрайт|ml",
        name: "Спрайт",
        unit: "ml",
        packageSize: "Несколько фасовок",
        externalProductKeys: ["спрайт|л"],
      }],
      stockBalances: [],
    }),
    purchaseDocuments: [{
      id: "sheriff-372",
      venueId: 1,
      status: "confirmed",
      documentType: "invoice",
      documentNumber: "372",
      supplierName: "Шериф",
      date: "2026-08-01",
      currency: "RUB",
      items: [{
        id: "sprite-125-line",
        purchaseProductKey: "спрайт|л",
        name: "Спрайт",
        quantity: 1.25,
        unit: "л",
        unitPrice: 21.2,
        lineTotal: 26.5,
      }],
    }],
    venueId: 1,
    now: new Date("2026-09-01T13:30:00.000Z"),
  });

  assert.equal(analytics.menuItems[0].recipeCost, null);
  assert.equal(analytics.menuItems[0].ingredientRows[0].reason, "unit_resolution");
  assert.equal(analytics.menuItems[0].ingredientRows[0].purchaseDocumentNumber, undefined);
});

test("single-package unit tech cards cost cola and sprite per sold bottle", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [
        {
          id: "cola-05",
          groupId: "bar",
          department: "bar",
          category: "Безалкогольные напитки",
          name: "Кола 0,5 л",
          type: "composite",
          salePrice: 50,
          currency: "PMR_RUB",
          active: true,
        },
        {
          id: "sprite-05",
          groupId: "bar",
          department: "bar",
          category: "Безалкогольные напитки",
          name: "Спрайт 0,5 л",
          type: "composite",
          salePrice: 50,
          currency: "PMR_RUB",
          active: true,
        },
      ],
      recipes: [
        {
          id: "recipe-cola-05",
          menuItemId: "cola-05",
          status: "confirmed",
          reviewStatus: "approved",
          ingredients: [{
            id: "ingredient-cola-05",
            name: "Кола 0,5 л",
            quantity: 1,
            unit: "шт.",
            nomenclatureItemId: "nom-cola-05",
          }],
        },
        {
          id: "recipe-sprite-05",
          menuItemId: "sprite-05",
          status: "confirmed",
          reviewStatus: "approved",
          ingredients: [{
            id: "ingredient-sprite-05",
            name: "Спрайт 0,5 л",
            quantity: 1,
            unit: "шт.",
            purchaseProductKey: "legacy:sprite-05",
          }],
        },
      ],
      nomenclature: [
        {
          id: "nom-cola-05",
          key: "stock:cola-05",
          productKey: "stock:cola-05",
          name: "Кола 0,5 л",
          unit: "ml",
          packageSize: "0,5 л",
          active: true,
        },
        {
          id: "nom-sprite-05",
          key: "stock:sprite-05",
          productKey: "stock:sprite-05",
          name: "Спрайт 0,5 л",
          unit: "ml",
          packageSize: "0,5 л",
          active: true,
        },
      ],
      stockBalances: [],
      inventoryProductAliases: [{ from: "legacy:sprite-05", to: "stock:sprite-05" }],
      supplierProductMappings: [{
        canonicalProductKey: "stock:sprite-05",
        purchaseLineIds: ["purchase-line-sprite-05"],
      }],
    }),
    purchaseDocuments: [{
      id: "purchase-soft-drinks",
      venueId: 1,
      status: "confirmed",
      documentType: "invoice",
      supplierId: "supplier-soft-drinks",
      supplierName: "Поставщик",
      date: "2026-08-31",
      currency: "PMR_RUB",
      items: [
        {
          id: "purchase-line-cola-05",
          name: "Кола 0,5 л",
          nomenclatureId: "nom-cola-05",
          quantity: 10,
          unit: "шт.",
          packageSize: "0,5 л",
          lineTotal: 200,
        },
        {
          id: "purchase-line-sprite-05",
          name: "Спрайт 0,5 л",
          quantity: 10,
          unit: "шт.",
          packageSize: "0,5 л",
          lineTotal: 180,
        },
      ],
    }],
    venueId: 1,
    now: new Date("2026-09-01T06:00:00.000Z"),
  });

  const cola = analytics.menuItems.find((item) => item.id === "cola-05")!;
  const sprite = analytics.menuItems.find((item) => item.id === "sprite-05")!;
  assert.equal(cola.ingredientRows[0].unit, "ml");
  assert.equal(cola.ingredientRows[0].amount, 500);
  assert.equal(cola.recipeCost, 20);
  assert.equal(sprite.ingredientRows[0].unit, "ml");
  assert.equal(sprite.ingredientRows[0].amount, 500);
  assert.equal(sprite.recipeCost, 18);
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

test("explicit NONE has known-zero current inventory cost without fabricating historical COGS", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      menuItems: [{
        id: "service-fee",
        groupId: "bar",
        department: "bar",
        category: "Сервис",
        name: "Сервисный сбор",
        type: "service",
        venueId: 1,
        consumptionMode: "NONE",
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
  assert.equal(analytics.menuItems[0].recipeCost, 0);
  assert.equal(analytics.menuItems[0].recipeCostStatus, "KNOWN_ZERO");
  assert.equal(analytics.menuItems[0].costPercent, 0);
  assert.equal(analytics.menuItems[0].unitGrossProfit, 100);
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

  assert.equal(analytics.summary.menuItems, 0);
  assert.deepEqual(analytics.menuItems, []);
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

function costingReceipt(input: {
  id: string;
  productKey: string;
  amount: number;
  costAmount: number;
  unit: "ml" | "g" | "pcs";
}) {
  return {
    ...input,
    venueId: 1,
    type: "receipt",
    status: "active",
    date: "2026-08-10",
    businessDate: "2026-08-10",
    costStatus: "KNOWN",
    currency: "RUB",
    sourceDocumentId: `purchase:${input.id}`,
    sourceLineId: `line:${input.id}`,
    createdAt: "2026-08-10T12:00:00.000Z",
  };
}

test("explicit RECIPE costing cannot be redirected by an alias shadowing its product key", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: assortment({
      inventoryProductAliases: [{ from: "product:whisky", to: "product:decoy" }],
      nomenclature: [
        { id: "nom-whisky", productKey: "product:whisky", name: "Виски", unit: "ml", venueId: 1, active: true },
        { id: "nom-decoy", productKey: "product:decoy", name: "Чужая стоимость", unit: "ml", venueId: 1, active: true },
      ],
      stockBalances: [
        { id: "balance-whisky", nomenclatureItemId: "nom-whisky", productKey: "product:whisky", name: "Виски", current: 2_000, unit: "ml", venueId: 1, currency: "RUB" },
        { id: "balance-decoy", nomenclatureItemId: "nom-decoy", productKey: "product:decoy", name: "Чужая стоимость", current: 2_000, unit: "ml", venueId: 1, currency: "RUB" },
      ],
    }),
    purchaseDocuments: [],
    stockMovements: [
      costingReceipt({ id: "whisky", productKey: "product:whisky", amount: 1_000, costAmount: 1_000, unit: "ml" }),
      costingReceipt({ id: "decoy", productKey: "product:decoy", amount: 1_000, costAmount: 9_000, unit: "ml" }),
    ],
    venueId: 1,
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  const item = analytics.menuItems[0];
  assert.equal(item.consumptionMode, "RECIPE");
  assert.equal(item.ingredientRows[0].productKey, "product:whisky");
  assert.equal(item.ingredientRows[0].cost, 50);
  assert.equal(item.ingredientRows[0].purchaseDocumentId, "purchase:whisky");
  assert.equal(item.recipeCost, 50);
  assert.equal(
    analytics.nomenclatureCosts.find((row) => row.nomenclatureItemId === "nom-whisky")?.productKey,
    "product:whisky",
  );
});

test("explicit DIRECT_ITEM and FIXED_QUANTITY costing keep their exact ID target under a shadow alias", () => {
  const cases = [
    {
      mode: "DIRECT_ITEM",
      unit: "pcs" as const,
      menu: {
        id: "menu-item",
        name: "Готовый товар",
        type: "ready",
        venueId: 1,
        active: true,
        consumptionMode: "DIRECT_ITEM",
        readyProduct: { nomenclatureItemId: "nom-item", productKey: "stock-item", packagesPerSale: 1 },
        salePrice: 100,
        currency: "RUB",
      },
      receiptAmount: 10,
      receiptCost: 20,
      expectedCost: 2,
    },
    {
      mode: "FIXED_QUANTITY",
      unit: "ml" as const,
      menu: {
        id: "menu-item",
        name: "Порция товара",
        type: "ready",
        venueId: 1,
        active: true,
        consumptionMode: "FIXED_QUANTITY",
        readyProduct: { nomenclatureItemId: "nom-item", productKey: "stock-item", packagesPerSale: 1 },
        saleSize: { quantity: 0.05, unit: "l" },
        salePrice: 100,
        currency: "RUB",
      },
      receiptAmount: 1_000,
      receiptCost: 100,
      expectedCost: 5,
    },
  ];

  for (const candidate of cases) {
    const analytics = buildAssortmentAnalytics({
      assortment: {
        menuItems: [candidate.menu],
        recipes: [],
        inventoryProductAliases: [{ from: "stock-item", to: "stock-decoy" }],
        nomenclature: [
          { id: "nom-item", productKey: "stock-item", name: "Точный товар", unit: candidate.unit, venueId: 1, active: true },
          { id: "nom-decoy", productKey: "stock-decoy", name: "Чужая стоимость", unit: candidate.unit, venueId: 1, active: true },
        ],
        stockBalances: [
          { id: "balance-item", nomenclatureItemId: "nom-item", productKey: "stock-item", name: "Точный товар", current: candidate.receiptAmount, unit: candidate.unit, venueId: 1, currency: "RUB" },
          { id: "balance-decoy", nomenclatureItemId: "nom-decoy", productKey: "stock-decoy", name: "Чужая стоимость", current: candidate.receiptAmount, unit: candidate.unit, venueId: 1, currency: "RUB" },
        ],
      },
      purchaseDocuments: [],
      stockMovements: [
        costingReceipt({ id: "item", productKey: "stock-item", amount: candidate.receiptAmount, costAmount: candidate.receiptCost, unit: candidate.unit }),
        costingReceipt({ id: "decoy", productKey: "stock-decoy", amount: candidate.receiptAmount, costAmount: candidate.receiptCost * 9, unit: candidate.unit }),
      ],
      venueId: 1,
      now: new Date("2026-08-12T12:00:00.000Z"),
    });

    const item = analytics.menuItems[0];
    assert.equal(item.consumptionMode, candidate.mode);
    assert.equal(item.ingredientRows[0].productKey, "stock-item");
    assert.equal(item.ingredientRows[0].cost, candidate.expectedCost);
    assert.equal(item.ingredientRows[0].purchaseDocumentId, "purchase:item");
    assert.equal(item.recipeCost, candidate.expectedCost);
  }
});

test("analytics scopes same menu, recipe, nomenclature IDs and product keys to the requested venue", () => {
  const analytics = buildAssortmentAnalytics({
    assortment: {
      menuItems: [
        {
          id: "shared-menu",
          name: "Foreign espresso",
          venueId: 2,
          active: true,
          consumptionMode: "NONE",
          salePrice: 999,
          currency: "RUB",
        },
        {
          id: "shared-menu",
          name: "Local espresso",
          venueId: 1,
          active: true,
          consumptionMode: "RECIPE",
          salePrice: 100,
          currency: "RUB",
        },
      ],
      recipes: [
        {
          id: "shared-recipe",
          menuItemId: "shared-menu",
          ownerId: "shared-menu",
          venueId: 2,
          status: "confirmed",
          reviewStatus: "approved",
          current: true,
          ingredients: [{
            id: "shared-line",
            nomenclatureItemId: "shared-nom",
            purchaseProductKey: "shared-product",
            name: "Foreign beans",
            quantity: 100,
            unit: "g",
            venueId: 2,
          }],
        },
        {
          id: "shared-recipe",
          menuItemId: "shared-menu",
          ownerId: "shared-menu",
          venueId: 1,
          status: "confirmed",
          reviewStatus: "approved",
          current: true,
          ingredients: [{
            id: "shared-line",
            nomenclatureItemId: "shared-nom",
            purchaseProductKey: "shared-product",
            name: "Local beans",
            quantity: 8,
            unit: "g",
            venueId: 1,
          }],
        },
      ],
      nomenclature: [
        { id: "shared-nom", productKey: "shared-product", name: "Foreign beans", unit: "g", venueId: 2, active: true },
        { id: "shared-nom", productKey: "shared-product", name: "Local beans", unit: "g", venueId: 1, active: true },
      ],
      stockBalances: [
        { id: "foreign-balance", nomenclatureItemId: "shared-nom", productKey: "shared-product", name: "Foreign beans", unit: "g", current: 1_000, venueId: 2, currency: "RUB" },
        { id: "local-balance", nomenclatureItemId: "shared-nom", productKey: "shared-product", name: "Local beans", unit: "g", current: 1_000, venueId: 1, currency: "RUB" },
      ],
    },
    stockMovements: [
      {
        id: "foreign-receipt", venueId: 2, type: "receipt", status: "active", date: "2026-08-10",
        productKey: "shared-product", productName: "Foreign beans", amount: 1_000, unit: "g", costAmount: 10_000,
        costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "foreign-purchase", sourceLineId: "foreign-line",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
      {
        id: "local-receipt", venueId: 1, type: "receipt", status: "active", date: "2026-08-10",
        productKey: "shared-product", productName: "Local beans", amount: 1_000, unit: "g", costAmount: 100,
        costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "local-purchase", sourceLineId: "local-line",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
    ],
    venueId: 1,
    now: new Date("2026-08-12T12:00:00.000Z"),
  });

  assert.equal(analytics.summary.menuItems, 1);
  assert.equal(analytics.menuItems[0]?.name, "Local espresso");
  assert.equal(analytics.menuItems[0]?.recipeId, "shared-recipe");
  assert.equal(analytics.menuItems[0]?.consumptionStatus, "CONFIGURED");
  assert.equal(analytics.menuItems[0]?.ingredientRows[0]?.name, "Local beans");
  assert.equal(analytics.menuItems[0]?.ingredientRows[0]?.amount, 8);
  assert.equal(analytics.menuItems[0]?.recipeCost, 0.8);
});

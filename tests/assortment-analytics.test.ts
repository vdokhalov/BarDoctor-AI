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
  assert.equal(item.recipeStatus, "confirmed");
  assert.equal(item.techCardSource, "ready_product");
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

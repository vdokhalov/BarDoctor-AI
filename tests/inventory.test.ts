import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInventoryCount,
  applyPurchaseToInventory,
  applySalesToInventory,
  inventoryPackageAmount,
  purchaseLineBaseAmount,
  repairInventoryBalanceMetadata,
  removePurchaseFromInventory,
  revisePurchaseInInventory,
  updateInventoryProductDefinition,
} from "../lib/bardoctor/inventory";

test("inventory count replaces calculated balance and records only the difference", () => {
  const assortment = {
    stockBalances: [{
      key: "cola|0 5 л",
      productKey: "cola|0 5 л",
      name: "Coca-Cola 0.5",
      packageSize: "0.5 л",
      packageAmount: 500,
      unit: "ml",
      current: 6_000,
      averageUnitCost: 0.04,
      inventoryValue: 240,
      currency: "MDL",
    }],
  };

  const result = applyInventoryCount({
    assortment,
    snapshot: {
      id: "count-1",
      date: "2026-08-09",
      items: [{
        id: "line-1",
        productKey: "cola|0 5 л",
        actual: 5_500,
        section: "Бар",
      }],
    },
    now: "2026-08-09T10:00:00.000Z",
  });

  assert.equal((result.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 5_500);
  assert.equal((result.assortment.stockBalances as Array<Record<string, unknown>>)[0].inventoryValue, 220);
  assert.equal(result.movements.length, 1);
  assert.equal(result.movements[0].type, "inventory_adjustment");
  assert.equal(result.movements[0].amount, -500);
  assert.equal(result.movements[0].costAmount, -20);
  assert.equal(result.sections["Бар"], 220);
  assert.deepEqual(result.summary, {
    countedLines: 1,
    changedLines: 1,
    expectedValue: 240,
    actualValue: 220,
    differenceValue: -20,
    unresolvedLines: [],
  });
});

test("inventory count does not invent unknown warehouse products", () => {
  const result = applyInventoryCount({
    assortment: { stockBalances: [] },
    snapshot: {
      id: "count-2",
      date: "2026-08-09",
      items: [{ productKey: "unknown", productName: "Неизвестный товар", actual: 3 }],
    },
  });

  assert.equal(result.items.length, 0);
  assert.equal(result.movements.length, 0);
  assert.equal(result.summary.unresolvedLines.length, 1);
});

test("package parsing handles cases and base units", () => {
  assert.deepEqual(inventoryPackageAmount("12 x 0,5 л", "шт."), { amount: 6_000, unit: "ml" });
  assert.deepEqual(inventoryPackageAmount("750 мл", "шт."), { amount: 750, unit: "ml" });
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 3, packageSize: "1 кг", unit: "уп." }), {
    amount: 3_000,
    unit: "g",
  });
});

test("confirmed purchase increases stock, recalculates cost and links exact recipe ingredient", () => {
  const result = applyPurchaseToInventory({
    assortment: {
      menuItems: [{ id: "cola-menu", name: "Кола", active: true }],
      recipes: [{
        id: "recipe-1",
        menuItemId: "cola-menu",
        status: "confirmed",
        ingredients: [{ id: "ingredient-1", name: "Coca-Cola", quantity: 250, unit: "мл" }],
      }],
      stockBalances: [{
        key: "coca cola|1 л",
        current: 2_000,
        unit: "ml",
        averageUnitCost: 0.02,
        currency: "MDL",
      }],
    },
    document: {
      id: "purchase-1",
      date: "2026-08-08",
      currency: "MDL",
      items: [{
        id: "line-1",
        name: "Coca-Cola",
        quantity: 3,
        unit: "шт.",
        packageSize: "1 л",
        unitPrice: 18,
        lineTotal: 54,
      }],
    },
    now: "2026-08-08T20:00:00.000Z",
  });

  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 5_000);
  assert.equal(balance.averageUnitCost, 0.0188);
  assert.equal(balance.inventoryValue, 94);
  assert.equal(result.movements[0].amount, 3_000);
  assert.equal(result.summary.postedLines, 1);
  assert.equal(result.summary.linkedIngredients, 1);
  const recipe = (result.assortment.recipes as Array<Record<string, unknown>>)[0];
  const ingredient = (recipe.ingredients as Array<Record<string, unknown>>)[0];
  assert.equal(ingredient.purchaseProductKey, "coca cola|1 л");
});

test("sales report consumes confirmed recipe without fabricating unmatched rows", () => {
  const assortment = {
    menuItems: [
      { id: "whisky-cola", name: "Виски-кола", active: true },
      { id: "draft-drink", name: "Черновой напиток", active: true },
    ],
    recipes: [{
      id: "recipe-1",
      menuItemId: "whisky-cola",
      status: "confirmed",
      ingredients: [
        { id: "i1", name: "Виски", quantity: 50, unit: "мл", purchaseProductKey: "whisky|1 л" },
        { id: "i2", name: "Кола", quantity: 150, unit: "мл", purchaseProductKey: "cola|1 л" },
      ],
    }],
    stockBalances: [
      { key: "whisky|1 л", current: 3_000, unit: "ml", averageUnitCost: 0.3, currency: "MDL" },
      { key: "cola|1 л", current: 10_000, unit: "ml", averageUnitCost: 0.02, currency: "MDL" },
    ],
  };
  const result = applySalesToInventory({
    assortment,
    salesDocument: {
      id: "sales-1",
      date: "2026-08-08",
      items: [
        { id: "sale-1", name: "Виски-кола", quantity: 4 },
        { id: "sale-2", name: "Неизвестный коктейль", quantity: 2 },
      ],
    },
    now: "2026-08-08T23:00:00.000Z",
  });

  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.find((item) => item.key === "whisky|1 л")?.current, 2_800);
  assert.equal(balances.find((item) => item.key === "cola|1 л")?.current, 9_400);
  assert.equal(result.summary.matchedSalesLines, 1);
  assert.equal(result.summary.soldPortions, 4);
  assert.equal(result.summary.unresolvedLines.length, 1);
  assert.equal(result.movements.length, 2);
});

test("a partially linked recipe never creates a partial stock deduction", () => {
  const result = applySalesToInventory({
    assortment: {
      menuItems: [{ id: "cocktail", name: "Коктейль", active: true }],
      recipes: [{
        id: "recipe",
        menuItemId: "cocktail",
        status: "confirmed",
        ingredients: [
          { id: "linked", name: "Ром", quantity: 50, unit: "мл", purchaseProductKey: "rum|1 l" },
          { id: "unlinked", name: "Сироп", quantity: 20, unit: "мл" },
        ],
      }],
      stockBalances: [{ key: "rum|1 l", current: 1_000, unit: "ml" }],
    },
    salesDocument: {
      id: "sales-partial",
      date: "2026-08-08",
      items: [{ id: "sale", name: "Коктейль", quantity: 2 }],
    },
  });

  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 1_000);
  assert.equal(result.movements.length, 0);
  assert.equal(result.summary.matchedSalesLines, 0);
  assert.match(result.summary.unresolvedLines[0].reason, /Сироп/);
});

test("an open purchase can be corrected without duplicating its stock receipt", () => {
  const previousDocument = {
    id: "purchase-edit-1",
    date: "2026-08-08",
    currency: "MDL",
    confirmedAt: "2026-08-08T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Coca-Cola",
      quantity: 2,
      unit: "шт.",
      packageSize: "1 л",
      unitPrice: 20,
      lineTotal: 40,
    }],
  };
  const posted = applyPurchaseToInventory({
    assortment: { stockBalances: [], recipes: [], menuItems: [] },
    document: previousDocument,
    now: previousDocument.confirmedAt,
  });
  const revised = revisePurchaseInInventory({
    assortment: posted.assortment,
    previousDocument,
    nextDocument: {
      ...previousDocument,
      items: [{
        ...previousDocument.items[0],
        quantity: 3,
        unitPrice: 18,
        lineTotal: 54,
      }],
    },
    stockMovements: posted.movements,
    now: "2026-08-08T12:10:00.000Z",
  });

  assert.equal(revised.ok, true);
  if (!revised.ok) return;
  const balance = (revised.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 3_000);
  assert.equal(balance.inventoryValue, 54);
  assert.equal(revised.movements.length, 2);
  assert.equal(revised.movements[0].amount, 3_000);
  assert.equal(revised.movements[0].status, "active");
  assert.equal(revised.movements[1].amount, 2_000);
  assert.equal(revised.movements[1].status, "cancelled");
  assert.equal(revised.movements[1].reversedAt, "2026-08-08T12:10:00.000Z");
});

test("purchase correction is blocked after linked stock has been sold", () => {
  const previousDocument = {
    id: "purchase-edit-2",
    date: "2026-08-08",
    currency: "MDL",
    confirmedAt: "2026-08-08T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Coca-Cola",
      quantity: 2,
      unit: "шт.",
      packageSize: "1 л",
      unitPrice: 20,
      lineTotal: 40,
    }],
  };
  const posted = applyPurchaseToInventory({
    assortment: { stockBalances: [], recipes: [], menuItems: [] },
    document: previousDocument,
    now: previousDocument.confirmedAt,
  });
  const revised = revisePurchaseInInventory({
    assortment: posted.assortment,
    previousDocument,
    nextDocument: {
      ...previousDocument,
      items: [{ ...previousDocument.items[0], unitPrice: 18, lineTotal: 36 }],
    },
    stockMovements: [{
      id: "sale-movement",
      type: "sale",
      date: "2026-08-08",
      productKey: "coca cola|1 л",
      productName: "Coca-Cola",
      amount: -250,
      unit: "ml",
      sourceDocumentId: "sale-1",
      sourceLineId: "sale-line-1",
      createdAt: "2026-08-08T13:00:00.000Z",
    }, ...posted.movements],
  });

  assert.equal(revised.ok, false);
  if (revised.ok) return;
  assert.equal(revised.code, "PURCHASE_HAS_LATER_SALES");
});

test("purchase correction is blocked after a later inventory movement", () => {
  const previousDocument = {
    id: "purchase-edit-after-count",
    date: "2026-08-08",
    currency: "MDL",
    confirmedAt: "2026-08-08T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Coca-Cola",
      quantity: 2,
      unit: "шт.",
      packageSize: "1 л",
      unitPrice: 20,
      lineTotal: 40,
    }],
  };
  const posted = applyPurchaseToInventory({
    assortment: { stockBalances: [], recipes: [], menuItems: [] },
    document: previousDocument,
    now: previousDocument.confirmedAt,
  });
  const revised = revisePurchaseInInventory({
    assortment: posted.assortment,
    previousDocument,
    nextDocument: {
      ...previousDocument,
      items: [{ ...previousDocument.items[0], unitPrice: 18, lineTotal: 36 }],
    },
    stockMovements: [{
      id: "count-movement",
      type: "inventory_adjustment",
      date: "2026-08-08",
      productKey: "coca cola|1 л",
      productName: "Coca-Cola",
      amount: 0,
      unit: "ml",
      sourceDocumentId: "count-1",
      sourceLineId: "count-line-1",
      createdAt: "2026-08-08T13:00:00.000Z",
    }, ...posted.movements],
  });

  assert.equal(revised.ok, false);
  if (revised.ok) return;
  assert.equal(revised.code, "PURCHASE_HAS_LATER_MOVEMENTS");
});

test("cancelling an untouched purchase reverses inventory and preserves receipt history", () => {
  const document = {
    id: "purchase-delete-1",
    date: "2026-08-08",
    currency: "MDL",
    confirmedAt: "2026-08-08T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Coca-Cola",
      quantity: 2,
      unit: "шт.",
      packageSize: "1 л",
      unitPrice: 20,
      lineTotal: 40,
    }],
  };
  const posted = applyPurchaseToInventory({
    assortment: { stockBalances: [], recipes: [], menuItems: [] },
    document,
    now: document.confirmedAt,
  });
  const removed = removePurchaseFromInventory({
    assortment: posted.assortment,
    document,
    stockMovements: posted.movements,
    now: "2026-08-08T12:15:00.000Z",
  });

  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  const balance = (removed.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 0);
  assert.equal(balance.inventoryValue, 0);
  assert.equal(removed.movements.length, 1);
  assert.equal(removed.movements[0].status, "cancelled");
  assert.equal(removed.movements[0].sourceDocumentId, "purchase-delete-1");
  assert.equal(removed.movements[0].reversedAt, "2026-08-08T12:15:00.000Z");
});

test("deleting a purchase is blocked after a later inventory movement", () => {
  const document = {
    id: "purchase-delete-2",
    date: "2026-08-08",
    currency: "MDL",
    confirmedAt: "2026-08-08T12:00:00.000Z",
    items: [{
      id: "line-1",
      name: "Coca-Cola",
      quantity: 2,
      unit: "шт.",
      packageSize: "1 л",
      unitPrice: 20,
      lineTotal: 40,
    }],
  };
  const posted = applyPurchaseToInventory({
    assortment: { stockBalances: [], recipes: [], menuItems: [] },
    document,
    now: document.confirmedAt,
  });
  const removed = removePurchaseFromInventory({
    assortment: posted.assortment,
    document,
    stockMovements: [{
      id: "inventory-movement",
      type: "inventory_adjustment",
      date: "2026-08-09",
      productKey: "coca cola|1 л",
      productName: "Coca-Cola",
      amount: -100,
      unit: "ml",
      sourceDocumentId: "count-1",
      sourceLineId: "count-line-1",
      createdAt: "2026-08-09T10:00:00.000Z",
    }, ...posted.movements],
  });

  assert.equal(removed.ok, false);
  if (removed.ok) return;
  assert.equal(removed.code, "PURCHASE_HAS_LATER_MOVEMENTS");
});

test("warehouse metadata repair restores recipe ingredient names and removes empty orphans", () => {
  const repaired = repairInventoryBalanceMetadata({
    assortment: {
      recipes: [{
        id: "recipe-1",
        status: "confirmed",
        ingredients: [{ id: "ingredient-1", name: "Лайм", quantity: 20, unit: "г" }],
      }],
      stockBalances: [
        {
          key: "manual:лайм|g",
          current: 0,
          unit: "g",
          inventoryValue: 0,
        },
        {
          key: "legacy-empty",
          name: "Товар",
          current: 0,
          unit: "pcs",
          inventoryValue: 0,
        },
      ],
    },
    stockMovements: [],
    now: "2026-08-09T14:00:00.000Z",
  });

  const balances = repaired.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(repaired.summary.repaired, 1);
  assert.equal(repaired.summary.removed, 1);
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Лайм");
  assert.equal(balances[0].productKey, "manual:лайм|g");
  assert.equal(balances[0].linkedRecipeCount, 1);
});

test("warehouse product editor updates a zero linked item without breaking its recipe identity", () => {
  const result = updateInventoryProductDefinition({
    assortment: {
      recipes: [{
        id: "recipe-1",
        status: "confirmed",
        ingredients: [{ id: "ingredient-1", name: "Сироп", quantity: 20, unit: "шт." }],
      }],
      stockBalances: [{
        key: "manual:сироп|pcs",
        name: "Товар",
        current: 0,
        unit: "pcs",
        inventoryValue: 0,
      }],
    },
    stockMovements: [],
    update: {
      productKey: "manual:сироп|pcs",
      name: "Сироп сахарный",
      unit: "ml",
      packageSize: "1 л",
    },
    now: "2026-08-09T14:05:00.000Z",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.product.name, "Сироп сахарный");
  assert.equal(result.product.unit, "ml");
  assert.equal(result.product.packageAmount, 1_000);
  const ingredient = (result.assortment.recipes as Array<Record<string, unknown>>)[0]
    .ingredients as Array<Record<string, unknown>>;
  assert.equal(ingredient[0].purchaseProductKey, "manual:сироп|pcs");
  assert.equal(ingredient[0].unit, "мл");
});

test("warehouse metadata repair keeps an ambiguous linked balance for manual review", () => {
  const repaired = repairInventoryBalanceMetadata({
    assortment: {
      recipes: [
        { id: "r1", ingredients: [{ name: "Лайм", quantity: 10, unit: "г", purchaseProductKey: "shared" }] },
        { id: "r2", ingredients: [{ name: "Лимон", quantity: 10, unit: "г", purchaseProductKey: "shared" }] },
      ],
      stockBalances: [{ key: "shared", name: "Товар", current: 0, unit: "g", inventoryValue: 0 }],
    },
    stockMovements: [],
  });

  const balances = repaired.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(repaired.summary.removed, 0);
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Товар");
});

test("warehouse product editor blocks a base-unit change after stock movements", () => {
  const result = updateInventoryProductDefinition({
    assortment: {
      recipes: [],
      stockBalances: [{
        key: "cola|0 5 л",
        productKey: "cola|0 5 л",
        name: "Coca-Cola",
        current: 0,
        unit: "ml",
        packageSize: "0,5 л",
        packageAmount: 500,
        inventoryValue: 0,
      }],
    },
    stockMovements: [{
      id: "receipt-1",
      productKey: "cola|0 5 л",
      sourceDocumentId: "invoice-1",
    }],
    update: {
      productKey: "cola|0 5 л",
      name: "Coca-Cola",
      unit: "pcs",
      packageSize: "1 шт.",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "UNIT_CHANGE_LOCKED");
});

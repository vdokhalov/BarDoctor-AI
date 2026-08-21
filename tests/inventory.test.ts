import assert from "node:assert/strict";
import test from "node:test";
import {
  applyInventoryCount,
  applyPurchaseToInventory,
  applySalesToInventory,
  archiveInventoryProduct,
  consolidateInventoryDuplicates,
  inventoryPackageAmount,
  inventoryProductKey,
  purchaseLineBaseAmount,
  repairInventoryBalanceMetadata,
  repairInventoryPurchaseAmounts,
  resolveInventoryProductKey,
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
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 20, packageSize: "0,5 л", unit: "шт." }), {
    amount: 10_000,
    unit: "ml",
  });
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 10, packageSize: "10 л", unit: "л" }), {
    amount: 10_000,
    unit: "ml",
  });
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 10, packageSize: "10 л", unit: "л", quantityMode: "count" }), {
    amount: 10_000,
    unit: "ml",
  });
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 1.5, packageSize: "1,5 л", unit: "л" }), {
    amount: 1_500,
    unit: "ml",
  });
  assert.deepEqual(purchaseLineBaseAmount({ quantity: 0.15, packageSize: "1 кг", unit: "кг" }), {
    amount: 150,
    unit: "g",
  });
});

test("legacy dimensional receipts are repaired once without changing their value", () => {
  const input = {
    assortment: {
      stockBalances: [{
        key: "stock:коньяк нистру|ml",
        productKey: "stock:коньяк нистру|ml",
        name: "Коньяк Нистру",
        unit: "ml",
        current: 100_000,
        inventoryValue: 2_377,
        averageUnitCost: 0.02377,
      }],
    },
    purchaseDocuments: [{
      id: "invoice-1",
      status: "confirmed",
      items: [{ id: "line-1", name: "Коньяк Нистру", quantity: 10, unit: "л", packageSize: "10 л" }],
    }],
    stockMovements: [{
      id: "movement-1",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-1",
      sourceLineId: "line-1",
      productKey: "stock:коньяк нистру|ml",
      amount: 100_000,
      unit: "ml",
    }],
    now: "2026-08-21T10:00:00.000Z",
  };
  const repaired = repairInventoryPurchaseAmounts(input);
  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.repairedMovements, 1);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
  assert.equal(balance.averageUnitCost, 0.2377);

  const repeated = repairInventoryPurchaseAmounts({
    ...input,
    assortment: repaired.assortment,
    stockMovements: repaired.stockMovements,
  });
  assert.equal(repeated.summary.changed, false);
  assert.equal(repeated.stockMovements[0].amount, 10_000);
});

test("normalized legacy Nistru receipt is still corrected from 100 to 10 liters", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
    }] },
    purchaseDocuments: [{
      id: "invoice-nistru",
      status: "confirmed",
      items: [{
        id: "nistru-line",
        name: "Коньяк Нистру",
        category: "alcohol",
        quantity: 10,
        unit: "л",
        quantityMode: "measure",
        packageSize: "10 л",
      }],
    }],
    stockMovements: [{
      id: "nistru-receipt",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-nistru",
      sourceLineId: "nistru-line",
      productKey: "stock:коньяк нистру|ml",
      amount: 100_000,
      unit: "ml",
    }],
  });
  assert.equal(repaired.summary.repairedMovements, 1);
  assert.equal(repaired.summary.restoredMovements, 0);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal((repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
});

test("an already-corrected receipt also reconciles its stale inflated balance", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      source: "purchase",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      averageUnitCost: 0.02377,
      lastDocumentId: "invoice-already-fixed",
    }] },
    purchaseDocuments: [{
      id: "invoice-already-fixed",
      status: "confirmed",
      items: [{
        id: "line-already-fixed",
        name: "Коньяк Нистру",
        category: "alcohol",
        quantity: 10,
        unit: "л",
        quantityMode: "measure",
        packageSize: "0,5 л",
        lineTotal: 2_377,
      }],
    }],
    stockMovements: [{
      id: "receipt-already-fixed",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-already-fixed",
      sourceLineId: "line-already-fixed",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
    }],
    now: "2026-08-21T10:30:00.000Z",
  });
  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.repairedMovements, 0);
  assert.equal(repaired.summary.reconciledBalances, 1);
  assert.equal(repaired.summary.changed, true);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
  assert.equal(balance.averageUnitCost, 0.2377);
});

test("a legacy-stock balance is reconciled from the confirmed purchase line value", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      source: "legacy-stock",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      averageUnitCost: 0.02377,
      lastPurchasePrice: 118.85,
      lastDocumentId: "invoice-real-shape",
      externalProductKeys: ["коньяк k v nistru conus|0 5 л"],
      mergedFromProductKeys: ["коньяк k v nistru conus|0 5 л", "stock:коньяк нистру|ml"],
    }] },
    purchaseDocuments: [{
      id: "invoice-real-shape",
      status: "draft",
      confirmedAt: "2026-08-09T08:06:26.356Z",
      items: [{
        id: "line-real-shape",
        name: "Коньяк K.V. NISTRU CONUS",
        category: "alcohol",
        quantity: 20,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 118.85,
        lineTotal: 2_377,
      }],
    }],
    stockMovements: [{
      id: "receipt-real-shape",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-real-shape",
      sourceLineId: "line-real-shape",
      productKey: "stock:коньяк k v nistru conus|ml",
      productName: "Коньяк K.V. NISTRU CONUS",
      amount: 10_000,
      unit: "ml",
    }],
  });
  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.reconciledBalances, 1);
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
  assert.equal(balance.averageUnitCost, 0.2377);
});

test("invoice value and bottle evidence repair a legacy synthetic 100 litre spirit line", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      source: "legacy-stock",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      averageUnitCost: 0.02377,
      lastPurchasePrice: 118.85,
      lastDocumentId: "invoice-corrupt-legacy-shape",
      externalProductKeys: ["коньяк k v nistru conus|0 5 л"],
    }] },
    purchaseDocuments: [{
      id: "invoice-corrupt-legacy-shape",
      status: "draft",
      confirmedAt: "2026-08-09T08:06:26.356Z",
      items: [{
        id: "line-corrupt-legacy-shape",
        name: "Коньяк K.V. NISTRU CONUS",
        category: "alcohol",
        quantity: 10,
        unit: "шт.",
        quantityMode: "count",
        packageSize: "10 л",
        unitPrice: 118.85,
        lineTotal: 2_377,
      }],
    }],
    stockMovements: [{
      id: "receipt-corrupt-legacy-shape",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-corrupt-legacy-shape",
      sourceLineId: "line-corrupt-legacy-shape",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 100_000,
      unit: "ml",
    }],
  });
  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.repairedMovements, 1);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
});

test("confirmed purchase evidence collapses a zero cross-unit shadow into the stocked card", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: {
      stockBalances: [
        {
          key: "stock:пиво tuborg|pcs",
          productKey: "stock:пиво tuborg|pcs",
          name: "Пиво Tuborg",
          unit: "pcs",
          current: 20,
          inventoryValue: 443,
          averageUnitCost: 22.15,
          lastPurchasePrice: 22.15,
          lastDocumentId: "invoice-tuborg-real",
        },
        {
          key: "stock:пиво tuborg green|ml",
          productKey: "stock:пиво tuborg green|ml",
          name: "Пиво Tuborg Green",
          unit: "ml",
          current: 0,
          inventoryValue: 0,
          externalProductKeys: ["пиво tuborg green|0 5 л"],
        },
      ],
      nomenclature: [
        { key: "stock:пиво tuborg|pcs", productKey: "stock:пиво tuborg|pcs", name: "Пиво Tuborg", unit: "pcs" },
        { key: "stock:пиво tuborg green|ml", productKey: "stock:пиво tuborg green|ml", name: "Пиво Tuborg Green", unit: "ml" },
      ],
    },
    purchaseDocuments: [{
      id: "invoice-tuborg-real",
      status: "confirmed",
      items: [{
        id: "line-tuborg-real",
        purchaseProductKey: "пиво tuborg green|0 5 л",
        name: "Пиво Tuborg Green",
        category: "alcohol",
        quantity: 20,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 22.15,
        lineTotal: 443,
      }],
    }],
    stockMovements: [{
      id: "receipt-tuborg-real",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-tuborg-real",
      sourceLineId: "line-tuborg-real",
      productKey: "stock:пиво tuborg|pcs",
      productName: "Пиво Tuborg",
      amount: 20,
      unit: "pcs",
    }],
  });
  assert.equal(repaired.summary.changed, true);
  const consolidated = consolidateInventoryDuplicates({
    assortment: repaired.assortment,
    stockMovements: repaired.stockMovements,
  });
  const balances = consolidated.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Пиво Tuborg");
  assert.equal(balances[0].current, 20);
  assert.equal(balances[0].unit, "pcs");
});

test("legacy evidence links an unkeyed zero beer card to the receipt-backed master", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: {
      stockBalances: [
        {
          key: "stock:пиво tuborg|pcs",
          productKey: "stock:пиво tuborg|pcs",
          name: "Пиво Tuborg",
          unit: "pcs",
          current: 20,
          inventoryValue: 443,
          averageUnitCost: 22.15,
        },
        {
          key: "stock:пиво tuborg green|ml",
          productKey: "stock:пиво tuborg green|ml",
          name: "Пиво Tuborg Green",
          unit: "ml",
          packageSize: "0,5 л",
          current: 0,
          inventoryValue: 0,
        },
      ],
      nomenclature: [],
    },
    purchaseDocuments: [{
      id: "invoice-tuborg-legacy",
      status: "draft",
      confirmedAt: "2026-08-07T12:00:00.000Z",
      items: [{
        id: "line-tuborg-legacy",
        name: "Пиво Tuborg Green",
        category: "alcohol",
        quantity: 20,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 22.15,
        lineTotal: 443,
      }],
    }],
    stockMovements: [{
      id: "receipt-tuborg-legacy",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-tuborg-legacy",
      sourceLineId: "line-tuborg-legacy",
      productKey: "stock:пиво tuborg|pcs",
      productName: "Пиво Tuborg",
      amount: 20,
      unit: "pcs",
    }],
  });
  assert.equal(repaired.summary.linkedShadowBalances, 1);
  const consolidated = consolidateInventoryDuplicates({
    assortment: repaired.assortment,
    stockMovements: repaired.stockMovements,
  });
  const balances = consolidated.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Пиво Tuborg");
  assert.equal(balances[0].current, 20);
});

test("an empty incompatible-unit card follows the exact movement name to its stocked master", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "tuborg-master", name: "Пиво Tuborg", unit: "pcs", packageSize: "1 шт.", current: 20, inventoryValue: 443, currency: "RUB" },
        { key: "tuborg-empty", name: "Пиво Tuborg Green", unit: "ml", packageSize: "0,5 л", current: 0, inventoryValue: 0, currency: "RUB" },
      ],
      nomenclature: [
        { key: "tuborg-master", productKey: "tuborg-master", name: "Пиво Tuborg", unit: "pcs" },
        { key: "tuborg-empty", productKey: "tuborg-empty", name: "Пиво Tuborg Green", unit: "ml" },
      ],
    },
    stockMovements: [{
      id: "tuborg-receipt",
      type: "receipt",
      status: "active",
      productKey: "tuborg-master",
      productName: "Пиво Tuborg Green",
      amount: 20,
      unit: "pcs",
    }],
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Пиво Tuborg");
  assert.equal(balances[0].current, 20);
  assert.equal(balances[0].unit, "pcs");
  assert.equal((result.assortment.nomenclature as unknown[]).length, 1);
  assert.equal(resolveInventoryProductKey(result.assortment, "tuborg-empty"), balances[0].productKey);
});

test("ledger reconciliation preserves a valued imported opening balance", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      source: "legacy-stock",
      unit: "ml",
      current: 100_000,
      inventoryValue: 10_000,
      lastDocumentId: "invoice-opening-safe",
    }] },
    purchaseDocuments: [],
    stockMovements: [{
      id: "receipt-opening-safe",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-opening-safe",
      sourceLineId: "line-opening-safe",
      productKey: "stock:коньяк нистру|ml",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
    }],
  });
  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.reconciledBalances, 0);
  assert.equal(repaired.summary.changed, false);
  assert.equal(balance.current, 100_000);
});

test("confirmed dimensional purchase overrides an incorrect imported count mode", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
    }] },
    purchaseDocuments: [{
      id: "invoice-count-mode",
      status: "confirmed",
      items: [{
        id: "line-count-mode",
        name: "Коньяк Нистру",
        category: "alcohol",
        quantity: 10,
        unit: "л",
        quantityMode: "count",
        packageSize: "10 л",
      }],
    }],
    stockMovements: [{
      id: "receipt-count-mode",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-count-mode",
      sourceLineId: "line-count-mode",
      productKey: "stock:коньяк нистру|ml",
      amount: 100_000,
      unit: "ml",
    }],
  });
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal((repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
});

test("legacy spirit total saved as a synthetic package is not squared", () => {
  assert.deepEqual(purchaseLineBaseAmount({
    name: "Коньяк Нистру",
    category: "alcohol",
    quantity: 10,
    unit: "шт.",
    quantityMode: "count",
    packageSize: "10 л",
  }), {
    amount: 10_000,
    unit: "ml",
  });

  assert.deepEqual(purchaseLineBaseAmount({
    name: "Пиво светлое кег",
    category: "alcohol",
    quantity: 10,
    unit: "шт.",
    quantityMode: "count",
    packageSize: "10 л",
  }), {
    amount: 100_000,
    unit: "ml",
  });
});

test("legacy receipt with a lost source line is relinked by product and corrected", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
    }] },
    purchaseDocuments: [{
      id: "invoice-lost-link",
      status: "confirmed",
      date: "2026-08-07",
      items: [{
        id: "real-line",
        name: "Коньяк Нистру",
        category: "alcohol",
        quantity: 10,
        unit: "шт.",
        quantityMode: "count",
        packageSize: "10 л",
      }],
    }],
    stockMovements: [{
      id: "receipt-lost-link",
      type: "receipt",
      status: "active",
      date: "2026-08-07",
      sourceDocumentId: "invoice-lost-link",
      sourceLineId: "legacy-line",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Nistru",
      amount: 100_000,
      unit: "ml",
    }],
  });
  assert.equal(repaired.stockMovements[0].sourceLineId, "real-line");
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal((repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
});

test("piece-only invoice line uses the retained bottle size and financial total", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      lastPurchasePrice: 118.85,
      lastDocumentId: "invoice-nistru-pieces",
      externalProductKeys: ["коньяк k v nistru conus|0 5 л"],
      source: "purchase",
    }] },
    purchaseDocuments: [{
      id: "invoice-nistru-pieces",
      status: "confirmed",
      date: "2026-08-07",
      items: [{
        id: "nistru-line",
        name: "Коньяк K.V. NISTRU CONUS",
        category: "alcohol",
        quantity: 20,
        unit: "шт.",
        unitPrice: 118.85,
        lineTotal: 2_377,
      }],
    }],
    stockMovements: [{
      id: "receipt-nistru-pieces",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-nistru-pieces",
      sourceLineId: "nistru-line",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 100_000,
      unit: "ml",
    }],
  });

  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal((repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);
  assert.equal(repaired.summary.correctedAmount, 90_000);
});

test("unique financial evidence repairs Nistru after its last document link was lost", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [
      {
        key: "stock:коньяк нистру|ml",
        productKey: "stock:коньяк нистру|ml",
        name: "Коньяк Нистру",
        unit: "ml",
        current: 100_000,
        inventoryValue: 2_377,
        averageUnitCost: 0.02377,
        lastPurchasePrice: 118.85,
        lastDocumentId: "stale-later-document",
        externalProductKeys: ["коньяк k v nistru conus|0 5 л"],
        mergedFromProductKeys: ["коньяк k v nistru conus|0 5 л", "stock:коньяк нистру|ml"],
        source: "legacy-stock",
        currency: "RUB",
      },
      {
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        unit: "ml",
        current: 100_000,
        inventoryValue: 2_752,
        averageUnitCost: 0.02752,
        lastPurchasePrice: 137.6,
        lastDocumentId: "stale-later-document",
        externalProductKeys: ["коньяк k v nistru soprizmivyi|0 5 л"],
        source: "legacy-stock",
        currency: "RUB",
      },
    ] },
    purchaseDocuments: [{
      id: "invoice-vprok",
      status: "confirmed",
      confirmedAt: "2026-08-09T08:06:26.356Z",
      currency: "RUB",
      items: [
        {
          id: "nistru-conus-line",
          purchaseProductKey: "коньяк k v nistru conus|0 5 л",
          name: "Коньяк K.V. NISTRU CONUS",
          category: "alcohol",
          quantity: 20,
          unit: "шт.",
          packageSize: "0,5 л",
          unitPrice: 118.85,
          lineTotal: 2_377,
        },
        {
          id: "nistru-surprise-line",
          purchaseProductKey: "коньяк k v nistru soprizmivyi|0 5 л",
          name: "Коньяк K.V. NISTRU SOPRIZMIVYI",
          category: "alcohol",
          quantity: 20,
          unit: "шт.",
          packageSize: "0,5 л",
          unitPrice: 137.6,
          lineTotal: 2_752,
        },
      ],
    }],
    stockMovements: [
      {
        id: "receipt-nistru-already-fixed",
        type: "receipt",
        status: "active",
        sourceDocumentId: "invoice-vprok",
        sourceLineId: "nistru-conus-line",
        productKey: "stock:коньяк нистру|ml",
        productName: "Коньяк Нистру",
        amount: 10_000,
        unit: "ml",
        costAmount: 2_377,
      },
      {
        id: "receipt-surprise-already-fixed",
        type: "receipt",
        status: "active",
        sourceDocumentId: "invoice-vprok",
        sourceLineId: "nistru-surprise-line",
        productKey: "stock:коньяк сюрпризный|ml",
        productName: "Коньяк Сюрпризный",
        amount: 10_000,
        unit: "ml",
        costAmount: 2_752,
      },
    ],
    now: "2026-08-21T12:00:00.000Z",
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.reconciledBalances, 2);
  assert.equal(repaired.summary.repairedMovements, 0);
  assert.equal(repaired.summary.correctedAmount, 180_000);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
  assert.equal(balance.averageUnitCost, 0.2377);
  assert.equal(balance.quantityRepairEvidenceDocumentId, "invoice-vprok");
  assert.equal(balance.quantityRepairEvidenceLineId, "nistru-conus-line");
  const surprise = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[1];
  assert.equal(repaired.stockMovements[1].amount, 10_000);
  assert.equal(surprise.current, 10_000);
  assert.equal(surprise.quantityRepairEvidenceLineId, "nistru-surprise-line");
});

test("global financial repair leaves repeated matching invoices untouched", () => {
  const sharedLine = {
    purchaseProductKey: "коньяк k v nistru conus|0 5 л",
    name: "Коньяк K.V. NISTRU CONUS",
    category: "alcohol",
    quantity: 20,
    unit: "шт.",
    packageSize: "0,5 л",
    unitPrice: 118.85,
    lineTotal: 2_377,
  };
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      lastPurchasePrice: 118.85,
      externalProductKeys: ["коньяк k v nistru conus|0 5 л"],
      currency: "RUB",
    }] },
    purchaseDocuments: [
      { id: "invoice-one", status: "confirmed", currency: "RUB", items: [{ id: "line-one", ...sharedLine }] },
      { id: "invoice-two", status: "confirmed", currency: "RUB", items: [{ id: "line-two", ...sharedLine }] },
    ],
    stockMovements: [],
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(repaired.summary.reconciledBalances, 0);
  assert.equal(balance.current, 100_000);
  assert.equal(balance.quantityRepairEvidenceDocumentId, undefined);
});

test("a financially verified repaired receipt fixes a stale balance after invoice evidence is lost", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      averageUnitCost: 0.02377,
      lastDocumentId: "stale-later-document",
      source: "legacy-stock",
      currency: "RUB",
    }] },
    purchaseDocuments: [],
    stockMovements: [{
      id: "receipt-nistru-already-fixed",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-vprok",
      sourceLineId: "nistru-conus-line",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
      currency: "RUB",
    }],
    now: "2026-08-21T13:00:00.000Z",
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 10_000);
  assert.equal(balance.inventoryValue, 2_377);
  assert.equal(balance.averageUnitCost, 0.2377);
  assert.equal(balance.quantityRepairReason, "Баланс восстановлен по финансово подтверждённому журналу приходов");
  assert.equal(repaired.summary.reconciledBalances, 1);
  assert.equal(repaired.summary.correctedAmount, 90_000);
});

test("a posted receipt never overwrites a valued opening balance without financial equality", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 5_000,
      source: "legacy-stock",
      currency: "RUB",
    }] },
    purchaseDocuments: [],
    stockMovements: [{
      id: "receipt-nistru",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-vprok",
      sourceLineId: "nistru-conus-line",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
      currency: "RUB",
    }],
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 100_000);
  assert.equal(repaired.summary.reconciledBalances, 0);
});

test("a unique financially matching receipt key is relinked before repairing the stale balance", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      averageUnitCost: 0.02377,
      source: "legacy-stock",
      currency: "RUB",
    }] },
    purchaseDocuments: [],
    stockMovements: [{
      id: "receipt-nistru-legacy-key",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-vprok",
      sourceLineId: "nistru-conus-line",
      productKey: "legacy:nistru-conus",
      productName: "Коньяк Нистру",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
      currency: "RUB",
    }],
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 10_000);
  assert.equal(repaired.stockMovements[0].productKey, "stock:коньяк нистру|ml");
  assert.equal(repaired.summary.reconciledBalances, 1);
  assert.equal(repaired.summary.repairedMovements, 1);
  assert.equal(repaired.summary.diagnostics[0].movementMatch, "unique-name");
  assert.equal(repaired.summary.diagnostics[0].receiptValueExplainsBalance, true);
});

test("confirmed purchase with a missing receipt is restored instead of showing zero stock", () => {
  const repaired = repairInventoryPurchaseAmounts({
    assortment: { stockBalances: [{
      key: "stock:coca cola|ml",
      productKey: "stock:coca cola|ml",
      name: "Coca Cola",
      unit: "ml",
      packageSize: "1,25 л",
      current: 0,
      inventoryValue: 0,
      currency: "RUB",
    }], nomenclature: [] },
    purchaseDocuments: [{
      id: "invoice-cola",
      status: "confirmed",
      date: "2026-08-07",
      currency: "RUB",
      sourceType: "manual",
      items: [{
        id: "cola-line",
        name: "Coca Cola",
        category: "food",
        quantity: 8,
        unit: "шт.",
        quantityMode: "count",
        packageSize: "1,25 л",
        lineTotal: 200,
      }],
    }],
    stockMovements: [],
  });
  assert.equal(repaired.summary.restoredMovements, 1);
  assert.equal(repaired.stockMovements[0].amount, 10_000);
  assert.equal((repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0].current, 10_000);

  const consolidated = consolidateInventoryDuplicates({
    assortment: repaired.assortment,
    stockMovements: repaired.stockMovements,
  });
  const cola = (consolidated.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(cola.productKey, "stock:кола|ml");
  assert.equal(cola.name, "Кола");
  assert.equal(cola.current, 10_000);
});

test("inventory identity is stable across package sizes but keeps incompatible base units separate", () => {
  assert.equal(inventoryProductKey({ name: "Апельсины", packageSize: "1 кг", unit: "шт." }), "stock:апельсины|g");
  assert.equal(inventoryProductKey({ name: "Апельсины", packageSize: "500 г", unit: "уп." }), "stock:апельсины|g");
  assert.equal(inventoryProductKey({ name: "Апельсины", packageSize: "1 шт.", unit: "шт." }), "stock:апельсины|pcs");
  assert.equal(
    inventoryProductKey({ name: "Апельсины", packageSize: "1 кг", purchaseProductKey: "апельсины|1 кг" }),
    "stock:апельсины|g",
  );
  assert.equal(
    inventoryProductKey({ name: "Апельсины", packageSize: "1 кг", purchaseProductKey: "1c-product-42" }),
    "1c-product-42",
  );
});

test("duplicate package-specific cards merge without losing stock, value, movements or recipe links", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        {
          key: "апельсины|1 кг",
          productKey: "апельсины|1 кг",
          name: "Апельсины",
          unit: "g",
          packageSize: "1 кг",
          packageAmount: 1_000,
          current: 1_078,
          inventoryValue: 64.68,
          averageUnitCost: 0.06,
          currency: "MDL",
          updatedAt: "2026-08-19T10:00:00.000Z",
        },
        {
          key: "апельсины|500 г",
          productKey: "апельсины|500 г",
          name: "Апельсины",
          unit: "g",
          packageSize: "500 г",
          packageAmount: 500,
          current: 2_054,
          inventoryValue: 143.78,
          averageUnitCost: 0.07,
          currency: "MDL",
          updatedAt: "2026-08-20T10:00:00.000Z",
        },
      ],
      nomenclature: [
        { key: "апельсины|1 кг", productKey: "апельсины|1 кг", name: "Апельсины", unit: "g", packageSize: "1 кг", kind: "stock" },
        { key: "апельсины|500 г", productKey: "апельсины|500 г", name: "Апельсины", unit: "g", packageSize: "500 г", kind: "stock" },
      ],
      recipes: [{
        id: "fruit-salad",
        ingredients: [{ id: "orange", name: "Апельсины", quantity: 100, unit: "г", purchaseProductKey: "апельсины|500 г" }],
      }],
    },
    stockMovements: [
      { id: "m1", productKey: "апельсины|1 кг", productName: "Апельсины", unit: "g", amount: 1_078 },
      { id: "m2", productKey: "апельсины|500 г", productName: "Апельсины", unit: "g", amount: 2_054 },
    ],
    now: "2026-08-20T20:00:00.000Z",
  });

  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  const nomenclature = result.assortment.nomenclature as Array<Record<string, unknown>>;
  const recipes = result.assortment.recipes as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(nomenclature.length, 1);
  assert.equal(balances[0].productKey, "stock:апельсины|g");
  assert.equal(balances[0].current, 3_132);
  assert.equal(balances[0].inventoryValue, 208.46);
  assert.equal(balances[0].averageUnitCost, 0.066558);
  assert.equal(balances[0].packageSize, "Несколько фасовок");
  assert.equal(balances[0].packageAmount, 0);
  assert.deepEqual(balances[0].packageOptions, ["1 кг", "500 г"]);
  assert.equal(result.stockMovements.every((movement) => movement.productKey === "stock:апельсины|g"), true);
  assert.equal(
    ((recipes[0].ingredients as Array<Record<string, unknown>>)[0]).purchaseProductKey,
    "stock:апельсины|g",
  );
  assert.deepEqual(result.summary, {
    mergedBalances: 1,
    mergedNomenclature: 1,
    remappedMovements: 2,
    remappedRecipes: 1,
    skippedCurrencyConflicts: 0,
    changed: true,
  });
});

test("different currencies are not silently merged", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "персики|1 кг", name: "Персики", unit: "g", packageSize: "1 кг", current: 1_000, inventoryValue: 100, currency: "MDL" },
        { key: "персики|500 г", name: "Персики", unit: "g", packageSize: "500 г", current: 500, inventoryValue: 50, currency: "RUB" },
      ],
    },
  });
  assert.equal((result.assortment.stockBalances as unknown[]).length, 2);
  assert.equal(result.summary.skippedCurrencyConflicts, 1);
  assert.equal(result.summary.mergedBalances, 0);
});

test("exact names share a stock master while an explicit size in the name stays separate", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "1c-cola-bulk", productKey: "1c-cola-bulk", name: "Кола", unit: "ml", packageSize: "75 л", current: 5_625_000, inventoryValue: 1_777.5, currency: "RUB" },
        { key: "1c-cola-liter", productKey: "1c-cola-liter", name: "Кола", unit: "ml", packageSize: "1 л", current: 22_500, inventoryValue: 486, currency: "RUB" },
        { key: "1c-cola-half", productKey: "1c-cola-half", name: "Кола 0.5 л", unit: "ml", packageSize: "0.5 л", current: 6_000, inventoryValue: 240, currency: "RUB" },
      ],
      recipes: [{ id: "r1", ingredients: [{ name: "Кола", purchaseProductKey: "1c-cola-half" }] }],
    },
    stockMovements: [{ id: "m1", productKey: "1c-cola-liter", productName: "Кола", unit: "ml", amount: 22_500 }],
    now: "2026-08-21T06:00:00.000Z",
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 2);
  const generic = balances.find((item) => item.productKey === "stock:кола|ml");
  const halfLiter = balances.find((item) => item.productKey === "stock:кола 0 5 л|ml");
  assert.equal(generic?.name, "Кола");
  assert.equal(generic?.current, 5_647_500);
  assert.deepEqual(generic?.packageOptions, ["75 л", "1 л"]);
  assert.deepEqual(generic?.externalProductKeys, ["1c-cola-bulk", "1c-cola-liter"]);
  assert.equal(halfLiter?.name, "Кола 0.5 л");
  assert.equal(halfLiter?.current, 6_000);
  assert.equal(resolveInventoryProductKey(result.assortment, "1c-cola-half"), "stock:кола 0 5 л|ml");
  assert.equal(result.stockMovements[0].productKey, "stock:кола|ml");
});

test("water descriptors and imported Nistru aliases merge into the correct cognac pairs", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "water-1", name: "Вода Боржоми", unit: "ml", packageSize: "1 л", current: 2_500, currency: "RUB" },
        { key: "water-2", name: "Вода минеральная Боржоми", unit: "ml", packageSize: "0.5 л", current: 0, currency: "RUB" },
        { key: "cognac-1", name: "Коньяк K.V. NISTRU CONUS", unit: "ml", packageSize: "0.5 л", current: 0, currency: "RUB" },
        { key: "cognac-2", name: "Коньяк K.V. NISTRU SOPRIZMIVYI", unit: "ml", packageSize: "0.5 л", current: 0, currency: "RUB" },
        { key: "cognac-master", name: "Коньяк Nistru", unit: "ml", packageSize: "0.5 л", current: 0, currency: "RUB" },
        { key: "cognac-user", name: "Коньяк Нистру", unit: "ml", packageSize: "10 л", current: 100_000, currency: "RUB", source: "purchase" },
        { key: "cognac-surprise", name: "Коньяк Сюрпризный", unit: "ml", packageSize: "10 л", current: 100_000, currency: "RUB" },
      ],
    },
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 3);
  const borjomi = balances.find((item) => item.productKey === "stock:боржоми|ml");
  assert.equal(borjomi?.name, "Вода Боржоми");
  assert.equal(borjomi?.current, 2_500);
  assert.deepEqual(borjomi?.packageOptions, ["1 л", "0.5 л"]);
  const nistru = balances.find((item) => item.productKey === "stock:коньяк нистру|ml");
  assert.equal(nistru?.name, "Коньяк Нистру");
  assert.equal(nistru?.current, 100_000);
  assert.deepEqual(nistru?.externalProductKeys, ["cognac-1", "cognac-master", "cognac-user"]);
  const surprise = balances.find((item) => item.productKey === "stock:коньяк сюрпризный|ml");
  assert.equal(surprise?.name, "Коньяк Сюрпризный");
  assert.equal(surprise?.current, 100_000);
  assert.deepEqual(surprise?.externalProductKeys, ["cognac-2", "cognac-surprise"]);
  assert.equal(result.summary.mergedBalances, 4);
});

test("Borjomi package volume in the name merges with the generic Borjomi stock card", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "borjomi-half", name: "Боржоми 0.5 л", unit: "ml", packageSize: "0.5 л", current: 6_000, inventoryValue: 295.8, currency: "RUB" },
        { key: "borjomi-generic", name: "Вода Боржоми", unit: "ml", packageSize: "Несколько фасовок", current: 2_500, inventoryValue: 260, currency: "RUB" },
      ],
    },
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].productKey, "stock:боржоми|ml");
  assert.equal(balances[0].name, "Вода Боржоми");
  assert.equal(balances[0].current, 8_500);
  assert.equal(balances[0].inventoryValue, 555.8);
});

test("Kozel light spelling variants and an empty legacy card consolidate into one stock item", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "kozel-1", name: "Пиво Kozel светлое", unit: "pcs", packageSize: "1 шт.", current: 20, inventoryValue: 358, currency: "RUB" },
        { key: "kozel-2", name: "Пиво Kozel светлый", unit: "pcs", packageSize: "1 шт.", current: 20, inventoryValue: 393, currency: "RUB" },
        { key: "kozel-legacy", name: "Пиво Velkopopovicky Kozel светлый", unit: "ml", packageSize: "0,5 л", current: 0, inventoryValue: 0, currency: "RUB" },
        { key: "kozel-dark", name: "Пиво Kozel тёмное", unit: "pcs", packageSize: "1 шт.", current: 10, inventoryValue: 210, currency: "RUB" },
      ],
    },
    stockMovements: [
      { id: "kozel-m1", productKey: "kozel-1", amount: 20, unit: "pcs" },
      { id: "kozel-m2", productKey: "kozel-2", amount: 20, unit: "pcs" },
    ],
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 2);
  const light = balances.find((item) => String(item.name).includes("свет"));
  const dark = balances.find((item) => String(item.name).includes("тём"));
  assert.equal(light?.current, 40);
  assert.equal(light?.inventoryValue, 751);
  assert.equal(light?.unit, "pcs");
  assert.deepEqual(light?.packageOptions, ["1 шт."]);
  assert.equal(dark?.current, 10);
  assert.equal(new Set(result.stockMovements.map((movement) => movement.productKey)).size, 1);
});

test("an empty unlinked erroneous card can be safely removed and stays tombstoned", () => {
  const result = archiveInventoryProduct({
    assortment: {
      stockBalances: [{
        key: "stock:вода вопк|ml",
        productKey: "stock:вода вопк|ml",
        name: "Вода Вопк",
        unit: "ml",
        packageSize: "1 л",
        current: 0,
        inventoryValue: 0,
        active: true,
      }],
      nomenclature: [{
        key: "stock:вода вопк|ml",
        productKey: "stock:вода вопк|ml",
        name: "Вода Вопк",
        unit: "ml",
        packageSize: "1 л",
        active: true,
      }],
      recipes: [],
    },
    productKey: "stock:вода вопк|ml",
    now: "2026-08-21T12:00:00.000Z",
  });
  assert.equal(result.ok, true);
  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.archived, true);
  assert.equal(balance.active, false);
  assert.deepEqual(result.assortment.archivedInventoryProductKeys, ["stock:вода вопк|ml"]);

  const blocked = archiveInventoryProduct({
    assortment: { stockBalances: [{ key: "stock:кола|ml", productKey: "stock:кола|ml", name: "Кола", unit: "ml", current: 1_000, inventoryValue: 50 }] },
    productKey: "stock:кола|ml",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "PRODUCT_HAS_STOCK");
});

test("one identity engine consolidates arbitrary spelling, word order and script without product-specific rules", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "ararat-latin", name: "Коньяк Ararat", unit: "ml", packageSize: "0.5 л", current: 5_000, currency: "RUB" },
        { key: "ararat-cyrillic", name: "Коньяк Арарат", unit: "ml", packageSize: "1 л", current: 2_000, currency: "RUB" },
        { key: "rich-a", name: "Сок Rich апельсиновый", unit: "ml", packageSize: "1 л", current: 3_000, currency: "RUB" },
        { key: "rich-b", name: "Апельсиновый сок Rich", unit: "ml", packageSize: "0.2 л", current: 1_000, currency: "RUB" },
        { key: "water-a", name: "Минеральная вода Аква Вива", unit: "ml", packageSize: "1 л", current: 4_000, currency: "RUB" },
        { key: "water-b", name: "Аква Вива 0.5 л", unit: "ml", packageSize: "0.5 л", current: 1_000, currency: "RUB" },
        { key: "cola-generic", name: "Кола", unit: "ml", packageSize: "1 л", current: 5_000, currency: "RUB" },
        { key: "cola-half", name: "Кола 0.5 л", unit: "ml", packageSize: "0.5 л", current: 2_000, currency: "RUB" },
      ],
    },
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 5);
  assert.equal(balances.find((item) => item.productKey === "stock:коньяк арарат|ml")?.current, 7_000);
  assert.equal(balances.find((item) => item.name === "Апельсиновый сок Rich")?.current, 4_000);
  assert.equal(balances.find((item) => item.productKey === "stock:аква вива|ml")?.current, 5_000);
  assert.equal(balances.some((item) => item.name === "Кола" && item.current === 5_000), true);
  assert.equal(balances.some((item) => item.name === "Кола 0.5 л" && item.current === 2_000), true);
});

test("identity reconciliation handles a large catalog in one pass", () => {
  const stockBalances = Array.from({ length: 100 }, (_, index) => [
    {
      key: `latin-${index}`,
      name: `Вино Brand${index}`,
      unit: "ml",
      packageSize: "0.75 л",
      current: 750,
      currency: "RUB",
    },
    {
      key: `cyrillic-${index}`,
      name: `Вино Бранд${index}`,
      unit: "ml",
      packageSize: "1.5 л",
      current: 1_500,
      currency: "RUB",
    },
  ]).flat();
  const result = consolidateInventoryDuplicates({ assortment: { stockBalances } });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 100);
  assert.equal(balances.every((item) => item.current === 2_250), true);
  assert.equal(result.summary.mergedBalances, 100);
});

test("a confirmed Cyrillic purchase name outranks later connector spelling", () => {
  const manual = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [] },
    document: {
      id: "manual-nistru",
      sourceType: "manual",
      date: "2026-08-20",
      currency: "RUB",
      items: [{
        id: "manual-line",
        name: "Коньяк Нистру",
        category: "alcohol",
        quantity: 10,
        packageSize: "1 л",
        lineTotal: 2_377,
      }],
    },
    now: "2026-08-20T09:00:00.000Z",
  });
  const imported = applyPurchaseToInventory({
    assortment: manual.assortment,
    document: {
      id: "connector-nistru",
      sourceType: "local_connector",
      date: "2026-08-21",
      currency: "RUB",
      items: [{
        id: "connector-line",
        purchaseProductKey: "1c-nistru",
        name: "Коньяк Nistru",
        category: "alcohol",
        quantity: 0.5,
        packageSize: "1 л",
        lineTotal: 119,
      }],
    },
    now: "2026-08-21T09:00:00.000Z",
  });

  const result = consolidateInventoryDuplicates({
    assortment: imported.assortment,
    now: "2026-08-21T09:01:00.000Z",
  });
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  const nomenclature = result.assortment.nomenclature as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].productKey, "stock:коньяк нистру|ml");
  assert.equal(balances[0].name, "Коньяк Нистру");
  assert.equal(balances[0].preferredDisplayName, "Коньяк Нистру");
  assert.equal(nomenclature.length, 1);
  assert.equal(nomenclature[0].name, "Коньяк Нистру");
  assert.equal(resolveInventoryProductKey(result.assortment, "1c-nistru"), "stock:коньяк нистру|ml");
});

test("stale Latin nomenclature merges even after the stock balance is already canonical", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [{
        key: "stock:коньяк нистру|ml",
        productKey: "stock:коньяк нистру|ml",
        name: "Коньяк Нистру",
        preferredDisplayName: "Коньяк Нистру",
        preferredDisplayNameSource: "confirmed_purchase",
        unit: "ml",
        packageSize: "Несколько фасовок",
        current: 500,
        currency: "RUB",
      }],
      nomenclature: [
        { key: "stock:коньяк нистру|ml", productKey: "stock:коньяк нистру|ml", name: "Коньяк Нистру", unit: "ml", kind: "stock" },
        { key: "stock:коньяк nistru|ml", productKey: "stock:коньяк nistru|ml", name: "Коньяк Nistru", unit: "ml", kind: "stock" },
      ],
    },
    now: "2026-08-21T10:00:00.000Z",
  });
  const nomenclature = result.assortment.nomenclature as Array<Record<string, unknown>>;
  assert.equal(nomenclature.length, 1);
  assert.equal(nomenclature[0].productKey, "stock:коньяк нистру|ml");
  assert.equal(nomenclature[0].name, "Коньяк Нистру");
  assert.equal(result.summary.mergedNomenclature, 1);
});

test("age, grade, flavour and explicit volume remain real product variants", () => {
  const result = consolidateInventoryDuplicates({
    assortment: {
      stockBalances: [
        { key: "absolut", name: "Водка Absolut", unit: "ml", current: 10_000, currency: "RUB" },
        { key: "absolut-citron", name: "Водка Absolut Citron", unit: "ml", current: 0, currency: "RUB" },
        { key: "nistru", name: "Коньяк Nistru", unit: "ml", current: 10_000, currency: "RUB" },
        { key: "nistru-5", name: "Коньяк Nistru 5 лет", unit: "ml", current: 0, currency: "RUB" },
        { key: "cola", name: "Кола", unit: "ml", current: 10_000, currency: "RUB" },
        { key: "cola-half", name: "Кола 0.5 л", unit: "ml", current: 6_000, currency: "RUB" },
      ],
    },
  });
  assert.equal((result.assortment.stockBalances as unknown[]).length, 6);
  assert.equal(result.summary.mergedBalances, 0);
});

test("two purchases of the same product in different packages use one balance", () => {
  const first = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [] },
    document: {
      id: "orange-1",
      currency: "MDL",
      items: [{ id: "a", name: "Апельсины", category: "food", quantity: 1, packageSize: "1 кг", lineTotal: 60 }],
    },
  });
  const second = applyPurchaseToInventory({
    assortment: first.assortment,
    document: {
      id: "orange-2",
      currency: "MDL",
      items: [{ id: "b", name: "Апельсины", category: "food", quantity: 2, packageSize: "500 г", lineTotal: 70 }],
    },
  });
  const balances = second.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].productKey, "stock:апельсины|g");
  assert.equal(balances[0].current, 2_000);
  assert.equal(balances[0].packageSize, "Несколько фасовок");
  assert.equal(balances[0].packageAmount, 0);
  assert.deepEqual(balances[0].packageOptions, ["1 кг", "500 г"]);
});

test("a new confirmed purchase is matched to the existing master before a duplicate can be created", () => {
  const first = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [] },
    document: {
      id: "ararat-latin",
      currency: "RUB",
      sourceType: "local_connector",
      items: [{ id: "a", name: "Коньяк Ararat", category: "alcohol", quantity: 10, unit: "л", packageSize: "0.5 л", lineTotal: 3_000 }],
    },
  });
  const second = applyPurchaseToInventory({
    assortment: first.assortment,
    document: {
      id: "ararat-cyrillic",
      currency: "RUB",
      sourceType: "manual",
      items: [{ id: "b", name: "Коньяк Арарат", category: "alcohol", quantity: 2, unit: "л", packageSize: "1 л", lineTotal: 700 }],
    },
  });
  const balances = second.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.length, 1);
  assert.equal(balances[0].name, "Коньяк Арарат");
  assert.equal(balances[0].current, 12_000);
  assert.deepEqual(balances[0].packageOptions, ["0.5 л", "1 л"]);
  assert.equal(second.movements[0].productKey, "stock:коньяк ararat|ml");
  assert.equal(
    resolveInventoryProductKey(second.assortment, "stock:коньяк арарат|ml"),
    "stock:коньяк ararat|ml",
  );
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
  assert.equal(ingredient.purchaseProductKey, "stock:coca cola|ml");
});

test("mixed purchase adds every line to nomenclature but posts only goods to stock", () => {
  const result = applyPurchaseToInventory({
    assortment: { stockBalances: [], nomenclature: [], recipes: [], menuItems: [] },
    document: {
      id: "purchase-mixed-1",
      date: "2026-08-20",
      currency: "MDL",
      items: [
        {
          id: "coffee",
          name: "Кофе",
          category: "food",
          quantity: 2,
          unit: "шт.",
          packageSize: "1 кг",
          unitPrice: 200,
          lineTotal: 400,
        },
        {
          id: "setup",
          name: "Настройка кассы",
          category: "repairs",
          quantity: 1,
          unit: "усл.",
          packageSize: "1 усл.",
          unitPrice: 500,
          lineTotal: 500,
        },
      ],
    },
    now: "2026-08-20T12:00:00.000Z",
  });

  const nomenclature = result.assortment.nomenclature as Array<Record<string, unknown>>;
  assert.equal(nomenclature.length, 2);
  assert.equal(nomenclature.find((item) => item.name === "Кофе")?.kind, "stock");
  assert.equal(nomenclature.find((item) => item.name === "Настройка кассы")?.kind, "service");
  assert.equal((result.assortment.stockBalances as unknown[]).length, 1);
  assert.equal(result.movements.length, 1);
  assert.equal(result.summary.postedLines, 1);
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
      displayUnit: "l",
    },
    now: "2026-08-09T14:05:00.000Z",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.product.name, "Сироп сахарный");
  assert.equal(result.product.preferredDisplayName, "Сироп сахарный");
  assert.equal(result.product.preferredDisplayNameSource, "manual_edit");
  assert.equal(result.product.unit, "ml");
  assert.equal(result.product.packageAmount, 1_000);
  assert.equal(result.product.displayUnit, "l");
  const ingredient = (result.assortment.recipes as Array<Record<string, unknown>>)[0]
    .ingredients as Array<Record<string, unknown>>;
  assert.equal(ingredient[0].purchaseProductKey, "manual:сироп|pcs");
  assert.equal(ingredient[0].unit, "мл");
});

test("warehouse product editor stores a compatible display unit without changing base stock precision", () => {
  const result = updateInventoryProductDefinition({
    assortment: {
      recipes: [],
      stockBalances: [{
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        current: 100_000,
        unit: "ml",
        packageSize: "10 л",
        packageAmount: 10_000,
        inventoryValue: 2_752,
      }],
      nomenclature: [{
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        unit: "ml",
        packageSize: "10 л",
        packageAmount: 10_000,
      }],
    },
    stockMovements: [],
    update: {
      productKey: "stock:коньяк сюрпризный|ml",
      name: "Коньяк Сюрпризный",
      unit: "ml",
      packageSize: "10 л",
      displayUnit: "l",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.product.current, 100_000);
  assert.equal(result.product.unit, "ml");
  assert.equal(result.product.displayUnit, "l");
  const nomenclature = result.assortment.nomenclature as Array<Record<string, unknown>>;
  assert.equal(nomenclature[0].displayUnit, "l");
});

test("warehouse product editor rejects a display unit from another measurement type", () => {
  const result = updateInventoryProductDefinition({
    assortment: {
      recipes: [],
      stockBalances: [{
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        current: 100_000,
        unit: "ml",
        packageSize: "10 л",
        packageAmount: 10_000,
      }],
    },
    update: {
      productKey: "stock:коньяк сюрпризный|ml",
      name: "Коньяк Сюрпризный",
      unit: "ml",
      packageSize: "10 л",
      displayUnit: "kg",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "INVALID_PRODUCT");
});

test("warehouse product editor changes display units without collapsing multiple purchase packages", () => {
  const result = updateInventoryProductDefinition({
    assortment: {
      recipes: [],
      stockBalances: [{
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        current: 100_000,
        unit: "ml",
        packageSize: "Несколько фасовок",
        packageAmount: 0,
        packageOptions: ["0,5 л", "10 л"],
        multiplePackageSizes: true,
      }],
      nomenclature: [{
        key: "stock:коньяк сюрпризный|ml",
        productKey: "stock:коньяк сюрпризный|ml",
        name: "Коньяк Сюрпризный",
        unit: "ml",
        packageSize: "Несколько фасовок",
        packageAmount: 0,
        packageOptions: ["0,5 л", "10 л"],
        multiplePackageSizes: true,
      }],
    },
    update: {
      productKey: "stock:коньяк сюрпризный|ml",
      name: "Коньяк Сюрпризный",
      unit: "ml",
      packageSize: "Несколько фасовок",
      displayUnit: "l",
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.product.displayUnit, "l");
  assert.equal(result.product.packageAmount, 0);
  assert.equal(result.product.multiplePackageSizes, true);
  assert.deepEqual(result.product.packageOptions, ["0,5 л", "10 л"]);
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

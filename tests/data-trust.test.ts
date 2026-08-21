import assert from "node:assert/strict";
import test from "node:test";
import { mergeConcurrentStoreData } from "../lib/bardoctor/data-trust";
import { repairInventoryPurchaseAmounts } from "../lib/bardoctor/inventory";

test("concurrent array additions from two venue users are both preserved", () => {
  const base = [{ id: "existing", value: 1, updatedAt: "2026-08-01T10:00:00Z" }];
  const desired = [
    ...base,
    { id: "from-manager", value: 2, updatedAt: "2026-08-08T10:01:00Z" },
  ];
  const current = [
    ...base,
    { id: "from-owner", value: 3, updatedAt: "2026-08-08T10:02:00Z" },
  ];

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(
    (result.data as Array<{ id: string }>).map((row) => row.id).sort(),
    ["existing", "from-manager", "from-owner"],
  );
  assert.equal(result.conflicts, 0);
});

test("a concurrent remote edit is not erased by a stale local deletion", () => {
  const base = [{ id: "shift", revenue: 10_000, updatedAt: "2026-08-08T10:00:00Z" }];
  const desired: unknown[] = [];
  const current = [{
    id: "shift",
    revenue: 12_000,
    updatedAt: "2026-08-08T10:05:00Z",
  }];

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(result.data, current);
  assert.equal(result.conflicts, 1);
});

test("independent settings fields merge without replacing another user's edit", () => {
  const base = {
    inventoryFrequency: "monthly",
    inventorySections: ["Бар"],
    taxModel: { mode: "manual", amount: 0 },
    utilityModel: { mode: "manual", amount: 0 },
  };
  const desired = {
    ...base,
    inventorySections: ["Бар", "Кухня"],
  };
  const current = {
    ...base,
    taxModel: { mode: "fixed", amount: 3_000 },
  };

  const result = mergeConcurrentStoreData(base, desired, current);
  assert.deepEqual(result.data, {
    ...base,
    inventorySections: ["Бар", "Кухня"],
    taxModel: { mode: "fixed", amount: 3_000 },
  });
  assert.equal(result.conflicts, 0);
});

test("a stale client snapshot cannot restore a financially disproved inventory quantity", () => {
  const stale = {
    stockBalances: [{
      key: "stock:коньяк нистру|ml",
      productKey: "stock:коньяк нистру|ml",
      name: "Коньяк Нистру",
      unit: "ml",
      current: 100_000,
      inventoryValue: 2_377,
      lastDocumentId: "invoice-vprok",
      source: "purchase",
    }],
  };
  const current = {
    ...stale,
    stockBalances: [{
      ...stale.stockBalances[0],
      current: 10_000,
      averageUnitCost: 0.2377,
      quantityRepairAt: "2026-08-21T12:52:00.000Z",
    }],
    inventoryQuantityRepairVersion: "v234",
  };
  const desired = {
    ...stale,
    stockBalances: [{
      ...stale.stockBalances[0],
      updatedAt: "2026-08-21T12:59:00.000Z",
    }],
  };
  const merged = mergeConcurrentStoreData(stale, desired, current);
  const repaired = repairInventoryPurchaseAmounts({
    assortment: merged.data,
    purchaseDocuments: [{
      id: "invoice-vprok",
      status: "confirmed",
      items: [{
        id: "nistru-line",
        name: "Коньяк K.V. NISTRU CONUS",
        purchaseProductKey: "stock:коньяк нистру|ml",
        quantity: 20,
        unit: "шт.",
        packageSize: "0,5 л",
        unitPrice: 118.85,
        lineTotal: 2_377,
      }],
    }],
    stockMovements: [{
      id: "receipt-nistru",
      type: "receipt",
      status: "active",
      sourceDocumentId: "invoice-vprok",
      sourceLineId: "nistru-line",
      productKey: "stock:коньяк нистру|ml",
      productName: "Коньяк Нистру",
      amount: 10_000,
      unit: "ml",
      costAmount: 2_377,
    }],
    now: "2026-08-21T13:00:00.000Z",
  });

  const balance = (repaired.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.current, 10_000);
  assert.equal(repaired.summary.correctedAmount, 90_000);
});

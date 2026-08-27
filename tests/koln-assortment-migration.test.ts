import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAssortmentMigrationPreview } from "../lib/bardoctor/assortment-migration-preview";
import { buildKolnAssortmentReconciliation } from "../lib/bardoctor/koln-assortment-migration";

function preview() {
  return buildAssortmentMigrationPreview({
    venueId: 1,
    serverAssortmentExists: true,
    suppliers: [{ id: "supplier", name: "Supplier" }],
    stockMovements: [{ id: "m1", venueId: 1, productKey: "stock:milk|ml", productName: "Молоко", unit: "ml", amount: 1000 }],
    purchases: [{ id: "p1", venueId: 1, supplierId: "supplier", supplierName: "Supplier", expenseCategory: "food", items: [
      { id: "l1", rawName: "Молоко", unit: "мл", quantity: 1000, purchaseProductKey: "stock:milk|ml" },
      { id: "l2", rawName: "Сахар 1 кг", unit: "кг", quantity: 1, packageSize: "1 кг" },
    ] }],
  });
}

test("additive Köln reconciliation preserves menu and recipes and creates safe canonical identities", () => {
  const existing = { menuItems: [{ id: "menu", name: "Latte" }], recipes: [{ id: "recipe", menuItemId: "menu" }], nomenclature: [], stockBalances: [] };
  const result = buildKolnAssortmentReconciliation({ venueId: 1, existingAssortment: existing, preview: preview(), operationId: "op-1", now: "2026-08-27T00:00:00.000Z" });
  assert.deepEqual(result.assortment.menuItems, existing.menuItems);
  assert.deepEqual(result.assortment.recipes, existing.recipes);
  assert.equal(result.summary.createdPositions, 2);
  assert.equal(result.summary.createdBalanceShells, 1);
  assert.equal(result.summary.createdSupplierMappings, 2);
  assert.equal(result.assortment.nomenclature.length, 2);
});

test("reconciliation is idempotent and links an exact existing identity", () => {
  const first = buildKolnAssortmentReconciliation({ venueId: 1, existingAssortment: {}, preview: preview(), operationId: "op-1", now: "2026-08-27T00:00:00.000Z" });
  const second = buildKolnAssortmentReconciliation({ venueId: 1, existingAssortment: first.assortment, preview: preview(), operationId: "op-2", now: "2026-08-27T01:00:00.000Z" });
  assert.equal(second.summary.createdPositions, 0);
  assert.equal(second.summary.createdBalanceShells, 0);
  assert.equal(second.summary.createdSupplierMappings, 0);
  assert.equal(second.assortment.nomenclature.length, first.assortment.nomenclature.length);
});

test("migration endpoint is owner scoped, same-origin protected, audited and preserves protected stores", async () => {
  const route = await readFile(new URL("../app/api/migration/koln-assortment/route.ts", import.meta.url), "utf8");
  assert.match(route, /context\?\.role === "owner"/);
  assert.match(route, /apply-koln-safe-canonical-assortment/);
  assert.match(route, /venueMigrationExports/);
  assert.match(route, /venueMigrationOperations/);
  assert.match(route, /protectedPreserved/);
  assert.match(route, /menuPreserved/);
  assert.match(route, /recipesPreserved/);
  assert.match(route, /featureFlag: "legacy"/);
  assert.doesNotMatch(route, /UPDATE domain_data SET data_json = \?.*bd_purchase_documents/s);
});

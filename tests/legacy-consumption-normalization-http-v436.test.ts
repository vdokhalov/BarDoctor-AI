import assert from "node:assert/strict";
import test from "node:test";
import { storeRuntime } from "./helpers/store-runtime";

type JsonRecord = Record<string, unknown>;
const STORE = "bd_assortment_v1";

function assortment(): JsonRecord {
  const product = { id: "sprite-stock", nomenclatureItemId: "sprite-stock", productKey: "sprite", key: "sprite", name: "Спрайт 0,5л.", unit: "pcs", unitModelVersion: 4, venueId: 1, active: true };
  return {
    menuItems: [{
      id: "sprite-menu", name: "Спрайт 0,5л.", venueId: 1, active: true, type: "ready",
      readyProduct: { nomenclatureItemId: product.id, productKey: product.productKey, packagesPerSale: 1 },
      consumptionMode: "DIRECT_ITEM", salePrice: 45, currency: "MDL",
    }],
    recipes: [{
      id: "sprite-recipe", menuItemId: "sprite-menu", ownerId: "sprite-menu", ownerType: "menu_item", venueId: 1,
      status: "confirmed", reviewStatus: "approved", lifecycleStatus: "current", current: true, source: "manual",
      ingredients: [{ id: "sprite-line", name: product.name, nomenclatureItemId: product.id, purchaseProductKey: product.productKey, productKey: product.productKey, quantity: 1, unit: "pcs", venueId: 1 }],
    }],
    nomenclature: [product], stockBalances: [{ ...product, current: 10 }], priceHistory: [],
  };
}

test("store PUT makes an explicit recipe choice authoritative for a conflicting Sprite legacy record", async () => {
  const runtime = await storeRuntime(1);
  try {
    const before = assortment();
    runtime.seed(STORE, before);
    const after = structuredClone(before) as JsonRecord;
    const item = (after.menuItems as JsonRecord[])[0];
    Object.assign(item, {
      consumptionMode: "RECIPE", type: "composite", updatedAt: "2026-09-19T12:00:00.000Z",
      readyProductLink: { nomenclatureItemId: "sprite-stock", productKey: "sprite" },
      readyProductKey: "sprite", nomenclatureItemId: "sprite-stock",
      saleSize: { quantity: 500, unit: "ml" }, portionSize: "0,5 л", legacyPortionSize: "бутылка",
    });
    const saved = await runtime.put(STORE, after, "Normalize explicit Sprite consumption mode");
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const persisted = saved.body.data as JsonRecord;
    const savedItem = (persisted.menuItems as JsonRecord[])[0];
    assert.equal(savedItem.consumptionMode, "RECIPE");
    for (const key of ["readyProduct", "readyProductLink", "readyProductKey", "nomenclatureItemId", "saleSize", "portionSize", "legacyPortionSize"]) {
      assert.equal(key in savedItem, false, key);
    }
    assert.equal((persisted.recipes as JsonRecord[]).filter(recipe => recipe.current === true).length, 1);
    assert.equal((persisted.nomenclature as JsonRecord[]).length, 1);
    assert.ok(runtime.audits().length > 0);

    const reloaded = await runtime.get(STORE);
    assert.equal(reloaded.status, 200);
    const reloadedItem = ((reloaded.body.data as JsonRecord).menuItems as JsonRecord[])[0];
    assert.equal(reloadedItem.consumptionMode, "RECIPE");
    assert.equal("readyProduct" in reloadedItem, false);
  } finally {
    runtime.close();
  }
});

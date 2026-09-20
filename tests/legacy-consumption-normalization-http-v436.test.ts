import assert from "node:assert/strict";
import test from "node:test";
import { storeRuntime } from "./helpers/store-runtime";
import { changedConsumptionModeIssues, normalizeExplicitConsumptionUpdates, resolveMenuConsumption } from "../lib/bardoctor/consumption-mode";
import { reconcileTechCards, reconcileTechCardsForMutation } from "../lib/bardoctor/tech-card-reconciliation";

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

test("scoped reconciliation learns selected manual links and preserves unrelated orphan recipes", () => {
  const before = assortment();
  const orphan = { id: "untouched-orphan", name: "Unresolved legacy card", ingredients: [], venueId: 1 };
  (before.recipes as JsonRecord[]).push(orphan);
  const after = structuredClone(before);
  const recipe = (after.recipes as JsonRecord[])[0];
  ((recipe.ingredients as JsonRecord[])[0]).linkConfirmedByUser = true;
  const result = reconcileTechCardsForMutation({ before, assortment: after, venueId: 1 }).assortment;
  assert.deepEqual((result.recipes as JsonRecord[])[1], orphan);
  assert.equal((result.techCardIngredientAliases as JsonRecord[]).length, 1);

  const changedOrphan = structuredClone(before);
  (changedOrphan.recipes as JsonRecord[]).push({ id: "new-orphan", name: "Another unresolved card", ingredients: [], venueId: 1 });
  const orphanResult = reconcileTechCardsForMutation({ before, assortment: changedOrphan, venueId: 1 }).assortment;
  assert.deepEqual((orphanResult.recipes as JsonRecord[])[1], orphan, "a changed orphan cannot select every ownerless legacy card");
  assert.equal((orphanResult.recipes as JsonRecord[]).length, 3);
});

test("Sprite save excludes unrelated legacy reconciliation while preserving its diagnostic", async () => {
  const runtime = await storeRuntime(1);
  try {
    const before = assortment();
    const unrelated = { id: "other-menu", name: "Unrelated legacy", venueId: 1, type: "ready", readyProductKey: "missing-stock" };
    (before.menuItems as JsonRecord[]).push(unrelated);
    const unrelatedRecipe = { id: "other-recipe", menuItemId: "other-menu", venueId: 1, status: "approved", current: true, ingredients: [{ id: "other-line", name: "Missing", quantity: 1, unit: "pcs" }] };
    (before.recipes as JsonRecord[]).push(unrelatedRecipe);
    runtime.seed(STORE, before);
    runtime.seed("bd_sales_events", [{ id: "sale-snapshot", venueId: 1, cost: 14 }]);
    runtime.seed("bd_stock_movements", [{ id: "movement-snapshot", venueId: 1, quantity: -1 }]);
    const historicalStores = () => runtime.rows().filter(row => row.store_key !== STORE);
    const history = historicalStores();
    const after = structuredClone(before);
    Object.assign((after.menuItems as JsonRecord[])[0], { consumptionMode: "RECIPE", type: "composite" });
    const normalized = normalizeExplicitConsumptionUpdates(before, after, 1).data;
    const global = reconcileTechCards({ assortment: normalized, venueId: 1 }).assortment;
    assert.ok(changedConsumptionModeIssues(before, global, 1).some(issue => issue.menuItemId === "other-menu"), "old global pipeline reproduces unrelated rejection");
    const saved = await runtime.put(STORE, after, "Explicit Sprite recipe selection");
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    const data = saved.body.data as JsonRecord;
    assert.deepEqual((data.menuItems as JsonRecord[])[1], unrelated);
    assert.deepEqual((data.recipes as JsonRecord[])[1], unrelatedRecipe);
    assert.deepEqual(data.stockBalances, before.stockBalances);
    assert.equal(resolveMenuConsumption(unrelated, data, { venueId: 1 }).ok, false, "unrelated problem remains diagnosable");
    assert.deepEqual(historicalStores(), history);
    const repeated = await runtime.put(STORE, data, "Repeat explicit selection");
    assert.equal(repeated.status, 200, JSON.stringify(repeated.body));
    assert.deepEqual((repeated.body.data as JsonRecord).recipes, data.recipes);
    assert.deepEqual(historicalStores(), history);
    const reloaded = await runtime.get(STORE);
    assert.equal(((reloaded.body.data as JsonRecord).menuItems as JsonRecord[])[0].consumptionMode, "RECIPE");
  } finally { runtime.close(); }
});

for (const scenario of ["selected recipe missing", "changed stock dependency"] as const) {
  test(`reject ${scenario} without changing records or audit`, async () => {
    const runtime = await storeRuntime(1);
    try {
      const before = assortment();
      // Start with a valid direct-item configuration and a historical recipe.
      Object.assign((before.recipes as JsonRecord[])[0], { current: false, lifecycleStatus: "superseded", status: "superseded" });
      if (scenario === "changed stock dependency") before.stockBalances = [];
      runtime.seed(STORE, before);
      const bytes = runtime.bytes();
      const after = structuredClone(before);
      if (scenario === "selected recipe missing") {
        Object.assign((after.menuItems as JsonRecord[])[0], { consumptionMode: "RECIPE", type: "composite" });
        after.recipes = [];
      } else {
        after.nomenclature = [];
        after.stockBalances = [];
      }
      const result = await runtime.put(STORE, after, scenario);
      assert.equal(result.status, 422, JSON.stringify(result.body));
      assert.equal(runtime.bytes(), bytes);
    } finally { runtime.close(); }
  });
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

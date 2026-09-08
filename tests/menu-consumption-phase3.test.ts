import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  changedConsumptionModeIssues,
  duplicateMenuItemIds,
  legacyConsumptionConflicts,
  resolveMenuConsumption,
} from "../lib/bardoctor/consumption-mode";
import {
  createOrUpdateSalesBatch,
  manualSalesAdapter,
  postSalesBatch,
} from "../lib/bardoctor/sales-consumption";
import { archiveInventoryProduct } from "../lib/bardoctor/inventory";
import { canonicalTechCardForOwner, reconcileTechCards } from "../lib/bardoctor/tech-card-reconciliation";

type JsonRecord = Record<string, unknown>;
const actor = { accountId: 7, name: "Phase 3 QA", role: "owner" };

function fixture(): JsonRecord {
  return {
    menuItems: [
      {
        id: "kozel-menu", name: "Kozel Dark 0.5", venueId: 1, active: true, type: "ready",
        consumptionMode: "DIRECT_ITEM",
        readyProduct: { nomenclatureItemId: "nom-kozel", productKey: "stock-kozel", packagesPerSale: 1 },
      },
      {
        id: "whisky-menu", name: "Whisky 50 ml", venueId: 1, active: true, type: "ready",
        consumptionMode: "FIXED_QUANTITY",
        readyProduct: { nomenclatureItemId: "nom-whisky", productKey: "stock-whisky", packagesPerSale: 1 },
        saleSize: { quantity: 0.05, unit: "l" },
      },
      {
        id: "espresso-menu", name: "Espresso", venueId: 1, active: true, type: "composite",
        consumptionMode: "RECIPE",
      },
      {
        id: "ticket-menu", name: "Entrance ticket", venueId: 1, active: true, type: "service",
        consumptionMode: "NONE",
      },
    ],
    nomenclature: [
      { id: "nom-kozel", productKey: "stock-kozel", name: "Пиво Kozel Dark бутылка 0.5", unit: "pcs", venueId: 1, active: true },
      { id: "nom-whisky", productKey: "stock-whisky", name: "Whisky Jameson", unit: "l", venueId: 1, active: true },
      { id: "nom-coffee", productKey: "stock-coffee", name: "Coffee beans", unit: "g", venueId: 1, active: true },
    ],
    stockBalances: [
      { id: "balance-kozel", nomenclatureItemId: "nom-kozel", productKey: "stock-kozel", name: "Kozel", unit: "pcs", current: 24, venueId: 1, currency: "RUB" },
      { id: "balance-whisky", nomenclatureItemId: "nom-whisky", productKey: "stock-whisky", name: "Whisky", unit: "ml", current: 1_000, venueId: 1, currency: "RUB" },
      { id: "balance-coffee", nomenclatureItemId: "nom-coffee", productKey: "stock-coffee", name: "Coffee beans", unit: "g", current: 1_000, venueId: 1, currency: "RUB" },
    ],
    recipes: [{
      id: "recipe-espresso", menuItemId: "espresso-menu", ownerId: "espresso-menu", venueId: 1,
      version: 1, current: true, status: "confirmed", reviewStatus: "approved",
      ingredients: [{
        id: "coffee-line", nomenclatureItemId: "nom-coffee", purchaseProductKey: "stock-coffee",
        name: "Coffee beans", quantity: 8, unit: "g", normalizedQuantity: 8, normalizedUnit: "g", venueId: 1,
      }],
    }],
  };
}

const receipts = [
  { id: "receipt-kozel", venueId: 1, type: "receipt", status: "active", date: "2026-09-01", businessDate: "2026-09-01", productKey: "stock-kozel", productName: "Kozel", amount: 24, unit: "pcs", costAmount: 240, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-kozel", sourceLineId: "line-kozel", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "receipt-whisky", venueId: 1, type: "receipt", status: "active", date: "2026-09-01", businessDate: "2026-09-01", productKey: "stock-whisky", productName: "Whisky", amount: 1_000, unit: "ml", costAmount: 400, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-whisky", sourceLineId: "line-whisky", createdAt: "2026-09-01T10:00:00.000Z" },
  { id: "receipt-coffee", venueId: 1, type: "receipt", status: "active", date: "2026-09-01", businessDate: "2026-09-01", productKey: "stock-coffee", productName: "Coffee beans", amount: 1_000, unit: "g", costAmount: 100, costStatus: "KNOWN", currency: "RUB", sourceDocumentId: "purchase-coffee", sourceLineId: "line-coffee", createdAt: "2026-09-01T10:00:00.000Z" },
];

function persisted<T>(value: T): T {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE domain_data (store_key TEXT PRIMARY KEY, data_json TEXT NOT NULL)");
  database.prepare("INSERT INTO domain_data (store_key, data_json) VALUES (?, ?)")
    .run("bd_assortment_v1", JSON.stringify(value));
  const row = database.prepare("SELECT data_json FROM domain_data WHERE store_key = ?")
    .get("bd_assortment_v1") as { data_json: string };
  database.close();
  return JSON.parse(row.data_json) as T;
}

function createSale(source: JsonRecord, menuItemId: string, rawName: string, quantity: number, id: string) {
  const draft = manualSalesAdapter.parse({
    businessDate: "2026-09-06",
    lines: [{ id: `${id}:line`, rawName, menuItemId, quantity }],
  });
  return createOrUpdateSalesBatch({
    batches: [], draft, assortment: source, mappings: [], warehouseRoutes: [], stockMovements: receipts,
    venueId: 1, actor, now: "2026-09-06T12:00:00.000Z",
  });
}

function postSale(source: JsonRecord, menuItemId: string, rawName: string, quantity: number, id: string) {
  const saved = createSale(source, menuItemId, rawName, quantity, id);
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error(saved.error);
  const posted = postSalesBatch({
    batches: saved.batches, batchId: saved.batch.id, assortment: source, mappings: [], warehouseRoutes: [],
    stockMovements: receipts, venueId: 1, actor, now: "2026-09-06T12:01:00.000Z",
  });
  assert.equal(posted.ok, true);
  if (!posted.ok) throw new Error(posted.error);
  return { saved, posted };
}

function balance(source: JsonRecord, productKey: string): JsonRecord {
  return ((source.stockBalances as JsonRecord[]) ?? []).find((item) => item.productKey === productKey) ?? {};
}

test("DIRECT_ITEM persists one explicit ID link and consumes exactly one stock unit per sale", () => {
  const source = persisted(fixture());
  const item = (source.menuItems as JsonRecord[])[0];
  const resolution = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
  assert.equal(resolution.ok, true);
  if (!resolution.ok || resolution.mode !== "DIRECT_ITEM") return;
  assert.equal(resolution.nomenclature.nomenclatureItemId, "nom-kozel");
  assert.equal(resolution.nomenclature.productKey, "stock-kozel");

  const { saved, posted } = postSale(source, "kozel-menu", "Kozel Dark 0.5", 5, "direct-sale");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.consumptionMode, "DIRECT_ITEM");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.ingredients.length, 1);
  assert.equal(saved.batch.lines[0].recipeSnapshot?.ingredients[0].baseQuantityTotal, 5);
  assert.equal(saved.batch.lines[0].theoreticalCost, 50);
  assert.equal(balance(posted.assortment, "stock-kozel").current, 19);
  const movements = posted.stockMovements.filter((movement) => movement.type === "sale_consumption");
  assert.equal(movements.length, 1);
  assert.equal(movements[0].amount, -5);

  item.name = "Козел тёмное 0.5";
  (source.nomenclature as JsonRecord[])[0].name = "Пиво Kozel Dark — бутылка";
  const renamed = resolveMenuConsumption(item, persisted(source), { venueId: 1, forPosting: true });
  assert.equal(renamed.ok, true);
  assert.equal(renamed.ok && renamed.mode === "DIRECT_ITEM" ? renamed.nomenclature.productKey : null, "stock-kozel");
});

test("FIXED_QUANTITY persists its unit and converts four 0.05 l portions to 200 ml", () => {
  const source = persisted(fixture());
  const { saved, posted } = postSale(source, "whisky-menu", "Whisky 50 ml", 4, "fixed-sale");
  const ingredient = saved.batch.lines[0].recipeSnapshot?.ingredients[0];
  assert.equal(saved.batch.lines[0].recipeSnapshot?.consumptionMode, "FIXED_QUANTITY");
  assert.equal(ingredient?.recipeQuantity, 0.05);
  assert.equal(ingredient?.recipeUnit, "l");
  assert.equal(ingredient?.baseQuantityPerPortion, 50);
  assert.equal(ingredient?.baseQuantityTotal, 200);
  assert.equal(saved.batch.lines[0].theoreticalCost, 80);
  assert.equal(balance(posted.assortment, "stock-whisky").current, 800);
  assert.equal(posted.stockMovements.find((movement) => movement.type === "sale_consumption")?.amount, -200);
});

test("RECIPE consumes only its persisted nomenclature ingredients", () => {
  const source = persisted(fixture());
  const { saved, posted } = postSale(source, "espresso-menu", "Espresso", 10, "recipe-sale");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.recipeId, "recipe-espresso");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.consumptionMode, "RECIPE");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.ingredients[0].baseQuantityTotal, 80);
  assert.equal(saved.batch.lines[0].theoreticalCost, 8);
  assert.equal(balance(posted.assortment, "stock-coffee").current, 920);
  const movements = posted.stockMovements.filter((movement) => movement.type === "sale_consumption");
  assert.deepEqual(movements.map((movement) => movement.productKey), ["stock-coffee"]);
  assert.equal(movements.some((movement) => movement.productKey.includes("espresso")), false);
});

test("NONE persists a posted sale with known zero cost and no inventory movement", () => {
  const source = fixture();
  const ticket = (source.menuItems as JsonRecord[]).find((item) => item.id === "ticket-menu")!;
  ticket.readyProduct = { nomenclatureItemId: "nom-kozel", productKey: "stock-kozel", packagesPerSale: 1 };
  (source.recipes as JsonRecord[]).push({ id: "legacy-ticket-card", menuItemId: "ticket-menu", ingredients: [] });
  const reloaded = persisted(source);
  const { saved, posted } = postSale(reloaded, "ticket-menu", "Entrance ticket", 10, "none-sale");
  assert.equal(saved.batch.lines[0].theoreticalCost, 0);
  assert.equal(saved.batch.costStatus, "FULL");
  assert.equal(saved.batch.lines[0].recipeSnapshot?.consumptionMode, "NONE");
  assert.deepEqual(saved.batch.lines[0].recipeSnapshot?.ingredients, []);
  assert.equal(posted.idempotent, false);
  assert.equal(posted.stockChanged, false);
  assert.equal(posted.postedNow, 1);
  assert.equal(posted.batch.status, "POSTED");
  assert.deepEqual(posted.assortment.stockBalances, reloaded.stockBalances);
  assert.equal(posted.stockMovements.filter((movement) => movement.type === "sale_consumption").length, 0);
  const repeated = postSalesBatch({
    batches: posted.batches, batchId: posted.batch.id, assortment: posted.assortment, mappings: [], warehouseRoutes: [],
    stockMovements: posted.stockMovements, venueId: 1, actor,
  });
  assert.equal(repeated.ok, true);
  if (!repeated.ok) return;
  assert.equal(repeated.idempotent, true);
  assert.equal(repeated.stockChanged, false);
});

test("Menu and Tech Cards edit the same persisted recipe object", () => {
  const source = persisted(fixture());
  const item = (source.menuItems as JsonRecord[]).find((candidate) => candidate.id === "espresso-menu")!;
  const menuPath = resolveMenuConsumption(item, source, { venueId: 1 });
  assert.equal(menuPath.ok, true);
  if (!menuPath.ok || menuPath.mode !== "RECIPE") return;
  const techCardsPath = canonicalTechCardForOwner("espresso-menu", source.recipes);
  assert.strictEqual(menuPath.recipe, techCardsPath);
  assert.equal(techCardsPath?.id, "recipe-espresso");
  ((techCardsPath?.ingredients as JsonRecord[]) ?? [])[0].quantity = 9;
  const reloaded = persisted(source);
  const fromMenu = resolveMenuConsumption((reloaded.menuItems as JsonRecord[])[2], reloaded, { venueId: 1 });
  const fromTechCards = canonicalTechCardForOwner("espresso-menu", reloaded.recipes);
  assert.equal(fromMenu.ok && fromMenu.mode === "RECIPE" ? fromMenu.recipe.id : null, "recipe-espresso");
  assert.equal(((fromTechCards?.ingredients as JsonRecord[]) ?? [])[0].quantity, 9);
  assert.equal((reloaded.recipes as JsonRecord[]).length, 1);
  assert.equal("readyProduct" in (reloaded.menuItems as JsonRecord[])[2], false);
});

test("switching DIRECT_ITEM to RECIPE keeps legacy config and immutable historical snapshots", () => {
  const source = persisted(fixture());
  const first = postSale(source, "kozel-menu", "Kozel Dark 0.5", 1, "before-switch");
  const frozenBatch = JSON.stringify(first.posted.batch);
  const frozenMovement = JSON.stringify(first.posted.stockMovements.find((movement) => movement.type === "sale_consumption"));
  const switched = structuredClone(first.posted.assortment) as JsonRecord;
  const item = (switched.menuItems as JsonRecord[]).find((candidate) => candidate.id === "kozel-menu")!;
  item.consumptionMode = "RECIPE";
  (switched.recipes as JsonRecord[]).push({
    id: "recipe-kozel-new", menuItemId: "kozel-menu", ownerId: "kozel-menu", venueId: 1,
    status: "confirmed", reviewStatus: "approved", current: true, ingredients: [{
      id: "kozel-coffee", nomenclatureItemId: "nom-coffee", purchaseProductKey: "stock-coffee",
      name: "Coffee beans", quantity: 8, unit: "g", normalizedQuantity: 8, normalizedUnit: "g", venueId: 1,
    }],
  });
  assert.deepEqual(changedConsumptionModeIssues(first.posted.assortment, switched, 1), []);
  const persistedSwitch = persisted(switched);
  assert.equal("readyProduct" in ((persistedSwitch.menuItems as JsonRecord[]).find((candidate) => candidate.id === "kozel-menu")!), true);

  const secondSaved = createSale(persistedSwitch, "kozel-menu", "Kozel Dark 0.5", 1, "after-switch");
  assert.equal(secondSaved.ok, true);
  if (!secondSaved.ok) return;
  const second = postSalesBatch({
    batches: secondSaved.batches, batchId: secondSaved.batch.id, assortment: persistedSwitch, mappings: [], warehouseRoutes: [],
    stockMovements: first.posted.stockMovements, venueId: 1, actor, now: "2026-09-06T13:00:00.000Z",
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.batch.lines[0].recipeSnapshot?.consumptionMode, "RECIPE");
  assert.deepEqual(second.stockMovements.filter((movement) => movement.type === "sale_consumption" && movement.salesBatchId === second.batch.id).map((movement) => movement.productKey), ["stock-coffee"]);
  assert.equal(balance(second.assortment, "stock-kozel").current, 23);
  assert.equal(JSON.stringify(first.posted.batch), frozenBatch);
  assert.equal(JSON.stringify(first.posted.stockMovements.find((movement) => movement.type === "sale_consumption")), frozenMovement);
});

test("legacy dual source is read-only NEEDS_REVIEW and never posts arbitrarily", () => {
  const source = fixture();
  const item = (source.menuItems as JsonRecord[])[0];
  delete item.consumptionMode;
  (source.recipes as JsonRecord[]).push({
    id: "legacy-kozel-recipe", menuItemId: "kozel-menu", ownerId: "kozel-menu", venueId: 1,
    status: "confirmed", reviewStatus: "approved", current: true,
    ingredients: [{ id: "legacy-coffee", name: "Coffee beans", quantity: 8, unit: "g", purchaseProductKey: "stock-coffee" }],
  });
  const before = JSON.stringify(source);
  const review = legacyConsumptionConflicts(source, 1);
  assert.equal(review.total, 1);
  assert.deepEqual(review.items[0].reasons, ["DIRECT_AND_RECIPE"]);
  const resolution = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
  assert.equal(resolution.ok, false);
  assert.equal(!resolution.ok ? resolution.code : null, "CONSUMPTION_MODE_NEEDS_REVIEW");
  const reconciled = reconcileTechCards({ assortment: source, venueId: 1, now: new Date("2026-09-06T00:00:00.000Z") });
  assert.equal(JSON.stringify(source), before);
  assert.equal((reconciled.assortment.recipes as JsonRecord[]).some((recipe) => recipe.id === "legacy-kozel-recipe" && recipe.lifecycleStatus === "superseded"), false);
  const saved = createSale(source, "kozel-menu", "Kozel Dark 0.5", 1, "legacy-conflict");
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.batch.lines[0].processingStatus, "BLOCKED");
  assert.equal(saved.batch.lines[0].errorCode, "CONSUMPTION_MODE_NEEDS_REVIEW");
  const blocked = postSalesBatch({ batches: saved.batches, batchId: saved.batch.id, assortment: source, mappings: [], warehouseRoutes: [], stockMovements: receipts, venueId: 1, actor });
  assert.equal(blocked.ok, false);
  assert.equal(!blocked.ok ? blocked.code : null, "SALES_BATCH_BLOCKED");
});

test("server resolver rejects invalid, conflicting and cross-venue configurations", () => {
  const source = fixture();
  const item = (source.menuItems as JsonRecord[])[0];
  const code = (candidate: JsonRecord, candidateSource: JsonRecord = source) => {
    const result = resolveMenuConsumption(candidate, candidateSource, { venueId: 1 });
    assert.equal(result.ok, false);
    return !result.ok ? result.code : "";
  };
  assert.equal(code({ ...item, consumptionMode: "SOMETHING_ELSE" }), "CONSUMPTION_MODE_INVALID");
  assert.equal(code({ ...item, readyProduct: { productKey: "stock-kozel" } }), "CONSUMPTION_REFERENCE_REQUIRED");
  assert.equal(code({ ...item, readyProduct: { nomenclatureItemId: "nom-kozel", productKey: "stock-coffee" } }), "CONSUMPTION_REFERENCE_MISMATCH");
  assert.equal(code({ ...(source.menuItems as JsonRecord[])[1], saleSize: { quantity: 0, unit: "l" } }), "CONSUMPTION_QUANTITY_INVALID");
  assert.equal(code({ ...(source.menuItems as JsonRecord[])[1], saleSize: { quantity: 50, unit: "g" } }), "CONSUMPTION_UNIT_INVALID");
  assert.equal(code({ id: "missing-recipe", venueId: 1, consumptionMode: "RECIPE" }), "CONSUMPTION_RECIPE_REQUIRED");

  const duplicateRecipes = structuredClone(source) as JsonRecord;
  (duplicateRecipes.recipes as JsonRecord[]).push({ ...(duplicateRecipes.recipes as JsonRecord[])[0], id: "recipe-espresso-2" });
  assert.equal(code((duplicateRecipes.menuItems as JsonRecord[])[2], duplicateRecipes), "CONSUMPTION_MODE_CONFLICT");

  const incomplete = structuredClone(source) as JsonRecord;
  delete ((incomplete.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0].nomenclatureItemId;
  assert.equal(code((incomplete.menuItems as JsonRecord[])[2], incomplete), "CONSUMPTION_RECIPE_INCOMPLETE");

  const foreign = structuredClone(source) as JsonRecord;
  (foreign.nomenclature as JsonRecord[])[0].venueId = 2;
  assert.equal(code((foreign.menuItems as JsonRecord[])[0], foreign), "CONSUMPTION_VENUE_MISMATCH");
});

test("legacy conflicts stay blocked even when the competing recipe is not approved", () => {
  for (const reviewStatus of ["requires_review", "ai_draft"]) {
    const source = fixture();
    const item = (source.menuItems as JsonRecord[])[0];
    delete item.consumptionMode;
    (source.recipes as JsonRecord[]).push({
      id: `legacy-${reviewStatus}`,
      menuItemId: "kozel-menu",
      ownerId: "kozel-menu",
      venueId: 1,
      status: "confirmed",
      reviewStatus,
      current: true,
      ingredients: [],
    });
    const result = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
    assert.equal(result.ok, false);
    assert.equal(!result.ok ? result.code : null, "CONSUMPTION_MODE_NEEDS_REVIEW");
  }

  const serviceSource = fixture();
  const service = (serviceSource.menuItems as JsonRecord[])[3];
  delete service.consumptionMode;
  (serviceSource.recipes as JsonRecord[]).push({
    id: "legacy-service-recipe",
    menuItemId: "ticket-menu",
    ownerId: "ticket-menu",
    venueId: 1,
    status: "confirmed",
    reviewStatus: "requires_review",
    current: true,
    ingredients: [],
  });
  const serviceResult = resolveMenuConsumption(service, serviceSource, { venueId: 1, forPosting: true });
  assert.equal(serviceResult.ok, false);
  assert.equal(!serviceResult.ok ? serviceResult.code : null, "CONSUMPTION_MODE_NEEDS_REVIEW");
});

test("legacy direct links cannot resolve through a same-key product from another venue", () => {
  const source = fixture();
  const item = (source.menuItems as JsonRecord[])[0];
  delete item.consumptionMode;
  item.readyProduct = { nomenclatureItemId: "foreign-kozel", productKey: "stock-kozel", packagesPerSale: 1 };
  (source.nomenclature as JsonRecord[]).unshift({
    id: "foreign-kozel",
    productKey: "stock-kozel",
    name: "Foreign Kozel",
    unit: "pcs",
    venueId: 2,
    active: true,
  });
  const result = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
  assert.equal(result.ok, false);
  assert.equal(!result.ok ? result.code : null, "CONSUMPTION_VENUE_MISMATCH");
});

test("id-less duplicate recipes are detected as a changed server-side conflict", () => {
  const before = fixture();
  const after = structuredClone(before) as JsonRecord;
  after.recipes = [{
    menuItemId: "espresso-menu",
    ownerId: "espresso-menu",
    venueId: 1,
    status: "confirmed",
    reviewStatus: "approved",
    current: true,
    ingredients: (before.recipes as JsonRecord[])[0].ingredients,
  }, {
    menuItemId: "espresso-menu",
    ownerId: "espresso-menu",
    venueId: 1,
    status: "confirmed",
    reviewStatus: "approved",
    current: true,
    ingredients: (before.recipes as JsonRecord[])[0].ingredients,
  }];
  const issues = changedConsumptionModeIssues(before, after, 1);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "CONSUMPTION_MODE_CONFLICT");
});

test("archive guards are venue-scoped and cover ID-only recipe and legacy menu links", () => {
  const recipeBlocked = archiveInventoryProduct({
    assortment: {
      stockBalances: [{ id: "balance-local", nomenclatureItemId: "nom-local", productKey: "shared-key", unit: "pcs", current: 0, venueId: 1 }],
      nomenclature: [{ id: "nom-local", productKey: "shared-key", unit: "pcs", venueId: 1, active: true }],
      recipes: [{ id: "recipe", venueId: 1, current: true, ingredients: [{ nomenclatureItemId: "nom-local", venueId: 1 }] }],
      menuItems: [],
    },
    productKey: "shared-key",
    venueId: 1,
  });
  assert.equal(recipeBlocked.code, "PRODUCT_IN_USE");
  assert.equal(recipeBlocked.linkedRecipes, 1);

  const menuBlocked = archiveInventoryProduct({
    assortment: {
      stockBalances: [{ id: "balance-local", nomenclatureItemId: "nom-local", productKey: "shared-key", unit: "pcs", current: 0, venueId: 1 }],
      nomenclature: [{ id: "nom-local", productKey: "shared-key", unit: "pcs", venueId: 1, active: true }],
      recipes: [],
      menuItems: [{ id: "legacy-menu", venueId: 1, active: true, readyProductKey: "shared-key" }],
    },
    productKey: "shared-key",
    venueId: 1,
  });
  assert.equal(menuBlocked.code, "PRODUCT_IN_USE");
  assert.equal(menuBlocked.linkedMenuItems, 1);

  const scoped = archiveInventoryProduct({
    assortment: {
      stockBalances: [
        { id: "foreign", productKey: "shared-key", unit: "pcs", current: 0, venueId: 2, active: true },
        { id: "local", productKey: "shared-key", unit: "pcs", current: 0, venueId: 1, active: true },
      ],
      nomenclature: [],
      recipes: [],
      menuItems: [],
    },
    productKey: "shared-key",
    venueId: 1,
  });
  assert.equal(scoped.ok, true);
  const balances = scoped.assortment.stockBalances as JsonRecord[];
  assert.equal(balances.find((value) => value.id === "local")?.archived, true);
  assert.equal(balances.find((value) => value.id === "foreign")?.active, true);
  assert.deepEqual(scoped.assortment.archivedInventoryProductKeys, []);
});

test("recipe validation and sale snapshots share one canonical quantity resolver", () => {
  const source = fixture();
  const ingredient = ((source.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0];
  ingredient.quantity = 100;
  ingredient.unit = "g";
  ingredient.normalizedQuantity = 8;
  ingredient.normalizedUnit = "g";
  ingredient.unitResolutionStatus = "requires_review";

  const menuItem = (source.menuItems as JsonRecord[])[2];
  const rawResolution = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(rawResolution.ok, true);
  const rawSale = postSale(persisted(source), "espresso-menu", "Espresso", 1, "raw-quantity-sale");
  assert.equal(rawSale.saved.batch.lines[0].recipeSnapshot?.ingredients[0].baseQuantityPerPortion, 100);
  assert.equal(balance(rawSale.posted.assortment, "stock-coffee").current, 900);

  ingredient.unitResolutionStatus = "exact_compatible";
  const normalizedResolution = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(normalizedResolution.ok, true);
  const normalizedSale = postSale(persisted(source), "espresso-menu", "Espresso", 1, "normalized-quantity-sale");
  assert.equal(normalizedSale.saved.batch.lines[0].recipeSnapshot?.ingredients[0].baseQuantityPerPortion, 8);
  assert.equal(balance(normalizedSale.posted.assortment, "stock-coffee").current, 992);
});

test("all posting-relevant menu and ingredient mutations trigger server revalidation", () => {
  const beforeVenue = fixture();
  const afterVenue = structuredClone(beforeVenue) as JsonRecord;
  (afterVenue.menuItems as JsonRecord[])[0].venueId = 2;
  assert.equal(changedConsumptionModeIssues(beforeVenue, afterVenue, 1)[0]?.code, "CONSUMPTION_VENUE_MISMATCH");

  const beforeLegacy = fixture();
  const legacyItem = (beforeLegacy.menuItems as JsonRecord[])[0];
  delete legacyItem.consumptionMode;
  delete legacyItem.readyProduct;
  legacyItem.nomenclatureItemId = "nom-kozel";
  legacyItem.readyProductKey = "stock-kozel";
  const afterLegacy = structuredClone(beforeLegacy) as JsonRecord;
  (afterLegacy.menuItems as JsonRecord[])[0].nomenclatureItemId = "foreign-kozel";
  (afterLegacy.nomenclature as JsonRecord[]).push({
    id: "foreign-kozel", productKey: "stock-kozel", name: "Foreign Kozel", unit: "pcs", venueId: 2, active: true,
  });
  assert.equal(changedConsumptionModeIssues(beforeLegacy, afterLegacy, 1)[0]?.code, "CONSUMPTION_VENUE_MISMATCH");

  const beforeIngredient = fixture();
  const beforeRow = ((beforeIngredient.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0];
  beforeRow.quantity = 1;
  beforeRow.unit = "l";
  beforeRow.normalizedQuantity = 8;
  beforeRow.normalizedUnit = "g";
  beforeRow.unitResolutionStatus = "exact_compatible";
  const afterIngredient = structuredClone(beforeIngredient) as JsonRecord;
  const afterRow = ((afterIngredient.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0];
  afterRow.unitResolutionStatus = "requires_review";
  afterRow.resolutionStatus = "linked_unit_review";
  assert.equal(changedConsumptionModeIssues(beforeIngredient, afterIngredient, 1)[0]?.code, "CONSUMPTION_UNIT_INVALID");

  const beforeKey = fixture();
  const beforeKeyRow = ((beforeKey.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0];
  delete beforeKeyRow.purchaseProductKey;
  const afterKey = structuredClone(beforeKey) as JsonRecord;
  ((afterKey.recipes as JsonRecord[])[0].ingredients as JsonRecord[])[0].productKey = "stock-kozel";
  assert.equal(changedConsumptionModeIssues(beforeKey, afterKey, 1)[0]?.code, "CONSUMPTION_REFERENCE_MISMATCH");
});

test("linked nomenclature mutations revalidate consumers without blocking unchanged legacy review data", () => {
  const cases: Array<(source: JsonRecord) => void> = [
    (source) => {
      ((source.nomenclature as JsonRecord[])[0]).unit = "g";
    },
    (source) => {
      ((source.nomenclature as JsonRecord[])[0]).productKey = "redirected-stock";
    },
    (source) => {
      ((source.nomenclature as JsonRecord[])[0]).archived = true;
      ((source.stockBalances as JsonRecord[])[0]).archived = true;
    },
    (source) => {
      source.nomenclature = (source.nomenclature as JsonRecord[]).filter((item) => item.id !== "nom-kozel");
      source.stockBalances = (source.stockBalances as JsonRecord[]).filter((item) => item.nomenclatureItemId !== "nom-kozel");
    },
  ];
  for (const mutate of cases) {
    const before = fixture();
    const after = structuredClone(before) as JsonRecord;
    mutate(after);
    const issues = changedConsumptionModeIssues(before, after, 1);
    assert.ok(issues.some((issue) => issue.menuItemId === "kozel-menu"));
  }

  const legacy = fixture();
  const legacyMenu = (legacy.menuItems as JsonRecord[])[0];
  delete legacyMenu.consumptionMode;
  (legacy.recipes as JsonRecord[]).push({
    id: "legacy-kozel-card",
    menuItemId: "kozel-menu",
    ownerId: "kozel-menu",
    venueId: 1,
    current: true,
    status: "draft",
    reviewStatus: "requires_review",
    ingredients: [],
  });
  const unrelated = structuredClone(legacy) as JsonRecord;
  unrelated.updatedAt = "2026-09-08T12:00:00.000Z";
  assert.deepEqual(changedConsumptionModeIssues(legacy, unrelated, 1), []);
});

test("legacy exact IDs never fall back to a same-text key from another venue", () => {
  const source = fixture();
  const item = (source.menuItems as JsonRecord[])[0];
  delete item.consumptionMode;
  item.readyProduct = { nomenclatureItemId: "shared", productKey: "shared", packagesPerSale: 1 };
  (source.nomenclature as JsonRecord[]).unshift({
    id: "shared", productKey: "foreign-stock", name: "Foreign exact ID", unit: "pcs", venueId: 2, active: true,
  });
  (source.nomenclature as JsonRecord[]).push({
    id: "local-shared", productKey: "shared", name: "Local same-text key", unit: "pcs", venueId: 1, active: true,
  });
  const result = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
  assert.equal(result.ok, false);
  assert.equal(!result.ok ? result.code : null, "CONSUMPTION_VENUE_MISMATCH");
});

test("legacy conflict report includes current draft recipes blocked by runtime", () => {
  const source = fixture();
  const item = (source.menuItems as JsonRecord[])[0];
  delete item.consumptionMode;
  (source.recipes as JsonRecord[]).push({
    id: "legacy-current-draft", menuItemId: "kozel-menu", ownerId: "kozel-menu", venueId: 1,
    status: "draft", reviewStatus: "requires_review", current: true, lifecycleStatus: "current", ingredients: [],
  });
  const report = legacyConsumptionConflicts(source, 1);
  assert.equal(report.total, 1);
  assert.deepEqual(report.items[0].reasons, ["DIRECT_AND_RECIPE"]);
  const runtime = resolveMenuConsumption(item, source, { venueId: 1, forPosting: true });
  assert.equal(runtime.ok, false);
  assert.equal(!runtime.ok ? runtime.code : null, "CONSUMPTION_MODE_NEEDS_REVIEW");
});

test("archive rejects empty targets and preserves global keys shared through aliases", () => {
  const malformed = {
    stockBalances: [{ id: "malformed", productKey: "", unit: "pcs", current: 0, venueId: 1, active: true }],
    nomenclature: [], recipes: [], menuItems: [],
  };
  const before = JSON.stringify(malformed);
  const empty = archiveInventoryProduct({ assortment: malformed, productKey: "", venueId: 1 });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, "PRODUCT_NOT_FOUND");
  assert.equal(JSON.stringify(malformed), before);

  const aliased = archiveInventoryProduct({
    assortment: {
      stockBalances: [
        { id: "local", productKey: "canonical-shared", unit: "pcs", current: 0, venueId: 1, active: true },
        { id: "foreign", productKey: "foreign-alias", unit: "pcs", current: 0, venueId: 2, active: true },
      ],
      nomenclature: [], recipes: [], menuItems: [],
      inventoryProductAliases: [{ from: "foreign-alias", to: "canonical-shared" }],
    },
    productKey: "canonical-shared",
    venueId: 1,
  });
  assert.equal(aliased.ok, true);
  assert.deepEqual(aliased.assortment.archivedInventoryProductKeys, []);
  const balances = aliased.assortment.stockBalances as JsonRecord[];
  assert.equal(balances.find((value) => value.id === "local")?.archived, true);
  assert.equal(balances.find((value) => value.id === "foreign")?.active, true);
});

test("explicit current recipe stays canonical while newer inactive history is ignored", () => {
  const source = fixture();
  const active = (source.recipes as JsonRecord[])[0];
  active.updatedAt = "2026-09-01T10:00:00.000Z";
  (source.recipes as JsonRecord[]).push(
    {
      ...structuredClone(active),
      id: "recipe-espresso-newer-not-current",
      current: false,
      updatedAt: "2026-09-08T10:00:00.000Z",
    },
    {
      ...structuredClone(active),
      id: "recipe-espresso-inactive",
      current: true,
      lifecycleStatus: "inactive",
      updatedAt: "2026-09-09T10:00:00.000Z",
    },
  );
  const menuItem = (source.menuItems as JsonRecord[])[2];

  const initial = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(initial.ok, true);
  assert.equal(initial.ok && initial.mode === "RECIPE" ? initial.recipe.id : null, "recipe-espresso");

  const reconciled = reconcileTechCards({
    assortment: source,
    venueId: 1,
    now: new Date("2026-09-08T11:00:00.000Z"),
  }).assortment;
  const reloaded = resolveMenuConsumption(menuItem, persisted(reconciled), { venueId: 1, forPosting: true });
  assert.equal(reloaded.ok, true);
  assert.equal(reloaded.ok && reloaded.mode === "RECIPE" ? reloaded.recipe.id : null, "recipe-espresso");
  const recipes = reconciled.recipes as JsonRecord[];
  assert.equal(recipes.find((recipe) => recipe.id === "recipe-espresso-newer-not-current")?.current, false);
  assert.equal(recipes.find((recipe) => recipe.id === "recipe-espresso-inactive")?.lifecycleStatus, "inactive");
});

test("distinct active approved or draft recipes remain a controlled legacy NEEDS_REVIEW state", () => {
  for (const kind of ["approved", "draft"] as const) {
    const source = fixture();
    const menuItem = (source.menuItems as JsonRecord[])[2];
    delete menuItem.consumptionMode;
    const base = structuredClone((source.recipes as JsonRecord[])[0]);
    delete base.current;
    if (kind === "draft") {
      base.status = "draft";
      base.reviewStatus = "requires_review";
      base.source = "manual";
    }
    source.recipes = [
      { ...structuredClone(base), id: `${kind}-recipe-a`, idempotencyKey: `${kind}:a` },
      { ...structuredClone(base), id: `${kind}-recipe-b`, idempotencyKey: `${kind}:b` },
    ];

    const initial = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
    assert.equal(initial.ok, false, kind);
    assert.equal(!initial.ok ? initial.status : null, "NEEDS_REVIEW", kind);
    assert.equal(!initial.ok ? initial.code : null, "CONSUMPTION_MODE_NEEDS_REVIEW", kind);
    assert.deepEqual(legacyConsumptionConflicts(source, 1).items[0]?.reasons, ["MULTIPLE_ACTIVE_RECIPES"]);

    const reconciled = reconcileTechCards({
      assortment: source,
      venueId: 1,
      now: new Date("2026-09-08T11:00:00.000Z"),
    }).assortment;
    const persistedRecipes = reconciled.recipes as JsonRecord[];
    assert.equal(persistedRecipes.length, 2, kind);
    assert.equal(persistedRecipes.some((recipe) => recipe.lifecycleStatus === "superseded"), false, kind);
    const afterReload = resolveMenuConsumption(menuItem, persisted(reconciled), { venueId: 1, forPosting: true });
    assert.equal(afterReload.ok, false, kind);
    assert.equal(!afterReload.ok ? afterReload.status : null, "NEEDS_REVIEW", kind);
  }
});

test("explicit RECIPE conflicts are preserved for review instead of auto-superseded", () => {
  const source = fixture();
  const menuItem = (source.menuItems as JsonRecord[])[2];
  const original = (source.recipes as JsonRecord[])[0];
  source.recipes = [
    { ...structuredClone(original), id: "explicit-conflict-a", current: true },
    { ...structuredClone(original), id: "explicit-conflict-b", current: true },
  ];

  const initial = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(initial.ok, false);
  assert.equal(!initial.ok ? initial.code : null, "CONSUMPTION_MODE_CONFLICT");

  const reconciled = reconcileTechCards({
    assortment: source,
    venueId: 1,
    now: new Date("2026-09-08T11:00:00.000Z"),
  }).assortment;
  const persistedRecipes = reconciled.recipes as JsonRecord[];
  assert.equal(persistedRecipes.length, 2);
  assert.equal(persistedRecipes.every((recipe) => recipe.current === true), true);
  assert.equal(persistedRecipes.some((recipe) => recipe.lifecycleStatus === "superseded"), false);

  const afterReload = resolveMenuConsumption(menuItem, persisted(reconciled), { venueId: 1, forPosting: true });
  assert.equal(afterReload.ok, false);
  assert.equal(!afterReload.ok ? afterReload.code : null, "CONSUMPTION_MODE_CONFLICT");
});

test("approved recipe remains the posting source while a distinct AI draft is retained for review", () => {
  const source = fixture();
  const approved = (source.recipes as JsonRecord[])[0];
  delete approved.current;
  approved.source = "manual";
  approved.updatedAt = "2026-09-01T10:00:00.000Z";
  (source.recipes as JsonRecord[]).push({
    ...structuredClone(approved),
    id: "recipe-espresso-ai-draft",
    status: "draft",
    reviewStatus: "ai_draft",
    source: "ai",
    idempotencyKey: "ai:espresso:proposal",
    updatedAt: "2026-09-08T10:00:00.000Z",
  });
  const menuItem = (source.menuItems as JsonRecord[])[2];

  const initial = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(initial.ok, true);
  assert.equal(initial.ok && initial.mode === "RECIPE" ? initial.recipe.id : null, "recipe-espresso");

  const reconciled = reconcileTechCards({
    assortment: source,
    venueId: 1,
    now: new Date("2026-09-08T11:00:00.000Z"),
  }).assortment;
  const recipes = reconciled.recipes as JsonRecord[];
  const approvedAfter = recipes.find((recipe) => recipe.id === "recipe-espresso");
  const draftAfter = recipes.find((recipe) => recipe.id === "recipe-espresso-ai-draft");
  assert.equal(approvedAfter?.current, true);
  assert.equal(draftAfter?.current, false);
  assert.equal(draftAfter?.currentDraft, true);
  assert.equal(draftAfter?.lifecycleStatus, "draft");
  assert.equal(draftAfter?.reviewStatus, "ai_draft");

  const posting = resolveMenuConsumption(menuItem, persisted(reconciled), { venueId: 1, forPosting: true });
  assert.equal(posting.ok, true);
  assert.equal(posting.ok && posting.mode === "RECIPE" ? posting.recipe.id : null, "recipe-espresso");
});

test("explicit recipe snapshot cannot be redirected by an alias that shadows its nomenclature ID", () => {
  const source = fixture();
  (source.nomenclature as JsonRecord[]).push({
    id: "nom-decoy",
    productKey: "stock-decoy",
    name: "Decoy beans",
    unit: "g",
    venueId: 1,
    active: true,
  });
  (source.stockBalances as JsonRecord[]).push({
    id: "balance-decoy",
    nomenclatureItemId: "nom-decoy",
    productKey: "stock-decoy",
    name: "Decoy beans",
    unit: "g",
    current: 1_000,
    venueId: 1,
    currency: "RUB",
  });
  source.inventoryProductAliases = [{ from: "nom-coffee", to: "stock-decoy" }];

  const { saved, posted } = postSale(
    persisted(source),
    "espresso-menu",
    "Espresso",
    1,
    "exact-nomenclature-id-sale",
  );

  const snapshotIngredient = saved.batch.lines[0].recipeSnapshot?.ingredients[0];
  assert.equal(snapshotIngredient?.nomenclatureItemId, "nom-coffee");
  assert.equal(snapshotIngredient?.productKey, "stock-coffee");
  assert.equal(balance(posted.assortment, "stock-coffee").current, 992);
  assert.equal(balance(posted.assortment, "stock-decoy").current, 1_000);
  const movements = posted.stockMovements.filter((movement) =>
    movement.type === "sale_consumption" && movement.salesBatchId === posted.batch.id
  );
  assert.deepEqual(movements.map((movement) => movement.productKey), ["stock-coffee"]);
});

test("posting rejects two explicitly current recipes even when only one is approved", () => {
  const source = fixture();
  const approved = (source.recipes as JsonRecord[])[0];
  approved.current = true;
  (source.recipes as JsonRecord[]).push({
    ...structuredClone(approved),
    id: "recipe-espresso-current-draft",
    status: "draft",
    reviewStatus: "requires_review",
    source: "manual",
    current: true,
  });
  const menuItem = (source.menuItems as JsonRecord[])[2];

  const result = resolveMenuConsumption(menuItem, source, { venueId: 1, forPosting: true });
  assert.equal(result.ok, false);
  assert.equal(!result.ok ? result.code : null, "CONSUMPTION_MODE_CONFLICT");
});

test("duplicate menu item IDs are detected independent of first/last payload order", () => {
  const valid = { id: "duplicate-menu", venueId: 1, name: "Service", consumptionMode: "NONE" };
  const conflicting = {
    id: "duplicate-menu",
    venueId: 1,
    name: "Stock item",
    consumptionMode: "DIRECT_ITEM",
    readyProduct: { nomenclatureItemId: "missing" },
  };
  const separate = { id: "separate-menu", venueId: 1, name: "Separate", consumptionMode: "NONE" };

  for (const menuItems of [
    [valid, separate, conflicting],
    [conflicting, separate, valid],
  ]) {
    assert.deepEqual(duplicateMenuItemIds({ menuItems }), ["duplicate-menu"]);
  }
});

test("same explicit IDs and keys in another venue do not create a local recipe conflict or redirect links", () => {
  const source = fixture();
  (source.menuItems as JsonRecord[]).unshift({
    id: "espresso-menu",
    name: "Foreign espresso",
    venueId: 2,
    active: true,
    consumptionMode: "RECIPE",
  });
  (source.recipes as JsonRecord[]).unshift({
    id: "recipe-espresso",
    menuItemId: "espresso-menu",
    ownerId: "espresso-menu",
    venueId: 2,
    current: true,
    status: "confirmed",
    reviewStatus: "approved",
    ingredients: [{
      id: "coffee-line",
      nomenclatureItemId: "nom-coffee",
      purchaseProductKey: "stock-coffee",
      name: "Foreign coffee",
      quantity: 500,
      unit: "ml",
      venueId: 2,
    }],
  });
  (source.nomenclature as JsonRecord[]).unshift({
    id: "nom-coffee",
    productKey: "stock-coffee",
    name: "Foreign coffee",
    unit: "ml",
    venueId: 2,
    active: true,
  });
  (source.stockBalances as JsonRecord[]).unshift({
    id: "foreign-coffee-balance",
    nomenclatureItemId: "nom-coffee",
    productKey: "stock-coffee",
    name: "Foreign coffee",
    unit: "ml",
    current: 5_000,
    venueId: 2,
  });

  const localMenu = (source.menuItems as JsonRecord[]).find((item) =>
    item.id === "espresso-menu" && item.venueId === 1
  )!;
  const recipe = resolveMenuConsumption(localMenu, source, { venueId: 1, forPosting: true });
  assert.equal(recipe.ok, true);
  assert.equal(recipe.ok && recipe.mode === "RECIPE" ? recipe.recipe.venueId : null, 1);
  assert.equal(
    recipe.ok && recipe.mode === "RECIPE"
      ? (recipe.recipe.ingredients as JsonRecord[])[0]?.quantity
      : null,
    8,
  );

  const readyMenu = (source.menuItems as JsonRecord[]).find((item) =>
    item.id === "kozel-menu" && item.venueId === 1
  )!;
  (source.nomenclature as JsonRecord[]).unshift({
    id: "nom-kozel",
    productKey: "stock-kozel",
    name: "Foreign Kozel",
    unit: "g",
    venueId: 2,
    active: true,
  });
  const direct = resolveMenuConsumption(readyMenu, source, { venueId: 1, forPosting: true });
  assert.equal(direct.ok, true);
  assert.equal(direct.ok && direct.mode === "DIRECT_ITEM" ? direct.nomenclature.productName : null, "Пиво Kozel Dark бутылка 0.5");
  assert.equal(direct.ok && direct.mode === "DIRECT_ITEM" ? direct.nomenclature.baseUnit : null, "pcs");
});

test("menu ID uniqueness and changed-state validation use venue plus ID identity", () => {
  const local = { id: "shared-menu", venueId: 1, name: "Local", consumptionMode: "NONE" };
  const foreign = { id: "shared-menu", venueId: 2, name: "Foreign", consumptionMode: "NONE" };
  assert.deepEqual(duplicateMenuItemIds({ menuItems: [local, foreign] }), []);
  assert.deepEqual(duplicateMenuItemIds({ menuItems: [local, { ...local }] }), ["shared-menu"]);
  assert.deepEqual(duplicateMenuItemIds({ menuItems: [local, { ...foreign, venueId: undefined }] }), ["shared-menu"]);

  const before = { menuItems: [local, foreign], recipes: [] };
  const foreignOnlyChange = structuredClone(before) as JsonRecord;
  (foreignOnlyChange.menuItems as JsonRecord[])[1].consumptionMode = "INVALID";
  assert.deepEqual(changedConsumptionModeIssues(before, foreignOnlyChange, 1), []);

  const localChange = structuredClone(before) as JsonRecord;
  (localChange.menuItems as JsonRecord[])[0].consumptionMode = "INVALID";
  assert.equal(changedConsumptionModeIssues(before, localChange, 1)[0]?.code, "CONSUMPTION_MODE_INVALID");
});

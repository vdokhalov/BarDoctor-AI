import assert from "node:assert/strict";
import test from "node:test";
import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";
import {
  canonicalTechCardLifecycleStatus,
  canonicalTechCardForOwner,
  reconcileTechCards,
  validateTechCardVenueIsolation,
} from "../lib/bardoctor/tech-card-reconciliation";

const now = new Date("2026-08-23T12:00:00.000Z");

test("legacy approved labels normalize to the canonical confirmed lifecycle", () => {
  for (const status of ["approved", "APPROVED", "ready", "READY", "published", "confirmed"]) {
    assert.equal(canonicalTechCardLifecycleStatus(status), "confirmed");
  }
});

test("approved legacy cards survive refetch and feed the canonical KPI/filter status", () => {
  const assortment = baseAssortment();
  assortment.recipes = [approvedRecipe({ status: "APPROVED" })];
  const persisted = reconcileTechCards({ assortment, venueId: 1, now }).assortment;
  const refetched = reconcileTechCards({ assortment: persisted, venueId: 1, now }).assortment;
  const analytics = buildAssortmentAnalytics({ assortment: refetched, venueId: 1, now });
  const recipe = (refetched.recipes as Record<string, unknown>[])[0];
  assert.equal(recipe.status, "confirmed");
  assert.equal(recipe.reviewStatus, "approved");
  assert.equal(analytics.counts.confirmedRecipes, 1);
  assert.equal((analytics.recipes as Record<string, unknown>[])[0].techCardStatus, "approved");
});

function baseAssortment() {
  return {
    menuItems: [{
      id: "menu-1",
      sourceId: "pos-100",
      venueId: 1,
      name: "Джин-тоник",
      type: "composite",
      department: "bar",
      category: "Коктейли",
      salePrice: 180,
      currency: "RUB",
      active: true,
    }],
    nomenclature: [{
      id: "nom-1",
      sourceId: "stock-100",
      venueId: 1,
      productKey: "stock:gin|ml",
      name: "Джин",
      unit: "мл",
      active: true,
    }],
    stockBalances: [{
      id: "balance-1",
      venueId: 1,
      productKey: "stock:gin|ml",
      key: "stock:gin|ml",
      name: "Джин",
      unit: "ml",
      averageUnitCost: 0.5,
      currency: "RUB",
    }],
    recipes: [] as unknown[],
  };
}

function linkedIngredient(patch: Record<string, unknown> = {}) {
  return {
    id: "ingredient-1",
    name: "Джин",
    quantity: 50,
    unit: "мл",
    purchaseProductKey: "stock:gin|ml",
    ...patch,
  };
}

function approvedRecipe(patch: Record<string, unknown> = {}) {
  return {
    id: "recipe-approved",
    menuItemId: "menu-1",
    venueId: 1,
    status: "confirmed",
    source: "manual",
    confirmedAt: "2026-08-20T10:00:00.000Z",
    ingredients: [linkedIngredient()],
    ...patch,
  };
}

function ginPurchase() {
  return {
    id: "purchase-gin",
    venueId: 1,
    status: "confirmed",
    documentType: "invoice",
    supplierName: "Поставщик джина",
    date: "2026-08-22",
    currency: "RUB",
    items: [{
      id: "purchase-line-gin",
      name: "Джин",
      purchaseProductKey: "stock:gin|ml",
      quantity: 1,
      unit: "л",
      lineTotal: 500,
    }],
  };
}

test("existing owner and AI generation produce one linked AI draft", () => {
  const assortment = baseAssortment();
  assortment.recipes = [{
    id: "ai-1",
    menuItemId: "menu-1",
    status: "draft",
    source: "ai",
    ingredients: [linkedIngredient()],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipe = (result.assortment.recipes as Record<string, unknown>[])[0];
  assert.equal(recipe.ownerId, "menu-1");
  assert.equal(recipe.ownerLinkStatus, "linked");
  assert.equal(recipe.reviewStatus, "ai_draft");
  assert.equal(recipe.currentDraft, true);
  assert.equal(result.report.autoLinked, 0);
});

test("legacy candidate keys resolve through canonical product aliases", () => {
  const assortment = Object.assign(baseAssortment(), {
    inventoryProductAliases: [{ from: "legacy:gin", to: "stock:gin|ml" }],
  });
  assortment.nomenclature[0].productKey = "legacy:gin";
  assortment.recipes = [approvedRecipe({
    ingredients: [linkedIngredient({ purchaseProductKey: "stock:gin|ml" })],
  })];

  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipe = (result.assortment.recipes as Record<string, unknown>[])[0];
  const ingredient = (recipe.ingredients as Record<string, unknown>[])[0];

  assert.equal(ingredient.linkStatus, "linked");
  assert.equal(ingredient.resolutionStatus, "linked_ready");
});

test("approved manual card remains canonical and an AI draft cannot overwrite it", () => {
  const assortment = baseAssortment();
  assortment.recipes = [
    approvedRecipe(),
    {
      id: "ai-new",
      menuItemId: "menu-1",
      status: "draft",
      source: "ai",
      updatedAt: "2026-08-23T10:00:00.000Z",
      ingredients: [linkedIngredient({ id: "ingredient-ai" })],
    },
  ];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipes = result.assortment.recipes as Record<string, unknown>[];
  assert.equal(canonicalTechCardForOwner("menu-1", recipes)?.id, "recipe-approved");
  assert.equal(recipes.find((recipe) => recipe.id === "recipe-approved")?.current, true);
  assert.equal(recipes.find((recipe) => recipe.id === "ai-new")?.currentDraft, true);
  assert.equal(result.report.approvedManualProtected, 1);
});

test("duplicate AI generation leaves one active draft and preserves superseded history", () => {
  const assortment = baseAssortment();
  assortment.recipes = ["a", "b"].map((id) => ({
    id,
    idempotencyKey: "ai:menu-1:missing-tech-card",
    menuItemId: "menu-1",
    status: "draft",
    source: "ai",
    updatedAt: id === "b" ? "2026-08-23T11:00:00.000Z" : "2026-08-22T11:00:00.000Z",
    ingredients: [linkedIngredient({ id: `ingredient-${id}` })],
  }));
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipes = result.assortment.recipes as Record<string, unknown>[];
  assert.equal(recipes.filter((recipe) => recipe.currentDraft === true).length, 1);
  assert.equal(recipes.filter((recipe) => recipe.reviewStatus === "superseded").length, 1);
  assert.equal(result.report.duplicateCandidates, 1);
  assert.equal(result.report.aiDrafts, 1);
});

test("orphan, stable-ID match and ambiguous same-name match are classified safely", () => {
  const assortment = baseAssortment();
  assortment.menuItems.push({
    ...assortment.menuItems[0],
    id: "menu-2",
    sourceId: "pos-200",
  });
  assortment.recipes = [
    { id: "orphan", menuItemId: "missing", status: "draft", source: "ai", ingredients: [] },
    { id: "stable", ownerSourceId: "pos-100", status: "draft", source: "ai", ingredients: [] },
    { id: "ambiguous", menuItemName: "Джин-тоник", status: "draft", source: "ai", ingredients: [] },
  ];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipes = result.assortment.recipes as Record<string, unknown>[];
  assert.equal(recipes.find((recipe) => recipe.id === "orphan")?.ownerLinkStatus, "orphan");
  assert.equal(recipes.find((recipe) => recipe.id === "stable")?.menuItemId, "menu-1");
  assert.equal(recipes.find((recipe) => recipe.id === "stable")?.ownerLinkStatus, "auto_linked");
  assert.equal(recipes.find((recipe) => recipe.id === "ambiguous")?.ownerLinkStatus, "ambiguous");
});

test("same-name records never cross venue and backend validation rejects cross-venue links", () => {
  const assortment = baseAssortment();
  assortment.menuItems.push({
    ...assortment.menuItems[0],
    id: "menu-venue-2",
    sourceId: "pos-venue-2",
    venueId: 2,
  });
  assortment.recipes = [{
    id: "wrong-venue",
    menuItemId: "menu-venue-2",
    venueId: 2,
    status: "draft",
    source: "ai",
    ingredients: [],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  assert.equal((result.assortment.recipes as Record<string, unknown>[])[0].ownerLinkStatus, "wrong_venue");
  assert.ok(validateTechCardVenueIsolation(assortment, 1).length > 0);
});

test("explicit ingredient key from another venue is classified as wrong_venue", () => {
  const assortment = baseAssortment();
  assortment.nomenclature.push({
    id: "foreign-nom", sourceId: "foreign-source", productKey: "foreign-product", name: "Чужой товар",
    unit: "мл", venueId: 2, active: true,
  });
  assortment.recipes = [{
    id: "local-card", menuItemId: "menu-1", venueId: 1, status: "draft", source: "ai",
    ingredients: [{ id: "foreign-link", name: "Чужой товар", unit: "мл", quantity: 10, purchaseProductKey: "foreign-product" }],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipe = (result.assortment.recipes as Record<string, unknown>[])[0];
  const ingredient = (recipe.ingredients as Record<string, unknown>[])[0];
  assert.equal(ingredient.linkStatus, "wrong_venue");
  assert.equal(result.report.crossVenueIngredientLinksRejected > 0, true);
  assert.ok(validateTechCardVenueIsolation(assortment, 1).some((issue) =>
    issue.code === "TECH_CARD_INGREDIENT_WRONG_VENUE"
  ));
});

test("ingredient reconciliation links stable and unique name+unit matches but never guesses ambiguous or missing lines", () => {
  const assortment = baseAssortment();
  assortment.nomenclature.push({
    id: "nom-duplicate",
    sourceId: "stock-duplicate-1",
    venueId: 1,
    productKey: "stock:gin-premium|ml",
    name: "Джин премиум",
    unit: "мл",
    active: true,
  });
  assortment.nomenclature.push({
    id: "nom-duplicate-2",
    sourceId: "stock-duplicate-2",
    venueId: 1,
    productKey: "stock:gin-premium-2|ml",
    name: "Джин премиум",
    unit: "мл",
    active: true,
  });
  assortment.recipes = [{
    id: "ingredients",
    menuItemId: "menu-1",
    status: "draft",
    source: "ai",
    ingredients: [
      linkedIngredient(),
      { id: "unique", name: "Джин", quantity: 50, unit: "мл" },
      { id: "ambiguous", name: "Джин премиум", quantity: 50, unit: "мл" },
      { id: "missing", name: "Несуществующий сироп", quantity: 10, unit: "мл" },
    ],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const ingredients = ((result.assortment.recipes as Record<string, unknown>[])[0].ingredients as Record<string, unknown>[]);
  assert.equal(ingredients.find((item) => item.id === "ingredient-1")?.linkStatus, "linked");
  assert.equal(ingredients.find((item) => item.id === "unique")?.linkStatus, "auto_linked");
  assert.equal(ingredients.find((item) => item.id === "ambiguous")?.linkStatus, "ambiguous");
  assert.equal(ingredients.find((item) => item.id === "missing")?.linkStatus, "missing");
  assert.equal(ingredients.find((item) => item.id === "missing")?.purchaseProductKey, undefined);
});

test("valid units calculate cost; invalid conversion and missing price stay incomplete instead of zero", () => {
  const assortment = baseAssortment();
  assortment.recipes = [approvedRecipe()];
  const analytics = buildAssortmentAnalytics({
    assortment,
    purchaseDocuments: [ginPurchase()],
    venueId: 1,
    now,
  });
  assert.equal(analytics.menuItems[0].recipeCost, 25);
  assert.equal(analytics.menuItems[0].techCardStatus, "approved");

  const invalid = baseAssortment();
  invalid.recipes = [approvedRecipe({ ingredients: [linkedIngredient({ unit: "ведро" })] })];
  const invalidAnalytics = buildAssortmentAnalytics({
    assortment: invalid,
    purchaseDocuments: [ginPurchase()],
    venueId: 1,
    now,
  });
  assert.equal(invalidAnalytics.menuItems[0].recipeCost, null);
  assert.equal(invalidAnalytics.menuItems[0].techCardStatus, "requires_review");
  assert.equal(invalidAnalytics.counts.invalidUnits, 1);

  const missingPrice = baseAssortment();
  missingPrice.stockBalances = [{
    ...missingPrice.stockBalances[0],
    averageUnitCost: 0,
  }];
  missingPrice.recipes = [approvedRecipe()];
  const missingPriceAnalytics = buildAssortmentAnalytics({ assortment: missingPrice, venueId: 1, now });
  assert.equal(missingPriceAnalytics.menuItems[0].recipeCost, null);
  assert.equal(missingPriceAnalytics.menuItems[0].missingPriceCount, 1);
});

test("Data Quality separates missing, AI draft, review and approved cards", () => {
  const approved = baseAssortment();
  approved.recipes = [approvedRecipe()];
  const approvedAnalytics = buildAssortmentAnalytics({ assortment: approved, venueId: 1, now });
  assert.equal(approvedAnalytics.counts.missingRecipes, 0);
  assert.equal(approvedAnalytics.counts.confirmedRecipes, 1);

  const draft = baseAssortment();
  draft.recipes = [{
    id: "ai-draft",
    menuItemId: "menu-1",
    status: "draft",
    source: "ai",
    ingredients: [linkedIngredient()],
  }];
  const draftAnalytics = buildAssortmentAnalytics({ assortment: draft, venueId: 1, now });
  assert.equal(draftAnalytics.counts.missingRecipes, 0);
  assert.equal(draftAnalytics.counts.aiDraftRecipes, 1);
  assert.equal(draftAnalytics.counts.confirmedRecipes, 0);
});

test("old cards remain accessible and item detail read model exposes status, source and version", () => {
  const assortment = baseAssortment();
  assortment.recipes = [
    approvedRecipe({ id: "approved-v2", version: 2 }),
    approvedRecipe({
      id: "approved-v1",
      version: 1,
      confirmedAt: "2026-08-01T10:00:00.000Z",
    }),
  ];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  assert.equal((result.assortment.recipes as unknown[]).length, 2);
  const analytics = buildAssortmentAnalytics({ assortment: result.assortment, venueId: 1, now });
  assert.equal(analytics.menuItems[0].recipeId, "approved-v2");
  assert.equal(analytics.menuItems[0].techCardSource, "manual");
  assert.equal(analytics.menuItems[0].techCardVersion, 2);
  assert.equal(analytics.techCardReconciliation.superseded, 1);
});

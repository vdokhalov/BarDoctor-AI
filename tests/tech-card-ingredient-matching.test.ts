import assert from "node:assert/strict";
import test from "node:test";
import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";
import {
  collectIngredientMatchCandidates,
  evaluateIngredientMatching,
  normalizeIngredientIdentity,
  rankIngredientCandidates,
  reconcileIngredientQuantity,
  rememberConfirmedIngredientAliases,
} from "../lib/bardoctor/tech-card-ingredient-matching";
import { reconcileTechCards } from "../lib/bardoctor/tech-card-reconciliation";

const now = new Date("2026-08-23T12:00:00.000Z");

function assortmentWith(items: Array<Record<string, unknown>>) {
  return {
    menuItems: [{ id: "dish", name: "Сырная тарелка", type: "composite", active: true, venueId: 1, salePrice: 300, currency: "RUB" }],
    nomenclature: items.map((item, index) => ({
      id: `nom-${index}`,
      venueId: 1,
      active: true,
      unit: "кг",
      ...item,
    })),
    stockBalances: items.map((item, index) => ({
      id: `stock-${index}`,
      venueId: 1,
      key: item.productKey,
      productKey: item.productKey,
      name: item.name,
      unit: "g",
      averageUnitCost: 0.8,
      currency: "RUB",
      ...item,
    })),
    recipes: [] as unknown[],
  };
}

function candidates(assortment: unknown, purchaseDocuments: unknown[] = []) {
  return collectIngredientMatchCandidates({ assortment, purchaseDocuments, venueId: 1 }).candidates;
}

function decide(name: string, assortment: unknown, unit = "г", purchaseDocuments: unknown[] = []) {
  return rankIngredientCandidates({
    ingredient: { name, quantity: 100, unit },
    candidates: candidates(assortment, purchaseDocuments),
    assortment,
    venueId: 1,
    now,
  });
}

test("canonical normalization ignores word order, punctuation, case and safe morphology", () => {
  const variants = ["ГОЛЛАНДСКИЙ СЫР", "Сыр Голландский", "сыр \"голландская\"", "СЫР  ГОЛЛАНДСКИЙ"];
  const normalized = variants.map((value) => normalizeIngredientIdentity(value).normalized);
  assert.equal(new Set(normalized).size, 1);
});

test("Голландский сыр and Сыр Голландский are HIGH and auto-link safely", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl" }]);
  const decision = decide("Голландский сыр", assortment);
  assert.equal(decision.tier, "high");
  assert.equal(decision.candidate?.productKey, "cheese:nl");
});

test("Российский сыр and Сыр Российский are HIGH regardless of word order", () => {
  const assortment = assortmentWith([{ name: "Сыр Российский", productKey: "cheese:ru" }]);
  const decision = decide("Российский сыр", assortment);
  assert.equal(decision.tier, "high");
  assert.equal(decision.candidate?.productKey, "cheese:ru");
});

test("Моцарелла and one compatible Сыр Моцарелла candidate are HIGH", () => {
  const assortment = assortmentWith([{ name: "Сыр Моцарелла", productKey: "cheese:mozzarella" }]);
  const decision = decide("Моцарелла", assortment);
  assert.equal(decision.tier, "high");
  assert.equal(decision.candidate?.productKey, "cheese:mozzarella");
});

test("multiple mozzarella variants produce review suggestions instead of auto-link", () => {
  const assortment = assortmentWith([
    { name: "Моцарелла мини", productKey: "cheese:mini" },
    { name: "Моцарелла для пиццы", productKey: "cheese:pizza" },
  ]);
  const decision = decide("Моцарелла", assortment);
  assert.equal(decision.tier, "medium");
  assert.equal(decision.candidate, null);
  assert.ok(decision.suggestions.length >= 1);
});

test("cream fat variants are ambiguous and never auto-link from a generic ingredient", () => {
  const assortment = assortmentWith([
    { name: "Сливки 10%", productKey: "cream:10" },
    { name: "Сливки 33%", productKey: "cream:33" },
  ]);
  const decision = decide("Сливки", assortment);
  assert.equal(decision.tier, "medium");
  assert.equal(decision.candidate, null);
  assert.equal(decision.duplicateCandidateCase, true);
});

test("generic product names do not guess a specific subtype", () => {
  for (const [ingredient, candidate] of [
    ["Масло", "Масло сливочное"],
    ["Перец", "Перец чёрный"],
    ["Сыр", "Сыр Пармезан"],
    ["Говядина", "Вырезка говяжья"],
  ]) {
    const assortment = assortmentWith([{ name: candidate, productKey: `candidate:${candidate}` }]);
    assert.notEqual(decide(ingredient, assortment).tier, "high", `${ingredient} must not auto-link`);
  }
});

test("food ingredient strongly suppresses cleaning products", () => {
  const assortment = assortmentWith([{
    name: "Средство для прочистки труб Сыр",
    productKey: "cleaner",
    sectionId: "household",
    taxonomyCategoryId: "cleaning",
    subcategoryId: "detergents",
  }]);
  const decision = decide("Голландский сыр", assortment);
  assert.equal(decision.tier, "low");
  assert.deepEqual(decision.suggestions, []);
});

test("same name from another venue is never a candidate", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "venue-2", venueId: 2 }]);
  const collection = collectIngredientMatchCandidates({ assortment, venueId: 1 });
  assert.equal(collection.candidates.length, 0);
  assert.ok(collection.crossVenueRejected > 0);
});

test("unit mismatch does not reduce entity identity confidence", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:pcs", unit: "шт.", baseUnit: "pcs" }]);
  const decision = decide("Голландский сыр", assortment, "г");
  assert.equal(decision.tier, "high");
  assert.equal(decision.unitMismatch, true);
  assert.equal(decision.unitResolution?.status, "unit_incompatible");
});

test("СУЛУГУНИ resolves to Сыр Сулугуни while pcs to kg requires unit review", () => {
  const assortment = assortmentWith([{ name: "Сыр Сулугуни", productKey: "cheese:suluguni" }]);
  assortment.recipes = [{
    id: "suluguni-ai",
    menuItemId: "dish",
    venueId: 1,
    source: "ai",
    status: "draft",
    ingredients: [{ id: "suluguni", name: "СУЛУГУНИ", quantity: 1, unit: "шт." }],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const ingredient = ((result.assortment.recipes as Array<Record<string, unknown>>)[0].ingredients as Array<Record<string, unknown>>)[0];
  assert.equal(ingredient.purchaseProductKey, "cheese:suluguni");
  assert.equal(ingredient.entityMatchTier, "high");
  assert.equal(ingredient.linkStatus, "linked_unit_review");
  assert.equal(ingredient.resolutionStatus, "linked_unit_review");
  assert.equal(ingredient.unitResolutionStatus, "entity_matched_unit_unknown");
  assert.equal(result.report.unmatchedIngredientLines, 0);
  assert.equal(result.report.linkedUnitReviewIngredientLines, 1);
  assert.equal(result.report.highIdentityPreviouslyUnmatched, 1);
  const analytics = buildAssortmentAnalytics({ assortment: result.assortment, venueId: 1, now });
  assert.equal(analytics.counts.unmappedIngredients, 0);
  assert.equal(analytics.counts.linkedUnitReviewIngredients, 1);
  assert.equal(analytics.menuItems[0].recipeCost, null);
  assert.equal(analytics.menuItems[0].ingredientRows[0].reason, "unit_resolution");
});

test("generic package metadata requires selection instead of inventing a piece weight", () => {
  const assortment = assortmentWith([{
    name: "Сыр Сулугуни",
    productKey: "cheese:suluguni",
    packageSize: "0,45 кг",
    packageOptions: ["0,45 кг", "0,6 кг"],
  }]);
  const candidate = candidates(assortment)[0];
  const resolution = reconcileIngredientQuantity({
    ingredient: { name: "Сулугуни", quantity: 1, unit: "шт." },
    candidate,
  });
  assert.equal(resolution.status, "packaging_review");
  assert.equal(resolution.normalizedAmount, undefined);
  assert.equal(resolution.packageOptions.length, 2);
});

test("confirmed item-specific piece conversion makes cost calculable", () => {
  const assortment = assortmentWith([{ name: "Сыр Сулугуни", productKey: "cheese:suluguni", averageUnitCost: 0.8 }]);
  assortment.recipes = [{
    id: "suluguni-confirmed",
    menuItemId: "dish",
    venueId: 1,
    source: "ai",
    status: "confirmed",
    ingredients: [{
      id: "suluguni",
      name: "СУЛУГУНИ",
      quantity: 1,
      unit: "шт.",
      unitConversion: { amount: 450, unit: "г", confirmedByUser: true },
    }],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const ingredient = ((result.assortment.recipes as Array<Record<string, unknown>>)[0].ingredients as Array<Record<string, unknown>>)[0];
  assert.equal(ingredient.unitResolutionStatus, "packaging_compatible");
  assert.equal(ingredient.normalizedQuantity, 450);
  assert.equal(ingredient.resolutionStatus, "linked_ready");
  assert.equal(result.report.costRecoveredIngredientLines, 1);
  const analytics = buildAssortmentAnalytics({ assortment: result.assortment, venueId: 1, now });
  assert.equal(analytics.menuItems[0].recipeCost, 360);
  assert.equal(analytics.counts.linkedUnitReviewIngredients, 0);
});

test("implausible AI unit creates a general plausibility warning", () => {
  const assortment = assortmentWith([{ name: "Сыр Сулугуни", productKey: "cheese:suluguni" }]);
  const decision = decide("Сулугуни", assortment, "шт.");
  assert.equal(decision.tier, "high");
  assert.equal(decision.unitResolution?.status, "entity_matched_unit_unknown");
  assert.match(decision.unitResolution?.plausibilityWarning ?? "", /необычна|Проверьте/);
});

test("purchase history raises confidence but is not the only matching signal", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl" }]);
  const withoutPurchase = decide("Голландский сыр", assortment);
  const purchaseDocuments = [{
    id: "purchase-1",
    venueId: 1,
    status: "confirmed",
    date: "2026-08-20",
    supplierName: "Молочный поставщик",
    items: [{ name: "Сыр Голландский", productKey: "cheese:nl", unit: "кг", quantity: 2 }],
  }];
  const withPurchase = decide("Голландский сыр", assortment, "г", purchaseDocuments);
  assert.ok(withPurchase.score > withoutPurchase.score);
  assert.ok(withPurchase.candidate?.evidence.includes("есть в закупках заведения"));
});

test("existing manual links and approved manual cards remain protected", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl" }]);
  assortment.recipes = [{
    id: "approved",
    menuItemId: "dish",
    venueId: 1,
    source: "manual",
    status: "confirmed",
    ingredients: [
      { id: "manual", name: "Голландский сыр", quantity: 100, unit: "г", purchaseProductKey: "manual:protected", linkSource: "manual", linkConfirmedByUser: true },
      { id: "unlinked", name: "Голландский сыр", quantity: 100, unit: "г" },
    ],
  }];
  const result = reconcileTechCards({ assortment, venueId: 1, now });
  const recipe = (result.assortment.recipes as Array<Record<string, unknown>>)[0];
  const ingredients = recipe.ingredients as Array<Record<string, unknown>>;
  assert.equal(ingredients[0].purchaseProductKey, "manual:protected");
  assert.equal(ingredients[1].purchaseProductKey, undefined);
  assert.equal(ingredients[1].manualCardProtected, true);
  assert.equal(recipe.reviewStatus, "approved");
});

test("semantic reconciliation is idempotent and recalculates cost after a high link", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl", averageUnitCost: 0.8 }]);
  assortment.recipes = [{
    id: "ai-draft",
    menuItemId: "dish",
    venueId: 1,
    source: "ai",
    status: "draft",
    ingredients: [{ id: "cheese", name: "Голландский сыр", quantity: 100, unit: "г" }],
  }];
  const first = reconcileTechCards({ assortment, venueId: 1, now });
  const second = reconcileTechCards({ assortment: first.assortment, venueId: 1, now });
  assert.deepEqual(second.assortment.recipes, first.assortment.recipes);
  assert.deepEqual(second.assortment.techCardIngredientAliases, first.assortment.techCardIngredientAliases);
  assert.equal(second.report.changedCards, 0);
  assert.equal(second.report.changedIngredientLines, 0);
  const linked = ((first.assortment.recipes as Array<Record<string, unknown>>)[0].ingredients as Array<Record<string, unknown>>)[0];
  assert.equal(linked.purchaseProductKey, "cheese:nl");
  assert.equal(linked.linkStatus, "auto_linked");

  const approved = {
    ...first.assortment,
    recipes: (first.assortment.recipes as Array<Record<string, unknown>>).map((recipe) => ({ ...recipe, status: "confirmed", reviewStatus: "approved" })),
  };
  const analytics = buildAssortmentAnalytics({ assortment: approved, venueId: 1, now });
  assert.equal(analytics.menuItems[0].recipeCost, 80);
});

test("user confirmation creates a venue-aware alias that becomes strong evidence", () => {
  const assortment = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl" }]);
  assortment.recipes = [{
    id: "draft",
    menuItemId: "dish",
    source: "ai",
    status: "draft",
    ingredients: [{
      id: "confirmed-alias",
      name: "Голландский сыр",
      quantity: 100,
      unit: "г",
      purchaseProductKey: "cheese:nl",
      matchedName: "Сыр Голландский",
      linkSource: "manual",
      linkConfirmedByUser: true,
    }],
  }];
  const aliases = rememberConfirmedIngredientAliases({ assortment, venueId: 1, now });
  const learned = { ...assortment, techCardIngredientAliases: aliases };
  const decision = decide("Голландский сыр", learned);
  assert.equal(decision.tier, "high");
  assert.equal(decision.score, 100);
  assert.equal(decision.candidate?.evidence[0], "подтверждено пользователем ранее");
});

test("matching eval keeps HIGH precision at 100% on the false-positive guard set", () => {
  const positive = assortmentWith([{ name: "Сыр Голландский", productKey: "cheese:nl" }]);
  const ambiguous = assortmentWith([
    { name: "Сливки 10%", productKey: "cream:10" },
    { name: "Сливки 33%", productKey: "cream:33" },
  ]);
  const low = assortmentWith([{ name: "Средство для труб", productKey: "cleaner", sectionId: "household" }]);
  const metrics = evaluateIngredientMatching([
    { ingredient: { name: "Голландский сыр", unit: "г" }, candidates: candidates(positive), expectedProductKey: "cheese:nl", expectedTier: "high" },
    { ingredient: { name: "Сливки", unit: "г" }, candidates: candidates(ambiguous), expectedTier: "medium" },
    { ingredient: { name: "Голландский сыр", unit: "г" }, candidates: candidates(low), expectedTier: "low" },
  ]);
  assert.equal(metrics.highPrecision, 1);
  assert.equal(metrics.falsePositives, 0);
  assert.equal(metrics.highConfidence, 1);
});

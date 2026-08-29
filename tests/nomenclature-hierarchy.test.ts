import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyNomenclatureItem,
  defaultNomenclatureStructure,
  ensureNomenclatureHierarchy,
  manualClassification,
  rememberNomenclatureCorrection,
} from "../lib/bardoctor/nomenclature";

test("default nomenclature tree separates sections, categories, subcategories and locations", () => {
  const tree = defaultNomenclatureStructure();
  assert.equal(tree.version, "v336");
  assert.ok(tree.sections.some((item) => item.id === "bar"));
  assert.ok(tree.sections.some((item) => item.id === "kitchen"));
  assert.ok(tree.sections.some((item) => item.id === "household"));
  assert.ok(tree.categories.some((item) => item.id === "alcohol" && item.parentId === "bar"));
  assert.ok(tree.subcategories.some((item) => item.id === "cognac" && item.parentId === "alcohol"));
  assert.ok(tree.locations.some((item) => item.id === "bar-store"));
});

test("classifier places recognizable goods into a full hierarchy path", () => {
  assert.deepEqual(classifyNomenclatureItem({ name: "Hennessy VS 0,5 л", category: "alcohol" }), {
    sectionId: "bar",
    taxonomyCategoryId: "alcohol",
    subcategoryId: "cognac",
    storageLocationId: "bar-store",
    classificationStatus: "auto",
    classificationConfidence: 0.94,
    classificationSource: "name",
  });
  assert.equal(classifyNomenclatureItem({ name: "Молоко 3,2%", category: "products" }).subcategoryId, "dairy");
  assert.equal(classifyNomenclatureItem({ name: "Брынза Арла", category: "products" }).subcategoryId, "dairy");
  assert.equal(classifyNomenclatureItem({ name: "Fairy", category: "household" }).sectionId, "household");
  assert.equal(classifyNomenclatureItem({ name: "Апельсины", category: "products" }).subcategoryId, "produce");
  assert.equal(classifyNomenclatureItem({ name: "Бананы", category: "products" }).subcategoryId, "produce");
  assert.equal(classifyNomenclatureItem({ name: "Баклажаны", category: "products" }).subcategoryId, "produce");
  assert.equal(classifyNomenclatureItem({ name: "Арахис", category: "products" }).subcategoryId, "grocery");
  assert.equal(classifyNomenclatureItem({ name: "Бекон", category: "products" }).subcategoryId, "meat");
  assert.equal(classifyNomenclatureItem({ name: "Белизна", category: "household" }).subcategoryId, "detergents");
  assert.equal(classifyNomenclatureItem({ name: "Боксы", category: "consumables" }).subcategoryId, "containers");
});

test("a previously suggested grocery item is upgraded when a precise rule becomes available", () => {
  const result = ensureNomenclatureHierarchy({
    nomenclature: [{
      key: "brynza",
      name: "Брынза",
      kind: "stock",
      category: "products",
      sectionId: "kitchen",
      taxonomyCategoryId: "food",
      subcategoryId: "grocery",
      storageLocationId: "kitchen-store",
      classificationStatus: "suggested",
      classificationConfidence: 0.62,
    }],
    stockBalances: [{ key: "brynza", name: "Брынза", current: 424, unit: "g" }],
  }, "2026-08-20T12:00:00.000Z");
  const item = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.subcategoryId, "dairy");
  assert.equal(item.storageLocationId, "kitchen-fridge");
  assert.equal(item.classificationStatus, "auto");
  assert.equal(result.classified, 1);
  assert.equal(result.suggested, 0);
});

test("legacy stock balances become nomenclature items before classification", () => {
  const result = ensureNomenclatureHierarchy({
    nomenclature: [],
    stockBalances: [
      { key: "orange|kg", name: "Апельсины", category: "products", current: 2054, unit: "g" },
      { key: "bleach|pcs", name: "Белизна", category: "household", current: 6, unit: "pcs" },
    ],
  }, "2026-08-20T12:00:00.000Z");
  const items = result.assortment.nomenclature as Array<Record<string, unknown>>;
  assert.equal(items.length, 2);
  assert.equal(items.find((item) => item.name === "Апельсины")?.subcategoryId, "produce");
  assert.equal(items.find((item) => item.name === "Белизна")?.subcategoryId, "detergents");
  assert.equal(result.classified, 2);
  const balances = result.assortment.stockBalances as Array<Record<string, unknown>>;
  assert.equal(balances.find((item) => item.name === "Апельсины")?.sectionId, "kitchen");
  assert.equal(balances.find((item) => item.name === "Белизна")?.sectionId, "household");
});

test("an existing editable structure is preserved without re-inserting preset nodes", () => {
  const result = ensureNomenclatureHierarchy({
    nomenclatureStructure: {
      version: "v209",
      sections: [{ id: "custom", name: "Свой раздел", order: 60, active: true }],
      categories: [],
      subcategories: [],
      locations: [],
    },
    nomenclature: [],
    stockBalances: [],
  });
  const structure = result.assortment.nomenclatureStructure as Record<string, unknown>;
  const sections = structure.sections as Array<Record<string, unknown>>;
  const subcategories = structure.subcategories as Array<Record<string, unknown>>;
  assert.ok(sections.some((item) => item.id === "custom"));
  assert.ok(!sections.some((item) => item.id === "kitchen"));
  assert.equal(subcategories.length, 0);
});

test("unknown items are visible in requires distribution instead of being silently guessed", () => {
  const result = ensureNomenclatureHierarchy({
    nomenclature: [{ key: "mystery", name: "XYZ-123", kind: "stock", category: "unknown" }],
    stockBalances: [{ key: "mystery", name: "XYZ-123", current: 2 }],
  }, "2026-08-20T12:00:00.000Z");
  const item = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.sectionId, "unassigned");
  assert.equal(item.classificationStatus, "unassigned");
  assert.equal(result.unassigned, 1);
  const balance = (result.assortment.stockBalances as Array<Record<string, unknown>>)[0];
  assert.equal(balance.sectionId, "unassigned");
});

test("legacy placeholder hierarchy is reclassified instead of being treated as approved", () => {
  const result = ensureNomenclatureHierarchy({
    nomenclature: [{
      key: "pineapple",
      name: "Ананасы консервированные",
      kind: "stock",
      category: "products",
      sectionId: "unassigned",
      taxonomyCategoryId: "unassigned-category",
      subcategoryId: "unassigned-subcategory",
    }],
    stockBalances: [],
  }, "2026-08-20T12:00:00.000Z");
  const item = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.sectionId, "kitchen");
  assert.equal(item.taxonomyCategoryId, "food");
  assert.equal(item.subcategoryId, "canned");
  assert.equal(item.classificationStatus, "auto");
});

test("manual correction is marked as confirmed with full confidence", () => {
  assert.deepEqual(manualClassification({
    sectionId: "bar",
    taxonomyCategoryId: "soft-drinks",
    subcategoryId: "juice",
    storageLocationId: "bar-fridge",
  }), {
    sectionId: "bar",
    taxonomyCategoryId: "soft-drinks",
    subcategoryId: "juice",
    storageLocationId: "bar-fridge",
    classificationStatus: "confirmed",
    classificationConfidence: 1,
    classificationSource: "manual",
  });
});

test("a correction is remembered for the same product name on future purchases", () => {
  const rules = rememberNomenclatureCorrection([], { name: "Авторский микс №1" }, {
    sectionId: "hookah",
    taxonomyCategoryId: "hookah-tobacco",
    subcategoryId: "tobacco",
    storageLocationId: "hookah-store",
  }, "2026-08-20T12:00:00.000Z");
  const result = ensureNomenclatureHierarchy({
    nomenclatureRules: rules,
    nomenclature: [{ key: "mix", name: "Авторский микс №1", kind: "stock", category: "unknown" }],
    stockBalances: [],
  });
  const item = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.sectionId, "hookah");
  assert.equal(item.classificationStatus, "confirmed");
  assert.equal(item.classificationSource, "manual");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalTaxonomyForAssortment,
  materializeMenuTaxonomy,
  mutateCanonicalTaxonomy,
  normalizeCanonicalTaxonomy,
  taxonomyItemCount,
  taxonomyPath,
} from "../lib/bardoctor/nomenclature-taxonomy";

const structure = {
  version: "v336",
  sections: [
    { id: "bar", name: "Бар", order: 10, active: true },
    { id: "kitchen", name: "Кухня", order: 20, active: true },
  ],
  categories: [
    { id: "alcohol", name: "Алкоголь", parentId: "bar", order: 10, active: true },
    { id: "drinks", name: "Напитки", parentId: "bar", order: 20, active: true },
    { id: "produce", name: "Овощи", parentId: "kitchen", order: 10, active: true },
  ],
  subcategories: [
    { id: "whisky", name: "Виски", parentId: "alcohol", order: 10, active: true },
    { id: "spirits", name: "Крепкое", parentId: "alcohol", order: 20, active: true },
    { id: "soda", name: "Газированные", parentId: "drinks", order: 10, active: true },
  ],
  locations: [{ id: "bar-store", name: "Барный склад", order: 10, active: true }],
};

function assortment() {
  return {
    nomenclatureStructure: structuredClone(structure),
    nomenclature: [{
      productKey: "lime",
      name: "Лайм",
      sectionId: "bar",
      taxonomyCategoryId: "alcohol",
      subcategoryId: "whisky",
      storageLocationId: "bar-store",
    }],
    stockBalances: [{
      productKey: "lime",
      name: "Лайм",
      sectionId: "bar",
      taxonomyCategoryId: "alcohol",
      subcategoryId: "whisky",
      storageLocationId: "bar-store",
    }],
    purchaseDocuments: [{ id: "historic", categoryName: "Старое имя", productKey: "lime" }],
  };
}

test("normalization treats an existing custom tree as source of truth", () => {
  const custom = normalizeCanonicalTaxonomy({
    sections: [{ id: "custom", name: "Свой", order: 10, active: true }],
    categories: [],
    subcategories: [],
    locations: [],
  }, structure as never);
  assert.deepEqual(custom.sections.map((node) => node.id), ["custom"]);
  assert.equal(custom.version, "v336");
});

test("empty canonical taxonomy exposes existing menu sections without writing the source", () => {
  const source = {
    nomenclatureStructure: { version: "v336", sections: [], categories: [], subcategories: [], locations: [] },
    groups: [{ id: "bar-menu", name: "Бар", sortOrder: 0 }],
    subgroups: [{ id: "soft-menu", groupId: "bar-menu", name: "Безалкогольные напитки", sortOrder: 0 }],
    menuItems: [{ id: "sprite", name: "Спрайт 0,5 л", groupId: "bar-menu", subgroupId: "soft-menu" }],
  };
  const before = JSON.stringify(source);
  const effective = canonicalTaxonomyForAssortment(source, structure as never);
  assert.equal(JSON.stringify(source), before);
  assert.ok(effective.taxonomy.sections.some((node) => node.name === "Бар"));
  assert.equal(effective.legacyMenuPaths[0]?.groupId, "bar-menu");
  assert.ok(effective.legacyMenuPaths[0]?.sectionId);
  assert.equal(effective.derivedFromMenu, true);
});

test("menu taxonomy is materialized only during a user-authorized write", () => {
  const result = materializeMenuTaxonomy({
    groups: [{ id: "kitchen-menu", name: "Кухня" }],
    subgroups: [{ id: "food-menu", groupId: "kitchen-menu", name: "Блюда" }],
  }, structure as never);
  const taxonomy = result.nomenclatureStructure as typeof structure;
  assert.ok(taxonomy.sections.some((node) => node.name === "Кухня"));
  assert.ok(taxonomy.categories.some((node) => node.name === "Блюда"));
  assert.equal((result.nomenclatureTaxonomyMigration as Record<string, unknown>).menuGroupsAdopted, true);
});

test("rename keeps stable IDs and historical documents byte-equivalent", () => {
  const input = assortment();
  const history = JSON.stringify(input.purchaseDocuments);
  const result = mutateCanonicalTaxonomy({
    assortment: input,
    mutation: { action: "rename", level: "subcategory", id: "whisky", name: "Шотландский виски" },
    now: "2026-08-29T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const renamedItem = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.deepEqual(taxonomyPath(result.taxonomy, renamedItem), ["Бар", "Алкоголь", "Шотландский виски"]);
  assert.equal(JSON.stringify(result.assortment.purchaseDocuments), history);
  assert.equal((result.assortment.nomenclature as Array<Record<string, unknown>>)[0].subcategoryId, "whisky");
});

test("safe delete blocks a non-empty node until move or unassign is explicit", () => {
  const blocked = mutateCanonicalTaxonomy({
    assortment: assortment(),
    mutation: { action: "delete", level: "subcategory", id: "whisky" },
  });
  assert.equal(blocked.ok, false);
  if (blocked.ok) return;
  assert.equal(blocked.code, "TAXONOMY_NOT_EMPTY");
  assert.equal(blocked.itemCount, 1);

  const moved = mutateCanonicalTaxonomy({
    assortment: assortment(),
    mutation: { action: "delete", level: "subcategory", id: "whisky", strategy: "move", targetId: "soda" },
  });
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  const item = (moved.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.sectionId, "bar");
  assert.equal(item.taxonomyCategoryId, "drinks");
  assert.equal(item.subcategoryId, "soda");
  assert.equal(item.storageLocationId, "bar-store");
  assert.ok(!moved.taxonomy.subcategories.some((node) => node.id === "whisky"));
});

test("moving a taxonomy node updates current classification but not storage location", () => {
  const result = mutateCanonicalTaxonomy({
    assortment: assortment(),
    mutation: { action: "move", level: "subcategory", id: "whisky", parentId: "produce" },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const item = (result.assortment.nomenclature as Array<Record<string, unknown>>)[0];
  assert.equal(item.sectionId, "kitchen");
  assert.equal(item.taxonomyCategoryId, "produce");
  assert.equal(item.subcategoryId, "whisky");
  assert.equal(item.storageLocationId, "bar-store");
});

test("sections can be nested, returned to root, and cannot create cycles", () => {
  const nested = mutateCanonicalTaxonomy({
    assortment: assortment(),
    mutation: { action: "move", level: "section", id: "kitchen", parentId: "bar" },
  });
  assert.equal(nested.ok, true);
  if (!nested.ok) return;
  assert.equal(nested.taxonomy.sections.find((node) => node.id === "kitchen")?.parentId, "bar");
  const kitchenItem = {
    sectionId: "kitchen",
    taxonomyCategoryId: "produce",
  };
  assert.deepEqual(taxonomyPath(nested.taxonomy, kitchenItem), ["Бар", "Кухня", "Овощи"]);

  const cycle = mutateCanonicalTaxonomy({
    assortment: nested.assortment,
    mutation: { action: "move", level: "section", id: "bar", parentId: "kitchen" },
  });
  assert.equal(cycle.ok, false);
  if (cycle.ok) return;
  assert.equal(cycle.code, "TAXONOMY_PARENT_INVALID");

  const root = mutateCanonicalTaxonomy({
    assortment: nested.assortment,
    mutation: { action: "move", level: "section", id: "kitchen" },
  });
  assert.equal(root.ok, true);
  if (!root.ok) return;
  assert.equal(root.taxonomy.sections.find((node) => node.id === "kitchen")?.parentId, undefined);
});

test("a section with a nested section cannot be deleted", () => {
  const nested = structuredClone(assortment());
  (nested.nomenclatureStructure.sections[1] as typeof nested.nomenclatureStructure.sections[number] & { parentId?: string }).parentId = "bar";
  const result = mutateCanonicalTaxonomy({
    assortment: nested,
    mutation: { action: "delete", level: "section", id: "bar" },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "TAXONOMY_HAS_CHILDREN");
  assert.equal(result.childCount, 3);
});

test("taxonomy counts use active canonical nomenclature without double-counting consumers", () => {
  const source = assortment() as Record<string, unknown>;
  source.nomenclature = [
    ...(source.nomenclature as Array<Record<string, unknown>>),
    { productKey: "archived-lime", name: "Лайм старый", sectionId: "bar", active: false },
  ];
  source.stockBalances = [
    { productKey: "lime", name: "Лайм на складе", sectionId: "bar" },
    { productKey: "legacy-tonic", name: "Тоник", sectionId: "bar" },
    { productKey: "archived-lime", name: "Лайм старый на складе", sectionId: "bar" },
  ];
  source.menuItems = [
    { id: "menu-lime", productKey: "lime", name: "Лайм в меню", sectionId: "bar" },
  ];
  assert.equal(taxonomyItemCount(source, "section", "bar"), 2);
});

test("taxonomy mutations are isolated to the supplied venue assortment", () => {
  const venueA = assortment();
  const venueB = assortment();
  (venueB.nomenclatureStructure.sections[0] as Record<string, unknown>).name = "Venue B Bar";
  const beforeB = JSON.stringify(venueB);
  const result = mutateCanonicalTaxonomy({
    assortment: venueA,
    mutation: { action: "archive", level: "section", id: "bar" },
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(venueB), beforeB);
});

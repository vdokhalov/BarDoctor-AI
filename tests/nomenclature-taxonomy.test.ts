import assert from "node:assert/strict";
import test from "node:test";
import {
  mutateCanonicalTaxonomy,
  normalizeCanonicalTaxonomy,
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

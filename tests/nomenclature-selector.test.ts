import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNomenclatureSearch, queryCanonicalNomenclature } from "../lib/bardoctor/nomenclature-selector";

function catalogue() {
  return {
    nomenclature: Array.from({ length: 125 }, (_, index): Record<string, unknown> => ({
      id: `nom-${index}`,
      productKey: `product-${index}`,
      venueId: 1,
      name: index === 117 ? "Coca-Cola Боржоми 1,25 л" : `Ингредиент ${String(index).padStart(3, "0")}`,
      unit: "мл",
      active: true,
    })),
  };
}

test("canonical search scans beyond the initial page and normalizes text and decimals", () => {
  const assortment = catalogue();
  const initial = queryCanonicalNomenclature({ assortment, venueId: 1, limit: 50 });
  assert.equal(initial.items.length, 50);
  assert.ok(initial.nextCursor);
  assert.ok(!initial.items.some((item) => item.key === "product-117"));
  for (const query of ["борж", "Кола", "1.25", "  coca   cola "]) {
    const result = queryCanonicalNomenclature({ assortment, venueId: 1, query, limit: 50 });
    assert.ok(result.items.some((item) => item.key === "product-117"), query);
  }
  assert.equal(normalizeNomenclatureSearch("  1,25   Л "), "1.25 л");
});

test("cursor pages are complete, duplicate-free and deterministic across reopening", () => {
  const assortment = catalogue();
  const collect = () => {
    const keys: string[] = [];
    let cursor: string | null = null;
    do {
      const page = queryCanonicalNomenclature({ assortment, venueId: 1, cursor, limit: 50 });
      keys.push(...page.items.map((item) => item.key));
      cursor = page.nextCursor;
    } while (cursor);
    return keys;
  };
  const first = collect();
  const reopened = collect();
  assert.equal(first.length, 125);
  assert.equal(new Set(first).size, 125);
  assert.deepEqual(reopened, first);
});

test("selector isolates active venue and excludes archived and service records", () => {
  const assortment = catalogue();
  assortment.nomenclature.push(
    { id: "foreign", productKey: "foreign", venueId: 2, name: "Чужой товар", unit: "мл", active: true },
    { id: "archived", productKey: "archived", venueId: 1, name: "Архив", unit: "мл", active: false },
    { id: "service", productKey: "service", venueId: 1, name: "Услуга", unit: "шт", active: true, type: "service" },
  );
  const result = queryCanonicalNomenclature({ assortment, venueId: 1, limit: 100 });
  const all = [result, queryCanonicalNomenclature({ assortment, venueId: 1, cursor: result.nextCursor, limit: 100 })]
    .flatMap((page) => page.items.map((item) => item.key));
  assert.ok(!all.includes("foreign"));
  assert.ok(!all.includes("archived"));
  assert.ok(!all.includes("service"));
});

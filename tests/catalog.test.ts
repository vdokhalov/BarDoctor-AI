import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProcurementNeed,
  MENU_IMPORT_RESPONSE_SCHEMA,
  mergeMenuImportParts,
  normalizeMenuImport,
  parsePackageAmount,
  toBaseAmount,
} from "../lib/bardoctor/catalog";

function assertStrictObjectSchemas(value: unknown): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const schema = value as Record<string, unknown>;
  if (schema.type === "object") {
    const properties = schema.properties as Record<string, unknown>;
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(
      [...(schema.required as string[])].sort(),
      Object.keys(properties).sort(),
    );
    Object.values(properties).forEach(assertStrictObjectSchemas);
  }
  if (schema.type === "array") assertStrictObjectSchemas(schema.items);
}

test("menu import keeps source positions and leaves AI recipes as drafts", () => {
  const draft = normalizeMenuImport({
    venueName: "Кёльн",
    currency: "RUB",
    confidence: 0.88,
    menuItems: [
      {
        id: "menu-1",
        category: "Коктейли",
        name: "Виски-кола",
        salePrice: "180,00",
        portionSize: "250 мл",
        type: "composite",
      },
      {
        id: "menu-2",
        category: "Услуги",
        name: "Вход",
        salePrice: 100,
        type: "service",
      },
    ],
    recipes: [{
      menuItemId: "menu-1",
      confidence: 0.4,
      ingredients: [
        { name: "Виски", quantity: 50, unit: "мл" },
        { name: "Кола", quantity: 200, unit: "мл" },
      ],
    }],
  }, {
    id: "import-1",
    source: "gallery",
    sourceFileIds: ["photo-1", "photo-2"],
    sourceFileNames: ["page-1.jpg", "page-2.jpg"],
    sourceFileTypes: ["image/jpeg", "image/jpeg"],
    pageCount: 2,
  });

  assert.equal(draft.menuItems.length, 2);
  assert.equal(draft.menuItems[0].department, "bar");
  assert.equal(draft.menuItems[0].salePrice, 180);
  assert.deepEqual(draft.menuItems[0].saleSize, {
    version: 1,
    quantity: 250,
    unit: "ml",
    baseQuantity: 250,
    baseUnit: "ml",
    source: "manual",
    status: "confirmed",
  });
  assert.equal(draft.menuItems[0].portionSize, undefined);
  assert.equal(draft.menuItems[1].department, "other");
  assert.equal(draft.menuItems[1].type, "service");
  assert.equal(draft.recipes.length, 1);
  assert.equal(draft.recipes[0].status, "draft");
  assert.equal(draft.recipes[0].ingredients[0].unit, "мл");
  assert.equal(draft.source, "gallery");
  assert.deepEqual(draft.sourceFileIds, ["photo-1", "photo-2"]);
  assert.equal(draft.sourceFileId, "photo-1");
  assert.equal(draft.pageCount, 2);
});

test("menu positions are assigned to stable top-level departments", () => {
  const draft = normalizeMenuImport({
    menuItems: [
      { id: "1", category: "Горячие блюда", name: "Стейк" },
      { id: "2", category: "Табаки", name: "Микс крепкий" },
      { id: "3", category: "Авторские коктейли", name: "Кёльн сауэр" },
      {
        id: "4",
        department: "kitchen",
        category: "Спецпредложения",
        name: "Сет",
      },
    ],
  });

  assert.deepEqual(
    draft.menuItems.map((item) => item.department),
    ["kitchen", "hookah", "bar", "kitchen"],
  );
});

test("package and recipe units are converted to comparable base units", () => {
  assert.deepEqual(toBaseAmount(0.7, "л"), { amount: 700, unit: "ml" });
  assert.deepEqual(toBaseAmount(1.5, "кг"), { amount: 1500, unit: "g" });
  assert.deepEqual(parsePackageAmount("бутылка 0,75 л"), { amount: 750, unit: "ml" });
  assert.deepEqual(parsePackageAmount("уп. 500 г"), { amount: 500, unit: "g" });
});

test("procurement recommendation reserves stock and rounds to supplier packaging", () => {
  const need = calculateProcurementNeed({
    name: "Виски",
    required: 3_000,
    current: 1_200,
    safety: 300,
    onOrder: 0,
    packageAmount: 700,
    unit: "ml",
    packagePrice: 250,
  });

  assert.equal(need.netRequired, 2_100);
  assert.equal(need.packages, 3);
  assert.equal(need.orderedAmount, 2_100);
  assert.equal(need.estimatedCost, 750);
});

test("partial menu recognition merges pages and remaps colliding item ids", () => {
  const merged = mergeMenuImportParts([
    {
      venueName: "Кёльн",
      currency: "RUB",
      confidence: 0.86,
      menuItems: [
        {
          id: "menu-1",
          category: "Коктейли",
          name: "Виски-кола",
          salePrice: 180,
          portionSize: "250 мл",
          type: "composite",
        },
      ],
      recipes: [{
        menuItemId: "menu-1",
        confidence: 0.4,
        ingredients: [{ name: "Виски", quantity: 50, unit: "мл" }],
      }],
    },
    {
      currency: "RUB",
      confidence: 0.8,
      menuItems: [
        {
          id: "menu-1",
          category: "Коктейли",
          name: "Виски-кола",
          salePrice: 180,
          portionSize: "250 мл",
          type: "composite",
        },
        {
          id: "menu-2",
          category: "Пиво",
          name: "Лагер",
          salePrice: 120,
          portionSize: "0,5 л",
          type: "ready",
        },
      ],
      recipes: [{
        menuItemId: "menu-2",
        confidence: 0.7,
        ingredients: [{ name: "Лагер 0,5 л", quantity: 1, unit: "шт." }],
      }],
    },
  ]);

  assert.equal(merged.venueName, "Кёльн");
  assert.equal(merged.menuItems.length, 2);
  assert.equal(new Set(merged.menuItems.map((item) => item.id)).size, 2);
  assert.equal(merged.recipes.length, 2);
  assert.ok(merged.recipes.every((recipe) => (
    merged.menuItems.some((item) => item.id === recipe.menuItemId)
  )));
});

test("menu recognition schema is strict at every object level", () => {
  assertStrictObjectSchemas(MENU_IMPORT_RESPONSE_SCHEMA);
  const root = MENU_IMPORT_RESPONSE_SCHEMA as {
    properties: {
      menuItems: { items: { properties: { type: { enum: string[] } } } };
    };
  };
  assert.deepEqual(
    root.properties.menuItems.items.properties.type.enum,
    ["ready", "composite", "service"],
  );
  assert.deepEqual(
    MENU_IMPORT_RESPONSE_SCHEMA.properties.menuItems.items.properties.saleQuantity.type,
    ["number", "null"],
  );
  assert.ok(MENU_IMPORT_RESPONSE_SCHEMA.properties.menuItems.items.properties.saleUnit.enum.includes(null));
});

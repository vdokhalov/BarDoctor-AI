import assert from "node:assert/strict";
import test from "node:test";
import {
  createInventoryCountDocument,
  inventoryCountConflicts,
  inventoryCountLineDifference,
  inventoryCountScopes,
  inventoryCountSummary,
  renderInventoryCountPrintSheet,
  updateInventoryCountDocument,
} from "../lib/bardoctor/inventory-counts";

const structure = {
  sections: [{ id: "bar", name: "Бар" }, { id: "kitchen", name: "Кухня" }],
  categories: [
    { id: "alcohol", parentId: "bar", name: "Алкоголь" },
    { id: "food", parentId: "kitchen", name: "Продукты" },
  ],
  subcategories: [
    { id: "cognac", parentId: "alcohol", name: "Коньяк и бренди" },
    { id: "dairy", parentId: "food", name: "Молочные продукты" },
  ],
  locations: [{ id: "bar-rack", parentId: "bar", name: "Стеллаж бара" }],
};

const assortment = {
  nomenclatureStructure: structure,
  nomenclature: [
    {
      productKey: "cognac",
      name: "Коньяк Очень длинное наименование для печатной ведомости",
      sectionId: "bar",
      taxonomyCategoryId: "alcohol",
      subcategoryId: "cognac",
      storageLocationId: "bar-rack",
      packageSize: "0,5 л",
      packageAmount: 500,
      unit: "ml",
    },
    {
      productKey: "milk",
      name: "Молоко",
      sectionId: "kitchen",
      taxonomyCategoryId: "food",
      subcategoryId: "dairy",
      unit: "g",
      multiplePackageSizes: true,
      packageOptions: ["0,5 кг", "1 кг"],
    },
    {
      productKey: "archived",
      name: "Архив",
      sectionId: "bar",
      taxonomyCategoryId: "alcohol",
      subcategoryId: "cognac",
      archived: true,
      unit: "pcs",
    },
  ],
  stockBalances: [
    {
      productKey: "cognac",
      current: 10_000,
      inventoryValue: 2_000,
      averageUnitCost: 0.2,
      currency: "RUB",
      unit: "ml",
      updatedAt: "2026-08-22T08:00:00.000Z",
    },
    {
      productKey: "milk",
      current: 2_500,
      inventoryValue: 0,
      currency: "RUB",
      unit: "g",
      updatedAt: "2026-08-22T08:00:00.000Z",
    },
    { productKey: "archived", current: 2, inventoryValue: 2, currency: "RUB", unit: "pcs" },
  ],
};

const creator = { accountId: 7, name: "Тестовый управляющий", role: "manager" };

test("inventory creation snapshots only the selected venue scope and stays blind", () => {
  const before = structuredClone(assortment);
  const scopes = inventoryCountScopes(assortment);
  assert.deepEqual(scopes.map((scope) => scope.label), [
    "Весь активный склад",
    "Бар",
    "Кухня",
    "Алкоголь",
    "Продукты",
    "Коньяк и бренди",
    "Молочные продукты",
  ]);
  const document = createInventoryCountDocument({
    assortment,
    venueId: 101,
    sequenceNumber: 12,
    scope: { type: "section", id: "bar", label: "Бар" },
    accountingCurrency: "RUB",
    creator,
    id: "inventory-12",
    now: "2026-08-22T09:00:00.000Z",
  });
  assert.equal(document.venueId, 101);
  assert.equal(document.items.length, 1);
  assert.equal(document.items[0].expected, 10_000);
  assert.equal(document.items[0].actual, null);
  assert.equal(document.items[0].entryUnit, "бут.");
  assert.equal(document.items[0].entryFactor, 500);
  assert.equal(document.items[0].storageLocationName, "Стеллаж бара");
  assert.equal(document.status, "counting");
  assert.deepEqual(assortment, before, "creating a snapshot must not mutate warehouse state");
});

test("piece, bottle, litre, millilitre, kilogram, gram and multiple packaging inputs normalize through one base model", () => {
  const units = {
    nomenclatureStructure: structure,
    nomenclature: [
      { productKey: "piece", name: "Штучный товар", sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "cognac", unit: "pcs" },
      { productKey: "bottle", name: "Бутылка", sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "cognac", unit: "ml", packageSize: "0,7 л", packageAmount: 700 },
      { productKey: "litres", name: "Объём", sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "cognac", unit: "ml", multiplePackageSizes: true, packageOptions: ["0,5 л", "1 л"] },
      { productKey: "weight", name: "Вес", sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "dairy", unit: "g", multiplePackageSizes: true, packageOptions: ["500 г", "1 кг"] },
    ],
    stockBalances: [
      { productKey: "piece", current: 3, unit: "pcs", averageUnitCost: 10, inventoryValue: 30, currency: "RUB" },
      { productKey: "bottle", current: 1_400, unit: "ml", averageUnitCost: 0.1, inventoryValue: 140, currency: "RUB" },
      { productKey: "litres", current: 2_500, unit: "ml", averageUnitCost: 0.1, inventoryValue: 250, currency: "RUB" },
      { productKey: "weight", current: 1_250, unit: "g", averageUnitCost: 0.2, inventoryValue: 250, currency: "RUB" },
    ],
  };
  const document = createInventoryCountDocument({
    assortment: units,
    venueId: 1,
    sequenceNumber: 4,
    scope: { type: "all", label: "Весь активный склад" },
    accountingCurrency: "RUB",
    creator,
  });
  const byKey = new Map(document.items.map((item) => [item.productKey, item]));
  assert.deepEqual([byKey.get("piece")?.entryUnit, byKey.get("piece")?.entryFactor], ["шт.", 1]);
  assert.deepEqual([byKey.get("bottle")?.entryUnit, byKey.get("bottle")?.entryFactor], ["бут.", 700]);
  assert.deepEqual([byKey.get("litres")?.entryUnit, byKey.get("litres")?.entryFactor], ["л", 1_000]);
  assert.deepEqual([byKey.get("weight")?.entryUnit, byKey.get("weight")?.entryFactor], ["кг", 1_000]);
  const counted = updateInventoryCountDocument({
    document,
    items: [
      { productKey: "piece", actual: 0 },
      { productKey: "bottle", actual: 700 },
      { productKey: "litres", actual: 2_700 },
      { productKey: "weight", actual: 1_255.5 },
    ],
  });
  assert.equal(counted.items.find((item) => item.productKey === "weight")?.actual, 1_255.5);
});

test("blank and an explicit zero remain different through draft persistence", () => {
  const original = createInventoryCountDocument({
    assortment,
    venueId: 1,
    sequenceNumber: 1,
    scope: { type: "all", label: "Весь активный склад" },
    accountingCurrency: "RUB",
    creator,
    id: "blank-zero",
  });
  const saved = updateInventoryCountDocument({
    document: original,
    items: [
      { productKey: "cognac", actual: 0, note: "Пусто физически" },
      { productKey: "milk", actual: "" },
    ],
  });
  assert.equal(saved.items.find((item) => item.productKey === "cognac")?.actual, 0);
  assert.equal(saved.items.find((item) => item.productKey === "milk")?.actual, null);
  assert.deepEqual(inventoryCountSummary(saved), {
    totalLines: 2,
    countedLines: 1,
    uncountedLines: 1,
    matchedLines: 0,
    shortageLines: 1,
    surplusLines: 0,
    changedLines: 1,
    shortageValue: -2_000,
    surplusValue: 0,
    calculatedDifferenceValue: -2_000,
    netDifferenceValue: -2_000,
    unvaluedDifferenceLines: 0,
  });
});

test("decimal quantities, multiple packaging and partial monetary comparison use canonical amounts", () => {
  const original = createInventoryCountDocument({
    assortment,
    venueId: 1,
    sequenceNumber: 2,
    scope: { type: "all", label: "Весь активный склад" },
    accountingCurrency: "RUB",
    creator,
  });
  const counted = updateInventoryCountDocument({
    document: original,
    items: [
      { productKey: "cognac", actual: 9_000 },
      { productKey: "milk", actual: 2_700 },
    ],
    status: "review",
  });
  const cognac = counted.items.find((item) => item.productKey === "cognac")!;
  const milk = counted.items.find((item) => item.productKey === "milk")!;
  assert.equal(milk.entryUnit, "кг");
  assert.equal(milk.entryFactor, 1_000);
  assert.deepEqual(inventoryCountLineDifference(cognac), { difference: -1_000, differenceValue: -200 });
  assert.deepEqual(inventoryCountLineDifference(milk), { difference: 200, differenceValue: null });
  assert.deepEqual(inventoryCountSummary(counted), {
    totalLines: 2,
    countedLines: 2,
    uncountedLines: 0,
    matchedLines: 0,
    shortageLines: 1,
    surplusLines: 1,
    changedLines: 2,
    shortageValue: -200,
    surplusValue: 0,
    calculatedDifferenceValue: -200,
    netDifferenceValue: null,
    unvaluedDifferenceLines: 1,
  });
});

test("concurrent purchase, sale or write-off blocks stale finalization", () => {
  const document = createInventoryCountDocument({
    assortment,
    venueId: 1,
    sequenceNumber: 3,
    scope: { type: "section", id: "bar", label: "Бар" },
    accountingCurrency: "RUB",
    creator,
  });
  assert.deepEqual(inventoryCountConflicts({ document, assortment }), []);
  const changed = structuredClone(assortment);
  changed.stockBalances[0].current = 10_500;
  const conflicts = inventoryCountConflicts({ document, assortment: changed });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].reason, "Учётный остаток изменился после начала подсчёта");
  assert.equal(conflicts[0].current, 10_500);

  const changedCost = structuredClone(assortment);
  changedCost.stockBalances[0].averageUnitCost = 0.25;
  assert.equal(
    inventoryCountConflicts({ document, assortment: changedCost })[0].reason,
    "Cost basis изменился после начала подсчёта",
  );
});

test("blind A4 print sheet uses the inventory snapshot and never prints expected quantities", () => {
  const many = {
    ...assortment,
    nomenclature: Array.from({ length: 140 }, (_, index) => ({
      productKey: `item-${index}`,
      name: `Товар ${index + 1} с длинным кириллическим наименованием`,
      sectionId: "bar",
      taxonomyCategoryId: "alcohol",
      subcategoryId: "cognac",
      unit: "pcs",
    })),
    stockBalances: Array.from({ length: 140 }, (_, index) => ({
      productKey: `item-${index}`,
      current: index + 1,
      averageUnitCost: 10,
      inventoryValue: (index + 1) * 10,
      currency: "RUB",
      unit: "pcs",
    })),
  };
  const document = createInventoryCountDocument({
    assortment: many,
    venueId: 55,
    sequenceNumber: 17,
    scope: { type: "all", label: "Весь активный склад" },
    accountingCurrency: "RUB",
    creator,
    now: "2026-08-22T10:00:00.000Z",
  });
  const html = renderInventoryCountPrintSheet({ document, venueName: "Кириллическое заведение" });
  assert.match(html, /ИНВЕНТАРИЗАЦИОННАЯ ВЕДОМОСТЬ/);
  assert.match(html, /Кириллическое заведение/);
  assert.match(html, /Наименование/);
  assert.match(html, /Факт/);
  assert.match(html, /Примечание/);
  assert.match(html, /@page\{size:A4 portrait/);
  assert.match(html, /thead\{display:table-header-group/);
  assert.match(html, /break-inside:avoid/);
  assert.match(html, /Товар 140 с длинным кириллическим наименованием/);
  assert.doesNotMatch(html, /Учёт|Ожидаем|expected|averageUnitCost|inventoryValue/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 141);
});

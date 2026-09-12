import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { buildAssortmentAnalytics } from "../lib/bardoctor/assortment-analytics";
import { patchRecipeAuthoritativeUnits } from "../scripts/lib/recipe-authoritative-units.mjs";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const editor = bundle.slice(bundle.indexOf("function bdCatRecipeEditor"), bundle.indexOf("function bdCatImportReview"));
const start = editor.indexOf("const bdRecipeAuthoritativeCostByIdV418=");
const end = editor.indexOf(",bdTechInvalidCount=", start);
assert.ok(start >= 0 && end > start, "execute the actual shipped editor cost model");
function helper(name: string) {
  const from = bundle.indexOf(`function ${name}(`);
  const to = bundle.indexOf("function ", from + 10);
  assert.ok(from >= 0 && to > from, `${name} must be extracted from the shipped client`);
  return bundle.slice(from, to);
}
type Row = Record<string, unknown>;
type Result = { rows: (Row & { complete: boolean; cost: number | null })[]; total: number | null; currency: string; missing: number };
function editorCosts(ingredients: Row[], costs: Row[]): Result {
  const before = JSON.stringify({ ingredients, costs });
  const result = vm.runInNewContext([
    ...["bdCatNumber", "bdCatToBase", "bdTechCostUnitV376"].map(helper),
    editor.slice(start, end),
    ";JSON.stringify({rows:bdRecipeCalculatedCostsV418,total:bdRecipeTotalCostV418,currency:bdRecipeTotalCurrencyV418,missing:bdMissingCostCount})",
  ].join("\n"), { l: { ingredients }, bdRecipeCostRows: costs, bdCatArray: (value: unknown) => Array.isArray(value) ? value : [] });
  assert.equal(JSON.stringify({ ingredients, costs }), before, "cost preview cannot rewrite recipe or price snapshots");
  return JSON.parse(result) as Result;
}
function line(unit: string, quantity: number | string = 1, extra: Row = {}) {
  return { id: "line", nomenclatureItemId: "stock-id", purchaseProductKey: "stock-key", quantity, unit, ...extra };
}
function price(unit: string | undefined, unitPrice: unknown = 10, extra: Row = {}) {
  return { nomenclatureItemId: "stock-id", productKey: "stock-key", unit, unitPrice, complete: true, currency: "MDL", costStatus: "KNOWN", ...extra };
}

test("authoritative price units convert kg/g, l/ml and pieces without multiplying costs by1000", () => {
  const cases: [string, number | string, string, number, number][] = [
    ["кг", 1, "kg", 10, 10], ["г", 250, "kg", 12, 3], ["kg", "0,5", "g", 0.01, 5],
    ["г", 250, "g", 0.012, 3], ["л", 1, "l", 10, 10], ["мл", 250, "l", 12, 3],
    ["l", 2, "ml", 0.01, 20], ["мл", 250, "ml", 0.012, 3], ["шт.", 12, "pcs", 10, 120],
  ];
  for (const [unit, quantity, priceUnit, unitPrice, expected] of cases) {
    const result = editorCosts([line(unit, quantity)], [price(priceUnit, unitPrice)]);
    assert.equal(result.rows[0].complete, true, `${quantity}${unit} at${unitPrice}/${priceUnit}`);
    assert.equal(result.rows[0].cost, expected);
    assert.equal(result.total, expected);
    assert.equal(result.missing, 0);
  }
});

test("production mixed recipe totals30 from three last purchase prices and survives serialization", () => {
  const ingredients = ["кг", "л", "шт."].map((unit, i) => line(unit, 1, { id: `line-${i}`, nomenclatureItemId: `stock-${i}`, purchaseProductKey: `key-${i}` }));
  const costs = ["kg", "l", "pcs"].map((unit, i) => price(unit, 10, { nomenclatureItemId: `stock-${i}`, productKey: `key-${i}`, purchaseDate: "2026-07-31" }));
  for (const input of [{ ingredients, costs }, JSON.parse(JSON.stringify({ ingredients, costs }))]) {
    const result = editorCosts(input.ingredients, input.costs);
    assert.deepEqual(result.rows.map(row => row.cost), [10, 10, 10]);
    assert.equal(result.total, 30);
    assert.equal(result.currency, "MDL");
  }
});

test("incompatible or missing units and unconfirmed prices remain UNKNOWN", () => {
  for (const cost of [price("l"), price("pcs"), price("unknown"), price(undefined), price("kg", 10, { complete: false })]) {
    const result = editorCosts([line("кг")], [cost]);
    assert.equal(result.rows[0].complete, false);
    assert.equal(result.rows[0].cost, null);
    assert.equal(result.total, null);
  }
});

test("KNOWN_ZERO stays zero but absent, negative or non-finite prices cannot become known zero", () => {
  assert.equal(editorCosts([line("кг")], [price("kg", 0, { costStatus: "KNOWN_ZERO" })]).total, 0);
  for (const value of [null, undefined, "", false, -1, NaN, Infinity]) {
    const result = editorCosts([line("кг")], [price("kg", value, { unitPrice: value })]);
    assert.equal(result.rows[0].complete, false, String(value));
    assert.equal(result.total, null);
  }
});

test("equivalent unit display changes preserve cost and mixed currencies do not produce a total", () => {
  assert.equal(editorCosts([line("кг", 0.25)], [price("kg", 12)]).total, 3);
  assert.equal(editorCosts([line("г", 250)], [price("kg", 12)]).total, 3);
  const result = editorCosts([line("кг"), line("л", 1, { id: "other", nomenclatureItemId: "other", purchaseProductKey: "other" })],
    [price("kg"), price("l", 10, { nomenclatureItemId: "other", productKey: "other", currency: "EUR" })]);
  assert.deepEqual(result.rows.map(row => row.cost), [10, 10]);
  assert.equal(result.total, null);
});

test("real server analytics for v4 receipts feeds the shipped editor with30MDL", () => {
  const nomenclature = ["kg", "l", "pcs"].map((unit, i) => ({ id: `stock-${i}`, productKey: `key-${i}`,
    name: `TEST cost ${unit}`, unit, venueId: 1, active: true, unitModelVersion: 4, packageAmount: 1, packageSize: `1 ${unit}`, currency: "MDL" }));
  const ingredients = nomenclature.map((item, i) => ({ ...line(["кг", "л", "шт."][i]),
    id: `line-${i}`, nomenclatureItemId: item.id, purchaseProductKey: item.productKey, name: item.name, venueId: 1 }));
  const assortment = { nomenclature, stockBalances: nomenclature.map(item => ({ ...item, current: 20 })),
    menuItems: [{ id: "menu", name: "TEST mixed", active: true, venueId: 1, consumptionMode: "RECIPE", currency: "MDL", salePrice: 60 }],
    recipes: [{ id: "recipe", menuItemId: "menu", ownerId: "menu", status: "confirmed", reviewStatus: "approved", current: true, venueId: 1, ingredients }] };
  const stockMovements = nomenclature.map((item, i) => ({ id: `receipt-${i}`, productKey: item.productKey, nomenclatureItemId: item.id,
    venueId: 1, unit: item.unit, amount: 20, costAmount: 200, costStatus: "KNOWN", status: "active", type: "receipt", currency: "MDL",
    date: "2026-07-31", businessDate: "2026-07-31", sourceDocumentId: "receipt-A", sourceLineId: `source-${i}`, createdAt: "2026-07-31T12:00:00Z" }));
  const before = JSON.stringify({ assortment, stockMovements });
  const analytics = buildAssortmentAnalytics({ assortment, stockMovements, purchaseDocuments: [], venueId: 1, now: new Date("2026-09-12T12:00:00Z") });
  assert.deepEqual(analytics.nomenclatureCosts.map(row => [row.unit, row.unitPrice, row.complete]), [["kg", 10, true], ["l", 10, true], ["pcs", 10, true]]);
  assert.equal(analytics.menuItems[0].recipeCost, 30);
  assert.equal(editorCosts(ingredients, analytics.nomenclatureCosts).total, 30);
  assert.equal(editorCosts(ingredients, [...analytics.nomenclatureCosts, ...analytics.menuItems[0].ingredientRows]).total, 30);
  assert.equal(JSON.stringify({ assortment, stockMovements }), before);
});

test("price precision and exact reference lookup preserve authoritative data", () => {
  const result = editorCosts([line("мл", 50)], [price("l", 285.714286, { purchaseDocumentId: "last-receipt", purchaseDate: "2026-08-03" })]);
  assert.equal(result.total, 14.29);
  assert.equal(result.rows[0].unitPrice, 285.714286);
  assert.equal(result.rows[0].unit, "l");
  assert.equal(result.rows[0].purchaseDocumentId, "last-receipt");
  assert.equal(editorCosts([line("г", 500)], [price("kg", 12, { id: "line" })]).total, 6);
  assert.equal(editorCosts([line("г", 500, { nomenclatureItemId: undefined })], [price("kg", 12)]).total, 6);
});

test("cost patch is byte-stable and rejects changed or duplicated adapters", () => {
  // Exercise the historical installer output, not a reimplementation of costing.
  const installer = fs.readFileSync(new URL("../scripts/patch-menu-consumption-sot-v418.mjs", import.meta.url), "utf8");
  const legacyModel = installer.match(/const costModel = String.raw`([^`]+)`;/)?.[1];
  assert.ok(legacyModel, "historical v418 installer model must remain available");
  const legacy = bundle.replace(editor.slice(start, end), legacyModel)
    .replace("bdAssortmentUnitLabelV293(bdLineCostV418.unit)", "bdCatUnitLabel(bdLineCostV418.unit)");
  assert.notEqual(legacy, bundle);
  assert.deepEqual(Buffer.from(patchRecipeAuthoritativeUnits(legacy)), Buffer.from(bundle), "v431 upgrade must emit the exact fixed adapter");
  assert.deepEqual(Buffer.from(patchRecipeAuthoritativeUnits(bundle)), Buffer.from(bundle));
  assert.throws(() => patchRecipeAuthoritativeUnits(bundle.replace("bdRecipePriceQuantityPhase7*R", "bdRecipePriceQuantityPhase7+R")), /unexpected cost adapter anchors/);
  assert.throws(() => patchRecipeAuthoritativeUnits(bundle + "\nfunction bdCatRecipeEditor(){}"), /unique editor boundaries/);
});

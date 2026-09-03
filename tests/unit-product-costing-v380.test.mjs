import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

function costingApi() {
  const start = bundle.indexOf("function bdTechCostUnitV376");
  const end = bundle.indexOf("function bdAssortmentFallbackAnalyticsV170", start);
  assert.ok(start >= 0 && end > start);
  const context = {
    bdCatArray: (value) => Array.isArray(value) ? value : [],
    bdAssortmentNumberV170: (value, fallback = 0) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
  vm.createContext(context);
  vm.runInContext(`${bundle.slice(start, end)};this.api={canonical:bdTechCostCanonicalV376,maps:bdTechCostMapsV376,row:bdTechCostRowV376}`, context);
  return context.api;
}

test("unit-product costing patch keeps the production bundle valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v389/);
});

test("one piece of a uniquely packaged 0.5 l product costs one bottle", () => {
  const api = costingApi();
  const state = {
    nomenclature: [
      { id: "nom-cola-05", productKey: "stock:cola-05", name: "Кола 0,5 л", unit: "ml", packageSize: "0,5 л" },
      { id: "nom-sprite-05", productKey: "stock:sprite-05", name: "Спрайт 0,5 л", unit: "ml", packageSize: "0,5 л" },
    ],
    supplierProductMappings: [{ canonicalProductKey: "stock:sprite-05", purchaseLineIds: ["line-sprite"] }],
  };
  const purchases = [{
    id: "soft-drinks",
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    items: [
      { id: "line-cola", name: "Кола 0,5 л", nomenclatureId: "nom-cola-05", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 200 },
      { id: "line-sprite", name: "Спрайт 0,5 л", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 180 },
    ],
  }];
  const canonical = api.canonical(state);
  const maps = api.maps(state, purchases, canonical);
  const cola = api.row({ id: "cola", name: "Кола 0,5 л", nomenclatureItemId: "nom-cola-05", quantity: 1, unit: "шт." }, maps, canonical);
  const sprite = api.row({ id: "sprite", name: "Спрайт 0,5 л", purchaseProductKey: "stock:sprite-05", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(cola.cost, 20);
  assert.equal(cola.amount, 500);
  assert.equal(cola.normalizedUnit, "ml");
  assert.equal(sprite.cost, 18);
  assert.equal(sprite.amount, 500);
});

test("multiple package sizes remain unresolved instead of guessing a conversion", () => {
  const api = costingApi();
  const state = {
    nomenclature: [{ id: "nom-cola", productKey: "stock:cola", name: "Кола", unit: "ml", packageOptions: ["0,5 л", "1,25 л"] }],
  };
  const purchases = [{
    id: "soft-drinks",
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    items: [{ id: "line-cola", name: "Кола", purchaseProductKey: "stock:cola", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 200 }],
  }];
  const canonical = api.canonical(state);
  const maps = api.maps(state, purchases, canonical);
  const row = api.row({ id: "cola", name: "Кола", purchaseProductKey: "stock:cola", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, false);
  assert.equal(row.reason, "price");
});

test("generic 1 pcs tech-card package defers to the exact 0.5 l menu package", () => {
  const api = costingApi();
  const state = {
    inventoryProductAliases: [{ from: "stock:боржоми 0 5 л|ml", to: "stock:боржоми|ml" }],
    nomenclature: [{
      productKey: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "л"],
    }],
    stockBalances: [{
      key: "stock:боржоми|ml",
      name: "Вода Боржоми",
      unit: "ml",
      packageSize: "Несколько фасовок",
      packageOptions: ["0,5 л", "л"],
    }],
  };
  const purchases = [
    {
      id: "sheriff-372",
      documentNumber: "372",
      status: "confirmed",
      date: "2026-08-01",
      supplierName: "Шериф",
      currency: "PMR_RUB",
      items: [{
        id: "legacy-generic-borjomi",
        name: "Вода Боржоми",
        purchaseProductKey: "вода боржоми|л",
        quantity: 2.5,
        unit: "л",
        unitPrice: 104,
        lineTotal: 260,
      }],
    },
    {
      id: "vprok-379",
      documentNumber: "379",
      status: "confirmed",
      date: "2026-08-07",
      supplierName: "Впрок",
      currency: "PMR_RUB",
      items: [{
        id: "exact-half-borjomi",
        name: "Боржоми 0.5 л",
        quantity: 12,
        unit: "шт.",
        unitPrice: 24.65,
        lineTotal: 295.8,
      }],
    },
  ];
  const canonical = api.canonical(state);
  const maps = api.maps(state, purchases, canonical);
  const row = api.row({
    name: "Боржоми",
    matchedName: "Вода Боржоми",
    purchaseProductKey: "stock:боржоми|pcs",
    nomenclatureItemId: "stock:боржоми|ml",
    resolutionStatus: "linked_packaging_review",
    quantity: 1,
    unit: "шт.",
    packageSize: "1 шт.",
  }, maps, canonical, {
    name: "Боржоми",
    type: "ready",
    portionSize: "0,5 л",
  }, "0,5 л");

  assert.equal(row.complete, true, JSON.stringify(row));
  assert.equal(row.cost, 24.65);
  assert.equal(row.purchaseDocumentNumber, "379");
  assert.notEqual(row.purchaseDocumentNumber, "372");
});

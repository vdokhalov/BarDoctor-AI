import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

function costingApi(): any {
  const start = bundle.indexOf("function bdTechCostUnitV376");
  const end = bundle.indexOf("function bdAssortmentFallbackAnalyticsV170", start);
  assert.ok(start >= 0 && end > start, "tech-card costing helpers must exist");
  const context: any = {
    bdCatArray: (value: unknown) => Array.isArray(value) ? value : [],
    bdAssortmentNumberV170: (value: unknown, fallback = 0) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
  vm.createContext(context);
  vm.runInContext(
    `${bundle.slice(start, end)};this.api={canonical:bdTechCostCanonicalV376,maps:bdTechCostMapsV376,row:bdTechCostRowV376}`,
    context,
  );
  return context.api;
}

function manualProduct(overrides: Record<string, unknown> = {}) {
  return {
    productKey: "manual-vodka",
    name: "Водка тестовая",
    unit: "ml",
    packageSize: "1 л",
    packageAmount: 1000,
    lastPurchasePrice: 300,
    currency: "PMR_RUB",
    ...overrides,
  };
}

function ingredient(overrides: Record<string, unknown> = {}) {
  return {
    id: "ingredient-vodka",
    name: "Водка тестовая",
    matchedName: "Водка тестовая",
    purchaseProductKey: "manual-vodka",
    quantity: 50,
    unit: "мл",
    ...overrides,
  };
}

test("manual nomenclature price is used only when no posted receipt exists", () => {
  assert.match(bundle, /bd-manual-nomenclature-cost-fallback-v409/);
  const api = costingApi();
  const state = { nomenclature: [manualProduct()] };
  const canonical = api.canonical(state);
  const maps = api.maps(state, [], canonical);
  const row = api.row(ingredient(), maps, canonical);
  assert.equal(row.complete, true, JSON.stringify(row));
  assert.equal(row.cost, 15);
  assert.equal(row.unitPrice, 0.3);
  assert.equal(row.currency, "PMR_RUB");
  assert.equal(row.source, "manual_nomenclature_price");
});

test("latest posted receipt overrides the manual nomenclature price", () => {
  const api = costingApi();
  const state = { nomenclature: [manualProduct()] };
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    id: "receipt-1",
    documentNumber: "1",
    status: "confirmed",
    date: "2026-09-03",
    currency: "PMR_RUB",
    supplierName: "Тестовый поставщик",
    items: [{
      id: "line-1",
      name: "Водка тестовая",
      purchaseProductKey: "manual-vodka",
      quantity: 1,
      unit: "л",
      packageSize: "1 л",
      lineTotal: 360,
    }],
  }], canonical);
  const row = api.row(ingredient(), maps, canonical);
  assert.equal(row.complete, true, JSON.stringify(row));
  assert.equal(row.cost, 18);
  assert.equal(row.source, "latest_confirmed_purchase");
  assert.equal(row.purchaseDocumentNumber, "1");
});

test("manual package price converts through base units for piece items", () => {
  const api = costingApi();
  const state = { nomenclature: [manualProduct({
    productKey: "manual-piece",
    name: "Товар поштучный",
    unit: "pcs",
    packageSize: "1 шт.",
    packageAmount: 1,
    lastPurchasePrice: 25,
  })] };
  const canonical = api.canonical(state);
  const maps = api.maps(state, [], canonical);
  const row = api.row(ingredient({
    name: "Товар поштучный",
    matchedName: "Товар поштучный",
    purchaseProductKey: "manual-piece",
    quantity: 1,
    unit: "шт.",
  }), maps, canonical);
  assert.equal(row.complete, true, JSON.stringify(row));
  assert.equal(row.cost, 25);
  assert.equal(row.source, "manual_nomenclature_price");
});

test("missing manual price remains unknown and an incompatible posted receipt never falls back to stale manual price", () => {
  const api = costingApi();

  const noPriceState = { nomenclature: [manualProduct({ lastPurchasePrice: undefined })] };
  const noPriceCanonical = api.canonical(noPriceState);
  const noPriceMaps = api.maps(noPriceState, [], noPriceCanonical);
  const noPriceRow = api.row(ingredient(), noPriceMaps, noPriceCanonical);
  assert.equal(noPriceRow.complete, false);
  assert.equal(noPriceRow.reason, "price");

  const spriteState = { nomenclature: [manualProduct({
    productKey: "sprite",
    name: "Спрайт",
    packageSize: "0,5 л",
    packageAmount: 500,
    lastPurchasePrice: 20,
  })] };
  const spriteCanonical = api.canonical(spriteState);
  const spriteMaps = api.maps(spriteState, [{
    id: "sprite-receipt",
    documentNumber: "391",
    status: "confirmed",
    date: "2026-08-22",
    currency: "PMR_RUB",
    items: [{
      id: "sprite-line",
      name: "Спрайт",
      purchaseProductKey: "sprite",
      quantity: 1.25,
      unit: "л",
      packageSize: "1,25 л",
      lineTotal: 25.5,
    }],
  }], spriteCanonical);
  const spriteRow = api.row(ingredient({
    name: "Спрайт",
    matchedName: "Спрайт",
    purchaseProductKey: "sprite",
    quantity: 500,
    unit: "мл",
    packageSize: "0,5 л",
  }), spriteMaps, spriteCanonical, { name: "Спрайт 0,5 л", portionSize: "0,5 л" }, "0,5 л");
  assert.equal(spriteRow.complete, false, JSON.stringify(spriteRow));
  assert.equal(spriteRow.reason, "price");
});

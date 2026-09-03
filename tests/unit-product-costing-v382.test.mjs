import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

function costingApi() {
  const stateStart = bundle.indexOf("function bdCatState");
  const stateEnd = bundle.indexOf("function bdCatTypeLabel", stateStart);
  const costStart = bundle.indexOf("function bdTechCostUnitV376");
  const costEnd = bundle.indexOf("function bdAssortmentFallbackAnalyticsV170", costStart);
  assert.ok(stateStart >= 0 && stateEnd > stateStart && costStart >= 0 && costEnd > costStart);
  const context = {
    bdCatArray: (value) => Array.isArray(value) ? value : [],
    bdCatDefaultGroups: () => [{ id: "bar", name: "Бар", legacyDepartment: "bar", sortOrder: 0 }],
    bdCatNumber: (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    bdCatDepartment: () => "bar",
    bdCatSubsection: () => "Напитки",
    bdCatNormName: (value) => String(value ?? "").toLowerCase(),
    bdCatStableTaxId: (_prefix, group, name) => `${group}:${name}`,
    bdAssortmentNumberV170: (value, fallback = 0) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
  vm.createContext(context);
  vm.runInContext(`${bundle.slice(stateStart, stateEnd)};${bundle.slice(costStart, costEnd)};this.api={state:bdCatState,canonical:bdTechCostCanonicalV376,maps:bdTechCostMapsV376,row:bdTechCostRowV376}`, context);
  return context.api;
}

test("v382 production bundle stays valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v382/);
});

test("piece recipe converts a volume cost basis through the one known bottle size", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [{ productKey: "stock:cola-05", name: "Кола 0,5 л", unit: "pcs", packageSize: "0,5 л" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-31", currency: "PMR_RUB",
    items: [{ name: "Кола 0.5 л", purchaseProductKey: "purchase:cola-05", quantity: 500, unit: "мл", packageSize: "0,5 л", lineTotal: 15 }],
  }], canonical);
  const row = api.row({ name: "Кола 0,5л.", purchaseProductKey: "stale:cola", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.normalizedUnit, "ml");
  assert.equal(row.amount, 500);
  assert.equal(row.cost, 15);
});

test("package-aware brand matching finds Sprite 0.5 without selecting Sprite 1.25", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [
      { productKey: "stock:sprite-05", name: "Спрайт", unit: "pcs", packageSize: "0,5 л" },
      { productKey: "stock:sprite-125", name: "Спрайт", unit: "pcs", packageSize: "1,25 л" },
    ],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-31", currency: "PMR_RUB",
    items: [
      { name: "Sprite", purchaseProductKey: "purchase:sprite-05", quantity: 500, unit: "мл", packageSize: "0.5 L", lineTotal: 18 },
      { name: "Sprite", purchaseProductKey: "purchase:sprite-125", quantity: 1250, unit: "мл", packageSize: "1.25 L", lineTotal: 24.84 },
    ],
  }], canonical);
  const row = api.row({ name: "Спрайт 0,5л.", purchaseProductKey: "stale:sprite", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.amount, 500);
  assert.equal(row.cost, 18);
});

test("package fallback remains unresolved when the sold size is absent", () => {
  const api = costingApi();
  const state = api.state({});
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-31", currency: "PMR_RUB",
    items: [
      { name: "Sprite", purchaseProductKey: "sprite:05", quantity: 500, unit: "мл", packageSize: "0,5 л", lineTotal: 18 },
      { name: "Sprite", purchaseProductKey: "sprite:125", quantity: 1250, unit: "мл", packageSize: "1,25 л", lineTotal: 24.84 },
    ],
  }], canonical);
  const row = api.row({ name: "Спрайт", purchaseProductKey: "stale:sprite", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, false);
});

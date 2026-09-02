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

test("v381 production bundle stays valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v381/);
});

test("catalog normalization preserves identity mappings used by production costing", () => {
  const api = costingApi();
  const state = api.state({
    canonicalProductAliases: [{ from: "old", to: "current" }],
    inventoryProductAliases: [{ from: "legacy", to: "current" }],
    supplierProductMappings: [{ canonicalProductKey: "current", purchaseLineIds: ["line"] }],
  });
  assert.equal(state.canonicalProductAliases.length, 1);
  assert.equal(state.inventoryProductAliases.length, 1);
  assert.equal(state.supplierProductMappings.length, 1);
});

test("real client path costs a 0.5 l bottle after catalog normalization", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [{ id: "nom-sprite", productKey: "stock:sprite", name: "Спрайт 0,5 л", unit: "ml", packageSize: "0,5 л" }],
    inventoryProductAliases: [{ from: "legacy:sprite", to: "stock:sprite" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    items: [{ id: "line-sprite", name: "Спрайт 0,5 л", purchaseProductKey: "stock:sprite", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 180 }],
  }], canonical);
  const row = api.row({ name: "Спрайт 0,5л.", purchaseProductKey: "legacy:sprite", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.amount, 500);
  assert.equal(row.cost, 18);
});

test("unique exact-name fallback repairs a stale key without guessing between packages", () => {
  const api = costingApi();
  const state = api.state({ nomenclature: [{ productKey: "stock:cola", name: "Кола 0,5 л", unit: "ml", packageSize: "0,5 л" }] });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    items: [{ name: "Кола 0.5л.", purchaseProductKey: "purchase:cola", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 200 }],
  }], canonical);
  const row = api.row({ name: "Кола 0,5 л", purchaseProductKey: "stale:cola", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.cost, 20);
});

test("exact-name fallback stays unresolved when two products share the same name", () => {
  const api = costingApi();
  const state = api.state({});
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    items: [
      { name: "Спрайт", purchaseProductKey: "sprite:05", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 180 },
      { name: "Спрайт", purchaseProductKey: "sprite:125", quantity: 10, unit: "шт.", packageSize: "1,25 л", lineTotal: 248.4 },
    ],
  }], canonical);
  const row = api.row({ name: "Спрайт", purchaseProductKey: "stale:sprite", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, false);
  assert.equal(row.reason, "price");
});

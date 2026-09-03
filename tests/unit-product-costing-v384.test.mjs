import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
const diagnosticRoute = fs.readFileSync(new URL("../app/api/client-runtime-diagnostic/route.ts", import.meta.url), "utf8");

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

test("v384 production bundle is valid and removes the temporary client trace", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v384/);
  assert.doesNotMatch(bundle, /unit_product_costing_trace_v383|bdTechCostTraceScheduleV383/);
  assert.doesNotMatch(diagnosticRoute, /BarDoctor unit product costing v383|safeCostingRecord/);
});

test("Köln Cola 0.5 converts its mislabeled per-ml average into one bottle cost", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [{ productKey: "stock:кола 0 5 л|ml", name: "Кола 0.5 л", unit: "pcs", packageSize: "0.5 л" }],
    stockBalances: [{ key: "stock:кола 0 5 л|ml", name: "Кола 0.5 л", unit: "pcs", packageSize: "0.5 л", packageOptions: ["0.5 л"], averageUnitCost: 0.0289, currency: "PMR_RUB" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-22", currency: "PMR_RUB",
    items: [{ name: "Кола 0.5 л", purchaseProductKey: "stock:кола 0 5 л|ml", quantity: 1, unit: "шт.", packageSize: "0.5 л", lineTotal: 14.8 }],
  }], canonical);
  const row = api.row({ name: "Кола 0,5л.", matchedName: "Кола 0.5 л", purchaseProductKey: "stock:кола 0 5л|pcs", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.normalizedUnit, "ml");
  assert.equal(row.amount, 500);
  assert.equal(row.cost, 14.45);
  assert.equal(row.source, "weighted_inventory_average");
});

test("Köln Sprite 0.5 falls back from the zero-priced piece card to its ml balance", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [
      { productKey: "stock:спрайт 0 5л|pcs", name: "Спрайт 0,5л.", unit: "pcs", packageSize: "1 шт." },
      { productKey: "stock:спрайт|ml", name: "Спрайт", unit: "ml", packageSize: "Несколько фасовок" },
    ],
    stockBalances: [
      { key: "stock:спрайт 0 5л|pcs", name: "Спрайт 0,5л.", unit: "pcs", packageSize: "1 шт.", averageUnitCost: 0, currency: "" },
      { key: "stock:спрайт|ml", name: "Спрайт", unit: "ml", packageSize: "Несколько фасовок", averageUnitCost: 0.019871, currency: "PMR_RUB" },
    ],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [], canonical);
  const row = api.row({ name: "Спрайт 0,5л.", matchedName: "Спрайт 0,5л.", purchaseProductKey: "stock:спрайт 0 5л|pcs", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.normalizedUnit, "ml");
  assert.equal(row.amount, 500);
  assert.equal(row.cost, 9.94);
  assert.equal(row.source, "weighted_inventory_average");
});

test("the packaged-piece fallback is generic and not hardcoded to soft-drink names", () => {
  const api = costingApi();
  const state = api.state({
    stockBalances: [{ key: "stock:сок|ml", name: "Сок", unit: "ml", packageSize: "Несколько фасовок", averageUnitCost: 0.04, currency: "PMR_RUB" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [], canonical);
  const row = api.row({ name: "Сок 0,25 л", purchaseProductKey: "stock:сок 025|pcs", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.amount, 250);
  assert.equal(row.cost, 10);
});

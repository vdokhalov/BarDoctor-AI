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

test("v385 production bundle is valid and declares last-confirmed-purchase costing", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-unit-product-costing-v385/);
  assert.match(bundle, /source:"latest_confirmed_purchase"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf("function bdTechCostRowV376"), bundle.indexOf("function bdAssortmentFallbackAnalyticsV170")), /weighted_inventory_average|averageUnitCost/);
});

test("latest confirmed exact Cola 0.5 receipt wins and warehouse average is ignored", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [{ productKey: "stock:cola-05", name: "Кола 0,5 л", unit: "pcs", packageSize: "0,5 л" }],
    stockBalances: [{ key: "stock:cola-05", name: "Кола 0,5 л", unit: "pcs", packageSize: "0,5 л", averageUnitCost: 0.03, currency: "PMR_RUB" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    { id: "purchase-1", status: "confirmed", date: "2026-08-01", confirmedAt: "2026-08-01T10:00:00Z", supplierName: "Шериф", currency: "PMR_RUB", items: [{ id: "line-1", name: "Кола 0.5 л", purchaseProductKey: "stock:cola-05", quantity: 12, unit: "шт.", packageSize: "0.5 л", lineTotal: 169.2 }] },
    { id: "purchase-2", status: "confirmed", date: "2026-08-22", confirmedAt: "2026-08-22T10:00:00Z", supplierName: "Другой поставщик", currency: "PMR_RUB", items: [{ id: "line-2", name: "Кола 0.5 л", purchaseProductKey: "stock:cola-05", quantity: 10, unit: "шт.", packageSize: "0.5 л", lineTotal: 148 }] },
  ], canonical);
  const row = api.row({ id: "cola", name: "Кола 0,5л.", purchaseProductKey: "stock:cola-05", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.cost, 14.8);
  assert.equal(row.unitPrice, 14.8);
  assert.equal(row.source, "latest_confirmed_purchase");
  assert.equal(row.purchaseDate, "2026-08-22");
  assert.equal(row.supplierName, "Другой поставщик");
});

test("different quantities and suppliers are never averaged", () => {
  const api = costingApi();
  const state = api.state({ nomenclature: [{ productKey: "coffee", name: "Кофе зерновой", unit: "g" }] });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    { status: "confirmed", date: "2026-08-01", currency: "PMR_RUB", supplierName: "A", items: [{ name: "Кофе зерновой", purchaseProductKey: "coffee", quantity: 10, unit: "кг", lineTotal: 3000 }] },
    { status: "confirmed", date: "2026-08-20", currency: "PMR_RUB", supplierName: "B", items: [{ name: "Кофе зерновой", purchaseProductKey: "coffee", quantity: 1, unit: "кг", lineTotal: 400 }] },
  ], canonical);
  const row = api.row({ name: "Кофе зерновой", purchaseProductKey: "coffee", quantity: 10, unit: "г" }, maps, canonical);
  assert.equal(row.cost, 4);
  assert.equal(row.supplierName, "B");
});

test("draft and cancelled receipts do not change the last confirmed price", () => {
  const api = costingApi();
  const state = api.state({ nomenclature: [{ productKey: "cola-05", name: "Кола 0,5 л", unit: "pcs", packageSize: "0,5 л" }] });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [
    { status: "confirmed", date: "2026-08-01", currency: "PMR_RUB", items: [{ name: "Кола 0,5 л", purchaseProductKey: "cola-05", quantity: 12, unit: "шт.", lineTotal: 169.2 }] },
    { status: "draft", date: "2026-08-25", currency: "PMR_RUB", items: [{ name: "Кола 0,5 л", purchaseProductKey: "cola-05", quantity: 12, unit: "шт.", lineTotal: 240 }] },
    { status: "cancelled", date: "2026-08-30", currency: "PMR_RUB", items: [{ name: "Кола 0,5 л", purchaseProductKey: "cola-05", quantity: 12, unit: "шт.", lineTotal: 300 }] },
  ], canonical);
  const row = api.row({ name: "Кола 0,5 л", purchaseProductKey: "cola-05", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.cost, 14.1);
});

test("Sprite 0.5 stays unpriced when only Sprite 1.25 has a confirmed receipt", () => {
  const api = costingApi();
  const state = api.state({
    nomenclature: [
      { productKey: "sprite-05", name: "Спрайт 0,5 л", unit: "pcs", packageSize: "0,5 л" },
      { productKey: "sprite-125", name: "Спрайт 1,25 л", unit: "pcs", packageSize: "1,25 л" },
    ],
    stockBalances: [{ key: "sprite-generic", name: "Спрайт", unit: "ml", packageSize: "Несколько фасовок", averageUnitCost: 0.019871, currency: "PMR_RUB" }],
  });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-31", currency: "PMR_RUB",
    items: [{ name: "Спрайт", purchaseProductKey: "sprite-125", quantity: 10, unit: "шт.", packageSize: "1,25 л", lineTotal: 248.4 }],
  }], canonical);
  const row = api.row({ name: "Спрайт 0,5л.", purchaseProductKey: "sprite-05", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, false);
  assert.equal(row.reason, "price");
});

test("exact package fallback bridges a stale key but never crosses bottle volume", () => {
  const api = costingApi();
  const state = api.state({});
  const canonical = api.canonical(state);
  const maps = api.maps(state, [{
    status: "confirmed", date: "2026-08-31", currency: "PMR_RUB", supplierName: "Шериф",
    items: [
      { name: "Sprite", purchaseProductKey: "purchase:sprite-05", quantity: 10, unit: "шт.", packageSize: "0,5 л", lineTotal: 180 },
      { name: "Sprite", purchaseProductKey: "purchase:sprite-125", quantity: 10, unit: "шт.", packageSize: "1,25 л", lineTotal: 248.4 },
    ],
  }], canonical);
  const row = api.row({ name: "Спрайт 0,5л.", purchaseProductKey: "stale:sprite-05", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, true);
  assert.equal(row.cost, 18);
  assert.equal(row.productKey, "purchase:sprite-05");
});

test("a warehouse balance without a confirmed receipt cannot invent a cost", () => {
  const api = costingApi();
  const state = api.state({ stockBalances: [{ key: "juice-025", name: "Сок 0,25 л", unit: "pcs", packageSize: "0,25 л", averageUnitCost: 10, currency: "PMR_RUB" }] });
  const canonical = api.canonical(state);
  const maps = api.maps(state, [], canonical);
  const row = api.row({ name: "Сок 0,25 л", purchaseProductKey: "juice-025", quantity: 1, unit: "шт." }, maps, canonical);
  assert.equal(row.complete, false);
  assert.equal(row.reason, "price");
});

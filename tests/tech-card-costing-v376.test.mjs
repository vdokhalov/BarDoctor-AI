import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "acorn";

const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");

test("tech-card costing patch keeps the production bundle valid", () => {
  assert.doesNotThrow(() => parse(bundle, { ecmaVersion: "latest", sourceType: "script" }));
  assert.match(bundle, /bd-tech-card-costing-v376/);
  assert.match(bundle, /bdAssortmentFallbackAnalyticsV170\(E,C,m\)/);
  for (const functionName of [
    "bdAssortmentHeaderV170",
    "bdAssortmentEmptyV170",
    "bdAssortmentPeriodV170",
    "bdAssortmentSummaryV170",
    "bdAssortmentSignalRowV170",
    "bdAssortmentOverviewV170",
  ]) assert.match(bundle, new RegExp(`function ${functionName}\\b`));
});

test("fallback costing shows linked nomenclature and calculates espresso from the latest confirmed coffee receipt", () => {
  const start = bundle.indexOf("function bdTechCostUnitV376");
  const end = bundle.indexOf("function bdAssortmentFallbackAnalyticsV170", start);
  assert.ok(start >= 0 && end > start);
  const helpers = bundle.slice(start, end);
  const context = {
    bdCatArray: (value) => Array.isArray(value) ? value : [],
    bdAssortmentNumberV170: (value, fallback = 0) => {
      const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
  };
  vm.createContext(context);
  vm.runInContext(`${helpers};this.api={canonical:bdTechCostCanonicalV376,maps:bdTechCostMapsV376,row:bdTechCostRowV376}`, context);
  const state = {
    stockBalances: [{
      productKey: "coffee-beans",
      name: "Кофе зерновой",
      unit: "g",
      averageUnitCost: 0.2,
      currency: "PMR_RUB",
    }],
  };
  const canonical = context.api.canonical(state);
  const maps = context.api.maps(state, [{
    status: "confirmed",
    date: "2026-08-31",
    currency: "PMR_RUB",
    supplierName: "Поставщик кофе",
    items: [{
      name: "Кофе зерновой",
      purchaseProductKey: "coffee-beans",
      quantity: 1,
      unit: "кг",
      lineTotal: 340,
    }],
  }], canonical);
  const row = context.api.row({
    id: "coffee",
    name: "Эспрессо",
    matchedName: "Кофе зерновой",
    quantity: 0.01,
    unit: "кг",
    purchaseProductKey: "coffee-beans",
  }, maps, canonical);
  assert.equal(row.name, "Кофе зерновой");
  assert.equal(row.recipeName, "Эспрессо");
  assert.equal(row.cost, 3.4);
  assert.equal(row.source, "latest_confirmed_purchase");
  assert.equal(row.supplierName, "Поставщик кофе");
});

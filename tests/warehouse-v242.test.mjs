import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function valueSummary(items, currency) {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const lines = bundle.split("\n");
  const source = [
    lines.find((line) => line.startsWith("function bdWarehouseNumber")),
    lines.find((line) => line.startsWith("function bdWarehouseCurrency")),
    lines.find((line) => line.startsWith("function bdWarehouseInventoryValueLine")),
    lines.find((line) => line.startsWith("function bdWarehouseInventoryValueSummary")),
  ].join("\n");
  const context = { items, currency };
  vm.runInNewContext(`${source}\nresult=bdWarehouseInventoryValueSummary(items,currency)`, context);
  return JSON.parse(JSON.stringify(context.result));
}

test("warehouse v242 totals only verified values in the venue base currency", async () => {
  assert.deepEqual(await valueSummary([
    { current: 1, unit: "pcs", inventoryValue: 100, currency: "rub" },
    { current: 1, unit: "pcs", inventoryValue: 50, currency: "RUB" },
    { current: 0, unit: "pcs", inventoryValue: 0, currency: "MDL" },
  ], "RUB"), {
    baseCurrency: "RUB",
    total: 150,
    unresolved: 0,
    unvaluedCount: 0,
    valuedCount: 2,
    denominator: 2,
    zeroStockExcluded: 1,
    breakdown: {},
    lines: [],
    status: "full",
    complete: true,
  });
});

test("warehouse v242 never directly sums mismatched or review-required currencies", async () => {
  const mixed = await valueSummary([
    { current: 1, unit: "pcs", inventoryValue: 100, currency: "RUB" },
    { current: 1, unit: "pcs", inventoryValue: 50, currency: "MDL" },
    { current: 1, unit: "pcs", inventoryValue: 25, currency: "RUB", costNeedsReview: true },
  ], "RUB");
  assert.deepEqual(mixed, {
    baseCurrency: "RUB",
    total: 100,
    unresolved: 2,
    unvaluedCount: 2,
    valuedCount: 1,
    denominator: 3,
    zeroStockExcluded: 0,
    breakdown: { currency_mismatch: 1, cost_basis_requires_review: 1 },
    lines: [
      { status: "unvalued", value: 0, reason: "currency_mismatch", productKey: "", name: "Позиция без названия" },
      { status: "unvalued", value: 0, reason: "cost_basis_requires_review", productKey: "", name: "Позиция без названия" },
    ],
    status: "partial",
    complete: false,
  });
  assert.equal((await valueSummary([{ current: 1, unit: "pcs", inventoryValue: 100, currency: "RUB" }], "")).complete, false);
});

test("warehouse v242 reads base currency from the current venue and exposes a safe fallback", async () => {
  const [bundle, css, html, response, preview] = await Promise.all([
    read("public/assets/index-BQGspy0I.js"),
    read("public/warehouse.css"),
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
    read("public/bardoctor-preview.js"),
  ]);
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  const warehouse = bundle.slice(start, end);

  assert.match(warehouse, /bdWarehouseInventoryValueSummary\(q,n\?\.currency\)/);
  assert.match(warehouse, /"Стоимость рассчитанной части"/);
  assert.match(warehouse, /"Не рассчитано: "/);
  assert.match(warehouse, /bdWarehouseValueSummary\.unvaluedCount/);
  assert.match(warehouse, /bdWarehouseValuationOnly/);
  assert.doesNotMatch(warehouse, /Несколько валют/);
  assert.match(css, /Warehouse v242 — base-currency KPI and final production density/);
  assert.match(css, /article\.incomplete strong/);
  assert.match(html, /accounting-currency-v243/);
  assert.match(response, /accounting-currency-v243/);
  assert.match(preview, /accounting-currency-v243/);
  assert.match(html, /warehouse-valuation-v244/);
});

test("warehouse v242 retains every action, tab and compact hierarchy workflow", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdWarehousePage");
  const end = bundle.indexOf("function bdRecurringSettingsEditor", start);
  const warehouse = bundle.slice(start, end);
  for (const label of [
    "Провести инвентаризацию",
    "Сканировать ведомость",
    "Импортировать продажи",
    "Добавить покупку",
    "Остатки",
    "Движения",
    "Инвентаризации",
    "Списания",
    "Структура",
    "Номенклатура",
    "Требуют распределения",
  ]) assert.match(warehouse, new RegExp(label));
  assert.match(warehouse, /venueKey:localStorage\.getItem\("bd_active_venue_id"\)\|\|"default"/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

function summarize(items: Record<string, unknown>[], currency = "MDL") {
  const bundle = fs.readFileSync(new URL("../public/assets/index-BQGspy0I.js", import.meta.url), "utf8");
  const names = ["bdWarehouseNumber", "bdWarehouseCurrency", "bdWarehouseInventoryValueLine", "bdWarehouseInventoryValueSummary"];
  const source = names.map(name => {
    const lines = bundle.split("\n").filter(line => line.startsWith(`function ${name}(`));
    assert.equal(lines.length, 1, `exact final client function ${name}`);
    return lines[0];
  }).join("\n");
  const before = JSON.stringify(items);
  const context = { items, currency, result: {} as Record<string, unknown> };
  vm.runInNewContext(`${source}\nresult=bdWarehouseInventoryValueSummary(items,currency)`, context);
  assert.equal(JSON.stringify(items), before, "display must not rewrite persisted stock");
  return JSON.parse(JSON.stringify(context.result));
}

test("Warehouse final client includes canonical kg/l/pcs server-valued balances in the 600 MDL total", () => {
  const result = summarize(["kg", "l", "pcs"].map(unit => ({ productKey: `stock:${unit}`, unit,
    current: 20, inventoryValue: 200, averageUnitCost: 10, currency: "MDL", unitModelVersion: 4 })));
  assert.equal(result.complete, true);
  assert.equal(result.status, "full");
  assert.equal(result.total, 600);
  assert.equal(result.valuedCount, 3);
  assert.equal(result.unvaluedCount, 0);
});

test("Warehouse canonical and legacy physical units preserve the same stored monetary amount", () => {
  const result = summarize([{ unit: "kg", current: 20 }, { unit: "g", current: 20000 },
    { unit: "l", current: 20 }, { unit: "ml", current: 20000 }, { unit: "pcs", current: 12 }]
    .map(row => ({ ...row, inventoryValue: 200, currency: "MDL", displayUnit: "pcs", packageSize: 1000 })));
  assert.equal(result.complete, true);
  assert.equal(result.total, 1000);
  assert.equal(result.valuedCount, 5);
});

test("Warehouse still exposes unknown units, negative stock, missing cost and currency mismatch", () => {
  const result = summarize([
    { unit: "pack", current: 12, inventoryValue: 200, currency: "MDL" },
    { unit: "kg", current: -2, inventoryValue: 200, currency: "MDL" },
    { unit: "l", current: 2, currency: "MDL" },
    { unit: "kg", current: 2, inventoryValue: 200, currency: "EUR" },
    { unit: "l", current: 2, inventoryValue: 200, currency: "MDL", costNeedsReview: true },
    { unit: "kg", current: 0 },
  ]);
  assert.equal(result.complete, false);
  assert.equal(result.total, 0);
  assert.equal(result.zeroStockExcluded, 1);
  assert.deepEqual(result.breakdown, { broken_base_unit: 1, negative_stock: 1, missing_cost_basis: 1,
    currency_mismatch: 1, cost_basis_requires_review: 1 });
});
